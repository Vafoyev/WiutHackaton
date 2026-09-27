"""The website's numbers must come from the recorded run, never from hand-typing.

The file this replaces (mockData.ts) claimed 55,234 alerts against a real 14,000,
1,240,500 transactions against a real ~7M, a 2.1% escalation rate against a real
17.2%, and an ablation trace whose last 21 rows never happened.
"""
import json

import pytest

from src.web_data import build_web_data, render_typescript


@pytest.fixture
def recorded(tmp_path):
    summary = {
        "families": ["base", "direction_type", "cross"],
        "family_level_would_keep": ["direction_type", "base"],
        "n_columns": 25,
        "ensemble_cv_mean": 0.6375697640121961,
        "ensemble_cv_std": 0.0008582693136662209,
        "best_single_model": "lightgbm",
        "best_single_cv_mean": 0.6326012269608647,
        "ensemble_gain_over_best_single": 0.004968537051331379,
        "adversarial_auc": 0.4956064166666666,
        "weighting": "fitted",
        "selection_history": [
            {"family": "base", "n_columns": 7, "mean": 0.5683, "std": 0.0016,
             "score": 0.5667, "accepted": False},
            {"family": "direction_type", "n_columns": 24, "mean": 0.6020, "std": 0.0008,
             "score": 0.6012, "accepted": True},
            {"family": "cross", "n_columns": 16, "mean": 0.5106, "std": 0.0018,
             "score": 0.5089, "accepted": False},
        ],
    }
    integrity = {
        "null_scores": [0.5198, 0.53185, 0.51353, 0.51953, 0.50705],
        "holdout": {"cv_mean": 0.61880, "holdout_auc": 0.62138,
                    "optimism": -0.00258, "n_train": 11200, "n_holdout": 2800},
    }
    (tmp_path / "summary.json").write_text(json.dumps(summary))
    (tmp_path / "integrity.json").write_text(json.dumps(integrity))
    return tmp_path


def test_headline_counts_come_from_the_dataset_not_a_literal(recorded):
    result = build_web_data(recorded, alerts=14000, transactions=6986823, positive_rate=0.1717857)
    assert result["alerts"] == "14,000"
    assert result["transactions"] == "6,986,823"
    assert result["rate"] == "17.2%"


def test_rejected_family_count_is_derived_not_asserted(recorded):
    result = build_web_data(recorded, alerts=14000, transactions=6986823, positive_rate=0.17)
    # 3 families measured, 2 the family-level search would keep -> 1 rejected.
    assert result["rejected_families"] == 1
    # "At chance" uses the project's own mean - std <= 0.5 rule; none here qualify.
    assert result["chance_families"] == 0


def test_selection_history_is_copied_verbatim_with_no_invented_rows(recorded):
    result = build_web_data(recorded, alerts=14000, transactions=6986823, positive_rate=0.17)
    assert len(result["selection_history"]) == 3
    assert [r["family"] for r in result["selection_history"]] == [
        "base", "direction_type", "cross"
    ]


def test_drift_verdict_follows_the_measured_adversarial_auc(recorded):
    result = build_web_data(recorded, alerts=14000, transactions=6986823, positive_rate=0.17)
    assert result["adversarial"] == "0.4956"
    assert result["drift_verdict"] == "indistinguishable"


def test_holdout_evidence_is_carried_through(recorded):
    result = build_web_data(recorded, alerts=14000, transactions=6986823, positive_rate=0.17)
    assert result["holdout_auc"] == "0.6214"
    assert result["holdout_rows"] == "2,800"
    assert result["null_mean"] == "0.5184"


def test_rendered_typescript_is_valid_and_marked_generated(recorded):
    result = build_web_data(recorded, alerts=14000, transactions=6986823, positive_rate=0.17)
    source = render_typescript(result)
    assert source.startswith("// GENERATED FILE")
    assert "src.web_data" in source
    assert "export const data = {" in source
    assert '"14,000"' in source or "'14,000'" in source
    assert source.rstrip().endswith("};")


def test_rendered_typescript_contains_no_stale_mock_values(recorded):
    source = render_typescript(
        build_web_data(recorded, alerts=14000, transactions=6986823, positive_rate=0.1717857)
    )
    for fabricated in ("55,234", "1,240,500", "2.1%"):
        assert fabricated not in source, fabricated


def test_family_usage_is_derived_from_the_selected_columns(recorded):
    """The site said whole families were cut as noise, while the final model
    draws columns from nearly all of them. The count must come from the columns."""
    import json as _json

    summary = _json.loads((recorded / "summary.json").read_text())
    summary["selected_columns"] = [
        "ty_m_naqd", "base_min", "amt_skew", "win_max60", "cross_sh_kirim_naqd",
    ]
    (recorded / "summary.json").write_text(_json.dumps(summary))

    result = build_web_data(recorded, alerts=14000, transactions=100, positive_rate=0.17)
    assert result["families_used"] == 5
    assert result["family_breakdown"] == [
        {"family": "direction_type", "n": 1},
        {"family": "base", "n": 1},
        {"family": "amount_shape", "n": 1},
        {"family": "cross", "n": 1},
        {"family": "windows", "n": 1},
    ] or sorted(r["family"] for r in result["family_breakdown"]) == [
        "amount_shape", "base", "cross", "direction_type", "windows"
    ]


def test_family_usage_counts_columns_per_family(recorded):
    import json as _json

    summary = _json.loads((recorded / "summary.json").read_text())
    summary["selected_columns"] = ["ty_m_naqd", "ty_s_naqd", "dir_m_kirim", "base_min"]
    (recorded / "summary.json").write_text(_json.dumps(summary))

    result = build_web_data(recorded, alerts=14000, transactions=100, positive_rate=0.17)
    by_family = {row["family"]: row["n"] for row in result["family_breakdown"]}
    assert by_family["direction_type"] == 3
    assert by_family["base"] == 1
    assert result["families_used"] == 2
