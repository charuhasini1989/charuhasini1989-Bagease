import React from 'react';
// Added CheckCircle, AlertTriangle (or similar if needed, let's stick to CheckCircle/Clock for now)
import { Truck, Clock, MapPin, CheckCircle } from 'lucide-react';

const Pickup = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-center mb-12">Luggage Pickup Service</h1>

      {/* --- How It Works & Service Features (Existing Sections) --- */}
      <div className="grid md:grid-cols-2 gap-12 mb-16">
        <div>
          <h2 className="text-2xl font-semibold mb-6">How It Works</h2>
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <CheckCircle className="w-6 h-6 text-black" /> {/* Changed color to black */}
              </div>
              <div>
                <h3 className="font-semibold mb-2">Book Your Pickup</h3>
                <p className="text-gray-600">Schedule a pickup time and location through our easy booking system.</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <Truck className="w-6 h-6 text-black" /> {/* Changed color to black */}
              </div>
              <div>
                <h3 className="font-semibold mb-2">Professional Pickup</h3>
                <p className="text-gray-600">Our trained staff will collect your luggage from your doorstep.</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <MapPin className="w-6 h-6 text-black" /> {/* Changed color to black */}
              </div>
              <div>
                <h3 className="font-semibold mb-2">Station Delivery</h3>
                <p className="text-gray-600">We'll safely transport your luggage to your designated train station, ready before scheduled departure.</p> {/* Added context */}
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
              <span>Professional & Secure handling</span> {/* Added Secure */}
            </li>
            <li className="flex items-center">
              <CheckCircle className="w-5 h-5 text-black mr-3" />
              <span>Real-time tracking updates</span> {/* Added Updates */}
            </li>
             {/* Added Buffer Time feature */}
            <li className="flex items-center">
              <Clock className="w-5 h-5 text-black mr-3" />
              <span>Pre-arrival buffer time at station</span>
            </li>
          </ul>
        </div>
      </div>

      {/* --- NEW SECTION: Handling Train Schedule Variations --- */}
      <div className="bg-gray-50 rounded-lg p-8 mb-16"> {/* Added subtle background and bottom margin */}
        <h2 className="text-2xl font-semibold mb-8 text-center">Adapting to Your Travel: Train Status Handling</h2>
        <div className="grid md:grid-cols-3 gap-8"> {/* Using grid for layout */}

          {/* Scenario 1: Train Early */}
          <div className="text-center md:text-left"> {/* Centered on small screens, left on medium+ */}
            <div className="flex justify-center md:justify-start items-center mb-3">
              <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
              <h3 className="font-semibold text-lg">Train Arrives Early?</h3>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed">
              No problem! We operate on a <strong className="font-medium">"Ready Buffer Time"</strong> model. Your luggage is aimed to be securely positioned at the station 30-60 minutes <strong className="font-medium">before</strong> the scheduled arrival. If your train is early, your bags will already be waiting safely.
            </p>
          </div>

          {/* Scenario 2: Train Delayed */}
           <div className="text-center md:text-left">
            <div className="flex justify-center md:justify-start items-center mb-3">
               <Clock className="w-6 h-6 text-orange-600 mr-2" />
               <h3 className="font-semibold text-lg">Train is Delayed?</h3>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed">
              Since your luggage arrives with a buffer <strong className="font-medium">before</strong> the scheduled time, it will simply wait securely at the station under surveillance. Our tracking keeps you updated, and handover occurs upon your train's actual arrival.
            </p>
          </div>

          {/* Scenario 3: Passenger Misses Train */}
          <div className="text-center md:text-left">
             <div className="flex justify-center md:justify-start items-center mb-3">
               <Truck className="w-6 h-6 text-red-600 mr-2" /> {/* Using Truck to indicate luggage movement stopped */}
               <h3 className="font-semibold text-lg">You Miss Your Train?</h3>
             </div>
            <p className="text-gray-700 text-sm leading-relaxed">
              Our system monitors PNR status. If boarding isn't confirmed, <strong className="font-medium">your luggage is NOT loaded onto the train.</strong> It's secured at our local Transit Storage Godown (TSG). You'll receive an instant alert with options to re-book delivery, request return, or schedule pickup from the TSG.
            </p>
          </div>

        </div>
        <p className="text-center text-gray-600 text-sm mt-8 italic">
            Our fundamental promise: "Better for luggage to wait for the passenger, than for the passenger to wait for the luggage."
        </p>
      </div>
      {/* --- END NEW SECTION --- */}


      {/* --- Service Areas (Existing Section) --- */}
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