import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Home,
  Sprout,
  CloudSun,
  CalendarDays,
  BookOpen,
  User,
  Zap,
  Leaf,
  ChevronDown,
  Github,
} from "lucide-react";

export default function Footer() {
  const [openSection, setOpenSection] = useState(null);
  const toggleSection = (section) => {
    setOpenSection(openSection === section ? null : section);
  };

  const features = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/crop", icon: Sprout, label: "Crop Advisory" },
    { to: "/fertilizer", icon: Leaf, label: "Fertilizer Calculator" },
    { to: "/alerts", icon: Zap, label: "Pest Alerts" },
    { to: "/weather", icon: CloudSun, label: "Weather Insights" },
    { to: "/calendar", icon: CalendarDays, label: "Farming Calendar" },
    { to: "/resources", icon: BookOpen, label: "Resources" },
    { to: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <footer className="relative border-t border-emerald-300/20 bg-gradient-to-b from-white/90 via-white/95 to-emerald-50 dark:from-[#0b0b0f] dark:via-[#0b0b0f] dark:to-[#0b0b0f] text-gray-700 dark:text-white/70 transition-colors duration-500">
      <div className="mx-auto max-w-6xl px-6 py-10 grid grid-cols-1 sm:grid-cols-3 gap-10">

        {/* 🌿 Brand Section */}
        <div>
          <Link
            to="/"
            className="flex items-center gap-2 font-semibold group hover:text-emerald-600 dark:hover:text-emerald-300 transition-colors"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600/20 ring-1 ring-emerald-500/40 shadow-[0_0_25px_-10px_rgba(139,92,246,0.6)] group-hover:scale-105 transition-transform">
              <Leaf className="h-4 w-4 text-emerald-500 dark:text-emerald-300" />
            </span>
            <span className="font-medium">Raitu Mitra</span>
            <span className="text-xs text-gray-500 dark:text-white/40 ml-2">
              © {new Date().getFullYear()}
            </span>
          </Link>

          <p className="text-sm mt-3 text-gray-600 dark:text-gray-400">
            Sri Raama
          </p>
        </div>

        {/* 🌸 Expandable Features Section */}
        <div>
          <button
            onClick={() => toggleSection("features")}
            className="flex justify-between items-center w-full text-left font-semibold text-lg border-b border-emerald-300/30 pb-2 mb-3 text-emerald-700 dark:text-emerald-300 hover:text-emerald-500 transition"
          >
            Features
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-300 ${openSection === "features" ? "rotate-180" : ""
                }`}
            />
          </button>

          <ul
            className={`space-y-2 text-sm overflow-hidden transition-all duration-500 ${openSection === "features" ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
              }`}
          >
            {features.map(({ to, icon: Icon, label }) => (
              <li key={to}>
                <Link
                  to={to}
                  className="flex items-center gap-2 hover:text-emerald-600 dark:hover:text-emerald-300 hover:translate-x-1 transition-all duration-200"
                >
                  <Icon size={15} /> {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* 🔗 External Links */}
        <div>
          <h3 className="font-semibold text-lg border-b border-emerald-300/30 pb-2 mb-3 text-emerald-700 dark:text-emerald-300">
            Connect With Us
          </h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link
                to="/farmers"
                className="hover:text-emerald-600 dark:hover:text-emerald-300 transition"
              >
                Farmers’ Voice
              </Link>
            </li>
            <li>
              <a
                href="https://github.com/Narayana1729/RaituMitra"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 hover:text-emerald-600 dark:hover:text-emerald-300 transition"
              >
                <Github size={16} /> GitHub
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* ✨ emerald Glow Line */}
      <div className="absolute inset-x-0 bottom-0 h-[80px] bg-gradient-to-t from-emerald-400/20 to-transparent blur-2xl pointer-events-none" />
    </footer>
  );
}
