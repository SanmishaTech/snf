import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "./Header.tsx";
import { Footer } from "./Footer.tsx";
import { MobileBottomNav } from "./MobileBottomNav.tsx";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Minus, Plus, MapPin, AlertTriangle, Ticket, Loader2 } from "lucide-react";
import { snfOrderService } from "@/services/snfOrderService";
import { get } from "@/services/apiService";
import { validateCoupon, Coupon } from "@/services/couponMasterService";
import { DeliveryLocationService, DeliveryLocation } from "@/services/deliveryLocationService";
import { toast } from "sonner";
import AddressSelector from "./AddressSelector";
import { type DeliveryAddress } from "../hooks/useAddresses";
import { useProduct } from "../hooks/useProducts";
import { usePricing } from "../context/PricingContext";
import { useCart } from "../context/CartContext";
import ProductImage from "./ProductImage";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

interface BuyNowItem {
  productId: number;
  variantId: number;
  name: string;
  variantName: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

const BuyNowCheckoutPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Get product and variant info from URL params
  const productId = searchParams.get('productId');
  const variantId = searchParams.get('variantId');
  const initialQuantity = parseInt(searchParams.get('quantity') || '1');

  // Get depot from pricing context
  const { state: pricingState } = usePricing();
  const depotId = pricingState.currentDepot?.id;

  // Get cart for header
  const { totalQuantity } = useCart();

  // Fetch product data
  const { product: productData, error: fetchError, isLoading } = useProduct(
    productId ? parseInt(productId) : undefined,
    depotId || 1
  );

  const [selectedAddress, setSelectedAddress] = useState<DeliveryAddress | null>(null);
  const [loading, setLoading] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState<DeliveryLocation | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isFetchingWallet, setIsFetchingWallet] = useState<boolean>(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(initialQuantity);
  const [couponCode, setCouponCode] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponDiscountAmount, setCouponDiscountAmount] = useState(0);

  // Get the selected variant
  const selectedVariant = React.useMemo(() => {
    if (!productData || !variantId) return null;
    return productData.variants.find(v => v.id === parseInt(variantId));
  }, [productData, variantId]);

  // Create buy now item
  const buyNowItem: BuyNowItem | null = React.useMemo(() => {
    if (!productData || !selectedVariant) return null;

    const price = selectedVariant.buyOncePrice || selectedVariant.mrp || 0;
    const rawAttachment = productData.product.attachmentUrl;
    const imageUrl = rawAttachment
      ? `${import.meta.env.VITE_BACKEND_URL}${rawAttachment}`
      : undefined;

    return {
      productId: productData.product.id,
      variantId: selectedVariant.id,
      name: productData.product.name,
      variantName: selectedVariant.name || "",
      price: price,
      quantity: quantity,
      imageUrl,
    };
  }, [productData, selectedVariant, quantity]);

  const subtotal = buyNowItem ? buyNowItem.price * buyNowItem.quantity : 0;

  // Load delivery location on component mount
  useEffect(() => {
    const location = DeliveryLocationService.getCurrentLocation();
    setDeliveryLocation(location);
  }, []);

  // Fetch wallet balance
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

  // Redirect if invalid params
  useEffect(() => {
    if (!productId || !variantId) {
      toast.error("Invalid product or variant");
      navigate('/snf');
    }
  }, [productId, variantId, navigate]);

  const isFormValid = selectedAddress !== null && buyNowItem !== null;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || isApplyingCoupon) return;
    setIsApplyingCoupon(true);
    try {
      const res = await validateCoupon(couponCode, subtotal);
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

  const handlePlaceOrder = async () => {
    if (!buyNowItem || !isFormValid || loading) return;

    try {
      setLoading(true);

      const depotIdRaw = DeliveryLocationService.getCurrentDepotId();
      const depotId = depotIdRaw ? parseInt(depotIdRaw.toString()) : null;
      console.log('[BuyNow Checkout] Using depot ID:', depotId);

      const itemsPayload = [{
        name: buyNowItem.name,
        variantName: buyNowItem.variantName,
        imageUrl: buyNowItem.imageUrl || null,
        price: buyNowItem.price,
        quantity: buyNowItem.quantity,
        productId: buyNowItem.productId,
        depotProductVariantId: buyNowItem.variantId,
      }];

      const deliveryFee = 0;
      const walletDeduction = Math.max(0, Math.min(walletBalance || 0, subtotal + deliveryFee));

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
        subtotal,
        deliveryFee,
        totalAmount: subtotal + deliveryFee,
        walletamt: walletDeduction,
        paymentMode: null,
        paymentRefNo: null,
        paymentStatus: "PENDING",
        paymentDate: null,
        depotId: depotId || null,
        deliveryAddressId: selectedAddress.id,
        couponCode: appliedCoupon?.code || null,
        couponDiscount: couponDiscountAmount,
      };

      const res = await snfOrderService.createOrder(payload);
      toast.success(`Order created: ${res.data.orderNo}`);
      navigate("/snf");
    } catch (err: any) {
      const message = err?.message || "Failed to create order";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (newQuantity: number) => {
    const maxQty = selectedVariant?.closingQty || 99;
    setQuantity(Math.max(1, Math.min(maxQty, newQuantity)));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header cartCount={totalQuantity} onSearch={() => { }} />
        <main className="flex-1 container mx-auto px-4 md:px-6 lg:px-8 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-48" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="h-32 bg-muted rounded" />
              </div>
              <div className="lg:col-span-1">
                <div className="h-64 bg-muted rounded" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
        <MobileBottomNav />
      </div>
    );
  }

  if (fetchError || !buyNowItem) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header cartCount={totalQuantity} onSearch={() => { }} />
        <main className="flex-1 container mx-auto px-4 md:px-6 lg:px-8 py-6">
          <Card>
            <CardHeader>
              <CardTitle>Unable to load product</CardTitle>
              <CardDescription>{fetchError?.message || "Product not found"}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild>
                <Link to="/snf">Back to products</Link>
              </Button>
            </CardFooter>
          </Card>
        </main>
        <Footer />
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header cartCount={totalQuantity} onSearch={() => { }} />

      <main className="flex-1 pt-14 md:pt-16">
        <section className="container mx-auto px-4 md:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-2 mb-4">
            <h1 className="text-2xl md:text-3xl font-semibold">Buy Now</h1>
            <span className="text-sm text-muted-foreground">• Skip cart, direct checkout</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardContent className="py-4">
                  <div className="flex gap-4 items-start">
                      <ProductImage
                        src={buyNowItem.imageUrl}
                        alt={buyNowItem.name}
                        name={buyNowItem.name}
                        showNameFallback={false}
                        containerClassName="size-20 shrink-0 rounded-md"
                      />
                    <div className="flex-1 min-w-0">
                      <div className="min-w-0">
                        <p className="text-sm md:text-base font-medium">{buyNowItem.name}</p>
                        <p className="text-xs text-muted-foreground">{buyNowItem.variantName}</p>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="inline-flex items-center gap-2 border rounded-md px-2 py-1">
                          <button
                            className="p-1 rounded hover:bg-accent"
                            onClick={() => handleQuantityChange(quantity - 1)}
                            aria-label="Decrease quantity"
                          >
                            <Minus className="size-4" />
                          </button>
                          <span className="text-sm w-6 text-center">{quantity}</span>
                          <button
                            className="p-1 rounded hover:bg-accent"
                            onClick={() => handleQuantityChange(quantity + 1)}
                            aria-label="Increase quantity"
                          >
                            <Plus className="size-4" />
                          </button>
                        </div>
                        <div className="text-sm md:text-base font-semibold">
                          {currency.format(buyNowItem.price * quantity)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <Link to={`/snf/product/${productId}?variant=${variantId}`}>
                    Back to product
                  </Link>
                </Button>
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

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Ticket className="size-4" />
                    Apply Coupon
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!appliedCoupon ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="CODE123"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          className="h-9"
                          onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                        />
                        <Button
                          size="sm"
                          onClick={handleApplyCoupon}
                          disabled={isApplyingCoupon || !couponCode.trim()}
                        >
                          {isApplyingCoupon ? <Loader2 className="size-4 animate-spin" /> : "Apply"}
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Enter a code to see your discount</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-2 bg-green-50 border border-green-100 rounded-md">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-green-700">{appliedCoupon.code}</span>
                        <span className="text-[10px] text-green-600">
                          {appliedCoupon.discountType === "PERCENTAGE"
                            ? `${appliedCoupon.discountValue}% OFF`
                            : `₹${appliedCoupon.discountValue} OFF`} applied
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={handleRemoveCoupon}
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

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
                  <CardDescription>1 item • {quantity} {quantity === 1 ? 'unit' : 'units'}</CardDescription>
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
                  {couponDiscountAmount > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-600 font-medium">Coupon discount</span>
                      <span className="font-medium text-green-600">-{currency.format(couponDiscountAmount)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Wallet deduction</span>
                    <span className="font-medium text-green-600">-
                      {isFetchingWallet ? '...' : currency.format(Math.max(0, Math.min(walletBalance || 0, subtotal - couponDiscountAmount)))}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Amount payable</span>
                    <span className="font-semibold">
                      {(() => {
                        const amountAfterCoupon = subtotal - couponDiscountAmount;
                        const d = Math.max(0, Math.min(walletBalance || 0, amountAfterCoupon));
                        return currency.format(Math.max(0, amountAfterCoupon - d));
                      })()}
                    </span>
                  </div>
                  {walletError && (
                    <p className="text-xs text-destructive">{walletError}</p>
                  )}
                  {!walletError && (
                    <p className="text-xs text-muted-foreground">
                      {(() => {
                        const amountAfterCoupon = subtotal - couponDiscountAmount;
                        const d = Math.max(0, Math.min(walletBalance || 0, amountAfterCoupon));
                        const remaining = Math.max(0, amountAfterCoupon - d);

                        if (d > 0 && remaining > 0) {
                          return `₹${d.toFixed(2)} will be deducted from your wallet. Remaining ₹${remaining.toFixed(2)} to be collected via Cash/UPI.`;
                        } else if (d >= amountAfterCoupon && amountAfterCoupon > 0) {
                          return `Full amount of ₹${amountAfterCoupon.toFixed(2)} will be deducted from your wallet.`;
                        } else if (couponDiscountAmount > 0 && d === 0) {
                           return `₹${remaining.toFixed(2)} to be collected via Cash/UPI. Total savings: ₹${couponDiscountAmount.toFixed(2)}.`;
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
                    disabled={!isFormValid || loading}
                  >
                    {loading ? "Placing order..." : "Proceed to payment"}
                  </Button>
                  {!selectedAddress && (
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
        </section>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default BuyNowCheckoutPage;