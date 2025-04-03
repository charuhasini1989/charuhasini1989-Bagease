// src/components/Sidebar.tsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient'; // Adjust path as needed
import { AuthError, Session, User } from '@supabase/supabase-js';
import { IoClose } from 'react-icons/io5'; // Example using react-icons for close button

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const [isSigningUp, setIsSigningUp] = useState(false); // Default to login view
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [feedback, setFeedback] = useState<{ type: 'error' | 'info' | 'success', text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeSection, setActiveSection] = useState<'auth' | 'account' | ''>(''); // To control content display

  const emailInputRef = useRef<HTMLInputElement>(null); // For focusing input

  // --- Authentication State Listener ---
  useEffect(() => {
    setLoading(true);
    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      setCurrentUser(user);
      setActiveSection(user ? 'account' : 'auth'); // Show account if logged in, auth otherwise
      setLoading(false);
      if (!user) {
        setIsSigningUp(false); // Ensure login mode if no user initially
      }
    });

    // Listener for subsequent changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const user = session?.user ?? null;
        setCurrentUser(user);
        setLoading(false); // Stop loading on auth event

        console.log('Auth Event:', event, 'User:', user); // Debug log

        if (event === 'SIGNED_OUT' || !user) {
            resetAuthState(); // Resets form fields, feedback
            setActiveSection('auth'); // Show auth form on logout/no user
            setIsSigningUp(false); // Explicitly set back to login mode
            // Do NOT automatically close sidebar on logout, user might want to log back in
        }
        if (event === 'INITIAL_SESSION' && user) {
             setActiveSection('account'); // Show account details if already logged in
        }
        if (event === 'SIGNED_IN') {
            setFeedback(null);
            setLoginData({ email: '', password: '' });
            setActiveSection('account'); // Switch to account view after login/signup
            setIsSigningUp(false); // Conceptually in "logged in" state now
            // Optionally close the sidebar after successful sign-in/sign-up
            setTimeout(onClose, 500); // Close sidebar after a short delay
        }
      }
    );

    return () => {
      authListener?.unsubscribe();
    };
  }, [onClose]); // Add onClose to dependency array as it's used in SIGNED_IN


  // --- Form Input Handling ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData(prev => ({ ...prev, [name]: value }));
    setFeedback(null); // Clear feedback on input change
  };

  // --- Toggle Signup/Login View ---
  const toggleAuthMode = () => {
    setIsSigningUp(prev => !prev);
    setLoginData({ email: '', password: '' });
    setFeedback(null);
    // Optionally focus the email input when switching
    setTimeout(() => emailInputRef.current?.focus(), 0);
  }

  // --- Reset Helper ---
  const resetAuthState = (clearFeedback = true) => {
      // Keep activeSection as 'auth' if resetting due to logout/error
      // setActiveSection(''); // Only clear active section if needed elsewhere
      setLoginData({ email: '', password: '' });
      if (clearFeedback) setFeedback(null);
      // isSigningUp is handled explicitly in SIGNED_OUT/error logic now
  }

  // --- Error Message Helper ---
   const getFriendlyErrorMessage = (error: AuthError | Error | any): { type: 'error' | 'info', text: string } => {
    let message = "An unexpected error occurred. Please try again.";
    let type: 'error' | 'info' = 'error';
    if (!error) return { type, text: message };
    const errorMessage = error.message || String(error) || ''; // Ensure errorMessage is a string
    console.error('Supabase Auth Error:', error); // Log the full error object

    let shouldSwitchToSignup = false;
    let shouldSwitchToLogin = false;

    if (errorMessage.includes('Invalid login credentials')) {
         if (!isSigningUp) {
             message = "Account not found or invalid password. Try again or sign up?";
             type = 'info';
             // No automatic switch, let user decide. Keep suggestion.
         } else {
              // Should not happen during signup, indicates a logic flaw or unexpected API state
              message = 'Signup failed: Invalid credentials format or unexpected issue.';
         }
    } else if (errorMessage.includes('User already registered') || errorMessage.includes('already exists')) {
         message = "This email is already registered. Please log in.";
         type = 'info';
         shouldSwitchToLogin = true; // Mark to switch view
    } else if (errorMessage.includes('Password should be at least 6 characters')) {
         message = 'Password must be at least 6 characters long.';
    } else if (errorMessage.includes('Unable to validate email address: invalid format')) {
         message = 'Please enter a valid email address.';
    } else if (errorMessage.includes('Email rate limit exceeded') || errorMessage.includes('too many requests')) {
         message = 'Too many attempts. Please try again later.';
    } else if (errorMessage.includes('signup requires a valid password')) {
         message = 'Please enter a password.';
    } else {
         // Try to use the specific message if available, otherwise fallback
         message = error.message || "An unknown authentication error occurred.";
    }

    // Set feedback state immediately
    setFeedback({ type, text: message });

    // Apply mode switch *after* setting feedback
    if (shouldSwitchToSignup) { // This condition is not currently triggered in the logic above but kept for structure
        setIsSigningUp(true);
    }
    if (shouldSwitchToLogin) {
        setIsSigningUp(false);
    }

    // Return is not strictly needed if setting state directly, but can be useful
    return { type, text: message };
};


  // --- Login Handler ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });
      if (error) throw error;
      // Success state handled by onAuthStateChange listener (sets activeSection, closes sidebar)
      setFeedback({ type: 'success', text: 'Login successful! Redirecting...' }); // Optional immediate feedback
    } catch (error: any) {
      getFriendlyErrorMessage(error); // Sets feedback state internally
    } finally {
      setLoading(false);
    }
  };

  // --- Signup Handler ---
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const { error } = await supabase.auth.signUp({
        email: loginData.email,
        password: loginData.password,
        // Add options like metadata if needed:
        // options: {
        //   data: { full_name: 'Optional Name' }
        // }
      });
      if (error) throw error;
      // Usually requires email confirmation
      setFeedback({ type: 'success', text: 'Signup successful! Please check your email to confirm your account.' });
      // Don't automatically log in or close sidebar until email is confirmed
      // Reset form, stay on auth view but maybe clear password
       setLoginData(prev => ({ ...prev, password: '' }));
       // The onAuthStateChange listener might fire depending on Supabase settings,
       // adjust logic if immediate login occurs without email confirmation.
    } catch (error: any) {
      getFriendlyErrorMessage(error); // Sets feedback state internally
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
      console.error('Error logging out:', error);
      setFeedback({ type: 'error', text: 'Logout failed. Please try again.' });
    }
    // State reset is handled by onAuthStateChange listener (sets activeSection to 'auth')
    setLoading(false);
  };


  // --- Component Render ---
  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose} // Close sidebar when overlay is clicked
        aria-hidden="true" // Hide from screen readers when not visible
      />

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 right-0 h-full w-80 max-w-[90vw] bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sidebar-title"
      >
        <div className="p-6 h-full flex flex-col">
          {/* Header with Close Button */}
          <div className="flex justify-between items-center mb-6">
            <h2 id="sidebar-title" className="text-xl font-semibold text-gray-800">
              {/* Dynamic Title */}
              {activeSection === 'account' ? 'My Account' : (isSigningUp ? 'Sign Up' : 'Log In')}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              aria-label="Close sidebar"
            >
              <IoClose size={24} />
            </button>
          </div>

          {/* Loading Indicator */}
          {loading && <div className="text-center p-4">Loading...</div>}

          {/* Content Area */}
          <div className="flex-grow overflow-y-auto">
            {/* --- Feedback Display --- */}
            {feedback && (
              <div
                className={`p-3 rounded-md mb-4 text-sm ${
                  feedback.type === 'error' ? 'bg-red-100 text-red-700' :
                  feedback.type === 'info' ? 'bg-blue-100 text-blue-700' :
                  'bg-green-100 text-green-700' // success
                }`}
                role={feedback.type === 'error' ? 'alert' : 'status'} // Role for accessibility
              >
                {feedback.text}
              </div>
            )}

            {/* --- Conditional Content: Auth Forms or Account Info --- */}
            {activeSection === 'auth' && !loading && (
              <>
                {/* Login/Signup Form */}
                <form onSubmit={isSigningUp ? handleSignup : handleLogin} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email address
                    </label>
                    <input
                      ref={emailInputRef} // Assign ref
                      type="email"
                      id="email"
                      name="email"
                      value={loginData.email}
                      onChange={handleInputChange}
                      required
                      autoComplete="email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={loginData.password}
                      onChange={handleInputChange}
                      required
                      autoComplete={isSigningUp ? "new-password" : "current-password"}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="••••••••"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
                  >
                    {loading ? 'Processing...' : (isSigningUp ? 'Sign Up' : 'Log In')}
                  </button>
                </form>

                {/* Toggle Link */}
                <div className="mt-6 text-center">
                  <button
                    type="button" // Important: prevent form submission
                    onClick={toggleAuthMode}
                    disabled={loading}
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSigningUp
                      ? 'Already have an account? Log In'
                      : "Don't have an account? Sign Up"}
                  </button>
                </div>
              </>
            )}

            {activeSection === 'account' && !loading && currentUser && (
              // Account Section (Displayed when logged in)
              <div className="space-y-4">
                 <p className="text-gray-700">
                   Welcome back, <span className="font-medium">{currentUser.email}</span>!
                 </p>
                 {/* Add more account details or links here */}
                 {/* e.g., Link to profile page, order history */}

                 <button
                   onClick={handleLogout}
                   disabled={loading}
                   className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
                 >
                   {loading ? 'Logging out...' : 'Log Out'}
                 </button>
              </div>
            )}

             {/* Fallback if no section active and not loading (shouldn't usually happen) */}
             {!activeSection && !loading && (
                 <p className="text-gray-500">Could not load content.</p>
             )}

          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar; // Default export