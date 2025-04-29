// src/components/Sidebar.tsx
import React, { useState, useEffect, useRef } from 'react';
// Added Package, ListOrdered to the existing imports
import { X, Truck, MapPin, LogOut, ClipboardList, Loader2, AlertCircle, UserPlus, Package, ListOrdered } from 'lucide-react';
import { supabase } from '../supabase'; // Ensure this path is correct
import { User, AuthError } from '@supabase/supabase-js';

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
    aadhar_number: string;
}

// --- NEW: Booking Data Type --- START
// Match this with your 'bookings' table columns you need
interface Booking {
    id: number; // Or string if you use UUIDs for your booking IDs
    created_at: string;
    name: string;
    phone: string;
    pickup_address: string;
    pickup_location_type: string;
    drop_address: string;
    drop_location_type: string;
    booking_status: string; // e.g., 'Pending', 'Confirmed', 'In Transit', 'Delivered', 'Cancelled'
    train_number?: string | null;
    pnr_number?: string | null;
    // Add any other fields from your 'bookings' table you want to display
    user_id?: string; // Ensure user_id is part of the type if you fetch it or need it
}
// --- NEW: Booking Data Type --- END


const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  // --- State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // Keep existing formData state
  const [formData, setFormData] = useState<FormData>({
      email: '',
      password: '',
      full_name: '',
      phone: '',
      date_of_birth: '',
      aadhar_number: '',
  });
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // Overall loading (auth primarily)
  const [isSigningUp, setIsSigningUp] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string>(''); // Initially empty
  const emailInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null); // Ref for name input

  // --- NEW: State for Bookings --- START
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [latestBooking, setLatestBooking] = useState<Booking | null>(null); // For quick access in some sections
  const [isLoadingBookings, setIsLoadingBookings] = useState<boolean>(false);
  const [fetchBookingsError, setFetchBookingsError] = useState<string | null>(null);
  // Store the ID of the booking selected for detailed view (optional enhancement)
  // const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  // --- NEW: State for Bookings --- END


    // --- Listener for Auth State Changes (Supabase) ---
    useEffect(() => {
      setLoading(true);
      // --- Initial session check (good practice) --- START
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error) console.error("Error getting initial session:", error.message);
        const initialUser = session?.user ?? null;
        setCurrentUser(initialUser); // Set initial user state

        if (!initialUser) {
           resetAuthState(false); // Reset if no user initially
           setLoading(false); // Indicate auth check done (no user)
        } else {
            // User exists initially
            console.log("Initial session found for user:", initialUser.id);
            // --- Set default section on initial load if logged in ---
            setActiveSection('orders'); // <<< SET DEFAULT SECTION FOR INITIAL LOAD
            fetchUserBookings(initialUser.id); // Fetch bookings for existing session
            // setLoading will be set to false by the listener firing for INITIAL_SESSION/SIGNED_IN
            // or potentially in the fetchUserBookings finally block if needed, but listener is safer.
        }
        // setLoading(false); // Let the listener handle setting loading false after potential async ops
      });
      // --- Initial session check --- END

      const { data: authListener } = supabase.auth.onAuthStateChange(
        (event, session) => {
          const user = session?.user ?? null;
          const previousUserId = currentUser?.id; // Capture previous user ID *before* updating currentUser
          setCurrentUser(user); // Update user state

          // Set loading to false once the listener confirms the auth state
          // (covers initial load SIGNED_IN/INITIAL_SESSION and subsequent changes)
          setLoading(false);

          console.log('Auth Event:', event, 'User:', user?.id, 'Previous User ID:', previousUserId); // Debug log

          if (event === 'SIGNED_OUT' || !user) {
            console.log('Auth Event: SIGNED_OUT or user is null. Resetting state.');
            resetAuthState(); // This now also clears booking state and activeSection
          } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
              // Combine events where user data might be present/updated
              // Note: INITIAL_SESSION often implies SIGNED_IN logic is needed
               console.log(`Auth Event: ${event}. Handling user presence.`);
               setFeedback(null); // Clear feedback on successful sign-in/session update
               // Clear form data explicitly only if it was a *new* sign-in, not just session refresh
               // A bit tricky - let's clear it if previousUserId was null (true new login)
               if (!previousUserId && user) {
                   console.log("Clearing form data as it looks like a fresh login.");
                   setFormData({ email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' });
               }
               setIsSigningUp(false); // Ensure we are in login mode view

               // --- Fetch bookings and set default section ---
               // Check if the user ID actually changed OR if the user just appeared (was null before)
               if (user && user.id !== previousUserId) {
                   console.log(`User signed in or changed (${previousUserId} -> ${user.id}). Setting default section and fetching bookings...`);
                   // --- MODIFICATION: Set default section ---
                   setActiveSection('orders'); // <<< SET DEFAULT SECTION HERE
                   fetchUserBookings(user.id); // Initiate the booking fetch
               } else if (user && previousUserId && user.id === previousUserId && event === 'USER_UPDATED') {
                  // Handle USER_UPDATED event specifically if needed (e.g., refresh data but maybe keep section?)
                  console.log(`User data updated for ${user.id}. Re-fetching bookings.`);
                  // Optionally, decide if you want to reset the section or keep the current one
                  // setActiveSection('orders'); // Reset to orders?
                  fetchUserBookings(user.id); // Re-fetch bookings
               } else if (user && previousUserId && user.id === previousUserId) {
                   // User didn't change (e.g., token refresh, listener fired again)
                   // We probably already fetched bookings and set the section.
                   // Only set default section if it somehow got cleared but user is still logged in.
                   console.log(`Auth listener fired for same user (${user.id}), event: ${event}. Ensuring default section if needed.`);
                   if (!activeSection) {
                       console.log("Active section was empty for logged-in user, setting default.");
                       setActiveSection('orders');
                       // Fetch bookings again only if they are missing?
                       if (userBookings.length === 0 && !isLoadingBookings) {
                           console.log("No bookings loaded for existing user, attempting fetch.");
                           fetchUserBookings(user.id);
                       }
                   }
               }
          }
          // Handle other events like PASSWORD_RECOVERY if needed
        }
      );

      return () => {
        console.log("Unsubscribing auth listener.");
        authListener?.subscription.unsubscribe();
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array is correct for onAuthStateChange setup

    // Helper to reset state (now resets formData AND booking state)
    const resetAuthState = (clearFeedback = true) => {
        console.log("Resetting Auth State. Clearing activeSection, form data, and booking data."); // Debug log
        setActiveSection(''); // Clear the active section
        // Reset the comprehensive formData state
        setFormData({ email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' });
        if (clearFeedback) setFeedback(null);
        setIsSigningUp(false); // Default to login mode
        // --- Also clear booking data on reset --- START
        setUserBookings([]);
        setLatestBooking(null);
        setFetchBookingsError(null);
        setIsLoadingBookings(false); // Ensure booking loading state is reset
        // --- Also clear booking data on reset --- END
    }

  // --- Body Scroll Lock ---
  useEffect(() => {
    // --- Keep existing scroll lock logic --- START
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
    // --- Keep existing scroll lock logic --- END
  }, [isOpen]);

   // --- Input Change Handler (Updates formData) ---
   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // --- Keep existing input change logic --- START
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // --- Keep existing input change logic --- END
   };


  // --- Map Supabase Errors ---
   const getFriendlyErrorMessage = (error: AuthError | Error | any): { type: 'error' | 'info', text: string } => {
       // --- Keep existing error mapping logic --- START
       let message = "An unexpected error occurred. Please try again.";
       let type: 'error' | 'info' = 'error';
       if (!error) return { type, text: message };
       const errorMessage = error.message || '';
       console.error('Supabase Auth/DB Error:', errorMessage); // Log raw error

       if (errorMessage.includes('Invalid login credentials')) {
            if (!isSigningUp) { // Only switch if currently trying to log in
                message = "Account not found. Please complete the form below to sign up.";
                type = 'info';
                setIsSigningUp(true); // <<< Switch to signup mode
                 // Keep email, clear password, focus name field
                setFormData(prev => ({ ...prev, password: '' }));
                setTimeout(() => nameInputRef.current?.focus(), 100);
            } else {
                 // This case might not be reached if signup uses different logic, but keep for safety
                 message = 'Invalid details provided during signup.';
                 type = 'error';
            }
       } else if (errorMessage.includes('User already registered') || errorMessage.includes('already exists')) {
            message = "This email is already registered. Please log in.";
            type = 'info';
            setIsSigningUp(false); // Switch back to login mode
            setFormData(prev => ({ ...prev, password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: ''})); // Clear signup fields
            setTimeout(() => emailInputRef.current?.focus(), 100); // Focus email for login
       } else if (errorMessage.includes('Password should be at least 6 characters')) {
            message = 'Password must be at least 6 characters long.';
            type = 'error';
       } else if (errorMessage.includes('Unable to validate email address: invalid format')) {
            message = 'Please enter a valid email address.';
            type = 'error';
       } else if (errorMessage.includes('Email rate limit exceeded') || errorMessage.includes('too many requests')) {
            message = 'Too many attempts. Please try again later.';
            type = 'error';
       } else if (errorMessage.includes('check constraint') && errorMessage.includes('phone')) {
             message = 'Invalid phone number format provided.'; // Example for profile errors
             type = 'error';
       } else if (errorMessage.includes('profiles_pkey') || errorMessage.includes('duplicate key')) {
             // This might happen if the profile insert runs unexpectedly twice
             message = 'Profile data already exists or could not be saved.';
             type = 'error';
       }
       // Add more specific profile error mappings if needed
       else {
            message = errorMessage; // Default to Supabase message
            type = 'error'; // Assume other errors are actual errors
       }
       return { type, text: message };
       // --- Keep existing error mapping logic --- END
   };

  // --- Authentication Handler (Supabase) ---
  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
      // --- Keep existing authentication logic --- START
      e.preventDefault();
      setFeedback(null);
      setLoading(true);
      const currentFormData = { ...formData }; // Capture current state for use after async ops

      try {
        if (isSigningUp) {
          // --- Sign Up ---
          // Basic Client-Side Validation (Example)
          if (!currentFormData.full_name) throw new Error("Full name is required for signup.");
          if (currentFormData.password.length < 6) throw new Error("Password must be at least 6 characters.");
          // Add more validations as needed (phone, dob, aadhar format) before hitting Supabase

          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: currentFormData.email,
            password: currentFormData.password,
          });

          console.log('Supabase signUp response:', signUpData);
          if (signUpError) throw signUpError; // Throw auth errors to be handled by catch block

          // Check if user object exists (it should if no error)
          if (!signUpData.user) {
              throw new Error("Signup seemed successful but user data is missing.");
          }

          console.log('Auth signup successful for:', signUpData.user.email);

          // --- Insert Profile Data after successful signup ---
          try {
              console.log('Attempting to insert profile for user:', signUpData.user.id);
              // *** WARNING: Storing Aadhar number plaintext here. Implement encryption! ***
              const { error: profileError } = await supabase
                  .from('profiles') // <<<--- YOUR SUPABASE TABLE NAME HERE
                  .insert({
                      id: signUpData.user.id, // Link to the auth user
                      email: signUpData.user.email, // Optional: store email in profile too
                      full_name: currentFormData.full_name,
                      phone: currentFormData.phone || null, // Store null if empty string
                      date_of_birth: currentFormData.date_of_birth || null, // Store null if empty
                      aadhar_number: currentFormData.aadhar_number || null, // *** ENCRYPT THIS VALUE *** Store null if empty
                      created_at: new Date().toISOString(), // Add created_at timestamp
                      updated_at: new Date().toISOString(), // Add updated_at timestamp
                  });

              if (profileError) {
                  // Log the profile error but let the user know signup part worked
                  console.error('Error creating Supabase profile after signup:', profileError.message);
                  // Decide how to handle this: inform user profile failed?
                   // For now, proceed but maybe show a non-blocking warning later?
                   setFeedback({ type: 'info', text: `Account created for ${signUpData.user.email}, but profile details couldn't be saved. You can update them later.`});
              } else {
                  console.log('Supabase profile created successfully.');
              }
          } catch (profileInsertError: any) {
              // Catch unexpected errors during profile insert
              console.error('Exception during profile creation:', profileInsertError.message);
               setFeedback({ type: 'info', text: `Account created for ${signUpData.user.email}, but profile details couldn't be saved due to an error.`});
          }


          // Check if email verification is needed (session is null)
          if (!signUpData.session) {
              // Don't override profile error feedback if it happened
              if (!feedback) { // Only set this if no profile error occurred
                   setFeedback({ type: 'success', text: 'Account created! Check your email (including spam) for a confirmation link to log in.' });
              }
               setIsSigningUp(false); // Switch back to login view
               // Clear sensitive fields, keep email
               setFormData(prev => ({ ...prev, password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' }));
               setLoading(false); // Stop loading here as auth listener won't fire yet
          } else {
               // User is signed up AND logged in (auto-confirmation or verification disabled)
               // Auth listener `onAuthStateChange` (SIGNED_IN) will handle UI update and state reset.
               // Feedback might be briefly shown then cleared by listener.
                if (!feedback) { // Only set this if no profile error occurred
                    setFeedback({ type: 'success', text: 'Account created successfully!' });
                }
               // setLoading(false) will be handled by the auth listener
          }

        } else {
          // --- Log In ---
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: currentFormData.email,
            password: currentFormData.password,
          });

          console.log('Supabase signIn response:', signInData);
          if (signInError) throw signInError; // Let catch block handle login errors

          console.log('Logged in:', signInData.user?.email);
          // setLoading(false) and state reset handled by auth listener for SIGNED_IN
        }

      } catch (error: any) {
        // Catch errors from signInWithPassword, signUp, or manually thrown errors
        const feedbackMessage = getFriendlyErrorMessage(error); // This might switch mode to signup
        setFeedback(feedbackMessage);
        setLoading(false); // Stop loading on error
        // Focus email field only if it was a login error and we didn't switch to signup
        if (!isSigningUp && emailInputRef.current && feedbackMessage.type === 'error') {
            emailInputRef.current.focus();
            emailInputRef.current.select();
        }
         // If it was a signup error related to name (or another signup field)
        if (isSigningUp && nameInputRef.current && error.message?.includes('name')) {
             nameInputRef.current.focus();
        }
      }
      // No finally block needed as loading is handled in success/error/listener paths
      // --- Keep existing authentication logic --- END
  };

  // --- Logout Handler (Supabase) ---
  const handleLogout = async () => {
    // --- Keep existing logout logic --- START
    setLoading(true);
    setFeedback(null);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout Error:', error.message);
      setFeedback({ type: 'error', text: "Failed to log out. Please try again." });
      setLoading(false);
    }
    // setLoading(false) and state reset handled by auth listener for SIGNED_OUT
    // --- Keep existing logout logic --- END
  };

  // --- Toggle Signup/Login View ---
  const toggleAuthMode = () => {
    // --- Keep existing toggle logic --- START
    const enteringSignupMode = !isSigningUp;
    setIsSigningUp(enteringSignupMode);
    // Reset form data but keep email if user already typed it
    setFormData(prev => ({
        email: prev.email, // Keep email
        password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' // Clear others
    }));
    setFeedback(null); // Clear feedback on mode toggle
    // Focus appropriate field after mode switch
    setTimeout(() => {
        if (enteringSignupMode && nameInputRef.current) {
            nameInputRef.current.focus();
        } else if (!enteringSignupMode && emailInputRef.current) {
            emailInputRef.current.focus();
        }
    }, 100);
    // --- Keep existing toggle logic --- END
  }

  // --- Reusable Input Field Classes ---
  const inputClasses = (hasError: boolean = false) =>
    // --- Keep existing input classes --- START
    `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
      hasError ? 'border-red-500 ring-red-500' : 'border-gray-300'
    } disabled:bg-gray-100 disabled:cursor-not-allowed`;
    // --- Keep existing input classes --- END

  // --- NEW: Function to Fetch User Bookings --- START
  const fetchUserBookings = async (userId: string) => {
      if (!userId) return; // Don't fetch if no user ID

      setIsLoadingBookings(true);
      setFetchBookingsError(null);
      // Don't clear existing bookings immediately, maybe show stale data while loading?
      // setUserBookings([]);
      // setLatestBooking(null);

      try {
          console.log(`Fetching bookings for user: ${userId}`);
          const { data, error } = await supabase
              .from('bookings') // Make sure 'bookings' is your table name
              .select(`
                  id,
                  created_at,
                  name,
                  phone,
                  pickup_address,
                  pickup_location_type,
                  drop_address,
                  drop_location_type,
                  booking_status,
                  train_number,
                  pnr_number,
                  user_id
              `) // Select only the columns you need
              .eq('user_id', userId)
              .order('created_at', { ascending: false }); // Get the most recent first

          if (error) {
              console.error("Supabase fetch bookings error:", error);
              // Check if the error is due to RLS or other access issues
              if (error.message.includes("security rules") || error.message.includes("policy")) {
                   throw new Error("You don't have permission to view bookings. Check RLS policies.");
              }
              throw new Error(error.message || "Database query failed");
          }

          console.log("Fetched bookings data:", data);

          if (data) { // Check if data is not null/undefined
              // Assuming the data structure matches the Booking interface
              const fetchedBookings = data as Booking[];
              setUserBookings(fetchedBookings); // Update with new data

              if (fetchedBookings.length > 0) {
                  setLatestBooking(fetchedBookings[0]); // The first one is the latest
              } else {
                  setLatestBooking(null); // No bookings found
                  console.log("No bookings found for this user.");
              }
          } else {
                // Handle case where data is null (less common but possible)
                setUserBookings([]);
                setLatestBooking(null);
                console.log("No bookings data returned (data is null).");
          }

      } catch (err: any) {
          console.error("Error in fetchUserBookings:", err);
          setFetchBookingsError("Couldn't load your booking history. Please try again later.");
          // Clear data on error
          setUserBookings([]);
          setLatestBooking(null);
      } finally {
          setIsLoadingBookings(false);
      }
  };
  // --- NEW: Function to Fetch User Bookings --- END


  // --- NEW: Helper function for Status Color (Optional) --- START
  const getStatusColor = (status: string): string => {
    status = status?.toLowerCase() || '';
    switch (status) {
        case 'pending': return 'text-yellow-600 bg-yellow-100';
        case 'confirmed': return 'text-blue-600 bg-blue-100';
        case 'in transit': return 'text-purple-600 bg-purple-100'; // Added generic 'in transit'
        case 'out for delivery': return 'text-purple-600 bg-purple-100'; // Example status
        case 'delivered': return 'text-green-600 bg-green-100';
        case 'cancelled': return 'text-red-600 bg-red-100';
        default: return 'text-gray-600 bg-gray-100'; // Default for unknown or null status
    }
  };
  // --- NEW: Helper function for Status Color (Optional) --- END

  // --- Render Logic (JSX) ---
  return (
    <>
      {/* --- Overlay --- */}
      <div
        // --- Keep existing overlay --- START
        onClick={loading ? undefined : onClose}
        className={`fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm transition-opacity duration-300 z-40 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        aria-hidden={!isOpen}
        // --- Keep existing overlay --- END
      />

      {/* --- Sidebar Panel --- */}
      <div
        // --- Keep existing sidebar panel --- START
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog" aria-modal="true" aria-labelledby="sidebar-title"
        // --- Keep existing sidebar panel --- END
      >
        {/* --- Header --- */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
           {/* --- Keep existing header --- START */}
          <h2 id="sidebar-title" className="text-xl font-semibold text-gray-800">
            {loading && !currentUser ? 'Loading...' : (currentUser ? 'My Account' : (isSigningUp ? 'Create Account' : 'Log In'))}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-500 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors"
            aria-label="Close sidebar"
            disabled={loading && !currentUser} // Prevent closing during critical loading
          >
            <X size={24} />
          </button>
           {/* --- Keep existing header --- END */}
        </div>

        {/* --- Main Content Area (Scrollable) --- */}
        <div className="flex-grow p-6 overflow-y-auto">

          {/* --- Feedback Display Area --- */}
          {feedback && (
            // --- Keep existing feedback display --- START
             <div className={`mb-4 p-3 border rounded-md text-sm flex items-start ${
                 feedback.type === 'error' ? 'bg-red-50 border-red-300 text-red-800' :
                 feedback.type === 'success' ? 'bg-green-50 border-green-300 text-green-800' :
                 'bg-blue-50 border-blue-300 text-blue-800'
             }`}>
                 <AlertCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" /> {/* Using AlertCircle for all for simplicity */}
                 <span>{feedback.text}</span>
             </div>
             // --- Keep existing feedback display --- END
           )}

          {/* --- Loading Indicator (Initial Load/Auth) --- */}
          {/* Show loader if loading AND not logged in AND not showing feedback */}
          {loading && !currentUser && !feedback && (
            // --- Keep existing initial loader --- START
            <div className="flex justify-center items-center py-10">
                 <Loader2 size={32} className="animate-spin text-orange-600" />
            </div>
            // --- Keep existing initial loader --- END
          )}

          {/* --- Logged In View --- */}
          {/* Keep existing check: !loading && currentUser */}
          {!loading && currentUser ? (
            <div className="space-y-6">
              {/* Welcome Message - Keep existing */}
              <p className="text-gray-600 truncate">Welcome, <span className='font-medium'>{currentUser.email}</span>!</p>

              {/* Dashboard Navigation - MODIFIED */}
              <nav className="space-y-2">
                 {/* NEW: Order is changed and uses updated icons */}
                 <button className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors ${activeSection === 'orders' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`} onClick={() => setActiveSection('orders')}> <ListOrdered size={18} className="mr-3 flex-shrink-0" /> My Orders </button>
                 <button className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors ${activeSection === 'tracking' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`} onClick={() => setActiveSection('tracking')}> <Truck size={18} className="mr-3 flex-shrink-0" /> Order Tracking </button>
                 <button className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors ${activeSection === 'delivery' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`} onClick={() => setActiveSection('delivery')}> <MapPin size={18} className="mr-3 flex-shrink-0" /> Delivery Details </button>
              </nav>

              {/* Dashboard Content Display - REPLACED with new logic */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg min-h-[150px]"> {/* Increased min-height slightly */}
                  {/* --- NEW: Loading/Error/No Data States for Bookings --- START */}
                  {isLoadingBookings && (
                    <div className="flex justify-center items-center py-10 text-gray-600">
                         <Loader2 size={24} className="animate-spin text-orange-600 mr-2" /> Loading bookings...
                    </div>
                  )}
                  {fetchBookingsError && !isLoadingBookings && (
                    <div className="text-center py-6 text-red-600">
                        <AlertCircle className="mx-auto mb-2" size={30} />
                        <p className="text-sm">{fetchBookingsError}</p>
                        <button
                            // Pass currentUser.id safely, only enabled when currentUser exists
                            onClick={() => currentUser && fetchUserBookings(currentUser.id)}
                            disabled={!currentUser || isLoadingBookings} // Disable if no user or already loading
                            className="mt-3 px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded hover:bg-orange-200 disabled:opacity-50"
                        >
                            Retry
                        </button>
                    </div>
                  )}
                  {/* Show "No bookings" only if not loading, no error, and array is empty */}
                  {!isLoadingBookings && !fetchBookingsError && userBookings.length === 0 && (
                    <div className="text-center py-10 text-gray-500">
                       <Package size={30} className="mx-auto mb-2" /> {/* Package icon */}
                        <p>You haven't placed any bookings yet.</p>
                        {/* Optional: Add a button to navigate to the booking page */}
                        {/* <button onClick={() => { navigate('/book'); onClose(); }} className="mt-3 text-sm text-orange-600 hover:underline">Book Now</button> */}
                    </div>
                  )}
                  {/* --- NEW: Loading/Error/No Data States for Bookings --- END */}

                  {/* --- NEW: Display Content based on Active Section if data is loaded --- START */}
                  {/* Only attempt to render sections if NOT loading, NO error, AND there ARE bookings */}
                  {!isLoadingBookings && !fetchBookingsError && userBookings.length > 0 && (
                    <>
                        {/* --- My Orders Section --- */}
                        {activeSection === 'orders' && (
                            <div>
                                <h3 className="text-lg font-semibold mb-3 text-gray-800 border-b border-gray-200 pb-1">My Orders</h3>
                                <ul className="space-y-3 max-h-[400px] overflow-y-auto pr-1"> {/* Limit height & allow scroll */}
                                    {userBookings.map((booking) => (
                                        <li key={booking.id} className="p-3 border rounded-md bg-white shadow-sm text-sm transition-shadow hover:shadow-md">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-medium text-gray-700">Booking #{booking.id}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(booking.booking_status)}`}>
                                                    {booking.booking_status || 'Unknown'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mb-1">
                                                Booked: {new Date(booking.created_at).toLocaleString()}
                                            </p>
                                            <p className="text-xs text-gray-600 truncate" title={`${booking.pickup_address} (${booking.pickup_location_type})`}>
                                                <span className="font-medium">From:</span> {booking.pickup_address} ({booking.pickup_location_type})
                                            </p>
                                            <p className="text-xs text-gray-600 truncate" title={`${booking.drop_address} (${booking.drop_location_type})`}>
                                                <span className="font-medium">To:</span> {booking.drop_address} ({booking.drop_location_type})
                                            </p>
                                            {/* Optional: Add a button here if needed, e.g., View Details
                                            <button className="text-xs text-orange-600 hover:underline mt-1">View Details</button>
                                            */}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* --- Order Tracking Section --- */}
                        {activeSection === 'tracking' && (
                            <div>
                                <h3 className="text-lg font-semibold mb-3 text-gray-800 border-b border-gray-200 pb-1">Order Tracking</h3>
                                {/* Using latestBooking for simplicity */}
                                {latestBooking ? (
                                    <div className="space-y-2 text-sm">
                                        <p>Tracking latest booking: <strong className='text-gray-700'>#{latestBooking.id}</strong></p>
                                        <div className="flex items-center">
                                            <span className="font-medium mr-2">Current Status: </span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(latestBooking.booking_status)}`}>
                                                {latestBooking.booking_status || 'Unknown'}
                                            </span>
                                        </div>
                                        <p><span className="font-medium">Booked On:</span> {new Date(latestBooking.created_at).toLocaleDateString()}</p>
                                        <p><span className="font-medium">Pickup:</span> {latestBooking.pickup_address}</p>
                                        <p><span className="font-medium">Drop-off:</span> {latestBooking.drop_address}</p>
                                        {/* Add more specific tracking steps if your backend provides them */}
                                        <p className="mt-4 text-xs text-gray-500">Tracking details are based on the latest updates received.</p>

                                        {/* --- START: Mini Map Integration --- */}
                                        <div className="mt-4 pt-3 border-t border-gray-200">
                                            <h4 className="text-sm font-medium mb-2 text-gray-700">Route Overview</h4>
                                            {/* Replace with your preferred map embed method. This uses Google Maps Embed API */}
                                            {/* Ensure the locations in the 'src' URL are correct (Visakhapatnam & Hyderabad) */}
                                            <iframe
                                                title="Visakhapatnam to Hyderabad Map"
                                                className="w-full h-48 border-0 rounded-lg shadow-sm" // Adjusted height and added shadow
                                                loading="lazy"
                                                allowFullScreen
                                                referrerPolicy="no-referrer-when-downgrade"
                                                src="https://www.google.com/maps/embed?pb=!1m28!1m12!1m3!1d7780448.910832964!2d78.09693635583463!3d17.52679556328318!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!4m13!3e6!4m5!1s0x3a39431389e6973f%3A0x92d9c20395498468!2sVisakhapatnam%2C%20Andhra%20Pradesh!3m2!1d17.6868159!2d83.2184815!4m5!1s0x3bcb99daeaebd2c7%3A0xae93b78392bafbc2!2sHyderabad%2C%20Telangana!3m2!1d17.385044!2d78.486671!5e0!3m2!1sen!2sin!4v1699123456789" // Example embed URL - replace if needed
                                            ></iframe>
                                             <p className="mt-1 text-xs text-gray-500 text-center">Visakhapatnam to Hyderabad.</p>
                                        </div>
                                        {/* --- END: Mini Map Integration --- */}

                                    </div>
                                ) : (
                                    // This case should theoretically not be reached if userBookings.length > 0, but included for safety
                                    <p className="text-sm text-gray-500 text-center pt-5">Could not load details for the latest booking.</p>
                                )}
                            </div>
                        )}

                         {/* --- Delivery Details Section --- */}
                         {activeSection === 'delivery' && (
                             <div>
                                <h3 className="text-lg font-semibold mb-3 text-gray-800 border-b border-gray-200 pb-1">Delivery Details</h3>
                                 {/* Using latestBooking for simplicity */}
                                {latestBooking ? (
                                    <div className="space-y-2 text-sm">
                                       <p>Showing details for latest booking: <strong className='text-gray-700'>#{latestBooking.id}</strong></p>
                                        <p><span className="font-medium">Recipient Name:</span> {latestBooking.name}</p>
                                        <p><span className="font-medium">Recipient Phone:</span> {latestBooking.phone}</p>
                                        <p><span className="font-medium">Drop-off Type:</span> {latestBooking.drop_location_type}</p>
                                        <p><span className="font-medium">Drop-off Address:</span> {latestBooking.drop_address}</p>
                                         {/* Optionally add PNR/Train if relevant and exist */}
                                        {latestBooking.pnr_number && <p><span className="font-medium">PNR:</span> {latestBooking.pnr_number}</p>}
                                        {latestBooking.train_number && <p><span className="font-medium">Train No:</span> {latestBooking.train_number}</p>}
                                    </div>
                                ) : (
                                     // This case should theoretically not be reached if userBookings.length > 0, but included for safety
                                    <p className="text-sm text-gray-500 text-center pt-5">Could not load delivery details for the latest booking.</p>
                                )}
                            </div>
                        )}

                        {/* --- Message when no section is selected --- */}
                        {/* Show this only if NOT loading, NO error, there ARE bookings, but NO section is active */}
                         {!activeSection && (
                             <p className="text-sm text-gray-500 text-center pt-10">Select an option from the navigation above to view details.</p>
                         )}
                    </>
                   )}
                    {/* --- NEW: Display Content based on Active Section if data is loaded --- END */}
              </div>

              {/* Logout Button - Keep existing structure, ensure disabled state considers general loading */}
              <button
                onClick={handleLogout}
                // Disable if general loading (auth) OR booking loading is happening
                disabled={loading || isLoadingBookings}
                className="flex items-center justify-center w-full px-4 py-2 mt-6 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" // Added disabled cursor
               >
                 {/* Show loader if general loading is true OR booking loading is true */}
                  {(loading || isLoadingBookings) ? <Loader2 size={18} className="mr-2 animate-spin" /> : <LogOut size={18} className="mr-2" />}
                  {(loading || isLoadingBookings) ? 'Processing...' : 'Logout'}
              </button>
            </div>
          ) : (
            // --- Logged Out View (Login OR Signup Form) --- Keep existing structure --- START
             !loading && !currentUser && (
               <form onSubmit={handleAuth} className="space-y-4">

                {/* --- Fields Visible ONLY in Signup Mode --- */}
                {isSigningUp && (
                    <>
                     <div>
                        <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input ref={nameInputRef} id="full_name" name="full_name" type="text" value={formData.full_name} onChange={handleInputChange} placeholder="Your full name" className={inputClasses()} required disabled={loading} />
                    </div>
                     <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number <span className="text-xs text-gray-500">(Optional)</span></label>
                        <input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} placeholder="e.g., 9876543210" className={inputClasses()} disabled={loading} />
                    </div>
                     <div>
                        <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-1">Date of Birth <span className="text-xs text-gray-500">(Optional)</span></label>
                        <input id="date_of_birth" name="date_of_birth" type="date" value={formData.date_of_birth} onChange={handleInputChange} max={new Date().toISOString().split("T")[0]} // Prevent future dates
                           className={inputClasses()} disabled={loading} />
                    </div>
                    <div>
                        <label htmlFor="aadhar_number" className="block text-sm font-medium text-gray-700 mb-1">Aadhar Number </label>
                        <input id="aadhar_number" name="aadhar_number" type="text" inputMode="numeric" pattern="\d{12}" title="Enter 12-digit Aadhar number" value={formData.aadhar_number} onChange={handleInputChange} placeholder="1234 5678 9012" className={inputClasses()} disabled={loading} />
                         <p className="text-xs text-gray-500 mt-1">Enter 12-digit number. <span className='font-semibold'>Handled securely.</span></p> {/* *** Add note about security *** */}
                    </div>
                    <hr className="my-2 border-gray-200"/> {/* Separator */}
                    </>
                )}

                 {/* --- Email Input (Always Visible) --- */}
                 <div>
                   <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                   <input
                      ref={emailInputRef}
                      id="email"
                      name="email" // Add name attribute
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange} // Use unified handler
                      placeholder="you@example.com"
                      className={inputClasses(feedback?.type === 'error')}
                      required
                      disabled={loading}
                    />
                 </div>

                 {/* --- Password Input (Always Visible) --- */}
                 <div>
                   <label htmlFor="password"className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                   <input
                      id="password"
                      name="password" // Add name attribute
                      type="password"
                      value={formData.password}
                      onChange={handleInputChange} // Use unified handler
                      placeholder={isSigningUp ? "Create a password (min. 6 chars)" : "••••••••"}
                      className={inputClasses(feedback?.type === 'error')}
                      required
                      minLength={isSigningUp ? 6 : undefined} // Min length only for signup
                      disabled={loading}
                    />
                    {/* Forgot Password Link (Only in Login Mode) */}
                    {!isSigningUp && (
                        <div className="text-right mt-1">
                          <button type="button" className="text-sm text-orange-600 hover:underline focus:outline-none"
                              onClick={() => setFeedback({type: 'info', text:'Forgot password functionality not implemented yet.'})}>
                            Forgot password?
                          </button>
                        </div>
                      )}
                 </div>

                 {/* --- Submit Button (Text changes based on mode) --- */}
                 <button
                   type="submit"
                   disabled={loading}
                   className="w-full bg-orange-600 text-white py-2.5 px-4 rounded-lg font-semibold hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors disabled:opacity-70 flex items-center justify-center"
                 >
                   {loading && <Loader2 size={20} className="mr-2 animate-spin" />}
                   {/* Add UserPlus icon for signup */}
                   {!loading && isSigningUp && <UserPlus size={18} className="mr-2" />}
                   {loading ? 'Processing...' : (isSigningUp ? 'Sign Up' : 'Log In')}
                 </button>
               </form>
            )
            // --- Logged Out View (Login OR Signup Form) --- Keep existing structure --- END
          )}
        </div> {/* End Main Content Area */}

        {/* --- Footer / Toggle Auth Mode --- Keep existing structure */}
        {/* Show toggle only when logged out and not loading */}
        {!loading && !currentUser && (
           <div className="p-4 border-t border-gray-200 text-center flex-shrink-0">
            <button
              onClick={toggleAuthMode}
              disabled={loading} // Disable if any loading is happening
              className="text-sm text-orange-600 hover:underline focus:outline-none disabled:opacity-50"
            >
              {isSigningUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        )}
         <div className="flex-shrink-0 h-4"></div> {/* Bottom padding */}
      </div> {/* End Sidebar Panel */}
    </>
  );
};

export default Sidebar;