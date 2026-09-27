import pandas as pd

from src.site_data import compute


def _signals():
    return pd.DataFrame(
        {
            "signal_id": ["SG_1", "SG_2"],
            "signal_sanasi": pd.to_datetime(["2025-03-10", "2025-04-11"]),
            "eskalatsiya": [0, 1],
        }
    )


def _tx():
    return pd.DataFrame(
        {
            "signal_id": ["SG_1", "SG_2", "SG_2"],
            "tranzaksiya_vaqti": pd.to_datetime(
                ["2025-03-01", "2025-04-01", "2025-04-05"]
            ),
            "kirim_chiqim": ["kirim", "chiqim", "kirim"],
            "tranzaksiya_turi": ["karta", "naqd", "xalqaro"],
            "miqdor_indeksi": [1.0, 2.0, -1.0],
            "days_before": [9.0, 10.0, 6.0],
            "out": [0, 1, 0],
            "hour": [0, 0, 0],
            "dow": [5, 1, 5],
        }
    )


def test_compute_returns_every_named_aggregate():
    tables = compute(_signals(), _tx())
    expected = {
        "target",
        "weekly_volume",
        "direction",
        "types",
        "amount_by_outcome",
        "volume_by_outcome",
        "days_before_hist",
        "type_by_outcome",
    }
    assert expected <= set(tables)


def test_aggregates_are_small_enough_to_commit():
    tables = compute(_signals(), _tx())
    for name, table in tables.items():
        assert len(table) < 5000, name


def test_no_aggregate_leaks_raw_signal_ids():
    tables = compute(_signals(), _tx())
    for name, table in tables.items():
        # str() per element: pandas 3.0 astype(str) leaves NaN as a float.
        flat = [str(value) for value in table.reset_index().values.ravel()]
        assert not any(value.startswith("SG_") for value in flat), name


def test_build_site_cannot_overwrite_the_react_build_output():
    """docs/ is the Vite build output for the React EDA site. build_site.py used
    to write docs/index.html, so one run would destroy the published site."""
    from src import build_site, config

    assert build_site.DEFAULT_OUTPUT != config.DOCS
    assert config.DOCS not in build_site.DEFAULT_OUTPUT.parents
    assert build_site.DEFAULT_OUTPUT != config.ROOT


def test_build_site_writes_where_it_says(tmp_path, requires_competition_data):
    from src.build_site import build

    target = build(tmp_path / "somewhere")
    assert target.parent == tmp_path / "somewhere"
    assert target.name == "index.html"
    head = target.read_text(encoding="utf-8").lstrip()[:20].lower()
    assert head.startswith("<!doctype html>"), head
