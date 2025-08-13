import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { Header } from "./Header.tsx";
import { Footer } from "./Footer.tsx";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Minus, Plus, Trash2, MapPin, AlertTriangle } from "lucide-react";
import { snfOrderService } from "@/services/snfOrderService";
import { get } from "@/services/apiService";
import { DeliveryLocationService, DeliveryLocation } from "@/services/deliveryLocationService";
import { toast } from "sonner";
import AddressSelector from "./AddressSelector";
import { type DeliveryAddress } from "../hooks/useAddresses";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const CheckoutPage: React.FC = () => {
  const { state, subtotal, increment, decrement, removeItem, clear } = useCart();
  const totalQty = state.items.reduce((n, it) => n + it.quantity, 0);
  const navigate = useNavigate();

  const [selectedAddress, setSelectedAddress] = useState<DeliveryAddress | null>(null);
  const [loading, setLoading] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState<DeliveryLocation | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isFetchingWallet, setIsFetchingWallet] = useState<boolean>(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  // Load delivery location on component mount
  useEffect(() => {
    const location = DeliveryLocationService.getCurrentLocation();
    setDeliveryLocation(location);
  }, []);

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

  const isFormValid = selectedAddress !== null;

  const handlePlaceOrder = async () => {
    if (state.items.length === 0 || !isFormValid || loading) return;
    try {
      setLoading(true);
      
      // Get depot ID from selected delivery location
      const depotId = DeliveryLocationService.getCurrentDepotId();
      console.log('[Checkout] Using depot ID:', depotId);
      
      const itemsPayload = state.items.map((it) => ({
        name: it.name,
        variantName: it.variantName,
        imageUrl: it.imageUrl || null,
        price: it.price,
        quantity: it.quantity,
        productId: it.productId,
        depotProductVariantId: it.variantId,
      }));
      const deliveryFee = 0;
      const walletDeduction = Math.max(0, Math.min(walletBalance || 0, subtotal + deliveryFee));
      if (!selectedAddress) {
        toast.error("Please select a delivery address");
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
        subtotal,
        deliveryFee,
        totalAmount: subtotal + deliveryFee,
        walletamt: walletDeduction,
        paymentMode: null,
        paymentRefNo: null,
        paymentStatus: "PENDING",
        paymentDate: null,
        depotId: depotId || null, // Include depot ID from delivery location
        deliveryAddressId: selectedAddress.id, // Include the selected address ID
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
                {state.items.map((it) => (
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
                    <CardDescription>{totalQty} item{totalQty !== 1 ? "s" : ""}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">{currency.format(subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Delivery</span>
                      <span className="font-medium">₹0</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Wallet deduction</span>
                      <span className="font-medium text-green-600">-
                        {isFetchingWallet ? '...' : currency.format(Math.max(0, Math.min(walletBalance || 0, subtotal)))}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Amount payable</span>
                      <span className="font-semibold">
                        {(() => {
                          const d = Math.max(0, Math.min(walletBalance || 0, subtotal));
                          return currency.format(Math.max(0, subtotal - d));
                        })()}
                      </span>
                    </div>
                    {walletError && (
                      <p className="text-xs text-destructive">{walletError}</p>
                    )}
                    {!walletError && (
                      <p className="text-xs text-muted-foreground">
                        {(() => {
                          const d = Math.max(0, Math.min(walletBalance || 0, subtotal));
                          const remaining = Math.max(0, subtotal - d);
                          if (d > 0 && remaining > 0) {
                            return `₹${d.toFixed(0)} will be deducted from your wallet. Remaining ₹${remaining.toFixed(0)} to be collected via Cash/UPI before delivery.`;
                          } else if (d >= subtotal && subtotal > 0) {
                            return `Full amount of ₹${subtotal.toFixed(0)} will be deducted from your wallet.`;
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
                      disabled={state.items.length === 0 || !isFormValid || loading}
                    >
                      {loading ? "Placing order..." : "Proceed to payment"}
                    </Button>
                    {!selectedAddress && state.items.length > 0 && (
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
    </div>
  );
};

export default CheckoutPage;
