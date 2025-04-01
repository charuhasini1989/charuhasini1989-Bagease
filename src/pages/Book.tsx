import React, { useState } from 'react';
// Assuming you have this file set up already:
import { supabase } from '../supabaseClient'; // <--- Adjust this path to your actual Supabase client file

const Book = () => {
  // No navigate import needed unless you redirect after submit
  const [bookingData, setBookingData] = useState({
    name: '',
    email: '',
    phone: '',
    service: 'pickup',
    date: '',
    location: '',
    destination: '',
    bags: '1', // State remains string for the select input
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false); // For loading state feedback
  const [submitError, setSubmitError] = useState<string | null>(null); // To display backend errors

  const validateForm = (): boolean => { // Explicitly return boolean
    const newErrors: Record<string, string> = {};

    if (!bookingData.name.trim()) newErrors.name = 'Name is required';
    if (!bookingData.email.trim()) {
        newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(bookingData.email)) {
        newErrors.email = 'Please enter a valid email';
    }
    if (!bookingData.phone.trim()) {
        newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(bookingData.phone.trim())) {
        newErrors.phone = 'Please enter a valid 10-digit phone number';
    }
    if (!bookingData.date) {
        newErrors.date = 'Date is required';
    } else {
       const selectedDate = new Date(bookingData.date);
       const today = new Date();
       today.setHours(0, 0, 0, 0);
       if (selectedDate < today) newErrors.date = 'Date cannot be in the past';
    }
    if (!bookingData.location.trim()) newErrors.location = 'Pickup location is required';
    if (!bookingData.destination.trim()) newErrors.destination = 'Destination is required';
    // Bags validation isn't strictly necessary if using a select with default

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ==================================================
  // MODIFIED SECTION: handleSubmit with Supabase
  // ==================================================
  const handleSubmit = async (e: React.FormEvent) => { // Make async
    e.preventDefault();
    setSubmitError(null); // Clear previous submission errors

    if (validateForm()) {
      setIsSubmitting(true); // Indicate loading state

      try {
        // Prepare data for Supabase - Ensure 'bags' is a number
        const dataToSubmit = {
          ...bookingData,
          bags: parseInt(bookingData.bags, 10), // Convert string '1' to number 1
        };

        // Check if parseInt resulted in a valid number (optional safety check)
        if (isNaN(dataToSubmit.bags)) {
             throw new Error("Invalid number of bags provided.");
        }

        // --- Supabase Insert Operation ---
        const { error } = await supabase
          .from('bookings') // <<< MAKE SURE 'bookings' matches your Supabase table name
          .insert([dataToSubmit]); // Data must be an array of objects

        // --- Handle Response ---
        if (error) {
          // Handle Supabase-specific errors
          console.error('Supabase booking insert error:', error);
          setSubmitError(`Booking failed: ${error.message}. Please try again.`);
          // No alert here, the submitError state can be displayed in the UI
        } else {
          // Success!
          console.log('Booking data submitted successfully to Supabase');
          alert('Booking successful! We will contact you shortly.');

          // Reset form state
          setBookingData({
            name: '',
            email: '',
            phone: '',
            service: 'pickup',
            date: '',
            location: '',
            destination: '',
            bags: '1',
          });
          setErrors({}); // Clear validation errors
          // Optionally navigate away: navigate('/thank-you');
        }
      } catch (err: any) { // Catch any other unexpected errors (network, parsing, etc.)
        console.error('Error submitting booking form:', err);
        setSubmitError(err.message || 'An unexpected error occurred during submission.');
      } finally {
        setIsSubmitting(false); // End loading state regardless of outcome
      }
    }
  };
  // ==================================================
  // END OF MODIFIED SECTION
  // ==================================================


  // --- JSX Rendering (largely unchanged) ---
  // You might want to:
  // 1. Display the `submitError` state somewhere near the button.
  // 2. Disable the form fields and submit button when `isSubmitting` is true.
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-[#ff8c00]">Book Our Services</h1>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-lg shadow-lg">
        {/* --- Input fields (add `disabled={isSubmitting}`) --- */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">Name</label>
            <input id="name" /* ... other props ... */ disabled={isSubmitting} />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">Email</label>
            <input id="email" /* ... other props ... */ disabled={isSubmitting} />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>
        </div>
         {/* ... other input fields similarly disabled={isSubmitting} ... */}

         {/* Example for bags select */}
         <div>
          <label htmlFor="bags" className="block text-gray-700 text-sm font-bold mb-2">Number of Bags</label>
          <select
             id="bags"
            value={bookingData.bags}
            onChange={(e) => setBookingData({ ...bookingData, bags: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff8c00]"
            disabled={isSubmitting} // Disable during submission
          >
            {[1, 2, 3, 4, 5].map((num) => (
              <option key={num} value={num}>{num}</option>
            ))}
             <option value="6">6+</option>
          </select>
        </div>

        {/* Display submission error message */}
        {submitError && (
          <p className="text-center text-red-600 text-sm font-medium p-2 bg-red-100 rounded-md">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          className={`w-full bg-[#ff8c00] text-white py-3 rounded-lg text-lg font-semibold hover:bg-orange-600 transition-colors ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isSubmitting} // Disable button during submission
        >
          {isSubmitting ? 'Booking...' : 'Book Now'}
        </button>
      </form>
    </div>
  );
};

export default Book;