"""
Ingestion utility: fetches data from yfinance and saves to database.
Used by ingester script and the /refresh endpoint.
"""

import pandas as pd
import yfinance as yf
import numpy as np
from datetime import datetime, date
from backend.database import SessionLocal, Price


def fetch_and_store(symbol: str, start: date, end: date, db_session=None) -> int:
    """
    Fetch OHLCV data for a symbol from yfinance and save it to the database.
    Returns the number of rows inserted.
    """

    df = yf.download(symbol, start=start, end=end, progress=False).reset_index()

    # Flatten any MultiIndex columns
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = [col[0] if isinstance(col, tuple) else col for col in df.columns]

    df = df.rename(
        columns={
            "Date": "date",
            "Open": "open",
            "High": "high",
            "Low": "low",
            "Close": "close",
            "Volume": "volume",
        }
    )

    if df.empty:
        print(f"No data returned for {symbol}.")
        return 0

    # If no session provided, create our own (for script usage)
    close_session = False
    if db_session is None:
        db_session = SessionLocal()
        close_session = True

    inserted = 0
    try:
        for _, row in df.iterrows():
            date_val = row["date"]
            if isinstance(date_val, (pd.Timestamp, datetime)):
                date_val = date_val.date()
            elif isinstance(date_val, np.datetime64):
                date_val = pd.to_datetime(date_val).date()
            elif not isinstance(date_val, date):
                try:
                    date_val = pd.to_datetime(str(date_val)).date()
                except Exception:
                    print(f"⚠️ Skipping unparseable date: {date_val}")
                    continue

            exists = (
                db_session.query(Price)
                .filter(Price.symbol == symbol, Price.date == date_val)
                .first()
            )
            if exists:
                continue

            price = Price(
                symbol=symbol,
                date=date_val,
                open=float(row["open"]),
                high=float(row["high"]),
                low=float(row["low"]),
                close=float(row["close"]),
                volume=float(row["volume"]),
            )
            db_session.add(price)
            inserted += 1

        db_session.commit()
        print(f"Inserted {inserted} rows for {symbol}.")
        return inserted
    except Exception as e:
        db_session.rollback()
        print(f"Error saving data for {symbol}: {e}")
        return 0
    finally:
        if close_session:
            db_session.close()