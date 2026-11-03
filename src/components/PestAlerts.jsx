import React, { useState } from "react";
import { Bug } from "lucide-react";
import { pestData } from "../data/pestdata";

export default function PestAlerts() {
  const [selectedCategory, setSelectedCategory] = useState("Cereals");
  const [selectedCrop, setSelectedCrop] = useState(
    Object.keys(pestData["Cereals"])[0]
  );
  const [searchTerm, setSearchTerm] = useState("");

  const categories = Object.keys(pestData);
  const crops = Object.keys(pestData[selectedCategory]);

  const getSeverityStyles = (severity) => { 
    switch (severity) {
      case "High":
        return "bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-600 text-red-800 dark:text-red-300";
      case "Medium":
        return "bg-yellow-50 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-600 text-yellow-800 dark:text-yellow-300";
      case "Low":
        return "bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-600 text-green-800 dark:text-green-300";
      default:
        return "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200";
    }
  };

  const highlightText = (text) => {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, "gi");
    return text.split(regex).map((part, i) =>
      regex.test(part) ? (
        <span
          key={i}
          className="bg-green-200 dark:bg-green-600/60 px-0.5 rounded"
        >
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  const filteredPests = pestData[selectedCategory][selectedCrop].filter(
    (p) =>
      p.pest.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.symptoms.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen px-6 py-10 bg-gradient-to-b from-green-50 via-white to-green-50 dark:from-green-950 dark:via-green-900 dark:to-green-950 rounded-xl">
      <div className="bg-green-100 dark:bg-green-900/80 p-8 rounded-2xl shadow-lg border border-green-200 dark:border-green-700">
        {/* Header */}
        <h1 className="text-3xl font-extrabold flex items-center gap-3 mb-8 text-green-900 dark:text-green-100">
          <Bug className="w-8 h-8 text-green-600 dark:text-green-400" />
          Pest & Disease Alerts
        </h1>

        {/* Filters */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {/* Category Selector */}
          <div>
            <label className="block mb-2 font-semibold text-green-900 dark:text-green-200">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                const category = e.target.value;
                setSelectedCategory(category);
                setSelectedCrop(Object.keys(pestData[category])[0]);
                setSearchTerm("");
              }}
              className="w-full py-2 px-3 rounded-lg border border-green-300 dark:border-green-600 bg-white dark:bg-green-800 text-green-900 dark:text-green-100 focus:ring-2 focus:ring-green-400 transition"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Crop Selector */}
          <div>
            <label className="block mb-2 font-semibold text-green-900 dark:text-green-200">
              Crop
            </label>
            <select
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              className="w-full py-2 px-3 rounded-lg border border-green-300 dark:border-green-600 bg-white dark:bg-green-800 text-green-900 dark:text-green-100 focus:ring-2 focus:ring-green-400 transition"
            >
              {crops.map((crop) => (
                <option key={crop} value={crop}>
                  {crop}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block mb-2 font-semibold text-green-900 dark:text-green-200">
              Search Pest / Symptoms
            </label>
            <input
              type="text"
              placeholder="Type to search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full py-2 px-3 rounded-lg border border-green-300 dark:border-green-600 bg-white dark:bg-green-800 text-green-900 dark:text-green-100 focus:ring-2 focus:ring-green-400 transition"
            />
          </div>
        </div>

        {/* Pest Alerts */}
        <div className="space-y-5">
          {filteredPests.length > 0 ? (
            filteredPests.map((p, i) => (
              <div
                key={i}
                className={`border rounded-xl p-5 shadow-sm hover:shadow-md transition ${getSeverityStyles(
                  p.severity
                )}`}
              >
                <h2 className="text-lg font-bold mb-2">
                  🐛 {highlightText(p.pest)}
                </h2>
                <p className="text-sm mb-1">
                  <span className="font-semibold">Symptoms:</span>{" "}
                  {highlightText(p.symptoms)}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Control:</span> {p.control}
                </p>
              </div>
            ))
          ) : (
            <p className="text-center text-green-900 dark:text-green-200 py-10">
              No pests found for this crop.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
