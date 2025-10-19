import axios from "axios";
const API_BASE_URL = "http://127.0.0.1:8000";

export async function fetchBacktest(symbol, params) {
  try {
    const query = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/backtest/${symbol}?${query}`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error("Error fetching backtest data:", error);
    throw error;
  }
}