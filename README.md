# AML Alert Prioritization — DnkCode

**WIUT Hackathon 2026 · FinTech / AI in Finance · Team `2ABB3C78`**

Estimate the probability that an AML alert is escalated. Metric: ROC-AUC.

| Deliverable | Where |
| --- | --- |
| Prediction CSV | [`outputs/team_2ABB3C78.csv`](outputs/team_2ABB3C78.csv) |
| EDA website | **https://boos.uz/aml/** — built from [`eda-website/`](eda-website/) into [`docs/`](docs/) |
| Reproducible notebook | [`notebooks/final_solution.ipynb`](notebooks/final_solution.ipynb) |

**Cross-validated ROC-AUC 0.63757 ± 0.00086**, on 25 selected
features, measured by 5-fold cross-validation repeated 4 times.

---

## Quick start

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

python -m src.pipeline      # selection, tuning, ensemble, submission
python -m src.web_data      # regenerate the website's data file
pytest                      # 108 tests
```

Put the organizer's files in `fintech_data/`. They are gitignored and never
committed.

> **Extract the archive with a real unzip tool.** Our first copy of
> `test_transactions.parquet` had been read as text and re-encoded as UTF-8
> during extraction, replacing every byte above `0x7F` with U+FFFD — 16,902,498
> times, inflating 41 MB to 74 MB. The `PAR1` header and footer survive, so it
> looks valid until the Thrift footer is parsed, and no parser can recover it.
> Verify after extracting:
>
> ```bash
> python -c "import pyarrow.parquet as pq; print(pq.ParquetFile('fintech_data/test_transactions.parquet').metadata.num_rows)"
> ```

The website is built and published separately:

```bash
cd eda-website && npm install && npm run build   # writes ../docs
tools/deploy.sh                                  # publishes to https://boos.uz/aml/
```

It is static — 26 MB of files, no server-side compute — so it is dropped inside
an existing nginx document root rather than given its own server block; nothing
in `/etc/nginx` is modified.

---

## Approach

Each alert carries a fixed 180-day transaction history. We summarize it into
alert-level features, then **select among them by measurement rather than by
intuition**.

Eleven feature families are built and offered to selection. A greedy search at
*family* level keeps only two (direction_type + base); selecting
individual **columns** across all families beats that, because a weak family can
still contain a strong column. The shipped model uses **25 columns**
drawn from 8 of the 9 families that were in the run.

| | Columns | CV ROC-AUC |
| --- | ---: | ---: |
| Best single model (lightgbm) | 25 | 0.63260 |
| Four-model rank-average ensemble | 25 | **0.63757** ± 0.00086 |
| Ensemble gain over best single | | +0.00497 |

The acceptance rule throughout is **`mean − std` across CV repeats**, not `mean`.
Two equally good feature sets measured 0.6053 and 0.6136 in early probing; that
0.008 gap is the noise floor of a single 5-fold split on 14,000 rows. Treating
differences below it as improvements is how a locally impressive model fails on
the leaderboard.

Because the binding constraint is variance rather than capacity, every later
choice pushes the same way: regularization-biased hyperparameter search (small
`num_leaves`, large `min_child_samples`, strong `reg_lambda`), bagging over five
seeds, and equal-weight rank averaging unless fitted weights beat it by at least
0.001 AUC out of fold.

---

## Is the number real?

A cross-validated score is not self-validating, so we tested it three ways.

| Check | Result | Reading |
| --- | ---: | --- |
| Permutation test, fixed columns | null mean **0.5184** | no leakage |
| Untouched 20% holdout (2,800 alerts) | **0.62138** vs 0.61880 CV | optimism -0.00258 |
| Adversarial validation | **0.4956** | train and scoring alerts indistinguishable |

The permutation test shuffles the target and reruns the pipeline: an honest
evaluation scores 0.5 when there is nothing to find. With the column set fixed it
does. Run it with selection included and the null rises to 0.5184 — that 0.018 is
the winner's curse of picking the best of several candidates on the same data,
which is why we do not treat small cross-validated gains as real.

### Two things the headline number does not say

**The estimate is optimistic for unseen data.** Selection and Optuna tuning both
ran on these folds, so the columns that survived were chosen with all 14,000
labels visible. The figure ranks our own candidates against each other faithfully
— which is what we used it for — and is not a held-out estimate.

**The measured models are unbagged.** Every figure describes a single fit per
fold; the submitted predictions average five seeds.

### Two candidates we measured and did not ship

Both looked like improvements in cross-validation and did not survive a held-out
check.

1. **Amount statistics on the direction × type cross** (`cross_amount`,
   `type_quantiles`, in `src/features.py` and covered by tests). 16 of their
   columns enter the global top 40 and CV rises to 0.6454, but an untouched
   holdout moves only 0.6195 → 0.6223. Most of the CV gain is the selection step
   overfitting a wider feature space.
2. **A separate optimization run** with its own 3,500-row audit split
   ([`experiments/optimization_20260927/report.json`](experiments/optimization_20260927/report.json),
   not committed — 76 MB of scratch). Development CV
   0.6356 → 0.6573,
   audit 0.6339 → 0.6304, a gain of
   **-0.0035** with a 95% bootstrap interval spanning zero. It
   recorded `"promoted": false`.

Two independent searches reached the same conclusion, which is the reason the
shipped model is the simpler one.

---

## Layout

```
src/                model pipeline
  config.py         frozen constants: SEED, category tuples, paths
  data.py           loading, with actionable corrupt-parquet diagnosis
  features.py       eleven feature families on a frozen column schema
  validation.py     repeated-CV harness; every decision is judged here
  selection.py      family search + global column selection
  models.py         LightGBM / XGBoost / CatBoost / LogReg + seed bagging
  tuning.py         Optuna, scored on mean - std
  ensemble.py       rank averaging with OOF-fitted weights
  adversarial.py    train/test drift detection
  integrity.py      permutation test and untouched holdout
  submission.py     writes only after every competition rule passes
  pipeline.py       end-to-end run
  site_data.py      chart aggregates for the website
  web_data.py       generates the website's data file from experiments/
  build_site.py     standalone static fallback page

eda-website/        React + Vite source for the published site
docs/               built site (GitHub Pages serves this folder)
experiments/        log.csv (343 runs), summary.json,
                    selected_features.json, integrity.json
notebooks/          executed end-to-end notebook
design/             design spec and implementation plan
tools/              one-off scripts from building the site
tests/              108 tests
```

Every number on the website is generated by `src/web_data.py` from
`experiments/`; none is typed into a translation string, so a displayed figure
cannot drift from the run that produced it.
