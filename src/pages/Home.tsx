// src/pages/Home.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, Shield } from 'lucide-react';

// --- Import Carousel ---
import { Carousel } from 'react-responsive-carousel';
import "react-responsive-carousel/lib/styles/carousel.min.css"; // Import carousel styles

// --- Define Carousel Images ---
const carouselImages = [
  // Original Image
  'https://images.unsplash.com/photo-1442570468985-f63ed5de9086?q=80&w=2120&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  // Image 2 (e.g., train station focus)
  'https://images.unsplash.com/photo-1484271201072-03bfd82a56f6?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  // Image 3 (e.g., luggage focus)
  'https://images.unsplash.com/photo-1571893652827-a3e071ab463b?q=80&w=2072&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
];

const Home: React.FC = () => {
  const handleOpenSidebar = () => {
    const event = new CustomEvent('openLoginSidebar');
    window.dispatchEvent(event);
  };

  return (
    <div className="space-y-16 mb-0">
      {/* Hero Section */}
      <section className="relative min-h-[60vh] md:min-h-[80vh] lg:min-h-[100vh] flex items-center overflow-hidden">
        {/* Background Carousel Container */}
        <div className="absolute inset-0 z-0 w-full h-full">
          <Carousel
            autoPlay={true}
            infiniteLoop={true}
            showThumbs={false}
            showStatus={false}
            showArrows={false}
            showIndicators={false}
            interval={9000}
            transitionTime={1500}
            stopOnHover={false}
            className="h-full"
          >
            {carouselImages.map((imageUrl, index) => (
              <div key={index} className="h-full">
                <div
                  className="h-full w-full bg-cover bg-center transition-transform duration-1500 filter blur-[1px]"
                  style={{
                    minHeight: '100vh',
                    backgroundImage: `url(${imageUrl})`,
                  }}
                />
              </div>
            ))}
          </Carousel>
        </div>

        {/* Dark overlay with increased opacity */}
        <div className="absolute inset-0 z-10 bg-black opacity-30"></div>

        {/* Content with enhanced text visibility */}
        <div className="relative z-20 container mx-auto px-4">
          <div className="max-w-2xl bg-black bg-opacity-30 p-8 rounded-lg backdrop-blur-sm">
            <h1 className="text-5xl font-bold text-white mb-6 text-shadow-lg">
              Travel Hassle-Free Across India
            </h1>
            <p className="text-xl text-white mb-8 text-shadow-md">
              Let us handle your luggage while you enjoy your journey.
              Professional luggage handling services at train stations across India.
            </p>
            <button
              onClick={handleOpenSidebar}
              className="bg-orange-600 text-white px-8 py-3 rounded-full text-lg font-semibold
                       hover:bg-orange-700
                       active:bg-orange-800 active:scale-95
                       transition-all duration-150 inline-block
                       shadow-lg hover:shadow-xl"
            >
              Get Started
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-orange-600">
            Why Choose BagEase?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow">
              <MapPin className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-gray-800">Pan India Coverage</h3>
              <p className="text-gray-600">Available at major train stations across India</p>
            </div>
            <div className="text-center p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow">
              <Clock className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-gray-800">24/7 Service</h3>
              <p className="text-gray-600">Round-the-clock luggage handling support</p>
            </div>
            <div className="text-center p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow">
              <Shield className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-gray-800">Secure Handling</h3>
              <p className="text-gray-600">Your luggage is insured and handled with care</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section with enhanced contrast */}
      <section className="bg-orange-600 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to Travel Stress-Free?
          </h2>
          <p className="text-xl text-white mb-8">
            Book our services now and experience hassle-free travel
          </p>
          <button
            onClick={handleOpenSidebar}
            className="bg-white text-orange-600 px-8 py-3 rounded-full text-lg font-semibold
                     hover:bg-orange-50
                     active:bg-orange-100 active:scale-95
                     transition-all duration-150 inline-block
                     shadow-lg hover:shadow-xl"
          >
            Get Started
          </button>
        </div>
      </section>

      {/* Services Preview */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-orange-600">
            Our Services
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
              <h3 className="text-xl font-semibold mb-4 text-orange-600">Luggage Storage</h3>
              <p className="text-gray-600 mb-4">
                Secure storage facilities at major train stations.
                Store your luggage for hours or days.
              </p>
              <Link to="/storage" className="text-orange-600 font-semibold hover:text-orange-700 transition-colors">
                Learn More →
              </Link>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
              <h3 className="text-xl font-semibold mb-4 text-orange-600">Pickup Service</h3>
              <p className="text-gray-600 mb-4">
                Door-to-door luggage collection and delivery to your desired train station.
              </p>
              <Link to="/pickup" className="text-orange-600 font-semibold hover:text-orange-700 transition-colors">
                Learn More →
              </Link>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
              <h3 className="text-xl font-semibold mb-4 text-orange-600">Express Delivery</h3>
              <p className="text-gray-600 mb-4">
                Fast and reliable delivery service from train stations to your destination.
              </p>
              <Link to="/delivery" className="text-orange-600 font-semibold hover:text-orange-700 transition-colors">
                Learn More →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;