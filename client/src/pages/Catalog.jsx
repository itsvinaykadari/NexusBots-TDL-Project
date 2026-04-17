import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import robots from "../data/robots";
import { useUserActivity } from "../context/UserActivityContext";

// ─── Static metadata per category ────────────────────────────────────────────
const CATEGORIES = ["Kitchen", "Home Cleaner", "Drone", "Humanoid"];

const CATEGORY_META = {
  Kitchen:        { desc: "Voice-controlled assistants for the smart kitchen" },
  "Home Cleaner": { desc: "Autonomous robots that keep every surface spotless" },
  Drone:          { desc: "Aerial and surface robots for patrol and inspection" },
  Humanoid:       { desc: "Educational companions that learn alongside you" },
};

// ─── Individual card ─────────────────────────────────────────────────────────
function BentoCard({ robot, hero }) {
  return (
    <Link
      to={`/robot/${robot.id}`}
      data-guide-id={`catalog-card-${robot.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-surface-elevated"
      style={{
        transition: `transform 0.4s var(--ease-out-expo), box-shadow 0.4s var(--ease-out-expo)`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-6px)";
        e.currentTarget.style.boxShadow = "0 24px 48px oklch(0% 0 0 / 0.45), 0 0 0 1px oklch(65% 0.28 290 / 0.18)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Image */}
      <div
        className="relative overflow-hidden flex-shrink-0"
        style={{ height: hero ? "240px" : "150px" }}
      >
        <img
          src={robot.image}
          alt={robot.name}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105"
          style={{ transition: "transform 0.6s var(--ease-out-expo)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        {robot.highlight && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-accent/25 border border-accent/40 text-accent backdrop-blur-sm">
            {robot.highlight}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4">
        <h3
          className="font-semibold text-white leading-snug mb-1 group-hover:text-accent"
          style={{
            fontSize: hero ? "1.1rem" : "0.95rem",
            transition: "color 0.25s var(--ease-out-expo)",
          }}
        >
          {robot.name}
        </h3>
        <p className="text-text-muted text-xs leading-relaxed mb-3 flex-1 line-clamp-2">
          {robot.shortDesc}
        </p>
        <div className="flex items-center justify-between mt-auto">
          <span className="font-bold text-white" style={{ fontSize: hero ? "1.2rem" : "1rem" }}>
            ${robot.price.toLocaleString()}
          </span>
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold text-accent group-hover:gap-2"
            style={{ transition: "gap 0.3s var(--ease-out-expo)" }}
          >
            View <ArrowRight size={12} />
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Category section: 1 hero + 2 small bento ────────────────────────────────
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
      className="scroll-mt-28"
    >
      {/* Section heading */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h2
            className="font-bold text-white leading-tight"
            style={{ fontSize: "clamp(1.75rem, 3vw + 0.5rem, 2.5rem)" }}
          >
            {name}
          </h2>
          <p className="text-text-muted text-sm mt-1">{meta.desc}</p>
        </div>
        <span className="text-xs font-semibold tracking-widest uppercase text-text-muted">
          {sorted.length} robots
        </span>
      </div>

      {/* Bento grid */}
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: "repeat(3, 1fr)",
          gridTemplateRows: "auto auto",
        }}
      >
        {/* Hero card — spans 2 columns × 2 rows */}
        <div style={{ gridColumn: "1 / 3", gridRow: "1 / 3" }}>
          {hero && <BentoCard robot={hero} hero />}
        </div>

        {/* Small cards stacked in column 3 */}
        {rest.slice(0, 2).map((robot, i) => (
          <div key={robot.id} style={{ gridColumn: "3 / 4", gridRow: `${i + 1} / ${i + 2}` }}>
            <BentoCard robot={robot} hero={false} />
          </div>
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

  // One ref per category section
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

  // Search filtering (renders a flat grid when active)
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6">
        <p className="text-xs font-semibold tracking-widest uppercase text-accent mb-2">All products</p>
        <h1
          className="font-bold text-white leading-tight mb-2"
          style={{ fontSize: "clamp(2rem, 4vw + 0.5rem, 3.5rem)" }}
        >
          Robot Catalog
        </h1>
        <p className="text-text-muted text-sm max-w-lg">
          {robots.length} robots across {CATEGORIES.length} categories — browse by section or search below.
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

      {/* ── STICKY CATEGORY NAV ──────────────────────────────────────── */}
      <div
        className="sticky z-40 border-b border-white/8"
        style={{
          top: "64px",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          background: "oklch(18% 0.032 255 / 0.85)",
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
                    border: isActive ? "none" : "1px solid oklch(80% 0 0 / 0.1)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.color = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.color = "var(--color-text-muted)";
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
          /* Search results flat grid */
          <div>
            <p className="text-text-muted text-sm mb-6">
              {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{search}"
            </p>
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {searchResults.map((r) => (
                  <BentoCard key={r.id} robot={r} hero={false} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">🤖</div>
                <h3 className="text-white text-lg font-semibold mb-2">No robots found</h3>
                <p className="text-text-muted text-sm">Try different keywords</p>
              </div>
            )}
          </div>
        ) : (
          /* Category sections */
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
