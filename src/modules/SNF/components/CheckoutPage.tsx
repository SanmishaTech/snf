import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format, addDays } from "date-fns";
import { useCart } from "../context/CartContext";
import { useDeliveryLocation } from "../hooks/useDeliveryLocation";
import { Header } from "./Header.tsx";
import { Footer } from "./Footer.tsx";
import { MobileBottomNav } from "./MobileBottomNav.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

import { Minus, Plus, Trash2, MapPin, AlertTriangle, Wallet, CreditCard } from "lucide-react";
import { snfOrderService } from "@/services/snfOrderService";
import { get } from "@/services/apiService";
import { validateCoupon, Coupon } from "@/services/couponMasterService";
import { initiatePhonePePayment } from "@/services/phonePeService";


import { DeliveryLocationService, DeliveryLocation } from "@/services/deliveryLocationService";
import { toast } from "sonner";
import AddressSelector from "./AddressSelector";
import { type DeliveryAddress } from "../hooks/useAddresses";
import ProductImage from "./ProductImage";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
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
  const [loading, setLoading] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState<DeliveryLocation | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isFetchingWallet, setIsFetchingWallet] = useState<boolean>(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponDiscountAmount, setCouponDiscountAmount] = useState(0);
  // Payment mode: 'WALLET' (wallet + cash) or 'ONLINE' (PhonePe)
  const [paymentMode, setPaymentMode] = useState<'WALLET' | 'ONLINE'>('WALLET');

  const lastValidatedDepotRef = useRef<number | null>(null);
  const hasItemsRef = useRef(false);

  // Track if we have items to avoid unnecessary validations
  hasItemsRef.current = state.items.length > 0;

  // Load delivery location on component mount
  useEffect(() => {
    const location = DeliveryLocationService.getCurrentLocation();
    setDeliveryLocation(location);
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

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsApplyingCoupon(true);
    try {
      const res = await validateCoupon(couponCode, availableSubtotal);
      if (res.success && res.coupon) {
        setAppliedCoupon(res.coupon);
        setCouponDiscountAmount(res.discountAmount || 0);
        toast.success(`Coupon "${couponCode}" applied!`);
      } else {
        toast.error(res.message || "Invalid coupon code");
        setAppliedCoupon(null);
        setCouponDiscountAmount(0);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to apply coupon");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponDiscountAmount(0);
    toast.info("Coupon removed");
  };


  const isFormValid = selectedAddress !== null;

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
      const orderSubtotal = availableSubtotal;
      const subAfterCoupon = Math.max(0, orderSubtotal - couponDiscountAmount);

      // Wallet deduction applies regardless of payment mode
      const walletDeduction = Math.max(0, Math.min(walletBalance || 0, subAfterCoupon));
      // What is left after wallet deduction
      const payableOnline = Math.max(0, subAfterCoupon - walletDeduction);

      if (!selectedAddress) {
        toast.error("Please select a delivery address");
        return;
      }

      const payload = {
        customer: {
          name: selectedAddress.recipientName,
          email: null,
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
        paymentMode: paymentMode === 'ONLINE' && payableOnline > 0 ? 'ONLINE' : null,
        paymentRefNo: null,
        paymentStatus: 'PENDING',
        paymentDate: null,
        depotId: depotId || null,
        deliveryAddressId: selectedAddress.id,
        couponCode: appliedCoupon?.code || null,
        couponDiscount: couponDiscountAmount,
        deliveryDate: addDays(new Date(), 2).toISOString(),
      };

      // 1. Check if online payment is needed
      if (paymentMode === 'ONLINE' && payableOnline > 0) {
        // PAYMENT FIRST FLOW: Save payload to localStorage
        localStorage.setItem('snf_pending_order_payload', JSON.stringify(payload));

        const frontendOrigin = window.location.origin;

        // Initiate payment WITHOUT creating an order in DB yet
        const { checkoutUrl, merchantOrderId } = await initiatePhonePePayment({
          amount: payableOnline,
          redirectUrl: `${frontendOrigin}/snf/payment/callback`,
        });

        // Save merchantOrderId in case we need to verify things securely later
        localStorage.setItem('snf_pending_merchant_order_id', merchantOrderId);

        toast.success(`Redirecting to PhonePe...`);
        // Small delay so toast is visible, then navigate to PhonePe
        // We DO NOT clear the cart here, so if they fail/cancel, their cart is intact!
        setTimeout(() => {
          window.location.href = checkoutUrl;
        }, 800);
      } else {
        // WALLET-ONLY or CASH ON DELIVERY: Order complete immediately
        const res = await snfOrderService.createOrder(payload);
        const createdOrder = res.data;
        const orderNo = createdOrder.orderNo;

        toast.success(`Order created: ${orderNo}`);
        clear();
        navigate("/snf");
      }
    } catch (err: any) {
      const message = err?.message || "Failed to create order";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header cartCount={totalQty} onSearch={() => { }} />

      <main className="flex-1 pt-14 md:pt-16">
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
                  <a href="/snf#all-types">Continue shopping</a>
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
                            <ProductImage
                              src={it.imageUrl}
                              alt={it.name}
                              name={it.name}
                              showNameFallback={false}
                              containerClassName="size-20 shrink-0 rounded-md"
                            />
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
                            <ProductImage
                              src={it.imageUrl}
                              alt={it.name}
                              name={it.name}
                              showNameFallback={false}
                              containerClassName="size-20 shrink-0 rounded-md opacity-60"
                              className="grayscale"
                            />
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
                    <Link to="/snf#all-types">Continue shopping</Link>
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

                <AddressSelector
                  selectedAddressId={selectedAddress?.id}
                  onAddressSelect={setSelectedAddress}
                />


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

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Delivery</span>
                      <span className="font-medium">₹0</span>
                    </div>

                    {appliedCoupon && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Coupon Discount ({appliedCoupon.code})</span>
                        <span className="font-medium text-green-600">-{currency.format(couponDiscountAmount)}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Wallet deduction</span>
                      <span className="font-medium text-green-600">-
                        {isFetchingWallet ? '...' : currency.format(Math.max(0, Math.min(walletBalance || 0, Math.max(0, availableSubtotal - couponDiscountAmount))))}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm py-1 px-2 bg-green-50 rounded-md border border-green-100">
                      <span className="text-green-700 font-medium">Estimated Delivery</span>
                      <span className="font-bold text-green-700">{format(addDays(new Date(), 2), "dd MMM yyyy")}</span>
                    </div>

                    <div className="space-y-2 py-2">
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Coupon Code" 
                          value={couponCode} 
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          disabled={!!appliedCoupon || isApplyingCoupon}
                          className="h-9 truncate"
                        />
                        {appliedCoupon ? (
                          <Button variant="outline" size="sm" onClick={handleRemoveCoupon} className="h-9">Remove</Button>
                        ) : (
                          <Button variant="outline" size="sm" onClick={handleApplyCoupon} disabled={isApplyingCoupon} className="h-9">
                            {isApplyingCoupon ? "..." : "Apply"}
                          </Button>
                        )}
                      </div>
                      {appliedCoupon && (
                        <p className="text-[10px] text-green-600 font-medium">
                          Coupon applied successfully!
                        </p>
                      )}
                    </div>
                    <Separator />

                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Amount payable</span>
                      <span className="font-semibold">
                        {(() => {
                          const subAfterCoupon = Math.max(0, availableSubtotal - couponDiscountAmount);
                          const d = Math.max(0, Math.min(walletBalance || 0, subAfterCoupon));
                          return currency.format(Math.max(0, subAfterCoupon - d));
                        })()}
                      </span>
                    </div>

                    {/* Payment Mode Selector */}
                    {(() => {
                      const subAfterCoupon = Math.max(0, availableSubtotal - couponDiscountAmount);
                      const walletDeduction = Math.max(0, Math.min(walletBalance || 0, subAfterCoupon));
                      const payableOnline = Math.max(0, subAfterCoupon - walletDeduction);
                      
                      const betaNumbers = (import.meta.env.VITE_PHONEPE_BETA_NUMBERS || "").split(",").map((s: string) => s.trim());
                      const isOnlineEnabled = selectedAddress && betaNumbers.includes(selectedAddress.mobile);
                      
                      return payableOnline > 0 ? (
                        <div className="pt-2 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">How would you like to pay the remaining {currency.format(payableOnline)}?</p>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setPaymentMode('WALLET')}
                              className={`flex items-center gap-2 rounded-lg border p-3 text-sm transition-all ${
                                paymentMode === 'WALLET'
                                  ? 'border-primary bg-primary/5 text-primary font-medium'
                                  : 'border-border text-muted-foreground hover:border-primary/40'
                              }`}
                            >
                              <Wallet className="size-4 shrink-0" />
                              <span>Cash / UPI<br /><span className="text-xs font-normal">On delivery</span></span>
                            </button>
                            {isOnlineEnabled ? (
                              <button
                                type="button"
                                onClick={() => setPaymentMode('ONLINE')}
                                className={`flex items-center gap-2 rounded-lg border p-3 text-sm transition-all ${
                                  paymentMode === 'ONLINE'
                                    ? 'border-primary bg-primary/5 text-primary font-medium'
                                    : 'border-border text-muted-foreground hover:border-primary/40'
                                }`}
                              >
                                <CreditCard className="size-4 shrink-0" />
                                <span>Pay Online<br /><span className="text-xs font-normal">PhonePe / UPI / Card</span></span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled
                                className="flex items-center gap-2 rounded-lg border p-3 text-sm transition-all opacity-50 cursor-not-allowed border-border text-muted-foreground"
                                title="Online payment is currently in beta"
                              >
                                <CreditCard className="size-4 shrink-0" />
                                <span>Pay Online<br /><span className="text-xs font-normal">Disabled for now</span></span>
                              </button>
                            )}
                          </div>
                        </div>
                      ) : null;
                    })()}


                    {unavailableItems.length > 0 && (
                      <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded mt-2">
                        {unavailableItems.length} item{unavailableItems.length > 1 ? 's' : ''} will be removed from your order
                      </div>
                    )}

                    {walletError && (
                      <p className="text-xs text-destructive">
                        {walletError.toLowerCase().includes("member not found") || walletError.includes("404")
                          ? "Member login required. Please sign in to your member account to continue with your order."
                          : walletError}
                      </p>
                    )}
                    {!walletError && (
                      <p className="text-xs text-muted-foreground">
                        {(() => {
                          const d = Math.max(0, Math.min(walletBalance || 0, availableSubtotal));
                          const remaining = Math.max(0, availableSubtotal - d);
                          if (d > 0 && remaining > 0) {
                            return `₹${d.toFixed(2)} will be utilized from your wallet. Remaining ₹${remaining.toFixed(2)} ${
                              paymentMode === 'ONLINE' ? 'to be paid via PhonePe.' : 'to be collected via Cash/UPI before delivery.'
                            }`;
                          } else if (d >= availableSubtotal && availableSubtotal > 0) {
                            return `Full amount of ₹${availableSubtotal.toFixed(2)} will be utilized from your wallet.`;
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
                      {loading ? (paymentMode === 'ONLINE' ? 'Redirecting to PhonePe...' : 'Placing order...') : (
                        unavailableItems.length > 0
                          ? `Proceed with ${availableItems.length} item${availableItems.length > 1 ? 's' : ''}`
                          : paymentMode === 'ONLINE' ? 'Pay with PhonePe →' : 'Place Order'
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
      <MobileBottomNav />
    </div>
  );
};

export default CheckoutPage;
