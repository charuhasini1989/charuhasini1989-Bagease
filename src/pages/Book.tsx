import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { User } from '@supabase/supabase-js'; // Import User type

// --- Reusable Components (Keep as they are) ---
const GreenCheckmark = () => (
    <svg /* ... SVG code ... */
      className="w-20 h-20 sm:w-24 sm:h-24 text-green-500"
      fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      viewBox="0 0 24 24" stroke="currentColor"
    >
      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
);

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

// --- Helper Type for Order Status ---
type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Out for Delivery' | 'Delivered' | 'Cancelled' | 'Failed';

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
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    // --- Authentication Check (Keep as is) ---
    useEffect(() => {
        let isMounted = true;
        setIsLoadingAuth(true);

        const checkUserSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (!isMounted) return;
                if (error) throw new Error(`Auth Session Error: ${error.message}`);

                if (!session) {
                    console.log("User not authenticated.");
                    setIsAuthenticated(false);
                    setCurrentUser(null);
                } else {
                    console.log("User authenticated:", session.user.id);
                    setIsAuthenticated(true);
                    setCurrentUser(session.user);
                    setBookingData(prev => ({
                        ...prev,
                        email: prev.email || session.user?.email || '',
                        name: prev.name || session.user?.user_metadata?.full_name || ''
                    }));
                }
            } catch (err: any) {
                 if (!isMounted) return;
                 console.error("Error during auth check:", err);
                 setIsAuthenticated(false);
                 setCurrentUser(null);
            } finally {
                 if (isMounted) setIsLoadingAuth(false);
            }
        };

        checkUserSession();

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
             // Check mount status AND ensure initial check isn't still running
            if (isMounted && !isLoadingAuth) {
                 const currentlyAuth = !!session;
                 // Only update if state actually changes to prevent loops
                 if (currentlyAuth !== isAuthenticated) {
                    console.log(`Auth state changed: User is now ${currentlyAuth ? 'authenticated' : 'not authenticated'}.`);
                    setIsAuthenticated(currentlyAuth);
                    setCurrentUser(session?.user ?? null);
                    if (currentlyAuth && session) {
                         setBookingData(prev => ({
                            ...prev,
                            email: prev.email || session.user?.email || '',
                            name: prev.name || session.user?.user_metadata?.full_name || ''
                        }));
                    } else {
                        // Optionally clear sensitive fields on logout
                        // setBookingData(prev => ({ ...prev, name: '', phone: '' })); // Example
                    }
                 }
            }
        });

        return () => {
            isMounted = false;
            authListener?.subscription.unsubscribe();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Dependencies are intentionally minimal for mount-only logic


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
             const todayDate = new Date(minDate + 'T00:00:00');
             if (selectedDate < todayDate) newErrors.pickupDate = 'Pickup date cannot be in the past';
        }
        if (!data.pickupTime) newErrors.pickupTime = 'Pickup time is required';
        else if (data.pickupDate === minDate && data.pickupTime < minTimeForToday) {
            newErrors.pickupTime = `Time must be at least 1 hour from now (${minTimeForToday})`;
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

        // 4. Service & Payment
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

        // Clear the error for this field if it had one
        if (errors[name]) {
            setErrors(prevErrors => {
                const updatedErrors = { ...prevErrors };
                delete updatedErrors[name];
                return updatedErrors;
            });
        }
    }, [errors]); // Dependency on errors is correct here

    // --- Handle PNR Fetch (Keep as is - Placeholder) ---
    const handlePnrFetch = useCallback(async () => {
        // ... (implementation unchanged)
        alert(`TODO: Implement API call to fetch details for PNR: ${bookingData.pnrNumber}`);
    }, [bookingData.pnrNumber]);


    // --- Client-Side Assignment Function (Keep as is) ---
    const assignRandomDeliveryPerson = useCallback(async (orderId: number, userId: string): Promise<boolean> => {
        console.log(`Attempting to assign random personnel to order ${orderId}...`);
        try {
            // 1. Get random personnel ID
            const { data: personnelData, error: rpcError } = await supabase.rpc(
                'get_random_active_personnel'
            );
            if (rpcError) throw new Error(`RPC Error finding personnel: ${rpcError.message}`);
            if (!personnelData || personnelData.length === 0 || !personnelData[0]?.id) {
                throw new Error("No active delivery personnel found.");
            }
            const personnelId = personnelData[0].id;
            console.log(`Selected personnel ID: ${personnelId} for order ${orderId}`);

            // 2. Create assignment
            const { error: assignmentError } = await supabase
                .from('delivery_assignments')
                .insert({ order_id: orderId, personnel_id: personnelId, status: 'Assigned' });
            if (assignmentError) throw new Error(`Assignment creation failed: ${assignmentError.message}`);
            console.log(`Assignment created for order ${orderId}`);

            // 3. Update order status
            const { error: orderUpdateError } = await supabase
                .from('orders')
                .update({ status: 'Out for Delivery' as OrderStatus })
                .eq('id', orderId)
                .eq('user_id', userId); // Ensure user can only update their own order
            if (orderUpdateError) throw new Error(`Order status update failed: ${orderUpdateError.message}`);
            console.log(`Order ${orderId} status updated to Out for Delivery`);

            return true; // Success

        } catch (error: any) {
            console.error(`Error assigning delivery person to order ${orderId}:`, error);
            setSubmitError(`Booking confirmed, but failed to assign delivery: ${error.message}. Please contact support if needed.`); // Slightly more helpful message
            return false; // Failure
        }
    }, []); // No external dependencies needed


    // --- Handle Submit (Modified Error Message Handling) ---
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAuthenticated || !currentUser) {
             setSubmitError("Authentication error. Please try logging out and back in.");
             setIsAuthenticated(false); // Force re-render to show login prompt potentially
             return;
        }

        setSubmitError(null); // Clear previous submission errors
        setIsSubmitSuccess(false);

        // Re-validate just before submitting
        const isValid = validateForm();

        if (isValid) {
            setIsSubmitting(true);
            let insertedBookingId: string | null = null;
            let insertedOrderId: number | null = null;
            let assignmentAttempted = false;
            let assignmentSucceeded = false;

            try {
                // 1. Prepare Booking Data
                const bookingPayload = {
                    user_id: currentUser.id,
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
                    booking_status: 'Confirmed', // Default status
                };
                console.log("Submitting booking:", bookingPayload);

                // 2. Insert into 'bookings' table
                const { data: insertedBooking, error: bookingError } = await supabase
                    .from('bookings')
                    .insert(bookingPayload)
                    .select('id')
                    .single();

                if (bookingError) throw new Error(`Booking insert failed: ${bookingError.message}`);
                if (!insertedBooking?.id) throw new Error("Booking created but failed to get ID.");
                insertedBookingId = insertedBooking.id;
                console.log('Booking successful! ID:', insertedBookingId);

                // 3. Prepare and Insert into 'orders' table
                const orderPayload = {
                    user_id: currentUser.id,
                    booking_id: insertedBookingId,
                    status: 'Pending' as OrderStatus,
                    total_amount: 0, // Placeholder: Calculate actual amount based on service, weight etc.
                    order_number: `BE${Date.now().toString().slice(-6)}`,
                };
                console.log("Submitting order:", orderPayload);

                const { data: insertedOrder, error: orderError } = await supabase
                    .from('orders')
                    .insert(orderPayload)
                    .select('id')
                    .single();

                if (orderError) throw new Error(`Order creation failed: ${orderError.message}`);
                if (!insertedOrder?.id) throw new Error("Order created but failed to get ID.");
                insertedOrderId = insertedOrder.id;
                console.log(`Order created! ID: ${insertedOrderId}, linked to Booking ID: ${insertedBookingId}`);

                // 4. Assign Delivery Person
                assignmentAttempted = true;
                assignmentSucceeded = await assignRandomDeliveryPerson(insertedOrderId, currentUser.id);

                // 5. Handle overall success/partial success
                setIsSubmitSuccess(true); // Show success overlay
                // The error message for assignment failure is set within assignRandomDeliveryPerson
                if (!assignmentSucceeded) {
                    console.warn("Booking/Order succeeded, but assignment failed.");
                } else {
                    setSubmitError(null); // Ensure no residual error message on full success
                }

            } catch (err: any) {
                console.error('Error during submission process:', err);
                // Set a general submission error message
                setSubmitError(err.message || 'An unexpected error occurred during booking.');
                // Ensure errors object is cleared if the error is NOT from validation
                setErrors({}); // Clear validation errors as this is a submit-time error
            } finally {
                 // Reset form ONLY if booking+order succeeded (even if assignment failed)
                if (insertedOrderId) {
                    const resetDelay = assignmentAttempted && !assignmentSucceeded ? 5000 : 3000;
                    setTimeout(() => {
                        setIsSubmitSuccess(false);
                        setBookingData({ // Reset form state
                            name: currentUser?.user_metadata?.full_name || '', // Keep name/email if available
                            phone: '', email: currentUser?.email || '', pickupLocationType: '', pickupAddress: '',
                            dropLocationType: '', dropAddress: '', pickupDate: '', pickupTime: '',
                            trainNumber: '', trainName: '', pnrNumber: '', coachNumber: '', seatNumber: '',
                            deliveryPreference: '', numberOfBags: '1', weightCategory: '',
                            specialItemsDescription: '', insuranceRequested: false, serviceType: '',
                            paymentMode: '',
                        });
                        setErrors({});
                        setSubmitError(null); // Clear final error state
                        setIsSubmitting(false);
                        // navigate('/my-bookings'); // Optional redirect
                    }, resetDelay);
                } else {
                     // If booking or order insert failed, just stop submitting
                     setIsSubmitting(false);
                }
            }
        } else {
            // Validation failed - errors state is already set by validateForm
            console.log("Validation failed with errors:", errors);
            // *** MODIFICATION: Set a generic validation error message ***
            // The specific count will be displayed dynamically near this message.
            setSubmitError('Please review the errors highlighted below.');

            // Focus and scroll to the first error field
            const firstErrorKey = Object.keys(errors)[0];
            if (firstErrorKey) {
                const element = document.getElementById(firstErrorKey);
                 // *** User Comfort: Added check for element existence ***
                 if (element) {
                     setTimeout(() => { // Delay helps browser focus after state updates
                         element.focus({ preventScroll: true }); // Prevent default jump
                         element.scrollIntoView({ behavior: 'smooth', block: 'center' }); // Smooth scroll to center
                     }, 50);
                 } else {
                    console.warn(`Could not find element with ID: ${firstErrorKey} to focus.`);
                 }
            }
            setIsSubmitting(false); // Re-enable submit button
        }
    }, [bookingData, validateForm, isAuthenticated, currentUser, errors, assignRandomDeliveryPerson, getMinDateTime]); // Added getMinDateTime just in case min values need re-calc


    // --- Render Logic ---

    // 1. Auth Loading state (Keep as is)
    if (isLoadingAuth) {
        return (
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

    // 2. Not authenticated -> Show Login Prompt (Keep as is)
    if (!isAuthenticated) {
        return <PleaseLoginPrompt />;
    }

    // 3. Submission Success Overlay (Keep as is, handles assignment failure message well)
    if (isSubmitSuccess) {
        return (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-green-50 text-center p-4">
             <GreenCheckmark />
            <h2 className="mt-6 text-2xl sm:text-3xl font-bold text-green-700">Booking Confirmed!</h2>
            {/* Show specific message if assignment failed during the submit process */}
            {submitError?.includes('assign delivery') ? (
                 <p className="mt-2 text-lg text-orange-600 font-medium px-4">{submitError}</p>
            ) : (
                 <p className="mt-2 text-lg text-gray-600">Your BagEase booking is successful. Check 'My Account' for details.</p>
            )}
            {/* Adding a note about potential assignment delay message */}
             {submitError?.includes('assign delivery') && (
                 <p className="mt-1 text-sm text-gray-500">(You can view the final status in 'My Bookings'.)</p>
             )}
          </div>
        );
    }

    // 4. Authenticated: Show the Booking Form
    // Helper for input props (Keep as is)
    const commonInputProps = (name: keyof typeof bookingData, isRequired = true) => ({
         id: name,
        name: name,
        onChange: handleChange,
        className: `mt-1 block w-full px-3 py-2 bg-white border ${errors[name] ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#ff8c00] focus:border-[#ff8c00] sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed`,
        disabled: isSubmitting,
        required: isRequired, // Native browser validation can be a fallback/addition
        'aria-invalid': errors[name] ? "true" : "false",
        'aria-describedby': errors[name] ? `${name}-error` : undefined,
    });

    // *** Calculate current error count for dynamic display ***
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
                     {/* *** MODIFIED: General Submission/Validation Error Display *** */}
                     {/* This shows ONLY if isSubmitSuccess is false and there's a submitError */}
                    {submitError && !isSubmitSuccess && (
                        <div className="p-3 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-md text-sm mb-6 flex" role="alert">
                            {/* Optional: Alert Icon */}
                             <svg className="flex-shrink-0 w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                            </svg>
                            <div>
                                {/* *** Improved Title: Differentiates Validation vs Other Errors *** */}
                                <p className="font-bold">
                                    {currentErrorCount > 0 ? 'Validation Errors Found' : 'Oops! Something went wrong'}
                                </p>
                                {/* Display the main error message (generic validation or specific API error) */}
                                <p>{submitError}</p>
                                {/* *** Dynamic Error Count Display *** */}
                                {/* Shows only if the error is due to validation */}
                                {currentErrorCount > 0 && (
                                     <p className="mt-1 text-xs">
                                        Please fix the {currentErrorCount} error{currentErrorCount !== 1 ? 's' : ''} marked in red below.
                                    </p>
                                )}
                             </div>
                        </div>
                    )}

                    {/* === Section 1: User Information === */}
                    <fieldset className="space-y-6">
                         <legend className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">1. Your Contact Information</legend>
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
                         <legend className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">2. Pickup & Drop-Off Details</legend>
                         {/* Pickup Type / Address */}
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
                         {/* Dropoff Type / Address */}
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
                         {/* Pickup Date / Time */}
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
                                {/* No error display needed for optional field unless specific validation added */}
                            </div>
                        </div>
                         {/* PNR */}
                         <div className="relative">
                            <label htmlFor="pnrNumber" className="block text-sm font-medium text-gray-700">PNR Number <span className="text-xs text-gray-500">(Optional)</span></label>
                            <input type="text" {...commonInputProps('pnrNumber', false)} value={bookingData.pnrNumber} placeholder="10-digit PNR" maxLength={10} inputMode="numeric" pattern="\d{10}" />
                            {errors.pnrNumber && <p id="pnrNumber-error" className="mt-1 text-xs text-red-600">{errors.pnrNumber}</p>}
                             {/* Optional: Add PNR Fetch button here if desired */}
                        </div>
                         {/* Coach / Seat */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                <label htmlFor="coachNumber" className="block text-sm font-medium text-gray-700">Coach {bookingData.deliveryPreference === 'Deliver to Seat' && <span className="text-red-600">*</span>} <span className="text-xs text-gray-500">(Required if 'Deliver to Seat')</span></label>
                                <input type="text" {...commonInputProps('coachNumber', bookingData.deliveryPreference === 'Deliver to Seat')} value={bookingData.coachNumber} placeholder="e.g., S5" maxLength={5} />
                                {errors.coachNumber && <p id="coachNumber-error" className="mt-1 text-xs text-red-600">{errors.coachNumber}</p>}
                            </div>
                             <div>
                                <label htmlFor="seatNumber" className="block text-sm font-medium text-gray-700">Seat {bookingData.deliveryPreference === 'Deliver to Seat' && <span className="text-red-600">*</span>} <span className="text-xs text-gray-500">(Required if 'Deliver to Seat')</span></label>
                                <input type="text" {...commonInputProps('seatNumber', bookingData.deliveryPreference === 'Deliver to Seat')} value={bookingData.seatNumber} placeholder="e.g., 32" maxLength={4} inputMode="numeric" pattern="\d*" />
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
                         <legend className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">3. Luggage Details</legend>
                         {/* Bags / Weight */}
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
                                    {/* Add more granular options if needed */}
                                </select>
                                 {errors.weightCategory && <p id="weightCategory-error" className="mt-1 text-xs text-red-600">{errors.weightCategory}</p>}
                            </div>
                        </div>
                         {/* Special Notes */}
                        <div>
                            <label htmlFor="specialItemsDescription" className="block text-sm font-medium text-gray-700">Special Handling Notes <span className="text-xs text-gray-500">(Optional)</span></label>
                             <textarea {...commonInputProps('specialItemsDescription', false)} value={bookingData.specialItemsDescription} rows={3} placeholder="e.g., Fragile items inside, Handle with care..." ></textarea>
                             {/* No error display needed for optional field */}
                        </div>
                         {/* Insurance */}
                        <div className="relative flex items-start">
                            <div className="flex items-center h-5">
                               <input id="insuranceRequested" name="insuranceRequested" type="checkbox" checked={bookingData.insuranceRequested} onChange={handleChange} disabled={isSubmitting} className="focus:ring-[#ff8c00] h-4 w-4 text-[#ff8c00] border-gray-300 rounded disabled:opacity-50 cursor-pointer" />
                           </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="insuranceRequested" className="font-medium text-gray-700 cursor-pointer">Add Luggage Insurance?</label>
                                <p className="text-xs text-gray-500">(Optional, additional charges may apply)</p>
                            </div>
                        </div>
                     </fieldset>

                    {/* === Section 4: Service & Payment === */}
                    <fieldset className="space-y-6 border-t border-gray-200 pt-6">
                         <legend className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">4. Service & Payment</legend>
                         {/* Service Speed */}
                          <div>
                            <label htmlFor="serviceType" className="block text-sm font-medium text-gray-700">Service Speed</label>
                            <select {...commonInputProps('serviceType', true)} value={bookingData.serviceType}>
                                <option value="" disabled>-- Select Service --</option>
                                <option value="Standard">Standard</option>
                                <option value="Express">Express (Faster Delivery)</option>
                                {/* Add other service tiers if applicable */}
                            </select>
                             {errors.serviceType && <p id="serviceType-error" className="mt-1 text-xs text-red-600">{errors.serviceType}</p>}
                        </div>
                         {/* Payment Method */}
                        <div>
                            <label htmlFor="paymentMode" className="block text-sm font-medium text-gray-700">Preferred Payment Method</label>
                            <select {...commonInputProps('paymentMode', true)} value={bookingData.paymentMode}>
                                <option value="" disabled>-- Select Payment --</option>
                                <option value="UPI">UPI</option>
                                <option value="Card">Debit/Credit Card</option>
                                <option value="NetBanking">Net Banking</option>
                                <option value="Wallet">Mobile Wallet</option>
                                <option value="POD">Pay on Delivery/Pickup (Cash/UPI)</option>
                            </select>
                             {errors.paymentMode && <p id="paymentMode-error" className="mt-1 text-xs text-red-600">{errors.paymentMode}</p>}
                        </div>
                     </fieldset>

                    {/* === Submit Button === */}
                    <div className="pt-5 border-t border-gray-200">
                        <button
                            type="submit"
                            className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-base font-medium rounded-md text-white bg-[#ff8c00] hover:bg-[#e07b00] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff8c00] ${isSubmitting || !isAuthenticated ? 'opacity-60 cursor-wait' : 'transition duration-150 ease-in-out'} `}
                            disabled={isSubmitting || !isAuthenticated} // Disable if submitting OR not authenticated
                        >
                            {isSubmitting ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing Booking...
                                </>
                            ) : (
                                'Confirm Booking'
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