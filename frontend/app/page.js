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
  const [symbol, setSymbol] = useState("");
  const [threshold, setThreshold] = useState("");
  const [holdingPeriod, setHoldingPeriod] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const leftPanelRef = useRef(null);
  const containerRef = useRef(null);
  const isDragging = useRef(false);

  const handleMouseDown = (e) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.userSelect = "none"; // disable text selection

    const container = containerRef.current;
    const leftPanel = leftPanelRef.current;
    const startX = e.clientX;
    const startWidth = leftPanel.offsetWidth;

    const handleMouseMove = (eMove) => {
      if (!isDragging.current) return;
      const dx = eMove.clientX - startX;
      const newLeftWidth = ((startWidth + dx) / container.offsetWidth) * 100;
      leftPanel.style.flexBasis = `${Math.min(Math.max(newLeftWidth, 20), 60)}%`;
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = ""; // reset
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleRun = async () => {
    if (!symbol || !threshold || !holdingPeriod || !startDate || !endDate) {
      alert("Please fill out all fields before running the backtest.");
      return;
    }
    setLoading(true);
    try {
      const data = await fetchBacktest(
        symbol,
        Number(threshold),
        Number(holdingPeriod),
        startDate,
        endDate
      );
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

      {/* MAIN LAYOUT CONTAINER */}
      <div
        ref={containerRef}
        className="flex w-full max-w-8xl mx-auto h-[85vh] bg-gray-50 rounded-xl shadow-inner overflow-hidden"
      >
        {/* LEFT PANEL */}
        <div
          ref={leftPanelRef}
          className="flex flex-col justify-center bg-white p-8 rounded-l-2xl shadow-md flex-shrink-0 h-full"
          style={{ flexBasis: "35%" }}
        >
          <div className="flex flex-col justify-center space-y-10">
            {/* STRATEGY SELECTION */}
            <div>
              <label className="block mb-5 text-xl font-semibold text-gray-800">
                Select Strategy
              </label>
              <select
                className="border border-gray-300 rounded p-2 w-full text-gray-800 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                defaultValue="threshold"
              >
                <option value="threshold">Threshold Cross</option>
                <option disabled>Moving Average (coming soon)</option>
                <option disabled>RSI Strategy (coming soon)</option>
              </select>
            </div>

            {/* PARAMETERS */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-5">
                Parameters
              </h2>

              <div className="space-y-5">
                <div className="flex justify-between items-center gap-3">
                  <span className="w-32 font-medium text-gray-800">Symbol:</span>
                  <input
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    placeholder="e.g. AAPL"
                    className="border border-gray-300 p-2 rounded flex-1 text-gray-800 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  />
                </div>

                <div className="flex justify-between items-center gap-3">
                  <span className="w-32 font-medium text-gray-800">Threshold:</span>
                  <input
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    placeholder="e.g. 180"
                    className="border border-gray-300 p-2 rounded flex-1 text-gray-800 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  />
                </div>

                <div className="flex justify-between items-center gap-3">
                  <span className="w-32 font-medium text-gray-800">Hold Days:</span>
                  <input
                    type="number"
                    value={holdingPeriod}
                    onChange={(e) => setHoldingPeriod(e.target.value)}
                    placeholder="e.g. 5"
                    className="border border-gray-300 p-2 rounded flex-1 text-gray-800 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  />
                </div>

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
                <div className="bg-gray-100 rounded-lg p-6 shadow-inner text-center border border-gray-200 w-[450px]">
                  <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                    Performance Summary
                  </h3>
                  {result.performance_summary ? (
                    <ul className="grid grid-cols-2 gap-x-12 gap-y-2 text-gray-700">
                      {Object.entries(result.performance_summary).map(([key, value]) => (
                        <li key={key} className="flex justify-between text-m">
                          <span>{key}</span>
                          <span className="font-medium text-gray-900">{value}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-400 italic">No statistics yet.</p>
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