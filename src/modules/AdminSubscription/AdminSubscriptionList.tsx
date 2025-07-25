import React, { useEffect, useState, useCallback } from 'react';
import { get, put, post } from '@/services/apiService'; // Assuming you have a configured apiService
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { X, UserPlus, UserIcon, PhoneIcon, MailIcon, PackageIcon, ShoppingCartIcon, IndianRupeeIcon, CalendarIcon, CalendarCheckIcon, UserCheckIcon, Calendar, Users, Download } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from "sonner"; // Using Sonner for toasts
import { BulkAgencyAssignmentModal } from './components/BulkAgencyAssignmentModal';

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
  const [paymentMode, setPaymentMode] = useState<string>('');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [paymentStatusState, setPaymentStatusState] = useState<string>('');
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [receivedAmount, setReceivedAmount] = useState<string>('');
  const [payableAmount, setPayableAmount] = useState<string>('');

  const isPaymentSectionDisabled = order?.paymentStatus === 'PAID';

  useEffect(() => {
    if (order) {
      console.log("Payment Modal Data:", {
        orderId: order.id,
        totalAmount: order.totalAmount,
        walletamt: order.walletamt,
        payableamt: order.payableamt,
        currentStatus: order.paymentStatus
      });
      setPaymentMode(order.paymentMode || '');
      setPaymentReference(order.paymentReferenceNo || '');
      setPaymentDate(order.paymentDate ? format(new Date(order.paymentDate), 'yyyy-MM-dd') : '');
      setPaymentStatusState(order.paymentStatus || '');
      // Use order-level payableamt (remaining amount after wallet deduction)
      setPayableAmount(order.payableamt?.toString() || '0');
      setReceivedAmount(order.payableamt?.toString() || '0');
    } else {
      setPaymentMode('');
      setPaymentReference('');
      setPaymentDate('');
      setPaymentStatusState('');
      setPayableAmount('');
      setReceivedAmount('');
    }
  }, [order]);

  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    if (!paymentStatusState) {
      errors.paymentStatus = 'Payment status is required';
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
    console.log("payable", payable, "total", total)

    if (paymentStatusState === "PAID") {
      // Allow received to match payableamt (the actual amount owed after wallet deduction)
      // or totalAmount if payableamt is 0 (workaround for old orders)
      const isValidAmount = (received === payable) || (payable === 0 && received === total);
      if (!isValidAmount) {
        const expectedAmount = (payable === 0 && total > 0) ? total : payable;
        toast.error(`Received amount (₹${received.toFixed(2)}) must equal the payable amount (₹${expectedAmount.toFixed(2)}) to mark as PAID.`);
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
      console.error('Failed to update payment:', error);
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
        <DialogClose className="absolute right-4 top-4 z-10" onClick={() => onOpenChange(false)}>
          <X className="h-4 w-4" />
        </DialogClose>

        <div className="grid gap-6 py-4">
          <fieldset disabled={isPaymentSectionDisabled} className="grid gap-4 border p-4 rounded-md">
            <legend className="text-sm font-medium px-1">Payment Information {isPaymentSectionDisabled ? `(Status: ${order.paymentStatus} - Disabled)` : ""}</legend>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="paymentMode" className="text-right col-span-1">Payment Mode <span className="text-red-500">*</span></Label>
              <Select
                value={paymentMode}
                onValueChange={(value) => setPaymentMode(value)}
                disabled={isPaymentSectionDisabled}
              >
                <SelectTrigger id="paymentMode" className="col-span-3 mt-1">
                  <SelectValue placeholder="Select payment mode" />
                </SelectTrigger>
                <SelectContent>
                  {paymentModeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payment-reference" className="text-right col-span-1">Reference #</Label>
              <Input id="payment-reference" value={paymentReference} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentReference(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payment-date" className="text-right col-span-1">Payment Date</Label>
              <Input
                type="date"
                id="payment-date"
                value={paymentDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentDate(e.target.value)}
                className="col-span-3"
              />
            </div>
            {/* Add this section after the "Payment Date" input */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payable-amount" className="text-right col-span-1">Payable Amount</Label>
              <div className="col-span-3 flex items-center gap-2">
                <IndianRupeeIcon className="h-4 w-4 text-gray-500" />
                <span id="payable-amount" className="font-semibold">{payableAmount}</span>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="received-amount" className="text-right col-span-1">Received Amount <span className="text-red-500">*</span></Label>
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
              <Label className="text-right col-span-1" htmlFor="payment-status-modal">
                Status <span className="text-red-500">*</span>
              </Label>
              <div className="col-span-3 flex flex-col gap-1">
                <Select value={paymentStatusState} onValueChange={(value) => {
                  setPaymentStatusState(value);
                  if (value) {
                    const newErrors = { ...formErrors };
                    delete newErrors.paymentStatus;
                    setFormErrors(newErrors);
                  }
                }}>
                  <SelectTrigger id="payment-status-modal" className={formErrors.paymentStatus ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* <SelectItem value="PENDING">Pending</SelectItem> */}
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.paymentStatus && (
                  <p className="text-xs text-red-500">{formErrors.paymentStatus}</p>
                )}
              </div>
            </div>
          </fieldset>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPaymentSectionDisabled}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// --- AssignAgentModal Component Definition ---
interface AssignAgentModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  subscription: Subscription | null;
  agencies: Agency[];
  isLoadingAgencies: boolean;
  onUpdateSubscription: (updatedDetails: {
    subscriptionId: number;
    agencyId?: number | null;
  }) => Promise<void>;
}

const AssignAgentModal: React.FC<AssignAgentModalProps> = ({
  isOpen,
  onOpenChange,
  subscription,
  agencies,
  isLoadingAgencies,
  onUpdateSubscription,
}) => {
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>('NONE');

  useEffect(() => {
    if (subscription) {
      setSelectedAgencyId(subscription.agencyId?.toString() || 'NONE');
    } else {
      setSelectedAgencyId('NONE');
    }
  }, [subscription]);

  const handleSubmit = async () => {
    if (!subscription) return;

    const updatedDetails = {
      subscriptionId: subscription.id,
      agencyId: selectedAgencyId !== 'NONE' ? parseInt(selectedAgencyId, 10) : null,
    };

    try {
      await onUpdateSubscription(updatedDetails);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update subscription in modal:', error);
    }
  };

  if (!isOpen || !subscription) return null;

  // Format delivery schedule in a user-friendly way
  const formatDeliverySchedule = (schedule: string, weekdays?: string | null) => {
    switch (schedule) {
      case 'DAILY':
        return 'Daily';
      case 'WEEKDAYS':
        return 'Weekdays (Mon-Fri)';
      case 'ALTERNATE_DAYS':
        return 'Alternate Days';
      case 'SELECT_DAYS':
        try {
          if (weekdays) {
            const days = JSON.parse(weekdays);
            return `Selected Days: ${days.join(', ')}`;
          }
          return 'Selected Days';
        } catch {
          return 'Selected Days';
        }
      case 'VARYING':
        return 'Varying Schedule';
      default:
        return schedule;
    }
  };

  // Format date to a more readable format
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign Agent for: {subscription.product.name}</DialogTitle>
          <DialogDescription>
            Subscription for {subscription.member?.user?.name || 'Unknown Member'}
          </DialogDescription>
        </DialogHeader>
        <DialogClose className="absolute right-4 top-4 z-10" onClick={() => onOpenChange(false)}>
          <X className="h-4 w-4" />
        </DialogClose>

        <div className="grid gap-6 py-4 px-1 overflow-y-auto flex-grow">
          {/* Subscription Details Section */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium mb-2">Subscription Details</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500">Product</p>
                <p className="font-medium">{subscription.product.name}</p>
              </div>
              <div>
                <p className="text-gray-500">Quantity</p>
                <p className="font-medium">
                  {subscription.deliverySchedule === 'ALTERNATE_DAYS'
                    ? `${subscription.qty} / ${subscription.altQty ?? '-'}`
                    : subscription.qty}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Delivery Schedule</p>
                <p className="font-medium">{formatDeliverySchedule(subscription.deliverySchedule, subscription.weekdays)}</p>
              </div>
              <div>
                <p className="text-gray-500">Start Date</p>
                <p className="font-medium">{formatDate(subscription.startDate)}</p>
              </div>
              <div>
                <p className="text-gray-500">Expiry Date</p>
                <p className="font-medium">{formatDate(subscription.expiryDate)}</p>
              </div>
              <div>
                <p className="text-gray-500">Payment Status</p>
                <p className="font-medium">
                  <span className={`inline-block px-2 py-0.5 rounded ${subscription.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' : subscription.paymentStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                    {subscription.paymentStatus}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Delivery Address Section */}
          {subscription.deliveryAddress && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium mb-2">Delivery Address</h3>
              <div className="grid gap-1 text-sm">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{subscription.deliveryAddress.recipientName}</p>
                  {subscription.deliveryAddress.label && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">
                      {subscription.deliveryAddress.label}
                    </span>
                  )}
                </div>
                <p>{subscription.deliveryAddress.plotBuilding}, {subscription.deliveryAddress.streetArea}</p>
                {subscription.deliveryAddress.landmark && <p>{subscription.deliveryAddress.landmark}</p>}
                <p>{subscription.deliveryAddress.city}, {subscription.deliveryAddress.state} - {subscription.deliveryAddress.pincode}</p>
                <p className="text-blue-600">Mobile: {subscription.deliveryAddress.mobile}</p>
              </div>
            </div>
          )}

          {/* Customer Details Section */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium mb-2">Member Details</h3>
            <div className="grid gap-1 text-sm">
              <p><span className="text-gray-500">Name:</span> {subscription.member?.user?.name || 'N/A'}</p>
              <p><span className="text-gray-500">Email:</span> {subscription.member?.user?.email || 'N/A'}</p>
              {subscription.member?.user?.mobile && (
                <p><span className="text-gray-500">Mobile:</span> {subscription.member.user.mobile}</p>
              )}
            </div>
          </div>

          {/* Agent Selection */}
          <fieldset className="grid gap-4 border p-4 rounded-md">
            <legend className="text-sm font-medium px-1">Delivery Agent</legend>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="delivery-agent" className="text-right col-span-1">Agent</Label>
              <Select
                value={selectedAgencyId}
                onValueChange={setSelectedAgencyId}
                disabled={isLoadingAgencies}
              >
                <SelectTrigger id="delivery-agent" className="col-span-3">
                  <SelectValue placeholder={isLoadingAgencies ? "Loading agents..." : "Select agent"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Unassign / Not Assigned</SelectItem>
                  {agencies.map(agent => (
                    <SelectItem key={agent.id} value={agent.id.toString()}>{agent.user?.name || agent.name}</SelectItem>
                  ))}
                  {agencies.length === 0 && !isLoadingAgencies &&
                    <p className="text-sm text-muted-foreground p-2">No agents available.</p>
                  }
                </SelectContent>
              </Select>
            </div>
          </fieldset>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={handleSubmit} disabled={isLoadingAgencies}>
            {isLoadingAgencies ? "Loading..." : "Assign Agent"}
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
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<ProductOrder | null>(null);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAssignAgentModalOpen, setIsAssignAgentModalOpen] = useState(false);
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [isLoadingAgencies, setIsLoadingAgencies] = useState<boolean>(false);
  const [showFilters] = useState<boolean>(false);
  const [showUnassignedOnly, setShowUnassignedOnly] = useState<boolean>(false);
  const [downloadingInvoices, setDownloadingInvoices] = useState<Set<string>>(new Set());

  // User role and supervisor filtering state
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentSupervisorAgencyId, setCurrentSupervisorAgencyId] = useState<string | null>(null);
  const [isSupervisorInfoLoading, setIsSupervisorInfoLoading] = useState(false);

  const [filters, setFilters] = useState<{ [key: string]: string | undefined }>({
    searchTerm: '',
    memberName: '',
    subscriptionDate: '',
    paymentStatus: 'ALL',
    deliveryStatus: '',
    agencyId: '',
    productId: '',
    // Add other filter keys as needed, initialized to empty or default values
  });

  // Get user role from localStorage
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setCurrentUserRole(user.role);

          // If user is a supervisor, get their agency information
          if (user.role === 'SUPERVISOR') {
            setIsSupervisorInfoLoading(true);
            try {
              const supervisorInfo = await get("/users/me");
              console.log("supervisorinfo", supervisorInfo);
              // Get the agency ID from supervisor's assigned agency
              setCurrentSupervisorAgencyId(supervisorInfo?.supervisor?.agencyId ? String(supervisorInfo.supervisor.agencyId) : null);
            } catch (error) {
              console.error("Failed to fetch supervisor info:", error);
              toast.error("Could not load supervisor details.");
              setCurrentSupervisorAgencyId(null);
            }
            setIsSupervisorInfoLoading(false);
          }
        }
      } catch (error) {
        console.error('Failed to parse user data from localStorage', error);
      }
    };
    fetchUserInfo();
  }, []);

  // Fetch product orders instead of subscriptions
  const fetchProductOrders = useCallback(async (page = currentPage, currentLimit = 10, currentFilters = filters) => {
    setIsLoading(true);

    // Determine effective values for pagination and filters, providing fallbacks
    const effectivePage = page !== undefined ? page : (currentPage !== undefined ? currentPage : 1);
    const effectiveLimit = currentLimit !== undefined ? currentLimit : (limit !== undefined ? limit : 10);
    const effectiveFilters = currentFilters || filters || {}; // Ensure filters is an object

    const apiParams: { [key: string]: string } = {};
    for (const [originalKey, originalValueObj] of Object.entries(effectiveFilters)) {
      // Ensure originalValueObj is not null or undefined before calling toString
      if (originalValueObj === null || originalValueObj === undefined) {
        continue;
      }
      const value = String(originalValueObj).trim();

      if (value === '' || value.toLowerCase() === 'all') {
        continue;
      }

      if (originalKey === 'memberName') {
        apiParams['searchTerm'] = value;
      } else if (originalKey === 'subscriptionDate') {
        apiParams['startDate'] = value;
      } else {
        apiParams[originalKey] = value;
      }
    }

    // Add supervisor filtering if user is a supervisor
    if (currentUserRole === 'SUPERVISOR' && currentSupervisorAgencyId) {
      apiParams['supervisorAgencyId'] = currentSupervisorAgencyId;
    }

    const queryParams = new URLSearchParams({
      page: effectivePage.toString(),
      limit: effectiveLimit.toString(),
      ...apiParams
    }).toString();

    try {
      const response: ApiResponse = await get(`/product-orders?${queryParams}`);
      setProductOrders(response.data || []);
      setTotalPages(response.totalPages);
      setCurrentPage(response.currentPage);
    } catch (err: any) {
      console.error('Failed to fetch subscriptions:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch subscriptions.';
      toast.error(errorMessage);
      setProductOrders([]); // Ensure productOrders is an empty array on error
    } finally {
      setIsLoading(false);
  }
  }, [currentPage, limit, filters, currentUserRole, currentSupervisorAgencyId]);

  const fetchAgencies = useCallback(async () => {
    setIsLoadingAgencies(true);
    try {
      const response = await get('/agencies'); // Fetch all agencies
      setAgencies(response.data || []);
    } catch (err: any) { // Added type for err
      console.error('Failed to fetch agencies:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load delivery agents.';
      toast.error(errorMessage); // Use Sonner toast for errors
      setAgencies([]); // Ensure agencies is an array on error
    } finally {
      setIsLoadingAgencies(false);
    }
  }, []); // No dependencies needed if it's only fetching all agencies

  useEffect(() => {
    // Don't fetch if supervisor info is still loading
    if (currentUserRole === 'SUPERVISOR' && isSupervisorInfoLoading) {
      return;
    }
    // Don't fetch if supervisor role but no agency assigned
    if (currentUserRole === 'SUPERVISOR' && !currentSupervisorAgencyId && !isSupervisorInfoLoading) {
      setProductOrders([]);
      setIsLoading(false);
      return;
    }
    fetchProductOrders(currentPage, limit, filters);
  }, [fetchProductOrders, currentPage, limit, filters, currentUserRole, currentSupervisorAgencyId, isSupervisorInfoLoading]); // fetchProductOrders is memoized, so this runs on mount and when filters/pagination affecting fetchProductOrders change

  // Fetch agencies once on mount, or when assign agent modal is opened (as per previous logic)
  // For simplicity here, fetching once on mount. Can be refined if agencies list is very dynamic or large.
  useEffect(() => {
    fetchAgencies();
  }, [fetchAgencies]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchProductOrders(newPage, limit, filters);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setCurrentPage(1); // Reset to page 1 when limit changes
    fetchProductOrders(1, newLimit, filters);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prevFilters => ({
      ...prevFilters,
      [name]: value,
    }));
  };

  const handleFilterSubmit = (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    setCurrentPage(1); // Reset to page 1 on new filter submission
    fetchProductOrders(1, limit, filters);
  };

  // Clear a specific filter or all filters
  const clearFilter = (filterName?: string) => {
    if (filterName) {
      const newFilterValue = filterName === 'paymentStatus' ? 'ALL' : '';
      setFilters(prev => ({ ...prev, [filterName]: newFilterValue }));
    } else {
      // Reset all filters to initial state
      setFilters({
        searchTerm: '',
        memberName: '',
        subscriptionDate: '',
        paymentStatus: 'ALL', // Default to 'ALL'
        deliveryStatus: '',
        agencyId: '',
        productId: '',
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
      fetchProductOrders(); // Refresh the list
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Failed to update payment.";
      toast.error(errorMessage);
      console.error("Error updating payment:", error);
      return false;
    }
  };

  const handleAgentAssignmentUpdate = async (updatedDetails: { subscriptionId: number; agencyId?: number | null }) => {
    if (!selectedSubscription) return;

    const { subscriptionId, agencyId } = updatedDetails;
    const apiPayload = { agencyId: agencyId === undefined ? null : Number(agencyId) };

    try {
      await put(`/subscriptions/${subscriptionId}/assign-agent`, apiPayload);
      toast.success("Agent assigned successfully!");
      fetchProductOrders(); // Refresh list to show updated agent
    } catch (error) {
      toast.error("Failed to assign agent.");
      console.error("Error assigning agent:", error);
    }
  };

  const handleOpenPaymentModal = (order: ProductOrder | null) => {
    if (order) {
      setSelectedOrder(order);
      setIsPaymentModalOpen(true);
    }
  };

  const handleOpenAssignAgentModal = (subscription: Subscription | null) => {
    if (subscription) {
      setSelectedSubscription(subscription);
      setIsAssignAgentModalOpen(true);
      fetchAgencies();
    }
  };

  const handleOpenBulkAssignModal = () => {
    setIsBulkAssignModalOpen(true);
    fetchAgencies();
  };

  const handleBulkAssignAgency = async (subscriptionIds: number[], agencyId: number | null) => {
    try {
      await post('/subscriptions/bulk-assign-agency', {
        subscriptionIds,
        agencyId
      });

      toast.success(`Successfully assigned agency to ${subscriptionIds.length} subscription(s)`);
      fetchProductOrders(); // Refresh the list to show updated assignments
    } catch (error) {
      console.error('Bulk agency assignment failed:', error);
      toast.error('Failed to assign agencies. Please try again.');
      throw error; // Re-throw to let the modal handle it
    }
  };

  const handleDownloadInvoice = async (order: ProductOrder) => {
    // Check if this invoice is already being downloaded
    if (downloadingInvoices.has(order.id)) {
      return;
    }

    // Add order ID to downloading set
    setDownloadingInvoices(prev => new Set(prev).add(order.id));

    try {
      // Check if invoice path is already available in the order data
      if (order.invoicePath) {
        // If invoice path exists, download directly using the existing approach
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://www.indraai.in/';
        const invoiceUrl = `${baseUrl}/invoices/${order.invoicePath}`;
        window.open(invoiceUrl, '_blank');
        toast.success(`Invoice for order ${order.orderNo} downloaded successfully`);
      } else {
        // If no invoice path in order data, try to generate/fetch invoice
        // For now, we'll show an informative message since the backend endpoint may not be ready
        toast.info('Invoice generation is not yet available. Please check back later or contact support.');
      }
    } catch (error: any) {
      console.error('Failed to download invoice:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to download invoice. Please try again.';
      toast.error(errorMessage);
    } finally {
      // Remove order ID from downloading set
      setDownloadingInvoices(prev => {
        const newSet = new Set(prev);
        newSet.delete(order.id);
        return newSet;
      });
    }
  };

  const formatWeekdayToShort = (day: string): string => {
    const dayMap: Record<string, string> = {
      'MONDAY': 'Mon',
      'TUESDAY': 'Tue',
      'WEDNESDAY': 'Wed',
      'THURSDAY': 'Thu',
      'FRIDAY': 'Fri',
      'SATURDAY': 'Sat',
      'SUNDAY': 'Sun'
    };
    return dayMap[day.toUpperCase()] || day;
  };

  const formatDeliverySchedule = (schedule: string, weekdays?: string | null): {
    scheduleType: string,
    weekdaysArray: string[],
    isSpecificDays: boolean
  } => {
    const scheduleType = schedule.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    let weekdaysArray: string[] = [];
    let isSpecificDays = false;

    if (schedule === 'WEEKDAYS' || schedule === 'SELECT_DAYS' || schedule === 'VARYING') {
      isSpecificDays = true;
      if (weekdays) {
        try {
          const parsedDays = JSON.parse(weekdays);
          if (Array.isArray(parsedDays) && parsedDays.length > 0) {
            weekdaysArray = parsedDays.map(day => day.toString().toUpperCase());
          }
        } catch (e) {
          console.error('Error parsing weekdays JSON:', weekdays, e);
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

      <div className="flex justify-between items-center mb-6 max-sm:flex-col">
        <h1 className="text-2xl font-bold">Admin - Subscriptions Management</h1>
        <div className="flex gap-2">
          <Button
            variant={showUnassignedOnly ? "default" : "outline"}
            onClick={() => setShowUnassignedOnly(!showUnassignedOnly)}
            className="flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            {showUnassignedOnly ? "Show All" : "Unassigned Only"}
          </Button>
          <Button onClick={handleOpenBulkAssignModal} className="flex items-center gap-2">
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
                <Label htmlFor="memberName" className="text-sm font-medium mb-2">Member Name</Label>
                <div className="relative">
                  <UserIcon className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    id="memberName"
                    placeholder="Search by member name"
                    name="memberName"
                    className="pl-8"
                    value={filters.memberName || ''}
                    onChange={handleFilterChange}
                  />
                </div>
              </div>

              {/* Subscription date filter */}
              <div className="relative">
                <Label htmlFor="subscriptionDate" className="text-sm font-medium mb-2">Subscription Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    id="subscriptionDate"
                    type="date"
                    name="subscriptionDate"
                    className="pl-8"
                    value={filters.subscriptionDate || ''}
                    onChange={handleFilterChange}
                  />
                </div>
              </div>

              {/* Payment status filter */}
              <div>
                <Label htmlFor="paymentStatus" className="text-sm font-medium mb-2">Payment Status</Label>
                <Select
                  name="paymentStatus"
                  value={filters.paymentStatus || ''}
                  onValueChange={(value) => handleFilterChange({ target: { name: 'paymentStatus', value } } as React.ChangeEvent<HTMLSelectElement>)}
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

      <div className="mb-4 flex justify-between items-center">
        <span className="text-sm text-gray-600 dark:text-gray-400">
        </span>
        <div className="flex items-center space-x-2">
          <span className="text-sm">Items per page:</span>
          <Select value={limit.toString()} onValueChange={(value) => handleLimitChange(Number(value))}>
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

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <Table className="min-w-full">
          <TableHeader className="bg-gray-50">
            <TableRow className="border-b border-gray-200">
              <TableHead className="px-4 py-3 font-medium text-gray-700">Member</TableHead>
              <TableHead className="px-4 py-3 font-medium text-gray-700">Subscription Details</TableHead>
              <TableHead className="px-4 py-3 font-medium text-gray-700">Delivery</TableHead>
              <TableHead className="px-4 py-3 font-medium text-gray-700">Payment</TableHead>
              <TableHead className="px-4 py-3 font-medium text-gray-700">Dates</TableHead>
              <TableHead className="px-4 py-3 font-medium text-gray-700">Agent</TableHead>
              <TableHead className="px-4 py-3 font-medium text-gray-700 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              renderSkeletons(7)
            ) : productOrders.length > 0 ? (
              productOrders.filter((order) => {
                if (!showUnassignedOnly) return true;
                console.log("order", order)

                // Show only orders that have at least one subscription without an assigned agency
                return order.subscriptions?.some(subscription => !subscription.agencyId) || false;
              }).map((order) => {
                const firstSub = order.subscriptions?.[0];

                return (
                  <TableRow key={order.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    {/* Member Information */}
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-gray-100 border-2 border-dashed rounded-xl w-10 h-10 flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 flex items-center gap-2">
                            {order.member?.user?.name || 'N/A'}
                          </div>
                          <div className="flex flex-col gap-1 mt-1 text-xs text-gray-500">
                            <div className="flex items-center gap-1.5">
                              <PhoneIcon className="h-3.5 w-3.5" />
                              <span>{order?.member?.user?.mobile || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MailIcon className="h-3.5 w-3.5" />
                              <span className="truncate max-w-[120px]">{order.member?.user?.email || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Subscription Details */}
                    <TableCell className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-1.5">
                          {order.subscriptions.map((sub: Subscription) => (
                            <div key={sub.id} className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full flex items-center gap-1.5 text-xs">
                              <PackageIcon className="h-3.5 w-3.5" />
                              <span className="font-medium">{sub.product?.name}</span>
                              <span>
                                {sub.deliverySchedule === 'ALTERNATE_DAYS'
                                  ? `×${sub.qty}/${sub.altQty ?? '-'}`
                                  : `×${sub.qty}`}
                              </span>
                              <span className="text-blue-600">
                                {sub.depotProductVariant?.name || ''}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 text-sm mt-1">
                          <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                            <ShoppingCartIcon className="h-4 w-4 text-gray-500" />
                            <span>{order.subscriptions.length} item{order.subscriptions.length > 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex items-center gap-1 font-medium">
                            <IndianRupeeIcon className="h-4 w-4" />
                            <span>{(order.payableamt || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Delivery Schedule */}
                    <TableCell className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        {order.subscriptions.map((sub: Subscription) => {
                          const { weekdaysArray, isSpecificDays } = formatDeliverySchedule(sub.deliverySchedule, sub.weekdays);
                          const scheduleLabel = sub.deliverySchedule === 'DAILY' ? 'Daily' :
                            sub.deliverySchedule === 'WEEKDAYS' ? 'Weekdays Only' :
                              sub.deliverySchedule === 'WEEKENDS' ? 'Weekends' :
                                sub.deliverySchedule === 'ALTERNATE_DAYS' ? 'Alternate_days' :
                                  sub.deliverySchedule === 'DAY1_DAY2' ? 'Daily (Varying Qty)' :
                                    'Custom';

                          const periodtolabel = {
                            "1": "Buy Once",
                            '3': 'Trial Pack',
                            '7': 'Mid Saver Pack',
                            '15': 'Mid Saver Pack',
                            '30': 'Super Saver Pack',
                          }
                          return (
                            <div key={sub.id} className="text-sm">
                              <div className="font-medium text-gray-700 mb-1">{`${scheduleLabel} - ${periodtolabel[sub.period]}`}</div>

                              {/* Alternate Days Display - Alternate_days (1,3,5,7...) */}
                              {sub.deliverySchedule === 'ALTERNATE_DAYS' && (sub.qty || sub.altQty) ? (
                                <div className="flex items-center gap-2 text-xs">
                                  <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 bg-secondary rounded-full"></div>
                                    <span className="text-blue-700 font-medium">
                                      {sub.qty} - {sub.depotProductVariant?.name || 'units'}
                                    </span>
                                  </div>
                                  <span className="text-gray-400">•</span>
                                  <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                                    <span className="text-green-700 font-medium">
                                      {sub.altQty} - {sub.depotProductVariant?.name || 'units'}
                                    </span>
                                  </div>
                                  <span className="text-gray-400 text-xs italic ml-1">skip day pattern</span>
                                </div>
                              ) : sub.deliverySchedule === 'DAY1_DAY2' && (sub.qty || sub.altQty) ? (
                                /* Day1-Day2 Display - Daily with varying quantities */
                                <div className="flex items-center gap-2 text-xs">
                                  <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 bg-secondary rounded-full"></div>
                                    <span className="text-blue-700 font-medium">
                                      {sub.qty} - {sub.depotProductVariant?.name || 'units'}
                                    </span>
                                  </div>
                                  <span className="text-gray-400">•</span>
                                  <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                                    <span className="text-green-700 font-medium">
                                      {sub.altQty} - {sub.depotProductVariant?.name || 'units'}
                                    </span>
                                  </div>
                                  <span className="text-gray-400 text-xs italic ml-1">daily rotation</span>
                                </div>
                              ) : (
                                /* Regular Schedule Display */
                                sub.qty && (
                                  <div className="text-xs text-gray-600">
                                    {sub.qty} - {sub.depotProductVariant?.name || 'units'}
                                    {sub.deliverySchedule === 'DAILY' ? ' daily' :
                                      sub.deliverySchedule === 'WEEKDAYS' ? ' on weekdays' :
                                        sub.deliverySchedule === 'WEEKENDS' ? ' on weekends' :
                                          ' per delivery'}
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
                    </TableCell>

                    {/* Payment Status */}
                    <TableCell className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${order.paymentStatus === 'PAID'
                          ? 'bg-green-100 text-green-800'
                          : order.paymentStatus === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                          }`}>
                          {order.paymentStatus}
                        </div>
                        {console.log("order", order?.subscriptions?.[0]?.deliveryAddressId)}
                        <p>{order?.subscriptions?.[0]?.deliveryAddressId ? "Home Delivery" : "Store Pickup"}</p>
                        <div className="text-xs text-gray-500 mt-1">
                          {order.paymentStatus === 'PAID'
                            ? 'Payment completed'
                            : order.paymentStatus === 'PENDING'
                              ? 'Processing payment'
                              : 'Payment required'}
                        </div>
                      </div>
                    </TableCell>

                    {/* Dates */}
                    <TableCell className="px-4 py-3">
                      {firstSub ? (
                        <div className="flex flex-col gap-1 text-sm">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                            <div className="flex flex-col">
                              <span className="text-xs text-gray-500">Start</span>
                              <span>{format(new Date(firstSub.startDate), 'dd MMM yyyy')}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <CalendarCheckIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                            <div className="flex flex-col">
                              <span className="text-xs text-gray-500">End Date</span>
                              <span>{firstSub.expiryDate ? format(new Date(firstSub.expiryDate), 'dd MMM yyyy') : 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">No subscription</span>
                      )}
                    </TableCell>

                    {/* Assigned Agent */}
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="bg-gray-100 rounded-full p-1.5">
                          <UserCheckIcon className="h-4 w-4 text-gray-500" />
                        </div>
                        <span className="text-sm">
                          {firstSub?.agency?.user?.name ||
                            firstSub?.agency?.name ||
                            <span className="text-gray-400">Unassigned</span>}
                        </span>
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-full bg-white hover:bg-gray-50"
                                onClick={() => handleOpenPaymentModal(order)}
                                disabled={order.paymentStatus === 'PAID'}
                              >
                                <PackageIcon className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>Update Payment</p>
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-full bg-white hover:bg-gray-50"
                                onClick={() => handleOpenAssignAgentModal(firstSub)}
                                disabled={firstSub?.paymentStatus !== 'PAID' || !!firstSub?.agencyId}
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>{!!firstSub?.agencyId ? "Agent assigned" : firstSub?.paymentStatus !== 'PAID' ? "Complete payment first" : "Assign Agent"}</p>
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-full bg-white hover:bg-gray-50"
                                onClick={() => handleDownloadInvoice(order)}
                                // disabled={downloadingInvoices.has(order.id) || order.paymentStatus !== 'PAID'}
                              >
                                {downloadingInvoices.has(order.id) ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                                ) : (
                                  <Download className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>
                                {downloadingInvoices.has(order.id)
                                  ? "Downloading..."
                                  : order.paymentStatus !== 'PAID'
                                    ? "Invoice available after payment"
                                    : "Download Invoice"
                                }
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) :
              <TableRow>
                <TableCell colSpan={7} className="px-4 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <PackageIcon className="h-10 w-10 text-gray-300" />
                    <div className="text-gray-600">No subscriptions found</div>
                    <div className="text-sm text-gray-500 mt-1">Start by creating a new subscription</div>
                  </div>
                </TableCell>
              </TableRow>
            }
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex justify-center items-center space-x-2">
          <Button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} variant="outline">
            Previous
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} variant="outline">
            Next
          </Button>
        </div>
      )}

      {selectedOrder && (
        <PaymentUpdateModal
          isOpen={isPaymentModalOpen}
          onOpenChange={setIsPaymentModalOpen}
          order={selectedOrder}
          onUpdateOrder={handlePaymentDetailsUpdate}
        />
      )}
      {selectedSubscription && (
        <AssignAgentModal
          isOpen={isAssignAgentModalOpen}
          onOpenChange={setIsAssignAgentModalOpen}
          subscription={selectedSubscription}
          agencies={agencies}
          isLoadingAgencies={isLoadingAgencies}
          onUpdateSubscription={handleAgentAssignmentUpdate}
        />
      )}

      <BulkAgencyAssignmentModal
        isOpen={isBulkAssignModalOpen}
        onOpenChange={setIsBulkAssignModalOpen}
        subscriptions={productOrders.flatMap(order => order.subscriptions)}
        agencies={agencies}
        isLoadingAgencies={isLoadingAgencies}
        onBulkUpdateSubscriptions={handleBulkAssignAgency}
      />
      {/* <Toaster richColors position="top-right" /> */}
    </div>
  );
};

export default AdminSubscriptionList;
