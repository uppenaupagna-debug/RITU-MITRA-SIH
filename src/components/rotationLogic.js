// src/utils/rotationLogic.js

/**
 * Calculates a SmartScore for a given crop based on farmer inputs and historical data.
 * @param {object} crop - The crop object from cropMaster.json to be scored.
 * @param {object} inputs - The farmer's input data from the form.
 * @param {Array} allCrops - The entire cropMaster.json dataset for lookups.
 * @returns {number} - The calculated SmartScore, capped at a minimum of 30.
 */
export const calculateSmartScore = (crop, inputs, allCrops) => {
    let score = 100;
    const {
        investment,
        soilType,
        soilPH,
        previousCrops,
        waterSource,
        organicFertilizer
    } = inputs;

    // --- Helper function to find a crop object by its ID ---
    const findCropById = (id) => allCrops.find(c => c.id === id);

    // --- 1. Investment Logic ---
    const investmentRanges = {
        Low: [0, 25000],
        Medium: [25001, 50000],
        High: [50001, 75000],
        VeryHigh: [75001, Infinity],
    };
    const farmerInvestmentMax = investmentRanges[investment][1];
    if (crop.investment > farmerInvestmentMax) {
        score -= 20; // Farmer's investment is too low for this crop
    } else if (crop.investment < farmerInvestmentMax * 0.75) {
        score += 10; // Farmer has surplus investment (bonus)
    }

    // --- 2. Soil & pH Logic ---
    if (!crop.soil.types.map(s => s.toLowerCase()).includes(soilType.toLowerCase())) {
        score -= 25; // Soil type mismatch
    }
    if (soilPH && (soilPH < crop.soil.pH[0] || soilPH > crop.soil.pH[1])) {
        score -= 10; // pH is out of the crop's preferred range
    }

    // --- 3. Crop Rotation & History Logic ---
    if (previousCrops && previousCrops.length > 0) {
        const prevCropObjects = previousCrops.map(findCropById).filter(Boolean);

        // a. Legume Bonus: +15 if previous crop was a legume and new crop isn’t
        const lastCrop = prevCropObjects[0];
        if (lastCrop && lastCrop.type === "Legume" && crop.type !== "Legume") {
            score += 15;
        }

        // b. Family Repetition Penalty: −20 per repetition
        const familyRepeats = prevCropObjects.filter(p => p.cropFamily === crop.cropFamily).length;
        score -= familyRepeats * 20;

        // c. High Water Usage Penalty: -15
        const highWaterCrops = prevCropObjects.filter(p => ["High", "Very High"].includes(p.water.requirement)).length;
        if (highWaterCrops >= 2 && ["High", "Very High"].includes(crop.water.requirement)) {
            score -= 15;
        }

        // d. Common Risk Overlap: -10
        const currentRisks = new Set(crop.commonRisks);
        const previousRisks = new Set(prevCropObjects.flatMap(p => p.commonRisks));
        const overlap = [...currentRisks].filter(risk => previousRisks.has(risk));
        if (overlap.length > 0) {
            score -= 10;
        }

        // e. Intercropping Synergy: +10
        const synergy = prevCropObjects.some(p => crop.interCroppingOptions.includes(p.name));
        if (synergy) {
            score += 10;
        }
    }

    // --- 4. Organic Fertilizer Bonus ---
    // Assuming all crops benefit from organic fertilizer as there is no specific flag.
    if (organicFertilizer) {
        score += 10;
    }

    // --- Final Score Capping ---
    return Math.max(30, score);
};