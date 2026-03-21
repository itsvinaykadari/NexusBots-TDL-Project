import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Star, ShoppingCart, MessageCircle, Tag } from "lucide-react";
import robots from "../data/robots";

export default function RobotDetail() {
  const { id } = useParams();
  const robot = robots.find((r) => r.id === parseInt(id));

  if (!robot) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Robot not found</h2>
        <Link to="/catalog" className="text-accent hover:text-neon">
          Back to catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        to="/catalog"
        className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors mb-8"
      >
        <ArrowLeft size={16} />
        Back to Catalog
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Image */}
        <div className="relative rounded-2xl overflow-hidden border border-white/10">
          <img
            src={robot.image}
            alt={robot.name}
            className="w-full h-[400px] object-cover"
          />
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1.5 bg-primary/80 backdrop-blur-sm text-neon text-sm font-semibold rounded-full border border-neon/30">
              {robot.category}
            </span>
          </div>
        </div>

        {/* Details */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{robot.name}</h1>

          <div className="flex items-center gap-4 mb-6 flex-wrap">
            <div className="flex items-center gap-1 text-amber-400">
              <Star size={18} fill="currentColor" />
              <span className="font-semibold">{robot.rating}</span>
            </div>
            {robot.highlight && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-accent/10 text-accent border border-accent/20">
                {robot.highlight}
              </span>
            )}
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                robot.inStock
                  ? "bg-neon-green/10 text-neon-green border border-neon-green/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}
            >
              {robot.inStock ? "In Stock" : "Out of Stock"}
            </span>
          </div>

          <p className="text-slate-300 text-lg mb-6 leading-relaxed">{robot.description}</p>

          <div className="text-4xl font-bold text-white mb-8">
            ${robot.price.toLocaleString()}
          </div>

          {/* Specs */}
          <div className="bg-surface rounded-xl p-6 border border-white/5 mb-6">
            <h3 className="text-white font-semibold mb-4">Specifications</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(robot.specs).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-slate-400 capitalize">{key}</span>
                  <span className="text-white font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="flex items-center gap-2 mb-8">
            <Tag size={14} className="text-slate-500" />
            {robot.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-white/5 text-slate-400 text-sm rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              disabled={!robot.inStock}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-accent hover:bg-accent-dark text-white font-semibold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]"
            >
              <ShoppingCart size={18} />
              {robot.inStock ? "Add to Cart" : "Unavailable"}
            </button>
            <Link
              to="/chat"
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10 hover:border-white/20 transition-all"
            >
              <MessageCircle size={18} />
              Ask AI
            </Link>
          </div>
        </div>
      </div>

      {/* Related Robots */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-white mb-6">Related Robots</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {robots
            .filter((r) => r.category === robot.category && r.id !== robot.id)
            .slice(0, 4)
            .map((r) => (
              <Link
                key={r.id}
                to={`/robot/${r.id}`}
                className="bg-surface rounded-xl overflow-hidden border border-white/5 hover:border-neon/20 transition-all group"
              >
                <img src={r.image} alt={r.name} className="w-full h-32 object-cover group-hover:scale-105 transition-transform" />
                <div className="p-4">
                  <h4 className="text-white font-medium group-hover:text-neon transition-colors">{r.name}</h4>
                  <p className="text-accent font-semibold mt-1">${r.price.toLocaleString()}</p>
                </div>
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
