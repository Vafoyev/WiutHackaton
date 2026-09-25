from collections.abc import Callable, Sequence

import numpy as np
import pandas as pd

from src.config import DIRECTIONS, TX_TYPES

COUNT_PREFIXES = ("base_cnt", "dir_n_", "ty_n_", "cross_n_", "win_n", "hour_active_days")


def prepare_transactions(tx: pd.DataFrame, signals: pd.DataFrame) -> pd.DataFrame:
    merged = tx.merge(
        signals[["signal_id", "signal_sanasi"]], on="signal_id", how="left"
    )
    delta = merged["signal_sanasi"] - merged["tranzaksiya_vaqti"]
    merged["days_before"] = delta.dt.total_seconds() / 86400.0
    merged = merged[merged["days_before"] >= 0].copy()
    merged["out"] = (merged["kirim_chiqim"] == "chiqim").astype(np.int8)
    merged["hour"] = merged["tranzaksiya_vaqti"].dt.hour
    merged["dow"] = merged["tranzaksiya_vaqti"].dt.dayofweek
    return merged.sort_values(["signal_id", "tranzaksiya_vaqti"])


def _base(tx: pd.DataFrame, index: pd.Index) -> pd.DataFrame:
    g = tx.groupby("signal_id", sort=False)
    out = g["miqdor_indeksi"].agg(["count", "mean", "std", "min", "max", "sum"])
    out.columns = [f"base_{c}" for c in ["cnt", "mean", "std", "min", "max", "sum"]]
    out["base_span"] = g["days_before"].max() - g["days_before"].min()
    return out.reindex(index)


def _amount_shape(tx: pd.DataFrame, index: pd.Index) -> pd.DataFrame:
    g = tx.groupby("signal_id", sort=False)["miqdor_indeksi"]
    out = pd.DataFrame(index=g.size().index)
    out["amt_med"] = g.median()
    for q in (0.1, 0.25, 0.75, 0.9, 0.99):
        out[f"amt_q{int(q * 100)}"] = g.quantile(q)
    out["amt_iqr"] = out["amt_q75"] - out["amt_q25"]
    out["amt_skew"] = g.skew()
    out["amt_kurt"] = g.apply(lambda s: s.kurt())
    out["amt_big_share"] = (
        tx.assign(big=(tx["miqdor_indeksi"] > 2).astype(np.int8))
        .groupby("signal_id", sort=False)["big"]
        .mean()
    )
    out["amt_nuniq_ratio"] = g.nunique() / g.size()
    return out.reindex(index)


def _direction_type(tx: pd.DataFrame, index: pd.Index) -> pd.DataFrame:
    out = pd.DataFrame(index=index)
    total = tx.groupby("signal_id", sort=False).size().reindex(index)
    for column, prefix, categories in (
        ("kirim_chiqim", "dir", DIRECTIONS),
        ("tranzaksiya_turi", "ty", TX_TYPES),
    ):
        counts = (
            pd.crosstab(tx["signal_id"], tx[column])
            .reindex(index=index, columns=list(categories))
            .fillna(0)
        )
        means = tx.pivot_table(
            index="signal_id", columns=column, values="miqdor_indeksi", aggfunc="mean"
        ).reindex(index=index, columns=list(categories))
        sums = tx.pivot_table(
            index="signal_id", columns=column, values="miqdor_indeksi", aggfunc="sum"
        ).reindex(index=index, columns=list(categories)).fillna(0)
        for category in categories:
            out[f"{prefix}_n_{category}"] = counts[category]
            out[f"{prefix}_m_{category}"] = means[category]
            out[f"{prefix}_s_{category}"] = sums[category]
            out[f"{prefix}_sh_{category}"] = counts[category] / total.replace(0, np.nan)
    return out


def _cross(tx: pd.DataFrame, index: pd.Index) -> pd.DataFrame:
    pairs = [f"{d}_{t}" for d in DIRECTIONS for t in TX_TYPES]
    key = tx["kirim_chiqim"] + "_" + tx["tranzaksiya_turi"]
    counts = (
        pd.crosstab(tx["signal_id"], key)
        .reindex(index=index, columns=pairs)
        .fillna(0)
    )
    total = tx.groupby("signal_id", sort=False).size().reindex(index)
    out = pd.DataFrame(index=index)
    for pair in pairs:
        out[f"cross_n_{pair}"] = counts[pair]
        out[f"cross_sh_{pair}"] = counts[pair] / total.replace(0, np.nan)
    return out


def _flow(tx: pd.DataFrame, index: pd.Index) -> pd.DataFrame:
    incoming = tx[tx["out"] == 0].groupby("signal_id", sort=False)["miqdor_indeksi"]
    outgoing = tx[tx["out"] == 1].groupby("signal_id", sort=False)["miqdor_indeksi"]
    in_sum = incoming.sum().reindex(index).fillna(0)
    out_sum = outgoing.sum().reindex(index).fillna(0)
    in_cnt = incoming.count().reindex(index).fillna(0)
    out_cnt = outgoing.count().reindex(index).fillna(0)
    frame = pd.DataFrame(index=index)
    frame["flow_net"] = in_sum - out_sum
    frame["flow_ratio"] = out_sum / (in_sum.abs() + 1e-6)
    frame["flow_cnt_ratio"] = out_cnt / (in_cnt + 1)
    frame["flow_mean_gap"] = (
        incoming.mean().reindex(index) - outgoing.mean().reindex(index)
    )
    return frame


WINDOWS = (3, 7, 14, 30, 60, 90, 120)


def _windows(tx: pd.DataFrame, index: pd.Index) -> pd.DataFrame:
    out = pd.DataFrame(index=index)
    total = tx.groupby("signal_id", sort=False).size().reindex(index).fillna(0)
    for window in WINDOWS:
        subset = tx[tx["days_before"] <= window]
        g = subset.groupby("signal_id", sort=False)
        out[f"win_n{window}"] = g.size().reindex(index).fillna(0)
        out[f"win_sum{window}"] = g["miqdor_indeksi"].sum().reindex(index).fillna(0)
        out[f"win_mean{window}"] = g["miqdor_indeksi"].mean().reindex(index)
        out[f"win_max{window}"] = g["miqdor_indeksi"].max().reindex(index)
        out[f"win_out{window}"] = g["out"].mean().reindex(index)
        out[f"win_rate{window}"] = out[f"win_n{window}"] / (total + 1)
    out["win_accel_7_30"] = out["win_n7"] / (out["win_n30"] / 4 + 0.1)
    out["win_accel_30_90"] = out["win_n30"] / (out["win_n90"] / 3 + 0.1)
    g_all = tx.groupby("signal_id", sort=False)["days_before"]
    out["win_recency"] = g_all.min().reindex(index)
    out["win_oldest"] = g_all.max().reindex(index)
    return out


def _burst(tx: pd.DataFrame, index: pd.Index) -> pd.DataFrame:
    gaps = (
        tx.groupby("signal_id", sort=False)["tranzaksiya_vaqti"]
        .diff()
        .dt.total_seconds()
        / 3600.0
    )
    frame = tx.assign(gap=gaps)
    g = frame.groupby("signal_id", sort=False)["gap"]
    out = pd.DataFrame(index=g.size().index)
    out["burst_gap_mean"] = g.mean()
    out["burst_gap_std"] = g.std()
    out["burst_gap_min"] = g.min()
    out["burst_gap_med"] = g.median()
    out["burst_gap_q90"] = g.quantile(0.9)
    out["burst_cv"] = out["burst_gap_std"] / (out["burst_gap_mean"] + 1e-6)
    out["burst_under_1h"] = (
        frame.assign(f=(frame["gap"] < 1).astype(np.int8))
        .groupby("signal_id", sort=False)["f"]
        .mean()
    )
    return out.reindex(index)


def _hour(tx: pd.DataFrame, index: pd.Index) -> pd.DataFrame:
    out = pd.DataFrame(index=index)
    flagged = tx.assign(
        night=((tx["hour"] < 6) | (tx["hour"] >= 22)).astype(np.int8),
        weekend=(tx["dow"] >= 5).astype(np.int8),
        date=tx["tranzaksiya_vaqti"].dt.normalize(),
    )
    g = flagged.groupby("signal_id", sort=False)
    out["hour_night_share"] = g["night"].mean().reindex(index)
    out["hour_weekend_share"] = g["weekend"].mean().reindex(index)
    out["hour_mean"] = g["hour"].mean().reindex(index)
    out["hour_std"] = g["hour"].std().reindex(index)
    out["hour_dow_nuniq"] = g["dow"].nunique().reindex(index)
    active = g["date"].nunique().reindex(index)
    out["hour_active_days"] = active.fillna(0)
    out["hour_tx_per_active_day"] = (
        g.size().reindex(index) / active.replace(0, np.nan)
    )
    return out


def _signal_date(tx: pd.DataFrame, index: pd.Index, signals: pd.DataFrame) -> pd.DataFrame:
    dates = signals.set_index("signal_id")["signal_sanasi"].reindex(index)
    out = pd.DataFrame(index=index)
    out["sig_month"] = dates.dt.month
    out["sig_dow"] = dates.dt.dayofweek
    out["sig_day"] = dates.dt.day
    out["sig_week"] = dates.dt.isocalendar().week.astype("float64")
    out["sig_tnum"] = (dates - dates.min()).dt.days
    out["sig_same_day_n"] = dates.map(dates.value_counts())
    return out


FEATURE_FAMILIES: dict[str, Callable] = {
    "base": lambda tx, idx, sig: _base(tx, idx),
    "amount_shape": lambda tx, idx, sig: _amount_shape(tx, idx),
    "direction_type": lambda tx, idx, sig: _direction_type(tx, idx),
    "cross": lambda tx, idx, sig: _cross(tx, idx),
    "flow": lambda tx, idx, sig: _flow(tx, idx),
    "windows": lambda tx, idx, sig: _windows(tx, idx),
    "burst": lambda tx, idx, sig: _burst(tx, idx),
    "hour": lambda tx, idx, sig: _hour(tx, idx),
    "signal_date": _signal_date,
}


def build_features(
    tx: pd.DataFrame,
    signals: pd.DataFrame,
    families: Sequence[str] | None = None,
) -> pd.DataFrame:
    names = list(FEATURE_FAMILIES) if families is None else list(families)
    index = pd.Index(signals["signal_id"], name="signal_id")
    parts = [FEATURE_FAMILIES[name](tx, index, signals) for name in names]
    result = pd.concat(parts, axis=1)
    result = result.reindex(index)
    for column in result.columns:
        if column.startswith(COUNT_PREFIXES):
            result[column] = result[column].fillna(0)
    return result.replace([np.inf, -np.inf], np.nan)


def family_columns(name: str, tx: pd.DataFrame, signals: pd.DataFrame) -> list[str]:
    index = pd.Index(signals["signal_id"], name="signal_id")
    return list(FEATURE_FAMILIES[name](tx, index, signals).columns)
