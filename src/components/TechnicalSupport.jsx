import React, { useState } from "react";
import { Phone, Link as LinkIcon, Copy } from "lucide-react";
import { motion } from "framer-motion";

export default function EnhancedTechnicalSupport() {
  const [query, setQuery] = useState("");

  const technicalSupport = [
    {
      category: "ICAR Support",
      provider: "Indian Council of Agricultural Research (ICAR)",
      service: "Nationwide agricultural research, training, and farmer advisory services.",
      contact: "91-11-25843301",
      tel: "911125843301",
      link: "https://icar.org.in/",
    },
    {
      category: "Soil Health Card Scheme",
      provider: "Ministry of Agriculture & Farmers Welfare, Govt. of India",
      service: "Soil testing & Soil Health Cards to promote balanced fertilizer use.",
      contact: "Visit nearest District Agriculture Office",
      link: "https://soilhealth.dac.gov.in/",
    },
    {
      category: "Agmarknet Portal",
      provider: "Directorate of Marketing & Inspection (Govt. of India)",
      service: "Nationwide market prices, arrivals, and mandi information.",
      contact: "Online support only",
      link: "https://agmarknet.gov.in/",
    },
    {
      category: "Weather Advisory (IMD Agromet)",
      provider: "India Meteorological Department",
      service: "District-specific weather forecasts and agro-advisories.",
      contact: "Check IMD website or nearest Agromet unit",
      link: "https://mausam.imd.gov.in/",
    },
    {
      category: "Kisan Call Centre (KCC)",
      provider: "Ministry of Agriculture & Farmers Welfare, Govt. of India",
      service: "24/7 helpline for farmers on agriculture, crop management, and government schemes.",
      contact: "1800-180-1551",
      tel: "18001801551",
      link: "https://agricoop.nic.in/kisan-call-centre",
    },
    {
      category: "eNAM Support",
      provider: "National Agriculture Market",
      service: "Assistance with online trading and market access for farmers.",
      contact: "Online support only",
      link: "https://enam.gov.in/",
    },
    {
      category: "Pradhan Mantri Fasal Bima Yojana (PMFBY) Support",
      provider: "Ministry of Agriculture & Farmers Welfare",
      service: "Guidance for crop insurance claims and coverage.",
      contact: "Call your nearest insurance provider or agriculture office",
      link: "https://pmfby.gov.in/",
    },
    {
      category: "State Agriculture Extension Services",
      provider: "State Departments of Agriculture",
      service: "Localized support for crop advisory, pest management, and training programs.",
      contact: "Contact state agriculture office",
    },
    {
      category: "Digital Green",
      provider: "NGO-led Farmer Knowledge Platform",
      service: "Digital videos and guidance on improved farming practices.",
      contact: "Online support only",
      link: "https://www.digitalgreen.org/",
    },
    {
      category: "Farmer Helpline",
      provider: "Ministry of Agriculture & Farmers Welfare",
      service: "Assistance for farmers facing urgent queries related to crops or government schemes.",
      contact: "155261 (Toll-Free)",
      tel: "155261",
    },
  ];

  const getTagEmoji = (category) => {
    if (category.includes("Weather")) return "🌦️";
    if (category.includes("Soil")) return "🌱";
    if (category.includes("Insurance")) return "💰";
    if (category.includes("Market")) return "📊";
    if (category.includes("Support")) return "📞";
    return "🧩";
  };

  const copyToClipboard = (text) => {
    const numbersOnly = text.replace(/[^0-9]/g, "");
    if (numbersOnly) {
      navigator.clipboard.writeText(numbersOnly);
      alert(`Copied number: ${numbersOnly}`);
    } else {
      alert("No number found to copy.");
    }
  };

  const filteredSupport = technicalSupport.filter(
    (item) =>
      item.category.toLowerCase().includes(query.toLowerCase()) ||
      item.service.toLowerCase().includes(query.toLowerCase()) ||
      item.provider.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="relative">
      {/* Aurora Glow Background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-[50rem] w-[50rem] rounded-full blur-3xl opacity-20 bg-gradient-to-tr from-green-400/30 via-emerald-400/30 to-green-400/30 dark:from-green-600/30 dark:via-emerald-600/20 dark:to-indigo-600/20 animate-pulse" />
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-10 relative z-10"
      >
        <h2 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-green-600 via-emerald-500 to-green-500 dark:from-green-400 dark:via-emerald-400 dark:to-indigo-400 mb-3">
          📞 Farmer Helpline & Technical Support
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Trusted government and NGO services providing agriculture guidance and assistance.
        </p>
      </motion.div>

      {/* Search Input */}
      <div className="relative z-10 mb-8">
        <input
          type="text"
          placeholder="🔍 Search support or service..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full p-3 rounded-xl border border-gray-300 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-md shadow-sm focus:ring-2 focus:ring-emerald-400 dark:focus:ring-green-400 transition"
        />
      </div>

      {/* Cards Grid */}
      <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6 z-10">
        {filteredSupport.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="relative overflow-hidden bg-white/80 dark:bg-white/5 backdrop-blur-md rounded-xl border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-[0_0_25px_-8px_rgba(139,92,246,0.5)] transition-all duration-300"
          >
            {/* Gradient Border Accent */}
            <div className="absolute left-0 top-0 h-full w-[4px] bg-gradient-to-b from-green-400 via-emerald-400 to-green-400 dark:from-green-500 dark:via-emerald-500 dark:to-indigo-500 rounded-l-xl"></div>

            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                  {getTagEmoji(item.category)} {item.category}
                </h3>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    item.contact.toLowerCase().includes("online")
                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                      : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                  }`}
                >
                  {item.contact.toLowerCase().includes("online")
                    ? "Online Only"
                    : "Phone Support"}
                </span>
              </div>

              <p className="text-sm text-gray-700 dark:text-gray-400 mb-2">
                {item.service}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                <strong>Provider:</strong> {item.provider}
              </p>

              {/* Contact + Actions */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  {item.tel ? (
                    <a
                      href={`tel:${item.tel}`}
                      className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-2 hover:underline"
                    >
                      <Phone size={14} /> {item.contact}
                    </a>
                  ) : (
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Phone size={14} /> {item.contact}
                    </span>
                  )}
                  <button
                    onClick={() => copyToClipboard(item.contact)}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition"
                  >
                    <Copy size={14} />
                  </button>
                </div>

                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
                  >
                    Learn More <LinkIcon size={14} />
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredSupport.length === 0 && (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          No matching support services found.
        </p>
      )}
    </div>
  );
}
