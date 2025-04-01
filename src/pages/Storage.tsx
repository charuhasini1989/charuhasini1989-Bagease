import React from 'react';
import { Package, Clock, Shield, MapPin } from 'lucide-react';

const Storage = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-center mb-12">Luggage Storage</h1>

      <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
        <h2 className="text-2xl font-semibold mb-4">Secure Storage Solutions</h2>
        <p className="text-gray-600 mb-6">
          Store your luggage safely at our secure facilities located at major train stations across India.
          Whether you need storage for a few hours or several days, we've got you covered.
        </p>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <Package className="w-12 h-12 text-black mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Multiple Sizes</h3>
            <p className="text-gray-600">Storage options for all luggage sizes</p>
          </div>
          
          <div className="text-center">
            <Clock className="w-12 h-12 text-black mx-auto mb-4" />
            <h3 className="font-semibold mb-2">24/7 Access</h3>
            <p className="text-gray-600">Available round the clock</p>
          </div>
          
          <div className="text-center">
            <Shield className="w-12 h-12 text-black mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Secure Facilities</h3>
            <p className="text-gray-600">CCTV monitoring & security staff</p>
          </div>
          
          <div className="text-center">
            <MapPin className="w-12 h-12 text-black mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Convenient Locations</h3>
            <p className="text-gray-600">Located at major stations</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-semibold mb-6">Storage Rates</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="border rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">Small Bags</h3>
            <p className="text-3xl font-bold text-[#ff8c00] mb-4">₹50<span className="text-sm text-gray-600">/hour</span></p>
            <ul className="text-gray-600 space-y-2">
              <li>Backpacks</li>
              <li>Small suitcases</li>
              <li>Personal items</li>
            </ul>
          </div>
          
          <div className="border rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">Medium Bags</h3>
            <p className="text-3xl font-bold text-[#ff8c00] mb-4">₹80<span className="text-sm text-gray-600">/hour</span></p>
            <ul className="text-gray-600 space-y-2">
              <li>Standard suitcases</li>
              <li>Travel bags</li>
              <li>Medium boxes</li>
            </ul>
          </div>
          
          <div className="border rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">Large Bags</h3>
            <p className="text-3xl font-bold text-[#ff8c00] mb-4">₹100<span className="text-sm text-gray-600">/hour</span></p>
            <ul className="text-gray-600 space-y-2">
              <li>Large suitcases</li>
              <li>Multiple bags</li>
              <li>Oversized items</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Storage;