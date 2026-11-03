import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Leaf, Sun, Moon, Menu, X, Globe, Sprout } from "lucide-react";
import { useDarkMode } from "../context/DarkModeContext";
import { useLanguage } from "../context/LanguageContext";

const loadGoogleTranslate = () => {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.translate) return resolve();
    const existing = document.getElementById("google-translate-script");
    if (existing) {
      existing.addEventListener("load", resolve);
      return;
    }
    const s = document.createElement("script");
    s.id = "google-translate-script";
    s.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    s.async = true;
    s.onload = resolve;
    s.onerror = reject;
    document.body.appendChild(s);
  });
};

export default function Header() {
  const { darkMode, setDarkMode } = useDarkMode();
  const { language, setLanguage, t } = useLanguage();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [searchLang, setSearchLang] = useState("");
  const [bannerActive, setBannerActive] = useState(false);
  const location = useLocation();
  // Outside-click detection on language dropdown
  const langDropdownRef = React.useRef(null);

  React.useEffect(() => {
    if (!showLang) return;
    const handler = (e) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target)) {
        setShowLang(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showLang]);

  const navLinks = [
    { name: t("nav_home"), to: "/" },
    { name: t("nav_crop"), to: "/crop" },
    { name: t("nav_weather"), to: "/weather" },
    { name: t("nav_calendar"), to: "/calendar" },
    { name: t("nav_resources"), to: "/resources" },
    { name: t("nav_market"), to: "/market" },
    { name: t("nav_updates"), to: "/updates" },
    { name: t("nav_detect"), to: "/detect" },
    { name: t("nav_satellite"), to: "/satellite" },
    { name: t("nav_command"), to: "/command-dashboard" },
  ];

  const groupedLanguages = {
    English: [{ code: "en", label: "English" }],
    "North Indian": [
      { code: "hi", label: "हिंदी" },
      { code: "pa", label: "ਪੰਜਾਬੀ" },
      { code: "ur", label: "اردو" },
      { code: "ks", label: "कश्मीरी" },
      { code: "bho", label: "भोजपुरी" },
      { code: "mai", label: "मैथिली" },
    ],
    "South Indian": [
      { code: "te", label: "తెలుగు" },
      { code: "ta", label: "தமிழ்" },
      { code: "kn", label: "ಕನ್ನಡ" },
      { code: "ml", label: "മലയാളം" },
      { code: "sa", label: "संस्कृत" },
    ],
  };

  const handleTranslate = (langCode) => {
    setLanguage(langCode);
    setShowLang(false);
  };

  return (
    <>
      <div id="google_translate_element" style={{ display: "none" }} />

      <header
        className={`sticky top-0 z-50 backdrop-blur-xl transition-all duration-500 border-b shadow-[0_2px_20px_rgba(139,92,246,0.15)] ${
          darkMode
            ? "bg-[#0b0b0f]/70 border-white/10 text-white"
            : "bg-white/60 border-gray-200/30 text-gray-900"
        }`}
        style={{ paddingTop: bannerActive ? "40px" : "0px" }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-5 py-3">
          {/* 🌿 Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 font-extrabold text-xl tracking-tight group"
          >
            <Leaf className="w-7 h-7 text-emerald-400 group-hover:rotate-12 transition-transform duration-300" />
            <span className="bg-gradient-to-r from-green-400 to-indigo-400 bg-clip-text text-transparent">
              Raitu Mitra
            </span>
          </Link>

          {/* 🧭 Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`relative px-2 py-1 rounded-md transition-all duration-300 group ${
                    isActive
                      ? "text-emerald-300 font-semibold"
                      : darkMode
                      ? "text-gray-300 hover:text-emerald-300"
                      : "text-gray-700 hover:text-emerald-400"
                  }`}
                >
                  {link.name}
                  <span
                    className={`absolute left-0 bottom-0 h-[2px] bg-emerald-400 transition-all duration-300 ${
                      isActive ? "w-full" : "w-0 group-hover:w-full"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          {/* 🌍 Controls */}
          <div className="flex items-center gap-3">
            {/* Language Dropdown */}
            {/* BUG FIX #16: Attach ref for outside-click close */}
            <div className="relative" ref={langDropdownRef}>
              <button
                onClick={() => setShowLang((s) => !s)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition ${
                  darkMode
                    ? "bg-white/10 hover:bg-emerald-500/20 text-gray-200"
                    : "bg-gray-200 hover:bg-emerald-100 text-gray-800"
                }`}
                aria-label={t("choose_lang")}
              >
                <Globe className="w-4 h-4 text-emerald-400" />
                <span className="uppercase">{language}</span>
              </button>

              {showLang && (
                <div
                  className={`absolute right-0 mt-2 w-64 rounded-xl border shadow-xl backdrop-blur-xl max-h-80 overflow-y-auto animate-fadeIn ${
                    darkMode
                      ? "border-white/10 bg-[#1a1525]/95"
                      : "border-gray-200 bg-white/95"
                  }`}
                >
                  <div
                    className={`p-2 border-b sticky top-0 ${
                      darkMode
                        ? "border-white/10 bg-[#1a1525]/95"
                        : "border-gray-200 bg-white/95"
                    }`}
                  >
                    <input
                      type="text"
                      placeholder={t("search_lang")}
                      value={searchLang}
                      onChange={(e) => setSearchLang(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-md border text-sm focus:ring-2 focus:ring-emerald-500 outline-none ${
                        darkMode
                          ? "border-gray-700 bg-[#201a2e] text-gray-100"
                          : "border-gray-300 bg-gray-50 text-gray-800"
                      }`}
                    />
                  </div>

                  {Object.entries(groupedLanguages).map(([group, langs]) => {
                    const q = searchLang.trim().toLowerCase();
                    const filtered = q
                      ? langs.filter(
                          (lang) =>
                            lang.label.toLowerCase().includes(q) ||
                            lang.code.toLowerCase().includes(q)
                        )
                      : langs;
                    if (filtered.length === 0) return null;
                    return (
                      <div key={group}>
                        <div
                          className={`px-4 py-2 text-xs font-semibold uppercase ${
                            darkMode
                              ? "text-gray-400 bg-[#15111e]/80"
                              : "text-gray-500 bg-gray-100/60"
                          }`}
                        >
                          {group}
                        </div>
                        {filtered.map((lang) => {
                          const isSelected = language === lang.code;
                          return (
                            <button
                              key={lang.code}
                              onClick={() => handleTranslate(lang.code)}
                              className={`w-full flex items-center justify-between text-left px-4 py-2 transition text-sm ${
                                isSelected
                                  ? "bg-emerald-500/20 text-emerald-300 font-semibold"
                                  : darkMode
                                  ? "text-gray-200 hover:bg-emerald-900/40"
                                  : "text-gray-800 hover:bg-emerald-100/40"
                              }`}
                            >
                              <span>{lang.label}</span>
                              {isSelected && <span className="text-emerald-400 text-xs font-bold">✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-full transition ${
                darkMode
                  ? "bg-white/10 hover:bg-emerald-500/20"
                  : "bg-gray-200 hover:bg-emerald-100"
              }`}
              aria-label="Toggle theme"
            >
              {darkMode ? (
                <Sun className="w-5 h-5 text-yellow-300" />
              ) : (
                <Moon className="w-5 h-5 text-emerald-400" />
              )}
            </button>

            {/* Profile */}
            <Link
              to="/profile"
              className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                location.pathname === "/profile"
                  ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/40"
                  : darkMode
                  ? "bg-white/10 hover:bg-emerald-500/20 text-gray-200"
                  : "bg-gray-200 hover:bg-emerald-100 text-gray-800"
              }`}
            >
              <Sprout className="w-4 h-4 text-emerald-400" />
              <span>Profile</span>
            </Link>

            {/* 📱 Mobile Menu */}
            <button
              onClick={() => setMobileMenu((s) => !s)}
              className={`md:hidden p-2 rounded-full transition ${
                darkMode
                  ? "bg-white/10 hover:bg-emerald-500/20"
                  : "bg-gray-200 hover:bg-emerald-100"
              }`}
            >
              {mobileMenu ? (
                <X className="w-6 h-6 text-emerald-400" />
              ) : (
                <Menu className="w-6 h-6 text-emerald-400" />
              )}
            </button>
          </div>
        </div>

        {/* 📱 Mobile Nav */}
        {mobileMenu && (
          <div
            className={`md:hidden backdrop-blur-xl px-4 py-4 border-t animate-slideDown ${
              darkMode
                ? "bg-[#0b0b0f]/95 border-white/10 text-white"
                : "bg-white/90 border-gray-200 text-gray-900"
            }`}
          >
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenu(false)}
                  className={`block py-2 px-3 rounded-md text-sm transition ${
                    isActive
                      ? "bg-emerald-500/20 text-emerald-200 font-semibold"
                      : darkMode
                      ? "hover:bg-white/10 text-gray-200"
                      : "hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
            <Link
              to="/profile"
              onClick={() => setMobileMenu(false)}
              className={`block py-2.5 px-3 rounded-md text-sm transition mt-2 border-t font-medium ${
                location.pathname === "/profile"
                  ? "bg-emerald-500/20 text-emerald-200 font-semibold"
                  : darkMode
                  ? "border-white/10 hover:bg-white/10 text-gray-200"
                  : "border-gray-200 hover:bg-gray-100 text-gray-700"
              }`}
            >
              🌱 Profile
            </Link>
          </div>
        )}
      </header>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px);} to { opacity: 1; transform: translateY(0);} }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px);} to { opacity: 1; transform: translateY(0);} }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-slideDown { animation: slideDown 0.3s ease-out; }
      `}</style>
    </>
  );
}
