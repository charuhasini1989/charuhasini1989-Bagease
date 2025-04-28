import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
// Import a basic Modal component (you might need to install/create one)
// Example: npm install react-modal or create a simple one
import Modal from 'react-modal'; // Or your preferred modal library

// --- Reusable Green Checkmark Component ---
const GreenCheckmark = () => (
    // ... (GreenCheckmark component code remains exactly the same)
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
    // ... (PleaseLoginPrompt component code remains exactly the same)
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
    const [isSubmitting, setIsSubmitting] = useState(false); // Now represents final submission to DB
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);

    // --- NEW State for OTP ---
    const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
    const [otpValue, setOtpValue] = useState('');
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [otpError, setOtpError] = useState<string | null>(null);
    const [phoneForOtp, setPhoneForOtp] = useState(''); // Store phone number used for OTP

    // --- Authentication Check ---
    useEffect(() => {
        // ... (Authentication useEffect remains exactly the same) ...
        let isMounted = true;
        const checkUserSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (!isMounted) return;
                if (error) {
                    console.error("Error checking Supabase session:", error.message); setIsAuthenticated(false);
                } else if (!session) {
                     console.log("User not authenticated."); setIsAuthenticated(false);
                } else {
                    console.log("User authenticated."); setIsAuthenticated(true);
                    setBookingData(prev => ({
                        ...prev,
                        email: prev.email || session.user?.email || '',
                        name: prev.name || session.user?.user_metadata?.full_name || '',
                        // Optionally prefill phone if available and verified, but usually better to let user confirm
                        // phone: prev.phone || session.user?.phone || ''
                    }));
                }
            } catch (err) {
                 if (!isMounted) return;
                 console.error("Unexpected error during auth check:", err); setIsAuthenticated(false);
            } finally {
                if (isMounted) setIsLoadingAuth(false);
            }
        };

        checkUserSession();

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (isMounted && !isLoadingAuth) {
                 const currentlyAuth = !!session;
                 if (currentlyAuth !== isAuthenticated) {
                    console.log(`Auth state changed: User is now ${currentlyAuth ? 'authenticated' : 'not authenticated'}. Updating UI.`);
                    setIsAuthenticated(currentlyAuth);
                    if (currentlyAuth && session) {
                         setBookingData(prev => ({
                            ...prev,
                            email: prev.email || session.user?.email || '',
                            name: prev.name || session.user?.user_metadata?.full_name || ''
                            // phone: prev.phone || session.user?.phone || ''
                        }));
                    } else {
                         // Clear potentially prefilled data if user logs out
                         // setBookingData(prev => ({ ...prev, email: '', name: '', phone: ''})); // Adjust as needed
                    }
                 }
            }
        });

        return () => {
            isMounted = false;
            authListener?.subscription.unsubscribe();
             // Ensure modal is closed if component unmounts
             if (Modal.setAppElement) Modal.setAppElement(null); // Clean up modal binding
        };
    }, [navigate, isLoadingAuth, isAuthenticated]); // Dependencies remain same

    // --- Get Current Date and Time for Min Values ---
    const getMinDateTime = useCallback(() => {
        // ... (getMinDateTime remains exactly the same) ...
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        now.setHours(now.getHours() + 1); // 1-hour buffer
        const minTime = now.toTimeString().split(' ')[0].substring(0, 5);
        return { minDate: today, minTimeForToday: minTime };
    }, []);
    const { minDate, minTimeForToday } = getMinDateTime();

    // --- Validation Function ---
    const validateForm = useCallback((): boolean => {
        // ... (validateForm remains exactly the same) ...
        const newErrors: Record<string, string> = {};
        const data = bookingData;

        // 1. User Info
        if (!data.name.trim()) newErrors.name = 'Full Name is required';
        if (!data.phone.trim()) newErrors.phone = 'Phone number is required';
        // Basic Indian Mobile Number format check (adjust regex if needed for international)
        else if (!/^\+?91?\s?-?\d{10}$/.test(data.phone.trim())) newErrors.phone = 'Enter a valid 10-digit Indian phone number (e.g., +919876543210 or 9876543210)';
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

        // 5. Pricing & Payment (Assuming Section 4 was a typo)
        if (!data.serviceType) newErrors.serviceType = 'Select a service type';
        if (!data.paymentMode) newErrors.paymentMode = 'Select a payment mode';

        setErrors(newErrors); // Update errors state
        return Object.keys(newErrors).length === 0;
    }, [bookingData, minDate, minTimeForToday]); // Dependencies remain same

    // --- Handle Change ---
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        // ... (handleChange remains exactly the same) ...
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setBookingData(prevData => ({ ...prevData, [name]: checked }));
        } else {
            // Auto-format phone number slightly for consistency (optional)
            // if (name === 'phone') {
            //     value = value.replace(/[^+\d]/g, ''); // Keep only digits and +
            // }
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
    }, []); // Dependencies remain same

    // --- Handle PNR Fetch (Placeholder) ---
    const handlePnrFetch = useCallback(async () => {
        // ... (handlePnrFetch remains exactly the same) ...
        if (!bookingData.pnrNumber || !/^\d{10}$/.test(bookingData.pnrNumber)) {
            setErrors(prev => ({...prev, pnrNumber: 'Enter a valid 10-digit PNR to fetch details'}));
            return;
        }
        alert(`TODO: Implement API call to fetch details for PNR: ${bookingData.pnrNumber}`);
    }, [bookingData.pnrNumber]); // Dependencies remain same


    // --- NEW: Function to handle the actual booking submission AFTER OTP verification ---
    const proceedWithBookingSubmission = useCallback(async () => {
        setIsSubmitting(true); // Indicate final submission process starts
        setOtpError(null);
        setIsOtpModalOpen(false); // Close modal on success start
        setSubmitError(null);
        setIsSubmitSuccess(false);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error("Authentication session lost. Please log in again.");
            }

            // Prepare data object for Supabase (THIS PART IS UNCHANGED)
            const dataToSubmit = {
                user_id: user.id,
                name: bookingData.name.trim(),
                phone: phoneForOtp, // Use the verified phone number
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
                booking_status: 'Confirmed', // Default status
                phone_verified: true, // Add a flag indicating OTP success
                // estimated_cost: 0, // Consider calculating or setting later
            };

            console.log("Submitting verified booking to Supabase:", dataToSubmit);

            // Insert data into Supabase 'bookings' table (THIS PART IS UNCHANGED)
            const { error: insertError } = await supabase
                .from('bookings')
                .insert([dataToSubmit]);

            if (insertError) {
                console.error('Supabase booking insert error:', insertError);
                throw new Error(`Booking failed: ${insertError.message}. Please try again.`);
            } else {
                // Submission Successful (THIS PART IS UNCHANGED)
                console.log('Booking successful!');
                setIsSubmitSuccess(true);

                setTimeout(() => {
                    setBookingData({
                        name: '', phone: '', email: '', pickupLocationType: '', pickupAddress: '',
                        dropLocationType: '', dropAddress: '', pickupDate: '', pickupTime: '',
                        trainNumber: '', trainName: '', pnrNumber: '', coachNumber: '', seatNumber: '',
                        deliveryPreference: '', numberOfBags: '1', weightCategory: '',
                        specialItemsDescription: '', insuranceRequested: false, serviceType: '',
                        paymentMode: '',
                    });
                    setErrors({});
                    setSubmitError(null);
                    setIsSubmitSuccess(false);
                    setIsSubmitting(false);
                    setOtpValue(''); // Clear OTP value
                    setPhoneForOtp(''); // Clear verified phone
                    // navigate('/my-bookings'); // Optional redirect
                }, 3000);
            }
        } catch (err: any) {
            console.error('Error during final submission process:', err);
            setSubmitError(err.message || 'An unexpected error occurred during booking finalization.');
            setIsSubmitting(false); // Ensure submitting state is reset on error
             // Keep OTP modal closed, show error on main form
            setIsOtpModalOpen(false);
        }
    }, [bookingData, navigate, phoneForOtp]); // Added phoneForOtp dependency

    // --- NEW: Function to Send OTP ---
    const handleSendOtp = useCallback(async () => {
        setOtpError(null);
        setIsSendingOtp(true);

        // Ensure phone number starts with country code for Supabase Auth
        let formattedPhone = bookingData.phone.trim().replace(/\s|-/g, '');
        if (!formattedPhone.startsWith('+91')) {
            if (formattedPhone.length === 10) {
                formattedPhone = '+91' + formattedPhone;
            } else {
                // Handle invalid format before sending
                setErrors(prev => ({ ...prev, phone: 'Invalid phone number format for OTP.' }));
                setIsSendingOtp(false);
                setIsOtpModalOpen(false); // Don't open modal if phone is invalid
                return;
            }
        }
        setPhoneForOtp(formattedPhone); // Store the number we are sending OTP to

        console.log(`Requesting OTP for phone: ${formattedPhone}`);
        try {
            const { data, error } = await supabase.auth.signInWithOtp({
                phone: formattedPhone,
            });

            if (error) {
                console.error("Supabase OTP send error:", error);
                throw new Error(error.message || "Failed to send OTP. Please check the number and try again.");
            }

            console.log("OTP sent successfully (or user already signed in with this method recently):", data);
            // Even if no OTP is sent (user already verified recently), proceed to verification step UI
            setOtpError(null); // Clear previous errors
            // Modal is already set to open in handleSubmit logic

        } catch (err: any) {
            console.error("Error sending OTP:", err);
            setOtpError(err.message);
             // Close modal on send error
            setIsOtpModalOpen(false);
        } finally {
            setIsSendingOtp(false);
        }
    }, [bookingData.phone, supabase.auth]);

    // --- NEW: Function to Verify OTP ---
    const handleVerifyOtp = useCallback(async (e: React.FormEvent) => {
         e.preventDefault(); // Prevent form submission if inside a form
         setOtpError(null);
         setIsVerifyingOtp(true);

         if (!phoneForOtp) {
             setOtpError("Phone number for verification is missing.");
             setIsVerifyingOtp(false);
             return;
         }
         if (!otpValue || !/^\d{6}$/.test(otpValue)) {
            setOtpError("Please enter the 6-digit OTP code.");
            setIsVerifyingOtp(false);
            return;
        }

        console.log(`Verifying OTP ${otpValue} for phone: ${phoneForOtp}`);
        try {
            const { data: { session }, error } = await supabase.auth.verifyOtp({
                phone: phoneForOtp,
                token: otpValue,
                type: 'sms', // Or 'phone_change' if applicable
            });

            if (error) {
                console.error("Supabase OTP verification error:", error);
                 if (error.message.includes("expired")) {
                     throw new Error("OTP has expired. Please request a new one.");
                 } else if (error.message.includes("already verified") || error.status === 400) {
                     // This might mean the code was wrong or already used
                     throw new Error("Invalid OTP code entered. Please check and try again.");
                 }
                 throw new Error(error.message || "OTP verification failed.");
            }

             console.log("OTP verified successfully. Session:", session);

             // --- OTP Success: Proceed to actual booking submission ---
             await proceedWithBookingSubmission(); // Call the original submission logic

        } catch (err: any) {
            console.error("Error verifying OTP:", err);
            setOtpError(err.message);
        } finally {
            setIsVerifyingOtp(false);
        }

    }, [otpValue, phoneForOtp, supabase.auth, proceedWithBookingSubmission]);


    // --- MODIFIED: Handle Submit (Form's main button) ---
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault(); // Prevent default form submission
        setSubmitError(null); // Clear previous submission errors
        setOtpError(null);    // Clear previous OTP errors
        setIsSubmitSuccess(false); // Reset success state

        if (!isAuthenticated) {
             setSubmitError("You must be logged in to submit a booking.");
             // Maybe open login sidebar?
             // const event = new CustomEvent('openLoginSidebar');
             // window.dispatchEvent(event);
             return;
        }

        // --- Run Validation (Unchanged) ---
        const isFormValid = validateForm();

        if (isFormValid) {
            // --- Validation Passed: INITIATE OTP FLOW ---
            console.log("Form valid. Initiating OTP flow...");
            // Clear previous OTP attempts
            setOtpValue('');
            setOtpError(null);
            setIsOtpModalOpen(true); // Open the OTP modal
            await handleSendOtp();     // Send the OTP

            // DO NOT proceed with proceedWithBookingSubmission() here.
            // It will be called by handleVerifyOtp upon successful verification.

        } else {
            // --- Validation Failed (Unchanged logic, including scroll) ---
            console.log("Validation failed. Errors:", errors);
            setSubmitError("Please fix the errors marked in the form before submitting.");
             // Scroll to the first error (Unchanged logic)
            const errorKeys = Object.keys(errors);
            if (errorKeys.length > 0) {
                const firstErrorKey = errorKeys[0];
                const elementToFocus = document.getElementById(firstErrorKey);
                 if (elementToFocus) {
                    elementToFocus.focus({ preventScroll: true });
                    elementToFocus.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    console.log(`Scrolled to the first error field: #${firstErrorKey}`);
                } else {
                    console.warn(`Could not find element with ID: #${firstErrorKey} to scroll to.`);
                }
            }
        }
    }, [
        validateForm, // Validation function
        errors,       // Current errors (for scrolling)
        isAuthenticated, // Auth check
        handleSendOtp // Now calls OTP send function
        // Removed bookingData, navigate, proceedWithBookingSubmission from THIS function's direct dependencies
        // as the final submission is now decoupled via OTP verification.
    ]);


    // --- Render Logic ---

    // 1. Loading state (Unchanged)
    if (isLoadingAuth) {
        return ( /* ... Loading Spinner ... */
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

    // 2. Not authenticated -> Show Prompt (Unchanged)
    if (!isAuthenticated) {
        return <PleaseLoginPrompt />;
    }

    // 3. Submission Success Overlay (Unchanged)
    if (isSubmitSuccess) {
        return ( /* ... Success Overlay ... */
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-green-50 text-center p-4">
             <GreenCheckmark />
            <h2 className="mt-6 text-2xl sm:text-3xl font-bold text-green-700">Booking Confirmed!</h2>
            <p className="mt-2 text-lg text-gray-600">Your BagEase booking is successful. Check your bookings page for details.</p>
          </div>
        );
    }

     // --- Modal setup (needs to be outside the return if using react-modal) ---
     // Bind modal to your appElement (for accessibility)
     useEffect(() => {
         if (typeof window !== 'undefined') { // Check if window exists (for SSR/build)
             const appElement = document.getElementById('root') || document.body; // Adjust if your root element has a different ID
             if (Modal.setAppElement && appElement) {
                 Modal.setAppElement(appElement);
             }
         }
     }, []);


    // 4. Authenticated, show the form (Structure largely unchanged, added Modal)
    const commonInputProps = (name: keyof typeof bookingData, isRequired = true) => ({
         // ... (commonInputProps definition remains exactly the same) ...
         id: name,
        name: name,
        onChange: handleChange,
        className: `mt-1 block w-full px-3 py-2 bg-white border ${errors[name] ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#ff8c00] focus:border-[#ff8c00] sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed`,
        disabled: isSubmitting || isOtpModalOpen || isSendingOtp || isVerifyingOtp, // Disable form while OTP modal is active or during submission
        'aria-invalid': errors[name] ? "true" : "false",
        'aria-describedby': errors[name] ? `${name}-error` : undefined,
    });

    return (
        <> {/* Use Fragment to wrap form and modal */}
            <div className={`min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 ${isOtpModalOpen ? 'filter blur-sm' : ''}`}>
                {/* Apply blur effect when modal is open */}
                <div className="max-w-3xl mx-auto">
                    {/* ... (H1, paragraph remain the same) ... */}
                    <h1 className="text-center text-3xl font-extrabold text-gray-900 mb-2">
                        Book Your BagEase Service
                    </h1>
                    <p className="text-center text-sm text-gray-600 mb-8">
                        Fill in the details below to arrange your baggage transfer.
                    </p>

                    {/* Form structure remains identical */}
                    <form onSubmit={handleSubmit} noValidate className="bg-white p-6 sm:p-8 rounded-lg shadow-lg space-y-8">
                        {/* General Submission Error (Displays form validation/final submit errors) */}
                        {submitError && (
                            <div id="submit-error-message" className="p-3 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-md text-sm" role="alert">
                                <p className="font-bold">Booking Error</p>
                                <p>{submitError}</p>
                            </div>
                        )}

                        {/* === Section 1: User Information === (JSX Unchanged) */}
                        <fieldset className="space-y-6">
                             {/* ... (Legend, Name, Phone, Email inputs and errors - all JSX identical) ... */}
                             <legend className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
                                1. Your Contact Information
                            </legend>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
                                    <input type="text" {...commonInputProps('name', true)} value={bookingData.name} placeholder="e.g., Priya Sharma" autoComplete="name" />
                                    {errors.name && <p id="name-error" className="mt-1 text-xs text-red-600">{errors.name}</p>}
                                </div>
                                <div>
                                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number (for OTP)</label>
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

                        {/* === Section 2: Pickup & Drop-Off Details === (JSX Unchanged) */}
                        <fieldset className="space-y-6 border-t border-gray-200 pt-6">
                            {/* ... (Legend, Location Types, Addresses, Date, Time, Train, PNR, Coach, Seat, Preference - all JSX identical) ... */}
                            <legend className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
                                2. Pickup & Drop-Off Details
                            </legend>
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
                                    <input type="text" {...commonInputProps('trainNumber', true)} value={bookingData.trainNumber} placeholder="e.g., 12345" />
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
                                />
                                {errors.pnrNumber && <p id="pnrNumber-error" className="mt-1 text-xs text-red-600">{errors.pnrNumber}</p>}
                            </div>
                             {/* Coach/Seat */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="coachNumber" className="block text-sm font-medium text-gray-700">
                                        Coach <span className="text-xs text-gray-500">(Req. if 'Deliver to Seat')</span>
                                    </label>
                                    <input
                                        type="text"
                                        {...commonInputProps('coachNumber', bookingData.deliveryPreference === 'Deliver to Seat')}
                                        value={bookingData.coachNumber}
                                        placeholder="e.g., S5"
                                        maxLength={4} />
                                    {errors.coachNumber && <p id="coachNumber-error" className="mt-1 text-xs text-red-600">{errors.coachNumber}</p>}
                                </div>
                                <div>
                                    <label htmlFor="seatNumber" className="block text-sm font-medium text-gray-700">
                                        Seat <span className="text-xs text-gray-500">(Req. if 'Deliver to Seat')</span>
                                    </label>
                                    <input
                                        type="text"
                                         {...commonInputProps('seatNumber', bookingData.deliveryPreference === 'Deliver to Seat')}
                                         value={bookingData.seatNumber}
                                         placeholder="e.g., 32"
                                         maxLength={3} />
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

                         {/* === Section 3: Luggage Details === (JSX Unchanged) */}
                        <fieldset className="space-y-6 border-t border-gray-200 pt-6">
                            {/* ... (Legend, Bags, Weight, Notes, Insurance - all JSX identical) ... */}
                            <legend className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
                                3. Luggage Details
                            </legend>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="numberOfBags" className="block text-sm font-medium text-gray-700">Number of Bags</label>
                                    <input type="number" {...commonInputProps('numberOfBags', true)} value={bookingData.numberOfBags} min="1" max="20" step="1" placeholder="1" />
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
                                    placeholder="e.g., Fragile items inside, handle with care, contains electronics..."
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
                                        disabled={isSubmitting || isOtpModalOpen || isSendingOtp || isVerifyingOtp} // Also disable during OTP
                                        className="focus:ring-[#ff8c00] h-4 w-4 text-[#ff8c00] border-gray-300 rounded disabled:opacity-50"
                                    />
                            </div>
                                <div className="ml-3 text-sm">
                                    <label htmlFor="insuranceRequested" className="font-medium text-gray-700">
                                        Add Luggage Insurance?
                                    </label>
                                    <p className="text-xs text-gray-500">(Optional, additional charges may apply)</p>
                                </div>
                            </div>
                        </fieldset>

                        {/* === Section 4: Service & Payment === (JSX Unchanged) */}
                        <fieldset className="space-y-6 border-t border-gray-200 pt-6">
                             {/* ... (Legend, Service Type, Payment Mode - all JSX identical) ... */}
                            <legend className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
                                4. Service & Payment
                            </legend>
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

                        {/* === Submit Button (Now triggers OTP) === */}
                        <div className="pt-5 border-t border-gray-200">
                            <button
                                type="submit"
                                // Disable button if OTP modal is open, sending/verifying OTP, or during final submission
                                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-base font-medium rounded-md text-white bg-[#ff8c00] hover:bg-[#e07b00] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff8c00] disabled:opacity-60 disabled:cursor-not-allowed transition duration-150 ease-in-out"
                                disabled={isSubmitting || !isAuthenticated || isOtpModalOpen || isSendingOtp || isVerifyingOtp}
                            >
                                {isSendingOtp ? (
                                    <> {/* Spinner while initially sending OTP */}
                                         <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg>
                                         Sending OTP...
                                    </>
                                ) : isSubmitting ? (
                                     <> {/* Spinner during final DB submission */}
                                         <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg>
                                         Processing Booking...
                                    </>
                                ) : (
                                    'Confirm & Verify Phone' // Changed button text
                                )}
                            </button>
                        </div>

                         {/* --- Footer Info --- (Unchanged) */}
                         <div className="text-center text-xs text-gray-500 pt-4">
                             {/* ... (Terms, Privacy, Contact links remain the same) ... */}
                             <p>By clicking confirm, you agree to BagEase's <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#ff8c00] hover:underline">Terms of Service</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#ff8c00] hover:underline">Privacy Policy</a>.</p>
                             <p className="mt-1">Need help? Call us at <a href="tel:+91XXXXXXXXXX" className="text-[#ff8c00] hover:underline">+91-XXX-XXXXXXX</a> or visit our Help Center.</p>
                         </div>
                    </form> {/* --- Form End --- */}
                </div>
            </div> {/* --- Main Container End --- */}

            {/* --- NEW: OTP Verification Modal --- */}
            <Modal
                isOpen={isOtpModalOpen}
                onRequestClose={() => !isVerifyingOtp && !isSendingOtp && setIsOtpModalOpen(false)} // Close only if not busy
                contentLabel="OTP Verification"
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                overlayClassName="fixed inset-0 bg-black bg-opacity-60 z-40"
                shouldCloseOnOverlayClick={!isVerifyingOtp && !isSendingOtp} // Prevent accidental close during verification
            >
                <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm text-center">
                    <h2 className="text-xl font-bold text-gray-800 mb-3">Verify Your Phone Number</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        Enter the 6-digit code sent to <span className="font-medium">{phoneForOtp}</span>.
                    </p>

                    {/* Display OTP specific errors here */}
                    {otpError && (
                        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm text-left" role="alert">
                           <p>{otpError}</p>
                        </div>
                    )}

                    <form onSubmit={handleVerifyOtp}>
                        <label htmlFor="otp" className="sr-only">OTP Code</label>
                        <input
                            type="text"
                            id="otp"
                            name="otp"
                            value={otpValue}
                            onChange={(e) => setOtpValue(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} // Allow only 6 digits
                            className="mt-1 block w-full px-3 py-2 text-center text-lg tracking-widest bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#ff8c00] focus:border-[#ff8c00] sm:text-sm disabled:bg-gray-100"
                            placeholder="------"
                            maxLength={6}
                            autoComplete="one-time-code"
                            required
                            disabled={isVerifyingOtp || isSendingOtp}
                        />

                         <button
                            type="submit"
                            className="mt-5 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#ff8c00] hover:bg-[#e07b00] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff8c00] disabled:opacity-60 disabled:cursor-wait"
                            disabled={isVerifyingOtp || isSendingOtp || otpValue.length !== 6}
                        >
                            {isVerifyingOtp ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg>
                                    Verifying...
                                </>
                             ) : (
                                'Verify & Confirm Booking'
                            )}
                        </button>
                    </form>

                     {/* Resend OTP Option */}
                     <div className="mt-4 text-xs text-gray-500">
                         Didn't receive code?{' '}
                         <button
                             type="button"
                             onClick={handleSendOtp} // Re-use the send OTP function
                             disabled={isSendingOtp || isVerifyingOtp}
                             className="font-medium text-[#ff8c00] hover:text-[#e07b00] disabled:text-gray-400 disabled:cursor-not-allowed"
                         >
                             {isSendingOtp ? 'Sending...' : 'Resend OTP'}
                         </button>
                     </div>

                    <button
                        type="button"
                        onClick={() => !isVerifyingOtp && !isSendingOtp && setIsOtpModalOpen(false)}
                        disabled={isVerifyingOtp || isSendingOtp}
                        className="mt-2 text-sm text-gray-500 hover:text-gray-700 disabled:text-gray-400"
                    >
                        Cancel
                    </button>
                </div>
            </Modal>
        </>
    );
};

export default Book;