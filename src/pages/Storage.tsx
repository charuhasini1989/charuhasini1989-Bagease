import React from 'react';
// Added Info icon
import { Package, Clock, Shield, MapPin, Info } from 'lucide-react';

const Storage = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-center mb-12">Luggage Storage Services</h1> {/* Added Services */}

      {/* --- Existing Secure Storage Solutions Section --- */}
      <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
        <h2 className="text-2xl font-semibold mb-4">Secure Public Storage</h2> {/* Clarified title */}
        <p className="text-gray-600 mb-6">
          Need a place for your bags? Store your luggage safely at our convenient facilities located at major train stations across India.
          Whether you need storage for a few hours or several days while exploring the city, we've got you covered.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <Package className="w-12 h-12 text-black mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Multiple Sizes</h3>
            <p className="text-gray-600 text-sm">Options for backpacks to large suitcases</p> {/* Slightly detailed */}
          </div>

          <div className="text-center">
            <Clock className="w-12 h-12 text-black mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Flexible Hours</h3> {/* Changed from 24/7 Access if not always true */}
            <p className="text-gray-600 text-sm">Available during station operating hours</p> {/* Adjusted text */}
          </div>

          <div className="text-center">
            <Shield className="w-12 h-12 text-black mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Secure Facilities</h3>
            <p className="text-gray-600 text-sm">CCTV monitoring & secure access control</p> {/* Slightly detailed */}
          </div>

          <div className="text-center">
            <MapPin className="w-12 h-12 text-black mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Convenient Locations</h3>
            <p className="text-gray-600 text-sm">Located within major train stations</p> {/* Slightly detailed */}
          </div>
        </div>
      </div>
      {/* --- End Existing Section --- */}


      {/* --- NEW SECTION: Transit Storage Godown (TSG) Information --- */}
      <div className="bg-blue-50 rounded-lg p-8 mb-12"> {/* Using a distinct background */}
        <div className="flex flex-col md:flex-row items-center justify-center md:justify-start mb-4">
          <Info className="w-8 h-8 text-blue-600 mb-3 md:mb-0 md:mr-4 flex-shrink-0" />
          <h2 className="text-2xl font-semibold text-center md:text-left">Transit Storage Godown (TSG) - Operational Use</h2>
        </div>
        <p className="text-gray-700 mb-4 leading-relaxed">
          Separate from our public hourly storage, the TSG is a secure, internal facility used exclusively for specific operational scenarios managed by BagEase, such as when a passenger misses their scheduled train after using our pickup service.
        </p>
        <ul className="list-disc list-inside text-gray-700 space-y-2 text-sm">
          <li><strong className="font-medium">Purpose:</strong> To safely hold luggage that wasn't handed over due to unforeseen circumstances (e.g., missed train), preventing it from traveling unattended.</li>
          <li><strong className="font-medium">Security:</strong> Monitored, access-controlled, and uses RFID tracking just like our main service.</li>
          <li><strong className="font-medium">Notifications:</strong> If your luggage is moved to a TSG, you will receive an immediate notification via the app and SMS.</li>
          <li><strong className="font-medium">Access:</strong> Not available for general public walk-in storage. Retrieval or further instructions are handled via the app based on the notification you receive (e.g., re-book delivery, schedule return).</li>
        </ul>
        <p className="text-xs text-gray-500 mt-4 italic">This ensures your luggage remains safe and accounted for, even if your travel plans change unexpectedly after pickup.</p>
      </div>
      {/* --- END NEW SECTION --- */}


      {/* --- Existing Storage Rates Section --- */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-semibold mb-6">Public Storage Rates (Per Bag)</h2> {/* Clarified Title */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="border rounded-lg p-6 text-center md:text-left"> {/* Centered on small, left on medium+ */}
            <h3 className="text-xl font-semibold mb-4">Small Bags</h3>
            <p className="text-3xl font-bold text-orange-600 mb-4">₹50<span className="text-sm text-gray-600">/hour</span></p> {/* Used Tailwind color */}
            <ul className="text-gray-600 space-y-2 text-sm">
              <li>Backpacks</li>
              <li>Small suitcases</li>
              <li>Personal items</li>
            </ul>
          </div>

          <div className="border rounded-lg p-6 text-center md:text-left">
            <h3 className="text-xl font-semibold mb-4">Medium Bags</h3>
            <p className="text-3xl font-bold text-orange-600 mb-4">₹80<span className="text-sm text-gray-600">/hour</span></p> {/* Used Tailwind color */}
            <ul className="text-gray-600 space-y-2 text-sm">
              <li>Standard suitcases</li>
              <li>Travel bags</li>
              <li>Medium boxes</li>
            </ul>
          </div>

          <div className="border rounded-lg p-6 text-center md:text-left">
            <h3 className="text-xl font-semibold mb-4">Large Bags</h3>
            <p className="text-3xl font-bold text-orange-600 mb-4">₹100<span className="text-sm text-gray-600">/hour</span></p> {/* Used Tailwind color */}
            <ul className="text-gray-600 space-y-2 text-sm">
              <li>Large suitcases</li>
              <li>Multiple bags</li>
              <li>Oversized items</li>
            </ul>
          </div>
        </div>
         <p className="text-center text-xs text-gray-500 mt-6">Rates apply to public storage facilities at stations. Daily/longer-term rates may be available.</p> {/* Added note */}
      </div>
      {/* --- End Existing Section --- */}

    </div>
  );
};

export default Storage;