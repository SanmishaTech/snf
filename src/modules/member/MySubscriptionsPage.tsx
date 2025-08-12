import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { get } from "../../services/apiService"; // Corrected to import 'get' named export
import { cancelSubscription, cancelOrderSubscriptions } from "../../services/subscriptionService";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"; // Added CardFooter
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, PackageSearch, Download, X, AlertTriangle } from "lucide-react"; // Added PackageSearch for empty state and Download for invoice
import { Button } from "@/components/ui/button"; // Added Button
import { Link } from "react-router-dom"; // Added Link
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  price?: number;
  unit?: string; // Added unit property
  depotProductVariantId?: string;
  depotVariant?: {
    id: string;
    name: string;
    unit: string;
  };
}

interface AgencyUser {
  name: string;
  email?: string;
}

interface Agency {
  id: string;
  user: AgencyUser;
}

interface Address {
  id: string;
  recipientName?: string;
  plotBuilding?: string;
  streetArea?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  isDefault?: boolean;
}

export interface MemberSubscription {
  id: string;
  product: Product;
  qty: number;
  altQty?: number | null;
  deliverySchedule: "DAILY" | "SELECT_DAYS" | "VARYING" | "ALTERNATE_DAYS";
  selectedDays?: string[] | null;
  startDate: string; // ISO string date
  expiryDate: string; // ISO string date
  period: "DAYS_7" | "DAYS_15" | "DAYS_30" | "DAYS_90";
  status: string; // e.g., 'ACTIVE', 'PENDING_PAYMENT', 'CANCELLED', 'COMPLETED', 'PAUSED'
  paymentStatus?: "PENDING" | "PAID" | "FAILED" | "CANCELLED";
  agency?: Agency | null;
  amount?: number;
  deliveryAddress?: Address | null;
  productOrder?: {
    id: string;
    orderNo: string;
    invoiceNo?: string | null;
    invoicePath?: string | null;
  };
}

const formatPeriod = (
  inputPeriod: MemberSubscription["period"] | string | number
) => {
  // The official type for period in MemberSubscription
  const typedPeriodMap: Record<string, string> = {
    // Allow any string as key for broader matching initially
    DAYS_7: "7 Days",
    DAYS_15: "15 Days",
    DAYS_30: "1 Month",
    DAYS_90: "3 Months",
  };

  // Check if inputPeriod matches the strictly typed values if it's a string
  if (typeof inputPeriod === "string" && typedPeriodMap[inputPeriod]) {
    return typedPeriodMap[inputPeriod];
  }

  // Handle cases where inputPeriod might be a number (e.g., 7) or a numeric string (e.g., "7")
  const periodStr = String(inputPeriod); // Convert to string for consistent handling

  const numericEquivalentMap: Record<string, string> = {
    "7": "7 Days",
    "15": "15 Days",
    "30": "1 Month",
    "90": "3 Months",
  };

  if (numericEquivalentMap[periodStr]) {
    return numericEquivalentMap[periodStr];
  }

  // Fallback for other 'DAYS_X' patterns or numeric strings not in maps
  if (periodStr.startsWith("DAYS_")) {
    return periodStr.replace("DAYS_", "") + " Days";
  }
  // Check if it's a number string (e.g. "1", "2") that wasn't in numericEquivalentMap
  if (!isNaN(Number(periodStr))) {
    return `${periodStr} Days`;
  }

  return periodStr; // Return the stringified input as a last resort if no other format matches
};

const formatDeliverySchedule = (
  schedule: MemberSubscription["deliverySchedule"],
  selectedDays?: string[] | null,
  qty?: number,
  altQty?: number | null
) => {
  let scheduleText = "";
  switch (schedule) {
    case "DAILY":
      scheduleText = "Daily";
      break;
    case "ALTERNATE_DAYS":
      scheduleText = "Alternate Days";
      break;
    case "SELECT_DAYS":
      scheduleText = `Selected Days (${selectedDays
        ?.map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(", ") || "N/A"
        })`;
      break;
    case "VARYING":
      scheduleText = "Varying Quantities";
      break;
    default:
      scheduleText = schedule;
  }
  if (schedule === "VARYING" && qty && altQty) {
    return `${scheduleText} (${qty} / ${altQty})`;
  }
  if (qty) {
    return `${scheduleText} - ${qty} unit(s)`;
  }
  return scheduleText;
};

const MySubscriptionsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [subscriptionToCancel, setSubscriptionToCancel] = useState<MemberSubscription | null>(null);

  // Get current user info from localStorage
  const getCurrentUser = () => {
    try {
      const userStr = localStorage.getItem("user");
      const token = localStorage.getItem("authToken");
      return userStr && token ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  };

  const currentUser = getCurrentUser();
  const userId = currentUser?.id;

  // Use user-specific query key to prevent cross-user data pollution
  const {
    data: subscriptions,
    isLoading,
    error,
  } = useQuery<MemberSubscription[], Error>({
    queryKey: ["mySubscriptions", userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error("User not authenticated");
      }
      return get<MemberSubscription[]>("/subscriptions");
    },
    enabled: !!userId, // Only run query if we have a user ID
    // Refetch on window focus or mount, but not too often
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 2 * 60 * 1000, // 2 minutes (reduced for better user switching)
    gcTime: 5 * 60 * 1000, // 5 minutes (reduced for better memory management)
  });

  // Mutation for cancelling subscriptions
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      return await cancelSubscription(subscriptionId);
    },
    onSuccess: () => {
      toast.success("Subscription cancelled successfully!");
      // Refetch subscriptions to update the UI
      queryClient.invalidateQueries({ queryKey: ["mySubscriptions", userId] });
      setCancelDialogOpen(false);
      setSubscriptionToCancel(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to cancel subscription");
      setCancelDialogOpen(false);
      setSubscriptionToCancel(null);
    },
  });

  // Mutation for cancelling all subscriptions in an order
  const cancelOrderSubscriptionsMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await cancelOrderSubscriptions(orderId);
    },
    onSuccess: () => {
      toast.success("All order subscriptions cancelled successfully!");
      // Refetch subscriptions to update the UI
      queryClient.invalidateQueries({ queryKey: ["mySubscriptions", userId] });
      setCancelDialogOpen(false);
      setSubscriptionToCancel(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to cancel order subscriptions");
      setCancelDialogOpen(false);
      setSubscriptionToCancel(null);
    },
  });

  const handleCancelClick = (subscription: MemberSubscription) => {
    setSubscriptionToCancel(subscription);
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = () => {
    if (!subscriptionToCancel) return;

    // Always cancel the entire order if it exists, otherwise cancel just the subscription
    if (subscriptionToCancel.productOrder?.id) {
      cancelOrderSubscriptionsMutation.mutate(subscriptionToCancel.productOrder.id);
    } else {
      cancelSubscriptionMutation.mutate(subscriptionToCancel.id);
    }
  };

  // Clear all queries when user changes (detected by userId change)
  useEffect(() => {
    if (!userId) {
      // User logged out or not authenticated - clear all caches
      queryClient.clear();
    }
  }, [userId, queryClient]);

  // Handle unauthenticated user
  if (!userId) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            Please log in to view your subscriptions.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg text-gray-600">
          Loading your subscriptions...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>Error Loading Subscriptions</AlertTitle>
          <AlertDescription>
            We encountered an issue while fetching your subscriptions. Please
            try again later or contact support if the problem persists.
            <p className="mt-2 text-xs">Error: {error.message}</p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          My Active Subscriptions
        </h1>
        {subscriptions && subscriptions.length > 0 && (
          <span className="px-3 py-1 text-sm font-semibold text-primary bg-primary-foreground rounded-full">
            {subscriptions.length} Active
          </span>
        )}
      </div>
      {subscriptions && subscriptions.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {subscriptions?.map((sub: MemberSubscription) => (
            <Card
              key={sub.id}
              className="shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out rounded-lg overflow-hidden flex flex-col"
            >
              <CardHeader className="bg-gray-50 dark:bg-gray-800 pb-4">
                <CardTitle className="text-lg font-semibold text-primary">
                  {sub.product.name}
                </CardTitle>
                {/* <CardDescription className='pt-1'>
                  Status: <span className={`font-medium ${sub.status === 'ACTIVE' ? 'text-green-600' : 'text-yellow-600'}`}>{sub?.status?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>
                </CardDescription> */}
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-700 dark:text-gray-300 p-4 flex-grow">
                {/* Debug info - remove this later */}

                <p>
                  <strong>Quantity:</strong> {sub.qty}{" "}
                  {sub.product.depotVariant?.unit || sub.product.unit || "unit"}
                  {sub.altQty ? (
                    <>
                      {" "}
                      &amp; {sub.altQty}{" "}
                      {sub.product.depotVariant?.unit ||
                        sub.product.unit ||
                        "unit"}
                    </>
                  ) : null}
                </p>
                <p>
                  <strong>Period:</strong> {formatPeriod(sub.period)}
                </p>
                <p>
                  <strong>Starts On:</strong>{" "}
                  {format(new Date(sub.startDate), "dd/MM/yyyy")}
                </p>
                <p>
                  <strong>Expires On:</strong>{" "}
                  {format(new Date(sub.expiryDate), "dd/MM/yyyy")}
                </p>

                <p>
                  <strong>Delivery:</strong>{" "}
                  {formatDeliverySchedule(
                    sub.deliverySchedule,
                    sub.selectedDays,
                    sub.qty,
                    sub.altQty
                  )}
                </p>
                {sub.paymentStatus && (
                  <p>
                    <strong>Payment:</strong>{" "}
                    <span
                      className={`capitalize font-medium ${sub.paymentStatus === "PAID"
                        ? "text-green-600"
                        : "text-orange-500"
                        }`}
                    >
                      {sub.paymentStatus.toLowerCase()}
                    </span>
                  </p>
                )}
                {sub.agency && (
                  <p>
                    <strong>Assigned Agent:</strong> {sub.agency.user.name}
                  </p>
                )}
                {sub.deliveryAddress && (
                  <p>
                    <strong>Delivering to:</strong>{" "}
                    {sub.deliveryAddress.recipientName || ""}
                    {sub.deliveryAddress.recipientName ? ", " : ""}
                    {sub.deliveryAddress.plotBuilding || ""}
                    {sub.deliveryAddress.plotBuilding &&
                      sub.deliveryAddress.streetArea
                      ? ", "
                      : ""}
                    {sub.deliveryAddress.streetArea || ""},{" "}
                    {sub.deliveryAddress.city}, {sub.deliveryAddress.state}{" "}
                    {sub.deliveryAddress.pincode}
                    {sub.deliveryAddress.landmark
                      ? ` (${sub.deliveryAddress.landmark})`
                      : ""}
                  </p>
                )}
                {sub.amount !== undefined && (
                  <p className="font-semibold text-base">
                    <strong>Total Amount:</strong> ₹{sub.amount.toFixed(2)}
                  </p>
                )}
              </CardContent>
              <CardFooter className="p-4 pt-0">
                {/* Hide all buttons if subscription is cancelled */}
                {sub.paymentStatus !== 'CANCELLED' && sub.status !== 'CANCELLED' && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2">
                    {sub.paymentStatus === "PAID" && (
                      <Link
                        to={`/manage-subscription/${sub.id}`}
                        className="w-full sm:flex-1"
                      >
                        <Button variant="outline" className="w-full">
                          Manage
                        </Button>
                      </Link>
                    )}
                    {sub.productOrder?.invoicePath && (
                      <Button
                        onClick={async () => {
                          try {
                            const baseUrl =
                              import.meta.env.VITE_BACKEND_URL ||
                              "https://www.indraai.in";
                            const invoiceUrl = `${baseUrl}/invoices/${sub.productOrder.invoicePath}`;

                            // Fetch the file as blob to force download
                            const response = await fetch(invoiceUrl);
                            if (!response.ok) throw new Error("Download failed");

                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);

                            // Create a temporary anchor element for download
                            const link = document.createElement("a");
                            link.href = url;
                            link.download = `invoice-${sub.productOrder?.invoiceNo ||
                              sub.productOrder?.orderNo
                              }.pdf`;
                            document.body.appendChild(link);
                            link.click();

                            // Cleanup
                            document.body.removeChild(link);
                            window.URL.revokeObjectURL(url);
                          } catch (error) {
                            console.error("Download failed:", error);
                            // Fallback to opening in new tab if download fails
                            const baseUrl =
                              import.meta.env.VITE_BACKEND_URL ||
                              "https://www.indraai.in";
                            const invoiceUrl = `${baseUrl}/invoices/${sub.productOrder.invoicePath}`;
                            window.open(invoiceUrl, "_blank");
                          }
                        }}
                        variant="outline"
                        className="w-full sm:flex-1 flex items-center justify-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        <span className="text-sm sm:text-base">
                          Download Invoice
                        </span>
                      </Button>
                    )}
                    {/* Cancel Button - show only for unpaid or pending subscriptions */}
                    {(sub.status !== 'CANCELLED' && sub.status !== 'COMPLETED' &&
                      (sub.paymentStatus === 'PENDING' || sub.paymentStatus === 'FAILED' || !sub.paymentStatus)) && (
                        <Button
                          onClick={() => handleCancelClick(sub)}
                          variant="destructive"
                          size="sm"
                          className="w-full sm:w-auto flex items-center justify-center gap-2"
                        >
                          <X className="h-4 w-4" />
                          <span className="text-sm">
                            Cancel Order
                          </span>
                        </Button>
                      )}
                  </div>
                )}
                {/* Show cancelled status message when subscription is cancelled */}
                {(sub.paymentStatus === 'CANCELLED' || sub.status === 'CANCELLED') && (
                  <div className="flex items-center justify-center p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      This subscription has been cancelled
                    </span>
                  </div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 dark:text-gray-400 mt-10 py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/30">
          <PackageSearch className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
            No Active Subscriptions Found
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            It looks like you don't have any active subscriptions at the moment.
          </p>
          {/* Consider adding a Link to the product listing or subscription creation page */}
          {/* e.g., <Button asChild className="mt-6"> <Link to="/products">Explore Products</Link> </Button> */}
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Cancel Order
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Are you sure you want to cancel{" "}
                {subscriptionToCancel?.productOrder?.id ? (
                  <>
                    the entire order #{subscriptionToCancel.productOrder.orderNo}?
                  </>
                ) : (
                  <>
                    the subscription for{" "}
                    <span className="font-semibold">
                      {subscriptionToCancel?.product.name}
                    </span>
                    ?
                  </>
                )}
              </p>
              {subscriptionToCancel?.productOrder?.id && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-sm font-medium text-amber-900">
                    📋 Order Cancellation
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    This will cancel all subscriptions in order #{subscriptionToCancel.productOrder.orderNo},
                    including the subscription for {subscriptionToCancel.product.name}.
                  </p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                ⚠️ This action cannot be undone. The {subscriptionToCancel?.productOrder?.id ? 'order' : 'subscription'} will be cancelled immediately.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Keep {subscriptionToCancel?.productOrder?.id ? 'Order' : 'Subscription'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              className="bg-destructive hover:bg-destructive/90"
              disabled={cancelSubscriptionMutation.isPending || cancelOrderSubscriptionsMutation.isPending}
            >
              {(cancelSubscriptionMutation.isPending || cancelOrderSubscriptionsMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Cancel {subscriptionToCancel?.productOrder?.id ? 'Entire Order' : 'Subscription'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MySubscriptionsPage;
