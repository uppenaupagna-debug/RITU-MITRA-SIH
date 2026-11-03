export const convertTemp = (tempC, unit) =>
  unit === "C"
    ? Math.round(tempC)
    : Math.round((tempC * 9) / 5 + 32);

export const convertWind = (speed, unit) =>
  unit === "C"
    ? `${speed} m/s`
    : `${(speed * 2.237).toFixed(1)} mph`;

export const calculateRainProbability = (forecast) => {
  if (!forecast?.list) return 0;

  const avg =
    forecast.list.slice(0, 8).reduce((sum, i) => sum + (i.pop || 0), 0) / 8;

  return Math.round(avg * 100);
};