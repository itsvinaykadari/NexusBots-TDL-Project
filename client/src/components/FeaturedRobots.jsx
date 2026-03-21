import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import RobotCard from "./RobotCard";
import robots from "../data/robots";

export default function FeaturedRobots() {
  const featured = robots.filter((r) => r.rating >= 4.7).slice(0, 6);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white">Top Rated Robots</h2>
          <p className="text-slate-400 mt-1">Our highest-rated picks across all categories</p>
        </div>
        <Link
          to="/catalog"
          className="hidden sm:flex items-center gap-1.5 text-accent hover:text-neon transition-colors font-medium"
        >
          View all
          <ArrowRight size={16} />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {featured.map((robot) => (
          <RobotCard key={robot.id} robot={robot} />
        ))}
      </div>

      <div className="sm:hidden mt-6 text-center">
        <Link
          to="/catalog"
          className="inline-flex items-center gap-1.5 text-accent hover:text-neon transition-colors font-medium"
        >
          View all robots
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
