// src/components/Sidebar.tsx

// --- Core React/Supabase/UI Imports ---
import React, { useState, useEffect, useRef } from 'react';
import {
    X, Truck, MapPin, LogOut, ClipboardList, Loader2, AlertCircle,
    UserPlus, UserCircle, Phone, Package
} from 'lucide-react'; // Essential icons for the UI
import { supabase } from '../supabase'; // Supabase client instance
import { User, AuthError, PostgrestError } from '@supabase/supabase-js'; // Supabase type definitions

// --- Prop Types Definition ---
interface SidebarProps {
    isOpen: boolean; // Controls the visibility of the sidebar
    onClose: () => void; // Function to call when the sidebar should be closed
}

// --- UI Feedback Message Types ---
interface FeedbackMessage {
    type: 'error' | 'success' | 'info'; // Type of feedback (controls styling)
    text: string; // The message content
}

// --- Auth Form Data Type ---
// Defines the structure for the login/signup form state
interface FormData {
    email: string;
    password: string;
    full_name: string; // Required for signup
    phone: string;     // Optional for signup
    date_of_birth: string; // Optional for signup
    aadhar_number: string; // Optional for signup (*** CAUTION: Handle securely! ***)
}

// --- Data Fetching Type: User Profile ---
// Represents the data fetched from the 'profiles' table
interface ProfileData {
    id: string; // UUID matching auth.users.id
    full_name: string | null;
    email: string | null; // Stored optionally in profiles, primarily in auth.users
    phone: string | null;
    date_of_birth: string | null;
    // Note: Address fields are omitted here as they are not currently in the 'profiles' schema shown
    // Note: Aadhar number is omitted for regular fetching/display due to sensitivity
    created_at: string; // ISO timestamp string
    updated_at: string; // ISO timestamp string
}

// --- Data Fetching Type: Order Status Enum ---
// Must exactly match the ENUM type definition in your Supabase database for consistency
type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Out for Delivery' | 'Delivered' | 'Cancelled' | 'Failed';

// --- Data Fetching Type: Order Data ---
// Represents the data fetched from the 'order_tracking' table
interface OrderData {
    id: number; // Maps to bigint/int in the database
    user_id: string; // UUID of the user who placed the order
    order_number: string | null; // Custom order identifier (e.g., "BE-123")
    status: OrderStatus; // Current status of the order
    total_amount: number; // Maps to numeric in the database (Placeholder until calculation)
    estimated_delivery: string | null; // ISO timestamp string
    delivered_at: string | null; // ISO timestamp string
    created_at: string; // ISO timestamp string
    updated_at: string; // ISO timestamp string
}

// --- Data Fetching Type: Active Delivery Details ---
// Represents the combined data for a delivery currently 'Out for Delivery'
// Fetched by joining 'delivery_assignments', 'delivery_personnel', and 'order_tracking'
interface ActiveDeliveryInfo {
    order_id: number; // ID from the 'order_tracking' table
    tracking_link: string | null; // Optional live tracking URL
    // Nested details of the assigned delivery person (nullable if assignment exists but personnel data is missing)
    delivery_personnel: {
        id: string; // UUID of the delivery person
        full_name: string | null;
        phone: string | null;
        vehicle_plate: string | null;
    } | null;
}

// === Sidebar Component ===
const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {

    // --- State Hooks ---

    // Auth State
    const [currentUser, setCurrentUser] = useState<User | null>(null); // Holds the logged-in user object or null
    const [authLoading, setAuthLoading] = useState<boolean>(true); // Tracks loading state during auth checks/actions
    const [isSigningUp, setIsSigningUp] = useState<boolean>(false); // Toggles between Login and Sign Up forms
    const [formData, setFormData] = useState<FormData>({ // State for the login/signup form inputs
        email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '',
    });
    const [feedback, setFeedback] = useState<FeedbackMessage | null>(null); // Displays success/error/info messages (primarily for auth)

    // Data Fetching State (for logged-in user sections)
    const [profileData, setProfileData] = useState<ProfileData | null>(null); // User's profile details
    const [activeOrders, setActiveOrders] = useState<OrderData[]>([]); // Orders with 'active' statuses for tracking
    const [pastOrders, setPastOrders] = useState<OrderData[]>([]); // Orders with 'completed/failed' statuses for history
    const [activeDeliveryInfo, setActiveDeliveryInfo] = useState<ActiveDeliveryInfo | null>(null); // Details of the current delivery driver/assignment

    // Loading states for specific data sections
    const [profileLoading, setProfileLoading] = useState<boolean>(false);
    const [trackingLoading, setTrackingLoading] = useState<boolean>(false); // For active orders
    const [deliveryLoading, setDeliveryLoading] = useState<boolean>(false); // For delivery person details
    const [ordersLoading, setOrdersLoading] = useState<boolean>(false);   // For past orders

    // Error states for specific data sections
    const [profileError, setProfileError] = useState<string | null>(null);
    const [trackingError, setTrackingError] = useState<string | null>(null);
    const [deliveryError, setDeliveryError] = useState<string | null>(null);
    const [ordersError, setOrdersError] = useState<string | null>(null);

    // References for focusing input fields
    const emailInputRef = useRef<HTMLInputElement>(null);
    const nameInputRef = useRef<HTMLInputElement>(null); // For focusing name on signup

    // --- Effect Hooks ---

    // Effect: Initialize Auth State & Set Up Listener
    // Runs once on component mount. Checks the initial session and listens for auth changes.
    useEffect(() => {
        setAuthLoading(true); // Indicate loading at the start

        // Check the current session status when the component loads
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) console.error("Error getting initial session:", error.message);
            const user = session?.user ?? null;
            setCurrentUser(user); // Set the initial user state

            if (user) {
                fetchProfileData(user.id); // Fetch profile if a user is already logged in
            } else {
                resetAuthState(false); // Clear form/section if no user
            }
            // Short delay allows other state updates to settle before removing loading indicator
            setTimeout(() => setAuthLoading(false), 50);
        });

        // Listen for authentication state changes (SIGNED_IN, SIGNED_OUT, etc.)
        const { data: authListener } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setAuthLoading(true); // Show loading during the transition
                const user = session?.user ?? null;
                const previousUser = currentUser; // Capture previous user state for comparison if needed
                setCurrentUser(user); // Update the user state

                console.log("Auth Event:", _event); // Log the type of auth event

                if (_event === 'SIGNED_IN' && user && user.id !== previousUser?.id) {
                    // Actions on successful sign-in or if the user changes
                    setFeedback(null); // Clear any previous auth feedback
                    resetAuthState(false); // Reset form fields, switch to login mode, keep email if needed
                    setActiveSection('');  // Reset the active dashboard section
                    fetchProfileData(user.id); // Fetch the newly signed-in user's profile
                } else if ((_event === 'SIGNED_OUT' || !user) && previousUser) {
                    // Actions on sign-out or session expiry
                    resetAuthState(); // Reset form fields and clear feedback
                    // Clear all fetched user-specific data and errors
                    setProfileData(null);
                    setActiveOrders([]);
                    setPastOrders([]);
                    setActiveDeliveryInfo(null);
                    setProfileError(null);
                    setTrackingError(null);
                    setDeliveryError(null);
                    setOrdersError(null);
                    setActiveSection(''); // Reset active section
                }
                // Allow state updates to render before removing the loading indicator
                setTimeout(() => setAuthLoading(false), 50);
            }
        );

        // Cleanup function: Unsubscribe from the auth listener when the component unmounts
        return () => {
            authListener?.subscription.unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array ensures this runs only once on mount

    // Effect: Lock Body Scroll When Sidebar is Open
    // Prevents background scrolling when the sidebar overlay is active.
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        // Cleanup function: Ensure scroll is re-enabled when component unmounts or closes
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]); // Rerun this effect whenever the `isOpen` prop changes

    // Effect: Fetch Data Based on Active Dashboard Section
    // Runs when the active section changes or the user logs in/out (after initial auth loading).
    useEffect(() => {
        // Only run if logged in and the initial auth check is complete
        if (!currentUser || authLoading) return;

        const userId = currentUser.id;
        console.log(`Dashboard section changed to: ${activeSection}`);

        // Reset errors specifically for the sections being fetched now
        setTrackingError(null);
        setDeliveryError(null);
        setOrdersError(null);
        // Profile errors persist until explicitly re-fetched or on logout

        // Optionally clear data for sections *not* currently active to prevent showing stale data briefly
        // if (activeSection !== 'tracking') setActiveOrders([]);
        // if (activeSection !== 'delivery') setActiveDeliveryInfo(null);
        // if (activeSection !== 'orders') setPastOrders([]);

        // Trigger the appropriate data fetching function based on the selected section
        switch (activeSection) {
            case 'tracking':
                fetchActiveOrders(userId);
                break;
            case 'delivery':
                // Fetch profile first if needed, then fetch delivery details
                if (!profileData && !profileLoading && !profileError) {
                     fetchProfileData(userId).then(() => fetchDeliveryDetails(userId));
                } else {
                    fetchDeliveryDetails(userId);
                }
                break;
            case 'orders':
                fetchPastOrders(userId);
                break;
            default:
                // No section selected or unknown section, do nothing
                break;
        }

    // Rerun when the active section changes, or the user ID changes (e.g., login/logout completes)
    // `authLoading` ensures it doesn't run prematurely during auth transitions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSection, currentUser?.id, authLoading]);


    // --- Helper Functions ---

    // Helper: Reset Auth Form and Related State
    const resetAuthState = (clearFeedback = true) => {
        setActiveSection(''); // Clear selected dashboard section
        setFormData({ email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' });
        if (clearFeedback) setFeedback(null);
        setIsSigningUp(false); // Default back to login mode
    };

    // Helper: Handle Form Input Changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Optional: Clear specific validation error when user types in the field
        // if (feedback?.type === 'error' && name === 'email' || name === 'password') {
        //     setFeedback(null);
        // }
    };

    // Helper: Map Supabase/Other Errors to User-Friendly Messages
    // Also handles specific UI logic like switching to signup mode on "Invalid login"
    const getFriendlyErrorMessage = (error: AuthError | PostgrestError | Error | any): { type: 'error' | 'info', text: string } => {
        let message = "An unexpected error occurred. Please try again.";
        let type: 'error' | 'info' = 'error'; // Default to error type
        if (!error) return { type, text: message }; // Return default if no error object

        console.error('Supabase Auth/DB Error:', error); // Log the raw error for debugging

        const errorMessage = error.message || ''; // Get the error message string
        const errorCode = (error as PostgrestError)?.code || ''; // Get Postgrest error code if available

        // --- Specific Auth Error Handling ---
        if (errorMessage.includes('Invalid login credentials')) {
            if (!isSigningUp) { // Only suggest signup if currently in login mode
                message = "Account not found or invalid password. Want to sign up?";
                type = 'info'; // Use 'info' type for suggestion
                setIsSigningUp(true); // Switch to signup view
                setFormData(prev => ({ ...prev, password: '' })); // Clear password field
                setTimeout(() => nameInputRef.current?.focus(), 100); // Focus name field
            } else {
                 message = 'Invalid details provided during signup attempt.'; // Error during signup
                 type = 'error';
            }
        } else if (errorMessage.includes('User already registered') || errorCode === '23505') { // Handle unique constraint violation (often email)
            message = "This email is already registered. Please log in.";
            type = 'info';
            setIsSigningUp(false); // Switch back to login view
            setFormData(prev => ({ ...prev, password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: ''})); // Clear signup fields
            setTimeout(() => emailInputRef.current?.focus(), 100); // Focus email field
        } else if (errorMessage.includes('Password should be at least 6 characters')) {
            message = 'Password must be at least 6 characters long.';
        } else if (errorMessage.includes('Unable to validate email address: invalid format')) {
            message = 'Please enter a valid email address.';
        } else if (errorMessage.includes('Email rate limit exceeded') || errorMessage.includes('too many requests')) {
            message = 'Too many attempts. Please try again later.';
        // --- Specific DB/Postgrest Error Handling ---
        } else if (errorMessage.includes('check constraint') && errorMessage.includes('phone')) {
             message = 'Invalid phone number format provided.'; // Assuming a DB check constraint
        } else if (errorMessage.includes('profiles_pkey') || (errorCode === '23505' && errorMessage.includes('profiles'))) {
             message = 'Profile data conflict. Could not save profile.'; // Primary key violation
        } else if (errorCode === '42501') { // RLS (Row Level Security) permission denied
            message = "Permission denied. Check RLS policies.";
        } else if (errorCode === '42P01') { // Table not found
            message = "Data table not found. Contact support.";
        } else if (errorCode === '23503') { // Foreign key violation
             message = "Could not save data due to a reference error.";
        // --- Client-side Validation Error Catch (from handleAuth) ---
        } else if (error.message?.includes('Aadhar number must be 12 digits')) {
            message = 'Aadhar number must be 12 digits.';
            type = 'error';
        } else {
             message = errorMessage || "An unknown error occurred."; // Fallback to Supabase message or generic error
             type = 'error';
        }
        return { type, text: message };
    };

    // Helper: Format Date/Time Strings
    const formatDateTime = (dateString: string | null | undefined): string => {
        if (!dateString) return 'N/A';
        try {
            // Format to locale string (e.g., "Jul 20, 2024, 3:45 PM")
            return new Date(dateString).toLocaleString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: 'numeric', minute: '2-digit', hour12: true
            });
        } catch (e) {
            console.error("Date format error:", e);
            return 'Invalid Date';
        }
    };

    // Helper: Format Currency Values
    const formatCurrency = (amount: number | null | undefined): string => {
        if (amount === null || amount === undefined) return 'N/A';
        // Format as Indian Rupees (INR)
        return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    };

    // Helper: Get Tailwind CSS Classes for Order Status Badges
     const getStatusColor = (status: OrderStatus): string => {
        switch (status) {
            case 'Delivered': return 'text-green-700 bg-green-100';
            case 'Out for Delivery': return 'text-blue-700 bg-blue-100';
            case 'Shipped': return 'text-purple-700 bg-purple-100';
            case 'Processing': return 'text-yellow-800 bg-yellow-100';
            case 'Pending': return 'text-gray-700 bg-gray-100';
            case 'Cancelled': return 'text-red-700 bg-red-100';
            case 'Failed': return 'text-red-700 bg-red-100';
            default: return 'text-gray-700 bg-gray-100'; // Default fallback
        }
    };

    // Helper: Generate Tailwind CSS Classes for Input Fields
    const inputClasses = (hasError: boolean = false): string =>
        `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
            hasError ? 'border-red-500 ring-red-500' : 'border-gray-300' // Conditional error styling
        } disabled:bg-gray-100 disabled:cursor-not-allowed`; // Styling for disabled state


    // --- Event Handlers ---

    // Handler: Login / Sign Up Form Submission
    const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault(); // Prevent default form submission
        setFeedback(null); // Clear previous feedback
        setAuthLoading(true); // Set loading state
        const currentFormData = { ...formData }; // Capture form data at submission time

        try {
            if (isSigningUp) {
                // --- Sign Up Logic ---
                // Client-side validation (basic)
                if (!currentFormData.full_name) throw new Error("Full name is required for signup.");
                if (currentFormData.password.length < 6) throw new Error("Password must be at least 6 characters.");
                const aadharPattern = /^\d{12}$/;
                if (currentFormData.aadhar_number && !aadharPattern.test(currentFormData.aadhar_number)) {
                    throw new Error("Aadhar number must be 12 digits."); // Custom error caught by getFriendlyErrorMessage
                }

                // Step 1: Sign up the user with Supabase Auth
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email: currentFormData.email,
                    password: currentFormData.password,
                    // options: { data: { full_name: currentFormData.full_name } } // Alternative: Pass metadata here if preferred over profile table insert
                });

                if (signUpError) throw signUpError; // Handle auth errors in catch block
                if (!signUpData.user) throw new Error("Signup successful but user data missing."); // Should not happen if error is null

                console.log('Auth signup successful for:', signUpData.user.email);

                // Step 2: Insert corresponding data into the 'profiles' table
                try {
                    console.log('Attempting to insert profile for user:', signUpData.user.id);
                    // *** SECURITY WARNING: Storing raw Aadhar. Implement encryption in DB or use secure handling! ***
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .insert({
                            id: signUpData.user.id, // Link profile to the auth user using the ID
                            email: signUpData.user.email, // Optional: Store email redundantly in profile
                            full_name: currentFormData.full_name,
                            phone: currentFormData.phone || null, // Use null if empty
                            date_of_birth: currentFormData.date_of_birth || null,
                            aadhar_number: currentFormData.aadhar_number || null, // Storing plain text - BEWARE
                        });

                    if (profileError) {
                        console.error('Error creating Supabase profile:', profileError);
                        const profileFeedback = getFriendlyErrorMessage(profileError);
                        // Inform user about partial success (account created, profile failed)
                        setFeedback({ type: 'info', text: `Account created for ${signUpData.user.email}, but profile save failed: ${profileFeedback.text}. You can update it later.`});
                    } else {
                        console.log('Supabase profile created successfully.');
                        // Profile data will be fetched by the 'SIGNED_IN' listener effect
                    }
                } catch (profileInsertError: any) {
                    console.error('Exception during profile creation:', profileInsertError);
                     // Inform user about partial success due to an unexpected error
                    setFeedback({ type: 'info', text: `Account created for ${signUpData.user.email}, but profile details couldn't be saved due to an error.`});
                }

                // Handle post-signup flow (email verification vs. auto-login)
                if (!signUpData.session) { // Requires email verification
                    if (!feedback) { // Show success message only if no profile error occurred
                        setFeedback({ type: 'success', text: 'Account created! Check your email (including spam) for a confirmation link.' });
                    }
                    setIsSigningUp(false); // Switch back to login view
                    setFormData(prev => ({ ...prev, password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' })); // Clear signup fields
                } else { // User is automatically logged in (e.g., email verification disabled or auto-confirmed)
                    if (!feedback) {
                        setFeedback({ type: 'success', text: 'Account created and logged in successfully!' });
                    }
                    // The 'SIGNED_IN' listener effect will handle UI updates, state reset, and profile fetch.
                }

            } else {
                // --- Log In Logic ---
                const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                    email: currentFormData.email,
                    password: currentFormData.password,
                });

                if (signInError) throw signInError; // Let the catch block handle login errors

                console.log('Logged in as:', signInData.user?.email);
                // The 'SIGNED_IN' listener effect handles UI updates, state reset, and data fetching.
            }

        } catch (error: any) {
            // Handle errors from both signup and login attempts
            const feedbackMessage = getFriendlyErrorMessage(error);
            setFeedback(feedbackMessage); // Display the friendly error message
            // Focus input fields based on context for better UX
            if (!isSigningUp && emailInputRef.current && feedbackMessage.type === 'error') {
                emailInputRef.current.focus();
                emailInputRef.current.select();
            } else if (isSigningUp && nameInputRef.current && (error.message?.includes('name') || error.message?.includes('Aadhar'))) {
                 nameInputRef.current.focus(); // Focus name or relevant field on signup error
            }
        } finally {
            setAuthLoading(false); // Ensure loading indicator is turned off after attempt
        }
    };

    // Handler: Logout User
    const handleLogout = async () => {
        setAuthLoading(true); // Show loading indicator during logout
        setFeedback(null); // Clear any previous messages
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Logout Error:', error.message);
            setFeedback({ type: 'error', text: "Failed to log out. Please try again." });
            setAuthLoading(false); // Stop loading only if the signout itself fails
        }
        // If successful, the 'SIGNED_OUT' listener effect handles state cleanup and setting authLoading to false.
    };

    // Handler: Toggle Between Login and Sign Up Forms
    const toggleAuthMode = () => {
        const enteringSignupMode = !isSigningUp; // Determine the mode we are entering
        setIsSigningUp(enteringSignupMode); // Update the state
        setFormData(prev => ({
            email: prev.email, // Keep email if user typed it already
            password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' // Clear other fields
        }));
        setFeedback(null); // Clear feedback messages
        // Focus the appropriate input field after the UI updates
        setTimeout(() => {
            if (enteringSignupMode && nameInputRef.current) nameInputRef.current.focus();
            else if (!enteringSignupMode && emailInputRef.current) emailInputRef.current.focus();
        }, 100); // Small delay ensures the input is visible before focusing
    };


    // --- Data Fetching Functions ---

    // Fetch User Profile Data
    const fetchProfileData = async (userId: string) => {
        if (!userId) return; // Don't fetch if userId is invalid
        setProfileLoading(true);
        setProfileError(null);
        try {
            // Fetch specific columns from the 'profiles' table for the given user ID
            const { data, error, status } = await supabase
                .from('profiles')
                .select('id, full_name, email, phone, date_of_birth, created_at, updated_at') // Select columns matching ProfileData interface
                .eq('id', userId) // Filter by the user's ID
                .single(); // Expect only one profile per user

            if (error) {
                // Handle case where profile might not exist yet (e.g., signup process interruption)
                 if (status === 406 || error.code === 'PGRST116') { // PGRST116: "requested range not satisfiable" (means 0 rows for .single())
                    console.warn("Profile not found for user:", userId);
                    setProfileError("Profile data incomplete. Please update your details."); // Informative error
                    setProfileData(null);
                 } else {
                    throw error; // Re-throw other database errors
                 }
            } else {
                setProfileData(data as ProfileData); // Set the fetched profile data
            }
        } catch (error: any) {
            const friendlyError = getFriendlyErrorMessage(error);
            setProfileError(friendlyError.text || "Could not load profile.");
            setProfileData(null);
        } finally {
            setProfileLoading(false); // Ensure loading state is turned off
        }
    };

    // Fetch Active Orders (for Tracking Section)
    // Fetches orders from 'order_tracking' with statuses indicating they are in progress.
    const fetchActiveOrders = async (userId: string) => {
      if (!userId) return;
      setTrackingLoading(true);
      setTrackingError(null);
      setActiveOrders([]); // Clear previous active orders
      try {
          const activeStatuses: OrderStatus[] = ['Pending', 'Processing', 'Shipped', 'Out for Delivery'];
          // Fetch from 'order_tracking' table, as defined by the booking process
          const { data, error } = await supabase
              .from('order_tracking') // *** Source table for tracking data ***
              .select('id, user_id, order_number, status, total_amount, estimated_delivery, created_at, updated_at')
              .eq('user_id', userId) // Filter by the current user
              .in('status', activeStatuses) // Filter by active statuses
              .order('created_at', { ascending: false }); // Show newest first

          if (error) throw error;
          setActiveOrders(data as OrderData[]); // Update state with fetched active orders
      } catch (error: any) {
          const friendlyError = getFriendlyErrorMessage(error);
          setTrackingError(friendlyError.text || "Could not load tracking info.");
      } finally {
          setTrackingLoading(false);
      }
    };

    // Fetch Delivery Details (for Delivery Section)
    // Fetches details about the currently 'Out for Delivery' order, including driver info.
    const fetchDeliveryDetails = async (userId: string) => {
      if (!userId) return;
      setDeliveryLoading(true);
      setDeliveryError(null);
      setActiveDeliveryInfo(null); // Clear previous delivery info

      // Ensure profile data (potentially showing address) is loaded or attempted first
      if (!profileData && !profileLoading && !profileError) {
           await fetchProfileData(userId);
      }

      try {
          // Query 'delivery_assignments' and join with 'delivery_personnel' and 'order_tracking'
          const { data: assignmentData, error: assignmentError } = await supabase
              .from('delivery_assignments')
              .select(`
                  order_id,
                  tracking_link,
                  delivery_personnel ( id, full_name, phone, vehicle_plate ),
                  order_tracking!inner ( user_id, status )
              `) // Use inner join to ensure related order_tracking record exists
              .eq('order_tracking.user_id', userId)   // Filter by user ID on the joined table
              .eq('order_tracking.status', 'Out for Delivery') // Filter for orders currently out for delivery
              .limit(1) // Expect at most one order out for delivery at a time for this user
              .maybeSingle(); // Handle null result gracefully if no active delivery

          if (assignmentError) throw assignmentError;

          if (assignmentData) {
              setActiveDeliveryInfo(assignmentData as ActiveDeliveryInfo); // Update state
          } else {
              setActiveDeliveryInfo(null); // Explicitly set to null if no active delivery found
          }

      } catch (error: any) {
          const friendlyError = getFriendlyErrorMessage(error);
          setDeliveryError(friendlyError.text || "Could not load delivery info.");
           setActiveDeliveryInfo(null); // Clear info on error
      } finally {
          setDeliveryLoading(false);
      }
    };

    // Fetch Past Orders (for My Orders Section)
    // Fetches completed or failed orders from 'order_tracking' for history.
    const fetchPastOrders = async (userId: string) => {
      if (!userId) return;
      setOrdersLoading(true);
      setOrdersError(null);
      setPastOrders([]); // Clear previous past orders
      try {
          const pastStatuses: OrderStatus[] = ['Delivered', 'Cancelled', 'Failed'];
          // Fetch from 'order_tracking' table
          const { data, error } = await supabase
              .from('order_tracking') // *** Source table for order history ***
              .select('id, user_id, order_number, status, total_amount, delivered_at, created_at, updated_at')
              .eq('user_id', userId) // Filter by the current user
              .in('status', pastStatuses) // Filter by completed/failed statuses
              .order('created_at', { ascending: false }) // Show newest first
              .limit(25); // Limit the number of past orders fetched for performance

          if (error) throw error;
          setPastOrders(data as OrderData[]); // Update state with fetched past orders
      } catch (error: any) {
          const friendlyError = getFriendlyErrorMessage(error);
          setOrdersError(friendlyError.text || "Could not load order history.");
      } finally {
          setOrdersLoading(false);
      }
    };


    // --- Derived State ---

    // Determine if any dashboard section is currently loading data
    const isSectionLoading = profileLoading || trackingLoading || deliveryLoading || ordersLoading;

    // --- Render Logic (JSX) ---
    return (
        <>
            {/* --- Background Overlay --- */}
            {/* Appears behind the sidebar, blurs content, and closes sidebar on click (if not loading) */}
            <div
                onClick={authLoading ? undefined : onClose} // Prevent closing during critical auth operations
                className={`fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm transition-opacity duration-300 z-40 ${
                    isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none' // Control visibility and interaction
                }`}
                aria-hidden={!isOpen} // Accessibility attribute
            />

            {/* --- Sidebar Panel --- */}
            {/* The main container for the sidebar content */}
            <div
                className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${
                    isOpen ? 'translate-x-0' : 'translate-x-full' // Slide in/out animation
                }`}
                role="dialog" aria-modal="true" aria-labelledby="sidebar-title" // Accessibility attributes
            >
                {/* --- Sidebar Header --- */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
                    <h2 id="sidebar-title" className="text-xl font-semibold text-gray-800">
                        {/* Dynamically set title based on auth state */}
                        {authLoading && !currentUser ? 'Loading...' : (currentUser ? 'My Account' : (isSigningUp ? 'Create Account' : 'Log In'))}
                    </h2>
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full text-gray-500 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors"
                        aria-label="Close sidebar"
                        disabled={authLoading && !currentUser} // Disable during initial load
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* --- Main Content Area (Scrollable) --- */}
                <div className="flex-grow p-6 overflow-y-auto">

                    {/* --- Auth Feedback Display --- */}
                    {/* Shows login/signup errors or success messages */}
                    {feedback && (
                        <div className={`mb-4 p-3 border rounded-md text-sm flex items-start ${
                            feedback.type === 'error' ? 'bg-red-50 border-red-300 text-red-800' :
                            feedback.type === 'success' ? 'bg-green-50 border-green-300 text-green-800' :
                            'bg-blue-50 border-blue-300 text-blue-800' // Info style
                        }`}>
                            <AlertCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" />
                            <span>{feedback.text}</span>
                        </div>
                    )}

                    {/* --- Initial Auth Loading Indicator --- */}
                    {/* Shown only when the component mounts and checks the initial session */}
                    {authLoading && !currentUser && !feedback && (
                        <div className="flex justify-center items-center py-10">
                            <Loader2 size={32} className="animate-spin text-orange-600" />
                            <span className="ml-2 text-gray-500">Connecting...</span>
                        </div>
                    )}

                    {/* --- Logged In View --- */}
                    {/* Displayed when a user is authenticated and auth check is complete */}
                    {!authLoading && currentUser ? (
                        <div className="space-y-6">
                            {/* Welcome Message */}
                            <p className="text-gray-600 truncate"> {/* Truncate prevents long emails/names breaking layout */}
                                Welcome, <span className='font-medium'>
                                    {/* Show profile name if loaded, otherwise fallback to email */}
                                    {profileLoading ? '...' : (profileData?.full_name || currentUser.email)}
                                </span>!
                                {/* Indicate if there was an error loading the profile */}
                                {profileError && !profileLoading && <span className='text-red-500 text-xs ml-1'>(Profile Error)</span>}
                            </p>

                            {/* Dashboard Navigation Buttons */}
                            <nav className="space-y-2">
                                 {/* Order Tracking Button */}
                                 <button
                                     disabled={authLoading || isSectionLoading} // Disable during auth or section loading
                                     className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors disabled:opacity-50 disabled:pointer-events-none ${
                                        activeSection === 'tracking' ? 'bg-orange-100 text-orange-700 font-medium' : '' // Active state styling
                                     }`}
                                     onClick={() => setActiveSection('tracking')} // Set active section on click
                                 >
                                     <Truck size={18} className="mr-3 flex-shrink-0" /> Order Tracking
                                 </button>

                                 {/* Delivery Details Button */}
                                 <button
                                     disabled={authLoading || isSectionLoading}
                                     className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors disabled:opacity-50 disabled:pointer-events-none ${
                                         activeSection === 'delivery' ? 'bg-orange-100 text-orange-700 font-medium' : ''
                                     }`}
                                     onClick={() => setActiveSection('delivery')}
                                >
                                     <MapPin size={18} className="mr-3 flex-shrink-0" /> Delivery Details
                                 </button>

                                 {/* My Orders (History) Button */}
                                 <button
                                     disabled={authLoading || isSectionLoading}
                                     className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors disabled:opacity-50 disabled:pointer-events-none ${
                                        activeSection === 'orders' ? 'bg-orange-100 text-orange-700 font-medium' : ''
                                     }`}
                                     onClick={() => setActiveSection('orders')}
                                >
                                     <ClipboardList size={18} className="mr-3 flex-shrink-0" /> My Orders
                                 </button>
                            </nav>

                            {/* Dashboard Content Display Area */}
                            {/* Renders the content for the currently active section */}
                            <div className="mt-6 p-4 bg-gray-50 rounded-lg min-h-[250px] border border-gray-200 relative"> {/* Min height prevents collapsing */}
                                {/* Loading Overlay for Section Content */}
                                {/* Displayed when fetching data for the selected section */}
                                {isSectionLoading && (
                                    <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex justify-center items-center rounded-lg z-10">
                                        <Loader2 size={28} className="animate-spin text-orange-500" />
                                        <span className="ml-2 text-gray-600">Loading Details...</span>
                                    </div>
                                )}

                                {/* --- Render Specific Section Content --- */}

                                {/* Placeholder when no section is selected */}
                                {!activeSection && (
                                    <p className="text-sm text-gray-500 text-center pt-4">
                                        Select an option above to view details.
                                    </p>
                                )}

                                {/* Order Tracking Section Content */}
                                {activeSection === 'tracking' && (
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3 text-gray-800 flex items-center">
                                            <Truck size={20} className="mr-2 text-orange-600" /> Active Order Tracking
                                        </h3>
                                        {/* Display tracking errors */}
                                        {trackingError && !trackingLoading && (
                                            <p className="text-sm text-red-600 flex items-center mb-3 p-2 bg-red-50 border border-red-200 rounded">
                                                <AlertCircle size={16} className="mr-1" /> {trackingError}
                                            </p>
                                        )}
                                        {/* Message if no active orders found */}
                                        {!trackingLoading && !trackingError && activeOrders.length === 0 && (
                                            <p className="text-sm text-gray-500 italic text-center py-4">No active orders found.</p>
                                        )}
                                        {/* List of active orders */}
                                        {!trackingLoading && !trackingError && activeOrders.length > 0 && (
                                            <ul className="space-y-4">
                                                {activeOrders.map(order => (
                                                    <li key={order.id} className="p-3 border border-gray-200 rounded-md bg-white shadow-sm">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <p className="text-sm font-medium text-gray-900">Order #{order.order_number || order.id}</p>
                                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>
                                                                {order.status}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 mb-1">Placed: {formatDateTime(order.created_at)}</p>
                                                        {order.estimated_delivery && (
                                                            <p className="text-sm text-gray-600">Est. Delivery: <span className='font-medium'>{formatDateTime(order.estimated_delivery)}</span></p>
                                                        )}
                                                        <p className="text-sm text-gray-800 font-medium mt-1">Total: {formatCurrency(order.total_amount)}</p>
                                                        {/* Add link to order details page if available */}
                                                        {/* <button className="text-xs text-orange-600 hover:underline mt-1">View Tracking Details</button> */}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}

                                {/* Delivery Details Section Content */}
                                {activeSection === 'delivery' && (
                                     <div>
                                        <h3 className="text-lg font-semibold mb-3 text-gray-800 flex items-center">
                                            <MapPin size={20} className="mr-2 text-orange-600" /> Delivery Details
                                        </h3>
                                        {/* Display profile or delivery fetch errors */}
                                        {profileError && !profileLoading && (
                                            <p className="text-sm text-red-600 flex items-center mb-3 p-2 bg-red-50 border border-red-200 rounded">
                                                <AlertCircle size={16} className="mr-1" /> Profile: {profileError}
                                            </p>
                                        )}
                                        {deliveryError && !deliveryLoading && (
                                            <p className="text-sm text-red-600 flex items-center mb-3 p-2 bg-red-50 border border-red-200 rounded">
                                                <AlertCircle size={16} className="mr-1" /> Delivery Info: {deliveryError}
                                            </p>
                                        )}

                                        {/* Profile Info Display Area (for context, e.g., address if added later) */}
                                        <div className="mb-4 p-3 border border-dashed border-gray-300 rounded-md bg-white">
                                            <h4 className="text-md font-semibold text-gray-700 mb-1">Your Profile Info</h4>
                                            {profileLoading && <p className="text-sm text-gray-500 italic">Loading profile...</p>}
                                            {!profileLoading && profileData && (
                                                <div className='text-sm text-gray-600 space-y-0.5'>
                                                    <p><span className='font-medium'>Name:</span> {profileData.full_name || 'N/A'}</p>
                                                    <p><span className='font-medium'>Email:</span> {profileData.email || currentUser.email || 'N/A'}</p>
                                                    <p><span className='font-medium'>Phone:</span> {profileData.phone || 'Not provided'}</p>
                                                    {/* Placeholder for future address fields */}
                                                    <p className="text-xs text-gray-500 italic mt-1"> (Address details not implemented in profile yet)</p>
                                                    {/* Link/Button to edit profile page */}
                                                    <button className="text-xs text-orange-600 hover:underline mt-2">Edit Profile</button>
                                                </div>
                                            )}
                                            {/* Message if profile couldn't be loaded */}
                                            {!profileLoading && !profileError && !profileData && (
                                                 <p className="text-sm text-gray-500 italic">Could not load profile data.</p>
                                            )}
                                        </div>

                                         {/* Active Delivery Driver Info Area */}
                                         <h4 className="text-md font-semibold text-gray-700 mb-1 mt-4">Active Delivery</h4>
                                         {/* Display if loading is finished, no error, and delivery info with personnel exists */}
                                        {!deliveryLoading && !deliveryError && activeDeliveryInfo?.delivery_personnel && (
                                            <div className="p-3 border rounded-md bg-blue-50 border-blue-200">
                                                <h5 className="text-sm font-semibold text-blue-800 mb-2 flex items-center">
                                                    <Package size={18} className="mr-1.5"/> Order #{activeDeliveryInfo.order_id} is Out for Delivery!
                                                </h5>
                                                <div className='space-y-1 text-sm text-blue-700'>
                                                    {/* Display driver details if available */}
                                                    {activeDeliveryInfo.delivery_personnel.full_name && (
                                                        <p className='flex items-center'><UserCircle size={16} className="mr-1.5 flex-shrink-0" /> Driver: <span className='font-medium ml-1'>{activeDeliveryInfo.delivery_personnel.full_name}</span></p>
                                                    )}
                                                    {activeDeliveryInfo.delivery_personnel.phone && (
                                                        <p className='flex items-center'><Phone size={16} className="mr-1.5 flex-shrink-0" /> Contact: <a href={`tel:${activeDeliveryInfo.delivery_personnel.phone}`} className='text-blue-800 hover:underline ml-1'>{activeDeliveryInfo.delivery_personnel.phone}</a></p>
                                                    )}
                                                    {activeDeliveryInfo.delivery_personnel.vehicle_plate && (
                                                        <p className='flex items-center'><Truck size={16} className="mr-1.5 flex-shrink-0"/> Vehicle: <span className='font-medium ml-1'>{activeDeliveryInfo.delivery_personnel.vehicle_plate}</span></p>
                                                    )}
                                                    {/* Display tracking link if available */}
                                                    {activeDeliveryInfo.tracking_link && (
                                                        <a href={activeDeliveryInfo.tracking_link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-800 hover:underline font-medium mt-2 inline-block">Live Tracking Map</a>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {/* Message if no orders are currently out for delivery */}
                                        {!deliveryLoading && !deliveryError && !activeDeliveryInfo && (
                                            <p className="text-sm text-gray-500 italic text-center py-3">No orders currently out for delivery.</p>
                                        )}
                                        {/* Message if delivery is assigned but personnel details are missing */}
                                        {!deliveryLoading && !deliveryError && activeDeliveryInfo && !activeDeliveryInfo.delivery_personnel && (
                                            <p className="text-sm text-orange-700 italic text-center py-3">Delivery assigned, but driver details unavailable.</p>
                                        )}
                                    </div>
                                )}

                                {/* My Orders (History) Section Content */}
                                {activeSection === 'orders' && (
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3 text-gray-800 flex items-center">
                                            <ClipboardList size={20} className="mr-2 text-orange-600" /> Order History
                                        </h3>
                                        {/* Display order history errors */}
                                        {ordersError && !ordersLoading && (
                                            <p className="text-sm text-red-600 flex items-center mb-3 p-2 bg-red-50 border border-red-200 rounded">
                                                <AlertCircle size={16} className="mr-1" /> {ordersError}
                                            </p>
                                        )}
                                        {/* Message if no past orders found */}
                                        {!ordersLoading && !ordersError && pastOrders.length === 0 && (
                                            <p className="text-sm text-gray-500 italic text-center py-4">No past orders found.</p>
                                        )}
                                        {/* List of past orders */}
                                        {!ordersLoading && !ordersError && pastOrders.length > 0 && (
                                            <ul className="space-y-4">
                                                {pastOrders.map(order => (
                                                    <li key={order.id} className="p-3 border border-gray-200 rounded-md bg-white shadow-sm opacity-90 hover:opacity-100 transition-opacity">
                                                        <div className="flex justify-between items-start mb-1">
                                                             <p className="text-sm font-medium text-gray-900">Order #{order.order_number || order.id}</p>
                                                             <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>
                                                                 {order.status}
                                                             </span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 mb-1">Placed: {formatDateTime(order.created_at)}</p>
                                                        {/* Show delivery date only if the order was delivered */}
                                                        {order.status === 'Delivered' && order.delivered_at && (
                                                            <p className="text-xs text-green-600">Delivered: {formatDateTime(order.delivered_at)}</p>
                                                        )}
                                                        <p className="text-sm text-gray-800 font-medium mt-1">Total: {formatCurrency(order.total_amount)}</p>
                                                        {/* Link/Button for more details or reordering */}
                                                        <button className="text-xs text-orange-600 hover:underline mt-1">View Details / Reorder</button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </div> {/* End Dashboard Content Display Area */}

                            {/* Logout Button */}
                            <button
                                onClick={handleLogout}
                                disabled={authLoading} // Disable during any auth operation (login/logout)
                                className="flex items-center justify-center w-full px-4 py-2 mt-6 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {/* Show loading spinner or icon based on state */}
                                {authLoading ? <Loader2 size={18} className="mr-2 animate-spin" /> : <LogOut size={18} className="mr-2" />}
                                {authLoading ? 'Logging out...' : 'Logout'}
                            </button>
                        </div>
                    ) : (
                        // --- Logged Out View ---
                        // Displayed when no user is authenticated and auth check is complete
                        // Shows either the Login or Sign Up form based on `isSigningUp` state
                        !authLoading && !currentUser && (
                            <form onSubmit={handleAuth} className="space-y-4">
                                {/* --- Sign Up Specific Fields --- */}
                                {isSigningUp && (
                                     <>
                                        {/* Full Name */}
                                        <div>
                                            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                            <input ref={nameInputRef} id="full_name" name="full_name" type="text" value={formData.full_name} onChange={handleInputChange} placeholder="Your full name" className={inputClasses()} required disabled={authLoading} />
                                        </div>
                                        {/* Phone Number (Optional) */}
                                        <div>
                                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number <span className="text-xs text-gray-500">(Optional)</span></label>
                                            <input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} placeholder="e.g., 9876543210" className={inputClasses()} disabled={authLoading} />
                                        </div>
                                        {/* Date of Birth (Optional) */}
                                        <div>
                                            <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-1">Date of Birth <span className="text-xs text-gray-500">(Optional)</span></label>
                                            <input id="date_of_birth" name="date_of_birth" type="date" value={formData.date_of_birth} onChange={handleInputChange} max={new Date().toISOString().split("T")[0]} /* Prevent future dates */ className={inputClasses()} disabled={authLoading} />
                                        </div>
                                        {/* Aadhar Number (Optional, Sensitive) */}
                                        <div>
                                            <label htmlFor="aadhar_number" className="block text-sm font-medium text-gray-700 mb-1">Aadhar Number <span className="text-xs text-gray-500">(Optional)</span></label>
                                            <input id="aadhar_number" name="aadhar_number" type="text" inputMode="numeric" pattern="\d{12}" title="Enter 12-digit Aadhar number" value={formData.aadhar_number} onChange={handleInputChange} placeholder="1234 5678 9012" className={inputClasses()} disabled={authLoading} />
                                            <p className="text-xs text-gray-500 mt-1">12 digits. <span className='font-semibold text-orange-700'>Handled securely (Review RLS/Encryption).</span></p>
                                        </div>
                                        {/* Separator */}
                                        <hr className="my-2 border-gray-200" />
                                    </>
                                )}

                                {/* --- Common Auth Fields --- */}
                                {/* Email Input */}
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input ref={emailInputRef} id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="you@example.com" className={inputClasses(feedback?.type === 'error' && !isSigningUp)} /* Highlight on login error */ required disabled={authLoading} />
                                </div>
                                {/* Password Input */}
                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                    <input id="password" name="password" type="password" value={formData.password} onChange={handleInputChange} placeholder={isSigningUp ? "Create a password (min. 6 chars)" : "••••••••"} className={inputClasses(feedback?.type === 'error')} required minLength={isSigningUp ? 6 : undefined} /* Min length only for signup */ disabled={authLoading} />
                                    {/* Forgot Password Link (Login only) */}
                                    {!isSigningUp && (
                                        <div className="text-right mt-1">
                                            <button type="button" className="text-sm text-orange-600 hover:underline focus:outline-none" onClick={() => setFeedback({ type: 'info', text: 'Password reset functionality not implemented yet.' })}>
                                                Forgot password?
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Submit Button (Login or Sign Up) */}
                                <button type="submit" disabled={authLoading} className="w-full bg-orange-600 text-white py-2.5 px-4 rounded-lg font-semibold hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors disabled:opacity-70 flex items-center justify-center">
                                    {/* Show loading spinner or relevant icon */}
                                    {authLoading && <Loader2 size={20} className="mr-2 animate-spin" />}
                                    {!authLoading && isSigningUp && <UserPlus size={18} className="mr-2" />}
                                    {/* Dynamic button text */}
                                    {authLoading ? 'Processing...' : (isSigningUp ? 'Sign Up' : 'Log In')}
                                </button>
                            </form>
                        )
                    )}
                </div> {/* End Main Content Area */}

                {/* --- Sidebar Footer (Toggle Auth Mode) --- */}
                {/* Shown only when logged out */}
                {!authLoading && !currentUser && (
                    <div className="p-4 border-t border-gray-200 text-center flex-shrink-0">
                        <button onClick={toggleAuthMode} disabled={authLoading} className="text-sm text-orange-600 hover:underline focus:outline-none disabled:opacity-50">
                            {/* Dynamically change text based on current mode */}
                            {isSigningUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
                        </button>
                    </div>
                )}
                 {/* Small bottom padding/spacer */}
                <div className="flex-shrink-0 h-4 bg-white"></div>
            </div> {/* End Sidebar Panel */}
        </>
    );
};

export default Sidebar;