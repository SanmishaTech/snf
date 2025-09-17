import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useDeliveryLocation } from "../hooks/useDeliveryLocation";
import { Header } from "./Header.tsx";
import { Footer } from "./Footer.tsx";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

import { Minus, Plus, Trash2, MapPin, AlertTriangle } from "lucide-react";
import { snfOrderService } from "@/services/snfOrderService";
import { get } from "@/services/apiService";
import { DeliveryLocationService, DeliveryLocation } from "@/services/deliveryLocationService";
import { toast } from "sonner";
import AddressSelector from "./AddressSelector";
import { type DeliveryAddress } from "../hooks/useAddresses";
import DeliveryScheduleDisplay from "./DeliveryScheduleDisplay";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const CheckoutPage: React.FC = () => {
  const { 
    state, 
    subtotal, 
    availableSubtotal, 
    increment, 
    decrement, 
    removeItem, 
    clear, 
    validateCart,
    getAvailableItems,
    getUnavailableItems 
  } = useCart();
  const { currentDepotId } = useDeliveryLocation();
  const totalQty = state.items.reduce((n, it) => n + it.quantity, 0);
  const navigate = useNavigate();

  const availableItems = getAvailableItems();
  const unavailableItems = getUnavailableItems();

  const [selectedAddress, setSelectedAddress] = useState<DeliveryAddress | null>(null);
  const [selectedDeliveryDate, setSelectedDeliveryDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState<DeliveryLocation | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isFetchingWallet, setIsFetchingWallet] = useState<boolean>(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const lastValidatedDepotRef = useRef<number | null>(null);
  const hasItemsRef = useRef(false);

  // Track if we have items to avoid unnecessary validations
  hasItemsRef.current = state.items.length > 0;

  // Load delivery location on component mount and when depot changes
  useEffect(() => {
    const location = DeliveryLocationService.getCurrentLocation();
    setDeliveryLocation(location);
  }, [currentDepotId]);

  // Listen for delivery location changes from localStorage (e.g., when set via header)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'snf.deliveryLocation' || event.key === null) {
        const newLocation = DeliveryLocationService.getCurrentLocation();
        console.log('[CheckoutPage] Delivery location changed via storage:', newLocation);
        setDeliveryLocation(newLocation);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Initial validation when component mounts with existing items
  useEffect(() => {
    if (state.items.length > 0 && currentDepotId && lastValidatedDepotRef.current === null) {
      console.log('[CheckoutPage] Initial validation on mount');
      setIsValidating(true);
      lastValidatedDepotRef.current = currentDepotId;
      
      validateCart(currentDepotId).finally(() => {
        console.log('[CheckoutPage] Initial validation completed');
        setIsValidating(false);
      });
    }
  }, []); // Only run once on mount

  // Validate cart when depot changes (but not when items are just updated)
  useEffect(() => {
    const hasItems = hasItemsRef.current;
    const depotChanged = currentDepotId !== lastValidatedDepotRef.current;
    
    console.log('[CheckoutPage] Effect triggered:', { 
      hasItems,
      currentDepotId, 
      lastValidatedDepot: lastValidatedDepotRef.current,
      depotChanged,
      isValidating 
    });
    
    if (hasItems && currentDepotId && depotChanged && !isValidating) {
      console.log('[CheckoutPage] Starting validation for depot:', currentDepotId);
      setIsValidating(true);
      lastValidatedDepotRef.current = currentDepotId;
      
      validateCart(currentDepotId).finally(() => {
        console.log('[CheckoutPage] Validation completed');
        setIsValidating(false);
      });
    } else {
      console.log('[CheckoutPage] Skipping validation:', { 
        hasItems, 
        hasDepotId: !!currentDepotId,
        depotChanged,
        isValidating
      });
    }
    
    // Reset selected delivery date when depot changes
    if (depotChanged && currentDepotId) {
      console.log('[CheckoutPage] Resetting delivery date due to depot change');
      setSelectedDeliveryDate('');
    }
  }, [currentDepotId, isValidating]);

  // Fetch wallet balance for breakdown and deduction
  useEffect(() => {
    const fetchWallet = async () => {
      setIsFetchingWallet(true);
      setWalletError(null);
      try {
        const resp: any = await get('/wallet');
        let balance: number | null = null;
        if (resp && resp.data && typeof resp.data.balance === 'number') {
          balance = resp.data.balance;
        } else if (typeof resp?.balance === 'number') {
          balance = resp.balance;
        }
        setWalletBalance(typeof balance === 'number' ? balance : 0);
      } catch (e: any) {
        console.error('Failed to fetch wallet balance:', e);
        setWalletError(e?.message || 'Failed to fetch wallet');
        setWalletBalance(0);
      } finally {
        setIsFetchingWallet(false);
      }
    };
    fetchWallet();
  }, []);

  const isFormValid = selectedAddress !== null && selectedDeliveryDate !== '';

  const handlePlaceOrder = async () => {
    if (availableItems.length === 0 || !isFormValid || loading) return;
    
    // Show confirmation if there are unavailable items
    if (unavailableItems.length > 0) {
      const confirmed = window.confirm(
        `${unavailableItems.length} item${unavailableItems.length > 1 ? 's' : ''} in your cart ${unavailableItems.length > 1 ? 'are' : 'is'} not available in this location and will be removed from your order. Continue with ${availableItems.length} available item${availableItems.length > 1 ? 's' : ''}?`
      );
      if (!confirmed) return;
    }

    try {
      setLoading(true);
      
      // Get depot ID from selected delivery location
      const depotIdString = DeliveryLocationService.getCurrentDepotId();
      const depotId = depotIdString ? parseInt(depotIdString.toString()) : null;
      console.log('[Checkout] Using depot ID:', depotId);
      
      // Only include available items in the order
      const itemsPayload = availableItems.map((it) => ({
        name: it.name,
        variantName: it.variantName,
        imageUrl: it.imageUrl || null,
        price: it.price,
        quantity: it.quantity,
        productId: it.productId,
        depotProductVariantId: it.variantId,
      }));
      const deliveryFee = 0;
      const orderSubtotal = availableSubtotal; // Use available items subtotal
      const walletDeduction = Math.max(0, Math.min(walletBalance || 0, orderSubtotal + deliveryFee));
      if (!selectedAddress) {
        toast.error("Please select a delivery address");
        return;
      }

      if (!selectedDeliveryDate) {
        toast.error("Please select a delivery date");
        return;
      }

      const payload = {
        customer: {
          name: selectedAddress.recipientName,
          email: null, // Email not stored in address
          mobile: selectedAddress.mobile,
          addressLine1: selectedAddress.plotBuilding,
          addressLine2: selectedAddress.streetArea,
          city: selectedAddress.city,
          state: selectedAddress.state,
          pincode: selectedAddress.pincode,
        },
        items: itemsPayload,
        subtotal: orderSubtotal,
        deliveryFee,
        totalAmount: orderSubtotal + deliveryFee,
        walletamt: walletDeduction,
        paymentMode: null,
        paymentRefNo: null,
        paymentStatus: "PENDING",
        paymentDate: null,
        depotId: depotId || null, // Include depot ID from delivery location
        deliveryAddressId: selectedAddress.id, // Include the selected address ID
        deliveryDate: selectedDeliveryDate, // Include the selected delivery date
      };
      const res = await snfOrderService.createOrder(payload);
      toast.success(`Order created: ${res.data.orderNo}`);
      clear();
      navigate(`/admin/snf-orders/${res.data.id}`);
    } catch (err: any) {
      const message = err?.message || "Failed to create order";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header cartCount={totalQty} onSearch={() => {}} />

      <main className="flex-1">
        <section className="container mx-auto px-4 md:px-6 lg:px-8 py-6">
          <h1 className="text-2xl md:text-3xl font-semibold mb-4">Checkout</h1>
          {state.items.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Your cart is empty</CardTitle>
                <CardDescription>Add some products to continue</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild>
                  <a href="/snf">Continue shopping</a>
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                {isValidating && (
                  <Card>
                    <CardContent className="py-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        Checking item availability...
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Available Items */}
                {availableItems.length > 0 && (
                  <>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-medium">Available Items</h2>
                      <span className="text-sm text-muted-foreground">({availableItems.length} item{availableItems.length > 1 ? 's' : ''})</span>
                    </div>
                    {availableItems.map((it) => (
                      <Card key={it.variantId}>
                        <CardContent className="py-4">
                          <div className="flex gap-4 items-start">
                            <div className="size-20 shrink-0 rounded-md overflow-hidden bg-muted/30 grid place-items-center">
                              {it.imageUrl ? (
                                <img
                                  src={it.imageUrl}
                                  alt={it.name}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <span className="text-xs text-muted-foreground">No image</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm md:text-base font-medium truncate">{it.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{it.variantName}</p>
                                </div>
                                <button
                                  className="p-2 rounded hover:bg-accent"
                                  onClick={() => removeItem(it.variantId)}
                                  aria-label={`Remove ${it.name}`}
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </div>
                              <div className="mt-3 flex items-center justify-between">
                                <div className="inline-flex items-center gap-2 border rounded-md px-2 py-1">
                                  <button
                                    className="p-1 rounded hover:bg-accent"
                                    onClick={() => decrement(it.variantId)}
                                    aria-label="Decrease quantity"
                                  >
                                    <Minus className="size-4" />
                                  </button>
                                  <span className="text-sm w-6 text-center">{it.quantity}</span>
                                  <button
                                    className="p-1 rounded hover:bg-accent"
                                    onClick={() => increment(it.variantId)}
                                    aria-label="Increase quantity"
                                  >
                                    <Plus className="size-4" />
                                  </button>
                                </div>
                                <div className="text-sm md:text-base font-semibold">
                                  {currency.format(it.price * it.quantity)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}

                {/* Unavailable Items */}
                {unavailableItems.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 mt-6">
                      <AlertTriangle className="size-5 text-amber-500" />
                      <h2 className="text-lg font-medium text-amber-700">Not Available in This Location</h2>
                      <span className="text-sm text-muted-foreground">({unavailableItems.length} item{unavailableItems.length > 1 ? 's' : ''})</span>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                      These items will be removed from your order during checkout.
                    </div>
                    {unavailableItems.map((it) => (
                      <Card key={it.variantId} className="opacity-60 border-amber-200">
                        <CardContent className="py-4">
                          <div className="flex gap-4 items-start">
                            <div className="size-20 shrink-0 rounded-md overflow-hidden bg-muted/50 grid place-items-center">
                              {it.imageUrl ? (
                                <img
                                  src={it.imageUrl}
                                  alt={it.name}
                                  className="h-full w-full object-cover grayscale"
                                  loading="lazy"
                                />
                              ) : (
                                <span className="text-xs text-muted-foreground">No image</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm md:text-base font-medium truncate line-through">{it.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{it.variantName}</p>
                                  <p className="text-xs text-amber-600 mt-1">{it.unavailableReason}</p>
                                </div>
                                <button
                                  className="p-2 rounded hover:bg-accent"
                                  onClick={() => removeItem(it.variantId)}
                                  aria-label={`Remove ${it.name}`}
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </div>
                              <div className="mt-3 flex items-center justify-between">
                                <div className="text-xs text-muted-foreground">
                                  Qty: {it.quantity}
                                </div>
                                <div className="text-sm md:text-base text-muted-foreground line-through">
                                  {currency.format(it.price * it.quantity)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={clear}>Clear cart</Button>
                  <Button asChild variant="outline">
                    <Link to="/snf">Continue shopping</Link>
                  </Button>
                </div>
              </div>

              <div className="lg:col-span-1 space-y-4">
                {/* Delivery Location Card */}
                <Card className={deliveryLocation && deliveryLocation.depotName ? "border-green-200" : "border-yellow-200"}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="size-4" />
                      Delivery Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {deliveryLocation && deliveryLocation.depotName ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">Pincode:</span>
                          <span>{deliveryLocation.pincode}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">Depot:</span>
                          <span>{deliveryLocation.depotName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">Area:</span>
                          <span>{deliveryLocation.areaName}</span>
                        </div>
                        <div className="text-xs text-green-600 mt-2 flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-600 rounded-full" />
                          Service available
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-sm text-yellow-700 flex items-start gap-2">
                          <AlertTriangle className="size-4 mt-0.5 flex-shrink-0" />
                          <span>Please set your delivery location in the header to see depot information.</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Orders will be assigned to the default depot if no location is selected.
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Delivery Schedule Display */}
                {deliveryLocation && deliveryLocation.deliverySchedule && (
                  <DeliveryScheduleDisplay
                    deliverySchedule={deliveryLocation.deliverySchedule}
                    selectedDate={selectedDeliveryDate}
                    onDateSelect={setSelectedDeliveryDate}
                  />
                )}

                <AddressSelector
                  selectedAddressId={selectedAddress?.id}
                  onAddressSelect={setSelectedAddress}
                />

                {selectedAddress && (
                  <Card className="border-green-200 bg-green-50/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-green-800">
                        Selected Delivery Address
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <div className="space-y-1">
                        <p className="font-medium">{selectedAddress.recipientName}</p>
                        <p className="text-muted-foreground">
                          {selectedAddress.plotBuilding}
                          {selectedAddress.plotBuilding && selectedAddress.streetArea ? ", " : ""}
                          {selectedAddress.streetArea}
                        </p>
                        {selectedAddress.landmark && (
                          <p className="text-muted-foreground text-xs">
                            Landmark: {selectedAddress.landmark}
                          </p>
                        )}
                        <p className="text-muted-foreground">
                          {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Mobile: {selectedAddress.mobile}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Order Summary</CardTitle>
                    <CardDescription>
                      {availableItems.length > 0 && unavailableItems.length > 0 ? (
                        <>
                          {availableItems.length} available • {unavailableItems.length} unavailable
                        </>
                      ) : (
                        <>
                          {totalQty} item{totalQty !== 1 ? "s" : ""}
                        </>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {unavailableItems.length > 0 && (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Total cart value</span>
                          <span className="text-muted-foreground line-through">{currency.format(subtotal)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Available items</span>
                          <span className="font-medium">{currency.format(availableSubtotal)}</span>
                        </div>
                      </>
                    )}
                    
                    {unavailableItems.length === 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium">{currency.format(availableSubtotal)}</span>
                      </div>
                    )}
                    
                    {/* <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Delivery</span>
                      <span className="font-medium">₹0</span>
                    </div> */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Wallet deduction</span>
                      <span className="font-medium text-green-600">-
                        {isFetchingWallet ? '...' : currency.format(Math.max(0, Math.min(walletBalance || 0, availableSubtotal)))}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Amount payable</span>
                      <span className="font-semibold">
                        {(() => {
                          const d = Math.max(0, Math.min(walletBalance || 0, availableSubtotal));
                          return currency.format(Math.max(0, availableSubtotal - d));
                        })()}
                      </span>
                    </div>
                    
                    {unavailableItems.length > 0 && (
                      <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded mt-2">
                        {unavailableItems.length} item{unavailableItems.length > 1 ? 's' : ''} will be removed from your order
                      </div>
                    )}
                    
                    {walletError && (
                      <p className="text-xs text-destructive">{walletError}</p>
                    )}
                    {!walletError && (
                      <p className="text-xs text-muted-foreground">
                        {(() => {
                          const d = Math.max(0, Math.min(walletBalance || 0, availableSubtotal));
                          const remaining = Math.max(0, availableSubtotal - d);
                          if (d > 0 && remaining > 0) {
                            return `₹${d.toFixed(0)} will be deducted from your wallet. Remaining ₹${remaining.toFixed(0)} to be collected via Cash/UPI before delivery.`;
                          } else if (d >= availableSubtotal && availableSubtotal > 0) {
                            return `Full amount of ₹${availableSubtotal.toFixed(0)} will be deducted from your wallet.`;
                          } else {
                            return `No wallet balance applied.`;
                          }
                        })()}
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="flex-col gap-2">
                    <Button
                      className="w-full"
                      onClick={handlePlaceOrder}
                      disabled={availableItems.length === 0 || !isFormValid || loading}
                    >
                      {loading ? "Placing order..." : (
                        unavailableItems.length > 0 
                          ? `Proceed with ${availableItems.length} item${availableItems.length > 1 ? 's' : ''}`
                          : "Proceed to payment"
                      )}
                    </Button>
                    {availableItems.length === 0 && state.items.length > 0 && (
                      <p className="text-xs text-red-600 text-center">
                        No items are available for delivery in this location
                      </p>
                    )}
                    {!selectedAddress && availableItems.length > 0 && (
                      <p className="text-xs text-red-600 text-center">
                        Please select a delivery address to continue
                      </p>
                    )}
                    {selectedAddress && !selectedDeliveryDate && availableItems.length > 0 && (
                      <p className="text-xs text-red-600 text-center">
                        Please select a delivery date to continue
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground text-center">
                      By placing your order, you agree to our terms and policies.
                    </p>
                  </CardFooter>
                </Card>
              </div>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default CheckoutPage;
