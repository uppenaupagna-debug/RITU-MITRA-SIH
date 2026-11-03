// 🌾 Raitu Mitra — Farming Calendar (Dark Mode Supported)
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Thermometer,
  Info,
  Leaf,
  Bug,
  Droplets,
  Scissors,
  Warehouse,
  CalendarCheck2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import cropsData from "../data/crops.json";
import MonthGrid from "./MonthGrid";

/* ---------- utils ---------- */
const fmt = (d) =>
  d instanceof Date && !isNaN(d)
    ? d.toLocaleDateString(undefined, { day: "2-digit", month: "short" })
    : "--";

const ICON_MAP = { Leaf, CalendarCheck2, Droplets, Scissors, Bug, Warehouse };
const resolveIcon = (iconName) => ICON_MAP[iconName] || Leaf;

/* ---------- geo ---------- */
function useGeo() {
  const [geo, setGeo] = useState(null);
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeo({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => setGeo(null),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);
  return geo;
}

/* ---------- weather ---------- */
async function fetchWeatherFromOpenWeather({ lat, lon }) {
  const API_KEY = "f438baf46e45d28234c799897dc72268";
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();

    const dayMap = {};
    json.list.forEach((item) => {
      const dateKey = item.dt_txt.split(" ")[0];
      const tmax = item.main.temp_max;
      const tmin = item.main.temp_min;
      const rain = item.rain?.["3h"] || 0;
      if (!dayMap[dateKey])
        dayMap[dateKey] = { date: dateKey, tmax, tmin, rain };
      else {
        dayMap[dateKey].tmax = Math.max(dayMap[dateKey].tmax, tmax);
        dayMap[dateKey].tmin = Math.min(dayMap[dateKey].tmin, tmin);
        dayMap[dateKey].rain += rain;
      }
    });
    const today = new Date().toISOString().split("T")[0];
    return Object.values(dayMap).filter((d) => d.date >= today).slice(0, 5);
  } catch {
    return [];
  }
}

/* ---------- sowing date helper ---------- */
function midSowingDateFromWindow(sowingWindow) {
  const y = new Date().getFullYear();
  const fromDate = new Date(
    y,
    (sowingWindow.from?.m ?? 1) - 1,
    sowingWindow.from?.d ?? 1
  );
  const toDate = new Date(
    y,
    (sowingWindow.to?.m ?? 1) - 1,
    sowingWindow.to?.d ?? 1
  );
  return new Date((fromDate.getTime() + toDate.getTime()) / 2);
}

/* ---------- TIP RESOLVER (DATA ONLY) ---------- */
function resolvePhaseTip(phase, crop, weather) {
  const fallback = "Ensure field conditions are optimal before this stage.";
  if (!phase?.tips) return fallback;
  if (!weather || weather.length === 0) return phase.tips.default || fallback;

  const totalRain = weather.reduce((s, d) => s + (d.rain ?? 0), 0);
  const maxTemp = Math.max(...weather.map((d) => d.tmax ?? 0));

  if (totalRain > 10 && phase.tips.rain) return phase.tips.rain;
  if (maxTemp > crop.weather?.idealTempMax && phase.tips.heat)
    return phase.tips.heat;
  if (phase.tips.ideal) return phase.tips.ideal;

  return phase.tips.default || fallback;
}

export default function FarmingCalendar({ defaultCropId = "paddy" }) {
  const geo = useGeo();
  const CROPS = cropsData;

  const [cropId, setCropId] = useState(defaultCropId);
  const crop = useMemo(
    () => CROPS.find((c) => c.id === cropId) ?? CROPS[0],
    [cropId, CROPS]
  );

  const [weather, setWeather] = useState([]);
  useEffect(() => {
    if (!geo) return;
    (async () => setWeather(await fetchWeatherFromOpenWeather(geo)))();
  }, [geo]);

  const [userSowingDate, setUserSowingDate] = useState("");

  // Update default sowing date when crop selection changes
  useEffect(() => {
    const midDate = midSowingDateFromWindow(crop.sowingWindow);
    setUserSowingDate(midDate.toISOString().split("T")[0]);
  }, [crop]);

  const sowingDate = useMemo(() => {
    return userSowingDate ? new Date(userSowingDate) : midSowingDateFromWindow(crop.sowingWindow);
  }, [userSowingDate, crop]);

  const [loggedPhases, setLoggedPhases] = useState({});

  // Fetch logs on mount/crop selection
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await axios.get(`http://localhost:8000/api/v1/farmer/logs?uid=testfarmer&crop_id=${crop.id}`);
        const logsMap = {};
        res.data.forEach(log => {
          logsMap[log.phase_key] = log;
        });
        setLoggedPhases(logsMap);
      } catch (err) {
        console.error("Failed to load logs:", err);
      }
    };
    fetchLogs();
  }, [crop]);

  const successScore = useMemo(() => {
    if (!crop?.phases?.length) return 0;
    
    const totalPhases = crop.phases.length;
    const confirmedPhases = Object.values(loggedPhases).filter(log => log.confirmed).length;
    
    const taskRatio = confirmedPhases / totalPhases; // 40% weight
    
    // Check specific tasks
    const irrigationDone = loggedPhases["irrigation"]?.confirmed ? 1 : 0; // 20% weight
    const fertilizerDone = loggedPhases["fertilizer"]?.confirmed ? 1 : 0; // 20% weight
    const pestChecked = loggedPhases["pest"]?.confirmed ? 1 : 0; // 20% weight
    
    const score = (taskRatio * 40) + (irrigationDone * 20) + (fertilizerDone * 20) + (pestChecked * 20);
    return Math.min(100, Math.round(score));
  }, [crop, loggedPhases]);

  const [lastIrrigatedDaysAgo, setLastIrrigatedDaysAgo] = useState(0);

  const soilMoistureReserve = useMemo(() => {
    const baseInterval = crop.irrigationIntervalDays || 7;
    const totalRain = weather.reduce((s, d) => s + (d.rain ?? 0), 0);
    
    // Each 10mm of rain adds 1 day of reserve (max 3 days)
    const rainBonus = Math.min(3, Math.floor(totalRain / 10));
    
    // Remaining days = (Base Interval + Rain Bonus) - Days since last irrigation
    const remainingDays = Math.max(0, (baseInterval + rainBonus) - lastIrrigatedDaysAgo);
    
    const percentage = Math.min(100, Math.round((remainingDays / (baseInterval + rainBonus)) * 100));
    
    let status = "Optimal Hydration";
    let color = "bg-blue-500";
    if (percentage < 30) {
      status = "Critical (Under-watered)";
      color = "bg-red-500 animate-pulse";
    } else if (percentage < 65) {
      status = "Moderate (Schedule Irrigation)";
      color = "bg-yellow-500";
    }
    
    return { percentage, status, color, remainingDays };
  }, [crop, weather, lastIrrigatedDaysAgo]);

  const gdd = useMemo(() => {
    if (!weather.length) return 0;
    const base = crop.gddBase ?? 10;
    return weather.reduce((acc, d) => {
      const avg = ((d.tmax ?? 0) + (d.tmin ?? 0)) / 2;
      return acc + Math.max(0, avg - base);
    }, 0);
  }, [weather, crop]);

  const maturityGDD = crop.gddTarget ?? crop.durationDays * 12;
  const progressPct = Math.min(
    100,
    Math.max(0, Number(((gdd / maturityGDD) * 100).toFixed(1)))
  );

  const weeklyInsight = useMemo(() => {
    if (!weather.length) return "Fetching weather...";
    const totalRain = weather.reduce((s, d) => s + (d.rain ?? 0), 0);
    const avgRain = totalRain / weather.length;
    const hotDays = weather.filter(
      (d) => (d.tmax ?? 0) >= (crop.weather?.idealTempMax ?? 999)
    ).length;

    let msg = `Next 5 days: ${totalRain.toFixed(
      1
    )}mm total (${avgRain.toFixed(1)}mm/day). `;
    msg += hotDays > 2
      ? "🔥 Heat stress possible. "
      : "🌤️ Temps are near-optimal. ";
    msg += totalRain > 10
      ? "💧 Irrigation can be reduced."
      : "💧 Maintain regular irrigation.";
    return msg;
  }, [weather, crop]);

  const [selectedPhase, setSelectedPhase] = useState(null);

  // Modal Logger states
  const [modalConfirmed, setModalConfirmed] = useState(false);
  const [modalPestStatus, setModalPestStatus] = useState("None");
  const [modalNotes, setModalNotes] = useState("");
  const [modalExpense, setModalExpense] = useState("");
  const [modalFertBrand, setModalFertBrand] = useState("");
  const [modalFertAmount, setModalFertAmount] = useState("");
  const [modalYield, setModalYield] = useState("");
  const [modalPrice, setModalPrice] = useState("");
  const [modalBuyer, setModalBuyer] = useState("");
  const [modalLoss, setModalLoss] = useState("");
  const [photoSelected, setPhotoSelected] = useState(null);
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);

  // Pre-fill form when phase is opened
  useEffect(() => {
    if (selectedPhase) {
      const existing = loggedPhases[selectedPhase.key] || {};
      setModalConfirmed(existing.confirmed ?? false);
      setModalPestStatus(existing.pest_status ?? "None");
      setModalNotes(existing.notes ?? "");
      setModalExpense(existing.expense ?? "");
      setModalFertBrand(existing.fertilizer_brand ?? "");
      setModalFertAmount(existing.fertilizer_amount ?? "");
      setModalYield(existing.yield_amount ?? "");
      setModalPrice(existing.selling_price ?? "");
      setModalBuyer(existing.buyer ?? "");
      setModalLoss(existing.storage_loss ?? "");
      setPhotoSelected(null);
    }
  }, [selectedPhase, loggedPhases]);

  const handleSubmitLog = async () => {
    if (!selectedPhase) return;
    setIsSubmittingLog(true);
    const toastId = toast.loading("Saving your crop log...");
    try {
      const payload = {
        uid: "testfarmer",
        crop_id: crop.id,
        phase_key: selectedPhase.key,
        confirmed: modalConfirmed,
        pest_status: modalPestStatus,
        notes: modalNotes,
        expense: Number(modalExpense) || 0.0,
        fertilizer_brand: modalFertBrand || null,
        fertilizer_amount: Number(modalFertAmount) || null,
        photo_b64: photoSelected || null,
        yield_amount: Number(modalYield) || null,
        selling_price: Number(modalPrice) || null,
        buyer: modalBuyer || null,
        storage_loss: Number(modalLoss) || null,
      };
      
      const res = await axios.post("http://localhost:8000/api/v1/farmer/log-task", payload);
      
      // Update local state map
      setLoggedPhases(prev => ({
        ...prev,
        [selectedPhase.key]: res.data
      }));
      
      toast.dismiss(toastId);
      toast.success("Crop activity logged and synced!");
      setSelectedPhase(null);
    } catch (err) {
      console.error("Failed to log activity:", err);
      toast.dismiss(toastId);
      toast.error("Failed to sync log with server.");
    } finally {
      setIsSubmittingLog(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6 space-y-6 bg-white dark:bg-[#0b0b0f] text-gray-800 dark:text-gray-100 transition-colors duration-500">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800">
            <CalendarDays className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-semibold">
              Farming Calendar
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Smart schedule for {crop.name} • {crop.season}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">Crop Selection</label>
            <select
              value={cropId}
              onChange={(e) => setCropId(e.target.value)}
              className="border dark:border-neutral-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-900 shadow-sm"
            >
              {CROPS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">Actual Sowing Date (Day 0)</label>
            <input
              type="date"
              value={userSowingDate}
              onChange={(e) => setUserSowingDate(e.target.value)}
              className="border dark:border-neutral-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-neutral-900 shadow-sm"
            />
          </div>
        </div>
      </motion.div>

      {/* Weather + GDD + Insight + Soil Hydration + Success Score */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Weather Chart */}
        <div className="p-4 rounded-xl border bg-white dark:bg-neutral-900 dark:border-neutral-700 transition-colors duration-500">
          <b className="text-sm text-neutral-700 dark:text-neutral-200">
            Weather Summary
          </b>
          {weather.length ? (
            <div className="h-24 mt-2 dark:bg-neutral-800/50 rounded-lg p-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weather}>
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => (d ? d.slice(5) : "")}
                    stroke="gray"
                  />
                  <YAxis hide />
                  <Tooltip labelFormatter={(l) => `Date: ${l}`} />
                  <Area
                    type="monotone"
                    dataKey="tmax"
                    stroke="#ff7c43"
                    fill="#ff7c4320"
                  />
                  <Area
                    type="monotone"
                    dataKey="rain"
                    stroke="#2f8fff"
                    fill="#2f8fff30"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-xs text-neutral-500 mt-2">
              Fetching weather...
            </div>
          )}
        </div>

        {/* GDD */}
        <div className="p-4 rounded-xl border bg-white dark:bg-neutral-900 dark:border-neutral-700 transition-colors duration-500">
          <div className="flex items-center gap-2 mb-1">
            <Thermometer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <b className="text-neutral-700 dark:text-neutral-200">
              GDD Progress
            </b>
          </div>
          <div className="text-sm text-neutral-700 dark:text-neutral-300">
            🌡️ {Math.round(gdd)} degree-days accumulated
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Base temperature: {crop.gddBase ?? 10}°C
          </div>
          <div className="mt-2 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              className="h-2 bg-green-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
            {progressPct}% of maturity
          </div>
        </div>

        {/* Insight */}
        <div className="p-4 rounded-xl border bg-white dark:bg-neutral-900 dark:border-neutral-700 transition-colors duration-500">
          <div className="flex items-center gap-2 mb-1">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <b className="text-neutral-700 dark:text-neutral-200">
              Weekly Insight
            </b>
          </div>
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            {weeklyInsight}
          </p>
        </div>

        {/* Soil Water Reserve */}
        <div className="p-4 rounded-xl border bg-white dark:bg-neutral-900 dark:border-neutral-700 transition-colors duration-500">
          <div className="flex items-center gap-2 mb-1">
            <Droplets className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <b className="text-neutral-700 dark:text-neutral-200">
              Soil Hydration
            </b>
          </div>
          <div className="text-sm text-neutral-700 dark:text-neutral-300">
            💧 {soilMoistureReserve.percentage}% ({soilMoistureReserve.status})
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Last Irrigated: 
            <select
              value={lastIrrigatedDaysAgo}
              onChange={(e) => setLastIrrigatedDaysAgo(Number(e.target.value))}
              className="ml-2 border dark:border-neutral-700 rounded px-1.5 py-0.5 text-xs bg-white dark:bg-neutral-900 shadow-sm"
            >
              <option value="0">Today</option>
              <option value="1">1 day ago</option>
              <option value="2">2 days ago</option>
              <option value="3">3 days ago</option>
              <option value="5">5 days ago</option>
              <option value="7">7 days ago</option>
              <option value="10">10+ days ago</option>
            </select>
          </div>
          <div className="mt-2 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              className={`h-2 ${soilMoistureReserve.color} transition-all duration-500`}
              style={{ width: `${soilMoistureReserve.percentage}%` }}
            />
          </div>
          <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
            {soilMoistureReserve.remainingDays} days of reserves left
          </div>
        </div>

        {/* Success Score */}
        <div className="p-4 rounded-xl border bg-white dark:bg-neutral-900 dark:border-neutral-700 transition-colors duration-500">
          <div className="flex items-center gap-2 mb-1">
            <CalendarCheck2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <b className="text-neutral-700 dark:text-neutral-200">
              Success Score
            </b>
          </div>
          <div className="text-sm text-neutral-700 dark:text-neutral-300">
            🏆 {successScore}% 
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Status: <span className={`font-semibold ${
              successScore < 30 ? "text-red-500" : successScore < 75 ? "text-yellow-500" : "text-emerald-500"
            }`}>
              {successScore === 0 ? "No Logs" : successScore < 30 ? "Beginner" : successScore < 75 ? "Active" : "Master Farmer"}
            </span>
          </div>
          <div className="mt-2 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              className={`h-2 ${
                successScore < 30 ? "bg-red-500" : successScore < 75 ? "bg-yellow-500" : "bg-emerald-500"
              } transition-all duration-500`}
              style={{ width: `${successScore}%` }}
            />
          </div>
          <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
            Completing tasks increases score
          </div>
        </div>
      </div>

      {/* Timeline */}
      <MonthGrid
        startDate={sowingDate}
        phases={crop.phases}
        weather={weather}
        onPhaseClick={setSelectedPhase}
      />

      {/* Phase Modal */}
      <AnimatePresence>
        {selectedPhase && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setSelectedPhase(null)}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 150, damping: 15 }}
              className="bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-xl w-full max-w-md relative"
            >
              <div className="flex items-center gap-3 mb-2">
                {(() => {
                  const Icon = resolveIcon(selectedPhase.icon);
                  return (
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/40 rounded-lg">
                      <Icon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  );
                })()}
                <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                  {selectedPhase.label}
                </h3>
              </div>

              <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-3 leading-relaxed">
                {selectedPhase.notes}
              </p>

              <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                <span>
                  📅 {fmt(selectedPhase.s)} → {fmt(selectedPhase.e)}
                </span>
                <span>⏱️ {selectedPhase.duration} days</span>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 text-sm text-emerald-800 dark:text-emerald-300">
                🌿 <b>Tip:</b>{" "}
                {resolvePhaseTip(selectedPhase, crop, weather)}
              </div>

              {(() => {
                const totalRain = weather.reduce((s, d) => s + (d.rain ?? 0), 0);
                if (totalRain > 10 && (selectedPhase.key === "fertilizer" || selectedPhase.key === "weeding")) {
                  return (
                    <div className="mt-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-lg p-3 text-sm text-red-800 dark:text-red-300 flex items-start gap-2 animate-pulse">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                      <div>
                        <b>⚠️ Fertilizer Washout Risk:</b> Heavy rain ({totalRain.toFixed(1)}mm) is forecast. Applying fertilizer or foliar sprays now will wash away nutrients. Postpone application.
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Form starts */}
              <div className="mt-4 border-t pt-4 space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                <h4 className="font-semibold text-neutral-800 dark:text-neutral-200 text-sm">
                  📝 Daily Check-in & Logging
                </h4>
                
                {/* 1. Stage Confirmation */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-750 dark:text-neutral-300">
                    Has crop entered this stage?
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setModalConfirmed(true)}
                      className={`px-3 py-1 text-xs rounded-md font-medium border transition ${
                        modalConfirmed 
                          ? "bg-emerald-500 border-emerald-500 text-white" 
                          : "bg-white dark:bg-neutral-850 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200"
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalConfirmed(false)}
                      className={`px-3 py-1 text-xs rounded-md font-medium border transition ${
                        !modalConfirmed 
                          ? "bg-neutral-500 border-neutral-500 text-white" 
                          : "bg-white dark:bg-neutral-850 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200"
                      }`}
                    >
                      Not Yet
                    </button>
                  </div>
                </div>

                {/* 2. Pest & Disease Observations */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                    Pest & Disease Status
                  </label>
                  <select
                    value={modalPestStatus}
                    onChange={(e) => setModalPestStatus(e.target.value)}
                    className="w-full text-sm border dark:border-neutral-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-250"
                  >
                    <option value="None">🟢 None (No Pests)</option>
                    <option value="Mild">🟡 Mild Infection</option>
                    <option value="Moderate">🟠 Moderate Outbreak</option>
                    <option value="Severe">🔴 Severe Outbreak</option>
                  </select>
                </div>

                {/* 3. Photo Upload Simulator */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                    Field / Canopy Photo
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      id="phase-photo"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setPhotoSelected(reader.result);
                            toast.success("Canopy photo loaded successfully!");
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <label
                      htmlFor="phase-photo"
                      className="cursor-pointer text-xs px-3 py-1.5 border dark:border-neutral-700 rounded-md bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 font-medium inline-block text-neutral-850 dark:text-neutral-250"
                    >
                      📸 Upload Image
                    </label>
                    {photoSelected && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-450 font-medium animate-pulse">
                        ✓ Image Loaded
                      </span>
                    )}
                  </div>
                </div>

                {/* 4. Expense Logger */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                    Expense Incurred (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 1500"
                    value={modalExpense}
                    onChange={(e) => setModalExpense(e.target.value)}
                    className="w-full text-sm border dark:border-neutral-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-neutral-850 text-neutral-800 dark:text-neutral-200"
                  />
                </div>

                {/* 5. Fertilizer-specific log widgets */}
                {selectedPhase.key === "fertilizer" && (
                  <div className="grid grid-cols-2 gap-2 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-semibold text-amber-800 dark:text-amber-400">
                        NPK/Urea Brand
                      </label>
                      <input
                        type="text"
                        placeholder="IFFCO / Paras"
                        value={modalFertBrand}
                        onChange={(e) => setModalFertBrand(e.target.value)}
                        className="w-full text-xs border dark:border-neutral-700 rounded-lg px-2 py-1 bg-white dark:bg-neutral-800 text-neutral-850 dark:text-neutral-200"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-semibold text-amber-800 dark:text-amber-400">
                        Quantity (kg)
                      </label>
                      <input
                        type="number"
                        placeholder="50"
                        value={modalFertAmount}
                        onChange={(e) => setModalFertAmount(e.target.value)}
                        className="w-full text-xs border dark:border-neutral-700 rounded-lg px-2 py-1 bg-white dark:bg-neutral-800 text-neutral-850 dark:text-neutral-200"
                      />
                    </div>
                  </div>
                )}

                {/* 6. Harvest-specific yield prediction & P&L log widgets */}
                {selectedPhase.key === "harvest" && (
                  <div className="bg-indigo-500/10 p-2.5 rounded-lg border border-indigo-500/20 space-y-2">
                    <b className="text-xs text-indigo-700 dark:text-indigo-400 block">📊 Harvest & Yield Ledger</b>
                    
                    {/* Sowing prediction updates */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="space-y-1">
                        <label className="block text-neutral-600 dark:text-neutral-400 font-medium">Height (cm)</label>
                        <input
                          type="number"
                          placeholder="e.g. 110"
                          className="w-full border dark:border-neutral-700 rounded px-2 py-1 bg-white dark:bg-neutral-800 text-neutral-850 dark:text-neutral-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-neutral-600 dark:text-neutral-400 font-medium">Surviving Plants</label>
                        <input
                          type="text"
                          placeholder="e.g. 85%"
                          className="w-full border dark:border-neutral-700 rounded px-2 py-1 bg-white dark:bg-neutral-800 text-neutral-850 dark:text-neutral-200"
                        />
                      </div>
                    </div>

                    {/* Actual P&L log */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-semibold text-neutral-600 dark:text-neutral-400">Yield (kg/qtl)</label>
                        <input
                          type="number"
                          placeholder="e.g. 45"
                          value={modalYield}
                          onChange={(e) => setModalYield(e.target.value)}
                          className="w-full text-xs border dark:border-neutral-700 rounded px-2 py-1 bg-white dark:bg-neutral-800 text-neutral-850 dark:text-neutral-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-semibold text-neutral-600 dark:text-neutral-400">Price per unit (₹)</label>
                        <input
                          type="number"
                          placeholder="e.g. 2100"
                          value={modalPrice}
                          onChange={(e) => setModalPrice(e.target.value)}
                          className="w-full text-xs border dark:border-neutral-700 rounded px-2 py-1 bg-white dark:bg-neutral-800 text-neutral-850 dark:text-neutral-200"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-semibold text-neutral-600 dark:text-neutral-400">Buyer Name</label>
                        <input
                          type="text"
                          placeholder="APMC Mandi"
                          value={modalBuyer}
                          onChange={(e) => setModalBuyer(e.target.value)}
                          className="w-full text-xs border dark:border-neutral-700 rounded px-2 py-1 bg-white dark:bg-neutral-800 text-neutral-850 dark:text-neutral-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-semibold text-neutral-600 dark:text-neutral-400">Storage Loss (%)</label>
                        <input
                          type="number"
                          placeholder="2"
                          value={modalLoss}
                          onChange={(e) => setModalLoss(e.target.value)}
                          className="w-full text-xs border dark:border-neutral-700 rounded px-2 py-1 bg-white dark:bg-neutral-800 text-neutral-850 dark:text-neutral-200"
                        />
                      </div>
                    </div>
                    
                    {modalYield && modalPrice && (
                      <div className="text-[11px] bg-emerald-500/10 p-1.5 rounded border border-emerald-500/20 text-emerald-800 dark:text-emerald-450 font-medium">
                        💰 Projected Revenue: ₹{(Number(modalYield) * Number(modalPrice)).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}

                {/* 7. Notes input */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                    Field Observations / Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Describe leaves, pests, weeding requirements..."
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    className="w-full text-sm border dark:border-neutral-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-neutral-850 text-neutral-800 dark:text-neutral-200"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => setSelectedPhase(null)}
                  className="flex-1 py-2 rounded-lg border dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-850 text-sm font-medium transition text-neutral-800 dark:text-neutral-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitLog}
                  disabled={isSubmittingLog}
                  className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-500 text-white text-sm font-medium transition flex items-center justify-center gap-1.5"
                >
                  {isSubmittingLog && <Loader2 className="animate-spin w-4 h-4" />}
                  💾 Save & Sync
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}