// src/components/Sidebar.tsx
import React, { useState, useEffect, useRef } from 'react';
import { X, Truck, MapPin, LogOut, ClipboardList, Loader2, AlertCircle, UserPlus } from 'lucide-react'; // Added UserPlus
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
    full_name: string | null; // Expect string if fetched successfully
    phone: string | null;
    date_of_birth: string | null;
    aadhar_number: string | null; // Keep null possibility for type safety
    email?: string | null;
}

// --- Combined Form Data Type ---
interface FormData extends Profile { // Inherit from Profile for shared fields
    email: string; // email is always string here
    password: string;
    // Add other form-specific fields if any in future
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  // --- State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profileData, setProfileData] = useState<Profile | null>(null); // State to hold profile data
  const [formData, setFormData] = useState<FormData>({
      email: '',
      password: '',
      full_name: '',
      phone: '',
      date_of_birth: '',
      aadhar_number: '',
  });
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // Combined loading state
  const [authLoading, setAuthLoading] = useState<boolean>(false); // Specific loading for auth actions
  const [isSigningUp, setIsSigningUp] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string>('');
  const emailInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const aadharInputRef = useRef<HTMLInputElement>(null); // Ref for aadhar input

  // --- Helper: Fetch User Profile ---
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
      console.log(`Fetching profile for user ID: ${userId}`);
      try {
          const { data, error, status } = await supabase
              .from('profiles') // Use your actual table name
              .select('full_name, phone, date_of_birth, aadhar_number, email') // Select desired fields
              .eq('id', userId)
              .maybeSingle(); // Use maybeSingle to handle null gracefully

          if (error && status !== 406) { // 406: 'Not found', expected if no profile yet
              console.error('Error fetching profile:', error.message);
              setFeedback({ type: 'error', text: 'Could not load profile data.' });
              return null;
          }
          if (data) {
              console.log('Profile data fetched:', data);
              return data as Profile;
          }
          console.log('No profile found for user.');
          return null; // No profile exists for this user yet
      } catch (err: any) {
          console.error('Exception during profile fetch:', err.message);
          setFeedback({ type: 'error', text: 'An error occurred fetching your profile.' });
          return null;
      }
  };


  // --- Listener for Auth State Changes & Profile Fetch ---
  useEffect(() => {
    setLoading(true); // Initial loading for session check

    // Check initial session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) console.error("Error getting initial session:", error.message);
      const user = session?.user ?? null;
      setCurrentUser(user);

      if (user) {
        const profile = await fetchProfile(user.id); // Fetch profile on initial load if logged in
        setProfileData(profile);
      } else {
        resetAuthState(false); // Reset if no user initially
        setProfileData(null);
      }
      setLoading(false); // Finish initial load
    });

    // Listen for subsequent changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setLoading(true); // Indicate loading during auth state transition
        const user = session?.user ?? null;
        setCurrentUser(user);

        if (event === 'SIGNED_OUT' || !user) {
          resetAuthState(); // Reset form state
          setProfileData(null); // Clear profile data
          setLoading(false);
        } else if (event === 'SIGNED_IN') {
            setFeedback(null);
            setFormData({ email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' });
            setIsSigningUp(false);
            // Fetch profile data when user signs in
            const profile = await fetchProfile(user.id);
            setProfileData(profile);
            setLoading(false); // Stop loading after SIGNED_IN processed
        } else if (event === 'USER_UPDATED' && user) {
             // Optionally re-fetch profile if user details (like email) might change
             const profile = await fetchProfile(user.id);
             setProfileData(profile);
             setLoading(false);
        } else {
             setLoading(false); // Stop loading for other events if needed
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Helper to reset state (now resets formData)
  const resetAuthState = (clearFeedback = true) => {
      setActiveSection('');
      setFormData({ email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' });
      if (clearFeedback) setFeedback(null);
      setIsSigningUp(false); // Default to login mode
      // Note: Don't clear profileData here, let the listener handle it
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

   // --- Input Change Handler (Updates formData) ---
   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
   };


  // --- Map Supabase Errors ---
   const getFriendlyErrorMessage = (error: AuthError | Error | any): { type: 'error' | 'info', text: string } => {
       let message = "An unexpected error occurred. Please try again.";
       let type: 'error' | 'info' = 'error';
       if (!error) return { type, text: message };
       const errorMessage = error.message || '';
       console.error('Supabase Auth/DB Error:', errorMessage);

       if (errorMessage.includes('Invalid login credentials')) {
            if (!isSigningUp) {
                message = "Account not found. Please complete the form below to sign up.";
                type = 'info';
                setIsSigningUp(true);
                setFormData(prev => ({ ...prev, password: '' }));
                setTimeout(() => nameInputRef.current?.focus(), 100);
            } else {
                 message = 'Invalid details provided during signup.'; type = 'error';
            }
       } else if (errorMessage.includes('User already registered') || errorMessage.includes('already exists')) {
            message = "This email is already registered. Please log in."; type = 'info';
            setIsSigningUp(false);
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
       // Check specifically for profile insertion errors related to constraints
       } else if (errorMessage.includes('profiles_pkey') || (errorMessage.includes('duplicate key') && errorMessage.includes('profiles'))) {
             message = 'Profile data could not be saved (user might already have one).'; type = 'error';
       } else if (errorMessage.includes('violates not-null constraint') && errorMessage.includes('full_name')) {
             message = 'Full Name is required.'; type = 'error';
       } else if (errorMessage.includes('violates not-null constraint') && errorMessage.includes('aadhar_number')) {
             message = 'Aadhar Number is required.'; type = 'error';
       // Add more constraint checks if needed
       } else {
            message = errorMessage; type = 'error';
       }
       return { type, text: message };
   };

  // --- Authentication Handler (Supabase) ---
  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);
    setAuthLoading(true); // Use specific auth loading state
    const currentFormData = { ...formData };

    try {
      if (isSigningUp) {
        // --- Sign Up ---

        // --- Client-Side Validation ---
         if (!currentFormData.full_name) {
             setFeedback({type: 'error', text: "Full name is required."});
             setAuthLoading(false);
             nameInputRef.current?.focus();
             return;
         }
         if (!currentFormData.aadhar_number) {
             setFeedback({type: 'error', text: "Aadhar number is required."});
             setAuthLoading(false);
             aadharInputRef.current?.focus();
             return;
         }
         const aadharRegex = /^\d{12}$/;
         if (!aadharRegex.test(currentFormData.aadhar_number)) {
             setFeedback({type: 'error', text: "Please enter a valid 12-digit Aadhar number."});
             setAuthLoading(false);
             aadharInputRef.current?.focus();
             return;
         }
         if (currentFormData.password.length < 6) {
             setFeedback({type: 'error', text: "Password must be at least 6 characters."});
             setAuthLoading(false);
             // Consider focusing password input
             return;
         }
        // --- End Validation ---


        // 1. Sign up the user in Auth
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: currentFormData.email,
          password: currentFormData.password,
        });

        if (signUpError) throw signUpError;
        if (!signUpData.user) throw new Error("Signup successful but user data missing.");

        console.log('Auth signup successful for:', signUpData.user.email);

        // 2. Insert Profile Data
        // Use a separate try/catch for profile insert to handle its errors distinctly
        let profileInsertSuccess = false;
        try {
            console.log('Attempting to insert profile for user:', signUpData.user.id);
            const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                    id: signUpData.user.id,
                    email: signUpData.user.email,
                    full_name: currentFormData.full_name, // Required
                    phone: currentFormData.phone || null,
                    date_of_birth: currentFormData.date_of_birth || null,
                    aadhar_number: currentFormData.aadhar_number, // Required (already validated)
                    // Timestamps handled by DB
                });

            if (profileError) {
                 // Throw profile error to be caught by the inner catch
                 throw profileError;
            } else {
                console.log('Supabase profile created successfully.');
                profileInsertSuccess = true;
            }
        } catch (profileInsertError: any) {
            console.error('Error creating Supabase profile after signup:', profileInsertError.message);
            // Set feedback about profile failure, but account might be created
            const profileFeedback = getFriendlyErrorMessage(profileInsertError);
            setFeedback({
                type: 'info', // Use info as account creation might need verification
                text: `Account created, but profile save failed: ${profileFeedback.text}. Please check your email.`
            });
             // If profile fails, we still proceed to check session status below
        }

        // 3. Handle session / email verification
        if (!signUpData.session) { // Email verification needed
            if (profileInsertSuccess) { // Only show generic success if profile also saved
                 setFeedback({ type: 'success', text: 'Account created! Check your email (including spam) for a confirmation link.' });
            }
            // else: feedback about profile failure was already set
            setIsSigningUp(false);
            setFormData(prev => ({ ...prev, password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' }));
            // No auth listener yet, so stop loading manually
            setAuthLoading(false);
        } else { // Auto-confirmed / logged in
             if (profileInsertSuccess) {
                 setFeedback({ type: 'success', text: 'Account created successfully!' });
             }
             // else: feedback about profile failure was already set
             // Auth listener will handle UI update and stop loading
        }

      } else {
        // --- Log In ---
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: currentFormData.email,
          password: currentFormData.password,
        });

        if (signInError) throw signInError; // Let catch block handle

        console.log('Logged in:', signInData.user?.email);
        // Auth listener ('SIGNED_IN') handles profile fetch, UI update, loading state
      }

    } catch (error: any) {
      // Catch errors from Auth calls or profile insert re-throw
      const feedbackMessage = getFriendlyErrorMessage(error);
      setFeedback(feedbackMessage);
      setAuthLoading(false); // Stop auth loading on any error

      // Focus logic (check if still in login mode after error processing)
      if (!isSigningUp && emailInputRef.current && feedbackMessage.type === 'error') {
          emailInputRef.current.focus();
          emailInputRef.current.select();
      }
      // No need for separate signup focus here, error messages guide user
    }
    // Note: setAuthLoading(false) is handled in success paths by listener or manually if no session
  };

  // --- Logout Handler (Supabase) ---
  const handleLogout = async () => {
    setAuthLoading(true); // Use auth loading state
    setFeedback(null);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout Error:', error.message);
      setFeedback({ type: 'error', text: "Failed to log out. Please try again." });
      setAuthLoading(false); // Stop loading on error
    }
    // Auth listener ('SIGNED_OUT') handles state reset and stops loading on success
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
      {/* --- Overlay --- */}
      <div
        onClick={authLoading || loading ? undefined : onClose} // Prevent close during any loading
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
             {/* Show loading only if initial check is happening */}
            {loading && !currentUser ? 'Loading...' : (currentUser ? 'My Account' : (isSigningUp ? 'Create Account' : 'Log In'))}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-500 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors"
            aria-label="Close sidebar"
            disabled={authLoading || (loading && !currentUser)} // Disable close during auth actions or initial load
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

          {/* --- Loading Indicator (Initial Load) --- */}
          {/* Show only during initial session check (loading=true, currentUser=null) */}
          {loading && !currentUser && !authLoading && (
            <div className="flex justify-center items-center py-10">
                 <Loader2 size={32} className="animate-spin text-orange-600" />
            </div>
          )}

          {/* --- Logged In View --- */}
          {!loading && currentUser ? ( // Render only if initial load is done and user exists
            <div className="space-y-6">
              {/* Welcome Message - Use profile name if available, fallback to email */}
              <p className="text-gray-600 truncate">
                    Welcome, <span className='font-medium'>{profileData?.full_name || currentUser.email}</span>!
                    {/* Optional: Show a mini-loader while profile is fetching after login */}
                    {loading && !profileData && <Loader2 size={14} className="inline-block ml-2 animate-spin" />}
              </p>

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
                  {authLoading ? <Loader2 size={18} className="mr-2 animate-spin" /> : <LogOut size={18} className="mr-2" />}
                  {authLoading ? 'Processing...' : 'Logout'}
              </button>
            </div>
          ) : (
            // --- Logged Out View (Login OR Signup Form) ---
             // Render only if initial load done and no user
             !loading && !currentUser && (
               <form onSubmit={handleAuth} className="space-y-4">

                {/* --- Fields Visible ONLY in Signup Mode --- */}
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
                        <input id="date_of_birth" name="date_of_birth" type="date" value={formData.date_of_birth} onChange={handleInputChange} max={new Date().toISOString().split("T")[0]}
                           className={inputClasses()} disabled={authLoading} />
                    </div>
                    <div>
                         {/* Aadhar - Removed optional label, added required attribute */}
                        <label htmlFor="aadhar_number" className="block text-sm font-medium text-gray-700 mb-1">Aadhar Number</label>
                        <input ref={aadharInputRef} id="aadhar_number" name="aadhar_number" type="text" inputMode="numeric" pattern="\d{12}" title="Enter 12-digit Aadhar number" value={formData.aadhar_number} onChange={handleInputChange} placeholder="1234 5678 9012" className={inputClasses()} required disabled={authLoading} />
                         <p className="text-xs text-gray-500 mt-1">Enter 12-digit number. <span className='font-semibold'>Handled securely.</span></p>
                    </div>
                    <hr className="my-2 border-gray-200"/>
                    </>
                )}

                 {/* --- Email Input (Always Visible) --- */}
                 <div>
                   <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                   <input ref={emailInputRef} id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="you@example.com" className={inputClasses(feedback?.type === 'error')} required disabled={authLoading} />
                 </div>

                 {/* --- Password Input (Always Visible) --- */}
                 <div>
                   <label htmlFor="password"className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                   <input id="password" name="password" type="password" value={formData.password} onChange={handleInputChange} placeholder={isSigningUp ? "Create password (min. 6 chars)" : "••••••••"} className={inputClasses(feedback?.type === 'error')} required minLength={isSigningUp ? 6 : undefined} disabled={authLoading} />
                    {!isSigningUp && (
                        <div className="text-right mt-1">
                          <button type="button" className="text-sm text-orange-600 hover:underline focus:outline-none" onClick={() => setFeedback({type: 'info', text:'Password recovery coming soon!'})} disabled={authLoading}>Forgot password?</button>
                        </div>
                      )}
                 </div>

                 {/* --- Submit Button --- */}
                 <button type="submit" disabled={authLoading} className="w-full bg-orange-600 text-white py-2.5 px-4 rounded-lg font-semibold hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors disabled:opacity-70 flex items-center justify-center">
                    {authLoading && <Loader2 size={20} className="mr-2 animate-spin" />}
                    {!authLoading && isSigningUp && <UserPlus size={18} className="mr-2" />}
                    {authLoading ? 'Processing...' : (isSigningUp ? 'Sign Up' : 'Log In')}
                 </button>
               </form>
            )
          )}
        </div> {/* End Main Content Area */}

        {/* --- Footer / Toggle Auth Mode --- */}
        {!loading && !currentUser && ( // Show only if initial load done and not logged in
           <div className="p-4 border-t border-gray-200 text-center flex-shrink-0">
            <button onClick={toggleAuthMode} disabled={authLoading} className="text-sm text-orange-600 hover:underline focus:outline-none disabled:opacity-50">
              {isSigningUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        )}
         <div className="flex-shrink-0 h-4"></div>
      </div> {/* End Sidebar Panel */}
    </>
  );
};

export default Sidebar;