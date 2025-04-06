import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // Remove Link import if no longer needed elsewhere
import { supabase } from '../supabase';
import { User } from '@supabase/supabase-js'; // Keep User type import

// --- Reusable Green Checkmark Component ---
const GreenCheckmark = () => (
    <svg /* ... SVG code ... */
      className="w-20 h-20 sm:w-24 sm:h-24 text-green-500"
      fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      viewBox="0 0 24 24" stroke="currentColor"
    >
      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
);


// --- Simple Prompt Component ---
const PleaseLoginPrompt = () => {
    // Function to dispatch the custom event
    const handleOpenSidebar = () => {
        const event = new CustomEvent('openLoginSidebar');
        window.dispatchEvent(event);
    };

    return (
        <div className="flex justify-center items-center min-h-[calc(100vh-200px)]"> {/* Adjust min-height as needed */}
            <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md mx-auto">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Authentication Required</h2>
                <p className="text-gray-600 mb-6">
                    You need to be logged in to access the booking page. Please log in or sign up to continue.
                </p>
                {/* Changed Link to button and added onClick */}
                <button
                    type="button" // Good practice for buttons not submitting forms
                    onClick={handleOpenSidebar} // Call the function to open sidebar
                    className="inline-block px-6 py-2 bg-[#ff8c00] text-white font-medium rounded-md hover:bg-[#e07b00] transition duration-150 ease-in-out cursor-pointer" // Added cursor-pointer
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

    // --- State (Keep as is from provided code) ---
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
    const [currentUser, setCurrentUser] = useState<User | null>(null); // Keep this state to potentially pre-fill data

    // --- Authentication Check (Keep as is from provided code, added currentUser set) ---
    useEffect(() => {
        let isMounted = true;
        setIsLoadingAuth(true); // Start loading

        const checkUserSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (!isMounted) return;

                if (error) {
                    console.error("Error checking Supabase session:", error.message);
                    setIsAuthenticated(false);
                    setCurrentUser(null);
                } else if (!session) {
                    console.log("User not authenticated.");
                    setIsAuthenticated(false);
                    setCurrentUser(null);
                } else {
                    console.log("User authenticated:", session.user.id);
                    setIsAuthenticated(true);
                    setCurrentUser(session.user); // *** Set current user state ***
                    // Pre-fill form if empty
                    setBookingData(prev => ({
                        ...prev,
                        email: prev.email || session.user?.email || '',
                        name: prev.name || session.user?.user_metadata?.full_name || ''
                    }));
                }
            } catch (err) {
                 if (!isMounted) return;
                 console.error("Unexpected error during auth check:", err);
                 setIsAuthenticated(false);
                 setCurrentUser(null);
            } finally {
                if (isMounted) {
                   setIsLoadingAuth(false);
                }
            }
        };

        checkUserSession();

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (isMounted && !isLoadingAuth) {
                 const currentlyAuth = !!session;
                 if (currentlyAuth !== isAuthenticated) {
                    console.log(`Auth state changed: User is now ${currentlyAuth ? 'authenticated' : 'not authenticated'}. Updating UI.`);
                    setIsAuthenticated(currentlyAuth);
                    setCurrentUser(session?.user ?? null); // Update currentUser state
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

        return () => {
            isMounted = false;
            authListener?.subscription.unsubscribe();
        };
     // Re-added currentUser state dependency for consistency
    }, [navigate, isLoadingAuth, isAuthenticated]);


    // --- Get Current Date and Time for Min Values (Keep as is) ---
    const getMinDateTime = useCallback(() => {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        now.setHours(now.getHours() + 1); // 1-hour buffer
        const minTime = now.toTimeString().split(' ')[0].substring(0, 5);
        return { minDate: today, minTimeForToday: minTime };
    }, []);
    const { minDate, minTimeForToday } = getMinDateTime();


    // --- Validation Function (Keep as is) ---
    const validateForm = useCallback((): boolean => {
        const newErrors: Record<string, string> = {};
        const data = bookingData;

        // 1. User Info
        if (!data.name.trim()) newErrors.name = 'Full Name is required';
        if (!data.phone.trim()) newErrors.phone = 'Phone number is required';
        else if (!/^\+?[\d\s-]{10,15}$/.test(data.phone)) newErrors.phone = 'Enter a valid phone number';
        if (!data.email.trim()) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(data.email)) newErrors.email = 'Enter a valid email address';

        // 2. Pickup & Drop-Off
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
        // Conditionally require coach/seat
        if (data.deliveryPreference === 'Deliver to Seat') {
            if (!data.coachNumber.trim()) newErrors.coachNumber = 'Coach number required for seat delivery';
            if (!data.seatNumber.trim()) newErrors.seatNumber = 'Seat number required for seat delivery';
        }

        // 3. Luggage Details
        const bags = parseInt(data.numberOfBags, 10);
        if (isNaN(bags) || bags <= 0) newErrors.numberOfBags = 'Enter a valid number of bags (1 or more)';
        if (!data.weightCategory) newErrors.weightCategory = 'Select a weight category';

        // 4. Service & Payment (Section numbering corrected)
        if (!data.serviceType) newErrors.serviceType = 'Select a service type';
        if (!data.paymentMode) newErrors.paymentMode = 'Select a payment mode';


        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [bookingData, minDate, minTimeForToday]);


    // --- Handle Change (Keep as is, ensures errors clear on input) ---
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setBookingData(prevData => ({ ...prevData, [name]: checked }));
        } else {
            setBookingData(prevData => ({ ...prevData, [name]: value }));
        }

        // Clear validation error for the field being changed
        setErrors(prevErrors => {
            // Optimization: Only create new object if error exists
            if (!prevErrors[name]) return prevErrors;
            const updatedErrors = { ...prevErrors };
            delete updatedErrors[name];
            return updatedErrors;
        });
    }, []); // No dependencies needed other than closure

    // --- Handle PNR Fetch (Keep as is) ---
    const handlePnrFetch = useCallback(async () => {
        if (!bookingData.pnrNumber || !/^\d{10}$/.test(bookingData.pnrNumber)) {
            setErrors(prev => ({...prev, pnrNumber: 'Enter a valid 10-digit PNR to fetch details'}));
            return;
        }
        alert(`TODO: Implement API call to fetch details for PNR: ${bookingData.pnrNumber}`);
    }, [bookingData.pnrNumber]);


    // --- Handle Submit (Integrate ADD-ONS) ---
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAuthenticated) {
             setSubmitError("You must be logged in to submit a booking.");
             return;
        }

        setSubmitError(null); // Clear previous submission error
        setIsSubmitSuccess(false);

        // Re-validate before submitting
        const isValid = validateForm();

        if (isValid) {
            setIsSubmitting(true);
            try {
                // Use the getUser method inside try block as per the provided code
                 const { data: { user } } = await supabase.auth.getUser();
                 if (!user) {
                     // This case handles if the session becomes invalid between page load and submit
                     throw new Error("Authentication session invalid or expired. Please log in again.");
                 }

                // Use the exact dataToSubmit structure from the provided code
                const dataToSubmit = {
                    user_id: user.id, // Use the freshly fetched user ID
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
                    booking_status: 'Pending', // Default status from provided code
                };

                console.log("Submitting to Supabase:", dataToSubmit);
                console.log('Submitting with User ID:', user.id); // Keep for RLS debug

                // Keep the exact insert logic from provided code
                const { error } = await supabase
                    .from('bookings')
                    .insert([dataToSubmit]); // insert expects an array

                // RLS error would likely occur here if policy is wrong
                if (error) {
                    console.error('Supabase booking insert error:', error);
                    // ADD-ON: Clear validation errors state if the error is from Supabase
                    setErrors({});
                    throw new Error(`Booking failed: ${error.message}. Please check details or contact support.`); // Throw to catch block
                } else {
                    console.log('Booking successful!');
                    setIsSubmitSuccess(true); // Trigger success overlay

                    // Keep the exact reset logic from provided code
                    setTimeout(() => {
                       setBookingData({ // Reset form
                            name: '', phone: '', email: '', pickupLocationType: '', pickupAddress: '',
                            dropLocationType: '', dropAddress: '', pickupDate: '', pickupTime: '',
                            trainNumber: '', trainName: '', pnrNumber: '', coachNumber: '', seatNumber: '',
                            deliveryPreference: '', numberOfBags: '1', weightCategory: '',
                            specialItemsDescription: '', insuranceRequested: false, serviceType: '',
                            paymentMode: '',
                        });
                         // Re-populate email/name after reset if user is still logged in
                         if (currentUser) {
                            setBookingData(prev => ({
                                ...prev,
                                email: currentUser.email || '',
                                name: currentUser.user_metadata?.full_name || '',
                             }));
                         }
                        setErrors({});
                        setSubmitError(null);
                        setIsSubmitSuccess(false);
                        setIsSubmitting(false);
                        // navigate('/my-bookings'); // Optional redirect
                    }, 3000); // 3-second delay
                }
            } catch (err: any) {
                console.error('Error during submission process:', err);
                // ADD-ON: Set submitError state from caught error
                setSubmitError(err.message || 'An unexpected error occurred during submission.');
                setIsSubmitting(false); // Ensure submitting state is reset on error
            }
        } else {
            // Validation failed
            console.log("Validation failed", errors);
            // ADD-ON: Set generic validation error message
            setSubmitError("Please review the errors highlighted below.");

            // ADD-ON: Improved Focus Logic
             const firstErrorKey = Object.keys(errors)[0];
             if (firstErrorKey) {
                 const element = document.getElementById(firstErrorKey);
                 if (element) { // Check if element exists
                    setTimeout(() => { // Delay helps browser focus after state updates
                        element.focus({ preventScroll: true }); // Prevent default jump
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' }); // Smooth scroll to center
                    }, 50);
                 } else {
                     console.warn(`Could not find element with ID: ${firstErrorKey} to focus.`);
                 }
             }
             setIsSubmitting(false); // Stop submitting state
        }
    }, [bookingData, validateForm, navigate, isAuthenticated, currentUser]); // Added currentUser dependency for reset logic


    // --- Render Logic ---

    // 1. Loading state (Keep as is)
    if (isLoadingAuth) {
        return (
          <div className="flex justify-center items-center min-h-screen bg-gray-50">
            {/* ... Loading Spinner SVG ... */}
             <svg className="animate-spin h-10 w-10 text-[#ff8c00] mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
             <p className="text-xl text-gray-600">Checking authentication...</p>
          </div>
        );
    }

    // 2. Not authenticated -> Show Prompt (Keep as is)
    if (!isAuthenticated) {
        return <PleaseLoginPrompt />;
    }

    // 3. Submission Success Overlay (Keep as is)
    if (isSubmitSuccess) {
        return (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-green-50 text-center p-4">
             <GreenCheckmark />
            <h2 className="mt-6 text-2xl sm:text-3xl font-bold text-green-700">Booking Confirmed!</h2>
            <p className="mt-2 text-lg text-gray-600">Your BagEase booking is successful. Check your bookings page for details.</p>
             {/* Optional button */}
             {/* <button onClick={() => navigate('/my-bookings')} className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">View My Bookings</button> */}
          </div>
        );
    }

    // 4. Authenticated, show the form
    // Helper for input props (Keep as is)
    const commonInputProps = (name: keyof typeof bookingData, isRequired = true) => ({
         id: name,
        name: name,
        onChange: handleChange,
        className: `mt-1 block w-full px-3 py-2 bg-white border ${errors[name] ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#ff8c00] focus:border-[#ff8c00] sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed`,
        disabled: isSubmitting,
        required: isRequired, // Keep native validation helper
        'aria-invalid': errors[name] ? "true" : "false",
        'aria-describedby': errors[name] ? `${name}-error` : undefined,
    });

     // ADD-ON: Calculate current error count for dynamic display
    const currentErrorCount = Object.keys(errors).length;

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
                    {/* ADD-ON: General Submission/Validation Error Display */}
                    {submitError && !isSubmitSuccess && ( // Only show if not successful
                         <div className="p-3 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-md text-sm mb-6 flex" role="alert">
                            {/* Optional: Alert Icon */}
                             <svg className="flex-shrink-0 w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                            </svg>
                            <div>
                                {/* Improved Title */}
                                <p className="font-bold">
                                     {/* Distinguish between validation and other errors */}
                                     {currentErrorCount > 0 ? 'Validation Errors Found' : 'Oops! Something went wrong'}
                                </p>
                                {/* Display the main error message */}
                                <p>{submitError}</p>
                                {/* Dynamic Error Count */}
                                {currentErrorCount > 0 && (
                                     <p className="mt-1 text-xs">
                                        Please fix the {currentErrorCount} error{currentErrorCount !== 1 ? 's' : ''} marked in red below.
                                    </p>
                                )}
                             </div>
                        </div>
                    )}


                    {/* Form Sections (Keep exactly as in the provided code) */}
                    {/* === Section 1: User Information === */}
                    <fieldset className="space-y-6">
                        <legend className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
                            1. Your Contact Information
                        </legend>
                        {/* ... Name, Phone, Email inputs ... */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
                                <input type="text" {...commonInputProps('name', true)} value={bookingData.name} placeholder="e.g., Priya Sharma" autoComplete="name" />
                                {errors.name && <p id="name-error" className="mt-1 text-xs text-red-600">{errors.name}</p>}
                            </div>
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number</label>
                                <input type="tel" {...commonInputProps('phone', true)} value={bookingData.phone} placeholder="e.g., 9876543210" autoComplete="tel" />
                                {errors.phone && <p id="phone-error" className="mt-1 text-xs text-red-600">{errors.phone}</p>}
                            </div>
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                            <input type="email" {...commonInputProps('email', true)} value={bookingData.email} placeholder="you@example.com" autoComplete="email"/>
                            {errors.email && <p id="email-error" className="mt-1 text-xs text-red-600">{errors.email}</p>}
                        </div>
                    </fieldset>

                    {/* === Section 2: Pickup & Drop-Off Details === */}
                    <fieldset className="space-y-6 border-t border-gray-200 pt-6">
                         <legend className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
                            2. Pickup & Drop-Off Details
                        </legend>
                         {/* ... All fields from section 2 - unchanged ... */}
                          {/* Pickup Location */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="pickupLocationType" className="block text-sm font-medium text-gray-700">Pickup From</label>
                                <select {...commonInputProps('pickupLocationType', true)} value={bookingData.pickupLocationType}>
                                    <option value="" disabled>-- Select Type --</option>
                                    <option value="Home">Home</option>
                                    <option value="Hotel">Hotel</option>
                                    <option value="Station">Train Station</option>
                                    <option value="Office">Office</option>
                                    <option value="Other">Other</option>
                                </select>
                                {errors.pickupLocationType && <p id="pickupLocationType-error" className="mt-1 text-xs text-red-600">{errors.pickupLocationType}</p>}
                            </div>
                            <div>
                                <label htmlFor="pickupAddress" className="block text-sm font-medium text-gray-700">Pickup Address / Location Name</label>
                                <input type="text" {...commonInputProps('pickupAddress', true)} value={bookingData.pickupAddress} placeholder="Full Address or Station Name" />
                                {errors.pickupAddress && <p id="pickupAddress-error" className="mt-1 text-xs text-red-600">{errors.pickupAddress}</p>}
                            </div>
                        </div>

                        {/* Drop-off Location */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                <label htmlFor="dropLocationType" className="block text-sm font-medium text-gray-700">Drop-off At</label>
                                <select {...commonInputProps('dropLocationType', true)} value={bookingData.dropLocationType}>
                                    <option value="" disabled>-- Select Type --</option>
                                    <option value="Station">Train Station</option>
                                    <option value="Home">Home</option>
                                    <option value="Hotel">Hotel</option>
                                    <option value="Other">Other</option>
                                </select>
                                {errors.dropLocationType && <p id="dropLocationType-error" className="mt-1 text-xs text-red-600">{errors.dropLocationType}</p>}
                            </div>
                            <div>
                                <label htmlFor="dropAddress" className="block text-sm font-medium text-gray-700">Drop-off Address / Location Name</label>
                                <input type="text" {...commonInputProps('dropAddress', true)} value={bookingData.dropAddress} placeholder="Full Address or Station Name" />
                                {errors.dropAddress && <p id="dropAddress-error" className="mt-1 text-xs text-red-600">{errors.dropAddress}</p>}
                            </div>
                        </div>

                        {/* Date & Time */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="pickupDate" className="block text-sm font-medium text-gray-700">Pickup Date</label>
                                <input type="date" {...commonInputProps('pickupDate', true)} value={bookingData.pickupDate} min={minDate} />
                                {errors.pickupDate && <p id="pickupDate-error" className="mt-1 text-xs text-red-600">{errors.pickupDate}</p>}
                            </div>
                            <div>
                                <label htmlFor="pickupTime" className="block text-sm font-medium text-gray-700">Pickup Time</label>
                                <input type="time" {...commonInputProps('pickupTime', true)} value={bookingData.pickupTime} min={bookingData.pickupDate === minDate ? minTimeForToday : undefined} />
                                {errors.pickupTime && <p id="pickupTime-error" className="mt-1 text-xs text-red-600">{errors.pickupTime}</p>}
                            </div>
                        </div>

                        {/* Train Details */}
                        <h3 className="text-md font-medium text-gray-700 pt-4 border-t border-gray-100 mt-4">Train Details (If Applicable)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div>
                                <label htmlFor="trainNumber" className="block text-sm font-medium text-gray-700">Train Number</label>
                                <input type="text" {...commonInputProps('trainNumber', true)} value={bookingData.trainNumber} placeholder="e.g., 12345" inputMode="numeric" pattern="\d*" />
                                {errors.trainNumber && <p id="trainNumber-error" className="mt-1 text-xs text-red-600">{errors.trainNumber}</p>}
                            </div>
                             <div>
                                <label htmlFor="trainName" className="block text-sm font-medium text-gray-700">Train Name <span className="text-xs text-gray-500">(Optional)</span></label>
                                <input type="text" {...commonInputProps('trainName', false)} value={bookingData.trainName} placeholder="e.g., Rajdhani Express" />
                            </div>
                        </div>
                         <div className="relative">
                            <label htmlFor="pnrNumber" className="block text-sm font-medium text-gray-700">PNR Number <span className="text-xs text-gray-500">(Optional)</span></label>
                            <input
                                type="text"
                                {...commonInputProps('pnrNumber', false)}
                                value={bookingData.pnrNumber}
                                placeholder="10-digit PNR"
                                maxLength={10}
                                inputMode="numeric" pattern="\d{10}"
                            />
                            {errors.pnrNumber && <p id="pnrNumber-error" className="mt-1 text-xs text-red-600">{errors.pnrNumber}</p>}
                        </div>

                        {/* Coach/Seat conditionally required */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                <label htmlFor="coachNumber" className="block text-sm font-medium text-gray-700">
                                    Coach {bookingData.deliveryPreference === 'Deliver to Seat' && <span className="text-red-600 text-xs">*</span>} <span className="text-xs text-gray-500">(Required if 'Deliver to Seat')</span>
                                </label>
                                <input
                                    type="text"
                                    {...commonInputProps('coachNumber', bookingData.deliveryPreference === 'Deliver to Seat')}
                                    value={bookingData.coachNumber}
                                    placeholder="e.g., S5"
                                    maxLength={5} /> {/* Increased maxLength slightly */}
                                {errors.coachNumber && <p id="coachNumber-error" className="mt-1 text-xs text-red-600">{errors.coachNumber}</p>}
                            </div>
                             <div>
                                <label htmlFor="seatNumber" className="block text-sm font-medium text-gray-700">
                                    Seat {bookingData.deliveryPreference === 'Deliver to Seat' && <span className="text-red-600 text-xs">*</span>} <span className="text-xs text-gray-500">(Required if 'Deliver to Seat')</span>
                                </label>
                                <input
                                    type="text"
                                     {...commonInputProps('seatNumber', bookingData.deliveryPreference === 'Deliver to Seat')}
                                     value={bookingData.seatNumber}
                                     placeholder="e.g., 32"
                                     maxLength={4} inputMode="numeric" pattern="\d*" /> {/* Increased maxLength slightly */}
                                {errors.seatNumber && <p id="seatNumber-error" className="mt-1 text-xs text-red-600">{errors.seatNumber}</p>}
                            </div>
                        </div>

                        {/* Delivery Preference */}
                        <div>
                            <label htmlFor="deliveryPreference" className="block text-sm font-medium text-gray-700">Delivery Preference at Destination Station</label>
                            <select {...commonInputProps('deliveryPreference', true)} value={bookingData.deliveryPreference}>
                                <option value="" disabled>-- Select Preference --</option>
                                <option value="Deliver to Seat">Deliver to My Seat</option>
                                <option value="Collect from Kiosk">I will Collect from Station Kiosk</option>
                                <option value="Store in Transit">Store Temporarily (e.g., if train delayed)</option>
                            </select>
                             {errors.deliveryPreference && <p id="deliveryPreference-error" className="mt-1 text-xs text-red-600">{errors.deliveryPreference}</p>}
                        </div>
                    </fieldset>

                    {/* === Section 3: Luggage Details === */}
                    <fieldset className="space-y-6 border-t border-gray-200 pt-6">
                        <legend className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
                            3. Luggage Details
                        </legend>
                        {/* ... All fields from section 3 - unchanged ... */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="numberOfBags" className="block text-sm font-medium text-gray-700">Number of Bags</label>
                                <input type="number" {...commonInputProps('numberOfBags', true)} value={bookingData.numberOfBags} min="1" max="20" step="1" placeholder="1" inputMode="numeric" />
                                {errors.numberOfBags && <p id="numberOfBags-error" className="mt-1 text-xs text-red-600">{errors.numberOfBags}</p>}
                            </div>
                             <div>
                                <label htmlFor="weightCategory" className="block text-sm font-medium text-gray-700">Total Weight (Approx)</label>
                                <select {...commonInputProps('weightCategory', true)} value={bookingData.weightCategory}>
                                    <option value="" disabled>-- Select Weight --</option>
                                    <option value="0-10kg">Up to 10 kg</option>
                                    <option value="10-20kg">10 - 20 kg</option>
                                    <option value="20kg+">More than 20 kg</option>
                                </select>
                                 {errors.weightCategory && <p id="weightCategory-error" className="mt-1 text-xs text-red-600">{errors.weightCategory}</p>}
                            </div>
                        </div>
                        <div>
                            <label htmlFor="specialItemsDescription" className="block text-sm font-medium text-gray-700">Special Handling Notes <span className="text-xs text-gray-500">(Optional)</span></label>
                             <textarea
                                {...commonInputProps('specialItemsDescription', false)}
                                value={bookingData.specialItemsDescription}
                                rows={3}
                                placeholder="e.g., Fragile items inside, handle with care..."
                             ></textarea>
                        </div>
                        <div className="relative flex items-start">
                            <div className="flex items-center h-5">
                               <input
                                    id="insuranceRequested"
                                    name="insuranceRequested"
                                    type="checkbox"
                                    checked={bookingData.insuranceRequested}
                                    onChange={handleChange}
                                    disabled={isSubmitting}
                                    className="focus:ring-[#ff8c00] h-4 w-4 text-[#ff8c00] border-gray-300 rounded disabled:opacity-50 cursor-pointer"
                                />
                           </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="insuranceRequested" className="font-medium text-gray-700 cursor-pointer">
                                    Add Luggage Insurance?
                                </label>
                                <p className="text-xs text-gray-500">(Optional, additional charges may apply)</p>
                            </div>
                        </div>
                    </fieldset>

                    {/* === Section 4: Service & Payment === */}
                    <fieldset className="space-y-6 border-t border-gray-200 pt-6">
                        <legend className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
                            4. Service & Payment
                        </legend>
                         {/* ... All fields from section 4 - unchanged ... */}
                           <div>
                            <label htmlFor="serviceType" className="block text-sm font-medium text-gray-700">Service Speed</label>
                            <select {...commonInputProps('serviceType', true)} value={bookingData.serviceType}>
                                <option value="" disabled>-- Select Service --</option>
                                <option value="Standard">Standard</option>
                                <option value="Express">Express (Faster)</option>
                            </select>
                             {errors.serviceType && <p id="serviceType-error" className="mt-1 text-xs text-red-600">{errors.serviceType}</p>}
                        </div>
                        <div>
                            <label htmlFor="paymentMode" className="block text-sm font-medium text-gray-700">Preferred Payment Method</label>
                            <select {...commonInputProps('paymentMode', true)} value={bookingData.paymentMode}>
                                <option value="" disabled>-- Select Payment --</option>
                                <option value="UPI">UPI</option>
                                <option value="Card">Debit/Credit Card</option>
                                <option value="NetBanking">Net Banking</option>
                                <option value="Wallet">Mobile Wallet</option>
                                <option value="POD">Pay on Delivery/Pickup</option>
                            </select>
                             {errors.paymentMode && <p id="paymentMode-error" className="mt-1 text-xs text-red-600">{errors.paymentMode}</p>}
                        </div>
                    </fieldset>

                    {/* === Submit Button (Keep as is) === */}
                    <div className="pt-5 border-t border-gray-200">
                        <button
                            type="submit"
                            className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-base font-medium rounded-md text-white bg-[#ff8c00] hover:bg-[#e07b00] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff8c00] ${isSubmitting || !isAuthenticated ? 'opacity-60 cursor-wait' : 'transition duration-150 ease-in-out'}`}
                            disabled={isSubmitting || !isAuthenticated}
                        >
                            {isSubmitting ? (
                                <>
                                    {/* ... Loading SVG ... */}
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing Booking...
                                </>
                            ) : (
                                'Confirm Booking' // Changed back from "Confirm & Proceed to Payment"
                            )}
                        </button>
                    </div>

                     {/* --- Footer Info (Keep as is) --- */}
                     <div className="text-center text-xs text-gray-500 pt-4">
                         <p>By clicking confirm, you agree to BagEase's <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#ff8c00] hover:underline">Terms of Service</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#ff8c00] hover:underline">Privacy Policy</a>.</p>
                         <p className="mt-1">Need help? Call us at <a href="tel:+91XXXXXXXXXX" className="text-[#ff8c00] hover:underline">+91-XXX-XXXXXXX</a> or visit our <a href="/help" target="_blank" rel="noopener noreferrer" className="text-[#ff8c00] hover:underline">Help Center</a>.</p>
                     </div>
                </form> {/* --- Form End --- */}
            </div>
        </div> // --- Main Container End ---
    );
};

export default Book;