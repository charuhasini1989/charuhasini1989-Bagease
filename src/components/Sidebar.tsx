// src/components/Sidebar.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
    X, Truck, MapPin, LogOut, ClipboardList, Loader2, AlertCircle, UserPlus,
    UserCircle, Phone, Package, // Keep icons from original
    ChevronRight, Calendar, Info, Edit2, Plus, Star, Shield // Add icons needed for mock display
} from 'lucide-react';
import { supabase } from '../supabase'; // Ensure this path is correct
import { User, AuthError, PostgrestError } from '@supabase/supabase-js';

// --- Keep existing Interface Definitions ---
interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}
interface FeedbackMessage { type: 'error' | 'success' | 'info'; text: string; }
interface FormData { /* ... */ email: string; password: string; full_name: string; phone: string; date_of_birth: string; aadhar_number: string; }
interface ProfileData { /* ... */ id: string; full_name: string | null; email: string | null; phone: string | null; date_of_birth: string | null; created_at: string; updated_at: string; }
type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Out for Delivery' | 'Delivered' | 'Cancelled' | 'Failed';
interface OrderData { /* ... */ id: number; user_id: string; order_number: string | null; status: OrderStatus; total_amount: number; estimated_delivery: string | null; delivered_at: string | null; created_at: string; updated_at: string; }
interface ActiveDeliveryInfo { /* ... */ order_id: number; tracking_link: string | null; delivery_personnel: { id: string; full_name: string | null; phone: string | null; vehicle_plate: string | null; } | null; }

// --- Mock Data Definitions (from your second example) ---
const mockOrders = [
  { id: 'M1', status: 'In Transit' as const, trackingId: 'BG1234567', date: '2025-04-05', from: 'New Delhi', to: 'Mumbai', bags: 2, total_amount: 450.00 },
  { id: 'M2', status: 'Delivered' as const, trackingId: 'BG1234568', date: '2025-04-03', from: 'Bangalore', to: 'Chennai', bags: 1, total_amount: 250.00 },
  { id: 'M3', status: 'Pending' as const, trackingId: 'BG1234569', date: '2025-04-06', from: 'Kolkata', to: 'Pune', bags: 3, total_amount: 600.00 },
];
const mockAddresses = [ // NOTE: Your original code didn't fetch/display addresses, this is just for the mock fallback if needed.
  { id: 'A1', type: 'Home', address: '123 Main Street, Green Park', city: 'New Delhi', pincode: '110016' },
  { id: 'A2', type: 'Office', address: 'Block B, Tech Park', city: 'Bangalore', pincode: '560001' },
];
const mockDeliveryPersonnel = { // Single object for active delivery mock
    id: 'DP1',
    name: 'Rajesh Kumar (Sample)',
    phone: '+91 98765 43210',
    rating: 4.8,
    vehicle_plate: 'DL 1C AB 1234'
};

// --- Helper Formatting Functions (Keep or adapt from your original) ---
const formatDateTime = (dateString: string | null | undefined): string => { /* ... keep your implementation ... */  if (!dateString) return 'N/A'; try { return new Date(dateString).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }); } catch (e) { console.error("Date format error:", e); return 'Invalid Date'; }};
const formatCurrency = (amount: number | null | undefined): string => { /* ... keep your implementation ... */ if (amount === null || amount === undefined) return 'N/A'; return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }); };
const getStatusColor = (status: OrderStatus | 'In Transit'): string => { /* ... keep your implementation, maybe add 'In Transit' if needed for mock ... */ switch (status) { case 'Delivered': return 'text-green-700 bg-green-100'; case 'Out for Delivery': return 'text-blue-700 bg-blue-100'; case 'Shipped': return 'text-purple-700 bg-purple-100'; case 'Processing': return 'text-yellow-800 bg-yellow-100'; case 'Pending': return 'text-gray-700 bg-gray-100'; case 'Cancelled': return 'text-red-700 bg-red-100'; case 'Failed': return 'text-red-700 bg-red-100'; case 'In Transit': return 'text-blue-700 bg-blue-100'; default: return 'text-gray-700 bg-gray-100'; } };

// --- Reusable Mock Data Display Components ---

// Mock Disclaimer Component
const MockDataDisclaimer: React.FC<{ type: string }> = ({ type }) => (
    <p className="text-xs text-center text-orange-600 bg-orange-50 border border-dashed border-orange-200 p-2 rounded-md mb-3 italic">
        Showing sample {type} data. Real data could not be loaded.
    </p>
);

// Mock Display for Order Tracking
const MockOrderTrackingContent: React.FC = () => (
    <div className="space-y-4">
        {mockOrders.filter(o => o.status === 'In Transit' || o.status === 'Pending').map(order => (
            <div key={order.id} className="bg-white p-3 border border-gray-200 rounded-md shadow-sm">
                <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-medium text-gray-900">Order #{order.trackingId}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>
                        {order.status}
                    </span>
                </div>
                <p className="text-xs text-gray-500 mb-1">Placed: {formatDateTime(order.date)}</p>
                <div className="flex items-center justify-between mt-2 text-sm">
                    <div className="flex items-center text-gray-600">
                        <Package size={16} className="mr-1.5"/> {order.bags} {order.bags > 1 ? 'bags' : 'bag'}
                        <span className="mx-2 text-gray-300">|</span>
                        <MapPin size={16} className="mr-1"/> {order.from} → {order.to}
                    </div>
                    <button className="text-orange-600 hover:text-orange-700 font-medium text-xs" onClick={() => alert('Tracking action for sample data.')}>
                        Track
                    </button>
                </div>
                 <p className="text-sm text-gray-800 font-medium mt-1 text-right">Total: {formatCurrency(order.total_amount)}</p>
            </div>
        ))}
        {mockOrders.filter(o => o.status === 'In Transit' || o.status === 'Pending').length === 0 && (
            <p className="text-sm text-gray-500 italic text-center py-4">No active sample orders.</p>
        )}
    </div>
);

// Mock Display for Active Delivery Personnel
const MockActiveDeliveryDisplay: React.FC = () => (
    <div className="p-3 border rounded-md bg-blue-50 border-blue-200">
        <h5 className="text-sm font-semibold text-blue-800 mb-2 flex items-center"><Package size={18} className="mr-1.5"/> Sample Order Out for Delivery!</h5>
        <div className='space-y-1 text-sm text-blue-700'>
            <p className='flex items-center'><UserCircle size={16} className="mr-1.5 flex-shrink-0" /> Driver: <span className='font-medium ml-1'>{mockDeliveryPersonnel.name}</span></p>
            <p className='flex items-center'><Phone size={16} className="mr-1.5 flex-shrink-0" /> Contact: <a href={`tel:${mockDeliveryPersonnel.phone}`} className='text-blue-800 hover:underline ml-1'>{mockDeliveryPersonnel.phone}</a></p>
            <p className='flex items-center'><Truck size={16} className="mr-1.5 flex-shrink-0"/> Vehicle: <span className='font-medium ml-1'>{mockDeliveryPersonnel.vehicle_plate}</span></p>
             <a href="#" onClick={(e) => {e.preventDefault(); alert('Live tracking link not available for sample data.');}} className="text-sm text-blue-800 hover:underline font-medium mt-2 inline-block">Live Tracking Map (Sample)</a>
        </div>
    </div>
);

// Mock Display for Order History
const MockOrderHistoryContent: React.FC = () => (
     <div className="space-y-4">
        {mockOrders.filter(o => o.status === 'Delivered').map(order => (
            <div key={order.id} className="bg-white p-3 border border-gray-200 rounded-md shadow-sm opacity-90 hover:opacity-100 transition-opacity">
                <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-medium text-gray-900">Order #{order.trackingId}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>
                        {order.status}
                    </span>
                </div>
                <p className="text-xs text-gray-500 mb-1">Placed: {formatDateTime(order.date)}</p>
                 <p className="text-xs text-green-600">Delivered: {formatDateTime(order.date)}</p> {/* Mock delivered same day */}
                <div className="flex items-center justify-between mt-2 text-sm">
                   <div className="flex items-center text-gray-600">
                       <Package size={16} className="mr-1.5"/> {order.bags} {order.bags > 1 ? 'bags' : 'bag'}
                   </div>
                    <button className="text-orange-600 hover:text-orange-700 font-medium text-xs" onClick={() => alert('Details/Reorder action for sample data.')}>
                        View Details / Reorder
                    </button>
                </div>
                <p className="text-sm text-gray-800 font-medium mt-1 text-right">Total: {formatCurrency(order.total_amount)}</p>
            </div>
        ))}
         {mockOrders.filter(o => o.status === 'Delivered').length === 0 && (
            <p className="text-sm text-gray-500 italic text-center py-4">No sample order history.</p>
        )}
    </div>
);

// --- Main Sidebar Component ---
const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    // --- State Definitions (Keep all from your original first code) ---
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<FormData>({ email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' });
    const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
    const [authLoading, setAuthLoading] = useState<boolean>(true);
    const [isSigningUp, setIsSigningUp] = useState<boolean>(false);
    const [activeSection, setActiveSection] = useState<string>('');
    const emailInputRef = useRef<HTMLInputElement>(null);
    const nameInputRef = useRef<HTMLInputElement>(null);

    // --- Data Fetching State (Keep all) ---
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [activeOrders, setActiveOrders] = useState<OrderData[]>([]);
    const [pastOrders, setPastOrders] = useState<OrderData[]>([]);
    const [activeDeliveryInfo, setActiveDeliveryInfo] = useState<ActiveDeliveryInfo | null>(null);

    const [profileLoading, setProfileLoading] = useState<boolean>(false);
    const [trackingLoading, setTrackingLoading] = useState<boolean>(false);
    const [deliveryLoading, setDeliveryLoading] = useState<boolean>(false);
    const [ordersLoading, setOrdersLoading] = useState<boolean>(false);

    const [profileError, setProfileError] = useState<string | null>(null);
    const [trackingError, setTrackingError] = useState<string | null>(null);
    const [deliveryError, setDeliveryError] = useState<string | null>(null);
    const [ordersError, setOrdersError] = useState<string | null>(null);

    // --- useEffect Hooks (Keep all Auth, Body Scroll, Data Fetching Effects) ---
    // Combined Auth Listener & Initial Load
    useEffect(() => {
        // ... (Keep your existing useEffect logic for auth) ...
        setAuthLoading(true);
        supabase.auth.getSession().then(({ data: { session }, error }) => {
             if (error) console.error("Error getting initial session:", error.message);
             const user = session?.user ?? null;
             setCurrentUser(user);
             if (user) {
                 fetchProfileData(user.id);
             } else {
                 resetAuthState(false);
             }
              setTimeout(() => setAuthLoading(false), 50);
        });

        const { data: authListener } = supabase.auth.onAuthStateChange(
             (event, session) => {
                 setAuthLoading(true);
                 const user = session?.user ?? null;
                 setCurrentUser(user);
                 console.log("Auth Event:", event);
                 if (event === 'SIGNED_IN' && user) {
                     setFeedback(null);
                     setFormData({ email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' });
                     setIsSigningUp(false);
                     setActiveSection('');
                     fetchProfileData(user.id);
                 } else if (event === 'SIGNED_OUT' || !user) {
                     resetAuthState();
                     setProfileData(null); setActiveOrders([]); setPastOrders([]); setActiveDeliveryInfo(null);
                     setProfileError(null); setTrackingError(null); setDeliveryError(null); setOrdersError(null);
                 }
                  setTimeout(() => setAuthLoading(false), 50);
             }
         );
         return () => { authListener?.subscription.unsubscribe(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Helper to reset Form/Section state
     const resetAuthState = (clearFeedback = true) => { /* ... keep ... */ setActiveSection(''); setFormData({ email: '', password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' }); if (clearFeedback) setFeedback(null); setIsSigningUp(false); };
    // Body Scroll Lock
     useEffect(() => { /* ... keep ... */ if (isOpen) { document.body.style.overflow = 'hidden'; } else { document.body.style.overflow = 'unset'; } return () => { document.body.style.overflow = 'unset'; }; }, [isOpen]);
    // Input Change Handler
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { /* ... keep ... */ const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
    // Map Supabase Errors
     const getFriendlyErrorMessage = (error: AuthError | PostgrestError | Error | any): { type: 'error' | 'info', text: string } => { /* ... keep your enhanced version ... */ let message = "An unexpected error occurred. Please try again."; let type: 'error' | 'info' = 'error'; if (!error) return { type, text: message }; console.error('Supabase Auth/DB Error:', error); const errorMessage = error.message || ''; const errorCode = (error as PostgrestError)?.code || ''; if (errorMessage.includes('Invalid login credentials')) { if (!isSigningUp) { message = "Account not found or invalid password. Want to sign up?"; type = 'info'; setIsSigningUp(true); setFormData(prev => ({ ...prev, password: '' })); setTimeout(() => nameInputRef.current?.focus(), 100); } else { message = 'Invalid details provided during signup attempt.'; type = 'error'; } } else if (errorMessage.includes('User already registered') || (errorCode === '23505' && errorMessage.includes('auth.users'))) { message = "This email is already registered. Please log in."; type = 'info'; setIsSigningUp(false); setFormData(prev => ({ ...prev, password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: ''})); setTimeout(() => emailInputRef.current?.focus(), 100); } else if (errorMessage.includes('Password should be at least 6 characters')) { message = 'Password must be at least 6 characters long.'; } else if (errorMessage.includes('Unable to validate email address: invalid format')) { message = 'Please enter a valid email address.'; } else if (errorMessage.includes('Email rate limit exceeded') || errorMessage.includes('too many requests')) { message = 'Too many attempts. Please try again later.'; } else if (errorCode === '23505' && errorMessage.includes('profiles')) { message = 'Profile data conflict (e.g., duplicate phone/email if set unique). Could not save profile.'; type = 'error'; } else if (errorCode === '23503') { message = "Could not save data due to a reference error (e.g., trying to link to a non-existent user/order)."; type = 'error'; } else if (errorMessage.includes('check constraint') && errorMessage.includes('phone')) { message = 'Invalid phone number format provided.'; } else if (errorCode === '42501') { message = "Permission denied. Check RLS policies."; type = 'error'; } else if (errorCode === '42P01') { message = "Data table not found. Contact support."; type = 'error'; } else if (errorCode === 'PGRST116') { message = "Expected a single record but found none or multiple."; type = 'error'; } else if (error.message?.includes('Aadhar number must be 12 digits')) { message = 'Aadhar number must be 12 digits.'; type = 'error'; } else { message = errorMessage || "An unknown error occurred."; type = 'error'; } return { type, text: message }; };
    // Authentication Handler (Sign Up / Log In)
    const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => { /* ... keep your enhanced version ... */ e.preventDefault(); setFeedback(null); setAuthLoading(true); const currentFormData = { ...formData }; try { if (isSigningUp) { /* Signup */ if (!currentFormData.full_name) throw new Error("Full name is required for signup."); if (currentFormData.password.length < 6) throw new Error("Password must be at least 6 characters."); const aadharPattern = /^\d{12}$/; if (currentFormData.aadhar_number && !aadharPattern.test(currentFormData.aadhar_number)) { throw new Error("Aadhar number must be 12 digits."); } const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email: currentFormData.email, password: currentFormData.password }); if (signUpError) throw signUpError; if (!signUpData.user) throw new Error("Signup successful but user data missing."); console.log('Auth signup successful for:', signUpData.user.email); try { console.log('Attempting to insert profile for user:', signUpData.user.id); const { error: profileError } = await supabase .from('profiles') .insert({ id: signUpData.user.id, email: signUpData.user.email, full_name: currentFormData.full_name, phone: currentFormData.phone || null, date_of_birth: currentFormData.date_of_birth || null, aadhar_number: currentFormData.aadhar_number || null, }); if (profileError) { console.error('Error creating Supabase profile:', profileError); const profileFeedback = getFriendlyErrorMessage(profileError); setFeedback({ type: 'info', text: `Account created for ${signUpData.user.email}, but profile save failed: ${profileFeedback.text}. You can update later.`}); } else { console.log('Supabase profile created successfully.'); } } catch (profileInsertError: any) { console.error('Exception during profile creation:', profileInsertError); setFeedback({ type: 'info', text: `Account created for ${signUpData.user.email}, but profile details couldn't be saved due to an error.`}); } if (!signUpData.session) { if (!feedback) { setFeedback({ type: 'success', text: 'Account created! Check your email (including spam) for a confirmation link.' }); } setIsSigningUp(false); setFormData(prev => ({ ...prev, password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' })); } else { if (!feedback) { setFeedback({ type: 'success', text: 'Account created and logged in successfully!' }); } } } else { /* Login */ const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email: currentFormData.email, password: currentFormData.password }); if (signInError) throw signInError; console.log('Logged in:', signInData.user?.email); } } catch (error: any) { const feedbackMessage = getFriendlyErrorMessage(error); setFeedback(feedbackMessage); if (!isSigningUp && emailInputRef.current && feedbackMessage.type === 'error') { emailInputRef.current.focus(); emailInputRef.current.select(); } if (isSigningUp && nameInputRef.current && (error.message?.includes('name') || error.message?.includes('Aadhar'))) { nameInputRef.current.focus(); } } finally { setAuthLoading(false); } };
    // Logout Handler
    const handleLogout = async () => { /* ... keep ... */ setAuthLoading(true); setFeedback(null); const { error } = await supabase.auth.signOut(); if (error) { console.error('Logout Error:', error.message); setFeedback({ type: 'error', text: "Failed to log out. Please try again." }); setAuthLoading(false); } };
    // Toggle Signup/Login View
    const toggleAuthMode = () => { /* ... keep ... */ const enteringSignupMode = !isSigningUp; setIsSigningUp(enteringSignupMode); setFormData(prev => ({ email: prev.email, password: '', full_name: '', phone: '', date_of_birth: '', aadhar_number: '' })); setFeedback(null); setTimeout(() => { if (enteringSignupMode && nameInputRef.current) nameInputRef.current.focus(); else if (!enteringSignupMode && emailInputRef.current) emailInputRef.current.focus(); }, 100); }

    // --- Data Fetching Functions (Keep all from your original first code) ---
    const fetchProfileData = async (userId: string) => { /* ... keep your implementation ... */ if (!userId) return; setProfileLoading(true); setProfileError(null); try { const { data, error } = await supabase .from('profiles') .select('id, full_name, email, phone, date_of_birth, created_at, updated_at') .eq('id', userId) .single(); if (error) { if (error.code === 'PGRST116') { console.warn("Profile not found or multiple profiles found for user:", userId); setProfileError("Profile data incomplete or missing. Please update your details."); setProfileData(null); } else throw error; } else { setProfileData(data as ProfileData); } } catch (error: any) { const friendlyError = getFriendlyErrorMessage(error); setProfileError(friendlyError.text || "Could not load profile."); setProfileData(null); } finally { setProfileLoading(false); } };
    const fetchActiveOrders = async (userId: string) => { /* ... keep your implementation ... */ if (!userId) return; setTrackingLoading(true); setTrackingError(null); setActiveOrders([]); try { const activeStatuses: OrderStatus[] = ['Pending', 'Processing', 'Shipped', 'Out for Delivery']; const { data, error } = await supabase .from('orders') .select('id, user_id, order_number, status, total_amount, estimated_delivery, created_at, updated_at') .eq('user_id', userId) .in('status', activeStatuses) .order('created_at', { ascending: false }); if (error) throw error; setActiveOrders(data as OrderData[]); } catch (error: any) { const friendlyError = getFriendlyErrorMessage(error); setTrackingError(friendlyError.text || "Could not load tracking info."); } finally { setTrackingLoading(false); } };
    const fetchDeliveryDetails = async (userId: string) => { /* ... keep your implementation ... */ if (!userId) return; setDeliveryLoading(true); setDeliveryError(null); setActiveDeliveryInfo(null); if (!profileData && !profileLoading && !profileError) { await fetchProfileData(userId); } try { const { data: assignmentData, error: assignmentError } = await supabase .from('delivery_assignments') .select(`order_id, tracking_link, delivery_personnel ( id, full_name, phone, vehicle_plate ), orders!inner ( user_id, status )`) .eq('orders.user_id', userId) .eq('orders.status', 'Out for Delivery') .limit(1) .maybeSingle(); if (assignmentError) { if (assignmentError.message.includes('relationship') && assignmentError.message.includes('delivery_assignments') && assignmentError.message.includes('orders')) { setDeliveryError("DB Relationship Error: Could not link delivery assignments to orders. Check foreign key constraints."); } else { throw assignmentError; } } else if (assignmentData) { setActiveDeliveryInfo(assignmentData as ActiveDeliveryInfo); } else { setActiveDeliveryInfo(null); } } catch (error: any) { const friendlyError = getFriendlyErrorMessage(error); if (!deliveryError) { setDeliveryError(friendlyError.text || "Could not load delivery info."); } setActiveDeliveryInfo(null); } finally { setDeliveryLoading(false); } };
    const fetchPastOrders = async (userId: string) => { /* ... keep your implementation ... */ if (!userId) return; setOrdersLoading(true); setOrdersError(null); setPastOrders([]); try { const pastStatuses: OrderStatus[] = ['Delivered', 'Cancelled', 'Failed']; const { data, error } = await supabase .from('orders') .select('id, user_id, order_number, status, total_amount, delivered_at, created_at, updated_at') .eq('user_id', userId) .in('status', pastStatuses) .order('created_at', { ascending: false }) .limit(25); if (error) throw error; setPastOrders(data as OrderData[]); } catch (error: any) { const friendlyError = getFriendlyErrorMessage(error); setOrdersError(friendlyError.text || "Could not load order history."); } finally { setOrdersLoading(false); } };

    // Effect to Fetch Data Based on Active Section
    useEffect(() => {
        // ... (Keep your existing useEffect logic for fetching based on activeSection) ...
         if (!currentUser || authLoading) return;
         const userId = currentUser.id;
         console.log(`Section changed: ${activeSection}, User: ${userId}`);
         setTrackingError(null); setDeliveryError(null); setOrdersError(null);
         if (activeSection !== 'tracking') setActiveOrders([]);
         if (activeSection !== 'delivery') setActiveDeliveryInfo(null);
         if (activeSection !== 'orders') setPastOrders([]);
         if (activeSection === 'tracking') { fetchActiveOrders(userId); }
         else if (activeSection === 'delivery') { if (!profileData && !profileLoading && !profileError) { fetchProfileData(userId); } fetchDeliveryDetails(userId); }
         else if (activeSection === 'orders') { fetchPastOrders(userId); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSection, currentUser?.id, authLoading]);

    // Reusable Input Field Classes
    const inputClasses = (hasError: boolean = false) => /* ... keep ... */ `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${hasError ? 'border-red-500 ring-red-500' : 'border-gray-300'} disabled:bg-gray-100 disabled:cursor-not-allowed`;
    // Determine overall loading state for the dashboard content sections
    const isSectionLoading = profileLoading || trackingLoading || deliveryLoading || ordersLoading;

    // --- Render Logic (JSX) ---
    return (
        <>
            {/* --- Background Overlay --- */}
            <div
                onClick={authLoading ? undefined : onClose}
                className={`fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm transition-opacity duration-300 z-40 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                aria-hidden={!isOpen}
            />

            {/* --- Sidebar Panel --- */}
            <div
                className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
                role="dialog" aria-modal="true" aria-labelledby="sidebar-title"
            >
                {/* --- Sidebar Header --- */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
                    <h2 id="sidebar-title" className="text-xl font-semibold text-gray-800">
                         {authLoading && !currentUser ? 'Loading...' : (currentUser ? 'My Account' : (isSigningUp ? 'Create Account' : 'Log In'))}
                    </h2>
                    <button /* ... Close Button ... */ onClick={onClose} className="..." aria-label="Close sidebar" disabled={authLoading && !currentUser} >
                        <X size={24} />
                    </button>
                </div>

                {/* --- Main Content Area (Scrollable) --- */}
                <div className="flex-grow p-6 overflow-y-auto">

                    {/* --- Global Feedback Display Area --- */}
                    {feedback && ( <div className={`mb-4 p-3 border rounded-md text-sm flex items-start ${ /* ... feedback styles ... */ feedback.type === 'error' ? 'bg-red-50 border-red-300 text-red-800' : feedback.type === 'success' ? 'bg-green-50 border-green-300 text-green-800' : 'bg-blue-50 border-blue-300 text-blue-800'}`}> <AlertCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" /> <span>{feedback.text}</span> </div> )}
                    {/* --- Initial Loading Indicator --- */}
                    {authLoading && !currentUser && !feedback && ( <div className="flex justify-center items-center py-10"> <Loader2 size={32} className="animate-spin text-orange-600" /> <span className="ml-2 text-gray-500">Connecting...</span> </div> )}

                    {/* --- Logged In View --- */}
                    {!authLoading && currentUser ? (
                        <div className="space-y-6">
                            {/* Welcome Message */}
                            <p className="text-gray-600 truncate"> Welcome, <span className='font-medium'> {profileLoading ? '...' : (profileData?.full_name || currentUser.email)} </span>! {profileError && !profileLoading && <span className='text-red-500 text-xs ml-1'>(Profile Error)</span>} </p>

                            {/* Dashboard Navigation Buttons */}
                            <nav className="space-y-2">
                                 <button disabled={authLoading || isSectionLoading} className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 ... ${activeSection === 'tracking' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`} onClick={() => setActiveSection('tracking')}> <Truck size={18} className="mr-3 flex-shrink-0" /> Order Tracking </button>
                                 <button disabled={authLoading || isSectionLoading} className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 ... ${activeSection === 'delivery' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`} onClick={() => setActiveSection('delivery')}> <MapPin size={18} className="mr-3 flex-shrink-0" /> Delivery Details </button>
                                 <button disabled={authLoading || isSectionLoading} className={`flex items-center w-full px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-orange-50 hover:text-orange-600 ... ${activeSection === 'orders' ? 'bg-orange-100 text-orange-700 font-medium' : ''}`} onClick={() => setActiveSection('orders')}> <ClipboardList size={18} className="mr-3 flex-shrink-0" /> My Orders </button>
                            </nav>

                            {/* Dashboard Content Display Area */}
                            <div className="mt-6 p-4 bg-gray-50 rounded-lg min-h-[250px] border border-gray-200 relative">
                                {/* Loading Overlay for Section Content */}
                                {isSectionLoading && ( <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex justify-center items-center rounded-lg z-10"> <Loader2 size={28} className="animate-spin text-orange-500" /> <span className="ml-2 text-gray-600">Loading Details...</span> </div> )}

                                {/* --- Render Specific Section Content Based on 'activeSection' --- */}
                                {!activeSection && (<p className="text-sm text-gray-500 text-center pt-4">Select an option above to view details.</p>)}

                                {/* Order Tracking Section Content (with Fallback) */}
                                {activeSection === 'tracking' && (
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3 text-gray-800 flex items-center"><Truck size={20} className="mr-2 text-orange-600" /> Active Order Tracking</h3>
                                        {/* Display error message if fetching failed */}
                                        {trackingError && !trackingLoading && <p className="text-sm text-red-600 flex items-center mb-3 p-2 bg-red-50 border border-red-200 rounded"><AlertCircle size={16} className="mr-1" /> {trackingError}</p>}

                                        {/* Conditionally render REAL or MOCK data */}
                                        {!trackingLoading && (trackingError || activeOrders.length === 0) ? (
                                            <>
                                                {/* Show disclaimer only if falling back */}
                                                {(trackingError || activeOrders.length === 0) && <MockDataDisclaimer type="tracking" />}
                                                <MockOrderTrackingContent />
                                            </>
                                        ) : !trackingLoading && activeOrders.length > 0 ? (
                                            // Render REAL active orders
                                            <ul className="space-y-4">
                                                {activeOrders.map(order => (
                                                    <li key={order.id} className="p-3 border border-gray-200 rounded-md bg-white shadow-sm">
                                                         <div className="flex justify-between items-start mb-1"> <p className="text-sm font-medium text-gray-900">Order #{order.order_number || order.id}</p> <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>{order.status}</span> </div>
                                                         <p className="text-xs text-gray-500 mb-1">Placed: {formatDateTime(order.created_at)}</p>
                                                         {order.estimated_delivery && <p className="text-sm text-gray-600">Est. Delivery: <span className='font-medium'>{formatDateTime(order.estimated_delivery)}</span></p>}
                                                         <p className="text-sm text-gray-800 font-medium mt-1 text-right">Total: {formatCurrency(order.total_amount)}</p>
                                                         {/* Add track button or link if available */}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : null /* Loading state handled by overlay */}
                                    </div>
                                )}

                                {/* Delivery Details Section Content (with Fallback for Delivery part) */}
                                {activeSection === 'delivery' && (
                                     <div>
                                        <h3 className="text-lg font-semibold mb-3 text-gray-800 flex items-center"><MapPin size={20} className="mr-2 text-orange-600" /> Delivery Details</h3>
                                        {/* Display Profile Errors First */}
                                        {profileError && !profileLoading && <p className="text-sm text-red-600 flex items-center mb-3 p-2 bg-red-50 border border-red-200 rounded"><AlertCircle size={16} className="mr-1" /> Profile: {profileError}</p>}

                                        {/* User Profile Info Display Area (Uses Real Data Only) */}
                                        <div className="mb-4 p-3 border border-dashed border-gray-300 rounded-md bg-white">
                                            <h4 className="text-md font-semibold text-gray-700 mb-1">Your Profile Info</h4>
                                            {profileLoading && <p className="text-sm text-gray-500 italic">Loading profile...</p>}
                                            {!profileLoading && profileData && ( /* Render real profile data */ <div className='text-sm text-gray-600 space-y-0.5'> <p><span className='font-medium'>Name:</span> {profileData.full_name || 'Not provided'}</p> <p><span className='font-medium'>Email:</span> {profileData.email || currentUser.email}</p> <p><span className='font-medium'>Phone:</span> {profileData.phone || 'Not provided'}</p> <p className="text-xs text-gray-500 italic mt-1"> (Address display not implemented in this section)</p> <button className="text-xs text-orange-600 hover:underline mt-2" onClick={() => alert('Edit Profile functionality not implemented.')}>Edit Profile</button> </div> )}
                                            {!profileLoading && !profileData && !profileError && ( <p className="text-sm text-gray-500 italic">Could not load profile data.</p> )}
                                        </div>

                                         {/* Active Delivery Driver Info Area (with Fallback) */}
                                         <h4 className="text-md font-semibold text-gray-700 mb-1 mt-4">Active Delivery</h4>
                                          {/* Display Delivery specific error */}
                                         {deliveryError && !deliveryLoading && <p className="text-sm text-red-600 flex items-center mb-3 p-2 bg-red-50 border border-red-200 rounded"><AlertCircle size={16} className="mr-1" /> Delivery Info: {deliveryError}</p>}

                                         {/* Conditionally Render REAL or MOCK Delivery Info */}
                                         {!deliveryLoading && (deliveryError || !activeDeliveryInfo) ? (
                                             <>
                                                {/* Show disclaimer only if falling back */}
                                                {(deliveryError || !activeDeliveryInfo) && <MockDataDisclaimer type="delivery" />}
                                                <MockActiveDeliveryDisplay />
                                             </>
                                         ) : !deliveryLoading && activeDeliveryInfo?.delivery_personnel ? (
                                             // Render REAL Delivery Info
                                            <div className="p-3 border rounded-md bg-blue-50 border-blue-200">
                                                 <h5 className="text-sm font-semibold text-blue-800 mb-2 flex items-center"><Package size={18} className="mr-1.5"/> Order #{activeDeliveryInfo.order_id} is Out for Delivery!</h5>
                                                 <div className='space-y-1 text-sm text-blue-700'>
                                                     {activeDeliveryInfo.delivery_personnel.full_name && <p className='flex items-center'><UserCircle size={16} className="mr-1.5 flex-shrink-0" /> Driver: <span className='font-medium ml-1'>{activeDeliveryInfo.delivery_personnel.full_name}</span></p>}
                                                     {activeDeliveryInfo.delivery_personnel.phone && <p className='flex items-center'><Phone size={16} className="mr-1.5 flex-shrink-0" /> Contact: <a href={`tel:${activeDeliveryInfo.delivery_personnel.phone}`} className='text-blue-800 hover:underline ml-1'>{activeDeliveryInfo.delivery_personnel.phone}</a></p>}
                                                     {activeDeliveryInfo.delivery_personnel.vehicle_plate && <p className='flex items-center'><Truck size={16} className="mr-1.5 flex-shrink-0"/> Vehicle: <span className='font-medium ml-1'>{activeDeliveryInfo.delivery_personnel.vehicle_plate}</span></p>}
                                                     {activeDeliveryInfo.tracking_link && <a href={activeDeliveryInfo.tracking_link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-800 hover:underline font-medium mt-2 inline-block">Live Tracking Map</a>}
                                                 </div>
                                             </div>
                                         ) : !deliveryLoading && activeDeliveryInfo && !activeDeliveryInfo.delivery_personnel ? (
                                             // Handle case where assignment exists but personnel details missing
                                             <p className="text-sm text-orange-700 italic text-center py-3">Delivery assigned, but driver details currently unavailable.</p>
                                         ) : null /* Loading state handled by overlay */}
                                    </div>
                                )}

                                {/* My Orders History Section Content (with Fallback) */}
                                {activeSection === 'orders' && (
                                     <div>
                                        <h3 className="text-lg font-semibold mb-3 text-gray-800 flex items-center"><ClipboardList size={20} className="mr-2 text-orange-600" /> Order History</h3>
                                        {/* Display error message if fetching failed */}
                                        {ordersError && !ordersLoading && <p className="text-sm text-red-600 flex items-center mb-3 p-2 bg-red-50 border border-red-200 rounded"><AlertCircle size={16} className="mr-1" /> {ordersError}</p>}

                                         {/* Conditionally render REAL or MOCK data */}
                                        {!ordersLoading && (ordersError || pastOrders.length === 0) ? (
                                            <>
                                                {/* Show disclaimer only if falling back */}
                                                {(ordersError || pastOrders.length === 0) && <MockDataDisclaimer type="order history" />}
                                                <MockOrderHistoryContent />
                                            </>
                                        ) : !ordersLoading && pastOrders.length > 0 ? (
                                             // Render REAL past orders
                                            <ul className="space-y-4">
                                                {pastOrders.map(order => (
                                                    <li key={order.id} className="p-3 border border-gray-200 rounded-md bg-white shadow-sm opacity-90 hover:opacity-100 transition-opacity">
                                                         <div className="flex justify-between items-start mb-1"> <p className="text-sm font-medium text-gray-900">Order #{order.order_number || order.id}</p> <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>{order.status}</span> </div>
                                                         <p className="text-xs text-gray-500 mb-1">Placed: {formatDateTime(order.created_at)}</p>
                                                         {order.status === 'Delivered' && order.delivered_at && <p className="text-xs text-green-600">Delivered: {formatDateTime(order.delivered_at)}</p>}
                                                         <p className="text-sm text-gray-800 font-medium mt-1 text-right">Total: {formatCurrency(order.total_amount)}</p>
                                                         <button className="text-xs text-orange-600 hover:underline mt-1" onClick={() => alert('View Details / Reorder not implemented.')}>View Details / Reorder</button>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : null /* Loading state handled by overlay */}
                                    </div>
                                )}
                            </div> {/* End Dashboard Content Display Area */}

                            {/* Logout Button */}
                            <button onClick={handleLogout} disabled={authLoading} className="...">
                                {authLoading ? <Loader2 size={18} className="mr-2 animate-spin" /> : <LogOut size={18} className="mr-2" />} {authLoading ? 'Processing...' : 'Logout'}
                            </button>
                        </div>
                    ) : (
                        // --- Logged Out View (Login OR Signup Form) ---
                         !authLoading && !currentUser && ( <form onSubmit={handleAuth} className="space-y-4"> { /* ... Your existing Login/Signup form inputs ... */ } </form> )
                    )}
                </div> {/* End Main Content Area */}

                {/* --- Footer Section (Toggle Auth Mode / Bottom Padding) --- */}
                 {!authLoading && !currentUser && ( <div className="p-4 border-t border-gray-200 text-center flex-shrink-0"> <button onClick={toggleAuthMode} disabled={authLoading} className="text-sm text-orange-600 hover:underline focus:outline-none disabled:opacity-50"> {isSigningUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"} </button> </div> )}
                 <div className="flex-shrink-0 h-4 bg-white"></div>
            </div> {/* End Sidebar Panel */}
        </>
    );
};

export default Sidebar;