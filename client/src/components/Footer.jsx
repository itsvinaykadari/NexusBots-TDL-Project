import { Bot } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-surface border-t border-white/10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <Bot size={18} className="text-white" />
              </div>
              <span className="text-lg font-bold text-white">
                Nexus<span className="text-neon">Bots</span>
              </span>
            </div>
            <p className="text-slate-400 text-sm">
              AI-powered robotics commerce platform. Browse, discover, and get intelligent assistance for your robotics needs.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Products</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="hover:text-neon cursor-pointer transition-colors">Household Robots</li>
              <li className="hover:text-neon cursor-pointer transition-colors">Home Cleaners</li>
              <li className="hover:text-neon cursor-pointer transition-colors">Child & Educational</li>
              <li className="hover:text-neon cursor-pointer transition-colors">Security & Industrial</li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">AI Services</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="hover:text-neon cursor-pointer transition-colors">Chat Assistant</li>
              <li className="hover:text-neon cursor-pointer transition-colors">Voice Support</li>
              <li className="hover:text-neon cursor-pointer transition-colors">Email Support</li>
              <li className="hover:text-neon cursor-pointer transition-colors">Sales Guidance</li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Company</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="hover:text-neon cursor-pointer transition-colors">About Us</li>
              <li className="hover:text-neon cursor-pointer transition-colors">Contact</li>
              <li className="hover:text-neon cursor-pointer transition-colors">Careers</li>
              <li className="hover:text-neon cursor-pointer transition-colors">Privacy Policy</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-8 text-center text-sm text-slate-500">
          <p>&copy; 2026 NexusBots. AI-Powered Robotics Commerce. College Project Demo.</p>
        </div>
      </div>
    </footer>
  );
}
