# Trading Strategy Backtester

A full-stack web application for simulating and visualizing trading strategies.  This project provides an interactive interface to run stock backtests, visualize results, and analyze performance metrics, all based on live market data.  This was built as part of the SSMIF Development Challenge.

## Overview

The Trading Strategy Backtester uses a FastAPI backend and a Next.js frontend.

- Backend:
    - Historical data fetching via Yahoo Finance (yfinance)
    - Data storage in an SQL database (SQLite)
    - Strategy simulation (e.g., threshold-based buy/sell logic)
    - API endpoints for the frontend

- Frontend:
    - A simple dashboard interface
    - Adjustable parameters (symbol, threshold, date range, etc.)
    - Dynamic charts built with Recharts
    - Real-time results, performance summaries, and metrics visualization

## Tech Stack

### Frontend
- [Next.js 14](https://nextjs.org/): React framework for server-side rendering and routing  
- [Tailwind CSS](https://tailwindcss.com/): for styling  
- [Recharts](https://recharts.org/en-US/): for data visualization  
- [Axios](https://axios-http.com/): for calling backend APIs

### Backend
- [FastAPI](https://fastapi.tiangolo.com/): Python web framework  
- [SQLAlchemy](https://www.sqlalchemy.org/): ORM for managing database models  
- [yfinance](https://pypi.org/project/yfinance/): for fetching stock price data  
- [Plotly](https://plotly.com/python/): for backend charting/visualization 
- [Pandas](https://pandas.pydata.org/) + [NumPy](https://numpy.org/): for data manipulation

### Database
- SQLite
- Can swap to PostgreSQL or MySQL for production

## Setup Instructions

### 0. Ensure Python Installation
Install [Python 3.11.6](https://www.python.org/downloads/release/python-3116)
Install [Git](https://git-scm.com/downloads)

### 1. Clone Repository
Open a terminal and run:
```bash
git clone https://github.com/Kasu724/ssmif-dev-challenge.git
cd ssmif-dev-challenge
```
### 2. Setup Backend
Activate Virtual Environment
```bash
'''Activate Virtual Environment'''
py -3.11 -m venv .venv
.venv\Scripts\activate       # Windows
source .venv/bin/activate     # Mac/Linux
# Ensure correct Python Interpreter is being used
# Path should be ..\ssmif-dev-challenge\.venv\Scripts\python.exe

'''Install Dependencies'''
cd backend
pip install -r requirements.txt

'''Run FastAPI Server'''
cd ..
uvicorn backend.app:app --reload
```
The FastAPI Server runs on http://127.0.0.1:8000 by default
- You can verify it by going to http://127.0.0.1:8000/health, and it should return ```{"status": "ok"}```

### 3. Setup Frontend
Open a second terminal and run:
```bash
cd ssmif-dev-challenge
cd frontend
npm install
npm run dev
```
The app runs on http://localhost:3000 by default

## Running a Backtest
1. Ensure the backend and frontend are both running
2. Open the app: http://localhost:3000
3. Select a trading strategy
4. Input corresponding parameters
5. Click "Run Backtest"

## Trading Strategies
The app currently supports three trading strategies
1. Threshold Cross
- Logic: Buys when the price exceeds a fixed threshold and holds the position for a set number of days.
- Parameters:
    - Threshold: The price level that triggers a buy signal (e.g., 180).
    - Hold Days: How long to hold the position before selling (e.g., 5).
2. Moving Average Crossover
- Logic: Buys when a short-term moving average crosses above a long-term moving average ("Golden Cross") and sells when it crosses below ("Death Cross").
- Parameters:
    - Short MA: Number of days for the short-term moving average (e.g., 20).
    - Long MA: Number of days for the long-term moving average (e.g., 50).
3. Relative Strength Index (RSI) Mean Reversion
- Logic: Buys when the RSI falls below a "oversold" level (e.g., 30) and sells when RSI rises above an "overbought" level (e.g., 70).
- Parameters:
    - RSI Window: The number of periods used to compute RSI (commonly 14).
    - Buy Threshold: RSI level that triggers a buy (typically below 30).
    - Sell Threshold: RSI level that triggers a sell (typically above 70).

## Performance Statistics

| Metric | Description | Formula / Explanation |
|-------|-------|-------|
| Total PnL | The total profit or loss (in dollars) from all closed trades. | Sum of all individual trade PnLs. |
| Annualized Return (CAGR) | Compound annual growth rate assuming continuous compounding. | `((Final / Initial) ^ (252 / N)) - 1` |
| Max Drawdown | The largest peak-to-trough decline in the equity curve, expressed as a percentage. | `(Equity - Peak) / Peak` |
| Win Probability | The percentage of profitable trades. | `(Winning Trades / Total Trades) × 100%` |

## Credits
Developed by Kevin Lui for the Stevens Student Managed Investment Fund (SSMIF) Development Challenge.





