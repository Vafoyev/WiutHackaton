import numpy as np
import pandas as pd
import pytest

from src.config import ID, PROBA
from src.submission import SubmissionError, check, write


def _expected():
    return pd.Series([f"SG_{i:06d}" for i in range(5)], name=ID)


def _good():
    return pd.DataFrame({ID: _expected(), PROBA: [0.1, 0.2, 0.3, 0.4, 0.5]})


def test_check_passes_every_rule_for_a_valid_frame():
    results = check(_good(), _expected())
    assert results
    assert all(passed for _, passed, _ in results)


@pytest.mark.parametrize(
    "mutate",
    [
        lambda f: f.drop(index=0),
        lambda f: pd.concat([f, f.iloc[[0]]]),
        lambda f: f.assign(**{PROBA: [0.1, 0.2, 0.3, 0.4, np.nan]}),
        lambda f: f.assign(**{PROBA: [0.1, 0.2, 0.3, 0.4, 1.5]}),
        lambda f: f.assign(**{PROBA: [0.1, 0.2, 0.3, 0.4, -0.1]}),
    ],
)
def test_check_fails_for_each_violation(mutate):
    results = check(mutate(_good()), _expected())
    assert any(not passed for _, passed, _ in results)


def test_write_refuses_to_write_an_invalid_frame(tmp_path):
    target = tmp_path / "out.csv"
    with pytest.raises(SubmissionError):
        write(_good().drop(index=0), _expected(), path=target)
    assert not target.exists()


def test_write_emits_two_columns_in_order_without_an_index(tmp_path):
    target = tmp_path / "out.csv"
    write(_good(), _expected(), path=target)
    first_line = target.read_text().splitlines()[0]
    assert first_line == f"{ID},{PROBA}"
    reloaded = pd.read_csv(target)
    assert list(reloaded.columns) == [ID, PROBA]
    assert len(reloaded) == 5


def test_write_preserves_expected_id_order(tmp_path):
    target = tmp_path / "out.csv"
    shuffled = _good().iloc[::-1].reset_index(drop=True)
    write(shuffled, _expected(), path=target)
    reloaded = pd.read_csv(target)
    assert list(reloaded[ID]) == list(_expected())
