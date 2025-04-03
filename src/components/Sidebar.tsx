// src/components/Sidebar.tsx (Merged Version)
import React, { useState, useEffect, useRef, useCallback } from 'react'; // Added useCallback, useRef
import { X, Truck, MapPin, LogOut, ClipboardList, Loader2, AlertCircle, UserPlus } from 'lucide-react'; // Added missing icons
import { supabase } from '../supabase';
import { User, AuthError, Session } from '@supabase/supabase-js'; // Added AuthError, Session

// --- Interfaces (Copied from complex version) ---
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
  // --- State (Combined from both versions) ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profileData, setProfileData] = useState<Profile | null>(null); // Added
  const [formData, setFormData] = useState<FormData>({ // Added complex form state
      email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '',
  });
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null); // Use FeedbackMessage type
  const [isSigningUp, setIsSigningUp] = useState<boolean>(false); // Added
  const [activeSection, setActiveSection] = useState<string>(''); // Added

  // --- Granular Loading States (Adopted from complex version) ---
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [authActionLoading, setAuthActionLoading] = useState<boolean>(false);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);

  // --- Refs (Copied from complex version) ---
  const emailInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const aadharInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // --- Helper: Reset Auth State (Adopted from complex version) ---
  const resetAuthState = useCallback((clearFeedback = true) => {
      console.log('(Helper) Resetting Auth State');
      setActiveSection('');
      setFormData({ email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' });
      if (clearFeedback) setFeedback(null);
      setIsSigningUp(false);
      setAuthActionLoading(false);
  }, []);

  // --- Helper: Fetch User Profile (Adopted from complex version) ---
  const fetchProfile = useCallback(async (userId: string, isMountedCheck?: () => boolean): Promise<Profile | null> => {
      console.log(`(Helper) Fetching profile for user ID: ${userId}`);
      setProfileLoading(true);
      if (isMountedCheck && !isMountedCheck()) return null;

      try {
          const { data, error, status } = await supabase
              .from('profiles')
              .select('full_name, phone, date_of_birth, aadhar_number, email')
              .eq('id', userId)
              .maybeSingle();

          if (isMountedCheck && !isMountedCheck()) return null;

          if (error && status !== 406) {
              console.error('(Helper fetchProfile) Error:', error.message, status);
              setFeedback({ type: 'error', text: `Could not load profile: ${error.message}. Check RLS.` });
              return null;
          }
          return (data as Profile) || null; // Return data or null
      } catch (err: any) {
          console.error('(Helper fetchProfile) Exception:', err.message);
          if (isMountedCheck && !isMountedCheck()) return null;
          setFeedback({ type: 'error', text: 'An error occurred fetching your profile.' });
          return null;
      } finally {
          if (!isMountedCheck || isMountedCheck()) {
             setProfileLoading(false);
          }
      }
  }, []);

  // --- Auth Effect (Adopted robust version) ---
  useEffect(() => {
    let isMounted = true;
    setInitialLoading(true);
    setProfileData(null);
    setCurrentUser(null);

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
       if (!isMounted) return;
       if (error) {
          console.error("Effect getSession: ERROR", error);
          // Keep states null/reset
          setFeedback({ type: 'error', text: 'Failed to check session.' });
          setInitialLoading(false);
          return;
       }

       const user = session?.user ?? null;
       setCurrentUser(user);

       if (user) {
          try {
             const profile = await fetchProfile(user.id, () => isMounted);
             if (isMounted) setProfileData(profile);
          } catch (profileError) {
             if (isMounted) { setProfileData(null); setFeedback({ type: 'error', text: 'Could not load profile data.' }); }
          }
       } else {
          // No user, ensure reset (though listener might also do it)
          if (isMounted) resetAuthState(false);
       }
       if (isMounted) setInitialLoading(false); // Stop initial load

    }).catch(exception => {
       if (!isMounted) return;
       console.error("Effect getSession: EXCEPTION", exception);
       setCurrentUser(null); setProfileData(null); resetAuthState(false);
       setFeedback({ type: 'error', text: 'Error checking session.' });
       setInitialLoading(false);
    });

    // Listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
         if (!isMounted) return;
         const user = session?.user ?? null;
         setCurrentUser(user); // Update user state

         switch (event) {
            case 'SIGNED_IN':
               setFeedback(null);
               setFormData(prev => ({ ...prev, password: '' }));
               setIsSigningUp(false);
               if (user) {
                  const profile = await fetchProfile(user.id, () => isMounted);
                  if (isMounted) setProfileData(profile);
               } else { if (isMounted) setProfileData(null); }
               if (isMounted && authActionLoading) setAuthActionLoading(false); // Reset if stuck
               break;
            case 'SIGNED_OUT':
               if (isMounted) { setProfileData(null); resetAuthState(); }
               break;
            case 'USER_UPDATED':
                if (user) {
                   const profile = await fetchProfile(user.id, () => isMounted);
                   if (isMounted) setProfileData(profile);
                }
               break;
            // ... other cases if needed
         }
         // Ensure initial load is off if somehow still true
         if (isMounted && initialLoading) setInitialLoading(false);
      }
    );

    // Cleanup
    return () => { isMounted = false; authListener?.subscription.unsubscribe(); };
  }, [fetchProfile, resetAuthState]); // Stable dependencies

  // --- Body Scroll Lock (Copied) ---
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = originalOverflow;
    return () => { document.body.style.overflow = originalOverflow; };
  }, [isOpen]);

  // --- Input Change Handler (Copied) ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- Map Supabase Errors (Copied - Ensure it's accurate) ---
   const getFriendlyErrorMessage = (error: AuthError | Error | any): { type: 'error' | 'info', text: string } => {
       // (Use the detailed version from your previous non-working code)
       // ... (copy the full function content here) ...
       // Example placeholder:
       console.error("Error Map:", error);
       return { type: 'error', text: error?.message || "An unexpected error occurred." };
   };

  // --- Authentication Handler (Copied complex version) ---
  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);
    setAuthActionLoading(true);
    const currentFormData = { ...formData };

    try {
      if (isSigningUp) { // --- Sign Up ---
         if (!currentFormData.full_name?.trim()) throw new Error("Full Name is required.");
         if (!currentFormData.aadhar_number?.trim()) throw new Error("Aadhar number is required.");
         const aadharRegex = /^\d{12}$/;
         if (!aadharRegex.test(currentFormData.aadhar_number)) throw new Error("Please enter a valid 12-digit Aadhar number.");
         if (currentFormData.password.length < 6) throw new Error("Password must be at least 6 characters.");

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: currentFormData.email.trim(), password: currentFormData.password,
        });
        if (signUpError) throw signUpError;
        if (!signUpData.user) throw new Error("Signup successful but user data missing.");

        let profileInsertSuccess = false;
        try {
            const { error: profileError } = await supabase.from('profiles').insert({
                    id: signUpData.user.id, email: signUpData.user.email,
                    full_name: currentFormData.full_name.trim(), phone: currentFormData.phone?.trim() || null,
                    date_of_birth: currentFormData.date_of_birth || null,
                    aadhar_number: currentFormData.aadhar_number.trim(),
                });
            if (profileError) throw profileError;
            profileInsertSuccess = true;
        } catch (profileInsertError: any) {
            const profileFeedback = getFriendlyErrorMessage(profileInsertError);
            setFeedback({ type: 'info', text: `Account created, but profile save failed: ${profileFeedback.text}. Check email for verification.` });
        }

        if (!signUpData.session) { // Needs verification
            if (profileInsertSuccess && (!feedback || feedback.type !== 'info')) {
                 setFeedback({ type: 'success', text: 'Account created! Check email for confirmation link.' });
            }
            setIsSigningUp(false); // Switch to login view
            // Clear sensitive fields? Keep email? Decide based on desired UX
            setFormData(prev => ({ ...prev, password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' }));
        } else { // Auto-confirmed
             if (profileInsertSuccess && (!feedback || feedback.type !== 'info')) {
                 setFeedback({ type: 'success', text: 'Account created successfully!' });
                 // Listener handles UI update
             }
        }
      } else { // --- Log In ---
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: currentFormData.email.trim(), password: currentFormData.password,
        });
        if (signInError) throw signInError;
        // Listener handles UI update
      }
    } catch (error: any) {
      const feedbackMessage = getFriendlyErrorMessage(error);
      setFeedback(feedbackMessage);
      // Focus logic might be added back here based on feedbackMessage.text or error type
    } finally {
      setAuthActionLoading(false); // Ensure reset
    }
  };

  // --- Logout Handler (Copied complex version) ---
  const handleLogout = async () => {
    setFeedback(null);
    setAuthActionLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) setFeedback({ type: 'error', text: `Logout failed: ${error.message}` });
      // Listener handles UI reset
    } catch (e: any) {
      setFeedback({ type: 'error', text: "An unexpected error occurred during logout." });
    } finally {
      setAuthActionLoading(false); // Ensure reset
    }
  };

  // --- Toggle Auth Mode (Copied) ---
  const toggleAuthMode = () => {
    const enteringSignupMode = !isSigningUp;
    setIsSigningUp(enteringSignupMode);
    setFormData(prev => ({
        email: prev.email, // Keep email
        password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: ''
    }));
    setFeedback(null);
    setTimeout(() => {
        if (enteringSignupMode && nameInputRef.current) nameInputRef.current.focus();
        else if (!enteringSignupMode && emailInputRef.current) emailInputRef.current.focus();
    }, 100);
  }

  // --- Reusable Input Field Classes (Copied) ---
  const inputClasses = (hasError: boolean = false) =>
    `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors text-gray-800 placeholder-gray-400 ${
      hasError ? 'border-red-500 ring-red-500' : 'border-gray-300'
    } disabled:bg-gray-100 disabled:cursor-not-allowed`;

  // Combined loading state for disabling parts of the UI
  const isBusy = authActionLoading || profileLoading;

  // --- Render Logic (Merging simple structure with complex content) ---
  return (
    <>
      {/* Overlay */}
      <div
        onClick={initialLoading || authActionLoading ? undefined : onClose}
        className={`fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm transition-opacity duration-300 z-40 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        aria-hidden={!isOpen}
      />
      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog" aria-modal="true" aria-labelledby="sidebar-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h2 id="sidebar-title" className="text-xl font-semibold text-gray-800">
            {initialLoading ? 'Loading...' : (currentUser ? 'My Account' : (isSigningUp ? 'Create Account' : 'Log In'))}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-500 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors"
            aria-label="Close sidebar"
            disabled={initialLoading || authActionLoading}
          >
            <X size={24} />
          </button>
        </div>

        {/* --- Main Content Area --- */}
        <div className="flex-grow p-6 overflow-y-auto">

          {/* Feedback Area */}
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

          {/* Initial Loading Spinner */}
          {initialLoading && (
            <div className="flex justify-center items-center py-10">
                 <Loader2 size={32} className="animate-spin text-orange-600" />
            </div>
          )}

          {/* === Logged In View (From Complex) === */}
          {!initialLoading && currentUser && (
            <div className="space-y-6">
              {/* Welcome Message & Profile Loader */}
              <div className="flex items-center justify-between">
                 <p className="text-gray-600 truncate">
                     Welcome, <span className='font-medium text-gray-800'>{profileData?.full_name || currentUser.email || 'User'}</span>!
                 </p>
                 {profileLoading && <Loader2 size={16} className="animate-spin text-orange-500 ml-2" />}
              </div>
              {/* Dashboard Navigation */}
              <nav className="space-y-2">
                 <button className={`...`} onClick={() => setActiveSection('tracking')} disabled={isBusy}> <Truck ... /> Order Tracking </button>
                 <button className={`...`} onClick={() => setActiveSection('delivery')} disabled={isBusy}> <MapPin ... /> Delivery Details </button>
                 <button className={`...`} onClick={() => setActiveSection('orders')} disabled={isBusy}> <ClipboardList ... /> My Orders </button>
                 {/* (Copy full button classes from previous complex version) */}
              </nav>
              {/* Dashboard Content Display */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg min-h-[100px]">
                  {activeSection === 'tracking' && (<div>...Tracking Content...</div>)}
                  {activeSection === 'delivery' && (<div>...Delivery Content...</div>)}
                  {activeSection === 'orders' && (<div>...Orders Content...</div>)}
                  {!activeSection && !profileLoading && (<p className="text-sm text-gray-500 text-center pt-4">Select an option.</p>)}
                  {profileLoading && activeSection && (<div className="flex justify-center items-center h-[80px]"><Loader2 size={24} className="animate-spin text-orange-500"/></div>)}
                  {/* (Copy full content from previous complex version) */}
              </div>
              {/* Logout Button */}
              <button onClick={handleLogout} disabled={authActionLoading} className="...">
                  {authActionLoading ? <Loader2 ... /> : <LogOut ... />}
                  {authActionLoading ? 'Logging Out...' : 'Logout'}
                 {/* (Copy full button classes from previous complex version) */}
              </button>
            </div>
          )}

          {/* === Logged Out View (Login/Signup Form from Complex) === */}
          {!initialLoading && !currentUser && (
               <form onSubmit={handleAuth} className="space-y-4">
                 {isSigningUp && ( <> {/* Signup Fields */}
                     <div><label>Full Name...</label><input ref={nameInputRef} ... /></div>
                     <div><label>Phone...</label><input ... /></div>
                     <div><label>DOB...</label><input ... /></div>
                     <div><label>Aadhar...</label><input ref={aadharInputRef} ... /></div>
                     <hr/>
                 </> )}
                 {/* Email Input */}
                 <div><label>Email...</label><input ref={emailInputRef} ... /></div>
                 {/* Password Input */}
                 <div><label>Password...</label><input ref={passwordInputRef} ... />
                     {!isSigningUp && ( <div><button type="button">Forgot password?</button></div> )}
                 </div>
                 {/* Submit Button */}
                 <button type="submit" disabled={authActionLoading} className="...">
                    {authActionLoading && <Loader2 ... />}
                    {!authActionLoading && !isSigningUp && <LogOut ... />}
                    {!authActionLoading && isSigningUp && <UserPlus ... />}
                    {authActionLoading ? 'Processing...' : (isSigningUp ? 'Sign Up' : 'Log In')}
                 </button>
                 {/* (Copy full form structure and classes from previous complex version) */}
               </form>
           )}
        </div> {/* End Main Content Area */}

        {/* Footer / Toggle Auth Mode */}
        {!initialLoading && !currentUser && (
           <div className="p-4 border-t border-gray-200 text-center flex-shrink-0 bg-white">
            <button onClick={toggleAuthMode} disabled={authActionLoading} className="text-sm text-orange-600 hover:underline focus:outline-none disabled:opacity-50">
              {isSigningUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        )}
      </div> {/* End Sidebar Panel */}
    </>
  );
};

export default Sidebar; // Export the merged component