"use client";

import { useState } from "react";
import UserChangePasswordDialog from "@/components/common/UserChangePasswordDialog"; // Assuming moved to auth directory
import { LogOut, ChevronsUpDown, KeySquare } from "lucide-react";
import ConfirmDialog from "@/components/common/confirm-dialog";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { clearAuthData } from "@/utils/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
    avatarName: string;
  };
}) {
  const { isMobile } = useSidebar();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);

  const handleLogout = () => {
    // Clear all cached query data to prevent stale data issues
    queryClient.clear();
    
    // Clear all authentication data from localStorage
    clearAuthData();
    
    setShowConfirmation(false);
    navigate("/"); // Redirect to login page
  };

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                tooltip={user?.name || "User"}
                className="hover:bg-white/10 data-[state=open]:bg-white data-[state=open]:hover:bg-white cursor-pointer transition-colors group group-data-[collapsible=icon]:justify-center"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user?.avatar} alt={user?.name} />
                  <AvatarFallback className="rounded-lg">
                    {user?.avatarName}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold text-white group-data-[state=open]:text-[#1d398d]">{user?.name}</span>
                  <span className="truncate text-xs text-white group-data-[state=open]:text-[#1d398d]/70">{user?.email}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4 text-blue-200 group-data-[state=open]:text-[#1d398d] group-data-[collapsible=icon]:hidden" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user?.avatar} alt={user?.name} />
                    <AvatarFallback className="rounded-lg">
                      {user?.avatarName}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user?.name}</span>
                    <span className="truncate text-xs">{user?.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setShowChangePasswordDialog(true);
                }}
                className="cursor-pointer"
              >
                <KeySquare className="mr-2 h-4 w-4" />
                <span>Change Password</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
                 <DropdownMenuItem
                  onSelect={(e) => {
                  e.preventDefault();
                  console.log('[nav-user.tsx] Logout DropdownMenuItem clicked. Setting showConfirmation to true.');
                  setShowConfirmation(true);
                }}
                className="cursor-pointer text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <UserChangePasswordDialog
        isOpen={showChangePasswordDialog}
        onClose={() => setShowChangePasswordDialog(false)}
      />

      <ConfirmDialog
        isOpen={showConfirmation}
        title="Confirm Logout"
        description="Are you sure you want to log out? You will need to login again to access your account."
        cancelLabel="Cancel"
        confirmLabel="Log out"
        onCancel={() => setShowConfirmation(false)}
        onConfirm={handleLogout}
      />
    </>
  );
}
