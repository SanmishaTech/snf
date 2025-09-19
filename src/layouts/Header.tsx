import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Facebook, Instagram, Search, Menu, X, UserCircle, LogOut, ShoppingBag, KeyRound, Bell } from 'lucide-react';
import UserChangePasswordDialog from '@/components/common/UserChangePasswordDialog';
import WalletButton from '@/modules/Wallet/Components/Walletmenu';
import Sarkotlogo from "@/images/Sarkhot-Natural-Farms-Png.webp"
import Indraipng from "@/images/WhatsApp Image 2025-06-24 at 18.32.39 (1) (1).png"
import { get } from '@/services/apiService';
import { parseISO, differenceInCalendarDays, format, startOfDay, endOfDay } from 'date-fns';


interface DeliveryScheduleEntry {
  id: string;
  deliveryDate: string;
  status: string;
  quantity: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MemberSubscription {
  id: string;
  product: {
    id: string;
    name: string;
    price?: number;
    unit?: string;
    depotProductVariantId?: string;
    depotVariant?: {
      id: string;
      name: string;
      unit: string;
    };
  };
  qty: number;
  altQty?: number | null;
  deliverySchedule: "DAILY" | "SELECT_DAYS" | "VARYING" | "ALTERNATE_DAYS";
  selectedDays?: string[] | null;
  startDate: string;
  expiryDate: string;
  period: "DAYS_7" | "DAYS_15" | "DAYS_30" | "DAYS_90";
  status: string;
  paymentStatus?: "PENDING" | "PAID" | "FAILED" | "CANCELLED";
  deliveryScheduleEntries?: DeliveryScheduleEntry[];
  productOrder?: {
    id: string;
    orderNo: string;
    invoiceNo?: string | null;
  };
}

interface HeaderProps {
  isLoggedIn?: boolean;
  userName?: string;
  onLogout?: () => void;
  showWallet?: boolean;
}

const Header: React.FC<HeaderProps> = ({ isLoggedIn, userName, onLogout, showWallet }) => {
  const navigate = useNavigate();
  const headerRef = useRef<HTMLElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);
  const [expiringSubscriptions, setExpiringSubscriptions] = useState<MemberSubscription[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
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
  const notificationDropdownTimeoutId = useRef<NodeJS.Timeout | null>(null);

  // Helper function to get effective expiry date (from delivery schedule or subscription expiry)
  const getEffectiveExpiryDate = (subscription: MemberSubscription) => {
    if (subscription.deliveryScheduleEntries && subscription.deliveryScheduleEntries.length > 0) {
      // Sort delivery entries by date and get the last one
      const sortedEntries = subscription.deliveryScheduleEntries
        .slice()
        .sort((a, b) => new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime());
      const lastEntry = sortedEntries[sortedEntries.length - 1];
      return lastEntry.deliveryDate;
    }
    // Fallback to subscription expiry date
    return subscription.expiryDate;
  };

  // Check if subscription expires within 2 days (calendar-day accurate)
  const isExpiringWithinTwoDays = (subscription: MemberSubscription) => {
    try {
      const effectiveExpiryDate = getEffectiveExpiryDate(subscription);
      const expiryDate = parseISO(effectiveExpiryDate);
      const daysUntilExpiry = differenceInCalendarDays(
        endOfDay(expiryDate),
        startOfDay(new Date())
      );
      return daysUntilExpiry >= 0 && daysUntilExpiry <= 2;
    } catch {
      return false;
    }
  };

  // Helper to compute days left (0=today, 1=tomorrow, 2=in 2 days)
  const getDaysLeft = (subscription: MemberSubscription) => {
    try {
      const effectiveExpiryDate = getEffectiveExpiryDate(subscription);
      const expiryDate = parseISO(effectiveExpiryDate);
      return differenceInCalendarDays(endOfDay(expiryDate), startOfDay(new Date()));
    } catch {
      return 9999; // far future if parsing fails
    }
  };

  // Fetch user subscriptions if logged in
  const fetchSubscriptions = async () => {
    if (!isLoggedIn || userRole !== 'MEMBER') return;
    setNotificationsLoading(true);
    setNotificationsError(null);
    try {
      const userSubscriptions = await get<MemberSubscription[]>("/subscriptions");
      // Filter active subscriptions expiring within 2 days
      const expiring = userSubscriptions.filter(sub => {
        const isActive = sub.status !== 'CANCELLED' && sub.paymentStatus !== 'CANCELLED';
        return isActive && isExpiringWithinTwoDays(sub);
      });
      // Sort by days left, then by effective date, then by product name for a stable pleasant order
      const sorted = expiring.slice().sort((a, b) => {
        const da = getDaysLeft(a);
        const db = getDaysLeft(b);
        if (da !== db) return da - db;
        const aDate = parseISO(getEffectiveExpiryDate(a)).getTime();
        const bDate = parseISO(getEffectiveExpiryDate(b)).getTime();
        if (aDate !== bDate) return aDate - bDate;
        return (a.product.name || '').localeCompare(b.product.name || '');
      });
      setExpiringSubscriptions(sorted);
    } catch (error: any) {
      console.error("Failed to fetch subscriptions:", error);
      setExpiringSubscriptions([]);
      setNotificationsError(error?.message || 'Failed to load notifications');
    } finally {
      setNotificationsLoading(false);
    }
  };

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

  // Fetch subscriptions when login status or user role changes and refresh periodically
  useEffect(() => {
    if (isLoggedIn && userRole === 'MEMBER') {
      fetchSubscriptions();
      const id = setInterval(fetchSubscriptions, 5 * 60 * 1000); // refresh every 5 minutes
      return () => clearInterval(id);
    }
  }, [isLoggedIn, userRole]);

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
  } ${scrolled ? 'shadow-lg' : 'shadow-sm'} pt-[env(safe-area-inset-top)]`}
>
      {/* Top Bar */}
      <div className="bg-white transition-colors duration-300">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center py-2 sm:py-2.5">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <img src={Indraipng} alt="Logo" className="h-8 sm:h-10 w-auto object-contain mr-2" />
        </Link>

             {/* Right side: Social Icons & Top Links */}
             <div className="flex items-center space-x-3 sm:space-x-4">
              <a href="/" aria-label="Sarkhot Logo" className="hidden sm:inline-flex">
                <img src={Sarkotlogo} alt="Sarkhot Logo" className="h-8 w-auto object-contain" />
              </a>
             <a
             target="_blank" 
             rel="noopener noreferrer"
             aria-label="Facebook" 
             href="https://www.facebook.com/sarkhotnaturalfarms" className="hidden sm:inline-flex text-gray-500 hover:text-green-600 transition-colors"
>
                <Facebook size={18} />
              </a>
              <a
             target="_blank" 
             rel="noopener noreferrer"
             aria-label="Instagram" 
             href="https://www.instagram.com/sarkhotnaturalfarms/" className="hidden sm:inline-flex text-gray-500 hover:text-amber-600 transition-colors"
>
                <Instagram size={18} />
              </a>
              <span className="hidden sm:block border-l border-gray-300 h-6 mx-2"></span>
              
              {/* Notification Bell - Only for logged in MEMBER users */}
              {isLoggedIn && userRole === 'MEMBER' && (
                <div 
                  className="relative"
                  onMouseEnter={() => {
                    if (notificationDropdownTimeoutId.current) clearTimeout(notificationDropdownTimeoutId.current);
                    setIsNotificationDropdownOpen(true);
                    // Refresh notifications on hover to show latest
                    fetchSubscriptions();
                  }}
                  onMouseLeave={() => {
                    notificationDropdownTimeoutId.current = setTimeout(() => {
                      setIsNotificationDropdownOpen(false);
                    }, 200);
                  }}
                >
                  <button
                    className="relative flex items-center text-gray-700 hover:text-green-600 transition-colors p-1"
                    onClick={() => {
                      const next = !isNotificationDropdownOpen;
                      setIsNotificationDropdownOpen(next);
                      if (next) fetchSubscriptions();
                    }}
                    aria-haspopup="true"
                    aria-expanded={isNotificationDropdownOpen}
                    aria-label="Notifications"
                  >
                    <Bell size={18} />
                    {expiringSubscriptions.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                        {expiringSubscriptions.length > 9 ? '9+' : expiringSubscriptions.length}
                      </span>
                    )}
                  </button>
                  
                  {/* Notification Dropdown */}
                  {isNotificationDropdownOpen && (
                    <div 
                      className="absolute right-0 mt-1 w-80 bg-white rounded-md shadow-lg py-2 z-50 border border-gray-100"
                      onMouseEnter={() => {
                        if (notificationDropdownTimeoutId.current) clearTimeout(notificationDropdownTimeoutId.current);
                      }}
                      onMouseLeave={() => {
                        notificationDropdownTimeoutId.current = setTimeout(() => {
                          setIsNotificationDropdownOpen(false);
                        }, 200);
                      }}
                    >
                      <div className="px-4 py-2 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-800">
                          Notifications
                          {expiringSubscriptions.length > 0 && (
                            <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                              {expiringSubscriptions.length}
                            </span>
                          )}
                        </h3>
                      </div>
                      {/* Content */}
                      {notificationsLoading ? (
                        <div className="max-h-64 overflow-y-auto px-4 py-3">
                          <div className="animate-pulse space-y-3">
                            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                          </div>
                        </div>
                      ) : notificationsError ? (
                        <div className="px-4 py-4 text-sm text-red-600">
                          {notificationsError}
                        </div>
                      ) : expiringSubscriptions.length > 0 ? (
                        <div className="max-h-64 overflow-y-auto">
                          {(() => {
                            const todayItems = expiringSubscriptions.filter((s) => getDaysLeft(s) === 0);
                            const tomorrowItems = expiringSubscriptions.filter((s) => getDaysLeft(s) === 1);
                            const twoDayItems = expiringSubscriptions.filter((s) => getDaysLeft(s) === 2);

                            const renderSection = (title: string, items: MemberSubscription[], color: string) => (
                              items.length > 0 && (
                                <div>
                                  <div className={`px-4 py-1 text-xs font-semibold ${color} sticky top-0`}>{title}</div>
                                  {items.map((sub) => {
                                    const effectiveExpiryDate = getEffectiveExpiryDate(sub);
                                    const daysLeft = getDaysLeft(sub);
                                    return (
                                      <div
                                        key={sub.id}
                                        className="px-4 py-3 hover:bg-amber-50 border-b border-gray-50 last:border-b-0 cursor-pointer"
                                        onClick={() => {
                                          navigate(`/manage-subscription/${sub.id}`);
                                          setIsNotificationDropdownOpen(false);
                                        }}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' || e.key === ' ') {
                                            navigate(`/manage-subscription/${sub.id}`);
                                            setIsNotificationDropdownOpen(false);
                                          }
                                        }}
                                      >
                                        <div className="flex items-start">
                                          <div className="flex-shrink-0 w-2 h-2 bg-amber-500 rounded-full mt-2 mr-3"></div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                              {sub.product.name}
                                            </p>
                                            <p className="text-xs text-gray-600 mt-1">
                                              Expires {daysLeft === 0 ? 'today' : daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                              {format(parseISO(effectiveExpiryDate), 'dd/MM/yyyy')}
                                              {typeof sub.qty === 'number' && (
                                                <span className="ml-2 text-gray-400">• Qty: {sub.qty} {sub.product.depotVariant?.unit || sub.product.unit || ''}</span>
                                              )}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )
                            );

                            return (
                              <div>
                                {renderSection('Expiring Today', todayItems, 'bg-red-50 text-red-700')}
                                {renderSection('Expiring Tomorrow', tomorrowItems, 'bg-amber-50 text-amber-800')}
                                {renderSection('In 2 days', twoDayItems, 'bg-yellow-50 text-yellow-800')}
                                <div className="px-4 py-2 border-t border-gray-100">
                                  <button
                                    onClick={() => {
                                      navigate('/member/subscriptions');
                                      setIsNotificationDropdownOpen(false);
                                    }}
                                    className="w-full text-center text-sm text-green-600 hover:text-green-700 font-medium py-1"
                                  >
                                    Manage All Subscriptions
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="px-4 py-8 text-center">
                          <Bell size={32} className="mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500">No notifications</p>
                          <p className="text-xs text-gray-400 mt-1">You'll see subscription alerts here</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
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
      <div className="flex justify-between items-center py-2.5 sm:py-3">
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
            <div className="flex items-center space-x-3 sm:space-x-4">
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
        <div className="md:hidden bg-white border-t border-gray-200 shadow-inner max-h-[calc(100vh-var(--header-height))] overflow-y-auto overscroll-contain">
          <div className="container mx-auto px-4 py-4 space-y-2">
            <div className="mb-3">
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
