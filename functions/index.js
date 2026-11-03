const functions = require("firebase-functions");
const axios = require("axios");
const cors = require("cors")({ origin: true });

exports.getSoilData = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { lat, lon } = req.query;
      if (!lat || !lon)
        return res.status(400).json({ error: "Missing lat/lon parameters" });

      const url = `https://rest.isric.org/soilgrids/v2.0/properties/query?lat=${lat}&lon=${lon}&property=phh2o&property=soc&property=clay`;

      const { data } = await axios.get(url);
      const props = data?.properties || {};

      // Helper function: pick first valid mean value across layers
      const getVal = (obj) => {
        const layers = obj?.M ? Object.values(obj.M) : [];
        for (let layer of layers) {
          if (layer.mean !== undefined && layer.mean !== null) return layer.mean;
        }
        return "N/A";
      };

      const soil = {
        pH: getVal(props.phh2o),
        SOC: getVal(props.soc),
        clay: getVal(props.clay),
      };

      res.json({ soil });
    } catch (err) {
      console.error("🌍 Soil API fetch failed:", err.message);
      res.status(500).json({ error: "Failed to fetch soil data" });
    }
  });
});
