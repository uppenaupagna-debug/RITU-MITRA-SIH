// 🌾 SatelliteMonitoring.jsx — Raitumitra Satellite Intelligence Platform
import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Polygon, FeatureGroup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import axios from "axios";
import { auth, db } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, getDoc } from "firebase/firestore";
import { Link } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from "recharts";
import {
  Globe,
  Droplet,
  Sun,
  Calendar,
  AlertTriangle,
  Loader2,
  TrendingUp,
  Map,
  Compass,
  CheckCircle,
  HelpCircle
} from "lucide-react";

/* 🧭 Auto-focus Map to Boundary Centroid */
function MapCentroidFocus({ boundary }) {
  const map = useMap();
  useEffect(() => {
    if (boundary && boundary.length > 0) {
      const lats = boundary.map(p => p[0]);
      const lngs = boundary.map(p => p[1]);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      
      map.fitBounds([
        [minLat, minLng],
        [maxLat, maxLng]
      ]);
    }
  }, [boundary, map]);
  return null;
}

export default function SatelliteMonitoring() {
  const [user] = useAuthState(auth);
  const activeUser = user || { uid: "K260ukR4PyUeu1fbvlF5S8Y6Fzf1", email: "testfarmer@raitumitra.com" };
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [farmBoundary, setFarmBoundary] = useState(null);
  
  // WhatsApp Alert Form States
  const [phoneNumber, setPhoneNumber] = useState("");
  const [alertLanguage, setAlertLanguage] = useState("english");
  const [sendingAlert, setSendingAlert] = useState(false);
  
  // Data from backend
  const [satelliteData, setSatelliteData] = useState(null);
  const [selectedPixel, setSelectedPixel] = useState(null);
  const [activeTab, setActiveTab] = useState("crop"); // 'crop' | 'stress' | 'advisory'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  
  // Load saved farm data (boundary & profile contact) from firestore
  useEffect(() => {
    const fetchFarmData = async () => {
      try {
        const ref = doc(db, "farmers", activeUser.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          if (data.farmBoundary) {
            const coords = data.farmBoundary.map(p => [p.lat, p.lng]);
            setFarmBoundary(coords);
          }
          if (data.profile && data.profile.contact) {
            setPhoneNumber(data.profile.contact);
          }
        }
      } catch (err) {
        console.error("Error loading farm data:", err);
        toast.error("Failed to load farm data.");
      } finally {
        setLoading(false);
      }
    };
    fetchFarmData();
  // BUG FIX #12: Use activeUser.uid as dep, not user (which is the raw Firebase object)
  }, [activeUser.uid]);

  // BUG FIX #5: Wrap runAnalysis in useCallback so it's stable and can be a useEffect dep
  const runAnalysis = useCallback(async () => {
    setAnalyzing(true);
    try {
      const response = await axios.post("http://localhost:8000/satellite/analyze", {
        polygon: farmBoundary,
        date: selectedDate
      });
      setSatelliteData(response.data);
      if (response.data.pixels && response.data.pixels.length > 0) {
        setSelectedPixel(response.data.pixels[0]);
      }
      toast.success("Satellite data refreshed!");
    } catch (err) {
      console.error("Satellite API error:", err);
      toast.error("Failed to fetch satellite analysis. Make sure backend is running.");
    } finally {
      setAnalyzing(false);
    }
  }, [farmBoundary, selectedDate]);

  // Run analysis when boundary or date changes
  useEffect(() => {
    if (farmBoundary) {
      runAnalysis();
    }
  }, [farmBoundary, selectedDate, runAnalysis]);

  const sendWhatsAppAlert = async () => {
    if (!phoneNumber) {
      toast.error("Please enter a valid phone number!");
      return;
    }
    if (!selectedPixel) {
      toast.error("No crop pixel selected to dispatch alert for!");
      return;
    }
    
    setSendingAlert(true);
    const toastId = toast.loading("Sending WhatsApp alert...");
    try {
      const response = await axios.post("http://localhost:8000/api/v1/farmer/send-alert", {
        phone_number: phoneNumber,
        language: alertLanguage,
        media_type: "whatsapp",
        crop_type: selectedPixel.crop_type,
        growth_stage: selectedPixel.growth_stage,
        deficit_mm: selectedPixel.deficit
      });
      
      toast.dismiss(toastId);
      if (response.data.status && response.data.status.includes("Simulated")) {
        toast.success(
          <div className="text-xs">
            <b>Simulated Alert Logged!</b>
            <p className="mt-1">Twilio API credentials missing; printed to backend console.</p>
          </div>,
          { duration: 5000 }
        );
      } else {
        toast.success("WhatsApp Alert Sent Successfully!");
      }
    } catch (err) {
      console.error("Alert send error:", err);
      toast.dismiss(toastId);
      toast.error("Failed to send WhatsApp alert. Check backend logs.");
    } finally {
      setSendingAlert(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-500">
        <Loader2 className="animate-spin text-emerald-600 mb-3" size={36} />
        <p className="font-semibold">Loading Raitumitra Satellite Platform...</p>
      </div>
    );
  }

  // BUG FIX #18: Show a helpful empty state if no farm boundary is saved
  if (!farmBoundary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <Map className="text-emerald-400 mb-4" size={56} />
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">No Farm Boundary Found</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
          You haven't drawn your farm boundary yet. Head to the Farm Map page to draw your field polygon, then come back for full satellite analysis.
        </p>
        <Link
          to="/map"
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-lg transition"
        >
          🗺️ Go to Farm Map
        </Link>
      </div>
    );
  }

  // Color mappings
  const getCropColor = (crop) => {
    const colors = {
      Rice: "#10b981",       // Emerald
      Wheat: "#f59e0b",      // Amber
      Cotton: "#06b6d4",     // Cyan
      Maize: "#eab308",      // Yellow
      Sugarcane: "#8b5cf6",  // Purple
      Fallow: "#6b7280"      // Gray
    };
    return colors[crop] || "#6b7280";
  };

  const getStressColor = (level) => {
    const colors = {
      "Severe Stress": "#ef4444",   // Red
      "Moderate Stress": "#f97316", // Orange
      "Mild Stress": "#eab308",     // Yellow
      "Optimal": "#22c55e"          // Green
    };
    return colors[level] || "#22c55e";
  };

  const getAdvisoryColor = (color) => {
    const colors = {
      red: "#ef4444",
      yellow: "#eab308",
      green: "#22c55e"
    };
    return colors[color] || "#22c55e";
  };

  // Get active pixel color based on current visual layer
  const getPixelStyle = (pixel) => {
    let fillColor = "#fff";
    if (activeTab === "crop") {
      fillColor = getCropColor(pixel.crop_type);
    } else if (activeTab === "stress") {
      fillColor = getStressColor(pixel.stress_level);
    } else if (activeTab === "advisory") {
      fillColor = getAdvisoryColor(pixel.advisory_color);
    }

    const isSelected = selectedPixel && selectedPixel.id === pixel.id;

    return {
      color: isSelected ? "#ffffff" : fillColor,
      weight: isSelected ? 2 : 0.5,
      fillColor: fillColor,
      fillOpacity: isSelected ? 0.85 : 0.65
    };
  };

  // Map months to short labels for chart
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const chartData = selectedPixel
    ? selectedPixel.ndvi_timeline.map((val, idx) => ({
        month: months[idx],
        NDVI: parseFloat(val.toFixed(2))
      }))
    : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0b0b0f] text-gray-900 dark:text-gray-100 p-6 transition-colors duration-300">
      <Toaster position="bottom-right" />
      
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-white/10 pb-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-500 to-indigo-500 bg-clip-text text-transparent flex items-center gap-2">
              <Globe className="w-8 h-8 text-emerald-500" /> Raitumitra Satellite Intelligence
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              AI-driven automated crop classification, stage-wise moisture stress detection & FAO-56 irrigation advisories.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border rounded-xl shadow-sm text-sm focus:ring-2 focus:ring-emerald-500 outline-none border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1a1525]"
            />
            <button
              onClick={runAnalysis}
              disabled={analyzing || !farmBoundary}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-green-500 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition"
            >
              {analyzing ? "Analyzing..." : "🔄 Refresh"}
            </button>
          </div>
        </div>

        {!farmBoundary ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-[#120f1d] border border-gray-200 dark:border-white/10 rounded-2xl p-8 shadow-xl">
            <Compass className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4 animate-pulse" />
            <h2 className="text-2xl font-bold mb-2">No Farm Boundary Configured</h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mb-6 text-sm">
              Please draw your farm boundary on the Smart Farm Map to enable satellite analytics, crop stress alerts, and weekly irrigation plans.
            </p>
            <Link
              to="/map"
              className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-lg"
            >
              ✏️ Go to Smart Farm Map
            </Link>

          </div>
        ) : (
          /* Main Dashboard Grid */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left side: Maps & layers */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Layer selection tabs */}
              <div className="flex bg-white dark:bg-[#120f1d] p-1.5 rounded-xl shadow border border-gray-200 dark:border-white/5">
                {[
                  { id: "crop", name: "🌾 Crop Type Map", desc: "AI crop identification" },
                  { id: "stress", name: "💧 Moisture Stress", desc: "Stage-wise plant hydration" },
                  { id: "advisory", name: "🚀 Irrigation Plan", desc: "8-day crop water deficit" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-300 ${
                      activeTab === tab.id
                        ? "bg-gradient-to-r from-emerald-600 to-green-500 text-white shadow-md"
                        : "text-gray-600 hover:text-emerald-500 dark:text-gray-300 dark:hover:text-emerald-400"
                    }`}
                  >
                    <div>{tab.name}</div>
                    <div className={`text-[10px] ${activeTab === tab.id ? "text-emerald-100" : "text-gray-400"}`}>
                      {tab.desc}
                    </div>
                  </button>
                ))}
              </div>

              {/* Map Panel */}
              <div className="relative rounded-2xl overflow-hidden shadow-xl border border-gray-200 dark:border-white/10 h-[520px] bg-white dark:bg-[#120f1d]">
                <MapContainer
                  center={farmBoundary[0]}
                  zoom={15}
                  style={{ height: "100%", width: "100%" }}
                  zoomControl={true}
                >
                  <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution="© Esri, Earthstar Geographics"
                  />
                  <FeatureGroup>
                    {/* Draw Outer Farm Boundary */}
                    <Polygon
                      positions={farmBoundary}
                      pathOptions={{
                        color: "#a78bfa",
                        fillColor: "transparent",
                        weight: 2.5
                      }}
                    />

                    {/* Draw High-res 10m satellite pixels */}
                    {satelliteData?.pixels?.map((pixel) => {
                      // Construct a small 10m grid cell bounding box
                      const size = 0.00008; // ~10m in degrees lat/lng
                      const bounds = [
                        [pixel.lat - size, pixel.lng - size],
                        [pixel.lat + size, pixel.lng - size],
                        [pixel.lat + size, pixel.lng + size],
                        [pixel.lat - size, pixel.lng + size]
                      ];

                      return (
                        <Polygon
                          key={pixel.id}
                          positions={bounds}
                          pathOptions={getPixelStyle(pixel)}
                          eventHandlers={{
                            click: () => {
                              setSelectedPixel(pixel);
                            }
                          }}
                        />
                      );
                    })}
                  </FeatureGroup>
                  <MapCentroidFocus boundary={farmBoundary} />
                </MapContainer>

                {/* Map Floating Legend */}
                <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-[#120f1dc0] backdrop-blur-md p-4 rounded-xl border border-gray-200 dark:border-white/10 z-[1000] text-xs space-y-2 max-w-[200px]">
                  <div className="font-bold text-gray-800 dark:text-white uppercase tracking-wider mb-2">
                    {activeTab === "crop" ? "Crops" : activeTab === "stress" ? "Stress Levels" : "Weekly Advisory"}
                  </div>
                  {activeTab === "crop" && (
                    <div className="space-y-1.5">
                      {["Rice", "Wheat", "Cotton", "Maize", "Sugarcane", "Fallow"].map(crop => (
                        <div key={crop} className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 rounded" style={{ backgroundColor: getCropColor(crop) }} />
                          <span className="font-medium text-gray-700 dark:text-gray-300">{crop}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {activeTab === "stress" && (
                    <div className="space-y-1.5">
                      {["Optimal", "Mild Stress", "Moderate Stress", "Severe Stress"].map(level => (
                        <div key={level} className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 rounded" style={{ backgroundColor: getStressColor(level) }} />
                          <span className="font-medium text-gray-700 dark:text-gray-300">{level}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {activeTab === "advisory" && (
                    <div className="space-y-1.5">
                      {[
                        { label: "Irrigate Now", color: "red" },
                        { label: "Scheduled (3d)", color: "yellow" },
                        { label: "Adequate Moisture", color: "green" }
                      ].map(adv => (
                        <div key={adv.label} className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 rounded" style={{ backgroundColor: getAdvisoryColor(adv.color) }} />
                          <span className="font-medium text-gray-700 dark:text-gray-300">{adv.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Map Title Overlay */}
                <div className="absolute top-4 right-4 bg-emerald-600/90 backdrop-blur-md px-3 py-1 rounded-full text-white text-[11px] font-bold z-[1000] shadow">
                  🛰️ Sentinel-1 & Sentinel-2 10m Grid
                </div>
              </div>

              {/* Water Balance Summary Panel */}
              {satelliteData && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Dominant Crop", val: satelliteData.dominant_crop, icon: <TrendingUp className="text-emerald-500" /> },
                    { label: "Avg Stress Score", val: `${satelliteData.avg_stress_score}/100`, icon: <Sun className="text-amber-500" /> },
                    { label: "Rain (Last 8d)", val: `${satelliteData.rain_8day_mm} mm`, icon: <Droplet className="text-cyan-500" /> },
                    { label: "8d Water Deficit", val: `${satelliteData.total_deficit_mm} mm`, icon: <AlertTriangle className="text-red-500" /> }
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
              )}
            </div>

            {/* Right side: Selected Pixel analytics */}
            <div className="lg:col-span-4 space-y-6">
              
              {selectedPixel ? (
                <div className="bg-white dark:bg-[#120f1d] border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-xl space-y-5">
                  <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/5 pb-3">
                    <h3 className="font-bold text-lg flex items-center gap-1.5">
                      🎯 Pixel #{selectedPixel.id} Analysis
                    </h3>
                    <span className="text-[10px] bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full text-gray-500">
                      Lat: {selectedPixel.lat.toFixed(4)}
                    </span>
                  </div>

                  {/* Pixel Properties */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-100/50 dark:bg-white/[0.02] p-2.5 rounded-lg border border-gray-200/50 dark:border-white/5">
                      <div className="text-[10px] text-gray-500 uppercase font-semibold">Identified Crop</div>
                      <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {selectedPixel.crop_type}
                      </div>
                    </div>
                    <div className="bg-gray-100/50 dark:bg-white/[0.02] p-2.5 rounded-lg border border-gray-200/50 dark:border-white/5">
                      <div className="text-[10px] text-gray-500 uppercase font-semibold">Growth Stage</div>
                      <div className="font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 truncate">
                        {selectedPixel.growth_stage}
                      </div>
                    </div>
                  </div>

                  {/* Stress Scores bar indicators */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Hydration Indicators</h4>
                    {[
                      { name: "Vegetation Condition (VCI)", val: selectedPixel.vci, desc: "Optical canopy health", color: "bg-emerald-500" },
                      { name: "Soil Moisture Index (SMI)", val: selectedPixel.smi, desc: "SAR backscatter moisture", color: "bg-cyan-500" },
                      { name: "Thermal Index (TCI)", val: selectedPixel.tci, desc: "Land surface temp anomaly", color: "bg-amber-500" }
                    ].map((idx, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span>{idx.name}</span>
                          <span className="font-bold">{idx.val}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                          <div className={`h-full ${idx.color}`} style={{ width: `${idx.val}%` }} />
                        </div>
                        <div className="text-[9px] text-gray-400">{idx.desc}</div>
                      </div>
                    ))}
                  </div>

                  {/* NDVI Chart */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">12-Month NDVI Profile</h4>
                      <span className="text-[9px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        Temporal signature
                      </span>
                    </div>
                    <div className="h-36 bg-gray-50 dark:bg-[#181426] p-2 rounded-xl border border-gray-200 dark:border-white/5">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                          <YAxis domain={[0, 1.0]} tick={{ fontSize: 9 }} />
                          <RechartsTooltip />
                          <Line
                            type="monotone"
                            dataKey="NDVI"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={{ r: 2 }}
                            activeDot={{ r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Specific Advisory */}
                  <div className="bg-gray-100/50 dark:bg-white/[0.03] p-4 rounded-xl border border-gray-200/50 dark:border-white/5 space-y-2">
                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Irrigation Advisory</div>
                    <div className="flex items-start gap-2.5">
                      <CheckCircle className={`w-5 h-5 shrink-0 mt-0.5`} style={{ color: getAdvisoryColor(selectedPixel.advisory_color) }} />
                      <div>
                        <div className="font-bold text-sm">{selectedPixel.advisory}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Calculated crop water demand (ETc): <b>{selectedPixel.etc} mm</b>. 
                          8-day deficit is <b>{selectedPixel.deficit} mm</b>.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp Alert Dispatcher */}
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/10 p-4 rounded-xl border border-emerald-200/50 dark:border-emerald-500/20 space-y-3">
                    <div className="flex items-center justify-between text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold tracking-wider">
                      <span className="flex items-center gap-1">📱 Dispatch WhatsApp Advisory</span>
                      <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 text-[8px] px-1 py-0.2 rounded font-normal uppercase">Free sandbox</span>
                    </div>
                    
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-black/20 p-2.5 rounded-lg border border-gray-100 dark:border-white/5">
                      <b>To test live notifications for free:</b>
                      <ol className="list-decimal list-inside mt-1 space-y-0.5 text-[10px]">
                        <li>Send <code className="bg-emerald-100 dark:bg-emerald-900 px-1 py-0.2 rounded text-emerald-800 dark:text-emerald-200 font-mono">join sandbox-keyword</code> from your WhatsApp number to <b className="font-bold">+1 415 523 8886</b>.</li>
                        <li>Enter your number below and click send.</li>
                      </ol>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="block text-[10px] text-gray-500 font-semibold mb-1">WhatsApp Number (e.g. +919876543210)</label>
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="+919876543210"
                          className="w-full px-3 py-1.5 border rounded-lg text-xs dark:bg-[#1a1525] border-gray-200 dark:border-white/10 outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-gray-500 font-semibold mb-1">Alert Language</label>
                          <select
                            value={alertLanguage}
                            onChange={(e) => setAlertLanguage(e.target.value)}
                            className="w-full px-3 py-1.5 border rounded-lg text-xs dark:bg-[#1a1525] border-gray-200 dark:border-white/10 outline-none focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="english">English</option>
                            <option value="telugu">Telugu (తెలుగు)</option>
                            <option value="hindi">Hindi (हिन्दी)</option>
                            <option value="kannada">Kannada (ಕನ್ನಡ)</option>
                            <option value="tamil">Tamil (தமிழ்)</option>
                          </select>
                        </div>
                        
                        <div className="flex items-end">
                          <button
                            onClick={sendWhatsAppAlert}
                            disabled={sendingAlert}
                            className="w-full py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition flex items-center justify-center gap-1.5"
                          >
                            {sendingAlert ? (
                              <>
                                <Loader2 className="animate-spin w-3.5 h-3.5" />
                                Sending...
                              </>
                            ) : (
                              <>
                                🔔 Send Alert
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="bg-white dark:bg-[#120f1d] border border-gray-200 dark:border-white/10 rounded-2xl p-8 shadow-xl text-center text-gray-500">
                  <HelpCircle className="w-12 h-12 text-gray-400 mx-auto mb-2 animate-bounce" />
                  <p className="text-sm">Click any pixel on the map to inspect satellite health graphs & weekly irrigation guidance.</p>
                </div>
              )}

              {/* 🛰️ Live True-Color Sentinel-2 View Card */}
              {satelliteData && satelliteData.satellite_metadata && (
                <div className="bg-white dark:bg-[#120f1d] border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/5 pb-3">
                    <h3 className="font-bold text-base flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <Globe className="w-5 h-5 shrink-0" /> Live Sentinel-2 Photo
                    </h3>
                    {satelliteData.satellite_metadata.real_data_used ? (
                      <span className="flex items-center gap-1.5 text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Real-World
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-500 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full font-bold">
                        Simulated
                      </span>
                    )}
                  </div>

                  {satelliteData.satellite_metadata.thumbnail ? (
                    <div className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 shadow-md group">
                      <img
                        src={`data:image/jpeg;base64,${satelliteData.satellite_metadata.thumbnail}`}
                        alt="Sentinel-2 True Color View"
                        className="w-full h-44 object-cover group-hover:scale-105 transition duration-500"
                      />
                      <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[9px] text-emerald-400 font-semibold uppercase tracking-wider">
                        True-Color RGB
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-36 bg-gray-50 dark:bg-[#181426] border border-dashed border-gray-200 dark:border-white/5 rounded-xl text-gray-400">
                      <Globe className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-1.5" />
                      <p className="text-xs">No satellite image available</p>
                    </div>
                  )}

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-gray-100 dark:border-white/[0.02]">
                      <span className="text-gray-500">Scene ID</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200 font-mono text-[10px] truncate max-w-[180px]" title={satelliteData.satellite_metadata.scene_id}>
                        {satelliteData.satellite_metadata.scene_id}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100 dark:border-white/[0.02]">
                      <span className="text-gray-500">Acquired On</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {satelliteData.satellite_metadata.acquisition_date}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100 dark:border-white/[0.02]">
                      <span className="text-gray-500">Cloud Cover</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {satelliteData.satellite_metadata.cloud_cover}%
                      </span>
                    </div>
                    {satelliteData.satellite_metadata.local_path && (
                      <div className="mt-2 bg-gray-50 dark:bg-[#181426] p-2.5 rounded-lg border border-gray-100 dark:border-white/5 space-y-1">
                        <div className="text-[9px] text-gray-500 font-semibold uppercase">Local Storage (Active)</div>
                        <div className="font-mono text-[9px] text-indigo-500 dark:text-indigo-400 break-all select-all">
                          {satelliteData.satellite_metadata.local_path}
                        </div>
                        <div className="text-[8px] text-gray-400">
                          High-resolution 10m GeoTIFF crop saved on server disk.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Guidance Panel */}
              <div className="bg-white dark:bg-[#120f1d] border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-xl space-y-3">
                <h3 className="font-bold text-base flex items-center gap-1">
                  💡 How to use Raitumitra Satellite Map
                </h3>
                <ul className="text-xs space-y-2.5 text-gray-600 dark:text-gray-400 list-disc list-inside">
                  <li>Each grid cell represents a <b>10m × 10m Sentinel resolution</b> area inside your farm.</li>
                  <li>Toggle the tabs at the top to display different layers (Crops, Stress levels, or advisories).</li>
                  <li>Click a cell to view the crop's <b>12-month growth pattern (NDVI profile)</b>.</li>
                  <li>Deficits are estimated using reference weather data and FAO-56 crop coefficients.</li>
                </ul>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
