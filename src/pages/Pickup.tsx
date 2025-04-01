import React from 'react';
import { Truck, Clock, MapPin, CheckCircle } from 'lucide-react';

const Pickup = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-center mb-12">Luggage Pickup Service</h1>

      <div className="grid md:grid-cols-2 gap-12 mb-16">
        <div>
          <h2 className="text-2xl font-semibold mb-6">How It Works</h2>
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <CheckCircle className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Book Your Pickup</h3>
                <p className="text-gray-600">Schedule a pickup time and location through our easy booking system</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <Truck className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Professional Pickup</h3>
                <p className="text-gray-600">Our trained staff will collect your luggage from your doorstep</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <MapPin className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Station Delivery</h3>
                <p className="text-gray-600">We'll safely transport your luggage to your designated train station</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-semibold mb-6">Service Features</h2>
          <ul className="space-y-4">
            <li className="flex items-center">
              <Clock className="w-5 h-5 text-black mr-3" />
              <span>Flexible pickup timing</span>
            </li>
            <li className="flex items-center">
              <MapPin className="w-5 h-5 text-black mr-3" />
              <span>Coverage across major cities</span>
            </li>
            <li className="flex items-center">
              <Truck className="w-5 h-5 text-black mr-3" />
              <span>Professional handling</span>
            </li>
            <li className="flex items-center">
              <CheckCircle className="w-5 h-5 text-black mr-3" />
              <span>Real-time tracking</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-8">
        <h2 className="text-2xl font-semibold mb-6 text-center">Service Areas</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <h3 className="font-semibold mb-3">North India</h3>
            <ul className="text-gray-600 space-y-2">
              <li>Delhi</li>
              <li>Jaipur</li>
              <li>Lucknow</li>
              <li>Chandigarh</li>
            </ul>
          </div>
          
          <div className="text-center">
            <h3 className="font-semibold mb-3">South India</h3>
            <ul className="text-gray-600 space-y-2">
              <li>Bangalore</li>
              <li>Chennai</li>
              <li>Hyderabad</li>
              <li>Kochi</li>
            </ul>
          </div>
          
          <div className="text-center">
            <h3 className="font-semibold mb-3">West India</h3>
            <ul className="text-gray-600 space-y-2">
              <li>Mumbai</li>
              <li>Pune</li>
              <li>Ahmedabad</li>
              <li>Surat</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pickup;