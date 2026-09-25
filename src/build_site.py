"""Render the EDA website as static HTML with pre-rendered charts."""
import base64
import io
import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

from src import config
from src.data import load_signals, load_transactions
from src.features import prepare_transactions
from src.site_data import compute

PALETTE = {"Dismissed": "#4a8f79", "Escalated": "#d36a52"}


def _figure_to_data_uri(fig) -> str:
    buffer = io.BytesIO()
    fig.savefig(buffer, format="png", dpi=120, bbox_inches="tight")
    plt.close(fig)
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def _charts(tables: dict[str, pd.DataFrame]) -> dict[str, str]:
    charts: dict[str, str] = {}

    fig, ax = plt.subplots(figsize=(6, 3.5))
    target = tables["target"]
    ax.bar(target["outcome"], target["alerts"], color=[PALETTE[o] for o in target["outcome"]])
    ax.set_ylabel("Alerts")
    ax.set_title("Target distribution")
    charts["target"] = _figure_to_data_uri(fig)

    fig, ax = plt.subplots(figsize=(10, 3.5))
    weekly = tables["weekly_volume"]
    ax.plot(weekly["tranzaksiya_vaqti"], weekly["transactions"], color="#3f6f8f")
    ax.set_ylabel("Transactions")
    ax.set_title("Weekly transaction volume")
    charts["weekly"] = _figure_to_data_uri(fig)

    fig, axes = plt.subplots(1, 2, figsize=(10, 3.5))
    direction = tables["direction"]
    axes[0].bar(direction["direction"], direction["transactions"], color="#3f6f8f")
    axes[0].set_title("Direction")
    types = tables["types"]
    axes[1].bar(types["type"], types["transactions"], color="#7b6f9f")
    axes[1].set_title("Transaction type")
    axes[1].tick_params(axis="x", rotation=20)
    fig.tight_layout()
    charts["direction_types"] = _figure_to_data_uri(fig)

    fig, ax = plt.subplots(figsize=(10, 3.5))
    hist = tables["days_before_hist"]
    for outcome, group in hist.groupby("eskalatsiya"):
        share = group["transactions"] / group["transactions"].sum()
        ax.plot(group["bucket"], share, label=outcome, color=PALETTE[outcome])
    ax.set_xlabel("Days before the alert")
    ax.set_ylabel("Share of transactions")
    ax.set_title("Activity leading up to the alert")
    ax.legend()
    charts["days_before"] = _figure_to_data_uri(fig)

    fig, ax = plt.subplots(figsize=(8, 3.5))
    by_type = tables["type_by_outcome"].pivot(
        index="tranzaksiya_turi", columns="eskalatsiya", values="transactions"
    )
    share = by_type.div(by_type.sum(axis=0), axis=1)
    share.plot.bar(ax=ax, color=[PALETTE[c] for c in share.columns])
    ax.set_ylabel("Share within outcome")
    ax.set_title("Transaction type mix by outcome")
    ax.tick_params(axis="x", rotation=20)
    charts["type_outcome"] = _figure_to_data_uri(fig)

    return charts


def build(output_dir: Path | None = None) -> Path:
    output_dir = config.DOCS if output_dir is None else output_dir
    signals = load_signals(config.TRAIN_SIGNALS)
    tx = prepare_transactions(load_transactions(config.TRAIN_TX), signals)
    tables = compute(signals, tx)
    charts = _charts(tables)

    summary_path = config.EXPERIMENTS / "summary.json"
    summary = json.loads(summary_path.read_text()) if summary_path.exists() else {}

    ablation_rows = "".join(
        f"<tr><td>{row['family']}</td><td>{row['n_columns']}</td>"
        f"<td>{row['mean']:.5f}</td><td>{row['std']:.5f}</td>"
        f"<td>{'kept' if row['accepted'] else 'rejected'}</td></tr>"
        for row in summary.get("selection_history", [])
    )

    html = _TEMPLATE.format(
        rate=f"{signals['eskalatsiya'].mean():.1%}",
        alerts=f"{len(signals):,}",
        transactions=f"{len(tx):,}",
        columns=summary.get("n_columns", "—"),
        auc=f"{summary.get('ensemble_cv_mean', float('nan')):.4f}",
        auc_std=f"{summary.get('ensemble_cv_std', float('nan')):.4f}",
        best_single=summary.get("best_single_model", "—"),
        best_single_auc=f"{summary.get('best_single_cv_mean', float('nan')):.4f}",
        gain=f"{summary.get('ensemble_gain_over_best_single', float('nan')):+.4f}",
        # "At chance" by the project's own metric: mean - std does not clear 0.5.
        chance_families=len({
            r["family"] for r in summary.get("selection_history", [])
            if r["score"] <= 0.5
        }),
        adversarial=(
            f"{summary['adversarial_auc']:.4f}"
            if summary.get("adversarial_auc") is not None else "not yet measured"
        ),
        drift_verdict=(
            "indistinguishable"
            if (summary.get("adversarial_auc") or 1.0) < 0.55
            else "separable — treat the estimate with caution"
        ),
        rejected_families=len({
            r["family"] for r in summary.get("selection_history", [])
        }) - len(summary.get("families", [])),
        ablation_rows=ablation_rows or "<tr><td colspan='5'>Run the pipeline first.</td></tr>",
        **charts,
    )
    output_dir.mkdir(parents=True, exist_ok=True)
    target = output_dir / "index.html"
    target.write_text(html, encoding="utf-8")
    (output_dir / ".nojekyll").write_text("")
    return target


_TEMPLATE = """<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AML Alert Prioritization &mdash; DnkCode</title>
<style>
:root {{ color-scheme: light; }}
body {{ margin:0; font:16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  color:#1d2228; background:#fbfaf8; }}
main {{ max-width: 920px; margin: 0 auto; padding: 48px 20px 80px; }}
h1 {{ font-size: 2rem; margin-bottom: .2em; }}
h2 {{ margin-top: 2.4em; border-bottom: 1px solid #e3ded6; padding-bottom: .3em; }}
.sub {{ color:#6b6257; margin-top:0; }}
.metrics {{ display:flex; flex-wrap:wrap; gap:16px; margin:28px 0; }}
.metric {{ flex:1 1 150px; background:#fff; border:1px solid #e3ded6; border-radius:10px; padding:16px; }}
.metric b {{ display:block; font-size:1.6rem; }}
.metric span {{ color:#6b6257; font-size:.85rem; }}
img {{ max-width:100%; border:1px solid #e3ded6; border-radius:10px; background:#fff; }}
table {{ border-collapse:collapse; width:100%; font-size:.9rem; }}
th,td {{ border-bottom:1px solid #e3ded6; padding:8px 10px; text-align:left; }}
th {{ background:#f3efe9; }}
.finding {{ background:#fff; border-left:4px solid #d36a52; padding:16px 20px; border-radius:0 8px 8px 0; margin:20px 0; }}
</style></head>
<body><main>
<h1>AML Alert Prioritization</h1>
<p class="sub">DnkCode &middot; Team 2ABB3C78 &middot; WIUT Hackathon 2026</p>

<h2>Approach</h2>
<p>Each alert carries a 180-day transaction history. We summarize that history into
alert-level features, select among them by repeated cross-validation, and rank alerts
by escalation probability with a seed-bagged gradient-boosting ensemble.</p>

<div class="metrics">
<div class="metric"><b>{alerts}</b><span>training alerts</span></div>
<div class="metric"><b>{rate}</b><span>escalation rate</span></div>
<div class="metric"><b>{transactions}</b><span>transactions</span></div>
<div class="metric"><b>{columns}</b><span>features kept</span></div>
<div class="metric"><b>{auc}</b><span>CV ROC-AUC (&plusmn;{auc_std})</span></div>
</div>

<h2>Target distribution</h2>
<img src="{target}" alt="Target distribution">

<h2>Transaction activity over time</h2>
<img src="{weekly}" alt="Weekly transaction volume">

<h2>Direction and transaction types</h2>
<img src="{direction_types}" alt="Direction and type distributions">

<h2>Activity before the alert</h2>
<img src="{days_before}" alt="Activity before the alert">

<h2>Behaviour by outcome</h2>
<img src="{type_outcome}" alt="Transaction type mix by outcome">

<h2>Key finding: more features made the model worse</h2>
<div class="finding">
<p>We measured every feature family by repeated cross-validation instead of assuming
it helped. Accuracy peaked at a compact feature set; adding the remaining families
<em>reduced</em> ROC-AUC. Of the nine families built, {rejected_families} were rejected,
and {chance_families} of those scored at or below chance on their own.</p>
<p>This dataset carries little signal, so the binding constraint is variance, not
capacity. That reading drove every later choice: repeated cross-validation rather than
a single split, an acceptance rule of <code>mean &minus; std</code>, regularization-biased
hyperparameters, and seed bagging.</p>
</div>

<table><thead><tr><th>Family added</th><th>Columns</th><th>CV mean</th><th>CV std</th><th>Decision</th></tr></thead>
<tbody>{ablation_rows}</tbody></table>

<h2>How the ensemble was scored</h2>
<p>Every number on this page is the mean ROC-AUC across four repeats of 5-fold
cross-validation. The ensemble is scored the same way as a single model &mdash; blended
within each repeat, then averaged &mdash; rather than by scoring the average of the
repeats, which inflates ROC-AUC on its own by roughly 0.004 here. Measured honestly,
the four-model rank average buys <b>{gain}</b> over the best single model
({best_single}, {best_single_auc}).</p>

<h2>Do the training and scoring alerts look alike?</h2>
<p>We trained a classifier to tell training alerts apart from scoring alerts using
the same features the model uses. It reached ROC-AUC <b>{adversarial}</b> &mdash; the two
sets are <b>{drift_verdict}</b>. A number near 0.5 means the model is being asked to
score alerts drawn from the population it learned on, so the cross-validated figure
above is a meaningful guide to how it will behave on unseen alerts rather than a
number about a different population.</p>

<h2>What this estimate does and does not say</h2>
<p>Feature selection and hyperparameter tuning were both carried out on these same
cross-validation folds, so the figure above is optimistic as an estimate of unseen
performance &mdash; the columns that survived were chosen with all 14,000 labels visible.
It is a sound basis for <em>ranking our own candidates against each other</em>, which is
what we used it for, and it is not a held-out estimate. The per-model scores also
describe unbagged models; the submitted predictions average five seeds, which we
expect to help slightly but did not separately measure.</p>

<h2>Conclusion</h2>
<p>A compact, measured feature set with a regularized ensemble ranks alerts better than
a larger one. On a dataset this noisy the discipline that matters is honest validation:
differences smaller than the repeat-to-repeat standard deviation are not improvements,
and treating them as such is how a model that looks good locally fails on the leaderboard.</p>
</main></body></html>
"""
