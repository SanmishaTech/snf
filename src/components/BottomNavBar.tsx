import { NavLink, useLocation } from 'react-router-dom';
import { Home, ShoppingCart, User, Menu } from 'lucide-react';
import { useEffect, useState } from 'react';

const BottomNavBar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Check localStorage to determine login state
    const storedUserData = localStorage.getItem("user");
    setIsLoggedIn(!!storedUserData);
  }, [location.pathname]); // Re-check on every navigation

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white  border-t  shadow-lg z-50">
      <div className="flex justify-around py-2">
        {/* Home Link */}
        <NavLink 
          to={isLoggedIn ? "/" : "/"} 
          end 
          className={({ isActive }) =>
            `flex flex-col items-center hover:text-secondary ${isActive ? 'text-secondary' : 'text-gray-600'}`
          }
        >
          <Home size={24} />
          <span className="text-xs">Home</span>
        </NavLink>
        
        {/* Cart/Orders Link - Only shows if logged in */}
        {isLoggedIn && (
          <NavLink 
            to="/member/products" 
            className={({ isActive }) =>
              `flex flex-col items-center hover:text-secondary ${isActive ? 'text-secondary' : 'text-gray-600'}`
            }
          >
            <ShoppingCart size={24} />
            <span className="text-xs">Products</span>
          </NavLink>
        )}

        {/* Login/Profile Link */}
        <NavLink 
          to={isLoggedIn ? "/member/subscriptions" : "/login"} 
          className={({ isActive }) =>
            `flex flex-col items-center hover:text-secondary ${isActive ? 'text-secondary' : 'text-gray-600'}`
          }
        >
          <User size={24} />
          <span className="text-xs">{isLoggedIn ? 'My Subscription' : 'Login'}</span>
        </NavLink>

        {/* Menu Link */}
        <NavLink 
          to="/about" // Example: links to About Us page
          className={({ isActive }) =>
            `flex flex-col items-center hover:text-secondary ${isActive ? 'text-secondary' : 'text-gray-600'}`
          }
        >
          <Menu size={24} />
          <span className="text-xs">Menu</span>
        </NavLink>
      </div>
    </nav>
  );
};

export default BottomNavBar;
