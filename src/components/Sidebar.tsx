// src/components/Sidebar.tsx
import React, { useState, useEffect, useRef } from 'react';
// Added Package, ListOrdered, UserCog, Home to the existing imports
import { X, Truck, MapPin, LogOut, ClipboardList, Loader2, AlertCircle, UserPlus, Package, ListOrdered, UserCog, Home } from 'lucide-react'; // Added UserCog, Home
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

// --- Login/Signup Form Data Type --- START
interface AuthFormData {
    email: string;
    password: string;
    full_name: string; // Keep for signup
    phone: string; // Keep for signup
    date_of_birth: string; // Keep for signup
    aadhar_number: string; // Keep for signup
}
// --- Login/Signup Form Data Type --- END

// --- NEW: Profile Form Data Type --- START
interface ProfileFormData {
    full_name: string;
    phone: string;
    date_of_birth: string;
    // We won't edit email or aadhar here for simplicity/security
}
// --- NEW: Profile Form Data Type --- END

// --- NEW: Address Form Data Type --- START
interface AddressFormData {
    primary_address: string;
}
// --- NEW: Address Form Data Type --- END


// --- Booking Data Type --- START
// Match this with your 'bookings' table columns you need
interface Booking {
    id: number; // Or string if you use UUIDs for your booking IDs
    created_at: string;
    name: string; // Usually corresponds to profile full_name at time of booking
    phone: string; // Usually corresponds to profile phone at time of booking
    pickup_address: string;
    pickup_location_type: string;
    drop_address: string;
    drop_location_type: string;
    booking_status: string; // e.g., 'Pending', 'Confirmed', 'In Transit', 'Delivered', 'Cancelled'
    train_number?: string | null;
    pnr_number?: string | null;
    user_id?: string; // Ensure user_id is part of the type if you fetch it or need it
}
// --- Booking Data Type --- END


const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  // --- State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // State for Login/Signup form
  const [authFormData, setAuthFormData] = useState<AuthFormData>({
      email: '',
      password: '',
      full_name: '',
      phone: '',
      date_of_birth: '',
      aadhar_number: '',
  });
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null); // General feedback
  const [loading, setLoading] = useState<boolean>(true); // Overall loading (auth primarily)
  const [isSigningUp, setIsSigningUp] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string>(''); // Default empty
  const emailInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null); // Ref for signup name input

  // --- State for Bookings --- START
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [latestBooking, setLatestBooking] = useState<Booking | null>(null); // For quick access in some sections
  const [isLoadingBookings, setIsLoadingBookings] = useState<boolean>(false);
  const [fetchBookingsError, setFetchBookingsError] = useState<string | null>(null);
  // --- State for Bookings --- END

  // --- NEW: State for Profile --- START
  const [profileFormData, setProfileFormData] = useState<ProfileFormData>({
      full_name: '',
      phone: '',
      date_of_birth: '',
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState<boolean>(false);
  const [profileFeedback, setProfileFeedback] = useState<FeedbackMessage | null>(null);
  const [fetchProfileError, setFetchProfileError] = useState<string | null>(null);
  // --- NEW: State for Profile --- END

  // --- NEW: State for Address --- START
   const [addressFormData, setAddressFormData] = useState<AddressFormData>({
       primary_address: '',
   });
   const [isUpdatingAddress, setIsUpdatingAddress] = useState<boolean>(false);
   const [addressFeedback, setAddressFeedback] = useState<FeedbackMessage | null>(null);
   // Note: Profile loading/error state can cover address if fetched together
   const originalAddressRef = useRef<string>(''); // To track if address changed
  // --- NEW: State for Address --- END


    // --- Listener for Auth State Changes (Supabase) ---
    useEffect(() => {
      setLoading(true);
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error) console.error("Error getting initial session:", error.message);
        const initialUser = session?.user ?? null;
        setCurrentUser(initialUser);

        if (!initialUser) {
           resetAuthStateAndData(false); // Reset if no user initially
           setLoading(false);
        } else {
            console.log("Initial session found for user:", initialUser.id);
            setActiveSection('orders'); // Default section
            fetchUserData(initialUser.id); // Fetch bookings AND profile
        }
      });

      const { data: authListener } = supabase.auth.onAuthStateChange(
        (event, session) => {
          const user = session?.user ?? null;
          const previousUserId = currentUser?.id;
          setCurrentUser(user);
          setLoading(false); // Auth state confirmed

          console.log('Auth Event:', event, 'User:', user?.id, 'Previous User ID:', previousUserId);

          if (event === 'SIGNED_OUT' || !user) {
            console.log('Auth Event: SIGNED_OUT or user is null. Resetting state.');
            resetAuthStateAndData();
          } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
               console.log(`Auth Event: ${event}. Handling user presence.`);
               setFeedback(null); // Clear general feedback
               if (!previousUserId && user) { // Fresh login
                   console.log("Clearing auth form data for fresh login.");
                   setAuthFormData({ email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' });
               }
               setIsSigningUp(false);

               // Fetch user data (bookings & profile) if user changed or just appeared
               if (user && user.id !== previousUserId) {
                   console.log(`User signed in or changed (${previousUserId} -> ${user.id}). Setting default section and fetching data...`);
                   setActiveSection('orders'); // Reset to default section
                   fetchUserData(user.id); // Fetch bookings AND profile
               } else if (user && previousUserId && user.id === previousUserId) {
                   // User didn't change, but event fired (e.g., token refresh, USER_UPDATED)
                   console.log(`Auth listener fired for same user (${user.id}), event: ${event}. Ensuring data and section.`);
                   // Ensure default section if none is set
                   if (!activeSection) {
                       console.log("Active section was empty for logged-in user, setting default.");
                       setActiveSection('orders');
                   }
                   // Re-fetch data if it's missing or event suggests update
                   if ((userBookings.length === 0 && !isLoadingBookings) || (profileFormData.full_name === '' && !isLoadingProfile) || event === 'USER_UPDATED') {
                       console.log("Data missing or user updated, re-fetching user data.");
                       fetchUserData(user.id);
                   }
               }
          }
        }
      );

      return () => {
        console.log("Unsubscribing auth listener.");
        authListener?.subscription.unsubscribe();
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Dependencies: currentUser?.id could be added but often causes loops. Be careful. Empty array is standard for auth listeners.

    // Helper to reset ALL state (auth, bookings, profile, address)
    const resetAuthStateAndData = (clearGeneralFeedback = true) => {
        console.log("Resetting ALL State: Auth, Bookings, Profile, Address.");
        setActiveSection('');
        // Reset auth form
        setAuthFormData({ email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' });
        if (clearGeneralFeedback) setFeedback(null);
        setIsSigningUp(false);
        // Reset booking data
        setUserBookings([]);
        setLatestBooking(null);
        setFetchBookingsError(null);
        setIsLoadingBookings(false);
        // Reset profile data
        setProfileFormData({ full_name: '', phone: '', date_of_birth: '' });
        setIsLoadingProfile(false);
        setIsUpdatingProfile(false);
        setProfileFeedback(null);
        setFetchProfileError(null);
        // Reset address data
        setAddressFormData({ primary_address: '' });
        setIsUpdatingAddress(false);
        setAddressFeedback(null);
        originalAddressRef.current = '';
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

   // --- Input Change Handlers ---
   const handleAuthInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setAuthFormData(prev => ({ ...prev, [name]: value }));
   };
   // NEW: Profile Input Change Handler
   const handleProfileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setProfileFormData(prev => ({ ...prev, [name]: value as string })); // Cast as string if needed
        setProfileFeedback(null); // Clear feedback on input change
   };
    // NEW: Address Input Change Handler
    const handleAddressInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { // Allow TextArea
        const { name, value } = e.target;
        setAddressFormData(prev => ({ ...prev, [name]: value }));
        setAddressFeedback(null); // Clear feedback on input change
    };


  // --- Map Supabase Errors ---
   const getFriendlyErrorMessage = (error: AuthError | Error | any): { type: 'error' | 'info', text: string } => {
       let message = "An unexpected error occurred. Please try again.";
       let type: 'error' | 'info' = 'error';
       if (!error) return { type, text: message };
       const errorMessage = error.message || String(error) || ''; // Handle non-Error objects
       console.error('Supabase Auth/DB Error:', error); // Log raw error

        // --- Keep existing auth error mapping --- START
       if (errorMessage.includes('Invalid login credentials')) {
            if (!isSigningUp) { // Only switch if currently trying to log in
                message = "Account not found. Please complete the form below to sign up.";
                type = 'info';
                setIsSigningUp(true);
                setAuthFormData(prev => ({ ...prev, password: '' }));
                setTimeout(() => nameInputRef.current?.focus(), 100);
            } else {
                 message = 'Invalid details provided during signup.';
                 type = 'error';
            }
       } else if (errorMessage.includes('User already registered') || errorMessage.includes('already exists')) {
            message = "This email is already registered. Please log in.";
            type = 'info';
            setIsSigningUp(false);
            setAuthFormData(prev => ({ ...prev, password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: ''}));
            setTimeout(() => emailInputRef.current?.focus(), 100);
       } else if (errorMessage.includes('Password should be at least 6 characters')) {
            message = 'Password must be at least 6 characters long.';
            type = 'error';
       } else if (errorMessage.includes('Unable to validate email address: invalid format')) {
            message = 'Please enter a valid email address.';
            type = 'error';
       } else if (errorMessage.includes('Email rate limit exceeded') || errorMessage.includes('too many requests')) {
            message = 'Too many attempts. Please try again later.';
            type = 'error';
        }
        // --- Keep existing auth error mapping --- END
        // --- Add profile/DB error mapping --- START
        else if (errorMessage.includes('check constraint') && errorMessage.includes('phone')) {
             message = 'Invalid phone number format provided.';
             type = 'error';
       } else if (errorMessage.includes('profiles_pkey') || errorMessage.includes('duplicate key')) {
             message = 'Profile data already exists or could not be saved.';
             type = 'error';
       } else if (errorMessage.includes("security rules") || errorMessage.includes("policy")) {
            message = "Permission denied. You might not have access to view or modify this data.";
            type = 'error';
       } else if (errorMessage.includes('value too long for type character varying')) {
           message = "One of the fields is too long. Please shorten it.";
           type = 'error';
       }
        // Add more specific profile/address error mappings if needed
       else {
            message = errorMessage; // Default to Supabase message if not caught above
            type = 'error'; // Assume other errors are actual errors
       }
       return { type, text: message };
   };

  // --- Authentication Handler (Login/Signup) ---
  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setFeedback(null); // Clear general feedback
      setLoading(true);
      const currentAuthData = { ...authFormData }; // Use captured data

      try {
        if (isSigningUp) {
          // --- Sign Up ---
          if (!currentAuthData.full_name) throw new Error("Full name is required for signup.");
          if (currentAuthData.password.length < 6) throw new Error("Password must be at least 6 characters.");

          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: currentAuthData.email,
            password: currentAuthData.password,
          });
          if (signUpError) throw signUpError;
          if (!signUpData.user) throw new Error("Signup seemed successful but user data is missing.");

          console.log('Auth signup successful for:', signUpData.user.email);

          // --- Insert Profile Data ---
          // Address field is omitted here, user can add it later via the dedicated section
          const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                  id: signUpData.user.id,
                  email: signUpData.user.email,
                  full_name: currentAuthData.full_name,
                  phone: currentAuthData.phone || null,
                  date_of_birth: currentAuthData.date_of_birth || null,
                  aadhar_number: currentAuthData.aadhar_number || null, // *** ENCRYPT THIS VALUE in a real app ***
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  // primary_address: null // Explicitly null initially
              });

          if (profileError) {
              console.error('Error creating Supabase profile after signup:', profileError.message);
              setFeedback({ type: 'info', text: `Account created for ${signUpData.user.email}, but profile details couldn't be saved. You can update them later.` });
          } else {
              console.log('Supabase profile created successfully.');
              // Don't set success feedback here if profile error occurred
              if (!feedback) {
                    setFeedback({ type: 'success', text: 'Account created successfully!' });
              }
          }

          if (!signUpData.session) { // Email verification needed
                if (!feedback) { // Only set this if no profile error occurred
                    setFeedback({ type: 'success', text: 'Account created! Check your email for confirmation.' });
                }
               setIsSigningUp(false);
               setAuthFormData(prev => ({ ...prev, password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' }));
               setLoading(false); // Stop loading, wait for verification
          }
          // If session exists, user is logged in. Auth listener will handle UI update.

        } else {
          // --- Log In ---
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: currentAuthData.email,
            password: currentAuthData.password,
          });
          if (signInError) throw signInError;
          console.log('Logged in:', signInData.user?.email);
          // Auth listener handles UI update and data fetching
        }

      } catch (error: any) {
        const friendlyError = getFriendlyErrorMessage(error); // This might switch mode to signup
        setFeedback(friendlyError); // Set general feedback
        setLoading(false);
        if (!isSigningUp && emailInputRef.current && friendlyError.type === 'error') {
            emailInputRef.current.focus();
            emailInputRef.current.select();
        } else if (isSigningUp && nameInputRef.current && error.message?.includes('name')) {
             nameInputRef.current.focus();
        }
      }
      // setLoading(false) is handled in error case or by auth listener on success
  };

  // --- Logout Handler ---
  const handleLogout = async () => {
    setLoading(true); // Use general loading for logout process
    setFeedback(null);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout Error:', error.message);
      setFeedback({ type: 'error', text: "Failed to log out. Please try again." });
      setLoading(false); // Stop loading on error
    }
    // Auth listener handles state reset (resetAuthStateAndData) on SIGNED_OUT
  };

  // --- Toggle Signup/Login View ---
  const toggleAuthMode = () => {
    const enteringSignupMode = !isSigningUp;
    setIsSigningUp(enteringSignupMode);
    setAuthFormData(prev => ({
        email: prev.email, // Keep email
        password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: ''
    }));
    setFeedback(null);
    setTimeout(() => {
        if (enteringSignupMode && nameInputRef.current) nameInputRef.current.focus();
        else if (!enteringSignupMode && emailInputRef.current) emailInputRef.current.focus();
    }, 100);
  }

  // --- Reusable Input Field Classes ---
  const inputClasses = (hasError: boolean = false) =>
    `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
      hasError ? 'border-red-500 ring-red-500' : 'border-gray-300'
    } disabled:bg-gray-100 disabled:cursor-not-allowed`;

    // --- Fetch User Bookings --- (Keep existing, unchanged)
    const fetchUserBookings = async (userId: string) => {
        if (!userId) return;
        setIsLoadingBookings(true);
        setFetchBookingsError(null);
        try {
            console.log(`Fetching bookings for user: ${userId}`);
            const { data, error } = await supabase
                .from('bookings')
                .select(`
                    id, created_at, name, phone, pickup_address, pickup_location_type,
                    drop_address, drop_location_type, booking_status, train_number, pnr_number
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const fetchedBookings = data as Booking[];
            setUserBookings(fetchedBookings);
            setLatestBooking(fetchedBookings.length > 0 ? fetchedBookings[0] : null);
            if (fetchedBookings.length === 0) console.log("No bookings found.");

        } catch (err: any) {
            console.error("Error fetching bookings:", err);
            const friendlyError = getFriendlyErrorMessage(err);
            setFetchBookingsError(friendlyError.text); // Use friendly message
            setUserBookings([]);
            setLatestBooking(null);
        } finally {
            setIsLoadingBookings(false);
        }
    };

    // --- NEW: Fetch User Profile (including address) ---
    const fetchUserProfile = async (userId: string) => {
        if (!userId) return;
        setIsLoadingProfile(true);
        setFetchProfileError(null);
        setProfileFeedback(null); // Clear previous feedback
        setAddressFeedback(null); // Clear previous feedback

        try {
            console.log(`Fetching profile for user: ${userId}`);
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('full_name, phone, date_of_birth, primary_address') // Select address too
                .eq('id', userId)
                .single(); // Expect only one profile

            if (profileError) {
                // Handle case where profile might not exist yet after signup issues
                if (profileError.code === 'PGRST116') { // "Query returned 0 rows"
                    console.warn("User profile not found for ID:", userId);
                    setFetchProfileError("Profile data not found. Please complete your profile.");
                    // Initialize forms as empty
                    setProfileFormData({ full_name: '', phone: '', date_of_birth: '' });
                    setAddressFormData({ primary_address: '' });
                     originalAddressRef.current = '';
                    // Maybe switch active section? Or let user navigate manually.
                    // setActiveSection('profile');
                    return; // Exit function early
                }
                throw profileError; // Throw other errors
            }

            if (profileData) {
                console.log("Fetched profile data:", profileData);
                setProfileFormData({
                    full_name: profileData.full_name || '',
                    phone: profileData.phone || '',
                    date_of_birth: profileData.date_of_birth || '',
                });
                setAddressFormData({
                    primary_address: profileData.primary_address || '',
                });
                 originalAddressRef.current = profileData.primary_address || ''; // Store initial address
            } else {
                 // Should be caught by PGRST116 above, but as a fallback:
                 console.warn("Profile data was unexpectedly null for user:", userId);
                 setFetchProfileError("Could not load profile data.");
                 setProfileFormData({ full_name: '', phone: '', date_of_birth: '' });
                 setAddressFormData({ primary_address: '' });
                 originalAddressRef.current = '';
            }

        } catch (err: any) {
            console.error("Error fetching profile:", err);
            const friendlyError = getFriendlyErrorMessage(err);
            setFetchProfileError(friendlyError.text); // Use friendly message
            // Clear forms on error
            setProfileFormData({ full_name: '', phone: '', date_of_birth: '' });
            setAddressFormData({ primary_address: '' });
             originalAddressRef.current = '';
        } finally {
            setIsLoadingProfile(false);
        }
    };

    // --- NEW: Combined Fetch Function ---
    const fetchUserData = async (userId: string) => {
        if (!userId) return;
        // We can run them in parallel or sequence. Parallel is slightly faster.
        // Resetting relevant loading/error states happens within each function.
        console.log("Fetching all user data (bookings & profile)...");
        await Promise.all([
            fetchUserBookings(userId),
            fetchUserProfile(userId)
        ]);
        console.log("Finished fetching all user data.");
        // Note: Overall loading ('loading') state is handled by auth listener completion.
    };


    // --- NEW: Update User Profile Handler ---
    const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!currentUser) return;

        setIsUpdatingProfile(true);
        setProfileFeedback(null);
        const currentProfileData = { ...profileFormData }; // Capture data

        // Basic validation example (add more as needed)
        if (!currentProfileData.full_name.trim()) {
            setProfileFeedback({ type: 'error', text: 'Full name cannot be empty.' });
            setIsUpdatingProfile(false);
            return;
        }

        try {
            console.log("Updating profile for user:", currentUser.id);
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: currentProfileData.full_name,
                    phone: currentProfileData.phone || null, // Store null if empty
                    date_of_birth: currentProfileData.date_of_birth || null, // Store null if empty
                    updated_at: new Date().toISOString(), // Update timestamp
                })
                .eq('id', currentUser.id);

            if (error) throw error;

            console.log("Profile updated successfully.");
            setProfileFeedback({ type: 'success', text: 'Profile updated successfully!' });
            // Optional: Re-fetch profile to confirm, though not strictly necessary
            // await fetchUserProfile(currentUser.id);

        } catch (err: any) {
            console.error("Error updating profile:", err);
            const friendlyError = getFriendlyErrorMessage(err);
            setProfileFeedback(friendlyError); // Show error in profile section
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    // --- NEW: Add/Update User Address Handler ---
    const handleAddOrUpdateAddress = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!currentUser) return;

        const newAddress = addressFormData.primary_address.trim();
         // Check if address actually changed
        if (newAddress === originalAddressRef.current) {
             setAddressFeedback({ type: 'info', text: 'Address has not changed.' });
             return;
        }

        setIsUpdatingAddress(true);
        setAddressFeedback(null);

        try {
            console.log("Updating primary address for user:", currentUser.id);
            const { error } = await supabase
                .from('profiles')
                .update({
                    primary_address: newAddress || null, // Store null if empty
                    updated_at: new Date().toISOString(), // Update timestamp
                })
                .eq('id', currentUser.id);

            if (error) throw error;

            console.log("Address updated successfully.");
            setAddressFeedback({ type: 'success', text: 'Primary address updated successfully!' });
            originalAddressRef.current = newAddress; // Update the reference to the new address

            // Optional: Re-fetch profile/address data to ensure UI consistency if needed elsewhere
             // await fetchUserProfile(currentUser.id);

        } catch (err: any) {
            console.error("Error updating address:", err);
            const friendlyError = getFriendlyErrorMessage(err);
            setAddressFeedback(friendlyError); // Show error in address section
        } finally {
            setIsUpdatingAddress(false);
        }
    };


  // --- Helper function for Status Color --- (Keep existing, unchanged)
  const getStatusColor = (status: string): string => {
    status = status?.toLowerCase() || '';
    switch (status) {
        case 'pending': return 'text-yellow-600 bg-yellow-100';
        case 'confirmed': return 'text-blue-600 bg-blue-100';
        case 'in transit': return 'text-purple-600 bg-purple-100';
        case 'out for delivery': return 'text-purple-600 bg-purple-100';
        case 'delivered': return 'text-green-600 bg-green-100';
        case 'cancelled': return 'text-red-600 bg-red-100';
        default: return 'text-gray-600 bg-gray-100';
    }
  };

  // --- Render Logic (JSX) ---
  return (
    <>
      {/* --- Overlay --- */}
      <div
        onClick={loading || isLoadingBookings || isLoadingProfile || isUpdatingProfile || isUpdatingAddress ? undefined : onClose} // Prevent close during any loading/updating
        className={`fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm transition-opacity duration-300 z-40 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        aria-hidden={!isOpen}
      />

      {/* --- Sidebar Panel --- */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog" aria-modal="true" aria-labelledby="sidebar-title"
      >
        {/* --- Header --- */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h2 id="sidebar-title" className="text-xl font-semibold text-gray-800">
             {/* Adjust title based on state */}
             {loading && !currentUser ? 'Loading...' :
             currentUser ? (activeSection === 'profile' ? 'Edit Profile' : activeSection === 'address' ? 'Manage Address' : 'My Account') :
             isSigningUp ? 'Create Account' : 'Log In'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-500 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors"
            aria-label="Close sidebar"
            disabled={loading || isUpdatingProfile || isUpdatingAddress} // Disable close during critical operations
          >
            <X size={24} />
          </button>
        </div>

        {/* --- Main Content Area (Scrollable) --- */}
        <div className="flex-grow p-6 overflow-y-auto">

          {/* --- General Feedback Display Area --- */}
          {feedback && (
             <div className={`mb-4 p-3 border rounded-md text-sm flex items-start ${
                 feedback.type === 'error' ? 'bg-red-50 border-red-300 text-red-800' :
                 feedback.type === 'success' ? 'bg-green-50 border-green-300 text-green-800' :
                 'bg-blue-50 border-blue-300 text-blue-800'
             }`}>
                 <AlertCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" />
                 <span>{feedback.text}</span>
             </div>
           )}

          {/* --- Loading Indicator (Initial Load/Auth) --- */}
          {loading && !currentUser && !feedback && (
            <div className="flex justify-center items-center py-10">
                 <Loader2 size={32} className="animate-spin text-orange-600" />
            </div>
          )}

          {/* --- Logged In View --- */}
          {!loading && currentUser ? (
            <div className="space-y-6">
              {/* Welcome Message - Show based on profile load state */}
                {isLoadingProfile && !profileFormData.full_name && <p className="text-gray-500 animate-pulse">Loading welcome...</p>}
                {!isLoadingProfile && profileFormData.full_name && <p className="text-gray-600 truncate">Welcome, <span className='font-medium'>{profileFormData.full_name}</span>!</p>}
                {!isLoadingProfile && !profileFormData.full_name && fetchProfileError && <p className="text-gray-600 truncate">Welcome, <span className='font-medium'>{currentUser.email}</span>!</p>}
                 {/* Fallback to email if name isn't loaded or error occurred */}
                 {!isLoadingProfile && !profileFormData.full_name && !fetchProfileError && <p className="text-gray-600 truncate">Welcome, <span className='font-medium'>{currentUser.email}</span>!</p>}


              {/* Dashboard Navigation - Added Profile & Address */}
              <nav className="space-y-2">
                 <button className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors ${activeSection === 'orders' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`} onClick={() => setActiveSection('orders')}> <ListOrdered size={18} className="mr-3 flex-shrink-0" /> My Orders </button>
                 <button className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors ${activeSection === 'tracking' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`} onClick={() => setActiveSection('tracking')}> <Truck size={18} className="mr-3 flex-shrink-0" /> Order Tracking </button>
                 <button className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors ${activeSection === 'delivery' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`} onClick={() => setActiveSection('delivery')}> <MapPin size={18} className="mr-3 flex-shrink-0" /> Delivery Details </button>
                 {/* --- NEW Navigation Items --- */}
                 <button className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors ${activeSection === 'profile' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`} onClick={() => setActiveSection('profile')}> <UserCog size={18} className="mr-3 flex-shrink-0" /> Edit Profile </button>
                 <button className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors ${activeSection === 'address' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`} onClick={() => setActiveSection('address')}> <Home size={18} className="mr-3 flex-shrink-0" /> Manage Address </button> {/* Using Home icon */}
              </nav>

              {/* Dashboard Content Display Area */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg min-h-[250px]"> {/* Slightly increased min-height */}

                    {/* --- Loading/Error States for Bookings (Only shown in 'orders' or 'tracking' sections) --- */}
                    {(activeSection === 'orders' || activeSection === 'tracking' || activeSection === 'delivery') && (
                        <>
                            {isLoadingBookings && (
                                <div className="flex justify-center items-center py-10 text-gray-600">
                                    <Loader2 size={24} className="animate-spin text-orange-600 mr-2" /> Loading bookings...
                                </div>
                            )}
                            {fetchBookingsError && !isLoadingBookings && (
                                <div className="text-center py-6 text-red-600">
                                    <AlertCircle className="mx-auto mb-2" size={30} />
                                    <p className="text-sm">{fetchBookingsError}</p>
                                    <button onClick={() => currentUser && fetchUserBookings(currentUser.id)} disabled={!currentUser || isLoadingBookings} className="mt-3 px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded hover:bg-orange-200 disabled:opacity-50"> Retry </button>
                                </div>
                            )}
                            {!isLoadingBookings && !fetchBookingsError && userBookings.length === 0 && activeSection === 'orders' && ( // Only show "no bookings" in orders section
                                <div className="text-center py-10 text-gray-500">
                                    <Package size={30} className="mx-auto mb-2" />
                                    <p>You haven't placed any bookings yet.</p>
                                </div>
                            )}
                        </>
                    )}

                    {/* --- Loading/Error States for Profile (Only shown in 'profile' or 'address' sections) --- */}
                    {(activeSection === 'profile' || activeSection === 'address') && (
                        <>
                            {isLoadingProfile && (
                                <div className="flex justify-center items-center py-10 text-gray-600">
                                    <Loader2 size={24} className="animate-spin text-orange-600 mr-2" /> Loading details...
                                </div>
                            )}
                            {fetchProfileError && !isLoadingProfile && (
                                <div className="text-center py-6 text-red-600">
                                    <AlertCircle className="mx-auto mb-2" size={30} />
                                    <p className="text-sm">{fetchProfileError}</p>
                                    <button onClick={() => currentUser && fetchUserProfile(currentUser.id)} disabled={!currentUser || isLoadingProfile} className="mt-3 px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded hover:bg-orange-200 disabled:opacity-50"> Retry </button>
                                </div>
                            )}
                         </>
                    )}


                  {/* --- Display Content based on Active Section --- */}
                  {/* Only render content if not loading the specific data needed and no fetch error for that data */}

                  {/* --- My Orders Section --- */}
                  {activeSection === 'orders' && !isLoadingBookings && !fetchBookingsError && userBookings.length > 0 && (
                       <div>
                           <h3 className="text-lg font-semibold mb-3 text-gray-800 border-b border-gray-200 pb-1">My Orders</h3>
                           <ul className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                               {userBookings.map((booking) => (
                                   <li key={booking.id} className="p-3 border rounded-md bg-white shadow-sm text-sm transition-shadow hover:shadow-md">
                                       <div className="flex justify-between items-start mb-1">
                                           <span className="font-medium text-gray-700">Booking #{booking.id}</span>
                                           <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(booking.booking_status)}`}>
                                               {booking.booking_status || 'Unknown'}
                                           </span>
                                       </div>
                                       <p className="text-xs text-gray-500 mb-1"> Booked: {new Date(booking.created_at).toLocaleString()} </p>
                                       <p className="text-xs text-gray-600 truncate" title={`${booking.pickup_address} (${booking.pickup_location_type})`}> <span className="font-medium">From:</span> {booking.pickup_address} ({booking.pickup_location_type}) </p>
                                       <p className="text-xs text-gray-600 truncate" title={`${booking.drop_address} (${booking.drop_location_type})`}> <span className="font-medium">To:</span> {booking.drop_address} ({booking.drop_location_type}) </p>
                                   </li>
                               ))}
                           </ul>
                       </div>
                   )}

                  {/* --- Order Tracking Section --- */}
                  {activeSection === 'tracking' && !isLoadingBookings && !fetchBookingsError && latestBooking && (
                      <div>
                            <h3 className="text-lg font-semibold mb-3 text-gray-800 border-b border-gray-200 pb-1">Order Tracking</h3>
                            <div className="space-y-2 text-sm">
                                <p>Tracking latest booking: <strong className='text-gray-700'>#{latestBooking.id}</strong></p>
                                <div className="flex items-center"> <span className="font-medium mr-2">Current Status: </span> <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(latestBooking.booking_status)}`}> {latestBooking.booking_status || 'Unknown'} </span> </div>
                                <p><span className="font-medium">Booked On:</span> {new Date(latestBooking.created_at).toLocaleDateString()}</p>
                                <p><span className="font-medium">Pickup:</span> {latestBooking.pickup_address}</p>
                                <p><span className="font-medium">Drop-off:</span> {latestBooking.drop_address}</p>
                                <p className="mt-4 text-xs text-gray-500">Tracking details are based on the latest updates received.</p>
                                {/* Mini Map */}
                                <div className="mt-4 pt-3 border-t border-gray-200">
                                    <h4 className="text-sm font-medium mb-2 text-gray-700">Route Overview</h4>
                                    <iframe title="Visakhapatnam to Hyderabad Map" className="w-full h-48 border-0 rounded-lg shadow-sm" loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" src="https://www.google.com/maps/embed?pb=!1m28!1m12!1m3!1d7780448.910832964!2d78.09693635583463!3d17.52679556328318!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!4m13!3e6!4m5!1s0x3a39431389e6973f%3A0x92d9c20395498468!2sVisakhapatnam%2C%20Andhra%20Pradesh!3m2!1d17.6868159!2d83.2184815!4m5!1s0x3bcb99daeaebd2c7%3A0xae93b78392bafbc2!2sHyderabad%2C%20Telangana!3m2!1d17.385044!2d78.486671!5e0!3m2!1sen!2sin!4v1699123456789"></iframe>
                                    <p className="mt-1 text-xs text-gray-500 text-center">Map shows general route Visakhapatnam to Hyderabad.</p>
                                </div>
                            </div>
                      </div>
                   )}
                   {activeSection === 'tracking' && !isLoadingBookings && !fetchBookingsError && !latestBooking && (
                        <p className="text-sm text-gray-500 text-center pt-5">No recent booking found to track.</p>
                   )}


                  {/* --- Delivery Details Section --- */}
                  {activeSection === 'delivery' && !isLoadingBookings && !fetchBookingsError && latestBooking && (
                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-gray-800 border-b border-gray-200 pb-1">Delivery Details</h3>
                            <div className="space-y-2 text-sm">
                                <p>Showing details for latest booking: <strong className='text-gray-700'>#{latestBooking.id}</strong></p>
                                <p><span className="font-medium">Recipient Name:</span> {latestBooking.name}</p>
                                <p><span className="font-medium">Recipient Phone:</span> {latestBooking.phone}</p>
                                <p><span className="font-medium">Drop-off Type:</span> {latestBooking.drop_location_type}</p>
                                <p><span className="font-medium">Drop-off Address:</span> {latestBooking.drop_address}</p>
                                {latestBooking.pnr_number && <p><span className="font-medium">PNR:</span> {latestBooking.pnr_number}</p>}
                                {latestBooking.train_number && <p><span className="font-medium">Train No:</span> {latestBooking.train_number}</p>}
                            </div>
                        </div>
                   )}
                    {activeSection === 'delivery' && !isLoadingBookings && !fetchBookingsError && !latestBooking && (
                        <p className="text-sm text-gray-500 text-center pt-5">No recent booking found for delivery details.</p>
                   )}


                   {/* --- NEW: Edit Profile Section --- */}
                   {activeSection === 'profile' && !isLoadingProfile && !fetchProfileError && (
                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-gray-800 border-b border-gray-200 pb-1">Edit Profile Details</h3>
                            {/* Profile Update Feedback */}
                            {profileFeedback && (
                                <div className={`mb-4 p-3 border rounded-md text-sm flex items-start ${
                                     profileFeedback.type === 'error' ? 'bg-red-50 border-red-300 text-red-800' :
                                     profileFeedback.type === 'success' ? 'bg-green-50 border-green-300 text-green-800' :
                                     'bg-blue-50 border-blue-300 text-blue-800'
                                }`}>
                                    <AlertCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" />
                                    <span>{profileFeedback.text}</span>
                                </div>
                            )}
                            <form onSubmit={handleUpdateProfile} className="space-y-4">
                                <div>
                                    <label htmlFor="profile_full_name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <input id="profile_full_name" name="full_name" type="text" value={profileFormData.full_name} onChange={handleProfileInputChange} placeholder="Your full name" className={inputClasses(profileFeedback?.type === 'error' && profileFeedback.text.includes('name'))} required disabled={isUpdatingProfile} />
                                </div>
                                <div>
                                    <label htmlFor="profile_phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                    <input id="profile_phone" name="phone" type="tel" value={profileFormData.phone} onChange={handleProfileInputChange} placeholder="e.g., 9876543210" className={inputClasses(profileFeedback?.type === 'error' && profileFeedback.text.includes('phone'))} disabled={isUpdatingProfile} />
                                </div>
                                <div>
                                    <label htmlFor="profile_date_of_birth" className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                                    <input id="profile_date_of_birth" name="date_of_birth" type="date" value={profileFormData.date_of_birth} onChange={handleProfileInputChange} max={new Date().toISOString().split("T")[0]} className={inputClasses()} disabled={isUpdatingProfile} />
                                </div>
                                <div>
                                    <label htmlFor="profile_email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input id="profile_email" type="email" value={currentUser.email || ''} className={inputClasses() + ' bg-gray-100'} disabled readOnly title="Email cannot be changed here" />
                                     <p className="text-xs text-gray-500 mt-1">Email cannot be changed.</p>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isUpdatingProfile}
                                    className="w-full bg-orange-600 text-white py-2.5 px-4 rounded-lg font-semibold hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors disabled:opacity-70 flex items-center justify-center"
                                >
                                    {isUpdatingProfile ? <Loader2 size={20} className="mr-2 animate-spin" /> : <UserCog size={18} className="mr-2" />}
                                    {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
                                </button>
                            </form>
                        </div>
                   )}

                   {/* --- NEW: Manage Address Section --- */}
                    {activeSection === 'address' && !isLoadingProfile && !fetchProfileError && (
                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-gray-800 border-b border-gray-200 pb-1">Primary Address</h3>
                             {/* Address Update Feedback */}
                             {addressFeedback && (
                                <div className={`mb-4 p-3 border rounded-md text-sm flex items-start ${
                                     addressFeedback.type === 'error' ? 'bg-red-50 border-red-300 text-red-800' :
                                     addressFeedback.type === 'success' ? 'bg-green-50 border-green-300 text-green-800' :
                                     'bg-blue-50 border-blue-300 text-blue-800'
                                }`}>
                                    <AlertCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" />
                                    <span>{addressFeedback.text}</span>
                                </div>
                            )}
                            <form onSubmit={handleAddOrUpdateAddress} className="space-y-4">
                                <div>
                                    <label htmlFor="primary_address" className="block text-sm font-medium text-gray-700 mb-1">
                                        {originalAddressRef.current ? 'Edit Primary Address' : 'Add Primary Address'}
                                    </label>
                                    <textarea
                                        id="primary_address"
                                        name="primary_address"
                                        rows={4}
                                        value={addressFormData.primary_address}
                                        onChange={handleAddressInputChange}
                                        placeholder="Enter your full primary address (house no, street, city, state, pincode)"
                                        className={inputClasses(addressFeedback?.type === 'error') + ' resize-none'} // Prevent resizing
                                        disabled={isUpdatingAddress}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">This address may be used for future bookings.</p>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isUpdatingAddress}
                                    className="w-full bg-orange-600 text-white py-2.5 px-4 rounded-lg font-semibold hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors disabled:opacity-70 flex items-center justify-center"
                                >
                                    {isUpdatingAddress ? <Loader2 size={20} className="mr-2 animate-spin" /> : <Home size={18} className="mr-2" />}
                                    {isUpdatingAddress ? 'Saving...' : 'Save Address'}
                                </button>
                            </form>
                        </div>
                    )}

                 {/* --- Message when no section is selected or data isn't ready --- */}
                 {/* Adjust condition to check if *any* data loading is happening or errors exist for the *intended* section */}
                 {!activeSection && !isLoadingBookings && !isLoadingProfile && (
                     <p className="text-sm text-gray-500 text-center pt-10">Select an option from the navigation above.</p>
                 )}


              </div> {/* End Dashboard Content Display Area */}

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                // Disable if any main loading/updating process is active
                disabled={loading || isLoadingBookings || isLoadingProfile || isUpdatingProfile || isUpdatingAddress}
                className="flex items-center justify-center w-full px-4 py-2 mt-6 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
               >
                  {(loading || isUpdatingProfile || isUpdatingAddress) ? <Loader2 size={18} className="mr-2 animate-spin" /> : <LogOut size={18} className="mr-2" />}
                  {(loading || isUpdatingProfile || isUpdatingAddress) ? 'Processing...' : 'Logout'}
              </button>
            </div>
          ) : (
            // --- Logged Out View (Login OR Signup Form) ---
             !loading && !currentUser && (
               <form onSubmit={handleAuth} className="space-y-4">
                {/* Signup Fields */}
                {isSigningUp && (
                    <>
                     <div> <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label> <input ref={nameInputRef} id="full_name" name="full_name" type="text" value={authFormData.full_name} onChange={handleAuthInputChange} placeholder="Your full name" className={inputClasses()} required disabled={loading} /> </div>
                     <div> <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number <span className="text-xs text-gray-500">(Optional)</span></label> <input id="phone" name="phone" type="tel" value={authFormData.phone} onChange={handleAuthInputChange} placeholder="e.g., 9876543210" className={inputClasses()} disabled={loading} /> </div>
                     <div> <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-1">Date of Birth <span className="text-xs text-gray-500">(Optional)</span></label> <input id="date_of_birth" name="date_of_birth" type="date" value={authFormData.date_of_birth} onChange={handleAuthInputChange} max={new Date().toISOString().split("T")[0]} className={inputClasses()} disabled={loading} /> </div>
                     <div> <label htmlFor="aadhar_number" className="block text-sm font-medium text-gray-700 mb-1">Aadhar Number</label> <input id="aadhar_number" name="aadhar_number" type="text" inputMode="numeric" pattern="\d{12}" title="Enter 12-digit Aadhar number" value={authFormData.aadhar_number} onChange={handleAuthInputChange} placeholder="1234 5678 9012" className={inputClasses()} disabled={loading} /> <p className="text-xs text-gray-500 mt-1">Enter 12-digit number. <span className='font-semibold'>Handled securely.</span></p> </div>
                     <hr className="my-2 border-gray-200"/>
                    </>
                )}
                 {/* Email (Always Visible) */}
                 <div> <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label> <input ref={emailInputRef} id="email" name="email" type="email" value={authFormData.email} onChange={handleAuthInputChange} placeholder="you@example.com" className={inputClasses(feedback?.type === 'error')} required disabled={loading} /> </div>
                 {/* Password (Always Visible) */}
                 <div> <label htmlFor="password"className="block text-sm font-medium text-gray-700 mb-1">Password</label> <input id="password" name="password" type="password" value={authFormData.password} onChange={handleAuthInputChange} placeholder={isSigningUp ? "Create a password (min. 6 chars)" : "••••••••"} className={inputClasses(feedback?.type === 'error')} required minLength={isSigningUp ? 6 : undefined} disabled={loading} />
                    {!isSigningUp && ( <div className="text-right mt-1"> <button type="button" className="text-sm text-orange-600 hover:underline focus:outline-none" onClick={() => setFeedback({type: 'info', text:'Forgot password functionality not implemented yet.'})}> Forgot password? </button> </div> )}
                 </div>
                 {/* Submit Button */}
                 <button type="submit" disabled={loading} className="w-full bg-orange-600 text-white py-2.5 px-4 rounded-lg font-semibold hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors disabled:opacity-70 flex items-center justify-center">
                   {loading && <Loader2 size={20} className="mr-2 animate-spin" />}
                   {!loading && isSigningUp && <UserPlus size={18} className="mr-2" />}
                   {loading ? 'Processing...' : (isSigningUp ? 'Sign Up' : 'Log In')}
                 </button>
               </form>
            )
          )}
        </div> {/* End Main Content Area */}

        {/* --- Footer / Toggle Auth Mode --- */}
        {!loading && !currentUser && (
           <div className="p-4 border-t border-gray-200 text-center flex-shrink-0">
            <button onClick={toggleAuthMode} disabled={loading} className="text-sm text-orange-600 hover:underline focus:outline-none disabled:opacity-50">
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