"""The test suite must never write into the project's experiment log."""
from src import config
import src.validation as validation


def test_experiment_log_is_redirected_away_from_the_repository():
    assert validation.LOG_PATH != config.EXPERIMENTS / "log.csv"
    assert config.EXPERIMENTS not in validation.LOG_PATH.parents
