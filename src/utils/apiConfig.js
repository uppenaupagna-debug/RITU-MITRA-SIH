// src/utils/apiConfig.js
// Dynamic API Base URL resolver:
// If window is loaded on a LAN IP (e.g., 192.168.x.x) or mobile device,
// automatically point backend API requests to the same host on port 8000!

export function getApiBaseUrl() {
  if (typeof window !== "undefined" && window.location) {
    const hostname = window.location.hostname;
    // If accessing via the public Cloudflare frontend URL, route to the public Cloudflare backend URL
    if (hostname === "kingdom-assure-hopkins-toolbar.trycloudflare.com") {
      return "https://sky-boxing-accidents-responses.trycloudflare.com";
    }
    // If accessing via LAN IP or custom hostname (like 192.168.29.43), use that same host for port 8000
    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `${window.location.protocol}//${hostname}:8000`;
    }
  }
  // Fallback to configured VITE_API_URL or localhost:8000 for local desktop
  return import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
}

export const API_BASE_URL = getApiBaseUrl();

