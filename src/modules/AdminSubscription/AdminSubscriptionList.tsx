import React, { useEffect, useState, useCallback } from "react";
import { get, put, post } from "@/services/apiService"; // Assuming you have a configured apiService
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton"; // For loading state
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  X,
  UserPlus,
  UserIcon,
  PhoneIcon,
  MailIcon,
  PackageIcon,
  ShoppingCartIcon,
  IndianRupeeIcon,
  CalendarIcon,
  CalendarCheckIcon,
  UserCheckIcon,
  Calendar,
  Users,
  Download,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner"; // Using Sonner for toasts
import { BulkAgencyAssignmentModal } from "./components/BulkAgencyAssignmentModal";

// Define interfaces based on expected API response and schema
interface Agency {
  id: number;
  name: string; // This is the Agency's name
  user?: User; // User details for the agent representing the agency
  // Add other relevant agency fields if needed
}

interface User {
  name: string;
  email: string;
  mobile: number | null;
}

interface Member {
  user?: User;
}

interface Product {
  name: string;
  unit?: string; // Added to include product unit
}

interface DepotProductVariant {
  id: number;
  name: string;
  mrp?: number;
}

interface DeliveryAddress {
  id: string;
  memberId: number;
  recipientName: string;
  mobile: string;
  plotBuilding: string;
  streetArea: string;
  landmark?: string;
  pincode: string;
  city: string;
  state: string;
  isDefault: boolean;
  label?: string;
  createdAt: string;
  updatedAt: string;
  location?: {
    id: number;
    name: string;
    city?: {
      id: number;
      name: string;
    };
    agency?: {
      id: number;
      name: string;
    };
  };
}

interface Subscription {
  id: number;
  member?: Member;
  product: Product;
  depotProductVariant?: DepotProductVariant; // Added depotProductVariant field
  deliverySchedule: string; // DAILY, WEEKDAYS, ALTERNATE_DAYS, SELECT_DAYS, VARYING
  weekdays?: string | null; // JSON string array like '["MONDAY", "TUESDAY"]'
  qty: number;
  altQty?: number | null;
  paymentStatus: string; // PENDING, PAID, FAILED
  amount: number; // Total gross amount of the subscription
  walletamt: number; // Amount paid from wallet
  payableamt: number; // Net amount due after wallet deduction (amount - walletamt)
  receivedamt: number; // Amount actually received against payableamt
  startDate: string; // Date when the subscription effectively starts
  createdAt: string; // Date when the record was created
  agencyId?: number | null;
  agency?: Agency | null;
  paymentMode?: string | null;
  paymentReference?: string | null;
  paymentDate?: string | null; // Store as ISO string or Date
  expiryDate?: string | null;
  deliveryAddress?: DeliveryAddress;
  deliveryInstructions?: string | null; // Delivery instructions field
}

// API shape when fetching product orders
interface ApiResponse {
  data: ProductOrder[];
  totalPages: number;
  currentPage: number;
  totalCount: number;
}

// --- New ProductOrder interface ---
interface ProductOrder {
  id: string;
  orderNo: string;
  totalQty: number;
  totalAmount: number;
  walletamt: number;
  payableamt: number;
  receivedamt: number;
  paymentStatus: string; // PENDING, PAID, FAILED
  paymentMode?: string | null;
  paymentReferenceNo?: string | null;
  paymentDate?: string | null;
  createdAt: string;
  member?: Member;
  subscriptions: Subscription[];
  invoiceNo?: string | null;
  invoicePath?: string | null;
}

// --- SubscriptionEditModal Component Definition ---
interface PaymentUpdateModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  order: ProductOrder | null;
  onUpdateOrder: (updatedDetails: {
    orderId: string;
    paymentMode?: string;
    paymentReference?: string;
    paymentDate?: string;
    paymentStatus?: string;
    receivedAmount?: number;
  }) => Promise<boolean>;
}

const paymentModeOptions = [
  { value: "ONLINE", label: "Online" },
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "BANK", label: "Bank Transfer" }, // Value is BANK, Label is user-friendly
];

const PaymentUpdateModal: React.FC<PaymentUpdateModalProps> = ({
  isOpen,
  onOpenChange,
  order,
  onUpdateOrder,
}) => {
  const [paymentMode, setPaymentMode] = useState<string>("");
  const [paymentReference, setPaymentReference] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>("");
  const [paymentStatusState, setPaymentStatusState] = useState<string>("");
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [receivedAmount, setReceivedAmount] = useState<string>("");
  const [payableAmount, setPayableAmount] = useState<string>("");

  const isPaymentSectionDisabled = order?.paymentStatus === "PAID";

  useEffect(() => {
    if (order) {
      console.log("Payment Modal Data:", {
        orderId: order.id,
        totalAmount: order.totalAmount,
        walletamt: order.walletamt,
        payableamt: order.payableamt,
        currentStatus: order.paymentStatus,
      });
      setPaymentMode(order.paymentMode || "");
      setPaymentReference(order.paymentReferenceNo || "");
      setPaymentDate(
        order.paymentDate
          ? format(new Date(order.paymentDate), "yyyy-MM-dd")
          : ""
      );
      setPaymentStatusState(order.paymentStatus || "");
      // Use order-level payableamt (remaining amount after wallet deduction)
      setPayableAmount(order.payableamt?.toString() || "0");
      setReceivedAmount(order.payableamt?.toString() || "0");
    } else {
      setPaymentMode("");
      setPaymentReference("");
      setPaymentDate("");
      setPaymentStatusState("");
      setPayableAmount("");
      setReceivedAmount("");
    }
  }, [order]);

  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    if (!paymentStatusState) {
      errors.paymentStatus = "Payment status is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!order || isPaymentSectionDisabled) return;
    if (!validateForm()) return;

    const received = parseFloat(receivedAmount);

    if (isNaN(received) || received <= 0) {
      toast.error("Please enter a valid received amount.");
      return;
    }

    const payable = order.payableamt ?? 0;
    const total = order.totalAmount ?? 0;
    console.log("payable", payable, "total", total);

    if (paymentStatusState === "PAID") {
      // Allow received to match payableamt (the actual amount owed after wallet deduction)
      // or totalAmount if payableamt is 0 (workaround for old orders)
      const isValidAmount =
        received === payable || (payable === 0 && received === total);
      if (!isValidAmount) {
        const expectedAmount = payable === 0 && total > 0 ? total : payable;
        toast.error(
          `Received amount (₹${received.toFixed(
            2
          )}) must equal the payable amount (₹${expectedAmount.toFixed(
            2
          )}) to mark as PAID.`
        );
        return;
      }
    }

    if (paymentStatusState !== "PAID" && paymentStatusState !== "FAILED") {
      toast.error("Payment Status is Required");
      return;
    }

    const updatedDetails = {
      orderId: order.id,
      paymentMode,
      paymentReference,
      paymentDate: paymentDate,
      paymentStatus: paymentStatusState,
      receivedAmount: received,
    };

    try {
      const success = await onUpdateOrder(updatedDetails);
      if (success) {
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Failed to update payment:", error);
    }
  };

  if (!isOpen || !order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Update Payment for Order: {order.orderNo}</DialogTitle>
          <DialogDescription>
            Modify payment details for the entire order.
          </DialogDescription>
        </DialogHeader>
        <DialogClose
          className="absolute right-4 top-4 z-10"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
        </DialogClose>

        <div className="grid gap-6 py-4">
          <fieldset
            disabled={isPaymentSectionDisabled}
            className="grid gap-4 border p-4 rounded-md"
          >
            <legend className="text-sm font-medium px-1">
              Payment Information{" "}
              {isPaymentSectionDisabled
                ? `(Status: ${order.paymentStatus} - Disabled)`
                : ""}
            </legend>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="paymentMode" className="text-right col-span-1">
                Payment Mode <span className="text-red-500">*</span>
              </Label>
              <Select
                value={paymentMode}
                onValueChange={(value) => setPaymentMode(value)}
                disabled={isPaymentSectionDisabled}
              >
                <SelectTrigger id="paymentMode" className="col-span-3 mt-1">
                  <SelectValue placeholder="Select payment mode" />
                </SelectTrigger>
                <SelectContent>
                  {paymentModeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label
                htmlFor="payment-reference"
                className="text-right col-span-1"
              >
                Reference #
              </Label>
              <Input
                id="payment-reference"
                value={paymentReference}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPaymentReference(e.target.value)
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payment-date" className="text-right col-span-1">
                Payment Date
              </Label>
              <Input
                type="date"
                id="payment-date"
                value={paymentDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPaymentDate(e.target.value)
                }
                className="col-span-3"
              />
            </div>
            {/* Add this section after the "Payment Date" input */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payable-amount" className="text-right col-span-1">
                Payable Amount
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <IndianRupeeIcon className="h-4 w-4 text-gray-500" />
                <span id="payable-amount" className="font-semibold">
                  {payableAmount}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label
                htmlFor="received-amount"
                className="text-right col-span-1"
              >
                Received Amount <span className="text-red-500">*</span>
              </Label>
              <Input
                id="received-amount"
                type="number"
                value={receivedAmount}
                onChange={(e) => setReceivedAmount(e.target.value)}
                className="col-span-3"
                placeholder="Enter amount received"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label
                className="text-right col-span-1"
                htmlFor="payment-status-modal"
              >
                Status <span className="text-red-500">*</span>
              </Label>
              <div className="col-span-3 flex flex-col gap-1">
                <Select
                  value={paymentStatusState}
                  onValueChange={(value) => {
                    setPaymentStatusState(value);
                    if (value) {
                      const newErrors = { ...formErrors };
                      delete newErrors.paymentStatus;
                      setFormErrors(newErrors);
                    }
                  }}
                >
                  <SelectTrigger
                    id="payment-status-modal"
                    className={formErrors.paymentStatus ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* <SelectItem value="PENDING">Pending</SelectItem> */}
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.paymentStatus && (
                  <p className="text-xs text-red-500">
                    {formErrors.paymentStatus}
                  </p>
                )}
              </div>
            </div>
          </fieldset>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPaymentSectionDisabled}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// --- AssignAgentModal Component Definition ---
interface AssignAgentModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  order: ProductOrder | null;
  agencies: Agency[];
  isLoadingAgencies: boolean;
  onUpdateOrderSubscriptions: (updatedDetails: {
    orderId: string;
    agencyId?: number | null;
    deliveryInstructions?: string;
  }) => Promise<void>;
}

const AssignAgentModal: React.FC<AssignAgentModalProps> = ({
  isOpen,
  onOpenChange,
  order,
  agencies,
  isLoadingAgencies,
  onUpdateOrderSubscriptions,
}) => {
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>("NONE");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");

  useEffect(() => {
    if (order && order.subscriptions.length > 0) {
      // Use the first subscription's data as default, but this will apply to all subscriptions in the order
      const firstSub = order.subscriptions[0];
      console.log("AssignAgentModal - Order loaded:", {
        orderId: order.id,
        orderNo: order.orderNo,
        subscriptionsCount: order.subscriptions.length,
        firstSubAgencyId: firstSub.agencyId,
        firstSubDeliveryInstructions: firstSub.deliveryInstructions,
      });
      setSelectedAgencyId(firstSub.agencyId?.toString() || "NONE");
      setDeliveryInstructions(firstSub.deliveryInstructions || "");
    } else {
      setSelectedAgencyId("NONE");
      setDeliveryInstructions("");
    }
  }, [order]);

  const handleSubmit = async () => {
    if (!order) return;

    const updatedDetails = {
      orderId: order.id,
      agencyId:
        selectedAgencyId !== "NONE" ? parseInt(selectedAgencyId, 10) : null,
      deliveryInstructions: deliveryInstructions,
    };

    console.log("AssignAgentModal - Submitting order-level update:", {
      orderId: order.id,
      orderNo: order.orderNo,
      subscriptionsCount: order.subscriptions.length,
      selectedAgencyId,
      updatedDetails,
    });

    try {
      await onUpdateOrderSubscriptions(updatedDetails);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update order subscriptions in modal:", error);
    }
  };

  if (!isOpen || !order) return null;

  // Format delivery schedule in a user-friendly way
  const formatDeliverySchedule = (
    schedule: string,
    weekdays?: string | null
  ) => {
    switch (schedule) {
      case "DAILY":
        return "Daily";
      case "WEEKDAYS":
        return "Weekdays (Mon-Fri)";
      case "ALTERNATE_DAYS":
        return "Alternate Days";
      case "SELECT_DAYS":
        try {
          if (weekdays) {
            const days = JSON.parse(weekdays);
            return `Selected Days: ${days.join(", ")}`;
          }
          return "Selected Days";
        } catch {
          return "Selected Days";
        }
      case "VARYING":
        return "Varying Schedule";
      default:
        return schedule;
    }
  };

  // Format date to a more readable format
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] sm:max-h-[85vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="space-y-2 sm:space-y-3">
          <DialogTitle className="text-lg sm:text-xl font-semibold pr-8">
            Update Agent Assignment for Order: {order.orderNo}
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            This will update the agent assignment for all {order.subscriptions.length} subscription(s) in this order for{" "}
            <span className="font-medium">{order.member?.user?.name || "Unknown Member"}</span>.
            Only future deliveries will be affected.
          </DialogDescription>
        </DialogHeader>
        <DialogClose
          className="absolute right-2 top-2 sm:right-4 sm:top-4 z-10 h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
        </DialogClose>

        <div className="grid gap-4 sm:gap-6 py-2 sm:py-4 overflow-y-auto flex-grow">
          {/* Order Details Section */}
          <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
            <h3 className="text-sm font-medium mb-2 text-blue-900">Order Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-sm">
              <div>
                <p className="text-blue-700 text-xs sm:text-sm">Order Number</p>
                <p className="font-medium text-blue-900 text-sm sm:text-base">{order.orderNo}</p>
              </div>
              <div>
                <p className="text-blue-700 text-xs sm:text-sm">Total Amount</p>
                <p className="font-medium text-blue-900 text-sm sm:text-base">₹{order.totalAmount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-blue-700 text-xs sm:text-sm">Payment Status</p>
                <p className="font-medium">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs ${order.paymentStatus === "PAID"
                      ? "bg-green-100 text-green-800"
                      : order.paymentStatus === "PENDING"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                      }`}
                  >
                    {order.paymentStatus}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-blue-700 text-xs sm:text-sm">Subscriptions</p>
                <p className="font-medium text-blue-900 text-sm sm:text-base">{order.subscriptions.length} item(s)</p>
              </div>
            </div>
          </div>

          {/* All Subscriptions in Order */}
          <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
            <h3 className="text-sm font-medium mb-2">Subscriptions in this Order</h3>
            <div className="space-y-2 max-h-40 sm:max-h-48 overflow-y-auto">
              {order.subscriptions.map((sub, index) => (
                <div key={sub.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 bg-white rounded border gap-2 sm:gap-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex-shrink-0">
                      {index + 1}
                    </span>
                    <span className="font-medium text-sm break-words">{sub.product.name}</span>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {sub.deliverySchedule === "ALTERNATE_DAYS"
                        ? `×${sub.qty}/${sub.altQty ?? "-"}`
                        : `×${sub.qty}`}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 sm:text-right">
                    <span className="sm:hidden font-medium">Current Agent: </span>
                    {sub.agency?.user?.name || sub.agency?.name || "Unassigned"}
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* Delivery Address Section */}
          {order.subscriptions[0]?.deliveryAddress && (
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
              <h3 className="text-sm font-medium mb-2">Delivery Address</h3>
              <div className="grid gap-1 text-xs sm:text-sm">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <p className="font-medium">
                    {order.subscriptions[0].deliveryAddress.recipientName}
                  </p>
                  {order.subscriptions[0].deliveryAddress.label && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded w-fit">
                      {order.subscriptions[0].deliveryAddress.label}
                    </span>
                  )}
                </div>
                <p className="break-words">
                  {order.subscriptions[0].deliveryAddress.plotBuilding},{" "}
                  {order.subscriptions[0].deliveryAddress.streetArea}
                </p>
                {order.subscriptions[0].deliveryAddress.landmark && (
                  <p className="break-words">{order.subscriptions[0].deliveryAddress.landmark}</p>
                )}
                <p>
                  {order.subscriptions[0].deliveryAddress.city},{" "}
                  {order.subscriptions[0].deliveryAddress.state} -{" "}
                  {order.subscriptions[0].deliveryAddress.pincode}
                </p>
                <p className="text-blue-600">
                  Mobile: {order.subscriptions[0].deliveryAddress.mobile}
                </p>
              </div>
            </div>
          )}

          {/* Customer Details Section */}
          <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
            <h3 className="text-sm font-medium mb-2">Member Details</h3>
            <div className="grid gap-1 text-xs sm:text-sm">
              <p className="break-words">
                <span className="text-gray-500">Name:</span>{" "}
                <span className="font-medium">{order.member?.user?.name || "N/A"}</span>
              </p>
              <p className="break-all">
                <span className="text-gray-500">Email:</span>{" "}
                <span className="font-medium">{order.member?.user?.email || "N/A"}</span>
              </p>
              {order.member?.user?.mobile && (
                <p>
                  <span className="text-gray-500">Mobile:</span>{" "}
                  <span className="font-medium">{order.member.user.mobile}</span>
                </p>
              )}
            </div>
          </div>

          {/* Agent Selection */}
          <fieldset className="grid gap-3 sm:gap-4 border p-3 sm:p-4 rounded-md border-green-200 bg-green-50">
            <legend className="text-sm font-medium px-1 text-green-900">
              Update Agent Assignment for Future Deliveries
            </legend>

            {/* Agent Selection - Mobile First Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="delivery-agent" className="text-sm font-medium sm:text-right sm:col-span-1">
                Agent
              </Label>
              <div className="sm:col-span-3">
                <Select
                  value={selectedAgencyId}
                  onValueChange={setSelectedAgencyId}
                  disabled={isLoadingAgencies}
                >
                  <SelectTrigger id="delivery-agent" className="w-full">
                    <SelectValue
                      placeholder={
                        isLoadingAgencies ? "Loading agents..." : "Select agent"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Unassign / Not Assigned</SelectItem>
                    {agencies.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id.toString()}>
                        {agent.user?.name || agent.name}
                      </SelectItem>
                    ))}
                    {agencies.length === 0 && !isLoadingAgencies && (
                      <p className="text-sm text-muted-foreground p-2">
                        No agents available.
                      </p>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Instructions - Mobile First Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2 sm:gap-4">
              <Label
                htmlFor="delivery-instructions"
                className="text-sm font-medium sm:text-right sm:col-span-1"
              >
                Instructions
              </Label>
              <div className="sm:col-span-3">
                <Textarea
                  id="delivery-instructions"
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  className="w-full min-h-[80px] sm:min-h-[100px] resize-none"
                  placeholder="Enter delivery instructions for all subscriptions in this order"
                  maxLength={200}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {deliveryInstructions.length}/200 characters
                </div>
              </div>
            </div>

            {/* Info Message */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500 flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 bg-white rounded-full mx-auto mt-1"></div>
                </div>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Agent Assignment Policy</p>
                  <p className="text-xs leading-relaxed">
                    This will assign the agent to all subscriptions in this order.
                    <span className="font-medium"> Only future deliveries</span> will use the new agent assignment.
                    Past and today's deliveries will keep their original agent assignments to preserve delivery history.
                  </p>
                </div>
              </div>
            </div>
          </fieldset>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0 pt-4 sm:pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isLoadingAgencies}
            className="w-full sm:w-auto order-1 sm:order-2"
          >
            {isLoadingAgencies ? "Loading..." : `Update Agent Assignment`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const AdminSubscriptionList: React.FC = () => {
  const [productOrders, setProductOrders] = useState<ProductOrder[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<ProductOrder | null>(null);
  const [selectedOrderForAgent, setSelectedOrderForAgent] =
    useState<ProductOrder | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAssignAgentModalOpen, setIsAssignAgentModalOpen] = useState(false);
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [isLoadingAgencies, setIsLoadingAgencies] = useState<boolean>(false);
  const [showFilters] = useState<boolean>(false);
  const [showUnassignedOnly, setShowUnassignedOnly] = useState<boolean>(false);
  const [downloadingInvoices, setDownloadingInvoices] = useState<Set<string>>(
    new Set()
  );

  // User role and supervisor filtering state
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentSupervisorAgencyId, setCurrentSupervisorAgencyId] = useState<
    string | null
  >(null);
  const [isSupervisorInfoLoading, setIsSupervisorInfoLoading] = useState(false);

  const [filters, setFilters] = useState<{ [key: string]: string | undefined }>(
    {
      searchTerm: "",
      memberName: "",
      subscriptionDate: "",
      paymentStatus: "ALL",
      deliveryStatus: "",
      agencyId: "",
      productId: "",
      expiryStatus: "ALL", // Default to show all records
      // Add other filter keys as needed, initialized to empty or default values
    }
  );

  // Get user role from localStorage
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          setCurrentUserRole(user.role);

          // If user is a supervisor, get their agency information
          if (user.role === "SUPERVISOR") {
            setIsSupervisorInfoLoading(true);
            try {
              const supervisorInfo = await get("/users/me");
              console.log("supervisorinfo", supervisorInfo);
              // Get the agency ID from supervisor's assigned agency
              setCurrentSupervisorAgencyId(
                supervisorInfo?.supervisor?.agencyId
                  ? String(supervisorInfo.supervisor.agencyId)
                  : null
              );
            } catch (error) {
              console.error("Failed to fetch supervisor info:", error);
              toast.error("Could not load supervisor details.");
              setCurrentSupervisorAgencyId(null);
            }
            setIsSupervisorInfoLoading(false);
          }
        }
      } catch (error) {
        console.error("Failed to parse user data from localStorage", error);
      }
    };
    fetchUserInfo();
  }, []);

  // Fetch product orders instead of subscriptions
  const fetchProductOrders = useCallback(
    async (page = currentPage, currentLimit = 10, currentFilters = filters, unassignedFilter = showUnassignedOnly) => {
      setIsLoading(true);

      // Determine effective values for pagination and filters, providing fallbacks
      const effectivePage =
        page !== undefined ? page : currentPage !== undefined ? currentPage : 1;
      const effectiveLimit =
        currentLimit !== undefined
          ? currentLimit
          : limit !== undefined
            ? limit
            : 10;
      const effectiveFilters = currentFilters || filters || {}; // Ensure filters is an object

      const apiParams: { [key: string]: string } = {};
      for (const [originalKey, originalValueObj] of Object.entries(
        effectiveFilters
      )) {
        // Ensure originalValueObj is not null or undefined before calling toString
        if (originalValueObj === null || originalValueObj === undefined) {
          continue;
        }
        const value = String(originalValueObj).trim();

        if (value === "" || value.toLowerCase() === "all") {
          continue;
        }

        if (originalKey === "memberName") {
          apiParams["searchTerm"] = value;
        } else if (originalKey === "subscriptionDate") {
          apiParams["startDate"] = value;
        } else {
          apiParams[originalKey] = value;
        }
      }

      // Add unassigned filter to API params
      if (unassignedFilter) {
        apiParams["unassignedOnly"] = "true";
      }

      // Add supervisor filtering if user is a supervisor
      if (currentUserRole === "SUPERVISOR" && currentSupervisorAgencyId) {
        apiParams["supervisorAgencyId"] = currentSupervisorAgencyId;
      }

      const queryParams = new URLSearchParams({
        page: effectivePage.toString(),
        limit: effectiveLimit.toString(),
        ...apiParams,
      }).toString();

      // Debug logging for filters
      if (process.env.NODE_ENV === 'development') {
        console.log('Frontend sending filters:', {
          effectiveFilters,
          apiParams,
          queryParams,
          unassignedFilter
        });
      }

      try {
        const response: ApiResponse = await get(
          `/product-orders?${queryParams}`
        );
        // Debug logging (can be removed in production)
        if (process.env.NODE_ENV === 'development') {
          console.log('Fetch response:', {
            page: effectivePage,
            limit: effectiveLimit,
            totalCount: response.totalCount,
            totalPages: response.totalPages,
            currentPage: response.currentPage,
            dataLength: response.data?.length || 0
          });
        }
        setProductOrders(response.data || []);
        setTotalPages(response.totalPages);
        setCurrentPage(response.currentPage);
        setTotalCount(response.totalCount || 0);

        // If we're on a page beyond the available pages, reset to page 1
        if (response.currentPage > response.totalPages && response.totalPages > 0) {
          setCurrentPage(1);
          // Recursively call with page 1 if we're beyond available pages
          if (effectivePage !== 1) {
            fetchProductOrders(1, effectiveLimit, effectiveFilters, unassignedFilter);
            return;
          }
        }
      } catch (err: any) {
        console.error("Failed to fetch subscriptions:", err);
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          "Failed to fetch subscriptions.";
        toast.error(errorMessage);
        setProductOrders([]); // Ensure productOrders is an empty array on error
      } finally {
        setIsLoading(false);
      }
    },
    [currentPage, limit, filters, currentUserRole, currentSupervisorAgencyId, showUnassignedOnly]
  );

  const fetchAgencies = useCallback(async () => {
    setIsLoadingAgencies(true);
    try {
      const response = await get("/agencies"); // Fetch all agencies
      setAgencies(response.data || []);
    } catch (err: any) {
      // Added type for err
      console.error("Failed to fetch agencies:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to load delivery agents.";
      toast.error(errorMessage); // Use Sonner toast for errors
      setAgencies([]); // Ensure agencies is an array on error
    } finally {
      setIsLoadingAgencies(false);
    }
  }, []); // No dependencies needed if it's only fetching all agencies

  useEffect(() => {
    // Don't fetch if supervisor info is still loading
    if (currentUserRole === "SUPERVISOR" && isSupervisorInfoLoading) {
      return;
    }
    // Don't fetch if supervisor role but no agency assigned
    if (
      currentUserRole === "SUPERVISOR" &&
      !currentSupervisorAgencyId &&
      !isSupervisorInfoLoading
    ) {
      setProductOrders([]);
      setIsLoading(false);
      return;
    }
    fetchProductOrders(currentPage, limit, filters, showUnassignedOnly);
  }, [
    fetchProductOrders,
    currentPage,
    limit,
    filters,
    currentUserRole,
    currentSupervisorAgencyId,
    isSupervisorInfoLoading,
    showUnassignedOnly,
  ]); // fetchProductOrders is memoized, so this runs on mount and when filters/pagination affecting fetchProductOrders change

  // Fetch agencies once on mount, or when assign agent modal is opened (as per previous logic)
  // For simplicity here, fetching once on mount. Can be refined if agencies list is very dynamic or large.
  useEffect(() => {
    fetchAgencies();
  }, [fetchAgencies]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchProductOrders(newPage, limit, filters, showUnassignedOnly);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setCurrentPage(1); // Reset to page 1 when limit changes
    fetchProductOrders(1, newLimit, filters, showUnassignedOnly);
  };

  const handleFilterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFilters((prevFilters) => ({
      ...prevFilters,
      [name]: value,
    }));
  };

  const handleFilterSubmit = (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    setCurrentPage(1); // Reset to page 1 on new filter submission
    fetchProductOrders(1, limit, filters, showUnassignedOnly);
  };

  // Clear a specific filter or all filters
  const clearFilter = (filterName?: string) => {
    if (filterName) {
      const newFilterValue = filterName === "paymentStatus" ? "ALL" : "";
      setFilters((prev) => ({ ...prev, [filterName]: newFilterValue }));
    } else {
      // Reset all filters to initial state
      setFilters({
        searchTerm: "",
        memberName: "",
        subscriptionDate: "",
        paymentStatus: "ALL", // Default to 'ALL'
        deliveryStatus: "",
        agencyId: "",
        productId: "",
      });
    }
    // Optionally, re-fetch immediately or wait for explicit submit
    // For now, let's re-fetch immediately for a better UX
    setCurrentPage(1);
    // Need to pass the updated filters directly to fetchSubscriptions if setFilters is async
    // Or rely on useEffect triggered by filters change if fetchSubscriptions is in its deps
    // For simplicity, let's assume the state update is quick enough or handleFilterSubmit is called after this.
  };

  const handlePaymentDetailsUpdate = async (updatedDetails: {
    orderId: string;
    paymentMode?: string;
    paymentReference?: string;
    paymentDate?: string;
    paymentStatus?: string;
    receivedAmount?: number;
  }): Promise<boolean> => {
    if (!selectedOrder) {
      toast.error("No order selected for update.");
      return false;
    }

    const { orderId, ...payload } = updatedDetails;

    try {
      // Use selectedOrder.id for the API call, which is the reliable source.
      await put(`/product-orders/${selectedOrder.id}/payment`, payload);
      toast.success("Payment updated successfully!");
      fetchProductOrders(currentPage, limit, filters, showUnassignedOnly); // Refresh the list
      return true;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "Failed to update payment.";
      toast.error(errorMessage);
      console.error("Error updating payment:", error);
      return false;
    }
  };

  const handleOrderAgentAssignmentUpdate = async (updatedDetails: {
    orderId: string;
    agencyId?: number | null;
    deliveryInstructions?: string;
  }) => {
    if (!selectedOrderForAgent) return;

    const { orderId, agencyId, deliveryInstructions } = updatedDetails;
    const apiPayload = {
      agencyId: agencyId === undefined ? null : Number(agencyId),
      deliveryInstructions,
    };

    console.log("handleOrderAgentAssignmentUpdate - API call:", {
      orderId,
      orderNo: selectedOrderForAgent.orderNo,
      subscriptionsCount: selectedOrderForAgent.subscriptions.length,
      apiPayload,
      endpoint: `/product-orders/${orderId}/assign-agent`,
    });

    try {
      const response = await put(
        `/product-orders/${orderId}/assign-agent`,
        apiPayload
      );
      console.log("handleOrderAgentAssignmentUpdate - API response:", response);
      toast.success(`Agent assigned to all ${selectedOrderForAgent.subscriptions.length} subscription(s) in order ${selectedOrderForAgent.orderNo}!`);
      fetchProductOrders(currentPage, limit, filters, showUnassignedOnly); // Refresh list to show updated agent
    } catch (error) {
      console.error("Error assigning agent to order - Full error:", error);
      toast.error("Failed to update order subscriptions.");
    }
  };

  const handleOpenPaymentModal = (order: ProductOrder | null) => {
    if (order) {
      setSelectedOrder(order);
      setIsPaymentModalOpen(true);
    }
  };

  const handleOpenAssignAgentModal = (order: ProductOrder | null) => {
    if (order) {
      setSelectedOrderForAgent(order);
      setIsAssignAgentModalOpen(true);
      fetchAgencies();
    }
  };

  const handleOpenBulkAssignModal = () => {
    setIsBulkAssignModalOpen(true);
    fetchAgencies();
  };

  const handleBulkAssignAgency = async (
    subscriptionIds: number[],
    agencyId: number | null
  ) => {
    try {
      await post("/subscriptions/bulk-assign-agency", {
        subscriptionIds,
        agencyId,
      });

      toast.success(
        `Successfully assigned agency to ${subscriptionIds.length} subscription(s)`
      );
      fetchProductOrders(currentPage, limit, filters, showUnassignedOnly); // Refresh the list to show updated assignments
    } catch (error) {
      console.error("Bulk agency assignment failed:", error);
      toast.error("Failed to assign agencies. Please try again.");
      throw error; // Re-throw to let the modal handle it
    }
  };

  const handleDownloadInvoice = async (order: ProductOrder) => {
    // Check if this invoice is already being downloaded
    if (downloadingInvoices.has(order.id)) {
      return;
    }

    // Add order ID to downloading set
    setDownloadingInvoices((prev) => new Set(prev).add(order.id));

    try {
      // Check if invoice path is already available in the order data
      if (order.invoicePath) {
        // If invoice path exists, download using forced download approach
        const baseUrl =
          import.meta.env.VITE_BACKEND_URL || "https://snf.3.7.237.251.sslip.io";
        const invoiceUrl = `${baseUrl}/invoices/${order.invoicePath}`;

        // Fetch the file as blob to force download
        const response = await fetch(invoiceUrl);
        if (!response.ok) throw new Error("Download failed");

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        // Create a temporary anchor element for download
        const link = document.createElement("a");
        link.href = url;
        link.download = `invoice-${order.invoiceNo || order.orderNo}.pdf`;
        document.body.appendChild(link);
        link.click();

        // Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success(
          `Invoice for order ${order.orderNo} downloaded successfully`
        );
      } else {
        // If no invoice path in order data, try to generate/fetch invoice
        // For now, we'll show an informative message since the backend endpoint may not be ready
        toast.info(
          "Invoice generation is not yet available. Please check back later or contact support."
        );
      }
    } catch (error: any) {
      console.error("Failed to download invoice:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to download invoice. Please try again.";
      toast.error(errorMessage);
      // Fallback to opening in new tab if download fails
      if (order.invoicePath) {
        const baseUrl =
          import.meta.env.VITE_BACKEND_URL || "https://snf.3.7.237.251.sslip.io";
        const invoiceUrl = `${baseUrl}/invoices/${order.invoicePath}`;
        window.open(invoiceUrl, "_blank");
      }
    } finally {
      // Remove order ID from downloading set
      setDownloadingInvoices((prev) => {
        const newSet = new Set(prev);
        newSet.delete(order.id);
        return newSet;
      });
    }
  };

  const formatWeekdayToShort = (day: string): string => {
    const dayMap: Record<string, string> = {
      MONDAY: "Mon",
      TUESDAY: "Tue",
      WEDNESDAY: "Wed",
      THURSDAY: "Thu",
      FRIDAY: "Fri",
      SATURDAY: "Sat",
      SUNDAY: "Sun",
    };
    return dayMap[day.toUpperCase()] || day;
  };

  // Utility function to truncate delivery instructions
  const truncateText = (
    text: string | null | undefined,
    maxLength: number = 50
  ): string => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const formatDeliverySchedule = (
    schedule: string,
    weekdays?: string | null
  ): {
    scheduleType: string;
    weekdaysArray: string[];
    isSpecificDays: boolean;
  } => {
    const scheduleType = schedule
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
    let weekdaysArray: string[] = [];
    let isSpecificDays = false;

    if (
      schedule === "WEEKDAYS" ||
      schedule === "SELECT_DAYS" ||
      schedule === "VARYING"
    ) {
      isSpecificDays = true;
      if (weekdays) {
        try {
          const parsedDays = JSON.parse(weekdays);
          if (Array.isArray(parsedDays) && parsedDays.length > 0) {
            weekdaysArray = parsedDays.map((day) =>
              day.toString().toUpperCase()
            );
          }
        } catch (e) {
          console.error("Error parsing weekdays JSON:", weekdays, e);
        }
      }
    }

    return { scheduleType, weekdaysArray, isSpecificDays };
  };

  const renderSkeletons = (numColumns = 12) => {
    const skeletonRows = [];
    for (let i = 0; i < limit; i++) {
      const cells = [];
      for (let j = 0; j < numColumns; j++) {
        // Make the last skeleton cell narrower for the 'Actions' button column
        const widthClass = j === numColumns - 1 ? "w-[80px]" : "w-full";
        cells.push(
          <TableCell key={`skeleton-cell-${i}-${j}`}>
            <Skeleton className={`h-4 ${widthClass}`} />
          </TableCell>
        );
      }
      skeletonRows.push(<TableRow key={`skeleton-row-${i}`}>{cells}</TableRow>);
    }
    return skeletonRows;
  };
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex flex-wrap justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin - Subscriptions Management</h1>
        <div className="flex flex-wrap gap-2 mt-2">
          <Button
            variant={showUnassignedOnly ? "default" : "outline"}
            onClick={() => {
              setShowUnassignedOnly(!showUnassignedOnly);
              setCurrentPage(1); // Reset to page 1 when toggling filter
            }}
            className="flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            {showUnassignedOnly ? "Show All" : "Unassigned Only"}
          </Button>

          {/* Expiry Status Filter */}
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-gray-500" />
            <Select
              value={filters.expiryStatus || "ALL"}
              onValueChange={(value) => {
                setFilters(prev => ({ ...prev, expiryStatus: value }));
                setCurrentPage(1); // Reset to page 1 when changing filter
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Expiry Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="NOT_EXPIRED">Not Expired</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleOpenBulkAssignModal}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Bulk Assign Agencies
          </Button>
        </div>
      </div>

      {/* <Button 
        variant="outline"
        className="mb-4"
        onClick={() => setShowFilters(!showFilters)}
      >
        {showFilters ? 'Hide Filters' : 'Show Filters'}
      </Button> */}

      {false && showFilters && (
        <div className="mb-6 p-4 border rounded-lg bg-slate-50 dark:bg-slate-800 shadow">
          <h2 className="text-xl font-semibold mb-4">Filters</h2>
          <form onSubmit={handleFilterSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
              {/* Member name search */}
              <div className="relative">
                <Label
                  htmlFor="memberName"
                  className="text-sm font-medium mb-2"
                >
                  Member Name
                </Label>
                <div className="relative">
                  <UserIcon className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    id="memberName"
                    placeholder="Search by member name"
                    name="memberName"
                    className="pl-8"
                    value={filters.memberName || ""}
                    onChange={handleFilterChange}
                  />
                </div>
              </div>

              {/* Subscription date filter */}
              <div className="relative">
                <Label
                  htmlFor="subscriptionDate"
                  className="text-sm font-medium mb-2"
                >
                  Subscription Date
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    id="subscriptionDate"
                    type="date"
                    name="subscriptionDate"
                    className="pl-8"
                    value={filters.subscriptionDate || ""}
                    onChange={handleFilterChange}
                  />
                </div>
              </div>

              {/* Payment status filter */}
              <div>
                <Label
                  htmlFor="paymentStatus"
                  className="text-sm font-medium mb-2"
                >
                  Payment Status
                </Label>
                <Select
                  name="paymentStatus"
                  value={filters.paymentStatus || ""}
                  onValueChange={(value) =>
                    handleFilterChange({
                      target: { name: "paymentStatus", value },
                    } as React.ChangeEvent<HTMLSelectElement>)
                  }
                >
                  <SelectTrigger id="paymentStatus">
                    <SelectValue placeholder="Payment Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    {/* <SelectItem value="PENDING">Pending</SelectItem> */}
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                type="submit"
                className="bg-secondary hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
              >
                Apply Filters
              </Button>

              <Button
                type="button"
                onClick={() => clearFilter()}
                variant="outline"
                className="border-gray-300"
              >
                Clear All Filters
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="mb-4 flex flex-wrap justify-between items-center">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {!isLoading && totalCount > 0 && (
            <>
              Showing {((currentPage - 1) * limit) + 1}-{Math.min(currentPage * limit, totalCount)} of {totalCount} orders
              {showUnassignedOnly && " (unassigned only)"}
              {filters.expiryStatus === "EXPIRED" && " (expired only)"}
              {filters.expiryStatus === "NOT_EXPIRED" && " (not expired)"}
              {filters.expiryStatus === "ALL" && " (all records)"}
            </>
          )}
        </span>
        <div className="flex flex-wrap items-center space-x-2 mt-2">
          <span className="text-sm">Items per page:</span>
          <Select
            value={limit.toString()}
            onValueChange={(value) => handleLimitChange(Number(value))}
          >
            <SelectTrigger className="w-20">
              <SelectValue placeholder={limit.toString()} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-transparent">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: limit }).map((_, i) => (
              <div key={`skeleton-${i}`} className="bg-white rounded-xl border shadow-sm p-6">
                <div className="space-y-4">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))
          ) : productOrders.length > 0 ? (
            productOrders.map((order) => {
              const firstSub = order.subscriptions?.[0];
              
              // Check if order is expired
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const isExpired = order.subscriptions.some(sub => {
                if (!sub.expiryDate) return false;
                const expiryDate = new Date(sub.expiryDate);
                expiryDate.setHours(0, 0, 0, 0);
                return expiryDate < today;
              });
              
              // Check if order is cancelled
              const isCancelled = order.paymentStatus === 'CANCELLED' || order.subscriptions.some(sub => sub.paymentStatus === 'CANCELLED');

              return (
                <div
                  key={order.id}
                  className={`rounded-xl border shadow-sm hover:shadow-md transition-shadow p-6 ${
                    isCancelled
                      ? 'opacity-60 bg-gray-50 border-gray-300'
                      : isExpired
                        ? 'bg-red-50 border-red-200 opacity-75'
                        : 'bg-white'
                    }`}
                >
                  <div className="space-y-4">
                    {/* Member Information */}
                    <div className="border-b pb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-gray-100 border-2 border-dashed rounded-xl w-10 h-10 flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <div>
                          <div className={`font-medium flex items-center gap-2 ${
                            isCancelled
                              ? 'line-through text-gray-500'
                              : isExpired
                                ? 'text-red-700'
                                : 'text-gray-900'
                            }`}>
                            {order.member?.user?.name || "N/A"}
                            {isCancelled && (
                              <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full font-normal">
                                CANCELLED
                              </span>
                            )}
                            {isExpired && !isCancelled && (
                              <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full font-normal">
                                EXPIRED
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 mt-1 text-xs text-gray-500">
                            <div className="flex items-center gap-1.5">
                              <PhoneIcon className="h-3.5 w-3.5" />
                              <span>
                                {order?.member?.user?.mobile || "N/A"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MailIcon className="h-3.5 w-3.5" />
                              <span className="truncate max-w-[120px]">
                                {order.member?.user?.email || "N/A"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Subscription Details */}
                    <div>
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-1.5">
                          {order.subscriptions.map((sub: Subscription) => (
                            <div
                              key={sub.id}
                              className={`px-2.5 py-1 rounded-full flex items-center gap-1.5 text-xs ${
                                sub.paymentStatus === 'CANCELLED' 
                                  ? 'line-through opacity-60 bg-gray-100 text-gray-500'
                                  : isExpired
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-blue-50 text-blue-700'
                                }`}
                            >
                              <PackageIcon className="h-3.5 w-3.5" />
                              <span className="font-medium">
                                {sub.product?.name}
                              </span>
                              <span>
                                {sub.deliverySchedule === "ALTERNATE_DAYS"
                                  ? `×${sub.qty}/${sub.altQty ?? "-"}`
                                  : `×${sub.qty}`}
                              </span>
                              <span className="text-blue-600">
                                {sub.depotProductVariant?.name || ""}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 text-sm mt-1">
                          <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                            <ShoppingCartIcon className="h-4 w-4 text-gray-500" />
                            <span>
                              {order.subscriptions.length} item
                              {order.subscriptions.length > 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 font-medium">
                            <IndianRupeeIcon className="h-4 w-4" />
                            <span>{(order.payableamt || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Delivery Schedule */}
                    <div>
                      <h3 className={`text-sm font-semibold mb-2 ${isExpired ? 'text-red-700' : 'text-gray-700'}`}>
                        Delivery Schedule
                        {isExpired && (
                          <span className="ml-2 text-xs text-red-600 font-normal">(Expired)</span>
                        )}
                      </h3>
                      <div className="flex flex-col gap-1.5">
                        {order.subscriptions.map((sub: Subscription) => {
                          const { weekdaysArray, isSpecificDays } =
                            formatDeliverySchedule(
                              sub.deliverySchedule,
                              sub.weekdays
                            );
                          const scheduleLabel =
                            sub.deliverySchedule === "DAILY"
                              ? "Daily"
                              : sub.deliverySchedule === "WEEKDAYS"
                                ? "Weekdays Only"
                                : sub.deliverySchedule === "WEEKENDS"
                                  ? "Weekends"
                                  : sub.deliverySchedule === "ALTERNATE_DAYS"
                                    ? "Alternate_days"
                                    : sub.deliverySchedule === "DAY1_DAY2"
                                      ? "Daily (Varying Qty)"
                                      : "Custom";

                          const periodtolabel = {
                            "1": "Buy Once",
                            "3": "Trial Pack",
                            "7": "Mid Saver Pack",
                            "15": "Mid Saver Pack",
                            "30": "Super Saver Pack",
                          };
                          return (
                            <div key={sub.id} className="text-sm">
                              <div className="font-medium text-gray-700 mb-1">{`${scheduleLabel} - ${periodtolabel[sub.period]
                                }`}</div>

                              {/* Alternate Days Display - Alternate_days (1,3,5,7...) */}
                              {sub.deliverySchedule === "ALTERNATE_DAYS" &&
                                (sub.qty || sub.altQty) ? (
                                <div className="flex items-center gap-2 text-xs">
                                  <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 bg-secondary rounded-full"></div>
                                    <span className="text-blue-700 font-medium">
                                      {sub.qty} -{" "}
                                      {sub.depotProductVariant?.name ||
                                        "units"}
                                    </span>
                                  </div>
                                  <span className="text-gray-400">•</span>
                                  <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                                    <span className="text-green-700 font-medium">
                                      {sub.altQty} -{" "}
                                      {sub.depotProductVariant?.name ||
                                        "units"}
                                    </span>
                                  </div>
                                  <span className="text-gray-400 text-xs italic ml-1">
                                    skip day pattern
                                  </span>
                                </div>
                              ) : sub.deliverySchedule === "DAY1_DAY2" &&
                                (sub.qty || sub.altQty) ? (
                                /* Day1-Day2 Display - Daily with varying quantities */
                                <div className="flex items-center gap-2 text-xs">
                                  <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 bg-secondary rounded-full"></div>
                                    <span className="text-blue-700 font-medium">
                                      {sub.qty} -{" "}
                                      {sub.depotProductVariant?.name ||
                                        "units"}
                                    </span>
                                  </div>
                                  <span className="text-gray-400">•</span>
                                  <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                                    <span className="text-green-700 font-medium">
                                      {sub.altQty} -{" "}
                                      {sub.depotProductVariant?.name ||
                                        "units"}
                                    </span>
                                  </div>
                                  <span className="text-gray-400 text-xs italic ml-1">
                                    daily rotation
                                  </span>
                                </div>
                              ) : (
                                /* Regular Schedule Display */
                                sub.qty && (
                                  <div className="text-xs text-gray-600">
                                    {sub.qty} -{" "}
                                    {sub.depotProductVariant?.name || "units"}
                                    {sub.deliverySchedule === "DAILY"
                                      ? " daily"
                                      : sub.deliverySchedule === "WEEKDAYS"
                                        ? " on weekdays"
                                        : sub.deliverySchedule === "WEEKENDS"
                                          ? " on weekends"
                                          : " per delivery"}
                                  </div>
                                )
                              )}

                              {/* Compact Days Display for Custom Schedules */}
                              {isSpecificDays && weekdaysArray.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {weekdaysArray.map((day, idx) => (
                                    <span
                                      key={idx}
                                      className="px-1.5 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700"
                                    >
                                      {formatWeekdayToShort(day)}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Payment Status */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">Payment Status</h3>
                      <div className="flex flex-col gap-1">
                        <div
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            order.paymentStatus === "PAID"
                              ? isExpired ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                              : order.paymentStatus === "PENDING"
                                ? isExpired ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                                : order.paymentStatus === "CANCELLED"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-red-100 text-red-800"
                            } ${order.paymentStatus === 'CANCELLED' ? 'line-through' : ''
                            }`}
                        >
                          {order.paymentStatus}
                        </div>
                        {console.log(
                          "order",
                          order?.subscriptions?.[0]?.deliveryAddressId
                        )}
                        <p>
                          {order?.subscriptions?.[0]?.deliveryAddressId
                            ? "Home Delivery"
                            : "Store Pickup"}
                        </p>
                        <div className={`text-xs mt-1 ${isExpired ? 'text-red-600' : 'text-gray-500'}`}>
                          {isExpired && !isCancelled
                            ? "Subscription expired"
                            : order.paymentStatus === "PAID"
                              ? "Payment completed"
                              : order.paymentStatus === "PENDING"
                                ? "Processing payment"
                                : "Payment required"}
                        </div>

                        {/* Delivery Instructions */}
                        {firstSub?.deliveryInstructions && (
                          <div className="mt-2 border-t pt-2">
                            <div className="flex items-start gap-1.5">
                              <MessageSquare className="h-3.5 w-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="text-xs text-gray-600 cursor-help">
                                      {truncateText(
                                        firstSub.deliveryInstructions,
                                        40
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="left"
                                    className="max-w-xs"
                                  >
                                    <p className="whitespace-pre-wrap">
                                      {firstSub.deliveryInstructions}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Dates */}
                    <div>
                      <h3 className={`text-sm font-semibold mb-2 ${isExpired ? 'text-red-700' : 'text-gray-700'}`}>Subscription Dates</h3>
                      {firstSub ? (
                        <div className="flex flex-col gap-1 text-sm">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className={`h-4 w-4 flex-shrink-0 ${isExpired ? 'text-red-500' : 'text-gray-500'}`} />
                            <div className="flex flex-col">
                              <span className={`text-xs ${isExpired ? 'text-red-500' : 'text-gray-500'}`}>
                                Start
                              </span>
                              <span className={isExpired ? 'text-red-700' : ''}>
                                {format(
                                  new Date(firstSub.startDate),
                                  "dd MMM yyyy"
                                )}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <CalendarCheckIcon className={`h-4 w-4 flex-shrink-0 ${isExpired ? 'text-red-500' : 'text-gray-500'}`} />
                            <div className="flex flex-col">
                              <span className={`text-xs ${isExpired ? 'text-red-500' : 'text-gray-500'}`}>
                                End Date
                              </span>
                              <span className={isExpired ? 'text-red-700 font-medium' : ''}>
                                {firstSub.expiryDate
                                  ? format(
                                    new Date(firstSub.expiryDate),
                                    "dd MMM yyyy"
                                  )
                                  : "N/A"}
                                {isExpired && (
                                  <span className="ml-2 text-xs text-red-600">(Expired)</span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">
                          No subscription
                        </span>
                      )}
                    </div>

                    {/* Assigned Agent */}
                    <div>
                      <h3 className={`text-sm font-semibold mb-2 ${isExpired ? 'text-red-700' : 'text-gray-700'}`}>Assigned Agent</h3>
                      <div className="flex items-center gap-2">
                        <div className={`rounded-full p-1.5 ${isExpired ? 'bg-red-100' : 'bg-gray-100'}`}>
                          <UserCheckIcon className={`h-4 w-4 ${isExpired ? 'text-red-500' : 'text-gray-500'}`} />
                        </div>
                        <span className={`text-sm ${isExpired ? 'text-red-700' : ''}`}>
                          {firstSub?.agency?.user?.name ||
                            firstSub?.agency?.name || (
                              <span className={isExpired ? 'text-red-400' : 'text-gray-400'}>
                                Unassigned
                              </span>
                            )}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div>
                      <h3 className={`text-sm font-semibold mb-2 ${isExpired ? 'text-red-700' : 'text-gray-700'}`}>Actions</h3>
                      {isCancelled ? (
                        <div className="flex items-center justify-center p-4 bg-gray-100 rounded-md">
                          <span className="text-sm text-gray-500 font-medium">
                            Order has been cancelled - No actions available
                          </span>
                        </div>
                      ) : isExpired ? (
                        <div className="flex items-center justify-center p-4 bg-red-100 rounded-md">
                          <span className="text-sm text-red-700 font-medium">
                            Subscription has expired - Limited actions available
                          </span>
                        </div>
                      ) : (
                        <div className="flex justify-start gap-1.5">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className={`h-8 w-8 rounded-full ${
                                    isExpired 
                                      ? 'bg-red-50 hover:bg-red-100 border-red-200' 
                                      : 'bg-white hover:bg-gray-50'
                                  }`}
                                  onClick={() => handleOpenPaymentModal(order)}
                                  disabled={order.paymentStatus === "PAID" || isExpired}
                                >
                                  <PackageIcon className={`h-4 w-4 ${isExpired ? 'text-red-400' : ''}`} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p>
                                  {isExpired 
                                    ? "Cannot update payment for expired subscription"
                                    : "Update Payment"}
                                </p>
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className={`h-8 w-8 rounded-full ${
                                    isExpired 
                                      ? 'bg-red-50 hover:bg-red-100 border-red-200' 
                                      : 'bg-white hover:bg-gray-50'
                                  }`}
                                  onClick={() =>
                                    handleOpenAssignAgentModal(order)
                                  }
                                  disabled={order.paymentStatus !== "PAID" || isExpired}
                                >
                                  <UserPlus className={`h-4 w-4 ${isExpired ? 'text-red-400' : ''}`} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p>
                                  {isExpired
                                    ? "Cannot assign agent to expired subscription"
                                    : order.paymentStatus !== "PAID"
                                      ? "Complete payment first"
                                      : order.subscriptions.some(sub => sub.agencyId)
                                        ? "Update Agent Assignment (Future Deliveries Only)"
                                        : "Assign Agent to Order (Future Deliveries Only)"}
                                </p>
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className={`h-8 w-8 rounded-full ${
                                    isExpired 
                                      ? 'bg-red-50 hover:bg-red-100 border-red-200' 
                                      : 'bg-white hover:bg-gray-50'
                                  }`}
                                  onClick={() => handleDownloadInvoice(order)}
                                  disabled={downloadingInvoices.has(order.id)}
                                >
                                  {downloadingInvoices.has(order.id) ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                                  ) : (
                                    <Download className={`h-4 w-4 ${isExpired ? 'text-red-400' : ''}`} />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p>
                                  {downloadingInvoices.has(order.id)
                                    ? "Downloading..."
                                    : isExpired
                                      ? "Download Invoice (Expired Subscription)"
                                      : order.paymentStatus !== "PAID"
                                        ? "Invoice available after payment"
                                        : "Download Invoice"}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            // Empty state
            <div className="md:col-span-2 flex items-center justify-center p-12">
              <div className="flex flex-col items-center justify-center gap-3">
                <PackageIcon className="h-10 w-10 text-gray-300" />
                <div className="text-gray-600">No subscriptions found</div>
                <div className="text-sm text-gray-500 mt-1">
                  Start by creating a new subscription
                </div>
              </div>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-6 flex justify-center items-center space-x-2">
            <Button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              variant="outline"
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              variant="outline"
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {selectedOrder && (
        <PaymentUpdateModal
          isOpen={isPaymentModalOpen}
          onOpenChange={setIsPaymentModalOpen}
          order={selectedOrder}
          onUpdateOrder={handlePaymentDetailsUpdate}
        />
      )}
      {selectedOrderForAgent && (
        <AssignAgentModal
          isOpen={isAssignAgentModalOpen}
          onOpenChange={setIsAssignAgentModalOpen}
          order={selectedOrderForAgent}
          agencies={agencies}
          isLoadingAgencies={isLoadingAgencies}
          onUpdateOrderSubscriptions={handleOrderAgentAssignmentUpdate}
        />
      )}

      <BulkAgencyAssignmentModal
        isOpen={isBulkAssignModalOpen}
        onOpenChange={setIsBulkAssignModalOpen}
        subscriptions={productOrders.flatMap((order) => order.subscriptions)}
        agencies={agencies}
        isLoadingAgencies={isLoadingAgencies}
        onBulkUpdateSubscriptions={handleBulkAssignAgency}
      />
      {/* <Toaster richColors position="top-right" /> */}
    </div>
  );
};

export default AdminSubscriptionList;
