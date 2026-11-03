import React, { useEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { Sparkles, ArrowRight, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import MagicBento from "../components/MagicBento";
import RotatingText from "../components/RotatingText";

/* -----------------------------
   Motion Variants
------------------------------ */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 * i, duration: 0.6, ease: [0.21, 1, 0.21, 1] },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: [0.21, 1, 0.21, 1] },
  },
};

/* -----------------------------
   Background FX – Aurora Glow
------------------------------ */
function AuroraBG() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_0%,rgba(16,185,129,0.22),transparent_60%)]" />

      <div className="absolute -top-40 -left-20 h-[60rem] w-[60rem] rounded-full blur-3xl opacity-20 bg-gradient-to-tr from-green-400/30 via-emerald-400/20 to-teal-400/20 animate-[pulse_6s_ease-in-out_infinite]" />

      <div className="absolute -bottom-40 -right-20 h-[55rem] w-[55rem] rounded-full blur-3xl opacity-20 bg-gradient-to-br from-teal-400/20 via-emerald-400/20 to-green-400/30 animate-[pulse_6s_ease-in-out_infinite]" />
    </div>
  );
}

/* -----------------------------
   Reusable UI Elements
------------------------------ */
function GlowButton({ children, as: As = "button", className = "", ...props }) {
  return (
    <As
      className={
        "relative inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-transform hover:scale-[1.03] active:scale-[0.98] " +
        "text-white bg-gradient-to-r from-emerald-600 to-green-500 " +
        "shadow-[0_0_18px_-8px_rgba(16,185,129,0.45)] " +
        className
      }
      {...props}
    >
      {children}
      <ChevronRight className="h-4 w-4" />
    </As>
  );
}

function Chip({ children }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-white/5 px-3 py-1 text-xs text-gray-700 dark:text-white/80">
      <Sparkles className="h-3.5 w-3.5" />
      {children}
    </div>
  );
}

/* -----------------------------
   Hero Section
------------------------------ */
function Hero() {
  const sentence = "RAITU MITRA";
  const chars = sentence.split("");

  return (
    <section id="home" className="relative">
      <AuroraBG />

      <div className="relative mx-auto max-w-5xl px-6 pb-28 pt-32 flex flex-col justify-center min-h-[80vh]">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="space-y-6 text-center"
        >
          <motion.div variants={fadeUp}>
            <Chip>Sri Raamaya Namaha • Bringing AI to Every Indian Farm</Chip>
          </motion.div>

          {/* Title */}
          <motion.h1
            className="mx-auto max-w-4xl text-4xl font-semibold tracking-tight leading-[1.1] sm:text-5xl md:text-6xl flex flex-wrap justify-center gap-y-1 text-gray-900 dark:text-white"
          >
            {chars.map((char, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{
                  delay: i * 0.04,
                  duration: 0.5,
                  ease: [0.25, 1, 0.5, 1],
                }}
                className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 animate-glow"
              >
                {char === " " ? "\u00A0" : char}
              </motion.span>
            ))}
          </motion.h1>

          {/* Rotating Text */}
          <motion.p
            variants={fadeUp}
            custom={2}
            className="mx-auto max-w-2xl text-base text-gray-700 dark:text-white/70 md:text-lg flex flex-wrap justify-center items-center gap-2"
          >
            Empowering farmers with{" "}
            <RotatingText
              texts={[
                "Real-time weather ⛅",
                "Market Prices 💹",
                "Crop Advisory 🌱",
                "Fertilizer Calculator 🧪",
                "Pest and Disease Alerts 🐛",
                "Government Schemes 🏛️",
              ]}
              rotationInterval={2500}
              splitBy="words"
              staggerDuration={0.05}
              mainClassName="inline-block font-semibold"
              elementLevelClassName="text-transparent bg-clip-text bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500"
            />
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="flex justify-center gap-3 pt-2">
            <GlowButton as={Link} to="/crop">
              Get Crop Advisory
            </GlowButton>

            <Link
              to="/admin"
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-white/5 px-5 py-2.5 text-sm text-gray-700 dark:text-white/80 hover:text-gray-900 dark:hover:text-white"
            >
              Admin Portal <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          variants={scaleIn}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mx-auto mt-20 w-full max-w-6xl"
        >
          <MagicBento
            enableSpotlight
            enableStars
            enableTilt
            glowColor="16,185,129"
            particleCount={10}
          />
        </motion.div>
      </div>

      {/* Hero glow animation */}
      <style>{`
        @keyframes glowPulse {
          0%, 100% {
            text-shadow: 0 0 8px rgba(16,185,129,0.5),
                         0 0 20px rgba(52,211,153,0.35),
                         0 0 30px rgba(20,184,166,0.25);
          }
          50% {
            text-shadow: 0 0 12px rgba(16,185,129,0.8),
                         0 0 24px rgba(52,211,153,0.55),
                         0 0 36px rgba(20,184,166,0.4);
          }
        }

        .animate-glow {
          animation: glowPulse 3s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}

/* -----------------------------
   Stats Section
------------------------------ */
function Stats() {
  const items = [
    { kpi: "🚀", label: "Fertilizer Calculator", link: "/fertilizer" },
    { kpi: "🐛", label: "Pest & Disease Alerts", link: "/alerts" },
    { kpi: "99.9%", label: "Accurate Weather API", link: "/weather" },
    { kpi: "₹", label: "Market Price Trends", link: "/market" },
  ];

  return (
    <section className="relative py-12 sm:py-14 lg:py-16 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-100/10 to-transparent blur-3xl pointer-events-none" />

      <div className="mx-auto grid max-w-6xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-6 relative z-10">
        {items.map((it) => (
          <motion.div
            key={it.label}
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.03, y: -3 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
          >
            <Link
              to={it.link}
              className="group relative block overflow-hidden rounded-2xl border border-emerald-200/30 dark:border-emerald-500/10 bg-white/60 dark:bg-white/[0.04] backdrop-blur-lg shadow-md transition-all duration-700 hover:border-emerald-400/50 hover:shadow-[0_0_28px_-14px_rgba(16,185,129,0.35)]"
            >
              <div className="relative z-10 flex flex-col items-center justify-center text-center py-6">
                <h3 className="text-3xl font-extrabold bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-500 bg-clip-text text-transparent animate-shimmer">
                  {it.kpi}
                </h3>
                <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-300">
                  {it.label}
                </p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 0% center; }
          50% { background-position: 100% center; }
          100% { background-position: 0% center; }
        }
        .animate-shimmer {
          background-size: 200% auto;
          animation: shimmer 8s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}

/* -----------------------------
   Testimonials Section
------------------------------ */
function Testimonials() {
  const testimonials = [
    { quote: "Raitu Mitra helped me choose the right fertilizer — saved money and improved yield!", name: "Suresh • Andhra Pradesh" },
    { quote: "Accurate weather predictions helped me plan irrigation better.", name: "Kiran • Telangana" },
    { quote: "Clean UI and easy to use even in rural areas.", name: "Meena • Agri Student" },
    { quote: "A true digital friend for farmers.", name: "Rajesh • Maharashtra" },
  ];

  const loopTestimonials = [...testimonials, ...testimonials];
  const controls = useAnimation();

  useEffect(() => {
    controls.start({
      x: ["0%", "-50%"],
      transition: { ease: "linear", duration: 25, repeat: Infinity },
    });
  }, [controls]);

  return (
    <section className="relative py-20 overflow-hidden select-none">
      <div className="mx-auto max-w-7xl px-6">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center text-4xl font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 mb-12"
        >
          Loved by Farmers Across India
        </motion.h2>

        <div className="relative flex overflow-hidden">
          <motion.div className="flex gap-4" animate={controls}>
            {loopTestimonials.map((t, i) => (
              <div
                key={i}
                className="min-w-[320px] rounded-3xl border border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-white/5 p-6 shadow-lg transition-all duration-300"
              >
                <p className="text-gray-800 dark:text-white/90 text-sm italic">
                  “{t.quote}”
                </p>
                <div className="mt-4 text-xs text-emerald-600 dark:text-emerald-300">
                  {t.name}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* -----------------------------
   Final CTA
------------------------------ */
function FinalCTA() {
  return (
    <section className="relative py-20 overflow-hidden">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <div className="relative rounded-[2rem] border border-emerald-400/20 shadow-[0_0_40px_-18px_rgba(16,185,129,0.35)] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 animate-gradientMove opacity-90" />
          <div className="relative z-10 p-12 sm:p-16">
            <h3 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Grow Smarter with <span className="text-emerald-200">Raitu Mitra</span>
            </h3>
            <p className="text-lg text-emerald-100/90 max-w-2xl mx-auto mb-8">
              Personalized crop insights, weather intelligence, and AI-powered decisions.
            </p>
            <Link
              to="/crop"
              className="inline-flex items-center justify-center rounded-full bg-white text-emerald-700 font-semibold px-8 py-3 text-base shadow-lg hover:shadow-emerald-400/30 hover:scale-105 transition-all duration-500"
            >
              Get Crop Advisory
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradientMove {
          background-size: 200% 200%;
          animation: gradientMove 8s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}

/* -----------------------------
   Page Export
------------------------------ */
export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gray-50 text-gray-900 dark:bg-[#0b0b0f] dark:text-white transition-colors duration-500 antialiased">
      <Hero />
      <Stats />
      <Testimonials />
      <FinalCTA />
    </main>
  );
}