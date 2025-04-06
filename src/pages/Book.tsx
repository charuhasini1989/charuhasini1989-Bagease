import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

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
// *** MODIFIED PleaseLoginPrompt ***
const PleaseLoginPrompt = () => {
    // Function to dispatch the custom event
    const handleOpenSidebar = () => {
        const event = new CustomEvent('openLoginSidebar');
        window.dispatchEvent(event);
    };

    return (
        <div className="flex justify-center items-center min-h-[calc(100vh-200px)] px-4"> {/* Added padding for smaller screens */}
            <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md w-full mx-auto"> {/* Added w-full */}
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
    // const [fetchedTrainDetails, setFetchedTrainDetails] = useState(null);

    // --- Authentication Check ---
    useEffect(() => {
        let isMounted = true;
        // Set initial loading state immediately
        // setIsLoadingAuth(true); // Already set in useState initial value

        const checkUserSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (!isMounted) return;

                if (error) {
                    console.error("Error checking Supabase session:", error.message);
                    setIsAuthenticated(false);
                } else if (!session) {
                    console.log("User not authenticated.");
                    setIsAuthenticated(false);
                } else {
                    console.log("User authenticated.");
                    setIsAuthenticated(true);
                    // Pre-fill only if the fields are currently empty
                    setBookingData(prev => ({
                        ...prev,
                        email: prev.email || session.user?.email || '',
                        name: prev.name || session.user?.user_metadata?.full_name || ''
                    }));
                }
            } catch (err) {
                 if (!isMounted) return;
                 console.error("Unexpected error during auth check:", err);
                 setIsAuthenticated(false); // Assume not authenticated on unexpected error
            } finally {
                if (isMounted) {
                   setIsLoadingAuth(false); // Turn off loading regardless of outcome
                }
            }
        };

        checkUserSession();

        // Listener for auth state changes (login/logout during component lifetime)
        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (isMounted) {
                 const currentlyAuth = !!session;
                 if (currentlyAuth !== isAuthenticated) { // Only update if state actually changes
                    console.log(`Auth state changed via listener: User is now ${currentlyAuth ? 'authenticated' : 'not authenticated'}.`);
                    setIsAuthenticated(currentlyAuth);
                    if (currentlyAuth && session) {
                         setBookingData(prev => ({
                            ...prev,
                            // Re-apply or update user details on login event
                            email: prev.email || session.user?.email || '',
                            name: prev.name || session.user?.user_metadata?.full_name || ''
                        }));
                    } else if (!currentlyAuth) {
                        // Optional: Clear user-specific fields on logout?
                        // setBookingData(prev => ({ ...prev, name: '', email: '' })); // Consider UX implications
                    }
                 }
            }
        });

        // Cleanup function
        return () => {
            isMounted = false;
            authListener?.subscription.unsubscribe();
            console.log("Auth listener unsubscribed and component unmounted.");
        };
        // Rerun effect if navigate changes (unlikely but safe).
        // DO NOT include isLoadingAuth or isAuthenticated here as they are managed *within* the effect,
        // adding them would cause unnecessary reruns or potential loops.
    }, [navigate]); // Keep dependencies minimal


    // --- Get Current Date and Time for Min Values ---
    const getMinDateTime = useCallback(() => {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        // Set buffer (e.g., 1 hour from now)
        now.setHours(now.getHours() + 1);
        const minTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format
        return { minDate: today, minTimeForToday: minTime };
    }, []);
    const { minDate, minTimeForToday } = getMinDateTime();


    // --- Validation Function ---
    const validateForm = useCallback((): boolean => {
        const newErrors: Record<string, string> = {};
        const data = bookingData;

        // 1. User Info
        if (!data.name.trim()) newErrors.name = 'Full Name is required';
        if (!data.phone.trim()) newErrors.phone = 'Phone number is required';
        else if (!/^\+?[\d\s-]{10,15}$/.test(data.phone)) newErrors.phone = 'Enter a valid phone number (10-15 digits, optional +)';
        if (!data.email.trim()) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(data.email)) newErrors.email = 'Enter a valid email address';

        // 2. Pickup & Drop-Off
        if (!data.pickupLocationType) newErrors.pickupLocationType = 'Select pickup location type';
        if (!data.pickupAddress.trim()) newErrors.pickupAddress = 'Pickup address/location name is required';
        if (!data.dropLocationType) newErrors.dropLocationType = 'Select drop-off location type';
        if (!data.dropAddress.trim()) newErrors.dropAddress = 'Drop-off address/location name is required';
        if (!data.pickupDate) newErrors.pickupDate = 'Pickup date is required';
        else {
             // Check if date is in the past (comparing date part only)
             const selectedDate = new Date(data.pickupDate + 'T00:00:00'); // Normalize to start of day
             const today = new Date(minDate + 'T00:00:00'); // Normalize today to start of day
             if (selectedDate < today) {
                 newErrors.pickupDate = 'Pickup date cannot be in the past';
             }
        }
        if (!data.pickupTime) newErrors.pickupTime = 'Pickup time is required';
        // Check if time is in the past *only if* the date is today
        else if (data.pickupDate === minDate && data.pickupTime < minTimeForToday) {
            newErrors.pickupTime = `Time cannot be earlier than ${minTimeForToday} for today's date`;
        }

        // Train details - Train number is mandatory now
        if (!data.trainNumber.trim()) newErrors.trainNumber = 'Train number is required';
        // PNR validation only if provided
        if (data.pnrNumber.trim() && !/^\d{10}$/.test(data.pnrNumber.trim())) {
            newErrors.pnrNumber = 'PNR must be exactly 10 digits if provided';
        }

        // Delivery Preference
        if (!data.deliveryPreference) newErrors.deliveryPreference = 'Select a delivery preference';
        // Conditionally require coach/seat based on delivery preference
        if (data.deliveryPreference === 'Deliver to Seat') {
            if (!data.coachNumber.trim()) newErrors.coachNumber = 'Coach number is required for seat delivery';
            if (!data.seatNumber.trim()) newErrors.seatNumber = 'Seat number is required for seat delivery';
        }

        // 3. Luggage Details
        const bags = parseInt(data.numberOfBags, 10);
        if (isNaN(bags) || bags <= 0) {
             newErrors.numberOfBags = 'Enter a valid number of bags (at least 1)';
        } else if (bags > 20) { // Example upper limit
             newErrors.numberOfBags = 'Maximum 20 bags allowed per booking';
        }
        if (!data.weightCategory) newErrors.weightCategory = 'Select an approximate total weight category';

        // 4. Service & Payment
        if (!data.serviceType) newErrors.serviceType = 'Select a service speed';
        if (!data.paymentMode) newErrors.paymentMode = 'Select a preferred payment method';

        setErrors(newErrors);
        // Return true if the errors object is empty
        return Object.keys(newErrors).length === 0;
    }, [bookingData, minDate, minTimeForToday]); // Dependencies for validation logic


    // --- Handle Change ---
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;

        // Handle checkbox separately
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setBookingData(prevData => ({ ...prevData, [name]: checked }));
        } else {
            setBookingData(prevData => ({ ...prevData, [name]: value }));
        }

        // Optimistic validation: Clear error for the field being changed
        // Useful especially after a failed submit attempt
        setErrors(prevErrors => {
            if (prevErrors[name]) {
                 const updatedErrors = { ...prevErrors };
                 delete updatedErrors[name]; // Remove the specific error
                 return updatedErrors;
            }
            return prevErrors; // Return unchanged errors if no error existed for this field
        });

    }, []); // No external dependencies needed here


    // --- Handle PNR Fetch (Placeholder) ---
    const handlePnrFetch = useCallback(async () => {
        if (!bookingData.pnrNumber || !/^\d{10}$/.test(bookingData.pnrNumber)) {
            setErrors(prev => ({...prev, pnrNumber: 'Enter a valid 10-digit PNR to fetch details'}));
            // Focus the PNR input if invalid for fetch attempt
            document.getElementById('pnrNumber')?.focus();
            return;
        }
        alert(`TODO: Implement API call to fetch details for PNR: ${bookingData.pnrNumber}`);
        // Placeholder logic - replace with actual API call
        // try {
        //   console.log(`Fetching details for PNR: ${bookingData.pnrNumber}`);
        //   // const details = await fetchPnrDetails(bookingData.pnrNumber);
        //   // setFetchedTrainDetails(details); // Store fetched details if needed
        //   // setBookingData(prev => ({
        //   //   ...prev,
        //   //   trainName: details.trainName || prev.trainName, // Update relevant fields
        //   //   trainNumber: details.trainNumber || prev.trainNumber,
        //   // }));
        //   // // Clear potential PNR error after successful fetch attempt (even if API fails later)
        //   // setErrors(prev => {
        //   //     const updated = {...prev};
        //   //     delete updated.pnrNumber;
        //   //     return updated;
        //   // });
        // } catch (error) {
        //   console.error("PNR fetch failed:", error);
        //   setErrors(prev => ({ ...prev, pnrNumber: 'Failed to fetch PNR details. Please check the number or enter manually.' }));
        // }
    }, [bookingData.pnrNumber]); // Depends on the PNR number


    // --- Handle Submit ---
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault(); // Prevent default form submission

        // First: Check authentication
        if (!isAuthenticated) {
             setSubmitError("You must be logged in to submit a booking. Please use the login button.");
             // Optionally, trigger the login sidebar automatically
             // handleOpenSidebar(); // If PleaseLoginPrompt's function is accessible or duplicated here
             return;
        }

        // Clear previous submission errors and success state
        setSubmitError(null);
        setIsSubmitSuccess(false);

        // Validate the form
        const isFormValid = validateForm();

        if (isFormValid) {
            setIsSubmitting(true); // Indicate submission is in progress
            try {
                 // Double-check user exists before submitting (good practice)
                 const { data: { user } } = await supabase.auth.getUser();
                 if (!user) {
                     // This case might happen if the session expires *exactly* between auth check and submit
                     throw new Error("Authentication session expired or invalid. Please log in again.");
                 }

                // Prepare data for Supabase (ensure types match DB schema)
                const dataToSubmit = {
                    user_id: user.id,
                    name: bookingData.name.trim(),
                    phone: bookingData.phone.trim(),
                    email: bookingData.email.trim(),
                    pickup_location_type: bookingData.pickupLocationType,
                    pickup_address: bookingData.pickupAddress.trim(),
                    drop_location_type: bookingData.dropLocationType,
                    drop_address: bookingData.dropAddress.trim(),
                    pickup_date: bookingData.pickupDate, // Should be 'YYYY-MM-DD' string
                    pickup_time: bookingData.pickupTime, // Should be 'HH:MM' string
                    train_number: bookingData.trainNumber.trim(),
                    train_name: bookingData.trainName.trim() || null, // Send null if empty
                    pnr_number: bookingData.pnrNumber.trim() || null,
                    coach_number: bookingData.coachNumber.trim() || null,
                    seat_number: bookingData.seatNumber.trim() || null,
                    delivery_preference: bookingData.deliveryPreference,
                    number_of_bags: parseInt(bookingData.numberOfBags, 10), // Ensure integer
                    weight_category: bookingData.weightCategory,
                    special_items_description: bookingData.specialItemsDescription.trim() || null,
                    insurance_requested: bookingData.insuranceRequested, // Boolean
                    service_type: bookingData.serviceType,
                    payment_mode: bookingData.paymentMode,
                    booking_status: 'Pending', // Default status
                    // estimated_cost: 0, // Calculate or set later if needed
                };

                console.log("Submitting booking data to Supabase:", dataToSubmit);

                // Perform the insert operation
                const { error: insertError } = await supabase
                    .from('bookings') // Ensure 'bookings' is your table name
                    .insert([dataToSubmit]); // insert expects an array of objects

                if (insertError) {
                    console.error('Supabase booking insert error:', insertError);
                    // Provide a user-friendly error message
                    setSubmitError(`Booking failed: ${insertError.message}. Please check your details or try again later.`);
                    setIsSubmitting(false); // Re-enable form
                } else {
                    // --- Success ---
                    console.log('Booking successful!');
                    setIsSubmitSuccess(true); // Trigger success overlay

                    // Set a timer to hide the success message and reset the form
                    setTimeout(() => {
                       setIsSubmitSuccess(false); // Hide success message
                       // Reset form fields to initial state
                       setBookingData({
                            name: '', phone: '', email: '', // Keep logged-in user's name/email? Or clear?
                            pickupLocationType: '', pickupAddress: '',
                            dropLocationType: '', dropAddress: '', pickupDate: '', pickupTime: '',
                            trainNumber: '', trainName: '', pnrNumber: '', coachNumber: '', seatNumber: '',
                            deliveryPreference: '', numberOfBags: '1', weightCategory: '',
                            specialItemsDescription: '', insuranceRequested: false, serviceType: '',
                            paymentMode: '',
                        });
                       setErrors({}); // Clear any validation errors
                       setSubmitError(null); // Clear any submission error
                       setIsSubmitting(false); // Re-enable form
                       // Optional: Redirect user after success
                       // navigate('/my-bookings');
                       window.scrollTo(0, 0); // Scroll to top after reset/redirect
                    }, 3000); // Show success message for 3 seconds
                }
            } catch (err: any) {
                // Catch errors from getUser() or unexpected issues
                console.error('Error during submission process:', err);
                setSubmitError(err.message || 'An unexpected error occurred during submission. Please try again.');
                setIsSubmitting(false); // Re-enable form
            }
        } else {
            // --- Validation Failed ---
            console.log("Form validation failed", errors);
            // Set a general error message
            setSubmitError("Please fix the errors highlighted below before submitting.");

            // *** Focus and Scroll to the First Error ***
            // Get the keys of the fields with errors
            const errorKeys = Object.keys(errors);
            if (errorKeys.length > 0) {
                const firstErrorKey = errorKeys[0]; // Get the first key (usually top-most error)
                const elementToFocus = document.getElementById(firstErrorKey);

                if (elementToFocus) {
                    // Scroll the element into view smoothly, centered if possible
                    elementToFocus.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Focus the element after scrolling
                    elementToFocus.focus({ preventScroll: true }); // preventScroll avoids jumpy behavior
                } else {
                    // Fallback if element not found (shouldn't happen if IDs are correct)
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            } else {
                 // Fallback scroll to top if no specific error key found (unlikely)
                  window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    }, [bookingData, errors, validateForm, navigate, isAuthenticated]); // Include `errors` in deps for the scroll logic


    // --- Render Logic ---

    // 1. Loading Authentication State
    if (isLoadingAuth) {
        return (
          <div className="flex justify-center items-center min-h-screen bg-gray-50">
            <div className="text-center">
                 <svg className="animate-spin h-10 w-10 text-[#ff8c00] mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
                 <p className="text-xl text-gray-600">Loading Your Booking Form...</p>
            </div>
          </div>
        );
    }

    // 2. Not Authenticated -> Show Login Prompt
    if (!isAuthenticated) {
        // Use the custom prompt component which triggers the sidebar event
        return <PleaseLoginPrompt />;
    }

    // 3. Submission Success Overlay
    if (isSubmitSuccess) {
        return (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-green-50 text-center p-4">
             <GreenCheckmark />
            <h2 className="mt-6 text-2xl sm:text-3xl font-bold text-green-700">Booking Confirmed!</h2>
            <p className="mt-2 text-lg text-gray-600 max-w-md">
                Your BagEase booking request has been received successfully. We'll notify you once it's processed. You can track its status on your 'My Bookings' page.
            </p>
            {/* Optional button to navigate */}
            <button
                onClick={() => navigate('/my-bookings')} // Example navigation
                className="mt-6 px-5 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 transition duration-150 ease-in-out"
             >
                View My Bookings
             </button>
          </div>
        );
    }

    // 4. Authenticated -> Show the Booking Form
    // Helper function to generate common input props, including ARIA attributes for errors
    const commonInputProps = (name: keyof typeof bookingData, isRequired = true) => ({
         id: name, // Crucial for label association and error focusing
        name: name,
        onChange: handleChange,
        className: `mt-1 block w-full px-3 py-2 bg-white border ${
            errors[name]
             ? 'border-red-500 ring-1 ring-red-500' // Enhanced error styling
             : 'border-gray-300 focus:border-[#ff8c00]'
        } rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#ff8c00] sm:text-sm disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed`,
        disabled: isSubmitting, // Disable inputs during submission
        required: isRequired, // Basic HTML5 validation (use sparingly if custom validation is primary)
        'aria-invalid': errors[name] ? "true" : "false", // Accessibility: indicates invalid input
        'aria-describedby': errors[name] ? `${name}-error` : undefined, // Links input to its error message
    });

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                 <h1 className="text-center text-3xl font-extrabold text-gray-900 mb-2">
                    Book Your BagEase Service
                </h1>
                <p className="text-center text-sm text-gray-600 mb-8">
                    Fill in the details below to arrange your baggage transfer. Fields marked <span className="text-red-500">*</span> are required.
                </p>

                {/* --- FORM START --- */}
                <form onSubmit={handleSubmit} noValidate className="bg-white p-6 sm:p-8 rounded-lg shadow-lg space-y-8">

                     {/* General Submission Error Display Area */}
                    {submitError && (
                        <div
                            id="form-submit-error" // Add an ID for potential focus/scroll target
                            className="p-4 bg-red-50 border-l-4 border-red-500 text-red-800 rounded-md"
                            role="alert" // Accessibility: indicates an alert message
                            aria-live="assertive" // Accessibility: announces the error immediately
                        >
                            <p className="font-bold">Booking Issue</p>
                            <p>{submitError}</p>
                        </div>
                    )}

                    {/* === Section 1: User Information === */}
                    <fieldset className="space-y-6">
                        <legend className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
                            1. Your Contact Information
                        </legend>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name <span className="text-red-500">*</span></label>
                                <input type="text" {...commonInputProps('name', true)} value={bookingData.name} placeholder="e.g., Priya Sharma" autoComplete="name" />
                                {errors.name && <p id="name-error" className="mt-1 text-xs text-red-600" role="alert">{errors.name}</p>}
                            </div>
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number <span className="text-red-500">*</span></label>
                                <input type="tel" {...commonInputProps('phone', true)} value={bookingData.phone} placeholder="e.g., 9876543210" autoComplete="tel" />
                                {errors.phone && <p id="phone-error" className="mt-1 text-xs text-red-600" role="alert">{errors.phone}</p>}
                            </div>
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address <span className="text-red-500">*</span></label>
                            <input type="email" {...commonInputProps('email', true)} value={bookingData.email} placeholder="you@example.com" autoComplete="email" readOnly={!!bookingData.email} className={commonInputProps('email', true).className + (bookingData.email ? ' bg-gray-100' : '')} />
                            {errors.email && <p id="email-error" className="mt-1 text-xs text-red-600" role="alert">{errors.email}</p>}
                            {/* Optional: Add a note if email is pre-filled and read-only */}
                            {bookingData.email && <p className="mt-1 text-xs text-gray-500">Email pre-filled from your account.</p>}
                        </div>
                    </fieldset>

                    {/* === Section 2: Pickup & Drop-Off Details === */}
                    <fieldset className="space-y-6 border-t border-gray-200 pt-6">
                         <legend className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
                            2. Pickup & Drop-Off Details
                        </legend>

                          {/* Pickup Location */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="pickupLocationType" className="block text-sm font-medium text-gray-700">Pickup From <span className="text-red-500">*</span></label>
                                <select {...commonInputProps('pickupLocationType', true)} value={bookingData.pickupLocationType}>
                                    <option value="" disabled>-- Select Type --</option>
                                    <option value="Home">Home</option>
                                    <option value="Hotel">Hotel</option>
                                    <option value="Station">Train Station</option>
                                    <option value="Office">Office</option>
                                    <option value="Other">Other</option>
                                </select>
                                {errors.pickupLocationType && <p id="pickupLocationType-error" className="mt-1 text-xs text-red-600" role="alert">{errors.pickupLocationType}</p>}
                            </div>
                            <div>
                                <label htmlFor="pickupAddress" className="block text-sm font-medium text-gray-700">Pickup Address / Location Name <span className="text-red-500">*</span></label>
                                <input type="text" {...commonInputProps('pickupAddress', true)} value={bookingData.pickupAddress} placeholder="Full Address or Station Name" />
                                {errors.pickupAddress && <p id="pickupAddress-error" className="mt-1 text-xs text-red-600" role="alert">{errors.pickupAddress}</p>}
                            </div>
                        </div>

                        {/* Drop-off Location */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                <label htmlFor="dropLocationType" className="block text-sm font-medium text-gray-700">Drop-off At <span className="text-red-500">*</span></label>
                                <select {...commonInputProps('dropLocationType', true)} value={bookingData.dropLocationType}>
                                    <option value="" disabled>-- Select Type --</option>
                                    <option value="Station">Train Station</option>
                                    <option value="Home">Home</option>
                                    <option value="Hotel">Hotel</option>
                                     <option value="Office">Office</option>
                                    <option value="Other">Other</option>
                                </select>
                                {errors.dropLocationType && <p id="dropLocationType-error" className="mt-1 text-xs text-red-600" role="alert">{errors.dropLocationType}</p>}
                            </div>
                            <div>
                                <label htmlFor="dropAddress" className="block text-sm font-medium text-gray-700">Drop-off Address / Location Name <span className="text-red-500">*</span></label>
                                <input type="text" {...commonInputProps('dropAddress', true)} value={bookingData.dropAddress} placeholder="Full Address or Station Name" />
                                {errors.dropAddress && <p id="dropAddress-error" className="mt-1 text-xs text-red-600" role="alert">{errors.dropAddress}</p>}
                            </div>
                        </div>

                        {/* Date & Time */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="pickupDate" className="block text-sm font-medium text-gray-700">Pickup Date <span className="text-red-500">*</span></label>
                                <input type="date" {...commonInputProps('pickupDate', true)} value={bookingData.pickupDate} min={minDate} />
                                {errors.pickupDate && <p id="pickupDate-error" className="mt-1 text-xs text-red-600" role="alert">{errors.pickupDate}</p>}
                            </div>
                            <div>
                                <label htmlFor="pickupTime" className="block text-sm font-medium text-gray-700">Pickup Time <span className="text-red-500">*</span></label>
                                <input type="time" {...commonInputProps('pickupTime', true)} value={bookingData.pickupTime} min={bookingData.pickupDate === minDate ? minTimeForToday : undefined} />
                                {errors.pickupTime && <p id="pickupTime-error" className="mt-1 text-xs text-red-600" role="alert">{errors.pickupTime}</p>}
                            </div>
                        </div>

                        {/* Train Details */}
                        <h3 className="text-md font-medium text-gray-700 pt-4 border-t border-gray-100 mt-4">Train Details (Mandatory)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div>
                                <label htmlFor="trainNumber" className="block text-sm font-medium text-gray-700">Train Number <span className="text-red-500">*</span></label>
                                <input type="text" {...commonInputProps('trainNumber', true)} value={bookingData.trainNumber} placeholder="e.g., 12345" />
                                {errors.trainNumber && <p id="trainNumber-error" className="mt-1 text-xs text-red-600" role="alert">{errors.trainNumber}</p>}
                            </div>
                             <div>
                                <label htmlFor="trainName" className="block text-sm font-medium text-gray-700">Train Name <span className="text-xs text-gray-500">(Optional)</span></label>
                                <input type="text" {...commonInputProps('trainName', false)} value={bookingData.trainName} placeholder="e.g., Rajdhani Express" />
                                {/* No error display needed for optional field */}
                            </div>
                        </div>
                         <div className="relative">
                            <label htmlFor="pnrNumber" className="block text-sm font-medium text-gray-700">PNR Number <span className="text-xs text-gray-500">(Optional, 10 digits)</span></label>
                            <input
                                type="text" // Use text for easier input, validation handles format
                                {...commonInputProps('pnrNumber', false)} // PNR is optional
                                value={bookingData.pnrNumber}
                                placeholder="10-digit PNR"
                                maxLength={10}
                                pattern="\d{10}" // Basic HTML5 pattern for visual cue, validation handles logic
                                title="Please enter a 10-digit PNR number if available."
                            />
                            {/* PNR Fetch Button - Uncomment and implement if needed */}
                            {/* <button
                                type="button"
                                onClick={handlePnrFetch}
                                disabled={isSubmitting || !bookingData.pnrNumber || bookingData.pnrNumber.length !== 10}
                                className="absolute right-2 top-7 px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
                            >
                                Fetch Info
                            </button> */}
                            {errors.pnrNumber && <p id="pnrNumber-error" className="mt-1 text-xs text-red-600" role="alert">{errors.pnrNumber}</p>}
                        </div>

                        {/* Coach/Seat conditionally required */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                <label htmlFor="coachNumber" className="block text-sm font-medium text-gray-700">
                                    Coach {bookingData.deliveryPreference === 'Deliver to Seat' && <span className="text-red-500">*</span>}
                                    <span className="text-xs text-gray-500 ml-1">(Required if 'Deliver to Seat')</span>
                                </label>
                                <input
                                    type="text"
                                    {...commonInputProps('coachNumber', bookingData.deliveryPreference === 'Deliver to Seat')} // Required only if delivering to seat
                                    value={bookingData.coachNumber}
                                    placeholder="e.g., S5, B2"
                                    maxLength={4} />
                                {errors.coachNumber && <p id="coachNumber-error" className="mt-1 text-xs text-red-600" role="alert">{errors.coachNumber}</p>}
                            </div>
                             <div>
                                <label htmlFor="seatNumber" className="block text-sm font-medium text-gray-700">
                                    Seat {bookingData.deliveryPreference === 'Deliver to Seat' && <span className="text-red-500">*</span>}
                                    <span className="text-xs text-gray-500 ml-1">(Required if 'Deliver to Seat')</span>
                                </label>
                                <input
                                    type="text" // Using text allows for seat types like 'UB', 'LB' etc.
                                     {...commonInputProps('seatNumber', bookingData.deliveryPreference === 'Deliver to Seat')} // Required only if delivering to seat
                                     value={bookingData.seatNumber}
                                     placeholder="e.g., 32, UB"
                                     maxLength={4} />
                                {errors.seatNumber && <p id="seatNumber-error" className="mt-1 text-xs text-red-600" role="alert">{errors.seatNumber}</p>}
                            </div>
                        </div>

                        {/* Delivery Preference */}
                        <div>
                            <label htmlFor="deliveryPreference" className="block text-sm font-medium text-gray-700">Delivery Preference at Destination Station <span className="text-red-500">*</span></label>
                            <select {...commonInputProps('deliveryPreference', true)} value={bookingData.deliveryPreference}>
                                <option value="" disabled>-- Select Preference --</option>
                                <option value="Deliver to Seat">Deliver to My Seat/Coach</option>
                                <option value="Collect from Kiosk">I will Collect from Station Kiosk/Counter</option>
                                {/* <option value="Store in Transit">Store Temporarily (e.g., if train delayed)</option> */}
                            </select>
                             {errors.deliveryPreference && <p id="deliveryPreference-error" className="mt-1 text-xs text-red-600" role="alert">{errors.deliveryPreference}</p>}
                        </div>
                    </fieldset>

                    {/* === Section 3: Luggage Details === */}
                    <fieldset className="space-y-6 border-t border-gray-200 pt-6">
                        <legend className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
                            3. Luggage Details
                        </legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="numberOfBags" className="block text-sm font-medium text-gray-700">Number of Bags <span className="text-red-500">*</span></label>
                                <input type="number" {...commonInputProps('numberOfBags', true)} value={bookingData.numberOfBags} min="1" max="20" step="1" placeholder="1" />
                                {errors.numberOfBags && <p id="numberOfBags-error" className="mt-1 text-xs text-red-600" role="alert">{errors.numberOfBags}</p>}
                            </div>
                             <div>
                                <label htmlFor="weightCategory" className="block text-sm font-medium text-gray-700">Total Weight (Approx) <span className="text-red-500">*</span></label>
                                <select {...commonInputProps('weightCategory', true)} value={bookingData.weightCategory}>
                                    <option value="" disabled>-- Select Weight --</option>
                                    <option value="0-10kg">Up to 10 kg</option>
                                    <option value="10-20kg">10 - 20 kg</option>
                                    <option value="20-30kg">20 - 30 kg</option> {/* More granular options */}
                                    <option value="30kg+">More than 30 kg</option>
                                </select>
                                 {errors.weightCategory && <p id="weightCategory-error" className="mt-1 text-xs text-red-600" role="alert">{errors.weightCategory}</p>}
                            </div>
                        </div>
                        <div>
                            <label htmlFor="specialItemsDescription" className="block text-sm font-medium text-gray-700">Special Handling Notes <span className="text-xs text-gray-500">(Optional)</span></label>
                             <textarea
                                {...commonInputProps('specialItemsDescription', false)} // Optional field
                                value={bookingData.specialItemsDescription}
                                rows={3}
                                placeholder="e.g., Fragile items inside, handle with care, contains musical instrument..."
                             ></textarea>
                             {/* No error display needed for optional field */}
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
                                    className="focus:ring-[#ff8c00] h-4 w-4 text-[#ff8c00] border-gray-300 rounded disabled:opacity-50"
                                />
                           </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="insuranceRequested" className="font-medium text-gray-700">
                                    Add Luggage Insurance?
                                </label>
                                <p className="text-xs text-gray-500">(Optional, charges apply based on declared value - details at checkout)</p>
                            </div>
                        </div>
                    </fieldset>

                    {/* === Section 4: Service & Payment === */}
                    <fieldset className="space-y-6 border-t border-gray-200 pt-6">
                        <legend className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
                            4. Service & Payment
                        </legend>
                           <div>
                            <label htmlFor="serviceType" className="block text-sm font-medium text-gray-700">Service Speed <span className="text-red-500">*</span></label>
                            <select {...commonInputProps('serviceType', true)} value={bookingData.serviceType}>
                                <option value="" disabled>-- Select Service --</option>
                                <option value="Standard">Standard Delivery</option>
                                <option value="Express">Express Delivery (Faster, higher charge)</option>
                            </select>
                             {errors.serviceType && <p id="serviceType-error" className="mt-1 text-xs text-red-600" role="alert">{errors.serviceType}</p>}
                        </div>

                        {/* Estimated Cost Placeholder - Could be dynamically calculated later */}
                         <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
                            <p><span className="font-medium">Estimated Cost:</span> To be calculated based on distance, weight, and service type. Final cost shown before payment.</p>
                         </div>

                        <div>
                            <label htmlFor="paymentMode" className="block text-sm font-medium text-gray-700">Preferred Payment Method <span className="text-red-500">*</span></label>
                            <select {...commonInputProps('paymentMode', true)} value={bookingData.paymentMode}>
                                <option value="" disabled>-- Select Payment --</option>
                                <option value="Online">Pay Online (UPI, Card, NetBanking)</option>
                                {/* <option value="Card">Debit/Credit Card</option> */}
                                {/* <option value="NetBanking">Net Banking</option> */}
                                {/* <option value="Wallet">Mobile Wallet</option> */}
                                <option value="POD">Pay on Delivery/Pickup (Cash/UPI)</option>
                            </select>
                             {errors.paymentMode && <p id="paymentMode-error" className="mt-1 text-xs text-red-600" role="alert">{errors.paymentMode}</p>}
                        </div>
                    </fieldset>

                    {/* === Submit Button === */}
                    <div className="pt-5 border-t border-gray-200">
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-base font-medium rounded-md text-white bg-[#ff8c00] hover:bg-[#e07b00] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff8c00] disabled:opacity-60 disabled:cursor-wait transition duration-150 ease-in-out"
                            disabled={isSubmitting || !isAuthenticated} // Disable if submitting or if somehow user logs out
                            aria-busy={isSubmitting} // Accessibility: indicates button is busy
                        >
                            {isSubmitting ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Submitting Booking...
                                </>
                            ) : (
                                'Confirm Booking & Proceed' // Action-oriented text
                            )}
                        </button>
                        {!isAuthenticated && ( // Add a hint if the button is disabled due to auth
                             <p className="mt-2 text-xs text-center text-red-600">You must be logged in to submit.</p>
                        )}
                    </div>

                     {/* --- Footer Info --- */}
                     <div className="text-center text-xs text-gray-500 pt-4">
                         <p>By submitting this booking, you agree to BagEase's <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#ff8c00] hover:underline font-medium">Terms of Service</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#ff8c00] hover:underline font-medium">Privacy Policy</a>.</p>
                         <p className="mt-1">Need assistance? Visit our <a href="/help" target="_blank" rel="noopener noreferrer" className="text-[#ff8c00] hover:underline font-medium">Help Center</a> or call us at <a href="tel:+91XXXXXXXXXX" className="text-[#ff8c00] hover:underline font-medium">+91-XXX-XXXXXXX</a>.</p>
                     </div>
                </form> {/* --- FORM END --- */}
            </div>
        </div> // --- Main Container End ---
    );
};

export default Book;