import { Outlet, useNavigate, useLocation } from "react-router-dom";
import React, { useState, useEffect } from "react"; // Added React import
import { Sun, Moon, LogOut, Settings, Repeat, Package, Leaf } from "lucide-react"; // Removed User, Clock, Added Leaf

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,      
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { appName } from "@/config";
import { get } from "@/services/apiService"; // For fetching products
import Header from '@/layouts/Header';
 
// Define Product type (ensure this matches your actual Product structure)

// Define props for MemberLayout
interface MemberLayoutProps {
  children?: React.ReactNode; // Optional children prop
}
interface Product {
  id: string;
  name: string;
  // Add other relevant fields if needed for logic, though only 'id' is used here
}

export default function MemberLayout({ children }: MemberLayoutProps) { 
  const location = useLocation();
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      return savedTheme === "dark";
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const storedUserData = localStorage.getItem("user");
  const userData = storedUserData ? JSON.parse(storedUserData) : null;
  const role = (userData as any)?.role?.toString().toUpperCase() || undefined;
  const [isLoggedIn, setIsLoggedIn] = useState(!!userData);
  const initialName = userData?.name || userData?.username || userData?.email;
  const [userName, setUserName] = useState<string | undefined>(initialName);
  const showWallet = isLoggedIn && role === "MEMBER";
  
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    // Listen for storage changes to update login state (e.g., if user logs out in another tab)
    const handleStorageChange = () => {
      const currentStoredUserData = localStorage.getItem("user");
      const currentUserData = currentStoredUserData ? JSON.parse(currentStoredUserData) : null;
      setIsLoggedIn(!!currentUserData);
      setUserName(currentUserData?.name || currentUserData?.username || currentUserData?.email || null);
    };

    window.addEventListener('storage', handleStorageChange);
    // Initial check in case of direct navigation or refresh
    handleStorageChange(); 

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [location.pathname]);

  // Effect to redirect to the first product or products page
  useEffect(() => {
    if (!userData) return; // Only run if user is logged in

    // Avoid redirect if already on a product page or the main products listing
    if (location.pathname.startsWith('/member/products')) {
      return;
    }

    const fetchAndRedirect = async () => {
      try {
        // Assuming get('/products') returns an object like { data: Product[] } or Product[] directly
        // Adjust based on your actual API response structure
        const response = await get('/products') as { data?: Product[] } | Product[];
        
        let products: Product[] = [];
        if (Array.isArray(response)) {
          products = response;
        } else if (response && response.data && Array.isArray(response.data)) {
          products = response.data;
        }

        if (products.length > 0) {
          const firstProductId = products[0].id;
          navigate(`/member/products/${firstProductId}`);
        } else {
          // No products found, navigate to the general products page
          // MemberProductDisplayPage should handle showing "No products available"
          navigate('/member/products');
        }
      } catch (error) {
        console.error("Failed to fetch products for redirect:", error);
        // Fallback: navigate to the general products page on error
        navigate('/member/products');
      }
    };

    // Only attempt redirect if the user lands on /dashboard initially.
    // Navigating to other specific member pages (like /manage-subscription) should not trigger this redirect.
    if (location.pathname === '/dashboard') {
        fetchAndRedirect();
    }

  }, [userData, navigate, location.pathname]);

  // Effect to listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("theme")) {
        setIsDarkMode(e.matches);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem("theme", newDarkMode ? "dark" : "light");
  };

  const handleLogout = () => {
    // Clear all authentication data from localStorage
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("roles");
    localStorage.removeItem("memberId");
    
    toast.success("You have been logged out");
    navigate("/");
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!userData?.name) return "U";
    return userData.name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header isLoggedIn={isLoggedIn} userName={userName} onLogout={handleLogout} showWallet={showWallet} />

      {/* Main content */}
      <main 
        className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 pb-8"
        style={{ paddingTop: 'var(--header-height)' }}
      >
        {children || <Outlet />}
      </main>
      
      {/* Footer */}
      <AppFooter />
    </div>
  );
}

// New AppFooter component
const AppFooter = () => {
  return (
    <footer className="bg-slate-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700">
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-10">
          {/* Column 1: Logo, Description, Payment */}
          <div className="md:col-span-12 lg:col-span-4">
            <div className="mb-6 flex items-center">
              <Leaf className="h-10 w-10 text-green-600 mr-3" />
              <span className="text-2xl font-bold text-green-700 dark:text-green-500">Sarkhot Natural Farms</span>
            </div>
            <p className="text-sm mb-6 leading-relaxed">
              Sarkhot Natural farms denote the community of natural farmers. Natural means <span className="font-semibold text-red-500">💯%</span> chemical free, preservative free and poison free.
            </p>
            <h3 className="text-[0.9rem] font-semibold mb-3 text-gray-600 dark:text-gray-400">Payment Accepted</h3>
            <div className="flex flex-wrap gap-2 items-center">
              {['Mastercard', 'Discover', 'BitPay', 'Visa', 'Stripe'].map(method => (
                <span key={method} className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-md shadow-sm">{method}</span>
              ))}
            </div>
          </div>

          {/* Spacer for large screens to push link columns to the right */} 
          <div className="hidden lg:block lg:col-span-1"></div>

          {/* Column 2: Policies */}
          <div className="md:col-span-4 lg:col-span-2">
            <h3 className="text-md font-semibold mb-4 text-green-700 dark:text-green-500 border-b-2 border-green-500 pb-1 inline-block">Policies</h3>
            <ul className="space-y-2.5 text-sm">
              <li><a href="/privacy-policy" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Privacy Policy</a></li>
              <li><a href="/refund-policy" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Refund and Returns Policy</a></li>
              <li><a href="/shipping-policy" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Shipping and delivery policy</a></li>
              <li><a href="/terms-and-conditions" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Terms and Conditions</a></li>
            </ul>
          </div>

          {/* Column 3: Useful Links */}
          <div className="md:col-span-4 lg:col-span-2">
            <h3 className="text-md font-semibold mb-4 text-green-700 dark:text-green-500 border-b-2 border-green-500 pb-1 inline-block">Useful Links</h3>
            <ul className="space-y-2.5 text-sm">
              <li><a href="/" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Home</a></li>
              <li><a href="/member/products" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Shop</a></li>
              <li><a href="/about" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">About</a></li>
              <li><a href="/contact" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Contact Us</a></li>
            </ul>
          </div>

          {/* Column 4: Contact */}
          <div className="md:col-span-4 lg:col-span-3">
            <h3 className="text-md font-semibold mb-4 text-green-700 dark:text-green-500 border-b-2 border-green-500 pb-1 inline-block">Contact</h3>
            <address className="text-sm not-italic space-y-2 leading-relaxed">
              <p>Sarkhot Natural Farms, Shop no 3, Chidghan society, Opp. Maharashtra Steel, Tilak cross Phadke Road, Dombivli East - 421201</p>
              <p><strong className="text-gray-800 dark:text-gray-200">Landmark</strong> - Near Brahman Sabha hall.</p>
              <p><a href="mailto:sarkhotnaturalfarms@gmail.com" className="hover:text-green-600 dark:hover:text-green-400 transition-colors break-all">sarkhotnaturalfarms@gmail.com</a></p>
              <p><a href="tel:+919920999100" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">+91 9920999100</a></p>
            </address>
          </div>
        </div>
      </div>

      {/* Sub-Footer */}
      <div className="bg-gray-200 dark:bg-gray-800 py-4 border-t border-gray-300 dark:border-gray-700">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center text-xs text-gray-600 dark:text-gray-400">
          <p className="mb-2 md:mb-0 text-center md:text-left">&copy; {new Date().getFullYear()} Sarkhot Natural Farms. All Rights Reserved.</p>
          <p className="text-center md:text-right">Powered by <a href="#" className="font-semibold text-green-700 dark:text-green-500 hover:underline">Brospro</a></p>
        </div>
      </div>
    </footer>
  );
};
