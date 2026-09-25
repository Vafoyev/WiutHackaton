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
