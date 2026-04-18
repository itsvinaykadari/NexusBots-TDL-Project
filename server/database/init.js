const db = require('../config/db');
const fs = require('fs');
const path = require('path');

// Read and execute schema
const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

// Execute schema statements
const statements = schema.split(';').filter(s => s.trim());
for (const statement of statements) {
  if (statement.trim()) {
    db.exec(statement);
  }
}

console.log('Schema created successfully!');

// Seed data aligned with client strict scope (12 robots, 4 categories)
const robots = [
  { id: 1, name: "Amazon Astro", brand: "Amazon", category: "Kitchen", price: 1599.99, image: "https://sm.pcmag.com/t/pcmag_me/review/a/amazon-ast/amazon-astro_hgfn.1920.jpg", short_desc: "Kitchen-focused smart assistant for reminders, timers, and hands-free controls.", description: "Built for smart kitchens where users need hands-free reminders, voice commands, and quick monitoring while cooking.", specs: { display: "10-inch HD", battery: "Up to 5 hours", assistant: "Alexa built-in", camera: "1080p periscope", navigation: "Visual SLAM", connectivity: "Wi-Fi 6 + Bluetooth" }, highlight: "Kitchen Voice Assistant", tags: ["kitchen", "assistant", "alexa", "smart home"], rating: 4.3, in_stock: true },
  { id: 2, name: "Samsung Ballie", brand: "Samsung", category: "Kitchen", price: 1299.99, image: "https://firexcore.com/wp-content/uploads/2025/01/Key-Features-of-Samsung-Ballie-AI-Robot.webp", short_desc: "Rolling AI kitchen companion with projector and smart appliance coordination.", description: "Designed for interactive kitchen assistance where visual prompts and automated appliance control improve meal preparation.", specs: { projector: "1080p built-in", processor: "Edge AI chip", connectivity: "Wi-Fi 6E", battery: "Up to 3 hours", sensors: "ToF + camera array", control: "SmartThings integration" }, highlight: "Kitchen Companion", tags: ["kitchen", "projector", "assistant", "smart appliances"], rating: 4.5, in_stock: true },
  { id: 3, name: "Enabot EBO X", brand: "Enabot", category: "Kitchen", price: 599.99, image: "https://m.media-amazon.com/images/I/71yDcnhGm7L._AC_UF894,1000_QL80_.jpg", short_desc: "Compact kitchen monitoring robot with 4K camera and remote communication.", description: "Ideal for monitoring kitchen safety, checking appliances remotely, and staying connected through two-way audio.", specs: { camera: "4K ultra-wide", audio: "Two-way speaker + mic", navigation: "LiDAR SLAM", nightVision: "Infrared mode", battery: "Up to 4 hours", docking: "Auto-return charging" }, highlight: "Kitchen Monitoring", tags: ["kitchen", "camera", "monitoring", "remote"], rating: 4.4, in_stock: true },
  { id: 4, name: "iRobot Roomba j9+", brand: "iRobot", category: "Home Cleaner", price: 799.99, image: "https://m.media-amazon.com/images/I/81HdMXcIYTL.jpg", short_desc: "Self-emptying robot vacuum with smart mapping.", description: "Made for daily autonomous floor cleaning in homes with minimal manual intervention.", specs: { runtime: "Up to 75 minutes", navigation: "PrecisionVision", dock: "Auto-empty Clean Base", suction: "3-stage cleaning", control: "App scheduling + zones", voice: "Alexa + Google Assistant" }, highlight: "Smart Vacuum", tags: ["vacuum", "auto-empty", "mapping"], rating: 4.5, in_stock: true },
  { id: 5, name: "Roborock S8 MaxV Ultra", brand: "Roborock", category: "Home Cleaner", price: 1799.99, image: "https://m.media-amazon.com/images/I/71aHkBTp0OL._AC_UF1000,1000_QL80_.jpg", short_desc: "High-end vacuum and mop with auto wash and auto dry dock.", description: "Best for premium whole-home cleaning with combined vacuuming, mopping, and self-maintenance dock cycles.", specs: { suction: "10,000 Pa", runtime: "Up to 180 minutes", dock: "Auto-empty + wash + dry", navigation: "LiDAR + Reactive AI", mopping: "Dual vibra-rise system", mapping: "Multi-floor smart maps" }, highlight: "Vacuum + Mop Combo", tags: ["vacuum", "mop", "auto-dock"], rating: 4.7, in_stock: true },
  { id: 6, name: "Ecovacs WINBOT W2 Omni", brand: "Ecovacs", category: "Home Cleaner", price: 499.99, image: "https://m.media-amazon.com/images/I/71fYbRYGGCL._AC_UF894,1000_QL80_.jpg", short_desc: "Window cleaning robot with edge detection and auto-spray.", description: "Purpose-built for automated glass cleaning on windows where safety and edge detection are critical.", specs: { navigation: "WIN-SLAM 4.0", suction: "2800 Pa", safety: "Anti-fall detection", cleaning: "Auto spray + microfiber wipe", compatibility: "Framed + frameless glass", noise: "Low-noise mode" }, highlight: "Window Cleaner", tags: ["window", "cleaning", "auto-spray"], rating: 4.2, in_stock: true },
  { id: 7, name: "Ring Always Home Cam", brand: "Ring (Amazon)", category: "Drone", price: 249.99, image: "https://ichef.bbci.co.uk/news/480/cpsprodpb/CBB5/production/_114594125_drone-ring.jpg.webp", short_desc: "Autonomous indoor flying drone for home patrol.", description: "Intended for indoor security patrols where homeowners need quick, automated visual checks.", specs: { camera: "1080p HD", flight: "Up to 5 minutes", charging: "Auto-dock", navigation: "Obstacle avoidance", integration: "Ring Alarm ecosystem", control: "Mobile app route presets" }, highlight: "Indoor Patrol Drone", tags: ["drone", "security", "indoor", "patrol"], rating: 4.1, in_stock: true },
  { id: 8, name: "DJI Matrice 30T", brand: "DJI", category: "Drone", price: 13600.00, image: "https://www-cdn.djiits.com/dps/d90267d0c1579a191284086d26cd8156.jpg", short_desc: "Enterprise drone with thermal and zoom cameras.", description: "Built for enterprise inspection, emergency response, and thermal surveying in challenging outdoor conditions.", specs: { camera: "48MP + thermal", flight: "Up to 41 minutes", weatherproof: "IP55", zoom: "200x hybrid", transmission: "Long-range encrypted link", safety: "Multi-sensor obstacle avoidance" }, highlight: "Thermal Drone", tags: ["drone", "thermal", "enterprise", "inspection"], rating: 4.7, in_stock: true },
  { id: 9, name: "Aiper Surfer S1", brand: "Aiper", category: "Drone", price: 1399.99, image: "https://m.media-amazon.com/images/I/611CgSUyKNL._AC_UF1000,1000_QL80_.jpg", short_desc: "Autonomous surface cleaning drone for pools.", description: "Developed for automated pool surface cleaning, debris collection, and routine maintenance patrols.", specs: { navigation: "Sonar guidance", runtime: "Up to 90 minutes", coverage: "Up to 2,150 sq ft", filtration: "Fine debris mesh", charging: "Dock-ready charging", control: "Mobile app scheduling" }, highlight: "Pool Surface Drone", tags: ["drone", "pool", "autonomous", "cleaning"], rating: 4.4, in_stock: true },
  { id: 10, name: "Miko 3", brand: "Miko", category: "Humanoid", price: 249.99, image: "https://in.miko.ai/cdn/shop/files/Copy_of_Miko_3-product-1_5589cd4a-f1bd-4411-8dca-0a73c54650ad.webp?v=1759848842", short_desc: "Interactive humanoid-style companion for kids.", description: "Created as a child-friendly humanoid companion for learning support, engagement, and interactive play.", specs: { ageRange: "5-12 years", activities: "1000+ sessions", battery: "Up to 7 hours", ai: "Conversational + adaptive", connectivity: "Wi-Fi", parentalControls: "Companion app" }, highlight: "Kids Companion", tags: ["humanoid", "kids", "learning", "AI"], rating: 4.6, in_stock: true },
  { id: 11, name: "Wonder Workshop Dash", brand: "Wonder Workshop", category: "Humanoid", price: 149.99, image: "https://makerbazar.in/cdn/shop/products/Wonder_Dash_Robot_Video_1_1_1024x.jpg?v=1576147104", short_desc: "Programmable educational robot with expressive interaction.", description: "Focused on introducing coding logic and computational thinking through a humanoid-style interactive robot.", specs: { programming: "Blockly", connectivity: "Bluetooth", battery: "Up to 5 hours", sensors: "Proximity + microphone", ageRange: "6-11 years", classroomUse: "STEM curriculum ready" }, highlight: "Coding Robot", tags: ["humanoid", "coding", "education", "STEM"], rating: 4.7, in_stock: true },
  { id: 12, name: "LEGO Education Spike Prime", brand: "LEGO", category: "Humanoid", price: 395.95, image: "https://knowledge-hub.com/wp-content/uploads/2019/12/aa.jpg", short_desc: "Build-and-program humanoid robotics kit for classroom projects.", description: "Intended for structured classroom robotics projects where students build humanoid concepts and program behaviors.", specs: { pieces: "523", programming: "Scratch + Python", hub: "6-port programmable hub", sensors: "Color + distance + force", motors: "3 included motors", curriculum: "40+ guided lessons" }, highlight: "Classroom Robotics Kit", tags: ["humanoid", "LEGO", "python", "classroom"], rating: 4.8, in_stock: true },
];

// Insert products
const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO products (id, name, brand, category, price, image, short_desc, description, specs, highlight, tags, rating, in_stock)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertMany = db.transaction((products) => {
  for (const p of products) {
    insertStmt.run(
      p.id,
      p.name,
      p.brand,
      p.category,
      p.price,
      p.image,
      p.short_desc,
      p.description,
      JSON.stringify(p.specs),
      p.highlight,
      JSON.stringify(p.tags),
      p.rating,
      p.in_stock ? 1 : 0
    );
  }
});

// Enforce strict dataset size by clearing existing product rows before reseeding.
db.exec('DELETE FROM products');
insertMany(robots);

console.log(`Seeded ${robots.length} products successfully!`);
