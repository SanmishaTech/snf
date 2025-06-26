import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { get, post } from "@/services/apiService";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Star, Leaf, Truck, Calendar } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SubscriptionModal } from "./components/SubscriptionModal";
import { BuyOnceModal } from "./components/BuyOnceModal";
import { motion } from "framer-motion";
import { format } from "date-fns";

// Enhanced Star rating component
const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
  return (
    <div className="flex items-center">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-5 h-5 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
        />
      ))}
      <span className="ml-2 text-sm text-muted-foreground">
        {rating}/5 <span className="ml-1">({70} Ratings)</span>
      </span>
    </div>
  );
};

interface Depot {
  id: number;
  name: string;
  isOnline: boolean;
  address: string;
  addressId: string;
  city: string;
  state: string;
  pincode: string;
}

interface ProductData {
  id: number;
  name: string;
  price: number;
  rate: number;
  unit: string | null;
  description: string | null;
  attachmentUrl: string | null;
}

const ProductDetailPage: React.FC = () => {
  // depot state
  const [selectedDepotId, setSelectedDepotId] = useState<number | null>(null);

  const { id: productId } = useParams<{ id: string }>();
  // const showSubscribeButton logic related to location.state?.fromLanding was removed.
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isBuyOnceModalOpen, setIsBuyOnceModalOpen] = useState(false);
  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    try {
      const userString = localStorage.getItem('user');
      if (userString) {
        const user = JSON.parse(userString);
        setIsLoggedIn(!!user); // Set to true if user object exists
        if (user && user.role === 'ADMIN') {
          setIsAdmin(true);
        }
      } else {
        setIsLoggedIn(false); // Explicitly set to false if no user string
      }
    } catch (error) {
      console.error('Failed to parse user data from localStorage', error);
      setIsLoggedIn(false); // Set to false on error as well
    }
  }, []);

  const fetchDepots = async (): Promise<Depot[]> => {
    const response = await get('/depots?limit=1000');
    // backend returns { data: [...] }
    return (response?.data ?? response) as Depot[];
  };

  const { data: depots = [], isLoading: depotsLoading } = useQuery<Depot[]>({
    queryKey: ['depots'],
    queryFn: fetchDepots,
  });

  useEffect(() => {
    if (!selectedDepotId && depots && depots.length > 0) {
      setSelectedDepotId(depots[0].id);
    }
  }, [depots, selectedDepotId]);

  const fetchProductById = async (id: string): Promise<ProductData> => {
    const response = await get(`/products/${id}`);
    return response;
  };

  const { data: product, isLoading, isError, error } = useQuery<ProductData, Error>({
    queryKey: ['product', productId],
    queryFn: () => fetchProductById(productId!),
    enabled: !!productId,
  });

  const selectedDepot = depots.find(d => d.id === selectedDepotId);

  const handleSubscribe = () => {
    setIsSubscriptionModalOpen(true);
  };

  const handleOpenBuyOnceModal = () => {
    setIsBuyOnceModalOpen(true);
  };

  interface SubscriptionDetailsFromModal {
    productId: string | undefined;
    quantity: number;
    quantityVarying2?: number;
    deliveryOption: string;
    startDate: Date | undefined;
    selectedAddress: string;
    selectedPeriod: number;
    selectedDays: string[];
  }

  const handleSubscriptionConfirm = async (details: SubscriptionDetailsFromModal) => {
    console.log("Subscription Confirmed, preparing to send to backend:", details);
    try {
      const numericDeliveryAddressId = parseInt(details.selectedAddress, 10);
      
      if (isNaN(numericDeliveryAddressId)) {
        console.error("Invalid deliveryAddressId after parsing:", details.selectedAddress);
        return;
      }

      const payload = {
        productId: details.productId ? Number(details.productId) : undefined,
        deliveryAddressId: numericDeliveryAddressId,
        period: details.selectedPeriod,
        deliverySchedule: details.deliveryOption.toUpperCase(),
        weekdays: (details.deliveryOption === "select-days" && details.selectedDays && details.selectedDays.length > 0) 
                  ? details.selectedDays 
                  : undefined,
        qty: details.quantity,
        altQty: details.deliveryOption === "varying" ? details.quantityVarying2 : undefined,
        startDate: details.startDate,
      };

      console.log("Payload to be sent:", payload);
      const result = await post('/subscriptions', payload);
      console.log("Subscription created successfully:", result);
    } catch (error) {
      console.error("Failed to create subscription:", error);
    }
  };

  interface BuyOnceDetailsFromModal {
    productId: string | undefined;
    quantity: number;
    selectedDate: Date | undefined;
    selectedAddress: string; // Add the selectedAddress property for delivery
  }

  const handleBuyOnceConfirm = async (details: BuyOnceDetailsFromModal) => {
    console.log("Buy Once Confirmed, processing as single-day subscription:", {
      ...details,
      selectedDate: details.selectedDate ? format(details.selectedDate, "yyyy-MM-dd") : undefined
    });
    
    try {
      // Process "Buy Once" as a single-day subscription
      // Get the selected address from the modal
      const selectedAddressId = details.selectedAddress;
      const numericDeliveryAddressId = parseInt(selectedAddressId, 10);
      
      if (isNaN(numericDeliveryAddressId)) {
        console.error("Invalid deliveryAddressId after parsing:", selectedAddressId);
        toast.error("Invalid delivery address selected");
        return;
      }

      // Create a subscription payload where start date = expiry date (one day)
      const payload = {
        productId: details.productId ? Number(details.productId) : undefined,
        deliveryAddressId: numericDeliveryAddressId,
        // For "Buy Once", we set period to 1 day
        period: 1,
        // Using DAILY as the schedule type for one-time deliveries
        deliverySchedule: "DAILY",
        // No weekdays needed for a one-day delivery
        weekdays: undefined,
        qty: details.quantity,
        // Use the selected date as both start and expiry date
        // Format date as YYYY-MM-DD to avoid timezone issues
        startDate: details.selectedDate ? format(details.selectedDate, 'yyyy-MM-dd') : undefined,
        // No alt quantity needed for one-time delivery
        altQty: undefined,
        // Flag to indicate this is a one-time purchase
        isOneTimePurchase: true
      };

      console.log("Buy Once payload (sent as subscription):", payload);
      const result = await post('/subscriptions', payload);
      console.log("One-time purchase created as subscription successfully:", result);
      toast.success("Your order has been placed successfully!");
    } catch (error) {
      console.error("Failed to create one-time purchase:", error);
      toast.error("Failed to place your order. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Skeleton className="h-[400px] w-full rounded-2xl" />
            <div className="space-y-6">
              <Skeleton className="h-9 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <div className="space-y-2 mt-6">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-5 w-3/4" />
              </div>
              <div className="mt-8 space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
              <Skeleton className="h-14 w-full mt-8 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive" className="max-w-4xl mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Product</AlertTitle>
          <AlertDescription>
            There was a problem retrieving the product details. Error: {error?.message || 'Product data not found.'}
          </AlertDescription>
          <div className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="text-primary"
            >
              Try Again
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  // Product benefits data
  const benefits = [
    {
      icon: <Leaf className="w-6 h-6 text-green-600" />,
      title: "100% Natural",
      description: "No additives or preservatives"
    },
    {
      icon: <Truck className="w-6 h-6 text-blue-600" />,
      title: "Daily Delivery",
      description: "Fresh to your doorstep every morning"
    },
    {
      icon: <Calendar className="w-6 h-6 text-purple-600" />,
      title: "Flexible Schedule",
      description: "Pause or modify anytime"
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Depot Selector */}
     
      

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto"
      >
        {/* Breadcrumb */}
        <div className="text-sm text-muted-foreground mb-6">
          <span className="hover:text-primary cursor-pointer">Products</span> 
          <span className="mx-2">/</span>
          <span className="text-primary font-medium">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Product Image */}
          <div className="bg-muted/10 rounded-2xl flex items-center justify-center p-8 border border-muted/20">
            {product.attachmentUrl ? (
              <motion.img 
                src={`${import.meta.env.VITE_BACKEND_URL}${product.attachmentUrl}`}
                alt={product.name}
                className="object-cover max-h-[900px] min-h-[600px] rounded-xl"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                <div className="bg-muted/30 rounded-full p-6 mb-4">
                  <Leaf className="w-16 h-16" />
                </div>
                <p className="text-lg">Fresh Milk Image</p>
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="py-4">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">{product.name}</h1>
            
            {/* <StarRating rating={5} /> */}
            
            <div className="mt-6">
              <div className="flex items-baseline gap-3">
                <p className="text-4xl font-bold text-primary">₹{product?.rate}</p>
                <p className="text-muted-foreground line-through">₹{product.rate + 5}</p>
                <span className="bg-green-100 text-green-800 text-sm px-2 py-1 rounded-full ml-2">
                  5% OFF
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">per {product.unit || 'unit'}</p>
            </div>
            
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-3">Description</h2>
              <div className="text-muted-foreground leading-relaxed prose">
                {product.description ? (
                  <>
                    <div
                      style={{ maxHeight: '6em', overflow: 'hidden', position: 'relative', cursor: product.description.length > 200 ? 'pointer' : 'default' }}
                      onClick={() => product.description && product.description.length > 200 && setIsDescriptionModalOpen(true)}
                      dangerouslySetInnerHTML={{ __html: product.description }}
                    />
                    {product.description.length > 200 && (
                      <span 
                        onClick={() => setIsDescriptionModalOpen(true)} 
                        className="text-primary font-medium ml-1 cursor-pointer hover:underline"
                      >
                        Read more
                      </span>
                    )}
                  </>
                ) : (
                  <p>Our premium milk comes from grass-fed cows raised in natural pastures. Rich in calcium and essential nutrients, it's pasteurized for safety while maintaining its natural goodness.</p>
                )}
              </div>
            </div>
            
            
            <div className="border-t border-muted/20 my-4"></div>
            
            <div className="mb-4">
        <label className="mr-2 mb-2 font-medium">Select Depot:</label>
        {depotsLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select
            value={selectedDepotId?.toString() ?? ''}
            onValueChange={(value) => setSelectedDepotId(parseInt(value, 10))}
          >
            <SelectTrigger className="w-full mt-2">
              <SelectValue placeholder="Select a depot" />
            </SelectTrigger>
            <SelectContent>
              {depots.map((d) => (
                <SelectItem key={d.id} value={d.id.toString()}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      
      <div className="border-t border-muted/20 my-4"></div>

            {/* Benefits */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Benefits</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {benefits.map((benefit, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-card p-4 rounded-xl border border-muted/20 flex items-start"
                  >
                    <div className="mr-3 mt-1">{benefit.icon}</div>
                    <div>
                      <h3 className="font-medium">{benefit.title}</h3>
                      <p className="text-sm text-muted-foreground">{benefit.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            
            <div className="mt-8 space-y-4">
              {!isLoggedIn ? (
                <Button
                  asChild
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-6 rounded-lg text-lg font-semibold transition-transform duration-200 hover:scale-105"
                >
                  <Link to="/login">Subscribe</Link>
                </Button>
              ) : (
                <>
                  {/* Buttons for logged-in users */}
                  {isLoggedIn && !isAdmin && (
                    <div className="flex flex-col sm:flex-row gap-4">
                      <motion.div 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-1"
                      >
                        <Button 
                          className="w-full py-6 text-md sm:text-lg bg-orange-500 hover:bg-orange-600 text-white shadow-lg transition-all duration-300 rounded-xl"
                          onClick={handleOpenBuyOnceModal}
                        >
                          Buy Once
                        </Button>
                      </motion.div>
                      <motion.div 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-1"
                      >
                        <Button 
                          className="w-full py-6 text-md sm:text-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white shadow-lg transition-all duration-300 rounded-xl"
                          onClick={handleSubscribe}
                        >
                          Subscribe Now
                        </Button>
                      </motion.div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

     

        <SubscriptionModal
           depotId={selectedDepotId}
           isOpen={isSubscriptionModalOpen}
          onOpenChange={setIsSubscriptionModalOpen}
          product={product}
          productId={productId}
          selectedDepot={selectedDepot}
          onSubscribeConfirm={handleSubscriptionConfirm}
         />

        <BuyOnceModal
          isOpen={isBuyOnceModalOpen}
          onOpenChange={setIsBuyOnceModalOpen}
          product={product}
          productId={productId}
          onBuyOnceConfirm={handleBuyOnceConfirm}
        />
        
        {/* Description Modal removed */}
        <Dialog open={isDescriptionModalOpen} onOpenChange={setIsDescriptionModalOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">{product.name} - Full Description</DialogTitle>
              <DialogClose className="absolute right-4 top-4">
                <X className="h-4 w-4" />
              </DialogClose>
            </DialogHeader>
            <div className="mt-4 max-h-[70vh] overflow-y-auto">
              <div className="text-muted-foreground leading-relaxed prose" dangerouslySetInnerHTML={{ __html: product.description || "Our premium milk comes from grass-fed cows raised in natural pastures. Rich in calcium and essential nutrients, it's pasteurized for safety while maintaining its natural goodness. We source our milk from local farms that prioritize animal welfare and sustainable farming practices. Each bottle undergoes rigorous quality checks to ensure you receive the freshest, most nutritious product possible. The cows are fed a natural diet without hormones or antibiotics, resulting in milk that's both delicious and healthier. Perfect for drinking, cooking, or adding to your morning coffee, our milk is a versatile addition to any kitchen. We're proud to support local farmers and bring you a product that's not only good for you but also good for the environment." }} />
            </div>
          </DialogContent>
        </Dialog>

        {/* FAQ Section */}
        {/* <div className="mt-16 pt-8 border-t border-muted/20">
          <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
          
          <div className="space-y-4">
            <div className="bg-card p-5 rounded-xl border border-muted/20">
              <h3 className="font-semibold">How often will I receive deliveries?</h3>
              <p className="text-muted-foreground mt-2">
                You can choose daily delivery or customize your delivery schedule during the subscription process. 
                We offer flexible options to match your consumption needs.
              </p>
            </div>
            
            <div className="bg-card p-5 rounded-xl border border-muted/20">
              <h3 className="font-semibold">Can I pause or modify my subscription?</h3>
              <p className="text-muted-foreground mt-2">
                Yes! You can easily pause, modify, or cancel your subscription anytime through your account dashboard. 
                Changes made before 6 PM will apply to the next day's delivery.
              </p>
            </div>
            
            <div className="bg-card p-5 rounded-xl border border-muted/20">
              <h3 className="font-semibold">How is the milk packaged?</h3>
              <p className="text-muted-foreground mt-2">
                We use reusable glass bottles to maintain freshness and reduce environmental impact. 
                Simply leave empty bottles outside for collection during your next delivery.
              </p>
            </div>
          </div>
        </div> */}
      </motion.div>
    </div>
  );
};


export default ProductDetailPage;