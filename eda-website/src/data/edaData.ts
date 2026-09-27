// GENERATED FILE - do not edit by hand.
// Every value is derived from experiments/summary.json and
// experiments/integrity.json. Regenerate with: python -m src.web_data
// Hand-written numbers on this page were wrong by large factors once;
// see src.web_data for why this file is generated instead.
export const data = {
  "alerts": "14,000",
  "transactions": "6,986,823",
  "rate": "17.2%",
  "columns": "25",
  "auc": "0.6376",
  "auc_std": "0.0009",
  "best_single_model": "lightgbm",
  "best_single_auc": "0.6326",
  "ensemble_gain": "+0.0050",
  "weighting": "fitted",
  "adversarial": "0.4956",
  "drift_verdict": "indistinguishable",
  "families_measured": 9,
  "rejected_families": 7,
  "chance_families": 3,
  "family_level_kept": [
    "base",
    "direction_type"
  ],
  "families_used": 8,
  "family_breakdown": [
    {
      "family": "amount_shape",
      "n": 6
    },
    {
      "family": "direction_type",
      "n": 5
    },
    {
      "family": "cross",
      "n": 4
    },
    {
      "family": "windows",
      "n": 4
    },
    {
      "family": "base",
      "n": 3
    },
    {
      "family": "burst",
      "n": 1
    },
    {
      "family": "hour",
      "n": 1
    },
    {
      "family": "signal_date",
      "n": 1
    }
  ],
  "selection_history": [
    {
      "family": "base",
      "n_columns": 7,
      "mean": 0.5683,
      "accepted": false
    },
    {
      "family": "amount_shape",
      "n_columns": 11,
      "mean": 0.5453,
      "accepted": false
    },
    {
      "family": "direction_type",
      "n_columns": 24,
      "mean": 0.602,
      "accepted": true
    },
    {
      "family": "cross",
      "n_columns": 16,
      "mean": 0.5106,
      "accepted": false
    },
    {
      "family": "flow",
      "n_columns": 4,
      "mean": 0.5218,
      "accepted": false
    },
    {
      "family": "windows",
      "n_columns": 46,
      "mean": 0.5372,
      "accepted": false
    },
    {
      "family": "burst",
      "n_columns": 7,
      "mean": 0.5009,
      "accepted": false
    },
    {
      "family": "hour",
      "n_columns": 7,
      "mean": 0.5029,
      "accepted": false
    },
    {
      "family": "signal_date",
      "n_columns": 6,
      "mean": 0.4974,
      "accepted": false
    },
    {
      "family": "base",
      "n_columns": 31,
      "mean": 0.6161,
      "accepted": true
    },
    {
      "family": "amount_shape",
      "n_columns": 35,
      "mean": 0.5982,
      "accepted": false
    },
    {
      "family": "cross",
      "n_columns": 40,
      "mean": 0.5956,
      "accepted": false
    },
    {
      "family": "flow",
      "n_columns": 28,
      "mean": 0.5976,
      "accepted": false
    },
    {
      "family": "windows",
      "n_columns": 70,
      "mean": 0.5905,
      "accepted": false
    },
    {
      "family": "burst",
      "n_columns": 31,
      "mean": 0.5944,
      "accepted": false
    },
    {
      "family": "hour",
      "n_columns": 31,
      "mean": 0.5962,
      "accepted": false
    },
    {
      "family": "signal_date",
      "n_columns": 30,
      "mean": 0.5952,
      "accepted": false
    },
    {
      "family": "amount_shape",
      "n_columns": 42,
      "mean": 0.6133,
      "accepted": false
    },
    {
      "family": "cross",
      "n_columns": 47,
      "mean": 0.6123,
      "accepted": false
    },
    {
      "family": "flow",
      "n_columns": 35,
      "mean": 0.6137,
      "accepted": false
    },
    {
      "family": "windows",
      "n_columns": 77,
      "mean": 0.6078,
      "accepted": false
    },
    {
      "family": "burst",
      "n_columns": 38,
      "mean": 0.6112,
      "accepted": false
    },
    {
      "family": "hour",
      "n_columns": 38,
      "mean": 0.6131,
      "accepted": false
    },
    {
      "family": "signal_date",
      "n_columns": 37,
      "mean": 0.6109,
      "accepted": false
    }
  ],
  "holdout_auc": "0.6214",
  "holdout_cv": "0.6188",
  "holdout_optimism": "-0.0026",
  "holdout_rows": "2,800",
  "null_mean": "0.5184"
};
