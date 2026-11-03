// 🌾 CommandAreaDashboard.jsx — Raitumitra Canal Command Planning Platform
import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Circle, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend as RechartsLegend
} from "recharts";
import {
  Globe,
  Droplet,
  Sun,
  AlertTriangle,
  Loader2,
  TrendingUp,
  MapPin,
  List,
  Layers,
  FileText,
  Workflow
} from "lucide-react";

/* 🧭 Auto-focus Map to Monitored Fields */
function MapCommandFocus({ data }) {
  const map = useMap();
  useEffect(() => {
    if (data && data.distributaries) {
      const allFields = data.distributaries.flatMap(d => d.fields);
      if (allFields.length > 0) {
        const lats = allFields.map(f => f.lat);
        const lngs = allFields.map(f => f.lng);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        
        map.fitBounds([
          [minLat - 0.01, minLng - 0.01],
          [maxLat + 0.01, maxLng + 0.01]
        ]);
      }
    }
  }, [data, map]);
  return null;
}

export default function CommandAreaDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedDist, setSelectedDist] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [activeLayer, setActiveLayer] = useState("stress"); // 'crop' | 'stress' | 'deficit'

  useEffect(() => {
    fetchCommandData();
  }, [selectedDate]);

  const fetchCommandData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:8000/satellite/command-area?date=${selectedDate}`);
      setData(res.data);
      if (res.data.distributaries && res.data.distributaries.length > 0) {
        setSelectedDist(res.data.distributaries[0]);
      }
    } catch (err) {
      console.error("Command area API error:", err);
      toast.error("Failed to load command area data. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-500">
        <Loader2 className="animate-spin text-indigo-600 mb-3" size={36} />
        <p className="font-semibold">Loading Canal Command Planning Platform...</p>
      </div>
    );
  }

  // Mappings
  const getCropColor = (crop) => {
    const colors = {
      Rice: "#10b981",
      Wheat: "#f59e0b",
      Cotton: "#06b6d4",
      Maize: "#eab308",
      Sugarcane: "#8b5cf6",
      Fallow: "#6b7280"
    };
    return colors[crop] || "#6b7280";
  };

  const getStressColor = (level) => {
    const colors = {
      "Severe Stress": "#ef4444",
      "Moderate Stress": "#f97316",
      "Mild Stress": "#eab308",
      "Optimal": "#22c55e"
    };
    return colors[level] || "#22c55e";
  };

  const getDeficitColor = (deficit) => {
    if (deficit > 35) return "#ef4444";
    if (deficit > 15) return "#f97316";
    if (deficit > 0) return "#eab308";
    return "#22c55e";
  };

  const getAdvisoryColor = (color) => {
    const colors = {
      red: "#ef4444",
      yellow: "#eab308",
      green: "#22c55e"
    };
    return colors[color] || "#22c55e";
  };

  // Coordinates of main canals for polyline draw
  const getCanalLine = (distId) => {
    if (!data) return [];
    const dist = data.distributaries.find(d => d.id === distId);
    if (!dist) return [];
    
    // Sort fields roughly by lng to trace a simulated branch canal line
    const sortedFields = [...dist.fields].sort((a, b) => a.lng - b.lng);
    return sortedFields.map(f => [f.lat, f.lng]);
  };

  // Compile data for Recharts comparison
  const barChartData = data?.distributaries.map(d => ({
    name: d.id,
    "Crop Stress Avg": d.avg_stress,
    "Water Demand (k m³)": Math.round(d.total_demand_m3 / 1000)
  })) || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0b0b0f] text-gray-900 dark:text-gray-100 p-6 transition-colors duration-300">
      <Toaster position="bottom-right" />

      <div className="max-w-7xl mx-auto space-y-6">

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-white/10 pb-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent flex items-center gap-2">
              <Workflow className="w-8 h-8 text-indigo-500 animate-spin-slow" /> Canal Command Planning Dashboard
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Command-area water resource planning, regional stress monitoring, and canal gate release advisories.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border rounded-xl shadow-sm text-sm focus:ring-2 focus:ring-indigo-500 outline-none border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1a1525]"
            />
            <button
              onClick={() => toast.success("Command reports exported as PDF! (Simulation)")}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-500/20"
            >
              <FileText size={16} /> Export Report
            </button>
          </div>
        </div>

        {/* Top Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Command Area", val: `${data?.total_monitored_ha} Hectares`, icon: <TrendingUp className="text-emerald-500" /> },
            { label: "Overall Deficit Volume", val: `${data?.overall_deficit_m3.toLocaleString()} m³`, icon: <Droplet className="text-indigo-500" /> },
            { label: "Rainfall (8d)", val: `${data?.rain_8day_mm} mm`, icon: <Droplet className="text-cyan-500" /> },
            { label: "Monitored Distributors", val: "3 Active Branches", icon: <Layers className="text-amber-500" /> }
          ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-[#120f1d] p-4 rounded-xl shadow border border-gray-200 dark:border-white/5 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-gray-100 dark:bg-white/5">{stat.icon}</div>
              <div>
                <div className="text-[10px] text-gray-500 font-semibold uppercase">{stat.label}</div>
                <div className="text-lg font-bold">{stat.val}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left panel: Distributaries & Advisories */}
          <div className="lg:col-span-5 space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-1.5">
              <List size={20} className="text-indigo-500" /> Branch Canal Advisories
            </h2>

            {data?.distributaries.map((dist) => {
              const isSelected = selectedDist && selectedDist.id === dist.id;
              return (
                <div
                  key={dist.id}
                  onClick={() => setSelectedDist(dist)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 shadow-md flex flex-col justify-between ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-400/40"
                      : "border-gray-200 dark:border-white/5 bg-white dark:bg-[#120f1d] hover:border-indigo-400"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-base text-gray-800 dark:text-white">{dist.name}</h3>
                      <div className="text-xs text-gray-500 mt-0.5">ID: {dist.id} | serving {dist.fields.length} test zones</div>
                    </div>
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: getAdvisoryColor(dist.color) }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4 text-xs font-semibold">
                    <div className="bg-gray-100/50 dark:bg-white/[0.02] p-2 rounded-lg">
                      <span className="block text-[9px] text-gray-500 uppercase">Avg Moisture Stress</span>
                      <span className="text-sm font-extrabold text-gray-700 dark:text-gray-300">
                        {dist.avg_stress}/100
                      </span>
                    </div>
                    <div className="bg-gray-100/50 dark:bg-white/[0.02] p-2 rounded-lg">
                      <span className="block text-[9px] text-gray-500 uppercase">Water Needed</span>
                      <span className="text-sm font-extrabold text-gray-700 dark:text-gray-300">
                        {dist.total_demand_m3.toLocaleString()} m³
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 text-xs bg-gray-100 dark:bg-white/5 p-2 rounded-lg flex items-center justify-between">
                    <span className="text-gray-500">Gate Release Advisory:</span>
                    <span className="font-bold uppercase" style={{ color: getAdvisoryColor(dist.color) }}>
                      {dist.recommendation}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Recharts comparison bar chart */}
            <div className="bg-white dark:bg-[#120f1d] border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">Branch Canal Comparison</h3>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={barChartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <RechartsLegend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="Crop Stress Avg" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Water Demand (k m³)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Right panel: Command Map */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Visual layers tabs */}
            <div className="flex bg-white dark:bg-[#120f1d] p-1 rounded-xl shadow border border-gray-200 dark:border-white/5 justify-between">
              {[
                { id: "stress", name: "💦 Crop Stress" },
                { id: "crop", name: "🌾 Crop Class" },
                { id: "deficit", name: "🌡️ Water Deficit" }
              ].map(layer => (
                <button
                  key={layer.id}
                  onClick={() => setActiveLayer(layer.id)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                    activeLayer === layer.id
                      ? "bg-indigo-600 text-white shadow"
                      : "text-gray-600 hover:text-indigo-500 dark:text-gray-300 dark:hover:text-indigo-400"
                  }`}
                >
                  {layer.name}
                </button>
              ))}
            </div>

            {/* Map Container */}
            <div className="relative rounded-2xl overflow-hidden shadow-xl border border-gray-200 dark:border-white/10 h-[480px] bg-white dark:bg-[#120f1d]">
              <MapContainer
                center={[17.63, 78.09]}
                zoom={12}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  attribution="© Esri, Earthstar Geographics"
                />

                {/* Draw all distributaries fields */}
                {data?.distributaries.map((dist) => {
                  const isSelected = selectedDist && selectedDist.id === dist.id;
                  const canalColor = getAdvisoryColor(dist.color);
                  
                  return (
                    <React.Fragment key={dist.id}>
                      {/* Draw simulated canal route line */}
                      {isSelected && (
                        <Polyline
                          positions={getCanalLine(dist.id)}
                          pathOptions={{
                            color: "#3b82f6",
                            weight: 4,
                            dashArray: "6, 8"
                          }}
                        />
                      )}

                      {/* Draw fields of this canal */}
                      {dist.fields.map((field) => {
                        let fillVal = "#fff";
                        if (activeLayer === "crop") {
                          fillVal = getCropColor(field.crop);
                        } else if (activeLayer === "stress") {
                          fillVal = getStressColor(field.stress_level);
                        } else if (activeLayer === "deficit") {
                          fillVal = getDeficitColor(field.deficit_mm);
                        }

                        return (
                          <Circle
                            key={field.id}
                            center={[field.lat, field.lng]}
                            radius={220} // ~hectare scale circle
                            pathOptions={{
                              color: isSelected ? "#3b82f6" : "#ffffff",
                              weight: isSelected ? 2 : 0.5,
                              fillColor: fillVal,
                              fillOpacity: 0.75
                            }}
                            eventHandlers={{
                              click: () => {
                                setSelectedDist(dist);
                                toast(`Field #${field.id}: ${field.crop} | Stress: ${field.stress_score}% | Deficit: ${field.deficit_mm}mm`);
                              }
                            }}
                          />
                        );
                      })}
                    </React.Fragment>
                  );
                })}

                <MapCommandFocus data={data} />
              </MapContainer>

              {/* Map Floating Legend */}
              <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-[#120f1dc0] backdrop-blur-md p-4 rounded-xl border border-gray-200 dark:border-white/10 z-[1000] text-xs space-y-2 max-w-[200px]">
                <div className="font-bold text-gray-800 dark:text-white uppercase tracking-wider mb-2">
                  {activeLayer === "crop" ? "Crops" : activeLayer === "stress" ? "Stress Levels" : "Water Deficit"}
                </div>
                {activeLayer === "crop" && (
                  <div className="space-y-1">
                    {["Rice", "Wheat", "Cotton", "Maize", "Sugarcane", "Fallow"].map(crop => (
                      <div key={crop} className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded" style={{ backgroundColor: getCropColor(crop) }} />
                        <span className="font-medium text-gray-700 dark:text-gray-300">{crop}</span>
                      </div>
                    ))}
                  </div>
                )}
                {activeLayer === "stress" && (
                  <div className="space-y-1">
                    {["Optimal", "Mild Stress", "Moderate Stress", "Severe Stress"].map(level => (
                      <div key={level} className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded" style={{ backgroundColor: getStressColor(level) }} />
                        <span className="font-medium text-gray-700 dark:text-gray-300">{level}</span>
                      </div>
                    ))}
                  </div>
                )}
                {activeLayer === "deficit" && (
                  <div className="space-y-1">
                    {[
                      { label: "Deficit > 35mm", color: "#ef4444" },
                      { label: "Deficit 15-35mm", color: "#f97316" },
                      { label: "Deficit 0-15mm", color: "#eab308" },
                      { label: "Optimal Moisture", color: "#22c55e" }
                    ].map(def => (
                      <div key={def.label} className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded" style={{ backgroundColor: def.color }} />
                        <span className="font-medium text-gray-700 dark:text-gray-300">{def.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Title overlay */}
              <div className="absolute top-4 right-4 bg-indigo-600/90 backdrop-blur-md px-3 py-1 rounded-full text-white text-[11px] font-bold z-[1000] shadow flex items-center gap-1">
                <Workflow size={11} className="animate-spin-slow" /> canal command mapping
              </div>
            </div>

            {/* Click info tip */}
            <div className="bg-white dark:bg-[#120f1d] border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-md text-xs text-gray-500 flex items-center gap-2">
              <MapPin className="text-indigo-500 animate-bounce" size={16} />
              <span>Click a canal branch on the left to highlight its fields and overlay its distributary pipeline paths!</span>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
