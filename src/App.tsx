import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'; // Import Link
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Services from './pages/Services';
import Storage from './pages/Storage';
import Pickup from './pages/Pickup';
import Delivery from './pages/Delivery';
import About from './pages/About';
import Contact from './pages/Contact';
import Book from './pages/Book';
// Assuming you might want social icons later, you'd import them:
// import { FaFacebook, FaTwitter, FaInstagram } from 'react-icons/fa';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const handleOpenLoginSidebar = () => {
      setIsSidebarOpen(true);
    };

    window.addEventListener('openLoginSidebar', handleOpenLoginSidebar);

    return () => {
      window.removeEventListener('openLoginSidebar', handleOpenLoginSidebar);
    };
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-white flex flex-col">
        <Navbar onSignInClick={() => setIsSidebarOpen(true)} />
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <main className="container mx-auto px-4 py-8 flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/services" element={<Services />} />
            <Route path="/storage" element={<Storage />} />
            <Route path="/pickup" element={<Pickup />} />
            <Route path="/delivery" element={<Delivery />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/book" element={<Book />} />
          </Routes>
        </main>

        {/* --- Improved Footer --- */}
        <footer className="bg-gray-900 text-gray-400 py-6"> {/* Slightly darker bg, lighter gray text, less padding */}
          <div className="container mx-auto px-4">
            {/* Social Links - Centered */}
            <div className="flex justify-center space-x-6 mb-4">
              {/* Replace text with icons for a sleeker look if desired */}
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer"
                 className="hover:text-white transition-colors duration-300 ease-in-out"
                 aria-label="BagEase Facebook page">
                {/* <FaFacebook size={24} /> */} {/* Example using react-icons */}
                 Facebook {/* Keep text for now, or replace with icon */}
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"
                 className="hover:text-white transition-colors duration-300 ease-in-out"
                 aria-label="BagEase Twitter profile">
                {/* <FaTwitter size={24} /> */}
                 Twitter
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"
                 className="hover:text-white transition-colors duration-300 ease-in-out"
                 aria-label="BagEase Instagram profile">
                 {/* <FaInstagram size={24} /> */}
                 Instagram
              </a>
            </div>

            {/* Copyright - Centered */}
            <div className="text-center text-sm mt-4 text-white">
              <p>© {new Date().getFullYear()} BagEase. All rights reserved.</p>
              {/* Optional: Add a link to Privacy Policy or Terms if needed */}
              {/* <p className="mt-1">
                <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link> |
                <Link to="/terms" className="hover:text-white transition-colors ml-1">Terms of Service</Link>
              </p> */}
            </div>
          </div>
        </footer>
        {/* --- End of Improved Footer --- */}

      </div>
    </Router>
  );
}

export default App;