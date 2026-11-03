// utils/weatherCache.js

const CACHE_PREFIX = "rm_weather_";
const TTL = 30 * 60 * 1000; // 30 minutes

export const saveWeatherCache = (lat, lon, data) => {
  try {
    const key = `${CACHE_PREFIX}${lat}_${lon}`;
    const payload = {
      ...data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (err) {
    console.error("Cache save failed", err);
  }
};

export const getWeatherCache = (lat, lon) => {
  try {
    const key = `${CACHE_PREFIX}${lat}_${lon}`;
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const parsed = JSON.parse(cached);

    if (Date.now() - parsed.timestamp > TTL) {
      localStorage.removeItem(key);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};