import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useUserActivity } from "../context/UserActivityContext";
import robots from "../data/robots";

// ─── Scroll-reveal hook ───────────────────────────────────────────────────────
function useReveal(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function Reveal({ children, delay = 0, className = "" }) {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(2.5rem)",
        transition: `opacity 0.7s var(--ease-out-expo) ${delay}ms, transform 0.7s var(--ease-out-expo) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Category bento data ──────────────────────────────────────────────────────
const CATEGORIES = [
  {
    name: "Kitchen",
    desc: "Smart assistants and cooking companions",
    image: "https://firexcore.com/wp-content/uploads/2025/01/Key-Features-of-Samsung-Ballie-AI-Robot.webp",
  },
  {
    name: "Home Cleaner",
    desc: "Autonomous floor, mop, and window robots",
    image: "https://m.media-amazon.com/images/I/71aHkBTp0OL._AC_UF1000,1000_QL80_.jpg",
  },
  {
    name: "Drone",
    desc: "Indoor patrol, enterprise, and pool drones",
    image: "https://www-cdn.djiits.com/dps/d90267d0c1579a191284086d26cd8156.jpg",
  },
  {
    name: "Humanoid",
    desc: "Interactive companions and classroom builders",
    image: "https://knowledge-hub.com/wp-content/uploads/2019/12/aa.jpg",
  },
];

function getFlagship(category) {
  return [...robots]
    .filter((r) => r.category === category)
    .sort((a, b) => b.rating - a.rating)[0];
}

const FLAGSHIP_CATEGORIES = ["Kitchen", "Home Cleaner", "Drone", "Humanoid"];

// ─── Hero robot image (highest overall rating) ────────────────────────────────
const HERO_ROBOT = [...robots].sort((a, b) => b.rating - a.rating)[0];

// ─── Category tile ────────────────────────────────────────────────────────────
function CategoryTile({ category, count, large }) {
  return (
    <Link
      to={`/catalog?category=${encodeURIComponent(category.name)}`}
      className={`group relative overflow-hidden rounded-2xl border border-white/8 bg-surface-elevated cursor-pointer block ${large ? "row-span-2" : ""}`}
      style={{
        transition: `transform 0.4s var(--ease-out-expo), box-shadow 0.4s var(--ease-out-expo)`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.02)";
        e.currentTarget.style.boxShadow = "0 20px 60px oklch(65% 0.28 290 / 0.18)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <img
        src={category.image}
        alt={category.name}
        className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-55 group-hover:scale-105"
        style={{ transition: `opacity 0.5s var(--ease-out-expo), transform 0.6s var(--ease-out-expo)` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      <div className="relative h-full flex flex-col justify-end p-6" style={{ minHeight: large ? "340px" : "160px" }}>
        <span className="text-xs font-semibold tracking-widest uppercase text-text-muted mb-2">
          {count} robots
        </span>
        <h3
          className="font-bold text-white leading-tight mb-1"
          style={{ fontSize: large ? "clamp(1.5rem, 2vw + 0.5rem, 2.25rem)" : "1.25rem" }}
        >
          {category.name}
        </h3>
        <p className="text-text-muted text-sm mb-4">{category.desc}</p>
        <span
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent group-hover:gap-3"
          style={{ transition: "gap 0.3s var(--ease-out-expo)" }}
        >
          Explore <ArrowRight size={14} />
        </span>
      </div>
    </Link>
  );
}

// ─── Flagship editorial card ──────────────────────────────────────────────────
function FlagshipCard({ robot, index }) {
  const isEven = index % 2 === 0;
  return (
    <Reveal delay={index * 80}>
      <Link
        to={`/robot/${robot.id}`}
        className="group grid md:grid-cols-2 rounded-3xl overflow-hidden border border-white/8 bg-surface-elevated hover:border-accent/30"
        style={{ transition: "border-color 0.3s var(--ease-out-expo)" }}
      >
        {/* Image — alternates left/right */}
        <div className={`relative overflow-hidden ${isEven ? "" : "md:order-last"}`} style={{ minHeight: "320px" }}>
          <img
            src={robot.image}
            alt={robot.name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105"
            style={{ transition: "transform 0.7s var(--ease-out-expo)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/30" />
          {/* Category badge */}
          <span className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold bg-accent/20 border border-accent/40 text-accent backdrop-blur-sm">
            {robot.category}
          </span>
        </div>

        {/* Content */}
        <div className="flex flex-col justify-center p-8 lg:p-12">
          <p className="text-xs font-semibold tracking-widest uppercase text-text-muted mb-3">
            Flagship · {robot.brand}
          </p>
          <h3
            className="font-bold text-white leading-tight mb-3 group-hover:text-accent"
            style={{
              fontSize: "clamp(1.5rem, 2vw + 0.5rem, 2.25rem)",
              transition: "color 0.3s var(--ease-out-expo)",
            }}
          >
            {robot.name}
          </h3>
          <p className="text-text-muted leading-relaxed mb-6 text-sm">{robot.description}</p>

          {/* Spec pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.entries(robot.specs).slice(0, 3).map(([k, v]) => (
              <span key={k} className="px-3 py-1 rounded-full text-xs bg-white/5 border border-white/10 text-text-muted">
                <span className="text-white font-medium capitalize">{k}:</span> {v}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-white">
              ${robot.price.toLocaleString()}
            </span>
            <span
              className="inline-flex items-center gap-2 text-sm font-semibold text-accent group-hover:gap-3"
              style={{ transition: "gap 0.3s var(--ease-out-expo)" }}
            >
              View product <ArrowRight size={16} />
            </span>
          </div>
        </div>
      </Link>
    </Reveal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const { setPage } = useUserActivity();
  useEffect(() => setPage("home"), []);

  const categoryCounts = CATEGORIES.map((c) => ({
    ...c,
    count: robots.filter((r) => r.category === c.name).length,
  }));

  const flagships = FLAGSHIP_CATEGORIES.map(getFlagship).filter(Boolean);

  return (
    <div className="overflow-x-hidden bg-grid">
      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        {/* Ambient glows */}
        <div
          className="pointer-events-none absolute -top-32 -left-40 w-[700px] h-[700px] rounded-full opacity-25"
          style={{ background: "radial-gradient(circle, oklch(65% 0.28 290 / 0.35), transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-20 right-0 w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, oklch(78% 0.16 195 / 0.3), transparent 70%)" }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full grid md:grid-cols-2 gap-12 items-center py-24">
          {/* Left — type stack */}
          <div>
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/30 bg-accent/10 text-accent text-xs font-semibold tracking-wider uppercase mb-8"
            >
              AI-Powered Robotics Commerce
            </div>

            <h1
              className="font-extrabold text-white leading-[0.95] tracking-tight mb-6"
              style={{ fontSize: "var(--text-hero)" }}
            >
              Robotics,{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, oklch(65% 0.28 290), oklch(78% 0.16 195))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                delivered.
              </span>
            </h1>

            <p
              className="text-text-muted leading-relaxed mb-10 max-w-lg"
              style={{ fontSize: "var(--text-body)" }}
            >
              12 flagship robots. One intelligent assistant. Browse by voice, compare by spec, and get expert guidance — all in one place.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                to="/catalog"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-white"
                style={{
                  background: "oklch(65% 0.28 290)",
                  transition: "box-shadow 0.3s var(--ease-out-expo), filter 0.3s var(--ease-out-expo)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 0 40px oklch(65% 0.28 290 / 0.5)";
                  e.currentTarget.style.filter = "brightness(1.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.filter = "brightness(1)";
                }}
              >
                Explore Catalog <ArrowRight size={18} />
              </Link>
              <Link
                to="/assistant"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-white border border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/25"
                style={{ transition: "background 0.3s var(--ease-out-expo), border-color 0.3s" }}
              >
                Talk to AI
              </Link>
            </div>
          </div>

          {/* Right — isometric robot silhouette */}
          <div className="relative hidden md:flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-full opacity-20"
              style={{ background: "radial-gradient(circle at center, oklch(65% 0.28 290 / 0.5), transparent 65%)" }}
            />
            <img
              src={HERO_ROBOT.image}
              alt={HERO_ROBOT.name}
              className="relative w-full max-w-lg object-contain drop-shadow-2xl"
              style={{
                mixBlendMode: "luminosity",
                filter: "contrast(1.1) brightness(0.85) saturate(0.3)",
                transform: "perspective(800px) rotateY(-8deg) rotateX(4deg)",
                transition: "transform 0.6s var(--ease-out-expo)",
                maxHeight: "520px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "perspective(800px) rotateY(-2deg) rotateX(1deg) scale(1.03)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "perspective(800px) rotateY(-8deg) rotateX(4deg)";
              }}
            />
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
          <span className="text-xs tracking-widest uppercase text-text-muted">Scroll</span>
          <div
            className="w-px h-10 bg-gradient-to-b from-text-muted to-transparent"
            style={{ animation: "pulse 2s infinite" }}
          />
        </div>
      </section>

      {/* ── CATEGORY BENTO ─────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ paddingBlock: "var(--space-section)" }}>
        <Reveal>
          <div className="mb-12">
            <p className="text-xs font-semibold tracking-widest uppercase text-accent mb-3">Browse by category</p>
            <h2 className="font-bold text-white" style={{ fontSize: "var(--text-heading)" }}>
              Four worlds of robotics.
            </h2>
          </div>
        </Reveal>

        {/* Bento grid: Kitchen large (spans 2 rows left) + 3 medium right */}
        <Reveal delay={100}>
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: "repeat(3, 1fr)",
              gridTemplateRows: "auto auto",
            }}
          >
            {/* Kitchen — large, spans 2 rows in first 2 columns */}
            <div style={{ gridColumn: "1 / 3", gridRow: "1 / 3" }}>
              <CategoryTile category={categoryCounts[0]} count={categoryCounts[0].count} large />
            </div>

            {/* Home Cleaner */}
            <div style={{ gridColumn: "3 / 4", gridRow: "1 / 2" }}>
              <CategoryTile category={categoryCounts[1]} count={categoryCounts[1].count} large={false} />
            </div>

            {/* Drone */}
            <div style={{ gridColumn: "3 / 4", gridRow: "2 / 3" }}>
              <CategoryTile category={categoryCounts[2]} count={categoryCounts[2].count} large={false} />
            </div>
          </div>
        </Reveal>

        {/* Humanoid — full-width strip below */}
        <Reveal delay={180}>
          <div className="mt-4">
            <Link
              to={`/catalog?category=Humanoid`}
              className="group relative overflow-hidden rounded-2xl border border-white/8 bg-surface-elevated flex items-center justify-between px-8 py-6"
              style={{
                transition: "transform 0.4s var(--ease-out-expo), box-shadow 0.4s var(--ease-out-expo)",
                minHeight: "140px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.01)";
                e.currentTarget.style.boxShadow = "0 20px 60px oklch(65% 0.28 290 / 0.18)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <img
                src={categoryCounts[3].image}
                alt="Humanoid"
                className="absolute inset-0 w-full h-full object-cover opacity-25 group-hover:opacity-35 group-hover:scale-105"
                style={{ transition: "opacity 0.5s var(--ease-out-expo), transform 0.6s var(--ease-out-expo)" }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
              <div className="relative">
                <p className="text-xs font-semibold tracking-widest uppercase text-text-muted mb-1">
                  {categoryCounts[3].count} robots
                </p>
                <h3 className="text-2xl font-bold text-white">Humanoid</h3>
                <p className="text-text-muted text-sm mt-1">{categoryCounts[3].desc}</p>
              </div>
              <span
                className="relative inline-flex items-center gap-2 font-semibold text-accent group-hover:gap-4"
                style={{ transition: "gap 0.3s var(--ease-out-expo)" }}
              >
                Explore <ArrowRight size={18} />
              </span>
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ── FLAGSHIP ───────────────────────────────────────────────────── */}
      <section
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        style={{ paddingBottom: "var(--space-section)" }}
      >
        <Reveal>
          <div className="mb-12">
            <p className="text-xs font-semibold tracking-widest uppercase text-accent mb-3">Editorial picks</p>
            <h2 className="font-bold text-white" style={{ fontSize: "var(--text-heading)" }}>
              The flagship lineup.
            </h2>
            <p className="text-text-muted mt-3 max-w-xl">
              One standout from every category — the best-rated robot we carry.
            </p>
          </div>
        </Reveal>

        <div className="flex flex-col gap-6">
          {flagships.map((robot, i) => (
            <FlagshipCard key={robot.id} robot={robot} index={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
