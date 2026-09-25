"""End-to-end run: features, selection, tuning, ensemble, submission."""
import json

import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score

from src import config
from src.adversarial import drift_report
from src.data import CorruptParquetError, load_signals, load_transactions
from src.ensemble import choose, rank_average
from src.features import FEATURE_FAMILIES, build_features, prepare_transactions
from src.models import bagged_predict, make_factory
from src.selection import eliminate_columns, load_selection, save_selection, select_families
from src.submission import write
from src.tuning import tune
from src.validation import evaluate, log_run

MODELS = ("lightgbm", "xgboost", "catboost", "logreg")

SUMMARY_PATH = config.EXPERIMENTS / "summary.json"


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
        "tuned_params": tuned,
    }
    config.EXPERIMENTS.mkdir(parents=True, exist_ok=True)
    SUMMARY_PATH.write_text(json.dumps(summary, indent=2, default=float))

    if skip_test:
        print("skip_test=True — stopping before prediction.")
        return summary

    drift = _predict_and_write(families, columns, weights, tuned)
    summary.update(drift)
    SUMMARY_PATH.write_text(json.dumps(summary, indent=2, default=float))
    return summary


def _predict_and_write(
    families: list[str],
    columns: list[str],
    weights: dict[str, float],
    tuned: dict[str, dict],
) -> dict:
    """Build test features, report drift, and write the validated submission."""
    train_signals = load_signals(config.TRAIN_SIGNALS)
    y = train_signals[config.TARGET]
    train_tx = prepare_transactions(load_transactions(config.TRAIN_TX), train_signals)
    X = build_features(train_tx, train_signals, families=families)[columns]

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

    predictions = {
        name: bagged_predict(name, tuned[name], X, y, X_test) for name in MODELS
    }
    blended = rank_average(predictions, weights)

    frame = pd.DataFrame({config.ID: X_test.index, config.PROBA: blended})
    expected = pd.read_csv(config.SAMPLE_SUBMISSION)[config.ID]
    path = write(frame, expected)
    print(f"Wrote {path}")

    return {"adversarial_auc": auc, "top_drifting": drifting.head(10).to_dict()}


def predict_from_saved():
    """Reproduce the submission from a recorded run, without re-searching."""
    if not SUMMARY_PATH.exists():
        raise FileNotFoundError(
            f"{SUMMARY_PATH} not found. Run `python -m src.pipeline` first; "
            f"it records the chosen families, the frozen columns, and the tuned params."
        )
    summary = json.loads(SUMMARY_PATH.read_text())
    return _predict_and_write(
        summary["families"],
        load_selection()["columns"],
        summary["weights"],
        summary["tuned_params"],
    )


if __name__ == "__main__":
    run()
