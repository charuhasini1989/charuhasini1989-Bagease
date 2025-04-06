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
        // setIsLoadingAuth(true); // Already set

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

        // Listener for auth state changes
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
                    }
                    // Optional: Clear fields on logout?
                    // else if (!currentlyAuth) { setBookingData(prev => ({ ...prev, name: '', email: '' })); }
                 }
            }
        });

        // Cleanup function
        return () => {
            isMounted = false;
            authListener?.subscription.unsubscribe();
            console.log("Auth listener unsubscribed and component unmounted.");
        };
    }, [navigate, isAuthenticated]); // Added isAuthenticated to deps for listener comparison


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

        // Validate required fields based on your form logic
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
             if (selectedDate < today) {
                 newErrors.pickupDate = 'Pickup date cannot be in the past';
             }
        }
        if (!data.pickupTime) newErrors.pickupTime = 'Pickup time is required';
        else if (data.pickupDate === minDate && data.pickupTime < minTimeForToday) {
            newErrors.pickupTime = `Time cannot be earlier than ${minTimeForToday} for today's date`;
        }
        if (!data.trainNumber.trim()) newErrors.trainNumber = 'Train number is required';
        if (data.pnrNumber.trim() && !/^\d{10}$/.test(data.pnrNumber.trim())) {
            newErrors.pnrNumber = 'PNR must be exactly 10 digits if provided';
        }
        if (!data.deliveryPreference) newErrors.deliveryPreference = 'Select a delivery preference';
        if (data.deliveryPreference === 'Deliver to Seat') {
            if (!data.coachNumber.trim()) newErrors.coachNumber = 'Coach number is required for seat delivery';
            if (!data.seatNumber.trim()) newErrors.seatNumber = 'Seat number is required for seat delivery';
        }
        const bags = parseInt(data.numberOfBags, 10);
        if (isNaN(bags) || bags <= 0) newErrors.numberOfBags = 'Enter a valid number of bags (at least 1)';
        else if (bags > 20) newErrors.numberOfBags = 'Maximum 20 bags allowed per booking';
        if (!data.weightCategory) newErrors.weightCategory = 'Select an approximate total weight category';
        if (!data.serviceType) newErrors.serviceType = 'Select a service speed';
        if (!data.paymentMode) newErrors.paymentMode = 'Select a preferred payment method';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [bookingData, minDate, minTimeForToday]);


    // --- Handle Change ---
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setBookingData(prevData => ({ ...prevData, [name]: checked }));
        } else {
            setBookingData(prevData => ({ ...prevData, [name]: value }));
        }

        // Clear error for the field being changed
        setErrors(prevErrors => {
            if (prevErrors[name]) {
                 const updatedErrors = { ...prevErrors };
                 delete updatedErrors[name];
                 return updatedErrors;
            }
            return prevErrors;
        });
    }, []);


    // --- Handle PNR Fetch (Placeholder) ---
    const handlePnrFetch = useCallback(async () => {
        if (!bookingData.pnrNumber || !/^\d{10}$/.test(bookingData.pnrNumber)) {
            setErrors(prev => ({...prev, pnrNumber: 'Enter a valid 10-digit PNR to fetch details'}));
            document.getElementById('pnrNumber')?.focus();
            return;
        }
        alert(`TODO: Implement API call to fetch details for PNR: ${bookingData.pnrNumber}`);
        // Placeholder: Implement actual API call
    }, [bookingData.pnrNumber]);


    // --- Handle Submit ---
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isAuthenticated) {
             setSubmitError("You must be logged in to submit a booking.");
             // Optionally trigger login prompt/sidebar
             // const event = new CustomEvent('openLoginSidebar'); window.dispatchEvent(event);
             return;
        }

        setSubmitError(null);
        setIsSubmitSuccess(false);

        const isFormValid = validateForm();

        if (isFormValid) {
            setIsSubmitting(true);
            let insertedBookingId: string | null = null; // Assuming booking ID is UUID (string)

            try {
                 const { data: { user } } = await supabase.auth.getUser();
                 if (!user) {
                     throw new Error("Authentication session invalid. Please log in again.");
                 }

                // 1. Prepare data for 'bookings' table
                // Ensure these keys match your actual 'bookings' table columns
                const bookingDataToSubmit = {
                    user_id: user.id,
                    name: bookingData.name.trim(),
                    phone: bookingData.phone.trim(),
                    email: bookingData.email.trim(), // Make sure 'email' column exists in bookings
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
                    booking_status: 'Pending', // Or your desired initial status
                };

                console.log("Submitting to bookings:", bookingDataToSubmit);

                // 2. Insert into 'bookings' and retrieve the ID
                // The schema image shows bookings.id as int4, but code uses uuid. Let's assume uuid.
                const { data: insertedBooking, error: bookingInsertError } = await supabase
                    .from('bookings')
                    .insert([bookingDataToSubmit])
                    .select('id') // Select the primary key of the new booking
                    .single();    // Expect only one row inserted

                if (bookingInsertError) {
                    console.error('Supabase booking insert error:', bookingInsertError);
                    throw new Error(`Booking creation failed: ${bookingInsertError.message}.`);
                }

                if (!insertedBooking || !insertedBooking.id) {
                     console.error('Booking insert succeeded but did not return an ID.');
                     throw new Error('Booking creation failed: Could not retrieve booking ID.');
                }

                insertedBookingId = insertedBooking.id; // Store the UUID string
                console.log(`Booking created with ID: ${insertedBookingId}`);

                // 3. Prepare data for 'orders' table
                const orderNumber = `BGEZ-${Date.now().toString().slice(-6)}`; // Simple demo order number
                // Ensure these keys match your 'orders' table columns
                const orderDataToSubmit = {
                    user_id: user.id,
                    booking_id: insertedBookingId, // Foreign key linking to the booking
                    order_number: orderNumber,
                    status: 'Pending' as const, // Initial status, matches OrderStatus type if defined elsewhere
                    total_amount: 0, // Placeholder - calculate based on booking details if needed
                    // estimate_delivery: null, // Set later if applicable
                    // delivered_at: null,      // Set on completion
                };

                console.log("Submitting to orders:", orderDataToSubmit);

                // 4. Insert into 'orders' table
                const { error: orderInsertError } = await supabase
                    .from('orders')
                    .insert([orderDataToSubmit]);

                if (orderInsertError) {
                    console.error('Supabase order insert error:', orderInsertError);
                    // Decide how to handle partial success: maybe log, notify user, but still show booking success?
                    setSubmitError(`Booking created (ID: ${insertedBookingId}), but adding order details failed: ${orderInsertError.message}. Contact support.`);
                    // Proceed to show success for the booking itself, but with the error message.
                } else {
                    console.log('Order record created successfully.');
                }

                // 5. Handle overall success
                setIsSubmitSuccess(true);

                setTimeout(() => {
                   setIsSubmitSuccess(false);
                   // Reset form, potentially keeping user details
                   const loggedInEmail = user?.email || '';
                   const loggedInName = user?.user_metadata?.full_name || '';
                   setBookingData({
                        name: loggedInName, email: loggedInEmail, phone: '',
                        pickupLocationType: '', pickupAddress: '',
                        dropLocationType: '', dropAddress: '', pickupDate: '', pickupTime: '',
                        trainNumber: '', trainName: '', pnrNumber: '', coachNumber: '', seatNumber: '',
                        deliveryPreference: '', numberOfBags: '1', weightCategory: '',
                        specialItemsDescription: '', insuranceRequested: false, serviceType: '',
                        paymentMode: '',
                    });
                   setErrors({});
                   // Keep submitError visible if order insert failed
                   setIsSubmitting(false);
                   window.scrollTo(0, 0);
                   // navigate('/my-bookings'); // Optional redirect
                }, 4000); // Show success message duration

            } catch (err: any) {
                console.error('Error during submission process:', err);
                setSubmitError(err.message || 'An unexpected error occurred during submission.');
                setIsSubmitting(false);
            }
        } else {
            console.log("Form validation failed", errors);
            setSubmitError("Please fix the errors highlighted below before submitting.");
            // Scroll to first error
            const errorKeys = Object.keys(errors);
            if (errorKeys.length > 0) {
                document.getElementById(errorKeys[0])?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                document.getElementById(errorKeys[0])?.focus({ preventScroll: true });
            } else {
                 window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    }, [bookingData, errors, validateForm, navigate, isAuthenticated]);


    // --- Render Logic ---

    // 1. Loading Auth State
    if (isLoadingAuth) {
        return (
          <div className="flex justify-center items-center min-h-screen bg-gray-50">
            <div className="text-center">
                 {/* Spinner or loading indicator */}
                 <svg className="animate-spin h-10 w-10 text-[#ff8c00] mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
                 <p className="text-xl text-gray-600">Loading Your Booking Form...</p>
            </div>
          </div>
        );
    }

    // 2. Not Authenticated
    if (!isAuthenticated) {
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
            <button
                onClick={() => navigate('/my-bookings')} // Adjust navigation as needed
                className="mt-6 px-5 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 transition duration-150 ease-in-out"
             >
                View My Bookings
             </button>
             {/* Display partial success message if order creation failed */}
             {submitError && submitError.includes('failed to create corresponding order') && (
                 <p className="mt-4 text-sm text-yellow-700 bg-yellow-100 border border-yellow-300 p-2 rounded">
                    Note: {submitError}
                 </p>
             )}
          </div>
        );
    }

    // 4. Authenticated: Show Booking Form
    // Helper for input props
    const commonInputProps = (name: keyof typeof bookingData, isRequired = true) => ({
         id: name,
        name: name,
        onChange: handleChange,
        className: `mt-1 block w-full px-3 py-2 bg-white border ${
            errors[name]
             ? 'border-red-500 ring-1 ring-red-500'
             : 'border-gray-300 focus:border-[#ff8c00]'
        } rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#ff8c00] sm:text-sm disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed`,
        disabled: isSubmitting,
        required: isRequired, // Use sparingly if custom validation is primary
        'aria-invalid': errors[name] ? "true" : "false",
        'aria-describedby': errors[name] ? `${name}-error` : undefined,
    });

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                 <h1 className="text-center text-3xl font-extrabold text-gray-900 mb-2">
                    Book Your BagEase Service
                </h1>
                <p className="text-center text-sm text-gray-600 mb-8">
                    Fill in the details below. Fields marked <span className="text-red-500">*</span> are required.
                </p>

                {/* --- FORM START --- */}
                <form onSubmit={handleSubmit} noValidate className="bg-white p-6 sm:p-8 rounded-lg shadow-lg space-y-8">

                     {/* General Submission Error Display Area */}
                    {submitError && !submitError.includes('failed to create corresponding order') && ( // Only show non-partial errors here
                        <div
                            id="form-submit-error"
                            className="p-4 bg-red-50 border-l-4 border-red-500 text-red-800 rounded-md"
                            role="alert"
                            aria-live="assertive"
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
                            {/* Make email read-only if pre-filled */}
                            <input type="email" {...commonInputProps('email', true)} value={bookingData.email} placeholder="you@example.com" autoComplete="email" readOnly={!!isAuthenticated && !!bookingData.email} className={commonInputProps('email', true).className + (isAuthenticated && bookingData.email ? ' bg-gray-100 cursor-not-allowed' : '')} />
                            {errors.email && <p id="email-error" className="mt-1 text-xs text-red-600" role="alert">{errors.email}</p>}
                            {isAuthenticated && bookingData.email && <p className="mt-1 text-xs text-gray-500">Email pre-filled from your account.</p>}
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
                            </div>
                        </div>
                         <div className="relative">
                            <label htmlFor="pnrNumber" className="block text-sm font-medium text-gray-700">PNR Number <span className="text-xs text-gray-500">(Optional, 10 digits)</span></label>
                            <input
                                type="text"
                                {...commonInputProps('pnrNumber', false)}
                                value={bookingData.pnrNumber}
                                placeholder="10-digit PNR"
                                maxLength={10}
                                pattern="\d{10}"
                                title="Please enter a 10-digit PNR number if available."
                            />
                            {/* Optional PNR Fetch Button
                            <button
                                type="button" onClick={handlePnrFetch}
                                disabled={isSubmitting || !bookingData.pnrNumber || bookingData.pnrNumber.length !== 10}
                                className="absolute right-2 top-7 px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
                            > Fetch Info </button>
                            */}
                            {errors.pnrNumber && <p id="pnrNumber-error" className="mt-1 text-xs text-red-600" role="alert">{errors.pnrNumber}</p>}
                        </div>

                        {/* Coach/Seat conditionally required */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                <label htmlFor="coachNumber" className="block text-sm font-medium text-gray-700">
                                    Coach {bookingData.deliveryPreference === 'Deliver to Seat' && <span className="text-red-500">*</span>}
                                    <span className="text-xs text-gray-500 ml-1">(If 'Deliver to Seat')</span>
                                </label>
                                <input
                                    type="text"
                                    {...commonInputProps('coachNumber', bookingData.deliveryPreference === 'Deliver to Seat')}
                                    value={bookingData.coachNumber}
                                    placeholder="e.g., S5, B2"
                                    maxLength={4} />
                                {errors.coachNumber && <p id="coachNumber-error" className="mt-1 text-xs text-red-600" role="alert">{errors.coachNumber}</p>}
                            </div>
                             <div>
                                <label htmlFor="seatNumber" className="block text-sm font-medium text-gray-700">
                                    Seat {bookingData.deliveryPreference === 'Deliver to Seat' && <span className="text-red-500">*</span>}
                                    <span className="text-xs text-gray-500 ml-1">(If 'Deliver to Seat')</span>
                                </label>
                                <input
                                    type="text"
                                     {...commonInputProps('seatNumber', bookingData.deliveryPreference === 'Deliver to Seat')}
                                     value={bookingData.seatNumber}
                                     placeholder="e.g., 32, UB"
                                     maxLength={4} />
                                {errors.seatNumber && <p id="seatNumber-error" className="mt-1 text-xs text-red-600" role="alert">{errors.seatNumber}</p>}
                            </div>
                        </div>

                        {/* Delivery Preference */}
                        <div>
                            <label htmlFor="deliveryPreference" className="block text-sm font-medium text-gray-700">Delivery Preference at Destination <span className="text-red-500">*</span></label>
                            <select {...commonInputProps('deliveryPreference', true)} value={bookingData.deliveryPreference}>
                                <option value="" disabled>-- Select Preference --</option>
                                <option value="Deliver to Seat">Deliver to My Seat/Coach</option>
                                <option value="Collect from Kiosk">Collect from Station Kiosk/Counter</option>
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
                                    <option value="20-30kg">20 - 30 kg</option>
                                    <option value="30kg+">More than 30 kg</option>
                                </select>
                                 {errors.weightCategory && <p id="weightCategory-error" className="mt-1 text-xs text-red-600" role="alert">{errors.weightCategory}</p>}
                            </div>
                        </div>
                        <div>
                            <label htmlFor="specialItemsDescription" className="block text-sm font-medium text-gray-700">Special Handling Notes <span className="text-xs text-gray-500">(Optional)</span></label>
                             <textarea
                                {...commonInputProps('specialItemsDescription', false)}
                                value={bookingData.specialItemsDescription}
                                rows={3}
                                placeholder="e.g., Fragile items, handle with care..."
                             ></textarea>
                        </div>
                        <div className="relative flex items-start">
                            <div className="flex items-center h-5">
                               <input
                                    id="insuranceRequested" name="insuranceRequested" type="checkbox"
                                    checked={bookingData.insuranceRequested} onChange={handleChange}
                                    disabled={isSubmitting}
                                    className="focus:ring-[#ff8c00] h-4 w-4 text-[#ff8c00] border-gray-300 rounded disabled:opacity-50"
                                />
                           </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="insuranceRequested" className="font-medium text-gray-700"> Add Luggage Insurance? </label>
                                <p className="text-xs text-gray-500">(Optional, charges apply)</p>
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
                                <option value="Express">Express Delivery</option>
                            </select>
                             {errors.serviceType && <p id="serviceType-error" className="mt-1 text-xs text-red-600" role="alert">{errors.serviceType}</p>}
                        </div>

                         <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
                            <p><span className="font-medium">Estimated Cost:</span> To be calculated. Final cost shown before payment.</p>
                         </div>

                        <div>
                            <label htmlFor="paymentMode" className="block text-sm font-medium text-gray-700">Preferred Payment Method <span className="text-red-500">*</span></label>
                            <select {...commonInputProps('paymentMode', true)} value={bookingData.paymentMode}>
                                <option value="" disabled>-- Select Payment --</option>
                                <option value="Online">Pay Online (UPI, Card, etc.)</option>
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
                            disabled={isSubmitting || !isAuthenticated}
                            aria-busy={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    {/* Loading Spinner */}
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Submitting Booking...
                                </>
                            ) : (
                                'Confirm Booking & Proceed'
                            )}
                        </button>
                        {!isAuthenticated && ( // Hint if button disabled due to auth
                             <p className="mt-2 text-xs text-center text-red-600">You must be logged in to submit.</p>
                        )}
                    </div>

                     {/* --- Footer Info --- */}
                     <div className="text-center text-xs text-gray-500 pt-4">
                         <p>By submitting, you agree to BagEase's <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#ff8c00] hover:underline">Terms</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#ff8c00] hover:underline">Privacy Policy</a>.</p>
                         <p className="mt-1">Need help? <a href="/help" target="_blank" rel="noopener noreferrer" className="text-[#ff8c00] hover:underline">Help Center</a> | <a href="tel:+91XXXXXXXXXX" className="text-[#ff8c00] hover:underline">+91-XXX-XXXXXXX</a>.</p>
                     </div>
                </form> {/* --- FORM END --- */}
            </div>
        </div> // --- Main Container End ---
    );
};

export default Book;