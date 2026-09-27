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
    TARGET_FILE.parent.mkdir(parents=True, exist_ok=True)
    TARGET_FILE.write_text(render_typescript(payload), encoding="utf-8")
    print(f"wrote {TARGET_FILE}")
    for key in ("alerts", "transactions", "rate", "columns", "auc", "adversarial",
                "rejected_families", "chance_families", "holdout_auc", "null_mean"):
        print(f"  {key}: {payload.get(key)}")


if __name__ == "__main__":
    main()
