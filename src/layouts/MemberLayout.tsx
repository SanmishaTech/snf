import { Outlet, useNavigate, useLocation } from "react-router-dom";
import React, { useState, useEffect } from "react"; // Added React import
import { Sun, Moon, LogOut, Settings, Repeat } from "lucide-react"; // Removed User, Clock
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

export default function MemberLayout({ children }: MemberLayoutProps) { // Destructure children from props
  const location = useLocation();
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      return savedTheme === "dark";
    }
    // If no saved preference, check system preference
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  // Retrieve user data from localStorage
  const storedUserData = localStorage.getItem("user");
  const userData = storedUserData ? JSON.parse(storedUserData) : null;
  
  // Calculate subscription remaining time (mock data - would need to be fetched from API)
  const [subscriptionDaysLeft, setSubscriptionDaysLeft] = useState<number | null>(null);
  
  useEffect(() => {
    // Mock fetch subscription data - replace with actual API call
    const fetchSubscriptionData = async () => {
      try {
        // This would be an API call in production
        // const response = await get("/api/member/subscription");
        // setSubscriptionDaysLeft(response.daysLeft);
        
        // Mock data for now
        setSubscriptionDaysLeft(30);
      } catch (error) {
        console.error("Failed to fetch subscription data", error);
      }
    };
    
    fetchSubscriptionData();
  }, []);

  // Effect to sync dark mode state with HTML class
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

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

    // Only attempt redirect if not already on a product-related page
    // This check is important if the user lands on /dashboard initially
    if (location.pathname === '/dashboard' || !location.pathname.startsWith('/member/')) {
        // Or any other logic to determine if it's an initial member area entry point
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
      {/* Navbar */}
      <header className="bg-white dark:bg-gray-900 sticky top-0 z-20 shadow-sm border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 flex h-16 items-center justify-between">
          {/* Logo and brand name */}
          <div className="flex items-center space-x-2" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
            {/* Replace with your actual logo */}
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold">
              {appName.charAt(0)}
            </div>
            <span className="text-xl font-bold">{appName}</span>
          </div>

          {/* Navigation links - add your main nav items here */}
          <nav className="hidden md:flex items-center space-x-4">
            {/* <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <Home className="h-5 w-5 mr-2" />
              Dashboard
            </Button> */}
         
            {/* <Button variant="ghost" onClick={() => navigate("/member/products")}>
              <Package className="h-5 w-5 mr-2" />
              Products
            </Button> */}
            <Button variant="ghost" onClick={() => navigate("/member/subscriptions")}>
              <Repeat className="h-5 w-5 mr-2" />
              My Subscriptions
            </Button>
          </nav>

          {/* Right side controls */}
          <div className="flex items-center space-x-4">
            {/* Dark mode toggle */}
            <Button
              onClick={toggleDarkMode}
              variant="ghost"
              size="icon"
              aria-label="Toggle Dark Mode"
            >
              {isDarkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>

            {/* User dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative rounded-full h-8 w-8 p-0">
                  <Avatar>
                    <AvatarFallback>{getUserInitials()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userData?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{userData?.email}</p>
                  </div>
                </DropdownMenuLabel>
                
                 
                
                <DropdownMenuSeparator />
{/*                 
                <DropdownMenuItem onClick={() => navigate("/member/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                 */}
                <DropdownMenuItem onClick={() => navigate("/member/addresses")}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Manage Addresses</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/member/subscriptions")}>
                  <Repeat className="mr-2 h-4 w-4" />
                  <span>My Subscriptions</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow container mx-auto px-4 py-6">
        {children || <Outlet />}
      </main>
      
      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-4">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500 dark:text-gray-400">
          &copy; {new Date().getFullYear()} {appName}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
