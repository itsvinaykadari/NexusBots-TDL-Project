import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react";
import { UserActivityProvider } from "./context/UserActivityContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ChatWidget from "./components/ChatWidget";
import CartDrawer from "./components/CartDrawer";
import Home from "./pages/Home";
import Catalog from "./pages/Catalog";
import RobotDetail from "./pages/RobotDetail";
import AIAssistant from "./pages/AIAssistant";
import Support from "./pages/Support";
import OrderHistory from "./pages/OrderHistory";

function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <Router>
      <UserActivityProvider>
        <div className="min-h-screen flex flex-col bg-primary">
          <Navbar onCartClick={() => setIsCartOpen(true)} />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/robot/:id" element={<RobotDetail />} />
              <Route path="/assistant" element={<AIAssistant />} />
              <Route path="/support" element={<Support />} />
              <Route path="/orders" element={<OrderHistory />} />
            </Routes>
          </main>
          <Footer />
          <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
          <ChatWidget />
        </div>
      </UserActivityProvider>
    </Router>
  );
}

export default App;
