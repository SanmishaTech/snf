import { AppSidebar } from "@/components/common/app-sidebar";

import { Button } from "@/components/ui/button";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Outlet, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

import { useNavigate } from "react-router-dom";
import BottomNavBar from "../components/BottomNavBar";
import CommandPalette from "@/components/common/CommandPalette";
import AdminActivityTracker from "@/components/common/AdminActivityTracker";

type StoredUser = {
  name?: string;
  role?: string;
};

function getStoredUser(): StoredUser | null {
  try {
    const storedUserData = localStorage.getItem("user");
    return storedUserData ? (JSON.parse(storedUserData) as StoredUser) : null;
  } catch {
    return null;
  }
}

export default function MainLayout() {
  const navigate = useNavigate()

  // Retrieve user data from localStorage
  const userData = getStoredUser();

  const location = useLocation();


  const [role, setRole] = useState<string | undefined>(undefined);

  useEffect(() => {
    const nextUser = getStoredUser();
    setRole(nextUser?.role?.toString().toUpperCase() || undefined);
  }, [location.pathname]);

  return (
    <SidebarProvider>
      <CommandPalette />
      <AdminActivityTracker />
      <AppSidebar />
      <SidebarInset className="overflow-hidden min-w-0">
        {/* Sticky Header */}
        <header className="bg-blue-900 dark:bg-gray-900 sticky top-0 z-20 flex h-16 shrink-0 items-center border-b border-blue-800 dark:border-gray-700 shadow-sm transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-13 -ml-[1px] -mt-0">
          <div className="flex items-center justify-between w-full px-4">
            <div className="flex items-center gap-4">
              {/* Sidebar Trigger */}
              <SidebarTrigger className="text-white -ml-1" />
              <Button onClick={() => navigate(-1)}>Back</Button>
              {/* Welcome Message */}
              <h1 className="text-white">Welcome, {userData?.name} <span className="text-blue-200 dark:text-gray-400 text-sm">({userData?.role})</span></h1>
            </div>

          </div>
        </header>

        {/* Content Area */}
        <main className="pt-2 overflow-hidden">
          {/* Add padding to prevent content from being hidden */}
          <Outlet />
        </main>
      </SidebarInset>
      {role === "MEMBER" && <BottomNavBar />}
    </SidebarProvider>
  );
}

