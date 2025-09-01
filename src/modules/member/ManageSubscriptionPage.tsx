import React, { useState, useEffect } from "react";
import { get, patch } from "../../services/apiService";
import { toast } from "sonner";
import { useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2,
  CalendarDays,
  CheckCircle,
  XCircle,
  SkipForward,
  Download,
} from "lucide-react";
import {
  format,
  parseISO,
  isAfter,
  addDays,
  differenceInDays,
  startOfDay,
} from "date-fns";
import { MemberSubscription as BaseMemberSubscription } from "./MySubscriptionsPage"; // Assuming the interface is exported

// Utility function to format subscription period similar to MySubscriptionsPage
const formatPeriod = (
  inputPeriod: ExtendedMemberSubscription["period"] | string | number
) => {
  const typedPeriodMap: Record<string, string> = {
    DAYS_7: "7 Days",
    DAYS_15: "15 Days",
    DAYS_30: "1 Month",
    DAYS_90: "3 Months",
  };

  if (typeof inputPeriod === "string" && typedPeriodMap[inputPeriod]) {
    return typedPeriodMap[inputPeriod];
  }

  const periodStr = String(inputPeriod);
  
  // Explicitly handle buy-once semantics
  if (periodStr === "0") {
    return "Buy Once";
  }
  
  const numericEquivalentMap: Record<string, string> = {
    "7": "7 Days",
    "15": "15 Days",
    "30": "1 Month",
    "90": "3 Months",
  };

  if (numericEquivalentMap[periodStr]) {
    return numericEquivalentMap[periodStr];
  }

  if (periodStr.startsWith("DAYS_")) {
    return periodStr.replace("DAYS_", "") + " Days";
  }
  if (!isNaN(Number(periodStr))) {
    return `${periodStr} Days`;
  }

  return periodStr;
};

// Utility to format delivery schedule text (simplified)
const formatDeliveryScheduleText = (
  schedule: ExtendedMemberSubscription["deliverySchedule"],
  selectedDays?: string[] | null,
  qty?: number,
  altQty?: number | null,
  unitLabel?: string
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
      scheduleText = schedule as string;
  }
  const label = unitLabel || "unit(s)";
  if (schedule === "VARYING" && qty && altQty) {
    return `${scheduleText} (${qty} / ${altQty})`;
  }
  if (qty) {
    return `${scheduleText} - ${qty} ${label}`;
  }
  return scheduleText;
};

// API service to get subscription details using apiService
const getSubscriptionDetails = async (
  id: string
): Promise<ExtendedMemberSubscription | null> => {
  console.log(`Fetching subscription details for ${id} using apiService...`);
  try {
    // apiService.get prepends /api, so pass 'subscriptions/:id'
    // It also returns the data directly (type ExtendedMemberSubscription)
    const data = await get<ExtendedMemberSubscription>(`subscriptions/${id}`);
    return data;
  } catch (error: any) {
    // Catch errors thrown by apiService.get
    if (error.status === 404) {
      // apiService's extractErrorMessage formats this, and console.error in apiService logs details
      console.warn(error.message); // e.g., "Not Found: Subscription not found"
      return null; // Maintain the behavior of returning null for 404
    }
    // For other errors, re-throw the structured error from apiService.
    // The useEffect catch block will handle setting the UI error message.
    throw error;
  }
};

// Expected structure from backend for each delivery entry
interface DeliveryScheduleEntryFromAPI {
  id: number;
  deliveryDate: string; // ISO string date
  status:
  | "PENDING"
  | "DELIVERED"
  | "NOT_DELIVERED"
  | "CANCELLED"
  | "SKIPPED"
  | "SKIP_BY_CUSTOMER"
  | "INDRAAI_DELIVERY"
  | "TRANSFER_TO_AGENT";
  quantity: number;
  // Add other fields if your backend sends them, e.g., product details for this specific delivery if they can vary
}

// Extended MemberSubscription type to include delivery schedule entries from API
interface ExtendedMemberSubscription extends BaseMemberSubscription {
  memberId: string; // Added memberId, assuming it comes from the backend
  deliveryScheduleEntries?: DeliveryScheduleEntryFromAPI[];
  productOrder?: {
    id: string;
    orderNo: string;
    invoiceNo?: string | null;
    invoicePath?: string | null;
  };
}

// Frontend representation of a delivery for display
interface Delivery {
  id: number; // This is the DeliveryScheduleEntry ID
  date: Date;
  status:
  | "PENDING"
  | "SCHEDULED"
  | "SKIPPED"
  | "DELIVERED"
  | "NOT_DELIVERED"
  | "CANCELLED"; // Consolidated status for UI
  originalStatus?: string; // Keep the original status for more detailed display
  originalQty?: number;
}

interface ApiServiceError {
  message: string;
  status?: number;
  // Add other properties if your apiService error object has more that you need to access
}

// Helper function to get user-friendly status labels
const getStatusLabel = (status: Delivery["status"], originalStatus?: string, date?: Date, today?: Date): string => {
  switch (status) {
    case "SKIPPED":
      if (originalStatus === "SKIP_BY_CUSTOMER") {
        return "SKIPPED BY YOU";
      } else if (originalStatus === "SKIPPED") {
        return "SKIPPED";
      }
      return "SKIPPED";
    case "DELIVERED":
      if (originalStatus === "INDRAAI_DELIVERY") {
        return "DELIVERED (INDRAAI)";
      } else if (originalStatus === "TRANSFER_TO_AGENT") {
        return "DELIVERED (AGENT)";
      }
      return "DELIVERED";
    case "NOT_DELIVERED":
      return "NOT DELIVERED";
    case "CANCELLED":
      return "CANCELLED";
    case "SCHEDULED":
      return "TODAY";
    case "PENDING":
      return "PENDING";
    default:
      return status;
  }
};

const ManageSubscriptionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [subscription, setSubscription] =
    useState<ExtendedMemberSubscription | null>(null);
  const [isSkipping, setIsSkipping] = useState<Record<number, boolean>>({}); // Tracks loading state for skip buttons by delivery ID
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    deliveryId: number | null;
  }>({ isOpen: false, deliveryId: null });
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = startOfDay(new Date());

  useEffect(() => {
    if (!id) {
      setError("Subscription ID is missing.");
      setIsLoading(false);
      return;
    }

    const fetchDetails = async () => {
      setIsLoading(true);
      try {
        const data = await getSubscriptionDetails(id);
        if (data) {
          setSubscription(data);
          processDeliverySchedule(data); // Use the new processing function
        } else {
          setError("Subscription not found.");
        }
      } catch (err: any) {
        // Keep 'any' here as apiService can throw various things, but we'll check props
        const apiError = err as ApiServiceError; // Type assertion for easier access
        setError(apiError.message || "Failed to load subscription details.");
        console.error("Error in fetchDetails useEffect:", apiError);
      }
      setIsLoading(false);
    };

    fetchDetails();
  }, [id]);

  const processDeliverySchedule = (sub: ExtendedMemberSubscription) => {
    if (
      !sub.deliveryScheduleEntries ||
      sub.deliveryScheduleEntries.length === 0
    ) {
      // Fallback or handle case where backend doesn't send entries - though it should.
      // For now, we'll rely on the backend sending these.
      // If you need to keep the old generation logic as a fallback, it can be placed here.
      // However, skipping would not work without entry IDs from the backend.
      console.warn(
        "No delivery schedule entries received from backend. Displaying empty schedule."
      );
      setDeliveries([]);
      return;
    }

    const today = startOfDay(new Date());
    const processedDeliveries: Delivery[] = sub.deliveryScheduleEntries.map(
      (entry) => {
        const deliveryDate = parseISO(entry.deliveryDate);
        let uiStatus: Delivery["status"];

        switch (entry.status) {
          case "SKIPPED":
          case "SKIP_BY_CUSTOMER":
            uiStatus = "SKIPPED";
            break;
          case "PENDING":
            uiStatus =
              deliveryDate.getTime() === today.getTime()
                ? "SCHEDULED"
                : "PENDING";
            break;
          case "DELIVERED":
          case "INDRAAI_DELIVERY":
          case "TRANSFER_TO_AGENT":
            uiStatus = "DELIVERED";
            break;
          case "NOT_DELIVERED":
            uiStatus = "NOT_DELIVERED";
            break;
          case "CANCELLED":
            uiStatus = "CANCELLED";
            break;
          default:
            // Fallback for any unknown status
            console.warn(`Unknown delivery status: ${entry.status}`);
            uiStatus =
              deliveryDate < today
                ? "DELIVERED"
                : deliveryDate.getTime() === today.getTime()
                  ? "SCHEDULED"
                  : "PENDING";
        }

        return {
          id: entry.id,
          date: deliveryDate,
          status: uiStatus,
          originalStatus: entry.status,
          originalQty: entry.quantity,
        };
      }
    );

    // Sort deliveries by date just in case they aren't sorted from backend
    processedDeliveries.sort((a, b) => a.date.getTime() - b.date.getTime());
    setDeliveries(processedDeliveries);
  };

  const handleConfirmSkip = async () => {
    if (!dialogState.deliveryId) return;

    const deliveryEntryId = dialogState.deliveryId;
    setIsSkipping((prev) => ({ ...prev, [deliveryEntryId]: true }));
    setDialogState({ isOpen: false, deliveryId: null }); // Close dialog immediately

    try {
      // The backend PATCH /subscriptions/member/deliveries/:deliveryEntryId/skip endpoint
      // is now responsible for both skipping the delivery and processing any applicable refund.
      const response = await patch<{
        message: string;
        deliveryEntry: DeliveryScheduleEntryFromAPI;
      }>(`/subscriptions/member/deliveries/${deliveryEntryId}/skip`, {});

      // Update local state with the new status from the backend response
      setDeliveries((prevDeliveries) =>
        prevDeliveries.map((d) =>
          d.id === deliveryEntryId ? { ...d, status: "SKIPPED" } : d
        )
      );

      toast.success(
        response.message || "Delivery action processed successfully!"
      );

      // Optional: If the backend response includes specific details about the refund (e.g., amount),
      // you could display an additional toast.info here. For now, relying on the main success message.
    } catch (error: any) {
      console.error("Failed to process delivery skip/refund:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error.message ||
        "Could not process delivery action. Please try again.";
      toast.error(errorMessage);
    }
    setIsSkipping((prev) => ({ ...prev, [deliveryEntryId]: false }));
  };

  const handleSkipDelivery = async (deliveryEntryId: number) => {
    setDialogState({ isOpen: true, deliveryId: deliveryEntryId });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg text-gray-600">
          Loading subscription details...
        </p>
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error || "Could not load subscription details."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Card className="shadow-lg mb-6">
        <CardHeader className="bg-gray-50 dark:bg-gray-800 pb-4">
          <CardTitle className="text-xl md:text-2xl font-bold text-primary">
            Subscription Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-700 dark:text-gray-300 p-4">
          <p>
            <strong>Product:</strong> {subscription.product.name}
          </p>
          <p>
            <strong>Quantity:</strong> {subscription.qty}{" "}
            {subscription.product.depotVariant?.name || subscription.product.unit || "unit"}
            {subscription.altQty ? (
              <>
                {" "}
                &amp; {subscription.altQty}{" "}
                {subscription.product.depotVariant?.name || subscription.product.unit || "unit"}
              </>
            ) : null}
          </p>
          <p>
            <strong>Period:</strong> {formatPeriod(subscription.period)}
          </p>
          <p>
            <strong>Starts On:</strong>{" "}
            {format(new Date(subscription.startDate), "dd/MM/yyyy")}
          </p>
          <p>
            <strong>Expires On:</strong>{" "}
            {format(new Date(subscription.expiryDate), "dd/MM/yyyy")}
          </p>
          <p>
            <strong>Delivery:</strong>{" "}
            {formatDeliveryScheduleText(
              subscription.deliverySchedule,
              subscription.selectedDays,
              subscription.qty,
              subscription.altQty,
              subscription.product.depotVariant?.name || subscription.product.unit || "unit"
            )}
          </p>
          {subscription.paymentStatus && (
            <p>
              <strong>Payment:</strong>{" "}
              <span
                className={`capitalize font-medium ${subscription.paymentStatus === "PAID"
                    ? "text-green-600"
                    : "text-orange-500"
                  }`}
              >
                {subscription.paymentStatus.toLowerCase()}
              </span>
            </p>
          )}
          {subscription.agency && (
            <p>
              <strong>Assigned Agent:</strong> {subscription.agency.user.name}
            </p>
          )}
          {subscription.deliveryAddress && (
            <p>
              <strong>Delivering to:</strong>{" "}
              {`${subscription.deliveryAddress?.streetArea &&
                subscription.deliveryAddress?.streetArea
                }, ${subscription.deliveryAddress?.landmark &&
                subscription.deliveryAddress?.landmark
                }, ${subscription.deliveryAddress.city}, ${subscription.deliveryAddress.state
                } ${subscription.deliveryAddress.pincode}`}
            </p>
          )}
          {subscription.amount !== undefined && (
            <p className="font-semibold text-base">
              <strong>Total Amount:</strong> ₹{subscription.amount.toFixed(2)}
            </p>
          )}
        </CardContent>
        {subscription.productOrder?.invoicePath && (
          <div className="px-4 pb-4">
            <Button
              onClick={() => {
                const baseUrl =
                  import.meta.env.VITE_BACKEND_URL || "https://snf.3.7.237.251.sslip.io/";
                const invoiceUrl = `${baseUrl}/invoices/${subscription.productOrder.invoicePath}`;
                window.open(invoiceUrl);
              }}
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Invoice
            </Button>
          </div>
        )}
      </Card>

      <Card className="shadow-lg">
        <CardHeader className="bg-gray-50 dark:bg-gray-800 pb-4">
          <CardTitle className="text-xl md:text-2xl font-bold text-primary">
            Manage Subscription: {subscription.product.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300 flex items-center">
            <CalendarDays className="mr-2 h-5 w-5 text-primary" /> Delivery
            Schedule
          </h3>
          {deliveries.length > 0 ? (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {deliveries.map((delivery, index) => {
                console.log(
                  `Rendering delivery - ID: ${JSON.stringify(
                    delivery
                  )}, Status: ${delivery.status}, Date: ${delivery.date ? delivery.date.toISOString() : "N/A"
                  }, isAfterToday: ${delivery.date ? isAfter(delivery.date, today) : "N/A"
                  }`
                );
                return (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-md border ${delivery.status === "SKIPPED"
                        ? "bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-700"
                        : delivery.status === "DELIVERED"
                          ? "bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700"
                          : delivery.date.getTime() === today.getTime()
                            ? "bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700"
                            : "bg-gray-50 border-gray-200 dark:bg-gray-700/30 dark:border-gray-600"
                      }`}
                  >
                    <div className="flex items-center">
                      {delivery.status === "SKIPPED" && (
                        <XCircle className="h-5 w-5 mr-2 text-red-500 flex-shrink-0" />
                      )}
                      {delivery.status === "DELIVERED" && (
                        <CheckCircle className="h-5 w-5 mr-2 text-green-500 flex-shrink-0" />
                      )}
                      {delivery.status === "NOT_DELIVERED" && (
                        <XCircle className="h-5 w-5 mr-2 text-orange-500 flex-shrink-0" />
                      )}
                      {delivery.status === "CANCELLED" && (
                        <XCircle className="h-5 w-5 mr-2 text-gray-400 flex-shrink-0" />
                      )}
                      {(delivery.status === "PENDING" ||
                        delivery.status === "SCHEDULED") && (
                          <CalendarDays className="h-5 w-5 mr-2 text-gray-500 flex-shrink-0" />
                        )}
                      <div>
                        <span className="font-medium text-gray-800 dark:text-gray-100">
                          {format(delivery.date, "EEE, dd/MM/yyyy")}
                        </span>
                        <span
                          className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${delivery.status === "SKIPPED"
                              ? "bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100"
                              : delivery.status === "DELIVERED"
                                ? "bg-green-100 text-green-700 dark:bg-primary dark:text-green-100"
                                : delivery.status === "NOT_DELIVERED"
                                  ? "bg-orange-100 text-orange-700 dark:bg-orange-700 dark:text-orange-100"
                                  : delivery.status === "CANCELLED"
                                    ? "bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300"
                                    : delivery.date.getTime() === today.getTime() &&
                                      delivery.status === "SCHEDULED"
                                      ? "bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-100"
                                      : "bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-200"
                            }`}
                        >
                          {getStatusLabel(delivery.status, delivery.originalStatus, delivery.date, today)}
                        </span>
                      </div>
                    </div>
                    {isAfter(startOfDay(delivery.date), today) &&
                      (delivery.status === "PENDING" ||
                        delivery.status === "SCHEDULED") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSkipDelivery(delivery.id)}
                          disabled={isSkipping[delivery.id]}
                          className="flex items-center text-sm text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/50 border-amber-300 hover:border-amber-400"
                        >
                          {isSkipping[delivery.id] ? (
                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                          ) : (
                            <SkipForward className="mr-1.5 h-4 w-4" />
                          )}
                          {isSkipping[delivery.id] ? "Skipping..." : "Skip"}
                        </Button>
                      )}
                    {delivery.status === "SKIPPED" &&
                      isAfter(delivery.date, today) && (
                        <span className="text-xs text-red-500 italic ml-auto">
                          {delivery.originalStatus === "SKIP_BY_CUSTOMER"
                            ? "Skipped by you"
                            : "Skipped"}
                        </span>
                      )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              No delivery dates found for this subscription.
            </p>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={dialogState.isOpen}
        onOpenChange={(isOpen) => setDialogState({ ...dialogState, isOpen })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to skip this delivery?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Skipping will prevent the delivery
              for the selected date. If a refund is applicable for a pre-paid
              delivery, it will be processed automatically to your wallet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() =>
                setDialogState({ isOpen: false, deliveryId: null })
              }
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSkip}>
              Confirm Skip
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManageSubscriptionPage;
