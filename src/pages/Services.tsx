import React from 'react';
import { Truck, Package, Clock, Shield } from 'lucide-react';

const Services = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-center mb-12">Our Services</h1>
      
      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <div className="flex items-center mb-4">
            <Truck className="w-8 h-8 text-black mr-3" />
            <h2 className="text-2xl font-semibold">Pickup Service</h2>
          </div>
          <p className="text-gray-600 mb-4">
            We collect your luggage from your doorstep and safely transport it to your desired train station.
            Available across all major cities in India.
          </p>
          <ul className="list-disc list-inside text-gray-600">
            <li>Door-to-door service</li>
            <li>Professional handling</li>
            <li>Real-time tracking</li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg">
          <div className="flex items-center mb-4">
            <Package className="w-8 h-8 text-black mr-3" />
            <h2 className="text-2xl font-semibold">Storage Service</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Secure storage facilities at train stations for your convenience.
            Store your luggage for hours or days.
          </p>
          <ul className="list-disc list-inside text-gray-600">
            <li>24/7 surveillance</li>
            <li>Climate-controlled facilities</li>
            <li>Insurance coverage</li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg">
          <div className="flex items-center mb-4">
            <Clock className="w-8 h-8 text-black mr-3" />
            <h2 className="text-2xl font-semibold">Express Delivery</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Quick and reliable delivery service from train stations to your destination.
            Available at all major stations.
          </p>
          <ul className="list-disc list-inside text-gray-600">
            <li>Same-day delivery</li>
            <li>Live tracking</li>
            <li>Flexible scheduling</li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg">
          <div className="flex items-center mb-4">
            <Shield className="w-8 h-8 text-black mr-3" />
            <h2 className="text-2xl font-semibold">Promised Insurance</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Complete protection for your belongings with our comprehensive insurance coverage.
          </p>
          <ul className="list-disc list-inside text-gray-600">
            <li>Full insurance coverage</li>
            <li>Damage protection</li>
            <li>Loss protection</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Services;