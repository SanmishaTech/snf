import { AppSidebar } from "@/components/common/app-sidebar";

import { Button } from "@/components/ui/button";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Outlet, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

import { useNavigate } from "react-router-dom";
import BottomNavBar from "../components/BottomNavBar";


export default function MainLayout() {
  const navigate = useNavigate()
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      return savedTheme === "dark";
    }
    // If no saved preference, check system preference
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  // Effect to sync dark mode state with HTML class
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  // Retrieve user data from localStorage
  const storedUserData = localStorage.getItem("user");
  const userData = storedUserData ? JSON.parse(storedUserData) : null;

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

  const location = useLocation();



  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem("theme", newDarkMode ? "dark" : "light");
  };

  const [role, setRole] = useState<string | undefined>(undefined);

  useEffect(() => {
    const storedUserData = localStorage.getItem("user");
    const userData = storedUserData ? JSON.parse(storedUserData) : null;
    setRole((userData as any)?.role?.toString().toUpperCase() || undefined);
  }, [location.pathname]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Sticky Header */}
        <header className="bg-blue-900 sticky top-0 z-20 flex h-16 shrink-0 items-center border-b bg-background shadow-sm transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-13 -ml-[1px] -mt-0">
          <div className="flex items-center justify-between w-full px-4">
            <div className="flex items-center gap-4">
              {/* Sidebar Trigger */}
              <SidebarTrigger className="text-white -ml-1" />
              <Button onClick={() => navigate(-1)}>Back</Button>
              {/* Welcome Message */}
              <h1 className="text-white">Welcome, {userData?.name} <span className="text-blue-200 text-sm">({userData?.role})</span></h1>
            </div>

            {/* Dark Mode Switcher - On the right side */}
            <div className="flex items-center gap-4">
              <Button
                onClick={toggleDarkMode}
                className="text-white size-7 cursor-pointer"
                variant="ghost"
                size="icon"
                aria-label="Toggle Dark Mode"
              >
                {isDarkMode ? <Moon /> : <Sun />}
              </Button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="pt-2">
          {/* Add padding to prevent content from being hidden */}
          <Outlet />
        </main>
      </SidebarInset>
      {role === "MEMBER" && <BottomNavBar />}
    </SidebarProvider>
  );
}
