// src/components/Sidebar.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react'; // Added useCallback
import { X, Truck, MapPin, LogOut, ClipboardList, Loader2, AlertCircle, UserPlus } from 'lucide-react'; // Added UserPlus
import { supabase } from '../supabase'; // Ensure this path is correct
import { User, AuthError, Session } from '@supabase/supabase-js'; // Added Session

// --- Interfaces ---
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}
interface FeedbackMessage {
    type: 'error' | 'success' | 'info';
    text: string;
}
// Define Profile structure (from complex component)
interface Profile {
    id?: string;
    full_name: string | null;
    phone: string | null;
    date_of_birth: string | null;
    aadhar_number: string | null;
    email?: string | null;
}
// Use combined FormData (from complex component)
interface FormData extends Profile {
    email: string;
    password: string;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  // --- State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // Add profileData state (from complex component)
  const [profileData, setProfileData] = useState<Profile | null>(null);
  // Use the combined formData state (from complex component)
  const [formData, setFormData] = useState<FormData>({
      email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '',
  });
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [isSigningUp, setIsSigningUp] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string>('');

  // --- Granular Loading States (Adopted from complex component) ---
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [authActionLoading, setAuthActionLoading] = useState<boolean>(false);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);

  // --- Refs (Adopted from complex component) ---
  const emailInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const aadharInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // --- Helper: Reset Auth State (Adapted for new state) ---
  const resetAuthState = useCallback((clearFeedback = true) => {
      console.log('(Helper) Resetting Auth State');
      setActiveSection('');
      // Reset the combined formData
      setFormData({ email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' });
      if (clearFeedback) setFeedback(null);
      setIsSigningUp(false);
      setAuthActionLoading(false);
      // currentUser and profileData handled by listener
  }, []); // No dependencies needed

  // --- Helper: Fetch User Profile (Adopted from complex component) ---
  const fetchProfile = useCallback(async (userId: string, isMountedCheck?: () => boolean): Promise<Profile | null> => {
      console.log(`(Helper) Fetching profile for user ID: ${userId}`);
      setProfileLoading(true);
      // Safety check
      if (isMountedCheck && !isMountedCheck()) { console.log("(Helper fetchProfile) Unmounted."); return null; }

      try {
          // *** RLS SELECT POLICY NEEDED ***
          const { data, error, status } = await supabase
              .from('profiles')
              .select('full_name, phone, date_of_birth, aadhar_number, email')
              .eq('id', userId)
              .maybeSingle();

          if (isMountedCheck && !isMountedCheck()) { console.log("(Helper fetchProfile) Unmounted after await."); return null; }

          if (error && status !== 406) {
              console.error('(Helper fetchProfile) Error:', error.message, status);
              setFeedback({ type: 'error', text: `Could not load profile: ${error.message}. Check RLS.` });
              return null;
          }
          console.log('(Helper fetchProfile) Data fetched:', data);
          return (data as Profile) || null; // Return data or null if not found
      } catch (err: any) {
          console.error('(Helper fetchProfile) Exception:', err.message);
          if (isMountedCheck && !isMountedCheck()) { console.log("(Helper fetchProfile) Unmounted during exception."); return null; }
          setFeedback({ type: 'error', text: 'An error occurred fetching profile.' });
          return null;
      } finally {
          if (!isMountedCheck || isMountedCheck()) {
             console.log("(Helper fetchProfile) Setting profileLoading false.");
             setProfileLoading(false);
          }
      }
  }, []); // No dependencies

   // --- Listener for Auth State Changes (Enhanced) ---
   useEffect(() => {
    let isMounted = true;
    console.log("Effect Mount: Initializing...");
    setInitialLoading(true);
    setProfileData(null);
    setCurrentUser(null);

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
       if (!isMounted) return;
       console.log("Effect getSession: Completed.");

       if (error) {
          console.error("Effect getSession: ERROR", error);
          // Reset state even on error
          setCurrentUser(null); setProfileData(null); resetAuthState(false);
          setFeedback({ type: 'error', text: 'Failed to check session.' });
          setInitialLoading(false); // Stop initial loading
          return;
       }

       const user = session?.user ?? null;
       console.log('Effect getSession: User ID:', user?.id || 'None');
       setCurrentUser(user); // Set user state

       if (user) {
          console.log('Effect getSession: Fetching initial profile...');
          try {
             const profile = await fetchProfile(user.id, () => isMounted);
             if (isMounted) setProfileData(profile);
          } catch (profileError) {
             console.error("Effect getSession: Initial profile fetch error:", profileError);
             if (isMounted) {
                 setProfileData(null);
                 setFeedback({ type: 'error', text: 'Could not load profile.' });
             }
          }
       } else {
          if (isMounted) resetAuthState(false); // Reset form if no user
       }

       // Stop initial loading indicator ONLY after session check and potential profile fetch are done
       if (isMounted) {
          console.log("Effect getSession: Setting initialLoading FALSE.");
          setInitialLoading(false);
       }

    }).catch(exception => {
       if (!isMounted) return;
       console.error("Effect getSession: EXCEPTION", exception);
       setCurrentUser(null); setProfileData(null); resetAuthState(false);
       setFeedback({ type: 'error', text: 'Error checking session.' });
       setInitialLoading(false); // Stop initial loading
    });

    // --- Listener for subsequent changes ---
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
         if (!isMounted) return;
         console.log(`Effect Listener: Event: ${event}`, session?.user?.id || 'No user');
         const user = session?.user ?? null;
         setCurrentUser(user);

         switch (event) {
            case 'SIGNED_IN':
               setFeedback(null);
               setFormData(prev => ({ ...prev, password: '' })); // Clear password only
               setIsSigningUp(false);
               if (user) {
                  console.log('Effect Listener SIGNED_IN: Fetching profile...');
                  const profile = await fetchProfile(user.id, () => isMounted); // Fetch profile
                  if (isMounted) setProfileData(profile);
               } else {
                  if (isMounted) setProfileData(null);
               }
               if (isMounted && authActionLoading) setAuthActionLoading(false); // Ensure reset if stuck
               break;
            case 'SIGNED_OUT':
               if (isMounted) {
                   console.log('Effect Listener SIGNED_OUT: Resetting state.');
                   setProfileData(null);
                   resetAuthState(); // Resets form, activeSection, feedback, isSigningUp, authActionLoading
               }
               break;
            // Add USER_UPDATED if needed later
         }
         if (isMounted && initialLoading) setInitialLoading(false); // Backup reset
      }
    );

    // Cleanup
    return () => {
      console.log("Effect Cleanup: Unmounting.");
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [fetchProfile, resetAuthState]); // Use stable helpers


  // --- Body Scroll Lock (Keep as is) ---
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = originalOverflow;
    }
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // --- Input Change Handler (Adapted for formData) ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- Map Supabase Errors (Use more detailed one) ---
  const getFriendlyErrorMessage = (error: AuthError | Error | any): { type: 'error' | 'info', text: string } => {
      let message = "An unexpected error occurred. Please try again.";
      let type: 'error' | 'info' = 'error';
      if (!error) return { type, text: message };
      const errorMessage = error.message || String(error) || '';
      console.error('Supabase Auth/DB Error:', errorMessage, error);

      if (errorMessage.includes('Invalid login credentials')) {
            message = "Incorrect email or password."; type = 'error';
            setTimeout(() => passwordInputRef.current?.focus(), 100);
      } else if (errorMessage.includes('User already registered') || errorMessage.includes('already exists')) {
            message = "This email is already registered. Please log in."; type = 'info';
            setIsSigningUp(false); // Switch to login
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
      } else if (errorMessage.includes('12-digit Aadhar')) {
            message = errorMessage; type = 'error';
            setTimeout(() => aadharInputRef.current?.focus(), 100);
      } else if (errorMessage) {
          message = errorMessage; type = 'error';
      }
      return { type, text: message };
  };


  // --- Authentication Handler (Enhanced for Signup/Profile) ---
  // ***** THE CORRECTION IS HERE *****
  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);
    setAuthActionLoading(true); // Use specific loading state
    const currentFormData = { ...formData }; // Snapshot

    try {
      if (isSigningUp) {
        // --- Sign Up ---
        // Validation
        if (!currentFormData.full_name?.trim()) throw new Error("Full Name is required.");
        if (!currentFormData.aadhar_number?.trim()) throw new Error("Aadhar number is required.");
        const aadharRegex = /^\d{12}$/;
        if (!aadharRegex.test(currentFormData.aadhar_number)) throw new Error("Please enter a valid 12-digit Aadhar number.");
        if (currentFormData.password.length < 6) throw new Error("Password must be at least 6 characters.");

        // 1. Auth Signup
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: currentFormData.email.trim(),
          password: currentFormData.password,
        });
        if (signUpError) throw signUpError;
        if (!signUpData.user) throw new Error("Signup successful but user data missing.");
        console.log('(handleAuth) Auth signup successful:', signUpData.user.email);

        // 2. Profile Insert
        let profileInsertSuccess = false;
        try {
            console.log('(handleAuth) Attempting profile insert...');
            // *** RLS INSERT POLICY NEEDED ***
            const { error: profileError } = await supabase.from('profiles').insert({
                id: signUpData.user.id, email: signUpData.user.email,
                full_name: currentFormData.full_name.trim(),
                phone: currentFormData.phone?.trim() || null,
                date_of_birth: currentFormData.date_of_birth || null,
                aadhar_number: currentFormData.aadhar_number.trim(),
            });
            if (profileError) throw profileError;
            console.log('(handleAuth) Profile insert successful.');
            profileInsertSuccess = true;
        } catch (profileInsertError: any) {
            console.error('(handleAuth) Profile insert ERROR:', profileInsertError);
            const profileFeedback = getFriendlyErrorMessage(profileInsertError);
            setFeedback({ type: 'info', text: `Account created, profile save failed: ${profileFeedback.text}. Check email.` });
        }

        // 3. Feedback based on session
        if (!signUpData.session) { // Verification needed
            if (profileInsertSuccess && (!feedback || feedback.type !== 'info')) {
                 setFeedback({ type: 'success', text: 'Account created! Check email for confirmation.' });
            }
            setIsSigningUp(false); // Switch view
            // Clear sensitive/profile fields after signup request
            setFormData(prev => ({ ...prev, password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' }));
            // Loading state handled in finally
        } else { // Auto-logged in
             if (profileInsertSuccess && (!feedback || feedback.type !== 'info')) {
                 setFeedback({ type: 'success', text: 'Account created successfully!' });
             }
             // Listener will handle profile fetch/UI updates. Loading handled in finally.
        }

      } else {
        // --- Log In ---
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: currentFormData.email.trim(),
          password: currentFormData.password,
        });
        if (signInError) throw signInError;
        console.log('(handleAuth) Login successful request for:', signInData.user?.email);
        // Listener handles UI updates. Loading handled in finally.
      }

    } catch (error: any) {
      console.error("(handleAuth) Error caught:", error);
      const feedbackMessage = getFriendlyErrorMessage(error);
      setFeedback(feedbackMessage);
      // Focus logic handled within getFriendlyErrorMessage using setTimeout

    } finally {
      console.log("(handleAuth) Finally block: Setting authActionLoading false.");
      setAuthActionLoading(false); // Reset button loading state
    }
  };

  // --- Logout Handler (Adapted for new loading state) ---
  const handleLogout = async () => {
    setFeedback(null);
    setAuthActionLoading(true); // Use specific loading state
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('(handleLogout) Logout Error:', error.message);
            setFeedback({ type: 'error', text: `Logout failed: ${error.message}` });
        } else {
            console.log('(handleLogout) Logout successful request.');
            // Listener handles state reset
        }
    } catch(e: any) {
         console.error("(handleLogout) Exception:", e.message);
         setFeedback({ type: 'error', text: "Error during logout." });
    } finally {
         console.log("(handleLogout) Finally block: Setting authActionLoading false.");
         setAuthActionLoading(false); // Reset button loading state
    }
  };

  // --- Toggle Signup/Login View (Adapted for formData) ---
  const toggleAuthMode = () => {
    const enteringSignupMode = !isSigningUp;
    setIsSigningUp(enteringSignupMode);
    // Reset form but keep email
    setFormData(prev => ({
        email: prev.email, password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: ''
    }));
    setFeedback(null);
    // Focus appropriate field
    setTimeout(() => {
        if (enteringSignupMode) nameInputRef.current?.focus();
        else emailInputRef.current?.focus();
    }, 100);
  }

  // --- Reusable Input Field Classes (Copied) ---
  const inputClasses = (hasError: boolean = false) =>
    `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors text-gray-800 placeholder-gray-400 ${
      hasError ? 'border-red-500 ring-red-500' : 'border-gray-300'
    } disabled:bg-gray-100 disabled:cursor-not-allowed`;

  // --- Combined Loading State for Disabling Navigation ---
  const isBusy = authActionLoading || profileLoading;

  // --- Render Logic (JSX - Merged) ---
  // (Keep the JSX identical to the previous version, as the typo was in the JS/TS part)
  return (
    <>
      {/* --- Overlay (Use granular loading states) --- */}
      <div
        onClick={initialLoading || authActionLoading ? undefined : onClose}
        className={`fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm transition-opacity duration-300 z-40 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        aria-hidden={!isOpen}
      />

      {/* --- Sidebar Panel --- */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog" aria-modal="true" aria-labelledby="sidebar-title"
      >
        {/* --- Header (Use granular loading state) --- */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h2 id="sidebar-title" className="text-xl font-semibold text-gray-800">
             {initialLoading ? 'Loading...' : (currentUser ? 'My Account' : (isSigningUp ? 'Create Account' : 'Log In'))}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-500 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors"
            aria-label="Close sidebar"
            disabled={initialLoading || authActionLoading} // Disable on initial or auth action
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

          {/* --- Initial Loading Indicator (Use initialLoading state) --- */}
          {initialLoading && (
            <div className="flex justify-center items-center py-10">
                 <Loader2 size={32} className="animate-spin text-orange-600" />
            </div>
          )}

          {/* --- Logged In View (Use profileData, profileLoading) --- */}
          {!initialLoading && currentUser ? (
            <div className="space-y-6">
             {/* Display profile name or email, show profile loader */}
              <div className="flex items-center justify-between">
                 <p className="text-gray-600 truncate">
                     Welcome, <span className='font-medium text-gray-800'>{profileData?.full_name || currentUser.email || 'User'}</span>!
                 </p>
                 {profileLoading && <Loader2 size={16} className="animate-spin text-orange-500 ml-2" />}
              </div>

              {/* Dashboard Navigation (Disable based on isBusy) */}
              <nav className="space-y-2">
                 <button className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors disabled:opacity-50 ${activeSection === 'tracking' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`} onClick={() => setActiveSection('tracking')} disabled={isBusy}> <Truck size={18} className="mr-3 flex-shrink-0" /> Order Tracking </button>
                 <button className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors disabled:opacity-50 ${activeSection === 'delivery' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`} onClick={() => setActiveSection('delivery')} disabled={isBusy}> <MapPin size={18} className="mr-3 flex-shrink-0" /> Delivery Details </button>
                 <button className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors disabled:opacity-50 ${activeSection === 'orders' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`} onClick={() => setActiveSection('orders')} disabled={isBusy}> <ClipboardList size={18} className="mr-3 flex-shrink-0" /> My Orders </button>
              </nav>

              {/* Dashboard Content Display (Keep as is, add loading check) */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg min-h-[100px]">
                  {activeSection === 'tracking' && (<div><h3 className="text-lg font-semibold mb-2 text-gray-800">Order Tracking</h3><p className="text-sm text-gray-600">Tracking details here.</p></div>)}
                  {activeSection === 'delivery' && (<div><h3 className="text-lg font-semibold mb-2 text-gray-800">Delivery Details</h3><p className="text-sm text-gray-600">Manage addresses here.</p></div>)}
                  {activeSection === 'orders' && (<div><h3 className="text-lg font-semibold mb-2 text-gray-800">My Orders</h3><p className="text-sm text-gray-600">Order history here.</p></div>)}
                  {!activeSection && !profileLoading && (<p className="text-sm text-gray-500 text-center pt-4">Select an option.</p>)}
                  {profileLoading && activeSection && (<div className="flex justify-center items-center h-[80px]"><Loader2 size={24} className="animate-spin text-orange-500"/></div>)}
              </div>

              {/* Logout Button (Disable based on authActionLoading) */}
               <button
                  onClick={handleLogout}
                  disabled={authActionLoading}
                  className="flex items-center justify-center w-full px-4 py-2 mt-6 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors disabled:opacity-50"
                >
                  {authActionLoading ? <Loader2 size={18} className="mr-2 animate-spin" /> : <LogOut size={18} className="mr-2" />}
                  {authActionLoading ? 'Logging Out...' : 'Logout'}
                </button>
            </div>
          ) : (
            // --- Logged Out View (Login/Signup Form - Use formData) ---
             !initialLoading && !currentUser && (
               <form onSubmit={handleAuth} className="space-y-4">

                {/* --- Signup Fields (Copied) --- */}
                {isSigningUp && (
                    <>
                     <div>
                        <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-600">*</span></label>
                        <input ref={nameInputRef} id="full_name" name="full_name" type="text" value={formData.full_name ?? ''} onChange={handleInputChange} placeholder="Your full name" className={inputClasses(feedback?.text.includes("Full Name"))} required disabled={authActionLoading} />
                    </div>
                    {/* Phone */}
                     <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-xs text-gray-500">(Opt)</span></label>
                        <input id="phone" name="phone" type="tel" value={formData.phone ?? ''} onChange={handleInputChange} placeholder="e.g., 9876543210" className={inputClasses()} disabled={authActionLoading} />
                    </div>
                     {/* DOB */}
                     <div>
                        <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-1">DOB <span className="text-xs text-gray-500">(Opt)</span></label>
                        <input id="date_of_birth" name="date_of_birth" type="date" value={formData.date_of_birth ?? ''} onChange={handleInputChange} max={new Date().toISOString().split("T")[0]} className={inputClasses()} disabled={authActionLoading} />
                    </div>
                    {/* Aadhar */}
                    <div>
                        <label htmlFor="aadhar_number" className="block text-sm font-medium text-gray-700 mb-1">Aadhar <span className="text-red-600">*</span></label>
                        <input ref={aadharInputRef} id="aadhar_number" name="aadhar_number" type="text" inputMode="numeric" pattern="\d{12}" title="12 digits" value={formData.aadhar_number ?? ''} onChange={handleInputChange} placeholder="1234 5678 9012" className={inputClasses(feedback?.text.includes("Aadhar"))} required disabled={authActionLoading} />
                         <p className="text-xs text-gray-500 mt-1">12-digits. <span className='font-semibold'>Secure.</span></p>
                    </div>
                    <hr className="my-2 border-gray-200"/>
                    </>
                )}

                 {/* --- Email Input (Use formData) --- */}
                 <div>
                   <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-600">*</span></label>
                   <input
                      ref={emailInputRef}
                      id="email" name="email" type="email"
                      value={formData.email} // Use formData
                      onChange={handleInputChange} // Use combined handler
                      placeholder="you@example.com"
                      className={inputClasses(feedback?.type === 'error' && (feedback.text.includes('email') || feedback.text.includes('credentials')))}
                      required
                      disabled={authActionLoading} // Use specific loading
                    />
                 </div>
                 {/* --- Password Input (Use formData) --- */}
                 <div>
                   <label htmlFor="password"className="block text-sm font-medium text-gray-700 mb-1">Password <span className="text-red-600">*</span></label>
                   <input
                      ref={passwordInputRef} // Add ref
                      id="password" name="password" type="password"
                      value={formData.password} // Use formData
                      onChange={handleInputChange} // Use combined handler
                      placeholder={isSigningUp ? "Create (min. 6 chars)" : "••••••••"}
                      className={inputClasses(feedback?.type === 'error' && (feedback.text.includes('Password') || feedback.text.includes('credentials')))}
                      required
                      minLength={isSigningUp ? 6 : undefined}
                      disabled={authActionLoading} // Use specific loading
                    />
                    {/* Forgot password button (keep as is) */}
                    {!isSigningUp && (
                        <div className="text-right mt-1">
                          <button type="button" className="text-sm text-orange-600 hover:underline focus:outline-none" onClick={() => setFeedback({type: 'info', text:'Password recovery coming soon!'})} disabled={authActionLoading}>Forgot password?</button>
                        </div>
                      )}
                 </div>
                 {/* --- Submit Button (Use authActionLoading, add icons) --- */}
                 <button
                   type="submit"
                   disabled={authActionLoading} // Use specific loading
                   className="w-full bg-orange-600 text-white py-2.5 px-4 rounded-lg font-semibold hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors disabled:opacity-70 flex items-center justify-center"
                 >
                   {authActionLoading && <Loader2 size={20} className="mr-2 animate-spin" />}
                   {!authActionLoading && !isSigningUp && <LogOut size={18} className="mr-2 transform rotate-180" />}
                   {!authActionLoading && isSigningUp && <UserPlus size={18} className="mr-2" />}
                   {authActionLoading ? 'Processing...' : (isSigningUp ? 'Sign Up' : 'Log In')}
                 </button>
               </form>
            )
          )}
        </div> {/* End Main Content Area */}

        {/* --- Footer / Toggle Auth Mode (Disable based on authActionLoading) --- */}
        {!initialLoading && !currentUser && (
           <div className="p-4 border-t border-gray-200 text-center flex-shrink-0 bg-white">
            <button
              onClick={toggleAuthMode}
              disabled={authActionLoading} // Use specific loading
              className="text-sm text-orange-600 hover:underline focus:outline-none disabled:opacity-50"
            >
              {isSigningUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        )}
      </div> {/* End Sidebar Panel */}
    </>
  );
};

export default Sidebar;