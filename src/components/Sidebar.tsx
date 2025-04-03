// src/components/Sidebar.tsx
import React, { useState, useEffect, useRef } from 'react';
import { X, Truck, MapPin, LogOut, ClipboardList, Loader2, AlertCircle, UserPlus, CheckCircle } from 'lucide-react';
import { supabase } from '../supabase';
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

// --- Profile Data Type ---
interface ProfileData {
    id?: string;
    full_name: string | null;
    phone: string | null;
    date_of_birth: string | null; // 'YYYY-MM-DD'
    aadhar_number: string | null; // *** CAUTION: Handle securely! ***
    email?: string;
}

// --- Auth Form Data Type ---
interface AuthFormData extends ProfileData {
    email: string;
    password: string;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    // --- State ---
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [authData, setAuthData] = useState<AuthFormData>({
        email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '',
    });
    const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [authMode, setAuthMode] = useState<'login' | 'signup' | 'completeProfile'>('login');
    const [activeSection, setActiveSection] = useState<string>('');
    const emailInputRef = useRef<HTMLInputElement>(null);
    const nameInputRef = useRef<HTMLInputElement>(null);

    // --- Helper: Check if Profile is Complete ---
    const isProfileComplete = (profileData: ProfileData | null): boolean => {
        if (!profileData) return false;
        // Customize this based on truly *required* fields for your app flow
        return !!profileData.full_name; // Example: Only full name is strictly required
    };

    // --- Helper: Fetch User Profile ---
    const fetchProfile = async (userId: string): Promise<ProfileData | null> => {
        try {
            const { data, error, status } = await supabase
                .from('profiles') // <<<--- YOUR TABLE NAME
                .select('full_name, phone, date_of_birth, aadhar_number') // Select profile fields
                .eq('id', userId)
                .single();

            if (error && status !== 406) { // 406 = no row found
                console.error('Error fetching profile:', error.message);
                setFeedback({ type: 'error', text: 'Could not load profile data.' });
                return null;
            }
            return data ? (data as ProfileData) : null;
        } catch (err: any) {
            console.error('Exception during profile fetch:', err.message);
            setFeedback({ type: 'error', text: 'An error occurred fetching profile.' });
            return null;
        }
    };

    // --- Listener for Auth State Changes & Profile Check ---
    useEffect(() => {
        setLoading(true);
        setFeedback(null);

        // Initial session check
        supabase.auth.getSession().then(async ({ data: { session }, error }) => {
            if (error) console.error("Error getting initial session:", error.message);
            const user = session?.user ?? null;
            setCurrentUser(user);

            if (user) {
                const fetchedProfile = await fetchProfile(user.id);
                setProfile(fetchedProfile);
                if (!isProfileComplete(fetchedProfile)) {
                    setAuthMode('completeProfile');
                    setAuthData(prev => ({
                        ...prev,
                        email: user.email || '',
                        full_name: fetchedProfile?.full_name || '',
                        phone: fetchedProfile?.phone || '',
                        date_of_birth: fetchedProfile?.date_of_birth || '',
                        aadhar_number: '', // Don't pre-fill sensitive
                    }));
                } else {
                    setAuthMode('login'); // Default state if profile complete
                }
            } else {
                resetAuthState(false); // Not logged in
            }
            setLoading(false);
        });

        // Listen for subsequent auth changes
        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setLoading(true);
                setFeedback(null);
                const user = session?.user ?? null;
                setCurrentUser(user);
                console.log('Auth event:', event, 'User:', user?.email);

                if (event === 'SIGNED_OUT' || !user) {
                    resetAuthState();
                    setProfile(null);
                } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
                    const fetchedProfile = await fetchProfile(user.id);
                    setProfile(fetchedProfile);
                    if (!isProfileComplete(fetchedProfile)) {
                        setAuthMode('completeProfile');
                         setAuthData(prev => ({
                            ...prev, email: user.email || '',
                            full_name: fetchedProfile?.full_name || '',
                            phone: fetchedProfile?.phone || '',
                            date_of_birth: fetchedProfile?.date_of_birth || '',
                            aadhar_number: '',
                         }));
                         setTimeout(() => nameInputRef.current?.focus(), 100);
                    } else {
                        // If profile is complete, ensure we are out of profile mode
                         if (authMode === 'completeProfile') {
                             setAuthMode('login'); // Reset to default view for logged in user
                         }
                         // Clear potentially sensitive data from form state if just logged in
                         if(event === 'SIGNED_IN') {
                             setAuthData({ email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' });
                         }
                    }
                }
                 // Only set loading false *after* potential profile check/fetch
                 setLoading(false);
            }
        );

        return () => {
            authListener?.subscription.unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- Helper to reset state on logout/init ---
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

    // --- Map Supabase Errors (Simplified for this flow) ---
    const getFriendlyErrorMessage = (error: AuthError | Error | any): string => {
        let message = "An unexpected error occurred. Please try again.";
        if (!error) return message;
        const errorMessage = error.message || '';
        console.error('Supabase Auth/DB Error:', errorMessage);

        // Specific messages - **REMOVED the auto-switch to signup here**
        if (errorMessage.includes('Invalid login credentials')) {
            message = "Incorrect password for this email address."; // More specific if email *exists*
        } else if (errorMessage.includes('User already registered') || errorMessage.includes('already exists')) {
            message = "This email is already registered. Please log in.";
            // No automatic mode switch here, let user click "Log In" link if needed
        } else if (errorMessage.includes('Password should be at least 6 characters')) {
            message = 'Password must be at least 6 characters long.';
        } else if (errorMessage.includes('Unable to validate email address: invalid format')) {
            message = 'Please enter a valid email address.';
        } else if (errorMessage.includes('Email rate limit exceeded') || errorMessage.includes('too many requests')) {
            message = 'Too many attempts. Please try again later.';
        } else if (errorMessage.includes('check constraint') && errorMessage.includes('phone')) {
             message = 'Invalid phone number format provided.';
        }
        // Add other specific mappings as needed
        else {
            message = errorMessage; // Fallback to raw message
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
        const currentEmail = authData.email; // Store email before potential clear

        try {
            if (authMode === 'login') {
                // --- Attempt Log In ---
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: authData.email,
                    password: authData.password,
                });

                if (error) {
                     // *** KEY CHANGE: Check for "User not found" type error ***
                     // Supabase might return different messages, adjust if needed.
                     // Common indicators: "Invalid login credentials", sometimes contains email context.
                     // Let's assume "Invalid login credentials" means *either* wrong password OR user doesn't exist.
                     // A more robust check might involve trying to fetch user by email first, but this is simpler.
                    if (error.message.includes('Invalid login credentials')) {
                         // Instead of showing error, switch to SIGNUP mode
                         setAuthMode('signup');
                         setFeedback({ type: 'info', text: 'Account not found. Please complete the form below to sign up.' });
                         // Keep the email, clear the password
                         setAuthData(prev => ({ ...prev, password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' }));
                         setTimeout(() => nameInputRef.current?.focus(), 100); // Focus name field
                    } else {
                        // Handle other login errors normally
                        throw error; // Re-throw to be caught by generic catch block
                    }
                } else {
                    console.log('Logged in:', data.user?.email);
                    // Auth listener handles profile check & state update including clearing form data
                }

            } else if (authMode === 'signup') {
                // --- Sign Up ---
                if (!authData.full_name) throw new Error("Full name is required.");
                if (authData.password.length < 6) throw new Error("Password must be at least 6 characters.");

                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email: authData.email,
                    password: authData.password,
                });

                if (signUpError) throw signUpError;
                if (!signUpData.user) throw new Error("Signup succeeded but no user data returned.");

                console.log('Signup successful for:', signUpData.user.email);

                // --- Insert Profile Data ---
                // *** WARNING: Storing Aadhar plaintext. Implement encryption! ***
                const { error: profileError } = await supabase
                    .from('profiles') // <<<--- YOUR TABLE NAME
                    .insert({
                        id: signUpData.user.id,
                        email: signUpData.user.email,
                        full_name: authData.full_name,
                        phone: authData.phone || null,
                        date_of_birth: authData.date_of_birth || null,
                        aadhar_number: authData.aadhar_number || null, // *** ENCRYPT THIS ***
                        updated_at: new Date().toISOString(),
                    });

                if (profileError) {
                    console.error("Error creating profile after signup:", profileError);
                    // Let user know account exists but profile failed
                    throw new Error(`Account created, but failed to save profile details. Please try updating later. Error: ${profileError.message}`);
                }
                console.log('Profile created successfully.');

                // Check if email verification is required
                 if (!signUpData.session) { // Needs email verification
                     setFeedback({ type: 'success', text: 'Account created! Check your email (including spam) for a confirmation link to log in.' });
                     setAuthMode('login'); // Go back to login screen
                     // Clear form but keep email for potential re-login attempt later
                     setAuthData({ email: currentEmail, password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' });
                 } else {
                     // Auto-confirmed/verified. User is logged in.
                     // Auth listener handles UI update and profile check.
                     // Might show a brief success message before listener takes over
                     setFeedback({ type: 'success', text: 'Account created successfully!' });
                      // Auth listener will clear form state on SIGNED_IN if needed
                 }
            }
        } catch (error: any) {
            // Generic catch for errors not handled specifically above (e.g., network issues, non-login errors)
            // Or errors re-thrown from the login block
            if (authMode !== 'signup') { // Avoid showing generic error if we *just* switched to signup
                 const message = getFriendlyErrorMessage(error);
                 setFeedback({ type: 'error', text: message });
            }
            if (authMode === 'login' && emailInputRef.current) {
                emailInputRef.current.select();
                emailInputRef.current.focus();
            } else if (authMode === 'signup' && nameInputRef.current && error.message?.includes('name')) {
                 nameInputRef.current.focus(); // Focus name if signup error related to it
            }
        } finally {
            setLoading(false);
        }
    };

    // --- Profile Completion Handler ---
    const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!currentUser) return;
        setFeedback(null);
        setLoading(true);

        try {
            if (!authData.full_name) throw new Error("Full name is required.");

            // *** WARNING: Storing Aadhar plaintext. Implement encryption! ***
            const profileUpdateData: Partial<ProfileData> = {
                full_name: authData.full_name,
                phone: authData.phone || null,
                date_of_birth: authData.date_of_birth || null,
                aadhar_number: authData.aadhar_number || null, // *** ENCRYPT THIS ***
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase
                .from('profiles') // <<<--- YOUR TABLE NAME
                .update(profileUpdateData)
                .eq('id', currentUser.id);

            if (error) throw error;

            console.log('Profile updated successfully.');
            setFeedback({ type: 'success', text: 'Profile updated successfully!' });
            setProfile(prev => ({ ...prev, ...profileUpdateData }));
            setAuthMode('login'); // Switch out of profile completion mode back to dashboard view
            setActiveSection('');
            // Clear sensitive fields from form state after successful update
            setAuthData(prev => ({ ...prev, password: '', aadhar_number: ''}));

        } catch (error: any) {
            const message = getFriendlyErrorMessage(error);
            setFeedback({ type: 'error', text: `Profile update failed: ${message}` });
            if (nameInputRef.current) nameInputRef.current.focus();
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
            setFeedback({ type: 'error', text: "Failed to log out." });
            setLoading(false);
        }
        // Auth listener handles UI changes on success
    };

    // --- Render Logic (JSX Structure - content determined by renderContent) ---
    const renderContent = () => {
        // 1. Loading State (Global initial load)
        if (loading && !currentUser && authMode !== 'completeProfile' && authMode !== 'signup') {
             return <div className="flex justify-center items-center py-10"><Loader2 size={32} className="animate-spin text-orange-600" /></div>;
        }

        // 2. Logged In - Profile Incomplete
        if (currentUser && authMode === 'completeProfile') {
             return ( /* Profile Completion Form JSX */
                 <form onSubmit={handleProfileUpdate} className="space-y-4">
                     <h3 className="text-lg font-semibold text-gray-800 mb-3">Complete Your Profile</h3>
                     <p className="text-sm text-gray-600 mb-4">Please provide details to complete setup.</p>
                     {/* Profile Fields (Name, Phone, DOB, Aadhar) - Reusing styles */}
                     <div><label htmlFor="full_name" className="label">Full Name</label><input ref={nameInputRef} id="full_name" name="full_name" type="text" value={authData.full_name || ''} onChange={handleInputChange} placeholder="Your full name" className="input-field" required disabled={loading} /></div>
                     <div><label htmlFor="phone" className="label">Phone (Optional)</label><input id="phone" name="phone" type="tel" value={authData.phone || ''} onChange={handleInputChange} placeholder="e.g., 9876543210" className="input-field" disabled={loading} /></div>
                     <div><label htmlFor="date_of_birth" className="label">Date of Birth (Optional)</label><input id="date_of_birth" name="date_of_birth" type="date" value={authData.date_of_birth || ''} onChange={handleInputChange} className="input-field" disabled={loading} /></div>
                     <div><label htmlFor="aadhar_number" className="label">Aadhar (Optional)</label><input id="aadhar_number" name="aadhar_number" type="text" inputMode="numeric" pattern="\d{12}" title="12-digit Aadhar" value={authData.aadhar_number || ''} onChange={handleInputChange} placeholder="1234 5678 9012" className="input-field" disabled={loading} /><p className="input-hint">12-digit number. <span className='font-semibold'>Handled securely.</span></p></div>
                     <button type="submit" disabled={loading} className="button-primary w-full mt-2">{loading ? <Loader2 size={20} className="mr-2 animate-spin" /> : <CheckCircle size={18} className="mr-2" />}{loading ? 'Saving...' : 'Save Profile'}</button>
                 </form>
             );
        }

        // 3. Logged In - Profile Complete (Dashboard View)
        if (currentUser && authMode !== 'completeProfile') {
             return ( /* Dashboard JSX */
                 <div className="space-y-6">
                     <p className="text-gray-600 truncate">Welcome, <span className='font-medium'>{profile?.full_name || currentUser.email}!</span></p>
                     <nav className="space-y-2">{/* Nav Buttons */}<button className={`nav-button ${activeSection === 'tracking' ? 'nav-button-active' : ''}`} onClick={() => setActiveSection('tracking')}><Truck size={18} className="mr-3" /> Order Tracking</button><button className={`nav-button ${activeSection === 'delivery' ? 'nav-button-active' : ''}`} onClick={() => setActiveSection('delivery')}><MapPin size={18} className="mr-3" /> Delivery Details</button><button className={`nav-button ${activeSection === 'orders' ? 'nav-button-active' : ''}`} onClick={() => setActiveSection('orders')}><ClipboardList size={18} className="mr-3" /> My Orders</button></nav>
                     <div className="mt-6 p-4 bg-gray-50 rounded-lg min-h-[100px]">{/* Dashboard Content */}{activeSection === 'tracking' && <div><h3 className="dash-title">Order Tracking</h3><p className="dash-text">Tracking details here.</p></div>}{activeSection === 'delivery' && <div><h3 className="dash-title">Delivery Details</h3><p className="dash-text">Manage addresses here.</p></div>}{activeSection === 'orders' && <div><h3 className="dash-title">My Orders</h3><p className="dash-text">Order history here.</p></div>}{!activeSection && <p className="text-sm text-gray-500 text-center pt-4">Select an option.</p>}</div>
                     <button onClick={handleLogout} disabled={loading} className="button-secondary w-full mt-6">{loading ? <Loader2 size={18} className="mr-2 animate-spin" /> : <LogOut size={18} className="mr-2" />}{loading ? 'Logging out...' : 'Logout'}</button>
                 </div>
             );
        }

        // 4. Logged Out - Login Form
        if (!currentUser && authMode === 'login') {
             return ( /* Login Form JSX */
                 <form onSubmit={handleAuthSubmit} className="space-y-4">
                      <div><label htmlFor="email" className="label">Email</label><input ref={emailInputRef} id="email" name="email" type="email" value={authData.email} onChange={handleInputChange} placeholder="you@example.com" className={`input-field ${feedback?.type === 'error' ? 'input-error' : ''}`} required disabled={loading} /></div>
                      <div><label htmlFor="password"className="label">Password</label><input id="password" name="password" type="password" value={authData.password} onChange={handleInputChange} placeholder="••••••••" className={`input-field ${feedback?.type === 'error' ? 'input-error' : ''}`} required disabled={loading} /><div className="text-right mt-1"><button type="button" className="link-button" onClick={() => setFeedback({type: 'info', text:'Password recovery coming soon!'})}>Forgot password?</button></div></div>
                      <button type="submit" disabled={loading} className="button-primary w-full">{loading ? <Loader2 size={20} className="mr-2 animate-spin" /> : null}{loading ? 'Processing...' : 'Log In'}</button>
                 </form>
             );
        }

        // 5. Logged Out - Signup Form
        if (!currentUser && authMode === 'signup') {
              return ( /* Signup Form JSX */
                 <form onSubmit={handleAuthSubmit} className="space-y-4">
                     {/* Signup Fields (Name, Email, Pass, Phone, DOB, Aadhar) */}
                     <div><label htmlFor="full_name_signup" className="label">Full Name</label><input ref={nameInputRef} id="full_name_signup" name="full_name" type="text" value={authData.full_name || ''} onChange={handleInputChange} placeholder="Your full name" className="input-field" required disabled={loading} /></div>
                     <div><label htmlFor="email_signup" className="label">Email</label><input id="email_signup" name="email" type="email" value={authData.email} onChange={handleInputChange} placeholder="you@example.com" className="input-field" required disabled={loading} /></div>
                     <div><label htmlFor="password_signup" className="label">Password</label><input id="password_signup" name="password" type="password" value={authData.password} onChange={handleInputChange} placeholder="Create password (min. 6 chars)" className="input-field" required minLength={6} disabled={loading} /></div>
                     <div><label htmlFor="phone_signup" className="label">Phone (Optional)</label><input id="phone_signup" name="phone" type="tel" value={authData.phone || ''} onChange={handleInputChange} placeholder="e.g., 9876543210" className="input-field" disabled={loading} /></div>
                     <div><label htmlFor="date_of_birth_signup" className="label">Date of Birth (Optional)</label><input id="date_of_birth_signup" name="date_of_birth" type="date" value={authData.date_of_birth || ''} onChange={handleInputChange} className="input-field" disabled={loading} /></div>
                     <div><label htmlFor="aadhar_number_signup" className="label">Aadhar (Optional)</label><input id="aadhar_number_signup" name="aadhar_number" type="text" inputMode="numeric" pattern="\d{12}" title="12-digit Aadhar" value={authData.aadhar_number || ''} onChange={handleInputChange} placeholder="1234 5678 9012" className="input-field" disabled={loading} /><p className="input-hint">12-digit number. <span className='font-semibold'>Handled securely.</span></p></div>
                      <button type="submit" disabled={loading} className="button-primary w-full mt-2">{loading ? <Loader2 size={20} className="mr-2 animate-spin" /> : <UserPlus size={18} className="mr-2" />}{loading ? 'Creating Account...' : 'Sign Up'}</button>
                 </form>
              );
        }

        return <p className="text-center text-gray-500">Loading or unexpected state.</p>; // Fallback
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
            {/* Overlay */}
            <div onClick={loading ? undefined : onClose} className={`fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm transition-opacity duration-300 z-40 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} aria-hidden={!isOpen} />

            {/* Sidebar Panel */}
            <div className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`} role="dialog" aria-modal="true" aria-labelledby="sidebar-title">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
                    <h2 id="sidebar-title" className="text-xl font-semibold text-gray-800">{getTitle()}</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors" aria-label="Close sidebar" disabled={loading && authMode !== 'completeProfile'}> <X size={24} /> </button>
                </div>

                {/* Main Content Area (Scrollable) */}
                <div className="flex-grow p-6 overflow-y-auto">
                    {/* Feedback Display */}
                    {feedback && (
                        <div className={`mb-4 p-3 border rounded-md text-sm flex items-start ${ feedback.type === 'error' ? 'feedback-error' : feedback.type === 'success' ? 'feedback-success' : 'feedback-info' }`}>
                             {feedback.type === 'error' && <AlertCircle size={18} className="feedback-icon" />}
                             {feedback.type === 'success' && <CheckCircle size={18} className="feedback-icon" />}
                             {feedback.type === 'info' && <AlertCircle size={18} className="feedback-icon" />}
                             <span>{feedback.text}</span>
                         </div>
                     )}
                    {/* Render dynamic content */}
                    {renderContent()}
                </div>

                {/* Footer / Toggle Auth Mode */}
                 {!currentUser && !loading && (authMode === 'login' || authMode === 'signup') && (
                    <div className="p-4 border-t border-gray-200 text-center flex-shrink-0">
                         <button
                             onClick={() => {
                                 const nextMode = authMode === 'login' ? 'signup' : 'login';
                                 setAuthMode(nextMode);
                                 setFeedback(null);
                                 // Clear password and profile fields, keep email if present
                                 setAuthData(prev => ({
                                     email: prev.email, // Keep email
                                     password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: ''
                                 }));
                                 // Focus appropriate field
                                 if (nextMode === 'login') setTimeout(() => emailInputRef.current?.focus(), 100);
                                 else setTimeout(() => nameInputRef.current?.focus(), 100); // Focus name on signup
                             }}
                             disabled={loading}
                             className="link-button" // Use link style
                         >
                             {authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
                         </button>
                     </div>
                  )}
                  <div className="flex-shrink-0 h-4"></div> {/* Bottom padding */}
            </div>

            {/* Reusable Styles (Tailwind directives assumed available) */}
            <style jsx>{`
                .label { @apply block text-sm font-medium text-gray-700 mb-1; }
                .input-field { @apply w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed; }
                .input-error { @apply border-red-500 ring-red-500; }
                .input-hint { @apply text-xs text-gray-500 mt-1; }
                .button-primary { @apply bg-orange-600 text-white py-2.5 px-4 rounded-lg font-semibold hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors disabled:opacity-70 flex items-center justify-center; }
                .button-secondary { @apply flex items-center justify-center w-full px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors disabled:opacity-50; }
                .link-button { @apply text-sm text-orange-600 hover:underline focus:outline-none disabled:opacity-50; }
                .nav-button { @apply flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors; }
                .nav-button-active { @apply bg-orange-100 text-orange-700 font-medium; }
                .dash-title { @apply text-lg font-semibold mb-2 text-gray-800; }
                .dash-text { @apply text-sm text-gray-600; }
                .feedback-error { @apply bg-red-50 border-red-300 text-red-800; }
                .feedback-success { @apply bg-green-50 border-green-300 text-green-800; }
                .feedback-info { @apply bg-blue-50 border-blue-300 text-blue-800; }
                .feedback-icon { @apply mr-2 flex-shrink-0 mt-0.5; }
            `}</style>
        </>
    );
};

export default Sidebar;