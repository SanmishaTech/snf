import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Info, Leaf, ShoppingBag, Phone, User } from 'lucide-react';
import { useEffect, useState } from 'react';

const BottomNavBar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Check localStorage to determine login state
    const storedUserData = localStorage.getItem("user");
    setIsLoggedIn(!!storedUserData);
  }, [location.pathname]);

  const navItems = [
    { label: "Home", icon: Home, path: "/" },
    { label: "About Us", icon: Info, path: "/about" },
    { label: "Bharwad Cow", icon: Leaf, path: "/bharwadcow" },
    { label: "Products", icon: ShoppingBag, path: "/member/products" },
    { label: "Contact Us", icon: Phone, path: "/contact" },
    { label: "Account", icon: User, path: isLoggedIn ? "/member/subscriptions" : "/login" },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-between px-1 py-2">
        <div className="flex items-center justify-between w-full">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <div className={`relative p-1 ${active ? "text-[#f59e0b]" : "text-gray-400"}`}>
                  {active && (
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-black rounded-full" />
                  )}
                  <item.icon size={20} strokeWidth={active ? 2.5 : 2} />
                </div>
                <span className={`text-[9px] font-medium leading-tight text-center ${active ? "text-black" : "text-gray-500"}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BottomNavBar;
