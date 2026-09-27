"""Label-free amount distributions and disjoint-window changes per alert.

These features deliberately use no IDs as predictors, no target encodings and
no statistics fitted across alerts. The same schema applies to unseen data.
"""
import numpy as np
import pandas as pd

from src.config import DIRECTIONS, TX_TYPES


def _subsets(tx):
    # Yield instead of retaining three additional full-data copies in a list.
    yield "all", tx
    for direction in DIRECTIONS:
        yield direction, tx[tx.kirim_chiqim == direction]
    for kind in TX_TYPES:
        yield kind, tx[tx.tranzaksiya_turi == kind]
    for direction in DIRECTIONS:
        for kind in TX_TYPES:
            yield f"{direction}_{kind}", tx[(tx.kirim_chiqim == direction) & (tx.tranzaksiya_turi == kind)]


def build_enhanced_features(tx: pd.DataFrame, signals: pd.DataFrame) -> pd.DataFrame:
    """Accept transactions filtered by prepare_transactions (no future rows)."""
    index = pd.Index(signals.signal_id.drop_duplicates(), name="signal_id")
    columns = {}
    for name, subset in _subsets(tx):
        g = subset.groupby("signal_id", sort=False).miqdor_indeksi
        stats = g.agg(["count", "mean", "std", "min", "max", "median", "skew"])
        quantiles = g.quantile([.05, .10, .25, .75, .90, .95]).unstack()
        for stat in stats:
            values = stats[stat].reindex(index)
            columns[f"dist_{name}_{stat}"] = values.fillna(0) if stat == "count" else values
        for q in quantiles:
            columns[f"dist_{name}_q{int(q * 100)}"] = quantiles[q].reindex(index)
        # Explicit columns even for an entirely absent category.
        for q in (5, 10, 25, 75, 90, 95):
            columns.setdefault(f"dist_{name}_q{q}", pd.Series(np.nan, index=index))
        columns[f"dist_{name}_iqr"] = (
            columns[f"dist_{name}_q75"] - columns[f"dist_{name}_q25"]
        )
        for threshold in (-1, 0, 1, 2):
            share = subset.assign(flag=(subset.miqdor_indeksi > threshold).astype(float))
            columns[f"dist_{name}_above_{threshold}"] = (
                share.groupby("signal_id", sort=False).flag.mean().reindex(index)
            )
        # Disjoint old/recent windows avoid diluting a change with its own data.
        if "_" not in name or name == "bank_otkazmasi":
            for window in (7, 30, 90):
                recent = subset[subset.days_before <= window].groupby("signal_id").miqdor_indeksi
                old = subset[subset.days_before > window].groupby("signal_id").miqdor_indeksi
                columns[f"trend_{name}_{window}_mean_delta"] = (recent.mean() - old.mean()).reindex(index)
                columns[f"trend_{name}_{window}_std_delta"] = (recent.std() - old.std()).reindex(index)
                columns[f"trend_{name}_{window}_share"] = (
                    recent.size().reindex(index, fill_value=0) / g.size().reindex(index).replace(0, np.nan)
                )
    result = pd.DataFrame(columns, index=index)
    return result.replace([np.inf, -np.inf], np.nan).astype(float)
