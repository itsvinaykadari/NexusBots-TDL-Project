import { Link } from "react-router-dom";
import { Bot, Sparkles } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/6 mt-auto" style={{ background: "oklch(10% 0.020 260)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, var(--color-accent), oklch(72% 0.22 280))" }}
              >
                <Bot size={17} className="text-white" />
              </div>
              <span className="text-lg font-bold text-white">
                Nexus<span style={{ color: "var(--color-neon)" }}>Bots</span>
              </span>
            </div>
            <p className="text-text-muted text-sm leading-relaxed">
              AI-powered robotics platform. Discover the perfect robot through intelligent conversation.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Categories</h3>
            <ul className="space-y-2 text-sm text-text-muted">
              <li><Link to="/catalog?category=Kitchen" className="hover:text-white transition-colors">Kitchen</Link></li>
              <li><Link to="/catalog?category=Home+Cleaner" className="hover:text-white transition-colors">Home Cleaner</Link></li>
              <li><Link to="/catalog?category=Drone" className="hover:text-white transition-colors">Drone</Link></li>
              <li><Link to="/catalog?category=Humanoid" className="hover:text-white transition-colors">Humanoid</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">AI Platform</h3>
            <ul className="space-y-2 text-sm text-text-muted">
              <li><button onClick={() => window.dispatchEvent(new CustomEvent("open-chat", { detail: { mode: "ai" } }))} className="hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer bg-transparent border-none p-0 text-sm text-text-muted"><Sparkles size={12} />AI Assistant</button></li>
              <li><button onClick={() => window.dispatchEvent(new CustomEvent("open-chat", { detail: { mode: "ai" } }))} className="hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0 text-sm text-text-muted">Voice Interaction</button></li>
              <li><button onClick={() => window.dispatchEvent(new CustomEvent("open-chat", { detail: { mode: "ai" } }))} className="hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0 text-sm text-text-muted">Smart Comparisons</button></li>
              <li><button onClick={() => window.dispatchEvent(new CustomEvent("open-chat", { detail: { mode: "ai" } }))} className="hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0 text-sm text-text-muted">Visual Guidance</button></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Experience</h3>
            <ul className="space-y-2 text-sm text-text-muted">
              <li><button onClick={() => window.dispatchEvent(new CustomEvent("open-chat", { detail: { mode: "ai" } }))} className="hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer bg-transparent border-none p-0 text-sm text-text-muted"><Sparkles size={12} />Talk to AI</button></li>
              <li><Link to="/catalog" className="hover:text-white transition-colors">Browse Categories</Link></li>
              <li><Link to="/orders" className="hover:text-white transition-colors">Orders & Support</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/6 mt-10 pt-8 text-center text-sm text-text-muted">
          <p>&copy; 2026 NexusBots &middot; AI-Powered Robotics Commerce &middot; IIT Hyderabad</p>
        </div>
      </div>
    </footer>
  );
}
