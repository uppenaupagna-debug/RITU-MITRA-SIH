// src/components/ProtectedRouteAdmin.jsx
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";

export default function ProtectedRouteAdmin({ children }) {
  const [user, loadingAuth] = useAuthState(auth);
  const [role, setRole] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      if (!user) {
        setChecking(false);
        return;
      }

      try {
        // ✅ Correct collection name
        const adminRef = doc(db, "admins", user.uid);
        const adminSnap = await getDoc(adminRef);

        console.log("🔍 Admin check:", {
          exists: adminSnap.exists(),
          data: adminSnap.data(),
        });

        if (adminSnap.exists() && adminSnap.data()?.role === "admin") {
          setRole("admin");
        } else {
          setRole("other");
        }
      } catch (err) {
        console.error("Error checking admin role:", err);
      } finally {
        setChecking(false);
      }
    };
    checkRole();
  }, [user]);

  if (loadingAuth || checking) {
    return (
      <div className="flex justify-center items-center min-h-screen text-gray-500">
        <Loader2 className="animate-spin mr-2" /> Checking admin access...
      </div>
    );
  }

  if (!user || role !== "admin") {
    return <Navigate to="/admin" replace />;
  }

  return children;
}
