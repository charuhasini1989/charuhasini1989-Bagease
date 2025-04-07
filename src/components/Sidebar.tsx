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

// --- Combined Form Data Type ---
interface FormData {
    email: string;
    password: string;
    full_name: string; // Added
    phone: string;     // Added
    date_of_birth: string; // Added (YYYY-MM-DD format)
    aadhar_number: string; // Added - *** CAUTION: Handle securely! ***
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  // --- State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // Replace loginData with comprehensive formData
  const [formData, setFormData] = useState<FormData>({
      email: '',
      password: '',
      full_name: '',
      phone: '',
      date_of_birth: '',
      aadhar_number: '',
  });
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSigningUp, setIsSigningUp] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string>('');
  const emailInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null); // Ref for name input

  // --- Listener for Auth State Changes (Supabase) ---
  useEffect(() => {
    setLoading(true);
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) console.error("Error getting initial session:", error.message);
      setCurrentUser(session?.user ?? null);
      if (!session?.user) {
         resetAuthState(false); // Reset if no user initially
      }
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const user = session?.user ?? null;
        setCurrentUser(user);
        setLoading(false); // Stop loading after state change is processed

        if (event === 'SIGNED_OUT' || !user) {
          resetAuthState(); // Reset state completely on sign out
        }
        if (event === 'SIGNED_IN') {
            setFeedback(null);
            // Clear form data on successful sign-in (handled by resetAuthState called by listener?)
            // Let's explicitly clear here too for safety, in case resetAuthState wasn't called
             setFormData({ email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' });
             setIsSigningUp(false); // Ensure we are in login mode view after sign in
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
      // Reset the comprehensive formData state
      setFormData({ email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' });
      if (clearFeedback) setFeedback(null);
      setIsSigningUp(false); // Default to login mode
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
  // (This function remains mostly the same as it already handles the switch to signup)
   const getFriendlyErrorMessage = (error: AuthError | Error | any): { type: 'error' | 'info', text: string } => {
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
   };

  // --- Authentication Handler (Supabase) ---
  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
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
  };

  // --- Logout Handler (Supabase) ---
  const handleLogout = async () => {
    setLoading(true);
    setFeedback(null);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout Error:', error.message);
      setFeedback({ type: 'error', text: "Failed to log out. Please try again." });
      setLoading(false);
    }
    // setLoading(false) and state reset handled by auth listener for SIGNED_OUT
  };

  // --- Toggle Signup/Login View ---
  const toggleAuthMode = () => {
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
        onClick={loading ? undefined : onClose}
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
                 <AlertCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" /> {/* Using AlertCircle for all for simplicity */}
                 <span>{feedback.text}</span>
             </div>
           )}

          {/* --- Loading Indicator (Initial Load/Auth) --- */}
          {/* Show loader if loading AND not logged in AND not showing feedback */}
          {loading && !currentUser && !feedback && (
            <div className="flex justify-center items-center py-10">
                 <Loader2 size={32} className="animate-spin text-orange-600" />
            </div>
          )}

          {/* --- Logged In View --- */}
          {!loading && currentUser ? (
            <div className="space-y-6">
              {/* Welcome Message - Consider fetching profile name here later */}
              <p className="text-gray-600 truncate">Welcome, <span className='font-medium'>{currentUser.email}</span>!</p>

              {/* Dashboard Navigation */}
              <nav className="space-y-2">
                 <button className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors ${activeSection === 'tracking' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`} onClick={() => setActiveSection('tracking')}> <Truck size={18} className="mr-3 flex-shrink-0" /> Order Tracking </button>
                 <button className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors ${activeSection === 'delivery' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`} onClick={() => setActiveSection('delivery')}> <MapPin size={18} className="mr-3 flex-shrink-0" /> Delivery Details </button>
                 <button className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors ${activeSection === 'orders' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`} onClick={() => setActiveSection('orders')}> <ClipboardList size={18} className="mr-3 flex-shrink-0" /> My Orders </button>
              </nav>

              {/* Dashboard Content Display */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg min-h-[100px]">
                  {activeSection === 'tracking' && (<div><h3 className="text-lg font-semibold mb-2 text-gray-800">Order Tracking</h3><p className="text-sm text-gray-600">Tracking details here.</p></div>)}
                  {activeSection === 'delivery' && (<div><h3 className="text-lg font-semibold mb-2 text-gray-800">Delivery Details</h3><p className="text-sm text-gray-600">Manage addresses here.</p></div>)}
                  {activeSection === 'orders' && (<div><h3 className="text-lg font-semibold mb-2 text-gray-800">My Orders</h3><p className="text-sm text-gray-600">Order history here.</p></div>)}
                  {!activeSection && (<p className="text-sm text-gray-500 text-center pt-4">Select an option.</p>)}
              </div>

              {/* Logout Button */}
              <button onClick={handleLogout} disabled={loading} className="flex items-center justify-center w-full px-4 py-2 mt-6 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors disabled:opacity-50">
                 {/* Show loader specifically for logout action */}
                  {loading && !currentUser ? <Loader2 size={18} className="mr-2 animate-spin" /> : <LogOut size={18} className="mr-2" />}
                  {loading && !currentUser ? 'Processing...' : 'Logout'}
              </button>
            </div>
          ) : (
            // --- Logged Out View (Login OR Signup Form) ---
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
          )}
        </div> {/* End Main Content Area */}

        {/* --- Footer / Toggle Auth Mode --- */}
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