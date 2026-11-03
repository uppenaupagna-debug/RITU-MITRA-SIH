import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function GovernmentSchemes() {
  const [search, setSearch] = useState("");

  const schemes = [
    {
      category: "Income & Credit",
      name: "PM-Kisan Samman Nidhi",
      desc: "Direct income support of ₹6,000/year for all eligible farmer families.",
      link: "https://pmkisan.gov.in/",
      bg: "bg-green-50 dark:bg-neutral-900",
      color: "text-green-700 dark:text-green-400",
      tags: ["income", "support"],
    },
    {
      category: "Income & Credit",
      name: "Kisan Credit Card (KCC)",
      desc: "Low-interest credit facility for farmers to cover cultivation costs.",
      link: "https://www.nabard.org/content.aspx?id=0,22",
      bg: "bg-purple-50 dark:bg-neutral-900",
      color: "text-purple-700 dark:text-purple-400",
      tags: ["credit", "loan"],
    },
    {
      category: "Income & Credit",
      name: "Pradhan Mantri Shram Yogi Maan-Dhan (PM-SYM)",
      desc: "Pension scheme for unorganized workers in agriculture & allied sectors.",
      link: "https://www.pmsym.nic.in/",
      bg: "bg-lime-50 dark:bg-neutral-900",
      color: "text-lime-700 dark:text-lime-400",
      tags: ["pension", "support", "farmers"],
    },
    {
      category: "Crop Insurance & Risk",
      name: "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
      desc: "Crop insurance against natural calamities, pests, and diseases.",
      link: "https://pmfby.gov.in/",
      bg: "bg-blue-50 dark:bg-neutral-900",
      color: "text-blue-700 dark:text-blue-400",
      tags: ["insurance", "crop", "risk"],
    },
    {
      category: "Sustainable & Climate",
      name: "National Mission on Sustainable Agriculture (NMSA)",
      desc: "Schemes for climate-resilient farming and sustainable practices.",
      link: "https://nmsa.dac.gov.in/",
      bg: "bg-orange-50 dark:bg-neutral-900",
      color: "text-orange-700 dark:text-orange-400",
      tags: ["sustainable", "climate"],
    },
    {
      category: "Sustainable & Climate",
      name: "Paramparagat Krishi Vikas Yojana (PKVY)",
      desc: "Promotes organic farming and eco-friendly practices.",
      link: "https://pgsindia-ncof.gov.in/",
      bg: "bg-amber-50 dark:bg-neutral-900",
      color: "text-amber-700 dark:text-amber-400",
      tags: ["organic", "sustainable", "climate"],
    },
    {
      category: "Irrigation & Water",
      name: "Pradhan Mantri Krishi Sinchai Yojana (PMKSY)",
      desc: "Improved irrigation facilities and efficient water management.",
      link: "https://pmksy.gov.in/",
      bg: "bg-teal-50 dark:bg-neutral-900",
      color: "text-teal-700 dark:text-teal-400",
      tags: ["irrigation", "water"],
    },
    {
      category: "Soil & Research",
      name: "Soil Health Card Scheme",
      desc: "Check soil nutrients and get advice on fertilizer use for higher yields.",
      link: "https://soilhealth.dac.gov.in/",
      bg: "bg-yellow-50 dark:bg-neutral-900",
      color: "text-yellow-700 dark:text-yellow-400",
      tags: ["soil", "fertilizer"],
    },
    {
      category: "Skill & Infrastructure",
      name: "Agriculture Infrastructure Fund (AIF)",
      desc: "Financial support for building post-harvest and farmgate infrastructure.",
      link: "https://agricoop.nic.in/en/Agriculture-Infrastructure-Fund",
      bg: "bg-indigo-50 dark:bg-neutral-900",
      color: "text-indigo-700 dark:text-indigo-400",
      tags: ["infrastructure", "funding", "agriculture"],
    },
    {
      category: "Skill & Infrastructure",
      name: "e-NAM Expansion Scheme",
      desc: "Improves market access and transparency for farmers through online trading.",
      link: "https://enam.gov.in/",
      bg: "bg-rose-50 dark:bg-neutral-900",
      color: "text-rose-700 dark:text-rose-400",
      tags: ["market", "trade", "transparency"],
    },
  ];

  const filteredSchemes = schemes.filter(
    (scheme) =>
      scheme.name.toLowerCase().includes(search.toLowerCase()) ||
      scheme.desc.toLowerCase().includes(search.toLowerCase()) ||
      scheme.tags.some((tag) =>
        tag.toLowerCase().includes(search.toLowerCase())
      )
  );

  const groupedSchemes = filteredSchemes.reduce((groups, scheme) => {
    if (!groups[scheme.category]) groups[scheme.category] = [];
    groups[scheme.category].push(scheme);
    return groups;
  }, {});

  return (
    <div className="relative p-4 md:p-10">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <h2 className="text-3xl font-bold text-green-700 dark:text-green-400 mb-3">
          🌿 Government Schemes for Farmers
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Explore verified central and state government schemes that empower farmers through funding, insurance, and innovation.
        </p>
      </motion.div>

      {/* Search */}
      <div className="mb-8">
        <input
          type="text"
          placeholder="🔍 Search schemes (e.g., insurance, credit, skill)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 outline-none"
        />
      </div>

      {/* Schemes */}
      {Object.keys(groupedSchemes).length > 0 ? (
        Object.keys(groupedSchemes).map((category, i) => (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="mb-10"
          >
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-5">
              {category}
            </h3>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupedSchemes[category].map((scheme, idx) => (
                <Card
                  key={idx}
                  className={`border border-gray-200 dark:border-neutral-800 shadow-sm ${scheme.bg}`}
                >
                  <CardContent className="space-y-3 p-5">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                      {scheme.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {scheme.desc}
                    </p>
                    <a
                      href={scheme.link}
                      className={`font-medium ${scheme.color} hover:underline`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Visit Website →
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        ))
      ) : (
        <p className="text-gray-500 text-lg text-center mt-10">
          ❌ No schemes found. Try another keyword.
        </p>
      )}
    </div>
  );
}