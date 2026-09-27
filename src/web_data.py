"""Generate the EDA website's data file from the recorded run.

The website previously read `mockData.ts`, a hand-written file whose alert count,
transaction count and escalation rate were all wrong by large factors, and whose
ablation trace contained 21 rows that never happened. Numbers shown to judges
must be derived from `experiments/`, never typed. Run:

    python -m src.web_data
"""
import json
from pathlib import Path

import pandas as pd

from src import config
from src.data import load_signals, load_transactions
from src.features import prepare_transactions

TARGET_FILE = config.ROOT / "eda-website" / "src" / "data" / "edaData.ts"
DRIFT_LIMIT = 0.55

# Column-name prefix -> the feature family that builds it. Longest prefix wins,
# so "base_" is not shadowed by a shorter key.
FAMILY_PREFIXES = {
    "dir_": "direction_type",
    "ty_": "direction_type",
    "base_": "base",
    "amt_": "amount_shape",
    "cross_": "cross",
    "xamt_": "cross_amount",
    "tyq_": "type_quantiles",
    "flow_": "flow",
    "win_": "windows",
    "burst_": "burst",
    "hour_": "hour",
    "sig_": "signal_date",
}


def family_of(column: str) -> str | None:
    matches = [p for p in FAMILY_PREFIXES if column.startswith(p)]
    return FAMILY_PREFIXES[max(matches, key=len)] if matches else None


def family_breakdown(columns: list[str]) -> list[dict]:
    """How many of the selected columns each family contributed, largest first."""
    counts: dict[str, int] = {}
    for column in columns:
        family = family_of(column)
        if family:
            counts[family] = counts.get(family, 0) + 1
    return [
        {"family": family, "n": n}
        for family, n in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
    ]


def build_web_data(
    experiments_dir: Path,
    *,
    alerts: int,
    transactions: int,
    positive_rate: float,
) -> dict:
    """Assemble every value the website displays from the recorded artifacts."""
    summary = json.loads((experiments_dir / "summary.json").read_text())
    integrity_path = experiments_dir / "integrity.json"
    integrity = json.loads(integrity_path.read_text()) if integrity_path.exists() else {}

    history = summary["selection_history"]
    measured_families = {row["family"] for row in history}
    kept = set(summary.get("family_level_would_keep", []))
    # "At chance" by the project's own acceptance metric: mean - std never clears 0.5.
    at_chance = {row["family"] for row in history if row.get("score", 1.0) <= 0.5}

    breakdown = family_breakdown(summary.get("selected_columns", []))
    adversarial = summary["adversarial_auc"]
    holdout = integrity.get("holdout", {})
    nulls = integrity.get("null_scores", [])

    result = {
        "alerts": f"{alerts:,}",
        "transactions": f"{transactions:,}",
        "rate": f"{positive_rate:.1%}",
        "columns": str(summary["n_columns"]),
        "auc": f"{summary['ensemble_cv_mean']:.4f}",
        "auc_std": f"{summary['ensemble_cv_std']:.4f}",
        "best_single_model": summary["best_single_model"],
        "best_single_auc": f"{summary['best_single_cv_mean']:.4f}",
        "ensemble_gain": f"{summary['ensemble_gain_over_best_single']:+.4f}",
        "weighting": summary["weighting"],
        "adversarial": f"{adversarial:.4f}",
        "drift_verdict": "indistinguishable" if adversarial < DRIFT_LIMIT else "separable",
        "families_measured": len(measured_families),
        "rejected_families": len(measured_families - kept),
        "chance_families": len(at_chance),
        "family_level_kept": sorted(kept),
        "families_used": len(breakdown),
        "family_breakdown": breakdown,
        "selection_history": [
            {
                "family": row["family"],
                "n_columns": row["n_columns"],
                "mean": round(row["mean"], 4),
                "accepted": bool(row["accepted"]),
            }
            for row in history
        ],
    }

    if holdout:
        result["holdout_auc"] = f"{holdout['holdout_auc']:.4f}"
        result["holdout_cv"] = f"{holdout['cv_mean']:.4f}"
        result["holdout_optimism"] = f"{holdout['optimism']:+.4f}"
        result["holdout_rows"] = f"{holdout['n_holdout']:,}"
    if nulls:
        result["null_mean"] = f"{sum(nulls) / len(nulls):.4f}"

    return result


DAYS_BUCKETS = 18          # 0-180 days in 10-day steps
WEEKLY_MAX_POINTS = 70     # enough resolution for a 460x260 viewBox
AMOUNT_BINS = 24


def chart_series(signals, tx) -> dict:
    """Real series for every chart on the page.

    The page shipped hand-drawn SVG geometry: eight bars for a four-category
    field, an invented activity curve, and a placeholder box where the target
    distribution belongs. Everything here is computed from the data instead.
    """
    import numpy as np
    import pandas as pd

    from src.config import DIRECTIONS, TARGET, TX_TYPES

    labelled = tx.merge(signals[["signal_id", TARGET]], on="signal_id", how="inner")
    outcome = labelled[TARGET].map({0: "dismissed", 1: "escalated"})

    counts = signals[TARGET].value_counts()
    target_dist = [
        {"label": "Dismissed", "n": int(counts.get(0, 0))},
        {"label": "Escalated", "n": int(counts.get(1, 0))},
    ]

    direction = [
        {"label": name, "n": int((tx["kirim_chiqim"] == name).sum())}
        for name in DIRECTIONS
    ]
    types = [
        {"label": name, "n": int((tx["tranzaksiya_turi"] == name).sum())}
        for name in TX_TYPES
    ]

    # Activity before the alert, as a share within each outcome: escalated alerts
    # are a fifth of the data, so raw counts would compare class sizes instead.
    edges = np.arange(0, (DAYS_BUCKETS + 1) * 10, 10)
    bucket = pd.cut(labelled["days_before"], bins=edges, right=False, labels=edges[:-1])
    grid = (
        pd.crosstab(bucket.astype("float64"), outcome)
        .reindex(index=edges[:-1].astype(float), columns=["dismissed", "escalated"])
        .fillna(0.0)
    )
    shares = grid.div(grid.sum(axis=0).replace(0, np.nan), axis=1).fillna(0.0)
    days_before = [
        {"bucket": float(idx), "dismissed": round(float(row["dismissed"]), 6),
         "escalated": round(float(row["escalated"]), 6)}
        for idx, row in shares.iterrows()
    ]

    type_grid = (
        pd.crosstab(labelled["tranzaksiya_turi"], outcome)
        .reindex(index=list(TX_TYPES), columns=["dismissed", "escalated"])
        .fillna(0.0)
    )
    type_shares = type_grid.div(type_grid.sum(axis=0).replace(0, np.nan), axis=1).fillna(0.0)
    types_by_outcome = [
        {"label": idx, "dismissed": round(float(row["dismissed"]), 6),
         "escalated": round(float(row["escalated"]), 6)}
        for idx, row in type_shares.iterrows()
    ]

    weekly_counts = tx.set_index("tranzaksiya_vaqti").resample("W").size()
    step = max(1, len(weekly_counts) // WEEKLY_MAX_POINTS)
    weekly = [
        {"t": stamp.strftime("%Y-%m-%d"), "n": int(value)}
        for stamp, value in weekly_counts.iloc[::step].items()
    ]

    hist, bin_edges = np.histogram(labelled["miqdor_indeksi"].to_numpy(), bins=AMOUNT_BINS)
    amount_hist = [
        {"x": round(float(bin_edges[i]), 3), "n": int(hist[i])} for i in range(len(hist))
    ]

    volume = labelled.groupby([TARGET, "signal_id"]).size().groupby(level=0).median()
    volume_by_outcome = [
        {"label": "Dismissed", "median": float(volume.get(0, 0))},
        {"label": "Escalated", "median": float(volume.get(1, 0))},
    ]

    incoming = next((r["n"] for r in direction if r["label"] == "kirim"), 0)
    facts = {
        "historyDays": int(DAYS_BUCKETS * 10),
        "incomingShare": round(incoming / max(len(tx), 1), 6),
        # Both outcomes spike in the final ten days; the captions must not claim
        # the spike distinguishes them.
        "lastTenDaysShare": round(days_before[0]["dismissed"], 6) if days_before else 0.0,
        "typeMixMaxGap": round(
            max((abs(r["dismissed"] - r["escalated"]) for r in types_by_outcome), default=0.0), 6
        ),
        "topType": max(types, key=lambda r: r["n"])["label"] if types else "",
        "topTypeShare": round(max((r["n"] for r in types), default=0) / max(len(tx), 1), 6),
    }

    return {
        "facts": facts,
        "targetDist": target_dist,
        "direction": direction,
        "types": types,
        "daysBefore": days_before,
        "typesByOutcome": types_by_outcome,
        "weekly": weekly,
        "amountHist": amount_hist,
        "volumeByOutcome": volume_by_outcome,
    }


def render_typescript(payload: dict) -> str:
    body = json.dumps(payload, indent=2, ensure_ascii=False)
    return (
        "// GENERATED FILE - do not edit by hand.\n"
        "// Every value is derived from experiments/summary.json and\n"
        "// experiments/integrity.json. Regenerate with: python -m src.web_data\n"
        "// Hand-written numbers on this page were wrong by large factors once;\n"
        "// see src.web_data for why this file is generated instead.\n"
        f"export const data = {body};\n"
    )


def main() -> None:
    signals = load_signals(config.TRAIN_SIGNALS)
    tx = prepare_transactions(load_transactions(config.TRAIN_TX), signals)

    payload = build_web_data(
        config.EXPERIMENTS,
        alerts=len(signals),
        transactions=len(tx),
        positive_rate=float(signals[config.TARGET].mean()),
    )
    payload["charts"] = chart_series(signals, tx)
    TARGET_FILE.parent.mkdir(parents=True, exist_ok=True)
    TARGET_FILE.write_text(render_typescript(payload), encoding="utf-8")
    print(f"wrote {TARGET_FILE}")
    for key in ("alerts", "transactions", "rate", "columns", "auc", "adversarial",
                "rejected_families", "chance_families", "holdout_auc", "null_mean"):
        print(f"  {key}: {payload.get(key)}")


if __name__ == "__main__":
    main()
