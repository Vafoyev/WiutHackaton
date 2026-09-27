import json

import numpy as np
import pandas as pd
import pytest

from src import optimize
from src.enhanced_features import build_enhanced_features
from src.features import prepare_transactions
from tests.test_enhanced_features import fixture


def test_relative_features_are_invariant_to_positive_affine_amount_changes():
    signals, tx = fixture()
    prepared = prepare_transactions(tx, signals)
    X = build_enhanced_features(prepared, signals)
    transformed = prepared.copy()
    transformed['miqdor_indeksi'] = 3 * transformed.miqdor_indeksi + 7
    Z = build_enhanced_features(transformed, signals)
    a, b = optimize.relative_features(X), optimize.relative_features(Z)
    columns = [c for c in a if c.startswith(('rel_', 'contrast_'))]
    np.testing.assert_allclose(a[columns], b[columns], equal_nan=True, atol=1e-10)


def test_rank_blending_does_not_rank_across_repeats():
    predictions = {'a': np.array([[1., 2., 3.], [300., 200., 100.]])}
    actual = optimize.blend(predictions, {'a': 1.}, 'rank')
    np.testing.assert_allclose(actual, [[1/6, 1/2, 5/6], [5/6, 1/2, 1/6]])


def test_development_audit_split_is_disjoint_and_reproducible():
    y = pd.Series([0, 0, 0, 1] * 100)
    dev, audit = optimize.split_indices(y)
    assert not set(dev) & set(audit)
    assert set(dev) | set(audit) == set(range(len(y)))
    np.testing.assert_array_equal(audit, optimize.split_indices(y)[1])


def test_active_prediction_refuses_a_modified_recipe(tmp_path, monkeypatch):
    run = tmp_path / 'experiments' / 'run'
    run.mkdir(parents=True)
    (run / 'recipe.json').write_text('{}')
    (run.parent / 'active_model.json').write_text(json.dumps({
        'pipeline': 'src.optimize', 'run': 'experiments/run', 'recipe_sha256': 'incorrect',
    }))
    monkeypatch.setattr(optimize, 'RUN', run)
    monkeypatch.setattr(optimize.config, 'ROOT', tmp_path)
    monkeypatch.setattr(optimize.config, 'EXPERIMENTS', run.parent)
    with pytest.raises(ValueError, match='modified'):
        optimize.predict_active()


def test_linear_bagging_does_not_refit_identical_models(monkeypatch):
    calls = []
    class Model:
        def fit(self, X, y):
            calls.append(len(X))
        def predict_proba(self, X):
            return np.tile([.8, .2], (len(X), 1))
    monkeypatch.setattr(optimize, 'estimator', lambda *args: Model())
    X = pd.DataFrame({'x': [1, 2, 3]})
    result = optimize.fit_predict({'model': 'logreg'}, X, pd.Series([0, 1, 0]), X, [42, 43, 44])
    assert calls == [3]
    np.testing.assert_allclose(result, .2)
