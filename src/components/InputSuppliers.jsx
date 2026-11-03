import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Copy } from "lucide-react";
import { motion } from "framer-motion";

export default function InputSuppliers() {
  const copyNumber = (num) => {
    navigator.clipboard.writeText(num);
    alert(`Copied number: ${num}`);
  };

  const suppliers = {
    seeds: [
      { name: "Green Seeds Pvt Ltd", type: "Hybrid & Organic Seeds", contact: "9123456780" },
      { name: "AgriSeed Distributors", type: "Vegetable & Field Crop Seeds", contact: "9876501234" },
      { name: "National Seed Corporation", type: "Certified Seeds (Govt. of India)", contact: "18001801551" },
      { name: "Kaveri Seeds", type: "Hybrid Cotton, Maize & Paddy Seeds", contact: "040-23311845" },
      { name: "Rasi Seeds", type: "Cotton & Paddy Hybrid Seeds", contact: "1800-425-0303" },
      { name: "Nuziveedu Seeds", type: "Vegetable & Fibre Crop Seeds", contact: "040-30551500" },
    ],
    fertilizer: [
      { name: "Agro Fertilizer Store", type: "Fertilizers & Pesticides", contact: "70005 28397" },
      { name: "IFFCO Fertilizer Dealer", type: "Urea, DAP, Complex Fertilizers", contact: "18001801551" },
      { name: "Krishi Chemicals", type: "Bio-Fertilizers & Plant Growth Regulators", contact: "9988665544" },
      { name: "Coromandel International", type: "Fertilizers, Nutrients & Crop Protection", contact: "044 42525345" },
      { name: "Zuari Agro Chemicals", type: "Fertilizers & Agro Inputs", contact: "+91 832 2592180" },
      { name: "RCF (Rashtriya Chemicals & Fertilizers)", type: "Urea & Complex Fertilizers", contact: "022-2552 3000" },
    ],
    machinery: [
      { name: "FarmTech Equipment", type: "Tractors & Farm Implements", contact: "9988776655" },
      { name: "Mahindra Agro Machinery", type: "Harvesters, Tillers & Sprayers", contact: "9876001122" },
      { name: "Tata Agrico", type: "Hand Tools & Power Tools", contact: "9123005678" },
      { name: "John Deere India", type: "Tractors & Harvesters", contact: "18002006800" },
      { name: "Sonalika Tractors", type: "Agricultural Machinery & Implements", contact: "18001037200" },
      { name: "Escorts Agri Machinery", type: "Farm Equipment & Implements", contact: "18001033011" },
    ],
  };

  const sectionTitles = {
    seeds: "🌱 Seeds Suppliers",
    fertilizer: "🌾 Fertilizers & Agro Chemicals",
    machinery: "🚜 Machinery & Equipment",
  };

  const gradientBorders = {
    seeds: "from-green-400 to-emerald-600",
    fertilizer: "from-lime-400 to-green-500",
    machinery: "from-orange-400 to-yellow-500",
  };

  return (
    <div className="relative">
      {/* Aurora Background for Glow */}
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
          🛒 Input Suppliers Directory
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Find trusted local and national suppliers for high-quality seeds, fertilizers, and machinery.
        </p>
      </motion.div>

      {/* Supplier Sections */}
      {Object.keys(suppliers).map((sectionKey, i) => (
        <motion.div
          key={sectionKey}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1, duration: 0.5 }}
          className="mb-12 relative z-10"
        >
          <h3 className="text-xl font-semibold mb-5 text-gray-800 dark:text-gray-100 bg-clip-text text-transparent bg-gradient-to-r from-green-600 via-emerald-500 to-green-500 dark:from-green-400 dark:via-emerald-400 dark:to-indigo-400">
            {sectionTitles[sectionKey]}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {suppliers[sectionKey].map((item, idx) => (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.03 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  className={`relative overflow-hidden bg-white/80 dark:bg-white/5 backdrop-blur-md rounded-xl border border-gray-200 dark:border-white/10 shadow-sm 
                              hover:shadow-[0_0_30px_-8px_rgba(139,92,246,0.5)] transition-all duration-300`}
                >
                  {/* Gradient Border Accent */}
                  <div
                    className={`absolute left-0 top-0 h-full w-[4px] bg-gradient-to-b ${gradientBorders[sectionKey]} rounded-l-xl`}
                  ></div>

                  <CardContent className="p-5 space-y-2">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                      {item.name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {item.type}
                    </p>

                    <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      📞
                      <a
                        href={`tel:${item.contact}`}
                        className="hover:underline underline-offset-4"
                      >
                        {item.contact}
                      </a>
                      <button
                        onClick={() => copyNumber(item.contact)}
                        className="text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
