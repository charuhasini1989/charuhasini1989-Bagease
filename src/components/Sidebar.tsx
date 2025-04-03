// src/components/Sidebar.tsx
// ... (Keep imports, interfaces, state definitions, other functions the same) ...

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
     // --- State ---
     const [currentUser, setCurrentUser] = useState<User | null>(null);
     const [profileData, setProfileData] = useState<Profile | null>(null);
     const [formData, setFormData] = useState<FormData>({
         email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '',
     });
     const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
     // `loading` ONLY for the very initial session check on mount
     const [loading, setLoading] = useState<boolean>(true);
     // `authLoading` for disabling inputs/buttons during async auth actions
     const [authLoading, setAuthLoading] = useState<boolean>(false);
     const [isSigningUp, setIsSigningUp] = useState<boolean>(false);
     const [activeSection, setActiveSection] = useState<string>('');
     const emailInputRef = useRef<HTMLInputElement>(null);
     const nameInputRef = useRef<HTMLInputElement>(null);
     const aadharInputRef = useRef<HTMLInputElement>(null);
   
     // --- Helper: Fetch User Profile ---
     // ... (Keep fetchProfile function as is) ...
     const fetchProfile = async (userId: string): Promise<Profile | null> => {
         console.log(`FETCH_PROFILE: Fetching for user ID: ${userId}`);
         try {
             const { data, error, status } = await supabase
                 .from('profiles')
                 .select('full_name, phone, date_of_birth, aadhar_number, email')
                 .eq('id', userId)
                 .maybeSingle();
   
             if (error && status !== 406) {
                 console.error('FETCH_PROFILE: Error fetching profile:', error.message);
                 return null;
             }
             if (data) {
                 console.log('FETCH_PROFILE: Success, data:', data);
                 return data as Profile;
             }
             console.log('FETCH_PROFILE: No profile found.');
             return null;
         } catch (err: any) {
             console.error('FETCH_PROFILE: Exception:', err.message);
             return null;
         }
     };
   
     // --- Listener for Auth State Changes & Profile Fetch ---
     useEffect(() => {
       // setLoading(true); // Already set by default useState
   
       console.log("AUTH_EFFECT: Initializing");
       let initialCheckComplete = false; // Flag to prevent listener actions before initial check
   
       // 1. Check initial session FIRST
       supabase.auth.getSession().then(async ({ data: { session }, error }) => {
         console.log("AUTH_EFFECT: Initial getSession result", { session: !!session, error });
         if (error) {
             console.error("AUTH_EFFECT: Error getting initial session:", error.message);
             // Potentially set feedback, but main goal is to stop loading
         }
         const user = session?.user ?? null;
         setCurrentUser(user); // Set user based on initial check
   
         if (user) {
           const profile = await fetchProfile(user.id); // Fetch profile if user exists initially
           // Check if user is STILL the same after await, in case listener fired quickly
           if (supabase.auth.getUser()?.id === user.id) {
                setProfileData(profile);
           } else {
                console.log("AUTH_EFFECT: User changed during initial profile fetch, discarding stale profile data.");
           }
         } else {
           setProfileData(null); // Clear profile if no initial user
           resetAuthState(false); // Reset form if logged out initially
         }
   
         console.log("AUTH_EFFECT: Initial check complete. Setting loading = false.");
         initialCheckComplete = true; // Mark initial check as done
         setLoading(false); // <--- Crucial: Stop initial loading indicator
       }).catch(err => {
           console.error("AUTH_EFFECT: Unhandled error during initial getSession processing:", err);
           initialCheckComplete = true; // Still mark as complete on error
           setLoading(false); // Ensure loading stops even if initial check fails
       });
   
       // 2. Listen for subsequent changes AFTER initial check potentially completes
       const { data: authListener } = supabase.auth.onAuthStateChange(
         async (event, session) => {
           // Wait for initial check to avoid race conditions / redundant actions
           // Although usually the listener fires *after* getSession resolves, this is safer
           if (!initialCheckComplete) {
               console.log(`AUTH_LISTENER: Received event ${event} before initial check complete, ignoring.`);
               return;
           }
   
           console.log(`AUTH_LISTENER: Event received - ${event}`, { session: !!session });
           const user = session?.user ?? null;
           // Important: Use the user from the session provided by the event
   
           // Stop any ongoing button-specific loading when an auth event resolves
           // (unless it's an error handled specifically elsewhere)
           // Set authLoading false early, except maybe for logout which might need it briefly?
           // Let's set it false generally, and handle specific cases if needed.
           setAuthLoading(false);
   
           try {
             const currentUserSnapshot = supabase.auth.getUser(); // Get current user state *at this moment*
             console.log(`AUTH_LISTENER: Current user state before processing ${event}:`, { user_id: currentUserSnapshot?.id });
   
   
             if (event === 'SIGNED_OUT') {
               console.log("AUTH_LISTENER: Handling SIGNED_OUT");
               // No need to set general `loading` state here.
               setCurrentUser(null); // Update user state
               setProfileData(null); // Clear profile
               resetAuthState();     // Clear form, feedback, etc.
               // authLoading should already be false or set false by handleLogout error handler
               setAuthLoading(false); // Ensure it's false
   
             } else if (event === 'SIGNED_IN') {
               console.log("AUTH_LISTENER: Handling SIGNED_IN for user:", user?.id);
               if (!user) {
                   console.warn("AUTH_LISTENER: SIGNED_IN event received but session user is null. Resetting state.");
                   setCurrentUser(null);
                   setProfileData(null);
                   resetAuthState();
                   return; // Exit early
               }
               // Don't set general `loading` state.
               setFeedback(null); // Clear temporary feedback (like 'account not found')
               setFormData({ email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' }); // Clear form
               setIsSigningUp(false); // Ensure login mode view
               setCurrentUser(user); // Update user state FIRST
   
               // Fetch profile for the newly signed-in user
               const profile = await fetchProfile(user.id);
               // Check if user is still the same after await, event could be superseded
                if (supabase.auth.getUser()?.id === user.id) {
                    setProfileData(profile);
                    console.log("AUTH_LISTENER: SIGNED_IN profile fetched and set:", profile);
               } else {
                   console.log("AUTH_LISTENER: User changed during SIGNED_IN profile fetch, discarding stale data.");
               }
   
             } else if (event === 'USER_UPDATED' && user) {
               console.log("AUTH_LISTENER: Handling USER_UPDATED for user:", user.id);
               // Don't set general `loading` state.
               setCurrentUser(user); // Update user object (e.g., email verification status might change)
               // Re-fetch profile as details might have been updated externally or via other means
               const profile = await fetchProfile(user.id);
                if (supabase.auth.getUser()?.id === user.id) {
                   setProfileData(profile); // Update profile state
                   console.log("AUTH_LISTENER: USER_UPDATED profile re-fetched and set:", profile);
               } else {
                   console.log("AUTH_LISTENER: User changed during USER_UPDATED profile fetch, discarding stale data.");
               }
   
   
             } else if (event === 'PASSWORD_RECOVERY') {
                 console.log("AUTH_LISTENER: Handling PASSWORD_RECOVERY");
                 setFeedback({type: 'info', text: 'Password recovery email sent. Check your inbox.'});
                 // authLoading should be turned off by the component triggering recovery, but ensure it here too.
                 setAuthLoading(false);
   
             } else if (event === 'TOKEN_REFRESHED') {
                  console.log("AUTH_LISTENER: Handling TOKEN_REFRESHED");
                  // Usually no UI change needed. Session is updated automatically.
                  // If 'user' object might change, uncomment setCurrentUser(user);
                  // setCurrentUser(user);
                  setAuthLoading(false); // Ensure any related loading stops
   
             } else {
                console.log(`AUTH_LISTENER: Event ${event} - no specific state change action taken for this event.`);
                // Ensure authLoading is off even for unhandled events.
                setAuthLoading(false);
             }
           } catch (listenerError) {
               console.error("AUTH_LISTENER: Error during event handling:", listenerError);
                setFeedback({ type: 'error', text: 'An error occurred updating account state.'})
                // Ensure loading states are off on error
                setAuthLoading(false);
                // Do not touch the main `loading` state here.
           } finally {
               // No need to manage general 'loading' state in finally block anymore
               console.log(`AUTH_LISTENER: Finished processing ${event}.`);
           }
         }
       );
   
       return () => {
         console.log("AUTH_EFFECT: Unsubscribing auth listener");
         authListener?.subscription.unsubscribe();
       };
     }, []); // Run only on mount
   
   
     // Helper to reset state (Keep as is)
     const resetAuthState = (clearFeedback = true) => {
         console.log("RESET_AUTH_STATE: Called");
         setActiveSection('');
         setFormData({ email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' });
         if (clearFeedback) setFeedback(null);
         setIsSigningUp(false);
         // Note: currentUser and profileData are managed by the listener now
     }
   
     // --- Body Scroll Lock --- (Keep as is)
     useEffect(() => {
       if (isOpen) document.body.style.overflow = 'hidden';
       else document.body.style.overflow = 'unset';
       return () => { document.body.style.overflow = 'unset'; };
     }, [isOpen]);
   
      // --- Input Change Handler --- (Keep as is)
      const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
           const { name, value } = e.target;
           setFormData(prev => ({ ...prev, [name]: value }));
      };
   
   
     // --- Map Supabase Errors --- (Keep as is)
      const getFriendlyErrorMessage = (error: AuthError | Error | any, context: 'login' | 'signup' | 'profile'): { type: 'error' | 'info', text: string } => {
           let message = "An unexpected error occurred. Please try again.";
           let type: 'error' | 'info' = 'error';
           if (!error) return { type, text: message };
           const errorMessage = error.message || '';
           console.error(`GET_ERROR_MESSAGE (${context}): Raw error:`, errorMessage);
   
           if (errorMessage.includes('Invalid login credentials')) { message = "Invalid email or password."; type = 'error'; }
           else if (errorMessage.includes('User already registered')) { message = "This email is already registered."; type = 'error'; }
           else if (errorMessage.includes('Password should be at least 6 characters')) { message = 'Password must be at least 6 characters.'; type = 'error'; }
           else if (errorMessage.includes('Unable to validate email address: invalid format')) { message = 'Please enter a valid email address.'; type = 'error'; }
           else if (errorMessage.includes('Email rate limit exceeded')) { message = 'Too many attempts. Try again later.'; type = 'error'; }
           else if (errorMessage.includes('profiles_pkey') || (errorMessage.includes('duplicate key') && errorMessage.includes('profiles'))) { message = 'Failed to save profile (may already exist).'; type = 'error'; }
           else if (errorMessage.includes('violates not-null constraint') && errorMessage.includes('full_name')) { message = 'Full Name is required.'; type = 'error'; }
           else if (errorMessage.includes('violates not-null constraint') && errorMessage.includes('aadhar_number')) { message = 'Aadhar Number is required.'; type = 'error'; }
           else if (errorMessage.includes('check constraint') && errorMessage.includes('profiles_aadhar_format')) { message = 'Aadhar must be 12 digits.'; type = 'error'; }
           else { message = errorMessage; type = 'error'; }
   
           console.log(`GET_ERROR_MESSAGE (${context}): Friendly message:`, { type, message });
           return { type, text: message };
      };
   
     // --- Authentication Handler (Supabase) --- (Keep as is)
     const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
       e.preventDefault();
       setFeedback(null);
       setAuthLoading(true);
       const currentFormData = { ...formData };
       const actionType = isSigningUp ? 'Signup' : 'Login';
       console.log(`HANDLE_AUTH: Starting ${actionType}`, { email: currentFormData.email });
   
       try {
         if (isSigningUp) {
           // --- Sign Up ---
           console.log("HANDLE_AUTH (Signup): Validating inputs...");
           if (!currentFormData.full_name.trim()) throw new Error("Full name is required.");
           if (!currentFormData.aadhar_number.trim()) throw new Error("Aadhar number is required.");
           const aadharRegex = /^\d{12}$/;
           if (!aadharRegex.test(currentFormData.aadhar_number)) throw new Error("Please enter a valid 12-digit Aadhar number.");
           if (currentFormData.password.length < 6) throw new Error("Password must be at least 6 characters.");
           console.log("HANDLE_AUTH (Signup): Validation passed.");
   
           console.log("HANDLE_AUTH (Signup): Calling supabase.auth.signUp...");
           const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
             email: currentFormData.email, password: currentFormData.password,
           });
           if (signUpError) throw signUpError;
           if (!signUpData.user) throw new Error("Auth signup successful but user data missing.");
           console.log("HANDLE_AUTH (Signup): Auth signup successful for:", signUpData.user.id);
   
           console.log("HANDLE_AUTH (Signup): Attempting profile insert...");
           const { error: profileError } = await supabase.from('profiles').insert({
               id: signUpData.user.id, email: signUpData.user.email, full_name: currentFormData.full_name,
               phone: currentFormData.phone || null, date_of_birth: currentFormData.date_of_birth || null,
               aadhar_number: currentFormData.aadhar_number,
           });
           if (profileError) {
               console.error("HANDLE_AUTH (Signup): Profile insert error", profileError);
               throw profileError;
           }
           console.log('HANDLE_AUTH (Signup): Profile insert successful.');
   
           if (!signUpData.session) {
               console.log("HANDLE_AUTH (Signup): Email verification required.");
               setFeedback({ type: 'success', text: 'Account created! Check email (inc spam) for confirmation link.' });
               setIsSigningUp(false);
               setFormData(prev => ({ ...prev, password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' }));
               setAuthLoading(false); // Stop loading manually here
               console.log("HANDLE_AUTH (Signup): Finished processing (verification needed).");
           } else {
               console.log("HANDLE_AUTH (Signup): Auto-confirmed or verification disabled. User logged in.");
               // Listener ('SIGNED_IN') will handle UI update, profile fetch, and stop authLoading state.
               console.log("HANDLE_AUTH (Signup): Finished processing (auto-logged in). Listener will take over.");
           }
   
         } else {
           // --- Log In ---
           console.log("HANDLE_AUTH (Login): Calling signInWithPassword...");
           const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
             email: currentFormData.email, password: currentFormData.password,
           });
   
           if (signInError) {
               console.error("HANDLE_AUTH (Login): Sign in error", signInError);
               if (signInError.message.includes('Invalid login credentials')) {
                    console.log("HANDLE_AUTH (Login): Account not found, switching to signup mode.");
                    setFeedback({ type: 'info', text: "Account not found. Please complete the form below to sign up." });
                    setIsSigningUp(true);
                    setFormData(prev => ({ ...prev, password: '' }));
                    setTimeout(() => nameInputRef.current?.focus(), 100);
                    setAuthLoading(false); // Stop loading manually
                    return;
               } else {
                   throw signInError;
               }
           }
           console.log('HANDLE_AUTH (Login): Login successful for:', signInData.user?.email);
           // Listener ('SIGNED_IN') will handle UI update, profile fetch, and stop authLoading state.
         }
   
       } catch (error: any) {
         console.error(`HANDLE_AUTH (Catch Block - ${actionType}): Error occurred`, error);
         const errorContext = isSigningUp ? 'signup' : 'login';
         const isProfileErrorDuringSignup = isSigningUp && (error.message.includes('profiles_') || error.message.includes('constraint'));
         const feedbackMessage = getFriendlyErrorMessage(error, isProfileErrorDuringSignup ? 'profile' : errorContext);
   
         if (isSigningUp && error.message.includes('User already registered')) {
             setFeedback({ type: 'error', text: "This email is already registered. Please log in." });
             setIsSigningUp(false);
             setFormData(prev => ({ ...prev, password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' }));
             setTimeout(() => emailInputRef.current?.focus(), 100);
         } else {
             setFeedback(feedbackMessage);
         }
         setAuthLoading(false); // Stop action loading on error
   
         // Focus logic (keep as is)
         if (!isSigningUp) {
              if (emailInputRef.current && (feedbackMessage.text.includes('email') || feedbackMessage.text.includes('registered'))) emailInputRef.current.focus();
              else if (feedbackMessage.text.includes('password')) emailInputRef.current?.focus();
         } else {
              if (nameInputRef.current && error.message.includes('Full name')) nameInputRef.current.focus();
              else if (aadharInputRef.current && (error.message.includes('Aadhar') || error.message.includes('12-digit'))) aadharInputRef.current.focus();
         }
       }
     };
   
     // --- Logout Handler --- (Keep as is)
     const handleLogout = async () => {
       console.log("HANDLE_LOGOUT: Starting logout");
       setAuthLoading(true);
       setFeedback(null);
       try {
           const { error } = await supabase.auth.signOut();
           if (error) throw error;
           console.log("HANDLE_LOGOUT: Logout successful (listener will handle state reset)");
           // Listener ('SIGNED_OUT') handles state reset and stops authLoading state.
       } catch(error: any) {
           console.error('HANDLE_LOGOUT: Logout Error:', error.message);
           setFeedback({ type: 'error', text: "Failed to log out. Please try again." });
           setAuthLoading(false); // Stop loading only on error
       }
     };
   
     // --- Toggle Signup/Login View --- (Keep as is)
     const toggleAuthMode = () => {
       const enteringSignupMode = !isSigningUp;
       console.log(`TOGGLE_AUTH_MODE: Switching to ${enteringSignupMode ? 'Signup' : 'Login'}`);
       setIsSigningUp(enteringSignupMode);
       setFormData(prev => ({ email: prev.email, password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' }));
       setFeedback(null);
       setTimeout(() => {
           if (enteringSignupMode && nameInputRef.current) nameInputRef.current.focus();
           else if (!enteringSignupMode && emailInputRef.current) emailInputRef.current.focus();
       }, 100);
     }
   
     // --- Reusable Input Field Classes --- (Keep as is)
     const inputClasses = (hasError: boolean = false) =>
       `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
         hasError ? 'border-red-500 ring-red-500' : 'border-gray-300'
       } disabled:bg-gray-100 disabled:cursor-not-allowed`;
   
     // --- Render Logic (JSX) --- (Keep as is)
     // Add a log to check state right before render decisions
     console.log("RENDER CHECK:", { loading, currentUser: !!currentUser, authLoading });
   
     return (
       <>
         {/* Overlay */}
         <div onClick={authLoading || loading ? undefined : onClose} className={`fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm transition-opacity duration-300 z-40 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} aria-hidden={!isOpen} />
   
         {/* Sidebar Panel */}
         <div className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`} role="dialog" aria-modal="true" aria-labelledby="sidebar-title">
           {/* Header */}
           <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
             <h2 id="sidebar-title" className="text-xl font-semibold text-gray-800">
               {/* Show 'Loading...' ONLY during the very initial session check */}
               {loading ? 'Loading...' :
                /* Show 'Processing...' if a button action is in progress */
                authLoading ? 'Processing...' :
                /* Otherwise, show state based on currentUser */
                currentUser ? 'My Account' :
                isSigningUp ? 'Create Account' : 'Log In'}
             </h2>
             <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors" aria-label="Close sidebar"
              // Disable close only if an auth action is running OR it's the initial load
              disabled={authLoading || loading} >
                <X size={24} />
              </button>
           </div>
   
           {/* Main Content Area */}
           <div className="flex-grow p-6 overflow-y-auto">
             {/* Feedback */}
             {feedback && ( <div className={`mb-4 p-3 border rounded-md text-sm flex items-start ${ feedback.type === 'error' ? 'bg-red-50 border-red-300 text-red-800' : feedback.type === 'success' ? 'bg-green-50 border-green-300 text-green-800' : 'bg-blue-50 border-blue-300 text-blue-800' }`}> <AlertCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" /> <span>{feedback.text}</span> </div> )}
   
             {/* Initial Loading Indicator - Show ONLY during initial load (`loading` is true) */}
             {loading && ( <div className="flex justify-center items-center py-10"> <Loader2 size={32} className="animate-spin text-orange-600" /> </div> )}
   
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