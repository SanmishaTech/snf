"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {  
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Wallet, Plus, ChevronDown, Loader2 } from "lucide-react";
import { get } from "@/services/apiService"; // Assuming you have an apiService
import { toast } from "sonner";
import { useNavigate } from "react-router-dom"
;
interface WalletButtonProps {
  isLoggedIn?: boolean;
}

// Interval (in ms) at which the wallet balance should refresh
const WALLET_POLL_INTERVAL = 15000; // 15 seconds

export default function WalletButton({ isLoggedIn }: WalletButtonProps) {
  const navigate = useNavigate();
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole] = useState<string | null>(() => {
    try {
      const userDataString = localStorage.getItem('user');
      return userDataString ? JSON.parse(userDataString).role : null;
    } catch (error) {
      return null;
    }
  });

  /* -------------------------------------------------------------------------- */
  /*                        Fetching & Auto-refresh Balance                      */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    if (!isLoggedIn || userRole !== 'MEMBER') {
       setIsLoading(false);
       return;
    }

    let isMounted = true;

    const fetchWalletBalance = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Re-use the same endpoint used in the UserWallet page so data is consistent
        const response = await get("/wallet");

        let newBalance: number | undefined;

        if (response && response.data && typeof response.data.balance === "number") {
          newBalance = response.data.balance;
        } else if (typeof response.balance === "number") {
          newBalance = response.balance;
        }

        if (isMounted) {
          if (typeof newBalance === "number") {
            setBalance(newBalance);
          } else {
            console.warn("Unexpected response structure for wallet balance:", response);
            setError("Failed to fetch balance: unexpected data format.");
            setBalance(0);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Failed to fetch wallet balance:", err);
          const errorMessage = err.response?.data?.message || err.message || "Failed to fetch wallet balance";
          setError(errorMessage);
          toast.error(errorMessage);
          setBalance(0);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    // Initial fetch
    fetchWalletBalance();

    // Start polling
    const intervalId = setInterval(fetchWalletBalance, WALLET_POLL_INTERVAL);

    // Cleanup on unmount
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [isLoggedIn, userRole]);

  if (!isLoggedIn) {
    return null; // Don't render anything if not logged in
  }

  // Handle roles that don't have a wallet
  if (userRole && userRole !== 'MEMBER') {
    return (
      <Button
        variant="outline"
        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 h-auto py-1.5"
        onClick={() => toast.info("Wallet features are reserved for member accounts. Your current account role does not have an active wallet.")}
      >
        <Wallet className="w-5 h-5 text-orange-500" />
        <div className="flex flex-col items-start leading-tight">
          <span className="text-[10px] font-bold uppercase text-gray-700">{userRole} Account</span>
          <span className="text-[9px] text-gray-500 font-medium">No Wallet Associated</span>
        </div>
      </Button>
    );
  }

  if (isLoading) {
    return (
      <Button
        variant="outline"
        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg"
        disabled
      >
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="font-medium">Loading...</span>
      </Button>
    );
  }

  // Render an error state if fetching failed and balance is not available
  if (error && balance === 0) { // Show error only if balance couldn't be set to a valid value
    return (
      <Button
        variant="outline"
        className="flex items-center gap-2 px-4 py-2 border border-destructive text-destructive rounded-lg hover:bg-destructive/10"
        title={error} // Show full error on hover
        onClick={() => { /* Optionally, implement a retry mechanism here */ }}
      >
        <Wallet className="w-5 h-5" />
        <span className="font-medium">Error</span> 
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Wallet className="w-5 h-5 text-orange-500" />
          <span className="font-medium">₹{balance !== null ? balance.toFixed(2) : 'N/A'}</span>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          Wallet Balance: ₹{balance !== null ? balance.toFixed(2) : 'N/A'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
        onClick={() => navigate("/member/wallet")}
        className="flex items-center gap-2 cursor-pointer">
          <Plus className="w-4 h-4" />
        Add Money
        </DropdownMenuItem>
       
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
