import React, { useEffect, useState } from "react";
import { Routes, Route, useLocation, Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";
import { SpeedInsights } from "@vercel/speed-insights/react";

// 🌿 Components
import Header from "./components/Header";

import Footer from "./components/Footer";
import Home from "./components/Home";
import Resources from "./components/Resources";
import FertilizerCalculator from "./components/FertilizerCalculator";
import PestAlerts from "./components/PestAlerts";
import FloatingHomeButton from "./components/FloatingHomeButton";

const CropRecommendation = React.lazy(() => import("./components/CropRecommendation"));
const Weather = React.lazy(() => import("./components/Weather"));
const PlantingCalendar = React.lazy(() => import("./components/PlantingCalendar"));
const MarketInsights = React.lazy(() => import("./components/MarketInsights"));
const MarketUpdates = React.lazy(() => import("./components/MarketUpdates"));
const FarmersVoice = React.lazy(() => import("./components/FarmersVoice"));

// 👩‍💼 Admin
import ProtectedRouteAdmin from "./components/ProtectedRouteAdmin";
import AdminLogin from "./components/AdminLogin";
const AdminDashboard = React.lazy(() => import("./components/AdminDashboard"));

// 👨‍🌾 Farmer
import FarmerLogin from "./components/FarmerLogin";
import ProtectedFarmerRoute from "./components/ProtectedFarmerRoute";
const Profile = React.lazy(() => import("./components/Profile"));

// 🌗 Context + Animations
import { DarkModeProvider } from "./context/DarkModeContext";
import { LanguageProvider } from "./context/LanguageContext";
import PageTransition from "./components/PageTransition";

// 🌱 NEW AI Detection Component
const DiseaseDetect = React.lazy(() => import("./components/DiseaseDetect"));
const SatelliteMonitoring = React.lazy(() => import("./components/SatelliteMonitoring"));
const FarmerFarmMap = React.lazy(() => import("./components/FarmerFarmMap"));
const CommandAreaDashboard = React.lazy(() => import("./components/CommandAreaDashboard"));




/* -----------------------------
   ⚡ Custom 404 Page
------------------------------ */
function NotFound() {
  const [glitch, setGlitch] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => setGlitch((g) => !g), 400 + Math.random() * 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden bg-[#0b0b0f] text-center p-10 text-white">
      <motion.h1
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className={`relative text-8xl font-extrabold tracking-tight ${
          glitch ? "text-green-400 blur-[1.5px]" : "text-white"
        }`}
      >
        4<span className="text-emerald-400">0</span>4
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-lg text-white/70 mt-4"
      >
        Oops! Looks like you wandered off the digital farm 🌾
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-8"
      >
        <Link
          to="/"
          className="px-6 py-2.5 rounded-full bg-gradient-to-r from-green-600 via-emerald-600 to-indigo-600 text-white shadow-lg hover:scale-[1.05]"
        >
          Back to Home
        </Link>
      </motion.div>
    </div>
  );
}

const LoadingFallback = () => (
  <div className="flex flex-col justify-center items-center min-h-[60vh] text-gray-500 dark:text-gray-400">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mb-4"></div>
    <p className="text-sm font-medium">Loading digital farm tools...</p>
  </div>
);

/* -----------------------------
   🌾 Main App Component
------------------------------ */
export default function App() {
  const location = useLocation();

  // Auto-login as test farmer for bypassed testing access
  // BUG FIX #9: Use env var for password — never hardcode credentials in source
  useEffect(() => {
    const autoLogin = async () => {
      const testPass = import.meta.env.VITE_TEST_FARMER_PASS;
      if (!testPass) return; // Skip auto-login if env var not set
      if (!auth.currentUser) {
        try {
          await signInWithEmailAndPassword(auth, "testfarmer@raitumitra.com", testPass);
          console.log("🤖 Bypassed Login: Authenticated as test farmer.");
        } catch (err) {
          console.error("🤖 Bypassed Login: Auto-login failed:", err);
        }
      }
    };
    autoLogin();
  }, []);


  // Ensure body doesn't get offset by Google Translate banner
  useEffect(() => {
    document.body.style.top = "0px";
  }, []);

  // BUG FIX #11: /dashboard (admin) should also hide the farmer header/footer
  const noLayoutRoutes = ["/admin", "/farmer-login", "/dashboard"];
  const showLayout = !noLayoutRoutes.includes(location.pathname);

  return (
    <LanguageProvider>
      <DarkModeProvider>
      <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        {showLayout && <Header />}

        <main className="flex-1">
          <AnimatePresence mode="wait">
            <React.Suspense fallback={<LoadingFallback />}>
              <Routes location={location} key={location.pathname}>

                {/* 🏠 Home */}
                <Route
                  path="/"
                  element={
                    <PageTransition>
                      <Home />
                    </PageTransition>
                  }
                />

                {/* 🌱 NEW — AI Disease/Pest Detection */}
                <Route
                  path="/detect"
                  element={
                    <PageTransition>
                      <DiseaseDetect />
                    </PageTransition>
                  }
                />

                {/* 👨‍🌾 Farmers Feedback */}
                <Route
                  path="/farmers"
                  element={
                    <ProtectedFarmerRoute>
                      <PageTransition>
                        <FarmersVoice />
                      </PageTransition>
                    </ProtectedFarmerRoute>
                  }
                />

                {/* 👩‍💼 Admin */}
                <Route path="/admin" element={<PageTransition><AdminLogin /></PageTransition>} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRouteAdmin>
                      <PageTransition>
                        <AdminDashboard />
                      </PageTransition>
                    </ProtectedRouteAdmin>
                  }
                />

                {/* 👨‍🌾 Farmer Auth + Profile */}
                <Route path="/farmer-login" element={<PageTransition><FarmerLogin /></PageTransition>} />
                <Route
                  path="/profile"
                  element={
                    <ProtectedFarmerRoute>
                      <PageTransition>
                        <Profile />
                      </PageTransition>
                    </ProtectedFarmerRoute>
                  }
                />


                {/* 🌿 Farmer Tools */}
                <Route path="/crop" element={<PageTransition><CropRecommendation /></PageTransition>} />
                <Route path="/weather" element={<PageTransition><Weather /></PageTransition>} />
                <Route path="/calendar" element={<PageTransition><PlantingCalendar /></PageTransition>} />
                <Route path="/resources" element={<PageTransition><Resources /></PageTransition>} />
                <Route path="/market" element={<PageTransition><MarketInsights /></PageTransition>} />
                <Route path="/fertilizer" element={<PageTransition><FertilizerCalculator /></PageTransition>} />
                <Route path="/alerts" element={<PageTransition><PestAlerts /></PageTransition>} />
                <Route path="/updates" element={<PageTransition><MarketUpdates /></PageTransition>} />
                <Route path="/satellite" element={<PageTransition><SatelliteMonitoring /></PageTransition>} />
                <Route path="/map" element={<ProtectedFarmerRoute><PageTransition><FarmerFarmMap /></PageTransition></ProtectedFarmerRoute>} />
                <Route path="/command-dashboard" element={<PageTransition><CommandAreaDashboard /></PageTransition>} />




                {/* ❌ 404 */}
                <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />

              </Routes>
            </React.Suspense>
          </AnimatePresence>
        </main>

        {showLayout && <Footer />}
        {/* BUG FIX #19: Hide floating button on map/satellite pages where it overlaps Leaflet controls */}
        {!['/map', '/satellite', '/command-dashboard'].includes(location.pathname) && <FloatingHomeButton />}
        <SpeedInsights />
      </div>
      </DarkModeProvider>
    </LanguageProvider>
  );
}