// src/components/Sidebar.tsx
import React, { useState, useEffect, useRef } from 'react';
import { X, Truck, MapPin, LogOut, ClipboardList, Loader2, AlertCircle, UserPlus } from 'lucide-react';
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

// --- Profile Data (from profiles table) ---
interface Profile {
    id?: string;
    full_name: string | null;
    phone: string | null;
    date_of_birth: string | null;
    aadhar_number: string | null;
    email?: string | null;
}

// --- Combined Form Data Type ---
interface FormData extends Profile {
    email: string;
    password: string;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  // --- State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profileData, setProfileData] = useState<Profile | null>(null);
  const [formData, setFormData] = useState<FormData>({
      email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '',
  });
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // Loading for initial session check & profile fetches during auth changes
  const [authLoading, setAuthLoading] = useState<boolean>(false); // Loading specifically for auth button actions (login/signup/logout)
  const [isSigningUp, setIsSigningUp] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string>('');
  const emailInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const aadharInputRef = useRef<HTMLInputElement>(null);

  // --- Helper: Fetch User Profile ---
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
      console.log(`Fetching profile for user ID: ${userId}`);
      // *** IMPORTANT: Ensure Row Level Security (RLS) on your 'profiles' table in Supabase
      // *** allows authenticated users to SELECT their own profile (e.g., USING expression: auth.uid() = id)
      // *** This is a common cause for profile loading issues after login/refresh.
      try {
          const { data, error, status } = await supabase
              .from('profiles')
              .select('full_name, phone, date_of_birth, aadhar_number, email')
              .eq('id', userId)
              .maybeSingle();

          if (error && status !== 406) {
              console.error('Error fetching profile:', error.message, 'Status:', status);
              // Keep existing feedback or set a new one, but don't overwrite critical auth feedback
              if (!feedback || feedback.type !== 'error') {
                 setFeedback({ type: 'error', text: 'Could not load profile data. Check console/RLS.' });
              }
              return null;
          }
          if (data) {
              console.log('Profile data fetched:', data);
              return data as Profile;
          }
          console.log('No profile found for this user.');
          return null; // No profile exists for this user yet
      } catch (err: any) {
          console.error('Exception during profile fetch:', err.message);
           if (!feedback || feedback.type !== 'error') {
              setFeedback({ type: 'error', text: 'An error occurred fetching your profile.' });
           }
          return null;
      }
  };


  // --- Listener for Auth State Changes & Profile Fetch ---
  useEffect(() => {
    setLoading(true); // Start loading for initial check

    // Check initial session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
        try { // Wrap async logic in try/finally
            if (error) {
                console.error("Error getting initial session:", error.message);
                setFeedback({ type: 'error', text: 'Failed to check session.' });
            }
            const user = session?.user ?? null;
            console.log('Initial session user:', user?.id || 'None');
            setCurrentUser(user);

            if (user) {
                const profile = await fetchProfile(user.id); // Fetch profile on initial load if logged in
                setProfileData(profile);
            } else {
                resetAuthState(false); // Reset if no user initially
                setProfileData(null);
            }
        } catch (e: any) {
            console.error("Error processing initial session:", e.message);
            setFeedback({ type: 'error', text: 'Error processing session data.' });
             // Ensure state reflects no user if processing failed badly
             setCurrentUser(null);
             setProfileData(null);
             resetAuthState(false);
        } finally {
            setLoading(false); // *** Finish initial load regardless of outcome ***
             console.log('Initial load complete. Loading:', false);
        }
    });

    // Listen for subsequent changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`Auth Event: ${event}`, session?.user?.id || 'No user');
        // Set loading true ONLY if we expect async work (profile fetch)
        const requiresProfileFetch = (event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user;
        if (requiresProfileFetch) {
            setLoading(true);
        } else if (event === 'SIGNED_OUT') {
            // Resetting state is synchronous, no main loading needed unless specifically desired
            // setLoading(true); // Optional: uncomment if you want a loading flash on logout
        }

        try { // Wrap listener logic in try/finally
            const user = session?.user ?? null;
            setCurrentUser(user); // Update user state immediately

            if (event === 'SIGNED_OUT' || !user) {
                console.log('Handling SIGNED_OUT or no user');
                resetAuthState(); // Reset form state
                setProfileData(null); // Clear profile data
            } else if (event === 'SIGNED_IN') {
                console.log('Handling SIGNED_IN for user:', user.id);
                setFeedback(null); // Clear previous feedback
                setFormData({ email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' }); // Clear form
                setIsSigningUp(false); // Ensure login mode
                // Fetch profile data when user signs in
                const profile = await fetchProfile(user.id);
                setProfileData(profile);
            } else if (event === 'USER_UPDATED' && user) {
                console.log('Handling USER_UPDATED for user:', user.id);
                // Re-fetch profile if user details (like email) might change
                const profile = await fetchProfile(user.id);
                setProfileData(profile);
            }
        } catch (e: any) {
             console.error(`Error processing auth event ${event}:`, e.message);
             setFeedback({ type: 'error', text: `Error updating account state after ${event}.` });
             // Consider resetting state further if needed based on the error
        } finally {
             // Stop loading ONLY if it was set for this event
             if (requiresProfileFetch) {
                setLoading(false);
                console.log(`Finished processing ${event}. Loading:`, false);
             } else if (event === 'SIGNED_OUT') {
                 // setLoading(false); // Match optional setLoading(true) above if used
                 console.log(`Finished processing SIGNED_OUT.`);
             }
             // For other events like TOKEN_REFRESHED, PASSWORD_RECOVERY etc., loading wasn't set true
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
      console.log('Auth listener unsubscribed');
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  // Helper to reset state
  const resetAuthState = (clearFeedback = true) => {
      console.log('Resetting Auth State');
      setActiveSection('');
      setFormData({ email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' });
      if (clearFeedback) setFeedback(null);
      setIsSigningUp(false); // Default to login mode
      // Note: Don't clear profileData/currentUser here, let the listener handle it based on auth events
  }

  // --- Body Scroll Lock ---
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    // Cleanup function
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

   // --- Input Change Handler ---
   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
   };


  // --- Map Supabase Errors ---
   const getFriendlyErrorMessage = (error: AuthError | Error | any): { type: 'error' | 'info', text: string } => {
       // (Keep your existing detailed error mapping logic here - it's good!)
       let message = "An unexpected error occurred. Please try again.";
       let type: 'error' | 'info' = 'error';
       if (!error) return { type, text: message };
       const errorMessage = error.message || String(error) || ''; // Handle non-standard errors
       console.error('Supabase Auth/DB Error:', errorMessage, error); // Log the full error

       if (errorMessage.includes('Invalid login credentials')) {
            if (!isSigningUp) {
                message = "Incorrect email or password. Not found? Try signing up."; // Modified message
                type = 'info'; // Keep as info to suggest signup
                // Don't automatically switch to signup, let user click
                // setIsSigningUp(true);
                // setFormData(prev => ({ ...prev, password: '' }));
                // setTimeout(() => nameInputRef.current?.focus(), 100);
            } else {
                 message = 'Invalid details provided during signup.'; type = 'error';
            }
       } else if (errorMessage.includes('User already registered') || errorMessage.includes('already exists')) {
            message = "This email is already registered. Please log in."; type = 'info';
            setIsSigningUp(false); // Switch to login
            setFormData(prev => ({ ...prev, password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: ''}));
            setTimeout(() => emailInputRef.current?.focus(), 100);
       } else if (errorMessage.includes('Password should be at least 6 characters')) {
            message = 'Password must be at least 6 characters long.'; type = 'error';
       } else if (errorMessage.includes('Unable to validate email address: invalid format')) {
            message = 'Please enter a valid email address.'; type = 'error';
       } else if (errorMessage.includes('Email rate limit exceeded') || errorMessage.includes('too many requests')) {
            message = 'Too many attempts. Please try again later.'; type = 'error';
       } else if (errorMessage.includes('check constraint') && errorMessage.includes('phone')) {
             message = 'Invalid phone number format provided.'; type = 'error';
       } else if (errorMessage.includes('profiles_pkey') || (errorMessage.includes('duplicate key') && errorMessage.includes('profiles'))) {
             message = 'Profile data could not be saved (user might already have one).'; type = 'error';
       } else if (errorMessage.includes('violates not-null constraint') && errorMessage.includes('full_name')) {
             message = 'Full Name is required.'; type = 'error';
       } else if (errorMessage.includes('violates not-null constraint') && errorMessage.includes('aadhar_number')) {
             message = 'Aadhar Number is required.'; type = 'error';
       // Add more specific error checks if needed
       } else if (errorMessage) { // Use the actual error message if not caught above
           message = errorMessage; type = 'error';
       }
       return { type, text: message };
   };

  // --- Authentication Handler (Supabase) ---
  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);
    setAuthLoading(true); // Start button loading
    const currentFormData = { ...formData };

    try {
      if (isSigningUp) {
        // --- Sign Up ---
         if (!currentFormData.full_name) throw new Error("Full name is required."); // Use throw for validation
         if (!currentFormData.aadhar_number) throw new Error("Aadhar number is required.");
         const aadharRegex = /^\d{12}$/;
         if (!aadharRegex.test(currentFormData.aadhar_number)) throw new Error("Please enter a valid 12-digit Aadhar number.");
         if (currentFormData.password.length < 6) throw new Error("Password must be at least 6 characters.");

        // 1. Sign up the user in Auth
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: currentFormData.email,
          password: currentFormData.password,
        });

        if (signUpError) throw signUpError;
        if (!signUpData.user) throw new Error("Signup successful but user data missing.");
        console.log('Auth signup successful for:', signUpData.user.email);

        // 2. Insert Profile Data
        let profileInsertSuccess = false;
        try {
            console.log('Attempting to insert profile for user:', signUpData.user.id);
            const { error: profileError } = await supabase.from('profiles').insert({
                    id: signUpData.user.id, email: signUpData.user.email,
                    full_name: currentFormData.full_name, phone: currentFormData.phone || null,
                    date_of_birth: currentFormData.date_of_birth || null,
                    aadhar_number: currentFormData.aadhar_number,
                });
            if (profileError) throw profileError;
            console.log('Supabase profile created successfully.');
            profileInsertSuccess = true;
        } catch (profileInsertError: any) {
            console.error('Error creating Supabase profile after signup:', profileInsertError.message);
            const profileFeedback = getFriendlyErrorMessage(profileInsertError);
            // Set specific feedback about profile failure
            setFeedback({ type: 'info', text: `Account created, but profile save failed: ${profileFeedback.text}. Please check email for verification.` });
            // Continue, account exists but profile needs fix/retry later maybe
        }

        // 3. Handle session / email verification feedback
        if (!signUpData.session) { // Email verification needed
            if (profileInsertSuccess && (!feedback || feedback.type !== 'info')) { // Don't overwrite profile error info
                 setFeedback({ type: 'success', text: 'Account created! Check your email (including spam) for a confirmation link.' });
            }
            setIsSigningUp(false); // Switch to login view after successful signup request
            setFormData(prev => ({ ...prev, password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' }));
            // *** Explicitly stop button loading here for verification case ***
            setAuthLoading(false);
        } else { // Auto-confirmed / logged in immediately
             if (profileInsertSuccess && (!feedback || feedback.type !== 'info')) {
                 setFeedback({ type: 'success', text: 'Account created successfully!' });
             }
             // *** Explicitly stop button loading here for auto-confirm case ***
             // The listener will handle the UI update (setting currentUser, profileData, main loading)
             setAuthLoading(false);
        }

      } else {
        // --- Log In ---
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: currentFormData.email,
          password: currentFormData.password,
        });

        if (signInError) throw signInError; // Let catch block handle

        console.log('Login request successful for:', signInData.user?.email);
        // *** Explicitly stop button loading on successful login request ***
        // The listener ('SIGNED_IN') handles fetching profile, UI update, main loading state
        setAuthLoading(false);
      }

    } catch (error: any) {
      console.error("Authentication/Signup Error:", error);
      const feedbackMessage = getFriendlyErrorMessage(error);
      setFeedback(feedbackMessage);

      // Focus logic based on error type and mode
      if (feedbackMessage.type === 'error') {
          if (isSigningUp) {
                if (error.message?.includes("Full name")) nameInputRef.current?.focus();
                else if (error.message?.includes("Aadhar")) aadharInputRef.current?.focus();
                else if (error.message?.includes("Password")) { /* Maybe focus password */ }
                else emailInputRef.current?.focus(); // Default to email for other signup errors
          } else { // Login mode errors
             emailInputRef.current?.focus();
             emailInputRef.current?.select();
          }
      }
      // *** Stop button loading on ANY error ***
      setAuthLoading(false);
    }
    // Note: No finally block needed here for authLoading, as it's handled in all success/error paths now.
  };

  // --- Logout Handler (Supabase) ---
  const handleLogout = async () => {
    setAuthLoading(true); // Start button loading
    setFeedback(null);
    try { // Wrap in try/finally
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Logout Error:', error.message);
            setFeedback({ type: 'error', text: "Failed to log out. Please try again." });
        } else {
             console.log('Logout successful request.');
             // State reset is handled by the 'SIGNED_OUT' listener
        }
    } catch (e: any) {
         console.error("Exception during logout:", e.message);
         setFeedback({ type: 'error', text: "An unexpected error occurred during logout." });
    } finally {
        // *** Stop button loading regardless of logout success/failure ***
        setAuthLoading(false);
    }
  };

  // --- Toggle Signup/Login View ---
  const toggleAuthMode = () => {
    const enteringSignupMode = !isSigningUp;
    setIsSigningUp(enteringSignupMode);
    setFormData(prev => ({
        email: prev.email, // Keep email
        password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' // Clear other fields
    }));
    setFeedback(null); // Clear feedback when toggling
    // Focus appropriate field after toggle
    setTimeout(() => {
        if (enteringSignupMode && nameInputRef.current) nameInputRef.current.focus();
        else if (!enteringSignupMode && emailInputRef.current) emailInputRef.current.focus();
    }, 100); // Timeout helps ensure element is visible/focusable
  }

  // --- Reusable Input Field Classes ---
  const inputClasses = (hasError: boolean = false) =>
    `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
      hasError ? 'border-red-500 ring-red-500' : 'border-gray-300'
    } disabled:bg-gray-100 disabled:cursor-not-allowed`;

  // --- Render Logic (JSX) ---
  return (
    <>
      {/* --- Overlay --- */}
      <div
        // Prevent closing if any loading is happening (initial or button action)
        onClick={authLoading || loading ? undefined : onClose}
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
             {/* Conditional Title based on state */}
            {loading && !currentUser ? 'Loading Account...' : // Initial loading state
             currentUser ? 'My Account' : // Logged in state
             isSigningUp ? 'Create Account' : // Signup form state
             'Log In' // Login form state
            }
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-500 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors"
            aria-label="Close sidebar"
            // Disable close during initial load OR during button actions
            disabled={authLoading || loading}
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
                 'bg-blue-50 border-blue-300 text-blue-800'
             }`}>
                 <AlertCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" />
                 <span>{feedback.text}</span>
             </div>
           )}

          {/* --- Loading Indicator (Only during initial load/listener processing) --- */}
          {loading && !authLoading && ( // Show main loading only if not also authLoading
            <div className="flex justify-center items-center py-10">
                 <Loader2 size={32} className="animate-spin text-orange-600" />
                 <span className="ml-3 text-gray-600">Loading data...</span>
            </div>
          )}

          {/* --- Logged In View --- */}
          {/* Render only if initial load done, user exists, and NOT in main loading state */}
          {!loading && currentUser ? (
            <div className="space-y-6">
              {/* Welcome Message */}
              <p className="text-gray-600 truncate">
                    Welcome, <span className='font-medium'>{profileData?.full_name || currentUser.email || 'User'}</span>!
                    {/* Maybe show profile loading indicator if profile is specifically refetching? */}
                    {/* {loading && !profileData && <Loader2 size={14} className="inline-block ml-2 animate-spin" />} */}
              </p>

              {/* Dashboard Navigation */}
              <nav className="space-y-2">
                 <button className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors ${activeSection === 'tracking' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`} onClick={() => setActiveSection('tracking')} disabled={authLoading}> <Truck size={18} className="mr-3 flex-shrink-0" /> Order Tracking </button>
                 <button className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors ${activeSection === 'delivery' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`} onClick={() => setActiveSection('delivery')} disabled={authLoading}> <MapPin size={18} className="mr-3 flex-shrink-0" /> Delivery Details </button>
                 <button className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors ${activeSection === 'orders' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`} onClick={() => setActiveSection('orders')} disabled={authLoading}> <ClipboardList size={18} className="mr-3 flex-shrink-0" /> My Orders </button>
              </nav>

              {/* Dashboard Content Display */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg min-h-[100px]">
                  {activeSection === 'tracking' && (<div><h3 className="text-lg font-semibold mb-2 text-gray-800">Order Tracking</h3><p className="text-sm text-gray-600">Tracking details will appear here.</p></div>)}
                  {activeSection === 'delivery' && (<div><h3 className="text-lg font-semibold mb-2 text-gray-800">Delivery Details</h3><p className="text-sm text-gray-600">Address management features coming soon.</p></div>)}
                  {activeSection === 'orders' && (<div><h3 className="text-lg font-semibold mb-2 text-gray-800">My Orders</h3><p className="text-sm text-gray-600">Your order history will be displayed here.</p></div>)}
                  {!activeSection && (<p className="text-sm text-gray-500 text-center pt-4">Select an option above to view details.</p>)}
              </div>

              {/* Logout Button */}
              <button onClick={handleLogout} disabled={authLoading} className="flex items-center justify-center w-full px-4 py-2 mt-6 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors disabled:opacity-50">
                  {authLoading ? <Loader2 size={18} className="mr-2 animate-spin" /> : <LogOut size={18} className="mr-2" />}
                  {authLoading ? 'Logging Out...' : 'Logout'}
              </button>
            </div>
          ) : (
            // --- Logged Out View (Login OR Signup Form) ---
             // Render form only if initial load done, no user, and NOT in main loading state
             !loading && !currentUser && (
               <form onSubmit={handleAuth} className="space-y-4">

                {/* --- Fields Visible ONLY in Signup Mode --- */}
                {isSigningUp && (
                    <>
                     <div>
                        <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-600">*</span></label>
                        <input ref={nameInputRef} id="full_name" name="full_name" type="text" value={formData.full_name} onChange={handleInputChange} placeholder="Your full name" className={inputClasses(feedback?.text.includes("Full name"))} required disabled={authLoading} />
                    </div>
                     <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number <span className="text-xs text-gray-500">(Optional)</span></label>
                        <input id="phone" name="phone" type="tel" value={formData.phone ?? ''} onChange={handleInputChange} placeholder="e.g., 9876543210" className={inputClasses()} disabled={authLoading} />
                    </div>
                     <div>
                        <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-1">Date of Birth <span className="text-xs text-gray-500">(Optional)</span></label>
                        <input id="date_of_birth" name="date_of_birth" type="date" value={formData.date_of_birth ?? ''} onChange={handleInputChange} max={new Date().toISOString().split("T")[0]} className={inputClasses()} disabled={authLoading} />
                    </div>
                    <div>
                        <label htmlFor="aadhar_number" className="block text-sm font-medium text-gray-700 mb-1">Aadhar Number <span className="text-red-600">*</span></label>
                        <input ref={aadharInputRef} id="aadhar_number" name="aadhar_number" type="text" inputMode="numeric" pattern="\d{12}" title="Enter 12-digit Aadhar number" value={formData.aadhar_number ?? ''} onChange={handleInputChange} placeholder="1234 5678 9012" className={inputClasses(feedback?.text.includes("Aadhar"))} required disabled={authLoading} />
                         <p className="text-xs text-gray-500 mt-1">Enter 12-digit number. <span className='font-semibold'>Handled securely.</span></p>
                    </div>
                    <hr className="my-2 border-gray-200"/>
                    </>
                )}

                 {/* --- Email Input (Always Visible) --- */}
                 <div>
                   <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-600">*</span></label>
                   <input ref={emailInputRef} id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="you@example.com" className={inputClasses(feedback?.type === 'error' && (feedback.text.includes('email') || feedback.text.includes('credentials')))} required disabled={authLoading} />
                 </div>

                 {/* --- Password Input (Always Visible) --- */}
                 <div>
                   <label htmlFor="password"className="block text-sm font-medium text-gray-700 mb-1">Password <span className="text-red-600">*</span></label>
                   <input id="password" name="password" type="password" value={formData.password} onChange={handleInputChange} placeholder={isSigningUp ? "Create password (min. 6 chars)" : "••••••••"} className={inputClasses(feedback?.type === 'error' && (feedback.text.includes('Password') || feedback.text.includes('credentials')))} required minLength={isSigningUp ? 6 : undefined} disabled={authLoading} />
                    {!isSigningUp && (
                        <div className="text-right mt-1">
                          <button type="button" className="text-sm text-orange-600 hover:underline focus:outline-none" onClick={() => setFeedback({type: 'info', text:'Password recovery feature coming soon!'})} disabled={authLoading}>Forgot password?</button>
                        </div>
                      )}
                 </div>

                 {/* --- Submit Button --- */}
                 <button type="submit" disabled={authLoading} className="w-full bg-orange-600 text-white py-2.5 px-4 rounded-lg font-semibold hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors disabled:opacity-70 flex items-center justify-center">
                    {authLoading && <Loader2 size={20} className="mr-2 animate-spin" />}
                    {/* Conditionally show icon based on mode */}
                    {!authLoading && isSigningUp && <UserPlus size={18} className="mr-2" />}
                    {!authLoading && !isSigningUp && <LogOut size={18} className="mr-2 transform rotate-180" />} {/* Using LogOut rotated for login */}
                    {authLoading ? 'Processing...' : (isSigningUp ? 'Sign Up' : 'Log In')}
                 </button>
               </form>
            )
          )}
        </div> {/* End Main Content Area */}

        {/* --- Footer / Toggle Auth Mode --- */}
        {/* Show toggle only if initial load done, not logged in, and NOT in main loading state */}
        {!loading && !currentUser && (
           <div className="p-4 border-t border-gray-200 text-center flex-shrink-0">
            <button onClick={toggleAuthMode} disabled={authLoading} className="text-sm text-orange-600 hover:underline focus:outline-none disabled:opacity-50">
              {isSigningUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        )}
         {/* Small spacer at the bottom */}
         <div className="flex-shrink-0 h-4 bg-white"></div>
      </div> {/* End Sidebar Panel */}
    </>
  );
};

export default Sidebar;