import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Search, Star, Sparkles, ChefHat, SprayCan, Plane, PersonStanding, Bot } from "lucide-react";
import robots from "../data/robots";
import { useUserActivity } from "../context/UserActivityContext";

// ─── Static metadata per category ────────────────────────────────────────────
const CATEGORIES = ["Kitchen", "Home Cleaner", "Drone", "Humanoid"];

const CATEGORY_ICONS = {
  Kitchen: ChefHat,
  "Home Cleaner": SprayCan,
  Drone: Plane,
  Humanoid: PersonStanding,
};

const CATEGORY_META = {
  Kitchen: {
    desc: "Voice-controlled assistants for the smart kitchen",
    longDesc: "Transform your kitchen with AI-powered companions that manage recipes, control smart appliances, and provide hands-free assistance while you cook.",
    gradient: "linear-gradient(135deg, oklch(45% 0.15 80 / 0.2), transparent)",
  },
  "Home Cleaner": {
    desc: "Autonomous robots that keep every surface spotless",
    longDesc: "From intelligent vacuums to window-cleaning robots, these machines handle the tedious work so you can enjoy a cleaner home.",
    gradient: "linear-gradient(135deg, oklch(45% 0.12 160 / 0.2), transparent)",
  },
  Drone: {
    desc: "Aerial and surface robots for patrol and inspection",
    longDesc: "Indoor security drones, enterprise thermal cameras, and autonomous pool cleaners — aerial intelligence for every need.",
    gradient: "linear-gradient(135deg, oklch(45% 0.12 240 / 0.2), transparent)",
  },
  Humanoid: {
    desc: "Educational companions that learn alongside you",
    longDesc: "Interactive robots designed for kids and classrooms — teaching coding, creativity, and computational thinking through play.",
    gradient: "linear-gradient(135deg, oklch(45% 0.12 310 / 0.2), transparent)",
  },
};

// ─── Robot card for within category sections ─────────────────────────────────
function RobotShowcard({ robot, featured }) {
  return (
    <Link
      to={`/robot/${robot.id}`}
      data-guide-id={`catalog-card-${robot.id}`}
      className={`group relative flex ${featured ? "flex-col md:flex-row" : "flex-col"} overflow-hidden rounded-2xl border border-white/6`}
      style={{
        background: "oklch(18% 0.030 255 / 0.6)",
        transition: "transform 0.4s var(--ease-out-expo), box-shadow 0.4s var(--ease-out-expo), border-color 0.3s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 20px 60px oklch(0% 0 0 / 0.4), 0 0 0 1px oklch(65% 0.28 290 / 0.15)";
        e.currentTarget.style.borderColor = "oklch(65% 0.28 290 / 0.2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "oklch(80% 0 0 / 0.06)";
      }}
    >
      {/* Image */}
      <div
        className={`relative overflow-hidden flex-shrink-0 ${featured ? "md:w-1/2" : ""}`}
        style={{ height: featured ? "280px" : "200px" }}
      >
        <img
          src={robot.image}
          alt={robot.name}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105"
          style={{ transition: "transform 0.6s var(--ease-out-expo)" }}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        {robot.highlight && (
          <span
            className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-sm"
            style={{
              background: "oklch(65% 0.28 290 / 0.2)",
              color: "var(--color-accent)",
              border: "1px solid oklch(65% 0.28 290 / 0.25)",
            }}
          >
            {robot.highlight}
          </span>
        )}
        {/* Rating badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full backdrop-blur-sm"
          style={{ background: "oklch(0% 0 0 / 0.4)", border: "1px solid oklch(80% 0 0 / 0.1)" }}>
          <Star size={10} className="text-amber-400" fill="currentColor" />
          <span className="text-[11px] text-white font-semibold">{robot.rating}</span>
        </div>
      </div>

      {/* Body */}
      <div className={`flex flex-col flex-1 ${featured ? "p-6 md:p-8 justify-center" : "p-5"}`}>
        <p className="text-[11px] font-semibold tracking-widest uppercase text-text-muted mb-2">
          {robot.brand}
        </p>
        <h3
          className="font-bold text-white leading-snug mb-2 group-hover:text-accent"
          style={{
            fontSize: featured ? "clamp(1.25rem, 2vw, 1.75rem)" : "1.05rem",
            transition: "color 0.25s var(--ease-out-expo)",
          }}
        >
          {robot.name}
        </h3>
        <p className="text-text-muted text-sm leading-relaxed mb-4 line-clamp-2 flex-1">
          {featured ? robot.description : robot.shortDesc}
        </p>

        {/* Spec pills — only for featured */}
        {featured && (
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(robot.specs).slice(0, 3).map(([k, v]) => (
              <span key={k} className="px-2.5 py-1 rounded-full text-[11px] bg-white/5 border border-white/8 text-text-muted">
                <span className="text-white font-medium capitalize">{k}:</span> {v}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-auto">
          <span className="font-bold text-white" style={{ fontSize: featured ? "1.4rem" : "1.1rem" }}>
            ${robot.price.toLocaleString()}
          </span>
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold text-accent group-hover:gap-2"
            style={{ transition: "gap 0.3s var(--ease-out-expo)" }}
          >
            Explore <ArrowRight size={12} />
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Category section: editorial layout ──────────────────────────────────────
function CategorySection({ name, sectionRef }) {
  const meta = CATEGORY_META[name];
  const sorted = [...robots]
    .filter((r) => r.category === name)
    .sort((a, b) => b.rating - a.rating);

  const [hero, ...rest] = sorted;

  return (
    <section
      id={`section-${name.replace(/\s+/g, "-")}`}
      ref={sectionRef}
      className="scroll-mt-28 relative"
    >
      {/* Category header — editorial style */}
      <div
        className="rounded-3xl border border-white/6 p-8 lg:p-10 mb-6 relative overflow-hidden"
        style={{ background: meta.gradient }}
      >
        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              {(() => { const Icon = CATEGORY_ICONS[name]; return (
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                  style={{
                    background: "oklch(65% 0.28 290 / 0.08)",
                    border: "1px solid oklch(65% 0.28 290 / 0.15)",
                  }}
                >
                  <Icon size={22} style={{ color: "var(--color-accent)" }} />
                </div>
              ); })()}
              <h2
                className="font-bold text-white leading-tight"
                style={{ fontSize: "clamp(2rem, 3.5vw + 0.5rem, 3rem)" }}
              >
                {name}
              </h2>
              <p className="text-text-muted text-sm mt-2 max-w-lg">{meta.longDesc}</p>
            </div>
            <span
              className="px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: "oklch(65% 0.28 290 / 0.1)",
                color: "var(--color-accent)",
                border: "1px solid oklch(65% 0.28 290 / 0.2)",
              }}
            >
              {sorted.length} robots
            </span>
          </div>
        </div>
      </div>

      {/* Robot showcase: featured + supporting */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Featured robot — large */}
        {hero && (
          <div className="lg:col-span-2">
            <RobotShowcard robot={hero} featured />
          </div>
        )}
        {/* Rest — 2-col grid */}
        {rest.map((robot) => (
          <RobotShowcard key={robot.id} robot={robot} featured={false} />
        ))}
      </div>
    </section>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Catalog() {
  const [searchParams] = useSearchParams();
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const { setPage, setSearch: trackSearch, setCategory: trackCategory } = useUserActivity();

  const sectionRefs = useRef({});
  CATEGORIES.forEach((c) => {
    if (!sectionRefs.current[c]) sectionRefs.current[c] = null;
  });

  useEffect(() => setPage("catalog"), []);

  // Scroll to section from URL param (?category=Kitchen)
  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat && CATEGORIES.includes(cat)) {
      setTimeout(() => {
        const el = document.getElementById(`section-${cat.replace(/\s+/g, "-")}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        setActiveCategory(cat);
      }, 120);
    }
  }, [searchParams]);

  // Track active section as user scrolls
  useEffect(() => {
    const observers = [];
    CATEGORIES.forEach((cat) => {
      const el = document.getElementById(`section-${cat.replace(/\s+/g, "-")}`);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveCategory(cat);
        },
        { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const scrollTo = useCallback((cat) => {
    if (cat === "All") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setActiveCategory("All");
      trackCategory("All");
      return;
    }
    const el = document.getElementById(`section-${cat.replace(/\s+/g, "-")}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveCategory(cat);
    trackCategory(cat);
  }, [trackCategory]);

  // Search filtering
  const searchResults = search.trim()
    ? robots.filter((r) => {
        const q = search.toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          r.shortDesc.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q))
        );
      })
    : null;

  return (
    <div className="bg-grid">
      {/* ── PAGE HEADER ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute -top-20 left-1/4 w-[600px] h-[400px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, oklch(65% 0.28 290 / 0.4), transparent 65%)" }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
          <p className="text-xs font-semibold tracking-widest uppercase text-accent mb-3">Discover</p>
          <h1
            className="font-bold text-white leading-tight mb-3"
            style={{ fontSize: "clamp(2.5rem, 5vw + 0.5rem, 4rem)" }}
          >
            Robot Categories
          </h1>
          <p className="text-text-muted max-w-xl mb-1">
            Explore our curated collection across {CATEGORIES.length} categories.
            Each robot is hand-picked for its class-leading capabilities.
          </p>
          <p className="text-text-muted text-sm flex items-center gap-2 mt-3">
            <Sparkles size={14} className="text-accent" />
            <span>
              Not sure what you need?{" "}
              <button onClick={() => window.dispatchEvent(new CustomEvent("open-chat", { detail: { mode: "ai" } }))} className="text-accent hover:text-white font-medium cursor-pointer bg-transparent border-none p-0 text-sm" style={{ transition: "color 0.2s" }}>
                Ask our AI assistant
              </button>{" "}
              for personalized guidance.
            </span>
          </p>

          {/* Search bar */}
          <div className="relative mt-6 max-w-md">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search by name, tag, or description…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                trackSearch(e.target.value);
              }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-text-muted focus:outline-none focus:ring-1 border border-white/10 focus:border-accent/50 focus:ring-accent/30"
              style={{ background: "var(--color-surface-elevated)" }}
            />
          </div>
        </div>
      </div>

      {/* ── STICKY CATEGORY NAV ──────────────────────────────────────── */}
      <div
        className="sticky z-40 border-b border-white/6"
        style={{
          top: "64px",
          backdropFilter: "blur(20px) saturate(1.4)",
          WebkitBackdropFilter: "blur(20px) saturate(1.4)",
          background: "oklch(14% 0.028 255 / 0.90)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-none">
            {["All", ...CATEGORIES].map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  data-guide-id={cat !== "All" ? `catalog-filter-${cat}` : undefined}
                  onClick={() => scrollTo(cat)}
                  className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap"
                  style={{
                    transition: "background 0.25s var(--ease-out-expo), box-shadow 0.25s var(--ease-out-expo), color 0.25s",
                    background: isActive ? "var(--color-accent)" : "transparent",
                    color: isActive ? "#fff" : "var(--color-text-muted)",
                    boxShadow: isActive ? "0 0 18px var(--color-accent-glow)" : "none",
                    border: isActive ? "none" : "1px solid oklch(80% 0 0 / 0.08)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = "#fff";
                      e.currentTarget.style.background = "oklch(80% 0 0 / 0.06)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = "var(--color-text-muted)";
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── CONTENT ──────────────────────────────────────────────────── */}
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        style={{ paddingBlock: "var(--space-section)" }}
      >
        {searchResults ? (
          <div>
            <p className="text-text-muted text-sm mb-6">
              {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for &ldquo;{search}&rdquo;
            </p>
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.map((r) => (
                  <RobotShowcard key={r.id} robot={r} featured={false} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: "oklch(65% 0.28 290 / 0.08)", border: "1px solid oklch(65% 0.28 290 / 0.15)" }}>
                  <Bot size={28} style={{ color: "var(--color-accent)" }} />
                </div>
                <h3 className="text-white text-lg font-semibold mb-2">No robots found</h3>
                <p className="text-text-muted text-sm mb-4">Try different keywords</p>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent("open-chat", { detail: { mode: "ai" } }))}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:text-white cursor-pointer bg-transparent border-none p-0"
                  style={{ transition: "color 0.2s" }}
                >
                  <Sparkles size={14} /> Ask AI for help
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-20">
            {CATEGORIES.map((cat) => (
              <CategorySection
                key={cat}
                name={cat}
                sectionRef={(el) => (sectionRefs.current[cat] = el)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
