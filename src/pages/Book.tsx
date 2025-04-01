import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

// --- Reusable Green Checkmark Component ---
const GreenCheckmark = () => (
    <svg /* ... SVG code as before ... */
      className="w-20 h-20 sm:w-24 sm:h-24 text-green-500"
      fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      viewBox="0 0 24 24" stroke="currentColor"
    >
      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
);

// --- Main Booking Component ---
const Book = () => {
    const navigate = useNavigate();

    // --- State ---
    const [bookingData, setBookingData] = useState({
        // 1. User Information
        name: '',
        phone: '',
        email: '',
        // TODO: Add state for OTP input if implementing verification flow
        // otp: '',

        // 2. Pickup & Drop-Off Details
        pickupLocationType: '', // Home, Hotel, Station, Office
        pickupAddress: '',      // Full address or Station Name
        dropLocationType: '',   // Train Station, Home, Hotel, Other
        dropAddress: '',        // Full address or Station Name
        pickupDate: '',
        pickupTime: '',
        trainNumber: '',
        trainName: '',          // Optional, might be fetched
        pnrNumber: '',
        coachNumber: '',
        seatNumber: '',
        deliveryPreference: '', // Deliver to Seat, Collect from Kiosk, Store in Transit

        // 3. Luggage Details
        numberOfBags: '1',      // Default to 1
        weightCategory: '',     // Up to 10kg, 10-20kg, 20kg+
        specialItemsDescription: '', // Text area for details
        insuranceRequested: false,   // Checkbox

        // 5. Pricing & Payment (Service Type drives pricing logic elsewhere)
        serviceType: '',        // Standard, Express
        paymentMode: '',        // UPI, Card, NetBanking, Wallet, POD
        // subscriptionPlan: '', // Could be another field if applicable

        // Internal/Meta (Not directly user input on this form)
        // rfidTrackingId: '', // Generated backend
        // estimatedCost: 0,   // Calculated backend/frontend logic
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);
    // Optional: State to hold fetched train details if PNR API implemented
    // const [fetchedTrainDetails, setFetchedTrainDetails] = useState(null);

    // --- Authentication Check ---
    useEffect(() => {
        // ... (Existing Auth check logic remains the same - copied from previous good version) ...
        const checkUserSession = async () => {
            setIsLoadingAuth(true);
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) {
                console.error("Error checking Supabase session:", error.message);
                navigate('/login'); return;
            }
            if (!session) {
                console.log("User not authenticated. Redirecting...");
                navigate('/login');
            } else {
                console.log("User authenticated.");
                 // Pre-fill email/name from session if desired and not already filled
                setBookingData(prev => ({
                    ...prev,
                    email: prev.email || session.user?.email || '',
                    name: prev.name || session.user?.user_metadata?.full_name || ''
                }));
                setIsLoadingAuth(false);
            }
        };
        checkUserSession();
        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session && !isLoadingAuth) { navigate('/login'); }
        });
        return () => { authListener?.subscription.unsubscribe(); };
    }, [navigate, isLoadingAuth]); // Keep dependencies minimal

    // --- Get Current Date and Time for Min Values ---
    const getMinDateTime = () => {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        // Allow booking for current time + buffer (e.g., 1 hour)
        now.setHours(now.getHours() + 1);
        const minTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
        return { minDate: today, minTimeForToday: minTime };
    }
    const { minDate, minTimeForToday } = getMinDateTime();


    // --- Validation Function ---
    const validateForm = useCallback((): boolean => {
        const newErrors: Record<string, string> = {};
        const data = bookingData; // easier reference

        // 1. User Info
        if (!data.name.trim()) newErrors.name = 'Full Name is required';
        if (!data.phone.trim()) newErrors.phone = 'Phone number is required';
        else if (!/^\+?[\d\s-]{10,15}$/.test(data.phone)) newErrors.phone = 'Enter a valid phone number';
        // TODO: Add OTP validation if implemented
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
            newErrors.pickupTime = `Time cannot be in the past (min. ${minTimeForToday})`;
        }
        // Train Details - Make PNR required? Or train number? Adjust based on need.
        if (!data.trainNumber.trim()) newErrors.trainNumber = 'Train number is required';
        if (!data.pnrNumber.trim()) {
            // newErrors.pnrNumber = 'PNR number is required'; // Make optional if needed
        } else if (!/^\d{10}$/.test(data.pnrNumber.trim())) {
            newErrors.pnrNumber = 'PNR must be 10 digits';
        }
        // Coach & Seat might be optional initially, required if 'Deliver to Seat'
        if (data.deliveryPreference === 'Deliver to Seat') {
            if (!data.coachNumber.trim()) newErrors.coachNumber = 'Coach number required for seat delivery';
            if (!data.seatNumber.trim()) newErrors.seatNumber = 'Seat number required for seat delivery';
        }
        if (!data.deliveryPreference) newErrors.deliveryPreference = 'Select a delivery preference';


        // 3. Luggage Details
        const bags = parseInt(data.numberOfBags, 10);
        if (isNaN(bags) || bags <= 0) newErrors.numberOfBags = 'Enter a valid number of bags';
        if (!data.weightCategory) newErrors.weightCategory = 'Select a weight category';
        // specialItemsDescription is optional text
        // insuranceRequested is optional checkbox

        // 5. Pricing & Payment
        if (!data.serviceType) newErrors.serviceType = 'Select a service type';
        if (!data.paymentMode) newErrors.paymentMode = 'Select a payment mode';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [bookingData, minDate, minTimeForToday]); // Add dependencies

    // --- Handle Change ---
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;

        // Handle checkboxes specifically
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setBookingData(prevData => ({ ...prevData, [name]: checked }));
        } else {
            setBookingData(prevData => ({ ...prevData, [name]: value }));
        }

        // Clear the specific error when the user modifies the field
        if (errors[name]) {
            setErrors(prevErrors => {
                const updatedErrors = { ...prevErrors };
                delete updatedErrors[name]; // Remove the specific error
                return updatedErrors;
            });
        }
    };

    // --- Handle PNR Fetch (Placeholder) ---
    const handlePnrFetch = async () => {
        if (!bookingData.pnrNumber || !/^\d{10}$/.test(bookingData.pnrNumber)) {
            setErrors(prev => ({...prev, pnrNumber: 'Enter a valid 10-digit PNR to fetch details'}));
            return;
        }
        alert(`TODO: Implement API call to fetch details for PNR: ${bookingData.pnrNumber}`);
        // Example:
        // try {
        //   setIsFetchingPnr(true); // Add state for loading indicator
        //   const response = await fetch(`/api/pnr-details?pnr=${bookingData.pnrNumber}`); // Your API endpoint
        //   if (!response.ok) throw new Error('Failed to fetch PNR details');
        //   const details = await response.json();
        //   setFetchedTrainDetails(details); // Store fetched data
        //   setBookingData(prev => ({ ...prev, trainNumber: details.trainNumber, trainName: details.trainName, /* maybe date */ }));
        //   setErrors(prev => ({...prev, pnrNumber: ''})); // Clear PNR error on success
        // } catch (error: any) {
        //   setErrors(prev => ({...prev, pnrNumber: `Error fetching PNR: ${error.message}`}));
        // } finally {
        //   setIsFetchingPnr(false);
        // }
    };

    // --- Handle Submit ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError(null);
        setIsSubmitSuccess(false);

        if (validateForm()) {
            setIsSubmitting(true);
            try {
                // Get user ID for linking booking
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error("User not found. Please log in again.");

                // Prepare data for Supabase (MATCH YOUR COLUMN NAMES)
                const dataToSubmit = {
                    user_id: user.id,
                    name: bookingData.name.trim(),
                    phone: bookingData.phone.trim(),
                    email: bookingData.email.trim(),
                    pickup_location_type: bookingData.pickupLocationType,
                    pickup_address: bookingData.pickupAddress.trim(),
                    drop_location_type: bookingData.dropLocationType,
                    drop_address: bookingData.dropAddress.trim(),
                    pickup_date: bookingData.pickupDate, // Should be YYYY-MM-DD
                    pickup_time: bookingData.pickupTime, // Should be HH:MM
                    train_number: bookingData.trainNumber.trim(),
                    train_name: bookingData.trainName.trim() || null, // Optional
                    pnr_number: bookingData.pnrNumber.trim() || null, // Optional or required based on validation
                    coach_number: bookingData.coachNumber.trim() || null,
                    seat_number: bookingData.seatNumber.trim() || null,
                    delivery_preference: bookingData.deliveryPreference,
                    number_of_bags: parseInt(bookingData.numberOfBags, 10),
                    weight_category: bookingData.weightCategory,
                    special_items_description: bookingData.specialItemsDescription.trim() || null,
                    insurance_requested: bookingData.insuranceRequested,
                    service_type: bookingData.serviceType,
                    payment_mode: bookingData.paymentMode,
                    // Add other fields like calculated cost, status etc. if needed
                    // estimated_cost: calculatedCost, // Needs calculation logic
                    booking_status: 'Pending', // Default status
                };

                console.log("Submitting to Supabase:", dataToSubmit);

                const { error } = await supabase
                    .from('bookings') // Ensure 'bookings' is correct table name
                    .insert([dataToSubmit]);

                if (error) {
                    console.error('Supabase booking insert error:', error);
                    setSubmitError(`Booking failed: ${error.message}. Please try again.`);
                    setIsSubmitting(false); // Stop loading on error
                } else {
                    console.log('Booking successful!');
                    setIsSubmitSuccess(true); // Show success overlay

                    // Reset form after delay
                    setTimeout(() => {
                        setBookingData({ // Reset to initial state
                            name: '', phone: '', email: '', pickupLocationType: '', pickupAddress: '',
                            dropLocationType: '', dropAddress: '', pickupDate: '', pickupTime: '',
                            trainNumber: '', trainName: '', pnrNumber: '', coachNumber: '', seatNumber: '',
                            deliveryPreference: '', numberOfBags: '1', weightCategory: '',
                            specialItemsDescription: '', insuranceRequested: false, serviceType: '',
                            paymentMode: '',
                        });
                        setErrors({});
                        // setFetchedTrainDetails(null); // Reset fetched data too
                        setIsSubmitSuccess(false); // Hide success screen
                        setIsSubmitting(false); // Ensure submitting is false
                        // navigate('/my-bookings'); // Optional redirect
                    }, 4000); // Show success for 4 seconds
                }
            } catch (err: any) {
                console.error('Error during submission process:', err);
                setSubmitError(err.message || 'An unexpected error occurred.');
                setIsSubmitting(false);
            }
            // No finally block needed here as isSubmitting is handled in success/error paths

        } else {
            console.log("Validation failed", errors);
            // Focus the first invalid field
             const firstErrorKey = Object.keys(errors)[0];
             if (firstErrorKey) {
                 const element = document.getElementById(firstErrorKey);
                 element?.focus({ preventScroll: true }); // Focus without jarring scroll
                 element?.scrollIntoView({ behavior: 'smooth', block: 'center' }); // Scroll smoothly to center
             }
             setSubmitError("Please fix the errors marked below."); // General error message
        }
    };

    // --- Render Logic ---
    if (isLoadingAuth) { /* ... Loading indicator ... */
        return ( <div className="flex justify-center items-center min-h-screen"><p className="text-xl text-gray-600 animate-pulse">Loading...</p></div> );
    }
    if (isSubmitSuccess) { /* ... Success Overlay ... */
        return (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-green-50 text-center p-4">
            <GreenCheckmark />
            <h2 className="mt-6 text-2xl sm:text-3xl font-bold text-green-700">Booking Confirmed!</h2>
            <p className="mt-2 text-lg text-gray-600">Your BagEase booking is successful. Check your email for details.</p>
            {/* TODO: Add link to view booking or track */}
          </div>
        );
    }

    // --- Helper for input/select props ---
    const commonInputProps = (name: keyof typeof bookingData, isRequired = true) => ({
        id: name,
        name: name,
        onChange: handleChange,
        className: `mt-1 block w-full px-3 py-2 bg-white border ${errors[name] ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-[#ff8c00] focus:border-[#ff8c00] sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed`,
        disabled: isSubmitting,
        required: isRequired, // HTML5 validation hint
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
                    Simple, secure, and convenient baggage transfer.
                </p>

                <form onSubmit={handleSubmit} noValidate className="bg-white p-6 sm:p-8 rounded-lg shadow-md space-y-8">

                    {/* General Submission Error */}
                    {submitError && !isSubmitSuccess && (
                        <div className="p-3 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-md text-sm" role="alert">
                            <p className="font-bold">Booking Error</p>
                            <p>{submitError}</p>
                        </div>
                    )}

                    {/* === Section 1: User Information === */}
                    <fieldset className="space-y-6">
                        <legend className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
                            1. Your Information
                        </legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
                                <input type="text" {...commonInputProps('name')} value={bookingData.name} placeholder="e.g., Priya Sharma" />
                                {errors.name && <p id="name-error" className="mt-1 text-xs text-red-600">{errors.name}</p>}
                            </div>
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number</label>
                                <input type="tel" {...commonInputProps('phone')} value={bookingData.phone} placeholder="e.g., 9876543210" />
                                {errors.phone && <p id="phone-error" className="mt-1 text-xs text-red-600">{errors.phone}</p>}
                                {/* TODO: Add OTP button/input here */}
                                {/* <button type="button" disabled={isSubmitting} className="mt-1 text-xs text-[#ff8c00] hover:underline">Send OTP</button> */}
                            </div>
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                            <input type="email" {...commonInputProps('email')} value={bookingData.email} placeholder="you@example.com"/>
                            {errors.email && <p id="email-error" className="mt-1 text-xs text-red-600">{errors.email}</p>}
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
                                <label htmlFor="pickupLocationType" className="block text-sm font-medium text-gray-700">Pickup Location Type</label>
                                <select {...commonInputProps('pickupLocationType')} value={bookingData.pickupLocationType}>
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
                                <input type="text" {...commonInputProps('pickupAddress')} value={bookingData.pickupAddress} placeholder="Full Address or Station Name" />
                                {errors.pickupAddress && <p id="pickupAddress-error" className="mt-1 text-xs text-red-600">{errors.pickupAddress}</p>}
                            </div>
                        </div>

                        {/* Drop-off Location */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                <label htmlFor="dropLocationType" className="block text-sm font-medium text-gray-700">Drop-off Location Type</label>
                                <select {...commonInputProps('dropLocationType')} value={bookingData.dropLocationType}>
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
                        <h3 className="text-md font-medium text-gray-700 pt-4 border-t border-gray-100">Train Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div>
                                <label htmlFor="trainNumber" className="block text-sm font-medium text-gray-700">Train Number</label>
                                <input type="text" {...commonInputProps('trainNumber')} value={bookingData.trainNumber} placeholder="e.g., 12345" />
                                {errors.trainNumber && <p id="trainNumber-error" className="mt-1 text-xs text-red-600">{errors.trainNumber}</p>}
                            </div>
                             <div>
                                <label htmlFor="trainName" className="block text-sm font-medium text-gray-700">Train Name <span className="text-xs text-gray-500">(Optional)</span></label>
                                <input type="text" {...commonInputProps('trainName', false)} value={bookingData.trainName} placeholder="e.g., Rajdhani Express" />
                                {/* No error display needed for optional field */}
                            </div>
                        </div>
                         <div className="relative">
                            <label htmlFor="pnrNumber" className="block text-sm font-medium text-gray-700">PNR Number</label>
                            <input
                                type="text"
                                {...commonInputProps('pnrNumber', false)} // PNR might be optional depending on your flow
                                value={bookingData.pnrNumber}
                                placeholder="10-digit PNR"
                                maxLength={10}
                            />
                             {/* TODO: Uncomment and style this button if API fetch is implemented */}
                            {/* <button
                                type="button"
                                onClick={handlePnrFetch}
                                disabled={isSubmitting || !/^\d{10}$/.test(bookingData.pnrNumber)}
                                className="absolute right-2 top-7 text-xs px-2 py-1 bg-[#ff8c00] text-white rounded hover:bg-[#e07b00] disabled:opacity-50"
                             >
                                Fetch Details
                            </button> */}
                            {errors.pnrNumber && <p id="pnrNumber-error" className="mt-1 text-xs text-red-600">{errors.pnrNumber}</p>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                <label htmlFor="coachNumber" className="block text-sm font-medium text-gray-700">Coach Number <span className="text-xs text-gray-500">(e.g., S1, B2, A1)</span></label>
                                <input type="text" {...commonInputProps('coachNumber', bookingData.deliveryPreference === 'Deliver to Seat')} value={bookingData.coachNumber} placeholder="e.g., S5" maxLength={4} />
                                {errors.coachNumber && <p id="coachNumber-error" className="mt-1 text-xs text-red-600">{errors.coachNumber}</p>}
                            </div>
                             <div>
                                <label htmlFor="seatNumber" className="block text-sm font-medium text-gray-700">Seat Number</label>
                                <input type="text" {...commonInputProps('seatNumber', bookingData.deliveryPreference === 'Deliver to Seat')} value={bookingData.seatNumber} placeholder="e.g., 32" maxLength={3} />
                                {errors.seatNumber && <p id="seatNumber-error" className="mt-1 text-xs text-red-600">{errors.seatNumber}</p>}
                            </div>
                        </div>

                        {/* Delivery Preference */}
                        <div>
                            <label htmlFor="deliveryPreference" className="block text-sm font-medium text-gray-700">Delivery Preference</label>
                            <select {...commonInputProps('deliveryPreference')} value={bookingData.deliveryPreference}>
                                <option value="" disabled>-- Select Preference --</option>
                                <option value="Deliver to Seat">Deliver to Seat</option>
                                <option value="Collect from Kiosk">Collect from Station Kiosk</option>
                                <option value="Store in Transit">Store in Transit Storage (if delayed)</option>
                            </select>
                             {errors.deliveryPreference && <p id="deliveryPreference-error" className="mt-1 text-xs text-red-600">{errors.deliveryPreference}</p>}
                        </div>

                    </fieldset>

                    {/* === Section 3: Luggage Details === */}
                    <fieldset className="space-y-6 border-t border-gray-200 pt-6">
                        <legend className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
                            3. Luggage Details
                        </legend>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="numberOfBags" className="block text-sm font-medium text-gray-700">Number of Bags</label>
                                <input type="number" {...commonInputProps('numberOfBags')} value={bookingData.numberOfBags} min="1" max="20" step="1" placeholder="e.g., 2" />
                                {errors.numberOfBags && <p id="numberOfBags-error" className="mt-1 text-xs text-red-600">{errors.numberOfBags}</p>}
                            </div>
                             <div>
                                <label htmlFor="weightCategory" className="block text-sm font-medium text-gray-700">Total Weight Category (Approx)</label>
                                <select {...commonInputProps('weightCategory')} value={bookingData.weightCategory}>
                                    <option value="" disabled>-- Select Weight --</option>
                                    <option value="0-10kg">Up to 10kg</option>
                                    <option value="10-20kg">10 - 20kg</option>
                                    <option value="20kg+">More than 20kg</option>
                                </select>
                                 {errors.weightCategory && <p id="weightCategory-error" className="mt-1 text-xs text-red-600">{errors.weightCategory}</p>}
                            </div>
                        </div>
                        <div>
                            <label htmlFor="specialItemsDescription" className="block text-sm font-medium text-gray-700">Special Items? <span className="text-xs text-gray-500">(Optional: e.g., Electronics, Fragile, Valuables)</span></label>
                             <textarea
                                {...commonInputProps('specialItemsDescription', false)} // Optional field
                                value={bookingData.specialItemsDescription}
                                rows={3}
                                placeholder="Describe any special items or handling instructions..."
                             ></textarea>
                             {/* No error display for optional field */}
                        </div>
                        <div className="flex items-center">
                           <input
                                id="insuranceRequested"
                                name="insuranceRequested"
                                type="checkbox"
                                checked={bookingData.insuranceRequested}
                                onChange={handleChange}
                                disabled={isSubmitting}
                                className="h-4 w-4 text-[#ff8c00] focus:ring-[#ff8c00] border-gray-300 rounded disabled:opacity-50"
                            />
                            <label htmlFor="insuranceRequested" className="ml-2 block text-sm text-gray-900">
                                Add Luggage Insurance? <span className="text-xs text-gray-500">(Optional, extra charges apply)</span>
                            </label>
                        </div>
                    </fieldset>

                     {/* === Section 4: Security (Placeholder Info) === */}
                     {/* You might display generated RFID here *after* successful booking confirmation, not on the form itself */}
                     {/* <fieldset className="border-t border-gray-200 pt-6">
                         <legend className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">4. Security</legend>
                         <p className="text-sm text-gray-600">An RFID tracking ID will be generated upon successful booking.</p>
                         <p className="text-sm text-gray-600">Optional biometric verification may be available at kiosks.</p>
                     </fieldset> */}


                    {/* === Section 5: Service & Payment === */}
                    <fieldset className="space-y-6 border-t border-gray-200 pt-6">
                        <legend className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
                            4. Service & Payment {/* Renumbered as Security is informational */}
                        </legend>
                         <div>
                            <label htmlFor="serviceType" className="block text-sm font-medium text-gray-700">Service Type</label>
                            <select {...commonInputProps('serviceType')} value={bookingData.serviceType}>
                                <option value="" disabled>-- Select Service --</option>
                                <option value="Standard">Standard Delivery</option>
                                <option value="Express">Express Delivery (Faster, Extra Fee)</option>
                                {/* <option value="Subscription">Subscription Plan Member</option> */}
                            </select>
                             {errors.serviceType && <p id="serviceType-error" className="mt-1 text-xs text-red-600">{errors.serviceType}</p>}
                        </div>

                        {/* Estimated Cost (Placeholder) */}
                         {/* <div>
                             <p className="text-sm font-medium text-gray-700">Estimated Cost:</p>
                             <p className="text-lg font-bold text-gray-900">₹ {calculateEstimatedCost() || '---'} </p>
                             <p className="text-xs text-gray-500">Final cost confirmed upon booking based on distance, weight, and options.</p>
                         </div> */}

                        <div>
                            <label htmlFor="paymentMode" className="block text-sm font-medium text-gray-700">Payment Option</label>
                            <select {...commonInputProps('paymentMode')} value={bookingData.paymentMode}>
                                <option value="" disabled>-- Select Payment --</option>
                                <option value="UPI">UPI</option>
                                <option value="Card">Debit/Credit Card</option>
                                <option value="NetBanking">Net Banking</option>
                                <option value="Wallet">Mobile Wallet</option>
                                <option value="POD">Pay on Delivery/Pickup (If available)</option>
                            </select>
                             {errors.paymentMode && <p id="paymentMode-error" className="mt-1 text-xs text-red-600">{errors.paymentMode}</p>}
                        </div>
                    </fieldset>

                    {/* === Submit Button === */}
                    <div className="pt-5">
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#ff8c00] hover:bg-[#e07b00] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff8c00] disabled:opacity-60 disabled:cursor-not-allowed"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" /* ... SVG spinner ... */ xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Booking...
                                </>
                            ) : (
                                'Confirm Booking'
                            )}
                        </button>
                    </div>
                     {/* Additional Info */}
                     <div className="text-center text-xs text-gray-500 pt-4">
                         <p>By clicking "Confirm Booking", you agree to our Terms of Service and Privacy Policy.</p>
                         <p>Need Help? Contact Support at <a href="tel:+91XXXXXXXXXX" className="text-[#ff8c00] hover:underline">+91 XXXXXXXXXX</a></p>
                         {/* TODO: Add link to modify/cancel info */}
                     </div>
                </form>
            </div>
        </div>
    );
};

export default Book;