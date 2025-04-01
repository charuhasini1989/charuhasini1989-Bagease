import React from 'react';
import { Truck, Package, Clock, MapPin } from 'lucide-react';

const Delivery = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-center mb-12">Luggage Delivery Service</h1>

      <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center">
            <Truck className="w-12 h-12 text-black mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Express Delivery</h3>
            <p className="text-gray-600">Same-day delivery within city limits</p>
          </div>
          
          <div className="text-center">
            <Package className="w-12 h-12 text-black mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">All Sizes</h3>
            <p className="text-gray-600">Handle all types of luggage</p>
          </div>
          
          <div className="text-center">
            <Clock className="w-12 h-12 text-black mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Flexible Timing</h3>
            <p className="text-gray-600">Choose your delivery slot</p>
          </div>
          
          <div className="text-center">
            <MapPin className="w-12 h-12 text-black mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Wide Coverage</h3>
            <p className="text-gray-600">Available in major cities</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-semibold mb-6">Delivery Options</h2>
          <div className="space-y-6">
            <div className="border-b pb-4">
              <h3 className="text-xl font-semibold mb-2">Express Delivery</h3>
              <p className="text-gray-600 mb-2">Same-day delivery within city limits</p>
              <p className="text-[#ff8c00] font-semibold">Starting from ₹299</p>
            </div>
            
            <div className="border-b pb-4">
              <h3 className="text-xl font-semibold mb-2">Standard Delivery</h3>
              <p className="text-gray-600 mb-2">Next-day delivery within city limits</p>
              <p className="text-[#ff8c00] font-semibold">Starting from ₹199</p>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-2">Scheduled Delivery</h3>
              <p className="text-gray-600 mb-2">Choose your preferred delivery time</p>
              <p className="text-[#ff8c00] font-semibold">Starting from ₹249</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-semibold mb-6">Service Features</h2>
          <ul className="space-y-4">
            <li className="flex items-center text-gray-600">
              <span className="w-2 h-2 bg-[#ff8c00] rounded-full mr-3"></span>
              Real-time tracking of your delivery
            </li>
            <li className="flex items-center text-gray-600">
              <span className="w-2 h-2 bg-[#ff8c00] rounded-full mr-3"></span>
              Professional handling of your luggage
            </li>
            <li className="flex items-center text-gray-600">
              <span className="w-2 h-2 bg-[#ff8c00] rounded-full mr-3"></span>
              Insurance coverage during transit
            </li>
            <li className="flex items-center text-gray-600">
              <span className="w-2 h-2 bg-[#ff8c00] rounded-full mr-3"></span>
              Doorstep delivery service
            </li>
            <li className="flex items-center text-gray-600">
              <span className="w-2 h-2 bg-[#ff8c00] rounded-full mr-3"></span>
              SMS updates on delivery status
            </li>
            <li className="flex items-center text-gray-600">
              <span className="w-2 h-2 bg-[#ff8c00] rounded-full mr-3"></span>
              Dedicated customer support
            </li>
          </ul>
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-8">
        <h2 className="text-2xl font-semibold text-center mb-8">Service Coverage</h2>
        <div className="grid md:grid-cols-3 gap-6 text-center">
          <div>
            <h3 className="font-semibold mb-4">Major Cities</h3>
            <ul className="space-y-2 text-gray-600">
              <li>Delhi NCR</li>
              <li>Mumbai</li>
              <li>Bangalore</li>
              <li>Chennai</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Popular Routes</h3>
            <ul className="space-y-2 text-gray-600">
              <li>Delhi - Mumbai</li>
              <li>Bangalore - Chennai</li>
              <li>Mumbai - Pune</li>
              <li>Delhi - Jaipur</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Coming Soon</h3>
            <ul className="space-y-2 text-gray-600">
              <li>Kolkata</li>
              <li>Hyderabad</li>
              <li>Ahmedabad</li>
              <li>Chandigarh</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Delivery;