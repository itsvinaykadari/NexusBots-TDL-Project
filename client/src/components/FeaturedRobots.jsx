import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import RobotCard from "./RobotCard";
import robots from "../data/robots";

export default function FeaturedRobots() {
  const featuredCategories = ["Kitchen", "Home Cleaner", "Drone"];
  const featured = featuredCategories
    .map((category) =>
      [...robots]
        .filter((r) => r.category === category)
        .sort((a, b) => b.rating - a.rating)[0]
    )
    .filter(Boolean);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white">Most Rated Products</h2>
          <p className="text-slate-400 mt-1">Top pick from kitchen, home cleaner, and drone categories</p>
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
