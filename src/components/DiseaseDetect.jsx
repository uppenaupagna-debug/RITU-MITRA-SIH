import React, { useState, useRef, useEffect } from "react";
import demoLeaf from "../assets/demo-leaf.jpeg";
import { useLanguage } from "../context/LanguageContext";
import { Camera, Image as ImageIcon, AlertTriangle, CheckCircle, XCircle, Info, RefreshCw } from "lucide-react";

// Use environment variable if available, else localhost:8000
const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/predict`
  : "http://localhost:8000/predict";
const SIM_API = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/simulate`
  : "http://localhost:8000/simulate";

export default function DiseaseDetect() {
  const { language, t } = useLanguage();

  const [file, setFile] = useState(null);
  const [origPreview, setOrigPreview] = useState(null);
  const [plantPart, setPlantPart] = useState("leaf");
  const [resp, setResp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showGradcam, setShowGradcam] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [days, setDays] = useState(7);
  const [usage, setUsage] = useState(0);
  const [simulation, setSimulation] = useState(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

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
      setError(t("err_no_file") || "Please upload an image first.");
      return;
    }

    setLoading(true);
    setError(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("plant_part", plantPart);
    fd.append("lang", language || "en");

    try {
      const r = await fetch(API_URL, { method: "POST", body: fd });
      if (!r.ok) {
        throw new Error(`Server error: ${r.status} ${r.statusText}`);
      }
      const data = await r.json();

      // Check if diagnostic pipeline returned a rejection or uncertain result
      if (!data.best || data.status !== "success") {
        setResp(data);
        setError(data.message || data.error || "Diagnostic could not be completed.");
        return;
      }

      setResp(data);
      setSimulation(data.simulation || null);
    } catch (err) {
      console.error("Analyze error:", err);
      setError(t("err_server") || "Cannot connect to backend. Make sure the server is running on port 8000.");
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

  function resetAnalysis() {
    setFile(null);
    setOrigPreview(null);
    setResp(null);
    setError(null);
    setShowGradcam(false);
    setSimulation(null);
    setDays(7);
    setUsage(0);
    setPlantPart("leaf");
  }

  const pct = (v) => {
    if (v === null || v === undefined) return "N/A";
    return `${(v * 100).toFixed(1)}%`;
  };

  const isHealthy =
    resp?.best?.label?.toLowerCase().includes("healthy") ?? false;

  const getBorderColor = () => {
    if (!resp?.best) return "border-gray-300 dark:border-gray-700";
    if (isHealthy) return "border-green-500";
    if (resp.best.severity === "High" || resp.best.severity === "Critical") return "border-red-500";
    if (resp.best.severity === "Moderate") return "border-yellow-500";
    return "border-gray-300 dark:border-gray-700";
  };

  const getIcon = () => {
    if (!resp?.best) return null;
    if (isHealthy)
      return <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />;
    if (resp.best.severity === "High" || resp.best.severity === "Critical")
      return <XCircle className="w-12 h-12 text-red-500 mx-auto" />;
    return <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto" />;
  };

  const getBadgeColor = () => {
    if (!resp?.best) return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    if (isHealthy) return "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300";
    if (resp.best.severity === "High" || resp.best.severity === "Critical")
      return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
    if (resp.best.severity === "Moderate")
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300";
    return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  };

  // Determine whether current state is a rejection / warning state (resp exists, but resp.best is null)
  const isRejectedState = resp && !resp.best;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-colors">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          {t("detect_title") || "AI Crop Health & Disease Diagnostic System"}
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          {t("detect_subtitle") || "Certified visual diagnosis powered by deep learning & agronomic verification"}
        </p>
      </div>

      {/* 1. UPLOAD & INPUT AREA (Shown when no successful prediction is rendered) */}
      {!resp?.best && !isRejectedState && (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Plant Part Selector */}
          <div className="bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/60 rounded-xl p-5 shadow-sm">
            <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
              🌿 {t("detect_part_label") || "Visible Plant Part"}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              <button
                type="button"
                onClick={() => setPlantPart("leaf")}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-left transition font-medium ${
                  plantPart === "leaf"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-400 dark:text-emerald-200 ring-1 ring-emerald-500"
                    : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                }`}
              >
                <span>🍃 {t("detect_part_leaf") || "Leaf (Certified - Validated)"}</span>
                {plantPart === "leaf" && <span className="text-xs font-bold text-emerald-600">✓</span>}
              </button>

              <button
                type="button"
                onClick={() => setPlantPart("stem")}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-left transition text-xs ${
                  plantPart === "stem"
                    ? "bg-amber-50 border-amber-500 text-amber-900 dark:bg-amber-950/60 dark:border-amber-400 dark:text-amber-200 ring-1 ring-amber-500"
                    : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600"
                }`}
              >
                <span>🪵 {t("detect_part_stem") || "Stem / Stalk (Unsupported)"}</span>
              </button>

              <button
                type="button"
                onClick={() => setPlantPart("bud")}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-left transition text-xs ${
                  plantPart === "bud"
                    ? "bg-amber-50 border-amber-500 text-amber-900 dark:bg-amber-950/60 dark:border-amber-400 dark:text-amber-200 ring-1 ring-amber-500"
                    : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600"
                }`}
              >
                <span>🌸 {t("detect_part_bud") || "Bud / Flower (Unsupported)"}</span>
              </button>

              <button
                type="button"
                onClick={() => setPlantPart("branch")}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-left transition text-xs ${
                  plantPart === "branch"
                    ? "bg-amber-50 border-amber-500 text-amber-900 dark:bg-amber-950/60 dark:border-amber-400 dark:text-amber-200 ring-1 ring-amber-500"
                    : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600"
                }`}
              >
                <span>🌿 {t("detect_part_branch") || "Branch / Twig (Unsupported)"}</span>
              </button>

              <button
                type="button"
                onClick={() => setPlantPart("root")}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-left transition text-xs ${
                  plantPart === "root"
                    ? "bg-amber-50 border-amber-500 text-amber-900 dark:bg-amber-950/60 dark:border-amber-400 dark:text-amber-200 ring-1 ring-amber-500"
                    : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600"
                }`}
              >
                <span>🥔 {t("detect_part_root") || "Root / Tuber (Unsupported)"}</span>
              </button>
            </div>

            <div className="mt-3 flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Info className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{t("detect_part_scope_warning") || "Scope Notice: Certified deep learning model evaluates foliar (leaf) tissue. Stems, buds, and roots require manual agronomic inspection."}</span>
            </div>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div
            className={`border-2 border-dashed p-8 sm:p-10 rounded-2xl cursor-pointer text-center transition-all ${
              dragActive
                ? "bg-emerald-50 border-emerald-500 dark:bg-emerald-950/30"
                : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/40 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="p-4 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                <ImageIcon className="w-8 h-8" />
              </div>
              <div className="font-semibold text-gray-800 dark:text-gray-200 text-base">
                {t("detect_upload_label") || "Drag & Drop crop photo or Click to Browse"}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md">
                {t("detect_upload_hint") || "Supports JPG, JPEG, PNG, WebP (Max 15MB). Clear photos of crop leaf."}
              </p>
            </div>

            {/* Standard Gallery File Input (Does not trigger camera directly) */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />

            {/* Dedicated Camera Input (Mobile capture) */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>

          {/* Mobile Camera Option Button */}
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition border border-gray-300 dark:border-gray-700 shadow-sm"
            >
              <Camera className="w-4 h-4 text-emerald-500" />
              <span>{t("detect_camera_btn") || "Take Photo with Camera"}</span>
            </button>
          </div>

          {/* Image Preview & Details */}
          {origPreview && (
            <div className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-center space-y-3">
              <div className="relative inline-block">
                <img
                  src={origPreview}
                  alt="preview"
                  className="mx-auto max-h-72 w-auto max-w-full rounded-lg shadow-md object-contain border border-gray-300 dark:border-gray-600"
                />
              </div>
              {file && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          )}

          {/* Action Button */}
          <div className="text-center">
            <button
              onClick={analyze}
              disabled={loading || !file}
              className={`w-full sm:w-auto px-8 py-3.5 text-white font-semibold rounded-xl shadow-lg transition active:scale-95 ${
                loading || !file
                  ? "bg-gray-400 dark:bg-gray-700 cursor-not-allowed opacity-75"
                  : "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-emerald-500/20"
              }`}
            >
              {loading
                ? (t("detect_analyzing_btn") || "Running AI Diagnostics...")
                : (t("detect_analyze_btn") || "Analyze Crop Health")}
            </button>
          </div>

          {/* Error Banner */}
          {error && !isRejectedState && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {/* 2. REJECTION / WARNING CARD (Shown if backend rejected non-plant, human, unsupported part, etc.) */}
      {isRejectedState && (
        <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 border-2 border-amber-400 dark:border-amber-500/60 rounded-2xl shadow-xl p-6 sm:p-8 text-center space-y-5 animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {resp?.status === "rejected_not_plant" && (t("err_not_plant") || "Plant Not Detected")}
              {resp?.status === "rejected_human" && (t("err_human_detected") || "Person / Unrelated Object Detected")}
              {resp?.status === "rejected_blank" && "Blank or Low-Contrast Image"}
              {resp?.status === "unsupported_part" && (t("err_unsupported_part") || "Outside Model Scope: Leaf Only")}
              {resp?.status === "uncertain" && (t("err_uncertain") || "Uncertain Diagnostic Prediction")}
              {resp?.status === "model_unavailable" && "Model Checkpoint Unavailable"}
              {!["rejected_not_plant", "rejected_human", "rejected_blank", "unsupported_part", "uncertain", "model_unavailable"].includes(resp?.status) && "Diagnosis Not Possible"}
            </h3>

            <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed max-w-lg mx-auto">
              {resp?.message || error || "Please upload a clear photograph of a crop leaf."}
            </p>
          </div>

          {origPreview && (
            <div className="inline-block border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-gray-50 dark:bg-gray-900">
              <img
                src={origPreview}
                alt="Uploaded"
                className="max-h-48 rounded object-contain mx-auto"
              />
              <span className="block text-[11px] text-gray-500 mt-1">Uploaded image</span>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={resetAnalysis}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{t("btn_retry") || t("detect_reset_btn") || "Analyze Another Photo"}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. DIAGNOSTIC RESULTS DISPLAY (Shown on successful analysis) */}
      {resp?.best && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Visual Evidence + Grad-CAM + Progression Simulation */}
          <div className="lg:col-span-5 space-y-6">
            {/* Real Processed Preview */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                Processed Crop Image
              </h4>
              {resp.leaf_preview ? (
                <img
                  src={`data:image/jpeg;base64,${resp.leaf_preview}`}
                  alt="Leaf Crop Preview"
                  className="w-full rounded-xl object-contain max-h-80 shadow-sm border border-gray-100 dark:border-gray-700"
                />
              ) : origPreview ? (
                <img
                  src={origPreview}
                  alt="Original Leaf Preview"
                  className="w-full rounded-xl object-contain max-h-80 shadow-sm"
                />
              ) : null}
            </div>

            {/* Authentic Grad-CAM Overlay */}
            {resp.gradcam && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Neural Attention Map
                  </h4>
                  <button
                    onClick={() => setShowGradcam(!showGradcam)}
                    className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:hover:bg-emerald-900 dark:text-emerald-300 rounded-lg transition"
                  >
                    {showGradcam
                      ? (t("gradcam_hide") || "Hide Grad-CAM")
                      : (t("gradcam_show") || "Show Grad-CAM Heatmap")}
                  </button>
                </div>

                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {t("gradcam_desc") || "Visualizes the exact leaf regions the neural network focused on to determine this diagnosis."}
                </p>

                {showGradcam && (
                  <div className="animate-fadeIn">
                    <img
                      src={`data:image/jpeg;base64,${resp.gradcam}`}
                      alt="Grad-CAM Activation Heatmap"
                      className="w-full rounded-xl object-contain max-h-80 shadow-sm border border-gray-200 dark:border-gray-700"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Illustrative Simulation */}
            <div className="bg-gray-50 dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
              <div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                  {t("detect_simulation") || "Disease Growth & Yield Simulation"}
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {t("detect_sim_disclaimer") || "Illustrative agronomic projection based on untreated progression models. Not a guaranteed forecast."}
                </p>
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-700 dark:text-gray-300 mb-1">
                  <span>{t("detect_days") || "Days Untreated"}:</span>
                  <span className="font-bold">{days} days</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="14"
                  value={days}
                  onChange={(e) => {
                    const d = parseInt(e.target.value, 10);
                    setDays(d);
                    runSimulation(d, usage);
                  }}
                  className="w-full accent-emerald-600 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-700 dark:text-gray-300 mb-1">
                  <span>{t("detect_pesticide_usage") || "Intervention Efficacy"}:</span>
                  <span className="font-bold">{(usage * 100).toFixed(0)}%</span>
                </div>
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
                  className="w-full accent-emerald-600 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer"
                />
              </div>

              {simulation && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-white dark:bg-gray-900/60 p-3 rounded-xl border border-gray-200 dark:border-gray-700/60 text-center">
                    <div className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">
                      {t("detect_infection") || "Infection Spread"}
                    </div>
                    <div className="text-base font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                      {simulation.infection_percent ?? 0}%
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-900/60 p-3 rounded-xl border border-gray-200 dark:border-gray-700/60 text-center">
                    <div className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">
                      {t("detect_yield_loss") || "Yield Loss Risk"}
                    </div>
                    <div className="text-base font-extrabold text-red-600 dark:text-red-400 mt-1">
                      {simulation.yield_loss_percent ?? 0}%
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Agronomic Diagnosis, Verified Remedies & Differential Ranking */}
          <div className={`lg:col-span-7 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 border-t-4 ${getBorderColor()} space-y-6`}>
            {/* Header / Diagnosis Headline */}
            <div className="text-center pb-4 border-b border-gray-100 dark:border-gray-700">
              {getIcon()}

              <h3 className="mt-3 text-2xl font-extrabold text-gray-900 dark:text-white">
                {resp.best.friendly || "Crop Disease Diagnosis"}
              </h3>

              <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
                <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
                  {t("detect_crop") || "Crop"}: {resp.best.crop || "Crop"}
                </span>

                <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800">
                  {t("detect_confidence") || "Confidence"}: {pct(resp.best.confidence)}
                </span>

                <span className={`px-3 py-1 rounded-full font-semibold border ${getBadgeColor()}`}>
                  {t("detect_severity") || "Severity"}: {resp.best.severity || "Standard"}
                </span>
              </div>
            </div>

            {/* Pathogen */}
            {resp.best.pathogen && (
              <Section title={t("detect_pathogen") || "Likely Pathogen / Cause"}>
                <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                  {resp.best.pathogen}
                </p>
              </Section>
            )}

            {/* Symptoms */}
            <Section title={t("detect_symptoms") || "Observed Symptoms"} items={resp.best.symptoms} />

            {/* Recommended First Actions */}
            <Section title={t("detect_actions") || "Immediate First Actions"} items={resp.best.suggested_actions} />

            {/* Cultural & Environmental Remedies */}
            <Section title={t("detect_cultural") || "Cultural & Environmental Remedies"} items={resp.best.cultural_remedies} />

            {/* Prevention */}
            <Section title={t("detect_prevention") || "Prevention & Long-term Care"} items={resp.best.prevention} />

            {/* Cure / IPM Treatment */}
            <Section title={t("detect_cure") || "Recommended Cure & Care"} items={resp.best.cure} />

            {/* Top 3 Differential Diagnoses */}
            {resp.top3 && Array.isArray(resp.top3) && resp.top3.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-900/60 rounded-xl p-4 border border-gray-200 dark:border-gray-700/60">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                  {t("detect_top3") || "Top Differential Diagnoses"}
                </h4>
                <div className="space-y-1.5 text-xs">
                  {resp.top3.map((tItem, i) => (
                    <div key={i} className="flex justify-between items-center bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700">
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {tItem.friendly || tItem.label?.replace(/___/g, " - ").replace(/_/g, " ")}
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {pct(tItem.confidence)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MAO Consultation Threshold Guidance */}
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>{t("detect_consult") || "When to Consult an Agricultural Officer"}</span>
              </div>
              <p className="leading-relaxed">
                {resp.best.consult_threshold || t("detect_consult_text") || "If symptoms spread beyond 25% of the plot within 48 hours, contact your local Mandal Agricultural Officer (MAO) or Rythu Vedika representative immediately."}
              </p>
            </div>

            {/* Reset / New Analysis Button */}
            <button
              onClick={resetAnalysis}
              className="mt-6 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 rounded-xl transition shadow-lg shadow-emerald-600/20 active:scale-98"
            >
              {t("detect_reset_btn") || "Analyze Another Image"}
            </button>
          </div>
        </div>
      )}

      {/* 4. GUIDELINES & TIPS SECTION */}
      <div className="mt-16 bg-gray-50 dark:bg-gray-800/60 p-6 sm:p-8 rounded-2xl border border-gray-200 dark:border-gray-700/60 shadow-sm">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-6 text-center">
          {t("detect_tips_title") || "Best Photo Guidelines for Accurate Diagnosis"}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs sm:text-sm">
          <Tip text={t("tip_lighting") || "Capture under natural daylight"} />
          <Tip text={t("tip_focus") || "Focus closely on the diseased spot"} />
          <Tip text={t("tip_steady") || "Hold camera steady without blur"} />
          <Tip text={t("tip_clean") || "Show both healthy & diseased tissue"} />
        </div>

        <div className="mt-6 flex flex-col items-center">
          <img
            src={demoLeaf}
            alt="Reference healthy leaf photograph"
            className="w-48 sm:w-56 rounded-xl shadow-md border border-gray-200 dark:border-gray-700"
          />
          <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
            Sample optimal leaf focus angle
          </span>
        </div>
      </div>
    </div>
  );
}

function Section({ title, items, children }) {
  if ((!items || items.length === 0) && !children) return null;
  return (
    <div className="bg-gray-50 dark:bg-gray-900/60 rounded-xl p-4 border border-gray-100 dark:border-gray-700/60">
      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2">
        {title}
      </h4>
      {items && Array.isArray(items) && items.length > 0 && (
        <ul className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
      {children}
    </div>
  );
}

function Tip({ text }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-medium flex items-center gap-2 shadow-sm">
      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
      <span>{text}</span>
    </div>
  );
}
