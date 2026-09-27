"""Reproducible model search isolated from the legacy experiment artifacts.

python -m src.optimize --stage features
python -m src.optimize --stage search
python -m src.optimize --stage finalize

Search sees development CV only. A separately frozen audit split is evaluated
once after the recipe is frozen. The legacy model had already seen all labels
during selection, so its audit result is a comparison, not an unbiased estimate.
"""
import argparse
import hashlib
import json
import shutil
import time
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import rankdata
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import SplineTransformer, StandardScaler

from src import config
from src.data import load_signals, load_transactions
from src.enhanced_features import build_enhanced_features
from src.features import build_features, prepare_transactions
from src.models import make_factory
from src.submission import write

RUN = config.EXPERIMENTS / "optimization_20260927"
SPLIT_SEED = 20260927
CV_SEEDS = (137, 271)


def dump(path, value):
    path.write_text(json.dumps(value, indent=2, allow_nan=False) + "\n")


def fingerprint():
    paths = [config.TRAIN_SIGNALS, config.TEST_SIGNALS, config.TRAIN_TX, config.TEST_TX,
             Path(__file__).with_name("features.py"), Path(__file__).with_name("enhanced_features.py")]
    h = hashlib.sha256()
    for path in paths:
        h.update(path.name.encode())
        with path.open("rb") as f:
            for block in iter(lambda: f.read(1024 * 1024), b""):
                h.update(block)
    return h.hexdigest()


def model_code_fingerprint():
    h = hashlib.sha256()
    for name in ("optimize.py", "models.py", "config.py"):
        h.update(Path(__file__).with_name(name).read_bytes())
    return h.hexdigest()


def features():
    RUN.mkdir(parents=True, exist_ok=True)
    archive = RUN / "baseline"
    archive.mkdir(exist_ok=True)
    for source in [config.EXPERIMENTS / "summary.json", config.EXPERIMENTS / "selected_features.json",
                   config.OUTPUTS / config.SUBMISSION_NAME]:
        if not (archive / source.name).exists():
            shutil.copy2(source, archive / source.name)
    train_signals = load_signals(config.TRAIN_SIGNALS)
    for split, signals_path, tx_path in [("train", config.TRAIN_SIGNALS, config.TRAIN_TX),
                                         ("test", config.TEST_SIGNALS, config.TEST_TX)]:
        start = time.monotonic()
        signals = load_signals(signals_path)
        tx = prepare_transactions(load_transactions(tx_path), signals)
        base = build_features(tx, signals, reference=train_signals)
        extended = build_enhanced_features(tx, signals)
        X = pd.concat([base, extended], axis=1)
        X.to_parquet(RUN / f"{split}_features.parquet")
        print(f"{split}: {X.shape}, {time.monotonic()-start:.1f}s", flush=True)
        del tx, base, extended, X
    dump(RUN / "cache.json", {"fingerprint": fingerprint()})


def load():
    if not all((RUN / name).exists() for name in ("cache.json", "train_features.parquet", "test_features.parquet")):
        features()
    if json.loads((RUN / "cache.json").read_text())["fingerprint"] != fingerprint():
        raise ValueError("Feature code/data changed. Rebuild with --stage features.")
    X = relative_features(pd.read_parquet(RUN / "train_features.parquet"))
    y = load_signals(config.TRAIN_SIGNALS).set_index(config.ID).loc[X.index, config.TARGET]
    return X, y


def relative_features(X):
    """Remove an alert's overall amount location/scale without seeing labels."""
    derived = {}
    scale = X["dist_all_std"].clip(lower=.05)
    groups = list(config.DIRECTIONS) + list(config.TX_TYPES) + [
        f"{d}_{t}" for d in config.DIRECTIONS for t in config.TX_TYPES]
    for group in groups:
        for stat in ("mean", "median", "q10", "q25", "q75", "q90", "min", "max"):
            derived[f"rel_{group}_{stat}"] = (X[f"dist_{group}_{stat}"] - X["dist_all_mean"]) / scale
        for stat in ("std", "iqr"):
            derived[f"rel_{group}_{stat}"] = X[f"dist_{group}_{stat}"] / scale
        count = X[f"dist_{group}_count"]
        derived[f"rel_{group}_reliability"] = count / (count + 20)
    for d in config.DIRECTIONS:
        for t in config.TX_TYPES:
            for parent in (d, t):
                derived[f"contrast_{d}_{t}_vs_{parent}"] = (
                    X[f"dist_{d}_{t}_mean"] - X[f"dist_{parent}_mean"]
                ) / scale
    return pd.concat([X, pd.DataFrame(derived, index=X.index)], axis=1).replace([np.inf, -np.inf], np.nan)


def feature_sets(X):
    original = json.loads((RUN / "baseline" / "selected_features.json").read_text())["columns"]
    distribution = [c for c in X if c.startswith("dist_")]
    compact = [c for c in distribution if any(c.endswith("_" + s) for s in ("mean", "std", "median", "q10", "q90", "skew"))]
    relative = [c for c in X if c.startswith(("rel_", "contrast_"))]
    relative_basic = [c for c in relative if c.endswith(("_mean", "_std", "_reliability")) or c.startswith("contrast_")]
    location = [c for c in distribution if c.endswith(("_mean", "_std"))] + ["base_min", "base_max", "amt_skew"]
    # Preserve the original search's exact feature definitions when resuming.
    return {"original": original, "distribution": distribution, "compact": compact,
            "enhanced": [c for c in X if c not in relative],
            "original_distribution": list(dict.fromkeys(original + distribution)),
            "relative": relative, "relative_basic": relative_basic,
            "compact_relative": compact + relative, "original_relative": original + relative,
            "location": location, "location_relative": location + relative_basic}


def candidates():
    summary = json.loads((RUN / "baseline" / "summary.json").read_text())
    specs = []
    for name in ("lightgbm", "xgboost", "logreg"):
        specs.append({"id": f"baseline_{name}", "model": name, "features": "original", "params": summary["tuned_params"][name]})
    for fs in ("compact", "distribution", "original_distribution", "enhanced"):
        for leaves, reg in [(7, 20), (15, 40)]:
            specs.append({"id": f"lgb_{fs}_{leaves}", "model": "lightgbm", "features": fs,
                          "params": {"n_estimators": 700, "learning_rate": .025, "num_leaves": leaves,
                                     "min_child_samples": 150, "reg_lambda": reg, "reg_alpha": 1,
                                     "colsample_bytree": .85, "subsample": .85, "subsample_freq": 1}})
        for C in (.01, .1, 1.):
            specs.append({"id": f"lr_{fs}_{C}", "model": "logreg", "features": fs, "params": {"C": C}})
    for fs in ("compact", "distribution", "original_distribution"):
        specs.append({"id": f"spline_{fs}", "model": "spline", "features": fs, "params": {"C": .1}})
        specs.append({"id": f"xgb_{fs}", "model": "xgboost", "features": fs,
                      "params": {"n_estimators": 900, "learning_rate": .025, "max_depth": 2,
                                 "min_child_weight": 20, "subsample": .85, "colsample_bytree": .85,
                                 "reg_lambda": 20, "reg_alpha": 1}})
    for fs in ("relative_basic", "relative", "compact_relative", "original_relative"):
        for C in (.01, .1, 1.):
            specs.append({"id": f"lr_{fs}_{C}", "model": "logreg", "features": fs, "params": {"C": C}})
        specs.append({"id": f"spline_{fs}", "model": "spline", "features": fs, "params": {"C": .1}})
        specs.append({"id": f"lgb_{fs}", "model": "lightgbm", "features": fs,
                      "params": {"n_estimators": 800, "learning_rate": .02, "num_leaves": 7,
                                 "min_child_samples": 150, "reg_lambda": 20, "reg_alpha": 1,
                                 "colsample_bytree": .85, "subsample": .85, "subsample_freq": 1}})
    for fs in ("compact", "relative_basic", "location", "location_relative"):
        for C in (.0003, .001, .003, .03):
            specs.append({"id": f"lr_refined_{fs}_{C}", "model": "logreg", "features": fs, "params": {"C": C}})
        for name, params in [
            ("lightgbm", {"n_estimators": 500, "learning_rate": .025, "num_leaves": 3,
                          "min_child_samples": 200, "reg_lambda": 30, "reg_alpha": 2,
                          "colsample_bytree": .9, "subsample": .9, "subsample_freq": 1}),
            ("catboost", {"iterations": 800, "learning_rate": .025, "depth": 3, "l2_leaf_reg": 30, "rsm": .9}),
        ]:
            specs.append({"id": f"{name}_refined_{fs}", "model": name, "features": fs, "params": params})
    for fs in ("relative_basic", "compact", "location_relative", "compact_relative"):
        for C in (.01, .03, .1):
            specs.append({"id": f"sparse_{fs}_{C}", "model": "logreg", "features": fs,
                          "params": {"C": C, "solver": "liblinear", "l1_ratio": 1}})
    return specs


def estimator(spec, seed):
    if spec["model"] == "spline":
        return make_pipeline(SimpleImputer(strategy="median", keep_empty_features=True),
                             SplineTransformer(n_knots=4, degree=2, knots="quantile", extrapolation="constant"),
                             StandardScaler(), LogisticRegression(C=spec["params"]["C"], max_iter=2000, random_state=seed))
    return make_pipeline(SimpleImputer(strategy="median", keep_empty_features=True),
                         make_factory(spec["model"], spec["params"])(seed))


def split_indices(y):
    return train_test_split(np.arange(len(y)), test_size=.25, stratify=y, random_state=SPLIT_SEED)


def cv_predict(spec, X, y):
    predictions = np.zeros((len(CV_SEEDS), len(y)))
    for repeat, seed in enumerate(CV_SEEDS):
        for fit, valid in StratifiedKFold(3, shuffle=True, random_state=seed).split(X, y):
            model = estimator(spec, seed)
            model.fit(X.iloc[fit], y.iloc[fit])
            predictions[repeat, valid] = model.predict_proba(X.iloc[valid])[:, 1]
    scores = [roc_auc_score(y, pred) for pred in predictions]
    return predictions, {"mean": float(np.mean(scores)), "std": float(np.std(scores)), "repeats": scores}


def search():
    X, y = load()
    dev, audit = split_indices(y)
    dump(RUN / "split.json", {"seed": SPLIT_SEED, "development_ids": X.index[dev].tolist(), "audit_ids": X.index[audit].tolist()})
    X, y = X.iloc[dev], y.iloc[dev]
    sets = feature_sets(X)
    records_path = RUN / "search.json"
    records = json.loads(records_path.read_text()) if records_path.exists() else []
    for filename in ("search_relative.json", "search_refined.json", "search_sparse.json"):
        extra = RUN / filename
        if extra.exists():
            seen = {r["id"] for r in records}
            records += [r for r in json.loads(extra.read_text()) if r["id"] not in seen]
    done = {row["id"] for row in records if (RUN / f"oof_{row['id']}.npy").exists()}
    for spec in candidates():
        if spec["id"] in done:
            continue
        start = time.monotonic()
        pred, score = cv_predict(spec, X[sets[spec["features"]]], y)
        np.save(RUN / f"oof_{spec['id']}.npy", pred)
        records = [r for r in records if r["id"] != spec["id"]]
        records.append({**spec, **score, "seconds": time.monotonic()-start})
        dump(records_path, records)
        print(f"{spec['id']}: {score['mean']:.6f} +/- {score['std']:.6f} ({time.monotonic()-start:.1f}s)", flush=True)
    print("BEST", sorted(records, key=lambda r:r["mean"]-r["std"], reverse=True)[:5], flush=True)


def blend(predictions, weights, method):
    """Works on one vector or a repeat-by-alert OOF matrix."""
    result = np.zeros_like(next(iter(predictions.values())), dtype=float)
    for name, weight in weights.items():
        if not weight:
            continue
        pred = predictions[name]
        if method == "rank":
            pred = (rankdata(pred, axis=-1) - .5) / pred.shape[-1]
        result += weight * pred
    return result / sum(weights.values())


def scores(y, predictions):
    values = [float(roc_auc_score(y, row)) for row in np.atleast_2d(predictions)]
    return {"mean": float(np.mean(values)), "std": float(np.std(values)), "repeats": values}


def select_recipe(records, y):
    """Small greedy blend search, using development OOF exclusively."""
    records = sorted(records, key=lambda r: r["mean"] - r["std"], reverse=True)
    # Limit correlated hyperparameter variants and the number of blend choices.
    pool, groups = [], set()
    for record in records:
        key = record["model"], record["features"]
        if key not in groups:
            groups.add(key)
            pool.append(record)
        if len(pool) == 8:
            break
    predictions = {r["id"]: np.load(RUN / f"oof_{r['id']}.npy") for r in pool}
    best_recipe = None
    for method in ("probability", "rank"):
        weights = {pool[0]["id"]: 1.}
        metric = scores(y, blend(predictions, weights, method))
        for _ in range(3):
            best = None
            for candidate in pool:
                if candidate["id"] in weights:
                    continue
                for share in (.15, .3, .5):
                    proposed = {k: v*(1-share) for k, v in weights.items()}
                    proposed[candidate["id"]] = share
                    result = scores(y, blend(predictions, proposed, method))
                    objective = result["mean"] - result["std"]
                    if best is None or objective > best[0]:
                        best = objective, proposed, result
            if best is None or best[0] < metric["mean"] - metric["std"] + .0005:
                break
            _, weights, metric = best
        if best_recipe is None or metric["mean"] - metric["std"] > best_recipe["development"]["mean"] - best_recipe["development"]["std"]:
            best_recipe = {"method": method, "weights": weights, "development": metric,
                           "models": [r for r in pool if r["id"] in weights]}
    return best_recipe


def fit_predict(spec, X, y, apply, seeds):
    # The linear/spline models use deterministic lbfgs; repeating them adds nothing.
    actual_seeds = seeds[:1] if spec["model"] in ("logreg", "spline") else seeds
    predictions = []
    for seed in actual_seeds:
        model = estimator(spec, seed)
        model.fit(X, y)
        predictions.append(model.predict_proba(apply)[:, 1])
    return np.mean(predictions, axis=0)


def bagged_cv(spec, X, y, seeds):
    predictions = np.zeros((len(CV_SEEDS), len(y)))
    for repeat, split_seed in enumerate(CV_SEEDS):
        for fit, valid in StratifiedKFold(3, shuffle=True, random_state=split_seed).split(X, y):
            predictions[repeat, valid] = fit_predict(spec, X.iloc[fit], y.iloc[fit], X.iloc[valid], seeds)
    return predictions


def bootstrap_gain(y, baseline, candidate, n=1000):
    """Paired stratified bootstrap; uncertainty conditional on the frozen fits."""
    rng = np.random.default_rng(982451653)
    y = np.asarray(y)
    positive, negative = np.flatnonzero(y == 1), np.flatnonzero(y == 0)
    gains = []
    for _ in range(n):
        sample = np.r_[rng.choice(positive, len(positive)), rng.choice(negative, len(negative))]
        gains.append(roc_auc_score(y[sample], candidate[sample]) - roc_auc_score(y[sample], baseline[sample]))
    return [float(v) for v in np.quantile(gains, [.025, .975])]


def finalize():
    """Freeze recipe before opening audit results. Never search on this split."""
    X, y = load()
    dev, audit = split_indices(y)
    recipe_path = RUN / "recipe.json"
    if recipe_path.exists():
        raise FileExistsError("Recipe already frozen. Use --stage predict to reproduce it.")
    records = json.loads((RUN / "search.json").read_text())
    for extra in ("search_relative.json", "search_refined.json", "search_sparse.json"):
        if (RUN / extra).exists():
            seen = {r["id"] for r in records}
            records += [r for r in json.loads((RUN / extra).read_text()) if r["id"] not in seen]
    recipe = select_recipe(records, y.iloc[dev])
    sets = feature_sets(X)
    for spec in recipe["models"]:
        spec["columns"] = sets[spec["features"]]
    recipe.update({"split_seed": SPLIT_SEED, "cv_seeds": list(CV_SEEDS), "cv_folds": 3,
                   "fit_seeds": [42, 43, 44, 45, 46], "fingerprint": fingerprint(),
                   "model_code_sha256": model_code_fingerprint(),
                   "evaluation_note": "Development CV is selection-biased. Audit excluded from this search; legacy baseline selection previously used all labels."})
    dump(recipe_path, recipe)
    print("FROZEN", recipe["weights"], recipe["development"], flush=True)

    old = json.loads((RUN / "baseline" / "summary.json").read_text())
    old_columns = old["selected_columns"]
    baseline_dev, baseline_audit = {}, {}
    for name, weight in old["weights"].items():
        if not weight:
            continue
        print("Validating baseline", name, "with final seed configuration", flush=True)
        spec = {"model": name, "params": old["tuned_params"][name]}
        baseline_dev[name] = bagged_cv(spec, X.iloc[dev][old_columns], y.iloc[dev], recipe["fit_seeds"])
        baseline_audit[name] = fit_predict(spec, X.iloc[dev][old_columns], y.iloc[dev], X.iloc[audit][old_columns], recipe["fit_seeds"])
    baseline_weights = {k:v for k,v in old["weights"].items() if v}
    old_pred = blend(baseline_audit, baseline_weights, "rank")
    new_predictions, new_dev = {}, {}
    for spec in recipe["models"]:
        print("Validating frozen candidate", spec["id"], "with final seed configuration", flush=True)
        columns = spec["columns"]
        new_dev[spec["id"]] = bagged_cv(spec, X.iloc[dev][columns], y.iloc[dev], recipe["fit_seeds"])
        new_predictions[spec["id"]] = fit_predict(spec, X.iloc[dev][columns], y.iloc[dev], X.iloc[audit][columns], recipe["fit_seeds"])
    new_pred = blend(new_predictions, recipe["weights"], recipe["method"])
    baseline_auc, candidate_auc = float(roc_auc_score(y.iloc[audit], old_pred)), float(roc_auc_score(y.iloc[audit], new_pred))
    baseline_cv = scores(y.iloc[dev], blend(baseline_dev, baseline_weights, "rank"))
    candidate_cv = scores(y.iloc[dev], blend(new_dev, recipe["weights"], recipe["method"]))
    report = {"development_rows": len(dev), "audit_rows": len(audit), "baseline_development": baseline_cv,
              "candidate_development": candidate_cv, "search_development": recipe["development"], "baseline_audit_auc": baseline_auc,
              "candidate_audit_auc": candidate_auc, "audit_gain": candidate_auc-baseline_auc,
              "audit_gain_bootstrap_95pct": bootstrap_gain(y.iloc[audit], old_pred, new_pred),
              "limitations": recipe["evaluation_note"],
              "promoted": candidate_auc > baseline_auc + .001 and candidate_cv["mean"] > baseline_cv["mean"] + .002}
    pd.DataFrame({"signal_id": X.index[audit], "target": y.iloc[audit].to_numpy(),
                  "baseline": old_pred, "candidate": new_pred}).to_csv(RUN / "audit_predictions.csv", index=False)
    dump(RUN / "report.json", report)
    print("AUDIT", json.dumps(report, indent=2), flush=True)
    predict(promote=report["promoted"])


def predict(promote=None):
    """Refit the frozen recipe on all labelled alerts, then score the test set."""
    recipe = json.loads((RUN / "recipe.json").read_text())
    if recipe["model_code_sha256"] != model_code_fingerprint():
        raise ValueError("Frozen model implementation changed; reproduction refused.")
    if recipe["fingerprint"] != fingerprint():
        raise ValueError("Frozen model's feature code or data changed; reproduction refused.")
    X, y = load()
    test = relative_features(pd.read_parquet(RUN / "test_features.parquet"))
    if list(X.columns) != list(test.columns):
        raise ValueError("Train/test feature schemas differ")
    predictions = {}
    for spec in recipe["models"]:
        print("Fitting final", spec["id"], flush=True)
        predictions[spec["id"]] = fit_predict(spec, X[spec["columns"]], y, test[spec["columns"]], recipe["fit_seeds"])
    output = pd.DataFrame({config.ID: test.index, config.PROBA: blend(predictions, recipe["weights"], recipe["method"])})
    ids = load_signals(config.TEST_SIGNALS)[config.ID]
    candidate_path = config.OUTPUTS / "team_2ABB3C78_optimized.csv"
    write(output, ids, candidate_path)
    if promote is None:
        promote = json.loads((RUN / "report.json").read_text())["promoted"]
    if promote:
        write(output, ids, config.OUTPUTS / config.SUBMISSION_NAME)
        dump(config.EXPERIMENTS / "active_model.json", {"pipeline": "src.optimize", "run": str(RUN.relative_to(config.ROOT)),
                                                      "recipe_sha256": hashlib.sha256((RUN / "recipe.json").read_bytes()).hexdigest()})
    print("Submission:", candidate_path, "promoted:", promote, flush=True)
    return candidate_path


def predict_active():
    active = json.loads((config.EXPERIMENTS / "active_model.json").read_text())
    if active["pipeline"] != "src.optimize" or active["run"] != str(RUN.relative_to(config.ROOT)):
        raise ValueError("Unknown active model recipe")
    digest = hashlib.sha256((RUN / "recipe.json").read_bytes()).hexdigest()
    if digest != active["recipe_sha256"]:
        raise ValueError("Active recipe was modified; refusing to overwrite the submission")
    return predict()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--stage", choices=["features", "search", "finalize", "predict"], required=True)
    args = parser.parse_args()
    {"features": features, "search": search, "finalize": finalize, "predict": predict}[args.stage]()


if __name__ == "__main__":
    main()
