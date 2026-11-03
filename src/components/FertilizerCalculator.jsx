import React, { useState, useEffect } from "react";
import { Calculator, Leaf, IndianRupee } from "lucide-react";
import fertilizerData from "../data/fertilizer.json";

const { DEFAULT_FERTILIZERS, DEFAULT_COST, CROP_TYPES } = fertilizerData;

function calculateFertilizers(requirement, fertilizers) {
  const dapNeeded = (requirement.P / fertilizers.DAP.P) * 100;
  const nFromDAP = (dapNeeded * fertilizers.DAP.N) / 100;
  const remainingN = Math.max(0, requirement.N - nFromDAP);
  const ureaNeeded = (remainingN / fertilizers.Urea.N) * 100;
  const mopNeeded = (requirement.K / fertilizers.MOP.K) * 100;

  return {
    Urea: parseFloat(ureaNeeded.toFixed(1)),
    DAP: parseFloat(dapNeeded.toFixed(1)),
    MOP: parseFloat(mopNeeded.toFixed(1)),
  };
}

export default function FertilizerCalculator() {
  const initialCrop = Object.keys(CROP_TYPES["Cereals"])[0];
  const [selectedType, setSelectedType] = useState("Cereals");
  const [selectedCrop, setSelectedCrop] = useState(initialCrop);
  const [requirement, setRequirement] = useState(
    CROP_TYPES["Cereals"][initialCrop]
  );
  const [fieldSize, setFieldSize] = useState(1);
  const [unit, setUnit] = useState("ha");
  const [useCustom, setUseCustom] = useState(false);
  const [customFert, setCustomFert] = useState({
    Urea: { N: 0, P: 0, K: 0 },
    DAP: { N: 0, P: 0, K: 0 },
    MOP: { N: 0, P: 0, K: 0 },
  });
  const [fertilizerCost, setFertilizerCost] = useState({ ...DEFAULT_COST });
  const [farmCrops, setFarmCrops] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 800);
  }, []);

  const handleTypeChange = (e) => {
    const type = e.target.value;
    const firstCrop = Object.keys(CROP_TYPES[type])[0];
    setSelectedType(type);
    setSelectedCrop(firstCrop);
    setRequirement(CROP_TYPES[type][firstCrop]);
  };

  const handleCropChange = (e) => {
    const crop = e.target.value;
    setSelectedCrop(crop);
    setRequirement(CROP_TYPES[selectedType][crop]);
  };

  const handleInputChange = (nutrient, value) => {
    const numericValue = Math.max(0, Number(value));
    setRequirement((prev) => ({ ...prev, [nutrient]: numericValue }));
  };

  const handleCustomChange = (fert, nutrient, value) => {
    const numericValue = Math.max(0, Number(value));
    setCustomFert((prev) => ({
      ...prev,
      [fert]: { ...prev[fert], [nutrient]: numericValue },
    }));
  };

  const handleCostChange = (fert, value) => {
    const numericValue = Math.max(0, Number(value));
    setFertilizerCost((prev) => ({ ...prev, [fert]: numericValue }));
  };

  const addCropToFarm = () => {
    const updatedFerts = useCustom ? customFert : DEFAULT_FERTILIZERS;
    const fertAmounts = calculateFertilizers(requirement, updatedFerts);
    const multiplier = unit === "acre" ? fieldSize * 0.4047 : fieldSize;

    const scaledAmounts = Object.fromEntries(
      Object.entries(fertAmounts).map(([k, v]) => [
        k,
        parseFloat((v * multiplier).toFixed(1)),
      ])
    );

    const scaledCosts = Object.fromEntries(
      Object.entries(scaledAmounts).map(([k, v]) => [
        k,
        parseFloat((v * fertilizerCost[k]).toFixed(2)),
      ])
    );

    setFarmCrops((prev) => [
      ...prev,
      { type: selectedType, crop: selectedCrop, fieldSize, unit, amounts: scaledAmounts, costs: scaledCosts },
    ]);
  };

  const calculateFarmTotals = () => {
    const totalAmounts = { Urea: 0, DAP: 0, MOP: 0 };
    const totalCosts = { Urea: 0, DAP: 0, MOP: 0 };

    farmCrops.forEach((c) => {
      Object.keys(totalAmounts).forEach((fert) => {
        totalAmounts[fert] += c.amounts[fert];
        totalCosts[fert] += c.costs[fert];
      });
    });

    setResult({ totalAmounts, totalCosts });
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-96 text-emerald-500">
        <div className="animate-pulse text-center">
          <Calculator className="w-8 h-8 mx-auto mb-2 animate-spin" />
          <p>Loading fertilizer data...</p>
        </div>
      </div>
    );

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto">
      <div className="p-6 rounded-2xl shadow-xl border border-emerald-200 dark:border-emerald-700 bg-gradient-to-br from-white via-emerald-50 to-green-50 dark:from-neutral-900 dark:to-emerald-950 transition-colors">
        <div className="flex items-center gap-3 mb-6">
          <Calculator className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-2xl font-bold bg-gradient-to-r from-green-500 via-emerald-500 to-indigo-500 text-transparent bg-clip-text">
            Multi-Crop Fertilizer Planner
          </h2>
        </div>

        {/* Crop Selection */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Crop Type</label>
            <select
              value={selectedType}
              onChange={handleTypeChange}
              className="w-full p-3 rounded-lg border border-emerald-400 dark:border-emerald-700 bg-white dark:bg-neutral-900"
            >
              {Object.keys(CROP_TYPES).map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Crop</label>
            <select
              value={selectedCrop}
              onChange={handleCropChange}
              className="w-full p-3 rounded-lg border border-emerald-400 dark:border-emerald-700 bg-white dark:bg-neutral-900"
            >
              {Object.keys(CROP_TYPES[selectedType]).map((crop) => (
                <option key={crop}>{crop}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Nutrients */}
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          {["N", "P", "K"].map((n) => (
            <div key={n}>
              <label className="block text-sm font-medium mb-1">{n} (kg/ha)</label>
              <input
                type="number"
                value={requirement[n]}
                onChange={(e) => handleInputChange(n, e.target.value)}
                className="w-full p-3 rounded-lg border border-emerald-400 dark:border-emerald-700 bg-white dark:bg-neutral-900"
              />
            </div>
          ))}
        </div>

        {/* Field Size */}
        <div className="mt-6 flex gap-3">
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={fieldSize}
            onChange={(e) => setFieldSize(Number(e.target.value))}
            className="flex-1 p-3 rounded-lg border border-emerald-400 dark:border-emerald-700 bg-white dark:bg-neutral-900"
          />
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="p-3 rounded-lg border border-emerald-400 dark:border-emerald-700 bg-white dark:bg-neutral-900"
          >
            <option value="ha">Hectares</option>
            <option value="acre">Acres</option>
          </select>
        </div>

        {/* Custom Fertilizer */}
        <div className="mt-5">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useCustom}
              onChange={(e) => setUseCustom(e.target.checked)}
              className="w-4 h-4 accent-emerald-600"
            />
            Use Custom Fertilizer Composition
          </label>

          {useCustom && (
            <div className="mt-3 grid md:grid-cols-3 gap-3">
              {["Urea", "DAP", "MOP"].map((f) => (
                <div key={f} className="p-3 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-neutral-900">
                  <p className="font-semibold mb-2">{f} NPK</p>
                  <div className="grid grid-cols-3 gap-2">
                    {["N", "P", "K"].map((n) => (
                      <input
                        key={n}
                        type="number"
                        value={customFert[f][n]}
                        onChange={(e) => handleCustomChange(f, n, e.target.value)}
                        placeholder={n}
                        className="p-2 rounded-md border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-neutral-900"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fertilizer Costs */}
        <div className="mt-5 grid md:grid-cols-3 gap-3">
          {["Urea", "DAP", "MOP"].map((f) => (
            <div key={f}>
              <label className="block text-sm font-medium mb-1">{f} Cost (₹/kg)</label>
              <input
                type="number"
                value={fertilizerCost[f]}
                onChange={(e) => handleCostChange(f, e.target.value)}
                className="w-full p-3 rounded-lg border border-emerald-400 dark:border-emerald-700 bg-white dark:bg-neutral-900"
              />
            </div>
          ))}
        </div>

        {/* Add Crop */}
        <div className="mt-6 grid gap-3">
          <button
            onClick={addCropToFarm}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-green-500 via-emerald-500 to-indigo-500 text-white font-semibold shadow-md hover:shadow-emerald-500/30 transition-all"
          >
            ➕ Add Crop to Farm
          </button>

          {farmCrops.length > 0 && (
            <div className="mt-3 p-4 rounded-lg border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-emerald-900 shadow">
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-3">Crops in Farm</h3>
              <ul className="space-y-3">
                {farmCrops.map((c, i) => (
                  <li key={i} className="p-3 rounded-md border border-emerald-100 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                          {c.crop} ({c.fieldSize} {c.unit})
                        </p>
                          
                      </div>
                    </div>
                    <ul className="mt-2 text-sm">
                      {Object.entries(c.amounts).map(([fert, amt]) => (
                        <li key={fert}>
                          {fert}: {amt} kg — ₹ {c.costs[fert]}
                        </li>
                        
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>

              <button
                onClick={calculateFarmTotals}
                className="mt-4 w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                📊 Calculate Total Fertilizer & Cost
              </button>
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="mt-6 p-5 rounded-xl border border-emerald-400 dark:border-emerald-700 bg-gradient-to-br from-emerald-50 to-indigo-50 dark:from-neutral-900 dark:to-emerald-950">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Leaf className="w-5 h-5 text-emerald-600" /> Farm Totals
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-neutral-900">
                <p className="font-semibold mb-2">Fertilizer Amounts</p>
                <ul className="text-sm">
                  {Object.entries(result.totalAmounts).map(([f, v]) => (
                    <li key={f}>
                      {f}: <strong>{v.toFixed(1)} kg</strong>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-neutral-900">
                <p className="font-semibold mb-2">Total Costs</p>
                <ul className="text-sm">
                  {Object.entries(result.totalCosts).map(([f, v]) => (
                    <li key={f}>
                      {f}: <strong><IndianRupee className="inline w-4 h-4" />{v.toFixed(2)}</strong>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 font-bold text-emerald-700 dark:text-emerald-400">
                  💰 Grand Total: ₹
                  {(result.totalCosts.Urea + result.totalCosts.DAP + result.totalCosts.MOP).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        button {
          transition: all 0.25s ease;
        }
        button:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(167, 139, 250, 0.25);
        }
      `}</style>
    </div>
  );
}
