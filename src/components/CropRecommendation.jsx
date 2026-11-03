// EnhancedCropRecommendationsSameLayout.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import {
  Leaf, MapPin, Droplets, Sun, Calendar, BarChart, Info, Wind, Thermometer,
  TrendingUp, Shield, RefreshCcw, ChevronsRight, Zap, Eye, TestTube2,
  AlertTriangle, X, Sprout, Bug
} from 'lucide-react';
import DISTRICTS from "../data/indiaDistricts";
import { CROPS } from "../data/cropMaster";
import districtCrops from "../data/districtCrops.json";
import { auth, db } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, getDoc, collection, query, onSnapshot } from "firebase/firestore";


/* -------------------- constants -------------------- */
const SOIL_TYPES = ["Alluvial", "Loamy", "Sandy", "Clayey", "Red Soil"];

/* -------------------- helpers -------------------- */
const getCurrentSeason = () => {
  const month = new Date().getMonth() + 1;
  if (month >= 6 && month <= 10) return "Kharif";
  if (month >= 11 || month <= 4) return "Rabi";
  return "Zaid";
};

const getSeasonalWeatherPrediction = (months) => {
  const patterns = {
    1: {t:"10-22",r:"VL",h:"65-75"}, 2: {t:"13-26",r:"L",h:"60-70"}, 3: {t:"18-30",r:"L",h:"55-65"},
    4: {t:"24-37",r:"L",h:"45-55"}, 5: {t:"28-42",r:"L",h:"40-50"}, 6: {t:"29-39",r:"M",h:"60-70"},
    7: {t:"27-35",r:"H",h:"75-85"}, 8: {t:"26-34",r:"H",h:"80-90"}, 9: {t:"25-34",r:"M",h:"70-80"},
    10: {t:"20-32",r:"L",h:"60-70"}, 11: {t:"14-28",r:"VL",h:"55-65"}, 12: {t:"8-20",r:"VL",h:"65-75"}
  };
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  if (!months || months.length === 0) return { avg: "N/A", details: [] };
  let aT = 0, aH = 0;
  const d = months.map(m => {
    const p = patterns[m]; aT += parseInt(p.t.split('-')[1]); aH += parseInt(p.h.split('-')[1]);
    return { month: names[m-1], temp: p.t + "°C", rainfall: p.r, humidity: p.h + "%" };
  });
  return { avg: `~${Math.round(aT/months.length)}°C | ${Math.round(aH/months.length)}% Hum`, details: d };
};

/* -------------------- Smart Score -------------------- */
const calculateEnhancedSmartScore = (crop, filters, currentSeason, weather) => {
  const price = parseInt((crop.marketPrice || "0").toString().replace(/[^0-9]/g, ''), 10) || 0;
  const profit = (crop.avgYield * price) - (crop.investment || 0);
  const profitRatio = (crop.investment > 0) ? profit / crop.investment : profit > 0 ? 1 : 0;

  const demandScore = {'Very High': 1.4, 'High': 1.3, 'Medium': 1.0, 'Low': 0.7}[crop.marketDemand] || 1.0;
  const riskScore = {'Low': 1.3, 'Medium': 1.0, 'High': 0.7}[crop.riskFactor] || 1.0;
  const waterScore = {'Very High': 1.4, 'High': 1.2, 'Medium': 1.0, 'Low': 0.8}[crop.waterEfficiency] || 1.0;
  const seasonScore = (crop.seasons.includes(currentSeason) || crop.seasons.includes("Annual") || crop.seasons.includes("Perennial")) ? 1.2 : 0.8;
  const exportScore = {'Very High': 1.3, 'High': 1.2, 'Medium': 1.0, 'Low': 0.9}[crop.exportPotential] || 1.0;
  const mechanizationScore = {'High': 1.2, 'Medium': 1.0, 'Low': 0.9}[crop.mechanization] || 1.0;

  let weatherScore = 1.0;
  if (weather && crop.plantingMonths) {
    const nowM = new Date().getMonth() + 1;
    weatherScore = crop.plantingMonths.includes(nowM) ? 1.15 : 0.95;
  }

  let durationScore = 1.0;
  try {
    const [minDur, maxDur] = (filters.growingDuration || "1-999").split('-').map(Number);
    durationScore = (crop.growingDuration >= (minDur || 1) && crop.growingDuration <= (maxDur || 999)) ? 1.1 : 0.9;
  } catch {}

  const storageScore = crop.storageLife > 6 ? 1.1 : crop.storageLife > 3 ? 1.0 : 0.9;

  const baseSmartScore = (
    (profitRatio * 0.25) + (demandScore * 0.15) + (riskScore * 0.15) + (waterScore * 0.10) +
    (seasonScore * 0.10) + (exportScore * 0.08) + (mechanizationScore * 0.05) +
    (weatherScore * 0.09) + (durationScore * 0.02) + (storageScore * 0.01)
  ) * 100;

  let penaltyPercentage = 0.0;
  const candidateFamily = (crop.cropFamily || "").trim();
  const previousFamilies = (filters.previousCrops || [])
    .map(cn => {
      if (!cn) return null;
      const found = CROPS.find(c => c.name.trim() === cn.trim());
      return found ? (found.cropFamily || "").trim() : null;
    })
    .filter(Boolean);

  if (previousFamilies.length === 3 && previousFamilies[0] === previousFamilies[1] && previousFamilies[1] === previousFamilies[2]) {
    penaltyPercentage = 0.75;
  } else if (previousFamilies.length >= 2 && previousFamilies[0] === previousFamilies[1]) {
    penaltyPercentage = 0.45;
  }
  if (previousFamilies.length > 0 && candidateFamily === previousFamilies[0]) {
    penaltyPercentage = Math.max(penaltyPercentage, 0.30);
  }

  const { soilPh, soilEc, soilCarbon } = filters;
  let soilAdj = 1.0;
  if (soilPh) {
    const phVal = parseFloat(soilPh);
    const [minPH, maxPH] = crop.soilPH || [5.5, 7.5];
    if (Number.isFinite(phVal)) {
      if (phVal < minPH - 0.5 || phVal > maxPH + 0.5) soilAdj *= 0.8;
      else if (phVal >= minPH && phVal <= maxPH) soilAdj *= 1.1;
    }
  }
  if (soilEc) {
    const ecVal = parseFloat(soilEc);
    if (Number.isFinite(ecVal)) {
      if (ecVal > 2) soilAdj *= 0.8; else soilAdj *= 1.05;
    }
  }
  if (soilCarbon) {
    const cVal = parseFloat(soilCarbon);
    if (Number.isFinite(cVal)) {
      if (cVal >= 0.5 && cVal <= 1.0) soilAdj *= 1.1;
      else if (cVal < 0.3) soilAdj *= 0.9;
    }
  }

  const rotationPenaltyMultiplier = 1.0 - penaltyPercentage;
  const finalSmartScore = baseSmartScore * rotationPenaltyMultiplier * soilAdj;
  return Math.max(0, Math.round(finalSmartScore * 100) / 100);
};

/* -------------------- protective crop inputs helper -------------------- */
const getCropInputs = (crop, farmingStyle = "Both") => {
  const isOrganic = farmingStyle === "Organic";
  const isInorganic = farmingStyle === "Inorganic";

  // 1. Fertilizers mapping based on crop type
  let fertilizers = [];
  if (!isInorganic) {
    // Organic recommendations
    if (crop.type === "Grain" || crop.type === "Cash Crop") {
      fertilizers.push("🍀 Well-decomposed Farmyard Manure (FYM) - 5-10 tons/acre during land preparation.");
      fertilizers.push("🍀 Vermicompost or Poultry Manure - 1.5 tons/acre as a top dressing.");
      fertilizers.push("🍀 Panchagavya or Jeevamrutha - apply monthly with irrigation to boost soil microflora.");
    } else if (crop.type === "Pulse") {
      fertilizers.push("🍀 Rhizobium Bio-fertilizer - inoculate seeds before sowing to boost nitrogen fixation.");
      fertilizers.push("🍀 Rock Phosphate or Bone Meal - 200 kg/acre to provide organic phosphorus.");
      fertilizers.push("🍀 Wood ash - 150 kg/acre during early growth to supply organic potash.");
    } else if (crop.type === "Vegetable" || crop.type === "Fruit") {
      fertilizers.push("🍀 Compost or Vermicompost - 3-5 kg per plant or 5 tons/acre.");
      fertilizers.push("🍀 Neem Cake or Mustard Cake - 250 kg/acre to supply organic nitrogen and prevent soil nematodes.");
      fertilizers.push("🍀 Seaweed Extract liquid spray - every 15 days during flowering and fruiting.");
    } else {
      fertilizers.push("🍀 Well-decomposed compost - 4 tons/acre during soil mixing.");
      fertilizers.push("🍀 Azotobacter & PSB (Phosphorus Solubilizing Bacteria) bio-fertilizers.");
    }
  }
  
  if (!isOrganic) {
    // Inorganic recommendations
    if (crop.type === "Grain") {
      fertilizers.push("🧪 Urea (Nitrogen) - 80-100 kg/acre split in 3 doses (basal, tillering, jointing).");
      fertilizers.push("🧪 DAP (Diammonium Phosphate) - 50 kg/acre as basal dose during sowing.");
      fertilizers.push("🧪 MOP (Muriate of Potash) - 30 kg/acre during panicle initiation.");
    } else if (crop.type === "Pulse") {
      fertilizers.push("🧪 Urea - low starter dose of 15-20 kg/acre (pulses fix their own nitrogen).");
      fertilizers.push("🧪 Single Super Phosphate (SSP) - 100 kg/acre to provide phosphorus and essential sulfur.");
      fertilizers.push("🧪 MOP - 20 kg/acre to strengthen roots.");
    } else if (crop.type === "Vegetable" || crop.type === "Fruit") {
      fertilizers.push("🧪 NPK 19:19:19 complex - 50 kg/acre during vegetative growth.");
      fertilizers.push("🧪 DAP - 60 kg/acre as a basal application.");
      fertilizers.push("🧪 Calcium Nitrate & Boron spray - during fruit setting to prevent cracking and blossom-end rot.");
    } else {
      fertilizers.push("🧪 NPK 12:32:16 complex - 40 kg/acre as basal application.");
      fertilizers.push("🧪 Urea - 25 kg/acre split as top dressing.");
    }
  }

  // 2. Pesticides mapping based on crop commonRisks
  let pesticides = [];
  const risks = crop.commonRisks || [];
  
  risks.forEach(risk => {
    const riskLower = risk.toLowerCase();
    
    let organicPest = "";
    let chemicalPest = "";

    if (riskLower.includes("wilt") || riskLower.includes("rot")) {
      organicPest = `Trichoderma viride bio-fungicide soil application (2kg/acre mixed with compost).`;
      chemicalPest = `Carbendazim 50% WP or Copper Oxychloride at 2g/liter as a soil drench.`;
    } else if (riskLower.includes("rust") || riskLower.includes("blight") || riskLower.includes("mildew") || riskLower.includes("spot")) {
      organicPest = `Spray Neem Oil (3000 ppm) at 5ml/liter or Pseudomonas fluorescens spray (10g/liter).`;
      chemicalPest = `Mancozeb 75% WP or Propiconazole 25% EC at 1.5ml/liter of water.`;
    } else if (riskLower.includes("aphids") || riskLower.includes("thrips") || riskLower.includes("whitefly") || riskLower.includes("mite") || riskLower.includes("hopper")) {
      organicPest = `Spray Neem Seed Kernel Extract (NSKE 5%) or set up Yellow Sticky Traps (10 traps/acre).`;
      chemicalPest = `Imidacloprid 17.8% SL (0.5 ml/liter) or Acetamiprid 20% SP (0.5g/liter).`;
    } else if (riskLower.includes("borer") || riskLower.includes("worm") || riskLower.includes("caterpillar") || riskLower.includes("bug")) {
      organicPest = `Bacillus thuringiensis (Bt) at 2g/liter or configure Pheromone Traps (5/acre).`;
      chemicalPest = `Coragen (Chlorantraniliprole 18.5% SC) at 0.4 ml/liter or Emamectin Benzoate 5% SG.`;
    } else {
      organicPest = `Foliar spray of multi-herb liquid extract (Agniastra/Neem Astra) at 10ml/liter.`;
      chemicalPest = `Broad-spectrum Chlorpyrifos 20% EC at 2ml/liter.`;
    }

    if (!isInorganic) {
      pesticides.push(`🍀 For ${risk} (Organic): ${organicPest}`);
    }
    if (!isOrganic) {
      pesticides.push(`🧪 For ${risk} (Chemical): ${chemicalPest}`);
    }
  });

  if (pesticides.length === 0) {
    if (!isInorganic) {
      pesticides.push("🍀 General Protection (Organic): Spray Neem Oil preventive dose (3ml/liter) every 20 days.");
    }
    if (!isOrganic) {
      pesticides.push("🧪 General Protection (Chemical): Spray preventive systemic fungicide if crop spot diseases are active locally.");
    }
  }

  return { fertilizers, pesticides };
};

/* -------------------- small UI bits -------------------- */
const FilterSelect = ({ name, label, value, onChange, options, placeholder }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
    <select
      id={name} name={name} value={value} onChange={onChange}
      className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
    >
      <option value="">{placeholder}</option>
      {options.map(option => (
        <option key={option.value || option} value={option.value || option}>{option.label || option}</option>
      ))}
    </select>
  </div>
);

const WaterSourceCheckboxes = ({ selected, onChange }) => {
  const sources = ["Rainwater", "Borewell/Tubewell", "Canal Irrigation", "Pond/Well"];
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Available Water Sources</label>
      <div className="grid grid-cols-2 md:grid-cols-2 gap-x-4 gap-y-2">
        {sources.map(s => (
          <label key={s} className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              name="waterSources"
              value={s}
              checked={selected.includes(s)}
              onChange={onChange}
              className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-emerald-600 focus:ring-emerald-500 bg-gray-100 dark:bg-gray-600"
            />
            <span>{s}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

/* -------------------- tiny utils -------------------- */
const useDebouncedEffect = (fn, deps, delay = 450) => {
  useEffect(() => {
    const t = setTimeout(fn, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay]);
};

/* -------------------- CountUp (smart score / metrics) -------------------- */
const CountUp = ({ value = 0, duration = 1000, className = "", prefix = "", suffix = "" }) => {
  const [val, setVal] = useState(0);
  const startRef = useRef(null);

  useEffect(() => {
    let raf;
    const start = performance.now();
    startRef.current = start;

    const animate = (now) => {
      const p = Math.min(1, (now - startRef.current) / duration);
      setVal(Math.round(value * p));
      if (p < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span className={className}>{prefix}{val}{suffix}</span>;
};

/* -------------------- main component -------------------- */
export default function EnhancedCropRecommendations() {
  const initialFilters = { 
    state: "", district: "", soilType: "", previousCrops: ["", "", ""],
    waterSources: [], investmentBudget: "", growingDuration: "",
    soilPh: "", soilEc: "", soilCarbon: "", farmingStyle: ""
  };
  
  const [filters, setFilters] = useState(initialFilters);
  const [weather, setWeather] = useState(null);
  const [weatherForecast, setWeatherForecast] = useState(null);
  const [weatherError, setWeatherError] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [season] = useState(getCurrentSeason());
  const [liveMsp, setLiveMsp] = useState({});
  // ✅ Profile linking
  const [user] = useAuthState(auth);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Compute weather warnings memo dynamically
  const weatherAlerts = useMemo(() => {
    if (!weatherForecast?.list) return [];
    const alerts = [];
    let heavyRain = false;
    let heatwave = false;
    let highWind = false;
    
    // Check next 48 hours (first 16 entries of 3-hour forecasts)
    const nextThreeDays = weatherForecast.list.slice(0, 16);
    for (let entry of nextThreeDays) {
      const rain = entry.rain?.["3h"] || 0;
      const tempMax = entry.main?.temp_max || 0;
      const windSpeed = entry.wind?.speed || 0;
      
      if (rain > 10) heavyRain = true;
      if (tempMax > 38) heatwave = true;
      if (windSpeed > 12) highWind = true;
    }
    
    if (heavyRain) {
      alerts.push({
        type: "rain",
        msg: "🌧️ Heavy rain expected in next 48h. Postpone sowing to prevent seed washing or rot!",
        severity: "high"
      });
    }
    if (heatwave) {
      alerts.push({
        type: "heat",
        msg: "🔥 Extreme heatwave predicted (>38°C). Keep fields well-irrigated and shade nursery beds!",
        severity: "high"
      });
    }
    if (highWind) {
      alerts.push({
        type: "wind",
        msg: "💨 High winds expected. Tall crops (like maize or sugarcane) may need dynamic protective support.",
        severity: "medium"
      });
    }
    return alerts;
  }, [weatherForecast]);


  const requiredFields = ['state', 'district', 'soilType', 'waterSources', 'investmentBudget', 'growingDuration'];
  const totalFilters = requiredFields.length;
  const filledFilters = useMemo(() =>
    requiredFields.filter(key => {
      const value = filters[key];
      return Array.isArray(value) ? value.length > 0 : value !== "";
    }).length, [filters]
  );
  const isFormComplete = filledFilters === totalFilters;

  const [riskFilter, setRiskFilter] = useState("");
  const [waterFilter, setWaterFilter] = useState("");
  const [sortBy, setSortBy] = useState("");
  // ✅ Auto-load farmer profile if logged in
useEffect(() => {
  const fetchProfile = async () => {
    if (!user) {
      setProfileLoaded(true);
      return;
    }

    try {
      const ref = doc(db, "farmers", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        const p = data.profile || {};
        const pref = data.preferences || {};

        // Dynamic Soil Sync
        const soil = data.soilData || {};
        let parsedPh = "";
        let parsedCarbon = "";

        if (soil.pH && soil.pH !== "N/A") {
          const phVal = parseFloat(soil.pH);
          // SoilGrids pH is scaled by 10 (e.g. 6.5 is stored as 65 or 6.5)
          parsedPh = phVal > 14 ? (phVal / 10).toFixed(1) : phVal.toFixed(1);
        }

        if (soil.SOC && soil.SOC !== "N/A") {
          const socVal = parseFloat(soil.SOC);
          // SoilGrids organic carbon is g/kg, divide by 10 to get organic carbon percentage %
          parsedCarbon = socVal > 10 ? (socVal / 10).toFixed(2) : socVal.toFixed(2);
        }

        // Fill available profile values into filters
        setFilters((prev) => ({
          ...prev,
          state: p.state || prev.state,
          district: p.district || prev.district,
          soilType: pref.soilType || prev.soilType,
          waterSources: pref.waterSources || prev.waterSources,
          soilPh: parsedPh || prev.soilPh,
          soilCarbon: parsedCarbon || prev.soilCarbon,
        }));
      }
    } catch (err) {
      console.error("Error loading profile:", err);
    } finally {
      setProfileLoaded(true);
    }
  };

  fetchProfile();
}, [user]);


  // Load real-time MSP prices published by Admin
  useEffect(() => {
    const mspRef = collection(db, "msp");
    const unsub = onSnapshot(mspRef, (snap) => {
      const prices = {};
      snap.docs.forEach((doc) => {
        const d = doc.data();
        if (d.crop && (d.price || d.value)) {
          // Normalize key to lower case
          const cropKey = d.crop.toLowerCase().trim();
          prices[cropKey] = d.price || d.value;
        }
      });
      setLiveMsp(prices);
    });
    return () => unsub();
  }, []);

  /* --- debounced weather fetch --- */
  useDebouncedEffect(() => {
    if (!filters.district) {
      setWeather(null);
      setWeatherForecast(null);
      setWeatherError("");
      return;
    }
    let cancelled = false;
    const fetchWeather = async () => {
      try {
        const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${filters.district},${filters.state},IN&units=metric&appid=${apiKey}`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${filters.district},${filters.state},IN&units=metric&appid=${apiKey}`;
        
        const [weatherRes, forecastRes] = await Promise.all([
          axios.get(weatherUrl),
          axios.get(forecastUrl)
        ]);

        if (!cancelled) {
          setWeather(weatherRes.data);
          setWeatherForecast(forecastRes.data);
          setWeatherError("");
        }
      } catch {
        if (!cancelled) {
          setWeather(null);
          setWeatherForecast(null);
          setWeatherError("Could not fetch live weather forecast.");
        }
      }
    };
    fetchWeather();
    return () => { cancelled = true; };
  }, [filters.district, filters.state], 550);

  /* --- handlers --- */
  const handleFilterChange = (e) => setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handlePreviousCropChange = (e) => {
    const { name, value } = e.target;
    const index = parseInt(name.split('-')[1], 10);
    const previousCrops = [...filters.previousCrops]; previousCrops[index] = value;
    setFilters(prev => ({ ...prev, previousCrops }));
  };
  const handleWaterSourceChange = (e) => {
    const { value, checked } = e.target;
    setFilters(prev => ({
      ...prev,
      waterSources: checked ? [...prev.waterSources, value] : prev.waterSources.filter(s => s !== value)
    }));
  };

  /* --- soil hints --- */
  const interpretPh = (val) => {
    if (!val) return "";
    const p = parseFloat(val); if (!Number.isFinite(p)) return "";
    if (p < 5.5) return "🧪 Acidic soil – lime may help for neutral crops.";
    if (p <= 7.5) return "🌿 Neutral soil – suitable for most crops.";
    return "🧂 Alkaline soil – consider gypsum if too high.";
  };
  const interpretEc = (val) => {
    if (!val) return "";
    const e = parseFloat(val); if (!Number.isFinite(e)) return "";
    if (e > 2) return "⚠️ High salinity — prefer tolerant crops.";
    if (e <= 1) return "✅ Normal EC — good condition.";
    return "🔸 Moderate EC — add organic matter, improve drainage.";
  };
  const interpretCarbon = (val) => {
    if (!val) return "";
    const c = parseFloat(val); if (!Number.isFinite(c)) return "";
    if (c < 0.3) return "🌾 Low carbon — add compost/green manure.";
    if (c <= 1.0) return "🌱 Good fertility.";
    return "🍃 High carbon — supports high-value crops.";
  };

  /* --- compute recommendations (memoize heavy parts) --- */
  const computeRecommendations = useCallbackRef(() => {
    const districtList = districtCrops[filters.district] || [];
    
    // 1. Flexible Casing & Substring Name matching
    let filtered = CROPS.filter(crop => {
      const cropNameLower = crop.name.toLowerCase().trim();
      return districtList.some(dn => {
        const dnLower = dn.toLowerCase().trim();
        return dnLower.includes(cropNameLower) || cropNameLower.includes(dnLower);
      });
    });

    // 2. Season Loose Fallback (Zaid allows Kharif since sowing/planning happens in Zaid)
    const allowedSeasons = [season, "Annual", "Perennial"];
    if (season === "Zaid") {
      allowedSeasons.push("Kharif");
    }
    const seasonFiltered = filtered.filter(crop => {
      return crop.seasons.some(s => allowedSeasons.includes(s)) || 
             ["Annual", "Perennial"].includes(crop?.seasons?.[0]);
    });
    if (seasonFiltered.length > 0) {
      filtered = seasonFiltered;
    }

    // 3. Soil Loose Fallback
    const soilFiltered = filtered.filter(crop => crop.soil.includes(filters.soilType));
    if (soilFiltered.length > 0) {
      filtered = soilFiltered;
    }

    // 4. Growing Duration Loose Fallback
    const [minDur, maxDur] = (filters.growingDuration || "1-999").split('-').map(Number);
    const durationFiltered = filtered.filter(c => c.growingDuration >= (minDur || 1) && c.growingDuration <= (maxDur || 999));
    if (durationFiltered.length > 0) {
      filtered = durationFiltered;
    }

    // 5. Budget Loose Fallback
    const budgetFiltered = filtered.filter(c => c.investment <= Number(filters.investmentBudget));
    if (budgetFiltered.length > 0) {
      filtered = budgetFiltered;
    }

    // 6. Water Sources Loose Fallback
    const waterLevels = new Set((filters.waterSources || []).map(s => ({
      "Rainwater": "low", "Pond/Well": "low", "Borewell/Tubewell": "medium", "Canal Irrigation": "high"
    })[s]));
    const userHas = { high: waterLevels.has('high'), medium: waterLevels.has('medium'), low: waterLevels.has('low') };
    const waterFiltered = filtered.filter(c =>
      (c.water === 'high' && userHas.high) ||
      (c.water === 'medium' && (userHas.high || userHas.medium)) ||
      (c.water === 'low' && (userHas.high || userHas.medium || userHas.low))
    );
    if (waterFiltered.length > 0) {
      filtered = waterFiltered;
    }

    /* 🚫 NEW ROTATION EXCLUSION LOGIC */
    const prevCrops = (filters.previousCrops || []).filter(Boolean);
    const allSameCrop = prevCrops.length === 3 && prevCrops.every(c => c.trim() === prevCrops[0].trim());
    const allSameFamily = (() => {
      if (prevCrops.length < 3) return false;
      const families = prevCrops.map(c => {
        const found = CROPS.find(cr => cr.name.trim() === c.trim());
        return found ? found.cropFamily : null;
      }).filter(Boolean);
      return families.length === 3 && families.every(f => f === families[0]);
    })();

    if (allSameCrop) {
      const blocked = prevCrops[0].trim();
      filtered = filtered.filter(c => c.name.trim() !== blocked);
    } else if (allSameFamily) {
      const familyBlocked = CROPS.find(c => c.name.trim() === prevCrops[0].trim())?.cropFamily;
      if (familyBlocked)
        filtered = filtered.filter(c => c.cropFamily !== familyBlocked);
    }

    const processed = filtered.map(crop => {
      const cropKey = crop.name.toLowerCase().trim();
      const livePrice = liveMsp[cropKey];
      let updatedCrop = { ...crop };
      if (livePrice) {
        updatedCrop.marketPrice = `₹${livePrice}/quintal`;
        updatedCrop.isLivePrice = true;
      }
      return {
        ...updatedCrop,
        plantingWeather: getSeasonalWeatherPrediction(updatedCrop.plantingMonths),
        harvestWeather: getSeasonalWeatherPrediction(updatedCrop.harvestMonths),
        smartScore: calculateEnhancedSmartScore(updatedCrop, filters, season, weather)
      };
    });

    processed.sort((a, b) => b.smartScore - a.smartScore);
    setRecommendations(processed);
    setHasSearched(true);
  });

  // tiny hook to keep latest function without re-binding effects
  function useCallbackRef(fn) {
    const ref = useRef(fn);
    useEffect(() => { ref.current = fn; }, [fn]);
    return useMemo(() => (...args) => ref.current(...args), []);
  }

  const handleGetRecommendations = () => computeRecommendations();

  const handleClearFilters = () => {
    setFilters(initialFilters);
    setRecommendations([]); setHasSearched(false);
    setWeather(null); setRiskFilter(""); setWaterFilter(""); setSortBy("");
  };

  const displayed = useMemo(() => {
    let d = [...recommendations];
    if (riskFilter) d = d.filter(c => c.riskFactor === riskFilter);
    if (waterFilter) d = d.filter(c => (c.waterEfficiency || '').toString().includes(waterFilter));
    if (sortBy) {
      const valueMap = { "Low": 1, "Medium": 2, "High": 3, "Very High": 4 };
      d.sort((a, b) => {
        if (sortBy === "profit") {
          const priceA = parseInt((a.marketPrice || "0").toString().replace(/[^0-9]/g,''), 10) || 0;
          const priceB = parseInt((b.marketPrice || "0").toString().replace(/[^0-9]/g,''), 10) || 0;
          const profitA = (a.avgYield * priceA) - (a.investment || 0);
          const profitB = (b.avgYield * priceB) - (b.investment || 0);
          return profitB - profitA;
        }
        if (sortBy === "smartScore") return (b.smartScore || 0) - (a.smartScore || 0);
        if (sortBy === "risk") return (valueMap[a.riskFactor] || 99) - (valueMap[b.riskFactor] || 99);
        if (sortBy === "water") return (valueMap[(a.waterEfficiency || '').split(' ')[0]] || 99) - (valueMap[(b.waterEfficiency || '').split(' ')[0]] || 99);
        return 0;
      });
    }
    return d;
  }, [recommendations, riskFilter, waterFilter, sortBy]);

  /* -------------------- UI -------------------- */
  return (
    <div className="bg-gradient-to-b from-white to-gray-50 dark:from-[#0b0b0f] dark:to-[#0b0b0f] min-h-screen">
      {/* emerald theme vars */}
      <style>{`
  .rb-gradient { 
    background-image: linear-gradient(90deg, #059669, #10b981, #14b8a6); 
  }
  .text-rb-gradient { 
    background-image: linear-gradient(90deg, #34d399, #6ee7b7, #5eead4); 
    -webkit-background-clip: text; 
    background-clip: text; 
    color: transparent; 
  }
  .ring-rb { 
    box-shadow: 0 0 0 3px rgba(16,185,129,0.35); 
  }
`}</style>

      {/* Details Modal */}
      {selectedCrop && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" onClick={() => setSelectedCrop(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-gray-800 p-5 border-b dark:border-gray-700 flex justify-between items-center z-10">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{selectedCrop.icon}</span>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    {selectedCrop.name}
                    {selectedCrop.isLivePrice && (
                      <span className="inline-flex items-center text-xs font-extrabold px-2 py-0.5 rounded bg-gradient-to-r from-amber-500 to-orange-500 text-white animate-pulse shadow-sm">
                        ⚡ LIVE MSP
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selectedCrop.type} ({selectedCrop.cropFamily})</p>
                </div>
              </div>
              <button onClick={() => setSelectedCrop(null)} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"><X size={24}/></button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2"><Calendar/> Farming Timeline</h3>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                      <li><strong>Planting:</strong> {selectedCrop.plantingMonths.map(m => new Date(0, m - 1).toLocaleString('default', { month: 'long' })).join(', ')}</li>
                      <li><strong>Growing Duration:</strong> {selectedCrop.growingDuration} months</li>
                      <li><strong>Harvesting:</strong> {selectedCrop.harvestMonths.map(m => new Date(0, m - 1).toLocaleString('default', { month: 'long' })).join(', ')}</li>
                      <li><strong>Storage Life:</strong> {selectedCrop.storageLife} months</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2"><TrendingUp/> Market & Economics</h3>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                      <li><strong>Investment:</strong> ₹{selectedCrop.investment.toLocaleString()}/acre</li>
                      <li><strong>Expected Yield:</strong> {selectedCrop.avgYield} quintals/acre</li>
                      <li><strong>Market Price:</strong> {selectedCrop.marketPrice} {selectedCrop.isLivePrice && <span className="text-amber-500 font-bold ml-1">(Live Admin MSP)</span>}</li>
                      <li><strong>Export Potential:</strong> {selectedCrop.exportPotential}</li>
                      <li><strong>Mechanization Level:</strong> {selectedCrop.mechanization}</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2"><TestTube2/> Varieties & Nutrition</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2"><strong>Recommended Varieties:</strong> {selectedCrop.varieties.join(', ')}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300"><strong>Nutritional Value:</strong> {selectedCrop.nutritionalValue}</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2"><Sun/> Seasonal Weather Forecast</h3>
                    <div className="text-sm space-y-2 text-gray-800 dark:text-gray-200">
                      <div>
                        <strong>Planting Period:</strong>
                        <div className="grid grid-cols-3 gap-2 mt-1">
                          {selectedCrop.plantingWeather.details.slice(0, 3).map(d => 
                            <div key={d.month} className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-center">
                              <div className="font-bold">{d.month}</div><div>{d.temp}</div><div className="text-xs text-gray-500 dark:text-gray-400">{d.rainfall} Rain</div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <strong>Harvesting Period:</strong>
                        <div className="grid grid-cols-3 gap-2 mt-1">
                          {selectedCrop.harvestWeather.details.slice(0, 3).map(d => 
                            <div key={d.month} className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-center">
                              <div className="font-bold">{d.month}</div><div>{d.temp}</div><div className="text-xs text-gray-500 dark:text-gray-400">{d.rainfall} Rain</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2"><Bug/> Risk Management</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2"><strong>Common Risks:</strong> {selectedCrop.commonRisks.join(', ')}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2"><strong>Risk Level:</strong> {selectedCrop.riskFactor}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Regular monitoring and IPM practices recommended. Use resistant varieties and bio-pesticides when possible.</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2"><Sprout/> Soil & Water Requirements</h3>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                      <li><strong>Suitable Soils:</strong> {selectedCrop.soil.join(', ')}</li>
                      <li><strong>Soil pH:</strong> {selectedCrop.soilPH[0]} - {selectedCrop.soilPH[1]}</li>
                      <li><strong>Water Requirement:</strong> {selectedCrop.water}</li>
                      <li><strong>Water Efficiency:</strong> {selectedCrop.waterEfficiency}</li>
                      {selectedCrop.interCropping?.length > 0 && (
                        <li className="pt-3 mt-3 border-t dark:border-gray-700">
                          <strong className="text-green-700 dark:text-green-400">Compatible Intercrops:</strong>
                          <p className="text-gray-600 dark:text-gray-300">{selectedCrop.interCropping.join(', ')}</p>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Special Notes</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">{selectedCrop.specialNotes}</p>
              </div>
              {/* Dynamic Fertilizers and Pesticides protection block */}
              {(() => {
                const { fertilizers, pesticides } = getCropInputs(selectedCrop, filters.farmingStyle);
                return (
                  <div className="mt-6 pt-6 border-t dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-6 bg-emerald-50/30 dark:bg-emerald-950/10 p-5 rounded-xl border border-emerald-100/50 dark:border-emerald-900/30">
                    <div>
                      <h3 className="text-md font-bold text-emerald-800 dark:text-emerald-300 mb-3 flex items-center gap-2">
                        <Leaf className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Recommended Fertilizers & Soil Nutrients
                      </h3>
                      <ul className="space-y-2 text-xs text-gray-750 dark:text-gray-350">
                        {fertilizers.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 bg-white dark:bg-gray-850 p-2.5 rounded border border-gray-150 dark:border-gray-700 shadow-sm leading-relaxed">
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-md font-bold text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" /> Recommended Pest & Disease Protections
                      </h3>
                      <ul className="space-y-2 text-xs text-gray-755 dark:text-gray-355">
                        {pesticides.map((p, i) => (
                          <li key={i} className="flex items-start gap-2 bg-white dark:bg-gray-850 p-2.5 rounded border border-gray-150 dark:border-gray-700 shadow-sm leading-relaxed">
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <header className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold flex items-center justify-center gap-3">
            <Leaf className="text-emerald-500 w-12 h-12"/> 
            <span className="text-rb-gradient">Enhanced Crop Advisory</span>
          </h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Smart crop advisor with 105+ crops data across 700+ districts. Get personalized recommendations based on comprehensive analysis.
          </p>
        </header>
        
        <main>
          {/* Filters Card */}
          <div className="bg-white/90 dark:bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Left side (unchanged) */}
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FilterSelect name="state" label="State" value={filters.state} onChange={(e) => setFilters(prev => ({ ...prev, state: e.target.value, district: "" }))} options={Object.keys(DISTRICTS)} placeholder="Select State"/>
                <FilterSelect name="district" label="District" value={filters.district} onChange={handleFilterChange} options={filters.state ? DISTRICTS[filters.state] : []} placeholder={filters.state ? "Select District" : "Select State first"}/>
                <FilterSelect name="soilType" label="Soil Type" value={filters.soilType} onChange={handleFilterChange} options={SOIL_TYPES} placeholder="Select Soil Type"/>
                <FilterSelect name="growingDuration" label="Preferred Growing Duration" value={filters.growingDuration} onChange={handleFilterChange} options={[{label: "Short (1-3 months)", value: "1-3"}, {label: "Medium (4-6 months)", value: "4-6"}, {label: "Long (6+ months)", value: "7-99"}]} placeholder="Select Duration"/>
                <div className="sm:col-span-2">
                  <FilterSelect name="investmentBudget" label="Investment Budget (per acre)" value={filters.investmentBudget} onChange={handleFilterChange} options={[{label: "Low (Up to ₹25,000)", value: 25000}, {label: "Medium (Up to ₹50,000)", value: 50000}, {label: "High (Up to ₹75,000)", value: 75000}, {label: "Very High (Above ₹75,000)", value: 200000}]} placeholder="Select Budget Range"/>
                </div>
                <div className="sm:col-span-2">
                  <WaterSourceCheckboxes selected={filters.waterSources} onChange={handleWaterSourceChange}/>
                </div>
{/* 🌾 Previous Crop History */}
<div className="sm:col-span-2 border-t border-emerald-200/70 dark:border-emerald-800 pt-4 mt-4">
  <h4 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 mb-2 flex items-center gap-2">
    <Sprout className="w-4 h-4" /> Previous Crop History (Optional)
  </h4>
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <FilterSelect
      name="previousCrop-0"
      label="Most Recent Crop"
      value={filters.previousCrops[0]}
      onChange={handlePreviousCropChange}
      options={CROPS.map((c) => c.name)}
      placeholder="None"
    />
    <FilterSelect
      name="previousCrop-1"
      label="2nd Previous Crop"
      value={filters.previousCrops[1]}
      onChange={handlePreviousCropChange}
      options={CROPS.map((c) => c.name)}
      placeholder="None"
    />
    <FilterSelect
      name="previousCrop-2"
      label="3rd Previous Crop"
      value={filters.previousCrops[2]}
      onChange={handlePreviousCropChange}
      options={CROPS.map((c) => c.name)}
      placeholder="None"
    />
  </div>
</div>

                {/* Optional Soil Params */}
                <div className="sm:col-span-2 border-t dark:border-gray-700 pt-4 mt-2">
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Soil Parameters (Optional)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Soil pH</label>
                      <input
                        type="number" step="0.1" name="soilPh" value={filters.soilPh}
                        onChange={handleFilterChange} placeholder="e.g., 6.5"
                        className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{interpretPh(filters.soilPh)}</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Electrical Conductivity (EC)</label>
                      <input
                        type="number" step="0.1" name="soilEc" value={filters.soilEc}
                        onChange={handleFilterChange} placeholder="e.g., 0.8 dS/m"
                        className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{interpretEc(filters.soilEc)}</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Organic Carbon (%)</label>
                      <input
                        type="number" step="0.1" name="soilCarbon" value={filters.soilCarbon}
                        onChange={handleFilterChange} placeholder="e.g., 0.75"
                        className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{interpretCarbon(filters.soilCarbon)}</p>
                    </div>
                  </div>
                </div>
                {/* Optional Farming Style */}
                <div className="sm:col-span-2 border-t dark:border-gray-700 pt-4 mt-3">
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Farming Style (Optional)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FilterSelect
                      name="farmingStyle"
                      label="Preferred Practice"
                      value={filters.farmingStyle}
                      onChange={handleFilterChange}
                      options={[
                        { label: "🍀 100% Organic (Bio-inputs)", value: "Organic" },
                        { label: "🧪 Inorganic (Conventional Chemicals)", value: "Inorganic" },
                        { label: "🔄 Conventional Mix (Both)", value: "Both" }
                      ]}
                      placeholder="Select Farming Practice"
                    />
                  </div>
                </div>
              </div>

              {/* Intelligence panel */}
              <div className="md:col-span-2 lg:col-span-1">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 h-full">
                  <h3 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4"/> Intelligence Panel
                  </h3>
                  <div className="space-y-2">
                     <div className="flex items-center text-sm text-blue-700 dark:text-blue-300"><Calendar className="w-4 h-4 mr-2"/> Current Season: <strong className="ml-1">{season}</strong></div>
      <div className="flex items-center text-sm text-blue-700 dark:text-blue-300"><Zap className="w-4 h-4 mr-2"/> Enhanced AI with 105+ crops data.</div>
      <div className="pt-2 border-t border-blue-200 dark:border-blue-800 mt-2">
                      {weather ? (
                        <>
                          <div className="flex items-center text-sm font-semibold text-blue-800 dark:text-blue-200"><MapPin className="w-4 h-4 mr-2"/>Live Weather: {weather.name}</div>
            <div className="flex items-center text-sm text-blue-700 dark:text-blue-300"><Thermometer className="w-4 h-4 mr-2"/>{Math.round(weather.main.temp)}°C, feels like {Math.round(weather.main.feels_like)}°C</div>
            <div className="flex items-center text-sm text-blue-700 dark:text-blue-300"><Droplets className="w-4 h-4 mr-2"/>Humidity: {weather.main.humidity}%</div>
            <div className="flex items-center text-sm text-blue-700 dark:text-blue-300"><Wind className="w-4 h-4 mr-2"/>Wind: {weather.wind.speed} m/s</div>
                          {weatherAlerts.length > 0 && (
                            <div className="pt-3 border-t border-red-200 dark:border-red-800 mt-3 space-y-2">
                              <div className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                                <AlertTriangle size={14} className="text-red-500 animate-bounce" /> Active Alerts (Next 48h)
                              </div>
                              {weatherAlerts.map((alert, idx) => (
                                <div
                                  key={idx}
                                  className={`p-2.5 rounded-lg text-xs leading-relaxed ${
                                    alert.severity === 'high'
                                      ? 'bg-red-100 text-red-900 border border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900'
                                      : 'bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900'
                                  }`}
                                >
                                  {alert.msg}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : ( <div className="text-sm text-emerald-800 dark:text-emerald-200">{weatherError || "Select a district for live weather."}</div> )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* progress + actions */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="w-full md:w-1/2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recommendation Progress</p>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                    <div className="rb-gradient h-2.5 rounded-full transition-all duration-500" style={{ width: `${(filledFilters/totalFilters)*100}%` }}></div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {isFormComplete ? 'Ready for Enhanced AI Analysis!' : `${filledFilters} of ${totalFilters} required parameters selected.`}
                  </p>
                </div>
                <div className="flex-grow flex items-center gap-3 w-full md:w-auto">
                  <button
                    onClick={handleGetRecommendations} disabled={!isFormComplete}
                    className="w-full text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-300 disabled:bg-gray-400 disabled:dark:bg-gray-500 disabled:cursor-not-allowed rb-gradient hover:brightness-110 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <ChevronsRight size={20}/> Smart Crops Recommendations
                    </div>
                  </button>
                  <button onClick={handleClearFilters} className="p-3 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
                    <RefreshCcw size={20}/>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* summary metrics (new, subtle) */}
          {hasSearched && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-800 p-4 text-center">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Crops Found</div>
                <CountUp value={recommendations.length} className="text-3xl font-extrabold text-rb-gradient" duration={900}/>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-800 p-4 text-center">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Avg Smart Score</div>
                <CountUp
                  value={Math.round((recommendations.reduce((s,c)=>s+(c.smartScore||0),0)/(recommendations.length||1)))}
                  className="text-3xl font-extrabold text-rb-gradient"
                  duration={900}
                  suffix="/100"
                />
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-800 p-4 text-center">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Top Demand</div>
                <div className="text-xl font-bold text-gray-800 dark:text-gray-100">
                  {recommendations[0]?.marketDemand || "-"}
                </div>
              </div>
            </div>
          )}

          {/* results */}
          <div className="mt-12">
            {hasSearched && (
              <div className="bg-emerald-50/60 dark:bg-emerald-900/10 border-2 border-dashed border-emerald-200/70 dark:border-emerald-800 rounded-lg p-5 mb-8 text-center">
                <p className="text-emerald-900 dark:text-emerald-100">
                  For <strong className="font-semibold">{filters.district || '-'}</strong> with <strong className="font-semibold">{(filters.soilType || '-').toLowerCase()}</strong> soil and a <strong className="font-semibold">{filters.investmentBudget > 50000 ? 'high' : 'medium'} budget</strong>, we found <strong className="font-semibold">{recommendations.length}</strong> crops for <strong className="font-semibold">{season}</strong>.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-3 mb-6">
              {hasSearched && recommendations.length > 0 && (
                <>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="">Sort By</option>
                    <option value="risk">Risk (Low → High)</option>
                    <option value="water">Water (Low → High)</option>
                    <option value="profit">Profit (High → Low)</option>
                    <option value="smartScore">Smart Score (High → Low)</option>
                  </select>
                  <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)} className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="">All Risk Levels</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                  <select value={waterFilter} onChange={e => setWaterFilter(e.target.value)} className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="">All Water Efficiency</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Very High">Very High</option>
                  </select>
                  <button onClick={() => { setRiskFilter(""); setWaterFilter(""); setSortBy(""); }} className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600">Reset Filters</button>
                </>
              )}
            </div>

            {!hasSearched ? (
              <div className="text-center py-16 px-6 bg-white dark:bg-gray-800 rounded-lg shadow-md border-2 border-dashed border-gray-200 dark:border-gray-700">
                <Info className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500"/>
                <h3 className="mt-4 text-xl font-semibold text-gray-700 dark:text-gray-200">Your Enhanced Recommendations Await</h3>
                <p className="mt-2 text-gray-500 dark:text-gray-400">Complete all required parameters above for comprehensive AI-powered crop analysis.</p>
              </div>
            ) : displayed.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {displayed.map((crop, index) => (
                  <div
                    key={crop.id || crop.name}
                    className="bg-white dark:bg-gray-800 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col relative p-5"
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <span className="text-5xl">{crop.icon}</span>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                          {crop.name}
                          {crop.isLivePrice && (
                            <span className="inline-flex items-center text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-500 to-orange-500 text-white animate-pulse shadow-sm">
                              ⚡ LIVE MSP
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{crop.type} • {crop.growingDuration} months</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          Smart Score: <span className="font-bold text-rb-gradient">{crop.smartScore}</span>/100
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {crop.isLivePrice && (
                        <div className="flex items-center text-xs font-bold px-2 py-1 rounded-full text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/40 animate-pulse">
                          <Zap size={12} className="mr-1 fill-amber-500 text-amber-500"/> Live MSP Override
                        </div>
                      )}
                      <div className={`flex items-center text-xs font-semibold px-2 py-1 rounded-full ${crop.marketDemand === 'Very High' ? 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/40' : crop.marketDemand === 'High' ? 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/40' : crop.marketDemand === 'Medium' ? 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/40' : 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/40'}`}><TrendingUp size={12} className="mr-1"/>Market: {crop.marketDemand}</div>
                      <div className={`flex items-center text-xs font-semibold px-2 py-1 rounded-full ${crop.riskFactor === 'High' ? 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/40' : crop.riskFactor === 'Medium' ? 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/40' : 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/40'}`}><Shield size={12} className="mr-1"/>Risk: {crop.riskFactor}</div>
                      <div className={`flex items-center text-xs font-semibold px-2 py-1 rounded-full ${(crop.waterEfficiency || '').includes('Very High') ? 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/40' : (crop.waterEfficiency || '').includes('High') ? 'text-blue-600 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/40' : 'text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-900/40'}`}><Droplets size={12} className="mr-1"/>{crop.waterEfficiency} Water</div>
                    </div>
                    {/* Profit vs Investment bar */}
{/* Profit vs Investment bar */}
{/* Profit vs Investment visual bar */}
<div className="mb-4">
  {(() => {
    const price = parseInt((crop.marketPrice || "0").toString().replace(/[^0-9]/g, ""), 10) || 0;
    const revenue = crop.avgYield * price;
    const investment = crop.investment || 0;
    const profit = Math.max(0, revenue - investment);
    const total = Math.max(revenue, investment);
    const investmentPercent = Math.min(100, (investment / total) * 100);
    const profitPercent = 100 - investmentPercent;

    return (
      <div className="space-y-2">
        {/* Combined Bar */}
        <div className="relative w-full h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          {/* Profit (left side) */}
          <div
            className="absolute left-0 top-0 h-full bg-emerald-500 dark:bg-emerald-600 transition-all duration-700 ease-out"
            style={{ width: `${profitPercent}%` }}
          ></div>

          {/* Investment (fills from right) */}
          <div
            className="absolute right-0 top-0 h-full bg-red-500 dark:bg-red-600 transition-all duration-700 ease-out"
            style={{ width: `${investmentPercent}%` }}
          ></div>
        </div>

        {/* Labels */}
        <div className="flex justify-between text-xs font-medium text-gray-700 dark:text-gray-300">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-600"></span>
            Profit: ₹{profit.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 dark:bg-blue-600"></span>
            Investment: ₹{investment.toLocaleString()}
          </span>
        </div>
      </div>
    );
  })()}
</div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-md p-3 mb-4">
                      <h4 className="font-semibold text-sm mb-2 text-gray-700 dark:text-gray-300">Weather Forecast</h4>
                      <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400 mb-2"><strong>Planting:</strong><span>{crop.plantingWeather.avg}</span></div>
                      <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400"><strong>Harvest:</strong><span>{crop.harvestWeather.avg}</span></div>
                    </div>

                    <button onClick={() => setSelectedCrop(crop)} className="w-full text-center rb-gradient text-white font-semibold py-2 px-4 rounded-lg hover:brightness-110 transition-colors flex items-center justify-center gap-2">
                      View Details <Eye size={16}/>
                    </button>

                    {index < 3 && (
                      <div className="absolute top-2 right-2 rb-gradient text-white text-xs px-2.5 py-1 rounded-full font-bold z-10 shadow-lg">TOP #{index + 1}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              hasSearched && (
                <div className="text-center py-16 px-6 bg-white dark:bg-gray-800 rounded-lg shadow-md border-2 border-dashed border-gray-200 dark:border-gray-700">
                  <AlertTriangle className="w-12 h-12 mx-auto text-yellow-500"/>
                  <h3 className="mt-4 text-xl font-semibold text-gray-700 dark:text-gray-200">No Suitable Crops Found</h3>
                  <p className="mt-2 text-gray-500 dark:text-gray-400">Based on your specific criteria, no ideal crops were identified. Try adjusting your parameters.</p>
                </div>
              )
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

