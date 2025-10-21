"use client";
import { useState, useRef } from "react";
import { fetchBacktest } from "../utils/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function Home() {
  // Shared states
  const [strategy, setStrategy] = useState("threshold_cross");
  const [symbol, setSymbol] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Strategy-specific params
  const [threshold, setThreshold] = useState("");
  const [holdingPeriod, setHoldingPeriod] = useState("");
  const [shortWindow, setShortWindow] = useState("");
  const [longWindow, setLongWindow] = useState("");
  const [rsiWindow, setRsiWindow] = useState("");
  const [buyThreshold, setBuyThreshold] = useState("");
  const [sellThreshold, setSellThreshold] = useState("");

  // Refs for resizing panels
  const leftPanelRef = useRef(null);
  const containerRef = useRef(null);
  const isDragging = useRef(false);

  const handleMouseDown = (e) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.userSelect = "none";

    const container = containerRef.current;
    const leftPanel = leftPanelRef.current;
    const startX = e.clientX;
    const startWidth = leftPanel.offsetWidth;

    const handleMouseMove = (eMove) => {
      if (!isDragging.current) return;
      const dx = eMove.clientX - startX;
      const newLeftWidth = ((startWidth + dx) / container.offsetWidth) * 100;
      leftPanel.style.flexBasis = `${Math.min(Math.max(newLeftWidth, 30), 70)}%`;
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Handle running a backtest
  const handleRun = async () => {
    if (!symbol || !startDate || !endDate) {
      alert("Please fill out all required fields.");
      return;
    }

    setLoading(true);
    try {
      const params = { strategy, start_date: startDate, end_date: endDate };

      if (strategy === "threshold_cross") {
        if (!threshold || !holdingPeriod) {
          alert("Please fill out Threshold Cross parameters.");
          setLoading(false);
          return;
        }
        Object.assign(params, { threshold, holding_period: holdingPeriod });
      } else if (strategy === "moving_average") {
        if (!shortWindow || !longWindow) {
          alert("Please fill out both moving average windows.");
          setLoading(false);
          return;
        }
        Object.assign(params, { short_window: shortWindow, long_window: longWindow });
      } else if (strategy === "rsi_mean_reversion") {
        if (!rsiWindow || !buyThreshold || !sellThreshold) {
          alert("Please fill out all RSI parameters.");
          setLoading(false);
          return;
        }
        Object.assign(params, {
          rsi_window: rsiWindow,
          buy_threshold: buyThreshold,
          sell_threshold: sellThreshold,
        });
      }

      const data = await fetchBacktest(symbol, params);
      setResult(data);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch data. Check the backend.");
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-200 p-6 text-gray-800">
      <h1 className="text-3xl font-bold text-center mb-5 text-black">
        SSMIF Backtester
      </h1>

      {/* MAIN CONTAINER */}
      <div
        ref={containerRef}
        className="flex w-full max-w-8xl mx-auto h-[85vh] bg-gray-50 rounded-xl shadow-inner overflow-hidden"
      >
        {/* LEFT PANEL */}
        <div
          ref={leftPanelRef}
          className="flex flex-col bg-white p-8 rounded-l-2xl shadow-md flex-shrink-0 h-full overflow-y-auto"
          style={{ flexBasis: "35%" }}
        >
          <div className="flex flex-col space-y-7">
            {/* STRATEGY DROPDOWN */}
            <div>
              <label className="block mb-3 text-xl font-semibold text-gray-800">
                Select Strategy
              </label>

              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="border border-gray-300 rounded p-2 w-full text-gray-800 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              >
                <option value="threshold_cross">Threshold Cross</option>
                <option value="moving_average">Moving Average Crossover</option>
                <option value="rsi_mean_reversion">RSI Mean Reversion</option>
              </select>

              {/* STRATEGY DESCRIPTION */}
              <div className="mt-3 bg-gray-100 border border-gray-200 rounded-md p-3 shadow-inner">
                {strategy === "threshold_cross" && (
                  <div className="text-sm text-gray-700 leading-snug space-y-2">
                    <p>
                      <strong>Threshold Cross:</strong> Buys when the price exceeds a fixed
                      threshold and holds the position for a set number of days.
                    </p>
                    <ul className="list-disc ml-5 mt-2 space-y-1">
                      <li>
                        <strong>Threshold:</strong> The price level that triggers a buy
                        signal (e.g., 180).
                      </li>
                      <li>
                        <strong>Hold Days:</strong> How long to hold the position before
                        selling (e.g., 5).
                      </li>
                    </ul>
                  </div>
                )}

                {strategy === "moving_average" && (
                  <div className="text-sm text-gray-700 leading-snug space-y-2">
                    <p>
                      <strong>Moving Average Crossover:</strong> Buys when a short-term
                      moving average crosses above a long-term moving average
                      ("Golden Cross") and sells when it crosses below ("Death Cross").
                    </p>
                    <ul className="list-disc ml-5 mt-2 space-y-1">
                      <li>
                        <strong>Short MA:</strong> Number of days for the short-term moving
                        average (e.g., 20).
                      </li>
                      <li>
                        <strong>Long MA:</strong> Number of days for the long-term moving
                        average (e.g., 50).
                      </li>
                    </ul>
                  </div>
                )}

                {strategy === "rsi_mean_reversion" && (
                  <div className="text-sm text-gray-700 leading-snug space-y-2">
                    <p>
                      <strong> Relative Strength Index (RSI) Mean Reversion:</strong> Buys when the RSI falls below a
                      "oversold" level (e.g., 30) and sells when RSI rises above an
                      "overbought" level (e.g., 70).
                    </p>
                    <ul className="list-disc ml-5 mt-2 space-y-1">
                      <li>
                        <strong>RSI Window:</strong> The number of periods used to compute
                        RSI (commonly 14).
                      </li>
                      <li>
                        <strong>Buy Threshold:</strong> RSI level that triggers a buy
                        (typically below 30).
                      </li>
                      <li>
                        <strong>Sell Threshold:</strong> RSI level that triggers a sell
                        (typically above 70).
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* PARAMETERS */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">
                Parameters
              </h2>

              {strategy === "threshold_cross" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center gap-3">
                    <span className="w-32 font-medium text-gray-800">Symbol:</span>
                    <input
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                      placeholder="e.g. AAPL"
                      className="border border-gray-300 p-2 rounded flex-1 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-between items-center gap-3">
                    <span className="w-32 font-medium text-gray-800">Threshold:</span>
                    <input
                      type="number"
                      value={threshold}
                      onChange={(e) => setThreshold(e.target.value)}
                      placeholder="e.g. 180"
                      className="border border-gray-300 p-2 rounded flex-1 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-between items-center gap-3">
                    <span className="w-32 font-medium text-gray-800">Hold Days:</span>
                    <input
                      type="number"
                      value={holdingPeriod}
                      onChange={(e) => setHoldingPeriod(e.target.value)}
                      placeholder="e.g. 5"
                      className="border border-gray-300 p-2 rounded flex-1 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {strategy === "moving_average" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center gap-3">
                    <span className="w-32 font-medium text-gray-800">Symbol:</span>
                    <input
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                      placeholder="e.g. AAPL"
                      className="border border-gray-300 p-2 rounded flex-1 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-between items-center gap-3">
                    <span className="w-32 font-medium text-gray-800">Short MA:</span>
                    <input
                      type="number"
                      value={shortWindow}
                      onChange={(e) => setShortWindow(e.target.value)}
                      placeholder="e.g. 20"
                      className="border border-gray-300 p-2 rounded flex-1 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-between items-center gap-3">
                    <span className="w-32 font-medium text-gray-800">Long MA:</span>
                    <input
                      type="number"
                      value={longWindow}
                      onChange={(e) => setLongWindow(e.target.value)}
                      placeholder="e.g. 50"
                      className="border border-gray-300 p-2 rounded flex-1 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {strategy === "rsi_mean_reversion" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center gap-3">
                    <span className="w-32 font-medium text-gray-800">Symbol:</span>
                    <input
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                      placeholder="e.g. AAPL"
                      className="border border-gray-300 p-2 rounded flex-1 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-between items-center gap-3">
                    <span className="w-32 font-medium text-gray-800">RSI Window:</span>
                    <input
                      type="number"
                      value={rsiWindow}
                      onChange={(e) => setRsiWindow(e.target.value)}
                      placeholder="e.g. 14"
                      className="border border-gray-300 p-2 rounded flex-1 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-between items-center gap-3">
                    <span className="w-32 font-medium text-gray-800">Buy Threshold:</span>
                    <input
                      type="number"
                      value={buyThreshold}
                      onChange={(e) => setBuyThreshold(e.target.value)}
                      placeholder="e.g. 30"
                      className="border border-gray-300 p-2 rounded flex-1 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-between items-center gap-3">
                    <span className="w-32 font-medium text-gray-800">Sell Threshold:</span>
                    <input
                      type="number"
                      value={sellThreshold}
                      onChange={(e) => setSellThreshold(e.target.value)}
                      placeholder="e.g. 70"
                      className="border border-gray-300 p-2 rounded flex-1 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* DATE RANGE */}
            <div className="flex justify-between items-center gap-3">
              <span className="w-32 font-medium text-gray-800">Date Range:</span>
              <div className="flex gap-2 flex-1 items-center">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border border-gray-300 p-2 rounded w-full focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  style={{ color: startDate ? "#111827" : "#9ca3af" }}
                />
                <span className="text-gray-800">–</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border border-gray-300 p-2 rounded w-full focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  style={{ color: endDate ? "#111827" : "#9ca3af" }}
                />
              </div>
            </div>

            {/* RUN BUTTON */}
            <button
              onClick={handleRun}
              disabled={loading}
              className="bg-blue-600 text-white text-lg px-4 py-2 rounded hover:bg-blue-700 transition w-full font-semibold"
            >
              {loading ? "Running..." : "Run Backtest"}
            </button>
          </div>
        </div>

        {/* RESIZER HANDLE */}
        <div
          onMouseDown={handleMouseDown}
          className="w-2 cursor-col-resize bg-gray-300 hover:bg-gray-400 transition"
        />

        {/* RIGHT PANEL */}
        <div className="flex-1 bg-white p-8 rounded-r-xl shadow-md overflow-y-auto flex flex-col">
          {result && result.equity_curve ? (
            <>
              <h2 className="text-2xl font-semibold mb-4 text-center">
                {result.symbol} Performance
              </h2>

              {/* GRAPH CONTAINER */}
              <div className="flex-shrink-0">
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart
                    data={result.equity_curve}
                    margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.75} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 15, fontWeight: 750, fill: "#1F2937" }}
                      tickFormatter={(str) => str.slice(0)}
                      interval="preserveStartEnd"
                      angle={-35}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 15, fontWeight: 750, fill: "#2563eb" }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 15, fontWeight: 750, fill: "#16a34a" }}
                    />
                    <Tooltip
                      formatter={(value, name) => [`$${value}`, name]}
                      labelFormatter={(label) => `Date: ${label}`}
                      contentStyle={{
                        borderRadius: "8px",
                        color: "#f9fafb",
                      }}
                      labelStyle={{ color: "#1F2937" }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      wrapperStyle={{ fontSize: "18px", fontWeight: 200 }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="price"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={false}
                      name="Price"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="equity"
                      stroke="#16a34a"
                      strokeWidth={2}
                      dot={false}
                      name="Cumulative PnL"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* OTHER STATISTICS */}
              <div className="mt-8 flex justify-center flex-shrink-0">
                <div className="bg-gray-100 rounded-lg p-6 shadow-inner text-center border border-gray-200 w-2xl">
                  <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                    Performance Summary
                  </h3>

                  {result.performance_summary ? (
                    <ul className="grid grid-cols-2 gap-x-12 gap-y-2 text-gray-700 mb-6">
                      {Object.entries(result.performance_summary).map(([key, value]) => {
                        const tooltips = {
                          "Total PnL": [
                            "Total profit or loss over the entire backtest period",
                            "Sum of all individual trade PnLs",
                          ],
                          "Annualized Return": [
                            "Compound annual growth rate based on total portfolio value.",
                            "Formula: ((Final / Initial) ^ (252 / N)) − 1",
                          ],
                          "Max Drawdown": [
                            "Largest drop from a peak to a trough in cumulative PnL",
                            "Maximum risk exposure or loss from the highest point",
                          ],
                          "Win Probability": [
                            "Percentage of profitable trades",
                            "(Winning Trades / Total Trades) × 100%",
                          ],
                        };

                        const tooltip = tooltips[key] || ["No description available."];

                        return (
                          <li key={key} className="flex justify-between text-m relative group">
                            {/* Tooltip trigger */}
                            <span className="font-medium text-gray-800 cursor-help relative">
                              {key}

                              {/* Tooltip bubble */}
                              <div className="absolute z-10 hidden group-hover:block w-50 bg-gray-800 text-gray-100 text-xs rounded-md p-2 left-1/2 -translate-x-1/2 bottom-full mb-2 shadow-lg whitespace-pre-line">
                                {tooltip.map((line, i) => (
                                  <p key={i} className="text-gray-100 leading-snug">
                                    {line}
                                  </p>
                                ))}

                                {/* Tooltip arrow */}
                                <div className="absolute left-1/2 top-full -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
                              </div>
                            </span>

                            {/* Value */}
                            <span className="font-semibold text-gray-900">{value}</span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-gray-400 italic mb-6">No statistics yet.</p>
                  )}

                  {/* TRADE LOG */}
                  {result.trades && result.trades.length > 0 ? (
                    <>
                      <h4 className="text-2xl font-semibold text-gray-800 mb-4">
                        Trade History
                      </h4>
                      <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-lg">
                        <table className="min-w-full text-sm text-gray-700">
                          <thead className="bg-gray-200 sticky top-0">
                            <tr>
                              <th className="py-2 px-3">Entry Date</th>
                              <th className="py-2 px-3">Exit Date</th>
                              <th className="py-2 px-3">Entry Price</th>
                              <th className="py-2 px-3">Exit Price</th>
                              <th className="py-2 px-3">PnL ($)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.trades.map((trade, index) => (
                              <tr
                                key={index}
                                className="even:bg-gray-50 hover:bg-gray-100 transition"
                              >
                                <td className="py-2 px-3">{trade.entry_date}</td>
                                <td className="py-2 px-3">{trade.exit_date}</td>
                                <td className="py-2 px-3">
                                  {trade.entry_price.toFixed(2)}
                                </td>
                                <td className="py-2 px-3">
                                  {trade.exit_price.toFixed(2)}
                                </td>
                                <td
                                  className={`py-2 px-3 font-semibold ${
                                    trade.pnl >= 0 ? "text-green-600" : "text-red-600"
                                  }`}
                                >
                                  {trade.pnl.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-400 italic">No trades executed.</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="text-center text-gray-400 italic mt-40">
              Run a backtest to view the chart.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}