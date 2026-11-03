import React, { useState, useRef, useEffect } from "react";
import demoLeaf from "../assets/demo-leaf.jpeg";

// BUG FIX #13: Use env var instead of hardcoded localhost
const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/predict`
  : "http://localhost:8000/predict";
const SIM_API = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/simulate`
  : "http://localhost:8000/simulate";

export default function DiseaseDetect() {

  const [file, setFile] = useState(null);
  const [origPreview, setOrigPreview] = useState(null);
  const [resp, setResp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showGradcam, setShowGradcam] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [days, setDays] = useState(7);
  const [usage, setUsage] = useState(0);
  const [simulation, setSimulation] = useState(null);

  const fileInputRef = useRef();

  useEffect(() => {
    return () => {
      if (origPreview) URL.revokeObjectURL(origPreview);
    };
  }, [origPreview]);

  function handleFile(f) {
    if (!f) return;
    setFile(f);
    setOrigPreview(URL.createObjectURL(f));
    setResp(null);
    setError(null);
    setShowGradcam(false);
    setSimulation(null);
  }

  function handleDragOver(e) {
    e.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setDragActive(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files?.[0];
    handleFile(droppedFile);
  }

  async function analyze() {
    if (!file) {
      setError("Upload image first.");
      return;
    }

    setLoading(true);
    setError(null);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const r = await fetch(API_URL, { method: "POST", body: fd });
      // BUG FIX #3: Throw with meaningful message instead of empty Error()
      if (!r.ok) throw new Error(`Server error: ${r.status} ${r.statusText}`);
      const data = await r.json();
      setResp(data);
      setSimulation(data.simulation);
    } catch (err) {
      console.error("Analyze error:", err);
      setError("Cannot connect to backend. Make sure the server is running.");
    } finally {
      setLoading(false);
    }
  }

  async function runSimulation(newDays, newUsage) {
    if (!resp?.best?.label) return;

    try {
      const r = await fetch(SIM_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          disease: resp.best.label,
          days: newDays,
          usage: newUsage,
        }),
      });

      const data = await r.json();
      setSimulation(data);
    } catch {
      console.log("Simulation error");
    }
  }

  // BUG FIX #2: Use React state reset instead of window.location.reload()
  function resetAnalysis() {
    setFile(null);
    setOrigPreview(null);
    setResp(null);
    setError(null);
    setShowGradcam(false);
    setSimulation(null);
    setDays(7);
    setUsage(0);
  }

  const pct = (v) => `${(v * 100).toFixed(2)}%`;
  const isHealthy =
    resp?.best?.label?.toLowerCase().includes("healthy") ?? false;

  // BUG FIX #1: Guard against resp or resp.best being null before accessing .severity
  const getBorderColor = () => {
    if (!resp?.best) return "border-gray-300";
    if (isHealthy) return "border-green-500";
    if (resp.best.severity === "High") return "border-red-500";
    if (resp.best.severity === "Moderate") return "border-yellow-500";
    return "border-gray-300";
  };

  const getIcon = () => {
    if (!resp?.best) return null;
    if (isHealthy)
      return <div className="text-green-600 text-5xl">✔</div>;
    if (resp.best.severity === "High")
      return <div className="text-red-600 text-5xl">✖</div>;
    return <div className="text-yellow-600 text-5xl">⚠</div>;
  };

  const getBadgeColor = () => {
    if (!resp?.best) return "bg-gray-100 text-gray-700";
    if (isHealthy) return "bg-green-100 text-green-700";
    if (resp.best.severity === "High")
      return "bg-red-100 text-red-700";
    if (resp.best.severity === "Moderate")
      return "bg-yellow-100 text-yellow-700";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <div className="max-w-7xl mx-auto p-8">

      <h2 className="text-2xl font-bold text-center mb-8">
        Pest &amp; Disease Detector
      </h2>

      {/* UPLOAD */}
      {!resp && (
        <div className="text-center space-y-6">
          <div
            className={`border-2 border-dashed p-10 rounded-xl cursor-pointer transition
            ${dragActive ? "bg-green-50 border-green-500" : "hover:bg-gray-50"}`}
            onClick={() => fileInputRef.current.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            Drag &amp; Drop or Click to Upload
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>

          {origPreview && (
            <img
              src={origPreview}
              alt="preview"
              className="mx-auto max-h-72 rounded-lg shadow-md"
            />
          )}

          {/* BUG FIX #17: Disable button while loading to prevent multiple requests */}
          <button
            onClick={analyze}
            disabled={loading}
            className={`px-6 py-2 text-white rounded-lg transition ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {loading ? "Analyzing..." : "Analyze Image"}
          </button>

          {error && <div className="text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">{error}</div>}
        </div>
      )}

      {/* RESULTS */}
      {resp?.best && (
        <div className="grid md:grid-cols-5 gap-10 items-start">

          {/* LEFT (Image + Simulation) */}
          <div className="md:col-span-2 space-y-6">

            <img
              src={`data:image/jpeg;base64,${resp.leaf_preview}`}
              alt="leaf"
              className="rounded-xl shadow-md"
            />

            {resp.gradcam && (
              <div>
                <button
                  onClick={() => setShowGradcam(!showGradcam)}
                  className="mb-3 px-4 py-2 text-sm bg-gray-200 rounded-lg"
                >
                  {showGradcam ? "Hide Grad-CAM" : "Show Grad-CAM"}
                </button>

                {showGradcam && (
                  <img
                    src={`data:image/jpeg;base64,${resp.gradcam}`}
                    alt="gradcam"
                    className="rounded-xl shadow-md"
                  />
                )}
              </div>
            )}

            {/* Simulation */}
            <div className="bg-gray-100 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold">Disease Growth Simulation</h4>

              <div>
                <label>Days: {days}</label>
                <input
                  type="range"
                  min="1"
                  max="14"
                  value={days}
                  onChange={(e) => {
                    const d = parseInt(e.target.value);
                    setDays(d);
                    runSimulation(d, usage);
                  }}
                  className="w-full"
                />
              </div>

              <div>
                <label>Pesticide Usage: {usage * 100}%</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={usage}
                  onChange={(e) => {
                    const u = parseFloat(e.target.value);
                    setUsage(u);
                    runSimulation(days, u);
                  }}
                  className="w-full"
                />
              </div>

              {simulation && (
                <div>
                  <p>Infection: {simulation.infection_percent}%</p>
                  <p>Yield Loss: {simulation.yield_loss_percent}%</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT */}
          <div className={`md:col-span-3 rounded-xl shadow-lg p-6 border-t-4 ${getBorderColor()}`}>

            <div className="text-center mb-6">
              {getIcon()}

              <div className="mt-4 text-xl font-bold">
                {resp.best.friendly}
              </div>

              <div className="text-sm text-gray-500">
                Crop: {resp.best.crop}
              </div>

              <div className="text-sm">
                Confidence: {pct(resp.best.confidence)}
              </div>

              <div
                className={`mt-2 inline-block px-3 py-1 text-xs rounded-full font-semibold ${getBadgeColor()}`}
              >
                Severity: {resp.best.severity}
              </div>
            </div>

            {/* Quick Stats */}
            {simulation && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-xs text-gray-500">INFECTION</div>
                  <div className="text-lg font-bold text-red-600">
                    {simulation.infection_percent}%
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-xs text-gray-500">YIELD LOSS</div>
                  <div className="text-lg font-bold text-red-600">
                    {simulation.yield_loss_percent}%
                  </div>
                </div>
              </div>
            )}

            <Section title="Pathogen">
              <p className="text-sm">{resp.best.pathogen}</p>
            </Section>

            <Section title="Symptoms" items={resp.best.symptoms} />
            <Section title="Recommended Actions" items={resp.best.suggested_actions} />
            <Section title="Prevention" items={resp.best.prevention} />
            <Section title="Cure" items={resp.best.cure} />

            {/* Top 3 */}
            <div>
              <h4 className="font-semibold mb-2">Top 3 Predictions</h4>
              <div className="space-y-2 text-sm">
                {resp.top3.map((t, i) => (
                  <div key={i} className="flex justify-between bg-gray-50 p-2 rounded-md">
                    <span>{t.label.replace(/__/g, " - ").replace(/_/g, " ")}</span>
                    <span>{pct(t.confidence)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* BUG FIX #2: Reset state instead of reloading the whole page */}
            <button
              onClick={resetAnalysis}
              className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition"
            >
              Analyze Another Image
            </button>

          </div>
        </div>
      )}

      {/* Tips */}
      <div className="mt-16 bg-gray-50 p-6 rounded-xl shadow-sm">
        <h3 className="text-lg font-semibold mb-6 text-center">
          Tips for Best Results
        </h3>

        <div className="grid md:grid-cols-4 gap-4 text-sm">
          <Tip text="Take photos in good lighting" />
          <Tip text="Focus on affected area" />
          <Tip text="Keep camera steady" />
          <Tip text="Avoid blurry images" />
        </div>

        <img
          src={demoLeaf}
          alt="demo"
          className="mx-auto mt-6 w-56 rounded-md shadow-md"
        />
      </div>
    </div>
  );
}

function Section({ title, items, children }) {
  if ((!items || items.length === 0) && !children) return null;
  return (
    <div className="bg-gray-100 rounded-lg p-4 mb-4">
      <h4 className="font-semibold mb-2">{title}</h4>
      {items && (
        <ul className="text-sm space-y-1">
          {items.map((item, i) => (
            <li key={i}>• {item}</li>
          ))}
        </ul>
      )}
      {children}
    </div>
  );
}

function Tip({ text }) {
  return (
    <div className="bg-white p-3 rounded-lg shadow-sm text-gray-700">
      ✔ {text}
    </div>
  );
}