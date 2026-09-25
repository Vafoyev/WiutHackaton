# AML Alert Prioritization — DnkCode

WIUT Hackathon 2026 · FinTech / AI in Finance · Team `2ABB3C78`

Predict the probability that an AML alert is escalated. Metric: ROC-AUC.

**Result: 0.6379 ensemble out-of-fold ROC-AUC** on 19 selected features, measured
by 5-fold cross-validation repeated 4 times.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Place the organizer-supplied files in `fintech_data/`. They are gitignored and
never committed.

**Download `test_transactions.parquet` in binary mode.** The copy we were first
given had been read as text and re-encoded as UTF-8, replacing every byte above
0x7F with U+FFFD — 16,902,498 times. Its `PAR1` header and footer survive, so it
looks valid until the Thrift footer is parsed, and no parser can recover it.
Verify any replacement with:

```bash
python -c "import pyarrow.parquet as pq; print(pq.ParquetFile('fintech_data/test_transactions.parquet').metadata.num_rows)"
```

## Deliverables

| Deliverable | Where | How to rebuild |
| --- | --- | --- |
| Prediction CSV | `outputs/team_2ABB3C78.csv` | `python -m src.pipeline` |
| EDA website | `docs/index.html` | `python -m src.build_site` |
| Reproducible notebook | `notebooks/final_solution.ipynb` | see below |

The website is static: charts are pre-rendered to inline data URIs, so the page
needs no runtime, no server, and no data files. Publish `docs/` on GitHub Pages
(Settings → Pages → deploy from branch, folder `/docs`).

## Running things

```bash
python -m src.pipeline          # full run: selection, tuning, ensemble, submission
python -m src.build_site        # rebuild docs/index.html
pytest                          # 53 tests
```

To reproduce the submission from a recorded run without repeating the search:

```python
from src.pipeline import predict_from_saved
predict_from_saved()
```

To re-execute the notebook with all outputs:

```bash
jupyter nbconvert --to notebook --execute --inplace \
  --ExecutePreprocessor.timeout=3600 notebooks/final_solution.ipynb
```

## Approach

Each alert carries a fixed 180-day transaction history. We summarize it into
alert-level features, then **select among them by measurement rather than by
intuition**.

Nine feature families were built and offered to a greedy forward search judged on
repeated cross-validation. The search kept two of them, and permutation-importance
elimination then cut 31 columns to 19 — which *raised* accuracy:

| Stage | Columns | CV ROC-AUC |
| --- | ---: | ---: |
| `direction_type` alone | 24 | 0.6012 |
| `+ base` | 31 | 0.6161 |
| after column elimination | **19** | **0.6324** |
| four-model rank-average ensemble | 19 | **0.6379** |

Four families — `hour`, `burst`, `cross`, `signal_date` — scored at or below
chance on their own and were rejected.

The acceptance rule throughout is **`mean − std` across CV repeats**, not `mean`.
Two equally good feature sets measured 0.6053 and 0.6136 in early probing; that
0.008 gap is the noise floor of a single 5-fold split on 14,000 rows. Treating
differences below it as improvements is how a locally impressive model fails on
the leaderboard.

Because the binding constraint is variance rather than capacity, every later
choice pushes the same direction: regularization-biased hyperparameter search
(small `num_leaves`, large `min_child_samples`, strong `reg_lambda`), bagging over
multiple seeds, and equal-weight rank averaging unless fitted weights beat it by
at least 0.001 AUC on out-of-fold predictions.

## Layout

```
src/
  config.py       frozen constants: SEED, category tuples, paths
  data.py         loading, with actionable corrupt-parquet diagnosis
  features.py     nine feature families on a frozen column schema
  validation.py   repeated-CV harness; every decision is judged here
  selection.py    forward family selection + permutation elimination
  models.py       LightGBM / XGBoost / CatBoost / LogReg + seed bagging
  tuning.py       Optuna, scored on mean - std
  ensemble.py     rank averaging with OOF-fitted weights
  adversarial.py  train/test drift detection
  submission.py   writes only after every competition rule passes
  pipeline.py     end-to-end run
  site_data.py    small aggregates for the website
  build_site.py   static HTML renderer
experiments/      log.csv (88 runs), summary.json, selected_features.json
docs/             the published EDA site, plus spec and plan
```

Design and plan: `docs/superpowers/specs/` and `docs/superpowers/plans/`.
