import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { UserActivityProvider } from "./context/UserActivityContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ChatWidget from "./components/ChatWidget";
import Home from "./pages/Home";
import Catalog from "./pages/Catalog";
import RobotDetail from "./pages/RobotDetail";
import AIAssistant from "./pages/AIAssistant";
import Support from "./pages/Support";

function App() {
  return (
    <Router>
      <UserActivityProvider>
        <div className="min-h-screen flex flex-col bg-primary">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/robot/:id" element={<RobotDetail />} />
              <Route path="/assistant" element={<AIAssistant />} />
              <Route path="/support" element={<Support />} />
            </Routes>
          </main>
          <Footer />
          <ChatWidget />
        </div>
      </UserActivityProvider>
    </Router>
  );
}

export default App;
