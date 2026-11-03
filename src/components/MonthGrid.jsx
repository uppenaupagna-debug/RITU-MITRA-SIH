import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { CalendarDays, CheckCircle } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const PHASE_COLORS = {
  land_prep: "bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700",
  nursery: "bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700",
  sowing: "bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700",
  transplant: "bg-lime-100 dark:bg-lime-900/40 border-lime-300 dark:border-lime-700",
  irrigation: "bg-sky-100 dark:bg-sky-900/40 border-sky-300 dark:border-sky-700",
  weeding: "bg-teal-100 dark:bg-teal-900/40 border-teal-300 dark:border-teal-700",
  fertilizer: "bg-yellow-100 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-700",
  pest: "bg-rose-100 dark:bg-rose-900/40 border-rose-300 dark:border-rose-700",
  harvest: "bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700",
  post: "bg-stone-100 dark:bg-stone-900/40 border-stone-300 dark:border-stone-700",
  custom: "bg-neutral-100 dark:bg-neutral-900/40 border-neutral-300 dark:border-neutral-700",
  growth: "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700",
};

const fmt = (d) =>
  d instanceof Date && !isNaN(d)
    ? d.toLocaleDateString(undefined, { day: "2-digit", month: "short" })
    : "--";

const addDays = (base, n) => {
  const d = base instanceof Date ? new Date(base) : new Date(String(base));
  if (isNaN(d)) return new Date();
  d.setDate(d.getDate() + n);
  return d;
};

export default function MonthGrid({ startDate, phases, weather = [], onPhaseClick }) {
  const startYear = new Date().getFullYear();
  const today = new Date();

  const [zoom, setZoom] = useState("year");
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [donePhases, setDonePhases] = useState({});

  const enrichedPhases = useMemo(() => {
    if (!phases?.length) return [];
    const sorted = [...phases].sort((a, b) => a.offset - b.offset);
    const filled = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      const endOfCurrent = current.offset + current.duration;
      const gap = next.offset - endOfCurrent;
      filled.push(current);
      if (gap > 20) {
        filled.push({
          key: `growth_${i}`,
          label: "Growth Monitoring",
          offset: endOfCurrent,
          duration: gap,
          icon: "Leaf",
          notes: "Monitor crop health; adjust irrigation/weeding as needed.",
        });
      }
    }
    filled.push(sorted.at(-1));
    return filled;
  }, [phases]);

  const months = useMemo(() => {
    if (zoom === "year")
      return Array.from({ length: 12 }, (_, i) => new Date(startYear, i, 1));
    const startM = Math.max(0, today.getMonth() - 1);
    return Array.from({ length: 4 }, (_, i) => new Date(startYear, startM + i, 1));
  }, [zoom, today, startYear]);

  const togglePhaseDone = (key) => setDonePhases((prev) => ({ ...prev, [key]: !prev[key] }));

  const visiblePhases = useMemo(() => {
    const list = enrichedPhases;
    if (!selectedMonth) return list;
    const monthIndex = MONTHS.indexOf(selectedMonth);
    return list.filter((p) => {
      const s = addDays(startDate, p.offset);
      const e = addDays(startDate, p.offset + p.duration);
      const startMonth = s.getMonth();
      const endMonth = e.getMonth();
      if (isNaN(s) || isNaN(e)) return false;
      if (endMonth >= startMonth) {
        return monthIndex >= startMonth && monthIndex <= endMonth;
      }
      return monthIndex >= startMonth || monthIndex <= endMonth;
    });
  }, [selectedMonth, enrichedPhases, startDate]);

  return (
    <div className="w-full border rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 dark:border-neutral-800 shadow-sm transition-colors duration-500">
      <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border-b dark:border-neutral-700">
        <div className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
          <CalendarDays className="w-4 h-4" />
          <b>
            Crop Timeline {selectedMonth ? `— ${selectedMonth}` : `(${zoom === "year" ? "Full Year" : "Quarter View"})`}
          </b>
        </div>
        <div className="flex items-center gap-2">
          {selectedMonth && (
            <button
              onClick={() => setSelectedMonth(null)}
              className="text-xs px-3 py-1 border dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
            >
              🔙 Back
            </button>
          )}
          <button
            onClick={() => setZoom(zoom === "year" ? "quarter" : "year")}
            className="text-xs px-3 py-1 border dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
          >
            {zoom === "year" ? "🔍 Zoom to Quarter" : "↩ Full Year"}
          </button>
        </div>
      </div>

      <div className={`relative grid ${zoom === "year" ? "grid-cols-12" : "grid-cols-4"} text-xs text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800 border-b dark:border-neutral-700`}>
        {months.map((m, i) => (
          <div
            key={i}
            onClick={() => setSelectedMonth(MONTHS[m.getMonth()])}
            className={`px-3 py-2 border-r last:border-r-0 dark:border-neutral-700 flex items-center justify-center gap-1 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition ${selectedMonth === MONTHS[m.getMonth()] ? "bg-emerald-100 dark:bg-emerald-900/40 font-semibold text-emerald-700 dark:text-emerald-300" : ""
              }`}
          >
            <CalendarDays className="w-4 h-4" />
            {MONTHS[m.getMonth()]}
          </div>
        ))}
      </div>

      <div className="p-3 space-y-3 bg-white dark:bg-neutral-900 relative transition-colors duration-500">
        {(() => {
          const y0 = new Date(startYear, 0, 1).getTime();
          const y1 = new Date(startYear, 11, 31).getTime();
          const pos = ((today - y0) / (y1 - y0)) * 100;
          return (
            <div
              className="pointer-events-none absolute top-0 bottom-0 w-[2px] bg-emerald-400/60 shadow-[0_0_6px_rgba(16,185,129,0.6)]"
              style={{ left: `${pos}%` }}
            />
          );
        })()}

        {visiblePhases.map((p, i) => {
          const s = addDays(startDate, p.offset);
          const e = addDays(startDate, p.offset + p.duration);
          const isActive = today >= s && today <= e;
          const daysToStart = Math.ceil((s - today) / (1000 * 60 * 60 * 24));
          const phaseDone = donePhases[p.key];
          const progress = Math.min(100, Math.max(0, ((today - s) / (e - s)) * 100));

          return (
            <motion.div
              key={p.key + i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              onClick={() => onPhaseClick?.({ ...p, s, e })}
              className={`relative px-3 py-2 rounded-lg border cursor-pointer hover:shadow-md transition-all ${PHASE_COLORS[p.key] || "bg-neutral-100 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700"
                } ${isActive ? "ring-2 ring-green-400 dark:ring-green-500" : ""} ${phaseDone ? "opacity-60 line-through" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-neutral-800 dark:text-neutral-100">{p.label}</span>
                  <span className="text-xs text-neutral-600 dark:text-neutral-400">{fmt(s)} → {fmt(e)}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePhaseDone(p.key);
                  }}
                  className="text-xs text-green-700 dark:text-green-300 flex items-center gap-1 border dark:border-green-700 px-2 py-0.5 rounded-md hover:bg-green-50 dark:hover:bg-green-900/30"
                >
                  <CheckCircle className="w-3 h-3" />
                  {phaseDone ? "Undo" : "Done"}
                </button>
              </div>

              {isActive && (
                <>
                  <div className="text-xs text-green-700 dark:text-green-300 mb-1">
                    {isFinite(progress) ? Math.round(progress) : 0}% completed
                  </div>
                  <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <div className="h-1.5 bg-green-500 transition-all" style={{ width: `${isFinite(progress) ? progress : 0}%` }} />
                  </div>
                </>
              )}

              {!isActive && daysToStart > 0 && (
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Starts in {daysToStart} days
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}