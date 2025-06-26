import { AppSidebar } from "@/components/common/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Outlet, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import BottomNavBar from "../components/BottomNavBar";
interface RouteConfig {
  parent?: string;
  label: string;
  path: string;
}

const ROUTE_MAP: Record<string, RouteConfig> = {
  users: {
    parent: "Management",
    label: "Users",
    path: "/users",
  },
  locations: {
    parent: "Masters",
    label: "Locations",
    path: "/locations",
  },
  packages: {
    parent: "Masters",
    label: "Packages",
    path: "/packages",
  },
  countries: {
    parent: "Masters",
    label: "Countries",
    path: "/countries",
  },
  states: {
    parent: "Masters",
    label: "States",
    path: "/states",
  },
  cities: {
    parent: "Masters",
    label: "Cities",
    path: "/cities",
  },
  sectors: {
    parent: "Masters",
    label: "Sectors",
    path: "/sectors",
  },
  branches: {
    parent: "Masters",
    label: "Branches",
    path: "/branches",
  },
};

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

  const getBreadcrumbs = () => {
    const currentPath = location.pathname.split("/").filter(Boolean)[0];

    // If the current path is in our route map and has a parent
    const route = ROUTE_MAP[currentPath];
    if (route && route.parent) {
      return [
        {
          label: route.parent,
          path: "",
          isLast: false,
        },
        {
          label: route.label,
          path: route.path,
          isLast: true,
        },
      ];
    }

    // Default fallback for unmapped routes
    return [
      {
        label: currentPath
          ? currentPath.charAt(0).toUpperCase() + currentPath.slice(1)
          : "Home",
        path: `/${currentPath}`,
        isLast: true,
      },
    ];
  };

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem("theme", newDarkMode ? "dark" : "light");
  };

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
      <BottomNavBar />
    </SidebarProvider>
  );
}
