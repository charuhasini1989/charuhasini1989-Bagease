import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Train, ClipboardList, Luggage, TrainTrack, TrainFront, Info, Phone, Ticket, UserCircle2, Menu, X, Truck,
    ChevronDown, MoreHorizontal // Added icons for dropdown
} from 'lucide-react';

interface NavbarProps {
    onSignInClick: () => void;
}

// --- Divide Menu Items ---
// Core items likely to be always visible on desktop
const coreMenuItems = [
    { to: "/", label: "Home", icon: <Train size={18} /> },
    { to: "/services", label: "Services", icon: <ClipboardList size={18} /> },
    { to: "/storage", label: "Storage", icon: <Luggage size={18} /> },
];

// Items to potentially collapse into "More"
const moreMenuItems = [
    { to: "/pickup", label: "Pickup", icon: <TrainTrack size={18} /> },
    { to: "/delivery", label: "Delivery", icon: <TrainFront size={18} /> },
    { to: "/about", label: "About", icon: <Info size={18} /> },
    { to: "/contact", label: "Contact", icon: <Phone size={18} /> }
];

// Combine for mobile view
const allMenuItems = [...coreMenuItems, ...moreMenuItems];

const Navbar = ({ onSignInClick }: NavbarProps) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false); // State for "More" dropdown
    const location = useLocation();

    // Refs for closing menus on outside click
    const mobileNavRef = useRef<HTMLDivElement>(null);
    const moreMenuRef = useRef<HTMLDivElement>(null);
    const moreMenuButtonRef = useRef<HTMLButtonElement>(null); // Ref for the trigger button
    const headerRef = useRef<HTMLElement>(null);

    // Close menus on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
        setIsMoreMenuOpen(false);
    }, [location.pathname]);

    // Close menus if clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Close Mobile Menu
            if (
                isMobileMenuOpen &&
                mobileNavRef.current &&
                !mobileNavRef.current.contains(event.target as Node) &&
                !(event.target as HTMLElement).closest('[aria-label="Toggle Menu"]')
            ) {
                setIsMobileMenuOpen(false);
            }

            // Close More Menu
            if (
                isMoreMenuOpen &&
                moreMenuRef.current &&
                !moreMenuRef.current.contains(event.target as Node) &&
                moreMenuButtonRef.current && // Check if the button ref exists
                !moreMenuButtonRef.current.contains(event.target as Node) // Ensure click wasn't on the button itself
            ) {
                setIsMoreMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
        // Include all relevant dependencies
    }, [isMobileMenuOpen, isMoreMenuOpen, mobileNavRef, moreMenuRef, moreMenuButtonRef]);

    const handleMobileLinkClick = () => {
        setIsMobileMenuOpen(false);
    };

    const handleMoreLinkClick = () => {
        setIsMoreMenuOpen(false); // Close "More" menu when a link inside it is clicked
    }

    const handleToggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
        setIsMoreMenuOpen(false); // Close more menu if mobile opens
    }

    const handleToggleMoreMenu = () => {
        setIsMoreMenuOpen(!isMoreMenuOpen);
    }

    return (
        <header ref={headerRef} className="sticky top-0 z-50 bg-gray-50 shadow-sm border-b border-gray-200/80">
            <nav className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 md:h-20 relative">

                {/* Left Side: Brand */}
                <div className="flex-shrink-0">
                    <Link to="/" className="flex items-center space-x-2" onClick={() => { handleMobileLinkClick(); handleMoreLinkClick();}}>
                        <Truck className="text-orange-600 h-7 w-7 md:h-8 md:w-8" />
                        <span className="text-2xl md:text-3xl font-bold text-gray-800 tracking-tight">
                            Bag<span className="text-orange-600 italic">Ease</span>
                        </span>
                    </Link>
                </div>

                {/* Center: Desktop Navigation Links */}
                <div className="hidden md:flex justify-center items-center flex-1 min-w-0">
                    {/* Reduced overall spacing, adjust xl spacing if needed */}
                    <ul className="flex items-center space-x-1 lg:space-x-1.5 xl:space-x-2">
                        {/* Render Core Menu Items */}
                        {coreMenuItems.map((item) => (
                            <li key={item.to}>
                                <Link
                                    to={item.to}
                                    // Slightly reduced padding
                                    className="flex items-center space-x-1.5 px-2.5 py-2 rounded-md text-sm lg:text-base text-gray-600 hover:text-orange-600 hover:bg-gray-100 transition-colors duration-200 font-medium whitespace-nowrap"
                                    title={item.label}
                                >
                                    <span className="flex-shrink-0">{item.icon}</span>
                                    <span>{item.label}</span>
                                </Link>
                            </li>
                        ))}

                        {/* "More" Dropdown - Visible on md/lg, hidden on xl */}
                        <li className="relative hidden md:inline-block xl:hidden">
                            <button
                                ref={moreMenuButtonRef}
                                onClick={handleToggleMoreMenu}
                                className="flex items-center space-x-1.5 px-2.5 py-2 rounded-md text-sm lg:text-base text-gray-600 hover:text-orange-600 hover:bg-gray-100 transition-colors duration-200 font-medium whitespace-nowrap"
                                aria-haspopup="true"
                                aria-expanded={isMoreMenuOpen}
                                aria-controls="more-menu-desktop"
                            >
                                <MoreHorizontal size={18} />
                                <span>More</span>
                                <ChevronDown size={16} className={`transition-transform duration-200 ${isMoreMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {/* Dropdown Panel */}
                            {isMoreMenuOpen && (
                                <div
                                    id="more-menu-desktop"
                                    ref={moreMenuRef}
                                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-40 py-1" // Centered dropdown
                                >
                                    {moreMenuItems.map((item) => (
                                         <Link
                                            key={item.to}
                                            to={item.to}
                                            onClick={handleMoreLinkClick} // Close menu on click
                                            className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-orange-600 transition-colors duration-150 w-full"
                                        >
                                             {/* Clone icon for consistent size/styling */}
                                            {React.cloneElement(item.icon, { size: 16 })}
                                            <span>{item.label}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </li>

                         {/* Render Collapsed Items directly on xl screens */}
                        {moreMenuItems.map((item) => (
                             <li key={item.to} className="hidden xl:inline-block"> {/* Hidden by default, shown only on xl */}
                                <Link
                                    to={item.to}
                                     className="flex items-center space-x-1.5 px-2.5 py-2 rounded-md text-sm lg:text-base text-gray-600 hover:text-orange-600 hover:bg-gray-100 transition-colors duration-200 font-medium whitespace-nowrap"
                                    title={item.label}
                                >
                                    <span className="flex-shrink-0">{item.icon}</span>
                                    <span>{item.label}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Right Side: Actions */}
                <div className="flex items-center space-x-2 sm:space-x-3">
                    {/* Book Now Button (Desktop) */}
                    <div className="hidden md:block">
                        <Link
                            to="/book"
                            className="flex items-center space-x-2 px-4 py-2 rounded-md border-2 border-orange-600 text-orange-600 font-semibold text-sm lg:text-base hover:bg-orange-50 hover:text-orange-700 transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 whitespace-nowrap"
                            onClick={handleMoreLinkClick} // Also close more menu if open
                        >
                            <Ticket size={18} />
                            <span>Book Now</span>
                        </Link>
                    </div>

                    {/* Sign-In Button (Always Visible) */}
                    <button
                        onClick={onSignInClick}
                        aria-label="Sign In or Account"
                        title="Sign In or Account"
                        className="flex-shrink-0 p-2 rounded-full text-gray-500 hover:text-orange-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors duration-200"
                    >
                        <UserCircle2 size={26} />
                    </button>

                    {/* Mobile Menu Toggle Button */}
                    <div className="md:hidden">
                        <button
                            className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500 transition-colors duration-200"
                            onClick={handleToggleMobileMenu}
                            aria-label="Toggle Menu"
                            aria-expanded={isMobileMenuOpen}
                            aria-controls="mobile-menu"
                        >
                            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Dropdown Menu */}
            <div
                id="mobile-menu"
                ref={mobileNavRef}
                className={`
                  md:hidden absolute top-full left-0 right-0 bg-white shadow-lg border-t border-gray-200 z-40
                  transition-all duration-300 ease-in-out origin-top
                  ${isMobileMenuOpen ? 'max-h-[calc(100vh-4rem)] opacity-100 scale-y-100' : 'max-h-0 opacity-0 scale-y-95 pointer-events-none'}
                  overflow-y-auto
                `}
            >
                <div className="px-2 pt-2 pb-4 space-y-1 sm:px-3">
                    {/* Use combined list for mobile */}
                    {allMenuItems.map((item) => (
                        <Link
                            key={item.to}
                            to={item.to}
                            onClick={handleMobileLinkClick}
                            className="flex items-center space-x-3 px-3 py-3 rounded-md text-base text-gray-700 hover:text-orange-600 hover:bg-gray-100 transition-colors duration-200 font-medium"
                        >
                            {React.cloneElement(item.icon, { size: 20 })}
                            <span>{item.label}</span>
                        </Link>
                    ))}
                    {/* Mobile Book Now Button */}
                    <div className="pt-4 px-1">
                        <Link
                            to="/book"
                            onClick={handleMobileLinkClick}
                            className="flex items-center justify-center space-x-2 w-full px-4 py-3 rounded-md bg-orange-600 text-white font-semibold hover:bg-orange-700 transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 text-base"
                        >
                            <Ticket size={20} />
                            <span>Book Now</span>
                        </Link>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Navbar;