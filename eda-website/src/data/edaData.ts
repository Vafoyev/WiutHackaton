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
  "null_mean": "0.5184",
  "charts": {
    "facts": {
      "historyDays": 180,
      "incomingShare": 0.756605,
      "lastTenDaysShare": 0.101097,
      "typeMixMaxGap": 0.002083,
      "topType": "karta",
      "topTypeShare": 0.537915
    },
    "targetDist": [
      {
        "label": "Dismissed",
        "n": 11595
      },
      {
        "label": "Escalated",
        "n": 2405
      }
    ],
    "direction": [
      {
        "label": "kirim",
        "n": 5286266
      },
      {
        "label": "chiqim",
        "n": 1700557
      }
    ],
    "types": [
      {
        "label": "karta",
        "n": 3758318
      },
      {
        "label": "bank_otkazmasi",
        "n": 2754388
      },
      {
        "label": "naqd",
        "n": 442295
      },
      {
        "label": "xalqaro",
        "n": 31822
      }
    ],
    "daysBefore": [
      {
        "bucket": 0.0,
        "dismissed": 0.101097,
        "escalated": 0.098962
      },
      {
        "bucket": 10.0,
        "dismissed": 0.025896,
        "escalated": 0.025402
      },
      {
        "bucket": 20.0,
        "dismissed": 0.030713,
        "escalated": 0.030724
      },
      {
        "bucket": 30.0,
        "dismissed": 0.035493,
        "escalated": 0.036009
      },
      {
        "bucket": 40.0,
        "dismissed": 0.040751,
        "escalated": 0.041484
      },
      {
        "bucket": 50.0,
        "dismissed": 0.045721,
        "escalated": 0.046222
      },
      {
        "bucket": 60.0,
        "dismissed": 0.050032,
        "escalated": 0.050977
      },
      {
        "bucket": 70.0,
        "dismissed": 0.054269,
        "escalated": 0.054939
      },
      {
        "bucket": 80.0,
        "dismissed": 0.057611,
        "escalated": 0.058157
      },
      {
        "bucket": 90.0,
        "dismissed": 0.060316,
        "escalated": 0.060988
      },
      {
        "bucket": 100.0,
        "dismissed": 0.062469,
        "escalated": 0.063179
      },
      {
        "bucket": 110.0,
        "dismissed": 0.06378,
        "escalated": 0.063612
      },
      {
        "bucket": 120.0,
        "dismissed": 0.064443,
        "escalated": 0.06428
      },
      {
        "bucket": 130.0,
        "dismissed": 0.064255,
        "escalated": 0.063946
      },
      {
        "bucket": 140.0,
        "dismissed": 0.063594,
        "escalated": 0.063139
      },
      {
        "bucket": 150.0,
        "dismissed": 0.062352,
        "escalated": 0.062044
      },
      {
        "bucket": 160.0,
        "dismissed": 0.060428,
        "escalated": 0.059465
      },
      {
        "bucket": 170.0,
        "dismissed": 0.05678,
        "escalated": 0.056472
      }
    ],
    "typesByOutcome": [
      {
        "label": "karta",
        "dismissed": 0.538117,
        "escalated": 0.536995
      },
      {
        "label": "bank_otkazmasi",
        "dismissed": 0.39443,
        "escalated": 0.393299
      },
      {
        "label": "naqd",
        "dismissed": 0.062929,
        "escalated": 0.065012
      },
      {
        "label": "xalqaro",
        "dismissed": 0.004524,
        "escalated": 0.004694
      }
    ],
    "weekly": [
      {
        "t": "2024-07-07",
        "n": 317
      },
      {
        "t": "2024-07-14",
        "n": 2514
      },
      {
        "t": "2024-07-21",
        "n": 5092
      },
      {
        "t": "2024-07-28",
        "n": 7374
      },
      {
        "t": "2024-08-04",
        "n": 9647
      },
      {
        "t": "2024-08-11",
        "n": 12163
      },
      {
        "t": "2024-08-18",
        "n": 14762
      },
      {
        "t": "2024-08-25",
        "n": 16881
      },
      {
        "t": "2024-09-01",
        "n": 19652
      },
      {
        "t": "2024-09-08",
        "n": 21607
      },
      {
        "t": "2024-09-15",
        "n": 23995
      },
      {
        "t": "2024-09-22",
        "n": 26404
      },
      {
        "t": "2024-09-29",
        "n": 28041
      },
      {
        "t": "2024-10-06",
        "n": 29781
      },
      {
        "t": "2024-10-13",
        "n": 31554
      },
      {
        "t": "2024-10-20",
        "n": 33761
      },
      {
        "t": "2024-10-27",
        "n": 35063
      },
      {
        "t": "2024-11-03",
        "n": 36690
      },
      {
        "t": "2024-11-10",
        "n": 37929
      },
      {
        "t": "2024-11-17",
        "n": 38957
      },
      {
        "t": "2024-11-24",
        "n": 40236
      },
      {
        "t": "2024-12-01",
        "n": 41723
      },
      {
        "t": "2024-12-08",
        "n": 42324
      },
      {
        "t": "2024-12-15",
        "n": 43276
      },
      {
        "t": "2024-12-22",
        "n": 44895
      },
      {
        "t": "2024-12-29",
        "n": 45389
      },
      {
        "t": "2025-01-05",
        "n": 50461
      },
      {
        "t": "2025-01-12",
        "n": 52387
      },
      {
        "t": "2025-01-19",
        "n": 52769
      },
      {
        "t": "2025-01-26",
        "n": 54297
      },
      {
        "t": "2025-02-02",
        "n": 56434
      },
      {
        "t": "2025-02-09",
        "n": 58341
      },
      {
        "t": "2025-02-16",
        "n": 58930
      },
      {
        "t": "2025-02-23",
        "n": 61361
      },
      {
        "t": "2025-03-02",
        "n": 69901
      },
      {
        "t": "2025-03-09",
        "n": 64236
      },
      {
        "t": "2025-03-16",
        "n": 64521
      },
      {
        "t": "2025-03-23",
        "n": 65994
      },
      {
        "t": "2025-03-30",
        "n": 66951
      },
      {
        "t": "2025-04-06",
        "n": 68091
      },
      {
        "t": "2025-04-13",
        "n": 69916
      },
      {
        "t": "2025-04-20",
        "n": 71052
      },
      {
        "t": "2025-04-27",
        "n": 73649
      },
      {
        "t": "2025-05-04",
        "n": 74718
      },
      {
        "t": "2025-05-11",
        "n": 75440
      },
      {
        "t": "2025-05-18",
        "n": 77741
      },
      {
        "t": "2025-05-25",
        "n": 79551
      },
      {
        "t": "2025-06-01",
        "n": 79801
      },
      {
        "t": "2025-06-08",
        "n": 80466
      },
      {
        "t": "2025-06-15",
        "n": 81814
      },
      {
        "t": "2025-06-22",
        "n": 83274
      },
      {
        "t": "2025-06-29",
        "n": 83656
      },
      {
        "t": "2025-07-06",
        "n": 86476
      },
      {
        "t": "2025-07-13",
        "n": 87727
      },
      {
        "t": "2025-07-20",
        "n": 86883
      },
      {
        "t": "2025-07-27",
        "n": 88152
      },
      {
        "t": "2025-08-03",
        "n": 88116
      },
      {
        "t": "2025-08-10",
        "n": 85010
      },
      {
        "t": "2025-08-17",
        "n": 87678
      },
      {
        "t": "2025-08-24",
        "n": 87132
      },
      {
        "t": "2025-08-31",
        "n": 86222
      },
      {
        "t": "2025-09-07",
        "n": 86901
      },
      {
        "t": "2025-09-14",
        "n": 88561
      },
      {
        "t": "2025-09-21",
        "n": 87354
      },
      {
        "t": "2025-09-28",
        "n": 87618
      },
      {
        "t": "2025-10-05",
        "n": 88592
      },
      {
        "t": "2025-10-12",
        "n": 89317
      },
      {
        "t": "2025-10-19",
        "n": 86646
      },
      {
        "t": "2025-10-26",
        "n": 88178
      },
      {
        "t": "2025-11-02",
        "n": 86231
      },
      {
        "t": "2025-11-09",
        "n": 84232
      },
      {
        "t": "2025-11-16",
        "n": 84855
      },
      {
        "t": "2025-11-23",
        "n": 84087
      },
      {
        "t": "2025-11-30",
        "n": 83790
      },
      {
        "t": "2025-12-07",
        "n": 83066
      },
      {
        "t": "2025-12-14",
        "n": 82992
      },
      {
        "t": "2025-12-21",
        "n": 81756
      },
      {
        "t": "2025-12-28",
        "n": 82492
      },
      {
        "t": "2026-01-04",
        "n": 81116
      },
      {
        "t": "2026-01-11",
        "n": 79847
      },
      {
        "t": "2026-01-18",
        "n": 78811
      },
      {
        "t": "2026-01-25",
        "n": 76232
      },
      {
        "t": "2026-02-01",
        "n": 74336
      },
      {
        "t": "2026-02-08",
        "n": 74941
      },
      {
        "t": "2026-02-15",
        "n": 70691
      },
      {
        "t": "2026-02-22",
        "n": 70590
      },
      {
        "t": "2026-03-01",
        "n": 69284
      },
      {
        "t": "2026-03-08",
        "n": 67214
      },
      {
        "t": "2026-03-15",
        "n": 68611
      },
      {
        "t": "2026-03-22",
        "n": 65804
      },
      {
        "t": "2026-03-29",
        "n": 62755
      },
      {
        "t": "2026-04-05",
        "n": 62374
      },
      {
        "t": "2026-04-12",
        "n": 59816
      },
      {
        "t": "2026-04-19",
        "n": 58240
      },
      {
        "t": "2026-04-26",
        "n": 56405
      },
      {
        "t": "2026-05-03",
        "n": 55781
      },
      {
        "t": "2026-05-10",
        "n": 55020
      },
      {
        "t": "2026-05-17",
        "n": 53383
      },
      {
        "t": "2026-05-24",
        "n": 51711
      },
      {
        "t": "2026-05-31",
        "n": 52306
      },
      {
        "t": "2026-06-07",
        "n": 50220
      },
      {
        "t": "2026-06-14",
        "n": 51294
      },
      {
        "t": "2026-06-21",
        "n": 50541
      },
      {
        "t": "2026-06-28",
        "n": 49363
      },
      {
        "t": "2026-07-05",
        "n": 46377
      },
      {
        "t": "2026-07-12",
        "n": 45385
      },
      {
        "t": "2026-07-19",
        "n": 44002
      },
      {
        "t": "2026-07-26",
        "n": 43274
      },
      {
        "t": "2026-08-02",
        "n": 40546
      },
      {
        "t": "2026-08-09",
        "n": 38517
      },
      {
        "t": "2026-08-16",
        "n": 36657
      },
      {
        "t": "2026-08-23",
        "n": 35076
      },
      {
        "t": "2026-08-30",
        "n": 33015
      },
      {
        "t": "2026-09-06",
        "n": 31952
      },
      {
        "t": "2026-09-13",
        "n": 29253
      },
      {
        "t": "2026-09-20",
        "n": 26787
      },
      {
        "t": "2026-09-27",
        "n": 24841
      },
      {
        "t": "2026-10-04",
        "n": 22168
      },
      {
        "t": "2026-10-11",
        "n": 20030
      },
      {
        "t": "2026-10-18",
        "n": 18099
      },
      {
        "t": "2026-10-25",
        "n": 16427
      },
      {
        "t": "2026-11-01",
        "n": 15240
      },
      {
        "t": "2026-11-08",
        "n": 11629
      },
      {
        "t": "2026-11-15",
        "n": 11467
      },
      {
        "t": "2026-11-22",
        "n": 10601
      },
      {
        "t": "2026-11-29",
        "n": 8510
      },
      {
        "t": "2026-12-06",
        "n": 6931
      },
      {
        "t": "2026-12-13",
        "n": 5786
      },
      {
        "t": "2026-12-20",
        "n": 4794
      },
      {
        "t": "2026-12-27",
        "n": 5271
      },
      {
        "t": "2027-01-03",
        "n": 1659
      }
    ],
    "amountHist": [
      {
        "x": -2.912,
        "n": 24073
      },
      {
        "x": -2.512,
        "n": 47544
      },
      {
        "x": -2.112,
        "n": 154405
      },
      {
        "x": -1.712,
        "n": 388504
      },
      {
        "x": -1.312,
        "n": 821268
      },
      {
        "x": -0.911,
        "n": 1202482
      },
      {
        "x": -0.511,
        "n": 1257833
      },
      {
        "x": -0.111,
        "n": 1044260
      },
      {
        "x": 0.289,
        "n": 759429
      },
      {
        "x": 0.689,
        "n": 517444
      },
      {
        "x": 1.089,
        "n": 332029
      },
      {
        "x": 1.49,
        "n": 198976
      },
      {
        "x": 1.89,
        "n": 113179
      },
      {
        "x": 2.29,
        "n": 61404
      },
      {
        "x": 2.69,
        "n": 31811
      },
      {
        "x": 3.09,
        "n": 16159
      },
      {
        "x": 3.49,
        "n": 8279
      },
      {
        "x": 3.89,
        "n": 4144
      },
      {
        "x": 4.291,
        "n": 1899
      },
      {
        "x": 4.691,
        "n": 952
      },
      {
        "x": 5.091,
        "n": 409
      },
      {
        "x": 5.491,
        "n": 196
      },
      {
        "x": 5.891,
        "n": 87
      },
      {
        "x": 6.291,
        "n": 57
      }
    ],
    "volumeByOutcome": [
      {
        "label": "Dismissed",
        "median": 455.0
      },
      {
        "label": "Escalated",
        "median": 493.0
      }
    ]
  },
  "dataset": {
    "files": [
      {
        "name": "train_signals.csv",
        "rows": "14,000",
        "cols": 3,
        "what": "one row per training alert"
      },
      {
        "name": "train_transactions.parquet",
        "rows": "6,987,663",
        "cols": 5,
        "what": "transaction history behind those alerts"
      },
      {
        "name": "test_signals.csv",
        "rows": "6,000",
        "cols": 2,
        "what": "one row per scored alert, no target"
      },
      {
        "name": "test_transactions.parquet",
        "rows": "3,027,575",
        "cols": 5,
        "what": "transaction history behind those"
      }
    ],
    "signalColumns": [
      {
        "name": "signal_id",
        "type": "id",
        "what": "unique alert identifier"
      },
      {
        "name": "signal_sanasi",
        "type": "date",
        "what": "date the alert was raised"
      },
      {
        "name": "eskalatsiya",
        "type": "target",
        "what": "1 = escalated, 0 = dismissed"
      }
    ],
    "txColumns": [
      {
        "name": "signal_id",
        "type": "id",
        "what": "the alert this transaction belongs to"
      },
      {
        "name": "tranzaksiya_vaqti",
        "type": "timestamp",
        "what": "when it happened"
      },
      {
        "name": "kirim_chiqim",
        "type": "category",
        "what": "direction: kirim / chiqim"
      },
      {
        "name": "tranzaksiya_turi",
        "type": "category",
        "what": "type: karta / bank_otkazmasi / naqd / xalqaro"
      },
      {
        "name": "miqdor_indeksi",
        "type": "number",
        "what": "standardized transaction size"
      }
    ],
    "perAlertMedian": "461",
    "perAlertMin": "1",
    "perAlertMax": "2,279",
    "windowDays": 180
  }
};
