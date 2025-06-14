import React, { useEffect, useState, useCallback } from 'react';
import { get, put } from '@/services/apiService'; // Assuming you have a configured apiService
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { X, FilePenLine, UserPlus, UserIcon, PhoneIcon, MailIcon, PackageIcon, ShoppingCartIcon, IndianRupeeIcon, CalendarIcon, CalendarCheckIcon, UserCheckIcon, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { toast, Toaster } from "sonner"; // Using Sonner for toasts

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
  user: User;
}

interface Product {
  name: string;
  unit?: string; // Added to include product unit
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
}

interface Subscription {
  id: number;
  member: Member;
  product: Product;
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

interface ApiResponse {
  data: Subscription[];
  totalPages: number;
  currentPage: number;
  totalCount: number;
}

// --- SubscriptionEditModal Component Definition ---
interface PaymentUpdateModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  subscription: Subscription | null;
  onUpdateSubscription: (updatedDetails: {
      subscriptionId: number;
      paymentMode?: string;
      paymentReference?: string;
      paymentDate?: string;
      paymentStatus?: string;
      receivedAmount?: number; // <-- Add this
    }) => Promise<boolean>; // Expect a boolean return type
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
  subscription,
  onUpdateSubscription,
}) => {
  const [paymentMode, setPaymentMode] = useState<string>('');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [paymentStatusState, setPaymentStatusState] = useState<string>('');
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [receivedAmount, setReceivedAmount] = useState<string>('');
  const [payableAmount, setPayableAmount] = useState<string>('');

  const isPaymentSectionDisabled = subscription?.paymentStatus === 'PAID';

  useEffect(() => {
    if (subscription) {
      setPaymentMode(subscription.paymentMode || '');
      setPaymentReference(subscription.paymentReference || '');
      setPaymentDate(subscription.paymentDate ? format(new Date(subscription.paymentDate), 'yyyy-MM-dd') : '');
      setPaymentStatusState(subscription.paymentStatus || '');
      // Use payableamt to pre-fill received amount, as this is what's due
      setPayableAmount(subscription.payableamt?.toString() || '');
      setReceivedAmount(subscription.payableamt?.toString() || ''); // <-- Pre-fill with payable amount

    } else {
      setPaymentMode('');
      setPaymentReference('');
      setPaymentDate('');
      setPaymentStatusState('');
      setPayableAmount(''); // <-- Reset on close
    }
  }, [subscription]);

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    
    if (!paymentStatusState) {
      errors.paymentStatus = 'Payment status is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
      if (!subscription || isPaymentSectionDisabled) return;
      if (!validateForm()) return; // Keep existing validation

      const received = parseFloat(receivedAmount);
      
      if (isNaN(received) || received <= 0) {
        toast.error("Please enter a valid received amount.");
        return;
      }

      // The core new logic: check amounts if status is being set to PAID
      // Compare received amount with payableamt (net amount due)
      if (paymentStatusState === "PAID" && received !== subscription.payableamt) {
        toast.error(`Received amount (₹${received.toFixed(2)}) must equal the payable amount (₹${subscription.payableamt.toFixed(2)}) to mark as PAID.`);
        return;
      }

      if (paymentStatusState !== "PAID" && paymentStatusState !== "FAILED") {
        toast.error("Payment Status is Required");
        return;
      }

      const updatedDetails: any = {
        subscriptionId: subscription.id,
        paymentMode,
        paymentReference,
        paymentDate: paymentDate,
        paymentStatus: paymentStatusState,
        receivedAmount: received, // <-- Add received amount to the payload
      };

      try {
        const success = await onUpdateSubscription(updatedDetails);
        if (success) {
          onOpenChange(false);
        }
      } catch (error) {
        console.error('Failed to update payment:', error);
      }
    };

  if (!isOpen || !subscription) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Update Payment: {subscription.product.name}</DialogTitle>
          <DialogDescription>
            Modify payment details for the subscription.
          </DialogDescription>
        </DialogHeader>
        <DialogClose className="absolute right-4 top-4 z-10" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
        </DialogClose>

        <div className="grid gap-6 py-4">
          <fieldset disabled={isPaymentSectionDisabled} className="grid gap-4 border p-4 rounded-md">
            <legend className="text-sm font-medium px-1">Payment Information {isPaymentSectionDisabled ? `(Status: ${subscription.paymentStatus} - Disabled)` : ""}</legend>
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
                    const newErrors = {...formErrors};
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
            Subscription for {subscription.member.user.name}
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
                <p className="font-medium">{subscription.qty}</p>
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
              <p><span className="text-gray-500">Name:</span> {subscription.member.user.name}</p>
              <p><span className="text-gray-500">Email:</span> {subscription.member.user.email}</p>
              {subscription.member.user.mobile && (
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
   const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState<boolean>(false); // Restore showFilters state
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [isAssignAgentModalOpen, setIsAssignAgentModalOpen] = useState<boolean>(false);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [isLoadingAgencies, setIsLoadingAgencies] = useState<boolean>(false);
  const [filters, setFilters] = useState<{[key: string]: string | undefined}>({
    searchTerm: '',
    memberName: '',
    subscriptionDate: '',
    paymentStatus: 'ALL',
    deliveryStatus: '',
    agencyId: '',
    productId: '',
    // Add other filter keys as needed, initialized to empty or default values
  });
  

  const fetchSubscriptions = useCallback(async (page = currentPage, currentLimit = 10, currentFilters = filters) => {
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

    const queryParams = new URLSearchParams({
      page: effectivePage.toString(),
      limit: effectiveLimit.toString(),
      ...apiParams
    }).toString();

    try {
      const response: ApiResponse = await get(`/subscriptions?${queryParams}`);
      setSubscriptions(response || []);
      setTotalPages(response.totalPages);
      setCurrentPage(response.currentPage);
    } catch (err: any) {
      console.error('Failed to fetch subscriptions:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch subscriptions.';
      toast.error(errorMessage);
      setSubscriptions([]); // Ensure subscriptions is an empty array on error
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, limit, filters]);

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
    fetchSubscriptions(currentPage, limit, filters);
  }, [fetchSubscriptions, currentPage, limit, filters]); // fetchSubscriptions is memoized, so this runs on mount and when filters/pagination affecting fetchSubscriptions change

  // Fetch agencies once on mount, or when assign agent modal is opened (as per previous logic)
  // For simplicity here, fetching once on mount. Can be refined if agencies list is very dynamic or large.
  useEffect(() => {
    fetchAgencies();
  }, [fetchAgencies]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchSubscriptions(newPage, limit, filters);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setCurrentPage(1); // Reset to page 1 when limit changes
    fetchSubscriptions(1, newLimit, filters);
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
    fetchSubscriptions(1, limit, filters);
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
      subscriptionId: number;
      paymentMode?: string;
      paymentReference?: string;
      paymentDate?: string;
      paymentStatus?: string;
      receivedAmount?: number; // <-- Receive the new field
    }): Promise<boolean> => {
      if (!selectedSubscription) {
        toast.error("No subscription selected for update.");
        return false;
      }

      const { subscriptionId, paymentMode, paymentReference, paymentDate, paymentStatus, receivedAmount } = updatedDetails;

      // Validation (can be simplified since modal handles most of it)
      if (!paymentMode || !paymentDate || !paymentStatus || receivedAmount === undefined) {
        toast.error("Missing required payment details.");
        return false;
      }
      
      const apiPayload = {
        paymentMode: paymentMode,
        paymentReference: paymentMode === 'CASH' ? null : paymentReference,
        paymentDate: paymentDate,
        paymentStatus: paymentStatus,
        receivedAmount: receivedAmount, // <-- Add to the API payload
      };

      try {
        await put(`/subscriptions/${subscriptionId}`, apiPayload);
        toast.success('Payment details updated successfully');
        fetchSubscriptions(currentPage, limit, filters);
        return true;
      } catch (err: any) {
        console.error('Failed to update payment details:', err);
        const errorMessage = err.response?.data?.message || 'Failed to update payment details.';
        toast.error(errorMessage);
        return false;
      }
    };

  const handleAgentAssignmentUpdate = async (updatedDetails: { subscriptionId: number; agencyId?: number | null }) => {
    if (!selectedSubscription) return;

    const { subscriptionId, agencyId } = updatedDetails;
    const apiPayload = { agencyId: agencyId === undefined ? null : Number(agencyId) };

    try {
      await put(`/subscriptions/${subscriptionId}`, apiPayload);
      toast.success('Agent assignment updated successfully');
      fetchSubscriptions(currentPage, limit); // Refresh the list
      setIsAssignAgentModalOpen(false); // Close assign agent modal
    } catch (err: any) {
      console.error('Failed to assign agent:', err);
      toast.error('Failed to assign agent');
      throw err;
    }
  };

  const handleOpenPaymentModal = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setIsPaymentModalOpen(true);
  };

  const handleOpenAssignAgentModal = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setIsAssignAgentModalOpen(true);
    fetchAgencies(); // Ensure agencies are fresh if not loaded on mount or if they can change
    // setCurrentPage(1); // This was likely a mistake here, page context is for subscriptions list
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
      
      <h1 className="text-2xl font-bold mb-6">Admin - Subscriptions Management</h1>

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
                className="bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
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

      <div className="overflow-x-auto rounded-lg border shadow-sm">
  <Table >
    <TableHeader>
      <TableRow >
        <TableHead>Member</TableHead>
        <TableHead>Product & Quantity</TableHead>
        <TableHead>Delivery Schedule</TableHead>
        <TableHead>Payment Status</TableHead>
        <TableHead>Subscription Dates</TableHead>
        <TableHead>Assigned Agent</TableHead>
        <TableHead>Actions</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {isLoading ? (
        renderSkeletons(7) // Adjusted for new column count
      ) : subscriptions.length > 0 ? (
        subscriptions.map((sub) => (
          <TableRow key={sub.id}>
            {/* Member Details Group */}
            <TableCell>
              <div className="flex flex-col gap-1">
                <div className="font-medium flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-gray-500" />
                  {sub.member?.user?.name || 'N/A'}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <PhoneIcon className="h-3.5 w-3.5" />
                  {sub?.deliveryAddress?.mobile || 'N/A'}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 truncate">
                  <MailIcon className="h-3.5 w-3.5" />
                  <span>{sub.member.user.email}</span>
                </div>
            
              </div>
            </TableCell>

            {/* Product & Quantity Group */}
            <TableCell>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <PackageIcon className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{sub.product?.name || 'N/A'}</span>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <ShoppingCartIcon className="h-3.5 w-3.5" />
                    <span>
                    Qty: {sub.qty} {sub.product?.unit}{sub.qty > 1 ? 's' : ''}
                    {sub.deliverySchedule === 'ALTERNATE_DAYS' && sub.altQty ? (
                      <>
                        {' '}&amp; {sub.altQty} {sub.product?.unit}{sub.altQty > 1 ? 's' : ''}
                      </>
                    ) : null}
                  </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <IndianRupeeIcon className="h-3.5 w-3.5" />
                    <span>Total: ₹{sub.amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </TableCell>

            {/* Delivery Schedule */}
            <TableCell>
              <div className="flex flex-col gap-1">
                {(() => {
                  const { scheduleType, weekdaysArray, isSpecificDays } = formatDeliverySchedule(sub.deliverySchedule, sub.weekdays);
                  return (
                    <>
                      <span className="text-sm font-medium">{scheduleType}</span>
                      {isSpecificDays && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {weekdaysArray.length > 0 ? (
                            weekdaysArray.map((day, index) => (
                              <span 
                                key={index} 
                                className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-100"
                              >
                                {formatWeekdayToShort(day)}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-500">
                              {sub.deliverySchedule === 'WEEKDAYS' ? 'Mon-Fri' : 'No days specified'}
                            </span>
                          )}
                        </div>
                      )}
                      {!isSpecificDays && sub.deliverySchedule === 'DAILY' && (
                        <span className="text-xs text-gray-500">Every day</span>
                      )}
                      {!isSpecificDays && sub.deliverySchedule === 'ALTERNATE_DAYS' && (
                        <span className="text-xs text-gray-500">Every other day</span>
                      )}
                    </>
                  );
                })()}
              </div>
            </TableCell>

            {/* Payment Status */}
            <TableCell>
              <div className="flex flex-col gap-1">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  sub.paymentStatus === 'PAID' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100' 
                    : sub.paymentStatus === 'PENDING' 
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-600 dark:text-yellow-100' 
                      : 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100'
                }`}>
                  {sub.paymentStatus}
                </span>
                <div className="text-xs text-gray-500">
                  {sub.paymentStatus === 'PAID' 
                    ? 'Completed' 
                    : sub.paymentStatus === 'PENDING' 
                      ? 'Processing' 
                      : 'Action Needed'}
                </div>
              </div>
            </TableCell>

            {/* Create Date */}
        

            {/* Subscription Dates Group */}
            <TableCell>
              <div className="flex flex-col gap-1 text-sm">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-gray-500" />
                  <span>Start: {sub.startDate ? new Date(sub.startDate).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarCheckIcon className="h-4 w-4 text-gray-500" />
                  <span>Expiry: {sub.expiryDate ? format(new Date(sub.expiryDate), 'dd/MM/yyyy') : 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-gray-500" />
                  <span>Created: {sub.createdAt ? format(new Date(sub.createdAt), 'dd/MM/yyyy') : 'N/A'}</span>
                </div>
              </div>
            </TableCell>

            {/* Assigned Agent */}
            <TableCell>
                <div className="flex items-center gap-2">
                  <UserCheckIcon className="h-4 w-4 text-gray-500" />
                  <span>{sub.agency?.user?.name || sub.agency?.name || 'Unassigned'}</span>
              </div>
            </TableCell>

            {/* Actions */}
            <TableCell>
              <div className="flex gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenPaymentModal(sub)}
                        disabled={sub.paymentStatus === 'PAID'}
                      >
                        <FilePenLine className="h-4 w-4" />
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
                        className="h-8 w-8"
                        onClick={() => handleOpenAssignAgentModal(sub)}
                        disabled={sub.paymentStatus !== 'PAID' || !!sub.agencyId}
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>{!!sub.agencyId ? "Agent already assigned" : sub.paymentStatus !== 'PAID' ? "Payment required before agent assignment" : "Assign Agent"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </TableCell>
          </TableRow>
        ))
      ) : (
        <TableRow>
          <TableCell colSpan={7} className="text-center text-gray-500 py-8">
            No subscriptions found
          </TableCell>
        </TableRow>
      )}
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

      {selectedSubscription && (
        <PaymentUpdateModal
          isOpen={isPaymentModalOpen}
          onOpenChange={setIsPaymentModalOpen}
          subscription={selectedSubscription}
          onUpdateSubscription={handlePaymentDetailsUpdate}
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
      {/* <Toaster richColors position="top-right" /> */}
    </div>
  );
};

export default AdminSubscriptionList;
