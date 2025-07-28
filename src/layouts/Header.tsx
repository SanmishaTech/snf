import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Search, Menu, X, UserCircle, LogOut, ShoppingBag, KeyRound } from 'lucide-react';
import UserChangePasswordDialog from '@/components/common/UserChangePasswordDialog';
import { appName } from '@/config';
import WalletButton from '@/modules/Wallet/Components/Walletmenu';
import Sarkotlogo from "@/images/Sarkhot-Natural-Farms-Png.webp"
import Indraipng from "@/images/WhatsApp Image 2025-06-24 at 18.32.39 (1) (1).png"


interface HeaderProps {
  isLoggedIn?: boolean;
  userName?: string;
  onLogout?: () => void;
  showWallet?: boolean;
}

const Header: React.FC<HeaderProps> = ({ isLoggedIn, userName, onLogout, showWallet }) => {
  const headerRef = useRef<HTMLElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(() => {
    try {
      const userDataString = localStorage.getItem('user');
      return userDataString ? JSON.parse(userDataString).role : null;
    } catch (error) {
      console.error("Failed to parse user data from localStorage on init", error);
      return null;
    }
  });
  const lastScrollY = useRef(0);
  const accountDropdownTimeoutId = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // This effect updates the role when the user logs in or out.
    try {
      const userDataString = localStorage.getItem('user');
      const role = userDataString ? JSON.parse(userDataString).role : null;
      setUserRole(role);
    } catch (error) {
      console.error("Failed to parse user data from localStorage in effect", error);
      setUserRole(null);
    }
  }, [isLoggedIn]);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About Us', path: '/about' },
    // { name: 'Gratitude', path: '/gratitude' },
    { name: 'Bharwad Cow', path: '/bharwadcow' },
    { name: 'Products', path: '/member/products/1' },

    { name: 'Contact Us', path: '/contact' },
  ];

  // Handle scroll behavior for header styling only (no hide/show)
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Always keep header visible
      setHeaderVisible(true);
      
      // Only change scrolled state for styling (shadow effects)
      setScrolled(currentScrollY > 10);
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Effect to set header height as a CSS variable
  useEffect(() => {
    const updateHeaderHeightVar = () => {
      if (headerRef.current) {
        const height = headerRef.current.offsetHeight;
        document.documentElement.style.setProperty('--header-height', `${height}px`);
      }
    };

    updateHeaderHeightVar(); // Initial calculation
    window.addEventListener('resize', updateHeaderHeightVar); // Recalculate on resize

    // Recalculate when mobileMenuOpen or other relevant states change (covered by dependency array)
    return () => {
      window.removeEventListener('resize', updateHeaderHeightVar);
      document.documentElement.style.removeProperty('--header-height'); // Cleanup on unmount
    };
  }, [isLoggedIn, userName, mobileMenuOpen, scrolled]); // Dependencies that might affect header height

  // Mobile menu will stay open/closed based on user interaction only

  return (
<header
  ref={headerRef}
  className={`fixed top-0 w-full z-50 transition-all duration-500 ease-out ${
    headerVisible ? 'translate-y-0' : '-translate-y-full'
  } ${scrolled ? 'shadow-lg' : 'shadow-sm'}`}
>
      {/* Top Bar */}
      <div className="bg-white transition-colors duration-300">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center py-2">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <img src={Indraipng} alt="Logo" className="h-10 w-auto object-contain mr-2" />
        </Link>

             {/* Right side: Social Icons & Top Links */}
             <div className="flex items-center space-x-4">
              <a href="/" aria-label="Sarkhot Logo">
                <img src={Sarkotlogo} alt="Sarkhot Logo" className="h-8 w-auto object-contain" />
              </a>
             <a
             target="_blank" 
             rel="noopener noreferrer"
             aria-label="Facebook" 
             href="https://www.facebook.com/sarkhotnaturalfarms" className="text-gray-500 hover:text-green-600 transition-colors">
                <Facebook size={18} />
              </a>
              <a
             target="_blank" 
             rel="noopener noreferrer"
             aria-label="Instagram" 
             href="https://www.instagram.com/sarkhotnaturalfarms/" className="text-gray-500 hover:text-amber-600 transition-colors">
                <Instagram size={18} />
              </a>
              <span className="hidden sm:block border-l border-gray-300 h-6 mx-2"></span>
              {isLoggedIn ? (
                <div 
                  className="relative"
                  onMouseEnter={() => {
                    if (accountDropdownTimeoutId.current) clearTimeout(accountDropdownTimeoutId.current);
                    setIsAccountDropdownOpen(true);
                  }}
                  onMouseLeave={() => {
                    accountDropdownTimeoutId.current = setTimeout(() => {
                      setIsAccountDropdownOpen(false);
                    }, 200);
                  }}
                >
                  <button className="flex items-center text-sm text-gray-700 hover:text-green-600 transition-colors">
                    <div className="bg-gradient-to-r from-green-500 to-amber-500 rounded-full p-0.5 mr-1">
                      <UserCircle size={18} className="text-white bg-gray-100 rounded-full" />
                    </div>
                    <span className="hidden sm:inline">Account</span>
                  </button>
                  {isAccountDropdownOpen && onLogout && (
                    <div 
                      className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-100"
                      onMouseEnter={() => {
                        if (accountDropdownTimeoutId.current) clearTimeout(accountDropdownTimeoutId.current);
                      }}
                      onMouseLeave={() => {
                        accountDropdownTimeoutId.current = setTimeout(() => {
                          setIsAccountDropdownOpen(false);
                        }, 200);
                      }}
                    >
                      {userName && (
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="text-xs text-gray-500">Signed in as</p>
                          <p className="text-sm font-medium text-gray-800 truncate">{userName}</p>
                        </div>
                      )}
                    
                      {userRole !== 'ADMIN' && (
                        <Link 
                          to="/member/subscriptions" 
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-green-50 transition-colors" 
                          onClick={() => setIsAccountDropdownOpen(false)}
                        >
                          <ShoppingBag size={16} className="mr-2 text-green-600" />
                          My Subscriptions
                        </Link>
                      )}
                        {userRole === 'MEMBER' && (
                        <Link 
                          to="/member/addresses" 
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-green-50 transition-colors" 
                          onClick={() => setIsAccountDropdownOpen(false)}
                        >
                          <ShoppingBag size={16} className="mr-2 text-green-600" />
                          Manage Address
                        </Link>
                      )}
                      {userRole === 'MEMBER' && (
                        <button 
                          onClick={() => { 
                            setIsChangePasswordDialogOpen(true); 
                            setIsAccountDropdownOpen(false); 
                          }}
                          className="w-full flex items-center text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 transition-colors"
                        >
                          <KeyRound size={16} className="mr-2 text-green-600" />
                          Change Password
                        </button>
                      )}
                      <button 
                        onClick={() => { onLogout(); setIsAccountDropdownOpen(false); }}
                        className="w-full flex items-center text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={16} className="mr-2 text-red-500" />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/login" className="text-sm text-gray-700 hover:text-green-600 transition-colors flex items-center">
                  <div className="bg-gradient-to-r from-green-500 to-amber-500 rounded-full p-0.5 mr-1">
                    <UserCircle size={18} className="text-white bg-gray-100 rounded-full" />
                  </div>
                  <span className="hidden sm:inline">Account</span>
                </Link>
              )}
             </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="bg-primary transition-colors duration-300">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center py-3">
        {/* Desktop Navigation Links - WHITE AND BOLD */}
        <div className="hidden md:flex space-x-6 items-center">
          {navLinks.map((link) => (
            <Link 
              key={link.name} 
              to={link.path} 
              className="text-white font-semibold hover:text-white/90 transition-colors relative group"
            >
              {link.name}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </Link>
          ))}
        </div>

            {/* Search Bar & Cart */}
            <div className="flex items-center space-x-4">
            {/* <div className="relative hidden sm:block">
                <input 
                  type="search" 
                  placeholder="Search products..." 
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-full text-sm focus:ring-2 focus:ring-green-300 focus:border-green-500 transition-all w-60"
                />
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div> */}
              {showWallet && <WalletButton isLoggedIn={isLoggedIn} />}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
            <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className={`p-2 rounded-full transition-colors text-white hover:bg-white/20 ${mobileMenuOpen ? 'bg-white/20' : ''}`}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 shadow-inner">
          <div className="container mx-auto px-4 py-4 space-y-2">
            <div className="mb-4">
              <div className="relative">
                <input 
                  type="search" 
                  placeholder="Search products..." 
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full text-sm focus:ring-2 focus:ring-green-300 focus:border-green-500"
                />
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
            {navLinks.map((link) => (
              <Link 
                key={link.name} 
                to={link.path} 
                className="block py-3 px-4 text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors flex items-center group"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="w-1.5 h-1.5 bg-primary rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                {link.name}
              </Link>
            ))}
            {/* <Link 
              to="/about" 
              className="block py-3 px-4 text-gray-700 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors flex items-center group"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></span>
              About Us
            </Link> */}
            {isLoggedIn && onLogout ? (
              <button 
                onClick={() => { onLogout(); setMobileMenuOpen(false); }}
                className="w-full text-left block py-3 px-4 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center group"
              >
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                <LogOut size={16} className="mr-2" /> Sign out
              </button>
            ) : (
              <Link 
                to="/login" 
                className="block py-3 px-4 text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors flex items-center group"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="w-1.5 h-1.5 bg-primary rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                <UserCircle size={16} className="mr-2" /> Account
              </Link>
            )}
          </div>
        </div>
      )}
      
      {/* Change Password Dialog */}
      <UserChangePasswordDialog
        isOpen={isChangePasswordDialogOpen}
        onClose={() => setIsChangePasswordDialogOpen(false)}
      />
      </header>
  );
};

export default Header;