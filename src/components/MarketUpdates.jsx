import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, orderBy, query, limit } from "firebase/firestore";
import { IndianRupee, Leaf, Bell, Rocket, CloudSun, TrendingUp, Sprout } from "lucide-react";
import { motion } from "framer-motion";

export default function MarketUpdates() {
  const [mspList, setMspList] = useState([]);
  const [seedList, setSeedList] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const mspRef = query(collection(db, "msp"), orderBy("createdAt", "desc"), limit(50));
    const seedRef = query(collection(db, "seeds"), orderBy("createdAt", "desc"), limit(50));
    const notifRef = query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(20));

    const unsub1 = onSnapshot(mspRef, (snap) => setMspList(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsub2 = onSnapshot(seedRef, (snap) => setSeedList(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsub3 = onSnapshot(notifRef, (snap) => setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));

    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <h2 className="text-3xl font-bold text-emerald-800 dark:text-emerald-200 mb-8 text-center">
        🌾 Market & Agriculture Updates
      </h2>

      {/* Notifications */}
{/* 🔔 Notifications Section with Dynamic Colors */}
<section className="mb-10">
  <div className="flex items-center gap-2 mb-3">
    <Bell className="text-emerald-600" />
    <h3 className="text-xl font-semibold text-emerald-900 dark:text-emerald-100">
      Latest Notifications
    </h3>
  </div>

  {notifications.filter((n) => n.active).length === 0 ? (
    <p className="text-gray-600 dark:text-gray-300">No active notifications right now.</p>
  ) : (
    <div className="space-y-3">
      {notifications
        .filter((n) => n.active)
        .map((n) => {
          // detect importance field or fallback to priority/low
          const importance = n.importance?.toLowerCase?.() || n.priority?.toLowerCase?.() || "low";

          // 🌈 style map for importance levels
          const styles = {
            high: "border-l-4 border-red-600 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/40 dark:to-red-900/20 text-red-800 dark:text-red-100 shadow-red-200/40",
            medium:
              "border-l-4 border-amber-500 bg-gradient-to-r from-amber-50 to-amber-100 dark:from-yellow-900/40 dark:to-yellow-900/20 text-amber-800 dark:text-amber-100 shadow-yellow-200/40",
            low: "border-l-4 border-emerald-600 bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/40 dark:to-emerald-900/20 text-emerald-800 dark:text-emerald-100 shadow-emerald-200/40",
          };

          const icons = {
            high: "🚨",
            medium: "⚠️",
            low: "✅",
          };

          const body = n.body || "";
          const linkPattern =
            /(https?:\/\/[^\s]+|www\.[^\s]+|\S+\.(com|in|org|net|io|co|gov|edu))/i;
          const hasLink = linkPattern.test(body);

          // make body clickable if link-like
          const formattedBody = hasLink ? (
            <a
              href={
                /^https?:\/\//i.test(body) ? body : `https://${body.replace(/^www\./, "www.")}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {body}
            </a>
          ) : (
            body
          );

          return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.01 }}
              className={`p-4 rounded-lg shadow-sm transition-all duration-200 ${styles[importance]}`}
            >
              <h4 className="font-semibold flex items-center gap-2 mb-1">
                {icons[importance]} {n.title}
              </h4>
              <p className="text-sm leading-relaxed">{formattedBody}</p>
              {n.expiry && (
                <p className="text-xs mt-2 opacity-80">🕓 Expires: {n.expiry}</p>
              )}
            </motion.div>
          );
        })}
    </div>
  )}
</section>

      {/* MSP Section */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <IndianRupee className="text-emerald-600" />
          <h3 className="text-xl font-semibold text-emerald-900 dark:text-emerald-100">
            Minimum Support Prices (MSP)
          </h3>
        </div>
        {mspList.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-300">No MSP records available yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-emerald-200 dark:border-emerald-800">
            <table className="w-full text-left">
              <thead className="bg-emerald-100 dark:bg-emerald-800/50">
                <tr>
                  <th className="p-3">Crop</th>
                  <th className="p-3">Price (₹/Quintal)</th>
                  <th className="p-3">Note</th>
                </tr>
              </thead>
              <tbody>
                {mspList.map((item) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition"
                  >
                    <td className="p-3 font-medium">{item.crop}</td>
                    <td className="p-3">₹{(item.price || item.value)?.toLocaleString("en-IN")}</td>
                    <td className="p-3 text-sm text-gray-700 dark:text-gray-300">
                      {item.note || item.description || "-"}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Seeds Section */}
      <section className="mb-16">
        <div className="flex items-center gap-2 mb-3">
          <Leaf className="text-emerald-600" />
          <h3 className="text-xl font-semibold text-emerald-900 dark:text-emerald-100">
            Certified Seed Listings
          </h3>
        </div>
        {seedList.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-300">No seeds listed yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {seedList.map((s) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-emerald-900/40 shadow-sm hover:shadow-md transition"
              >
                <h4 className="text-lg font-semibold text-emerald-800 dark:text-emerald-100">{s.crop}</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">Variety: <strong>{s.variety || s.value}</strong></p>
                <p className="text-sm text-gray-700 dark:text-gray-300">Certification: {s.certification || "N/A"}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">Vendor: {s.vendor || "N/A"}</p>
                {s.note && (
  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
    Note:{" "}
    {(() => {
      const note = s.note;
      const linkPattern =
        /(https?:\/\/[^\s]+|www\.[^\s]+|\S+\.(com|in|org|net|io|co|gov|edu))/i;
      const hasLink = linkPattern.test(note);

      if (hasLink) {
        let url = note.trim();
        if (!/^https?:\/\//i.test(url)) {
          url = "https://" + url.replace(/^www\./, "www.");
        }
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            {note}
          </a>
        );
      }
      return note;
    })()}
  </p>
)}
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* 🌱 Future Expansions Section */}
      <section className="mt-16 mb-10">
        <div className="flex items-center gap-2 mb-3">
          <Rocket className="text-emerald-600" />
          <h3 className="text-xl font-semibold text-emerald-900 dark:text-emerald-100">
            Future Expansions 🚀
          </h3>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
          <div className="p-4 border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-900/30 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <CloudSun className="text-emerald-600" />
              <h4 className="font-semibold text-emerald-900 dark:text-emerald-100">Live Weather Alerts</h4>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Real-time rain & temperature warnings integrated with satellite APIs for local forecasts.
            </p>
          </div>

          <div className="p-4 border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-900/30 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="text-emerald-600" />
              <h4 className="font-semibold text-emerald-900 dark:text-emerald-100">Market Price Tracking</h4>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Compare MSP with daily market prices from nearby mandis and online agri portals.
            </p>
          </div>

          <div className="p-4 border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-900/30 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Sprout className="text-emerald-600" />
              <h4 className="font-semibold text-emerald-900 dark:text-emerald-100">AI Crop Health Monitor</h4>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Upload crop images for instant pest & disease detection powered by computer vision models.
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-gray-600 dark:text-gray-400 text-sm">
          🌿 We're constantly growing. Expect new tools, smarter analytics, and voice support soon!
        </p>
      </section>
    </div>
  );
}
