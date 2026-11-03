import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";  // ⭐ Added useLocation
import { auth, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import toast, { Toaster } from "react-hot-toast";

export default function FarmerLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation(); // ⭐ Capture where the user came from

  // ⭐ If no "from" route → default to profile
  const from = location.state?.from || "/profile";

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let userCred;

      if (isSignup) {
        // SIGNUP
        userCred = await createUserWithEmailAndPassword(auth, email, password);

        // Create farmer doc in Firestore
        await setDoc(doc(db, "farmers", userCred.user.uid), {
          uid: userCred.user.uid,
          username: email.split("@")[0],
          role: "farmer",
          profile: {
            name: "",
            state: "Telangana",
            district: "Sangareddy",
            farmSize: 0,
            createdAt: serverTimestamp(),
          },
          preferences: {
            soilType: "Loamy",
            waterSources: [],
            favouriteCrops: [],
          },
          lastUpdated: serverTimestamp(),
        });

        toast.success("🎉 Account created successfully!");
      } else {
        // LOGIN
        userCred = await signInWithEmailAndPassword(auth, email, password);
        toast.success("✅ Logged in successfully!");
      }

      // ⭐ Redirect back to previous page (e.g., /farm-map)
      setTimeout(() => navigate(from), 800);

    } catch (err) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-green-50 dark:bg-neutral-950">
      <Toaster position="bottom-center" />
      <form
        onSubmit={handleAuth}
        className="bg-white dark:bg-neutral-900 p-8 rounded-xl shadow-md w-full max-w-sm"
      >
        <h1 className="text-2xl font-bold mb-5 text-center text-green-700 dark:text-green-400">
          {isSignup ? "Create Farmer Account" : "Farmer Login"}
        </h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 mb-3 border rounded-md dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 mb-4 border rounded-md dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-md transition disabled:opacity-50"
        >
          {loading ? "Please wait..." : isSignup ? "Sign Up" : "Login"}
        </button>

        <p
          onClick={() => setIsSignup(!isSignup)}
          className="text-sm text-center mt-4 text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
        >
          {isSignup
            ? "Already have an account? Login"
            : "Create a new account"}
        </p>
      </form>
    </div>
  );
}