import React, { useState } from 'react';
// CORRECTED IMPORT PATH: Point to your actual file
import { supabase } from '../supabase'; // <--- CHANGED THIS LINE

const Book = () => {
  // No navigate import needed unless you redirect after submit
  const [bookingData, setBookingData] = useState({
    name: '',
    email: '',
    phone: '',
    service: 'pickup', // Assuming 'pickup' is a valid default service type
    date: '',
    location: '',
    destination: '',
    bags: '1', // State remains string for the select input
  });

  // Type assertion for useState with specific structure (optional but good practice)
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false); // For loading state feedback
  const [submitError, setSubmitError] = useState<string | null>(null); // To display backend errors

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!bookingData.name.trim()) newErrors.name = 'Name is required';
    if (!bookingData.email.trim()) {
        newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(bookingData.email)) {
        newErrors.email = 'Please enter a valid email';
    }
    if (!bookingData.phone.trim()) {
        newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10,15}$/.test(bookingData.phone.replace(/\s+/g, ''))) { // Allow more digits and ignore spaces
        newErrors.phone = 'Please enter a valid phone number (10-15 digits)';
    }
    if (!bookingData.date) {
        newErrors.date = 'Date is required';
    } else {
       const selectedDate = new Date(bookingData.date);
       const today = new Date();
       today.setHours(0, 0, 0, 0); // Set time to start of day for comparison
       if (selectedDate < today) newErrors.date = 'Date cannot be in the past';
    }
    if (!bookingData.location.trim()) newErrors.location = 'Pickup location is required';
    if (!bookingData.destination.trim()) newErrors.destination = 'Destination is required';
    // Bags validation: Ensure it's a positive number or '6+' maps correctly if needed backend
    const bagsValue = parseInt(bookingData.bags, 10);
    if (isNaN(bagsValue) || bagsValue <= 0) {
        // Handle '6+' specifically if it means something else
        if (bookingData.bags !== '6') { // Allow '6+' string if that's intended
           newErrors.bags = 'Please select a valid number of bags.';
        }
    }


    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Helper function to handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBookingData(prevData => ({
      ...prevData,
      [name]: value,
    }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null); // Clear previous submission errors

    if (validateForm()) {
      setIsSubmitting(true);

      try {
        // Prepare data for Supabase
        // Handle '6+' for bags - decide how to store this (e.g., store 6, or null, or a specific string)
        // Let's assume we store '6' if '6+' is selected for simplicity here. Adjust if needed.
        const bagsCount = bookingData.bags === '6' ? 6 : parseInt(bookingData.bags, 10);

        if (isNaN(bagsCount)) {
             throw new Error("Invalid number of bags provided.");
        }

        const dataToSubmit = {
          ...bookingData,
          bags: bagsCount, // Use the processed number
          // Ensure column names match your Supabase table exactly
          // e.g., if Supabase has 'pickup_location', map it:
          // pickup_location: bookingData.location,
          // destination_location: bookingData.destination,
        };

        // --- Supabase Insert Operation ---
        const { error } = await supabase
          .from('bookings') // <<< MAKE SURE 'bookings' matches your Supabase table name
          .insert([dataToSubmit]); // Data must be an array of objects

        // --- Handle Response ---
        if (error) {
          console.error('Supabase booking insert error:', error);
          setSubmitError(`Booking failed: ${error.message}. Please try again.`);
        } else {
          console.log('Booking data submitted successfully to Supabase');
          alert('Booking successful! We will contact you shortly.'); // Consider a more integrated notification

          // Reset form state
          setBookingData({
            name: '', email: '', phone: '', service: 'pickup',
            date: '', location: '', destination: '', bags: '1',
          });
          setErrors({});
          // Optionally navigate away: navigate('/thank-you');
        }
      } catch (err: any) {
        console.error('Error submitting booking form:', err);
        setSubmitError(err.message || 'An unexpected error occurred during submission.');
      } finally {
        setIsSubmitting(false); // End loading state regardless of outcome
      }
    } else {
        console.log("Validation failed", errors); // Log validation errors if needed
    }
  };

  // --- JSX Rendering ---
  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-8 text-center text-[#ff8c00]">Book Our Services</h1>

      {/* Use novalidate to prevent default browser validation, relying on ours */}
      <form onSubmit={handleSubmit} noValidate className="space-y-6 bg-white p-6 sm:p-8 rounded-lg shadow-lg border border-gray-200">

        {/* Display General Submission Error */}
        {submitError && (
          <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm" role="alert">
            <p className="font-semibold">Booking Failed</p>
            <p>{submitError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name Field */}
          <div>
            <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">Full Name</label>
            <input
              type="text"
              id="name"
              name="name" // Add name attribute for handleChange
              value={bookingData.name}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 ${errors.name ? 'focus:ring-red-500' : 'focus:ring-[#ff8c00]'} focus:border-transparent`}
              required
              disabled={isSubmitting}
              aria-invalid={errors.name ? "true" : "false"}
              aria-describedby={errors.name ? "name-error" : undefined}
            />
            {errors.name && <p id="name-error" className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">Email Address</label>
            <input
              type="email"
              id="email"
              name="email" // Add name attribute
              value={bookingData.email}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 ${errors.email ? 'focus:ring-red-500' : 'focus:ring-[#ff8c00]'} focus:border-transparent`}
              required
              disabled={isSubmitting}
              aria-invalid={errors.email ? "true" : "false"}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {errors.email && <p id="email-error" className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>
        </div>

        {/* Phone Field */}
        <div>
           <label htmlFor="phone" className="block text-gray-700 text-sm font-bold mb-2">Phone Number</label>
           <input
            type="tel" // Use type="tel" for phone numbers
            id="phone"
            name="phone" // Add name attribute
            value={bookingData.phone}
            onChange={handleChange}
            placeholder="e.g., 1234567890"
            className={`w-full px-3 py-2 border ${errors.phone ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 ${errors.phone ? 'focus:ring-red-500' : 'focus:ring-[#ff8c00]'} focus:border-transparent`}
            required
            disabled={isSubmitting}
            aria-invalid={errors.phone ? "true" : "false"}
            aria-describedby={errors.phone ? "phone-error" : undefined}
           />
           {errors.phone && <p id="phone-error" className="text-red-500 text-xs mt-1">{errors.phone}</p>}
        </div>

         {/* Service Type - Assuming fixed options, adjust if dynamic */}
         <div>
          <label htmlFor="service" className="block text-gray-700 text-sm font-bold mb-2">Service Type</label>
          <select
             id="service"
             name="service" // Add name attribute
             value={bookingData.service}
             onChange={handleChange}
             className={`w-full px-3 py-2 border ${errors.service ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 ${errors.service ? 'focus:ring-red-500' : 'focus:ring-[#ff8c00]'} focus:border-transparent bg-white`} // Add bg-white for consistency
             disabled={isSubmitting}
             aria-invalid={errors.service ? "true" : "false"}
             aria-describedby={errors.service ? "service-error" : undefined}
          >
            <option value="pickup">Airport Pickup</option>
            <option value="dropoff">Airport Dropoff</option>
            <option value="transfer">City Transfer</option>
            {/* Add other relevant service options */}
          </select>
           {errors.service && <p id="service-error" className="text-red-500 text-xs mt-1">{errors.service}</p>}
        </div>

        {/* Date Field */}
        <div>
            <label htmlFor="date" className="block text-gray-700 text-sm font-bold mb-2">Date</label>
            <input
              type="date"
              id="date"
              name="date" // Add name attribute
              value={bookingData.date}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${errors.date ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 ${errors.date ? 'focus:ring-red-500' : 'focus:ring-[#ff8c00]'} focus:border-transparent`}
              required
              disabled={isSubmitting}
              min={new Date().toISOString().split("T")[0]} // Prevent past dates in browser UI
              aria-invalid={errors.date ? "true" : "false"}
              aria-describedby={errors.date ? "date-error" : undefined}
            />
            {errors.date && <p id="date-error" className="text-red-500 text-xs mt-1">{errors.date}</p>}
        </div>

        {/* Location Field */}
        <div>
            <label htmlFor="location" className="block text-gray-700 text-sm font-bold mb-2">Pickup Location</label>
            <input
              type="text"
              id="location"
              name="location" // Add name attribute
              value={bookingData.location}
              onChange={handleChange}
              placeholder="e.g., JFK Airport Terminal 4"
              className={`w-full px-3 py-2 border ${errors.location ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 ${errors.location ? 'focus:ring-red-500' : 'focus:ring-[#ff8c00]'} focus:border-transparent`}
              required
              disabled={isSubmitting}
              aria-invalid={errors.location ? "true" : "false"}
              aria-describedby={errors.location ? "location-error" : undefined}
            />
            {errors.location && <p id="location-error" className="text-red-500 text-xs mt-1">{errors.location}</p>}
        </div>

        {/* Destination Field */}
         <div>
            <label htmlFor="destination" className="block text-gray-700 text-sm font-bold mb-2">Destination</label>
            <input
              type="text"
              id="destination"
              name="destination" // Add name attribute
              value={bookingData.destination}
              onChange={handleChange}
              placeholder="e.g., Hotel Edison, Times Square"
              className={`w-full px-3 py-2 border ${errors.destination ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 ${errors.destination ? 'focus:ring-red-500' : 'focus:ring-[#ff8c00]'} focus:border-transparent`}
              required
              disabled={isSubmitting}
              aria-invalid={errors.destination ? "true" : "false"}
              aria-describedby={errors.destination ? "destination-error" : undefined}
            />
            {errors.destination && <p id="destination-error" className="text-red-500 text-xs mt-1">{errors.destination}</p>}
        </div>


        {/* Number of Bags Field */}
         <div>
          <label htmlFor="bags" className="block text-gray-700 text-sm font-bold mb-2">Number of Bags</label>
          <select
             id="bags"
             name="bags" // Add name attribute
             value={bookingData.bags}
             onChange={handleChange}
             className={`w-full px-3 py-2 border ${errors.bags ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 ${errors.bags ? 'focus:ring-red-500' : 'focus:ring-[#ff8c00]'} focus:border-transparent bg-white`}
             disabled={isSubmitting}
             aria-invalid={errors.bags ? "true" : "false"}
             aria-describedby={errors.bags ? "bags-error" : undefined}
          >
            {/* Generate options dynamically */}
            {[1, 2, 3, 4, 5].map((num) => (
              <option key={num} value={num}>{num}</option>
            ))}
             <option value="6">6+</option> {/* Value '6' handled in handleSubmit */}
          </select>
           {errors.bags && <p id="bags-error" className="text-red-500 text-xs mt-1">{errors.bags}</p>}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className={`w-full bg-[#ff8c00] text-white py-3 px-4 rounded-lg text-lg font-semibold hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff8c00] transition-colors duration-200 ease-in-out ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
             <span className="flex items-center justify-center">
               <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
               Booking...
             </span>
          ) : 'Book Now'}
        </button>
      </form>
    </div>
  );
};

export default Book;