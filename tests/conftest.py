"""Keep the test suite out of the project's real experiment log.

select_families() and tune() call log_run() internally, so without this the
suite appends synthetic rows to experiments/log.csv and corrupts the record
the EDA site and notebook read from.
"""
import pytest

import src.selection as selection
import src.validation as validation


@pytest.fixture(autouse=True, scope="session")
def _redirect_experiment_artifacts(tmp_path_factory):
    scratch = tmp_path_factory.mktemp("experiments")
    validation.LOG_PATH = scratch / "log.csv"
    selection.SELECTION_PATH = scratch / "selected_features.json"
    yield
