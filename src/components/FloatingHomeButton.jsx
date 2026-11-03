import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home } from "lucide-react";
import { motion } from "framer-motion";

export default function FloatingHomeButton() {
  const location = useLocation();
  const showButton = ["/admin", "/farmer-login"].includes(location.pathname);

  if (!showButton) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="fixed bottom-6 right-6 z-50"
    >
      <Link
        to="/"
        className="flex items-center gap-2 px-5 py-3 rounded-full font-semibold shadow-lg bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white hover:scale-[1.05] active:scale-[0.97] transition-transform hover:shadow-[0_0_25px_-5px_rgba(16,185,129,0.7)]"
      >
        <Home size={20} />
        <span>Back to Home</span>
      </Link>
    </motion.div>
  );
}
