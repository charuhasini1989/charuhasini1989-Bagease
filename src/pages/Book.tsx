// src/components/Book.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { PostgrestError } from '@supabase/supabase-js'; // Import PostgrestError for better typing

// --- Reusable Green Checkmark Component ---
const GreenCheckmark = () => (
    <svg
      className="w-20 h-20 sm:w-24 sm:h-24 text-green-500"
      fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      viewBox="0 0 24 24" stroke="currentColor"
    >
      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
);

// --- Simple Prompt Component ---
const PleaseLoginPrompt = () => {
    const handleOpenSidebar = () => {
        const event = new CustomEvent('openLoginSidebar');
        window.dispatchEvent(event);
    };

    return (
        <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
            <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md mx-auto">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Authentication Required</h2>
                <p className="text-gray-600 mb-6">
                    You need to be logged in to access the booking page. Please log in or sign up to continue.
                </p>
                <button
                    type="button"
                    onClick={handleOpenSidebar}
                    className="inline-block px-6 py-2 bg-[#ff8c00] text-white font-medium rounded-md hover:bg-[#e07b00] transition duration-150 ease-in-out cursor-pointer"
                >
                    Go to Login
                </button>
            </div>
        </div>
    );
};


// --- Main Booking Component ---
const Book = () => {
    const navigate = useNavigate();

    // --- State ---
    const [bookingData, setBookingData] = useState({
        name: '', phone: '', email: '', pickupLocationType: '', pickupAddress: '',
        dropLocationType: '', dropAddress: '', pickupDate: '', pickupTime: '',
        trainNumber: '', trainName: '', pnrNumber: '', coachNumber: '', seatNumber: '',
        deliveryPreference: '', numberOfBags: '1', weightCategory: '',
        specialItemsDescription: '', insuranceRequested: false, serviceType: '',
        paymentMode: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);

    // --- Authentication Check (Keep as is) ---
    useEffect(() => {
        let isMounted = true;

        const checkUserSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (!isMounted) return;
                if (error) {
                    console.error("Error checking Supabase session:", error.message); setIsAuthenticated(false);
                } else {
                    setIsAuthenticated(!!session);
                    if (session) {
                        setBookingData(prev => ({
                            ...prev,
                            email: prev.email || session.user?.email || '',
                            name: prev.name || session.user?.user_metadata?.full_name || ''
                        }));
                    }
                }
            } catch (err) { if (isMounted) { console.error("Unexpected error during auth check:", err); setIsAuthenticated(false); } }
            finally { if (isMounted) setIsLoadingAuth(false); }
        };

        checkUserSession();

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (isMounted && !isLoadingAuth) {
                 const currentlyAuth = !!session;
                 if (currentlyAuth !== isAuthenticated) {
                    setIsAuthenticated(currentlyAuth);
                    if (currentlyAuth && session) {
                        setBookingData(prev => ({
                            ...prev,
                            email: prev.email || session.user?.email || '',
                            name: prev.name || session.user?.user_metadata?.full_name || ''
                        }));
                    }
                 }
            }
        });

        return () => { isMounted = false; authListener?.subscription.unsubscribe(); };
    }, [navigate, isLoadingAuth, isAuthenticated]);


    // --- getMinDateTime, validateForm, handleChange, handlePnrFetch (Keep as is) ---
    const getMinDateTime = useCallback(() => { /* ... */
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        now.setHours(now.getHours() + 1); // 1-hour buffer
        const minTime = now.toTimeString().split(' ')[0].substring(0, 5);
        return { minDate: today, minTimeForToday: minTime };
    }, []);
    const { minDate, minTimeForToday } = getMinDateTime();

    const validateForm = useCallback((): boolean => { /* ... */
        const newErrors: Record<string, string> = {};
        const data = bookingData;

        // (Validation logic remains the same)
        if (!data.name.trim()) newErrors.name = 'Full Name is required';
        if (!data.phone.trim()) newErrors.phone = 'Phone number is required';
        else if (!/^\+?[\d\s-]{10,15}$/.test(data.phone)) newErrors.phone = 'Enter a valid phone number';
        if (!data.email.trim()) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(data.email)) newErrors.email = 'Enter a valid email address';
        if (!data.pickupLocationType) newErrors.pickupLocationType = 'Select pickup location type';
        if (!data.pickupAddress.trim()) newErrors.pickupAddress = 'Pickup address/location name is required';
        if (!data.dropLocationType) newErrors.dropLocationType = 'Select drop-off location type';
        if (!data.dropAddress.trim()) newErrors.dropAddress = 'Drop-off address/location name is required';
        if (!data.pickupDate) newErrors.pickupDate = 'Pickup date is required';
        else {
             const selectedDate = new Date(data.pickupDate + 'T00:00:00');
             const today = new Date(minDate + 'T00:00:00');
             if (selectedDate < today) newErrors.pickupDate = 'Pickup date cannot be in the past';
        }
        if (!data.pickupTime) newErrors.pickupTime = 'Pickup time is required';
        else if (data.pickupDate === minDate && data.pickupTime < minTimeForToday) {
            newErrors.pickupTime = `Time cannot be earlier than ${minTimeForToday} for today`;
        }
        if (!data.trainNumber.trim()) newErrors.trainNumber = 'Train number is required';
        if (data.pnrNumber.trim() && !/^\d{10}$/.test(data.pnrNumber.trim())) {
            newErrors.pnrNumber = 'PNR must be 10 digits if provided';
        }
        if (!data.deliveryPreference) newErrors.deliveryPreference = 'Select a delivery preference';
        if (data.deliveryPreference === 'Deliver to Seat') {
            if (!data.coachNumber.trim()) newErrors.coachNumber = 'Coach number required for seat delivery';
            if (!data.seatNumber.trim()) newErrors.seatNumber = 'Seat number required for seat delivery';
        }
        const bags = parseInt(data.numberOfBags, 10);
        if (isNaN(bags) || bags <= 0) newErrors.numberOfBags = 'Enter a valid number of bags (1 or more)';
        if (!data.weightCategory) newErrors.weightCategory = 'Select a weight category';
        if (!data.serviceType) newErrors.serviceType = 'Select a service type';
        if (!data.paymentMode) newErrors.paymentMode = 'Select a payment mode';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [bookingData, minDate, minTimeForToday]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { /* ... */
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setBookingData(prevData => ({ ...prevData, [name]: checked }));
        } else {
            setBookingData(prevData => ({ ...prevData, [name]: value }));
        }
        setErrors(prevErrors => {
            if (!prevErrors[name]) return prevErrors;
            const updatedErrors = { ...prevErrors }; delete updatedErrors[name]; return updatedErrors;
        });
    }, []);

    const handlePnrFetch = useCallback(async () => { /* ... */
        if (!bookingData.pnrNumber || !/^\d{10}$/.test(bookingData.pnrNumber)) {
            setErrors(prev => ({...prev, pnrNumber: 'Enter a valid 10-digit PNR to fetch details'}));
            return;
        }
        alert(`TODO: Implement API call to fetch details for PNR: ${bookingData.pnrNumber}`);
    }, [bookingData.pnrNumber]);

    // --- *** MODIFIED Handle Submit *** ---
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAuthenticated) {
             setSubmitError("You must be logged in to submit a booking.");
             // Optionally trigger sidebar open here too
             // const event = new CustomEvent('openLoginSidebar'); window.dispatchEvent(event);
             return;
        }

        setSubmitError(null);
        setIsSubmitSuccess(false); // Reset success state on new submission attempt

        if (validateForm()) {
            setIsSubmitting(true);
            let bookingId: number | null = null;
            let orderTrackingId: number | null = null;
            let orderNumber: string | null = null;

            try {
                 const { data: { user } } = await supabase.auth.getUser();
                 if (!user) {
                     throw new Error("Authentication session lost. Please log in again.");
                 }

                // --- Step 1: Insert into Bookings ---
                const bookingPayload = {
                    user_id: user.id,
                    name: bookingData.name.trim(),
                    phone: bookingData.phone.trim(),
                    email: bookingData.email.trim(),
                    pickup_location_type: bookingData.pickupLocationType,
                    pickup_address: bookingData.pickupAddress.trim(),
                    drop_location_type: bookingData.dropLocationType,
                    drop_address: bookingData.dropAddress.trim(),
                    pickup_date: bookingData.pickupDate,
                    pickup_time: bookingData.pickupTime,
                    train_number: bookingData.trainNumber.trim(),
                    train_name: bookingData.trainName.trim() || null,
                    pnr_number: bookingData.pnrNumber.trim() || null,
                    coach_number: bookingData.coachNumber.trim() || null,
                    seat_number: bookingData.seatNumber.trim() || null,
                    delivery_preference: bookingData.deliveryPreference,
                    number_of_bags: parseInt(bookingData.numberOfBags, 10),
                    weight_category: bookingData.weightCategory,
                    special_items_description: bookingData.specialItemsDescription.trim() || null,
                    insurance_requested: bookingData.insuranceRequested,
                    service_type: bookingData.serviceType,
                    payment_mode: bookingData.paymentMode,
                    booking_status: 'Pending', // Initial status for booking itself
                };

                console.log("Submitting to bookings:", bookingPayload);
                const { data: bookingResult, error: bookingError } = await supabase
                    .from('bookings')
                    .insert([bookingPayload])
                    .select('id') // Select the ID of the newly created row
                    .single(); // We expect only one row inserted

                if (bookingError) {
                    console.error('Supabase booking insert error:', bookingError);
                    throw new Error(`Booking failed: ${bookingError.message}.`); // Throw to be caught by outer catch
                }
                if (!bookingResult || !bookingResult.id) {
                    // This case is less likely if no error was thrown, but good to check
                    console.error('Booking insert succeeded but no ID returned.');
                    throw new Error("Booking created, but failed to retrieve its ID. Please contact support.");
                }

                bookingId = bookingResult.id; // Store the ID
                console.log('Booking successful! ID:', bookingId);

                // --- Step 2: Insert into Order Tracking ---
                orderNumber = `BE-${bookingId}`; // Generate a simple order number
                const trackingPayload = {
                    booking_id: bookingId, // Link to the booking table
                    user_id: user.id,
                    order_number: orderNumber,
                    status: 'Pending', // Use the consistent status enum/value
                    total_amount: 0, // Placeholder: Update later with actual cost
                    estimated_delivery: null, // Placeholder: Calculate later if possible
                    delivered_at: null,
                    // current_location: null, // Let DB handle default or set if needed
                    // tracking_link: null, // Generate later
                    // created_at/updated_at handled by DB
                };

                console.log("Submitting to order_tracking:", trackingPayload);
                const { data: trackingResult, error: trackingError } = await supabase
                    .from('order_tracking') // <--- MAKE SURE THIS TABLE NAME IS CORRECT
                    .insert([trackingPayload])
                    .select('id') // Get the ID of the tracking record
                    .single();

                if (trackingError) {
                    // Booking succeeded, but tracking failed. Log and inform, don't fully fail yet.
                    console.error('Supabase order_tracking insert error:', trackingError);
                    // **IMPORTANT**: Decide how to handle this partial failure.
                    // Option A: Show error but maybe still proceed partially? Risky.
                    // Option B: Throw error, which means the success UI won't show. Safer.
                    // Option C: Try to delete the original booking? Complex.
                    // Let's go with Option B for data consistency.
                    throw new Error(`Booking confirmed (ID: ${bookingId}), but failed to set up tracking: ${trackingError.message}. Please contact support.`);
                }
                 if (!trackingResult || !trackingResult.id) {
                    console.error('Order tracking insert succeeded but no ID returned.');
                    throw new Error(`Booking confirmed (ID: ${bookingId}), but failed to retrieve tracking details. Contact support.`);
                }

                orderTrackingId = trackingResult.id; // Store the tracking ID
                console.log('Order Tracking successful! ID:', orderTrackingId);


                // --- Step 3: Insert Initial Transit Status ---
                const transitPayload = {
                    order_id: orderTrackingId, // Link to the order_tracking record
                    status: 'Pending', // Match the initial order status
                    location: 'Booking Confirmed', // Descriptive location/event
                    timestamp: new Date().toISOString(), // Current time
                    notes: `Booking created via website. Order #: ${orderNumber}`,
                    // created_at handled by DB
                };

                console.log("Submitting to order_transit_status:", transitPayload);
                const { error: transitError } = await supabase
                    .from('order_transit_status') // <--- MAKE SURE THIS TABLE NAME IS CORRECT
                    .insert([transitPayload]);

                if (transitError) {
                    // Booking and Tracking succeeded, but the *initial status* failed.
                    // This is less critical, but should be logged. We can let the success UI show.
                    console.warn('Supabase order_transit_status insert error:', transitError);
                    // Optionally set a non-blocking warning message:
                    // setSubmitError(`Warning: Booking/Tracking ok, but initial status log failed: ${transitError.message}`);
                    // Don't throw an error here, let the process complete.
                } else {
                    console.log('Initial Order Transit Status entry successful!');
                }

                // --- All Critical Steps Successful ---
                console.log('Full booking and tracking process completed.');
                setIsSubmitSuccess(true); // Trigger success overlay

                // Reset form after a delay
                setTimeout(() => {
                   setBookingData({ // Reset form
                        name: user?.user_metadata?.full_name || '', // Keep logged-in user's name/email
                        email: user?.email || '',
                        phone: '', pickupLocationType: '', pickupAddress: '',
                        dropLocationType: '', dropAddress: '', pickupDate: '', pickupTime: '',
                        trainNumber: '', trainName: '', pnrNumber: '', coachNumber: '', seatNumber: '',
                        deliveryPreference: '', numberOfBags: '1', weightCategory: '',
                        specialItemsDescription: '', insuranceRequested: false, serviceType: '',
                        paymentMode: '',
                    });
                    setErrors({});
                    setSubmitError(null); // Clear any potential warning message
                    setIsSubmitSuccess(false); // Hide success overlay
                    setIsSubmitting(false); // Re-enable form
                    // navigate('/my-bookings'); // Optional redirect
                    console.log('Form reset after success.');
                }, 3000); // 3-second delay for success message visibility

            } catch (err: any) {
                console.error('Error during submission process:', err);
                // If an error was thrown, set the error message state
                setSubmitError(err.message || 'An unexpected error occurred during booking.');
                // Ensure loading state is stopped if an error occurs *before* the success timeout starts
                setIsSubmitting(false);
            }
            // No finally block needed here because the success timeout handles setIsSubmitting(false)
            // and the catch block handles it for errors.

        } else {
            console.log("Validation failed", errors);
            setSubmitError("Please fix the errors marked in the form.");
            const firstErrorKey = Object.keys(errors)[0];
            if (firstErrorKey) {
                const element = document.getElementById(firstErrorKey);
                element?.focus({ preventScroll: true });
                element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            // Ensure submitting is false if validation fails upfront
             setIsSubmitting(false);
        }
    }, [bookingData, validateForm, navigate, isAuthenticated]); // Dependencies remain the same


    // --- Render Logic (Keep as is) ---

    // 1. Loading state
    if (isLoadingAuth) {
        return ( /* ... Loading spinner ... */
            <div className="flex justify-center items-center min-h-screen bg-gray-50">
                <div className="text-center">
                     <svg className="animate-spin h-10 w-10 text-[#ff8c00] mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                     <p className="text-xl text-gray-600">Checking authentication...</p>
                </div>
            </div>
        );
    }

    // 2. Not authenticated -> Show Prompt
    if (!isAuthenticated) {
        return <PleaseLoginPrompt />;
    }

    // 3. Submission Success Overlay
    if (isSubmitSuccess) {
        return ( /* ... Green checkmark success overlay ... */
             <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-green-50 text-center p-4">
                 <GreenCheckmark />
                <h2 className="mt-6 text-2xl sm:text-3xl font-bold text-green-700">Booking Confirmed!</h2>
                <p className="mt-2 text-lg text-gray-600">Your BagEase booking is successful. Tracking has been initiated.</p>
                 {/* <button onClick={() => navigate('/my-bookings')} className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">View My Bookings</button> */}
             </div>
        );
    }

    // 4. Authenticated, show the form (JSX remains the same)
    const commonInputProps = (name: keyof typeof bookingData, isRequired = true) => ({
         id: name, name: name, onChange: handleChange,
         className: `mt-1 block w-full px-3 py-2 bg-white border ${errors[name] ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#ff8c00] focus:border-[#ff8c00] sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed`,
         disabled: isSubmitting, 'aria-invalid': errors[name] ? "true" : "false",
         'aria-describedby': errors[name] ? `${name}-error` : undefined,
    });

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                 <h1 className="text-center text-3xl font-extrabold text-gray-900 mb-2">
                    Book Your BagEase Service
                </h1>
                <p className="text-center text-sm text-gray-600 mb-8">
                    Fill in the details below to arrange your baggage transfer.
                </p>

                <form onSubmit={handleSubmit} noValidate className="bg-white p-6 sm:p-8 rounded-lg shadow-lg space-y-8">
                     {/* General Submission Error Display */}
                    {submitError && (
                        <div className="p-3 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-md text-sm" role="alert">
                            <p className="font-bold">Booking Issue</p> {/* Changed title slightly */}
                            <p>{submitError}</p>
                        </div>
                    )}

                    {/* === Section 1: User Information === */}
                    <fieldset className="space-y-6">
                        <legend className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">1. Your Contact Information</legend>
                        {/* Name, Phone, Email Inputs */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
                                <input type="text" {...commonInputProps('name')} value={bookingData.name} placeholder="e.g., Priya Sharma" autoComplete="name" />
                                {errors.name && <p id="name-error" className="mt-1 text-xs text-red-600">{errors.name}</p>}
                            </div>
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number</label>
                                <input type="tel" {...commonInputProps('phone')} value={bookingData.phone} placeholder="e.g., 9876543210" autoComplete="tel" />
                                {errors.phone && <p id="phone-error" className="mt-1 text-xs text-red-600">{errors.phone}</p>}
                            </div>
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                            <input type="email" {...commonInputProps('email')} value={bookingData.email} placeholder="you@example.com" autoComplete="email"/>
                            {errors.email && <p id="email-error" className="mt-1 text-xs text-red-600">{errors.email}</p>}
                        </div>
                    </fieldset>

                    {/* === Section 2: Pickup & Drop-Off Details === */}
                    <fieldset className="space-y-6 border-t border-gray-200 pt-6">
                         <legend className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">2. Pickup & Drop-Off Details</legend>
                          {/* Pickup Location */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label htmlFor="pickupLocationType" className="block text-sm font-medium text-gray-700">Pickup From</label>
                                <select {...commonInputProps('pickupLocationType')} value={bookingData.pickupLocationType}>
                                    <option value="" disabled>-- Select Type --</option>
                                    <option value="Home">Home</option> <option value="Hotel">Hotel</option> <option value="Station">Train Station</option> <option value="Office">Office</option> <option value="Other">Other</option>
                                </select>
                                {errors.pickupLocationType && <p id="pickupLocationType-error" className="mt-1 text-xs text-red-600">{errors.pickupLocationType}</p>}
                              </div>
                              <div>
                                <label htmlFor="pickupAddress" className="block text-sm font-medium text-gray-700">Pickup Address / Location Name</label>
                                <input type="text" {...commonInputProps('pickupAddress')} value={bookingData.pickupAddress} placeholder="Full Address or Station Name" />
                                {errors.pickupAddress && <p id="pickupAddress-error" className="mt-1 text-xs text-red-600">{errors.pickupAddress}</p>}
                              </div>
                          </div>
                          {/* Drop-off Location */}
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               <div>
                                <label htmlFor="dropLocationType" className="block text-sm font-medium text-gray-700">Drop-off At</label>
                                <select {...commonInputProps('dropLocationType')} value={bookingData.dropLocationType}>
                                    <option value="" disabled>-- Select Type --</option>
                                    <option value="Station">Train Station</option> <option value="Home">Home</option> <option value="Hotel">Hotel</option> <option value="Other">Other</option>
                                </select>
                                {errors.dropLocationType && <p id="dropLocationType-error" className="mt-1 text-xs text-red-600">{errors.dropLocationType}</p>}
                              </div>
                              <div>
                                <label htmlFor="dropAddress" className="block text-sm font-medium text-gray-700">Drop-off Address / Location Name</label>
                                <input type="text" {...commonInputProps('dropAddress')} value={bookingData.dropAddress} placeholder="Full Address or Station Name" />
                                {errors.dropAddress && <p id="dropAddress-error" className="mt-1 text-xs text-red-600">{errors.dropAddress}</p>}
                              </div>
                           </div>
                           {/* Date & Time */}
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="pickupDate" className="block text-sm font-medium text-gray-700">Pickup Date</label>
                                    <input type="date" {...commonInputProps('pickupDate')} value={bookingData.pickupDate} min={minDate} />
                                    {errors.pickupDate && <p id="pickupDate-error" className="mt-1 text-xs text-red-600">{errors.pickupDate}</p>}
                                </div>
                                <div>
                                    <label htmlFor="pickupTime" className="block text-sm font-medium text-gray-700">Pickup Time</label>
                                    <input type="time" {...commonInputProps('pickupTime')} value={bookingData.pickupTime} min={bookingData.pickupDate === minDate ? minTimeForToday : undefined} />
                                    {errors.pickupTime && <p id="pickupTime-error" className="mt-1 text-xs text-red-600">{errors.pickupTime}</p>}
                                </div>
                           </div>
                           {/* Train Details */}
                           <h3 className="text-md font-medium text-gray-700 pt-4 border-t border-gray-100 mt-4">Train Details (If Applicable)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               <div>
                                    <label htmlFor="trainNumber" className="block text-sm font-medium text-gray-700">Train Number</label>
                                    <input type="text" {...commonInputProps('trainNumber')} value={bookingData.trainNumber} placeholder="e.g., 12345" />
                                    {errors.trainNumber && <p id="trainNumber-error" className="mt-1 text-xs text-red-600">{errors.trainNumber}</p>}
                                </div>
                                 <div>
                                    <label htmlFor="trainName" className="block text-sm font-medium text-gray-700">Train Name <span className="text-xs text-gray-500">(Optional)</span></label>
                                    <input type="text" {...commonInputProps('trainName', false)} value={bookingData.trainName} placeholder="e.g., Rajdhani Express" />
                                </div>
                            </div>
                             <div className="relative">
                                <label htmlFor="pnrNumber" className="block text-sm font-medium text-gray-700">PNR Number <span className="text-xs text-gray-500">(Optional)</span></label>
                                <input type="text" {...commonInputProps('pnrNumber', false)} value={bookingData.pnrNumber} placeholder="10-digit PNR" maxLength={10} />
                                {errors.pnrNumber && <p id="pnrNumber-error" className="mt-1 text-xs text-red-600">{errors.pnrNumber}</p>}
                            </div>
                            {/* Coach/Seat */}
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 <div>
                                    <label htmlFor="coachNumber" className="block text-sm font-medium text-gray-700">Coach <span className="text-xs text-gray-500">(Required if 'Deliver to Seat')</span></label>
                                    <input type="text" {...commonInputProps('coachNumber', bookingData.deliveryPreference === 'Deliver to Seat')} value={bookingData.coachNumber} placeholder="e.g., S5" maxLength={4} />
                                    {errors.coachNumber && <p id="coachNumber-error" className="mt-1 text-xs text-red-600">{errors.coachNumber}</p>}
                                </div>
                                 <div>
                                    <label htmlFor="seatNumber" className="block text-sm font-medium text-gray-700">Seat <span className="text-xs text-gray-500">(Required if 'Deliver to Seat')</span></label>
                                    <input type="text" {...commonInputProps('seatNumber', bookingData.deliveryPreference === 'Deliver to Seat')} value={bookingData.seatNumber} placeholder="e.g., 32" maxLength={3} />
                                    {errors.seatNumber && <p id="seatNumber-error" className="mt-1 text-xs text-red-600">{errors.seatNumber}</p>}
                                </div>
                             </div>
                             {/* Delivery Preference */}
                             <div>
                                <label htmlFor="deliveryPreference" className="block text-sm font-medium text-gray-700">Delivery Preference at Destination Station</label>
                                <select {...commonInputProps('deliveryPreference')} value={bookingData.deliveryPreference}>
                                    <option value="" disabled>-- Select Preference --</option>
                                    <option value="Deliver to Seat">Deliver to My Seat</option> <option value="Collect from Kiosk">I will Collect from Station Kiosk</option> <option value="Store in Transit">Store Temporarily (e.g., if train delayed)</option>
                                </select>
                                 {errors.deliveryPreference && <p id="deliveryPreference-error" className="mt-1 text-xs text-red-600">{errors.deliveryPreference}</p>}
                             </div>
                    </fieldset>

                    {/* === Section 3: Luggage Details === */}
                    <fieldset className="space-y-6 border-t border-gray-200 pt-6">
                        <legend className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">3. Luggage Details</legend>
                        {/* Bags, Weight, Special Items, Insurance */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="numberOfBags" className="block text-sm font-medium text-gray-700">Number of Bags</label>
                                <input type="number" {...commonInputProps('numberOfBags')} value={bookingData.numberOfBags} min="1" max="20" step="1" placeholder="1" />
                                {errors.numberOfBags && <p id="numberOfBags-error" className="mt-1 text-xs text-red-600">{errors.numberOfBags}</p>}
                            </div>
                             <div>
                                <label htmlFor="weightCategory" className="block text-sm font-medium text-gray-700">Total Weight (Approx)</label>
                                <select {...commonInputProps('weightCategory')} value={bookingData.weightCategory}>
                                    <option value="" disabled>-- Select Weight --</option>
                                    <option value="0-10kg">Up to 10 kg</option> <option value="10-20kg">10 - 20 kg</option> <option value="20kg+">More than 20 kg</option>
                                </select>
                                 {errors.weightCategory && <p id="weightCategory-error" className="mt-1 text-xs text-red-600">{errors.weightCategory}</p>}
                            </div>
                        </div>
                        <div>
                            <label htmlFor="specialItemsDescription" className="block text-sm font-medium text-gray-700">Special Handling Notes <span className="text-xs text-gray-500">(Optional)</span></label>
                             <textarea {...commonInputProps('specialItemsDescription', false)} value={bookingData.specialItemsDescription} rows={3} placeholder="e.g., Fragile items inside..."></textarea>
                        </div>
                        <div className="relative flex items-start">
                            <div className="flex items-center h-5"> <input id="insuranceRequested" name="insuranceRequested" type="checkbox" checked={bookingData.insuranceRequested} onChange={handleChange} disabled={isSubmitting} className="focus:ring-[#ff8c00] h-4 w-4 text-[#ff8c00] border-gray-300 rounded disabled:opacity-50" /> </div>
                            <div className="ml-3 text-sm"> <label htmlFor="insuranceRequested" className="font-medium text-gray-700">Add Luggage Insurance?</label> <p className="text-xs text-gray-500">(Optional, additional charges may apply)</p> </div>
                        </div>
                    </fieldset>

                    {/* === Section 4: Service & Payment === */}
                    <fieldset className="space-y-6 border-t border-gray-200 pt-6">
                        <legend className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">4. Service & Payment</legend>
                        {/* Service Type, Payment Mode */}
                        <div>
                            <label htmlFor="serviceType" className="block text-sm font-medium text-gray-700">Service Speed</label>
                            <select {...commonInputProps('serviceType')} value={bookingData.serviceType}>
                                <option value="" disabled>-- Select Service --</option>
                                <option value="Standard">Standard</option> <option value="Express">Express (Faster)</option>
                            </select>
                             {errors.serviceType && <p id="serviceType-error" className="mt-1 text-xs text-red-600">{errors.serviceType}</p>}
                        </div>
                         {/* Estimated Cost Placeholder */}
                         {/* <div className="p-3 bg-blue-50 border border-blue-200 rounded-md"> <p className="text-sm text-blue-700">Estimated Cost: <span className="font-bold">₹ Calculation Pending</span></p> </div> */}
                        <div>
                            <label htmlFor="paymentMode" className="block text-sm font-medium text-gray-700">Preferred Payment Method</label>
                            <select {...commonInputProps('paymentMode')} value={bookingData.paymentMode}>
                                <option value="" disabled>-- Select Payment --</option>
                                <option value="UPI">UPI</option> <option value="Card">Debit/Credit Card</option> <option value="NetBanking">Net Banking</option> <option value="Wallet">Mobile Wallet</option> <option value="POD">Pay on Delivery/Pickup</option>
                            </select>
                             {errors.paymentMode && <p id="paymentMode-error" className="mt-1 text-xs text-red-600">{errors.paymentMode}</p>}
                        </div>
                    </fieldset>

                    {/* === Submit Button === */}
                    <div className="pt-5 border-t border-gray-200">
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-base font-medium rounded-md text-white bg-[#ff8c00] hover:bg-[#e07b00] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff8c00] disabled:opacity-60 disabled:cursor-wait transition duration-150 ease-in-out"
                            disabled={isSubmitting || !isAuthenticated}
                        >
                            {isSubmitting ? ( /* ... Loading Spinner Icon ... */
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Processing Booking...
                                </>
                            ) : ( 'Confirm & Proceed' )}
                        </button>
                    </div>

                     {/* --- Footer Info --- */}
                     <div className="text-center text-xs text-gray-500 pt-4">
                         <p>By clicking confirm, you agree to BagEase's <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#ff8c00] hover:underline">Terms</a> & <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#ff8c00] hover:underline">Privacy Policy</a>.</p>
                     </div>
                </form>
            </div>
        </div>
    );
};

export default Book;