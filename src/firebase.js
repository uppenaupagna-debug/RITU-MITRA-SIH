// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyABRjioyxafMXaXZVfQn5LlwPudQysB2xg",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "agriassistdashboard.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "agriassistdashboard",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "agriassistdashboard.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1083756635791",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1083756635791:web:5266c7ceb70724a505f2fa",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-0VT1847EF3",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export commonly used services
export const auth = getAuth(app);
export const db = getFirestore(app);
