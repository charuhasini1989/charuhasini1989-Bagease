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
interface FormData {
    email: string;
    password: string;
    // Use string for form state, handle null conversion on submit if needed
    full_name: string;
    phone: string;
    date_of_birth: string;
    aadhar_number: string;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  // --- State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profileData, setProfileData] = useState<Profile | null>(null);
  const [formData, setFormData] = useState<FormData>({
      email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '',
  });
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  // `loading` for initial session check & major transitions (like logout)
  const [loading, setLoading] = useState<boolean>(true);
  // `authLoading` for disabling inputs/buttons during async auth actions (login/signup/logout clicks)
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [isSigningUp, setIsSigningUp] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string>('');
  const emailInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const aadharInputRef = useRef<HTMLInputElement>(null);

  // --- Helper: Fetch User Profile ---
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
      console.log(`FETCH_PROFILE: Fetching for user ID: ${userId}`);
      try {
          const { data, error, status } = await supabase
              .from('profiles') // Use your actual table name
              .select('full_name, phone, date_of_birth, aadhar_number, email')
              .eq('id', userId)
              .maybeSingle(); // Handles null gracefully if no profile found

          if (error && status !== 406) { // 406: 'Not found', expected if no profile yet
              console.error('FETCH_PROFILE: Error fetching profile:', error.message);
              return null; // Return null on error, let caller handle feedback
          }
          if (data) {
              console.log('FETCH_PROFILE: Success, data:', data);
              return data as Profile;
          }
          console.log('FETCH_PROFILE: No profile found.');
          return null; // No profile exists for this user yet
      } catch (err: any) {
          console.error('FETCH_PROFILE: Exception:', err.message);
          return null;
      }
  };


  // --- Listener for Auth State Changes & Profile Fetch ---
  useEffect(() => {
    setLoading(true); // Start loading for initial check
    console.log("AUTH_LISTENER: Initializing");

    // Check initial session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      console.log("AUTH_LISTENER: Initial getSession result", { session: !!session, error });
      if (error) console.error("AUTH_LISTENER: Error getting initial session:", error.message);
      const user = session?.user ?? null;
      setCurrentUser(user);

      if (user) {
        const profile = await fetchProfile(user.id);
        if (!profile) console.warn("AUTH_LISTENER: Initial load - user exists but profile fetch failed or returned null.");
        setProfileData(profile);
      } else {
        resetAuthState(false); // Reset form etc., keep potential old feedback
        setProfileData(null);
      }
      console.log("AUTH_LISTENER: Initial load complete.");
      setLoading(false); // Finish initial load check
    });

    // Listen for subsequent changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`AUTH_LISTENER: Event received - ${event}`, { session: !!session });
        const user = session?.user ?? null;
        let shouldSetLoading = false; // Flag to control setting loading state

        // Only set authLoading false if it wasn't already triggered by an error/manual step
        // Check if authLoading is currently true before setting it false, prevents flicker if already handled
        // setAuthLoading(false); // Removed from here, handled more specifically now

        try { // Wrap event handling in try/finally
          if (event === 'SIGNED_OUT' || !user) {
            console.log("AUTH_LISTENER: Handling SIGNED_OUT or no user");
            // Transitioning OUT of logged-in state, show loading briefly
            shouldSetLoading = true;
            setLoading(true);
            resetAuthState(); // Clear form, feedback etc.
            setProfileData(null);
            setCurrentUser(null); // Explicitly set user null
            setAuthLoading(false); // Ensure authLoading is off after logout completes listener processing

          } else if (event === 'SIGNED_IN') {
            console.log("AUTH_LISTENER: Handling SIGNED_IN for user:", user.id);
             // Don't set loading = true here, UI should update smoothly
            setAuthLoading(false); // Ensure button spinners/disables are turned off now that auth succeeded
            setFeedback(null); // Clear any previous feedback (like 'account not found')
            setFormData({ email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' }); // Clear form
            setIsSigningUp(false); // Ensure login mode
            setCurrentUser(user); // Update user state FIRST

            const profile = await fetchProfile(user.id); // Fetch profile
            if (!profile) {
                 console.warn("AUTH_LISTENER: SIGNED_IN - profile fetch failed or returned null.");
            }
            setProfileData(profile); // Set profile state (even if null)
            console.log("AUTH_LISTENER: SIGNED_IN processing complete.");

          } else if (event === 'USER_UPDATED' && user) {
            console.log("AUTH_LISTENER: Handling USER_UPDATED for user:", user.id);
             // Don't set loading = true, background update
            setCurrentUser(user); // Update user object if it changed
            const profile = await fetchProfile(user.id); // Re-fetch profile
            if (!profile) console.warn("AUTH_LISTENER: USER_UPDATED - profile fetch failed or returned null.");
            setProfileData(profile); // Update profile state
            console.log("AUTH_LISTENER: USER_UPDATED processing complete.");
             setAuthLoading(false); // Ensure authLoading is off if some async user update action triggered this

          } else if (event === 'PASSWORD_RECOVERY') {
              console.log("AUTH_LISTENER: Handling PASSWORD_RECOVERY");
              setFeedback({type: 'info', text: 'Password recovery email sent. Check your inbox.'});
              setAuthLoading(false); // Stop any loading indicator

          } else if (event === 'TOKEN_REFRESHED') {
               console.log("AUTH_LISTENER: Handling TOKEN_REFRESHED - typically no UI change needed.");
               // No need to set loading or fetch profile unless necessary for your app logic
               setAuthLoading(false); // Ensure authLoading is off

          } else {
             console.log(`AUTH_LISTENER: Event ${event} - no specific state change action taken.`);
             setAuthLoading(false); // Ensure authLoading is off for unhandled events too
          }
        } catch (listenerError) {
            console.error("AUTH_LISTENER: Error during event handling:", listenerError);
             setFeedback({ type: 'error', text: 'An error occurred updating account state.'})
             setAuthLoading(false); // Ensure loading is off on error
             // Only set general loading false if it was set true by this handler (e.g., SIGNED_OUT)
             if (shouldSetLoading) setLoading(false);
        } finally {
            console.log(`AUTH_LISTENER: Finished processing ${event}. Setting loading = ${!shouldSetLoading ? 'false (unchanged or set by specific case)' : 'false (was set true by this handler)'}.`);
            // Ensure loading is set to false *if* it was set to true *by this specific event handler* (e.g. SIGNED_OUT)
            // For SIGNED_IN and USER_UPDATED, loading state should ideally remain false.
            if (shouldSetLoading) {
                setLoading(false);
            }
        }
      }
    );

    return () => {
      console.log("AUTH_LISTENER: Unsubscribing");
      authListener?.subscription.unsubscribe();
    };
  }, []); // Run only on mount

  // Helper to reset state
  const resetAuthState = (clearFeedback = true) => {
      console.log("RESET_AUTH_STATE: Called");
      setActiveSection('');
      setFormData({ email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' });
      if (clearFeedback) setFeedback(null);
      setIsSigningUp(false);
      // Note: currentUser and profileData are cleared by the listener on SIGNED_OUT
  }

  // --- Body Scroll Lock ---
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

   // --- Input Change Handler ---
   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
   };


  // --- Map Supabase Errors ---
   const getFriendlyErrorMessage = (error: AuthError | Error | any, context: 'login' | 'signup' | 'profile'): { type: 'error' | 'info', text: string } => {
       // Simplified error mapping - context helps but main logic in handleAuth now
       let message = "An unexpected error occurred. Please try again.";
       let type: 'error' | 'info' = 'error';
       if (!error) return { type, text: message };
       const errorMessage = error.message || '';
       console.error(`GET_ERROR_MESSAGE (${context}): Raw error:`, errorMessage);

       if (errorMessage.includes('Invalid login credentials')) { message = "Invalid email or password."; type = 'error'; } // Generic login failure
       else if (errorMessage.includes('User already registered')) { message = "This email is already registered."; type = 'error'; } // Changed to error type
       else if (errorMessage.includes('Password should be at least 6 characters')) { message = 'Password must be at least 6 characters.'; type = 'error'; }
       else if (errorMessage.includes('Unable to validate email address: invalid format')) { message = 'Please enter a valid email address.'; type = 'error'; }
       else if (errorMessage.includes('Email rate limit exceeded')) { message = 'Too many attempts. Try again later.'; type = 'error'; }
       else if (errorMessage.includes('profiles_pkey') || (errorMessage.includes('duplicate key') && errorMessage.includes('profiles'))) { message = 'Failed to save profile (may already exist).'; type = 'error'; }
       else if (errorMessage.includes('violates not-null constraint') && errorMessage.includes('full_name')) { message = 'Full Name is required.'; type = 'error'; }
       else if (errorMessage.includes('violates not-null constraint') && errorMessage.includes('aadhar_number')) { message = 'Aadhar Number is required.'; type = 'error'; }
       else if (errorMessage.includes('check constraint') && errorMessage.includes('profiles_aadhar_format')) { message = 'Aadhar must be 12 digits.'; type = 'error'; }
       else { message = errorMessage; type = 'error'; } // Default to raw error message

       console.log(`GET_ERROR_MESSAGE (${context}): Friendly message:`, { type, message });
       return { type, text: message };
   };

  // --- Authentication Handler (Supabase) ---
  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);
    setAuthLoading(true); // Start action loading
    const currentFormData = { ...formData };
    const actionType = isSigningUp ? 'Signup' : 'Login';
    console.log(`HANDLE_AUTH: Starting ${actionType}`, { email: currentFormData.email });

    try {
      if (isSigningUp) {
        // --- Sign Up ---
        console.log("HANDLE_AUTH (Signup): Validating inputs...");
        // --- Client-Side Validation ---
         if (!currentFormData.full_name.trim()) throw new Error("Full name is required.");
         if (!currentFormData.aadhar_number.trim()) throw new Error("Aadhar number is required.");
         const aadharRegex = /^\d{12}$/;
         if (!aadharRegex.test(currentFormData.aadhar_number)) throw new Error("Please enter a valid 12-digit Aadhar number.");
         if (currentFormData.password.length < 6) throw new Error("Password must be at least 6 characters.");
        console.log("HANDLE_AUTH (Signup): Validation passed.");

        // 1. Sign up Auth
        console.log("HANDLE_AUTH (Signup): Calling supabase.auth.signUp...");
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: currentFormData.email, password: currentFormData.password,
        });
        if (signUpError) throw signUpError; // Let main catch handle
        if (!signUpData.user) throw new Error("Auth signup successful but user data missing.");
        console.log("HANDLE_AUTH (Signup): Auth signup successful for:", signUpData.user.id);

        // 2. Insert Profile
        console.log("HANDLE_AUTH (Signup): Attempting profile insert...");
        const { error: profileError } = await supabase.from('profiles').insert({
            id: signUpData.user.id, email: signUpData.user.email, full_name: currentFormData.full_name,
            phone: currentFormData.phone || null, date_of_birth: currentFormData.date_of_birth || null,
            aadhar_number: currentFormData.aadhar_number, // Required
        });
        if (profileError) {
            console.error("HANDLE_AUTH (Signup): Profile insert error", profileError);
            // Throw profile error to be caught by the outer catch block
            throw profileError;
        }
        console.log('HANDLE_AUTH (Signup): Profile insert successful.');

        // 3. Handle session / verification
        if (!signUpData.session) { // Email verification needed
            console.log("HANDLE_AUTH (Signup): Email verification required.");
            setFeedback({ type: 'success', text: 'Account created! Check email (inc spam) for confirmation link.' });
            setIsSigningUp(false); // Switch back to login view
            setFormData(prev => ({ ...prev, password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' }));
            setAuthLoading(false); // Stop loading manually here as listener won't fire SIGNED_IN yet
            console.log("HANDLE_AUTH (Signup): Finished processing (verification needed).");
        } else { // Auto-confirmed / logged in
            console.log("HANDLE_AUTH (Signup): Auto-confirmed or verification disabled. User logged in.");
            // Don't set feedback here, SIGNED_IN listener will trigger UI update
            // Listener ('SIGNED_IN') will handle profile fetch, and stop authLoading state.
            console.log("HANDLE_AUTH (Signup): Finished processing (auto-logged in). Listener will take over.");
            // setAuthLoading(false); // Let the listener handle this in SIGNED_IN
        }

      } else {
        // --- Log In ---
        console.log("HANDLE_AUTH (Login): Calling signInWithPassword...");
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: currentFormData.email, password: currentFormData.password,
        });

        if (signInError) {
            console.error("HANDLE_AUTH (Login): Sign in error", signInError);
            // Check if it's the "account not found" error specifically
            if (signInError.message.includes('Invalid login credentials')) {
                 console.log("HANDLE_AUTH (Login): Account not found, switching to signup mode.");
                 setFeedback({ type: 'info', text: "Account not found. Please complete the form below to sign up." });
                 setIsSigningUp(true); // Switch mode
                 setFormData(prev => ({ ...prev, password: '' })); // Clear password
                 setTimeout(() => nameInputRef.current?.focus(), 100); // Focus name
                 setAuthLoading(false); // Stop loading as we changed mode manually
                 return; // Exit handleAuth early
            } else {
                // Throw other login errors to the main catch block
                throw signInError;
            }
        }
        console.log('HANDLE_AUTH (Login): Login successful for:', signInData.user?.email);
        // Listener ('SIGNED_IN') will handle UI update, profile fetch, and stop authLoading state.
        // setAuthLoading(false); // Let the listener handle this in SIGNED_IN
      }

    } catch (error: any) {
      // Catch errors from validation, Auth calls, or profile insert
      console.error(`HANDLE_AUTH (Catch Block - ${actionType}): Error occurred`, error);
       // Determine context based on the 'isSigningUp' state *at the time of the error*
      const errorContext = isSigningUp ? 'signup' : 'login';
      // Check if it was a profile error during signup
      const isProfileErrorDuringSignup = isSigningUp && (error.message.includes('profiles_') || error.message.includes('constraint'));

      const feedbackMessage = getFriendlyErrorMessage(error, isProfileErrorDuringSignup ? 'profile' : errorContext);

      // Special handling for 'User already registered' during signup attempt
      if (isSigningUp && error.message.includes('User already registered')) {
          setFeedback({ type: 'error', text: "This email is already registered. Please log in." });
          setIsSigningUp(false); // Switch to login mode
          setFormData(prev => ({ ...prev, password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' }));
          setTimeout(() => emailInputRef.current?.focus(), 100);
      } else {
          setFeedback(feedbackMessage);
      }

      setAuthLoading(false); // Stop action loading on any error caught here

      // Focus logic
      if (!isSigningUp) { // If in login mode (or just switched back)
           if (emailInputRef.current && (feedbackMessage.text.includes('email') || feedbackMessage.text.includes('registered'))) emailInputRef.current.focus();
           else if (feedbackMessage.text.includes('password')) emailInputRef.current?.focus(); // Focus email on password error too for simplicity
      } else { // If in signup mode
           if (nameInputRef.current && error.message.includes('Full name')) nameInputRef.current.focus();
           else if (aadharInputRef.current && (error.message.includes('Aadhar') || error.message.includes('12-digit'))) aadharInputRef.current.focus();
           // Add more focusing logic if needed for other signup fields
      }
    }
    // No finally block needed for authLoading here as it's handled by listener success or catch block error
  };

  // --- Logout Handler ---
  const handleLogout = async () => {
    console.log("HANDLE_LOGOUT: Starting logout");
    setAuthLoading(true); // Start action loading for the button
    setFeedback(null);
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        console.log("HANDLE_LOGOUT: Logout successful (listener will handle state reset)");
        // Listener ('SIGNED_OUT') handles state reset and stops authLoading state.
    } catch(error: any) {
        console.error('HANDLE_LOGOUT: Logout Error:', error.message);
        setFeedback({ type: 'error', text: "Failed to log out. Please try again." });
        setAuthLoading(false); // Stop loading only on error, listener handles on success
    }
  };

  // --- Toggle Signup/Login View ---
  const toggleAuthMode = () => {
    const enteringSignupMode = !isSigningUp;
    console.log(`TOGGLE_AUTH_MODE: Switching to ${enteringSignupMode ? 'Signup' : 'Login'}`);
    setIsSigningUp(enteringSignupMode);
    // Keep email, clear others
    setFormData(prev => ({ email: prev.email, password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' }));
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

  // --- Render Logic (JSX) ---
  return (
    <>
      {/* Overlay */}
      <div onClick={authLoading || (loading && !currentUser) ? undefined : onClose} className={`fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm transition-opacity duration-300 z-40 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} aria-hidden={!isOpen} />

      {/* Sidebar Panel */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`} role="dialog" aria-modal="true" aria-labelledby="sidebar-title">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h2 id="sidebar-title" className="text-xl font-semibold text-gray-800">
            {/* Show 'Loading...' only during the very initial session check */}
            {loading && !currentUser ? 'Loading...' :
             /* Show 'Processing...' if a button action is in progress */
             authLoading ? 'Processing...' :
             /* Otherwise, show state based on currentUser */
             currentUser ? 'My Account' :
             isSigningUp ? 'Create Account' : 'Log In'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors" aria-label="Close sidebar"
           // Disable close only if an auth action is running OR it's the initial load
           disabled={authLoading || (loading && !currentUser)} >
             <X size={24} />
           </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-grow p-6 overflow-y-auto">
          {/* Feedback */}
          {feedback && ( <div className={`mb-4 p-3 border rounded-md text-sm flex items-start ${ feedback.type === 'error' ? 'bg-red-50 border-red-300 text-red-800' : feedback.type === 'success' ? 'bg-green-50 border-green-300 text-green-800' : 'bg-blue-50 border-blue-300 text-blue-800' }`}> <AlertCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" /> <span>{feedback.text}</span> </div> )}

          {/* Initial Loading Indicator - Show ONLY during initial load */}
          {loading && !currentUser && !authLoading && ( <div className="flex justify-center items-center py-10"> <Loader2 size={32} className="animate-spin text-orange-600" /> </div> )}

          {/* Logged In View - Show if NOT initial loading AND currentUser exists */}
          {!loading && currentUser ? (
            <div className="space-y-6">
              {/* Welcome Message */}
               <p className="text-gray-600 truncate"> Welcome, <span className='font-medium'>{profileData?.full_name || currentUser.email}</span>! </p>

              {/* Dashboard Navigation */}
              <nav className="space-y-2">
                 <button className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors ${activeSection === 'tracking' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`} onClick={() => setActiveSection('tracking')} disabled={authLoading}> <Truck size={18} className="mr-3 flex-shrink-0" /> Order Tracking </button>
                 <button className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors ${activeSection === 'delivery' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`} onClick={() => setActiveSection('delivery')} disabled={authLoading}> <MapPin size={18} className="mr-3 flex-shrink-0" /> Delivery Details </button>
                 <button className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors ${activeSection === 'orders' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`} onClick={() => setActiveSection('orders')} disabled={authLoading}> <ClipboardList size={18} className="mr-3 flex-shrink-0" /> My Orders </button>
              </nav>

              {/* Dashboard Content Display */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg min-h-[100px]">
                  {activeSection === 'tracking' && (<div><h3 className="text-lg font-semibold mb-2 text-gray-800">Order Tracking</h3><p className="text-sm text-gray-600">Tracking details here.</p></div>)}
                  {activeSection === 'delivery' && (<div><h3 className="text-lg font-semibold mb-2 text-gray-800">Delivery Details</h3><p className="text-sm text-gray-600">Manage addresses here.</p></div>)}
                  {activeSection === 'orders' && (<div><h3 className="text-lg font-semibold mb-2 text-gray-800">My Orders</h3><p className="text-sm text-gray-600">Order history here.</p></div>)}
                  {!activeSection && (<p className="text-sm text-gray-500 text-center pt-4">Select an option.</p>)}
              </div>

              {/* Logout Button */}
              <button onClick={handleLogout} disabled={authLoading} className="flex items-center justify-center w-full px-4 py-2 mt-6 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors disabled:opacity-50">
                  {/* Show spinner ONLY if authLoading is true (logout button clicked) */}
                  {authLoading ? <Loader2 size={18} className="mr-2 animate-spin" /> : <LogOut size={18} className="mr-2" />}
                  {authLoading ? 'Processing...' : 'Logout'}
              </button>
            </div>
          ) : (
            // --- Logged Out View (Login OR Signup Form) ---
             // Show if NOT initial loading AND no currentUser
             !loading && !currentUser && (
               <form onSubmit={handleAuth} className="space-y-4">
                {/* Signup Fields */}
                {isSigningUp && ( <> <div><label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label><input ref={nameInputRef} id="full_name" name="full_name" type="text" value={formData.full_name} onChange={handleInputChange} placeholder="Your full name" className={inputClasses()} required disabled={authLoading} /></div><div><label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-xs text-gray-500">(Optional)</span></label><input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} placeholder="e.g., 9876543210" className={inputClasses()} disabled={authLoading} /></div><div><label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-1">Date of Birth <span className="text-xs text-gray-500">(Optional)</span></label><input id="date_of_birth" name="date_of_birth" type="date" value={formData.date_of_birth} onChange={handleInputChange} max={new Date().toISOString().split("T")[0]} className={inputClasses()} disabled={authLoading} /></div><div><label htmlFor="aadhar_number" className="block text-sm font-medium text-gray-700 mb-1">Aadhar Number</label><input ref={aadharInputRef} id="aadhar_number" name="aadhar_number" type="text" inputMode="numeric" pattern="\d{12}" title="Enter 12-digit Aadhar number" value={formData.aadhar_number} onChange={handleInputChange} placeholder="1234 5678 9012" className={inputClasses()} required disabled={authLoading} /><p className="text-xs text-gray-500 mt-1">Enter 12-digit number. <span className='font-semibold'>Handled securely.</span></p></div><hr className="my-2 border-gray-200"/> </> )}
                {/* Email */}
                <div><label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label><input ref={emailInputRef} id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="you@example.com" className={inputClasses(feedback?.type === 'error' && !isSigningUp)} required disabled={authLoading} /></div>
                {/* Password */}
                <div><label htmlFor="password"className="block text-sm font-medium text-gray-700 mb-1">Password</label><input id="password" name="password" type="password" value={formData.password} onChange={handleInputChange} placeholder={isSigningUp ? "Create password (min. 6 chars)" : "••••••••"} className={inputClasses(feedback?.type === 'error' && !isSigningUp)} required minLength={isSigningUp ? 6 : undefined} disabled={authLoading} />{!isSigningUp && ( <div className="text-right mt-1"><button type="button" className="text-sm text-orange-600 hover:underline focus:outline-none" onClick={() => setFeedback({type: 'info', text:'Password recovery coming soon!'})} disabled={authLoading}>Forgot password?</button></div> )}</div>
                {/* Submit Button */}
                <button type="submit" disabled={authLoading} className="w-full bg-orange-600 text-white py-2.5 px-4 rounded-lg font-semibold hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors disabled:opacity-70 flex items-center justify-center">
                  {/* Show spinner ONLY if authLoading is true (button action running) */}
                  {authLoading && <Loader2 size={20} className="mr-2 animate-spin" />}
                  {!authLoading && isSigningUp && <UserPlus size={18} className="mr-2" />}
                  {authLoading ? 'Processing...' : (isSigningUp ? 'Sign Up' : 'Log In')}
                </button>
               </form>
            )
          )}
        </div> {/* End Main Content Area */}

        {/* Footer */}
        {/* Show if NOT initial loading AND no currentUser */}
        {!loading && !currentUser && ( <div className="p-4 border-t border-gray-200 text-center flex-shrink-0"> <button onClick={toggleAuthMode} disabled={authLoading} className="text-sm text-orange-600 hover:underline focus:outline-none disabled:opacity-50"> {isSigningUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"} </button> </div> )}
        <div className="flex-shrink-0 h-4"></div> {/* Adds some padding at the bottom */}
      </div> {/* End Sidebar Panel */}
    </>
  );
};

export default Sidebar;