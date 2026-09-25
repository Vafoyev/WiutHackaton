import json

import numpy as np
import pandas as pd
import pytest

from src import config
from src.pipeline import predict_from_saved


def test_predict_from_saved_refuses_when_no_run_has_been_recorded(tmp_path, monkeypatch):
    import src.pipeline as pipeline

    monkeypatch.setattr(pipeline, "SUMMARY_PATH", tmp_path / "missing.json")
    with pytest.raises(FileNotFoundError) as excinfo:
        predict_from_saved()
    assert "src.pipeline" in str(excinfo.value)


def test_predict_from_saved_reads_the_recorded_families_and_params(tmp_path, monkeypatch):
    import src.pipeline as pipeline

    recorded = {
        "families": ["base"],
        "n_columns": 2,
        "weights": {"lightgbm": 1.0},
        "tuned_params": {"lightgbm": {"n_estimators": 10}},
    }
    path = tmp_path / "summary.json"
    path.write_text(json.dumps(recorded))
    monkeypatch.setattr(pipeline, "SUMMARY_PATH", path)

    captured = {}

    def fake_predict(families, columns, weights, tuned):
        captured.update(families=families, columns=columns, weights=weights, tuned=tuned)
        return "ok"

    monkeypatch.setattr(pipeline, "_predict_and_write", fake_predict)
    monkeypatch.setattr(pipeline, "load_selection", lambda: {"columns": ["base_cnt", "base_sum"]})

    assert predict_from_saved() == "ok"
    assert captured["families"] == ["base"]
    assert captured["columns"] == ["base_cnt", "base_sum"]
    assert captured["weights"] == {"lightgbm": 1.0}
    assert captured["tuned"] == {"lightgbm": {"n_estimators": 10}}
