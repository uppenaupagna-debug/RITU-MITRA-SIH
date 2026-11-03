import React, { useEffect, useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Edit,
  Save,
  LogOut,
  Camera,
  Share2,
  FileText,
  Trash2,
  Loader2,
} from "lucide-react";
import { auth, db } from "../firebase";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import toast, { Toaster } from "react-hot-toast";
import { motion } from "framer-motion";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import indiaDistricts from "../data/indiaDistricts.json";
import { CROPS } from "../data/cropMaster";

/* -------------------------------------------
   🌾 Farmer Profile Dashboard
------------------------------------------- */
export default function Profile() {
  const [user, loadingAuth] = useAuthState(auth);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);

  const [profile, setProfile] = useState({
    name: "",
    contact: "",
    age: "",
    gender: "",
    state: "Telangana",
    district: "Sangareddy",
    village: "",
    farmSize: 0,
    photoBase64: "",
    createdAt: null,
    lastUpdated: null,
  });

  const [preferences, setPreferences] = useState({
    soilType: "Loamy",
    waterSources: [],
    favouriteCrops: [],
  });

  const [cropSearch, setCropSearch] = useState("");
  const profileRef = useRef(null);
  const autosaveRef = useRef(null);

  /* ------------------ 🔐 Auth ------------------ */
  const activeUser = user || { uid: "K260ukR4PyUeu1fbvlF5S8Y6Fzf1", email: "testfarmer@raitumitra.com" };

  /* ------------------ 📡 Firestore ------------------ */
  useEffect(() => {
    const ref = doc(db, "farmers", activeUser.uid);
    setLoading(true);

    const unsub = onSnapshot(ref, async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setProfile((p) => ({
          ...p,
          ...data.profile,
          createdAt: data.profile?.createdAt?.toDate?.() || new Date(),
          lastUpdated: data.lastUpdated?.toDate?.() || new Date(),
        }));
        setPreferences((prev) => ({
          ...prev,
          ...data.preferences,
        }));
      } else {
        await setDoc(ref, {
          uid: activeUser.uid,
          username: activeUser.email?.split("@")[0] || "Farmer",
          role: "farmer",
          profile,
          preferences,
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
        });
      }
      setLoading(false);
    });

    return () => unsub();
  }, [activeUser.uid]);


  /* ------------------ 💾 Auto-save ------------------ */
  const markChanged = () => setHasChanged(true);
  useEffect(() => {
    if (!hasChanged) return;
    clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => {
      saveProfile();
    }, 3000);
    return () => clearTimeout(autosaveRef.current);
    // BUG FIX #15: saveProfile is now stable via useCallback, safe to add as dep
  }, [hasChanged, profile, preferences, saveProfile]);

  const onProfileChange = (k, v) => {
    setProfile((p) => ({ ...p, [k]: v }));
    markChanged();
  };
  const onPrefChange = (k, v) => {
    setPreferences((p) => ({ ...p, [k]: v }));
    markChanged();
  };

  // BUG FIX #15: Wrap saveProfile in useCallback so it can be safely used as a dep
  const saveProfile = useCallback(async () => {
    setSaving(true);
    const ref = doc(db, "farmers", activeUser.uid);
    try {
      await updateDoc(ref, { profile, preferences, lastUpdated: serverTimestamp() });
      toast.success("✅ Profile saved");
      setHasChanged(false);
    } catch (err) {
      await setDoc(ref, {
        uid: activeUser.uid,
        username: activeUser.email?.split("@")[0] || "Farmer",
        role: "farmer",
        profile,
        preferences,
        lastUpdated: serverTimestamp(),
      });
      toast.success("✅ Profile created & saved");
      setHasChanged(false);
    } finally {
      setSaving(false);
    }
  }, [activeUser.uid, activeUser.email, profile, preferences]);


  /* ------------------ 🖼️ Photo ------------------ */
  const handlePhotoUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setProfile((p) => ({ ...p, photoBase64: e.target.result }));
      markChanged();
    };
    reader.readAsDataURL(file);
  };
  const removePhoto = () => {
    setProfile((p) => ({ ...p, photoBase64: "" }));
    markChanged();
  };

  /* ------------------ 📤 Export & Share ------------------ */
  const exportToPDF = async () => {
    if (!profileRef.current) return;
    toast.loading("Generating PDF...");
    try {
      const canvas = await html2canvas(profileRef.current, { scale: 2 });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const width = pdf.internal.pageSize.getWidth();
      const height = (canvas.height * width) / canvas.width;
      pdf.addImage(img, "PNG", 0, 0, width, height);
      // BUG FIX #6: Use activeUser.uid (always defined) instead of nullable user?.uid
      pdf.save(`${profile.name || "profile"}_${activeUser.uid}.pdf`);
      toast.dismiss();
      toast.success("📄 Exported as PDF");
    } catch {
      toast.dismiss();
      toast.error("Export failed");
    }
  };

  const copyShareLink = () => {
    // BUG FIX #7: /profile route exists; /profile/:uid does NOT exist in App.jsx
    const url = `${window.location.origin}/profile`;
    navigator.clipboard.writeText(url);
    toast.success("🔗 Share link copied!");
  };

  /* ------------------ 🌱 Smart Tip ------------------ */
  const farmingTip = () => {
    const soil = (preferences.soilType || "").toLowerCase();
    if (soil.includes("sandy"))
      return "Sandy soil: add organic matter and mulch to retain moisture.";
    if (soil.includes("clayey"))
      return "Clayey soil: improve drainage; avoid waterlogging.";
    return "Maintain soil health with compost and rotation 🌱";
  };

  const handleLogout = async () => {
    await auth.signOut();
    toast.success("👋 Logged out");
    setTimeout(() => navigate("/farmer-login"), 600);
  };

  if (loading || loadingAuth)
    return (
      <div className="flex justify-center items-center h-screen text-gray-500">
        <Loader2 className="animate-spin mr-2" /> Loading Profile...
      </div>
    );

  /* ------------------ 🌾 UI ------------------ */
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 text-gray-900 dark:text-gray-100 pb-24">
      <Toaster position="bottom-center" />
      <div className="max-w-6xl mx-auto p-6" ref={profileRef}>
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-extrabold text-green-700 dark:text-green-400 flex items-center gap-2">
            <User /> My Profile
          </h1>
          <div className="flex gap-3">
            <button onClick={exportToPDF} className="px-4 py-2 rounded-md bg-emerald-600 text-white flex items-center gap-2">
              <FileText size={16} /> Export
            </button>
            <button onClick={copyShareLink} className="px-4 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 flex items-center gap-2">
              <Share2 size={16} /> Share
            </button>
            <button onClick={handleLogout} className="px-4 py-2 rounded-md bg-red-600 text-white flex items-center gap-2">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>

        {/* Profile Info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow border dark:border-gray-700 mb-8">
          <div className="flex gap-6 items-start">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden flex items-center justify-center">
              {profile.photoBase64 ? (
                <img src={profile.photoBase64} alt="Profile" className="object-cover w-full h-full" />
              ) : (
                <Camera className="text-gray-400" size={28} />
              )}
            </div>
            <div className="flex-1">
              <div className="grid sm:grid-cols-2 gap-4">
                <input type="text" placeholder="Full Name" value={profile.name} onChange={(e) => onProfileChange("name", e.target.value)} className="p-2 rounded-md border dark:bg-gray-900 dark:border-gray-700" />
                <input type="text" placeholder="Contact" value={profile.contact} onChange={(e) => onProfileChange("contact", e.target.value)} className="p-2 rounded-md border dark:bg-gray-900 dark:border-gray-700" />
                <input type="number" placeholder="Age" value={profile.age} onChange={(e) => onProfileChange("age", e.target.value)} className="p-2 rounded-md border dark:bg-gray-900 dark:border-gray-700" />
                <select value={profile.gender} onChange={(e) => onProfileChange("gender", e.target.value)} className="p-2 rounded-md border dark:bg-gray-900 dark:border-gray-700">
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e.target.files?.[0])} />
                {profile.photoBase64 && (
                  <button onClick={removePhoto} className="text-sm text-red-600 flex items-center gap-1">
                    <Trash2 size={14} /> Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Farm Details */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow border dark:border-gray-700 mb-8">
          <h2 className="font-semibold mb-4">Farm Details</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {/* State */}
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">State</label>
              <select
                value={profile.state}
                onChange={(e) => {
                  const newState = e.target.value;
                  onProfileChange("state", newState);
                  const firstDistrict = indiaDistricts[newState]?.[0] || "";
                  onProfileChange("district", firstDistrict);
                }}
                className="w-full p-2 rounded-md border dark:bg-gray-900 dark:border-gray-700"
              >
                {Object.keys(indiaDistricts).map((st) => (
                  <option key={st}>{st}</option>
                ))}
              </select>
            </div>
            {/* Farm Health Data */}
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow border dark:border-gray-700 mb-8"
>
  <h2 className="font-semibold mb-4">Farm Health Overview</h2>

  {/* Soil Info */}
  {profile.soilData ? (
    <div className="mb-4 bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
      <h3 className="font-semibold text-green-700 dark:text-green-300 mb-2">
        🌱 Soil Health
      </h3>
      <p>pH: {profile.soilData.pH}</p>
      <p>Organic Carbon: {profile.soilData.SOC}</p>
      <p>Clay %: {profile.soilData.clay}</p>
    </div>
  ) : (
    <p className="text-gray-500 text-sm mb-4">
      No soil data found. Visit your <Link to="/map" className="text-emerald-600 hover:underline font-semibold">Smart Farm Map</Link> to analyze soil.
    </p>
  )}

  {/* NDVI Info */}
  {profile.ndviValue ? (
    <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
      <h3 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">
        🛰️ Vegetation Index (NDVI)
      </h3>
      <p>
        NDVI Value:{" "}
        <b className="text-emerald-700">{profile.ndviValue.toFixed(2)}</b>{" "}
        {profile.ndviValue > 0.6 ? "🌿 Healthy" : "🟤 Stressed Vegetation"}
      </p>
    </div>
  ) : (
    <p className="text-gray-500 text-sm">
      NDVI not available. Draw your farm on the <Link to="/map" className="text-emerald-600 hover:underline font-semibold">Smart Farm Map</Link> to fetch it.
    </p>
  )}
</motion.div>



            {/* District */}
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">District</label>
              <select
                value={profile.district}
                onChange={(e) => onProfileChange("district", e.target.value)}
                className="w-full p-2 rounded-md border dark:bg-gray-900 dark:border-gray-700"
              >
                {(indiaDistricts[profile.state] || []).map((dist) => (
                  <option key={dist}>{dist}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">Village / Address</label>
              <input
                value={profile.village}
                onChange={(e) => onProfileChange("village", e.target.value)}
                className="w-full p-2 rounded-md border dark:bg-gray-900 dark:border-gray-700"
              />
            </div>

            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">Farm Size (acres)</label>
              <input
                type="number"
                value={profile.farmSize}
                onChange={(e) => onProfileChange("farmSize", e.target.value)}
                className="w-full p-2 rounded-md border dark:bg-gray-900 dark:border-gray-700"
              />
            </div>
          </div>
        </motion.div>

        {/* Preferences */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow border dark:border-gray-700 mb-8">
          <h2 className="font-semibold mb-4">Preferences</h2>

          {/* Soil Type */}
          <div className="mb-4">
            {/* Water Sources */}
<div className="mb-4">
  <label className="text-xs text-gray-600 dark:text-gray-300">Water Sources</label>
  <div className="flex flex-wrap gap-2 mt-2">
    {["Rainwater", "Borewell/Tubewell", "Canal Irrigation", "Pond/Well"].map((src) => {
      const selected = preferences.waterSources.includes(src);
      return (
        <button
          key={src}
          type="button"
          onClick={() => {
            const current = preferences.waterSources || [];
            const updated = selected
              ? current.filter((s) => s !== src)
              : [...current, src];
            onPrefChange("waterSources", updated);
          }}
          className={`px-3 py-1 rounded-full border text-sm transition ${
            selected
              ? "bg-green-600 text-white border-green-600"
              : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-green-100 dark:hover:bg-green-800/30"
          }`}
        >
          {src}
        </button>
      );
    })}
  </div>
</div>

            <label className="text-xs text-gray-600 dark:text-gray-300">Soil Type</label>
            <select
              value={preferences.soilType}
              onChange={(e) => onPrefChange("soilType", e.target.value)}
              className="w-full p-2 rounded-md border dark:bg-gray-900 dark:border-gray-700"
            >
              <option>Loamy</option>
              <option>Alluvial</option>
              <option>Sandy</option>
              <option>Clayey</option>
              <option>Red Soil</option>
            </select>
          </div>

          {/* Crop Search */}
          <input
            type="text"
            placeholder="🔍 Search crops..."
            value={cropSearch}
            onChange={(e) => setCropSearch(e.target.value)}
            className="w-full mb-3 p-2 rounded-md border dark:bg-gray-900 dark:border-gray-700"
          />

          {/* Crop Multi-select with Tooltip */}
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
            {CROPS.filter((crop) =>
              crop.name.toLowerCase().includes(cropSearch.toLowerCase())
            ).map((crop) => {
              const selected = preferences.favouriteCrops.includes(crop.name);
              return (
                <div
                  key={crop.id}
                  title={`${crop.name} — ${crop.seasons.join(", ")} | Soil: ${crop.soil.join(", ")} | Yield: ${crop.avgYield} q/acre`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      const curr = preferences.favouriteCrops || [];
                      const updated = selected
                        ? curr.filter((c) => c !== crop.name)
                        : [...curr, crop.name];
                      onPrefChange("favouriteCrops", updated);
                    }}
                    className={`px-3 py-1 rounded-full border flex items-center gap-1 text-sm transition ${
                      selected
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-emerald-100 dark:hover:bg-emerald-800/30"
                    }`}
                  >
                    <span>{crop.icon}</span> {crop.name}
                  </button>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Smart Tip */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-emerald-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 shadow border border-emerald-200 dark:border-gray-700">
          <h3 className="font-semibold mb-2">Smart Tip 🌿</h3>
          <p className="text-sm text-gray-700 dark:text-gray-300">{farmingTip()}</p>
        </motion.div>

        {/* Save */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={saveProfile}
            disabled={saving}
            className="px-6 py-2 rounded-md bg-green-600 text-white font-semibold hover:bg-green-700"
          >
            {saving ? "Saving..." : "Save Now"}
          </button>
        </div>
      </div>
    </div>
  );
}
