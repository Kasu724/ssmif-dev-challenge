import pandas as pd

# Threshold Crossing
def threshold_cross_strategy(prices: pd.DataFrame, threshold: float, holding_period: int):
    trades = []
    equity = []
    cumulative_pnl = 0.0

    for i in range(len(prices)):
        price = prices["close"].iloc[i]

        if price > threshold:
            entry_price = price
            exit_index = min(i + holding_period, len(prices) - 1)
            exit_price = prices["close"].iloc[exit_index]
            pnl = exit_price - entry_price

            cumulative_pnl += pnl
            trades.append({
                "entry_date": str(prices.index[i]),
                "exit_date": str(prices.index[exit_index]),
                "entry_price": entry_price,
                "exit_price": exit_price,
                "pnl": pnl
            })

        equity.append({"date": str(prices.index[i]), "price": price, "equity": cumulative_pnl})

    return {"equity_curve": equity, "trades": trades}


# Moving Average Crossover
def moving_average_crossover_strategy(prices: pd.DataFrame, short_window: int, long_window: int):
    df = prices.copy()
    df["SMA_short"] = df["close"].rolling(window=short_window).mean()
    df["SMA_long"] = df["close"].rolling(window=long_window).mean()

    df.dropna(inplace=True)
    position = 0
    entry_price = 0
    trades = []
    equity = []
    cumulative_pnl = 0.0

    for i in range(1, len(df)):
        prev_short = df["SMA_short"].iloc[i - 1]
        prev_long = df["SMA_long"].iloc[i - 1]
        short = df["SMA_short"].iloc[i]
        long = df["SMA_long"].iloc[i]
        price = df["close"].iloc[i]

        # Golden Cross → Buy
        if short > long and prev_short <= prev_long and position == 0:
            position = 1
            entry_price = price

        # Death Cross → Sell
        elif short < long and prev_short >= prev_long and position == 1:
            pnl = price - entry_price
            cumulative_pnl += pnl
            trades.append({
                "entry_date": str(df.index[i - 1]),
                "exit_date": str(df.index[i]),
                "entry_price": entry_price,
                "exit_price": price,
                "pnl": pnl
            })
            position = 0

        equity.append({"date": str(df.index[i]), "price": price, "equity": cumulative_pnl})

    return {"equity_curve": equity, "trades": trades}


# RSI Mean Reversion
def rsi_mean_reversion_strategy(prices: pd.DataFrame, rsi_window: int, buy_threshold: float, sell_threshold: float):
    df = prices.copy()
    delta = df["close"].diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.rolling(window=rsi_window).mean()
    avg_loss = loss.rolling(window=rsi_window).mean()
    rs = avg_gain / avg_loss
    df["RSI"] = 100 - (100 / (1 + rs))
    df.dropna(inplace=True)

    position = 0
    entry_price = 0
    trades = []
    equity = []
    cumulative_pnl = 0.0

    for i in range(len(df)):
        price = df["close"].iloc[i]
        rsi = df["RSI"].iloc[i]

        # Buy signal
        if rsi < buy_threshold and position == 0:
            position = 1
            entry_price = price

        # Sell signal
        elif rsi > sell_threshold and position == 1:
            pnl = price - entry_price
            cumulative_pnl += pnl
            trades.append({
                "entry_date": str(df.index[i - 1]),
                "exit_date": str(df.index[i]),
                "entry_price": entry_price,
                "exit_price": price,
                "pnl": pnl
            })
            position = 0

        equity.append({"date": str(df.index[i]), "price": price, "equity": cumulative_pnl})

    return {"equity_curve": equity, "trades": trades}