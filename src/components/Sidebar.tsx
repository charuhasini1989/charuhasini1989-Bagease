// src/components/Sidebar.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Truck,
  MapPin,
  LogOut,
  ClipboardList,
  Loader2,
  AlertCircle,
  UserPlus, // For signup icon
} from 'lucide-react';
import { supabase } from '../supabase'; // Ensure this path is correct
import { User, AuthError, Session } from '@supabase/supabase-js';

// --- Interfaces ---

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FeedbackMessage {
  type: 'error' | 'success' | 'info';
  text: string;
}

// Matches the structure expected from your 'profiles' table
interface Profile {
  id?: string; // Usually the user UUID from auth.users
  full_name: string | null;
  phone: string | null;
  date_of_birth: string | null; // Format YYYY-MM-DD
  aadhar_number: string | null;
  email?: string | null; // Can be useful to store/display
}

// Combined form data for login/signup
interface FormData extends Profile {
  email: string;
  password: string; // Only used for auth, not stored in profiles table usually
}

// --- Component ---

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  // --- State Definitions ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profileData, setProfileData] = useState<Profile | null>(null);
  const [formData, setFormData] = useState<FormData>({
    email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '',
  });
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [isSigningUp, setIsSigningUp] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string>(''); // For dashboard navigation

  // Loading States:
  // initialLoading: True only during the very first session check on component mount.
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  // authActionLoading: True when login, signup, or logout buttons are clicked and awaiting response.
  const [authActionLoading, setAuthActionLoading] = useState<boolean>(false);
  // profileLoading: True specifically when fetching profile data (e.g., after login).
  const [profileLoading, setProfileLoading] = useState<boolean>(false);

  // --- Refs for Input Focus ---
  const emailInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const aadharInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null); // Added for password focus

  // --- Helper Functions ---

  /** Clears form fields, feedback, and resets auth mode */
  const resetAuthState = useCallback((clearFeedback = true) => {
    console.log('Resetting Auth State');
    setActiveSection('');
    setFormData({ email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' });
    if (clearFeedback) setFeedback(null);
    setIsSigningUp(false);
    setAuthActionLoading(false); // Ensure auth loading is reset
    // Note: currentUser and profileData are handled by the auth listener
  }, []); // No dependencies needed as it only uses setters

  /** Fetches profile data for a given user ID */
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    console.log(`Fetching profile for user ID: ${userId}`);
    setProfileLoading(true);
    setFeedback(null); // Clear previous feedback before fetch attempt

    // *** CRITICAL: Ensure Row Level Security (RLS) is enabled on your 'profiles' table ***
    // RLS Policy Example (for authenticated users to select their own profile):
    // Table: profiles
    // For SELECT operation
    // Using expression: (auth.uid() = id)
    // With check expression: (auth.uid() = id) -- also good for insert/update if needed

    try {
      const { data, error, status } = await supabase
        .from('profiles')
        .select('full_name, phone, date_of_birth, aadhar_number, email') // Select desired fields
        .eq('id', userId)
        .maybeSingle(); // Use maybeSingle() to handle cases where profile might not exist yet

      if (error && status !== 406) { // 406 means no rows found, which is okay with maybeSingle()
        console.error('Error fetching profile:', error.message, 'Status:', status);
        setFeedback({ type: 'error', text: `Could not load profile: ${error.message}. Check RLS policy.` });
        return null;
      }

      if (data) {
        console.log('Profile data fetched successfully:', data);
        return data as Profile;
      } else {
        console.log('No profile found for this user (user exists but no profile record).');
        // Optionally set info feedback if a profile is expected but missing
        // setFeedback({ type: 'info', text: 'Profile data not yet created.' });
        return null; // No profile exists yet
      }
    } catch (err: any) {
      console.error('Exception during profile fetch:', err.message);
      setFeedback({ type: 'error', text: 'An unexpected error occurred while fetching your profile.' });
      return null;
    } finally {
      setProfileLoading(false);
      console.log('Profile fetch attempt finished.');
    }
  }, []); // No dependencies, it's a self-contained async function using setters

  /** Maps Supabase/other errors to user-friendly messages */
  const getFriendlyErrorMessage = (error: AuthError | Error | any): string => {
    let message = "An unexpected error occurred. Please try again.";
    if (!error) return message;

    const errorMessage = typeof error.message === 'string' ? error.message : String(error);
    console.error('Auth/DB Error:', errorMessage, error); // Log the raw error

    if (errorMessage.includes('Invalid login credentials')) {
      message = "Incorrect email or password. Please check your details.";
    } else if (errorMessage.includes('User already registered') || errorMessage.includes('already exists')) {
      message = "This email is already registered. Please log in instead.";
      // Automatically switch to login mode might be helpful here:
      setIsSigningUp(false);
      setFormData(prev => ({ ...prev, password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: ''}));
      setTimeout(() => emailInputRef.current?.focus(), 100);
    } else if (errorMessage.includes('Password should be at least 6 characters')) {
      message = 'Password must be at least 6 characters long.';
      setTimeout(() => passwordInputRef.current?.focus(), 100);
    } else if (errorMessage.includes('Unable to validate email address: invalid format')) {
      message = 'Please enter a valid email address.';
      setTimeout(() => emailInputRef.current?.focus(), 100);
    } else if (errorMessage.includes('Email rate limit exceeded') || errorMessage.includes('too many requests')) {
      message = 'Too many attempts. Please try again later.';
    } else if (errorMessage.includes('check constraint') && errorMessage.includes('phone')) {
        message = 'Invalid phone number format provided.';
    } else if (errorMessage.includes('profiles_pkey') || (errorMessage.includes('duplicate key') && errorMessage.includes('profiles'))) {
        message = 'Profile data could not be saved (user might already have one). Contact support if this persists.';
    } else if (errorMessage.includes('violates not-null constraint') && errorMessage.includes('full_name')) {
        message = 'Full Name is required for signup.';
        setTimeout(() => nameInputRef.current?.focus(), 100);
    } else if (errorMessage.includes('violates not-null constraint') && errorMessage.includes('aadhar_number')) {
        message = 'Aadhar Number is required for signup.';
        setTimeout(() => aadharInputRef.current?.focus(), 100);
    } else if (errorMessage.includes('Aadhar number must be 12 digits')) { // Custom validation error
        message = 'Please enter a valid 12-digit Aadhar number.';
        setTimeout(() => aadharInputRef.current?.focus(), 100);
    }
    // Keep the original message if none of the specific checks match and it exists
    else if (errorMessage) {
      message = errorMessage;
    }

    return message;
  };

  // --- Effects ---

  // Effect for Initial Session Check and Auth State Changes
  useEffect(() => {
    setInitialLoading(true);
    setProfileData(null); // Reset profile on initial check start
    setCurrentUser(null); // Reset user on initial check start

    // 1. Check initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user ?? null;
      console.log('Initial session check complete. User:', user?.id || 'None');
      setCurrentUser(user);
      if (user) {
        const profile = await fetchProfile(user.id);
        setProfileData(profile);
      } else {
         resetAuthState(false); // Reset form/mode if no user initially
      }
      setInitialLoading(false); // Initial load finished
      console.log('Initial load state set to false.');
    }).catch(error => {
        console.error("Error getting initial session:", error);
        setFeedback({ type: 'error', text: 'Failed to check initial session.' });
        setInitialLoading(false); // Still finish loading even on error
    });

    // 2. Listen for subsequent auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        console.log(`Auth Event: ${event}`, session?.user?.id || 'No user');
        const user = session?.user ?? null;

        // Update user state immediately
        setCurrentUser(user);

        switch (event) {
          case 'SIGNED_IN':
            setFeedback(null); // Clear feedback on successful sign in
            setFormData(prev => ({ ...prev, password: '' })); // Clear password field
            setIsSigningUp(false); // Ensure login mode
            if (user) {
              const profile = await fetchProfile(user.id); // Fetch profile
              setProfileData(profile);
            } else {
                 setProfileData(null); // Should not happen on SIGNED_IN but good practice
            }
            break;

          case 'SIGNED_OUT':
            setProfileData(null); // Clear profile data
            resetAuthState(); // Reset form, mode, feedback
            break;

          case 'USER_UPDATED':
            // Re-fetch profile if user details might have changed (e.g., email update)
             if (user) {
                const profile = await fetchProfile(user.id);
                setProfileData(profile);
             }
            break;

           case 'PASSWORD_RECOVERY':
             setFeedback({ type: 'info', text: 'Password recovery email sent. Check your inbox.' });
             break;

          case 'TOKEN_REFRESHED':
             // Usually no UI change needed, but log it
             console.log('Auth token refreshed.');
             break;

          default:
            // Handle other events if necessary
            break;
        }
        // Ensure initial loading is off if an auth event occurs after initial check
        // This might happen if the listener fires very quickly.
        if (initialLoading) setInitialLoading(false);
      }
    );

    // Cleanup listener on component unmount
    return () => {
      authListener?.subscription.unsubscribe();
      console.log('Auth listener unsubscribed');
    };
  }, [fetchProfile, resetAuthState, initialLoading]); // Add fetchProfile and resetAuthState to dependencies

  // Effect for Body Scroll Lock
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = originalOverflow;
    }
    // Cleanup function
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // --- Event Handlers ---

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);
    setAuthActionLoading(true);
    const { email, password, full_name, phone, date_of_birth, aadhar_number } = formData;

    try {
      if (isSigningUp) {
        // --- Sign Up ---
        // Basic Frontend Validation
        if (!full_name?.trim()) throw new Error("Full Name is required for signup.");
        if (!aadhar_number?.trim()) throw new Error("Aadhar Number is required for signup.");
        const aadharRegex = /^\d{12}$/;
        if (!aadharRegex.test(aadhar_number)) throw new Error("Aadhar number must be 12 digits");
        if (password.length < 6) throw new Error("Password should be at least 6 characters");

        // 1. Sign up user in Supabase Auth
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
        });

        if (signUpError) throw signUpError;
        if (!signUpData.user) throw new Error("Signup successful but user data is missing.");
        console.log('Auth signup successful for:', signUpData.user.email);

        // 2. Insert profile data into 'profiles' table
        // *** RLS POLICY REQUIRED FOR INSERT ***
        // Example: Allow authenticated users to insert their own profile
        // Table: profiles | For INSERT operation | Using expression: (auth.uid() = id) | With check expression: (auth.uid() = id)
        let profileInsertSuccess = false;
        try {
            console.log('Attempting profile insert for user:', signUpData.user.id);
            const { error: profileError } = await supabase.from('profiles').insert({
                id: signUpData.user.id, // Link to the auth user
                email: signUpData.user.email, // Store email in profile too (optional but common)
                full_name: full_name.trim(),
                phone: phone?.trim() || null, // Store null if empty
                date_of_birth: date_of_birth || null, // Store null if empty
                aadhar_number: aadhar_number.trim(),
            });
            // Removed .single() as insert doesn't return the row by default without specific SELECT in RPC or header. Checking error is enough.

            if (profileError) throw profileError; // Throw profile-specific error

            console.log('Profile created successfully in DB.');
            profileInsertSuccess = true;

        } catch (profileInsertError: any) {
            console.error('Error creating Supabase profile after signup:', profileInsertError);
            // Provide feedback but let the user know account *might* be created
            setFeedback({
                type: 'info', // Info because auth succeeded, but profile failed
                text: `Account may be created, but saving profile failed: ${getFriendlyErrorMessage(profileInsertError)}. Check email for verification. Contact support if needed.`
            });
            // Do not set authActionLoading to false here, let the finally block handle it.
            // The auth listener will handle the user state based on signUpData.session
        }

        // 3. Provide feedback based on session (email verification needed?) and profile success
        if (!signUpData.session) { // Email verification likely required
             if (profileInsertSuccess && (!feedback || feedback.type !== 'info')) { // Don't overwrite profile error
                 setFeedback({ type: 'success', text: 'Account created! Check your email (and spam folder) for a confirmation link.' });
             }
             // Keep form data (except password) in case user needs to retry profile save later? Or clear? Let's clear for now.
             // setFormData(prev => ({ ...prev, password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' }));
             setIsSigningUp(false); // Switch to login view after successful signup request
        } else { // Auto-confirmed / logged in immediately
             // The 'SIGNED_IN' event in the listener will handle profile fetching & UI update.
             if (profileInsertSuccess && (!feedback || feedback.type !== 'info')) {
                 setFeedback({ type: 'success', text: 'Account created and logged in!' });
             }
             // No need to manually set currentUser/profileData here, listener does it.
        }

      } else {
        // --- Log In ---
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (signInError) throw signInError;

        console.log('Login request successful for:', signInData.user?.email);
        // Feedback/state updates are handled by the 'SIGNED_IN' listener
        // Clear password field after successful login attempt
        setFormData(prev => ({ ...prev, password: '' }));
      }

    } catch (error: any) {
      console.error("Authentication/Signup Error caught in handler:", error);
      const friendlyError = getFriendlyErrorMessage(error);
      setFeedback({ type: 'error', text: friendlyError });
      // Optional: Focus logic based on error (already partly in getFriendlyErrorMessage)
      if (friendlyError.includes('password') || friendlyError.includes('Password')) {
         passwordInputRef.current?.focus();
         passwordInputRef.current?.select();
      } else if (friendlyError.includes('email') || friendlyError.includes('Email')) {
         emailInputRef.current?.focus();
         emailInputRef.current?.select();
      }
    } finally {
      // Stop the button loading indicator regardless of success or error
      setAuthActionLoading(false);
    }
  };

  const handleLogout = async () => {
    setFeedback(null);
    setAuthActionLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout Error:', error.message);
        setFeedback({ type: 'error', text: `Logout failed: ${error.message}` });
      } else {
        console.log('Logout successful request.');
        // State reset (currentUser=null, profileData=null, form reset) is handled by the 'SIGNED_OUT' listener
      }
    } catch (e: any) {
      console.error("Exception during logout:", e.message);
      setFeedback({ type: 'error', text: "An unexpected error occurred during logout." });
    } finally {
      setAuthActionLoading(false);
    }
  };

  const toggleAuthMode = () => {
    const enteringSignupMode = !isSigningUp;
    setIsSigningUp(enteringSignupMode);
    setFormData(prev => ({
      // Keep email if user started typing it
      email: prev.email,
      // Clear password and profile fields
      password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: ''
    }));
    setFeedback(null); // Clear feedback when toggling
    // Focus appropriate field after toggle
    setTimeout(() => {
      if (enteringSignupMode) {
        nameInputRef.current?.focus();
      } else {
        emailInputRef.current?.focus();
      }
    }, 100); // Small delay helps ensure element is focusable
  };

  // --- Reusable Input Field Classes ---
  const inputClasses = (hasError: boolean = false) =>
    `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors text-gray-800 placeholder-gray-400 ${
      hasError ? 'border-red-500 ring-red-500' : 'border-gray-300'
    } disabled:bg-gray-100 disabled:cursor-not-allowed`;

    // Determine overall loading state for disabling inputs etc.
    // User is interacting, so prioritize authActionLoading. If not, show profileLoading.
    // InitialLoading is handled separately for the main skeleton/loader.
    const isBusy = authActionLoading || profileLoading;

  // --- Render Logic ---
  return (
    <>
      {/* --- Overlay --- */}
      <div
        onClick={isBusy ? undefined : onClose} // Prevent close during any loading action
        className={`fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm transition-opacity duration-300 z-40 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!isOpen}
      />

      {/* --- Sidebar Panel --- */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sidebar-title"
      >
        {/* --- Header --- */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h2 id="sidebar-title" className="text-xl font-semibold text-gray-800">
            {initialLoading ? 'Loading Account...' :
             currentUser ? 'My Account' :
             isSigningUp ? 'Create Account' :
             'Log In'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-500 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors"
            aria-label="Close sidebar"
            disabled={isBusy || initialLoading} // Disable close during any loading
          >
            <X size={24} />
          </button>
        </div>

        {/* --- Main Content Area (Scrollable) --- */}
        <div className="flex-grow p-6 overflow-y-auto">

          {/* --- Feedback Display Area --- */}
          {feedback && (
            <div className={`mb-4 p-3 border rounded-md text-sm flex items-start ${
              feedback.type === 'error' ? 'bg-red-50 border-red-300 text-red-800' :
              feedback.type === 'success' ? 'bg-green-50 border-green-300 text-green-800' :
              'bg-blue-50 border-blue-300 text-blue-800' // Info
            }`}>
              <AlertCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" />
              <span>{feedback.text}</span>
            </div>
          )}

          {/* --- Initial Loading Indicator --- */}
          {initialLoading && (
            <div className="flex flex-col justify-center items-center py-10 text-center">
              <Loader2 size={32} className="animate-spin text-orange-600" />
              <span className="mt-3 text-gray-600">Loading data...</span>
            </div>
          )}

          {/* --- Logged In View --- */}
          {!initialLoading && currentUser && (
            <div className="space-y-6">
              {/* Welcome Message & Profile Loading state */}
              <div className="flex items-center justify-between">
                 <p className="text-gray-600 truncate">
                    Welcome, <span className='font-medium text-gray-800'>{profileData?.full_name || currentUser.email || 'User'}</span>!
                 </p>
                 {profileLoading && <Loader2 size={16} className="animate-spin text-orange-500 ml-2" />}
              </div>


              {/* Dashboard Navigation */}
              <nav className="space-y-2">
                {/* Added disabled={isBusy} to nav buttons */}
                <button className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors disabled:opacity-50 ${activeSection === 'tracking' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`} onClick={() => setActiveSection('tracking')} disabled={isBusy}> <Truck size={18} className="mr-3 flex-shrink-0" /> Order Tracking </button>
                <button className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors disabled:opacity-50 ${activeSection === 'delivery' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`} onClick={() => setActiveSection('delivery')} disabled={isBusy}> <MapPin size={18} className="mr-3 flex-shrink-0" /> Delivery Details </button>
                <button className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors disabled:opacity-50 ${activeSection === 'orders' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`} onClick={() => setActiveSection('orders')} disabled={isBusy}> <ClipboardList size={18} className="mr-3 flex-shrink-0" /> My Orders </button>
              </nav>

              {/* Dashboard Content Display */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg min-h-[100px]">
                {/* Placeholder Content */}
                {activeSection === 'tracking' && (<div><h3 className="text-lg font-semibold mb-2 text-gray-800">Order Tracking</h3><p className="text-sm text-gray-600">Tracking details will appear here.</p></div>)}
                {activeSection === 'delivery' && (<div><h3 className="text-lg font-semibold mb-2 text-gray-800">Delivery Details</h3><p className="text-sm text-gray-600">View or update your saved addresses.</p>{/* Add profile editing form here? */}</div>)}
                {activeSection === 'orders' && (<div><h3 className="text-lg font-semibold mb-2 text-gray-800">My Orders</h3><p className="text-sm text-gray-600">Your past order history.</p></div>)}
                {!activeSection && !profileLoading && (<p className="text-sm text-gray-500 text-center pt-4">Select an option above to view details.</p>)}
                 {profileLoading && activeSection && (<div className="flex justify-center items-center h-[80px]"><Loader2 size={24} className="animate-spin text-orange-500"/></div>)}
              </div>

              {/* Logout Button */}
              <button
                 onClick={handleLogout}
                 disabled={authActionLoading} // Only disable for auth actions
                 className="flex items-center justify-center w-full px-4 py-2 mt-6 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors disabled:opacity-50"
               >
                {authActionLoading ? (
                  <Loader2 size={18} className="mr-2 animate-spin" />
                ) : (
                  <LogOut size={18} className="mr-2" />
                )}
                {authActionLoading ? 'Logging Out...' : 'Logout'}
              </button>
            </div>
          )}

          {/* --- Logged Out View (Login OR Signup Form) --- */}
          {!initialLoading && !currentUser && (
            <form onSubmit={handleAuth} className="space-y-4">

              {/* --- Signup Specific Fields --- */}
              {isSigningUp && (
                <>
                  <div>
                    <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-600">*</span></label>
                    <input ref={nameInputRef} id="full_name" name="full_name" type="text" value={formData.full_name ?? ''} onChange={handleInputChange} placeholder="Your full name" className={inputClasses(feedback?.text.includes("Full Name"))} required disabled={authActionLoading} />
                  </div>
                   <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number <span className="text-xs text-gray-500">(Optional)</span></label>
                        <input id="phone" name="phone" type="tel" value={formData.phone ?? ''} onChange={handleInputChange} placeholder="e.g., 9876543210" className={inputClasses()} disabled={authActionLoading} />
                    </div>
                     <div>
                        <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-1">Date of Birth <span className="text-xs text-gray-500">(Optional)</span></label>
                        <input id="date_of_birth" name="date_of_birth" type="date" value={formData.date_of_birth ?? ''} onChange={handleInputChange} max={new Date().toISOString().split("T")[0]} /* Prevent future dates */ className={inputClasses()} disabled={authActionLoading} />
                    </div>
                  <div>
                    <label htmlFor="aadhar_number" className="block text-sm font-medium text-gray-700 mb-1">Aadhar Number <span className="text-red-600">*</span></label>
                    <input ref={aadharInputRef} id="aadhar_number" name="aadhar_number" type="text" inputMode="numeric" pattern="\d{12}" title="Enter 12-digit Aadhar number" value={formData.aadhar_number ?? ''} onChange={handleInputChange} placeholder="1234 5678 9012" className={inputClasses(feedback?.text.includes("Aadhar"))} required disabled={authActionLoading} />
                    <p className="text-xs text-gray-500 mt-1">Enter 12 digits only. <span className='font-semibold'>Handled securely.</span></p>
                  </div>
                  <hr className="my-2 border-gray-200"/>
                </>
              )}

              {/* --- Email (Always Visible) --- */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-600">*</span></label>
                <input ref={emailInputRef} id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="you@example.com" className={inputClasses(feedback?.type === 'error' && (feedback.text.includes('email') || feedback.text.includes('credentials')))} required disabled={authActionLoading} />
              </div>

              {/* --- Password (Always Visible) --- */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password <span className="text-red-600">*</span></label>
                <input ref={passwordInputRef} id="password" name="password" type="password" value={formData.password} onChange={handleInputChange} placeholder={isSigningUp ? "Create password (min. 6 chars)" : "••••••••"} className={inputClasses(feedback?.type === 'error' && (feedback.text.includes('Password') || feedback.text.includes('credentials')))} required minLength={isSigningUp ? 6 : undefined} disabled={authActionLoading} />
                 {!isSigningUp && (
                    <div className="text-right mt-1">
                        {/* TODO: Implement password recovery flow */}
                      <button type="button" className="text-sm text-orange-600 hover:underline focus:outline-none" onClick={() => setFeedback({type: 'info', text:'Password recovery feature not yet implemented.'})} disabled={authActionLoading}>Forgot password?</button>
                    </div>
                  )}
              </div>

              {/* --- Submit Button --- */}
              <button
                 type="submit"
                 disabled={authActionLoading} // Disable only during auth actions
                 className="w-full bg-orange-600 text-white py-2.5 px-4 rounded-lg font-semibold hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors disabled:opacity-70 flex items-center justify-center"
              >
                {authActionLoading ? (
                  <Loader2 size={20} className="mr-2 animate-spin" />
                ) : isSigningUp ? (
                  <UserPlus size={18} className="mr-2" />
                ) : (
                  // Use LogOut icon rotated 180deg for Log In visual cue
                  <LogOut size={18} className="mr-2 transform rotate-180" />
                )}
                {authActionLoading ? 'Processing...' : isSigningUp ? 'Sign Up' : 'Log In'}
              </button>
            </form>
          )}
        </div> {/* End Main Content Area */}

        {/* --- Footer / Toggle Auth Mode --- */}
        {/* Show toggle only if not initial loading and not logged in */}
        {!initialLoading && !currentUser && (
          <div className="p-4 border-t border-gray-200 text-center flex-shrink-0 bg-white">
            <button
               onClick={toggleAuthMode}
               disabled={authActionLoading} // Disable during auth actions
               className="text-sm text-orange-600 hover:underline focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSigningUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        )}
        {/* Optional small spacer at the very bottom if needed */}
        {/* <div className="flex-shrink-0 h-2 bg-white"></div> */}
      </div> {/* End Sidebar Panel */}
    </>
  );
};

export default Sidebar;