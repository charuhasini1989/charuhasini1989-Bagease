import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // 1. Import useNavigate
import { supabase } from '../supabase';
import { Session } from '@supabase/supabase-js'; // Optional: Import Session type for clarity

const Book = () => {
  // --- Existing State ---
  const [bookingData, setBookingData] = useState({
    name: '', email: '', phone: '', service: 'pickup',
    date: '', location: '', destination: '', bags: '1',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // --- Authentication State & Navigation ---
  const navigate = useNavigate(); // 2. Initialize useNavigate
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); // State to track auth check

  // --- Authentication Check Effect ---
  useEffect(() => {
    const checkUserSession = async () => {
      // Check if there's an active session
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Error checking Supabase session:", error.message);
        // Optionally handle error, maybe redirect to an error page or login
        navigate('/login'); // Redirect on error as well? Your choice.
        return; // Stop further execution
      }

      if (!session) {
        // No active session, user is not logged in
        console.log("User not authenticated. Redirecting to login...");
        navigate('/login'); // 3. Redirect to login page if not authenticated
      } else {
        // User is logged in, allow component to render
        console.log("User authenticated.");
        setIsLoadingAuth(false); // 4. Mark auth check as complete
      }
    };

    checkUserSession();

    // Optional: Listen for auth state changes (e.g., user logs out while on the page)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session && !isLoadingAuth) { // Check isLoadingAuth to prevent redirect during initial load
           console.log("Auth state changed: User logged out. Redirecting...");
           // Redirect if the session becomes null after the initial check
           navigate('/login');
        }
      }
    );

    // Cleanup the listener when the component unmounts
    return () => {
      authListener?.subscription.unsubscribe();
    };

  // Add navigate to dependency array as it's used inside the effect
  // Add isLoadingAuth to prevent redirect loops with onAuthStateChange during initial load
  }, [navigate, isLoadingAuth]);


  // --- Existing Functions (validateForm, handleChange, handleSubmit) ---
  // (No changes needed in these functions for the auth check itself)
  const validateForm = (): boolean => {
    // ... (validation logic remains the same) ...
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
    const bagsValue = parseInt(bookingData.bags, 10);
    if (isNaN(bagsValue) || bagsValue <= 0) {
        if (bookingData.bags !== '6') {
           newErrors.bags = 'Please select a valid number of bags.';
        }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBookingData(prevData => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (validateForm()) {
      setIsSubmitting(true);
      try {
        const bagsCount = bookingData.bags === '6' ? 6 : parseInt(bookingData.bags, 10);
        if (isNaN(bagsCount)) {
             throw new Error("Invalid number of bags provided.");
        }
        const dataToSubmit = { ...bookingData, bags: bagsCount };

        // Assuming RLS policy for INSERT requires authentication or is set to public
        const { error } = await supabase
          .from('bookings')
          .insert([dataToSubmit]);

        if (error) {
          console.error('Supabase booking insert error:', error);
          // Check if it's an RLS error - might need user_id association if policy requires it
          setSubmitError(`Booking failed: ${error.message}. Please try again.`);
        } else {
          console.log('Booking data submitted successfully');
          alert('Booking successful! We will contact you shortly.');
          setBookingData({
            name: '', email: '', phone: '', service: 'pickup',
            date: '', location: '', destination: '', bags: '1',
          });
          setErrors({});
        }
      } catch (err: any) {
        console.error('Error submitting booking form:', err);
        setSubmitError(err.message || 'An unexpected error occurred.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
        console.log("Validation failed", errors);
    }
  };


  // --- Conditional Rendering based on Auth Check ---
  // 5. Show loading indicator while checking authentication
  if (isLoadingAuth) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-xl text-gray-600">Checking authentication...</p>
        {/* You could replace this text with a spinner component */}
      </div>
    );
  }

  // 6. Render the actual component content ONLY if authentication check is complete
  //    and the user was authenticated (otherwise they would have been navigated away).
  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-8 text-center text-[#ff8c00]">Book Our Services</h1>

      <form onSubmit={handleSubmit} noValidate className="space-y-6 bg-white p-6 sm:p-8 rounded-lg shadow-lg border border-gray-200">
        {/* Display General Submission Error */}
        {submitError && (
          <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm" role="alert">
            <p className="font-semibold">Booking Failed</p>
            <p>{submitError}</p>
          </div>
        )}

        {/* --- Form Fields --- */}
        {/* (JSX for form fields remains the same) */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* Name Field */}
           <div>
             <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">Full Name</label>
             <input type="text" id="name" name="name" value={bookingData.name} onChange={handleChange} className={`w-full px-3 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 ${errors.name ? 'focus:ring-red-500' : 'focus:ring-[#ff8c00]'} focus:border-transparent`} required disabled={isSubmitting} aria-invalid={errors.name ? "true" : "false"} aria-describedby={errors.name ? "name-error" : undefined} />
             {errors.name && <p id="name-error" className="text-red-500 text-xs mt-1">{errors.name}</p>}
           </div>
           {/* Email Field */}
           <div>
             <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">Email Address</label>
             <input type="email" id="email" name="email" value={bookingData.email} onChange={handleChange} className={`w-full px-3 py-2 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 ${errors.email ? 'focus:ring-red-500' : 'focus:ring-[#ff8c00]'} focus:border-transparent`} required disabled={isSubmitting} aria-invalid={errors.email ? "true" : "false"} aria-describedby={errors.email ? "email-error" : undefined} />
             {errors.email && <p id="email-error" className="text-red-500 text-xs mt-1">{errors.email}</p>}
           </div>
         </div>
         {/* Phone Field */}
         <div>
            <label htmlFor="phone" className="block text-gray-700 text-sm font-bold mb-2">Phone Number</label>
            <input type="tel" id="phone" name="phone" value={bookingData.phone} onChange={handleChange} placeholder="e.g., 1234567890" className={`w-full px-3 py-2 border ${errors.phone ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 ${errors.phone ? 'focus:ring-red-500' : 'focus:ring-[#ff8c00]'} focus:border-transparent`} required disabled={isSubmitting} aria-invalid={errors.phone ? "true" : "false"} aria-describedby={errors.phone ? "phone-error" : undefined} />
            {errors.phone && <p id="phone-error" className="text-red-500 text-xs mt-1">{errors.phone}</p>}
         </div>
         {/* Service Type */}
          <div>
           <label htmlFor="service" className="block text-gray-700 text-sm font-bold mb-2">Service Type</label>
           <select id="service" name="service" value={bookingData.service} onChange={handleChange} className={`w-full px-3 py-2 border ${errors.service ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 ${errors.service ? 'focus:ring-red-500' : 'focus:ring-[#ff8c00]'} focus:border-transparent bg-white`} disabled={isSubmitting} aria-invalid={errors.service ? "true" : "false"} aria-describedby={errors.service ? "service-error" : undefined}>
             <option value="pickup">Home-Train Pickup</option>
             <option value="dropoff">Train-Home Dropoff</option>
             <option value="transfer">Storage</option>
           </select>
            {errors.service && <p id="service-error" className="text-red-500 text-xs mt-1">{errors.service}</p>}
         </div>
         {/* Date Field */}
         <div>
             <label htmlFor="date" className="block text-gray-700 text-sm font-bold mb-2">Date</label>
             <input type="date" id="date" name="date" value={bookingData.date} onChange={handleChange} className={`w-full px-3 py-2 border ${errors.date ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 ${errors.date ? 'focus:ring-red-500' : 'focus:ring-[#ff8c00]'} focus:border-transparent`} required disabled={isSubmitting} min={new Date().toISOString().split("T")[0]} aria-invalid={errors.date ? "true" : "false"} aria-describedby={errors.date ? "date-error" : undefined} />
             {errors.date && <p id="date-error" className="text-red-500 text-xs mt-1">{errors.date}</p>}
         </div>
         {/* Location Field */}
         <div>
             <label htmlFor="location" className="block text-gray-700 text-sm font-bold mb-2">Pickup Location</label>
             <input type="text" id="location" name="location" value={bookingData.location} onChange={handleChange} placeholder="e.g., JFK Airport Terminal 4" className={`w-full px-3 py-2 border ${errors.location ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 ${errors.location ? 'focus:ring-red-500' : 'focus:ring-[#ff8c00]'} focus:border-transparent`} required disabled={isSubmitting} aria-invalid={errors.location ? "true" : "false"} aria-describedby={errors.location ? "location-error" : undefined} />
             {errors.location && <p id="location-error" className="text-red-500 text-xs mt-1">{errors.location}</p>}
         </div>
         {/* Destination Field */}
          <div>
             <label htmlFor="destination" className="block text-gray-700 text-sm font-bold mb-2">Destination</label>
             <input type="text" id="destination" name="destination" value={bookingData.destination} onChange={handleChange} placeholder="e.g., Hotel Edison, Times Square" className={`w-full px-3 py-2 border ${errors.destination ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 ${errors.destination ? 'focus:ring-red-500' : 'focus:ring-[#ff8c00]'} focus:border-transparent`} required disabled={isSubmitting} aria-invalid={errors.destination ? "true" : "false"} aria-describedby={errors.destination ? "destination-error" : undefined} />
             {errors.destination && <p id="destination-error" className="text-red-500 text-xs mt-1">{errors.destination}</p>}
         </div>
         {/* Number of Bags Field */}
          <div>
           <label htmlFor="bags" className="block text-gray-700 text-sm font-bold mb-2">Number of Bags</label>
           <select id="bags" name="bags" value={bookingData.bags} onChange={handleChange} className={`w-full px-3 py-2 border ${errors.bags ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 ${errors.bags ? 'focus:ring-red-500' : 'focus:ring-[#ff8c00]'} focus:border-transparent bg-white`} disabled={isSubmitting} aria-invalid={errors.bags ? "true" : "false"} aria-describedby={errors.bags ? "bags-error" : undefined}>
             {[1, 2, 3, 4, 5].map((num) => (<option key={num} value={num}>{num}</option>))}
              <option value="6">6+</option>
           </select>
            {errors.bags && <p id="bags-error" className="text-red-500 text-xs mt-1">{errors.bags}</p>}
         </div>

        {/* Submit Button */}
        <button
          type="submit"
          className={`w-full bg-[#ff8c00] text-white py-3 px-4 rounded-lg text-lg font-semibold hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff8c00] transition-colors duration-200 ease-in-out ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          disabled={isSubmitting}
        >
          {isSubmitting ? (/* ... spinner ... */) : 'Book Now'}
        </button>
      </form>
    </div>
  );
};

export default Book;