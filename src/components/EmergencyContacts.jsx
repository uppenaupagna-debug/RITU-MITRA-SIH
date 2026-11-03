import React from "react";
import { Phone } from "lucide-react";
import { motion } from "framer-motion";

export default function EmergencyContacts() {
  const contacts = {
    agriculture: [
      {
        title: "Kisan Call Center (KCC)",
        number: "1800-180-1551",
        desc: "General agricultural advice & guidance for farmers across India.",
        availability: "6 AM – 10 PM",
      },
      {
        title: "Agriculture Helpline (Central)",
        number: "1800-180-1551",
        desc: "Crop-specific queries and technical help.",
        availability: "Office hours (regional timings may vary)",
      },
      {
        title: "PM-KISAN Helpline",
        number: "155261",
        desc: "Support for PM-KISAN scheme and farmer registration issues.",
        availability: "Office hours",
      },
    ],
    weather: [
      {
        title: "IMD Weather Alert",
        number: "1800-180-1717",
        desc: "Severe weather warnings & district-level forecasts.",
        availability: "Available 24 / 7",
      },
      {
        title: "Disaster Management Helpline (NDMA)",
        number: "1078",
        desc: "Emergency support during floods, droughts, and disasters.",
        availability: "Available 24 / 7",
      },
    ],
    livestock: [
      {
        title: "Animal Husbandry Helpline",
        number: "1800-180-7676",
        desc: "Veterinary emergencies & livestock-related support.",
        availability: "Timings may vary (regional)",
      },
      {
        title: "Veterinary Helpline",
        number: "1962",
        desc: "Immediate veterinary assistance for farmers.",
        availability: "Available 24 / 7",
      },
      {
        title: "Poultry & Dairy Support",
        number: "1800-180-1551",
        desc: "Specialized support for dairy & poultry farmers.",
        availability: "Office hours",
      },
    ],
  };

  const sectionTitles = {
    agriculture: "🌾 Agriculture",
    weather: "🌦️ Weather",
    livestock: "🐄 Livestock & Veterinary",
  };

  const borderColors = {
    agriculture: "border-l-green-500",
    weather: "border-l-sky-500",
    livestock: "border-l-rose-500",
  };

  return (
    <div className="relative p-4 md:p-10">
      {/* ✨ Aurora Glow Background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 h-[50rem] w-[50rem] rounded-full blur-3xl opacity-20 bg-gradient-to-tr from-green-500 via-emerald-500 to-indigo-500 dark:opacity-30" />
      </div>

      {/* 🏷 Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-10 relative z-10"
      >
        <h2 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-green-500 to-emerald-500 mb-3">
          🚨 Emergency Contacts
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Verified national helplines for farmers — agriculture, weather, and livestock emergencies.
        </p>
      </motion.div>

      {/* 📞 Contact Sections */}
      <div className="relative z-10 space-y-10">
        {Object.keys(contacts).map((sectionKey, i) => (
          <motion.div
            key={sectionKey}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h3 className="text-2xl font-semibold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-emerald-500 dark:from-green-400 dark:to-emerald-400">
              {sectionTitles[sectionKey]}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {contacts[sectionKey].map((item, idx) => (
                <motion.div key={idx} whileHover={{ scale: 1.03 }} transition={{ duration: 0.2 }}>
                  <div
                    className={`rounded-xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-lg transition-all bg-white dark:bg-neutral-900 ${borderColors[sectionKey]} border-l-4`}
                  >
                    <h4 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">
                      {item.title}
                    </h4>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                      {item.desc}
                    </p>

                    <a
                      href={`tel:${item.number}`}
                      className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-1 hover:underline"
                    >
                      <Phone size={14} /> {item.number}
                    </a>

                    <p className="text-[11px] text-neutral-500 mt-1">⏰ {item.availability}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ℹ️ Footer Note */}
      <p className="mt-10 text-xs text-center text-neutral-500 dark:text-neutral-400 relative z-10">
        ⚠️ Helpline availability and timings may vary by region.  
        Contact your nearest district agriculture or veterinary office if unreachable.
      </p>
    </div>
  );
}
