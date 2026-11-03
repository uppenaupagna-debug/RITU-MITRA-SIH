import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Copy } from "lucide-react";
import { motion } from "framer-motion";

export default function TrainingPrograms() {
  const [search, setSearch] = useState("");

  const copyDate = (date) => {
    navigator.clipboard.writeText(date);
    alert(`Copied date: ${date}`);
  };

  const programs = [
    { title: "Online Training: Impactful AI Tools in Agriculture", date: "Sep 15–19, 2025", link: "https://naarm.org.in/ongoing-training-programs/", provider: "NAARM (ICAR)", type: "Online" },
    { title: "Precision Agriculture Using Drones & Remote Sensing", date: "Dec 1–5, 2025", link: "https://naarm.org.in/ongoing-training-programs/", provider: "NAARM (ICAR)", type: "Online" },
    { title: "30-Day International Training on Natural Farming & AI", date: "Aug 16–Sep 16, 2025", link: "#", provider: "Gujarat Natural Farming Science University / ICAR", type: "Offline" },
    { title: "Organic Farming Certificate Course – 21 Days", date: "Ongoing", link: "https://nconf.dac.gov.in/21DaysCertificateCourse", provider: "NCOF", type: "Certification" },
    // … (rest of your list)
  ];

  const filteredPrograms = programs.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.provider.toLowerCase().includes(search.toLowerCase()) ||
      p.type.toLowerCase().includes(search.toLowerCase())
  );

  const getBadgeClasses = (type) => {
    switch (type.toLowerCase()) {
      case "ongoing":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "online":
        return "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300";
      case "offline":
        return "bg-green-200 text-green-900 dark:bg-green-800/40 dark:text-green-200";
      case "certification":
        return "bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-300";
      case "skill program":
        return "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      default:
        return "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300";
    }
  };

  return (
    <div className="relative">
      {/* Glow background */}
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
          🎓 Upcoming & Ongoing Training Programs
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Learn modern, sustainable, and tech-driven farming practices — from AI to natural cultivation.
        </p>
      </motion.div>

      {/* Search input */}
      <div className="relative z-10 mb-8">
        <input
          type="text"
          placeholder="🔍 Search for training, provider, or type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-3 rounded-xl border border-gray-300 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-md shadow-sm focus:ring-2 focus:ring-emerald-400 dark:focus:ring-green-400 transition"
        />
      </div>

      {/* Cards grid */}
      <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 z-10">
        {filteredPrograms.map((program, idx) => (
          <motion.div key={idx} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}>
            <Card
              className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-lg hover:border-l-green-600 transition-transform duration-200 ease-in-out hover:scale-[1.02] border-l-4 border-l-green-500"
            >
              <CardContent className="p-5 space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                    {program.title}
                  </h3>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getBadgeClasses(program.type)}`}>
                    {program.type}
                  </span>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400">{program.provider}</p>

                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <Calendar size={14} /> {program.date}
                  <button onClick={() => copyDate(program.date)} className="text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400">
                    <Copy size={14} />
                  </button>
                </p>

                <a href={program.link} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-green-600 dark:text-green-400 hover:underline block mt-2">
                  Register / Learn More → 
                </a>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredPrograms.length === 0 && (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          No training programs match your search.
        </p>
      )}
    </div>
  );
}
