import React, { useState, useEffect } from "react";
import { Home, Grid, User, MapPin, Loader2, Check, LocateFixed, ShoppingCart } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuArrow } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { geolocationService } from "@/modules/SNF/services/geolocation";
import { DeliveryLocationService, DeliveryLocation } from "@/services/deliveryLocationService";
import { usePricing } from "@/modules/SNF/context/PricingContext";
import { useCart } from "@/modules/SNF/context/CartContext";
import { CartDropdown } from "./CartDropdown";

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Location logic state
  const [open, setOpen] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState<DeliveryLocation | null>(() =>
    DeliveryLocationService.getCurrentLocation()
  );
  const [pincode, setPincode] = useState<string>(() => deliveryLocation?.pincode || "");
  const [loading, setLoading] = useState<"geo" | "pin" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isValidPin = /^\d{6}$/.test(pincode);

  const { actions: pricingActions } = usePricing();
  const { validateCart, state: cartState, totalQuantity } = useCart();
  const [bump, setBump] = useState(false);

  // Initialize delivery location on mount
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

  // Cart Bump Effect
  useEffect(() => {
    setBump(true);
    const t = setTimeout(() => setBump(false), 300);
    return () => clearTimeout(t);
  }, [totalQuantity]);

  const applyPincode = async () => {
    setError(null);
    setLoading("pin");
    try {
      const locationData = await DeliveryLocationService.updateLocationByPincode(pincode);

      if (locationData) {
        setDeliveryLocation(locationData);
        setPincode(locationData.pincode);
        setOpen(false);

        if (locationData.depotId && locationData.depotName) {
          try {
            const locContext = {
              pincode: locationData.pincode,
              latitude: 0,
              longitude: 0,
              address: `${locationData.areaName || ''}, ${locationData.pincode}`.trim().replace(/^,\s*/, ''),
            };

            const depotData = {
              id: parseInt(locationData.depotId),
              name: locationData.depotName,
              address: locationData.areaName || '',
              pincode: locationData.pincode,
              city: '',
              isOnline: false,
              isActive: true,
            };

            await pricingActions.setLocationWithDepot(locContext, depotData);

            if (cartState.items.length > 0) {
              await validateCart(depotData.id);
            }
          } catch (pricingError) {
            console.error('Failed to update pricing context:', pricingError);
          }
        }
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
      const locationData = await DeliveryLocationService.updateLocationByPincode(data.pincode);

      if (locationData) {
        setDeliveryLocation(locationData);
        setPincode(locationData.pincode);
        setOpen(false);

        try {
          await pricingActions.setLocation(data);
          if (cartState.items.length > 0 && locationData.depotId) {
            await validateCart(parseInt(locationData.depotId));
          }
        } catch (pricingError) {
          console.error('Failed to update pricing context:', pricingError);
        }
      } else {
        setPincode(data.pincode);
        setError("We don't deliver to this location yet. Check back soon!");
        try {
          await pricingActions.setLocation(data);
        } catch (pricingError) {
          // Ignore
        }
      }
    } catch (e: any) {
      setError(e?.message || "Unable to get location");
    } finally {
      setLoading(null);
    }
  };

  const navItems = [
    { label: "Home", icon: Home, path: "/snf", id: "home" },
    { label: "Categories", icon: Grid, path: "/snf#categories", id: "categories" },
  ];

  const isActive = (path: string) => {
    if (path.includes("#")) {
      return location.hash === path.split("#")[1];
    }
    return location.pathname === path;
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center flex-1">
          <div className="flex items-center justify-between w-full">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.path.startsWith("/snf#")) {
                      const el = document.getElementById(item.path.split("#")[1]);
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    } else {
                      navigate(item.path);
                    }
                  }}
                  className="flex flex-1 flex-col items-center gap-1"
                >
                  <div className={`relative p-1 ${active ? "text-[#f59e0b]" : "text-gray-400"}`}>
                    {active && (
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-black rounded-full" />
                    )}
                    <item.icon size={22} strokeWidth={active ? 2.5 : 2} />
                  </div>
                  <span className={`text-[10px] font-medium ${active ? "text-black" : "text-gray-500"}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}

            {/* Location Dropdown */}
            <DropdownMenu open={open} onOpenChange={setOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex flex-1 flex-col items-center gap-1"
                  aria-label="Set location"
                >
                  <div className="relative p-1 text-gray-400">
                    <MapPin size={22} strokeWidth={2} />
                  </div>
                  <span className="text-[10px] font-medium text-gray-500">Location</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" sideOffset={16} className="w-[calc(100vw-2rem)] sm:w-80 z-[60] rounded-2xl shadow-xl">
                <DropdownMenuArrow className="fill-popover w-4 h-2 opacity-100 drop-shadow-sm" />
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
                      className="h-9 text-sm"
                    />
                    <Button
                      size="sm"
                      disabled={!isValidPin || loading === "pin"}
                      onClick={applyPincode}
                      aria-label="Apply pincode"
                      className="h-9 px-3"
                    >
                      {loading === "pin" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    </Button>
                  </div>
                  {deliveryLocation && deliveryLocation.depotName && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Current: {deliveryLocation.pincode} • {deliveryLocation.depotName}
                    </p>
                  )}
                  {error && <p className="text-xs text-destructive mt-1">{error}</p>}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={useMyLocation} disabled={loading === "geo"}>
                  {loading === "geo" ? <Loader2 className="size-4 animate-spin mr-2" /> : <LocateFixed className="size-4 mr-2" />}
                  Use current location
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Profile popover */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex flex-1 flex-col items-center gap-1"
                  aria-label="Account"
                >
                  <div className="relative p-1 text-gray-400">
                    <User size={22} strokeWidth={2} />
                  </div>
                  <span className="text-[10px] font-medium text-gray-500">Profile</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" sideOffset={16} className="w-44 z-[60] rounded-2xl shadow-xl overflow-hidden">
                <DropdownMenuArrow className="fill-popover w-4 h-2 opacity-100 drop-shadow-sm" />
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/snf/addresses" className="w-full">Address</a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Cart */}
            {(() => {
              const cartActive = location.pathname === "/snf/cart";
              return (
                <CartDropdown>
                  <button
                    type="button"
                    className="flex flex-1 flex-col items-center gap-1"
                    aria-label="Cart"
                  >
                    <div
                      className={
                        bump
                          ? `relative p-1 transition-transform scale-[1.02] ${cartActive ? "text-[#f59e0b]" : "text-gray-400"}`
                          : `relative p-1 ${cartActive ? "text-[#f59e0b]" : "text-gray-400"}`
                      }
                    >
                      {cartActive && (
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-black rounded-full" />
                      )}
                      <ShoppingCart size={22} strokeWidth={cartActive ? 2.5 : 2} />
                      <span
                        className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center"
                        aria-live="polite"
                        aria-atomic="true"
                      >
                        {totalQuantity}
                      </span>
                    </div>
                    <span className={`text-[10px] font-medium ${cartActive ? "text-black" : "text-gray-500"}`}>
                      Cart
                    </span>
                  </button>
                </CartDropdown>
              );
            })()}

          </div>
        </div>

        <button
          className="ml-2 bg-[#22c55e] text-white px-4 py-2 rounded-xl flex items-center justify-center font-bold text-sm italic shadow-sm"
          onClick={() => navigate("/snf")}
        >
          SNF
        </button>
      </div>
    </div>
  );

};
