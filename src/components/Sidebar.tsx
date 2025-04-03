// src/components/Sidebar.tsx
import React, { useState, useEffect, useRef } from 'react';
import { X, Truck, MapPin, LogOut, ClipboardList, Loader2, AlertCircle, UserPlus, CheckCircle } from 'lucide-react'; // Added UserPlus, CheckCircle
import { supabase } from '../supabase'; // Ensure this path is correct
import { User, AuthError } from '@supabase/supabase-js';

// --- Prop Types ---
interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

// --- Feedback Message Types ---
interface FeedbackMessage {
    type: 'error' | 'success' | 'info';
    text: string;
}

// --- Profile Data Type (Matches your Supabase 'profiles' table) ---
interface ProfileData {
    id?: string; // User ID from Supabase Auth
    full_name: string | null;
    phone: string | null;
    date_of_birth: string | null; // Store as 'YYYY-MM-DD' string
    aadhar_number: string | null; // *** CAUTION: Handle securely (encrypt)! ***
    email?: string; // Usually fetched from auth user
}

// --- Auth Form Data Type ---
interface AuthFormData extends ProfileData {
    email: string;
    password: string;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    // --- State ---
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<ProfileData | null>(null); // Store fetched profile data
    const [authData, setAuthData] = useState<AuthFormData>({ // Combined login/signup data
        email: '',
        password: '',
        full_name: '',
        phone: '',
        date_of_birth: '',
        aadhar_number: '',
    });
    const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
    const [loading, setLoading] = useState<boolean>(true); // Start true for initial check
    const [authMode, setAuthMode] = useState<'login' | 'signup' | 'completeProfile'>('login'); // 'login', 'signup', 'completeProfile'
    const [activeSection, setActiveSection] = useState<string>(''); // For logged-in dashboard
    const emailInputRef = useRef<HTMLInputElement>(null);
    const nameInputRef = useRef<HTMLInputElement>(null); // For focusing profile form

    // --- Helper: Check if Profile is Complete ---
    // Define which fields are mandatory for a "complete" profile
    const isProfileComplete = (profileData: ProfileData | null): boolean => {
        if (!profileData) return false;
        // Add checks for all required fields here
        return !!profileData.full_name; // Example: Only name is required for now
        // return !!profileData.full_name && !!profileData.phone && !!profileData.date_of_birth && !!profileData.aadhar_number;
    };

    // --- Helper: Fetch User Profile ---
    const fetchProfile = async (userId: string): Promise<ProfileData | null> => {
        try {
            console.log(`Fetching profile for user ID: ${userId}`);
            const { data, error, status } = await supabase
                .from('profiles') // <<<--- YOUR SUPABASE TABLE NAME HERE
                .select('full_name, phone, date_of_birth, aadhar_number') // Select profile fields
                .eq('id', userId)
                .single(); // We expect only one profile per user

            if (error && status !== 406) { // 406 means no row found, which is okay initially
                 console.error('Error fetching profile:', error.message);
                 setFeedback({ type: 'error', text: 'Could not load profile data.' });
                 return null;
            }

            if (data) {
                console.log('Profile data found:', data);
                return data as ProfileData;
            } else {
                console.log('No profile data found for user.');
                return null; // No profile exists yet
            }
        } catch (err: any) {
            console.error('Exception during profile fetch:', err.message);
            setFeedback({ type: 'error', text: 'An error occurred while fetching your profile.' });
            return null;
        }
    };

    // --- Listener for Auth State Changes & Profile Check ---
    useEffect(() => {
        setLoading(true);
        setFeedback(null); // Clear feedback on initial load/change

        // Initial session check
        supabase.auth.getSession().then(async ({ data: { session }, error }) => {
            if (error) console.error("Error getting initial session:", error.message);
            const user = session?.user ?? null;
            setCurrentUser(user);

            if (user) {
                const fetchedProfile = await fetchProfile(user.id);
                setProfile(fetchedProfile);
                if (!isProfileComplete(fetchedProfile)) {
                    console.log("Profile incomplete, setting mode to completeProfile");
                    setAuthMode('completeProfile'); // Prompt profile completion
                    setAuthData(prev => ({ // Pre-fill email for convenience
                        ...prev,
                        email: user.email || '',
                        full_name: fetchedProfile?.full_name || '',
                        phone: fetchedProfile?.phone || '',
                        date_of_birth: fetchedProfile?.date_of_birth || '',
                        aadhar_number: '', // Don't pre-fill sensitive data
                    }));
                } else {
                    setAuthMode('login'); // Reset mode if profile is complete
                }
            } else {
                resetAuthState(false); // Not logged in
            }
            setLoading(false);
        });

        // Listen for subsequent auth changes
        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setLoading(true); // Set loading during transition
                setFeedback(null); // Clear feedback on auth change
                const user = session?.user ?? null;
                setCurrentUser(user);
                console.log('Auth event:', event, 'User:', user?.email);

                if (event === 'SIGNED_OUT' || !user) {
                    resetAuthState();
                    setProfile(null); // Clear profile on logout
                } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
                    // Fetch profile whenever signed in or user data might have changed
                    const fetchedProfile = await fetchProfile(user.id);
                    setProfile(fetchedProfile);
                    if (!isProfileComplete(fetchedProfile)) {
                        console.log("Profile incomplete after SIGNED_IN/USER_UPDATED, setting mode to completeProfile");
                        setAuthMode('completeProfile');
                         setAuthData(prev => ({
                            ...prev,
                            email: user.email || '',
                            full_name: fetchedProfile?.full_name || '',
                            phone: fetchedProfile?.phone || '',
                            date_of_birth: fetchedProfile?.date_of_birth || '',
                            aadhar_number: '',
                        }));
                         // Focus the first field of the profile form when it appears
                         setTimeout(() => nameInputRef.current?.focus(), 100);
                    } else {
                        // If profile is complete, ensure we're not stuck in a profile mode
                        if (authMode === 'completeProfile') {
                           setAuthMode('login'); // Or perhaps better to just clear the mode if logged in?
                        }
                        setFeedback(null); // Clear any previous auth feedback
                        // Don't clear form data here, might be needed if profile completion was just done
                    }
                }
                setLoading(false); // Loading finished
            }
        );

        return () => {
            authListener?.subscription.unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only once on mount

    // --- Helper to reset state ---
    const resetAuthState = (clearFeedback = true) => {
        setActiveSection('');
        setAuthData({ email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' });
        if (clearFeedback) setFeedback(null);
        setAuthMode('login');
        setProfile(null);
    };

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

    // --- Map Supabase Errors ---
    const getFriendlyErrorMessage = (error: AuthError | Error | any): string => {
        let message = "An unexpected error occurred. Please try again.";
        if (!error) return message;
        const errorMessage = error.message || '';
        console.error('Supabase Auth/DB Error:', errorMessage); // Log the raw error

        if (errorMessage.includes('Invalid login credentials')) {
            message = "Invalid email or password.";
        } else if (errorMessage.includes('User already registered') || errorMessage.includes('already exists')) {
            message = "This email is already registered. Please log in or use a different email.";
            setAuthMode('login'); // Switch back to login mode
        } else if (errorMessage.includes('Password should be at least 6 characters')) {
            message = 'Password must be at least 6 characters long.';
        } else if (errorMessage.includes('Unable to validate email address: invalid format')) {
            message = 'Please enter a valid email address.';
        } else if (errorMessage.includes('Email rate limit exceeded') || errorMessage.includes('too many requests')) {
            message = 'Too many attempts. Please try again later.';
        } else if (errorMessage.includes('duplicate key value violates unique constraint "profiles_pkey"')) {
             message = 'Profile already exists for this user.'; // Should ideally not happen with upsert
        } else if (errorMessage.includes('check constraint') && errorMessage.includes('phone')) {
             message = 'Invalid phone number format provided.';
        } else if (errorMessage.includes('value too long') && errorMessage.includes('aadhar')) {
             message = 'Aadhar number provided is too long.';
        }
        // Add more specific error mappings here if needed
        else {
            message = errorMessage; // Default to Supabase message if not mapped
        }
        return message;
    };

    // --- Form Input Change Handler ---
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setAuthData(prev => ({ ...prev, [name]: value }));
    };

    // --- Combined Authentication / Signup Handler ---
    const handleAuthSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFeedback(null);
        setLoading(true);

        try {
            if (authMode === 'login') {
                // --- Log In ---
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: authData.email,
                    password: authData.password,
                });
                if (error) throw error;
                console.log('Logged in:', data.user?.email);
                // Auth listener will handle profile check and state update

            } else if (authMode === 'signup') {
                // --- Sign Up ---
                 // **Basic Client-Side Validation (Example)**
                 if (!authData.full_name) throw new Error("Full name is required.");
                 if (authData.password.length < 6) throw new Error("Password must be at least 6 characters.");
                 // Add more validation as needed (phone format, DOB, Aadhar format)

                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email: authData.email,
                    password: authData.password,
                    // Options for additional user metadata (less common now with separate profiles table)
                    // options: {
                    //   data: { full_name: authData.full_name } // Can store some initial data here if needed
                    // }
                });

                if (signUpError) throw signUpError;
                if (!signUpData.user) throw new Error("Signup succeeded but no user data returned.");

                console.log('Signup successful for:', signUpData.user.email);

                 // --- Insert Profile Data after successful signup ---
                 // *** WARNING: Storing Aadhar number plaintext here. Implement encryption! ***
                 const { error: profileError } = await supabase
                     .from('profiles') // <<<--- YOUR SUPABASE TABLE NAME HERE
                     .insert({
                         id: signUpData.user.id, // Link to the newly created auth user
                         email: signUpData.user.email, // Store email in profile too (optional but can be useful)
                         full_name: authData.full_name,
                         phone: authData.phone || null, // Ensure null if empty
                         date_of_birth: authData.date_of_birth || null, // Ensure null if empty
                         aadhar_number: authData.aadhar_number || null, // *** ENCRYPT THIS VALUE ***
                         updated_at: new Date().toISOString(),
                     });

                 if (profileError) {
                     console.error("Error creating profile after signup:", profileError);
                     // Note: User is created in auth, but profile failed. May need cleanup or retry logic.
                     throw new Error(`Account created, but failed to save profile details: ${profileError.message}`);
                 }

                 console.log('Profile created successfully for new user.');

                // Check if email verification is required
                 if (!signUpData.session) { // V2: Check if session is null (means email verification needed)
                     setFeedback({ type: 'success', text: 'Account created! Check your email (including spam) for a confirmation link.' });
                     setAuthMode('login'); // Set back to login mode after signup message
                     setAuthData({ email: authData.email, password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' }); // Clear sensitive fields
                 } else {
                     // Auto-confirmed or email verification disabled. User is logged in.
                     // Auth listener will fetch profile and handle UI update.
                      setFeedback({ type: 'success', text: 'Account created successfully!'});
                     // Clear form after successful auto-confirmed signup + profile creation
                      resetAuthState(false); // Keep success feedback
                 }
            }
        } catch (error: any) {
            const message = getFriendlyErrorMessage(error);
            setFeedback({ type: 'error', text: message });
            if (authMode === 'login' && emailInputRef.current) {
                emailInputRef.current.select(); // Select email on login failure
                emailInputRef.current.focus();
            }
            if (authMode === 'signup' && nameInputRef.current && error.message?.includes('name')) {
                nameInputRef.current.focus();
            }
        } finally {
            setLoading(false);
        }
    };

     // --- Profile Completion Handler ---
     const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
         e.preventDefault();
         if (!currentUser) return; // Should not happen if form is visible

         setFeedback(null);
         setLoading(true);

         try {
             // **Basic Client-Side Validation (Example)**
             if (!authData.full_name) throw new Error("Full name is required.");
              // Add more validation as needed

              // *** WARNING: Storing Aadhar number plaintext here. Implement encryption! ***
             const profileUpdateData: Partial<ProfileData> = {
                 full_name: authData.full_name,
                 phone: authData.phone || null,
                 date_of_birth: authData.date_of_birth || null,
                 aadhar_number: authData.aadhar_number || null, // *** ENCRYPT THIS VALUE ***
                 updated_at: new Date().toISOString(),
             };

             const { error } = await supabase
                 .from('profiles') // <<<--- YOUR SUPABASE TABLE NAME HERE
                 .update(profileUpdateData)
                 .eq('id', currentUser.id);

             if (error) throw error;

             console.log('Profile updated successfully.');
             setFeedback({ type: 'success', text: 'Profile updated successfully!' });
             setProfile({ ...profile, ...profileUpdateData }); // Update local profile state
             setAuthMode('login'); // Switch out of profile completion mode
             setActiveSection(''); // Go back to dashboard overview
             // Optionally clear specific fields from authData if needed, but keep email/potentially name
             setAuthData(prev => ({
                 ...prev,
                 password: '', // Clear password field
                 aadhar_number: '', // Clear sensitive field after submission
             }));


         } catch (error: any) {
             const message = getFriendlyErrorMessage(error);
             setFeedback({ type: 'error', text: `Profile update failed: ${message}` });
             // Focus the first field on error
             if (nameInputRef.current) {
                 nameInputRef.current.focus();
             }
         } finally {
             setLoading(false);
         }
     };

    // --- Logout Handler ---
    const handleLogout = async () => {
        setLoading(true);
        setFeedback(null);
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Logout Error:', error.message);
            setFeedback({ type: 'error', text: "Failed to log out. Please try again." });
            setLoading(false); // Only stop loading if error occurs
        }
        // Auth listener handles UI changes on success (including setting loading to false)
    };

    // --- Render Logic (JSX) ---
    const renderContent = () => {
        // 1. Loading State (Global)
        if (loading && !currentUser && authMode !== 'completeProfile') { // Show loader unless completing profile
             return (
                 <div className="flex justify-center items-center py-10">
                     <Loader2 size={32} className="animate-spin text-orange-600" />
                 </div>
             );
        }

        // 2. Logged In - Profile Incomplete
        if (currentUser && authMode === 'completeProfile') {
            return (
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Complete Your Profile</h3>
                    <p className="text-sm text-gray-600 mb-4">Please provide a few more details to complete your account setup.</p>

                    {/* --- Profile Fields --- */}
                     <div>
                        <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input ref={nameInputRef} id="full_name" name="full_name" type="text" value={authData.full_name || ''} onChange={handleInputChange} placeholder="Your full name" className="input-field" required disabled={loading} />
                    </div>
                     <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number (Optional)</label>
                        <input id="phone" name="phone" type="tel" value={authData.phone || ''} onChange={handleInputChange} placeholder="e.g., 9876543210" className="input-field" disabled={loading} />
                    </div>
                     <div>
                        <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-1">Date of Birth (Optional)</label>
                        <input id="date_of_birth" name="date_of_birth" type="date" value={authData.date_of_birth || ''} onChange={handleInputChange} className="input-field" disabled={loading} />
                    </div>
                    <div>
                        <label htmlFor="aadhar_number" className="block text-sm font-medium text-gray-700 mb-1">Aadhar Number (Optional)</label>
                        <input id="aadhar_number" name="aadhar_number" type="text" inputMode="numeric" pattern="\d{12}" title="Enter 12-digit Aadhar number" value={authData.aadhar_number || ''} onChange={handleInputChange} placeholder="1234 5678 9012" className="input-field" disabled={loading} />
                        <p className="text-xs text-gray-500 mt-1">Please enter your 12-digit Aadhar number. <span className='font-semibold'>Handled securely.</span></p> {/* *** Add note about security *** */}
                    </div>
                    {/* Email is usually read-only here, linked to auth */}
                    {/* Password is not needed for profile update */}

                    <button type="submit" disabled={loading} className="button-primary w-full mt-2">
                        {loading ? <Loader2 size={20} className="mr-2 animate-spin" /> : <CheckCircle size={18} className="mr-2" />}
                        {loading ? 'Saving...' : 'Save Profile'}
                    </button>
                </form>
            );
        }

        // 3. Logged In - Profile Complete (Dashboard View)
        if (currentUser && authMode !== 'completeProfile') {
            return (
                <div className="space-y-6">
                    <p className="text-gray-600 truncate">Welcome, <span className='font-medium'>{profile?.full_name || currentUser.email}!</span></p>

                    {/* Dashboard Navigation */}
                    <nav className="space-y-2">
                        <button className={`nav-button ${activeSection === 'tracking' ? 'nav-button-active' : ''}`} onClick={() => setActiveSection('tracking')}>
                            <Truck size={18} className="mr-3 flex-shrink-0" /> Order Tracking
                        </button>
                         <button className={`nav-button ${activeSection === 'delivery' ? 'nav-button-active' : ''}`} onClick={() => setActiveSection('delivery')}>
                            <MapPin size={18} className="mr-3 flex-shrink-0" /> Delivery Details
                        </button>
                        <button className={`nav-button ${activeSection === 'orders' ? 'nav-button-active' : ''}`} onClick={() => setActiveSection('orders')}>
                            <ClipboardList size={18} className="mr-3 flex-shrink-0" /> My Orders
                        </button>
                    </nav>

                    {/* Dashboard Content Display */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg min-h-[100px]">
                        {activeSection === 'tracking' && <div><h3 className="dash-title">Order Tracking</h3><p className="dash-text">Functionality to track your current orders will appear here.</p></div>}
                        {activeSection === 'delivery' && <div><h3 className="dash-title">Delivery Details</h3><p className="dash-text">View and manage your saved delivery addresses.</p></div>}
                        {activeSection === 'orders' && <div><h3 className="dash-title">My Orders</h3><p className="dash-text">Your past order history and their status.</p></div>}
                        {!activeSection && <p className="text-sm text-gray-500 text-center pt-4">Select an option from the menu.</p>}
                    </div>

                    {/* Logout Button */}
                    <button onClick={handleLogout} disabled={loading} className="button-secondary w-full mt-6">
                        {loading && authMode !== 'completeProfile' ? <Loader2 size={18} className="mr-2 animate-spin" /> : <LogOut size={18} className="mr-2" />}
                        {loading && authMode !== 'completeProfile' ? 'Logging out...' : 'Logout'}
                    </button>
                </div>
            );
        }

        // 4. Logged Out - Login Form
        if (!currentUser && authMode === 'login') {
            return (
                <form onSubmit={handleAuthSubmit} className="space-y-4">
                     <div>
                       <label htmlFor="email" className="label">Email</label>
                       <input ref={emailInputRef} id="email" name="email" type="email" value={authData.email} onChange={handleInputChange} placeholder="you@example.com" className={`input-field ${feedback?.type === 'error' ? 'input-error' : ''}`} required disabled={loading} />
                     </div>
                     <div>
                       <label htmlFor="password"className="label">Password</label>
                       <input id="password" name="password" type="password" value={authData.password} onChange={handleInputChange} placeholder="••••••••" className={`input-field ${feedback?.type === 'error' ? 'input-error' : ''}`} required disabled={loading} />
                        <div className="text-right mt-1">
                          <button type="button" className="text-sm text-orange-600 hover:underline focus:outline-none"
                              onClick={() => setFeedback({type: 'info', text:'Password recovery feature coming soon!'})}>
                            Forgot password?
                          </button>
                        </div>
                     </div>
                     <button type="submit" disabled={loading} className="button-primary w-full">
                       {loading ? <Loader2 size={20} className="mr-2 animate-spin" /> : null}
                       {loading ? 'Processing...' : 'Log In'}
                     </button>
                </form>
            );
        }

        // 5. Logged Out - Signup Form
        if (!currentUser && authMode === 'signup') {
             return (
                <form onSubmit={handleAuthSubmit} className="space-y-4">
                     {/* --- Signup Fields --- */}
                     <div>
                        <label htmlFor="full_name_signup" className="label">Full Name</label>
                        <input ref={nameInputRef} id="full_name_signup" name="full_name" type="text" value={authData.full_name || ''} onChange={handleInputChange} placeholder="Your full name" className="input-field" required disabled={loading} />
                    </div>
                    <div>
                       <label htmlFor="email_signup" className="label">Email</label>
                       <input id="email_signup" name="email" type="email" value={authData.email} onChange={handleInputChange} placeholder="you@example.com" className="input-field" required disabled={loading} />
                     </div>
                    <div>
                       <label htmlFor="password_signup" className="label">Password</label>
                       <input id="password_signup" name="password" type="password" value={authData.password} onChange={handleInputChange} placeholder="Create a password (min. 6 chars)" className="input-field" required minLength={6} disabled={loading} />
                    </div>
                     <div>
                        <label htmlFor="phone_signup" className="label">Phone Number (Optional)</label>
                        <input id="phone_signup" name="phone" type="tel" value={authData.phone || ''} onChange={handleInputChange} placeholder="e.g., 9876543210" className="input-field" disabled={loading} />
                    </div>
                     <div>
                        <label htmlFor="date_of_birth_signup" className="label">Date of Birth (Optional)</label>
                        <input id="date_of_birth_signup" name="date_of_birth" type="date" value={authData.date_of_birth || ''} onChange={handleInputChange} className="input-field" disabled={loading} />
                    </div>
                    <div>
                        <label htmlFor="aadhar_number_signup" className="label">Aadhar Number (Optional)</label>
                        <input id="aadhar_number_signup" name="aadhar_number" type="text" inputMode="numeric" pattern="\d{12}" title="Enter 12-digit Aadhar number" value={authData.aadhar_number || ''} onChange={handleInputChange} placeholder="1234 5678 9012" className="input-field" disabled={loading} />
                         <p className="text-xs text-gray-500 mt-1">Enter 12-digit number. <span className='font-semibold'>Handled securely.</span></p> {/* *** Add note about security *** */}
                    </div>

                     <button type="submit" disabled={loading} className="button-primary w-full mt-2">
                       {loading ? <Loader2 size={20} className="mr-2 animate-spin" /> : <UserPlus size={18} className="mr-2" />}
                       {loading ? 'Creating Account...' : 'Sign Up'}
                     </button>
                </form>
             );
        }

        // Fallback (should ideally not be reached)
        return <p className="text-center text-gray-500">Something went wrong.</p>;
    };


    // Determine Title based on state
    const getTitle = () => {
        if (loading && !currentUser) return 'Loading...';
        if (currentUser && authMode === 'completeProfile') return 'Complete Your Profile';
        if (currentUser) return 'My Account';
        if (authMode === 'signup') return 'Create Account';
        return 'Log In';
    };

    return (
        <>
            {/* --- Overlay --- */}
            <div
                onClick={loading ? undefined : onClose} // Allow closing if only profile completion is loading
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
                        {getTitle()}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full text-gray-500 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors"
                        aria-label="Close sidebar"
                        disabled={loading && authMode !== 'completeProfile'} // Disable close during critical loading, allow during profile load
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
                            {feedback.type === 'error' && <AlertCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" />}
                            {feedback.type === 'success' && <CheckCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" />}
                            {feedback.type === 'info' && <AlertCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" />} {/* Or use an Info icon */}
                            <span>{feedback.text}</span>
                        </div>
                    )}

                    {/* Render appropriate content based on state */}
                    {renderContent()}

                </div> {/* End Main Content Area */}

                {/* --- Footer / Toggle Auth Mode --- */}
                {/* Show toggle only when logged out */}
                 {!currentUser && !loading && (authMode === 'login' || authMode === 'signup') && (
                   <div className="p-4 border-t border-gray-200 text-center flex-shrink-0">
                        <button
                            onClick={() => {
                                setAuthMode(authMode === 'login' ? 'signup' : 'login');
                                setFeedback(null); // Clear feedback when switching modes
                                setAuthData(prev => ({ // Clear password and profile fields, keep email if entered
                                     email: prev.email, password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: ''
                                }));
                            }}
                            disabled={loading}
                            className="text-sm text-orange-600 hover:underline focus:outline-none disabled:opacity-50"
                        >
                            {authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
                        </button>
                    </div>
                 )}

                 {/* Add some padding at the bottom */}
                 <div className="flex-shrink-0 h-4"></div>

            </div> {/* End Sidebar Panel */}

             {/* Add some basic reusable styles (optional, place in your global CSS or here) */}
             <style jsx>{`
                .label {
                    @apply block text-sm font-medium text-gray-700 mb-1;
                 }
                .input-field {
                     @apply w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed;
                }
                 .input-error {
                     @apply border-red-500 ring-red-500;
                 }
                .button-primary {
                     @apply bg-orange-600 text-white py-2.5 px-4 rounded-lg font-semibold hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors disabled:opacity-70 flex items-center justify-center;
                 }
                 .button-secondary {
                     @apply flex items-center justify-center w-full px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors disabled:opacity-50;
                 }
                 .nav-button {
                     @apply flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors;
                 }
                 .nav-button-active {
                     @apply bg-orange-100 text-orange-700 font-medium;
                 }
                 .dash-title {
                    @apply text-lg font-semibold mb-2 text-gray-800;
                 }
                .dash-text {
                     @apply text-sm text-gray-600;
                }
             `}</style>
        </>
    );
};

export default Sidebar;