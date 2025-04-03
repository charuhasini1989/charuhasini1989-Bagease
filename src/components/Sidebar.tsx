// src/components/Sidebar.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react'; // Added useCallback
import { X, Truck, MapPin, LogOut, ClipboardList, Loader2, AlertCircle, UserPlus } from 'lucide-react';
import { supabase } from '../supabase'; // Ensure this path is correct
import { User, AuthError, Session } from '@supabase/supabase-js'; // Added Session type

// --- Interfaces (keep as is) ---
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}
interface FeedbackMessage {
    type: 'error' | 'success' | 'info';
    text: string;
}
interface Profile {
    id?: string;
    full_name: string | null;
    phone: string | null;
    date_of_birth: string | null;
    aadhar_number: string | null;
    email?: string | null;
}
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
  const [isSigningUp, setIsSigningUp] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string>('');

  // --- Granular Loading States ---
  const [initialLoading, setInitialLoading] = useState<boolean>(true); // For initial session check
  const [authActionLoading, setAuthActionLoading] = useState<boolean>(false); // For Login/Signup/Logout button actions
  const [profileLoading, setProfileLoading] = useState<boolean>(false); // For fetching profile data *after* login/update

  // --- Refs ---
  const emailInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const aadharInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null); // Added

  // --- Helper: Reset Auth State ---
  // Use useCallback to stabilize the function reference for useEffect dependency
  const resetAuthState = useCallback((clearFeedback = true) => {
      console.log('(Helper) Resetting Auth State');
      setActiveSection('');
      setFormData({ email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' });
      if (clearFeedback) setFeedback(null);
      setIsSigningUp(false);
      setAuthActionLoading(false); // Also ensure button loading is reset
      // currentUser and profileData are handled by the auth listener
  }, []); // No dependencies needed

  // --- Helper: Fetch User Profile ---
  // Use useCallback to stabilize the function reference
  const fetchProfile = useCallback(async (userId: string, isMountedCheck?: () => boolean): Promise<Profile | null> => {
      console.log(`(Helper) Fetching profile for user ID: ${userId}`);
      setProfileLoading(true); // Start profile-specific loading
      // Optionally clear feedback before fetching profile, or keep existing important ones
      // setFeedback(null);

      // Safety check if component might unmount during async operation
      if (isMountedCheck && !isMountedCheck()) {
          console.log("(Helper fetchProfile) Component unmounted before fetch could complete fully.");
          // Don't set loading false here, as the effect cleanup will handle it if needed
          return null;
      }

      try {
          // *** RLS IS CRITICAL HERE - Ensure SELECT policy exists for authenticated users on 'profiles' table ***
          const { data, error, status } = await supabase
              .from('profiles')
              .select('full_name, phone, date_of_birth, aadhar_number, email')
              .eq('id', userId)
              .maybeSingle();

          // Check mount status again after await
          if (isMountedCheck && !isMountedCheck()) return null;

          if (error && status !== 406) {
              console.error('(Helper fetchProfile) Error fetching profile:', error.message, status);
              setFeedback({ type: 'error', text: `Could not load profile: ${error.message}. Check RLS.` });
              return null;
          }
          if (data) {
              console.log('(Helper fetchProfile) Profile data fetched:', data);
              return data as Profile;
          }
          console.log('(Helper fetchProfile) No profile found for user.');
          return null;
      } catch (err: any) {
          console.error('(Helper fetchProfile) Exception during profile fetch:', err.message);
          if (isMountedCheck && !isMountedCheck()) return null; // Check again
          setFeedback({ type: 'error', text: 'An error occurred fetching your profile.' });
          return null;
      } finally {
          // Ensure profile loading stops regardless of success/error
          // Check mount status one last time before setting state
          if (!isMountedCheck || isMountedCheck()) {
             console.log("(Helper fetchProfile) Setting profileLoading to false.");
             setProfileLoading(false);
          } else {
             console.log("(Helper fetchProfile) Component unmounted, skipping final setProfileLoading(false).")
          }
      }
  }, []); // No dependencies needed

  // --- Listener for Auth State Changes & Profile Fetch ---
  useEffect(() => {
    let isMounted = true;
    console.log("Effect Mount: Initializing auth check...");
    setInitialLoading(true); // Start initial loading indicator
    setProfileData(null);
    setCurrentUser(null);

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
       if (!isMounted) { console.log("Effect getSession: Unmounted."); return; }
       console.log("Effect: getSession completed.");

       if (error) {
          console.error("Effect getSession: ERROR", error);
          setCurrentUser(null); setProfileData(null); resetAuthState(false);
          setFeedback({ type: 'error', text: 'Failed to check session.' });
          setInitialLoading(false); // <<< Stop initial loading on error
          return;
       }

       const user = session?.user ?? null;
       console.log('Effect getSession: User ID:', user?.id || 'None');
       setCurrentUser(user); // Set user state

       if (user) {
          console.log('Effect getSession: User exists, fetching profile...');
          try {
             const profile = await fetchProfile(user.id, () => isMounted); // Pass mount check
             if (isMounted) setProfileData(profile); // Set profile only if still mounted
             console.log('Effect getSession: Profile fetch attempt finished.');
          } catch (profileError) {
             console.error("Effect getSession: Error during initial profile fetch:", profileError);
             if (isMounted) {
                 setProfileData(null);
                 setFeedback({ type: 'error', text: 'Could not load profile data.' });
             }
          }
       } else {
          console.log('Effect getSession: No user found.');
          if (isMounted) resetAuthState(false);
       }

       // Stop initial loading indicator AFTER session check and potential profile fetch
       if (isMounted) {
          console.log("Effect getSession: Setting initialLoading to FALSE.");
          setInitialLoading(false); // <<< Stop initial loading
       }

    }).catch(exception => {
       if (!isMounted) { console.log("Effect getSession Catch: Unmounted."); return; }
       console.error("Effect getSession: EXCEPTION", exception);
       setCurrentUser(null); setProfileData(null); resetAuthState(false);
       setFeedback({ type: 'error', text: 'Error checking session.' });
       setInitialLoading(false); // <<< Stop initial loading on exception
    });

    // --- Listener for subsequent changes ---
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
         if (!isMounted) { console.log("Effect Listener: Unmounted."); return; }
         console.log(`Effect Listener: Event: ${event}`, session?.user?.id || 'No user');

         const user = session?.user ?? null;
         setCurrentUser(user); // Update user state immediately

         switch (event) {
            case 'SIGNED_IN':
               // Don't set general loading here, profile fetch has its own
               setFeedback(null);
               setFormData(prev => ({ ...prev, password: '' })); // Clear password
               setIsSigningUp(false); // Ensure login mode
               if (user) {
                  console.log('Effect Listener SIGNED_IN: Fetching profile...');
                  const profile = await fetchProfile(user.id, () => isMounted); // Fetch profile
                  if (isMounted) setProfileData(profile);
               } else {
                  if (isMounted) setProfileData(null);
               }
               // Reset auth action loading IF it was somehow stuck, though it shouldn't be
               if (isMounted && authActionLoading) setAuthActionLoading(false);
               break;

            case 'SIGNED_OUT':
               if (isMounted) {
                   console.log('Effect Listener SIGNED_OUT: Resetting state.');
                   setProfileData(null); // Clear profile
                   resetAuthState(); // Reset form, mode, feedback, authloading
                   // No need to set profileLoading false, fetchProfile wasn't called
               }
               break;

            case 'USER_UPDATED':
                if (user) {
                   console.log('Effect Listener USER_UPDATED: Re-fetching profile...');
                   const profile = await fetchProfile(user.id, () => isMounted);
                   if (isMounted) setProfileData(profile);
                }
               break;

             case 'PASSWORD_RECOVERY':
                if (isMounted) setFeedback({ type: 'info', text: 'Password recovery email sent.' });
                break;

             // TOKEN_REFRESHED usually doesn't need UI changes
         }

         // Ensure initial loading is off if an event fires quickly after mount
         if (isMounted && initialLoading) {
            console.log("Effect Listener: Setting initialLoading false (backup).");
            setInitialLoading(false);
         }
      }
    );

    // Cleanup
    return () => {
      console.log("Effect Cleanup: Unmounting component.");
      isMounted = false;
      authListener?.subscription.unsubscribe();
      console.log('Effect Cleanup: Auth listener unsubscribed');
    };
  }, [fetchProfile, resetAuthState]); // Add stable helpers to dependency array

  // --- Body Scroll Lock ---
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = originalOverflow; // Restore original on close
    }
    return () => {
      document.body.style.overflow = originalOverflow; // Restore original on unmount
    };
  }, [isOpen]);

   // --- Input Change Handler ---
   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
   };

  // --- Map Supabase Errors ---
   const getFriendlyErrorMessage = (error: AuthError | Error | any): { type: 'error' | 'info', text: string } => {
      // Keep your existing detailed error mapping logic here - it's good!
       let message = "An unexpected error occurred. Please try again.";
       let type: 'error' | 'info' = 'error';
       if (!error) return { type, text: message };
       const errorMessage = error.message || String(error) || '';
       console.error('Supabase Auth/DB Error:', errorMessage, error); // Log full error

       if (errorMessage.includes('Invalid login credentials')) {
             message = "Incorrect email or password. Please try again."; type = 'error'; // Changed from switching to signup
             // Focus password on error
             setTimeout(() => passwordInputRef.current?.focus(), 100);

       } else if (errorMessage.includes('User already registered') || errorMessage.includes('already exists')) {
            message = "This email is already registered. Please log in."; type = 'info';
            setIsSigningUp(false);
            setFormData(prev => ({ ...prev, password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: ''}));
            setTimeout(() => emailInputRef.current?.focus(), 100);
       } else if (errorMessage.includes('Password should be at least 6 characters')) {
            message = 'Password must be at least 6 characters long.'; type = 'error';
            setTimeout(() => passwordInputRef.current?.focus(), 100);
       } else if (errorMessage.includes('Unable to validate email address: invalid format')) {
            message = 'Please enter a valid email address.'; type = 'error';
            setTimeout(() => emailInputRef.current?.focus(), 100);
       } else if (errorMessage.includes('Email rate limit exceeded') || errorMessage.includes('too many requests')) {
            message = 'Too many attempts. Please try again later.'; type = 'error';
       } else if (errorMessage.includes('check constraint') && errorMessage.includes('phone')) {
             message = 'Invalid phone number format provided.'; type = 'error';
       } else if (errorMessage.includes('profiles_pkey') || (errorMessage.includes('duplicate key') && errorMessage.includes('profiles'))) {
             message = 'Profile data could not be saved (user might already have one).'; type = 'error';
       } else if (errorMessage.includes('violates not-null constraint') && errorMessage.includes('full_name')) {
             message = 'Full Name is required.'; type = 'error';
             setTimeout(() => nameInputRef.current?.focus(), 100);
       } else if (errorMessage.includes('violates not-null constraint') && errorMessage.includes('aadhar_number')) {
             message = 'Aadhar Number is required.'; type = 'error';
             setTimeout(() => aadharInputRef.current?.focus(), 100);
       } else if (errorMessage.includes('12-digit Aadhar')) { // Catch custom validation message
            message = errorMessage; type = 'error';
            setTimeout(() => aadharInputRef.current?.focus(), 100);
       } else if (errorMessage) { // Use the actual error message if not caught above
           message = errorMessage; type = 'error';
       }
       return { type, text: message };
   };

  // --- Authentication Handler (Supabase) ---
  const handleAuth = async (e: React.FormEvent<H TMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);
    setAuthActionLoading(true); // Start button loading
    const currentFormData = { ...formData }; // Snapshot form data

    try {
      if (isSigningUp) {
        // --- Sign Up ---
        // Client-Side Validation (as before)
         if (!currentFormData.full_name?.trim()) throw new Error("Full Name is required.");
         if (!currentFormData.aadhar_number?.trim()) throw new Error("Aadhar number is required.");
         const aadharRegex = /^\d{12}$/;
         if (!aadharRegex.test(currentFormData.aadhar_number)) throw new Error("Please enter a valid 12-digit Aadhar number.");
         if (currentFormData.password.length < 6) throw new Error("Password must be at least 6 characters.");

        // 1. Sign up Auth
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: currentFormData.email.trim(),
          password: currentFormData.password,
        });

        if (signUpError) throw signUpError;
        if (!signUpData.user) throw new Error("Signup successful but user data missing.");
        console.log('(handleAuth) Auth signup successful:', signUpData.user.email);

        // 2. Insert Profile Data (separate try/catch is good)
        let profileInsertSuccess = false;
        try {
            console.log('(handleAuth) Attempting profile insert:', signUpData.user.id);
             // *** RLS INSERT POLICY NEEDED ***
            const { error: profileError } = await supabase.from('profiles').insert({
                    id: signUpData.user.id, email: signUpData.user.email,
                    full_name: currentFormData.full_name.trim(),
                    phone: currentFormData.phone?.trim() || null,
                    date_of_birth: currentFormData.date_of_birth || null,
                    aadhar_number: currentFormData.aadhar_number.trim(),
                });
            if (profileError) throw profileError; // Throw to be caught below
            console.log('(handleAuth) Profile insert successful.');
            profileInsertSuccess = true;
        } catch (profileInsertError: any) {
            console.error('(handleAuth) Profile insert ERROR:', profileInsertError);
            const profileFeedback = getFriendlyErrorMessage(profileInsertError);
            setFeedback({ type: 'info', text: `Account created, but profile save failed: ${profileFeedback.text}. Check email for verification.` });
            // Don't return, let session check proceed
        }

        // 3. Handle session / verification feedback
        if (!signUpData.session) { // Email verification needed
            if (profileInsertSuccess && (!feedback || feedback.type !== 'info')) {
                 setFeedback({ type: 'success', text: 'Account created! Check email for confirmation link.' });
            }
            setIsSigningUp(false);
            setFormData(prev => ({ ...prev, password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' }));
            // Explicitly stop button loading here, as listener won't fire SIGNED_IN yet
            // setAuthActionLoading(false); // MOVED TO FINALLY
        } else { // Auto-confirmed / logged in
             if (profileInsertSuccess && (!feedback || feedback.type !== 'info')) {
                 setFeedback({ type: 'success', text: 'Account created successfully!' });
             }
             // Listener ('SIGNED_IN') will handle profile fetch and UI update.
             // It should also reset authActionLoading if needed.
        }

      } else {
        // --- Log In ---
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: currentFormData.email.trim(),
          password: currentFormData.password,
        });

        if (signInError) throw signInError;
        console.log('(handleAuth) Login successful request for:', signInData.user?.email);
        // Listener ('SIGNED_IN') handles UI updates.
      }

    } catch (error: any) {
      // Catch errors from Auth OR profile insert
      console.error("(handleAuth) Error caught:", error);
      const feedbackMessage = getFriendlyErrorMessage(error);
      setFeedback(feedbackMessage);
      // Focus logic based on error (already in getFriendlyErrorMessage)

    } finally {
      // *** ENSURE auth loading stops regardless of success/error/path ***
      console.log("(handleAuth) Finally block: Setting authActionLoading to false.");
      setAuthActionLoading(false);
    }
  };

  // --- Logout Handler (Supabase) ---
  const handleLogout = async () => {
    setFeedback(null);
    setAuthActionLoading(true); // Start button loading
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('(handleLogout) Logout Error:', error.message);
        setFeedback({ type: 'error', text: `Logout failed: ${error.message}` });
      } else {
        console.log('(handleLogout) Logout successful request.');
        // State reset handled by 'SIGNED_OUT' listener.
      }
    } catch (e: any) {
      console.error("(handleLogout) Exception:", e.message);
      setFeedback({ type: 'error', text: "An unexpected error occurred during logout." });
    } finally {
      // *** ENSURE auth loading stops ***
      console.log("(handleLogout) Finally block: Setting authActionLoading to false.");
      setAuthActionLoading(false);
    }
  };

  // --- Toggle Signup/Login View ---
  const toggleAuthMode = () => {
    const enteringSignupMode = !isSigningUp;
    setIsSigningUp(enteringSignupMode);
    setFormData(prev => ({
        email: prev.email, // Keep email
        password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: ''
    }));
    setFeedback(null);
    setTimeout(() => { // Focus after state update renders
        if (enteringSignupMode && nameInputRef.current) nameInputRef.current.focus();
        else if (!enteringSignupMode && emailInputRef.current) emailInputRef.current.focus();
    }, 100);
  }

  // --- Reusable Input Field Classes ---
  const inputClasses = (hasError: boolean = false) =>
    `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors text-gray-800 placeholder-gray-400 ${ // Added text/placeholder colors
      hasError ? 'border-red-500 ring-red-500' : 'border-gray-300'
    } disabled:bg-gray-100 disabled:cursor-not-allowed`;

  // --- Combined Loading State for Disabling Navigation/Content ---
  const isBusy = authActionLoading || profileLoading;

  // --- Render Logic (JSX) ---
  return (
    <>
      {/* --- Overlay --- */}
      <div
        // Disable close during initial load OR specific auth actions
        onClick={initialLoading || authActionLoading ? undefined : onClose}
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
             {/* Use granular loading state */}
             {initialLoading ? 'Loading...' : (currentUser ? 'My Account' : (isSigningUp ? 'Create Account' : 'Log In'))}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-500 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors"
            aria-label="Close sidebar"
            // Disable close during initial load OR specific auth actions
            disabled={initialLoading || authActionLoading}
          >
            <X size={24} />
          </button>
        </div>

        {/* --- Main Content Area (Scrollable) --- */}
        <div className="flex-grow p-6 overflow-y-auto">

          {/* --- Feedback Display Area (Keep as is) --- */}
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

          {/* --- Initial Loading Indicator --- */}
          {initialLoading && (
            <div className="flex justify-center items-center py-10">
                 <Loader2 size={32} className="animate-spin text-orange-600" />
            </div>
          )}

          {/* --- Logged In View --- */}
          {/* Render only if initial load done AND user exists */}
          {!initialLoading && currentUser ? (
            <div className="space-y-6">
              {/* Welcome Message & Profile Loading Indicator */}
              <div className="flex items-center justify-between">
                 <p className="text-gray-600 truncate">
                     Welcome, <span className='font-medium text-gray-800'>{profileData?.full_name || currentUser.email || 'User'}</span>!
                 </p>
                 {/* Show spinner only when profile is actively loading */}
                 {profileLoading && <Loader2 size={16} className="animate-spin text-orange-500 ml-2" />}
              </div>


              {/* Dashboard Navigation */}
              <nav className="space-y-2">
                 {/* Disable nav buttons if profile loading OR an auth action is happening */}
                 <button className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors disabled:opacity-50 ${activeSection === 'tracking' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`} onClick={() => setActiveSection('tracking')} disabled={isBusy}> <Truck size={18} className="mr-3 flex-shrink-0" /> Order Tracking </button>
                 <button className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors disabled:opacity-50 ${activeSection === 'delivery' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`} onClick={() => setActiveSection('delivery')} disabled={isBusy}> <MapPin size={18} className="mr-3 flex-shrink-0" /> Delivery Details </button>
                 <button className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors disabled:opacity-50 ${activeSection === 'orders' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`} onClick={() => setActiveSection('orders')} disabled={isBusy}> <ClipboardList size={18} className="mr-3 flex-shrink-0" /> My Orders </button>
              </nav>

              {/* Dashboard Content Display */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg min-h-[100px]">
                  {/* Show placeholder content based on activeSection */}
                  {activeSection === 'tracking' && (<div><h3 className="text-lg font-semibold mb-2 text-gray-800">Order Tracking</h3><p className="text-sm text-gray-600">Tracking details here.</p></div>)}
                  {activeSection === 'delivery' && (<div><h3 className="text-lg font-semibold mb-2 text-gray-800">Delivery Details</h3><p className="text-sm text-gray-600">Manage addresses here.</p></div>)}
                  {activeSection === 'orders' && (<div><h3 className="text-lg font-semibold mb-2 text-gray-800">My Orders</h3><p className="text-sm text-gray-600">Order history here.</p></div>)}
                  {/* Show prompt or loader */}
                  {!activeSection && !profileLoading && (<p className="text-sm text-gray-500 text-center pt-4">Select an option.</p>)}
                  {profileLoading && activeSection && (<div className="flex justify-center items-center h-[80px]"><Loader2 size={24} className="animate-spin text-orange-500"/></div>)}
              </div>

              {/* Logout Button */}
              <button
                  onClick={handleLogout}
                  // Disable ONLY when logout action is loading
                  disabled={authActionLoading}
                  className="flex items-center justify-center w-full px-4 py-2 mt-6 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors disabled:opacity-50"
                >
                  {authActionLoading ? <Loader2 size={18} className="mr-2 animate-spin" /> : <LogOut size={18} className="mr-2" />}
                  {authActionLoading ? 'Logging Out...' : 'Logout'}
              </button>
            </div>
          ) : (
            // --- Logged Out View (Login OR Signup Form) ---
             // Render only if initial load done AND no user
             !initialLoading && !currentUser && (
               <form onSubmit={handleAuth} className="space-y-4">

                {/* --- Fields Visible ONLY in Signup Mode --- */}
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
                        <input id="date_of_birth" name="date_of_birth" type="date" value={formData.date_of_birth ?? ''} onChange={handleInputChange} max={new Date().toISOString().split("T")[0]} className={inputClasses()} disabled={authActionLoading} />
                    </div>
                    <div>
                        <label htmlFor="aadhar_number" className="block text-sm font-medium text-gray-700 mb-1">Aadhar Number <span className="text-red-600">*</span></label>
                        <input ref={aadharInputRef} id="aadhar_number" name="aadhar_number" type="text" inputMode="numeric" pattern="\d{12}" title="Enter 12-digit Aadhar number" value={formData.aadhar_number ?? ''} onChange={handleInputChange} placeholder="1234 5678 9012" className={inputClasses(feedback?.text.includes("Aadhar"))} required disabled={authActionLoading} />
                         <p className="text-xs text-gray-500 mt-1">Enter 12-digit number. <span className='font-semibold'>Handled securely.</span></p>
                    </div>
                    <hr className="my-2 border-gray-200"/>
                    </>
                )}

                 {/* --- Email Input (Always Visible) --- */}
                 <div>
                   <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-600">*</span></label>
                   <input ref={emailInputRef} id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="you@example.com" className={inputClasses(feedback?.type === 'error' && (feedback.text.includes('email') || feedback.text.includes('credentials')))} required disabled={authActionLoading} />
                 </div>

                 {/* --- Password Input (Always Visible) --- */}
                 <div>
                   <label htmlFor="password"className="block text-sm font-medium text-gray-700 mb-1">Password <span className="text-red-600">*</span></label>
                   <input ref={passwordInputRef} id="password" name="password" type="password" value={formData.password} onChange={handleInputChange} placeholder={isSigningUp ? "Create password (min. 6 chars)" : "••••••••"} className={inputClasses(feedback?.type === 'error' && (feedback.text.includes('Password') || feedback.text.includes('credentials')))} required minLength={isSigningUp ? 6 : undefined} disabled={authActionLoading} />
                    {!isSigningUp && (
                        <div className="text-right mt-1">
                          <button type="button" className="text-sm text-orange-600 hover:underline focus:outline-none" onClick={() => setFeedback({type: 'info', text:'Password recovery coming soon!'})} disabled={authActionLoading}>Forgot password?</button>
                        </div>
                      )}
                 </div>

                 {/* --- Submit Button --- */}
                 <button
                     type="submit"
                     // Disable ONLY when the specific auth action is loading
                     disabled={authActionLoading}
                     className="w-full bg-orange-600 text-white py-2.5 px-4 rounded-lg font-semibold hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors disabled:opacity-70 flex items-center justify-center"
                  >
                    {authActionLoading && <Loader2 size={20} className="mr-2 animate-spin" />}
                    {/* Add login icon back */}
                    {!authActionLoading && !isSigningUp && <LogOut size={18} className="mr-2 transform rotate-180" />}
                    {!authActionLoading && isSigningUp && <UserPlus size={18} className="mr-2" />}
                    {authActionLoading ? 'Processing...' : (isSigningUp ? 'Sign Up' : 'Log In')}
                 </button>
               </form>
            )
          )}
        </div> {/* End Main Content Area */}

        {/* --- Footer / Toggle Auth Mode --- */}
        {/* Show only if initial load done AND no user */}
        {!initialLoading && !currentUser && (
           <div className="p-4 border-t border-gray-200 text-center flex-shrink-0 bg-white"> {/* Added bg-white */}
            <button
                onClick={toggleAuthMode}
                // Disable during auth actions
                disabled={authActionLoading}
                className="text-sm text-orange-600 hover:underline focus:outline-none disabled:opacity-50"
              >
              {isSigningUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        )}
         {/* Removed extra spacer div */}
      </div> {/* End Sidebar Panel */}
    </>
  );
};

export default Sidebar;