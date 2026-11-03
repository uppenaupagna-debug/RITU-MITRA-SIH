// 🌾 FarmerFarmMap.jsx — FINAL VITE COMPATIBLE VERSION

import React, { useState, useRef, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  FeatureGroup,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

// ⭐ Leaflet Draw (correct working imports for Vite)
import L from "leaflet";
import "leaflet-draw/dist/leaflet.draw.js";
import "leaflet-draw/dist/leaflet.draw.css";

// 🔧 Fix Leaflet Default Marker Icon issues in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Utilities
import "leaflet-geometryutil";
import "leaflet-control-geocoder/dist/Control.Geocoder.css";
import "leaflet-control-geocoder";

// UI + Icons
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { Link } from "react-router-dom";
import { auth, db } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Loader2, Ruler, MapPin, TestTube2 } from "lucide-react";

/* 🔍 Search Control */
function SearchControl() {
  const map = useMap();
  useEffect(() => {
    const geocoder = L.Control.geocoder({
      defaultMarkGeocode: false,
      placeholder: "🔍 Search a place...",
    })
      .on("markgeocode", (e) => {
        const bbox = e.geocode.bbox;
        const poly = L.polygon([
          bbox.getSouthEast(),
          bbox.getNorthEast(),
          bbox.getNorthWest(),
          bbox.getSouthWest(),
        ]);
        map.fitBounds(poly.getBounds());
      })
      .addTo(map);

    return () => map.removeControl(geocoder);
  }, [map]);
  return null;
}

/* 🧭 Map Reference Setter Helper Component */
function MapRefSetter({ setMap }) {
  const map = useMap();
  useEffect(() => {
    if (map) {
      setMap(map);
    }
  }, [map, setMap]);
  return null;
}

/* ─────────────────────────────────────────────────────────
   📍 Shared 3-tier location utility
   Tier 1: browser geolocation high-accuracy (GPS / Wi-Fi)
   Tier 2: browser geolocation low-accuracy (Wi-Fi / IP)
   Tier 3: IP-based geolocation — zero permission needed,
           works on every device just like Apple Maps city detection
───────────────────────────────────────────────────────── */
async function getLocationWithFallback() {
  // ── Tier 1 & 2: Try browser geolocation ──────────────────
  if (navigator.geolocation) {
    const tryBrowser = (highAccuracy) =>
      new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, method: highAccuracy ? "GPS" : "Wi-Fi" }),
          (err) => reject(err),
          { enableHighAccuracy: highAccuracy, timeout: highAccuracy ? 8000 : 10000, maximumAge: 0 }
        );
      });

    try {
      return await tryBrowser(true);   // Tier 1: high-accuracy
    } catch (_e) {
      try {
        return await tryBrowser(false); // Tier 2: low-accuracy (Wi-Fi/network)
      } catch (_e2) { }
      // Both browser tiers failed (denied OR unavailable) → fall through to Tier 3
    }
  }

  // ── Tier 3 is ALWAYS attempted if Tier 1 & 2 fail for ANY reason ─────────
  // IP geolocation needs zero browser permission — works even when geolocation
  // is fully blocked, just like how websites detect your country/city

  // ── Tier 3: IP geolocation — no permission required ──────
  // ipapi.co is free, no API key needed, returns city-level accuracy
  const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error("IP geo failed");
  const data = await res.json();
  if (!data.latitude) throw new Error("IP geo: no coords");
  return { lat: data.latitude, lng: data.longitude, method: "IP", city: data.city };
}

/* 📍 Auto-Locate on Map Load — fires once when the map mounts */
function AutoLocate({ hasSavedFarm }) {
  const map = useMap();

  useEffect(() => {
    if (hasSavedFarm) return; // Keep saved farm in view

    getLocationWithFallback()
      .then(({ lat, lng, method, city }) => {
        map.flyTo([lat, lng], method === "IP" ? 12 : 14, { animate: true, duration: 1.5 });

        if (map._autoLocateCircle) map.removeLayer(map._autoLocateCircle);

        const circle = L.circleMarker([lat, lng], {
          radius: 8,
          color: "#10b981",
          fillColor: "#10b981",
          fillOpacity: 0.35,
          weight: 2,
        })
          .addTo(map)
          .bindPopup(
            method === "IP"
              ? `📍 Approx. location${city ? ` (${city})` : ""} — draw your farm here`
              : "📍 Your location — draw your farm around this point"
          )
          .openPopup();

        map._autoLocateCircle = circle;
      })
      .catch(() => {
        // All tiers failed — stay on default Telangana centre, no error shown
      });
  }, [map, hasSavedFarm]);

  return null;
}

export default function FarmerFarmMap() {
  const [user] = useAuthState(auth);
  const activeUser = user || { uid: "K260ukR4PyUeu1fbvlF5S8Y6Fzf1", email: "testfarmer@raitumitra.com" };
  const [loading, setLoading] = useState(true);
  const [farmBoundary, setFarmBoundary] = useState(null);
  const [activity, setActivity] = useState("Idle");
  const [fetching, setFetching] = useState(false);
  const [farmArea, setFarmArea] = useState(null);
  const [soilData, setSoilData] = useState(null);

  const [mapInstance, setMapInstance] = useState(null);
  const featureGroupRef = useRef(null);

  /* 🧭 Load saved farm */
  useEffect(() => {
    const fetchFarm = async () => {
      try {
        const ref = doc(db, "farmers", activeUser.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const d = snap.data();

          if (Array.isArray(d.farmBoundary)) {
            const converted = d.farmBoundary.map((p) => [p.lat, p.lng]);
            setFarmBoundary(converted);
          }

          setActivity(d.currentActivity || "Idle");
          setFarmArea(d.farmArea || null);
          setSoilData(d.soilData || null);
        }
      } catch (e) {
        console.error("Error loading farm:", e);
      }
      setLoading(false);
    };
    fetchFarm();
  }, [activeUser.uid]);


  /* 🗺️ Render saved polygon */
  useEffect(() => {
    if (!farmBoundary || !featureGroupRef.current) return;

    const fg = featureGroupRef.current;
    fg.clearLayers();

    const poly = L.polygon(farmBoundary, {
      color: "#7c3aed",
      fillColor: "#a78bfa",
      fillOpacity: 0.4,
    });

    fg.addLayer(poly);
  }, [farmBoundary]);

  /* ✏️ Leaflet Draw Setup */
  useEffect(() => {
    if (!mapInstance || !featureGroupRef.current) return;

    const map = mapInstance;
    const drawnItems = featureGroupRef.current;

    if (map._customDrawControl) {
      map.removeControl(map._customDrawControl);
    }

    map.off(L.Draw.Event.CREATED);
    map.off(L.Draw.Event.DELETED);

    const drawControl = new L.Control.Draw({
      edit: {
        featureGroup: drawnItems,
        remove: true,
      },
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: {
            color: "#7c3aed",
            fillColor: "#a78bfa",
            fillOpacity: 0.4,
          },
        },
        polyline: false,
        rectangle: {
          shapeOptions: {
            color: "#7c3aed",
            fillColor: "#a78bfa",
            fillOpacity: 0.4,
          },
        },
        circle: false,
        marker: false,
        circlemarker: false,
      },
    });

    drawControl.addTo(map);
    map._customDrawControl = drawControl;

    map.on(L.Draw.Event.CREATED, (e) => {
      drawnItems.clearLayers();
      const layer = e.layer;
      drawnItems.addLayer(layer);

      const coords = layer.getLatLngs()[0].map((c) => [c.lat, c.lng]);
      setFarmBoundary(coords);

      const areaSqM = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);
      const acres = areaSqM / 4046.856;
      setFarmArea(acres);

      layer.bindPopup(`📏 Area: ${acres.toFixed(2)} acres`).openPopup();
    });

    map.on(L.Draw.Event.DELETED, () => {
      drawnItems.clearLayers();
      setFarmBoundary(null);
      setFarmArea(null);
      setSoilData(null);
    });

    return () => {
      map.off(L.Draw.Event.CREATED);
      map.off(L.Draw.Event.DELETED);
      if (map._customDrawControl) {
        map.removeControl(map._customDrawControl);
        map._customDrawControl = null;
      }
    };
  }, [mapInstance]);

  /* 📍 Helpers */
  const centroid = (coords) => {
    try {
      return L.polygon(coords).getBounds().getCenter();
    } catch (_err) {
      const lat = coords.reduce((s, c) => s + c[0], 0) / coords.length;
      const lon = coords.reduce((s, c) => s + c[1], 0) / coords.length;
      return { lat, lng: lon };
    }
  };

  /* 🧪 Soil Data */
  const fetchSoil = async (lat, lon) => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const url = `${baseUrl}/api/v1/soil/analyze?lat=${lat}&lon=${lon}`;
      const { data } = await axios.get(url);
      return data;
    } catch (e) {
      console.error("Soil fetch failed:", e);
      return { pH: "N/A", SOC: "N/A", clay: "N/A" };
    }
  };

  const saveFarm = async () => {
    if (!farmBoundary) return toast.error("Draw your farm first!");

    setFetching(true);
    try {
      const safeBoundary = farmBoundary.map(([lat, lng]) => ({ lat, lng }));
      const { lat, lng } = centroid(farmBoundary);
      const soil = await fetchSoil(lat, lng);

      await setDoc(
        doc(db, "farmers", activeUser.uid),
        {
          farmBoundary: safeBoundary,
          currentActivity: activity,
          farmArea: farmArea || null,
          soilData: soil,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setSoilData(soil);
      toast.success("✅ Farm & Soil Data saved successfully!");
    } catch (e) {
      console.error("Firestore save error:", e);
      toast.error("❌ Failed to save.");
    } finally {
      setFetching(false);
    }
  };

  const locateUser = () => {
    const map = mapInstance;
    if (!map) return toast.error("Map not ready");

    if (!navigator.geolocation) {
      return toast.error("📍 Geolocation is not supported by your browser.");
    }

    const toastId = toast.loading("Acquiring location...");

    const fallbackToIP = async (reason, activeToastId) => {
      console.warn(`Browser geolocation failed (${reason}). Falling back to IP-based location...`);
      if (activeToastId) toast.dismiss(activeToastId);
      const ipToastId = toast.loading("🌐 Estimating location via IP...");
      try {
        const { data } = await axios.get("https://freeipapi.com/api/json");
        if (data && data.latitude && data.longitude) {
          const { latitude, longitude, cityName, regionName } = data;
          toast.dismiss(ipToastId);
          map.flyTo([latitude, longitude], 12);

          if (map._userMarker) map.removeLayer(map._userMarker);

          const marker = L.marker([latitude, longitude])
            .addTo(map)
            .bindPopup(`📍 Estimated: Near ${cityName}, ${regionName} (IP-based)`)
            .openPopup();

          map._userMarker = marker;
          toast.success(`Estimated location near ${cityName} via IP!`);
        } else {
          throw new Error("Invalid IP location data");
        }
      } catch (e) {
        console.error("IP geolocation fallback failed:", e);
        toast.dismiss(ipToastId);
        toast.error("📍 Location Unavailable! Check your device GPS or connection.");
      }
    };

    const onSuccess = (pos) => {
      toast.dismiss(toastId);
      const { latitude, longitude } = pos.coords;
      map.flyTo([latitude, longitude], 15);

      if (map._userMarker) map.removeLayer(map._userMarker);

      const marker = L.marker([latitude, longitude])
        .addTo(map)
        .bindPopup("📍 You are here")
        .openPopup();

      map._userMarker = marker;
      toast.success("📍 Location acquired successfully!");
    };

    const onError = (err) => {
      console.error("Browser geolocation error:", err);
      if (err.code === 1) {
        toast.dismiss(toastId);
        toast.error(
          <div className="text-xs">
            <b>📍 Location Access Denied!</b>
            <p className="mt-1">
              Please enable location permissions in your browser, or we will estimate via IP.
            </p>
          </div>,
          { duration: 4000 }
        );
        setTimeout(() => fallbackToIP("Permission Denied", null), 1500);
      } else {
        fallbackToIP(err.code === 2 ? "Position Unavailable" : "Timeout", toastId);
      }
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    });
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-96 text-gray-500">
        <Loader2 className="animate-spin mr-2" /> Loading Farm Map...
      </div>
    );

  // BUG FIX: Default to Hyderabad/Telangana (zoom 11) instead of all-India zoom 5
  const center = farmBoundary
    ? centroid(farmBoundary)
    : { lat: 17.385, lng: 78.4867 };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Toaster position="bottom-right" />

      {/* Top Buttons */}
      <div className="flex justify-between mb-4">
        <Link
          to="/profile"
          className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800"
        >
          ← Back to Profile
        </Link>
        <button
          onClick={locateUser}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md shadow flex items-center gap-2"
        >
          <MapPin size={16} /> Locate Me
        </button>
      </div>

      <h1 className="text-3xl font-bold text-emerald-700 mb-4 flex items-center gap-2">
        <MapPin className="text-emerald-600" /> My Smart Farm Map
      </h1>

      <MapContainer
        center={[center.lat, center.lng]}
        zoom={farmBoundary ? 14 : 11}
        style={{ height: "500px", borderRadius: "1rem" }}
      >
        <MapRefSetter setMap={setMapInstance} />
        {/* 🌍 Auto-centres the map to the user's location on first load */}
        <AutoLocate hasSavedFarm={!!farmBoundary} />
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="© Esri, Earthstar Geographics"
        />

        <FeatureGroup ref={featureGroupRef}></FeatureGroup>
        <SearchControl />

        {farmBoundary && (
          <Marker position={[center.lat, center.lng]}>
            <Popup>Farm Center</Popup>
          </Marker>
        )}
      </MapContainer>

      <div className="mt-4 bg-white p-5 rounded-xl shadow">
        {farmBoundary ? (
          <>
            {farmArea && (
              <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                <Ruler size={16} /> <b>Area:</b> {farmArea.toFixed(2)} acres
              </div>
            )}

            <label className="block font-medium mb-1">Current Activity</label>
            <select
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              className="p-2 border rounded-lg"
            >
              <option>Idle</option>
              <option>Ploughing</option>
              <option>Sowing</option>
              <option>Irrigating</option>
              <option>Weeding</option>
              <option>Harvesting</option>
            </select>

            <button
              onClick={saveFarm}
              disabled={fetching}
              className="mt-4 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow"
            >
              {fetching ? "Saving..." : "💾 Save Farm + Analyze Soil"}
            </button>

            {soilData && (
              <div className="mt-4 bg-green-50 p-3 rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <TestTube2 /> Soil Data
                </h4>
                <p>pH: {soilData.pH}</p>
                <p>Organic Carbon: {soilData.SOC}</p>
                <p>Clay %: {soilData.clay}</p>
              </div>
            )}
          </>
        ) : (
          <p className="text-gray-500">
            🪄 Use the draw tool (top-left of map) to mark your farm boundary.
          </p>
        )}
      </div>
    </div>
  );
}