// 🌾 Raitu Mitra — Smart Weather Dashboard (Compact Card + Smart Alerts + Chart + Map + Voice)

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Thermometer,
  Wind,
  Droplet,
  CloudRain,
  MapPin,
  Mic,
  MicOff,
  Settings,
  LocateFixed,
  LineChart as LineChartIcon,
  Compass,
  Sun,
  Flame,
  Activity,
  Layers,
  Volume2
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import indiaDistricts from "../data/indiaDistricts.json";
import {
  saveWeatherCache,
  getWeatherCache,
} from "../utils/weatherCache";

/* ---------------------------
   Utilities & LocalStorage Hook
---------------------------- */
const WEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

const useLocalStorage = (key, initial) => {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch { }
  }, [key, value]);
  return [value, setValue];
};

if (!WEATHER_API_KEY) {
  console.error("❌ OpenWeather API key missing. Check your .env file");
}

/* ---------------------------
   Geocoding (state + district → lat/lon)
---------------------------- */
const geocodeLocation = async (city, state) => {
  try {
    const query = `${city}, ${state}, India`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data && data[0]) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
};

/* ---------------------------
   Weather Icon (Emoji)
---------------------------- */
const getWeatherEmoji = (condition = "") => {
  const c = condition.toLowerCase();
  if (c.includes("thunder")) return "⛈️";
  if (c.includes("rain")) return "🌧️";
  if (c.includes("drizzle")) return "🌦️";
  if (c.includes("snow")) return "❄️";
  if (c.includes("clear")) return "☀️";
  if (c.includes("cloud")) return "☁️";
  if (c.includes("mist") || c.includes("fog") || c.includes("haze")) return "🌫️";
  if (c.includes("dust") || c.includes("sand")) return "🌪️";
  return "🌤️";
};

/* ---------------------------
   Custom Map Marker
---------------------------- */
const customIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [35, 35],
  iconAnchor: [17, 34],
  popupAnchor: [0, -30],
});

/* ---------------------------
   Auto Center Helper
---------------------------- */
function MapAutoCenter({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.flyTo([coords.lat, coords.lon], 9, { duration: 1.2 });
    }
  }, [coords, map]);
  return null;
}

/* ---------------------------
   Dynamic Ambient Atmospheric Backgrounds
---------------------------- */
function RainBackground() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationId;

    const resizeCanvas = () => {
      if (canvas) {
        canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
        canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
      }
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const raindrops = [];
    const maxDrops = 75;
    for (let i = 0; i < maxDrops; i++) {
      raindrops.push({
        x: Math.random() * (canvas.width || window.innerWidth),
        y: Math.random() * (canvas.height || window.innerHeight),
        len: Math.random() * 15 + 8,
        yspeed: Math.random() * 8 + 10,
        opacity: Math.random() * 0.25 + 0.1,
      });
    }

    const draw = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < raindrops.length; i++) {
        const r = raindrops[i];
        ctx.beginPath();
        ctx.strokeStyle = `rgba(180, 220, 255, ${r.opacity})`;
        ctx.lineWidth = 1.2;
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(r.x + r.yspeed * 0.04, r.y + r.len);
        ctx.stroke();

        r.y += r.yspeed;
        r.x += r.yspeed * 0.04;
        if (r.y > canvas.height) {
          r.y = -r.len;
          r.x = Math.random() * canvas.width;
        }
      }
      animationId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none opacity-50 z-0 rounded-2xl" />;
}

function SunRaysBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 rounded-2xl">
      <div
        className="absolute top-[-25%] left-[-25%] w-[150%] h-[150%] opacity-[0.035] dark:opacity-[0.05]"
        style={{
          background: "repeating-conic-gradient(from 0deg, #fbbf24 0deg 12deg, transparent 12deg 24deg)",
          animation: "spinSlow 160s linear infinite",
        }}
      />
      <style>{`
        @keyframes spinSlow {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function CloudBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-[0.06] rounded-2xl">
      <div className="absolute top-10 w-80 h-28 bg-white/40 blur-3xl rounded-full animate-drift-slow" />
      <div className="absolute top-36 w-96 h-36 bg-white/20 blur-3xl rounded-full animate-drift-medium" />
      <style>{`
        .animate-drift-slow {
          animation: driftSlow 55s linear infinite;
        }
        .animate-drift-medium {
          animation: driftMedium 35s linear infinite;
        }
        @keyframes driftSlow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        @keyframes driftMedium {
          0% { transform: translateX(200%); }
          100% { transform: translateX(-200%); }
        }
      `}</style>
    </div>
  );
}

function MistBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.06] bg-radial-mist animate-pulse-slow rounded-2xl">
      <style>{`
        .bg-radial-mist {
          background: radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 75%);
        }
        .animate-pulse-slow {
          animation: pulseSlow 9s ease-in-out infinite;
        }
        @keyframes pulseSlow {
          0%, 100% { opacity: 0.03; }
          50% { opacity: 0.12; }
        }
      `}</style>
    </div>
  );
}

/* ---------------------------
   Vernacular TTS Translations Mapping
---------------------------- */
const voiceTranslations = {
  en: {
    title: "Weather Report for",
    feelsLike: "Feels like",
    humidity: "humidity",
    windSpeed: "wind speed at",
    metersPerSecond: "meters per second",
    favorable: "Weather is favorable for crops today.",
    highTemp: "High temperature alert. Please irrigate your crops in the morning or evening.",
    highHumidity: "High humidity alert. Monitor closely for potential fungal infections.",
    rainAlert: "Heavy rain forecast. Postpone spraying fertilizers and pesticides.",
    strongWind: "Strong wind warning. Secure tall or fragile plants."
  },
  te: {
    title: "వాతావరణ సమాచారం:",
    feelsLike: "వాతావరణం ఎలా ఉందంటే",
    humidity: "తేమ శాతం",
    windSpeed: "గాలి వేగం సెకనుకు",
    metersPerSecond: "మీటర్లు",
    favorable: "ఈరోజు వాతావరణం పంటలకు అనుకూలంగా ఉంది.",
    highTemp: "అధిక ఉష్ణోగ్రత హెచ్చరిక. పంటలకు ఉదయం లేదా సాయంత్రం వేళల్లో నీరు పెట్టండి.",
    highHumidity: "అధిక తేమ హెచ్చరిక. శిలీంధ్ర వ్యాధుల (ఫంగస్) వచ్చే అవకాశం ఉంది, పంటలను జాగ్రత్తగా గమనించండి.",
    rainAlert: "భారీ వర్ష సూచన. ఎరువులు మరియు పురుగుమందుల పిచికారీని వాయిదా వేయండి.",
    strongWind: "ఈదురు గాలుల హెచ్చరిక. బలహీనమైన మరియు ఎత్తైన మొక్కలను రక్షించండి."
  },
  hi: {
    title: "मौसम की जानकारी:",
    feelsLike: "महसूस होने वाला तापमान",
    humidity: "नमी",
    windSpeed: "हवा की गति",
    metersPerSecond: "मीटर प्रति सेकंड",
    favorable: "आज का मौसम फसलों के लिए अनुकूल है।",
    highTemp: "उच्च तापमान की चेतावनी। कृपया सुबह या शाम को फसलों की सिंचाई करें।",
    highHumidity: "उच्च आर्द्रता (नमी) की चेतावनी। फंगल संक्रमण के खतरे की निगरानी करें।",
    rainAlert: "भारी बारिश का अनुमान। आज उर्वरकों और कीटनाशकों के छिड़काव से बचें।",
    strongWind: "तेज़ हवाओं की चेतावनी। ऊँचे या नाज़ुक पौधों को सुरक्षा प्रदान करें।"
  }
};

/* ---------------------------
   Main Weather Component
---------------------------- */
export default function WeatherDashboard() {
  const [loc, setLoc] = useLocalStorage("rm.location", {
    state: "Telangana",
    city: "Hyderabad",
  });
  const [coords, setCoords] = useLocalStorage("rm.coords", null);
  const [unit, setUnit] = useLocalStorage("rm.unit", "C");
  const [voiceOn, setVoiceOn] = useLocalStorage("rm.voice", true);
  const [voiceLang, setVoiceLang] = useLocalStorage("rm.voiceLang", "en");
  const [mapLayer, setMapLayer] = useState("none"); // "none", "rain", "clouds", "temp"
  const [chartMetric, setChartMetric] = useState("temp"); // "temp", "humidity", "rain", "wind"
  const [data, setData] = useState({ current: null, forecast: null });
  const [status, setStatus] = useState("idle");

  /* ---------------------------
     Speech Synthesis Engine
  ---------------------------- */
  const speak = useCallback(
    (msg, langCode) => {
      if (!voiceOn || typeof window === "undefined") return;
      if ("speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(msg);
        const target = langCode || voiceLang;

        if (target === "te") u.lang = "te-IN";
        else if (target === "hi") u.lang = "hi-IN";
        else u.lang = "en-IN";

        // Attempt locale voice selection
        const voices = window.speechSynthesis.getVoices();
        const localeVoice = voices.find((v) => v.lang.startsWith(target));
        if (localeVoice) u.voice = localeVoice;

        u.rate = 0.85; // slower speech for clear auditory parsing in farms
        u.pitch = 1.0;

        try {
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(u);
        } catch { }
      }
    },
    [voiceOn, voiceLang]
  );

  /* ---------------------------
     Derived Agricultural Indicators
  ---------------------------- */
  const rainProbability = useMemo(() => {
    if (!data.forecast?.list) return 0;
    const items = data.forecast.list.slice(0, 8);
    const rainyPoints = items.filter((i) =>
      i.weather?.[0]?.main?.toLowerCase().includes("rain") || i.pop > 0.3
    ).length;
    return Math.round((rainyPoints / 8) * 100);
  }, [data]);

  const dewPoint = useMemo(() => {
    if (!data.current) return 0;
    const t = data.current.main.temp;
    const rh = data.current.main.humidity;
    const a = 17.27;
    const b = 237.7;
    const alpha = (a * t) / (b + t) + Math.log(rh / 100);
    const dp = (b * alpha) / (a - alpha);
    return isNaN(dp) ? t.toFixed(1) : dp.toFixed(1);
  }, [data]);

  const evapotranspiration = useMemo(() => {
    if (!data.current) return { rate: "0.0", level: "Low", advice: "" };
    const t = data.current.main.temp;
    const rh = data.current.main.humidity;
    const ws = data.current.wind.speed;

    // Simplified Penman-Monteith potential daily depletion
    let et = 1.0;
    et += t * 0.09;
    et += ws * 0.16;
    et -= (rh / 100) * 1.6;
    et = Math.max(0.4, Math.min(9.8, et));

    let level = "Low";
    let advice = "Healthy atmospheric retention. Normal irrigation schedule applies.";
    if (et > 6.0) {
      level = "Critical High";
      advice = "Extreme rapid water depletion. Increase watering depth by 35% and apply organic mulch.";
    } else if (et > 4.0) {
      level = "Moderate-High";
      advice = "Accelerated crop water loss. Increase soil coverage or schedule lighter, frequent irrigation.";
    }

    return { rate: et.toFixed(1), level, advice };
  }, [data]);

  const soilMoisture = useMemo(() => {
    if (!data.current) return { moisture: 60, status: "Optimal", advice: "", color: "" };
    const t = data.current.main.temp;
    const rh = data.current.main.humidity;
    const rProb = rainProbability;

    let sm = 62;
    // Temperature dehydration effect
    if (t > 30) sm -= (t - 30) * 1.4;
    else if (t < 14) sm += (14 - t) * 0.4;

    // Relative humidity drying effect
    if (rh < 45) sm -= (45 - rh) * 0.28;
    else if (rh > 80) sm += (rh - 80) * 0.15;

    // Forecast rain replenishment
    if (rProb > 0) sm += rProb * 0.3;

    sm = Math.max(10, Math.min(95, Math.round(sm)));

    let status = "Optimal";
    let advice = "Balanced soil hydration. Soil condition is superb for nutrient absorption.";
    let color = "text-emerald-500 border-emerald-500/20 bg-emerald-500/5";

    if (sm < 35) {
      status = "Critical Dryness";
      advice = "Water stress detected! Irrigate immediately to protect crops from cell collapse.";
      color = "text-red-500 border-red-500/20 bg-red-500/5";
    } else if (sm < 50) {
      status = "Moderate Dryness";
      advice = "Moisture depletion. Schedule a thorough irrigation cycle within 24 hours.";
      color = "text-amber-500 border-amber-500/20 bg-amber-500/5";
    } else if (sm > 85) {
      status = "Saturated";
      advice = "Waterlogged soil warning. Suspend irrigation and verify field drains are open.";
      color = "text-cyan-500 border-cyan-500/20 bg-cyan-500/5";
    }

    return { moisture: sm, status, advice, color };
  }, [data, rainProbability]);

  /* ---------------------------
     Unified Speech Synthesizer Announcement
  ---------------------------- */
  const announceWeatherReport = useCallback(
    (current, targetLangCode) => {
      if (!current) return;
      const t = current.main.temp;
      const desc = current.weather[0].description;
      const hum = current.main.humidity;
      const ws = current.wind.speed;
      const name = current.name;
      const activeLang = targetLangCode || voiceLang;
      const dict = voiceTranslations[activeLang] || voiceTranslations.en;

      let msg = "";
      if (activeLang === "te") {
        msg = `${name} లో ప్రస్తుత వాతావరణం: ${Math.round(t)} డిగ్రీలు, మరియు ${desc}. ${dict.feelsLike} ${Math.round(current.main.feels_like)} డిగ్రీలగా ఉంది. తేమ శాతం ${hum} గా ఉంది. `;
      } else if (activeLang === "hi") {
        msg = `${name} में वर्तमान मौसम: ${Math.round(t)} डिग्री और ${desc} है। ${dict.feelsLike} ${Math.round(current.main.feels_like)} डिग्री है। आर्द्रता ${hum} प्रतिशत है। `;
      } else {
        msg = `Current weather in ${name}: it is ${Math.round(t)} degrees celsius and ${desc}. Feels like ${Math.round(current.main.feels_like)} degrees. Humidity is ${hum} percent. `;
      }

      // Add dynamic agricultural alert based on severity
      if (t > 35) msg += dict.highTemp;
      else if (hum > 85) msg += dict.highHumidity;
      else if (rainProbability > 60) msg += dict.rainAlert;
      else if (ws > 10) msg += dict.strongWind;
      else msg += dict.favorable;

      speak(msg, activeLang);
    },
    [speak, voiceLang, rainProbability]
  );

  /* ---------------------------
     Fetch Weather Data (Unified API Handler)
  ---------------------------- */
  const fetchWeatherByCoords = useCallback(
    async (lat, lon, targetLang = voiceLang) => {
      if (!lat || !lon) return;
      setStatus("loading");

      if (navigator.onLine) {
        try {
          const [cur, fc] = await Promise.all([
            axios.get(
              `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_API_KEY}`
            ),
            axios.get(
              `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_API_KEY}`
            ),
          ]);

          const payload = {
            coords: { lat, lon },
            current: cur.data,
            forecast: fc.data,
          };

          setCoords({ lat, lon });
          setData({ current: cur.data, forecast: fc.data });
          setStatus("success");

          // Save Offline Cache
          saveWeatherCache(lat, lon, payload);

          // Voice synthesis announcement
          announceWeatherReport(cur.data, targetLang);
          return;
        } catch {
          // Fall through to cache in case of API failure
        }
      }

      // Offline Cache Lookup
      const cached = getWeatherCache(lat, lon);
      if (cached) {
        setCoords(cached.data.coords);
        setData({
          current: cached.data.current,
          forecast: cached.data.forecast,
        });
        setStatus("offline");
        speak("Offline mode. Loading saved agricultural forecast data.", targetLang);
      } else {
        setStatus("error");
        speak("Weather services offline. Connect to the internet.", targetLang);
      }
    },
    [speak, voiceLang, announceWeatherReport]
  );

  /* ---------------------------
     Auto Trigger on Location Change
  ---------------------------- */
  useEffect(() => {
    if (!loc.state || !loc.city) return;
    const timer = setTimeout(async () => {
      const newCoords = await geocodeLocation(loc.city, loc.state);
      if (newCoords) {
        fetchWeatherByCoords(newCoords.lat, newCoords.lon, voiceLang);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [loc.state, loc.city]);

  /* ---------------------------
     Manual Voice Trigger
  ---------------------------- */
  const handleVoiceBroadcast = () => {
    if (data.current) {
      announceWeatherReport(data.current, voiceLang);
    }
  };

  /* ---------------------------
     Voice Language Switcher
  ---------------------------- */
  const handleLangChange = (newLang) => {
    setVoiceLang(newLang);
    if (data.current) {
      announceWeatherReport(data.current, newLang);
    }
  };

  /* ---------------------------
     Use GPS Location
  ---------------------------- */
  const handleUseMyLocation = async () => {
    if (!navigator.geolocation) {
      alert("GPS Geolocation is not supported by your browser.");
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude, voiceLang);
      },
      () => setStatus("error")
    );
  };

  /* ---------------------------
     Smart Crop Alerts Logic
  ---------------------------- */
  const alerts = useMemo(() => {
    if (!data.current) return [];
    const t = data.current.main.temp;
    const h = data.current.main.humidity;
    const w = data.current.wind.speed;
    const r = rainProbability;
    const a = [];

    if (t > 36) {
      a.push({
        msg: "🔥 Extreme Heat Warning: Risk of solar flower drop & heat stress. Boost morning irrigation volume.",
        level: "high",
      });
    }
    if (h > 85) {
      a.push({
        msg: "🍄 Fungal Spore Hazard: Elevated relative humidity (>85%) facilitates powdery mildew. Check leaf undersides.",
        level: "medium",
      });
    }
    if (r > 65) {
      a.push({
        msg: "🌧️ Heavy Precipitate Forecast: Fertilizer wash-out risk. Suspend foliar spray, nitrogen application, and pesticide coating.",
        level: "high",
      });
    }
    if (w > 11) {
      a.push({
        msg: "🌪️ Gale Wind Threat: Heavy wind speeds will snap tall stalks (Sugarcane, Maize). Reinforce support systems.",
        level: "medium",
      });
    }

    if (!a.length) {
      a.push({
        msg: "🌿 Ideal Farming Conditions: Balanced parameters are optimal for planting, seeding, and crop nourishment.",
        level: "low",
      });
    }
    return a;
  }, [data, rainProbability]);

  // Weather-Adaptive Theme Derivation
  const weatherTheme = useMemo(() => {
    if (!data.current) return getWeatherTheme("default");
    return getWeatherTheme(data.current.weather[0].main);
  }, [data]);

  const tempDisplay = (tC) =>
    unit === "C" ? Math.round(tC) : Math.round((tC * 9) / 5 + 32);

  const states = Object.keys(indiaDistricts);
  const districts = indiaDistricts[loc.state] || [];

  return (
    <div className={`min-h-screen bg-gradient-to-b ${weatherTheme.bg} text-white p-6 space-y-8 relative overflow-hidden transition-all duration-700`}>

      {/* Immersive Atmospheric Canvas Backdrop */}
      {weatherTheme.type === "rain" && <RainBackground />}
      {weatherTheme.type === "clear" && <SunRaysBackground />}
      {weatherTheme.type === "clouds" && <CloudBackground />}
      {weatherTheme.type === "mist" && <MistBackground />}

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">

        {/* ⚙️ Glassmorphic Control Settings Bar */}
        <div className="flex flex-wrap justify-between items-center gap-4 bg-white/[0.04] dark:bg-black/30 backdrop-blur-2xl p-4 rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
          <div className="flex items-center gap-2 font-bold text-sm tracking-wide text-white/90">
            <Settings size={18} className="animate-spin-slow text-emerald-400" /> SYSTEM SETTINGS
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Multilingual Selector */}
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg p-1">
              <span className="text-[11px] text-white/50 font-semibold px-2 uppercase">Audio Language</span>
              <button
                onClick={() => handleLangChange("te")}
                className={`text-xs px-2.5 py-1 rounded-md transition font-semibold ${voiceLang === "te" ? "bg-emerald-500 text-white shadow" : "text-white/60 hover:text-white"
                  }`}
              >
                తెలుగు
              </button>
              <button
                onClick={() => handleLangChange("hi")}
                className={`text-xs px-2.5 py-1 rounded-md transition font-semibold ${voiceLang === "hi" ? "bg-emerald-500 text-white shadow" : "text-white/60 hover:text-white"
                  }`}
              >
                हिन्दी
              </button>
              <button
                onClick={() => handleLangChange("en")}
                className={`text-xs px-2.5 py-1 rounded-md transition font-semibold ${voiceLang === "en" ? "bg-emerald-500 text-white shadow" : "text-white/60 hover:text-white"
                  }`}
              >
                EN
              </button>
            </div>

            {/* Fahrenheit/Celsius Switcher */}
            <button
              onClick={() => setUnit(unit === "C" ? "F" : "C")}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-bold tracking-wider transition-all duration-200"
            >
              °{unit}
            </button>

            {/* Voice Audio Announcer Toggle */}
            <button
              onClick={() => setVoiceOn(!voiceOn)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all ${voiceOn
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                  : "bg-white/5 border-white/10 text-white/40 hover:text-white/70"
                }`}
            >
              {voiceOn ? <Mic size={14} className="animate-pulse" /> : <MicOff size={14} />}
              SPEECH {voiceOn ? "ON" : "OFF"}
            </button>

            {/* Manual Announcement Button */}
            {data.current && (
              <button
                onClick={handleVoiceBroadcast}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 transition"
                title="Broadcast Weather Auditory Report"
              >
                <Volume2 size={15} className="text-emerald-400" />
              </button>
            )}
          </div>
        </div>

        {/* 📍 Regional Geolocation Input Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative group">
            <select
              value={loc.state}
              onChange={(e) =>
                setLoc({
                  state: e.target.value,
                  city: indiaDistricts[e.target.value]?.[0] || "",
                })
              }
              className="w-full rounded-xl px-4 py-3.5 border border-white/10 bg-[#0f1216]/50 dark:bg-black/40 backdrop-blur-md text-white/90 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all appearance-none cursor-pointer"
            >
              {states.map((st) => (
                <option key={st} value={st} className="bg-slate-900 text-white">
                  {st}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/30">▼</div>
          </div>

          <div className="relative">
            <select
              value={loc.city}
              onChange={(e) => setLoc((p) => ({ ...p, city: e.target.value }))}
              className="w-full rounded-xl px-4 py-3.5 border border-white/10 bg-[#0f1216]/50 dark:bg-black/40 backdrop-blur-md text-white/90 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all appearance-none cursor-pointer"
            >
              {districts.map((d) => (
                <option key={d} value={d} className="bg-slate-900 text-white">
                  {d}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/30">▼</div>
          </div>

          <button
            onClick={handleUseMyLocation}
            className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 border border-emerald-400/20 shadow-lg font-bold text-sm tracking-wide active:scale-[0.98] transition-all"
          >
            <LocateFixed size={18} className="animate-pulse" /> USE MY GPS LOCATION
          </button>
        </div>

        {/* 🗺️ Leaflet Meteorological Map Overlay */}
        {coords && (
          <div className="rounded-2xl overflow-hidden border border-white/15 shadow-2xl relative group">
            {/* Dynamic Map Layers Overlay Selector Bar */}
            <div className="absolute top-4 right-4 z-[1000] flex items-center gap-1 bg-[#0d1015]/95 backdrop-blur-md p-1 border border-white/10 rounded-xl shadow-lg">
              <span className="text-[10px] uppercase font-bold text-white/40 px-2.5">Map Radar Overlay</span>
              <button
                onClick={() => setMapLayer("none")}
                className={`text-[11px] px-2.5 py-1.5 rounded-lg transition font-bold ${mapLayer === "none" ? "bg-emerald-500 text-white shadow" : "text-white/60 hover:text-white"
                  }`}
              >
                Map
              </button>
              <button
                onClick={() => setMapLayer("rain")}
                className={`text-[11px] px-2.5 py-1.5 rounded-lg transition font-bold flex items-center gap-1 ${mapLayer === "rain" ? "bg-emerald-500 text-white shadow" : "text-white/60 hover:text-white"
                  }`}
              >
                <CloudRain size={12} /> Rain Radar
              </button>
              <button
                onClick={() => setMapLayer("clouds")}
                className={`text-[11px] px-2.5 py-1.5 rounded-lg transition font-bold flex items-center gap-1 ${mapLayer === "clouds" ? "bg-emerald-500 text-white shadow" : "text-white/60 hover:text-white"
                  }`}
              >
                <Layers size={12} /> Clouds (Sat)
              </button>
              <button
                onClick={() => setMapLayer("temp")}
                className={`text-[11px] px-2.5 py-1.5 rounded-lg transition font-bold flex items-center gap-1 ${mapLayer === "temp" ? "bg-emerald-500 text-white shadow" : "text-white/60 hover:text-white"
                  }`}
              >
                <Thermometer size={12} /> Temp Map
              </button>
            </div>

            <MapContainer
              center={[coords.lat, coords.lon]}
              zoom={10}
              style={{ height: "340px", width: "100%" }}
              scrollWheelZoom={true}
              className="z-10"
            >
              <MapAutoCenter coords={coords} />
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {/* Conditional OpenWeather Map Tile Layer Overlays */}
              {mapLayer === "rain" && (
                <TileLayer
                  url={`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${WEATHER_API_KEY}`}
                  opacity={0.7}
                />
              )}
              {mapLayer === "clouds" && (
                <TileLayer
                  url={`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${WEATHER_API_KEY}`}
                  opacity={0.6}
                />
              )}
              {mapLayer === "temp" && (
                <TileLayer
                  url={`https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${WEATHER_API_KEY}`}
                  opacity={0.55}
                />
              )}

              <Marker position={[coords.lat, coords.lon]} icon={customIcon}>
                <Popup>
                  <div className="text-slate-900 font-semibold p-1">
                    <h4 className="text-sm font-extrabold">{loc.city}</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Lat: {coords.lat.toFixed(3)}, Lon: {coords.lon.toFixed(3)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          </div>
        )}

        {status === "offline" && (
          <div className="px-4 py-3.5 rounded-xl border border-yellow-500/20 bg-yellow-500/10 backdrop-blur-md text-yellow-300 text-sm font-semibold flex items-center gap-2 animate-pulse">
            📴 OFFLINE MODE — Serving cached meteorological payloads. Some Live Radar Map streams might remain unavailable.
          </div>
        )}

        {/* 🌦️ Smart Dashboard Workspace */}
        {(status === "success" || status === "offline") && data.current && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Card 1: Main Weather Card */}
              <motion.div
                whileHover={{ scale: 1.005 }}
                className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] dark:bg-black/30 backdrop-blur-xl p-6 sm:p-7 shadow-[0_8px_32px_rgba(0,0,0,0.15)] flex flex-col justify-between"
              >
                <div>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/20">
                        <MapPin className="text-emerald-400" size={24} />
                      </div>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide flex items-center gap-1.5">
                          {getWeatherEmoji(data.current.weather[0].main)} {data.current.name}, {data.current.sys.country}
                        </h2>
                        <p className="text-xs text-white/50 font-medium mt-0.5">
                          Checked at {new Date().toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <h3 className="text-5xl font-black text-emerald-300 leading-none">
                        {tempDisplay(data.current.main.temp)}°{unit}
                      </h3>
                      <p className="capitalize text-sm text-white/70 font-semibold mt-1">
                        {data.current.weather[0].description}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-white/10 my-6" />

                  {/* Stat Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-sm">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                      <Thermometer size={20} className="text-red-400" />
                      <div>
                        <span className="block text-[10px] text-white/40 uppercase font-black">Feels Like</span>
                        <span className="font-bold text-white/90">{tempDisplay(data.current.main.feels_like)}°{unit}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                      <Wind size={20} className="text-blue-400" />
                      <div>
                        <span className="block text-[10px] text-white/40 uppercase font-black">Wind Speed</span>
                        <span className="font-bold text-white/90">{data.current.wind.speed} m/s</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                      <Droplet size={20} className="text-cyan-400" />
                      <div>
                        <span className="block text-[10px] text-white/40 uppercase font-black">Humidity</span>
                        <span className="font-bold text-white/90">{data.current.main.humidity}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                      <Activity size={20} className="text-indigo-400" />
                      <div>
                        <span className="block text-[10px] text-white/40 uppercase font-black">Pressure</span>
                        <span className="font-bold text-white/90">{data.current.main.pressure} hPa</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/5 text-xs text-white/40 font-bold">
                  <div className="flex items-center gap-1.5">
                    🌅 Sunrise: {new Date(data.current.sys.sunrise * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="flex items-center gap-1.5">
                    🌇 Sunset: {new Date(data.current.sys.sunset * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </motion.div>

              {/* Card 2: Interactive Wind Direction Compass */}
              <motion.div
                whileHover={{ scale: 1.005 }}
                className="rounded-2xl border border-white/10 bg-white/[0.03] dark:bg-black/30 backdrop-blur-xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.15)] flex flex-col justify-between items-center text-center"
              >
                <div className="w-full">
                  <h3 className="text-sm font-black tracking-widest text-white/60 uppercase flex items-center justify-center gap-2 mb-4">
                    <Compass size={16} className="text-emerald-400" /> WIND DIRECTION COMPASS
                  </h3>

                  {/* Dynamic CSS Rotating Needle Dial */}
                  <div className="relative w-36 h-36 mx-auto rounded-full border-2 border-white/15 bg-white/5 shadow-inner flex items-center justify-center">
                    {/* Compass Cardinals */}
                    <div className="absolute top-1 text-[10px] font-black text-white/40">N</div>
                    <div className="absolute right-1.5 text-[10px] font-black text-white/40">E</div>
                    <div className="absolute bottom-0.5 text-[10px] font-black text-white/40">S</div>
                    <div className="absolute left-1.5 text-[10px] font-black text-white/40">W</div>

                    {/* Center Rotating Needle */}
                    <div
                      className="absolute w-1.5 h-28 flex flex-col justify-between items-center transition-all duration-1000 ease-out"
                      style={{ transform: `rotate(${data.current.wind.deg || 0}deg)` }}
                    >
                      <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[20px] border-b-red-500" />
                      <div className="w-2 h-2 rounded-full bg-emerald-400 border border-black/40 z-20" />
                      <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[20px] border-t-white/30" />
                    </div>
                  </div>
                </div>

                <div className="mt-4 w-full">
                  <div className="text-lg font-bold text-white/90">
                    Heading: {data.current.wind.deg || 0}°
                  </div>
                  <p className="text-xs text-white/40 mt-1 font-medium px-4">
                    Wind vectors are currently coming from the direction of {data.current.wind.deg > 337.5 || data.current.wind.deg <= 22.5 ? "North" :
                      data.current.wind.deg > 22.5 && data.current.wind.deg <= 67.5 ? "North-East" :
                        data.current.wind.deg > 67.5 && data.current.wind.deg <= 112.5 ? "East" :
                          data.current.wind.deg > 112.5 && data.current.wind.deg <= 157.5 ? "South-East" :
                            data.current.wind.deg > 157.5 && data.current.wind.deg <= 202.5 ? "South" :
                              data.current.wind.deg > 202.5 && data.current.wind.deg <= 247.5 ? "South-West" :
                                data.current.wind.deg > 247.5 && data.current.wind.deg <= 292.5 ? "West" : "North-West"}.
                  </p>
                </div>
              </motion.div>

            </div>

            {/* 🛡️ Advanced Agro-Meteorological Metrics Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

              {/* Metric 1: Soil Moisture Estimation Gauge */}
              <motion.div
                whileHover={{ scale: 1.005 }}
                className="rounded-2xl border border-white/10 bg-white/[0.03] dark:bg-black/30 backdrop-blur-xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.15)] flex flex-col justify-between"
              >
                <div>
                  <h4 className="text-xs font-black tracking-widest text-white/50 uppercase mb-4 flex items-center gap-2">
                    <Droplet size={15} className="text-emerald-400" /> SOIL MOISTURE GAUGE (ESTIMATED)
                  </h4>

                  <div className="flex items-center gap-6">
                    {/* SVG Radial Meter */}
                    <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="40" cy="40" r="32" className="stroke-white/10" strokeWidth="6" fill="transparent" />
                        <circle
                          cx="40" cy="40" r="32"
                          className="stroke-emerald-400 transition-all duration-1000"
                          strokeWidth="6" fill="transparent"
                          strokeDasharray={2 * Math.PI * 32}
                          strokeDashoffset={2 * Math.PI * 32 * (1 - soilMoisture.moisture / 100)}
                        />
                      </svg>
                      <span className="absolute text-sm font-extrabold text-white">{soilMoisture.moisture}%</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-black uppercase text-white/40 block">Soil Status</span>
                      <span className="text-base font-extrabold text-white">{soilMoisture.status}</span>
                      <p className="text-xs text-white/50 mt-1 font-medium leading-relaxed">
                        Evaluated from humidity index, direct rain levels, and atmospheric sun exposure.
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`mt-5 p-3.5 rounded-xl border border-dashed text-xs font-medium leading-relaxed ${soilMoisture.color}`}>
                  {soilMoisture.advice}
                </div>
              </motion.div>

              {/* Metric 2: Dew Point / Mildew Indicator */}
              <motion.div
                whileHover={{ scale: 1.005 }}
                className="rounded-2xl border border-white/10 bg-white/[0.03] dark:bg-black/30 backdrop-blur-xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.15)] flex flex-col justify-between"
              >
                <div>
                  <h4 className="text-xs font-black tracking-widest text-white/50 uppercase mb-4 flex items-center gap-2">
                    <Sun size={15} className="text-emerald-400" /> DEW POINT & MILDEW ADVISORY
                  </h4>

                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="block text-[10px] text-white/40 uppercase font-black">Dew Point Temp</span>
                      <div className="text-3xl font-black text-emerald-300 mt-1">{dewPoint}°{unit}</div>
                      <p className="text-xs text-white/50 mt-2 font-medium leading-relaxed">
                        At this temperature, atmospheric water vapor will condense into direct dew droplets on leaves.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center shrink-0">
                      <span className="text-[9px] font-black uppercase text-white/40 block">Mildew Risk</span>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full inline-block mt-2 ${data.current.main.humidity > 80 ? "bg-red-500/20 text-red-300 border border-red-500/20" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/20"
                        }`}>
                        {data.current.main.humidity > 80 ? "High" : "Low"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 p-3.5 rounded-xl border border-white/5 bg-white/5 text-xs text-white/60 font-semibold leading-relaxed">
                  {data.current.main.humidity > 80
                    ? "⚠️ Damp surfaces will accelerate fungal spores. Keep fields aerated and observe lower stems."
                    : "🌿 Safe moisture threshold. Fungal infestation risks are presently low."}
                </div>
              </motion.div>

              {/* Metric 3: Evapotranspiration Moisture Depletion */}
              <motion.div
                whileHover={{ scale: 1.005 }}
                className="rounded-2xl border border-white/10 bg-white/[0.03] dark:bg-black/30 backdrop-blur-xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.15)] flex flex-col justify-between"
              >
                <div>
                  <h4 className="text-xs font-black tracking-widest text-white/50 uppercase mb-4 flex items-center gap-2">
                    <Flame size={15} className="text-emerald-400" /> DAILY EVAPOTRANSPIRATION (ET)
                  </h4>

                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="block text-[10px] text-white/40 uppercase font-black">Depletion Rate</span>
                      <div className="text-3xl font-black text-emerald-300 mt-1">{evapotranspiration.rate} mm</div>
                      <p className="text-xs text-white/50 mt-2 font-medium leading-relaxed">
                        Estimated amount of direct water evaporation from soil plus transpirational loss from plants.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center shrink-0">
                      <span className="text-[9px] font-black uppercase text-white/40 block">Loss Intensity</span>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full inline-block mt-2 ${evapotranspiration.level.includes("High") ? "bg-amber-500/20 text-amber-300 border border-amber-500/20" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/20"
                        }`}>
                        {evapotranspiration.level}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 p-3.5 rounded-xl border border-white/5 bg-white/5 text-xs text-white/60 font-semibold leading-relaxed">
                  {evapotranspiration.advice}
                </div>
              </motion.div>

            </div>

            {/* ⚠️ Dynamic Crop Safety Alerts */}
            <motion.div
              whileHover={{ scale: 1.005 }}
              className="rounded-2xl border border-white/10 bg-white/[0.03] dark:bg-black/30 backdrop-blur-xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.15)]"
            >
              <h3 className="text-base font-black tracking-widest text-white/80 uppercase mb-5 flex items-center gap-2">
                <Flame size={18} className="text-red-400 animate-bounce" /> METEOROLOGICAL AGRO ADVISORIES
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {alerts.map((a, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-xl border-l-4 flex items-start gap-3 backdrop-blur shadow-sm transition-all duration-300 ${a.level === "high"
                        ? "border-red-500 bg-red-500/10 text-red-200"
                        : a.level === "medium"
                          ? "border-amber-400 bg-amber-500/10 text-amber-200"
                          : "border-emerald-500 bg-emerald-500/10 text-emerald-200"
                      }`}
                  >
                    <div className="text-xs font-semibold leading-relaxed">
                      {a.msg}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* 📈 Recharts Switched Forecasting Timeline Chart */}
            <motion.div
              whileHover={{ scale: 1.008 }}
              className="rounded-2xl border border-white/10 bg-white/[0.03] dark:bg-black/30 backdrop-blur-xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.15)]"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="flex items-center gap-2 text-sm font-black tracking-widest text-white/80 uppercase">
                  <LineChartIcon className="text-emerald-400 animate-pulse" /> 24-HOUR DETAILED FORECAST OVERVIEW
                </h3>

                {/* Metric Selector Tabs */}
                <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 p-1 rounded-xl shadow-inner w-full sm:w-auto overflow-x-auto">
                  <button
                    onClick={() => setChartMetric("temp")}
                    className={`text-xs px-3 py-2 rounded-lg font-bold transition whitespace-nowrap ${chartMetric === "temp" ? "bg-emerald-500 text-white shadow" : "text-white/60 hover:text-white"
                      }`}
                  >
                    Temperature
                  </button>
                  <button
                    onClick={() => setChartMetric("humidity")}
                    className={`text-xs px-3 py-2 rounded-lg font-bold transition whitespace-nowrap ${chartMetric === "humidity" ? "bg-emerald-500 text-white shadow" : "text-white/60 hover:text-white"
                      }`}
                  >
                    Humidity
                  </button>
                  <button
                    onClick={() => setChartMetric("rain")}
                    className={`text-xs px-3 py-2 rounded-lg font-bold transition whitespace-nowrap ${chartMetric === "rain" ? "bg-emerald-500 text-white shadow" : "text-white/60 hover:text-white"
                      }`}
                  >
                    Precipitation %
                  </button>
                  <button
                    onClick={() => setChartMetric("wind")}
                    className={`text-xs px-3 py-2 rounded-lg font-bold transition whitespace-nowrap ${chartMetric === "wind" ? "bg-emerald-500 text-white shadow" : "text-white/60 hover:text-white"
                      }`}
                  >
                    Wind Speed
                  </button>
                </div>
              </div>

              <div className="h-68 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={(data.forecast?.list || [])
                      .slice(0, 8)
                      .map((i) => ({
                        time: new Date(i.dt * 1000).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        }),
                        temp: tempDisplay(i.main.temp),
                        humidity: i.main.humidity,
                        rain: Math.round((i.pop || 0) * 100),
                        wind: i.wind.speed,
                      }))}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor={
                            chartMetric === "temp" ? "#f97316" :
                              chartMetric === "humidity" ? "#06b6d4" :
                                chartMetric === "rain" ? "#3b82f6" : "#8b5cf6"
                          }
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="95%"
                          stopColor={
                            chartMetric === "temp" ? "#f97316" :
                              chartMetric === "humidity" ? "#06b6d4" :
                                chartMetric === "rain" ? "#3b82f6" : "#8b5cf6"
                          }
                          stopOpacity={0.0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="time"
                      tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: "bold" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: "bold" }}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, chartMetric === "humidity" || chartMetric === "rain" ? 100 : "auto"]}
                    />
                    <Tooltip
                      formatter={(val) => {
                        if (chartMetric === "temp") return [`${val}°${unit}`, "Temperature"];
                        if (chartMetric === "humidity") return [`${val}%`, "Humidity"];
                        if (chartMetric === "rain") return [`${val}%`, "Precipitation Probability"];
                        return [`${val} m/s`, "Wind Speed"];
                      }}
                      contentStyle={{
                        backgroundColor: "#0d1015",
                        borderColor: "rgba(255,255,255,0.15)",
                        borderRadius: "12px",
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: "bold",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.5)"
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey={chartMetric}
                      stroke={
                        chartMetric === "temp" ? "#f97316" :
                          chartMetric === "humidity" ? "#06b6d4" :
                            chartMetric === "rain" ? "#3b82f6" : "#8b5cf6"
                      }
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorMetric)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* 🗓️ Beautiful 5-Day Compact Timeline */}
            <motion.div
              whileHover={{ scale: 1.005 }}
              className="rounded-2xl border border-white/10 bg-white/[0.03] dark:bg-black/30 backdrop-blur-xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.15)]"
            >
              <h3 className="text-sm font-black tracking-widest text-white/80 uppercase mb-6 flex items-center gap-2">
                ☀️ 5-DAY CROP METEOROLOGICAL FORECAST
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {data.forecast.list
                  .filter((_, i) => i % 8 === 0)
                  .slice(0, 5)
                  .map((d, i) => {
                    const date = new Date(d.dt * 1000);
                    const day = date.toLocaleDateString("en-IN", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    });
                    const icon = d.weather[0].icon;
                    const desc = d.weather[0].description;
                    const tempMin = Math.round(d.main.temp_min);
                    const tempMax = Math.round(d.main.temp_max);

                    return (
                      <div
                        key={i}
                        className="p-4 rounded-xl border border-white/5 bg-white/5 flex flex-col items-center justify-center text-center hover:bg-white/10 hover:border-white/15 transition-all duration-300 shadow"
                      >
                        <p className="text-xs font-extrabold text-white/50 mb-1">{day}</p>
                        <img
                          src={`https://openweathermap.org/img/wn/${icon}@2x.png`}
                          alt={desc}
                          className="w-14 h-14 object-contain filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.2)] animate-pulse-slow"
                        />
                        <p className="text-[11px] font-bold capitalize text-emerald-300">{desc}</p>
                        <p className="text-xs font-black text-white mt-1.5">
                          {tempMin}° / {tempMax}°
                        </p>
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------------------
   Weather Gradient Definition Helper
---------------------------- */
const getWeatherTheme = (condition = "") => {
  const c = condition.toLowerCase();
  if (c.includes("thunder") || c.includes("rain") || c.includes("drizzle")) {
    return {
      bg: "from-[#0d1222] via-[#091a32] to-[#120d22]",
      glow: "rgba(59, 130, 246, 0.15)",
      type: "rain",
    };
  }
  if (c.includes("clear")) {
    return {
      bg: "from-[#1d120a] via-[#1f170f] to-[#0a0a0d]",
      glow: "rgba(249, 115, 22, 0.15)",
      type: "clear",
    };
  }
  if (c.includes("cloud")) {
    return {
      bg: "from-[#0e111a] via-[#1b2230] to-[#0e111a]",
      glow: "rgba(156, 163, 175, 0.15)",
      type: "clouds",
    };
  }
  if (c.includes("mist") || c.includes("fog") || c.includes("haze")) {
    return {
      bg: "from-[#141b21] via-[#1d272f] to-[#10151a]",
      glow: "rgba(209, 213, 219, 0.1)",
      type: "mist",
    };
  }
  // Safe default: Slate green dark themes
  return {
    bg: "from-[#08100c] via-[#0b1b14] to-[#060a08]",
    glow: "rgba(16, 185, 129, 0.15)",
    type: "default",
  };
};
