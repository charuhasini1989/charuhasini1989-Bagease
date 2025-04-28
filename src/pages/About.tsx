import React from 'react';
import { Users, Target, Award, Heart } from 'lucide-react';

const About = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-center mb-12">About BagEase</h1>

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

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        <div className="text-center">
          <Users className="w-12 h-12 text-black mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">5000+</h3>
          <p className="text-gray-600">Happy Customers</p>
        </div>
        
        <div className="text-center">
          <Target className="w-12 h-12 text-black mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">20+</h3>
          <p className="text-gray-600">Cities Covered</p>
        </div>
        
        <div className="text-center">
          <Award className="w-12 h-12 text-black mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">100%</h3>
          <p className="text-gray-600">Safe Delivery</p>
        </div>
        
        <div className="text-center">
          <Heart className="w-12 h-12 text-black mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">24/7</h3>
          <p className="text-gray-600">Customer Support</p>
        </div>
      </div>

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

      <div className="bg-blue-50 rounded-lg p-8">
        <h2 className="text-2xl font-semibold mb-6 text-center">Our Values</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <h3 className="font-semibold mb-3">Reliability</h3>
            <p className="text-gray-600">
              We deliver on our promises, ensuring your luggage reaches its destination
              safely and on time.
            </p>
          </div>
          
          <div className="text-center">
            <h3 className="font-semibold mb-3">Security</h3>
            <p className="text-gray-600">
              Your belongings' safety is our top priority, backed by comprehensive
              insurance coverage.
            </p>
          </div>
          
          <div className="text-center">
            <h3 className="font-semibold mb-3">Customer First</h3>
            <p className="text-gray-600">
              We go above and beyond to ensure our customers have the best possible
              experience.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;