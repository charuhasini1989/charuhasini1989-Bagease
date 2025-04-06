import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase'; // Ensure this path is correct

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

// --- Simple Prompt Component (Modified to dispatch event) ---
const PleaseLoginPrompt = () => {
    const handleOpenSidebar = () => {
        const event = new CustomEvent('openLoginSidebar');
        window.dispatchEvent(event);
    };

    return (
        <div className="flex justify-center items-center min-h-[calc(100vh-200px)] px-4">
            <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md w-full mx-auto">
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
    const [assignmentStatus, setAssignmentStatus] = useState<string | null>(null); // To track assignment outcome

    // --- Authentication Check (using version 1's logic - seems fine) ---
    useEffect(() => {
        let isMounted = true;
        setIsLoadingAuth(true); // Start loading check

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
            } finally {
                if (isMounted) {
                   setIsLoadingAuth(false);
                }
            }
        };

        checkUserSession();

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (isMounted) {
                 const currentlyAuth = !!session;
                 if (currentlyAuth !== isAuthenticated) {
                    console.log(`Auth state changed via listener: User is now ${currentlyAuth ? 'authenticated' : 'not authenticated'}.`);
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

        return () => {
            isMounted = false;
            authListener?.subscription.unsubscribe();
            console.log("Auth listener unsubscribed and component unmounted.");
        };
    }, [navigate, isAuthenticated]); // Re-check auth state change effect


    // --- Get Current Date and Time for Min Values ---
    const getMinDateTime = useCallback(() => {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        now.setHours(now.getHours() + 1); // 1-hour buffer
        const minTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format
        return { minDate: today, minTimeForToday: minTime };
    }, []);
    const { minDate, minTimeForToday } = getMinDateTime();


    // --- Validation Function (using version 1's logic - looks solid) ---
    const validateForm = useCallback((): boolean => {
        const newErrors: Record<string, string> = {};
        const data = bookingData;

        // Validations from version 1... (keep these as they are)
        if (!data.name.trim()) newErrors.name = 'Full Name is required';
        if (!data.phone.trim()) newErrors.phone = 'Phone number is required';
        else if (!/^\+?[\d\s-]{10,15}$/.test(data.phone)) newErrors.phone = 'Enter a valid phone number (10-15 digits, optional +)';
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
        if (isNaN(bags) || bags <= 0) {
             newErrors.numberOfBags = 'Enter a valid number of bags (at least 1)';
        } else if (bags > 20) {
             newErrors.numberOfBags = 'Maximum 20 bags allowed per booking';
        }
        if (!data.weightCategory) newErrors.weightCategory = 'Select an approximate total weight category';
        if (!data.serviceType) newErrors.serviceType = 'Select a service speed';
        if (!data.paymentMode) newErrors.paymentMode = 'Select a preferred payment method';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [bookingData, minDate, minTimeForToday]);


    // --- Handle Change (using version 1's logic) ---
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setBookingData(prevData => ({ ...prevData, [name]: checked }));
        } else {
            setBookingData(prevData => ({ ...prevData, [name]: value }));
        }

        setErrors(prevErrors => {
            if (prevErrors[name]) {
                 const updatedErrors = { ...prevErrors };
                 delete updatedErrors[name];
                 return updatedErrors;
            }
            return prevErrors;
        });

    }, []);


    // --- Handle Submit (*** MODIFIED TO INCLUDE ASSIGNMENT ***) ---
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isAuthenticated) {
             setSubmitError("You must be logged in to submit a booking. Please use the login button.");
             // Consider dispatching the sidebar open event here too
             // const event = new CustomEvent('openLoginSidebar');
             // window.dispatchEvent(event);
             return;
        }

        setSubmitError(null);
        setIsSubmitSuccess(false);
        setAssignmentStatus(null); // Reset assignment status message

        const isFormValid = validateForm();

        if (isFormValid) {
            setIsSubmitting(true); // START SUBMIT PROCESS
            let bookingId: string | null = null; // To store the ID of the newly created booking

            try {
                 // 1. Get User (Good practice check)
                 const { data: { user } } = await supabase.auth.getUser();
                 if (!user) {
                     throw new Error("Authentication session expired or invalid. Please log in again.");
                 }

                // 2. Prepare Booking Data (Same as version 1)
                const dataToSubmit = {
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
                    booking_status: 'Pending', // Initial status
                };

                console.log("Submitting booking data:", dataToSubmit);

                // 3. Insert Booking (Same as version 1, but we need the result)
                // Use .select() to get the inserted row's ID back
                const { data: insertedBooking, error: insertError } = await supabase
                    .from('bookings')
                    .insert([dataToSubmit])
                    .select('id') // <-- Request the ID of the inserted row
                    .single(); // <-- Expect only one row back

                if (insertError) {
                    console.error('Supabase booking insert error:', insertError);
                    throw new Error(`Booking failed: ${insertError.message}.`); // Throw error to be caught below
                }

                if (!insertedBooking || !insertedBooking.id) {
                     console.error('Booking insert succeeded but did not return an ID.');
                     throw new Error('Booking creation failed internally. Please try again.');
                }

                // --- Booking Success ---
                bookingId = insertedBooking.id; // Store the booking ID
                console.log(`Booking successful! ID: ${bookingId}`);

                // --- 4. Attempt Delivery Assignment ---
                try {
                    console.log("Attempting to assign delivery personnel...");

                    // a) Fetch active personnel
                    // IMPORTANT: Ensure 'personnel' table and 'is_active' column exist and RLS allows this SELECT.
                    const { data: activePersonnel, error: personnelError } = await supabase
                        .from('personnel') // Your personnel table name
                        .select('id')      // We only need the ID
                        .eq('is_active', true); // Assuming you have an 'is_active' boolean column

                    if (personnelError) {
                        console.error("Error fetching personnel:", personnelError);
                        // Don't fail the whole process, just log that assignment couldn't happen yet
                        setAssignmentStatus("Booking created, but failed to find delivery personnel. Assignment pending.");
                        // Continue to success state for the booking itself
                    } else if (!activePersonnel || activePersonnel.length === 0) {
                        console.warn("No active delivery personnel found.");
                        setAssignmentStatus("Booking created, but no available personnel currently. Assignment pending.");
                         // Continue to success state for the booking itself
                    } else {
                        // b) Select one randomly
                        const randomIndex = Math.floor(Math.random() * activePersonnel.length);
                        const assignedPersonnelId = activePersonnel[randomIndex].id;
                        console.log(`Selected personnel ID: ${assignedPersonnelId} for booking ID: ${bookingId}`);

                        // c) Insert into delivery_assignments
                        // IMPORTANT: Ensure 'delivery_assignments' table exists with 'order_id', 'personnel_id', 'status' columns
                        // and RLS allows this insert (see RLS notes above).
                        const { error: assignmentError } = await supabase
                            .from('delivery_assignments')
                            .insert([{
                                order_id: bookingId,         // Link to the booking.id
                                personnel_id: assignedPersonnelId,
                                status: 'Assigned',          // Initial assignment status
                                assigned_at: new Date().toISOString() // Record assignment time
                            }]);

                        if (assignmentError) {
                            console.error("Error creating delivery assignment:", assignmentError);
                             // THIS IS WHERE RLS VIOLATION ON delivery_assignments WOULD LIKELY OCCUR
                            setAssignmentStatus(`Booking created, but failed to assign personnel automatically: ${assignmentError.message}. Assignment pending.`);
                            // Continue to success state for the booking itself, but log the assignment issue
                        } else {
                            console.log("Delivery assignment created successfully!");
                            setAssignmentStatus("Delivery personnel assigned successfully!");
                            // Both booking and assignment were successful.
                        }
                    }
                } catch (assignmentProcessError: any) {
                     console.error("Unexpected error during assignment process:", assignmentProcessError);
                     setAssignmentStatus("Booking created, but an unexpected error occurred during automatic assignment.");
                }

                // --- 5. Final Success State ---
                setIsSubmitSuccess(true); // Trigger success overlay for the booking

                // Set timer to hide success message and reset form
                setTimeout(() => {
                   setIsSubmitSuccess(false);
                   setBookingData({ // Reset form
                        name: bookingData.name, // Keep pre-filled name/email if desired after successful booking
                        email: bookingData.email,
                        phone: '', pickupLocationType: '', pickupAddress: '',
                        dropLocationType: '', dropAddress: '', pickupDate: '', pickupTime: '',
                        trainNumber: '', trainName: '', pnrNumber: '', coachNumber: '', seatNumber: '',
                        deliveryPreference: '', numberOfBags: '1', weightCategory: '',
                        specialItemsDescription: '', insuranceRequested: false, serviceType: '',
                        paymentMode: '',
                    });
                   setErrors({});
                   setSubmitError(null);
                   setAssignmentStatus(null); // Clear assignment message
                   setIsSubmitting(false); // END SUBMIT PROCESS
                   window.scrollTo(0, 0);
                   // navigate('/my-bookings'); // Optional redirect
                }, 4000); // Increased timeout slightly to read assignment status

            } catch (err: any) {
                // Catch errors from getUser(), booking insert, or assignment logic setup
                console.error('Error during booking/assignment process:', err);
                setSubmitError(err.message || 'An unexpected error occurred during submission. Please try again.');
                setIsSubmitting(false); // END SUBMIT PROCESS on error
            }
        } else {
            // --- Validation Failed ---
            console.log("Form validation failed", errors);
            setSubmitError("Please fix the errors highlighted below before submitting.");
            // Scroll to first error (logic from version 1 is good)
            const errorKeys = Object.keys(errors);
            if (errorKeys.length > 0) {
                const firstErrorKey = errorKeys[0];
                const elementToFocus = document.getElementById(firstErrorKey);
                if (elementToFocus) {
                    elementToFocus.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    elementToFocus.focus({ preventScroll: true });
                } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            } else {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    }, [bookingData, errors, validateForm, navigate, isAuthenticated]); // Dependencies

    // --- Render Logic ---

    // 1. Loading Auth
    if (isLoadingAuth) {
        return (
          <div className="flex justify-center items-center min-h-screen bg-gray-50">
            <div className="text-center">
                 {/* Spinner SVG */}
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
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-green-50 text-center p-4 transition-opacity duration-300 ease-in-out">
             <GreenCheckmark />
            <h2 className="mt-6 text-2xl sm:text-3xl font-bold text-green-700">Booking Confirmed!</h2>
            <p className="mt-2 text-lg text-gray-600 max-w-md">
                Your BagEase booking request has been received successfully.
            </p>
            {/* Display assignment status message if available */}
            {assignmentStatus && (
                <p className={`mt-2 text-sm ${assignmentStatus.includes('failed') || assignmentStatus.includes('pending') ? 'text-orange-600' : 'text-green-600'} max-w-md`}>
                    {assignmentStatus}
                </p>
            )}
             <p className="mt-2 text-lg text-gray-600 max-w-md">
                You can track its status on your 'My Bookings' page.
            </p>
            <button
                onClick={() => navigate('/my-bookings')}
                className="mt-6 px-5 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 transition duration-150 ease-in-out"
             >
                View My Bookings
             </button>
          </div>
        );
    }

    // 4. Authenticated -> Show the Booking Form
    // Helper function for input props (from version 1)
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
        required: isRequired, // Keep basic HTML5 validation
        'aria-invalid': errors[name] ? "true" : "false",
        'aria-describedby': errors[name] ? `${name}-error` : undefined,
    });

    // --- JSX Form Structure (Using Version 1's structure) ---
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                 <h1 className="text-center text-3xl font-extrabold text-gray-900 mb-2">
                    Book Your BagEase Service
                </h1>
                <p className="text-center text-sm text-gray-600 mb-8">
                    Fill in the details below. Fields marked <span className="text-red-500">*</span> are required.
                </p>

                {/* FORM using version 1 structure, controlled by state */}
                <form onSubmit={handleSubmit} noValidate className="bg-white p-6 sm:p-8 rounded-lg shadow-lg space-y-8">

                    {/* General Submission Error Display Area */}
                    {submitError && (
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
                         <legend className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">1. Your Contact Information</legend>
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
                             {/* Make email read-only if pre-filled, add styling */}
                             <input type="email" {...commonInputProps('email', true)} value={bookingData.email} placeholder="you@example.com" autoComplete="email" readOnly={!!bookingData.email && isAuthenticated} className={`${commonInputProps('email', true).className} ${bookingData.email && isAuthenticated ? 'bg-gray-100 cursor-not-allowed' : ''}`} />
                             {errors.email && <p id="email-error" className="mt-1 text-xs text-red-600" role="alert">{errors.email}</p>}
                             {bookingData.email && isAuthenticated && <p className="mt-1 text-xs text-gray-500">Email pre-filled from your account.</p>}
                         </div>
                     </fieldset>

                    {/* === Section 2: Pickup & Drop-Off Details === */}
                    <fieldset className="space-y-6 border-t border-gray-200 pt-6">
                         <legend className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">2. Pickup & Drop-Off Details</legend>
                         {/* Fields: pickupLocationType, pickupAddress, dropLocationType, dropAddress, pickupDate, pickupTime */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="pickupLocationType" className="block text-sm font-medium text-gray-700">Pickup From <span className="text-red-500">*</span></label>
                                <select {...commonInputProps('pickupLocationType', true)} value={bookingData.pickupLocationType}>
                                    <option value="" disabled>-- Select Type --</option>
                                    <option value="Home">Home</option><option value="Hotel">Hotel</option><option value="Station">Train Station</option><option value="Office">Office</option><option value="Other">Other</option>
                                </select>
                                {errors.pickupLocationType && <p id="pickupLocationType-error" className="mt-1 text-xs text-red-600" role="alert">{errors.pickupLocationType}</p>}
                            </div>
                            <div>
                                <label htmlFor="pickupAddress" className="block text-sm font-medium text-gray-700">Pickup Address / Location Name <span className="text-red-500">*</span></label>
                                <input type="text" {...commonInputProps('pickupAddress', true)} value={bookingData.pickupAddress} placeholder="Full Address or Station Name" />
                                {errors.pickupAddress && <p id="pickupAddress-error" className="mt-1 text-xs text-red-600" role="alert">{errors.pickupAddress}</p>}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                <label htmlFor="dropLocationType" className="block text-sm font-medium text-gray-700">Drop-off At <span className="text-red-500">*</span></label>
                                <select {...commonInputProps('dropLocationType', true)} value={bookingData.dropLocationType}>
                                     <option value="" disabled>-- Select Type --</option>
                                     <option value="Station">Train Station</option><option value="Home">Home</option><option value="Hotel">Hotel</option><option value="Office">Office</option><option value="Other">Other</option>
                                </select>
                                {errors.dropLocationType && <p id="dropLocationType-error" className="mt-1 text-xs text-red-600" role="alert">{errors.dropLocationType}</p>}
                            </div>
                            <div>
                                <label htmlFor="dropAddress" className="block text-sm font-medium text-gray-700">Drop-off Address / Location Name <span className="text-red-500">*</span></label>
                                <input type="text" {...commonInputProps('dropAddress', true)} value={bookingData.dropAddress} placeholder="Full Address or Station Name" />
                                {errors.dropAddress && <p id="dropAddress-error" className="mt-1 text-xs text-red-600" role="alert">{errors.dropAddress}</p>}
                            </div>
                        </div>
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
                         {/* Fields: trainNumber, trainName, pnrNumber, coachNumber, seatNumber, deliveryPreference */}
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
                         <div> {/* PNR needs full width potentially */}
                            <label htmlFor="pnrNumber" className="block text-sm font-medium text-gray-700">PNR Number <span className="text-xs text-gray-500">(Optional, 10 digits)</span></label>
                            <input type="text" {...commonInputProps('pnrNumber', false)} value={bookingData.pnrNumber} placeholder="10-digit PNR" maxLength={10} pattern="\d{10}" />
                            {errors.pnrNumber && <p id="pnrNumber-error" className="mt-1 text-xs text-red-600" role="alert">{errors.pnrNumber}</p>}
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                <label htmlFor="coachNumber" className="block text-sm font-medium text-gray-700">
                                    Coach {bookingData.deliveryPreference === 'Deliver to Seat' && <span className="text-red-500">*</span>}<span className="text-xs text-gray-500 ml-1">(If 'Deliver to Seat')</span>
                                </label>
                                <input type="text" {...commonInputProps('coachNumber', bookingData.deliveryPreference === 'Deliver to Seat')} value={bookingData.coachNumber} placeholder="e.g., S5, B2" maxLength={4} />
                                {errors.coachNumber && <p id="coachNumber-error" className="mt-1 text-xs text-red-600" role="alert">{errors.coachNumber}</p>}
                            </div>
                             <div>
                                <label htmlFor="seatNumber" className="block text-sm font-medium text-gray-700">
                                    Seat {bookingData.deliveryPreference === 'Deliver to Seat' && <span className="text-red-500">*</span>}<span className="text-xs text-gray-500 ml-1">(If 'Deliver to Seat')</span>
                                </label>
                                <input type="text" {...commonInputProps('seatNumber', bookingData.deliveryPreference === 'Deliver to Seat')} value={bookingData.seatNumber} placeholder="e.g., 32, UB" maxLength={4} />
                                {errors.seatNumber && <p id="seatNumber-error" className="mt-1 text-xs text-red-600" role="alert">{errors.seatNumber}</p>}
                            </div>
                        </div>
                         <div>
                            <label htmlFor="deliveryPreference" className="block text-sm font-medium text-gray-700">Delivery Preference at Destination Station <span className="text-red-500">*</span></label>
                            <select {...commonInputProps('deliveryPreference', true)} value={bookingData.deliveryPreference}>
                                <option value="" disabled>-- Select Preference --</option>
                                <option value="Deliver to Seat">Deliver to My Seat/Coach</option>
                                <option value="Collect from Kiosk">I will Collect from Station Kiosk/Counter</option>
                            </select>
                             {errors.deliveryPreference && <p id="deliveryPreference-error" className="mt-1 text-xs text-red-600" role="alert">{errors.deliveryPreference}</p>}
                        </div>
                    </fieldset>

                    {/* === Section 3: Luggage Details === */}
                    <fieldset className="space-y-6 border-t border-gray-200 pt-6">
                         <legend className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">3. Luggage Details</legend>
                         {/* Fields: numberOfBags, weightCategory, specialItemsDescription, insuranceRequested */}
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
                                     <option value="0-10kg">Up to 10 kg</option><option value="10-20kg">10 - 20 kg</option><option value="20-30kg">20 - 30 kg</option><option value="30kg+">More than 30 kg</option>
                                </select>
                                 {errors.weightCategory && <p id="weightCategory-error" className="mt-1 text-xs text-red-600" role="alert">{errors.weightCategory}</p>}
                            </div>
                        </div>
                         <div>
                            <label htmlFor="specialItemsDescription" className="block text-sm font-medium text-gray-700">Special Handling Notes <span className="text-xs text-gray-500">(Optional)</span></label>
                             <textarea {...commonInputProps('specialItemsDescription', false)} value={bookingData.specialItemsDescription} rows={3} placeholder="e.g., Fragile items inside, handle with care..."></textarea>
                        </div>
                         <div className="relative flex items-start">
                             <div className="flex items-center h-5">
                                <input id="insuranceRequested" name="insuranceRequested" type="checkbox" checked={bookingData.insuranceRequested} onChange={handleChange} disabled={isSubmitting} className="focus:ring-[#ff8c00] h-4 w-4 text-[#ff8c00] border-gray-300 rounded disabled:opacity-50" />
                            </div>
                             <div className="ml-3 text-sm">
                                 <label htmlFor="insuranceRequested" className="font-medium text-gray-700">Add Luggage Insurance?</label>
                                 <p className="text-xs text-gray-500">(Optional, charges apply)</p>
                             </div>
                         </div>
                     </fieldset>

                    {/* === Section 4: Service & Payment === */}
                    <fieldset className="space-y-6 border-t border-gray-200 pt-6">
                        <legend className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">4. Service & Payment</legend>
                        {/* Fields: serviceType, paymentMode */}
                        <div>
                            <label htmlFor="serviceType" className="block text-sm font-medium text-gray-700">Service Speed <span className="text-red-500">*</span></label>
                            <select {...commonInputProps('serviceType', true)} value={bookingData.serviceType}>
                                <option value="" disabled>-- Select Service --</option>
                                <option value="Standard">Standard Delivery</option><option value="Express">Express Delivery</option>
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
                                <option value="Online">Pay Online (UPI, Card, NetBanking)</option>
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
                                    {/* Spinner SVG */}
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
                        {!isAuthenticated && (
                             <p className="mt-2 text-xs text-center text-red-600">You must be logged in to submit.</p>
                        )}
                    </div>

                     {/* --- Footer Info --- */}
                     <div className="text-center text-xs text-gray-500 pt-4">
                         <p>By submitting, you agree to BagEase's <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#ff8c00] hover:underline font-medium">Terms</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#ff8c00] hover:underline font-medium">Privacy Policy</a>.</p>
                         <p className="mt-1">Need assistance? Visit our <a href="/help" target="_blank" rel="noopener noreferrer" className="text-[#ff8c00] hover:underline font-medium">Help Center</a> or call <a href="tel:+91XXXXXXXXXX" className="text-[#ff8c00] hover:underline font-medium">+91-XXX-XXXXXXX</a>.</p>
                     </div>
                </form>
            </div>
        </div>
    );
};

export default Book;