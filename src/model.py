from pathlib import Path

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.model_selection import train_test_split


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "fintech_data"


def transaction_features(path: Path) -> pd.DataFrame:
    columns = ["signal_id", "tranzaksiya_vaqti", "kirim_chiqim", "tranzaksiya_turi", "miqdor_indeksi"]
    try:
        tx = pd.read_parquet(path, columns=columns)
    except Exception as exc:
        raise RuntimeError(f"Cannot read {path.name}; obtain a clean copy before modeling.") from exc
    tx["tranzaksiya_vaqti"] = pd.to_datetime(tx["tranzaksiya_vaqti"], errors="coerce")
    tx["miqdor_indeksi"] = pd.to_numeric(tx["miqdor_indeksi"], errors="coerce")
    g = tx.groupby("signal_id", sort=False)
    features = g["miqdor_indeksi"].agg(["count", "mean", "std", "min", "max", "sum"]).rename(
        columns=lambda name: f"amount_{name}"
    )
    features["tx_count"] = g.size()
    for column, prefix in [("kirim_chiqim", "direction"), ("tranzaksiya_turi", "type")]:
        counts = pd.crosstab(tx["signal_id"], tx[column])
        counts.columns = [f"{prefix}_{value}" for value in counts.columns]
        features = features.join(counts, how="left")
    times = g["tranzaksiya_vaqti"].agg(["min", "max"])
    features["history_days"] = (times["max"] - times["min"]).dt.total_seconds() / 86400
    return features.reset_index()


def build_features(signals: pd.DataFrame, tx_features: pd.DataFrame) -> pd.DataFrame:
    result = signals.copy()
    result["signal_sanasi"] = pd.to_datetime(result["signal_sanasi"], errors="coerce")
    result["signal_year"] = result["signal_sanasi"].dt.year
    result["signal_month"] = result["signal_sanasi"].dt.month
    result["signal_dayofweek"] = result["signal_sanasi"].dt.dayofweek
    result = result.merge(tx_features, on="signal_id", how="left", validate="one_to_one")
    return result.drop(columns="signal_sanasi")


def main() -> None:
    train = pd.read_csv(DATA / "train_signals.csv")
    test = pd.read_csv(DATA / "test_signals.csv")
    train_tx = transaction_features(DATA / "train_transactions.parquet")
    test_tx = transaction_features(DATA / "test_transactions.parquet")
    x_train = build_features(train.drop(columns="eskalatsiya"), train_tx)
    x_test = build_features(test, test_tx)
    feature_cols = [c for c in x_train.columns if c != "signal_id"]
    categories = x_train[feature_cols].select_dtypes(include="object").columns.tolist()
    numeric = [c for c in feature_cols if c not in categories]
    prep = ColumnTransformer([
        ("num", make_pipeline(SimpleImputer(strategy="median"), StandardScaler()), numeric),
        ("cat", make_pipeline(SimpleImputer(strategy="most_frequent"), OneHotEncoder(handle_unknown="ignore")), categories),
    ])
    model = make_pipeline(prep, LogisticRegression(max_iter=1000, class_weight="balanced"))
    x_fit, x_valid, y_fit, y_valid = train_test_split(
        x_train[feature_cols], train["eskalatsiya"], test_size=0.2, random_state=42, stratify=train["eskalatsiya"]
    )
    model.fit(x_fit, y_fit)
    print(f"Holdout ROC-AUC: {roc_auc_score(y_valid, model.predict_proba(x_valid)[:, 1]):.5f}")
    model.fit(x_train[feature_cols], train["eskalatsiya"])
    out = pd.DataFrame({"signal_id": x_test["signal_id"], "ehtimollik": model.predict_proba(x_test[feature_cols])[:, 1]})
    expected = pd.read_csv(DATA / "sample_submission (3).csv")["signal_id"]
    if out["signal_id"].duplicated().any() or set(out.signal_id) != set(expected):
        raise ValueError("Prediction IDs do not exactly match the sample submission.")
    out = expected.to_frame().merge(out, on="signal_id", how="left", validate="one_to_one")
    out.to_csv(ROOT / "team_2ABB3C78.csv", index=False)


if __name__ == "__main__":
    main()
