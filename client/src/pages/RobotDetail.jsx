import { useParams, Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { ArrowLeft, Star, ShoppingCart, MessageCircle, ArrowRight, Tag, Zap } from "lucide-react";
import robots from "../data/robots";
import { useUserActivity } from "../context/UserActivityContext";

// Pick 4 visually meaningful spec entries to feature in the bento
function getPrimarySpecs(specs) {
  const keys = Object.keys(specs);
  return keys.slice(0, 4).map((k) => ({ key: k, value: specs[k] }));
}

// ─── Spec bento tile ─────────────────────────────────────────────────────────
function SpecTile({ label, value, icon: Icon }) {
  return (
    <div
      className="rounded-2xl border border-white/8 p-5 flex flex-col gap-2"
      style={{ background: "var(--color-surface-elevated)" }}
    >
      {Icon && <Icon size={18} className="text-accent opacity-70" />}
      <span
        className="font-bold text-white leading-tight"
        style={{ fontSize: "clamp(1.1rem, 1.5vw + 0.5rem, 1.5rem)" }}
      >
        {value}
      </span>
      <span className="text-text-muted text-xs uppercase tracking-wider capitalize">{label}</span>
    </div>
  );
}

// ─── Compare card ─────────────────────────────────────────────────────────────
function CompareCard({ robot }) {
  return (
    <Link
      to={`/robot/${robot.id}`}
      data-guide-id="product-compare"
      className="group relative flex items-center gap-4 rounded-2xl border border-white/8 p-4 overflow-hidden"
      style={{
        background: "var(--color-surface-elevated)",
        transition: "border-color 0.25s var(--ease-out-expo), box-shadow 0.25s var(--ease-out-expo)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "oklch(65% 0.28 290 / 0.4)";
        e.currentTarget.style.boxShadow = "0 8px 24px oklch(0% 0 0 / 0.3)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "oklch(80% 0 0 / 0.08)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden">
        <img
          src={robot.image}
          alt={robot.name}
          className="w-full h-full object-cover group-hover:scale-105"
          style={{ transition: "transform 0.4s var(--ease-out-expo)" }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-white font-semibold text-sm leading-snug truncate group-hover:text-accent"
          style={{ transition: "color 0.2s" }}>
          {robot.name}
        </h4>
        <p className="text-text-muted text-xs mt-0.5 line-clamp-1">{robot.shortDesc}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-accent font-bold text-sm">${robot.price.toLocaleString()}</span>
          <span className="flex items-center gap-0.5 text-amber-400 text-xs">
            <Star size={10} fill="currentColor" />
            {robot.rating}
          </span>
        </div>
      </div>
      <span
        className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-accent group-hover:gap-2"
        style={{ transition: "gap 0.3s var(--ease-out-expo)" }}
      >
        Compare <ArrowRight size={12} />
      </span>
    </Link>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function RobotDetail() {
  const { id } = useParams();
  const robot = robots.find((r) => r.id === parseInt(id, 10));
  const { viewProduct, addToCart, setPage } = useUserActivity();
  const [addedFlash, setAddedFlash] = useState(false);
  const narrativeRef = useRef(null);
  const [narrativeVisible, setNarrativeVisible] = useState(false);

  useEffect(() => {
    setPage("robot");
    if (robot) viewProduct(robot);
  }, [robot?.id]);

  useEffect(() => {
    const el = narrativeRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setNarrativeVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [robot?.id]);

  if (!robot) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Robot not found</h2>
        <Link to="/catalog" className="text-accent hover:text-neon">Back to catalog</Link>
      </div>
    );
  }

  const primarySpecs = getPrimarySpecs(robot.specs);
  const compareRobots = robots
    .filter((r) => r.category === robot.category && r.id !== robot.id)
    .slice(0, 3);

  function handleAddToCart() {
    addToCart(robot);
    setAddedFlash(true);
    setTimeout(() => setAddedFlash(false), 1400);
  }

  return (
    <div className="bg-grid">

      {/* ── FULL-BLEED HERO ─────────────────────────────────────────── */}
      <div
        className="relative w-full overflow-hidden"
        style={{ minHeight: "min(92vh, 780px)" }}
      >
        {/* Background image — full bleed */}
        <div className="absolute inset-0">
          <img
            src={robot.image}
            alt={robot.name}
            className="w-full h-full object-cover"
            style={{ filter: "brightness(0.35) saturate(0.7)" }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, oklch(18% 0.032 255 / 0.96) 38%, oklch(18% 0.032 255 / 0.6) 60%, transparent 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, transparent 60%, oklch(18% 0.032 255) 100%)",
            }}
          />
        </div>

        {/* Back link */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <Link
            to="/catalog"
            className="inline-flex items-center gap-1.5 text-text-muted hover:text-white text-sm transition-colors"
          >
            <ArrowLeft size={15} />
            Back to Catalog
          </Link>
        </div>

        {/* Hero content: left column */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16"
          style={{ paddingTop: "clamp(2rem, 5vw, 5rem)" }}>
          <div className="max-w-xl">
            {/* Category + highlight badges */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="px-3 py-1 rounded-full text-xs font-semibold border border-neon/30 text-neon"
                style={{ background: "oklch(78% 0.16 195 / 0.08)" }}>
                {robot.category}
              </span>
              {robot.highlight && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold border border-accent/35 text-accent"
                  style={{ background: "oklch(65% 0.28 290 / 0.1)" }}>
                  {robot.highlight}
                </span>
              )}
            </div>

            {/* Robot name */}
            <h1
              className="font-bold text-white leading-tight mb-3"
              style={{ fontSize: "clamp(2.25rem, 5vw + 0.5rem, 4.5rem)" }}
            >
              {robot.name}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} fill={i < Math.round(robot.rating) ? "currentColor" : "none"}
                    strokeWidth={1.5} />
                ))}
              </div>
              <span className="text-text-muted text-sm">{robot.rating} rating</span>
            </div>

            {/* Tagline */}
            <p className="text-text-muted text-base leading-relaxed mb-8 max-w-sm">
              {robot.shortDesc}
            </p>

            {/* Price + CTA */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <span
                className="font-bold text-white"
                style={{ fontSize: "clamp(2rem, 3vw + 0.5rem, 3rem)" }}
              >
                ${robot.price.toLocaleString()}
              </span>
              <span className="text-xs font-semibold text-neon-green px-2.5 py-1 rounded-full border border-neon-green/25"
                style={{ background: "oklch(78% 0.18 145 / 0.08)" }}>
                In Stock
              </span>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                data-guide-id="product-add-to-cart"
                onClick={handleAddToCart}
                className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-white text-sm"
                style={{
                  background: addedFlash ? "oklch(55% 0.28 290)" : "var(--color-accent)",
                  boxShadow: "0 0 24px var(--color-accent-glow)",
                  transition: "background 0.3s var(--ease-out-expo), transform 0.15s, box-shadow 0.3s",
                  transform: addedFlash ? "scale(0.97)" : "scale(1)",
                }}
              >
                <ShoppingCart size={17} />
                {addedFlash ? "Added!" : "Add to Cart"}
              </button>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-chat", { detail: { mode: "ai" } }))}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white text-sm border border-white/12 hover:border-white/25 hover:bg-white/5 transition-all cursor-pointer"
                style={{ background: "none" }}
              >
                <MessageCircle size={17} />
                Ask AI
              </button>
            </div>
          </div>
        </div>

        {/* Right-side floating image (desktop only) */}
        <div
          className="hidden lg:block absolute right-0 bottom-0"
          style={{ width: "40%", height: "100%", pointerEvents: "none" }}
        >
          <img
            src={robot.image}
            alt=""
            aria-hidden
            className="absolute bottom-0 right-0 w-full h-full object-cover object-center"
            style={{ maskImage: "linear-gradient(90deg, transparent 0%, black 30%)", opacity: 0.75 }}
          />
        </div>
      </div>

      {/* ── SPECS BENTO ─────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <p className="text-xs font-semibold tracking-widest uppercase text-accent mb-4">Specifications</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {primarySpecs.map(({ key, value }) => (
            <SpecTile key={key} label={key} value={value} icon={Zap} />
          ))}
        </div>

        {/* All specs in a clean table */}
        <div
          className="rounded-2xl border border-white/8 overflow-hidden"
          style={{ background: "var(--color-surface-elevated)" }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2">
            {Object.entries(robot.specs).map(([key, value], i) => (
              <div
                key={key}
                className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 last:border-0"
                style={{ borderRight: i % 2 === 0 ? "1px solid oklch(80% 0 0 / 0.05)" : "none" }}
              >
                <span className="text-text-muted text-sm capitalize">{key}</span>
                <span className="text-white text-sm font-medium text-right max-w-[55%]">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── NARRATIVE SECTION ───────────────────────────────────────── */}
      <div
        ref={narrativeRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10"
        style={{
          opacity: narrativeVisible ? 1 : 0,
          transform: narrativeVisible ? "translateY(0)" : "translateY(32px)",
          transition: "opacity 0.7s var(--ease-out-expo), transform 0.7s var(--ease-out-expo)",
        }}
      >
        <p className="text-xs font-semibold tracking-widest uppercase text-accent mb-4">
          Deep Dive
        </p>
        <h2
          className="font-bold text-white leading-tight mb-10"
          style={{ fontSize: "clamp(1.6rem, 2.5vw + 0.5rem, 2.75rem)" }}
        >
          Inside the {robot.name}
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Narrative text */}
          <div className="space-y-6 text-text-muted leading-relaxed">
            <p style={{ fontSize: "clamp(0.95rem, 0.4vw + 0.85rem, 1.05rem)" }}>
              {robot.description} Every aspect of its design has been optimized for the environment
              it operates in, balancing processing power with energy efficiency to deliver reliable
              performance across varied conditions.
            </p>
            <p style={{ fontSize: "clamp(0.95rem, 0.4vw + 0.85rem, 1.05rem)" }}>
              {robot.purpose} The hardware integrates seamlessly with modern smart home ecosystems,
              enabling workflows that adapt to daily routines without requiring manual configuration.
            </p>
            <p style={{ fontSize: "clamp(0.95rem, 0.4vw + 0.85rem, 1.05rem)" }}>
              Whether you are setting it up for the first time or expanding an existing automation
              setup, the {robot.name} is engineered to slot in naturally. Its companion app provides
              granular control while sensible defaults mean it works well right out of the box.
            </p>

            {/* Tags */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Tag size={13} className="text-text-muted" />
              {robot.tags.map((tag) => (
                <span key={tag} className="px-3 py-1 rounded-full text-xs bg-white/5 text-text-muted border border-white/8">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Detail image */}
          <div className="relative rounded-2xl overflow-hidden border border-white/8"
            style={{ aspectRatio: "4/3" }}>
            <img
              src={robot.image}
              alt={`${robot.name} detail`}
              className="w-full h-full object-cover"
              style={{ filter: "saturate(0.9) brightness(0.9)" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <span className="text-white font-semibold text-sm">{robot.name}</span>
              <p className="text-text-muted text-xs mt-0.5">{robot.category} category</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── COMPARE BAND ────────────────────────────────────────────── */}
      {compareRobots.length > 0 && (
        <div
          className="mt-6 border-t border-white/8 py-14"
          style={{ background: "oklch(20% 0.032 255 / 0.6)" }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase text-accent mb-1">Same category</p>
                <h2 className="font-bold text-white" style={{ fontSize: "clamp(1.3rem, 2vw + 0.4rem, 2rem)" }}>
                  Compare with others
                </h2>
              </div>
              <Link
                to={`/catalog?category=${encodeURIComponent(robot.category)}`}
                className="text-sm text-text-muted hover:text-white transition-colors inline-flex items-center gap-1"
              >
                View all {robot.category} <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {compareRobots.map((r) => (
                <CompareCard key={r.id} robot={r} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── STICKY MOBILE BAR ───────────────────────────────────────── */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-4 px-4 py-3 border-t border-white/10"
        style={{
          background: "oklch(18% 0.032 255 / 0.95)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <div>
          <p className="text-text-muted text-xs">{robot.name}</p>
          <p className="text-white font-bold text-lg leading-tight">${robot.price.toLocaleString()}</p>
        </div>
        <button
          data-guide-id="product-add-to-cart"
          onClick={handleAddToCart}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white text-sm flex-shrink-0"
          style={{
            background: addedFlash ? "oklch(55% 0.28 290)" : "var(--color-accent)",
            boxShadow: "0 0 20px var(--color-accent-glow)",
            transition: "background 0.3s",
          }}
        >
          <ShoppingCart size={16} />
          {addedFlash ? "Added!" : "Add to Cart"}
        </button>
      </div>

      {/* Bottom padding so sticky bar doesn't cover content on mobile */}
      <div className="lg:hidden h-20" />
    </div>
  );
}
