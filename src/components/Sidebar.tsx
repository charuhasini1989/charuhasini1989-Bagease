  // --- Toggle Signup/Login View ---
  const toggleAuthMode = () => {
    // Directly toggle the mode
    setIsSigningUp(prev => !prev);
    // Clear form data and feedback when switching modes
    setLoginData({ email: '', password: '' });
    setFeedback(null);
    // Optionally focus the email input when switching
    // setTimeout(() => emailInputRef.current?.focus(), 0); // Add delay if needed
  }

  // Helper to reset state (mainly used on logout or initial load failure)
  const resetAuthState = (clearFeedback = true) => {
      setActiveSection('');
      setLoginData({ email: '', password: '' });
      if (clearFeedback) setFeedback(null);
      // Remove the line that forces isSigningUp to false here
      // setIsSigningUp(false); // <<<--- REMOVE THIS LINE
      // Or, if you *always* want resetAuthState to go back to login,
      // ensure it's only called when that's the explicit intention (like logout).
      // For clarity, let's keep it simple and remove it for now.
      // If you need a function specifically to reset *to login*, create a separate one.
  }

  // Update the useEffect listener to ensure isSigningUp is reset on SIGNED_OUT
   useEffect(() => {
    // ... (initial setup code remains the same) ...

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const user = session?.user ?? null;
        setCurrentUser(user);
        setLoading(false);

        if (event === 'SIGNED_OUT' || !user) {
          resetAuthState(); // Resets form fields, feedback, activeSection
          setIsSigningUp(false); // Explicitly set back to login mode on logout/no user
        }
        if (event === 'SIGNED_IN') {
            setFeedback(null);
            setLoginData({ email: '', password: '' });
            setActiveSection(''); // Reset active section on login
            setIsSigningUp(false); // Ensure we are in login mode conceptually after sign in
        }
      }
    );

    // ... (cleanup code remains the same) ...
  }, []); // Dependency array remains empty

  // Update getFriendlyErrorMessage slightly for clarity
  const getFriendlyErrorMessage = (error: AuthError | Error | any): { type: 'error' | 'info', text: string } => {
       let message = "An unexpected error occurred. Please try again.";
       let type: 'error' | 'info' = 'error';
       if (!error) return { type, text: message };
       const errorMessage = error.message || '';
       console.error('Supabase Auth Error:', errorMessage);

       // Use a local variable to decide if we should switch to sign up mode
       let shouldSwitchToSignup = false;

       if (errorMessage.includes('Invalid login credentials')) {
            if (!isSigningUp) { // Only suggest signup if currently trying to log in
                message = "Account not found with this email/password. Would you like to sign up instead?";
                type = 'info';
                shouldSwitchToSignup = true; // Mark to switch after setting feedback
            } else {
                 // This case should ideally not happen if signup logic is correct,
                 // but keep a message for robustness.
                 message = 'Signup failed: Invalid credentials format or other issue.';
            }
       } else if (errorMessage.includes('User already registered') || errorMessage.includes('already exists')) {
            message = "This email is already registered. Please log in.";
            type = 'info';
            // Ensure we are NOT in signup mode if this error occurs
            if (isSigningUp) {
                setIsSigningUp(false); // Switch back to login view
            }
       } else if (errorMessage.includes('Password should be at least 6 characters')) {
            message = 'Password must be at least 6 characters long.';
       } else if (errorMessage.includes('Unable to validate email address: invalid format')) {
            message = 'Please enter a valid email address.';
       } else if (errorMessage.includes('Email rate limit exceeded') || errorMessage.includes('too many requests')) {
            message = 'Too many attempts. Please try again later.';
       } else {
            message = errorMessage; // Use the raw error for unexpected issues
       }

       // Apply the mode switch *after* determining the message
       if (shouldSwitchToSignup) {
           setIsSigningUp(true);
       }

       return { type, text: message };
   };