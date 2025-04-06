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
    // --- Address fields are NOT included here yet, matching your DB screenshot ---
    // address_line1?: string | null;
    // city?: string | null;
    // postal_code?: string | null;
    // country?: string | null;
    // --- Aadhar should ideally not be fetched/displayed regularly ---
    // aadhar_number: string | null;
    created_at: string;
    updated_at: string;
}

// Must match the ENUM definition in SQL
type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Out for Delivery' | 'Delivered' | 'Cancelled' | 'Failed';

interface OrderData {
    id: number; // bigint maps to number in JS/TS
    user_id: string; // Make sure this exists in your select if needed elsewhere
    order_number: string | null;
    status: OrderStatus;
    total_amount: number; // numeric maps to number
    estimated_delivery: string | null; // timestamp maps to string (ISO format)
    delivered_at: string | null;
    created_at: string;
    updated_at: string;
}

// Represents data fetched for an active delivery, joining assignment and personnel
interface ActiveDeliveryInfo {
    order_id: number;
    tracking_link: string | null;
    // Nested personnel details from the join/select
    delivery_personnel: {
        id: string; // Include id if needed
        full_name: string | null;
        phone: string | null;
        vehicle_plate: string | null;
    } | null; // Personnel might be null if join fails or data missing
}


const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    // --- Authentication & Form State (From Working Version) ---
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<FormData>({
        email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '',
    });
    const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
    const [authLoading, setAuthLoading] = useState<boolean>(true); // Renamed original 'loading'
    const [isSigningUp, setIsSigningUp] = useState<boolean>(false);
    const [activeSection, setActiveSection] = useState<string>('');
    const emailInputRef = useRef<HTMLInputElement>(null);
    const nameInputRef = useRef<HTMLInputElement>(null);

    // --- Data Fetching State (From Goal Version) ---
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [activeOrders, setActiveOrders] = useState<OrderData[]>([]); // For tracking
    const [pastOrders, setPastOrders] = useState<OrderData[]>([]); // For history
    const [activeDeliveryInfo, setActiveDeliveryInfo] = useState<ActiveDeliveryInfo | null>(null); // For current delivery person details

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

    // --- Helper to reset Form/Section state (from Working Version) ---
    const resetAuthState = (clearFeedback = true) => {
        setActiveSection('');
        setFormData({ email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' });
        if (clearFeedback) setFeedback(null);
        setIsSigningUp(false); // Default to login mode
    }

    // --- Body Scroll Lock (from Working Version) ---
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

    // --- Input Change Handler (from Working Version) ---
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
        } else if (errorMessage.includes('User already registered') || errorCode === '23505') {
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
        } else if (errorMessage.includes('check constraint') && errorMessage.includes('phone')) {
             message = 'Invalid phone number format provided.';
        } else if (errorMessage.includes('profiles_pkey') || (errorCode === '23505' && errorMessage.includes('profiles'))) {
             message = 'Profile data conflict. Could not save profile.';
             type = 'error';
        } else if (errorCode === '42501') {
            message = "Permission denied. Check RLS policies.";
            type = 'error';
        } else if (errorCode === '42P01') {
            message = "Data table not found. Contact support.";
            type = 'error';
        } else if (errorCode === '23503') {
             message = "Could not save data due to a reference error.";
             type = 'error';
        } else if (error.message?.includes('Aadhar number must be 12 digits')) {
            message = 'Aadhar number must be 12 digits.'; // Catch client-side validation error
            type = 'error';
        } else {
             message = errorMessage || "An unknown error occurred."; // Default to Supabase message
             type = 'error';
        }
        return { type, text: message };
    };

    // --- Authentication Handler (Supabase - Merged Logic) ---
    const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFeedback(null);
        setAuthLoading(true); // Use authLoading for this process
        const currentFormData = { ...formData };

        try {
            if (isSigningUp) {
                // --- Sign Up Logic (From Working Version + Validation) ---
                if (!currentFormData.full_name) throw new Error("Full name is required for signup.");
                if (currentFormData.password.length < 6) throw new Error("Password must be at least 6 characters.");
                 const aadharPattern = /^\d{12}$/;
                 if (currentFormData.aadhar_number && !aadharPattern.test(currentFormData.aadhar_number)) {
                     throw new Error("Aadhar number must be 12 digits.");
                 }

                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email: currentFormData.email,
                    password: currentFormData.password,
                });

                if (signUpError) throw signUpError;
                if (!signUpData.user) throw new Error("Signup successful but user data missing.");

                console.log('Auth signup successful for:', signUpData.user.email);

                // --- Insert Profile Data (From Working Version) ---
                // Use the fields confirmed by the DB screenshot
                try {
                    console.log('Attempting to insert profile for user:', signUpData.user.id);
                    // *** SECURITY WARNING: Storing raw Aadhar. Implement encryption! ***
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .insert({
                            id: signUpData.user.id, // Link to the auth user
                            email: signUpData.user.email, // Optional: store email in profile too
                            full_name: currentFormData.full_name,
                            phone: currentFormData.phone || null,
                            date_of_birth: currentFormData.date_of_birth || null,
                            aadhar_number: currentFormData.aadhar_number || null, // Storing plain text - BEWARE
                            // created_at/updated_at are handled by DB defaults/triggers
                        });

                    if (profileError) {
                        console.error('Error creating Supabase profile:', profileError);
                        const profileFeedback = getFriendlyErrorMessage(profileError);
                        // Show profile error but mention account creation worked
                        setFeedback({ type: 'info', text: `Account created for ${signUpData.user.email}, but profile save failed: ${profileFeedback.text}. You can update later.`});
                    } else {
                        console.log('Supabase profile created successfully.');
                        // Optionally set profileData state immediately if needed, though fetchProfileData on SIGNED_IN handles it
                    }
                } catch (profileInsertError: any) {
                    console.error('Exception during profile creation:', profileInsertError);
                    setFeedback({ type: 'info', text: `Account created for ${signUpData.user.email}, but profile details couldn't be saved due to an error.`});
                }

                // Handle email verification / auto-login (From Working Version)
                if (!signUpData.session) {
                    if (!feedback) { // Don't override profile error feedback
                        setFeedback({ type: 'success', text: 'Account created! Check your email (including spam) for a confirmation link.' });
                    }
                    setIsSigningUp(false);
                    setFormData(prev => ({ ...prev, password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' }));
                    // Let auth listener handle loading state eventually
                } else {
                    // User is signed up AND logged in (auto-confirmation enabled)
                    // Auth listener 'SIGNED_IN' will handle UI update, state reset, profile fetch.
                    if (!feedback) {
                        setFeedback({ type: 'success', text: 'Account created and logged in successfully!' });
                    }
                }

            } else {
                // --- Log In Logic (From Working Version) ---
                const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                    email: currentFormData.email,
                    password: currentFormData.password,
                });

                if (signInError) throw signInError; // Let catch block handle login errors

                console.log('Logged in:', signInData.user?.email);
                // Auth listener 'SIGNED_IN' handles UI update, state reset, and profile fetch.
            }

        } catch (error: any) {
            const feedbackMessage = getFriendlyErrorMessage(error);
            setFeedback(feedbackMessage);
            // Focus logic (From Working Version)
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

    // --- Logout Handler (From Working Version) ---
    const handleLogout = async () => {
        setAuthLoading(true); // Indicate loading for logout action
        setFeedback(null);
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Logout Error:', error.message);
            setFeedback({ type: 'error', text: "Failed to log out. Please try again." });
            setAuthLoading(false); // Stop loading only if logout itself errors
        }
        // Auth listener 'SIGNED_OUT' handles state reset, data clearing, and final loading=false.
    };

    // --- Toggle Signup/Login View (From Working Version) ---
    const toggleAuthMode = () => {
        const enteringSignupMode = !isSigningUp;
        setIsSigningUp(enteringSignupMode);
        setFormData(prev => ({
            email: prev.email, // Keep email
            password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' // Clear others
        }));
        setFeedback(null);
        setTimeout(() => {
            if (enteringSignupMode && nameInputRef.current) nameInputRef.current.focus();
            else if (!enteringSignupMode && emailInputRef.current) emailInputRef.current.focus();
        }, 100);
    }

    // --- Data Fetching Functions (From Goal Version - adjusted selects) ---

    // Fetch User Profile
    const fetchProfileData = async (userId: string) => {
        if (!userId) return;
        setProfileLoading(true);
        setProfileError(null);
        try {
             // Select only columns known to exist in the 'profiles' table based on screenshot/signup
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email, phone, date_of_birth, created_at, updated_at') // Exclude address/aadhar for now
                .eq('id', userId)
                .single();

            if (error) {
                 if (error.code === 'PGRST116') {
                    console.warn("Profile not found for user:", userId);
                    setProfileError("Profile data incomplete. Please update your details.");
                    setProfileData(null);
                 } else throw error;
            } else {
                setProfileData(data as ProfileData);
            }
        } catch (error: any) {
            const friendlyError = getFriendlyErrorMessage(error);
            setProfileError(friendlyError.text || "Could not load profile.");
            setProfileData(null);
        } finally {
            setProfileLoading(false);
        }
    };

    // Fetch Active Orders (for Tracking) - MODIFIED
const fetchActiveOrders = async (userId: string) => {
  if (!userId) return;
  setTrackingLoading(true);
  setTrackingError(null);
  setActiveOrders([]);
  try {
      const activeStatuses: OrderStatus[] = ['Pending', 'Processing', 'Shipped', 'Out for Delivery'];
      const { data, error } = await supabase
          .from('order_tracking') // <--- CHANGED TABLE NAME
          .select('id, user_id, order_number, status, total_amount, estimated_delivery, created_at, updated_at') // Ensure user_id is selected for filtering
          .eq('user_id', userId)
          .in('status', activeStatuses)
          .order('created_at', { ascending: false });

      if (error) throw error;
      // Cast should still be valid if columns match OrderData
      setActiveOrders(data as OrderData[]);
  } catch (error: any) {
      const friendlyError = getFriendlyErrorMessage(error);
      setTrackingError(friendlyError.text || "Could not load tracking info.");
  } finally {
      setTrackingLoading(false);
  }
};

    // Fetch Delivery Details - MODIFIED (Assuming link is to order_tracking)
const fetchDeliveryDetails = async (userId: string) => {
  if (!userId) return;
  setDeliveryLoading(true);
  setDeliveryError(null);
  setActiveDeliveryInfo(null);

  // Ensure profile is attempted if not already loaded/loading/errored
  if (!profileData && !profileLoading && !profileError) {
       await fetchProfileData(userId);
  }

  try {
      // Join assignments with personnel and *order_tracking*
      const { data: assignmentData, error: assignmentError } = await supabase
          .from('delivery_assignments')
          .select(`
              order_id,
              tracking_link,
              delivery_personnel ( id, full_name, phone, vehicle_plate ),
              order_tracking!inner ( user_id, status ) // <--- CHANGED JOIN TABLE
          `) // Use !inner join to ensure order_tracking exists
          .eq('order_tracking.user_id', userId)   // <--- CHANGED FILTER TABLE
          .eq('order_tracking.status', 'Out for Delivery') // <--- CHANGED FILTER TABLE
          .limit(1)
          .maybeSingle(); // Ok if null

      if (assignmentError) throw assignmentError;

      if (assignmentData) {
           // Cast should still be valid if structure is the same
          setActiveDeliveryInfo(assignmentData as ActiveDeliveryInfo);
      } else {
          setActiveDeliveryInfo(null); // No active delivery
      }

  } catch (error: any) {
      const friendlyError = getFriendlyErrorMessage(error);
      setDeliveryError(friendlyError.text || "Could not load delivery info.");
       setActiveDeliveryInfo(null);
  } finally {
      setDeliveryLoading(false);
  }
};

    // Fetch Past Orders (for My Orders History) - MODIFIED
const fetchPastOrders = async (userId: string) => {
  if (!userId) return;
  setOrdersLoading(true);
  setOrdersError(null);
  setPastOrders([]);
  try {
      const pastStatuses: OrderStatus[] = ['Delivered', 'Cancelled', 'Failed'];
      const { data, error } = await supabase
          .from('order_tracking') // <--- CHANGED TABLE NAME
          .select('id, user_id, order_number, status, total_amount, delivered_at, created_at, updated_at') // Ensure user_id is selected
          .eq('user_id', userId)
          .in('status', pastStatuses)
          .order('created_at', { ascending: false })
          .limit(25);

      if (error) throw error;
      // Cast should still be valid
      setPastOrders(data as OrderData[]);
  } catch (error: any) {
      const friendlyError = getFriendlyErrorMessage(error);
      setOrdersError(friendlyError.text || "Could not load order history.");
  } finally {
      setOrdersLoading(false);
  }
};

    // --- Effect to Fetch Data Based on Active Section (From Goal Version) ---
    useEffect(() => {
        // Run only if logged in and auth process is complete
        if (!currentUser || authLoading) return;

        const userId = currentUser.id;
        console.log(`Section changed: ${activeSection}`); // Debug log

        // Reset errors for the sections being fetched
        setTrackingError(null);
        setDeliveryError(null);
        setOrdersError(null);
        // Profile error persists until explicitly re-fetched or on logout

        // Clear data for sections *not* currently active
        if (activeSection !== 'tracking') setActiveOrders([]);
        if (activeSection !== 'delivery') setActiveDeliveryInfo(null);
        if (activeSection !== 'orders') setPastOrders([]);

        // Fetch data for the new active section
        if (activeSection === 'tracking') {
            fetchActiveOrders(userId);
        } else if (activeSection === 'delivery') {
            // Ensure profile is loaded for address display, then fetch assignment
             if (!profileData && !profileLoading && !profileError) {
                 fetchProfileData(userId); // Fetch profile if needed
             }
             fetchDeliveryDetails(userId); // Always fetch latest delivery status
        } else if (activeSection === 'orders') {
            fetchPastOrders(userId);
        }

    // Rerun when section changes or user ID changes (after auth)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSection, currentUser?.id, authLoading]);


    // --- Reusable Input Field Classes (from Working Version) ---
    const inputClasses = (hasError: boolean = false) =>
        `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${hasError ? 'border-red-500 ring-red-500' : 'border-gray-300'
        } disabled:bg-gray-100 disabled:cursor-not-allowed`;

    // --- Helper Functions (From Goal Version) ---
    const formatDateTime = (dateString: string | null | undefined) => {
        if (!dateString) return 'N/A';
        try { return new Date(dateString).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }); }
        catch (e) { console.error("Date format error:", e); return 'Invalid Date'; }
    };
    const formatCurrency = (amount: number | null | undefined) => {
        if (amount === null || amount === undefined) return 'N/A';
        return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }); // Example: INR
    };
     const getStatusColor = (status: OrderStatus): string => {
        // Same switch statement as before...
        switch (status) {
            case 'Delivered': return 'text-green-700 bg-green-100';
            case 'Out for Delivery': return 'text-blue-700 bg-blue-100';
            case 'Shipped': return 'text-purple-700 bg-purple-100';
            case 'Processing': return 'text-yellow-800 bg-yellow-100';
            case 'Pending': return 'text-gray-700 bg-gray-100';
            case 'Cancelled': return 'text-red-700 bg-red-100';
            case 'Failed': return 'text-red-700 bg-red-100';
            default: return 'text-gray-700 bg-gray-100';
        }
    };

    // --- Determine overall loading state for the dashboard content ---
    const isSectionLoading = profileLoading || trackingLoading || deliveryLoading || ordersLoading;

    // --- Render Logic (JSX - Based on Working Version Structure + Goal Content) ---
    return (
        <>
            {/* --- Overlay (From Working Version) --- */}
            <div
                onClick={authLoading ? undefined : onClose} // Prevent close during critical auth
                className={`fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm transition-opacity duration-300 z-40 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                aria-hidden={!isOpen}
            />

            {/* --- Sidebar Panel (From Working Version) --- */}
            <div
                className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
                role="dialog" aria-modal="true" aria-labelledby="sidebar-title"
            >
                {/* --- Header (From Working Version) --- */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
                    <h2 id="sidebar-title" className="text-xl font-semibold text-gray-800">
                        {authLoading && !currentUser ? 'Loading...' : (currentUser ? 'My Account' : (isSigningUp ? 'Create Account' : 'Log In'))}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full text-gray-500 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors"
                        aria-label="Close sidebar"
                        disabled={authLoading && !currentUser} // Disable close only during initial/auth loading
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* --- Main Content Area (Scrollable - From Working Version) --- */}
                <div className="flex-grow p-6 overflow-y-auto">

                    {/* --- Feedback Display Area (Auth Feedback - From Working Version) --- */}
                    {feedback && (
                        <div className={`mb-4 p-3 border rounded-md text-sm flex items-start ${feedback.type === 'error' ? 'bg-red-50 border-red-300 text-red-800' : feedback.type === 'success' ? 'bg-green-50 border-green-300 text-green-800' : 'bg-blue-50 border-blue-300 text-blue-800'}`}>
                            <AlertCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" />
                            <span>{feedback.text}</span>
                        </div>
                    )}

                    {/* --- Loading Indicator (Initial Auth Load Only - From Working Version) --- */}
                    {authLoading && !currentUser && !feedback && (
                        <div className="flex justify-center items-center py-10">
                            <Loader2 size={32} className="animate-spin text-orange-600" />
                            <span className="ml-2 text-gray-500">Connecting...</span>
                        </div>
                    )}

                    {/* --- Logged In View (Structure from Working Version, Content from Goal Version) --- */}
                    {!authLoading && currentUser ? (
                        <div className="space-y-6">
                            {/* Welcome Message (Shows Profile Name/Email) */}
                            <p className="text-gray-600 truncate">
                                Welcome, <span className='font-medium'>
                                    {profileLoading ? '...' : (profileData?.full_name || currentUser.email)}
                                </span>!
                                {profileError && !profileLoading && <span className='text-red-500 text-xs ml-1'>(Profile Error)</span>}
                            </p>

                            {/* Dashboard Navigation (From Working Version) */}
                            <nav className="space-y-2">
                                 <button disabled={authLoading || isSectionLoading} className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors disabled:opacity-50 disabled:pointer-events-none ${activeSection === 'tracking' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`} onClick={() => setActiveSection('tracking')}> <Truck size={18} className="mr-3 flex-shrink-0" /> Order Tracking </button>
                                 <button disabled={authLoading || isSectionLoading} className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors disabled:opacity-50 disabled:pointer-events-none ${activeSection === 'delivery' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`} onClick={() => setActiveSection('delivery')}> <MapPin size={18} className="mr-3 flex-shrink-0" /> Delivery Details </button>
                                 <button disabled={authLoading || isSectionLoading} className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors disabled:opacity-50 disabled:pointer-events-none ${activeSection === 'orders' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`} onClick={() => setActiveSection('orders')}> <ClipboardList size={18} className="mr-3 flex-shrink-0" /> My Orders </button>
                            </nav>

                            {/* Dashboard Content Display (Structure from Working Version, Content from Goal Version) */}
                            <div className="mt-6 p-4 bg-gray-50 rounded-lg min-h-[250px] border border-gray-200 relative">
                                {/* Loading Overlay for Section Content */}
                                {isSectionLoading && (
                                    <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex justify-center items-center rounded-lg z-10">
                                        <Loader2 size={28} className="animate-spin text-orange-500" />
                                        <span className="ml-2 text-gray-600">Loading Details...</span>
                                    </div>
                                )}

                                {/* --- Render Specific Section Content --- */}
                                {!activeSection && (<p className="text-sm text-gray-500 text-center pt-4">Select an option above to view details.</p>)}

                                {/* Order Tracking Content */}
                                {activeSection === 'tracking' && (
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3 text-gray-800 flex items-center"><Truck size={20} className="mr-2 text-orange-600" /> Active Order Tracking</h3>
                                        {trackingError && !trackingLoading && <p className="text-sm text-red-600 flex items-center mb-3 p-2 bg-red-50 border border-red-200 rounded"><AlertCircle size={16} className="mr-1" /> {trackingError}</p>}
                                        {!trackingLoading && !trackingError && activeOrders.length === 0 && <p className="text-sm text-gray-500 italic text-center py-4">No active orders found.</p>}
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

                                {/* Delivery Details Content */}
                                {activeSection === 'delivery' && (
                                     <div>
                                        <h3 className="text-lg font-semibold mb-3 text-gray-800 flex items-center"><MapPin size={20} className="mr-2 text-orange-600" /> Delivery Details</h3>
                                        {/* Display Errors First */}
                                        {profileError && !profileLoading && <p className="text-sm text-red-600 flex items-center mb-3 p-2 bg-red-50 border border-red-200 rounded"><AlertCircle size={16} className="mr-1" /> Profile: {profileError}</p>}
                                        {deliveryError && !deliveryLoading && <p className="text-sm text-red-600 flex items-center mb-3 p-2 bg-red-50 border border-red-200 rounded"><AlertCircle size={16} className="mr-1" /> Delivery Info: {deliveryError}</p>}

                                        {/* Address Display Area */}
                                        <div className="mb-4 p-3 border border-dashed border-gray-300 rounded-md bg-white">
                                            <h4 className="text-md font-semibold text-gray-700 mb-1">Your Profile Info</h4>
                                            {profileLoading && <p className="text-sm text-gray-500 italic">Loading profile...</p>}
                                            {!profileLoading && profileData && (
                                                <div className='text-sm text-gray-600 space-y-0.5'>
                                                    <p><span className='font-medium'>Name:</span> {profileData.full_name}</p>
                                                    <p><span className='font-medium'>Email:</span> {profileData.email}</p> {/* Assuming email is in profile */}
                                                    <p><span className='font-medium'>Phone:</span> {profileData.phone || 'Not provided'}</p>
                                                    {/* Address fields would go here if they existed in ProfileData and DB */}
                                                    {/* <p>{profileData.address_line1}</p> ... etc */}
                                                    <p className="text-xs text-gray-500 italic mt-1"> (Address details not implemented in profile yet)</p>
                                                    <button className="text-xs text-orange-600 hover:underline mt-2">Edit Profile</button>
                                                </div>
                                            )}
                                            {!profileLoading && !profileError && !profileData && (
                                                 <p className="text-sm text-gray-500 italic">Could not load profile data.</p>
                                            )}
                                        </div>

                                         {/* Active Delivery Driver Info Area */}
                                         <h4 className="text-md font-semibold text-gray-700 mb-1 mt-4">Active Delivery</h4>
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
                                        {!deliveryLoading && !deliveryError && !activeDeliveryInfo && (
                                            <p className="text-sm text-gray-500 italic text-center py-3">No orders currently out for delivery.</p>
                                        )}
                                        {!deliveryLoading && !deliveryError && activeDeliveryInfo && !activeDeliveryInfo.delivery_personnel && (
                                            <p className="text-sm text-orange-700 italic text-center py-3">Delivery assigned, but driver details unavailable.</p>
                                        )}
                                    </div>
                                )}

                                {/* My Orders Content (History) */}
                                {activeSection === 'orders' && (
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3 text-gray-800 flex items-center"><ClipboardList size={20} className="mr-2 text-orange-600" /> Order History</h3>
                                        {ordersError && !ordersLoading && <p className="text-sm text-red-600 flex items-center mb-3 p-2 bg-red-50 border border-red-200 rounded"><AlertCircle size={16} className="mr-1" /> {ordersError}</p>}
                                        {!ordersLoading && !ordersError && pastOrders.length === 0 && <p className="text-sm text-gray-500 italic text-center py-4">No past orders found.</p>}
                                        {!ordersLoading && !ordersError && pastOrders.length > 0 && (
                                            <ul className="space-y-4">
                                                {pastOrders.map(order => (
                                                    <li key={order.id} className="p-3 border border-gray-200 rounded-md bg-white shadow-sm opacity-90 hover:opacity-100 transition-opacity">
                                                        <div className="flex justify-between items-start mb-1">
                                                             <p className="text-sm font-medium text-gray-900">Order #{order.order_number || order.id}</p>
                                                             <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>{order.status}</span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 mb-1">Placed: {formatDateTime(order.created_at)}</p>
                                                        {order.status === 'Delivered' && order.delivered_at && <p className="text-xs text-green-600">Delivered: {formatDateTime(order.delivered_at)}</p>}
                                                        <p className="text-sm text-gray-800 font-medium mt-1">Total: {formatCurrency(order.total_amount)}</p>
                                                        <button className="text-xs text-orange-600 hover:underline mt-1">View Details / Reorder</button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </div> {/* End Dashboard Content Display */}

                            {/* Logout Button (From Working Version) */}
                            <button
                                onClick={handleLogout}
                                disabled={authLoading} // Disable only during auth actions
                                className="flex items-center justify-center w-full px-4 py-2 mt-6 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {authLoading ? <Loader2 size={18} className="mr-2 animate-spin" /> : <LogOut size={18} className="mr-2" />}
                                {authLoading ? 'Logging out...' : 'Logout'}
                            </button>
                        </div>
                    ) : (
                        // --- Logged Out View (Login OR Signup Form - From Working Version) ---
                        !authLoading && !currentUser && (
                            <form onSubmit={handleAuth} className="space-y-4">
                                {/* Signup Fields */}
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
                                            <p className="text-xs text-gray-500 mt-1">12 digits. <span className='font-semibold text-orange-700'>Handled securely (Review RLS/Encryption).</span></p>
                                        </div>
                                        <hr className="my-2 border-gray-200" />
                                    </>
                                )}
                                {/* Email Input */}
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input ref={emailInputRef} id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="you@example.com" className={inputClasses(feedback?.type === 'error' && !isSigningUp)} required disabled={authLoading} />
                                </div>
                                {/* Password Input */}
                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                    <input id="password" name="password" type="password" value={formData.password} onChange={handleInputChange} placeholder={isSigningUp ? "Create a password (min. 6 chars)" : "••••••••"} className={inputClasses(feedback?.type === 'error')} required minLength={isSigningUp ? 6 : undefined} disabled={authLoading} />
                                    {!isSigningUp && (
                                        <div className="text-right mt-1">
                                            <button type="button" className="text-sm text-orange-600 hover:underline focus:outline-none" onClick={() => setFeedback({ type: 'info', text: 'Password reset functionality not implemented yet.' })}>
                                                Forgot password?
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {/* Submit Button */}
                                <button type="submit" disabled={authLoading} className="w-full bg-orange-600 text-white py-2.5 px-4 rounded-lg font-semibold hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors disabled:opacity-70 flex items-center justify-center">
                                    {authLoading && <Loader2 size={20} className="mr-2 animate-spin" />}
                                    {!authLoading && isSigningUp && <UserPlus size={18} className="mr-2" />}
                                    {authLoading ? 'Processing...' : (isSigningUp ? 'Sign Up' : 'Log In')}
                                </button>
                            </form>
                        )
                    )}
                </div> {/* End Main Content Area */}

                {/* --- Footer / Toggle Auth Mode (From Working Version) --- */}
                {!authLoading && !currentUser && (
                    <div className="p-4 border-t border-gray-200 text-center flex-shrink-0">
                        <button onClick={toggleAuthMode} disabled={authLoading} className="text-sm text-orange-600 hover:underline focus:outline-none disabled:opacity-50">
                            {isSigningUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
                        </button>
                    </div>
                )}
                <div className="flex-shrink-0 h-4 bg-white"></div> {/* Bottom padding */}
            </div> {/* End Sidebar Panel */}
        </>
    );
};

export default Sidebar;