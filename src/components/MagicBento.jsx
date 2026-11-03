import { useRef, useEffect, useCallback, useState } from "react";
import { gsap } from "gsap";
import "./MagicBento.css";

/* -----------------------------
   CountUp Component
------------------------------ */
const CountUpText = ({ target, duration = 2, suffix = "", className = "" }) => {
  const [count, setCount] = useState(0);
  const numRef = useRef({ value: 0 });

  useEffect(() => {
    gsap.to(numRef.current, {
      value: target,
      duration,
      ease: "power2.out",
      onUpdate: () => setCount(Math.floor(numRef.current.value)),
    });
  }, [target, duration]);

  return <span className={className}>{count + suffix}</span>;
};

/* -----------------------------
   Constants
------------------------------ */
const DEFAULT_PARTICLE_COUNT = 30;
const DEFAULT_SPOTLIGHT_RADIUS = 100;
const DEFAULT_GLOW_COLOR = "16, 185, 129";
const MOBILE_BREAKPOINT = 768;

/* 🌾 Raitu Mitra – Feature Grid */
const cardData = [
  {
    title: "100+",
    description: "Supported Crops for guidance & monitoring",
    label: "Crop Count",
  },
  {
    title: "20+",
    description: "Regional languages supported for farmers",
    label: "Languages",
  },
  {
    title: "10+",
    description: "Farmers using Raitu Mitra across regions",
    label: "Active Users",
  },
  {
    title: "AI Insights",
    description: "Smart predictions and personalized farming tips",
    label: "Intelligence",
  },
];

/* -----------------------------
   Particle & Glow Helpers
------------------------------ */
const createParticleElement = (x, y, color = DEFAULT_GLOW_COLOR) => {
  const el = document.createElement("div");
  el.className = "particle";
  el.style.cssText = `
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(${color}, 1);
    box-shadow: 0 0 6px rgba(${color}, 0.6);
    pointer-events: none;
    z-index: 100;
    left: ${x}px;
    top: ${y}px;
  `;
  return el;
};

const calculateSpotlightValues = (radius) => ({
  proximity: radius * 0.5,
  fadeDistance: radius * 0.75,
});

const updateCardGlowProperties = (card, mouseX, mouseY, glow, radius) => {
  const rect = card.getBoundingClientRect();
  const relativeX = ((mouseX - rect.left) / rect.width) * 100;
  const relativeY = ((mouseY - rect.top) / rect.height) * 100;
  card.style.setProperty("--glow-x", `${relativeX}%`);
  card.style.setProperty("--glow-y", `${relativeY}%`);
  card.style.setProperty("--glow-intensity", glow.toString());
  card.style.setProperty("--glow-radius", `${radius}px`);
};

/* -----------------------------
   ParticleCard
------------------------------ */
const ParticleCard = ({
  children,
  className = "",
  disableAnimations = false,
  style,
  particleCount = DEFAULT_PARTICLE_COUNT,
  glowColor = DEFAULT_GLOW_COLOR,
}) => {
  const cardRef = useRef(null);
  const particlesRef = useRef([]);
  const timeoutsRef = useRef([]);
  const isHoveredRef = useRef(false);
  const memoizedParticles = useRef([]);
  const particlesInitialized = useRef(false);

  const initializeParticles = useCallback(() => {
    if (particlesInitialized.current || !cardRef.current) return;
    const { width, height } = cardRef.current.getBoundingClientRect();
    memoizedParticles.current = Array.from({ length: particleCount }, () =>
      createParticleElement(Math.random() * width, Math.random() * height, glowColor)
    );
    particlesInitialized.current = true;
  }, [particleCount, glowColor]);

  const clearAllParticles = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    particlesRef.current.forEach((particle) => {
      gsap.to(particle, {
        scale: 0,
        opacity: 0,
        duration: 0.3,
        ease: "back.in(1.7)",
        onComplete: () => particle.parentNode?.removeChild(particle),
      });
    });
    particlesRef.current = [];
  }, []);

  const animateParticles = useCallback(() => {
    if (!cardRef.current || !isHoveredRef.current) return;
    if (!particlesInitialized.current) initializeParticles();

    memoizedParticles.current.forEach((particle, index) => {
      const timeoutId = setTimeout(() => {
        if (!isHoveredRef.current || !cardRef.current) return;
        const clone = particle.cloneNode(true);
        cardRef.current.appendChild(clone);
        particlesRef.current.push(clone);

        gsap.fromTo(
          clone,
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.7)" }
        );

        gsap.to(clone, {
          x: (Math.random() - 0.5) * 100,
          y: (Math.random() - 0.5) * 100,
          rotation: Math.random() * 360,
          duration: 2 + Math.random() * 2,
          ease: "none",
          repeat: -1,
          yoyo: true,
        });

        gsap.to(clone, {
          opacity: 0.3,
          duration: 1.5,
          ease: "power2.inOut",
          repeat: -1,
          yoyo: true,
        });
      }, index * 100);

      timeoutsRef.current.push(timeoutId);
    });
  }, [initializeParticles]);

  useEffect(() => {
    if (disableAnimations || !cardRef.current) return;
    const el = cardRef.current;

    const handleMouseEnter = () => {
      isHoveredRef.current = true;
      animateParticles();
    };
    const handleMouseLeave = () => {
      isHoveredRef.current = false;
      clearAllParticles();
    };

    el.addEventListener("mouseenter", handleMouseEnter);
    el.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      el.removeEventListener("mouseenter", handleMouseEnter);
      el.removeEventListener("mouseleave", handleMouseLeave);
      clearAllParticles();
    };
  }, [animateParticles, clearAllParticles, disableAnimations]);

  return (
    <div
      ref={cardRef}
      className={`${className} particle-container`}
      style={{
        ...style,
        position: "relative",
        overflow: "hidden",
        backgroundColor: "var(--bento-bg)",
        color: "var(--bento-text)",
      }}
    >
      {children}
    </div>
  );
};

/* -----------------------------
   GlobalSpotlight
------------------------------ */
const GlobalSpotlight = ({
  gridRef,
  disableAnimations = false,
  enabled = true,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  glowColor = DEFAULT_GLOW_COLOR,
}) => {
  const spotlightRef = useRef(null);

  useEffect(() => {
    if (disableAnimations || !gridRef?.current || !enabled) return;
    const spotlight = document.createElement("div");
    spotlight.className = "global-spotlight";
    spotlight.style.cssText = `
      position: fixed;
      width: 800px;
      height: 800px;
      border-radius: 50%;
      pointer-events: none;
      background: radial-gradient(circle,
        rgba(${glowColor}, 0.15) 0%,
        rgba(${glowColor}, 0.08) 15%,
        rgba(${glowColor}, 0.04) 25%,
        rgba(${glowColor}, 0.02) 40%,
        rgba(${glowColor}, 0.01) 65%,
        transparent 70%);
      z-index: 200;
      opacity: 0;
      transform: translate(-50%, -50%);
      mix-blend-mode: screen;
    `;
    document.body.appendChild(spotlight);
    spotlightRef.current = spotlight;

    const handleMouseMove = (e) => {
      if (!spotlightRef.current || !gridRef.current) return;
      const cards = gridRef.current.querySelectorAll(".card");
      const rect = gridRef.current.getBoundingClientRect();
      const inside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      if (!inside) {
        gsap.to(spotlightRef.current, { opacity: 0, duration: 0.3 });
        cards.forEach((c) => c.style.setProperty("--glow-intensity", "0"));
        return;
      }

      const { proximity, fadeDistance } = calculateSpotlightValues(spotlightRadius);
      let minDist = Infinity;

      cards.forEach((card) => {
        const r = card.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
        minDist = Math.min(minDist, dist);
        const glow =
          dist <= proximity
            ? 1
            : dist <= fadeDistance
            ? (fadeDistance - dist) / (fadeDistance - proximity)
            : 0;
        updateCardGlowProperties(card, e.clientX, e.clientY, glow, spotlightRadius);
      });

      gsap.to(spotlightRef.current, { left: e.clientX, top: e.clientY, duration: 0.1 });
      const op =
        minDist <= proximity
          ? 0.8
          : minDist <= fadeDistance
          ? ((fadeDistance - minDist) / (fadeDistance - proximity)) * 0.8
          : 0;
      gsap.to(spotlightRef.current, { opacity: op, duration: 0.3 });
    };

    document.addEventListener("mousemove", handleMouseMove);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      spotlight.remove();
    };
  }, [gridRef, disableAnimations, enabled, spotlightRadius, glowColor]);

  return null;
};

/* -----------------------------
   Utility
------------------------------ */
const BentoCardGrid = ({ children, gridRef }) => (
  <div className="card-grid bento-section" ref={gridRef}>
    {children}
  </div>
);

const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
};

/* -----------------------------
   MagicBento Component
------------------------------ */
const MagicBento = ({
  enableSpotlight = true,
  enableBorderGlow = true,
  disableAnimations = false,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  particleCount = DEFAULT_PARTICLE_COUNT,
  glowColor = DEFAULT_GLOW_COLOR,
}) => {
  const gridRef = useRef(null);
  const isMobile = useMobileDetection();
  const disableAnim = disableAnimations || isMobile;

  return (
    <>
      {enableSpotlight && (
        <GlobalSpotlight
          gridRef={gridRef}
          disableAnimations={disableAnim}
          spotlightRadius={spotlightRadius}
          glowColor={glowColor}
        />
      )}

      <BentoCardGrid gridRef={gridRef}>
        {cardData.map((card, i) => {
          const isNumeric = /\d/.test(card.title);
          const numericPart = parseInt(card.title.replace(/\D/g, ""), 10);
          const suffix = card.title.replace(/[0-9]/g, "");

          return (
            <ParticleCard
              key={i}
              className={`card ${enableBorderGlow ? "card--border-glow" : ""}`}
              disableAnimations={disableAnim}
              particleCount={particleCount}
              glowColor={glowColor}
            >
              <div className="card__header">
                <div className="card__label">{card.label}</div>
              </div>
              <div className="card__content">
                <h2 className="card__title">
                  {isNumeric ? (
                    <CountUpText target={numericPart} suffix={suffix} duration={2} />
                  ) : (
                    card.title
                  )}
                </h2>
                <p className="card__description">{card.description}</p>
              </div>
            </ParticleCard>
          );
        })}
      </BentoCardGrid>

      {/* Light/Dark Theme */}
      <style>{`
        :root {
          --bento-bg: #f9fdf9;
          --bento-text: #0f2310;
        }

        @media (prefers-color-scheme: dark) {
          :root {
            --bento-bg: #040f06;
            --bento-text: #f0fdf4;
          }
        }

        .card__label {
          font-size: 1.1rem;
          font-weight: 600;
          opacity: 0.85;
        }

        .card__title {
          font-size: 2.5rem;
          font-weight: 800;
          letter-spacing: 0.5px;
        }

        .card__description {
          font-size: 1.15rem;
          font-weight: 500;
          opacity: 0.9;
          line-height: 1.6;
        }
      `}</style>
    </>
  );
};

export default MagicBento;
