import { Link } from "react-router-dom";
import { ArrowRight, Star } from "lucide-react";

export default function RobotShowcard({ robot, featured = false }) {
  return (
    <Link
      to={`/robot/${robot.id}`}
      data-guide-id={`catalog-card-${robot.id}`}
      className={`group relative flex ${featured ? "flex-col md:flex-row" : "flex-col"} overflow-hidden rounded-2xl border border-white/6`}
      style={{
        background: "oklch(18% 0.030 255 / 0.6)",
        transition: "transform 0.4s var(--ease-out-expo), box-shadow 0.4s var(--ease-out-expo), border-color 0.3s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 20px 60px oklch(0% 0 0 / 0.4), 0 0 0 1px oklch(65% 0.28 290 / 0.15)";
        e.currentTarget.style.borderColor = "oklch(65% 0.28 290 / 0.2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "oklch(80% 0 0 / 0.06)";
      }}
    >
      {/* Image */}
      <div
        className={`relative overflow-hidden flex-shrink-0 ${featured ? "md:w-1/2" : ""}`}
        style={{ height: featured ? "280px" : "200px" }}
      >
        <img
          src={robot.image}
          alt={robot.name}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105"
          style={{ transition: "transform 0.6s var(--ease-out-expo)" }}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        {robot.highlight && (
          <span
            className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-sm"
            style={{
              background: "oklch(65% 0.28 290 / 0.2)",
              color: "var(--color-accent)",
              border: "1px solid oklch(65% 0.28 290 / 0.25)",
            }}
          >
            {robot.highlight}
          </span>
        )}
        <div
          className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full backdrop-blur-sm"
          style={{ background: "oklch(0% 0 0 / 0.4)", border: "1px solid oklch(80% 0 0 / 0.1)" }}
        >
          <Star size={10} className="text-amber-400" fill="currentColor" />
          <span className="text-[11px] text-white font-semibold">{robot.rating}</span>
        </div>
      </div>

      {/* Body */}
      <div className={`flex flex-col flex-1 ${featured ? "p-6 md:p-8 justify-center" : "p-5"}`}>
        <p className="text-[11px] font-semibold tracking-widest uppercase text-text-muted mb-2">
          {robot.brand}
        </p>
        <h3
          className="font-bold text-white leading-snug mb-2 group-hover:text-accent"
          style={{
            fontSize: featured ? "clamp(1.25rem, 2vw, 1.75rem)" : "1.05rem",
            transition: "color 0.25s var(--ease-out-expo)",
          }}
        >
          {robot.name}
        </h3>
        <p className="text-text-muted text-sm leading-relaxed mb-4 line-clamp-2 flex-1">
          {featured ? robot.description : robot.shortDesc}
        </p>

        {featured && (
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(robot.specs).slice(0, 3).map(([k, v]) => (
              <span
                key={k}
                className="px-2.5 py-1 rounded-full text-[11px] bg-white/5 border border-white/8 text-text-muted"
              >
                <span className="text-white font-medium capitalize">{k}:</span> {v}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-auto">
          <span className="font-bold text-white" style={{ fontSize: featured ? "1.4rem" : "1.1rem" }}>
            ${robot.price.toLocaleString()}
          </span>
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold text-accent group-hover:gap-2"
            style={{ transition: "gap 0.3s var(--ease-out-expo)" }}
          >
            Explore <ArrowRight size={12} />
          </span>
        </div>
      </div>
    </Link>
  );
}
