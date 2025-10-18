"""
FastAPI app to fetch stored price data.
"""
import numpy as np
import yfinance as yf
import pandas as pd
import plotly.graph_objects as go
from fastapi.responses import HTMLResponse
from plotly.subplots import make_subplots
from fastapi import FastAPI, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.database import SessionLocal, Price
from backend.ingest_utils import fetch_and_store
from backend.backtest import run_backtest
from datetime import datetime, date

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="SSMIF Dev Challenge - Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/health")
def health():
    """Simple health check endpoint."""
    return {"status": "ok"}

@app.get("/prices/{symbol}")
def get_prices(symbol: str, db: Session = Depends(get_db)):
    """
    Return stored price data for a given symbol (e.g., /prices/AAPL).
    """
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
    """
    Fetch the latest price data for a symbol using the shared ingestion utility.
    """
    end = datetime.now().date()
    start = date(end.year, 1, 1)
    inserted = fetch_and_store(symbol, start, end, db_session=db)
    return {"message": f"Inserted {inserted} new rows for {symbol}."}

@app.get("/chart/{symbol}", response_class=HTMLResponse)
def price_chart(symbol: str, db: Session = Depends(get_db)):
    """
    Render an interactive candlestick chart for a symbol.
    """
    prices = (
        db.query(Price)
        .filter(Price.symbol == symbol)
        .order_by(Price.date.asc())
        .all()
    )

    if not prices:
        return HTMLResponse(f"<h3>No data found for {symbol}</h3>", status_code=404)

    # Prepare lists for Plotly
    dates = [p.date for p in prices]
    opens = [p.open for p in prices]
    highs = [p.high for p in prices]
    lows = [p.low for p in prices]
    closes = [p.close for p in prices]

    fig = make_subplots(rows=1, cols=1, shared_xaxes=True)
    fig.add_trace(
        go.Candlestick(
            x=dates,
            open=opens,
            high=highs,
            low=lows,
            close=closes,
            name=symbol,
        )
    )

    fig.update_layout(
        title=f"{symbol} Price Chart",
        xaxis_title="Date",
        yaxis_title="Price (USD)",
        template="plotly_dark",
        height=600,
    )

    return fig.to_html(full_html=True)

@app.get("/backtest/{symbol}")
def backtest(
    symbol: str,
    threshold: float = Query(100.0, description="Buy threshold for entry condition"),
    holding_period: int = Query(5, description="Days to hold before selling"),
    start_date: str = Query("2025-01-01"),
    end_date: str = Query("2025-12-31"),
    include_trades: bool = Query(False, description="Include detailed trade data?")
):
    """
    Run a simple backtest for a given symbol and parameters.
    Example:
        /backtest/AAPL?threshold=180&holding_period=3
        /backtest/AAPL?threshold=180&include_trades=true
    """
    start = date.fromisoformat(start_date)
    end = date.fromisoformat(end_date)
    result = run_backtest(symbol, start, end, threshold, holding_period)

    # Handle error responses from run_backtest
    if "error" in result:
        return {"status": "error", "message": result["error"]}

    metrics = result["metrics"]

    # Clean summary for readability
    response = {
        "symbol": symbol.upper(),
        "period": f"{start} → {end}",
        "strategy_params": {
            "threshold": threshold,
            "holding_period": holding_period
        },
        "performance_summary": {
            "Total PnL": metrics["total_pnl"],
            "Annualized Return": f"{metrics['annualized_return']}%",
            "Max Drawdown": f"{metrics['max_drawdown']}%",
            "Win Probability": f"{metrics['win_probability']*100:.1f}%"
        },
    }

    # Only include trade details if requested
    if include_trades:
        response["trades"] = result["trades"]
    response["equity_curve"] = result["equity_curve"]

    return response