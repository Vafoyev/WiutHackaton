"""Keep the test suite out of the project's real experiment log.

select_families() and tune() call log_run() internally, so without this the
suite appends synthetic rows to experiments/log.csv and corrupts the record
the EDA site and notebook read from. The prediction fixtures likewise write a
submission CSV, which must never land in the real outputs/ directory.
"""
import pytest

from src import config

import src.selection as selection
import src.submission as submission
import src.validation as validation


@pytest.fixture(autouse=True, scope="session")
def _redirect_experiment_artifacts(tmp_path_factory):
    scratch = tmp_path_factory.mktemp("experiments")
    validation.LOG_PATH = scratch / "log.csv"
    selection.SELECTION_PATH = scratch / "selected_features.json"
    # submission.py binds OUTPUTS at import time; without this a fixture run
    # writes a synthetic team_2ABB3C78.csv into the real outputs/ directory.
    submission.OUTPUTS = scratch / "outputs"
    yield


@pytest.fixture
def requires_competition_data():
    """Skip when fintech_data/ is absent.

    The organizer's dataset is not in the repository, so tests that read it
    cannot run in CI. Skipping is right here: the test still guards the
    behaviour for anyone who has the data, and CI keeps covering everything
    that runs on fixtures.
    """
    if not config.TRAIN_SIGNALS.exists():
        pytest.skip(f"competition data not present ({config.TRAIN_SIGNALS})")
