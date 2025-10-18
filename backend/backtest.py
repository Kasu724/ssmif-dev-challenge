"""
Backtesting engine with automatic data fetching via backend.ingest_utils.
"""

from datetime import timedelta, date
from backend.database import SessionLocal, Price
from backend.ingest_utils import fetch_and_store


def ensure_data_available(symbol: str, start_date: date, end_date: date):
    """
    Checks if data for the given date range exists in the DB.
    If not, fetches and saves missing data using fetch_and_store().
    """
    session = SessionLocal()
    try:
        first = (
            session.query(Price)
            .filter(Price.symbol == symbol)
            .order_by(Price.date.asc())
            .first()
        )
        last = (
            session.query(Price)
            .filter(Price.symbol == symbol)
            .order_by(Price.date.desc())
            .first()
        )

        # If no data exists at all
        if not first or not last:
            print(f"No data found for {symbol}. Fetching full range...")
            fetch_and_store(symbol, start_date, end_date, db_session=session)
            return

        # Detect missing portions
        needs_start = start_date < first.date
        needs_end = end_date > last.date

        if needs_start:
            print(f"Fetching missing earlier data for {symbol}...")
            fetch_and_store(symbol, start_date, first.date, db_session=session)

        if needs_end:
            print(f"Fetching missing recent data for {symbol}...")
            fetch_and_store(symbol, last.date, end_date, db_session=session)

    finally:
        session.close()


def run_backtest(symbol: str, start_date: date, end_date: date, threshold: float, holding_period: int = 5):
    """
    Run a simple backtest on stored data for the given symbol.
    Automatically fills missing data using the ingester.
    """
    ensure_data_available(symbol, start_date, end_date)

    session = SessionLocal()
    try:
        prices = (
            session.query(Price)
            .filter(
                Price.symbol == symbol,
                Price.date >= start_date,
                Price.date <= end_date,
            )
            .order_by(Price.date.asc())
            .all()
        )

        if not prices:
            return {"error": "No price data found for that range, even after fetching."}

        data = [(p.date, p.close) for p in prices]

        trades = []
        position = None
        equity_curve = []
        pnl_sum = 0.0
        wins = 0

        for i, (d, close_price) in enumerate(data):
            if position is None and close_price >= threshold:
                position = (d, close_price)
            elif position is not None:
                entry_date, entry_price = position
                if (d - entry_date).days >= holding_period or i == len(data) - 1:
                    pnl = close_price - entry_price
                    pnl_sum += pnl
                    wins += 1 if pnl > 0 else 0
                    trades.append(
                        {
                            "entry_date": entry_date,
                            "entry_price": entry_price,
                            "exit_date": d,
                            "exit_price": close_price,
                            "pnl": round(pnl, 2),
                        }
                    )
                    position = None

            equity_curve.append(pnl_sum)

        if not trades:
            return {"error": "No trades executed under this strategy."}

        total_pnl = round(pnl_sum, 2)
        num_days = (end_date - start_date).days or 1
        annualized_return = round((total_pnl / num_days) * 252, 2)

        max_drawdown = 0
        peak = equity_curve[0] if equity_curve else 0
        for val in equity_curve:
            if val > peak:
                peak = val
            drawdown = peak - val
            if drawdown > max_drawdown:
                max_drawdown = drawdown

        win_prob = round(wins / len(trades), 2)

        # Build equity curve for chart visualization
        equity_data = []
        pnl_running = 0.0
        last_trade_index = 0

        for (d, close_price) in data:
            # approximate running PnL (cumulative)
            pnl_running = sum(t["pnl"] for t in trades if t["exit_date"] <= d)
            equity_data.append({
                "date": d.isoformat(),
                "price": close_price,          # stock closing price (for optional price line)
                "equity": round(pnl_running, 2)  # cumulative PnL
            })

        return {
            "trades": trades,
            "metrics": {
                "total_pnl": total_pnl,
                "annualized_return": annualized_return,
                "max_drawdown": round(max_drawdown, 2),
                "win_probability": win_prob,
            },
            "equity_curve": equity_data,
        }

    finally:
        session.close()