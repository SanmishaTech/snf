import React, { useEffect, useState } from "react";
import { User, Search, MapPin, LocateFixed, Loader2, Check } from "lucide-react";
import GlobalSearch from "@/components/GlobalSearch";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { geolocationService } from "@/modules/SNF/services/geolocation";
import { DeliveryLocationService, DeliveryLocation } from "@/services/deliveryLocationService";
import { CartDropdown } from "./CartDropdown";
import WalletButton from "@/modules/Wallet/Components/Walletmenu";

interface HeaderProps {
  cartCount: number;
  onSearch: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = (_props) => {
  const [sticky, setSticky] = useState(false);
  const [open, setOpen] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState<DeliveryLocation | null>(() => 
    DeliveryLocationService.getCurrentLocation()
  );
  const [pincode, setPincode] = useState<string>(() => deliveryLocation?.pincode || "");
  const [loading, setLoading] = useState<"geo" | "pin" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isValidPin = /^\d{6}$/.test(pincode);

  useEffect(() => {
    const onScroll = () => setSticky(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Initialize delivery location on mount and migrate old storage
  useEffect(() => {
    const initializeLocation = async () => {
      await DeliveryLocationService.migrateFromOldPincodeStorage();
      const currentLocation = DeliveryLocationService.getCurrentLocation();
      if (currentLocation) {
        setDeliveryLocation(currentLocation);
        setPincode(currentLocation.pincode);
      }
    };
    initializeLocation();
  }, []);

  const applyPincode = async () => {
    setError(null);
    setLoading("pin");
    try {
      // Update delivery location with depot mapping
      const location = await DeliveryLocationService.updateLocationByPincode(pincode);
      
      if (location) {
        setDeliveryLocation(location);
        setPincode(location.pincode);
        setOpen(false);
        console.log(`Location updated: ${location.pincode} -> Depot: ${location.depotName} (${location.depotId})`);
      } else {
        setError("We don't deliver to this pincode yet. Check back soon!");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to resolve pincode");
    } finally {
      setLoading(null);
    }
  };

  const useMyLocation = async () => {
    setError(null);
    setLoading("geo");
    try {
      const data = await geolocationService.requestLocationWithExplanation();
      
      // Update delivery location with the detected pincode
      const location = await DeliveryLocationService.updateLocationByPincode(data.pincode);
      
      if (location) {
        setDeliveryLocation(location);
        setPincode(location.pincode);
        setOpen(false);
        console.log(`Location detected: ${location.pincode} -> Depot: ${location.depotName} (${location.depotId})`);
      } else {
        // Still set the pincode even if no depot is found
        setPincode(data.pincode);
        setError("We don't deliver to this location yet. Check back soon!");
      }
    } catch (e: any) {
      setError(e?.message || "Unable to get location");
    } finally {
      setLoading(null);
    }
  };

  return (
    <header
      className={`top-0 inset-x-0 z-40 bg-background/95 supports-[backdrop-filter]:bg-background/60 backdrop-blur border-b transition-all pt-[env(safe-area-inset-top)] ${
        sticky ? "sticky shadow-sm" : "relative"
      }`}
      aria-label="SNF store global header"
    >
      <div className="container mx-auto px-3 md:px-6 lg:px-8">
        <div className="h-14 md:h-16 flex items-center justify-between gap-2 md:gap-3 min-w-0">
          <a href="/snf" className="flex items-center gap-2 min-w-0" aria-label="SNF Home">
            <div className="size-8 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold shrink-0">
              S
            </div>
            <span className="hidden sm:inline text-base md:text-lg font-semibold tracking-tight truncate">SNF Market</span>
          </a>

          {/* Replace submit-based search with search-as-you-type preview dropdown */}
          <div className="flex-1 max-w-xl hidden md:flex items-center min-w-0">
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            {/* Location selector using shadcn DropdownMenu with portal and safe z-index */}
            <DropdownMenu open={open} onOpenChange={setOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" aria-label="Select delivery location" className="whitespace-nowrap">
                  <MapPin className="size-4" />
                  {deliveryLocation && deliveryLocation.depotName ? (
                    <span className="hidden sm:inline">{deliveryLocation.pincode} • {deliveryLocation.depotName}</span>
                  ) : pincode ? (
                    <span className="hidden sm:inline">Pincode: {pincode}</span>
                  ) : (
                    <span className="hidden sm:inline">Set location</span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-72 z-[60]" /* z-[60] to ensure above header but below modals */
              >
                <DropdownMenuLabel className="flex items-center gap-2">
                  <MapPin className="size-4" />
                  Choose delivery location
                </DropdownMenuLabel>
                <div className="px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <Input
                      inputMode="numeric"
                      pattern="\d{6}"
                      maxLength={6}
                      placeholder="Enter 6-digit pincode"
                      value={pincode}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                        setPincode(v);
                        setError(null);
                      }}
                      aria-invalid={pincode.length > 0 && !isValidPin}
                    />
                    <Button
                      size="sm"
                      disabled={!isValidPin || loading === "pin"}
                      onClick={applyPincode}
                      aria-label="Apply pincode"
                    >
                      {loading === "pin" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    </Button>
                  </div>
                  {error && <p className="text-xs text-destructive mt-1">{error}</p>}
                  {!error && pincode && !isValidPin && (
                    <p className="text-xs text-muted-foreground mt-1">Pincode must be 6 digits</p>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={useMyLocation}
                  className="cursor-pointer"
                  disabled={loading === "geo"}
                >
                  {loading === "geo" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <LocateFixed className="size-4" />
                  )}
                  Use my current location
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Wallet Button (hide on very small screens to prevent overflow) */}
            <div className="hidden sm:inline-flex">
              <WalletButton isLoggedIn={true} />
            </div>

            {/* Mobile search icon focuses input inside GlobalSearch if desired (future enhancement) */}
            <a
              href="/snf"
              className="md:hidden inline-flex items-center justify-center rounded-md h-9 w-9 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring"
              aria-label="Search"
            >
              <Search className="size-5" aria-hidden="true" />
            </a>

            {/* Account dropdown opens on click */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md h-9 w-9 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring"
                  aria-label="Account"
                >
                  <User className="size-5" aria-hidden={true} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-44">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/snf/address" className="w-full">Address</a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <CartDropdown />
          </div>
        </div>

        {/* Mobile search (uses same GlobalSearch component) */}
        <div className="md:hidden pb-2">
          <GlobalSearch />
        </div>
      </div>
    </header>
  );
};