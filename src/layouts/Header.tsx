import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Facebook, Instagram, UserCircle, ShoppingBag, LogOut, MapPin, Wallet, ShieldCheck, LogIn as LogInIcon } from 'lucide-react';
import { get } from '@/services/apiService';
import { formatCurrency } from '@/lib/formatter';
import UserChangePasswordDialog from '@/components/common/UserChangePasswordDialog';
import Sarkotlogo from "@/images/Sarkhot-Natural-Farms-Png.webp"
import Indraipng from "@/images/WhatsApp Image 2025-06-24 at 18.32.39 (1) (1).png"

interface HeaderProps {
  isLoggedIn?: boolean;
  userName?: string;
  onLogout?: () => void;
  showWallet?: boolean;
}

const Header: React.FC<HeaderProps> = ({ isLoggedIn, userName, onLogout, showWallet }) => {
  const navigate = useNavigate();
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [isMobileProfileOpen, setIsMobileProfileOpen] = useState(false);
  const accountDropdownTimeoutId = useRef<NodeJS.Timeout | null>(null);
  const mobileProfileRef = useRef<HTMLDivElement>(null);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About Us', path: '/about' },
    { name: 'Bharwad Cow', path: '/bharwadcow' },
    { name: 'Products', path: '/member/products/1' },
    { name: 'Contact Us', path: '/contact' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const updateHeaderHeightVar = () => {
      if (headerRef.current) {
        document.documentElement.style.setProperty('--header-height', `${headerRef.current.offsetHeight}px`);
      }
    };
    updateHeaderHeightVar();
    window.addEventListener('resize', updateHeaderHeightVar);
    return () => window.removeEventListener('resize', updateHeaderHeightVar);
  }, [isLoggedIn, userName, scrolled]);

  useEffect(() => {
    if (isLoggedIn) {
      try {
        const userDetailsString = localStorage.getItem("user");
        if (userDetailsString) {
          const userDetails = JSON.parse(userDetailsString);
          setUserEmail(userDetails.email || null);
          setUserRole(userDetails.role || null);
        }
        setIsImpersonating(!!localStorage.getItem("adminToken"));
      } catch (e) {
        console.error("Failed to parse user details", e);
      }

      // Fetch wallet balance if showWallet is true
      if (showWallet) {
        const fetchBalance = async () => {
          try {
            const response = await get<{ success: boolean, data: { balance: number } }>('/wallet/balance');
            if (response?.success && response?.data) {
              setWalletBalance(response.data.balance);
            }
          } catch (error) {
            console.error("Failed to fetch wallet balance in header", error);
          }
        };
        fetchBalance();
      }
    } else {
      setUserEmail(null);
      setUserRole(null);
      setWalletBalance(null);
      setIsImpersonating(false);
    }
  }, [isLoggedIn, showWallet]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileProfileRef.current && !mobileProfileRef.current.contains(event.target as Node)) {
        setIsMobileProfileOpen(false);
      }
    };
    if (isMobileProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileProfileOpen]);

  return (
    <header
      ref={headerRef}
      className={`fixed top-0 w-full z-50 transition-all duration-500 ease-out ${scrolled ? 'shadow-lg' : 'shadow-sm'} pt-[env(safe-area-inset-top)]`}
    >
      {/* Desktop Header */}
      <div className="hidden md:block">
        <div className="bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-2">
              <Link to="/" className="flex items-center">
                <img src={Indraipng} alt="Logo" className="h-10 w-auto object-contain mr-2" />
              </Link>
              <div className="flex items-center space-x-4">
                <img src={Sarkotlogo} alt="Sarkhot Logo" className="h-8 w-auto object-contain" />
                <a target="_blank" rel="noopener noreferrer" href="https://www.facebook.com/sarkhotnaturalfarms" className="text-gray-500 hover:text-green-600"><Facebook size={18} /></a>
                <a target="_blank" rel="noopener noreferrer" href="https://www.instagram.com/sarkhotnaturalfarms/" className="text-gray-500 hover:text-amber-600"><Instagram size={18} /></a>
                <span className="border-l h-6 mx-2"></span>

                {isLoggedIn ? (
                  <div className="flex items-center space-x-4">
                    {/* Direct Return to Admin Button in Navbar */}
                    {isImpersonating && (
                      <button
                        onClick={() => {
                          const adminToken = localStorage.getItem('adminToken');
                          const adminUser = localStorage.getItem('adminUser');
                          if (adminToken && adminUser) {
                            localStorage.setItem('authToken', adminToken);
                            localStorage.setItem('user', adminUser);
                            localStorage.removeItem('adminToken');
                            localStorage.removeItem('adminUser');
                            window.location.href = "/admin/users";
                          }
                        }}
                        className="flex items-center px-3 py-1.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-full shadow-sm transition-all animate-pulse"
                      >
                        <LogInIcon size={14} className="mr-1.5" />
                        Return to Admin
                      </button>
                    )}

                    <div className="relative" onMouseEnter={() => { if (accountDropdownTimeoutId.current) clearTimeout(accountDropdownTimeoutId.current); setIsAccountDropdownOpen(true); }} onMouseLeave={() => { accountDropdownTimeoutId.current = setTimeout(() => { setIsAccountDropdownOpen(false); }, 200); }}>
                      <button className="flex items-center text-sm text-gray-700 hover:text-green-600">
                        <UserCircle size={20} className="mr-1" />
                        <span>Account</span>
                      </button>
                      {isAccountDropdownOpen && onLogout && (
                      <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-100">
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="text-xs text-gray-500">Signed in as</p>
                          <p className="text-sm font-medium text-gray-800 truncate">{userName}</p>
                        </div>

                        {/* Return to Admin Button (Sudo Login) */}
                        {isImpersonating && (
                          <button
                            onClick={() => {
                              const adminToken = localStorage.getItem('adminToken');
                              const adminUser = localStorage.getItem('adminUser');
                              if (adminToken && adminUser) {
                                localStorage.setItem('authToken', adminToken);
                                localStorage.setItem('user', adminUser);
                                localStorage.removeItem('adminToken');
                                localStorage.removeItem('adminUser');
                                window.location.href = "/admin/users";
                              }
                            }}
                            className="w-full flex items-center px-4 py-2 text-sm text-white bg-amber-500 hover:bg-amber-600 font-bold"
                          >
                            <LogInIcon size={16} className="mr-2" />
                            Return to Admin
                          </button>
                        )}

                        {/* Go to Admin Dashboard Link */}
                        {!isImpersonating && userRole && userRole !== 'MEMBER' && userRole !== 'DELIVERY_PARTNER' && (
                          <Link
                            to={
                              userRole === 'ADMIN' ? "/admin/dashboard" :
                              userRole === 'DepotAdmin' ? "/admin/purchases" :
                              "/admin/orders"
                            }
                            className="flex items-center px-4 py-2 text-sm text-green-700 hover:bg-green-50 font-semibold border-b border-gray-100"
                          >
                            <ShieldCheck size={16} className="mr-2" />
                            Admin Panel
                          </Link>
                        )}

                        {userRole !== 'DELIVERY_PARTNER' && (
                          <>
                            <Link to="/member/profile" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-green-50"><UserCircle size={16} className="mr-2" />Edit Profile</Link>
                            <Link to="/member/subscriptions" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-green-50"><ShoppingBag size={16} className="mr-2" />My Subscriptions</Link>
                            {showWallet && (
                              <Link to="/member/wallet" className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-green-50">
                                <div className="flex items-center">
                                  <Wallet size={16} className="mr-2" />
                                  <span>My Wallet</span>
                                </div>
                                {walletBalance !== null && (
                                  <span className="text-xs font-semibold text-green-600 ml-2">
                                    {formatCurrency(walletBalance)}
                                  </span>
                                )}
                              </Link>
                            )}
                            <Link to="/member/addresses" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-green-50"><MapPin size={16} className="mr-2" />My Address</Link>
                          </>
                        )}
                        <button onClick={() => onLogout()} className="w-full flex items-center text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"><LogOut size={16} className="mr-2" />Sign out</button>
                      </div>
                    )}
                  </div>
                </div>
                ) : (
                  <Link to="/login" className="flex items-center text-sm text-gray-700 hover:text-green-600">
                    <UserCircle size={20} className="mr-1" />
                    <span>Account</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#c8202f]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-6 py-3">
              {navLinks.map((link) => (
                <Link key={link.name} to={link.path} className="text-white font-semibold hover:text-white/90">{link.name}</Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden">
        {/* Top White Bar */}
        <div className="bg-white flex justify-between items-center px-4 py-2 border-b border-gray-100">
          <Link to="/" className="flex items-center">
            <img src={Indraipng} alt="Indraai Logo" className="h-10 w-auto object-contain" />
          </Link>
          <div className="flex items-center space-x-2">
            {/* Direct Return to Admin Button in Navbar (Mobile) */}
            {isImpersonating && (
              <button
                onClick={() => {
                  const adminToken = localStorage.getItem('adminToken');
                  const adminUser = localStorage.getItem('adminUser');
                  if (adminToken && adminUser) {
                    localStorage.setItem('authToken', adminToken);
                    localStorage.setItem('user', adminUser);
                    localStorage.removeItem('adminToken');
                    localStorage.removeItem('adminUser');
                    window.location.href = "/admin/users";
                  }
                }}
                className="flex items-center px-2 py-1 text-[10px] font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-full shadow-sm transition-all"
              >
                <LogInIcon size={12} className="mr-1" />
                Admin
              </button>
            )}

            <div className="relative" ref={mobileProfileRef}>
              <button
                onClick={() => {
                  if (isLoggedIn) {
                    setIsMobileProfileOpen(!isMobileProfileOpen);
                  } else {
                    navigate("/login");
                  }
                }}
                className="flex items-center justify-center p-1"
                aria-label="Profile"
              >
                <div className="w-8 h-8 rounded-full border-2 border-green-500 flex items-center justify-center text-green-600">
                  <UserCircle size={20} />
                </div>
              </button>

            {isMobileProfileOpen && isLoggedIn && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl z-[60] border border-gray-100 p-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <p className="text-sm font-bold text-gray-900 truncate">{userName}</p>
                  <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                </div>
                <div className="space-y-1">
                  {/* Return to Admin Button (Sudo Login) - Mobile */}
                  {isImpersonating && (
                    <button
                      onClick={() => {
                        const adminToken = localStorage.getItem('adminToken');
                        const adminUser = localStorage.getItem('adminUser');
                        if (adminToken && adminUser) {
                          localStorage.setItem('authToken', adminToken);
                          localStorage.setItem('user', adminUser);
                          localStorage.removeItem('adminToken');
                          localStorage.removeItem('adminUser');
                          window.location.href = "/admin/users";
                        }
                      }}
                      className="flex items-center w-full px-3 py-2 text-sm text-white bg-amber-500 rounded-lg hover:bg-amber-600 font-bold mb-2 transition-colors shadow-sm"
                    >
                      <LogInIcon size={18} className="mr-3" />
                      Return to Admin
                    </button>
                  )}

                  {/* Go to Admin Dashboard Link - Mobile */}
                  {!isImpersonating && userRole && userRole !== 'MEMBER' && userRole !== 'DELIVERY_PARTNER' && (
                    <Link
                      to={
                        userRole === 'ADMIN' ? "/admin/dashboard" :
                        userRole === 'DepotAdmin' ? "/admin/purchases" :
                        "/admin/orders"
                      }
                      className="flex items-center w-full px-3 py-2 text-sm text-green-700 rounded-lg hover:bg-green-50 font-bold mb-2 transition-colors border border-green-100"
                      onClick={() => setIsMobileProfileOpen(false)}
                    >
                      <ShieldCheck size={18} className="mr-3 text-green-600" />
                      Admin Panel
                    </Link>
                  )}

                  {userRole !== 'DELIVERY_PARTNER' && (
                    <>
                      <Link 
                        to="/member/profile" 
                        className="flex items-center w-full px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-green-50 transition-colors"
                        onClick={() => setIsMobileProfileOpen(false)}
                      >
                        <UserCircle size={18} className="mr-3 text-green-600" />
                        Edit Profile
                      </Link>
                      <Link 
                        to="/member/subscriptions" 
                        className="flex items-center w-full px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-green-50 transition-colors"
                        onClick={() => setIsMobileProfileOpen(false)}
                      >
                        <ShoppingBag size={18} className="mr-3 text-green-600" />
                        My Subscriptions
                      </Link>
                      {showWallet && (
                        <Link
                          to="/member/wallet"
                          className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-green-50 transition-colors"
                          onClick={() => setIsMobileProfileOpen(false)}
                        >
                          <div className="flex items-center">
                            <Wallet size={18} className="mr-3 text-green-600" />
                            <span>My Wallet</span>
                          </div>
                          {walletBalance !== null && (
                            <span className="text-xs font-bold text-green-600 ml-2">
                              {formatCurrency(walletBalance)}
                            </span>
                          )}
                        </Link>
                      )}
                      <Link
                        to="/member/addresses"
                        className="flex items-center w-full px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-green-50 transition-colors"
                        onClick={() => setIsMobileProfileOpen(false)}
                      >
                        <MapPin size={18} className="mr-3 text-green-600" />
                        My Address
                      </Link>
                    </>
                  )}
                  <button
                    onClick={() => {
                      if (onLogout) onLogout();
                      setIsMobileProfileOpen(false);
                    }}
                    className="flex items-center w-full px-3 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={18} className="mr-3" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

        {/* Red Bar (Simplified) */}
        <div className="bg-[#c8202f] h-10 shadow-md">
          {/* Menu icon removed as redundant with BottomNavBar */}
        </div>
      </div>

      <UserChangePasswordDialog
        isOpen={isChangePasswordDialogOpen}
        onClose={() => setIsChangePasswordDialogOpen(false)}
      />
    </header>
  );
};

export default Header;
