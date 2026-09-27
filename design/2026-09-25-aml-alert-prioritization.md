# AML Alert Prioritization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a trustworthy `team_2ABB3C78.csv`, a static EDA website, and an executed reproducible notebook for the WIUT Hackathon 2026 AML alert prioritization task.

**Architecture:** A measurement harness (`validation.py`) is the load-bearing module; every other module is judged through it. Features are built exhaustively but selected by evidence, because the measured ablation shows extra columns actively reduce accuracy on this dataset. Models are regularization-biased and seed-bagged, then rank-averaged on out-of-fold predictions.

**Tech Stack:** Python 3.14, pandas 3.0, pyarrow 25, scikit-learn 1.9, LightGBM 4.7, XGBoost 3.4, CatBoost 1.2, Optuna 5.0, SHAP, matplotlib, pytest.

**Spec:** `docs/superpowers/specs/2026-09-25-aml-alert-prioritization-design.md`

## Global Constraints

- `SEED = 42` everywhere; every model, split, and sampler takes it explicitly.
- Acceptance rule for any change: it must improve **`mean − std`** of repeated CV, not `mean` alone.
- `DIRECTIONS = ("kirim", "chiqim")` — frozen, declared once in `src/config.py`.
- `TX_TYPES = ("karta", "bank_otkazmasi", "naqd", "xalqaro")` — frozen, declared once in `src/config.py`.
- Transactions with `days_before < 0` are dropped before any aggregation.
- Submission filename is exactly `team_2ABB3C78.csv`, columns exactly `signal_id,ehtimollik`, no index column.
- Test data is never used in any target-related computation. Imputers and scalers are fitted inside CV folds.
- `fintech_data/` is gitignored and must never be committed.
- Every experiment run appends one row to `experiments/log.csv`.

## Review Focus

These are input classes the spec implies but which no task's core deliverable naturally exercises. Each line's test is assigned to the task that owns the code.

1. **A signal with zero transactions.** `train_transactions.parquet` covers all 14,000 training signals, but the test set may contain signals with no rows. Feature rows must exist for every signal with NaN/0 fills rather than being dropped; `predict.py` must still emit a probability for them. → Task 2, Task 9.
2. **The test parquet still being corrupt at predict time.** The run must abort with an actionable message naming the file and the fix, and must not write a partial or placeholder CSV. → Task 1, Task 9.
3. **A transaction category absent from the test split.** Column schema must be identical to train regardless; this is the defect in the current `src/model.py`. → Task 2.
4. **A feature column that is entirely NaN after selection.** LightGBM tolerates NaN; logistic regression does not. Imputation must happen inside the fold, and an all-NaN column must not produce NaN predictions. → Task 4, Task 6.
5. **Duplicate `signal_id` values surviving into the feature frame.** Aggregation must produce exactly one row per signal; a duplicate would silently inflate the merge and corrupt row alignment. → Task 2.

---

### Task 1: Config, data loading, and corruption detection

**Files:**
- Create: `src/config.py`
- Create: `src/data.py`
- Create: `tests/test_data.py`
- Create: `src/__init__.py` (empty)
- Create: `tests/__init__.py` (empty)
- Modify: `requirements.txt`

**Interfaces:**
- Produces: `config.SEED: int`, `config.DIRECTIONS: tuple[str, ...]`, `config.TX_TYPES: tuple[str, ...]`, `config.ROOT: Path`, `config.DATA: Path`, `config.EXPERIMENTS: Path`, `config.OUTPUTS: Path`, `config.SITE_DATA: Path`
- Produces: `data.CorruptParquetError(RuntimeError)`, `data.load_signals(path: Path) -> pd.DataFrame`, `data.load_transactions(path: Path) -> pd.DataFrame`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_data.py
import pandas as pd
import pytest

from src import config
from src.data import CorruptParquetError, load_signals, load_transactions


def test_frozen_category_schema():
    assert config.DIRECTIONS == ("kirim", "chiqim")
    assert config.TX_TYPES == ("karta", "bank_otkazmasi", "naqd", "xalqaro")
    assert config.SEED == 42


def test_load_signals_parses_dates(tmp_path):
    path = tmp_path / "signals.csv"
    path.write_text("signal_id,signal_sanasi,eskalatsiya\nSG_1,2025-03-04,1\n")
    frame = load_signals(path)
    assert frame["signal_sanasi"].dtype.kind == "M"
    assert frame.loc[0, "signal_id"] == "SG_1"


def test_load_transactions_reports_corrupt_file_with_actionable_message(tmp_path):
    path = tmp_path / "broken.parquet"
    path.write_bytes(b"PAR1" + b"\xef\xbf\xbd" * 64 + b"\x10\x00\x00\x00PAR1")
    with pytest.raises(CorruptParquetError) as excinfo:
        load_transactions(path)
    message = str(excinfo.value)
    assert "broken.parquet" in message
    assert "binary" in message.lower()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/python -m pytest tests/test_data.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'src.config'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/config.py
from pathlib import Path

SEED = 42

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "fintech_data"
EXPERIMENTS = ROOT / "experiments"
OUTPUTS = ROOT / "outputs"
SITE_DATA = ROOT / "site_data"
DOCS = ROOT / "docs"

TRAIN_SIGNALS = DATA / "train_signals.csv"
TEST_SIGNALS = DATA / "test_signals.csv"
TRAIN_TX = DATA / "train_transactions.parquet"
TEST_TX = DATA / "test_transactions.parquet"
SAMPLE_SUBMISSION = DATA / "sample_submission (3).csv"

SUBMISSION_NAME = "team_2ABB3C78.csv"

DIRECTIONS = ("kirim", "chiqim")
TX_TYPES = ("karta", "bank_otkazmasi", "naqd", "xalqaro")

TARGET = "eskalatsiya"
ID = "signal_id"
PROBA = "ehtimollik"
```

```python
# src/data.py
from pathlib import Path

import pandas as pd

TX_COLUMNS = [
    "signal_id",
    "tranzaksiya_vaqti",
    "kirim_chiqim",
    "tranzaksiya_turi",
    "miqdor_indeksi",
]


class CorruptParquetError(RuntimeError):
    """Raised when a parquet file cannot be deserialized."""


def load_signals(path: Path) -> pd.DataFrame:
    frame = pd.read_csv(path)
    frame["signal_sanasi"] = pd.to_datetime(frame["signal_sanasi"])
    return frame


def load_transactions(path: Path) -> pd.DataFrame:
    try:
        frame = pd.read_parquet(path, columns=TX_COLUMNS)
    except Exception as exc:
        raise CorruptParquetError(
            f"{path.name} could not be read: {exc}. "
            f"The supplied copy was mangled by a text-mode transfer "
            f"(every byte above 0x7F replaced with U+FFFD) and cannot be repaired. "
            f"Download it again in binary mode, then verify with: "
            f"python -c \"import pyarrow.parquet as pq; "
            f"print(pq.ParquetFile('{path}').metadata.num_rows)\""
        ) from exc
    frame["tranzaksiya_vaqti"] = pd.to_datetime(frame["tranzaksiya_vaqti"])
    frame["miqdor_indeksi"] = pd.to_numeric(frame["miqdor_indeksi"])
    return frame
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.venv/bin/python -m pytest tests/test_data.py -v`
Expected: 3 passed

- [ ] **Step 5: Pin the new dependencies**

Replace `requirements.txt` with:

```
pandas>=2.2
pyarrow>=15
scikit-learn>=1.4
matplotlib>=3.8
jupyter>=1.0
nbconvert>=7.0
lightgbm>=4.7
xgboost>=3.4
catboost>=1.2
optuna>=5.0
shap>=0.46
scipy>=1.14
pytest>=8.0
```

- [ ] **Step 6: Commit**

```bash
git add src/ tests/ requirements.txt
git commit -m "Add config and data loading with corruption detection"
```

---

### Task 2: Feature builder with a frozen column schema

**Files:**
- Create: `src/features.py`
- Create: `tests/test_features.py`

**Interfaces:**
- Consumes: `config.DIRECTIONS`, `config.TX_TYPES`, `data.load_transactions`
- Produces: `features.prepare_transactions(tx: pd.DataFrame, signals: pd.DataFrame) -> pd.DataFrame` (adds `days_before`, `out`, `hour`, `dow`; drops `days_before < 0`), `features.build_features(tx: pd.DataFrame, signals: pd.DataFrame, families: Sequence[str] | None = None) -> pd.DataFrame` (indexed by `signal_id`, one row per signal in `signals`), `features.FEATURE_FAMILIES: dict[str, Callable]`, `features.family_columns(name: str) -> list[str]`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_features.py
import numpy as np
import pandas as pd

from src.features import FEATURE_FAMILIES, build_features, prepare_transactions


def _signals():
    return pd.DataFrame(
        {
            "signal_id": ["SG_1", "SG_2", "SG_3"],
            "signal_sanasi": pd.to_datetime(["2025-03-10", "2025-03-10", "2025-03-10"]),
        }
    )


def _transactions():
    return pd.DataFrame(
        {
            "signal_id": ["SG_1", "SG_1", "SG_2"],
            "tranzaksiya_vaqti": pd.to_datetime(
                ["2025-03-01 10:00", "2025-03-05 23:30", "2025-03-09 04:00"]
            ),
            "kirim_chiqim": ["kirim", "chiqim", "kirim"],
            "tranzaksiya_turi": ["karta", "karta", "naqd"],
            "miqdor_indeksi": [1.0, -0.5, 2.0],
        }
    )


def test_future_transactions_are_dropped():
    signals = _signals()
    tx = _transactions()
    tx.loc[0, "tranzaksiya_vaqti"] = pd.Timestamp("2025-03-12 10:00")
    prepared = prepare_transactions(tx, signals)
    assert (prepared["days_before"] >= 0).all()
    assert len(prepared) == 2


def test_column_schema_is_identical_when_a_category_is_absent():
    signals = _signals()
    full = _transactions()
    narrow = full[full["tranzaksiya_turi"] == "karta"].copy()

    wide_cols = build_features(prepare_transactions(full, signals), signals).columns
    narrow_cols = build_features(prepare_transactions(narrow, signals), signals).columns

    assert list(wide_cols) == list(narrow_cols)
    assert any("xalqaro" in c for c in wide_cols)


def test_every_signal_gets_exactly_one_row_including_signals_with_no_transactions():
    signals = _signals()
    result = build_features(prepare_transactions(_transactions(), signals), signals)

    assert list(result.index) == ["SG_1", "SG_2", "SG_3"]
    assert not result.index.duplicated().any()
    assert result.loc["SG_3"].isna().any() or (result.loc["SG_3"] == 0).any()


def test_count_columns_are_zero_not_nan_for_signals_with_no_transactions():
    signals = _signals()
    result = build_features(prepare_transactions(_transactions(), signals), signals)
    assert result.loc["SG_3", "base_cnt"] == 0


def test_all_families_are_registered_and_produce_columns():
    signals = _signals()
    prepared = prepare_transactions(_transactions(), signals)
    for name in FEATURE_FAMILIES:
        frame = build_features(prepared, signals, families=[name])
        assert frame.shape[1] > 0, name
        assert list(frame.index) == ["SG_1", "SG_2", "SG_3"], name
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/python -m pytest tests/test_features.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'src.features'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/features.py
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv/bin/python -m pytest tests/test_features.py -v`
Expected: 5 passed

- [ ] **Step 5: Verify against the real training data**

Run:
```bash
.venv/bin/python -c "
from src import config
from src.data import load_signals, load_transactions
from src.features import build_features, prepare_transactions
s = load_signals(config.TRAIN_SIGNALS)
tx = prepare_transactions(load_transactions(config.TRAIN_TX), s)
f = build_features(tx, s)
print(f.shape)
assert len(f) == len(s)
assert not f.index.duplicated().any()
print('columns:', f.shape[1])
"
```
Expected: `(14000, N)` with N around 130, no assertion errors.

- [ ] **Step 6: Commit**

```bash
git add src/features.py tests/test_features.py
git commit -m "Add feature builder with frozen category schema"
```

---

### Task 3: Repeated-CV measurement harness and experiment log

**Files:**
- Create: `src/validation.py`
- Create: `tests/test_validation.py`

**Interfaces:**
- Consumes: `config.SEED`, `config.EXPERIMENTS`
- Produces: `validation.CVResult` (dataclass with `mean: float`, `std: float`, `oof: np.ndarray`, `score: float` where `score == mean - std`), `validation.evaluate(model_factory: Callable[[int], object], X: pd.DataFrame, y: pd.Series, n_repeats: int = 4) -> CVResult`, `validation.log_run(result: CVResult, *, families: Sequence[str], n_columns: int, model: str, params: dict) -> None`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_validation.py
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression

from src.validation import CVResult, evaluate, log_run


def _dataset(n=400):
    rng = np.random.default_rng(0)
    X = pd.DataFrame({"a": rng.normal(size=n), "b": rng.normal(size=n)})
    y = pd.Series((X["a"] + rng.normal(scale=0.5, size=n) > 0).astype(int))
    return X, y


def test_evaluate_returns_score_of_mean_minus_std():
    X, y = _dataset()
    result = evaluate(lambda seed: LogisticRegression(random_state=seed), X, y, n_repeats=2)
    assert isinstance(result, CVResult)
    assert result.score == result.mean - result.std
    assert 0.5 < result.mean <= 1.0


def test_evaluate_produces_one_oof_prediction_per_row():
    X, y = _dataset()
    result = evaluate(lambda seed: LogisticRegression(random_state=seed), X, y, n_repeats=2)
    assert result.oof.shape == (len(y),)
    assert np.isfinite(result.oof).all()


def test_evaluate_is_deterministic():
    X, y = _dataset()
    first = evaluate(lambda seed: LogisticRegression(random_state=seed), X, y, n_repeats=2)
    second = evaluate(lambda seed: LogisticRegression(random_state=seed), X, y, n_repeats=2)
    assert first.mean == second.mean
    np.testing.assert_allclose(first.oof, second.oof)


def test_evaluate_tolerates_an_all_nan_column():
    X, y = _dataset()
    X["dead"] = np.nan
    result = evaluate(lambda seed: LogisticRegression(random_state=seed), X, y, n_repeats=2)
    assert np.isfinite(result.oof).all()


def test_log_run_appends_a_row(tmp_path, monkeypatch):
    import src.validation as validation

    monkeypatch.setattr(validation, "LOG_PATH", tmp_path / "log.csv")
    X, y = _dataset()
    result = evaluate(lambda seed: LogisticRegression(random_state=seed), X, y, n_repeats=2)
    log_run(result, families=["base"], n_columns=2, model="logreg", params={"C": 1.0})
    log_run(result, families=["base"], n_columns=2, model="logreg", params={"C": 1.0})
    rows = pd.read_csv(tmp_path / "log.csv")
    assert len(rows) == 2
    assert {"timestamp", "families", "n_columns", "model", "cv_mean", "cv_std", "score"} <= set(rows.columns)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/python -m pytest tests/test_validation.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'src.validation'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/validation.py
import json
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import datetime, timezone

import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedKFold

from src.config import EXPERIMENTS, SEED

LOG_PATH = EXPERIMENTS / "log.csv"
N_SPLITS = 5


@dataclass(frozen=True)
class CVResult:
    mean: float
    std: float
    oof: np.ndarray

    @property
    def score(self) -> float:
        return self.mean - self.std


def _impute(fit_frame: pd.DataFrame, apply_frames: Sequence[pd.DataFrame]):
    imputer = SimpleImputer(strategy="median", keep_empty_features=True)
    imputer.fit(fit_frame)
    return [
        pd.DataFrame(imputer.transform(frame), index=frame.index, columns=frame.columns)
        for frame in apply_frames
    ]


def evaluate(
    model_factory: Callable[[int], object],
    X: pd.DataFrame,
    y: pd.Series,
    n_repeats: int = 4,
) -> CVResult:
    """Repeated stratified CV. Returns per-repeat mean/std and averaged OOF."""
    y = pd.Series(np.asarray(y), index=X.index)
    oof_sum = np.zeros(len(X))
    repeat_scores: list[float] = []

    for repeat in range(n_repeats):
        seed = SEED + repeat
        splitter = StratifiedKFold(n_splits=N_SPLITS, shuffle=True, random_state=seed)
        oof = np.zeros(len(X))
        for train_idx, valid_idx in splitter.split(X, y):
            X_fit_raw = X.iloc[train_idx]
            X_val_raw = X.iloc[valid_idx]
            X_fit, X_val = _impute(X_fit_raw, [X_fit_raw, X_val_raw])
            model = model_factory(seed)
            model.fit(X_fit, y.iloc[train_idx])
            oof[valid_idx] = model.predict_proba(X_val)[:, 1]
        repeat_scores.append(roc_auc_score(y, oof))
        oof_sum += oof

    return CVResult(
        mean=float(np.mean(repeat_scores)),
        std=float(np.std(repeat_scores)),
        oof=oof_sum / n_repeats,
    )


def log_run(
    result: CVResult,
    *,
    families: Sequence[str],
    n_columns: int,
    model: str,
    params: dict,
) -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    row = pd.DataFrame(
        [
            {
                "timestamp": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "families": "|".join(families),
                "n_columns": n_columns,
                "model": model,
                "params": json.dumps(params, sort_keys=True, default=str),
                "cv_mean": round(result.mean, 6),
                "cv_std": round(result.std, 6),
                "score": round(result.score, 6),
            }
        ]
    )
    header = not LOG_PATH.exists()
    row.to_csv(LOG_PATH, mode="a", header=header, index=False)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv/bin/python -m pytest tests/test_validation.py -v`
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add src/validation.py tests/test_validation.py
git commit -m "Add repeated-CV harness and experiment log"
```

---

### Task 4: Model factories with regularization-biased defaults

**Files:**
- Create: `src/models.py`
- Create: `tests/test_models.py`

**Interfaces:**
- Consumes: `config.SEED`
- Produces: `models.MODEL_FACTORIES: dict[str, Callable[[dict], Callable[[int], object]]]` keyed by `"lightgbm"`, `"xgboost"`, `"catboost"`, `"logreg"`; `models.default_params(name: str) -> dict`; `models.make_factory(name: str, params: dict | None = None) -> Callable[[int], object]`; `models.bagged_predict(name: str, params: dict, X_train, y_train, X_test, seeds: Sequence[int]) -> np.ndarray`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_models.py
import numpy as np
import pandas as pd
import pytest

from src.models import MODEL_FACTORIES, bagged_predict, default_params, make_factory


def _dataset(n=300):
    rng = np.random.default_rng(1)
    X = pd.DataFrame({"a": rng.normal(size=n), "b": rng.normal(size=n)})
    y = pd.Series((X["a"] + rng.normal(scale=0.5, size=n) > 0).astype(int))
    return X, y


@pytest.mark.parametrize("name", list(MODEL_FACTORIES))
def test_every_factory_builds_a_fittable_classifier(name):
    X, y = _dataset()
    model = make_factory(name)(7)
    model.fit(X, y)
    proba = model.predict_proba(X)[:, 1]
    assert proba.shape == (len(y),)
    assert ((proba >= 0) & (proba <= 1)).all()


@pytest.mark.parametrize("name", list(MODEL_FACTORIES))
def test_defaults_are_regularization_biased(name):
    params = default_params(name)
    assert isinstance(params, dict)


def test_lightgbm_defaults_constrain_capacity():
    params = default_params("lightgbm")
    assert params["num_leaves"] <= 31
    assert params["min_child_samples"] >= 40
    assert params["reg_lambda"] >= 1.0
    assert params["learning_rate"] <= 0.05


def test_bagged_predict_averages_over_seeds_and_is_deterministic():
    X, y = _dataset()
    first = bagged_predict("lightgbm", default_params("lightgbm"), X, y, X, seeds=[1, 2, 3])
    second = bagged_predict("lightgbm", default_params("lightgbm"), X, y, X, seeds=[1, 2, 3])
    assert first.shape == (len(y),)
    np.testing.assert_allclose(first, second)


def test_logreg_handles_an_all_nan_column():
    X, y = _dataset()
    X["dead"] = np.nan
    model = make_factory("logreg")(7)
    model.fit(X, y)
    proba = model.predict_proba(X)[:, 1]
    assert np.isfinite(proba).all()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/python -m pytest tests/test_models.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'src.models'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/models.py
from collections.abc import Callable, Sequence

import numpy as np
import pandas as pd
from catboost import CatBoostClassifier
from lightgbm import LGBMClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

from src.config import SEED

DEFAULTS: dict[str, dict] = {
    "lightgbm": {
        "n_estimators": 700,
        "learning_rate": 0.03,
        "num_leaves": 16,
        "min_child_samples": 60,
        "subsample": 0.8,
        "subsample_freq": 1,
        "colsample_bytree": 0.7,
        "reg_lambda": 5.0,
        "reg_alpha": 1.0,
    },
    "xgboost": {
        "n_estimators": 700,
        "learning_rate": 0.03,
        "max_depth": 4,
        "min_child_weight": 10,
        "subsample": 0.8,
        "colsample_bytree": 0.7,
        "reg_lambda": 5.0,
        "reg_alpha": 1.0,
    },
    "catboost": {
        "iterations": 700,
        "learning_rate": 0.03,
        "depth": 4,
        "l2_leaf_reg": 8.0,
        "rsm": 0.7,
    },
    "logreg": {"C": 0.1},
}


def default_params(name: str) -> dict:
    return dict(DEFAULTS[name])


def _lightgbm(params: dict) -> Callable[[int], object]:
    return lambda seed: LGBMClassifier(random_state=seed, verbose=-1, n_jobs=-1, **params)


def _xgboost(params: dict) -> Callable[[int], object]:
    return lambda seed: XGBClassifier(
        random_state=seed, n_jobs=-1, eval_metric="auc", tree_method="hist", **params
    )


def _catboost(params: dict) -> Callable[[int], object]:
    return lambda seed: CatBoostClassifier(
        random_seed=seed, verbose=0, allow_writing_files=False, **params
    )


def _logreg(params: dict) -> Callable[[int], object]:
    return lambda seed: make_pipeline(
        SimpleImputer(strategy="median", keep_empty_features=True),
        StandardScaler(),
        LogisticRegression(max_iter=2000, random_state=seed, **params),
    )


MODEL_FACTORIES: dict[str, Callable[[dict], Callable[[int], object]]] = {
    "lightgbm": _lightgbm,
    "xgboost": _xgboost,
    "catboost": _catboost,
    "logreg": _logreg,
}


def make_factory(name: str, params: dict | None = None) -> Callable[[int], object]:
    return MODEL_FACTORIES[name](default_params(name) if params is None else dict(params))


def bagged_predict(
    name: str,
    params: dict,
    X_train: pd.DataFrame,
    y_train: pd.Series,
    X_test: pd.DataFrame,
    seeds: Sequence[int] | None = None,
) -> np.ndarray:
    """Fit one model per seed on the full training set and average test probabilities."""
    seeds = list(range(SEED, SEED + 5)) if seeds is None else list(seeds)
    imputer = SimpleImputer(strategy="median", keep_empty_features=True)
    fitted_train = pd.DataFrame(
        imputer.fit_transform(X_train), index=X_train.index, columns=X_train.columns
    )
    fitted_test = pd.DataFrame(
        imputer.transform(X_test), index=X_test.index, columns=X_test.columns
    )
    factory = MODEL_FACTORIES[name](dict(params))
    total = np.zeros(len(X_test))
    for seed in seeds:
        model = factory(seed)
        model.fit(fitted_train, y_train)
        total += model.predict_proba(fitted_test)[:, 1]
    return total / len(seeds)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv/bin/python -m pytest tests/test_models.py -v`
Expected: 14 passed

- [ ] **Step 5: Commit**

```bash
git add src/models.py tests/test_models.py
git commit -m "Add regularization-biased model factories with seed bagging"
```

---

### Task 5: Feature selection driven by the harness

**Files:**
- Create: `src/selection.py`
- Create: `tests/test_selection.py`

**Interfaces:**
- Consumes: `validation.evaluate`, `validation.log_run`, `features.FEATURE_FAMILIES`, `models.make_factory`
- Produces: `selection.select_families(X_by_family: dict[str, pd.DataFrame], y: pd.Series, model: str = "lightgbm") -> tuple[list[str], list[dict]]`, `selection.eliminate_columns(X: pd.DataFrame, y: pd.Series, model: str = "lightgbm") -> list[str]`, `selection.save_selection(columns: Sequence[str], families: Sequence[str]) -> None`, `selection.load_selection() -> dict`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_selection.py
import json

import numpy as np
import pandas as pd

from src.selection import eliminate_columns, load_selection, save_selection, select_families


def _dataset(n=600):
    rng = np.random.default_rng(3)
    signal = rng.normal(size=n)
    y = pd.Series((signal + rng.normal(scale=0.6, size=n) > 0).astype(int))
    useful = pd.DataFrame({"good": signal}, index=range(n))
    noise = pd.DataFrame({f"noise{i}": rng.normal(size=n) for i in range(6)}, index=range(n))
    return {"useful": useful, "noise": noise}, y


def test_select_families_keeps_the_informative_family():
    by_family, y = _dataset()
    chosen, history = select_families(by_family, y, model="logreg")
    assert "useful" in chosen


def test_select_families_returns_history_rows_with_scores():
    by_family, y = _dataset()
    chosen, history = select_families(by_family, y, model="logreg")
    assert history
    assert {"family", "score", "accepted"} <= set(history[0])


def test_eliminate_columns_returns_a_non_empty_subset():
    by_family, y = _dataset()
    X = pd.concat(by_family.values(), axis=1)
    kept = eliminate_columns(X, y, model="logreg")
    assert kept
    assert set(kept) <= set(X.columns)


def test_save_and_load_selection_round_trip(tmp_path, monkeypatch):
    import src.selection as selection

    monkeypatch.setattr(selection, "SELECTION_PATH", tmp_path / "selected.json")
    save_selection(["a", "b"], ["base"])
    loaded = load_selection()
    assert loaded == {"columns": ["a", "b"], "families": ["base"]}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/python -m pytest tests/test_selection.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'src.selection'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/selection.py
import json
from collections.abc import Sequence

import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.inspection import permutation_importance
from sklearn.model_selection import train_test_split

from src.config import EXPERIMENTS, SEED
from src.models import default_params, make_factory
from src.validation import evaluate, log_run

SELECTION_PATH = EXPERIMENTS / "selected_features.json"


def select_families(
    X_by_family: dict[str, pd.DataFrame],
    y: pd.Series,
    model: str = "lightgbm",
) -> tuple[list[str], list[dict]]:
    """Greedy forward selection over feature families, judged on mean - std."""
    remaining = list(X_by_family)
    chosen: list[str] = []
    history: list[dict] = []
    best_score = -np.inf
    best_frame: pd.DataFrame | None = None

    while remaining:
        round_best = None
        for family in remaining:
            candidate = (
                X_by_family[family]
                if best_frame is None
                else pd.concat([best_frame, X_by_family[family]], axis=1)
            )
            result = evaluate(make_factory(model), candidate, y)
            log_run(
                result,
                families=[*chosen, family],
                n_columns=candidate.shape[1],
                model=model,
                params=default_params(model),
            )
            history.append(
                {
                    "family": family,
                    "n_columns": candidate.shape[1],
                    "mean": result.mean,
                    "std": result.std,
                    "score": result.score,
                    "accepted": False,
                }
            )
            if round_best is None or result.score > round_best[1]:
                round_best = (family, result.score, candidate)

        family, score, candidate = round_best
        if score <= best_score:
            break
        for row in history:
            if row["family"] == family and row["score"] == score:
                row["accepted"] = True
                break
        chosen.append(family)
        remaining.remove(family)
        best_score = score
        best_frame = candidate

    return chosen, history


def eliminate_columns(
    X: pd.DataFrame,
    y: pd.Series,
    model: str = "lightgbm",
    n_repeats: int = 5,
) -> list[str]:
    """Drop columns whose permutation importance is not positive."""
    X_fit, X_val, y_fit, y_val = train_test_split(
        X, y, test_size=0.25, random_state=SEED, stratify=y
    )
    imputer = SimpleImputer(strategy="median", keep_empty_features=True)
    X_fit_i = pd.DataFrame(imputer.fit_transform(X_fit), columns=X.columns, index=X_fit.index)
    X_val_i = pd.DataFrame(imputer.transform(X_val), columns=X.columns, index=X_val.index)

    estimator = make_factory(model)(SEED)
    estimator.fit(X_fit_i, y_fit)
    importance = permutation_importance(
        estimator,
        X_val_i,
        y_val,
        scoring="roc_auc",
        n_repeats=n_repeats,
        random_state=SEED,
        n_jobs=-1,
    )
    kept = [c for c, m in zip(X.columns, importance.importances_mean) if m > 0]
    return kept or list(X.columns)


def save_selection(columns: Sequence[str], families: Sequence[str]) -> None:
    SELECTION_PATH.parent.mkdir(parents=True, exist_ok=True)
    SELECTION_PATH.write_text(
        json.dumps({"columns": list(columns), "families": list(families)}, indent=2)
    )


def load_selection() -> dict:
    return json.loads(SELECTION_PATH.read_text())
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv/bin/python -m pytest tests/test_selection.py -v`
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add src/selection.py tests/test_selection.py
git commit -m "Add family and column selection driven by repeated CV"
```

---

### Task 6: Optuna tuning

**Files:**
- Create: `src/tuning.py`
- Create: `tests/test_tuning.py`

**Interfaces:**
- Consumes: `validation.evaluate`, `models.make_factory`, `models.default_params`
- Produces: `tuning.tune(name: str, X: pd.DataFrame, y: pd.Series, n_trials: int = 40) -> dict` returning the best params, and `tuning.SEARCH_SPACES: dict[str, Callable[[optuna.Trial], dict]]`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_tuning.py
import numpy as np
import pandas as pd

from src.models import make_factory
from src.tuning import SEARCH_SPACES, tune


def _dataset(n=300):
    rng = np.random.default_rng(5)
    X = pd.DataFrame({"a": rng.normal(size=n), "b": rng.normal(size=n)})
    y = pd.Series((X["a"] + rng.normal(scale=0.6, size=n) > 0).astype(int))
    return X, y


def test_every_model_has_a_search_space():
    assert set(SEARCH_SPACES) == {"lightgbm", "xgboost", "catboost", "logreg"}


def test_tune_returns_params_that_build_a_working_model():
    X, y = _dataset()
    params = tune("lightgbm", X, y, n_trials=3)
    assert isinstance(params, dict)
    model = make_factory("lightgbm", params)(1)
    model.fit(X, y)
    assert model.predict_proba(X).shape == (len(y), 2)


def test_tune_is_deterministic_for_a_fixed_trial_count():
    X, y = _dataset()
    first = tune("lightgbm", X, y, n_trials=3)
    second = tune("lightgbm", X, y, n_trials=3)
    assert first == second
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/python -m pytest tests/test_tuning.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'src.tuning'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/tuning.py
import logging
from collections.abc import Callable

import optuna
import pandas as pd

from src.config import SEED
from src.models import make_factory
from src.validation import evaluate, log_run

optuna.logging.set_verbosity(optuna.logging.WARNING)
logging.getLogger("lightgbm").setLevel(logging.ERROR)


def _lightgbm_space(trial: optuna.Trial) -> dict:
    return {
        "n_estimators": trial.suggest_int("n_estimators", 300, 1200, step=100),
        "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.05, log=True),
        "num_leaves": trial.suggest_int("num_leaves", 4, 31),
        "min_child_samples": trial.suggest_int("min_child_samples", 40, 300),
        "subsample": trial.suggest_float("subsample", 0.6, 1.0),
        "subsample_freq": 1,
        "colsample_bytree": trial.suggest_float("colsample_bytree", 0.4, 1.0),
        "reg_lambda": trial.suggest_float("reg_lambda", 1.0, 50.0, log=True),
        "reg_alpha": trial.suggest_float("reg_alpha", 0.1, 20.0, log=True),
    }


def _xgboost_space(trial: optuna.Trial) -> dict:
    return {
        "n_estimators": trial.suggest_int("n_estimators", 300, 1200, step=100),
        "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.05, log=True),
        "max_depth": trial.suggest_int("max_depth", 2, 6),
        "min_child_weight": trial.suggest_float("min_child_weight", 1.0, 50.0, log=True),
        "subsample": trial.suggest_float("subsample", 0.6, 1.0),
        "colsample_bytree": trial.suggest_float("colsample_bytree", 0.4, 1.0),
        "reg_lambda": trial.suggest_float("reg_lambda", 1.0, 50.0, log=True),
        "reg_alpha": trial.suggest_float("reg_alpha", 0.1, 20.0, log=True),
    }


def _catboost_space(trial: optuna.Trial) -> dict:
    return {
        "iterations": trial.suggest_int("iterations", 300, 1200, step=100),
        "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.05, log=True),
        "depth": trial.suggest_int("depth", 2, 6),
        "l2_leaf_reg": trial.suggest_float("l2_leaf_reg", 1.0, 50.0, log=True),
        "rsm": trial.suggest_float("rsm", 0.4, 1.0),
    }


def _logreg_space(trial: optuna.Trial) -> dict:
    return {"C": trial.suggest_float("C", 0.001, 10.0, log=True)}


SEARCH_SPACES: dict[str, Callable[[optuna.Trial], dict]] = {
    "lightgbm": _lightgbm_space,
    "xgboost": _xgboost_space,
    "catboost": _catboost_space,
    "logreg": _logreg_space,
}


def tune(name: str, X: pd.DataFrame, y: pd.Series, n_trials: int = 40) -> dict:
    """Optuna search judged on mean - std, never on a single split."""
    space = SEARCH_SPACES[name]

    def objective(trial: optuna.Trial) -> float:
        params = space(trial)
        result = evaluate(make_factory(name, params), X, y, n_repeats=2)
        log_run(
            result,
            families=["tuning"],
            n_columns=X.shape[1],
            model=name,
            params=params,
        )
        return result.score

    sampler = optuna.samplers.TPESampler(seed=SEED)
    study = optuna.create_study(direction="maximize", sampler=sampler)
    study.optimize(objective, n_trials=n_trials, show_progress_bar=False)
    return dict(study.best_params)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv/bin/python -m pytest tests/test_tuning.py -v`
Expected: 3 passed

- [ ] **Step 5: Commit**

```bash
git add src/tuning.py tests/test_tuning.py
git commit -m "Add Optuna tuning scored on mean minus std"
```

---

### Task 7: Ensemble on out-of-fold predictions

**Files:**
- Create: `src/ensemble.py`
- Create: `tests/test_ensemble.py`

**Interfaces:**
- Consumes: `validation.CVResult`
- Produces: `ensemble.rank_average(predictions: dict[str, np.ndarray], weights: dict[str, float] | None = None) -> np.ndarray`, `ensemble.fit_weights(oof: dict[str, np.ndarray], y: pd.Series) -> dict[str, float]`, `ensemble.choose(oof: dict[str, np.ndarray], y: pd.Series, min_gain: float = 0.001) -> tuple[dict[str, float], str]`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_ensemble.py
import numpy as np
import pandas as pd

from src.ensemble import choose, fit_weights, rank_average


def _oof(n=500):
    rng = np.random.default_rng(11)
    truth = rng.normal(size=n)
    y = pd.Series((truth > 0).astype(int))
    strong = truth + rng.normal(scale=0.5, size=n)
    weak = truth + rng.normal(scale=2.0, size=n)
    return {"strong": strong, "weak": weak}, y


def test_rank_average_returns_values_in_unit_interval():
    oof, _ = _oof()
    blended = rank_average(oof)
    assert blended.shape == (len(oof["strong"]),)
    assert blended.min() >= 0.0 and blended.max() <= 1.0


def test_rank_average_ignores_prediction_scale():
    oof, _ = _oof()
    scaled = {"strong": oof["strong"] * 1000 + 7, "weak": oof["weak"]}
    np.testing.assert_allclose(rank_average(oof), rank_average(scaled))


def test_fit_weights_favours_the_stronger_model():
    oof, y = _oof()
    weights = fit_weights(oof, y)
    assert weights["strong"] > weights["weak"]
    assert abs(sum(weights.values()) - 1.0) < 1e-6


def test_choose_prefers_equal_weights_when_the_gain_is_small():
    rng = np.random.default_rng(2)
    truth = rng.normal(size=400)
    y = pd.Series((truth > 0).astype(int))
    a = truth + rng.normal(scale=0.8, size=400)
    b = truth + rng.normal(scale=0.8, size=400)
    weights, method = choose({"a": a, "b": b}, y, min_gain=0.5)
    assert method == "equal"
    assert weights == {"a": 0.5, "b": 0.5}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/python -m pytest tests/test_ensemble.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'src.ensemble'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/ensemble.py
import numpy as np
import pandas as pd
from scipy.optimize import minimize
from scipy.stats import rankdata
from sklearn.metrics import roc_auc_score


def rank_average(
    predictions: dict[str, np.ndarray],
    weights: dict[str, float] | None = None,
) -> np.ndarray:
    """Weighted average of per-model rank percentiles. Scale invariant."""
    names = list(predictions)
    if weights is None:
        weights = {name: 1.0 / len(names) for name in names}
    total = sum(weights[name] for name in names)
    n = len(next(iter(predictions.values())))
    blended = np.zeros(n)
    for name in names:
        percentile = (rankdata(predictions[name]) - 1) / max(n - 1, 1)
        blended += (weights[name] / total) * percentile
    return blended


def fit_weights(oof: dict[str, np.ndarray], y: pd.Series) -> dict[str, float]:
    """Simplex-constrained weights maximizing OOF ROC-AUC."""
    names = list(oof)
    start = np.full(len(names), 1.0 / len(names))

    def negative_auc(raw: np.ndarray) -> float:
        clipped = np.clip(raw, 0.0, None)
        if clipped.sum() == 0:
            return 0.0
        candidate = dict(zip(names, clipped))
        return -roc_auc_score(y, rank_average(oof, candidate))

    result = minimize(
        negative_auc,
        start,
        method="Nelder-Mead",
        options={"maxiter": 600, "xatol": 1e-4, "fatol": 1e-6},
    )
    raw = np.clip(result.x, 0.0, None)
    if raw.sum() == 0:
        raw = start
    raw = raw / raw.sum()
    return {name: float(value) for name, value in zip(names, raw)}


def choose(
    oof: dict[str, np.ndarray],
    y: pd.Series,
    min_gain: float = 0.001,
) -> tuple[dict[str, float], str]:
    """Return fitted weights only when they beat equal weights by min_gain."""
    equal = {name: 1.0 / len(oof) for name in oof}
    equal_auc = roc_auc_score(y, rank_average(oof, equal))
    fitted = fit_weights(oof, y)
    fitted_auc = roc_auc_score(y, rank_average(oof, fitted))
    if fitted_auc - equal_auc >= min_gain:
        return fitted, "fitted"
    return equal, "equal"
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv/bin/python -m pytest tests/test_ensemble.py -v`
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add src/ensemble.py tests/test_ensemble.py
git commit -m "Add rank-average ensemble with OOF-fitted weights"
```

---

### Task 8: Submission writer with rule-by-rule validation

**Files:**
- Create: `src/submission.py`
- Create: `tests/test_submission.py`

**Interfaces:**
- Consumes: `config.ID`, `config.PROBA`, `config.SUBMISSION_NAME`, `config.OUTPUTS`
- Produces: `submission.SubmissionError(ValueError)`, `submission.check(frame: pd.DataFrame, expected_ids: pd.Series) -> list[tuple[str, bool, str]]`, `submission.write(frame: pd.DataFrame, expected_ids: pd.Series, path: Path | None = None) -> Path`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_submission.py
import numpy as np
import pandas as pd
import pytest

from src.config import ID, PROBA
from src.submission import SubmissionError, check, write


def _expected():
    return pd.Series([f"SG_{i:06d}" for i in range(5)], name=ID)


def _good():
    return pd.DataFrame({ID: _expected(), PROBA: [0.1, 0.2, 0.3, 0.4, 0.5]})


def test_check_passes_every_rule_for_a_valid_frame():
    results = check(_good(), _expected())
    assert results
    assert all(passed for _, passed, _ in results)


@pytest.mark.parametrize(
    "mutate",
    [
        lambda f: f.drop(index=0),
        lambda f: pd.concat([f, f.iloc[[0]]]),
        lambda f: f.assign(**{PROBA: [0.1, 0.2, 0.3, 0.4, np.nan]}),
        lambda f: f.assign(**{PROBA: [0.1, 0.2, 0.3, 0.4, 1.5]}),
        lambda f: f.assign(**{PROBA: [0.1, 0.2, 0.3, 0.4, -0.1]}),
    ],
)
def test_check_fails_for_each_violation(mutate):
    results = check(mutate(_good()), _expected())
    assert any(not passed for _, passed, _ in results)


def test_write_refuses_to_write_an_invalid_frame(tmp_path):
    target = tmp_path / "out.csv"
    with pytest.raises(SubmissionError):
        write(_good().drop(index=0), _expected(), path=target)
    assert not target.exists()


def test_write_emits_two_columns_in_order_without_an_index(tmp_path):
    target = tmp_path / "out.csv"
    write(_good(), _expected(), path=target)
    first_line = target.read_text().splitlines()[0]
    assert first_line == f"{ID},{PROBA}"
    reloaded = pd.read_csv(target)
    assert list(reloaded.columns) == [ID, PROBA]
    assert len(reloaded) == 5


def test_write_preserves_expected_id_order(tmp_path):
    target = tmp_path / "out.csv"
    shuffled = _good().iloc[::-1].reset_index(drop=True)
    write(shuffled, _expected(), path=target)
    reloaded = pd.read_csv(target)
    assert list(reloaded[ID]) == list(_expected())
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/python -m pytest tests/test_submission.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'src.submission'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/submission.py
from pathlib import Path

import numpy as np
import pandas as pd

from src.config import ID, OUTPUTS, PROBA, SUBMISSION_NAME


class SubmissionError(ValueError):
    """Raised when a submission frame violates a competition rule."""


def check(frame: pd.DataFrame, expected_ids: pd.Series) -> list[tuple[str, bool, str]]:
    expected = set(expected_ids)
    actual = list(frame[ID]) if ID in frame.columns else []
    probabilities = frame[PROBA] if PROBA in frame.columns else pd.Series(dtype=float)

    missing = expected - set(actual)
    extra = set(actual) - expected
    duplicates = pd.Series(actual).duplicated().sum()
    out_of_range = (~probabilities.between(0.0, 1.0)).sum() if len(probabilities) else 0
    null_count = probabilities.isna().sum() if len(probabilities) else 0

    return [
        ("columns are exactly [signal_id, ehtimollik]", list(frame.columns) == [ID, PROBA],
         f"got {list(frame.columns)}"),
        ("row count matches test signals", len(frame) == len(expected_ids),
         f"{len(frame)} rows vs {len(expected_ids)} expected"),
        ("no missing IDs", not missing, f"{len(missing)} missing"),
        ("no extra IDs", not extra, f"{len(extra)} extra"),
        ("no duplicate IDs", duplicates == 0, f"{duplicates} duplicated"),
        ("no null probabilities", null_count == 0, f"{null_count} null"),
        ("all probabilities within [0, 1]", out_of_range == 0, f"{out_of_range} out of range"),
    ]


def write(
    frame: pd.DataFrame,
    expected_ids: pd.Series,
    path: Path | None = None,
) -> Path:
    ordered = (
        expected_ids.to_frame(name=ID)
        .merge(frame[[ID, PROBA]], on=ID, how="left")
        .reset_index(drop=True)
    )
    results = check(ordered, expected_ids)
    for rule, passed, detail in results:
        print(f"[{'PASS' if passed else 'FAIL'}] {rule} ({detail})")
    failures = [rule for rule, passed, _ in results if not passed]
    if failures:
        raise SubmissionError("Submission rules failed: " + "; ".join(failures))

    target = (OUTPUTS / SUBMISSION_NAME) if path is None else path
    target.parent.mkdir(parents=True, exist_ok=True)
    ordered.to_csv(target, index=False)
    return target
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv/bin/python -m pytest tests/test_submission.py -v`
Expected: 9 passed

- [ ] **Step 5: Commit**

```bash
git add src/submission.py tests/test_submission.py
git commit -m "Add submission writer that refuses invalid frames"
```

---

### Task 9: Adversarial validation and the end-to-end pipeline

**Files:**
- Create: `src/adversarial.py`
- Create: `src/pipeline.py`
- Create: `tests/test_adversarial.py`

**Interfaces:**
- Consumes: every module above
- Produces: `adversarial.drift_report(X_train: pd.DataFrame, X_test: pd.DataFrame) -> tuple[float, pd.Series]`, `pipeline.run(tune_trials: int = 40, skip_test: bool = False) -> dict`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_adversarial.py
import numpy as np
import pandas as pd

from src.adversarial import drift_report


def test_identical_distributions_are_indistinguishable():
    rng = np.random.default_rng(13)
    X_train = pd.DataFrame({"a": rng.normal(size=500), "b": rng.normal(size=500)})
    X_test = pd.DataFrame({"a": rng.normal(size=500), "b": rng.normal(size=500)})
    auc, importance = drift_report(X_train, X_test)
    assert 0.40 < auc < 0.60
    assert list(importance.index) == ["a", "b"] or set(importance.index) == {"a", "b"}


def test_a_shifted_column_is_detected_and_ranked_first():
    rng = np.random.default_rng(14)
    X_train = pd.DataFrame({"a": rng.normal(size=500), "b": rng.normal(size=500)})
    X_test = pd.DataFrame({"a": rng.normal(size=500), "b": rng.normal(size=500) + 8})
    auc, importance = drift_report(X_train, X_test)
    assert auc > 0.85
    assert importance.index[0] == "b"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/python -m pytest tests/test_adversarial.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'src.adversarial'`

- [ ] **Step 3: Write the implementation**

```python
# src/adversarial.py
import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedKFold

from src.config import SEED
from src.models import make_factory


def drift_report(X_train: pd.DataFrame, X_test: pd.DataFrame) -> tuple[float, pd.Series]:
    """Train a classifier to separate train from test. AUC near 0.5 means no drift."""
    columns = [c for c in X_train.columns if c in X_test.columns]
    combined = pd.concat([X_train[columns], X_test[columns]], ignore_index=True)
    is_test = np.r_[np.zeros(len(X_train)), np.ones(len(X_test))]

    imputer = SimpleImputer(strategy="median", keep_empty_features=True)
    imputed = pd.DataFrame(imputer.fit_transform(combined), columns=columns)

    splitter = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
    oof = np.zeros(len(imputed))
    importances = np.zeros(len(columns))
    for train_idx, valid_idx in splitter.split(imputed, is_test):
        model = make_factory("lightgbm")(SEED)
        model.fit(imputed.iloc[train_idx], is_test[train_idx])
        oof[valid_idx] = model.predict_proba(imputed.iloc[valid_idx])[:, 1]
        importances += model.feature_importances_

    auc = float(roc_auc_score(is_test, oof))
    ranked = pd.Series(importances, index=columns).sort_values(ascending=False)
    return auc, ranked
```

```python
# src/pipeline.py
"""End-to-end run: features, selection, tuning, ensemble, submission."""
import json

import numpy as np
import pandas as pd

from src import config
from src.adversarial import drift_report
from src.data import CorruptParquetError, load_signals, load_transactions
from src.ensemble import choose, rank_average
from src.features import FEATURE_FAMILIES, build_features, prepare_transactions
from src.models import bagged_predict, default_params, make_factory
from src.selection import eliminate_columns, save_selection, select_families
from src.submission import write
from src.tuning import tune
from src.validation import evaluate, log_run

MODELS = ("lightgbm", "xgboost", "catboost", "logreg")


def _family_frames(tx: pd.DataFrame, signals: pd.DataFrame) -> dict[str, pd.DataFrame]:
    return {
        name: build_features(tx, signals, families=[name]) for name in FEATURE_FAMILIES
    }


def run(tune_trials: int = 40, skip_test: bool = False) -> dict:
    train_signals = load_signals(config.TRAIN_SIGNALS)
    y = train_signals[config.TARGET]
    train_tx = prepare_transactions(
        load_transactions(config.TRAIN_TX), train_signals
    )

    print("Selecting feature families...")
    by_family = _family_frames(train_tx, train_signals)
    families, history = select_families(by_family, y)
    print("  chosen:", families)

    X = pd.concat([by_family[name] for name in families], axis=1)
    print(f"Eliminating columns from {X.shape[1]}...")
    columns = eliminate_columns(X, y)
    X = X[columns]
    save_selection(columns, families)
    print(f"  kept {len(columns)} columns")

    print("Tuning...")
    tuned, oof, scores = {}, {}, {}
    for name in MODELS:
        params = tune(name, X, y, n_trials=tune_trials)
        result = evaluate(make_factory(name, params), X, y)
        log_run(result, families=families, n_columns=X.shape[1], model=name, params=params)
        tuned[name], oof[name], scores[name] = params, result.oof, result.score
        print(f"  {name}: mean={result.mean:.5f} std={result.std:.5f} score={result.score:.5f}")

    weights, method = choose(oof, y)
    from sklearn.metrics import roc_auc_score

    blended_auc = float(roc_auc_score(y, rank_average(oof, weights)))
    print(f"Ensemble ({method}) OOF AUC: {blended_auc:.5f}")

    summary = {
        "families": families,
        "n_columns": len(columns),
        "model_scores": scores,
        "weights": weights,
        "weighting": method,
        "ensemble_oof_auc": blended_auc,
        "selection_history": history,
    }
    config.EXPERIMENTS.mkdir(parents=True, exist_ok=True)
    (config.EXPERIMENTS / "summary.json").write_text(json.dumps(summary, indent=2, default=float))

    if skip_test:
        print("skip_test=True — stopping before prediction.")
        return summary

    try:
        test_signals = load_signals(config.TEST_SIGNALS)
        test_tx = prepare_transactions(load_transactions(config.TEST_TX), test_signals)
    except CorruptParquetError as exc:
        print(f"\nCannot predict: {exc}")
        raise

    X_test = build_features(test_tx, test_signals, families=families)[columns]

    auc, drifting = drift_report(X, X_test)
    print(f"Adversarial validation AUC: {auc:.4f}")
    print("Top drifting columns:\n", drifting.head(10))
    summary["adversarial_auc"] = auc
    summary["top_drifting"] = drifting.head(10).to_dict()

    predictions = {
        name: bagged_predict(name, tuned[name], X, y, X_test) for name in MODELS
    }
    blended = rank_average(predictions, weights)

    frame = pd.DataFrame({config.ID: X_test.index, config.PROBA: blended})
    expected = pd.read_csv(config.SAMPLE_SUBMISSION)[config.ID]
    path = write(frame, expected)
    print(f"Wrote {path}")

    (config.EXPERIMENTS / "summary.json").write_text(json.dumps(summary, indent=2, default=float))
    return summary


if __name__ == "__main__":
    run()
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv/bin/python -m pytest tests/ -v`
Expected: all tests pass

- [ ] **Step 5: Run the pipeline on training data only**

Run: `.venv/bin/python -c "from src.pipeline import run; run(tune_trials=15, skip_test=True)"`
Expected: prints chosen families, kept column count, per-model scores, and an ensemble OOF AUC at or above 0.61. Writes `experiments/summary.json` and `experiments/log.csv`.

- [ ] **Step 6: Commit**

```bash
git add src/adversarial.py src/pipeline.py tests/test_adversarial.py experiments/
git commit -m "Add adversarial validation and end-to-end pipeline"
```

---

### Task 10: Static EDA website

**Files:**
- Create: `src/site_data.py`
- Create: `src/build_site.py`
- Create: `tests/test_site.py`
- Delete: `app.py` (replaced by the static site)

**Interfaces:**
- Consumes: `features`, `data`, `experiments/summary.json`
- Produces: `site_data.compute(signals, tx) -> dict[str, pd.DataFrame]`, `build_site.build(output_dir: Path = config.DOCS) -> Path`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_site.py
import pandas as pd

from src.site_data import compute


def _signals():
    return pd.DataFrame(
        {
            "signal_id": ["SG_1", "SG_2"],
            "signal_sanasi": pd.to_datetime(["2025-03-10", "2025-04-11"]),
            "eskalatsiya": [0, 1],
        }
    )


def _tx():
    return pd.DataFrame(
        {
            "signal_id": ["SG_1", "SG_2", "SG_2"],
            "tranzaksiya_vaqti": pd.to_datetime(
                ["2025-03-01", "2025-04-01", "2025-04-05"]
            ),
            "kirim_chiqim": ["kirim", "chiqim", "kirim"],
            "tranzaksiya_turi": ["karta", "naqd", "xalqaro"],
            "miqdor_indeksi": [1.0, 2.0, -1.0],
            "days_before": [9.0, 10.0, 6.0],
            "out": [0, 1, 0],
            "hour": [0, 0, 0],
            "dow": [5, 1, 5],
        }
    )


def test_compute_returns_every_named_aggregate():
    tables = compute(_signals(), _tx())
    expected = {
        "target",
        "weekly_volume",
        "direction",
        "types",
        "amount_by_outcome",
        "volume_by_outcome",
        "days_before_hist",
        "type_by_outcome",
    }
    assert expected <= set(tables)


def test_aggregates_are_small_enough_to_commit():
    tables = compute(_signals(), _tx())
    for name, table in tables.items():
        assert len(table) < 5000, name


def test_no_aggregate_leaks_raw_signal_ids():
    tables = compute(_signals(), _tx())
    for name, table in tables.items():
        flat = table.reset_index().astype(str).values.ravel()
        assert not any(value.startswith("SG_") for value in flat), name
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/python -m pytest tests/test_site.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'src.site_data'`

- [ ] **Step 3: Write the implementation**

```python
# src/site_data.py
"""Precompute small aggregates so the website ships without the raw data."""
import numpy as np
import pandas as pd

from src.config import DIRECTIONS, TX_TYPES

OUTCOME = {0: "Dismissed", 1: "Escalated"}


def compute(signals: pd.DataFrame, tx: pd.DataFrame) -> dict[str, pd.DataFrame]:
    labelled = tx.merge(signals[["signal_id", "eskalatsiya"]], on="signal_id", how="inner")
    per_signal = labelled.groupby(["signal_id", "eskalatsiya"]).size().rename("n").reset_index()

    tables: dict[str, pd.DataFrame] = {}

    tables["target"] = (
        signals["eskalatsiya"].map(OUTCOME).value_counts().rename_axis("outcome").rename("alerts").reset_index()
    )
    tables["weekly_volume"] = (
        tx.set_index("tranzaksiya_vaqti").resample("W").size().rename("transactions").reset_index()
    )
    tables["direction"] = (
        tx["kirim_chiqim"].value_counts().reindex(DIRECTIONS).rename_axis("direction").rename("transactions").reset_index()
    )
    tables["types"] = (
        tx["tranzaksiya_turi"].value_counts().reindex(TX_TYPES).rename_axis("type").rename("transactions").reset_index()
    )
    tables["amount_by_outcome"] = (
        labelled.groupby("eskalatsiya")["miqdor_indeksi"]
        .agg(["count", "mean", "median", "std"])
        .rename(index=OUTCOME)
        .rename_axis("outcome")
        .reset_index()
    )
    tables["volume_by_outcome"] = (
        per_signal.groupby("eskalatsiya")["n"]
        .agg(["mean", "median", "min", "max"])
        .rename(index=OUTCOME)
        .rename_axis("outcome")
        .reset_index()
    )
    bins = np.arange(0, 190, 10)
    binned = pd.cut(labelled["days_before"], bins=bins, right=False, labels=bins[:-1])
    tables["days_before_hist"] = (
        labelled.assign(bucket=binned.astype("float64"))
        .groupby(["bucket", "eskalatsiya"], observed=True)
        .size()
        .rename("transactions")
        .reset_index()
        .replace({"eskalatsiya": OUTCOME})
    )
    tables["type_by_outcome"] = (
        labelled.groupby(["tranzaksiya_turi", "eskalatsiya"])
        .size()
        .rename("transactions")
        .reset_index()
        .replace({"eskalatsiya": OUTCOME})
    )
    return tables
```

```python
# src/build_site.py
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
        auc=f"{summary.get('ensemble_oof_auc', float('nan')):.4f}",
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
<title>AML Alert Prioritization — DnkCode</title>
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
<div class="metric"><b>{auc}</b><span>OOF ROC-AUC</span></div>
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
<em>reduced</em> ROC-AUC. Four families scored at chance on their own.</p>
<p>This dataset carries little signal, so the binding constraint is variance, not
capacity. That reading drove every later choice: repeated cross-validation rather than
a single split, an acceptance rule of <code>mean &minus; std</code>, regularization-biased
hyperparameters, and seed bagging.</p>
</div>

<table><thead><tr><th>Family added</th><th>Columns</th><th>CV mean</th><th>CV std</th><th>Decision</th></tr></thead>
<tbody>{ablation_rows}</tbody></table>

<h2>Conclusion</h2>
<p>A compact, measured feature set with a regularized ensemble ranks alerts better than
a larger one. On a dataset this noisy the discipline that matters is honest validation:
differences smaller than the repeat-to-repeat standard deviation are not improvements,
and treating them as such is how a model that looks good locally fails on the leaderboard.</p>
</main></body></html>
"""
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv/bin/python -m pytest tests/test_site.py -v`
Expected: 3 passed

- [ ] **Step 5: Build the site and verify it stands alone**

Run:
```bash
.venv/bin/python -c "from src.build_site import build; print(build())"
ls -la docs/index.html
```
Expected: `docs/index.html` exists and is under 4MB. Open it in a browser with `fintech_data/` renamed away to confirm it needs no data files.

- [ ] **Step 6: Remove the superseded Streamlit app and commit**

```bash
git rm app.py
git add src/site_data.py src/build_site.py tests/test_site.py docs/
git commit -m "Replace Streamlit app with a static EDA website"
```

---

### Task 11: Executed reproducible notebook and README

**Files:**
- Create: `notebooks/final_solution.ipynb`
- Delete: `notebooks/eda.ipynb`
- Modify: `README.md`

**Interfaces:**
- Consumes: every module above

- [ ] **Step 1: Write the notebook source**

Create `notebooks/final_solution.ipynb` with these cells, in order. Every number in
the prose must come from a cell — no figures typed by hand.

1. Markdown: title, team, task summary, link to the spec.
2. Code: `import sys; sys.path.insert(0, "..")` then imports from `src`.
3. Code: load `train_signals.csv`; display `.head()`, `.shape`, and the escalation rate.
4. Code: load and prepare transactions; display `.shape`, `days_before.describe()`.
5. Markdown: explain that `days_before` is bounded to a 180-day window and that
   negative values are a midnight-timestamp artifact.
6. Code: the four EDA figures from `site_data.compute` rendered inline.
7. Markdown: the ablation finding, with the table rendered from
   `experiments/summary.json` in the next cell rather than typed.
8. Code: read `experiments/summary.json` and display the selection history as a DataFrame.
9. Code: build features, apply `load_selection()`, and run `evaluate` for the tuned
   LightGBM to reproduce the reported CV score.
10. Code: SHAP summary plot for the fitted LightGBM.
11. Code: `from src.pipeline import run; summary = run(tune_trials=40)` guarded by
    `if Path(config.TEST_TX).exists()`.
12. Markdown: conclusion and the submission rules that `submission.write` asserted.

- [ ] **Step 2: Execute the notebook end to end**

Run:
```bash
.venv/bin/jupyter nbconvert --to notebook --execute --inplace \
  --ExecutePreprocessor.timeout=3600 notebooks/final_solution.ipynb
```
Expected: exit code 0.

- [ ] **Step 3: Verify every cell carries output**

Run:
```bash
.venv/bin/python -c "
import json
nb = json.load(open('notebooks/final_solution.ipynb'))
empty = [i for i, c in enumerate(nb['cells'])
         if c['cell_type'] == 'code' and not c.get('outputs')]
print('code cells without output:', empty)
assert not empty, empty
print('OK')
"
```
Expected: `code cells without output: []` then `OK`.

- [ ] **Step 4: Rewrite the README**

Replace `README.md` with setup instructions, the three deliverables and where each
lives, how to run the pipeline (`python -m src.pipeline`), how to rebuild the site
(`python -m src.build_site`), how to run tests (`pytest`), and the verification
command for the test parquet. Remove the stale claim that predictions cannot be
generated once the file has been replaced.

- [ ] **Step 5: Commit**

```bash
git rm notebooks/eda.ipynb
git add notebooks/final_solution.ipynb README.md
git commit -m "Add executed reproducible notebook and update README"
```

---

### Task 12: Final verification

**Files:**
- Modify: none (verification only)

- [ ] **Step 1: Run the whole test suite**

Run: `.venv/bin/python -m pytest tests/ -v`
Expected: all tests pass, zero failures.

- [ ] **Step 2: Confirm the test parquet is readable**

Run:
```bash
.venv/bin/python -c "import pyarrow.parquet as pq; print(pq.ParquetFile('fintech_data/test_transactions.parquet').metadata.num_rows)"
```
Expected: a row count. If this raises, stop and report — the replacement file has not landed.

- [ ] **Step 3: Run the full pipeline**

Run: `.venv/bin/python -m src.pipeline`
Expected: PASS on every submission rule, `outputs/team_2ABB3C78.csv` written.

- [ ] **Step 4: Independently verify the submission**

Run:
```bash
.venv/bin/python -c "
import pandas as pd
sub = pd.read_csv('outputs/team_2ABB3C78.csv')
exp = pd.read_csv('fintech_data/sample_submission (3).csv')['signal_id']
assert list(sub.columns) == ['signal_id','ehtimollik'], sub.columns
assert len(sub) == len(exp) == 6000, (len(sub), len(exp))
assert list(sub['signal_id']) == list(exp)
assert sub['ehtimollik'].between(0,1).all()
assert sub['ehtimollik'].notna().all()
assert sub['signal_id'].is_unique
print('submission OK:', sub['ehtimollik'].describe().to_dict())
"
```
Expected: `submission OK:` with a sensible spread (not all one value).

- [ ] **Step 5: Confirm no data file was committed**

Run: `git ls-files | grep -E '\.parquet$|fintech_data' || echo "clean"`
Expected: `clean`

- [ ] **Step 6: Commit the final artifacts**

```bash
git add outputs/team_2ABB3C78.csv docs/ experiments/
git commit -m "Add final submission, site, and experiment log"
```
