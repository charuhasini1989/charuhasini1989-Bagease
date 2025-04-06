// src/components/Sidebar.tsx
import React, { useState, useEffect, useRef } from 'react';
import { X, Truck, MapPin, LogOut, ClipboardList, Loader2, AlertCircle, UserPlus, UserCircle, Phone, Package } from 'lucide-react'; // Keep all necessary icons
import { supabase } from '../supabase'; // Ensure this path is correct
import { User, AuthError, PostgrestError } from '@supabase/supabase-js'; // Import PostgrestError

// --- Define Prop Types ---
interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

// --- Feedback Message Types ---
interface FeedbackMessage {
    type: 'error' | 'success' | 'info';
    text: string;
}

// --- Combined Form Data Type ---
interface FormData {
    email: string;
    password: string;
    full_name: string;
    phone: string;
    date_of_birth: string;
    aadhar_number: string; // *** CAUTION: Handle securely! ***
}

// --- Data Fetching Types (Matching your confirmed SQL Schema) ---
interface ProfileData {
    id: string;
    full_name: string | null;
    email: string | null; // Email might be in profile or just auth.user
    phone: string | null;
    date_of_birth: string | null;
    // --- Address fields are NOT included here, matching your DB schema image ---
    created_at: string;
    updated_at: string;
}

// Must match the ENUM definition in SQL ('order_status' type)
type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Out for Delivery' | 'Delivered' | 'Cancelled' | 'Failed';

// Interface for data fetched from the 'orders' table
interface OrderData {
    id: number; // bigint maps to number in JS/TS
    user_id: string; // Foreign key to auth.users
    order_number: string | null;
    status: OrderStatus; // Uses the custom 'order_status' ENUM type
    total_amount: number; // numeric maps to number
    estimated_delivery: string | null; // timestamp maps to string (ISO format)
    delivered_at: string | null; // timestamp maps to string (ISO format)
    created_at: string;
    updated_at: string;
}

// Represents data fetched for an active delivery, joining 'delivery_assignments', 'delivery_personnel', and 'orders' tables
interface ActiveDeliveryInfo {
    order_id: number; // Reference to the 'orders' table's ID
    tracking_link: string | null; // From 'delivery_assignments'
    // Nested personnel details from the join/select
    delivery_personnel: {
        id: string; // Personnel's unique ID
        full_name: string | null;
        phone: string | null;
        vehicle_plate: string | null;
    } | null; // Personnel might be null if join fails or data missing
}


const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    // --- Authentication & Form State ---
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<FormData>({
        email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '',
    });
    const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
    const [authLoading, setAuthLoading] = useState<boolean>(true);
    const [isSigningUp, setIsSigningUp] = useState<boolean>(false);
    const [activeSection, setActiveSection] = useState<string>('');
    const emailInputRef = useRef<HTMLInputElement>(null);
    const nameInputRef = useRef<HTMLInputElement>(null);

    // --- Data Fetching State ---
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [activeOrders, setActiveOrders] = useState<OrderData[]>([]); // For tracking section (uses 'orders' table)
    const [pastOrders, setPastOrders] = useState<OrderData[]>([]); // For history section (uses 'orders' table)
    const [activeDeliveryInfo, setActiveDeliveryInfo] = useState<ActiveDeliveryInfo | null>(null); // For current delivery person details (joins 'delivery_assignments', 'delivery_personnel', 'orders')

    const [profileLoading, setProfileLoading] = useState<boolean>(false);
    const [trackingLoading, setTrackingLoading] = useState<boolean>(false);
    const [deliveryLoading, setDeliveryLoading] = useState<boolean>(false);
    const [ordersLoading, setOrdersLoading] = useState<boolean>(false);

    const [profileError, setProfileError] = useState<string | null>(null);
    const [trackingError, setTrackingError] = useState<string | null>(null);
    const [deliveryError, setDeliveryError] = useState<string | null>(null);
    const [ordersError, setOrdersError] = useState<string | null>(null);

    // --- Combined Auth Listener & Initial Load ---
    useEffect(() => {
        setAuthLoading(true); // Start loading on initial mount
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) console.error("Error getting initial session:", error.message);
            const user = session?.user ?? null;
            setCurrentUser(user);
            if (user) {
                fetchProfileData(user.id); // Fetch profile immediately if user exists
            } else {
                resetAuthState(false); // Reset form/section if no user initially
            }
             // Initial auth check complete
            setTimeout(() => setAuthLoading(false), 50); // Small delay for state to settle
        });

        const { data: authListener } = supabase.auth.onAuthStateChange(
            (event, session) => {
                setAuthLoading(true); // Set loading true during auth state transition
                const user = session?.user ?? null;
                setCurrentUser(user); // Update user state

                console.log("Auth Event:", event); // Debug log

                if (event === 'SIGNED_IN' && user) {
                    setFeedback(null);
                    // Reset form data, ensure not in signup mode
                    setFormData({ email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' });
                    setIsSigningUp(false);
                    setActiveSection(''); // Reset section on new login
                    fetchProfileData(user.id); // Fetch profile on successful sign in
                } else if (event === 'SIGNED_OUT' || !user) {
                    resetAuthState(); // Reset form/section state
                    // Clear all fetched data and errors on sign out
                    setProfileData(null);
                    setActiveOrders([]);
                    setPastOrders([]);
                    setActiveDeliveryInfo(null);
                    setProfileError(null);
                    setTrackingError(null);
                    setDeliveryError(null);
                    setOrdersError(null);
                }
                 // Auth state change processed
                setTimeout(() => setAuthLoading(false), 50); // Small delay for state/UI sync
            }
        );

        return () => {
            authListener?.subscription.unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only once on mount

    // --- Helper to reset Form/Section state ---
    const resetAuthState = (clearFeedback = true) => {
        setActiveSection('');
        setFormData({ email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' });
        if (clearFeedback) setFeedback(null);
        setIsSigningUp(false); // Default to login mode
    }

    // --- Body Scroll Lock ---
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // --- Input Change Handler ---
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };


    // --- Map Supabase Errors (Enhanced Version) ---
    const getFriendlyErrorMessage = (error: AuthError | PostgrestError | Error | any): { type: 'error' | 'info', text: string } => {
        let message = "An unexpected error occurred. Please try again.";
        let type: 'error' | 'info' = 'error';
        if (!error) return { type, text: message };
        console.error('Supabase Auth/DB Error:', error); // Log raw error
        const errorMessage = error.message || '';
        const errorCode = (error as PostgrestError)?.code || '';

        // --- Auth Errors ---
        if (errorMessage.includes('Invalid login credentials')) {
            if (!isSigningUp) {
                message = "Account not found or invalid password. Want to sign up?"; // Adjusted message
                type = 'info';
                setIsSigningUp(true);
                setFormData(prev => ({ ...prev, password: '' }));
                setTimeout(() => nameInputRef.current?.focus(), 100);
            } else {
                 message = 'Invalid details provided during signup attempt.';
                 type = 'error';
            }
        } else if (errorMessage.includes('User already registered') || (errorCode === '23505' && errorMessage.includes('auth.users'))) { // Be more specific about unique violation
            message = "This email is already registered. Please log in.";
            type = 'info';
            setIsSigningUp(false);
            setFormData(prev => ({ ...prev, password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: ''}));
            setTimeout(() => emailInputRef.current?.focus(), 100);
        } else if (errorMessage.includes('Password should be at least 6 characters')) {
            message = 'Password must be at least 6 characters long.';
        } else if (errorMessage.includes('Unable to validate email address: invalid format')) {
            message = 'Please enter a valid email address.';
        } else if (errorMessage.includes('Email rate limit exceeded') || errorMessage.includes('too many requests')) {
            message = 'Too many attempts. Please try again later.';
        // --- Database/Postgrest Errors ---
        } else if (errorCode === '23505' && errorMessage.includes('profiles')) { // Unique constraint violation on profiles
             message = 'Profile data conflict (e.g., duplicate phone/email if set unique). Could not save profile.';
             type = 'error';
        } else if (errorCode === '23503') { // Foreign key violation
             message = "Could not save data due to a reference error (e.g., trying to link to a non-existent user/order).";
             type = 'error';
        } else if (errorMessage.includes('check constraint') && errorMessage.includes('phone')) { // Check constraint failure
             message = 'Invalid phone number format provided.';
        } else if (errorCode === '42501') { // Insufficient permissions
            message = "Permission denied. Check RLS policies.";
            type = 'error';
        } else if (errorCode === '42P01') { // Table not found
            message = "Data table not found. Contact support."; // Should be less common now, but keep for safety
            type = 'error';
        } else if (errorCode === 'PGRST116') { // Single row expected, none/multiple found (handled in fetchProfileData)
            message = "Expected a single record but found none or multiple."; // Generic message if it happens elsewhere
            type = 'error';
        // --- Client-side Validation Errors ---
        } else if (error.message?.includes('Aadhar number must be 12 digits')) { // Check for specific client error message
            message = 'Aadhar number must be 12 digits.';
            type = 'error';
        } else {
             message = errorMessage || "An unknown error occurred."; // Default to Supabase message or generic error
             type = 'error';
        }
        return { type, text: message };
    };

    // --- Authentication Handler (Supabase - Sign Up / Log In) ---
    const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFeedback(null);
        setAuthLoading(true); // Use authLoading for this process
        const currentFormData = { ...formData };

        try {
            if (isSigningUp) {
                // --- Sign Up Logic ---
                if (!currentFormData.full_name) throw new Error("Full name is required for signup.");
                if (currentFormData.password.length < 6) throw new Error("Password must be at least 6 characters.");
                 const aadharPattern = /^\d{12}$/;
                 if (currentFormData.aadhar_number && !aadharPattern.test(currentFormData.aadhar_number)) {
                     throw new Error("Aadhar number must be 12 digits."); // Client-side check
                 }

                // 1. Sign up user with Supabase Auth
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email: currentFormData.email,
                    password: currentFormData.password,
                    // options: { data: { full_name: currentFormData.full_name } } // Optionally pass initial data if your trigger handles it
                });

                if (signUpError) throw signUpError;
                if (!signUpData.user) throw new Error("Signup successful but user data missing.");

                console.log('Auth signup successful for:', signUpData.user.email);

                // 2. Insert corresponding profile data into 'profiles' table
                try {
                    console.log('Attempting to insert profile for user:', signUpData.user.id);
                    // *** SECURITY WARNING: Storing raw Aadhar. Implement encryption! ***
                    const { error: profileError } = await supabase
                        .from('profiles') // Ensure 'profiles' table exists
                        .insert({
                            id: signUpData.user.id, // Link to the auth user ID
                            email: signUpData.user.email, // Store email in profile too (optional redundancy)
                            full_name: currentFormData.full_name,
                            phone: currentFormData.phone || null,
                            date_of_birth: currentFormData.date_of_birth || null,
                            aadhar_number: currentFormData.aadhar_number || null, // Storing plain text - BEWARE
                            // created_at/updated_at are usually handled by DB defaults/triggers
                        });

                    if (profileError) {
                        console.error('Error creating Supabase profile:', profileError);
                        const profileFeedback = getFriendlyErrorMessage(profileError);
                        // Show profile error but mention account creation worked
                        setFeedback({ type: 'info', text: `Account created for ${signUpData.user.email}, but profile save failed: ${profileFeedback.text}. You can update later.`});
                    } else {
                        console.log('Supabase profile created successfully.');
                        // Profile data will be fetched by the 'SIGNED_IN' event listener
                    }
                } catch (profileInsertError: any) {
                    console.error('Exception during profile creation:', profileInsertError);
                    setFeedback({ type: 'info', text: `Account created for ${signUpData.user.email}, but profile details couldn't be saved due to an error.`});
                }

                // 3. Handle UI feedback based on email verification status
                if (!signUpData.session) { // Email verification likely required
                    if (!feedback) { // Don't override profile error feedback if it exists
                        setFeedback({ type: 'success', text: 'Account created! Check your email (including spam) for a confirmation link.' });
                    }
                    setIsSigningUp(false); // Switch back to login view
                    setFormData(prev => ({ ...prev, password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' }));
                    // Auth listener won't fire 'SIGNED_IN' yet
                } else { // Auto-confirmation enabled or user already verified?
                    // Auth listener 'SIGNED_IN' will handle UI update, state reset, profile fetch.
                    if (!feedback) {
                        setFeedback({ type: 'success', text: 'Account created and logged in successfully!' });
                    }
                     // Let the 'SIGNED_IN' event handle resetting form state and UI
                }

            } else {
                // --- Log In Logic ---
                const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                    email: currentFormData.email,
                    password: currentFormData.password,
                });

                if (signInError) throw signInError; // Let catch block handle login errors using getFriendlyErrorMessage

                console.log('Logged in:', signInData.user?.email);
                // Auth listener 'SIGNED_IN' handles UI update, state reset, and profile fetch.
            }

        } catch (error: any) {
            const feedbackMessage = getFriendlyErrorMessage(error); // Use the enhanced error mapping
            setFeedback(feedbackMessage);
            // Focus logic (refocus input on error)
             if (!isSigningUp && emailInputRef.current && feedbackMessage.type === 'error') {
                emailInputRef.current.focus();
                emailInputRef.current.select();
            }
             if (isSigningUp && nameInputRef.current && (error.message?.includes('name') || error.message?.includes('Aadhar'))) {
                 nameInputRef.current.focus();
            }
        } finally {
            setAuthLoading(false); // Stop auth loading after attempt (success or fail)
        }
    };

    // --- Logout Handler ---
    const handleLogout = async () => {
        setAuthLoading(true); // Indicate loading for logout action
        setFeedback(null);
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Logout Error:', error.message);
            setFeedback({ type: 'error', text: "Failed to log out. Please try again." });
            setAuthLoading(false); // Stop loading only if logout itself errors
        }
        // Auth listener 'SIGNED_OUT' handles state reset, data clearing, and setting authLoading=false.
    };

    // --- Toggle Signup/Login View ---
    const toggleAuthMode = () => {
        const enteringSignupMode = !isSigningUp;
        setIsSigningUp(enteringSignupMode);
        setFormData(prev => ({
            email: prev.email, // Keep email
            password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' // Clear others
        }));
        setFeedback(null); // Clear feedback when switching modes
        // Focus the appropriate input field after the state update
        setTimeout(() => {
            if (enteringSignupMode && nameInputRef.current) nameInputRef.current.focus();
            else if (!enteringSignupMode && emailInputRef.current) emailInputRef.current.focus();
        }, 100);
    }

    // --- Data Fetching Functions ---

    // Fetch User Profile from 'profiles' table
    const fetchProfileData = async (userId: string) => {
        if (!userId) return;
        setProfileLoading(true);
        setProfileError(null);
        try {
             // Select columns confirmed to exist in the 'profiles' table schema
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email, phone, date_of_birth, created_at, updated_at') // Exclude aadhar for display
                .eq('id', userId)
                .single(); // Expect exactly one profile per user ID

            if (error) {
                 if (error.code === 'PGRST116') { // Specific error code for 0 or >1 rows found when 1 expected
                    console.warn("Profile not found or multiple profiles found for user:", userId);
                    setProfileError("Profile data incomplete or missing. Please update your details.");
                    setProfileData(null);
                 } else throw error; // Re-throw other errors
            } else {
                setProfileData(data as ProfileData); // Set fetched profile data
            }
        } catch (error: any) {
            const friendlyError = getFriendlyErrorMessage(error); // Use the helper for error messages
            setProfileError(friendlyError.text || "Could not load profile.");
            setProfileData(null);
        } finally {
            setProfileLoading(false); // Ensure loading state is turned off
        }
    };

    // Fetch Active Orders (for Tracking Section) from 'orders' table
    const fetchActiveOrders = async (userId: string) => {
      if (!userId) return;
      setTrackingLoading(true);
      setTrackingError(null);
      setActiveOrders([]); // Clear previous active orders
      try {
          // Define which statuses are considered 'active'
          const activeStatuses: OrderStatus[] = ['Pending', 'Processing', 'Shipped', 'Out for Delivery'];
          const { data, error } = await supabase
              .from('orders') // Query the 'orders' table
              .select('id, user_id, order_number, status, total_amount, estimated_delivery, created_at, updated_at')
              .eq('user_id', userId) // Filter by the current user's ID
              .in('status', activeStatuses) // Filter by the active statuses
              .order('created_at', { ascending: false }); // Show newest active orders first

          if (error) throw error; // Let catch block handle error display

          // Set the fetched active orders, casting to OrderData interface
          setActiveOrders(data as OrderData[]);
      } catch (error: any) {
          const friendlyError = getFriendlyErrorMessage(error);
          setTrackingError(friendlyError.text || "Could not load tracking info.");
      } finally {
          setTrackingLoading(false);
      }
    };

    // Fetch Delivery Details by joining 'delivery_assignments', 'delivery_personnel', and 'orders'
    const fetchDeliveryDetails = async (userId: string) => {
      if (!userId) return;
      setDeliveryLoading(true);
      setDeliveryError(null);
      setActiveDeliveryInfo(null); // Clear previous delivery info

      // Ensure profile data is loaded or attempted first (might be needed for display context)
      if (!profileData && !profileLoading && !profileError) {
           await fetchProfileData(userId);
      }

      try {
          // Perform the join query
          const { data: assignmentData, error: assignmentError } = await supabase
              .from('delivery_assignments') // Start from assignments
              .select(`
                  order_id,
                  tracking_link,
                  delivery_personnel ( id, full_name, phone, vehicle_plate ),
                  orders!inner ( user_id, status )
              `) // Select fields from assignments, nested personnel, and inner-joined orders
              .eq('orders.user_id', userId)   // Filter based on user_id in the joined 'orders' table
              .eq('orders.status', 'Out for Delivery') // Filter for orders currently 'Out for Delivery' in the joined 'orders' table
              .limit(1) // Expect at most one active delivery assignment at a time
              .maybeSingle(); // Use maybeSingle() as it's okay if no active delivery is found (returns null instead of error)

          if (assignmentError) {
               // Check for a specific relationship error, possibly due to schema mismatch or missing FK constraint
               if (assignmentError.message.includes('relationship') && assignmentError.message.includes('delivery_assignments') && assignmentError.message.includes('orders')) {
                   setDeliveryError("DB Relationship Error: Could not link delivery assignments to orders. Check foreign key constraints.");
               } else {
                   throw assignmentError; // Re-throw other Supabase errors
               }
           } else if (assignmentData) {
               // If data is found, set the active delivery info
               setActiveDeliveryInfo(assignmentData as ActiveDeliveryInfo);
           } else {
               setActiveDeliveryInfo(null); // Explicitly set to null if no active delivery found
           }

      } catch (error: any) {
          const friendlyError = getFriendlyErrorMessage(error);
          // Avoid overwriting a specific relationship error message if it was already set
          if (!deliveryError) {
              setDeliveryError(friendlyError.text || "Could not load delivery info.");
          }
           setActiveDeliveryInfo(null); // Ensure state is null on error
      } finally {
          setDeliveryLoading(false);
      }
    };

    // Fetch Past Orders (for My Orders History Section) from 'orders' table
    const fetchPastOrders = async (userId: string) => {
      if (!userId) return;
      setOrdersLoading(true);
      setOrdersError(null);
      setPastOrders([]); // Clear previous past orders
      try {
          // Define which statuses are considered 'past' or 'completed/inactive'
          const pastStatuses: OrderStatus[] = ['Delivered', 'Cancelled', 'Failed'];
          const { data, error } = await supabase
              .from('orders') // Query the 'orders' table
              .select('id, user_id, order_number, status, total_amount, delivered_at, created_at, updated_at')
              .eq('user_id', userId) // Filter by the current user's ID
              .in('status', pastStatuses) // Filter by the past statuses
              .order('created_at', { ascending: false }) // Show most recent past orders first
              .limit(25); // Limit the number of history items fetched for performance

          if (error) throw error; // Let catch block handle error display

          // Set the fetched past orders, casting to OrderData interface
          setPastOrders(data as OrderData[]);
      } catch (error: any) {
          const friendlyError = getFriendlyErrorMessage(error);
          setOrdersError(friendlyError.text || "Could not load order history.");
      } finally {
          setOrdersLoading(false);
      }
    };

    // --- Effect to Fetch Data Based on Active Section ---
    useEffect(() => {
        // Run only if logged in and initial auth check is complete
        if (!currentUser || authLoading) return;

        const userId = currentUser.id;
        console.log(`Section changed: ${activeSection}, User: ${userId}`); // Debug log

        // Reset errors specifically for the sections being fetched now
        setTrackingError(null);
        setDeliveryError(null);
        setOrdersError(null);
        // Profile error persists until explicitly re-fetched or on logout

        // Clear data for sections *not* currently active to prevent showing stale data
        if (activeSection !== 'tracking') setActiveOrders([]);
        if (activeSection !== 'delivery') setActiveDeliveryInfo(null);
        if (activeSection !== 'orders') setPastOrders([]);

        // Fetch data for the newly selected active section
        if (activeSection === 'tracking') {
            fetchActiveOrders(userId);
        } else if (activeSection === 'delivery') {
            // Ensure profile is loaded (or attempt loading) before fetching delivery details
             if (!profileData && !profileLoading && !profileError) {
                 fetchProfileData(userId); // Fetch profile if needed for display
             }
             fetchDeliveryDetails(userId); // Always fetch latest delivery status and assignment
        } else if (activeSection === 'orders') {
            fetchPastOrders(userId);
        }

    // Rerun this effect when the active section changes, the user ID changes (after login/logout), or initial auth loading completes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSection, currentUser?.id, authLoading]);


    // --- Reusable Input Field Classes ---
    const inputClasses = (hasError: boolean = false) =>
        `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${hasError ? 'border-red-500 ring-red-500' : 'border-gray-300'
        } disabled:bg-gray-100 disabled:cursor-not-allowed`;

    // --- Helper Formatting Functions ---
    const formatDateTime = (dateString: string | null | undefined): string => {
        if (!dateString) return 'N/A';
        try { return new Date(dateString).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }); }
        catch (e) { console.error("Date format error:", e); return 'Invalid Date'; }
    };
    const formatCurrency = (amount: number | null | undefined): string => {
        if (amount === null || amount === undefined) return 'N/A';
        // Format as Indian Rupees (INR)
        return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    };
     const getStatusColor = (status: OrderStatus): string => {
        // Returns Tailwind CSS classes based on the order status
        switch (status) {
            case 'Delivered': return 'text-green-700 bg-green-100';
            case 'Out for Delivery': return 'text-blue-700 bg-blue-100';
            case 'Shipped': return 'text-purple-700 bg-purple-100';
            case 'Processing': return 'text-yellow-800 bg-yellow-100';
            case 'Pending': return 'text-gray-700 bg-gray-100';
            case 'Cancelled': return 'text-red-700 bg-red-100';
            case 'Failed': return 'text-red-700 bg-red-100';
            default: return 'text-gray-700 bg-gray-100'; // Default fallback style
        }
    };

    // --- Determine overall loading state for the dashboard content sections ---
    const isSectionLoading = profileLoading || trackingLoading || deliveryLoading || ordersLoading;

    // --- Render Logic (JSX) ---
    return (
        <>
            {/* --- Background Overlay --- */}
            <div
                onClick={authLoading ? undefined : onClose} // Prevent closing during critical auth actions
                className={`fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm transition-opacity duration-300 z-40 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                aria-hidden={!isOpen} // Accessibility: hide from screen readers when closed
            />

            {/* --- Sidebar Panel --- */}
            <div
                className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
                role="dialog" aria-modal="true" aria-labelledby="sidebar-title" // Accessibility attributes
            >
                {/* --- Sidebar Header --- */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
                    <h2 id="sidebar-title" className="text-xl font-semibold text-gray-800">
                        {/* Dynamic title based on auth state */}
                        {authLoading && !currentUser ? 'Loading...' : (currentUser ? 'My Account' : (isSigningUp ? 'Create Account' : 'Log In'))}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full text-gray-500 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors"
                        aria-label="Close sidebar"
                        disabled={authLoading && !currentUser} // Disable close only during initial auth loading
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* --- Main Content Area (Scrollable) --- */}
                <div className="flex-grow p-6 overflow-y-auto">

                    {/* --- Global Feedback Display Area (for Auth/General Errors) --- */}
                    {feedback && (
                        <div className={`mb-4 p-3 border rounded-md text-sm flex items-start ${feedback.type === 'error' ? 'bg-red-50 border-red-300 text-red-800' : feedback.type === 'success' ? 'bg-green-50 border-green-300 text-green-800' : 'bg-blue-50 border-blue-300 text-blue-800'}`}>
                            <AlertCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" />
                            <span>{feedback.text}</span>
                        </div>
                    )}

                    {/* --- Initial Loading Indicator (Only shown before user state is known) --- */}
                    {authLoading && !currentUser && !feedback && (
                        <div className="flex justify-center items-center py-10">
                            <Loader2 size={32} className="animate-spin text-orange-600" />
                            <span className="ml-2 text-gray-500">Connecting...</span>
                        </div>
                    )}

                    {/* --- Logged In View --- */}
                    {!authLoading && currentUser ? (
                        <div className="space-y-6">
                            {/* Welcome Message */}
                            <p className="text-gray-600 truncate">
                                Welcome, <span className='font-medium'>
                                    {profileLoading ? '...' : (profileData?.full_name || currentUser.email)} {/* Show name if loaded, else email */}
                                </span>!
                                {/* Indicate if there was an error loading the profile */}
                                {profileError && !profileLoading && <span className='text-red-500 text-xs ml-1'>(Profile Error)</span>}
                            </p>

                            {/* Dashboard Navigation Buttons */}
                            <nav className="space-y-2">
                                 <button disabled={authLoading || isSectionLoading} className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors disabled:opacity-50 disabled:pointer-events-none ${activeSection === 'tracking' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`} onClick={() => setActiveSection('tracking')}> <Truck size={18} className="mr-3 flex-shrink-0" /> Order Tracking </button>
                                 <button disabled={authLoading || isSectionLoading} className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors disabled:opacity-50 disabled:pointer-events-none ${activeSection === 'delivery' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`} onClick={() => setActiveSection('delivery')}> <MapPin size={18} className="mr-3 flex-shrink-0" /> Delivery Details </button>
                                 <button disabled={authLoading || isSectionLoading} className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors disabled:opacity-50 disabled:pointer-events-none ${activeSection === 'orders' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`} onClick={() => setActiveSection('orders')}> <ClipboardList size={18} className="mr-3 flex-shrink-0" /> My Orders </button>
                            </nav>

                            {/* Dashboard Content Display Area */}
                            <div className="mt-6 p-4 bg-gray-50 rounded-lg min-h-[250px] border border-gray-200 relative">
                                {/* Loading Overlay for Section Content */}
                                {isSectionLoading && (
                                    <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex justify-center items-center rounded-lg z-10">
                                        <Loader2 size={28} className="animate-spin text-orange-500" />
                                        <span className="ml-2 text-gray-600">Loading Details...</span>
                                    </div>
                                )}

                                {/* --- Render Specific Section Content Based on 'activeSection' --- */}
                                {!activeSection && (<p className="text-sm text-gray-500 text-center pt-4">Select an option above to view details.</p>)}

                                {/* Order Tracking Section Content */}
                                {activeSection === 'tracking' && (
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3 text-gray-800 flex items-center"><Truck size={20} className="mr-2 text-orange-600" /> Active Order Tracking</h3>
                                        {/* Display error message if fetching tracking info failed */}
                                        {trackingError && !trackingLoading && <p className="text-sm text-red-600 flex items-center mb-3 p-2 bg-red-50 border border-red-200 rounded"><AlertCircle size={16} className="mr-1" /> {trackingError}</p>}
                                        {/* Display message if loading is complete, no error, but no active orders found */}
                                        {!trackingLoading && !trackingError && activeOrders.length === 0 && <p className="text-sm text-gray-500 italic text-center py-4">No active orders found.</p>}
                                        {/* Display list of active orders */}
                                        {!trackingLoading && !trackingError && activeOrders.length > 0 && (
                                            <ul className="space-y-4">
                                                {activeOrders.map(order => (
                                                    <li key={order.id} className="p-3 border border-gray-200 rounded-md bg-white shadow-sm">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <p className="text-sm font-medium text-gray-900">Order #{order.order_number || order.id}</p>
                                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>{order.status}</span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 mb-1">Placed: {formatDateTime(order.created_at)}</p>
                                                        {order.estimated_delivery && <p className="text-sm text-gray-600">Est. Delivery: <span className='font-medium'>{formatDateTime(order.estimated_delivery)}</span></p>}
                                                        <p className="text-sm text-gray-800 font-medium mt-1">Total: {formatCurrency(order.total_amount)}</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}

                                {/* Delivery Details Section Content */}
                                {activeSection === 'delivery' && (
                                     <div>
                                        <h3 className="text-lg font-semibold mb-3 text-gray-800 flex items-center"><MapPin size={20} className="mr-2 text-orange-600" /> Delivery Details</h3>
                                        {/* Display Errors First (Profile and Delivery specific errors) */}
                                        {profileError && !profileLoading && <p className="text-sm text-red-600 flex items-center mb-3 p-2 bg-red-50 border border-red-200 rounded"><AlertCircle size={16} className="mr-1" /> Profile: {profileError}</p>}
                                        {deliveryError && !deliveryLoading && <p className="text-sm text-red-600 flex items-center mb-3 p-2 bg-red-50 border border-red-200 rounded"><AlertCircle size={16} className="mr-1" /> Delivery Info: {deliveryError}</p>}

                                        {/* User Profile Info Display Area */}
                                        <div className="mb-4 p-3 border border-dashed border-gray-300 rounded-md bg-white">
                                            <h4 className="text-md font-semibold text-gray-700 mb-1">Your Profile Info</h4>
                                            {profileLoading && <p className="text-sm text-gray-500 italic">Loading profile...</p>}
                                            {!profileLoading && profileData && (
                                                <div className='text-sm text-gray-600 space-y-0.5'>
                                                    <p><span className='font-medium'>Name:</span> {profileData.full_name || 'Not provided'}</p>
                                                    <p><span className='font-medium'>Email:</span> {profileData.email || currentUser.email}</p> {/* Show profile email or fallback to auth email */}
                                                    <p><span className='font-medium'>Phone:</span> {profileData.phone || 'Not provided'}</p>
                                                    {/* Placeholder for future address fields */}
                                                    <p className="text-xs text-gray-500 italic mt-1"> (Address details not implemented in profile table yet)</p>
                                                    {/* TODO: Implement Edit Profile functionality */}
                                                    <button className="text-xs text-orange-600 hover:underline mt-2" onClick={() => alert('Edit Profile functionality not implemented.')}>Edit Profile</button>
                                                </div>
                                            )}
                                            {/* Handle cases where profile loading finished but data is still null (either error or not found) */}
                                            {!profileLoading && !profileData && !profileError && (
                                                 <p className="text-sm text-gray-500 italic">Could not load profile data.</p>
                                            )}
                                        </div>

                                         {/* Active Delivery Driver Info Area */}
                                         <h4 className="text-md font-semibold text-gray-700 mb-1 mt-4">Active Delivery</h4>
                                         {/* Display only if no error, loading complete, and active delivery info with personnel exists */}
                                        {!deliveryLoading && !deliveryError && activeDeliveryInfo?.delivery_personnel && (
                                            <div className="p-3 border rounded-md bg-blue-50 border-blue-200">
                                                <h5 className="text-sm font-semibold text-blue-800 mb-2 flex items-center"><Package size={18} className="mr-1.5"/> Order #{activeDeliveryInfo.order_id} is Out for Delivery!</h5>
                                                <div className='space-y-1 text-sm text-blue-700'>
                                                    {activeDeliveryInfo.delivery_personnel.full_name && <p className='flex items-center'><UserCircle size={16} className="mr-1.5 flex-shrink-0" /> Driver: <span className='font-medium ml-1'>{activeDeliveryInfo.delivery_personnel.full_name}</span></p>}
                                                    {activeDeliveryInfo.delivery_personnel.phone && <p className='flex items-center'><Phone size={16} className="mr-1.5 flex-shrink-0" /> Contact: <a href={`tel:${activeDeliveryInfo.delivery_personnel.phone}`} className='text-blue-800 hover:underline ml-1'>{activeDeliveryInfo.delivery_personnel.phone}</a></p>}
                                                    {activeDeliveryInfo.delivery_personnel.vehicle_plate && <p className='flex items-center'><Truck size={16} className="mr-1.5 flex-shrink-0"/> Vehicle: <span className='font-medium ml-1'>{activeDeliveryInfo.delivery_personnel.vehicle_plate}</span></p>}
                                                    {activeDeliveryInfo.tracking_link && <a href={activeDeliveryInfo.tracking_link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-800 hover:underline font-medium mt-2 inline-block">Live Tracking Map</a>}
                                                </div>
                                            </div>
                                        )}
                                        {/* Display if loading complete, no error, but no active delivery found */}
                                        {!deliveryLoading && !deliveryError && !activeDeliveryInfo && (
                                            <p className="text-sm text-gray-500 italic text-center py-3">No orders currently out for delivery.</p>
                                        )}
                                        {/* Display if loading complete, no error, assignment exists but personnel details are missing (data integrity issue?) */}
                                        {!deliveryLoading && !deliveryError && activeDeliveryInfo && !activeDeliveryInfo.delivery_personnel && (
                                            <p className="text-sm text-orange-700 italic text-center py-3">Delivery assigned, but driver details unavailable.</p>
                                        )}
                                    </div>
                                )}

                                {/* My Orders History Section Content */}
                                {activeSection === 'orders' && (
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3 text-gray-800 flex items-center"><ClipboardList size={20} className="mr-2 text-orange-600" /> Order History</h3>
                                        {/* Display error message if fetching order history failed */}
                                        {ordersError && !ordersLoading && <p className="text-sm text-red-600 flex items-center mb-3 p-2 bg-red-50 border border-red-200 rounded"><AlertCircle size={16} className="mr-1" /> {ordersError}</p>}
                                        {/* Display message if loading is complete, no error, but no past orders found */}
                                        {!ordersLoading && !ordersError && pastOrders.length === 0 && <p className="text-sm text-gray-500 italic text-center py-4">No past orders found.</p>}
                                        {/* Display list of past orders */}
                                        {!ordersLoading && !ordersError && pastOrders.length > 0 && (
                                            <ul className="space-y-4">
                                                {pastOrders.map(order => (
                                                    <li key={order.id} className="p-3 border border-gray-200 rounded-md bg-white shadow-sm opacity-90 hover:opacity-100 transition-opacity">
                                                        <div className="flex justify-between items-start mb-1">
                                                             <p className="text-sm font-medium text-gray-900">Order #{order.order_number || order.id}</p>
                                                             <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>{order.status}</span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 mb-1">Placed: {formatDateTime(order.created_at)}</p>
                                                        {/* Show delivery date only if the order was delivered and date exists */}
                                                        {order.status === 'Delivered' && order.delivered_at && <p className="text-xs text-green-600">Delivered: {formatDateTime(order.delivered_at)}</p>}
                                                        <p className="text-sm text-gray-800 font-medium mt-1">Total: {formatCurrency(order.total_amount)}</p>
                                                        {/* TODO: Implement View Details / Reorder functionality */}
                                                        <button className="text-xs text-orange-600 hover:underline mt-1" onClick={() => alert('View Details / Reorder not implemented.')}>View Details / Reorder</button>
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
                                disabled={authLoading} // Disable only during ongoing auth actions (login/logout/signup)
                                className="flex items-center justify-center w-full px-4 py-2 mt-6 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {authLoading ? <Loader2 size={18} className="mr-2 animate-spin" /> : <LogOut size={18} className="mr-2" />}
                                {authLoading ? 'Processing...' : 'Logout'} {/* Show 'Processing...' during logout */}
                            </button>
                        </div>
                    ) : (
                        // --- Logged Out View (Login OR Signup Form) ---
                        !authLoading && !currentUser && (
                            <form onSubmit={handleAuth} className="space-y-4">
                                {/* Signup Specific Fields (conditional rendering) */}
                                {isSigningUp && (
                                     <>
                                        <div>
                                            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                            <input ref={nameInputRef} id="full_name" name="full_name" type="text" value={formData.full_name} onChange={handleInputChange} placeholder="Your full name" className={inputClasses()} required disabled={authLoading} />
                                        </div>
                                        <div>
                                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number <span className="text-xs text-gray-500">(Optional)</span></label>
                                            <input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} placeholder="e.g., 9876543210" className={inputClasses()} disabled={authLoading} />
                                        </div>
                                        <div>
                                            <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-1">Date of Birth <span className="text-xs text-gray-500">(Optional)</span></label>
                                            <input id="date_of_birth" name="date_of_birth" type="date" value={formData.date_of_birth} onChange={handleInputChange} max={new Date().toISOString().split("T")[0]} className={inputClasses()} disabled={authLoading} />
                                        </div>
                                        <div>
                                            <label htmlFor="aadhar_number" className="block text-sm font-medium text-gray-700 mb-1">Aadhar Number <span className="text-xs text-gray-500">(Optional)</span></label>
                                            <input id="aadhar_number" name="aadhar_number" type="text" inputMode="numeric" pattern="\d{12}" title="Enter 12-digit Aadhar number" value={formData.aadhar_number} onChange={handleInputChange} placeholder="1234 5678 9012" className={inputClasses()} disabled={authLoading} />
                                            <p className="text-xs text-gray-500 mt-1">12 digits only. <span className='font-semibold text-orange-700'>Handle with care.</span></p>
                                        </div>
                                        <hr className="my-2 border-gray-200" />
                                    </>
                                )}
                                {/* Email Input (Common to Login & Signup) */}
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input ref={emailInputRef} id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="you@example.com" className={inputClasses(feedback?.type === 'error' && !isSigningUp)} required disabled={authLoading} autoComplete="email" />
                                </div>
                                {/* Password Input (Common to Login & Signup) */}
                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                    <input id="password" name="password" type="password" value={formData.password} onChange={handleInputChange} placeholder={isSigningUp ? "Create a password (min. 6 chars)" : "••••••••"} className={inputClasses(feedback?.type === 'error')} required minLength={isSigningUp ? 6 : undefined} disabled={authLoading} autoComplete={isSigningUp ? "new-password" : "current-password"}/>
                                    {/* Forgot Password Link (Login view only) */}
                                    {!isSigningUp && (
                                        <div className="text-right mt-1">
                                            {/* TODO: Implement Password Reset functionality */}
                                            <button type="button" className="text-sm text-orange-600 hover:underline focus:outline-none" onClick={() => setFeedback({ type: 'info', text: 'Password reset functionality not implemented yet.' })}>
                                                Forgot password?
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {/* Submit Button (Dynamic Text) */}
                                <button type="submit" disabled={authLoading} className="w-full bg-orange-600 text-white py-2.5 px-4 rounded-lg font-semibold hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors disabled:opacity-70 flex items-center justify-center">
                                    {authLoading && <Loader2 size={20} className="mr-2 animate-spin" />}
                                    {!authLoading && isSigningUp && <UserPlus size={18} className="mr-2" />} {/* Icon for Signup */}
                                    {authLoading ? 'Processing...' : (isSigningUp ? 'Sign Up' : 'Log In')}
                                </button>
                            </form>
                        )
                    )}
                </div> {/* End Main Content Area */}

                {/* --- Footer Section (Toggle Auth Mode / Bottom Padding) --- */}
                {/* Show toggle only when logged out and auth isn't processing */}
                {!authLoading && !currentUser && (
                    <div className="p-4 border-t border-gray-200 text-center flex-shrink-0">
                        <button onClick={toggleAuthMode} disabled={authLoading} className="text-sm text-orange-600 hover:underline focus:outline-none disabled:opacity-50">
                            {isSigningUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
                        </button>
                    </div>
                )}
                {/* Extra padding at the bottom inside the sidebar */}
                <div className="flex-shrink-0 h-4 bg-white"></div>
            </div> {/* End Sidebar Panel */} 
        </>
    );
};

export default Sidebar;