import React, { useEffect, useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Loader2, AlertCircle, MapPin, BarChart2 } from "lucide-react";
import clsx from "clsx";
import indiaDistricts from "../data/indiaDistricts.json";

// Utility: generate simulated history
const generateSimulatedHistory = (basePrice, seed = 1) => {
  const data = [];
  let price = basePrice;
  let random = seed;

  const seededRandom = () => {
    random = (random * 9301 + 49297) % 233280;
    return random / 233280;
  };

  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const fluctuation = (seededRandom() - 0.5) * (basePrice * 0.1);
    price = Math.max(basePrice * 0.8, price + fluctuation);
    data.push({
      date: date.toISOString().split("T")[0],
      price: Math.round(price),
    });
  }
  return data;
};

// --- UI Sub-Components for a Cleaner Interface ---

const CropCard = ({ crop, isSelected, onClick }) => (
  <div
    role="button"
    tabIndex="0"
    onClick={onClick}
    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
    className={clsx(
      "p-4 rounded-xl border-2 transition-all duration-300 ease-in-out cursor-pointer shadow-sm hover:shadow-md hover:border-green-500 hover:scale-[1.02]",
      {
        "bg-green-50 dark:bg-green-900/40 border-green-500 dark:border-green-600 scale-[1.01]":
          isSelected,
        "bg-white dark:bg-gray-800 border-transparent": !isSelected,
      }
    )}
  >
    <div className="flex justify-between items-center">
      <div>
        <h3 className="text-lg font-bold truncate text-gray-900 dark:text-gray-100">
          {crop.commodity}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-1">
          <MapPin size={12} /> {crop.market}
        </p>
      </div>
      <div className="text-right flex-shrink-0 ml-2">
        <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
          ₹{crop.modal_price}
        </p>
      </div>
    </div>
  </div>
);

const ChartPlaceholder = ({ title, message }) => (
  <div className="flex flex-col justify-center items-center h-full text-center p-4">
    <div className="p-4 bg-slate-100 dark:bg-gray-800 rounded-full mb-4">
      <BarChart2 className="text-slate-500 dark:text-gray-400" size={40} />
    </div>
    <p className="text-xl font-semibold text-gray-700 dark:text-gray-200">
      {title}
    </p>
    <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm">
      {message}
    </p>
  </div>
);

// --- Main Component ---

export default function MarketInsights() {
  const [marketData, setMarketData] = useState([]);
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [sortType, setSortType] = useState("price_desc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch Market Data
  useEffect(() => {
    if (!selectedState) return;

    const fetchMarketData = async () => {
      setLoading(true);
      setError(null);
      const apiKey =
        "579b464db66ec23bdd000001a01bd4f6a7ee42406f291a4a3b3e5726";
      let url = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${apiKey}&format=json&limit=500&filters[state]=${encodeURIComponent(
        selectedState
      )}`;
      if (selectedDistrict) {
        url += `&filters[district]=${encodeURIComponent(selectedDistrict)}`;
      }

      try {
        const response = await fetch(url);
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        const processedData = data.records
          .map((item) => ({
            ...item,
            modal_price: parseInt(item.modal_price, 10),
          }))
          .filter(
            (item) => !isNaN(item.modal_price) && item.modal_price > 0
          );
        setMarketData(processedData);
      } catch (e) {
        setError(
          "⚠️ Failed to fetch market data. Please check your network or API key."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchMarketData();
  }, [selectedState, selectedDistrict]);

  // Process & Sort Data
  const processedAndSortedData = useMemo(() => {
    if (!marketData.length) return [];
    
    const uniqueCommodities = [
      ...new Map(marketData.map((item) => [item.commodity, item])).values(),
    ];

    return uniqueCommodities.sort((a, b) => {
      switch (sortType) {
        case "price_asc":
          return a.modal_price - b.modal_price;
        case "name_asc":
          return a.commodity.localeCompare(b.commodity);
        case "name_desc":
          return b.commodity.localeCompare(a.commodity);
        case "price_desc":
        default:
          return b.modal_price - a.modal_price;
      }
    });
  }, [marketData, sortType]);

  const handleCropClick = (crop) => {
    setSelectedCrop(crop);
    
    const history = generateSimulatedHistory(
      crop.modal_price,
      (crop.commodity + crop.market).length
    );

    // This ensures the chart's last data point always matches the real price
    if (history.length > 0) {
      history[history.length - 1].price = crop.modal_price;
    }

    setHistoricalData(history);
  };

  const dropdownClass =
    "w-full md:w-auto py-2 px-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto bg-white dark:bg-gray-950/50 rounded-2xl shadow-lg p-6 md:p-8">
        {/* Header & Filters */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8 border-b border-gray-200 dark:border-gray-800 pb-6">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
            Market Insights
          </h1>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* State Dropdown */}
            <select
              aria-label="Select State"
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedDistrict("");
                setSelectedCrop(null);
              }}
              className={dropdownClass}
            >
              <option value="">Select State</option>
              {Object.keys(indiaDistricts).map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>

            {/* District Dropdown */}
            {selectedState && (
              <select
                aria-label="Select District"
                value={selectedDistrict}
                onChange={(e) => {
                  setSelectedDistrict(e.target.value);
                  setSelectedCrop(null);
                }}
                className={dropdownClass}
              >
                <option value="">All Districts</option>
                {indiaDistricts[selectedState].map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            )}

            {/* Sorting */}
            <select
              aria-label="Sort Options"
              value={sortType}
              onChange={(e) => setSortType(e.target.value)}
              className={dropdownClass}
            >
              <option value="price_desc">Sort: Price High-Low</option>
              <option value="price_asc">Sort: Price Low-High</option>
              <option value="name_asc">Sort: Name A-Z</option>
              <option value="name_desc">Sort: Name Z-A</option>
            </select>
          </div>
        </header>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-20 text-gray-600 dark:text-gray-300">
            <Loader2 className="animate-spin mr-2" /> Loading Market Data...
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-300 p-4 rounded-lg shadow-md mb-6">
            <AlertCircle /> {error}
          </div>
        )}

        {/* Main Content Grid */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-3 h-[70vh] overflow-y-auto pr-3 -mr-3">
            {!loading && !error && (
              <>
                {processedAndSortedData.length > 0 ? (
                  processedAndSortedData.map((crop) => (
                    <CropCard
                      key={`${crop.market}-${crop.commodity}`}
                      crop={crop}
                      isSelected={
                        selectedCrop?.commodity === crop.commodity &&
                        selectedCrop?.market === crop.market
                      }
                      onClick={() => handleCropClick(crop)}
                    />
                  ))
                ) : (
                  <div className="text-center pt-16">
                    <p className="font-semibold text-gray-700 dark:text-gray-300">
                      {selectedState ? "No Data Found" : "Select a Location"}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {selectedState
                        ? `No commodities found for ${
                            selectedDistrict || selectedState
                          }.`
                        : "Please select a state to begin."}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Chart Area */}
          <div className="lg:col-span-8 bg-slate-50 dark:bg-gray-900 p-4 sm:p-6 rounded-2xl min-h-[500px] flex items-center justify-center transition-all duration-300">
            {selectedCrop ? (
              <div className="w-full animate-fade-in">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                  Price Trend: {selectedCrop.commodity}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Simulated 30-day history for{" "}
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {selectedCrop.market}
                  </span>
                </p>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={historicalData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} className="dark:stroke-gray-700 stroke-gray-300" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} className="dark:fill-gray-400 fill-gray-600" dy={10} />
                    <YAxis
                      domain={["dataMin - 100", "dataMax + 100"]}
                      tickFormatter={(value) => `₹${value}`}
                      tick={{ fontSize: 12 }}
                      className="dark:fill-gray-400 fill-gray-600"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.8)",
                        backdropFilter: "blur(4px)",
                        borderRadius: "12px",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                      }}
                      formatter={(value, name) => [`₹${value.toFixed(2)}`, "Price"]}
                      cursor={{ stroke: "#16a34a", strokeWidth: 1, strokeDasharray: "3 3" }}
                    />
                    <Line type="monotone" dataKey="price" stroke="#16a34a" strokeWidth={2.5} dot={false} activeDot={{ r: 6, strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <ChartPlaceholder
                title={!selectedState ? "Welcome to Market Insights" : "Select a Crop"}
                message={!selectedState ? "Start by choosing a state to see live agricultural commodity prices." : "Click on a crop from the list to view its detailed 30-day price trend."}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}