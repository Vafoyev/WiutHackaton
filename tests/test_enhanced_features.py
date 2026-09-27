import numpy as np
import pandas as pd

from src.enhanced_features import build_enhanced_features
from src.features import prepare_transactions


def fixture():
    signals = pd.DataFrame({"signal_id": ["a", "b"],
                            "signal_sanasi": pd.to_datetime(["2026-09-01"] * 2)})
    tx = pd.DataFrame({"signal_id": ["a"] * 4,
                       "tranzaksiya_vaqti": pd.to_datetime(["2026-08-30", "2026-08-29", "2026-07-01", "2026-09-02"]),
                       "kirim_chiqim": ["kirim"] * 4, "tranzaksiya_turi": ["karta"] * 4,
                       "miqdor_indeksi": [2., 4., -3., 1000.]})
    return signals, tx


def test_new_amount_features_exclude_future_and_preserve_silent_alerts():
    signals, tx = fixture()
    result = build_enhanced_features(prepare_transactions(tx, signals), signals)
    assert result.loc["a", "dist_kirim_karta_mean"] == 1.
    assert result.loc["a", "dist_kirim_karta_max"] == 4.
    assert result.loc["b", "dist_all_count"] == 0
    assert np.isnan(result.loc["b", "dist_all_mean"])
    assert np.isnan(result.loc["a", "dist_chiqim_naqd_mean"])


def test_recent_change_compares_disjoint_time_windows():
    signals, tx = fixture()
    result = build_enhanced_features(prepare_transactions(tx, signals), signals)
    assert result.loc["a", "trend_karta_7_mean_delta"] == 6.
    assert np.isclose(result.loc["a", "trend_karta_7_share"], 2 / 3)


def test_schema_and_values_do_not_depend_on_other_alerts_or_labels():
    signals, tx = fixture()
    prepared = prepare_transactions(tx, signals)
    full = build_enhanced_features(prepared, signals.assign(eskalatsiya=[0, 1]))
    empty = build_enhanced_features(prepared.iloc[:0], signals)
    single = build_enhanced_features(prepared, signals.iloc[:1].assign(eskalatsiya=1))
    assert list(full) == list(empty)
    pd.testing.assert_series_equal(full.loc["a"], single.loc["a"])
