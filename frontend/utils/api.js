import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

export async function fetchBacktest(
    symbol,
    threshold,
    holdingPeriod,
    startDate,
    endDate,
    includeTrades = false
) {
    try {
    const params = new URLSearchParams({
        threshold: threshold,
        holding_period: holdingPeriod,
        start_date: startDate,
        end_date: endDate,
        include_trades: includeTrades,
    });
    const url = `${API_BASE_URL}/backtest/${symbol}?${params.toString()}`;

    const response = await axios.get(url);
    return response.data;
    } catch (error) {
    console.error("Error fetching backtest data:", error);
    throw error;
    }
}