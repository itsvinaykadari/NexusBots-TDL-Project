import { Star } from "lucide-react";
import { Link } from "react-router-dom";

export default function RobotCard({ robot }) {
  return (
    <Link
      to={`/robot/${robot.id}`}
      className="group bg-surface rounded-2xl overflow-hidden border border-white/5 hover:border-neon/30 transition-all duration-300 hover:glow-neon flex flex-col"
    >
      <div className="relative overflow-hidden">
        <img
          src={robot.image}
          alt={robot.name}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3">
          <span className="px-2.5 py-1 bg-primary/80 backdrop-blur-sm text-neon text-xs font-semibold rounded-full border border-neon/30">
            {robot.category}
          </span>
        </div>
        {robot.highlight ? (
          <div className="absolute top-3 right-3">
            <span className="px-2.5 py-1 bg-accent/80 backdrop-blur-sm text-white text-xs font-semibold rounded-full">
              {robot.highlight}
            </span>
          </div>
        ) : null}
      </div>

      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-white font-semibold text-lg mb-1 group-hover:text-neon transition-colors">
          {robot.name}
        </h3>
        <p className="text-text-muted text-sm mb-3 flex-1">{robot.shortDesc}</p>

        <div className="flex items-center justify-between mt-auto">
          <div>
            <span className="text-2xl font-bold text-white">${robot.price.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1 text-amber-400">
            <Star size={14} fill="currentColor" />
            <span className="text-sm font-medium">{robot.rating}</span>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          {robot.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-white/5 text-text-muted text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
