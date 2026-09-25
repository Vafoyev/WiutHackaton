import json
from collections.abc import Sequence

import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.inspection import permutation_importance
from sklearn.model_selection import train_test_split

from src.config import EXPERIMENTS, N_JOBS, SEED
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
        n_jobs=N_JOBS,
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
