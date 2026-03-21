import { Link, useLocation } from "react-router-dom";
import { Bot, ShoppingCart, MessageCircle, Mic, Mail } from "lucide-react";

export default function Navbar() {
  const location = useLocation();

  const navLinks = [
    { path: "/", label: "Home" },
    { path: "/catalog", label: "Catalog" },
    { path: "/chat", label: "Chat", icon: <MessageCircle size={16} /> },
    { path: "/voice", label: "Voice", icon: <Mic size={16} /> },
    { path: "/support", label: "Support", icon: <Mail size={16} /> },
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
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  location.pathname === path
                    ? "bg-accent/20 text-neon"
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                }`}
              >
                {icon}
                {label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button className="relative p-2 text-slate-300 hover:text-white transition-colors">
              <ShoppingCart size={20} />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-neon text-primary text-[10px] font-bold rounded-full flex items-center justify-center">
                0
              </span>
            </button>

            {/* Mobile menu button */}
            <button className="md:hidden p-2 text-slate-300 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
