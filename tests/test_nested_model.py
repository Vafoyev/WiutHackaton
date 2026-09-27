import numpy as np
import pandas as pd

from src import nested_model


def test_outer_labels_do_not_enter_selection_or_fitting(monkeypatch):
    X = pd.DataFrame({'x': range(12)}, index=[f'id_{i}' for i in range(12)])
    y = pd.Series([0, 1] * 6, index=X.index)
    fit, valid = np.arange(8), np.arange(8, 12)
    specs = [{'id': 'legacy', 'model': 'legacy'}, {'id': 'new', 'model': 'logreg'}]
    searches, fits = [], []

    def search(train, labels, candidates):
        searches.append((list(train.index), labels.copy()))
        return {'models': [specs[1]], 'weights': {'new': 1.}, 'method': 'rank'}

    def predict(spec, train, labels, apply, seeds):
        fits.append((list(train.index), labels.copy(), list(apply.index)))
        return np.arange(len(apply), dtype=float)

    monkeypatch.setattr(nested_model, 'inner_search', search)
    monkeypatch.setattr(nested_model, 'predict_spec', predict)
    first = nested_model.evaluate_fold(X, y, fit, valid, specs)
    changed = y.copy()
    changed.iloc[valid] = 1 - changed.iloc[valid]
    second = nested_model.evaluate_fold(X, changed, fit, valid, specs)
    np.testing.assert_array_equal(first[2], second[2])
    for indices, labels in searches:
        assert indices == list(X.index[fit])
        pd.testing.assert_series_equal(labels, y.iloc[fit])
    for indices, labels, apply in fits:
        assert not set(indices) & set(apply)
        pd.testing.assert_series_equal(labels, y.iloc[fit])


def test_nested_blend_can_choose_the_legacy_fallback():
    y = pd.Series([0, 0, 1, 1])
    specs = [{'id': 'legacy', 'model': 'legacy', 'features': 'original'},
             {'id': 'bad', 'model': 'logreg', 'features': 'relative'}]
    predictions = {'legacy': np.array([[.1, .2, .8, .9], [.1, .2, .8, .9]]),
                   'bad': np.array([[.8, .9, .1, .2], [.8, .9, .1, .2]])}
    recipe = nested_model.choose(specs, predictions, y)
    assert recipe['weights'] == {'legacy': 1.}
    assert recipe['inner_cv']['mean'] == 1.
