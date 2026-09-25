# AML Alert Prioritization — Design

**Team:** DnkCode (`2ABB3C78`) · WIUT Hackathon 2026 · FinTech / AI in Finance
**Deadline:** Sunday, 27 September 2026, 23:59 Tashkent
**Date written:** 2026-09-25

## Problem

For every `signal_id` in `test_signals.csv`, predict the probability that the AML
alert is escalated. Scored by ROC-AUC. Three deliverables: the prediction CSV, a
public EDA website, and a reproducible notebook.

## Intended outcome

A submission whose score we can trust before we submit it. The dataset carries
little signal, so the risk is not "we failed to find the clever feature" — it is
"we tuned on noise, believed a number that was never real, and ranked below a
plain baseline". Every design decision below serves measurement discipline first
and model capacity second.

## What we measured before designing

Ran a feature-family ablation on `train_signals.csv` (14,000 rows) with LightGBM
under 5-fold stratified CV. Families were added cumulatively:

| Added family | Columns | CV AUC | Delta |
| --- | ---: | ---: | ---: |
| base (count/sum/mean/std/min/max/span) | 7 | 0.55711 | — |
| amount shape (quantiles, skew, kurtosis) | 18 | 0.56852 | +0.01142 |
| direction & type (counts, means, sums, shares) | 42 | **0.60530** | +0.03678 |
| direction × type cross counts | 58 | 0.59916 | −0.00614 |
| flow (net, pass-through ratio) | 62 | 0.59869 | −0.00047 |
| time windows (3/7/14/30/60/90/120d) | 104 | 0.59893 | +0.00024 |
| burstiness (inter-arrival gaps) | 111 | 0.59594 | −0.00299 |
| hour / weekday habits | 118 | 0.59631 | +0.00037 |
| signal-date features | 124 | 0.59584 | −0.00046 |

Each family measured alone:

| Family | CV AUC alone |
| --- | ---: |
| direction & type | 0.58981 |
| base | 0.55711 |
| time windows | 0.54277 |
| amount shape | 0.53768 |
| flow | 0.51925 |
| hour / weekday | 0.51248 |
| direction × type cross | 0.50961 |
| burstiness | 0.50473 |
| signal-date | 0.50225 |

### Findings that drive the design

1. **Adding features reduces accuracy here.** The peak is 42 columns at 0.6053;
   the next 82 columns cost 0.0095 AUC. Four families are indistinguishable from
   random on their own.
2. **Single-split CV cannot resolve our decisions.** An earlier run with a
   different ~40-column set and `HistGradientBoostingClassifier` scored 0.6136 —
   0.008 above the LightGBM run here. That gap is the noise floor of 5-fold CV on
   14,000 rows, not evidence that one approach beats the other. Repeated CV is
   therefore a correctness requirement, not a nicety.
3. **Transaction history is a fixed 180-day window** ending at the alert date
   (`days_before` ∈ [−1.0, 180.0]). There is no long-horizon history to mine.
4. **The 0.012% of transactions dated after the alert are a timestamp artifact,
   not leakage.** `signal_sanasi` is a date at 00:00, so same-day transactions
   land fractionally "after" it. We drop `days_before < 0` rather than reason
   about it per row.

## Blocker (outside our control)

`fintech_data/test_transactions.parquet` is unrecoverable. The file was read as
text and re-encoded as UTF-8: every byte ≥ 0x80 became U+FFFD, 16,902,498 times.
Header and footer are intact, so it looks valid until the Thrift footer is
parsed. No parser can recover it — the bytes are gone.

Our partner is re-downloading it in binary mode. Until it lands, components 1–5,
8 and 9 below are fully buildable on training data; components 6–7 are written
but cannot run.

**Verification once replaced:**
```bash
python -c "import pyarrow.parquet as pq; print(pq.ParquetFile('fintech_data/test_transactions.parquet').metadata.num_rows)"
```

## Architecture

Nine modules, each with one responsibility and a testable interface.

### 1. `src/validation.py` — the measurement harness

Everything else is judged through this module; it is the load-bearing piece.

- `RepeatedStratifiedKFold(n_splits=5, n_repeats=4, random_state=SEED)`
- Returns mean AUC, std across repeats, and the full out-of-fold prediction
  vector for every evaluation.
- Appends one row per run to `experiments/log.csv`: timestamp, feature families,
  column count, model, params hash, CV mean, CV std.
- **Acceptance rule:** a change is adopted only when it improves `mean − std`.
  This is what stops us from chasing the noise floor identified above.

### 2. `src/features.py` — feature construction

- One builder used for train and test alike.
- **Fixed category schema:** `kirim_chiqim ∈ {kirim, chiqim}` and
  `tranzaksiya_turi ∈ {karta, bank_otkazmasi, naqd, xalqaro}` are declared
  constants, and every derived column is `reindex`ed onto them. This removes the
  `pd.crosstab` column-mismatch defect in the current `src/model.py`, where a
  category absent from test produces a missing column and a `KeyError` at
  predict time.
- Drops `days_before < 0` (finding 4).
- Families exposed as a `FEATURE_FAMILIES` registry so selection can toggle them.
- All families are built. None is discarded by hand — selection decides.

### 3. `src/selection.py` — evidence-driven feature selection

1. Greedy forward selection over families, scored through `validation.py`.
2. Permutation importance, then backward elimination at column level.
3. Output: a frozen column list persisted to `experiments/selected_features.json`.

Expected result: 25–45 columns, CV AUC ≈ 0.61–0.62.

### 4. `src/models.py` — models and tuning

- LightGBM, XGBoost, CatBoost, and regularized logistic regression.
- Optuna search spaces biased toward regularization (small `num_leaves`, large
  `min_child_samples`, strong `reg_lambda`, low `learning_rate`), because the
  measured failure mode is variance, not bias.
- Each configuration bagged over 5–10 seeds; the bagged score is what gets logged.

### 5. `src/ensemble.py` — combination

- Rank-average over model OOF predictions, weights fitted on OOF only.
- Prefer the simpler ensemble when the gain is under 0.001 AUC.

### 6. `src/adversarial.py` — train/test drift

LightGBM trained to separate train from test feature rows. Reports AUC and the
top drifting columns; any column that is both strongly drifting and weakly
predictive is dropped. **Requires the replaced test parquet.**

### 7. `src/predict.py` — submission

Writes `team_2ABB3C78.csv` (`signal_id,ehtimollik`, no index) and asserts, with
PASS/FAIL printed per rule: exactly one row per test `signal_id`, no duplicates,
no missing or extra IDs, every probability non-null and within [0, 1]. Refuses to
write on any failure. Fails loudly and specifically if the test parquet is still
corrupt.

### 8. `src/build_site.py` — EDA website

Precomputes aggregates into `site_data/` (a few hundred KB) and renders static
HTML with pre-rendered charts into `docs/`. No runtime, no memory ceiling, and
the 162MB of competition data never enters git.

Sections: approach and dataset; target distribution; activity over time; incoming
vs outgoing; transaction types and sizes; activity before the alert; escalated vs
dismissed comparisons; SHAP feature importance; **the ablation table above as the
headline finding**; conclusion.

Deployment is our partner's task; we hand over a ready `docs/` directory.

### 9. `notebooks/final_solution.ipynb`

Reproduces the submission end to end from `src/` with fixed seeds, executed via
`nbconvert --execute` so every output is present in the committed file. Every
number in the prose comes from a cell — no hardcoded figures, which is the defect
in both the current notebook and `app.py`.

## Repository hygiene

`fintech_data/` and `.DS_Store` are gitignored. `requirements.txt` gains
lightgbm, xgboost, catboost, optuna, shap, scipy with pinned versions. The
repository currently has no commits; the spec is the first.

## Success criteria

- Repeated-CV AUC at or above 0.61, with the std reported alongside it.
- `team_2ABB3C78.csv` passes every submission rule, verified by script output.
- `docs/` renders standalone with no data files and no runtime.
- The notebook runs top to bottom from a clean kernel and reproduces the CSV byte
  for byte.

## Explicitly out of scope

Deep learning on raw transaction sequences, external data, and pseudo-labelling
on test. At 14,000 rows and a 0.61 ceiling, each adds variance we cannot measure
our way out of before the deadline.

## Open question for the organizers

Whether more than one submission is permitted. `task.md` does not say. Our
approach is unchanged either way — local CV is the decision criterion — but it
determines whether a late resubmission is possible.
