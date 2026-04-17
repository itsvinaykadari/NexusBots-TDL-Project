import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bot, ShoppingCart, MessageCircle, Menu, X, Package } from "lucide-react";
import { useUserActivity } from "../context/UserActivityContext";

export default function Navbar({ onCartClick }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { cart } = useUserActivity();

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 12); }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { path: "/",          label: "Home",         guideId: "nav-home"      },
    { path: "/catalog",   label: "Products",     guideId: "nav-catalog",  icon: null },
    { path: "/orders",    label: "Orders",       guideId: "nav-orders",   icon: <Package size={15} /> },
    { path: "/assistant", label: "AI Assistant", guideId: "nav-assistant", icon: <MessageCircle size={15} /> },
  ];

  return (
    <nav
      className="sticky top-0 z-50 border-b"
      style={{
        borderColor: scrolled ? "oklch(80% 0 0 / 0.1)" : "oklch(80% 0 0 / 0.06)",
        background: scrolled
          ? "oklch(15% 0.030 255 / 0.92)"
          : "oklch(18% 0.032 255 / 0.75)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow: scrolled ? "0 4px 32px oklch(0% 0 0 / 0.35)" : "none",
        transition: "background 0.35s var(--ease-out-expo), box-shadow 0.35s var(--ease-out-expo), border-color 0.35s",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link
            to="/"
            data-guide-id="nav-home"
            className="flex items-center gap-2 group"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{
                background: "var(--color-accent)",
                transition: "background 0.2s, box-shadow 0.2s",
                boxShadow: scrolled ? "0 0 16px var(--color-accent-glow)" : "none",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-neon)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-accent)"; }}
            >
              <Bot size={22} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              Nexus<span className="text-neon">Bots</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ path, label, guideId, icon }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  data-guide-id={guideId}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium"
                  style={{
                    background: isActive ? "oklch(65% 0.28 290 / 0.15)" : "transparent",
                    color: isActive ? "var(--color-neon)" : "var(--color-text-muted)",
                    transition: "background 0.2s, color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "oklch(80% 0 0 / 0.05)";
                      e.currentTarget.style.color = "#fff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--color-text-muted)";
                    }
                  }}
                >
                  {icon}
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Cart + hamburger */}
          <div className="flex items-center gap-3">
            <button
              data-guide-id="nav-cart"
              onClick={onCartClick}
              className="relative p-2"
              style={{ color: "var(--color-text-muted)", transition: "color 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-muted)"; }}
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 text-[10px] font-bold rounded-full flex items-center justify-center"
                  style={{
                    background: "var(--color-neon)",
                    color: "oklch(18% 0.032 255)",
                    boxShadow: "0 0 8px oklch(78% 0.16 195 / 0.6)",
                  }}
                >
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </button>

            <button
              className="md:hidden p-2"
              style={{ color: "var(--color-text-muted)" }}
              onClick={() => setMobileOpen(!mobileOpen)}
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
              {navLinks.map(({ path, label, guideId, icon }) => {
                const isActive = location.pathname === path;
                return (
                  <Link
                    key={path}
                    to={path}
                    data-guide-id={guideId}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium"
                    style={{
                      background: isActive ? "oklch(65% 0.28 290 / 0.15)" : "transparent",
                      color: isActive ? "var(--color-neon)" : "var(--color-text-muted)",
                    }}
                  >
                    {icon}
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
