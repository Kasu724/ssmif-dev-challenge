"""
FastAPI app to fetch stored price data and run trading strategy backtests.
"""
import numpy as np
import yfinance as yf
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from datetime import datetime, date

from backend.database import SessionLocal, Price, Base, engine
from backend.ingest_utils import fetch_and_store
from backend.strategies import (
    threshold_cross_strategy,
    moving_average_crossover_strategy,
    rsi_mean_reversion_strategy,
)
from backend.backtest import run_backtest
from fastapi.middleware.cors import CORSMiddleware

# FastAPI Setup
app = FastAPI(title="SSMIF Dev Challenge - Backend")

Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Database Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Utility Endpoints
@app.get("/health")
def health():
    """Simple health check endpoint."""
    return {"status": "ok"}


@app.get("/prices/{symbol}")
def get_prices(symbol: str, db: Session = Depends(get_db)):
    """Return stored price data for a given symbol."""
    prices = db.query(Price).filter(Price.symbol == symbol).order_by(Price.date.asc()).all()
    if not prices:
        raise HTTPException(status_code=404, detail="Symbol not found")

    return [
        {
            "symbol": p.symbol,
            "date": p.date,
            "open": p.open,
            "high": p.high,
            "low": p.low,
            "close": p.close,
            "volume": p.volume,
        }
        for p in prices
    ]


@app.get("/refresh/{symbol}")
def refresh_prices(symbol: str, db: Session = Depends(get_db)):
    """Fetch the latest price data for a symbol using the shared ingestion utility."""
    end = datetime.now().date()
    start = date(end.year, 1, 1)
    inserted = fetch_and_store(symbol, start, end, db_session=db)
    return {"message": f"Inserted {inserted} new rows for {symbol}."}


@app.get("/chart/{symbol}", response_class=HTMLResponse)
def price_chart(symbol: str, db: Session = Depends(get_db)):
    """Render an interactive candlestick chart for a symbol."""
    prices = db.query(Price).filter(Price.symbol == symbol).order_by(Price.date.asc()).all()
    if not prices:
        return HTMLResponse(f"<h3>No data found for {symbol}</h3>", status_code=404)

    dates = [p.date for p in prices]
    opens = [p.open for p in prices]
    highs = [p.high for p in prices]
    lows = [p.low for p in prices]
    closes = [p.close for p in prices]

    fig = make_subplots(rows=1, cols=1, shared_xaxes=True)
    fig.add_trace(
        go.Candlestick(x=dates, open=opens, high=highs, low=lows, close=closes, name=symbol)
    )
    fig.update_layout(
        title=f"{symbol} Price Chart",
        xaxis_title="Date",
        yaxis_title="Price (USD)",
        template="plotly_dark",
        height=600,
    )
    return fig.to_html(full_html=True)


# Backtest Endpoint
@app.get("/backtest/{symbol}")
def backtest(
    symbol: str,
    strategy: str = Query("threshold_cross", description="Trading strategy to use"),
    threshold: float = Query(None, description="Buy threshold for entry condition"),
    holding_period: int = Query(None, description="Days to hold before selling"),
    short_window: int = Query(None, description="Short moving average window (for MA strategy)"),
    long_window: int = Query(None, description="Long moving average window (for MA strategy)"),
    rsi_window: int = Query(None, description="RSI lookback window"),
    buy_threshold: float = Query(None, description="RSI buy threshold (e.g., 30)"),
    sell_threshold: float = Query(None, description="RSI sell threshold (e.g., 70)"),
    start_date: str = Query("2025-01-01"),
    end_date: str = Query("2025-12-31"),
):
    """
    Run a backtest for a given symbol and strategy.
    Example:
        /backtest/AAPL?strategy=threshold_cross&threshold=180&holding_period=3
        /backtest/AAPL?strategy=moving_average&short_window=20&long_window=50
        /backtest/AAPL?strategy=rsi_mean_reversion&rsi_window=14&buy_threshold=30&sell_threshold=70
    """
    start = date.fromisoformat(start_date)
    end = date.fromisoformat(end_date)

    # Load price data
    db = SessionLocal()
    prices = db.query(Price).filter(Price.symbol == symbol, Price.date >= start, Price.date <= end).all()
    db.close()

    if not prices:
        raise HTTPException(status_code=404, detail=f"No data available for {symbol} in selected range.")

    # Convert to DataFrame
    df = pd.DataFrame(
        [{"date": p.date, "close": p.close, "open": p.open, "high": p.high, "low": p.low, "volume": p.volume} for p in prices]
    ).set_index("date")

    # Run selected strategy
    if strategy == "threshold_cross":
        result = threshold_cross_strategy(df, threshold, holding_period)
    elif strategy == "moving_average":
        result = moving_average_crossover_strategy(df, short_window, long_window)
    elif strategy == "rsi_mean_reversion":
        result = rsi_mean_reversion_strategy(df, rsi_window, buy_threshold, sell_threshold)
    else:
        raise HTTPException(status_code=400, detail="Invalid strategy name")

    # Performance metrics
    trades = result["trades"]
    total_pnl = sum(t["pnl"] for t in trades) if trades else 0.0
    win_rate = (sum(1 for t in trades if t["pnl"] > 0) / len(trades) * 100.0) if trades else 0.0

    # Starting & ending capital for CAGR
    starting_capital = 10000.0
    final_capital = starting_capital + total_pnl

    # Duration of test in trading days
    num_days = max((end - start).days, 1)

    # CAGR formula: ((Final / Initial) ** (252 / N)) - 1
    cagr = ((final_capital / starting_capital) ** (252 / num_days) - 1) * 100.0

    # Max Drawdown from equity curve
    eq_series = pd.Series([p["equity"] for p in result["equity_curve"]], dtype=float)
    if not eq_series.empty:
        starting_capital = 10000.0
        capital_series = starting_capital + eq_series

        running_max = capital_series.cummax()
        drawdowns = (capital_series - running_max) / running_max

        drawdowns = drawdowns.replace([float("inf"), float("-inf")], 0).fillna(0)
        max_drawdown_pct = drawdowns.min() * 100.0
    else:
        max_drawdown_pct = 0.0

    return {
        "symbol": symbol.upper(),
        "strategy": strategy,
        "period": f"{start} → {end}",
        "performance_summary": {
            "Total PnL": round(total_pnl, 2),
            "Annualized Return": f"{cagr:.2f}%",
            "Max Drawdown": f"{max_drawdown_pct:.2f}%",
            "Win Probability": f"{win_rate:.1f}%",
        },
        "trades": trades,
        "equity_curve": result["equity_curve"],
    }