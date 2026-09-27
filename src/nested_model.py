"""Nested comparison of a fixed small search procedure against the legacy model.

The search space was informed by earlier development experiments. No outer-fold
label is supplied to inner_search. This is repeated internal validation, not an
external benchmark or an untouched holdout after all human experimentation.
"""
import argparse
import hashlib
import json
import time
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedKFold

from src import config, optimize
from src.data import load_signals, load_transactions
from src.enhanced_features import build_enhanced_features
from src.features import build_features, prepare_transactions
from src.submission import check, write

RUN = config.EXPERIMENTS / "nested_20260927"
OUTER_SEEDS = (20261001, 20261002)
INNER_SEEDS = (319, 587)
FIT_SEEDS = [42, 43, 44, 45, 46]


def digest():
    h = hashlib.sha256()
    h.update(optimize.fingerprint().encode())
    h.update(optimize.model_code_fingerprint().encode())
    h.update(Path(__file__).read_bytes())
    return h.hexdigest()


def baseline_spec():
    old = json.loads((optimize.RUN / "baseline" / "summary.json").read_text())
    return {"id": "legacy", "model": "legacy", "features": "original",
            "columns": old["selected_columns"], "weights": {k:v for k,v in old["weights"].items() if v},
            "components": [{"id": name, "model": name, "params": old["tuned_params"][name],
                            "columns": old["selected_columns"]} for name, weight in old["weights"].items() if weight]}


def specifications(X):
    sets = optimize.feature_sets(X)
    specs = [baseline_spec()]
    for fs in ("compact", "relative_basic", "location_relative"):
        for C in (.0003, .001, .003, .01):
            specs.append({"id": f"lr_{fs}_{C}", "model": "logreg", "features": fs,
                          "columns": sets[fs], "params": {"C": C}})
    for name, params in [
        ("catboost", {"iterations": 800, "learning_rate": .025, "depth": 3, "l2_leaf_reg": 30, "rsm": .9}),
        ("lightgbm", {"n_estimators": 500, "learning_rate": .025, "num_leaves": 3, "min_child_samples": 200,
                      "reg_lambda": 30, "reg_alpha": 2, "colsample_bytree": .9, "subsample": .9, "subsample_freq": 1}),
    ]:
        specs.append({"id": name, "model": name, "features": "location_relative", "columns": sets["location_relative"], "params": params})
    specs.append({"id": "sparse", "model": "logreg", "features": "compact_relative", "columns": sets["compact_relative"],
                  "params": {"C": .03, "solver": "liblinear", "l1_ratio": 1}})
    return specs


def build_cache():
    RUN.mkdir(parents=True, exist_ok=True)
    train = load_signals(config.TRAIN_SIGNALS)
    families = json.loads((optimize.RUN / "baseline" / "summary.json").read_text())["families"]
    for split, signals_path, tx_path in [("train", config.TRAIN_SIGNALS, config.TRAIN_TX), ("test", config.TEST_SIGNALS, config.TEST_TX)]:
        signals = load_signals(signals_path)
        tx = prepare_transactions(load_transactions(tx_path), signals)
        base = build_features(tx, signals, families=families, reference=train)
        extended = build_enhanced_features(tx, signals)
        X = optimize.relative_features(pd.concat([base, extended], axis=1))
        X.to_parquet(RUN / f"{split}_features.parquet")
        print("Cached", split, X.shape, flush=True)
        del tx, base, extended, X
    X = pd.read_parquet(RUN / "train_features.parquet")
    protocol = {"digest": digest(), "outer_seeds": list(OUTER_SEEDS), "inner_seeds": list(INNER_SEEDS),
                "outer_folds": 5, "inner_folds": 3, "fit_seeds": FIT_SEEDS, "specifications": specifications(X),
                "promotion_rule": "mean gain > 0.001, gain positive in both repeats, paired conditional bootstrap lower bound > 0"}
    protocol_path = RUN / "protocol.json"
    if protocol_path.exists() and json.loads(protocol_path.read_text()) != protocol:
        raise ValueError("Existing protocol differs; use a fresh run directory instead of mixing experiments")
    optimize.dump(protocol_path, protocol)


def load_data():
    protocol = json.loads((RUN / "protocol.json").read_text())
    if protocol["digest"] != digest():
        raise ValueError("Frozen nested protocol's implementation/data changed")
    if not (RUN / "train_features.parquet").exists() or not (RUN / "test_features.parquet").exists():
        build_cache()
    X = pd.read_parquet(RUN / "train_features.parquet")
    y = load_signals(config.TRAIN_SIGNALS).set_index(config.ID).loc[X.index, config.TARGET]
    return X, y, protocol


def predict_spec(spec, X, y, apply, seeds):
    if spec["model"] == "legacy":
        predictions = {part["id"]: predict_spec(part, X, y, apply, seeds) for part in spec["components"]}
        return optimize.blend(predictions, spec["weights"], "rank")
    columns = spec["columns"]
    return optimize.fit_predict(spec, X[columns], y, apply[columns], seeds)


def choose(specs, predictions, y):
    measured = {s["id"]: optimize.scores(y, predictions[s["id"]]) for s in specs}
    ordered = sorted(specs, key=lambda s: measured[s["id"]]["mean"]-measured[s["id"]]["std"], reverse=True)
    pool, groups = [], set()
    for spec in ordered:
        key = spec["model"], spec["features"]
        if key not in groups:
            groups.add(key)
            pool.append(spec)
    weights = {pool[0]["id"]: 1.}
    score = optimize.scores(y, optimize.blend(predictions, weights, "rank"))
    for _ in range(3):
        best = None
        for spec in pool:
            if spec["id"] in weights:
                continue
            for share in (.15, .3, .5):
                proposed = {k:v*(1-share) for k,v in weights.items()}
                proposed[spec["id"]] = share
                measured_blend = optimize.scores(y, optimize.blend(predictions, proposed, "rank"))
                objective = measured_blend["mean"] - measured_blend["std"]
                if best is None or objective > best[0]:
                    best = objective, proposed, measured_blend
        if best is None or best[0] < score["mean"]-score["std"]+.0008:
            break
        _, weights, score = best
    return {"weights": weights, "method": "rank", "models": [s for s in specs if s["id"] in weights],
            "inner_cv": score, "individual_inner_cv": measured}


def inner_search(X, y, specs):
    """Only outer-training data enters here, including all model/weight choices."""
    predictions = {s["id"]: np.zeros((len(INNER_SEEDS), len(y))) for s in specs}
    for repeat, seed in enumerate(INNER_SEEDS):
        for fit, valid in StratifiedKFold(3, shuffle=True, random_state=seed).split(X, y):
            for spec in specs:
                predictions[spec["id"]][repeat, valid] = predict_spec(spec, X.iloc[fit], y.iloc[fit], X.iloc[valid], [seed])
    return choose(specs, predictions, y)


def evaluate_fold(X, y, fit, valid, specs):
    # Keep outer labels out of the search and fitting APIs entirely.
    recipe = inner_search(X.iloc[fit], y.iloc[fit], specs)
    legacy = next(s for s in specs if s["id"] == "legacy")
    predictions = {"legacy": predict_spec(legacy, X.iloc[fit], y.iloc[fit], X.iloc[valid], FIT_SEEDS)}
    for spec in recipe["models"]:
        if spec["id"] not in predictions:
            predictions[spec["id"]] = predict_spec(spec, X.iloc[fit], y.iloc[fit], X.iloc[valid], FIT_SEEDS)
    candidate = optimize.blend(predictions, recipe["weights"], recipe["method"])
    return recipe, predictions["legacy"], candidate


def evaluate_repeat(repeat):
    X, y, protocol = load_data()
    seed = OUTER_SEEDS[repeat]
    for fold, (fit, valid) in enumerate(StratifiedKFold(5, shuffle=True, random_state=seed).split(X, y)):
        output = RUN / f"repeat_{repeat}_fold_{fold}.npz"
        if output.exists():
            continue
        start = time.monotonic()
        print(f"Repeat {repeat+1}/2 fold {fold+1}/5: inner search", flush=True)
        recipe, baseline, candidate = evaluate_fold(X, y, fit, valid, protocol["specifications"])
        old_auc, new_auc = float(roc_auc_score(y.iloc[valid], baseline)), float(roc_auc_score(y.iloc[valid], candidate))
        record = {"repeat": repeat, "fold": fold, "baseline_auc": old_auc, "candidate_auc": new_auc,
                  "gain": new_auc-old_auc, "seconds": time.monotonic()-start, "recipe": recipe}
        optimize.dump(RUN / f"repeat_{repeat}_fold_{fold}.json", record)
        np.savez(output, valid=valid, baseline=baseline, candidate=candidate)
        print(f"Repeat {repeat+1} fold {fold+1}: {old_auc:.5f} -> {new_auc:.5f} ({new_auc-old_auc:+.5f}), {time.monotonic()-start:.1f}s", flush=True)


def paired_interval(y, baseline, candidate):
    rng = np.random.default_rng(982451653)
    y = np.asarray(y)
    groups = [np.flatnonzero(y == label) for label in (0, 1)]
    gains = []
    for _ in range(1000):
        sample = np.concatenate([rng.choice(group, len(group)) for group in groups])
        gains.append(np.mean([roc_auc_score(y[sample], new[sample])-roc_auc_score(y[sample], old[sample])
                              for old, new in zip(baseline, candidate)]))
    return np.quantile(gains, [.025, .975]).tolist()


def summarize():
    X, y, protocol = load_data()
    baseline = np.zeros((len(OUTER_SEEDS), len(y)))
    candidate = np.zeros_like(baseline)
    records = []
    for repeat in range(len(OUTER_SEEDS)):
        seen = np.zeros(len(y), dtype=int)
        for fold in range(5):
            with np.load(RUN / f"repeat_{repeat}_fold_{fold}.npz") as saved:
                baseline[repeat, saved["valid"]] = saved["baseline"]
                candidate[repeat, saved["valid"]] = saved["candidate"]
                seen[saved["valid"]] += 1
            records.append(json.loads((RUN / f"repeat_{repeat}_fold_{fold}.json").read_text()))
        if not np.all(seen == 1):
            raise ValueError("Outer-fold predictions do not cover each row exactly once")
    old, new = optimize.scores(y, baseline), optimize.scores(y, candidate)
    interval = paired_interval(y, baseline, candidate)
    gains = [b-a for a,b in zip(old["repeats"], new["repeats"])]
    report = {"rows": len(y), "outer_folds": 5, "outer_repeats": 2, "baseline": old, "candidate": new,
              "gain": new["mean"]-old["mean"], "repeat_gains": gains, "paired_conditional_bootstrap_95pct": interval,
              "positive_folds": sum(r["gain"] > 0 for r in records), "folds": [{k:v for k,v in r.items() if k != "recipe"} for r in records],
              "promoted": new["mean"]-old["mean"] > .001 and min(gains) > 0 and interval[0] > 0,
              "limitations": "Internal nested validation. Search space informed by earlier experiments. Legacy features/parameters selected using all labels, including outer validation labels. Bootstrap conditional on fitted predictions; excludes training/search uncertainty. No leaderboard/test-label evaluation."}
    optimize.dump(RUN / "report.json", report)
    print(json.dumps(report, indent=2), flush=True)
    return report


def finalize():
    report = summarize()
    X, y, protocol = load_data()
    recipe_path = RUN / "recipe.json"
    if not recipe_path.exists():
        print("Select final recipe on all training rows; outer scores are not used for weight fitting", flush=True)
        recipe = inner_search(X, y, protocol["specifications"])
        recipe.update({"digest": protocol["digest"], "fit_seeds": FIT_SEEDS})
        optimize.dump(recipe_path, recipe)
    predict(promote=report["promoted"])


def predict(promote=None):
    X, y, protocol = load_data()
    recipe = json.loads((RUN / "recipe.json").read_text())
    if recipe["digest"] != protocol["digest"]:
        raise ValueError("Recipe and protocol differ")
    T = pd.read_parquet(RUN / "test_features.parquet")
    predictions = {}
    for spec in recipe["models"]:
        print("Full-data fit", spec["id"], flush=True)
        predictions[spec["id"]] = predict_spec(spec, X, y, T, recipe["fit_seeds"])
    frame = pd.DataFrame({config.ID: T.index, config.PROBA: optimize.blend(predictions, recipe["weights"], recipe["method"])})
    ids = load_signals(config.TEST_SIGNALS)[config.ID]
    if not all(passed for _, passed, _ in check(frame, ids)):
        raise ValueError("Unordered predictions failed submission checks")
    path = config.OUTPUTS / "team_2ABB3C78_nested.csv"
    write(frame, ids, path)
    if promote is None:
        promote = json.loads((RUN / "report.json").read_text())["promoted"]
    if promote:
        write(frame, ids, config.OUTPUTS / config.SUBMISSION_NAME)
        optimize.dump(config.EXPERIMENTS / "active_model.json", {"pipeline": "src.nested_model", "run": str(RUN.relative_to(config.ROOT)),
                                                                "recipe_sha256": hashlib.sha256((RUN / "recipe.json").read_bytes()).hexdigest()})
    print("Wrote", path, "promoted:", promote, flush=True)
    return path


def predict_active():
    active = json.loads((config.EXPERIMENTS / "active_model.json").read_text())
    if active["pipeline"] != "src.nested_model" or active["run"] != str(RUN.relative_to(config.ROOT)):
        raise ValueError("Unknown active model recipe")
    if active["recipe_sha256"] != hashlib.sha256((RUN / "recipe.json").read_bytes()).hexdigest():
        raise ValueError("Active recipe was modified")
    return predict()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--stage", choices=["features", "evaluate", "summarize", "finalize", "predict"], required=True)
    parser.add_argument("--repeat", type=int, choices=[0, 1], default=0)
    args = parser.parse_args()
    if args.stage == "evaluate":
        evaluate_repeat(args.repeat)
    else:
        {"features": build_cache, "summarize": summarize, "finalize": finalize, "predict": predict}[args.stage]()


if __name__ == "__main__":
    main()
