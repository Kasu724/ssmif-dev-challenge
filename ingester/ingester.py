"""
Minimal data ingester for fetching price data via yfinance.
"""
import os
import sys
from datetime import date, datetime
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from backend.ingest_utils import fetch_and_store

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

def get_date_input(prompt_text, default=None):
    """Parse date input"""
    user_input = input(prompt_text).strip()
    if not user_input:
        return default
    try:
        return datetime.strptime(user_input, "%Y-%m-%d").date()
    except ValueError:
        print("Invalid date format. Please use YYYY-MM-DD.")
        return get_date_input(prompt_text, default)


def main():
    print("--- Data Ingester ---")
    print("This script fetches daily OHLCV data from Yahoo Finance and stores it in your local database.\n")

    # Prompt for stock symbol
    symbol = input("Enter stock symbol (e.g. AAPL, MSFT): ").strip().upper()
    if not symbol:
        symbol = "AAPL"
        print("No symbol entered. Defaulting to AAPL.")

    # Prompt for date range
    start_default = date(2025, 1, 1)
    end_default = datetime.now().date()

    start = get_date_input(f"Enter start date [YYYY-MM-DD] (default {start_default}): ", start_default)
    end = get_date_input(f"Enter end date [YYYY-MM-DD] (default {end_default}): ", end_default)

    print(f"Fetching {symbol} data from {start} → {end}...")

    # Fetch and store
    try:
        inserted = fetch_and_store(symbol, start, end)
        if inserted:
            print(f"Successfully inserted {inserted} rows for {symbol}.")
        else:
            print(f"No new rows inserted — data may already exist in the database.")
    except Exception as e:
        print(f"Error during ingestion: {e}")

    print("\nDone.\n")

if __name__ == "__main__":
    main()