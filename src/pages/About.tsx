import React from 'react';
import { Users, Target, Award, Heart } from 'lucide-react';

// --- Sample Static Testimonial Data (can be expanded later) ---
// We'll just manually put 3 testimonials directly into the JSX for now.
const staticTestimonials = [
  {
    id: 1,
    name: 'Priya Sharma',
    location: 'Mumbai',
    quote: "BagEase was a lifesaver! Traveling with kids became so much easier without lugging suitcases through Dadar station. Highly recommend!",
  },
  {
    id: 2,
    name: 'Amit Patel',
    location: 'Delhi',
    quote: "Reached New Delhi station and my bags were waiting exactly as promised. Secure, punctual, and worth every penny. No more coolie haggling!",
  },
  {
    id: 3,
    name: 'Sunita Rao',
    location: 'Bengaluru',
    quote: "As a frequent business traveler, BagEase saves me precious time. Straight from the train to my meeting, luggage handled seamlessly.",
  },
  // You can add more here if you want to manually display more than 3 initially
];


const About = () => {
  return (
    // Main container - ensures consistent width and padding
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-center mb-12">About BagEase</h1>

      {/* Our Story Section - Keeping existing structure */}
      <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
        <h2 className="text-2xl font-semibold mb-6">Our Story</h2>
        <p className="text-gray-600 mb-6">
          BagEase was founded with a simple mission: to make travel easier for everyone.
          We understand the hassle of managing luggage while traveling, especially at busy
          train stations across India. Our service was born from the desire to provide a
          solution that allows travelers to focus on their journey while we take care of
          their belongings.
        </p>
        <p className="text-gray-600">
          Since our inception, we've grown to serve thousands of travelers across major
          Indian cities, building a reputation for reliability, security, and customer
          satisfaction. Our team of dedicated professionals ensures that your luggage is
          handled with the utmost care and delivered safely to your destination.
        </p>
      </div>

      {/* Stats Section - Keeping existing structure */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12 text-center"> {/* Adjusted grid cols for responsiveness */}
        <div> {/* Wrapped each item in a div for better grid control */}
          <Users className="w-12 h-12 text-blue-600 mx-auto mb-4" /> {/* Use a slightly branded color */}
          <h3 className="text-xl font-semibold mb-2">5000+</h3>
          <p className="text-gray-600">Happy Customers</p>
        </div>
        <div>
          <Target className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">20+</h3>
          <p className="text-gray-600">Cities Covered</p>
        </div>
        <div>
          <Award className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">100%</h3>
          <p className="text-gray-600">Safe Delivery</p>
        </div>
        <div>
          <Heart className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">24/7</h3>
          <p className="text-gray-600">Customer Support</p>
        </div>
      </div>

      {/* Mission & Vision Section - Keeping existing structure */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-semibold mb-6">Our Mission</h2>
          <p className="text-gray-600">
            To revolutionize luggage handling in India by providing secure, reliable,
            and convenient services that make travel stress-free for everyone. We aim
            to be the most trusted name in luggage handling across the country.
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-semibold mb-6">Our Vision</h2>
          <p className="text-gray-600">
            To create a seamless travel experience where luggage handling is no longer
            a concern for travelers. We envision a future where every train station in
            India has access to professional luggage handling services.
          </p>
        </div>
      </div>

      {/* Our Values Section - Keeping existing structure */}
      <div className="bg-blue-50 rounded-lg p-8 mb-12"> {/* Added mb-12 for spacing below */}
        <h2 className="text-2xl font-semibold mb-6 text-center">Our Values</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center"> {/* Adjusted grid cols & text-center */}
           <div>
             <h3 className="font-semibold mb-3">Reliability</h3>
             <p className="text-gray-600 text-sm sm:text-base"> {/* Adjusted text size */}
               We deliver on our promises, ensuring your luggage reaches its destination
               safely and on time.
             </p>
           </div>
           <div>
             <h3 className="font-semibold mb-3">Security</h3>
             <p className="text-gray-600 text-sm sm:text-base">
               Your belongings' safety is our top priority, handled with care and tracked diligently.
             </p>
           </div>
           <div>
             <h3 className="font-semibold mb-3">Customer First</h3>
             <p className="text-gray-600 text-sm sm:text-base">
               We go above and beyond to ensure our customers have the best possible
               and hassle-free experience.
             </p>
           </div>
         </div>
      </div>

      {/* --- NEW: Static Customer Testimonials Section --- */}
      <div className="py-12"> {/* Added padding top/bottom */}
        <h2 className="text-2xl font-semibold text-center mb-8">What Our Customers Say</h2>
        {/* Grid to display testimonials. Adjust columns for responsiveness */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Testimonial Card 1 (Manually added) */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100 flex flex-col">
            <p className="text-gray-600 italic mb-4 flex-grow">"{staticTestimonials[0].quote}"</p>
            <p className="font-semibold text-right text-blue-700">- {staticTestimonials[0].name}</p>
            {staticTestimonials[0].location && (
                <p className="text-sm text-gray-500 text-right">{staticTestimonials[0].location}</p>
            )}
          </div>

          {/* Testimonial Card 2 (Manually added) */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100 flex flex-col">
            <p className="text-gray-600 italic mb-4 flex-grow">"{staticTestimonials[1].quote}"</p>
            <p className="font-semibold text-right text-blue-700">- {staticTestimonials[1].name}</p>
            {staticTestimonials[1].location && (
                <p className="text-sm text-gray-500 text-right">{staticTestimonials[1].location}</p>
            )}
          </div>

          {/* Testimonial Card 3 (Manually added) */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100 flex flex-col">
            <p className="text-gray-600 italic mb-4 flex-grow">"{staticTestimonials[2].quote}"</p>
            <p className="font-semibold text-right text-blue-700">- {staticTestimonials[2].name}</p>
            {staticTestimonials[2].location && (
                <p className="text-sm text-gray-500 text-right">{staticTestimonials[2].location}</p>
            )}
          </div>

          {/* Add more cards manually here if needed, following the same pattern */}

        </div>
      </div>
      {/* --- End Static Customer Testimonials Section --- */}

    </div> // End of main container
  );
};

export default About;