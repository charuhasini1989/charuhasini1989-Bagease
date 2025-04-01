import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
// You might need an icon library or use an inline SVG
// import { CheckCircleIcon } from '@heroicons/react/24/solid'; // Example if using Heroicons

// Simple inline SVG for Green Checkmark
const GreenCheckmark = () => (
  <svg
    className="w-20 h-20 sm:w-24 sm:h-24 text-green-500"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
  </svg>
);


const Book = () => {
  // --- State ---
  const [bookingData, setBookingData] = useState({
    name: '',
    email: '',
    phone: '',
    service: 'pickup', // Default service
    date: '',
    location: '',
    destination: '',
    bags: '1',
    // --- NEW STATE FIELDS ---
    bookingType: '', // e.g., 'standard', 'express' - Add a default if needed
    paymentMode: '', // e.g., 'online', 'pay_later' - Add a default if needed
    pnrNumber: '',   // Optional PNR
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isSubmitSuccess, setIsSubmitSuccess] = useState(false); // <-- State for success screen

  // --- Authentication Check Effect (No changes needed here) ---
  useEffect(() => {
    // ... (Auth check logic remains the same) ...
    const checkUserSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error checking Supabase session:", error.message);
        navigate('/login');
        return;
      }
      if (!session) {
        console.log("User not authenticated. Redirecting to login...");
        navigate('/login');
      } else {
        console.log("User authenticated.");
        // Optionally prefill name/email if available from user session
        // setBookingData(prev => ({ ...prev, name: session.user?.user_metadata?.full_name || '', email: session.user?.email || '' }));
        setIsLoadingAuth(false);
      }
    };
    checkUserSession();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session && !isLoadingAuth) {
           navigate('/login');
        }
      }
    );
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [navigate, isLoadingAuth]);


  // --- Validation Function ---
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    // --- Existing validations ---
    if (!bookingData.name.trim()) newErrors.name = 'Name is required';
    if (!bookingData.email.trim()) { newErrors.email = 'Email is required'; }
    else if (!/\S+@\S+\.\S+/.test(bookingData.email)) { newErrors.email = 'Please enter a valid email'; }
    if (!bookingData.phone.trim()) { newErrors.phone = 'Phone number is required'; }
    else if (!/^\d{10,15}$/.test(bookingData.phone.replace(/\s+/g, ''))) { newErrors.phone = 'Please enter a valid phone number (10-15 digits)'; }
    if (!bookingData.date) { newErrors.date = 'Date is required'; }
    else { /* ...past date check... */
        const selectedDate = new Date(bookingData.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) newErrors.date = 'Date cannot be in the past';
    }
    if (!bookingData.location.trim()) newErrors.location = 'Pickup location is required';
    if (!bookingData.destination.trim()) newErrors.destination = 'Destination is required';
    const bagsValue = parseInt(bookingData.bags, 10);
    if (isNaN(bagsValue) || bagsValue <= 0) { if (bookingData.bags !== '6') { newErrors.bags = 'Please select a valid number of bags.'; } }

    // --- NEW FIELD VALIDATIONS ---
    if (!bookingData.bookingType) newErrors.bookingType = 'Booking type is required';
    if (!bookingData.paymentMode) newErrors.paymentMode = 'Mode of payment is required';
    // PNR Validation (Example: optional, but if entered, check length - adjust as needed)
    if (bookingData.pnrNumber.trim() && bookingData.pnrNumber.trim().length < 10) {
         newErrors.pnrNumber = 'Please enter a valid PNR number (if applicable)';
    }
    // --- End of new validations ---

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // --- Handle Change Function (No changes needed) ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    // ... (handleChange logic remains the same) ...
    const { name, value } = e.target;
    setBookingData(prevData => ({ ...prevData, [name]: value }));
  };

  // --- Handle Submit Function ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitSuccess(false); // Reset success state on new attempt

    if (validateForm()) {
      setIsSubmitting(true);
      try {
        const bagsCount = bookingData.bags === '6' ? 6 : parseInt(bookingData.bags, 10);
        if (isNaN(bagsCount)) { throw new Error("Invalid number of bags provided."); }

        // Prepare data - ENSURE KEYS MATCH SUPABASE COLUMN NAMES
        const dataToSubmit = {
          name: bookingData.name,
          email: bookingData.email,
          phone: bookingData.phone,
          service: bookingData.service,
          date: bookingData.date,
          location: bookingData.location,
          destination: bookingData.destination,
          bags: bagsCount,
          // --- ADD NEW FIELDS ---
          booking_type: bookingData.bookingType, // Adjust key if column name is different
          payment_mode: bookingData.paymentMode, // Adjust key if column name is different
          pnr_number: bookingData.pnrNumber.trim() || null, // Send null if empty, adjust key
        };

        const { error } = await supabase
          .from('bookings')
          .insert([dataToSubmit]);

        if (error) {
          console.error('Supabase booking insert error:', error);
          setSubmitError(`Booking failed: ${error.message}. Please try again.`);
        } else {
          console.log('Booking data submitted successfully');
          setIsSubmitSuccess(true); // <-- Trigger success screen

          // Reset form after a delay and hide success screen
          setTimeout(() => {
            setBookingData({ // Reset to initial state
                name: '', email: '', phone: '', service: 'pickup', date: '',
                location: '', destination: '', bags: '1', bookingType: '',
                paymentMode: '', pnrNumber: '',
            });
            setErrors({});
            setIsSubmitSuccess(false); // Hide success screen
            // Optionally navigate away: navigate('/my-bookings');
          }, 3000); // Show success for 3 seconds

        }
      } catch (err: any) {
        console.error('Error submitting booking form:', err);
        setSubmitError(err.message || 'An unexpected error occurred.');
      } finally {
        // Ensure isSubmitting is set to false *before* the timeout resets the form,
        // otherwise the button might re-enable too soon if timeout is long.
        // But also don't set it false until *after* the success state might be set.
        // The timeout handles the final reset, so we can set it false here.
         if (!isSubmitSuccess) { // Only set false immediately if it wasn't a success
            setIsSubmitting(false);
         }
         // If it WAS a success, let the timeout handle resetting everything including isSubmitting implicitly via state reset.
         // OR set it false inside the timeout as well if needed. For simplicity:
         setIsSubmitting(false);

      }
    } else {
      console.log("Validation failed", errors);
    }
  };

  // --- Render Logic ---
  if (isLoadingAuth) {
    return (/* ... Loading Auth indicator ... */
        <div className="flex justify-center items-center min-h-screen">
            <p className="text-xl text-gray-600">Checking authentication...</p>
        </div>
    );
  }

  // --- Success Screen ---
  if (isSubmitSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-green-50 text-center p-4">
        <GreenCheckmark />
        <h2 className="mt-6 text-2xl sm:text-3xl font-bold text-green-700">Booking Successful!</h2>
        <p className="mt-2 text-lg text-gray-600">Thank you for your booking. We will contact you shortly.</p>
      </div>
    );
  }

  // --- Booking Form ---
  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-8 text-center text-[#ff8c00]">Book Our Services</h1>

      <form onSubmit={handleSubmit} noValidate className="space-y-6 bg-white p-6 sm:p-8 rounded-lg shadow-lg border border-gray-200">
        {/* Submission Error Display */}
        {submitError && (/* ... error display ... */
            <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm" role="alert">
                <p className="font-semibold">Booking Failed</p>
                <p>{submitError}</p>
            </div>
        )}

        {/* Existing Fields: Name, Email */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name Field */}
            <div>
                <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">Full Name</label>
                <input /* ... props ... */ name="name" value={bookingData.name} onChange={handleChange} />
                {errors.name && <p id="name-error" className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            {/* Email Field */}
            <div>
                <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">Email Address</label>
                <input /* ... props ... */ name="email" value={bookingData.email} onChange={handleChange} />
                {errors.email && <p id="email-error" className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
        </div>
        {/* Phone Field */}
        <div>
            <label htmlFor="phone" className="block text-gray-700 text-sm font-bold mb-2">Phone Number</label>
            <input /* ... props ... */ name="phone" value={bookingData.phone} onChange={handleChange} />
            {errors.phone && <p id="phone-error" className="text-red-500 text-xs mt-1">{errors.phone}</p>}
        </div>

        {/* --- NEW: Booking Type Dropdown --- */}
        <div>
          <label htmlFor="bookingType" className="block text-gray-700 text-sm font-bold mb-2">Type of Booking</label>
          <select
             id="bookingType"
             name="bookingType"
             value={bookingData.bookingType}
             onChange={handleChange}
             className={`w-full px-3 py-2 border ${errors.bookingType ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 ${errors.bookingType ? 'focus:ring-red-500' : 'focus:ring-[#ff8c00]'} focus:border-transparent bg-white`}
             disabled={isSubmitting}
             required // Mark as required for browser validation hint
             aria-invalid={errors.bookingType ? "true" : "false"}
             aria-describedby={errors.bookingType ? "bookingType-error" : undefined}
          >
            <option value="" disabled>-- Select Type --</option>
            <option value="standard">Standard Service</option>
            <option value="express">Express Service</option>
            {/* Add other relevant booking types */}
          </select>
           {errors.bookingType && <p id="bookingType-error" className="text-red-500 text-xs mt-1">{errors.bookingType}</p>}
        </div>

        {/* Service Type Dropdown */}
        <div>
          <label htmlFor="service" className="block text-gray-700 text-sm font-bold mb-2">Service Required</label>
          <select /* ... props ... */ name="service" value={bookingData.service} onChange={handleChange}>
            <option value="pickup">Home-Train Pickup</option>
            <option value="dropoff">Train-Home Dropoff</option>
            <option value="storage">Storage</option>
          </select>
          {errors.service && <p id="service-error" className="text-red-500 text-xs mt-1">{errors.service}</p>}
        </div>

        {/* Date Field */}
        <div>
            <label htmlFor="date" className="block text-gray-700 text-sm font-bold mb-2">Date</label>
            <input /* ... props ... */ type="date" name="date" value={bookingData.date} onChange={handleChange} min={new Date().toISOString().split("T")[0]} />
            {errors.date && <p id="date-error" className="text-red-500 text-xs mt-1">{errors.date}</p>}
        </div>
        {/* Location Field */}
        <div>
            <label htmlFor="location" className="block text-gray-700 text-sm font-bold mb-2">Pickup Location</label>
            <input /* ... props ... */ name="location" value={bookingData.location} onChange={handleChange} />
            {errors.location && <p id="location-error" className="text-red-500 text-xs mt-1">{errors.location}</p>}
        </div>
        {/* Destination Field */}
         <div>
            <label htmlFor="destination" className="block text-gray-700 text-sm font-bold mb-2">Destination</label>
            <input /* ... props ... */ name="destination" value={bookingData.destination} onChange={handleChange} />
            {errors.destination && <p id="destination-error" className="text-red-500 text-xs mt-1">{errors.destination}</p>}
        </div>

        {/* --- NEW: PNR Number Input (Optional) --- */}
        <div>
            <label htmlFor="pnrNumber" className="block text-gray-700 text-sm font-bold mb-2">Train PNR Number <span className="text-xs font-normal text-gray-500">(Optional)</span></label>
            <input
              type="text"
              id="pnrNumber"
              name="pnrNumber"
              value={bookingData.pnrNumber}
              onChange={handleChange}
              placeholder="Enter 10-digit PNR if applicable"
              maxLength={10} // Example max length
              className={`w-full px-3 py-2 border ${errors.pnrNumber ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 ${errors.pnrNumber ? 'focus:ring-red-500' : 'focus:ring-[#ff8c00]'} focus:border-transparent`}
              disabled={isSubmitting}
              aria-invalid={errors.pnrNumber ? "true" : "false"}
              aria-describedby={errors.pnrNumber ? "pnrNumber-error" : undefined}
            />
            {errors.pnrNumber && <p id="pnrNumber-error" className="text-red-500 text-xs mt-1">{errors.pnrNumber}</p>}
        </div>

        {/* Number of Bags Field */}
         <div>
          <label htmlFor="bags" className="block text-gray-700 text-sm font-bold mb-2">Number of Bags</label>
          <select /* ... props ... */ name="bags" value={bookingData.bags} onChange={handleChange}>
            {[1, 2, 3, 4, 5].map((num) => (<option key={num} value={num}>{num}</option>))}
             <option value="6">6+</option>
          </select>
          {errors.bags && <p id="bags-error" className="text-red-500 text-xs mt-1">{errors.bags}</p>}
        </div>

        {/* --- NEW: Payment Mode Dropdown --- */}
        <div>
          <label htmlFor="paymentMode" className="block text-gray-700 text-sm font-bold mb-2">Mode of Payment</label>
          <select
             id="paymentMode"
             name="paymentMode"
             value={bookingData.paymentMode}
             onChange={handleChange}
             className={`w-full px-3 py-2 border ${errors.paymentMode ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 ${errors.paymentMode ? 'focus:ring-red-500' : 'focus:ring-[#ff8c00]'} focus:border-transparent bg-white`}
             disabled={isSubmitting}
             required
             aria-invalid={errors.paymentMode ? "true" : "false"}
             aria-describedby={errors.paymentMode ? "paymentMode-error" : undefined}
          >
            <option value="" disabled>-- Select Payment --</option>
            <option value="online">Online Payment</option>
            <option value="pay_later">Pay Later / Cash</option>
            {/* Add other relevant payment modes */}
          </select>
           {errors.paymentMode && <p id="paymentMode-error" className="text-red-500 text-xs mt-1">{errors.paymentMode}</p>}
        </div>

        {/* Submit Button */}
        <button type="submit" className={`...`} disabled={isSubmitting}>
          {isSubmitting ? (/* ... spinner ... */) : 'Book Now'}
        </button>
      </form>
    </div>
  );
};

export default Book;