import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { UserActivityProvider } from "./context/UserActivityContext";
import { UIGuideProvider } from "./ui-guide/UIGuideProvider";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AISidePanel from "./components/AISidePanel";
import CartDrawer from "./components/CartDrawer";
import Home from "./pages/Home";
import Catalog from "./pages/Catalog";
import RobotDetail from "./pages/RobotDetail";
import OrderHistory from "./pages/OrderHistory";

function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);

  const openAI = useCallback(() => setIsAIOpen(true), []);
  const closeAI = useCallback(() => setIsAIOpen(false), []);

  // Listen for open-chat custom events to open the side panel
  useEffect(() => {
    function handleOpenChat() {
      setIsAIOpen(true);
    }
    window.addEventListener("open-chat", handleOpenChat);
    return () => window.removeEventListener("open-chat", handleOpenChat);
  }, []);

  return (
    <Router>
      <UserActivityProvider>
        <UIGuideProvider>
          <div className="min-h-screen flex flex-col bg-primary">
            <Navbar onCartClick={() => setIsCartOpen(true)} onAIClick={openAI} isAIOpen={isAIOpen} />
            <div className="flex flex-1">
              <main
                className="flex-1 min-w-0"
                style={{
                  transition: "margin 0.35s var(--ease-out-expo)",
                }}
              >
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/catalog" element={<Catalog />} />
                  <Route path="/robot/:id" element={<RobotDetail />} />
                  <Route path="/orders" element={<OrderHistory />} />
                </Routes>
                <Footer />
              </main>
              <AISidePanel isOpen={isAIOpen} onClose={closeAI} />
            </div>
            <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
          </div>
        </UIGuideProvider>
      </UserActivityProvider>
    </Router>
  );
}

export default App;
