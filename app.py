from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd
import streamlit as st


ROOT = Path(__file__).resolve().parent
DATA = ROOT / "fintech_data"

st.set_page_config(page_title="DnkCode | AML alert analysis", layout="wide")
st.title("AML Alert Prioritization")
st.caption("DnkCode | WIUT Hackathon 2026 | Team 2ABB3C78")

signals = pd.read_csv(DATA / "train_signals.csv")
st.header("Training labels")
positive_rate = signals["eskalatsiya"].mean()
c1, c2, c3 = st.columns(3)
c1.metric("Alerts", f"{len(signals):,}")
c2.metric("Escalated", f"{signals.eskalatsiya.sum():,}")
c3.metric("Escalation rate", f"{positive_rate:.1%}")

fig, ax = plt.subplots(figsize=(7, 3.5))
signals["eskalatsiya"].value_counts().sort_index().rename(index={0: "Dismissed", 1: "Escalated"}).plot.bar(ax=ax, color=["#4a8f79", "#d36a52"])
ax.set_ylabel("Alerts")
ax.set_xlabel("")
ax.set_title("Training target distribution")
st.pyplot(fig, clear_figure=True)

st.header("Transaction history")
try:
    tx = pd.read_parquet(DATA / "train_transactions.parquet")
except Exception as exc:
    st.error(f"Training transaction file could not be read: {exc}")
else:
    a, b, c = st.columns(3)
    a.metric("Transactions", f"{len(tx):,}")
    b.metric("Alerts with transactions", f"{tx.signal_id.nunique():,}")
    c.metric("Transaction columns", len(tx.columns))
    st.markdown("**Initial observations:** 75.6% of transactions are incoming. Card transactions account for 53.8% and bank transfers for 39.4%.")
    tx["tranzaksiya_vaqti"] = pd.to_datetime(tx["tranzaksiya_vaqti"], errors="coerce")
    daily = tx.set_index("tranzaksiya_vaqti").resample("W").size()
    st.line_chart(daily.rename("Weekly transactions"))
    left, right = st.columns(2)
    direction = tx["kirim_chiqim"].value_counts().rename_axis("Direction").rename("Transactions")
    left.bar_chart(direction)
    types = tx["tranzaksiya_turi"].value_counts().rename_axis("Type").rename("Transactions")
    right.bar_chart(types)
    st.subheader("Transaction size indicator by outcome")
    labeled = tx.merge(signals[["signal_id", "eskalatsiya"]], on="signal_id", how="inner")
    size_plot = labeled.groupby("eskalatsiya")["miqdor_indeksi"].agg(["median", "mean"]).rename(index={0: "Dismissed", 1: "Escalated"})
    st.dataframe(size_plot.style.format("{:.3f}"), width="stretch")
    volume_plot = labeled.groupby(["signal_id", "eskalatsiya"]).size().groupby("eskalatsiya").agg(["median", "mean"]).rename(index={0: "Dismissed", 1: "Escalated"})
    st.subheader("Transaction volume per alert")
    st.dataframe(volume_plot.style.format("{:.1f}"), width="stretch")
    st.write("Model features summarize transaction counts, amount statistics, transaction directions and types, history span, and signal date parts.")

st.header("Modeling notes")
st.write(f"The training target is imbalanced ({positive_rate:.1%} escalated). We evaluate probability predictions with ROC-AUC and use class-weighted logistic regression as a transparent baseline.")
st.info("Publish this app on Streamlit Community Cloud or another public host and submit its public URL with the prediction CSV and notebook.")
