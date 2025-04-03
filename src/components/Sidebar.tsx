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

// --- Error Message Details Type ---
interface ErrorMessageDetails extends FeedbackMessage {
    suggestModeChange?: 'toSignup' | 'toLogin'; // Optional: Suggest a mode change
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  // --- State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null); // Supabase User type
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // Start true for initial check
  const [isSigningUp, setIsSigningUp] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string>('');
  const emailInputRef = useRef<HTMLInputElement>(null);

  // --- Listener for Auth State Changes (Supabase) ---
  useEffect(() => {
    setLoading(true);
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) console.error("Error getting initial session:", error.message);
      const user = session?.user ?? null;
      setCurrentUser(user);
      if (!user) {
         resetAuthState(false); // Reset form state
         setIsSigningUp(false); // Ensure login mode on initial load if no user
      }
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const user = session?.user ?? null;
        setCurrentUser(user);
        setLoading(false); // Set loading false on *any* auth change event

        if (event === 'SIGNED_OUT' || !user) {
          resetAuthState(); // Resets form fields, feedback, activeSection
          setIsSigningUp(false); // Explicitly set back to login mode on logout/no user
        }
        if (event === 'SIGNED_IN') {
            setFeedback(null);
            setLoginData({ email: '', password: '' });
            setActiveSection(''); // Reset active section on login
            setIsSigningUp(false); // Ensure we are conceptually in login state after sign in
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []); // Keep dependency array empty

  // Helper to reset common state (form, feedback, section)
  const resetAuthState = (clearFeedback = true) => {
      setActiveSection('');
      setLoginData({ email: '', password: '' });
      if (clearFeedback) setFeedback(null);
      // No longer manages isSigningUp directly here - that's handled by callers or useEffect
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

  // --- Map Supabase Errors - Updated ---
   const getFriendlyErrorMessage = (
       error: AuthError | Error | any,
       currentIsSigningUp: boolean // Pass the current mode
   ): ErrorMessageDetails => {
       let message = "An unexpected error occurred. Please try again.";
       let type: 'error' | 'info' = 'error';
       let suggestModeChange: ErrorMessageDetails['suggestModeChange'] = undefined; // Initialize

       if (!error) return { type, text: message };

       const errorMessage = error.message || String(error) || ''; // Handle non-standard errors better
       console.error('Supabase Auth Error:', errorMessage);

       if (errorMessage.includes('Invalid login credentials')) {
            if (!currentIsSigningUp) { // Only suggest signup if currently trying to log in
                message = "Account not found with this email/password. Would you like to sign up instead?";
                type = 'info';
                suggestModeChange = 'toSignup'; // <<< Suggest changing mode
            } else {
                 // If this happens during signup, it's an unexpected state.
                 message = 'Signup failed. Please check your details.';
            }
       } else if (errorMessage.includes('User already registered') || errorMessage.includes('already exists')) {
            message = "This email is already registered. Please log in.";
            type = 'info';
            if (currentIsSigningUp) { // If they were trying to sign up...
                suggestModeChange = 'toLogin'; // <<< Suggest changing mode
            }
       } else if (errorMessage.includes('Password should be at least 6 characters')) {
            message = 'Password must be at least 6 characters long.';
       } else if (errorMessage.includes('Unable to validate email address: invalid format')) {
            message = 'Please enter a valid email address.';
       } else if (errorMessage.includes('Email rate limit exceeded') || errorMessage.includes('too many requests')) {
            message = 'Too many attempts. Please try again later.';
       } else if (errorMessage.includes('confirmation token is invalid') || errorMessage.includes('expired')){
            message = 'The confirmation link is invalid or has expired. Please try signing up again or request a password reset if you already have an account.';
            type = 'info'; // More informative than a hard error
       }
       else {
            // Keep the raw message for unhandled Supabase errors or other exceptions
            message = errorMessage || 'An unknown error occurred.';
       }

       return { type, text: message, suggestModeChange }; // <<< Return the suggestion
   };

  // --- Authentication Handler (Supabase) - Updated ---
  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null); // Clear previous feedback
    setLoading(true);

    try {
      let authResponse;
      if (isSigningUp) {
        // --- Sign Up ---
        authResponse = await supabase.auth.signUp({
          email: loginData.email,
          password: loginData.password,
        });
        console.log('Supabase signUp response:', authResponse);
        if (authResponse.error) throw authResponse.error; // Throw error to catch block

        // Handle user creation and potential email verification needed
        if (authResponse.data.user) {
             // Check if session is null, indicating email verification is needed
             if (!authResponse.data.session) {
                 setFeedback({ type: 'info', text: 'Account created! Check your email (including spam/junk folders) for a confirmation link to activate your account.' });
                 setLoginData({ email: '', password: '' }); // Clear form on success
                 setLoading(false); // Stop loading indicator here
                 // Don't try to create profile yet, wait for verification/login
             } else {
                 // Auto-verified (less common now) or already logged in
                 console.log('Signed up and logged in:', authResponse.data.user.email);
                 // Profile creation can happen here or be triggered by a db function on user creation
                 // setLoading(false) will be handled by the onAuthStateChange listener
             }
        } else {
             // Should not happen if no error, but handle defensively
             console.warn('Signup successful according to Supabase, but no user data returned.');
             setFeedback({ type: 'info', text: 'Signup process initiated. Please check your email.' });
             setLoading(false);
        }

      } else {
        // --- Log In ---
        authResponse = await supabase.auth.signInWithPassword({
          email: loginData.email,
          password: loginData.password,
        });
        console.log('Supabase signIn response:', authResponse);
        if (authResponse.error) throw authResponse.error; // Throw error to catch block

        console.log('Logged in:', authResponse.data.user?.email);
        // setLoading(false) handled by onAuthStateChange listener upon successful sign-in
      }

    } catch (error: any) {
      // Pass the *current* state of isSigningUp
      const feedbackDetails = getFriendlyErrorMessage(error, isSigningUp);

      // Set the feedback message
      setFeedback({ type: feedbackDetails.type, text: feedbackDetails.text });

      // <<< Perform state change *here* based on suggestion >>>
      if (feedbackDetails.suggestModeChange === 'toSignup') {
          setIsSigningUp(true);
          setLoginData({ email: loginData.email, password: '' }); // Keep email, clear pw
      } else if (feedbackDetails.suggestModeChange === 'toLogin') {
          setIsSigningUp(false);
          setLoginData({ email: loginData.email, password: '' }); // Keep email, clear pw
      }

      // Stop loading indicator after handling error
      setLoading(false);

      // Refocus email input on login errors (not info messages suggesting signup)
      if (!isSigningUp && emailInputRef.current && feedbackDetails.type === 'error') {
          emailInputRef.current.select(); // Select text for easier correction
          emailInputRef.current.focus();
      }
    }
    // No finally setLoading(false) needed because listener handles success, and catch handles errors.
  };


  // --- Logout Handler (Supabase) ---
  const handleLogout = async () => {
    setLoading(true);
    setFeedback(null);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout Error:', error.message);
      setFeedback({ type: 'error', text: "Failed to log out. Please try again." });
      setLoading(false); // Explicitly set loading false on error
    }
    // setLoading(false) handled by listener on success (SIGNED_OUT event)
  };

  // --- Toggle Signup/Login View ---
  const toggleAuthMode = () => {
    // Directly toggle the mode
    setIsSigningUp(prev => !prev);
    // Clear form data and feedback when *manually* switching modes
    resetAuthState(); // Use the helper to clear form/feedback/section
    // Optionally focus the email input when switching
    // Use setTimeout to ensure focus happens after render potentially
    setTimeout(() => emailInputRef.current?.focus(), 0);
  }


  // --- Render Logic (JSX) ---
  // ... (The rest of your JSX structure remains largely the same)
  // Make sure the inputs use loginData.email and loginData.password
  // Make sure the submit button checks `loading`
  // Make sure the toggle button calls `toggleAuthMode`

  return (
    <>
      {/* --- Overlay --- */}
      <div
        onClick={loading ? undefined : onClose} // Prevent close during loading
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
            disabled={loading && !currentUser} // Also disable close button if loading initial state
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
                 'bg-blue-50 border-blue-300 text-blue-800' // Info style
             }`}>
                 {feedback.type === 'error' || feedback.type === 'info' ?
                     <AlertCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" /> :
                     <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg> // Simple Check for success
                 }
                 <span>{feedback.text}</span>
             </div>
           )}

          {/* --- Loading Indicator (Initial Load or Auth Action) --- */}
          {/* Show loader ONLY if loading AND EITHER no user exists yet OR feedback is not set (avoid showing loader + error msg) */}
          {loading && (!currentUser || !feedback) && (
            <div className="flex justify-center items-center py-10">
                 <Loader2 size={32} className="animate-spin text-orange-600" />
                 <span className="ml-3 text-gray-600">Processing...</span>
            </div>
          )}

          {/* --- Logged In View --- */}
          {/* Show ONLY if NOT loading AND currentUser exists */}
          {!loading && currentUser ? (
            <div className="space-y-6">
              <p className="text-gray-600 truncate" title={currentUser.email}>Welcome, <span className='font-medium'>{currentUser.email}!</span></p> {/* Added styling + truncate */}

              {/* Dashboard Navigation */}
              <nav className="space-y-2">
                <button
                  className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors ${activeSection === 'tracking' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`}
                  onClick={() => setActiveSection('tracking')}
                >
                  <Truck size={18} className="mr-3 flex-shrink-0" /> Order Tracking
                </button>
                <button
                  className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors ${activeSection === 'delivery' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`}
                  onClick={() => setActiveSection('delivery')}
                >
                  <MapPin size={18} className="mr-3 flex-shrink-0" /> Delivery Details
                </button>
                <button
                  className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors ${activeSection === 'orders' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`}
                  onClick={() => setActiveSection('orders')}
                >
                  <ClipboardList size={18} className="mr-3 flex-shrink-0" /> My Orders
                </button>
              </nav>

              {/* Dashboard Content Display */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg min-h-[100px] border border-gray-200"> {/* Added border */}
                 {activeSection === 'tracking' && (
                    <div>
                        <h3 className="text-lg font-semibold mb-2 text-gray-800">Order Tracking</h3>
                        <p className="text-sm text-gray-600">Functionality to track your current orders will appear here.</p>
                        {/* Placeholder for actual tracking component/data */}
                    </div>
                 )}
                 {activeSection === 'delivery' && (
                    <div>
                        <h3 className="text-lg font-semibold mb-2 text-gray-800">Delivery Details</h3>
                        <p className="text-sm text-gray-600">View and manage your saved delivery addresses.</p>
                        {/* Placeholder for address component/data */}
                    </div>
                 )}
                 {activeSection === 'orders' && (
                    <div>
                        <h3 className="text-lg font-semibold mb-2 text-gray-800">My Orders</h3>
                        <p className="text-sm text-gray-600">Your past order history and their status.</p>
                        {/* Placeholder for order history component/data */}
                    </div>
                 )}
                 {!activeSection && (
                    <p className="text-sm text-gray-500 text-center pt-4 italic">Select an option from the menu above.</p> {/* Improved placeholder */}
                 )}
              </div>

              {/* Logout Button */}
               <button
                  onClick={handleLogout}
                  disabled={loading} // Disable while any loading is happening
                  className="flex items-center justify-center w-full px-4 py-2 mt-8 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" // Added disabled style
                >
                  {/* Show loader specifically for logout action if handleLogout is loading */}
                  {loading ? <Loader2 size={18} className="mr-2 animate-spin" /> : <LogOut size={18} className="mr-2" />}
                  {loading ? 'Logging out...' : 'Logout'}
                </button>
            </div>
          ) : null } {/* End Logged In View */}

          {/* --- Logged Out View (Login/Signup Form) --- */}
          {/* Show ONLY if NOT loading AND NO currentUser */}
          {!loading && !currentUser ? (
               <form onSubmit={handleAuth} className="space-y-4">
                 {/* Email Input */}
                 <div>
                   <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label> {/* Added 'Address' */}
                   <input
                      ref={emailInputRef}
                      id="email"
                      name="email" // Added name attribute
                      type="email"
                      autoComplete="email" // Added autocomplete
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      placeholder="you@example.com"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
                          feedback?.type === 'error' && feedback.text.toLowerCase().includes('email') ? 'border-red-500 ring-red-500' : 'border-gray-300' // More specific error styling
                      }`}
                      required
                      disabled={loading}
                    />
                 </div>
                 {/* Password Input */}
                 <div>
                    <div className="flex justify-between items-baseline"> {/* Flex container for label and forgot link */}
                       <label htmlFor="password"className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                       {!isSigningUp && (
                          <button
                              type="button" // Important: prevent form submission
                              className="text-xs text-orange-600 hover:underline focus:outline-none focus:ring-1 focus:ring-orange-500 rounded px-1" // Smaller, focus style
                              onClick={() => setFeedback({type: 'info', text:'Password reset functionality is not yet implemented. Please contact support if you need assistance.'})} // Clearer message
                              disabled={loading} // Disable if loading
                          >
                            Forgot password?
                          </button>
                        )}
                    </div>
                   <input
                      id="password"
                      name="password" // Added name attribute
                      type="password"
                      autoComplete={isSigningUp ? "new-password" : "current-password"} // Added autocomplete
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      placeholder="••••••••"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
                           feedback?.type === 'error' && feedback.text.toLowerCase().includes('password') ? 'border-red-500 ring-red-500' : 'border-gray-300' // More specific error styling
                      }`}
                      required
                      minLength={isSigningUp ? 6 : undefined} // Keep minLength only for signup
                      disabled={loading}
                    />
                     {isSigningUp && ( // Show password requirement hint only on signup
                        <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters long.</p>
                     )}
                 </div>

                 {/* Submit Button */}
                 <button
                   type="submit"
                   disabled={loading} // Disable button when loading
                   className="w-full bg-orange-600 text-white py-2.5 px-4 rounded-lg font-semibold hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center" // Added disabled style
                 >
                   {/* Show loader *inside* button ONLY when this specific action is loading */}
                   {loading && <Loader2 size={20} className="mr-2 animate-spin" />}
                   {loading ? 'Processing...' : (isSigningUp ? 'Create Account' : 'Log In')}
                 </button>
               </form>
            ) : null } {/* End Logged Out View */}

        </div> {/* End Main Content Area */}

        {/* --- Footer / Toggle Auth Mode --- */}
        {/* Show ONLY if NOT loading AND NO currentUser */}
        {!loading && !currentUser && (
           <div className="p-4 border-t border-gray-200 text-center flex-shrink-0 bg-gray-50"> {/* Added subtle bg */}
            <button
              onClick={toggleAuthMode}
              disabled={loading} // Disable if loading
              className="text-sm text-orange-600 hover:text-orange-800 hover:underline focus:outline-none focus:ring-1 focus:ring-orange-500 rounded px-1 disabled:opacity-50 disabled:cursor-not-allowed" // Added disabled style, hover variation
            >
              {isSigningUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        )}
      </div> {/* End Sidebar Panel */}
    </>
  );

}; // Closing brace for the component

// Need Supabase client and types at the top
import { supabase } from '../supabase'; // Ensure path is correct
import { User, AuthError } from '@supabase/supabase-js';

export default Sidebar; // Ensure export default is present