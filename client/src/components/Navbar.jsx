import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bot, ShoppingCart, MessageCircle, Menu, X, Package } from "lucide-react";
import { useUserActivity } from "../context/UserActivityContext";

export default function Navbar({ onCartClick }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { cart } = useUserActivity();

  const navLinks = [
    { path: "/", label: "Home" },
    { path: "/catalog", label: "Products" },
    { path: "/orders", label: "Order History", icon: <Package size={16} /> },
    { path: "/assistant", label: "AI Assistant", icon: <MessageCircle size={16} /> },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-primary/80 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-accent rounded-lg flex items-center justify-center group-hover:bg-neon transition-colors">
              <Bot size={22} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              Nexus<span className="text-neon">Bots</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ path, label, icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${location.pathname === path
                  ? "bg-accent/20 text-neon"
                  : "text-text-muted hover:text-white hover:bg-white/5"
                  }`}
              >
                {icon}
                {label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onCartClick}
              className="relative p-2 text-text-muted hover:text-white transition-colors"
            >
              <ShoppingCart size={20} />
              {cart.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-neon text-primary text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>

            <button
              className="md:hidden p-2 text-text-muted hover:text-white"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-white/10 mt-1">
            <div className="flex flex-col gap-1 pt-3">
              {navLinks.map(({ path, label, icon }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${location.pathname === path
                    ? "bg-accent/20 text-neon"
                    : "text-text-muted hover:text-white hover:bg-white/5"
                    }`}
                >
                  {icon}
                  {label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
