"""
Minimal data ingester for fetching price data via yfinance.
"""
import os
import sys
from datetime import date
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from backend.ingest_utils import fetch_and_store

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

if __name__ == "__main__":
    symbol = "AAPL"
    start = date(2025, 1, 1)
    end = date(2025, 1, 15)

    print(f"Fetching {symbol} data from {start} to {end}...")
    fetch_and_store(symbol, start, end)