import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bot, ShoppingCart, MessageCircle, Menu, X, ChevronDown, Sparkles, ArrowRight, ChefHat, SprayCan, Plane, PersonStanding } from "lucide-react";
import { useUserActivity } from "../context/UserActivityContext";
import robots from "../data/robots";

// ─── Category icons (Lucide) ──────────────────────────────────────────────────
const CATEGORY_ICONS = {
  Kitchen: ChefHat,
  "Home Cleaner": SprayCan,
  Drone: Plane,
  Humanoid: PersonStanding,
};

// ─── Category metadata for mega-menu ──────────────────────────────────────────
const CATEGORY_META = {
  Kitchen: {
    desc: "Voice assistants & smart cooking companions",
    color: "oklch(78% 0.16 80)",
  },
  "Home Cleaner": {
    desc: "Autonomous floor, mop & window robots",
    color: "oklch(78% 0.16 160)",
  },
  Drone: {
    desc: "Indoor patrol, enterprise & pool drones",
    color: "oklch(78% 0.16 240)",
  },
  Humanoid: {
    desc: "Educational companions & classroom builders",
    color: "oklch(78% 0.16 310)",
  },
};

const CATEGORIES = Object.keys(CATEGORY_META);

function getRobotsForCategory(cat) {
  return robots.filter((r) => r.category === cat).sort((a, b) => b.rating - a.rating);
}

export default function Navbar({ onCartClick, onAIClick, isAIOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Kitchen");
  const { cart, userName } = useUserActivity();
  const megaRef = useRef(null);
  const triggerRef = useRef(null);
  const closeTimer = useRef(null);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 12); }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mega-menu on route change
  useEffect(() => {
    setMegaOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  const openMega = useCallback(() => {
    clearTimeout(closeTimer.current);
    setMegaOpen(true);
  }, []);

  const closeMegaDelayed = useCallback(() => {
    closeTimer.current = setTimeout(() => setMegaOpen(false), 200);
  }, []);

  const cancelClose = useCallback(() => {
    clearTimeout(closeTimer.current);
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!megaOpen) return;
    function handleClick(e) {
      if (
        megaRef.current && !megaRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) {
        setMegaOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [megaOpen]);

  const activeBots = getRobotsForCategory(activeCategory);

  return (
    <>
      <nav
        className="sticky top-0 z-50 border-b"
        style={{
          borderColor: scrolled ? "oklch(80% 0 0 / 0.1)" : "oklch(80% 0 0 / 0.06)",
          background: scrolled
            ? "oklch(12% 0.025 255 / 0.95)"
            : "oklch(14% 0.030 255 / 0.80)",
          backdropFilter: "blur(24px) saturate(1.4)",
          WebkitBackdropFilter: "blur(24px) saturate(1.4)",
          boxShadow: scrolled ? "0 4px 32px oklch(0% 0 0 / 0.5)" : "none",
          transition: "background 0.35s var(--ease-out-expo), box-shadow 0.35s var(--ease-out-expo), border-color 0.35s",
        }}
      >
        <div
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-[padding-right] duration-300 ${isAIOpen ? "md:pr-[420px]" : ""
            }`}
        >
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link
              to="/"
              data-guide-id="nav-home"
              className="flex items-center gap-2.5 group"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, var(--color-accent), oklch(72% 0.22 280))",
                  transition: "box-shadow 0.3s var(--ease-out-expo)",
                  boxShadow: scrolled ? "0 0 20px var(--color-accent-glow)" : "none",
                }}
              >
                <Bot size={20} className="text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                Nexus<span style={{ color: "var(--color-neon)" }}>Bots</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {/* Home */}
              <Link
                to="/"
                data-guide-id="nav-home"
                className="px-3 py-2 rounded-lg text-sm font-medium"
                style={{
                  color: location.pathname === "/" ? "#fff" : "var(--color-text-muted)",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={(e) => {
                  if (location.pathname !== "/") e.currentTarget.style.color = "var(--color-text-muted)";
                }}
              >
                Home
              </Link>

              {/* Present */}
              <Link
                to="/present"
                className="px-3 py-2 rounded-lg text-sm font-medium"
                style={{
                  color: location.pathname === "/present" ? "#fff" : "var(--color-text-muted)",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={(e) => {
                  if (location.pathname !== "/present") e.currentTarget.style.color = "var(--color-text-muted)";
                }}
              >
                Present
              </Link>

              {/* Robots — mega-menu trigger (click-only) */}
              <button
                ref={triggerRef}
                data-guide-id="nav-catalog"
                aria-expanded={megaOpen}
                aria-haspopup="menu"
                onClick={() => setMegaOpen((v) => !v)}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer"
                style={{
                  color: megaOpen || location.pathname.startsWith("/catalog") ? "#fff" : "var(--color-text-muted)",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={(e) => {
                  if (!megaOpen && !location.pathname.startsWith("/catalog")) e.currentTarget.style.color = "var(--color-text-muted)";
                }}
              >
                Robots
                <ChevronDown
                  size={14}
                  style={{
                    transform: megaOpen ? "rotate(180deg)" : "rotate(0)",
                    transition: "transform 0.25s var(--ease-out-expo)",
                  }}
                />
              </button>

              {/* Orders */}
              <Link
                to="/orders"
                data-guide-id="nav-orders"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium"
                style={{
                  color: location.pathname === "/orders" ? "#fff" : "var(--color-text-muted)",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={(e) => {
                  if (location.pathname !== "/orders") e.currentTarget.style.color = "var(--color-text-muted)";
                }}
              >
                Orders
              </Link>
            </div>

            {/* Right: Ask AI + cart + mobile toggle */}
            <div className="flex items-center gap-2">

              {/* Logged-in user badge */}
              <div
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl"
                style={{
                  background: "oklch(65% 0.28 290 / 0.06)",
                  border: "1px solid oklch(65% 0.28 290 / 0.14)",
                }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                  style={{
                    background: "linear-gradient(135deg, oklch(65% 0.28 290), oklch(58% 0.26 280))",
                    color: "#fff",
                    flexShrink: 0,
                  }}
                >
                  {(userName || "A")[0].toUpperCase()}
                </div>
                <span className="text-xs font-medium" style={{ color: "oklch(85% 0.01 255)" }}>
                  {userName || "Admin"}
                </span>
                {/* <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: "oklch(72% 0.18 145 / 0.15)",
                    color: "oklch(72% 0.18 145)",
                    border: "1px solid oklch(72% 0.18 145 / 0.25)",
                  }}
                >
                  Online
                </span> */}
              </div>

              {/* Ask AI — accent pill on right */}
              <button
                data-guide-id="nav-assistant"
                className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer"
                style={{
                  color: isAIOpen ? "#fff" : "var(--color-accent)",
                  background: isAIOpen
                    ? "linear-gradient(135deg, oklch(65% 0.28 290), oklch(58% 0.26 280))"
                    : "oklch(65% 0.28 290 / 0.08)",
                  border: isAIOpen ? "1px solid oklch(65% 0.28 290 / 0.4)" : "1px solid oklch(65% 0.28 290 / 0.2)",
                  boxShadow: isAIOpen ? "0 0 20px oklch(65% 0.28 290 / 0.25)" : "none",
                  transition: "all 0.3s var(--ease-out-expo)",
                }}
                onMouseEnter={(e) => {
                  if (!isAIOpen) {
                    e.currentTarget.style.background = "oklch(65% 0.28 290 / 0.15)";
                    e.currentTarget.style.borderColor = "oklch(65% 0.28 290 / 0.35)";
                    e.currentTarget.style.boxShadow = "0 0 16px oklch(65% 0.28 290 / 0.15)";
                    e.currentTarget.style.color = "#fff";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isAIOpen) {
                    e.currentTarget.style.background = "oklch(65% 0.28 290 / 0.08)";
                    e.currentTarget.style.borderColor = "oklch(65% 0.28 290 / 0.2)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.color = "var(--color-accent)";
                  }
                }}
                onClick={onAIClick}
              >
                <Sparkles size={14} />
                Ask AI
              </button>

              {/* Cart — only visible when items are added, very subtle */}
              {cartCount > 0 && (
                <button
                  data-guide-id="nav-cart"
                  onClick={onCartClick}
                  aria-label={`Open cart, ${cartCount} item${cartCount === 1 ? "" : "s"}`}
                  className="relative p-2 rounded-lg"
                  style={{
                    color: "var(--color-accent)",
                    transition: "color 0.2s, background 0.2s, opacity 0.4s var(--ease-out-expo)",
                    animation: "cartPulse 2s ease-in-out",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#fff";
                    e.currentTarget.style.background = "oklch(65% 0.28 290 / 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--color-accent)";
                    e.currentTarget.style.background = "transparent";
                  }}
                  title="Your selections"
                >
                  <ShoppingCart size={16} />
                  <span
                    className="absolute -top-0.5 -right-0.5 w-4 h-4 text-[10px] font-bold rounded-full flex items-center justify-center"
                    style={{
                      background: "var(--color-accent)",
                      color: "#fff",
                      boxShadow: "0 0 8px var(--color-accent-glow)",
                    }}
                  >
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                </button>
              )}

              {/* Mobile hamburger */}
              <button
                className="md:hidden p-2"
                style={{ color: "var(--color-text-muted)" }}
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileOpen && (
            <div
              className="md:hidden pb-4 border-t mt-1"
              style={{ borderColor: "oklch(80% 0 0 / 0.08)" }}
            >
              <div className="flex flex-col gap-1 pt-3">
                <Link to="/" onClick={() => setMobileOpen(false)}
                  className="px-3 py-2.5 rounded-lg text-sm font-medium"
                  style={{ color: location.pathname === "/" ? "#fff" : "var(--color-text-muted)" }}>
                  Home
                </Link>

                <Link to="/present" onClick={() => setMobileOpen(false)}
                  className="px-3 py-2.5 rounded-lg text-sm font-medium"
                  style={{ color: location.pathname === "/present" ? "#fff" : "var(--color-text-muted)" }}>
                  Present
                </Link>

                {/* Mobile categories */}
                <div className="px-3 py-2">
                  <p className="text-xs font-semibold tracking-widest uppercase text-text-muted mb-2">Robot Categories</p>
                  {CATEGORIES.map((cat) => (
                    <Link
                      key={cat}
                      to={`/catalog/${cat.toLowerCase().replace(/\s+/g, "-")}`}
                      data-guide-id={`catalog-filter-${cat}`}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-2 py-2 rounded-lg text-sm"
                      style={{ color: "var(--color-text-muted)", transition: "color 0.2s" }}
                    >
                      {(() => { const Icon = CATEGORY_ICONS[cat]; return <Icon size={18} style={{ color: CATEGORY_META[cat].color }} />; })()}
                      <div>
                        <p className="text-white font-medium text-sm">{cat}</p>
                        <p className="text-text-muted text-xs">{CATEGORY_META[cat].desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>

                <button
                  data-guide-id="nav-assistant"
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-left cursor-pointer"
                  style={{ color: isAIOpen ? "#fff" : "var(--color-text-muted)", background: "none", border: "none" }}
                  onClick={() => {
                    setMobileOpen(false);
                    onAIClick?.();
                  }}
                >
                  <Sparkles size={14} />
                  AI Assistant
                </button>

                <Link to="/orders" onClick={() => setMobileOpen(false)}
                  data-guide-id="nav-orders"
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium"
                  style={{ color: location.pathname === "/orders" ? "#fff" : "var(--color-text-muted)" }}>
                  Orders
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* ── MEGA-MENU DROPDOWN ─────────────────────────────────────── */}
      <div
        ref={megaRef}
        className={`fixed left-0 right-0 z-40 transition-[right] duration-300 ${isAIOpen ? "md:right-[420px]" : ""
          }`}
        style={{
          top: "64px",
          opacity: megaOpen ? 1 : 0,
          transform: megaOpen ? "translateY(0)" : "translateY(-8px)",
          pointerEvents: megaOpen ? "auto" : "none",
          transition: "right 0.3s var(--ease-out-expo), opacity 0.25s var(--ease-out-expo), transform 0.25s var(--ease-out-expo)",
        }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 h-screen"
          style={{ background: "oklch(0% 0 0 / 0.4)", pointerEvents: megaOpen ? "auto" : "none" }}
          onClick={() => setMegaOpen(false)}
        />

        {/* Panel */}
        <div
          className="relative mx-auto border border-white/8 rounded-2xl overflow-hidden"
          style={{
            maxWidth: "1120px",
            margin: "8px auto",
            background: "oklch(16% 0.028 255 / 0.98)",
            backdropFilter: "blur(32px) saturate(1.5)",
            WebkitBackdropFilter: "blur(32px) saturate(1.5)",
            boxShadow: "0 24px 80px oklch(0% 0 0 / 0.6), 0 0 1px oklch(80% 0 0 / 0.1)",
          }}
        >
          <div className="grid grid-cols-[240px_1fr]" style={{ minHeight: "360px" }}>

            {/* Left column — category list */}
            <div className="border-r border-white/6 py-3">
              <p className="px-5 pt-2 pb-3 text-[11px] font-semibold tracking-widest uppercase text-text-muted">
                Categories
              </p>
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    data-guide-id={`catalog-filter-${cat}`}
                    className="w-full flex items-center gap-3 px-5 py-3 text-left"
                    style={{
                      background: isActive ? "oklch(65% 0.28 290 / 0.08)" : "transparent",
                      borderLeft: isActive ? "2px solid var(--color-accent)" : "2px solid transparent",
                      transition: "background 0.15s, border-color 0.15s",
                    }}
                    onClick={() => {
                      if (activeCategory !== cat) {
                        setActiveCategory(cat);
                      } else {
                        navigate(`/catalog/${cat.toLowerCase().replace(/\s+/g, "-")}`);
                        setMegaOpen(false);
                      }
                    }}
                  >
                    {(() => { const Icon = CATEGORY_ICONS[cat]; return <Icon size={18} style={{ color: isActive ? CATEGORY_META[cat].color : "var(--color-text-muted)", transition: "color 0.15s" }} />; })()}
                    <div>
                      <p
                        className="text-sm font-medium leading-tight"
                        style={{ color: isActive ? "#fff" : "var(--color-text-muted)" }}
                      >
                        {cat}
                      </p>
                      <p className="text-[11px] text-text-muted mt-0.5 leading-tight">
                        {CATEGORY_META[cat].desc}
                      </p>
                    </div>
                  </button>
                );
              })}

            </div>

            {/* Right column — robots in active category */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">{activeCategory}</h3>
                <span className="text-[11px] text-text-muted">{activeBots.length} robots</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {activeBots.map((robot) => (
                  <Link
                    key={robot.id}
                    to={`/robot/${robot.id}`}
                    onClick={() => setMegaOpen(false)}
                    className="group flex flex-col rounded-xl border border-white/6 overflow-hidden"
                    style={{
                      background: "oklch(20% 0.030 255)",
                      transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s var(--ease-out-expo)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "oklch(65% 0.28 290 / 0.3)";
                      e.currentTarget.style.boxShadow = "0 8px 24px oklch(0% 0 0 / 0.3)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "oklch(80% 0 0 / 0.06)";
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <div className="relative h-28 overflow-hidden">
                      <img
                        src={robot.image}
                        alt={robot.name}
                        className="w-full h-full object-cover group-hover:scale-105"
                        style={{ transition: "transform 0.4s var(--ease-out-expo)" }}
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <span
                        className="absolute bottom-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: "oklch(65% 0.28 290 / 0.2)",
                          color: "var(--color-accent)",
                          border: "1px solid oklch(65% 0.28 290 / 0.25)",
                          backdropFilter: "blur(8px)",
                        }}
                      >
                        {robot.highlight}
                      </span>
                    </div>
                    <div className="p-3 flex flex-col flex-1">
                      <h4
                        className="text-sm font-semibold text-white leading-snug group-hover:text-accent mb-1"
                        style={{ transition: "color 0.2s" }}
                      >
                        {robot.name}
                      </h4>
                      <p className="text-[11px] text-text-muted leading-relaxed line-clamp-2 flex-1">
                        {robot.shortDesc}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                        <span className="text-sm font-bold text-white">
                          ${robot.price.toLocaleString()}
                        </span>
                        <span className="text-[11px] text-accent font-medium flex items-center gap-0.5 group-hover:gap-1.5"
                          style={{ transition: "gap 0.2s var(--ease-out-expo)" }}>
                          View <ArrowRight size={10} />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
