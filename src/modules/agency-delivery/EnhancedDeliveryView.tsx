import React, { useState, useEffect, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { get, put, patch, ApiDeliveryScheduleEntry, DeliveryStatus } from '../../services/apiService';
import { toast } from 'sonner';
import clsx from 'clsx';
import * as XLSX from 'xlsx';

// Helper function to truncate text with ellipsis
const truncateText = (text: string | undefined | null, maxLength: number = 50): string => {
  if (!text) return 'N/A';
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

// Helper function to get user details from localStorage
const getUserDetailsFromLocalStorage = (): { role: string | null; userId: string | null; agencyId: string | null; name: string | null; } => {
  console.log('[StorageDebug] Attempting to get user details...');
  const rawUserString = localStorage.getItem('user');
  const rawAgencyId = localStorage.getItem('agencyId');
  console.log('[StorageDebug] Raw localStorage.getItem(\'user\'):', rawUserString);
  console.log('[StorageDebug] Raw localStorage.getItem(\'agencyId\'):', rawAgencyId);

  let agencyIdFromStorage: string | null = rawAgencyId;
  let role: string | null = null;
  let userId: string | null = null;
  let name: string | null = null;

  if (rawUserString) {
    try {
      const userObject = JSON.parse(rawUserString);
      console.log('[StorageDebug] Parsed userObject:', userObject);
      role = userObject.role || null;
      userId = userObject.id ? String(userObject.id) : null;
      name = userObject.name || null;

      const agencyIdInUserObject = userObject.agencyId ? String(userObject.agencyId) : null;
      console.log('[StorageDebug] agencyId found in userObject:', agencyIdInUserObject);

      if (!agencyIdFromStorage && agencyIdInUserObject) {
        console.log('[StorageDebug] Using agencyId from userObject as primary source was empty.');
        agencyIdFromStorage = agencyIdInUserObject;
      }
    } catch (error) {
      console.error('[StorageDebug] Failed to parse user details from localStorage:', error);
      // role, userId, name remain null, agencyIdFromStorage keeps value from localStorage.getItem('agencyId')
    }
  }

  console.log('[StorageDebug] Final determined values for return: role=', role, 'userId=', userId, 'name=', name, 'agencyId=', agencyIdFromStorage);
  return { role, userId, agencyId: agencyIdFromStorage, name };
};

// Define Agency interface
interface ApiAgency {
  id: string;
  name: string;
}

interface WalletTransaction {
  id: number;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  status: 'PENDING' | 'PAID' | 'FAILED';
  notes: string;
  referenceNumber: string;
  createdAt: string;
}

interface AdminStatusUpdateResponse {
  id: string;
  status: DeliveryStatus;
  walletTransaction?: WalletTransaction;
  adminNotes?: string;
  processedBy?: {
    id: number;
    name: string;
    role: string;
  };
}

// Spinner component
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'white' | 'blue' | 'gray';
  className?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'md', color = 'blue', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };
  const colorClasses = {
    white: 'border-white',
    blue: 'border-blue-500',
    gray: 'border-gray-500',
  };
  return (
    <div
      className={clsx(
        'animate-spin rounded-full border-t-2 border-b-2',
        sizeClasses[size],
        colorClasses[color],
        className
      )}
      style={{ borderTopColor: 'transparent' }} // Makes the spinner effect
    ></div>
  );
};

// Status options configuration
const getStatusOptions = (userRole: string) => {
  const baseOptions = [
    { value: DeliveryStatus.PENDING, label: 'Pending', description: 'Awaiting delivery', color: 'bg-yellow-100 text-yellow-800' },
    { value: DeliveryStatus.DELIVERED, label: 'Delivered', description: 'Successfully delivered to customer', color: 'bg-green-100 text-green-800' },
    { value: DeliveryStatus.NOT_DELIVERED, label: 'Not Delivered', description: 'Delivery attempt failed', color: 'bg-red-100 text-red-800' },
    { value: DeliveryStatus.CANCELLED, label: 'Cancelled', description: 'Delivery was cancelled', color: 'bg-gray-100 text-gray-800' },
    { value: DeliveryStatus.SKIPPED, label: 'Skipped', description: 'Delivery was skipped', color: 'bg-blue-100 text-blue-800' },
  ];

  // Admin-only status options
  if (userRole === 'ADMIN') {
    baseOptions.push(
      {
        value: DeliveryStatus.SKIP_BY_CUSTOMER,
        label: 'Skip by Customer (Credit to Wallet)',
        description: 'Customer requested skip - amount will be credited to wallet',
        color: 'bg-purple-100 text-purple-800',
        adminOnly: true
      },
      {
        value: DeliveryStatus.INDRAAI_DELIVERY,
        label: 'Indraai Delivery',
        description: 'Special Indraai delivery method',
        color: 'bg-indigo-100 text-indigo-800',
        adminOnly: true
      },
      {
        value: DeliveryStatus.TRANSFER_TO_AGENT,
        label: 'Transfer to Agent',
        description: 'Delivery assigned to agent',
        color: 'bg-orange-100 text-orange-800',
        adminOnly: true
      }
    );
  }

  return baseOptions;
};

const EnhancedDeliveryView: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<{ role: string | null; userId: string | null; agencyId: string | null; name: string | null; } | null>(null);
  const [agenciesList, setAgenciesList] = useState<ApiAgency[]>([]);
  const [selectedAgencyIdForAdmin, setSelectedAgencyIdForAdmin] = useState<string | null>(null);
  const [loadingAgencies, setLoadingAgencies] = useState<boolean>(false);
  const [deliveries, setDeliveries] = useState<ApiDeliveryScheduleEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<Record<string, boolean>>({});

  // Admin status update modal state
  const [showStatusModal, setShowStatusModal] = useState<boolean>(false);
  const [modalDeliveryId, setModalDeliveryId] = useState<string>('');
  const [modalSelectedStatus, setModalSelectedStatus] = useState<DeliveryStatus>(DeliveryStatus.PENDING);
  const [modalNotes, setModalNotes] = useState<string>('');
  const [walletTransactions, setWalletTransactions] = useState<Record<string, WalletTransaction>>({});
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  // Delivery date edit modal state
  const [showDateEditModal, setShowDateEditModal] = useState<boolean>(false);
  const [dateEditDeliveryId, setDateEditDeliveryId] = useState<string>('');
  const [newDeliveryDate, setNewDeliveryDate] = useState<string>('');
  const [updatingDate, setUpdatingDate] = useState<Record<string, boolean>>({});

  const fetchDeliveries = useCallback(async (date: string, agencyIdForAdmin?: string) => {
    console.log(`[fetchDeliveries] Called. Date: ${date}, AdminAgencyID: ${agencyIdForAdmin}, UserRole: ${currentUser?.role}`);
    if (!currentUser) {
      console.warn('[fetchDeliveries] currentUser is null. Aborting.');
      setError('User information is not available.');
      setDeliveries([]);
      return;
    }

    let fetchUrl = '';
    if (currentUser.role === 'ADMIN') {
      if (!agencyIdForAdmin) {
        console.warn('[fetchDeliveries] Admin role but no agencyIdForAdmin provided. Clearing deliveries.');
        setDeliveries([]);
        return;
      }
      fetchUrl = `/delivery-schedules/agency/by-date?date=${date}&agencyId=${agencyIdForAdmin}&paymentStatus=PAID`;
    } else if (currentUser.role === 'AGENCY') {
      console.log('[fetchDeliveries] AGENCY role. Backend will infer agencyId.');
      fetchUrl = `/delivery-schedules/agency/by-date?date=${date}&paymentStatus=PAID`;
    } else {
      console.warn('[fetchDeliveries] User role is not ADMIN or AGENCY. Role:', currentUser.role);
      setError('You do not have permission to view this page.');
      setDeliveries([]);
      return;
    }

    console.log('[fetchDeliveries] Attempting to fetch from URL:', fetchUrl);
    setLoading(true);
    setError(null);

    try {
      const data = await get<ApiDeliveryScheduleEntry[]>(fetchUrl);
      console.log('[fetchDeliveries] Raw data received:', data);
      setDeliveries(data || []);

      // Initialize admin notes and wallet transactions from the fetched data
      if (data && data.length > 0) {
        const notesMap: Record<string, string> = {};
        const transactionsMap: Record<string, WalletTransaction> = {};

        data.forEach(delivery => {
          if (delivery.adminNotes) {
            notesMap[delivery.id] = delivery.adminNotes;
          }
          if (delivery.walletTransaction) {
            transactionsMap[delivery.id] = delivery.walletTransaction;
          }
        });

        setAdminNotes(notesMap);
        setWalletTransactions(transactionsMap);
      }
    } catch (err: any) {
      console.error('[fetchDeliveries] Error fetching deliveries:', err);
      setError(err.message || 'Failed to fetch deliveries.');
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser, setDeliveries, setError, setLoading]);

  useEffect(() => {
    const userDetails = getUserDetailsFromLocalStorage();
    console.log(userDetails)
    setCurrentUser(userDetails);

    if (userDetails.role === 'ADMIN') {
      const fetchAgencies = async () => {
        setLoadingAgencies(true);
        try {
          const response = await get<any>('/agencies');
          console.log('Raw /agencies response:', response);
          let agenciesArray: ApiAgency[] = [];
          if (Array.isArray(response)) {
            agenciesArray = response;
          } else if (response && Array.isArray(response.data)) {
            agenciesArray = response.data;
          } else if (response && Array.isArray(response.agencies)) {
            agenciesArray = response.agencies;
          } else if (response && typeof response === 'object' && response !== null) {
            console.warn('/agencies endpoint did not return an array or a known wrapped array structure.');
          }

          setAgenciesList(agenciesArray.map(ag => ({
            id: ag.id,
            name: (ag as any).user?.name || ag.name || `Agency ${ag.id}`
          })));
        } catch (err: any) {
          setError(err.message || 'Failed to fetch agencies.');
        }
        setLoadingAgencies(false);
      };
      fetchAgencies();
    }
  }, []);

  // useEffect for ADMIN data fetching
  useEffect(() => {
    if (currentUser?.role === 'ADMIN') {
      console.log('[ADMIN Effect for FetchDeliveries] Triggered. Date:', selectedDate, 'SelectedAdminAgencyID:', selectedAgencyIdForAdmin);
      if (selectedAgencyIdForAdmin) {
        fetchDeliveries(selectedDate, selectedAgencyIdForAdmin);
      } else {
        setDeliveries([]);
      }
    }
  }, [selectedDate, selectedAgencyIdForAdmin, currentUser, fetchDeliveries]);

  // useEffect for AGENCY data fetching
  useEffect(() => {
    if (currentUser?.role === 'AGENCY' && selectedDate) {
      console.log('[AGENCY Effect for FetchDeliveries] Triggered. Date:', selectedDate, 'Role:', currentUser.role);
      fetchDeliveries(selectedDate);
    } else if (currentUser?.role === 'AGENCY' && !selectedDate) {
      console.log('[AGENCY Effect for FetchDeliveries] AGENCY role, but no date selected. Clearing deliveries.');
      setDeliveries([]);
    }
  }, [selectedDate, currentUser, fetchDeliveries]);

  const handleDownloadExcel = () => {
    if (!deliveries.length) {
      toast.error('No delivery data available to download for the selected date.');
      return;
    }

    const formattedData = deliveries.map(delivery => ({
      'Customer Name': delivery.member.name,
      'Product Name': delivery.product.name,
      'Product Variant': delivery.DepotProductVariant?.name || 'N/A',
      'Quantity': delivery.quantity,
      'Delivery Address': `${delivery.deliveryAddress.plotBuilding || ''}${delivery.deliveryAddress.plotBuilding && delivery.deliveryAddress.streetArea ? ', ' : ''}${delivery.deliveryAddress.streetArea || ''}, ${delivery.deliveryAddress.city}, ${delivery.deliveryAddress.pincode}${delivery.member.user?.mobile ? ` (Phone: ${delivery.member.user.mobile})` : ''}`,
      'Landmark': delivery.deliveryAddress?.landmark || 'N/A',
      'Delivery Instructions': delivery.subscription?.deliveryInstructions || 'N/A',
      'Status': delivery.status,
      'Agency': delivery.subscription?.agency?.name || 'N/A',
      'Handler': delivery.agent?.name || 'Not assigned',
      'Admin Notes': delivery.adminNotes || adminNotes[delivery.id] || 'N/A',
      'Phone': delivery.deliveryAddress.mobile || 'N/A',
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Deliveries');

    const columnWidths = [
      { wch: 20 }, // Customer Name
      { wch: 25 }, // Product Name
      { wch: 20 }, // Product Variant
      { wch: 10 }, // Quantity
      { wch: 40 }, // Delivery Address
      { wch: 15 }, // Landmark
      { wch: 30 }, // Delivery Instructions
      { wch: 15 }, // Status
      { wch: 20 }, // Agency
      { wch: 20 }, // Handler
      { wch: 30 }, // Admin Notes
      { wch: 15 }  // Phone
    ];
    worksheet['!cols'] = columnWidths;

    XLSX.writeFile(workbook, `delivery_schedule_${selectedDate}.xlsx`);
    toast.success('Excel file downloaded successfully!');
  };

  const getStatusBadgeClass = (status: DeliveryStatus) => {
    const statusOption = getStatusOptions(currentUser?.role || '').find(opt => opt.value === status);
    return statusOption?.color || 'bg-gray-100 text-gray-800';
  };

  const getRowStatusClass = (status: DeliveryStatus) => {
    switch (status) {
      case DeliveryStatus.DELIVERED:
        return 'bg-green-100 hover:bg-green-200';
      case DeliveryStatus.NOT_DELIVERED:
        return 'bg-red-100 hover:bg-red-200';
      case DeliveryStatus.SKIPPED:
      case DeliveryStatus.SKIP_BY_CUSTOMER:
        return 'bg-blue-100 hover:bg-blue-200';
      case DeliveryStatus.CANCELLED:
        return 'bg-gray-100 hover:bg-gray-200';
      default:
        return 'bg-white hover:bg-gray-50';
    }
  };

  const handleQuickStatusUpdate = useCallback(async (deliveryId: string, newStatus: DeliveryStatus) => {
    console.log(`[QuickStatusUpdate] Attempting to update delivery ${deliveryId} to ${newStatus}`);

    setUpdatingStatus(prev => ({ ...prev, [deliveryId]: true }));
    setError(null);

    try {
      await put(`/delivery-schedules/${deliveryId}/status`, { status: newStatus });
      console.log(`[QuickStatusUpdate] Successfully updated status for ${deliveryId} to ${newStatus}`);
      setDeliveries(prevDeliveries =>
        prevDeliveries.map(d => (d.id === deliveryId ? { ...d, status: newStatus } : d))
      );
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
    } catch (err: any) {
      console.error(`[QuickStatusUpdate] Error updating status for ${deliveryId}:`, err);
      setError(err.response?.data?.error || err.message || 'Failed to update delivery status.');
      toast.error('Failed to update delivery status');
    }
    setUpdatingStatus(prev => ({ ...prev, [deliveryId]: false }));
  }, [setDeliveries, setError, setUpdatingStatus]);

  const handleAdminStatusUpdate = useCallback(async (deliveryId: string, newStatus: DeliveryStatus, notes?: string) => {
    console.log(`[AdminStatusUpdate] Attempting to update delivery ${deliveryId} to ${newStatus} with notes: ${notes}`);

    setUpdatingStatus(prev => ({ ...prev, [deliveryId]: true }));
    setError(null);

    try {
      const response = await patch<AdminStatusUpdateResponse>(`/admin/deliveries/${deliveryId}/status`, {
        status: newStatus,
        notes: notes
      });

      console.log(`[AdminStatusUpdate] Successfully updated status for ${deliveryId}`, response);

      // Update delivery status and admin notes
      setDeliveries(prevDeliveries =>
        prevDeliveries.map(d => (d.id === deliveryId ? { ...d, status: newStatus, adminNotes: notes } : d))
      );

      // Store admin notes if provided
      if (notes) {
        setAdminNotes(prev => ({
          ...prev,
          [deliveryId]: notes
        }));
      }

      // Store wallet transaction if present
      if (response.walletTransaction) {
        setWalletTransactions(prev => ({
          ...prev,
          [deliveryId]: response.walletTransaction!
        }));
        toast.success(`Status updated and ₹${response.walletTransaction.amount} credited to wallet`);
      } else {
        toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
      }

    } catch (err: any) {
      console.error(`[AdminStatusUpdate] Error updating status for ${deliveryId}:`, err);
      setError(err.response?.data?.error || err.message || 'Failed to update delivery status.');
      toast.error('Failed to update delivery status');
    }

    setUpdatingStatus(prev => ({ ...prev, [deliveryId]: false }));
    setShowStatusModal(false);
    setModalNotes('');
  }, [setDeliveries, setError, setUpdatingStatus]);

  const openStatusModal = (deliveryId: string, currentStatus: DeliveryStatus) => {
    setModalDeliveryId(deliveryId);
    setModalSelectedStatus(currentStatus);
    setModalNotes('');
    setShowStatusModal(true);
  };

  const closeStatusModal = () => {
    setShowStatusModal(false);
    setModalDeliveryId('');
    setModalSelectedStatus(DeliveryStatus.PENDING);
    setModalNotes('');
  };

  const handleDeliveryDateUpdate = useCallback(async (deliveryId: string, newDate: string) => {
    console.log(`[DeliveryDateUpdate] Attempting to update delivery ${deliveryId} to date ${newDate}`);

    setUpdatingDate(prev => ({ ...prev, [deliveryId]: true }));
    setError(null);

    try {
      await patch(`/admin/deliveries/${deliveryId}/delivery-date`, {
        deliveryDate: newDate
      });

      console.log(`[DeliveryDateUpdate] Successfully updated delivery date for ${deliveryId} to ${newDate}`);
      
      // Update the delivery in the local state
      setDeliveries(prevDeliveries =>
        prevDeliveries.map(d => (d.id === deliveryId ? { ...d, deliveryDate: newDate } : d))
      );
      
      toast.success(`Delivery date updated to ${new Date(newDate).toLocaleDateString()}`);
      setShowDateEditModal(false);
      setDateEditDeliveryId('');
      setNewDeliveryDate('');

    } catch (err: any) {
      console.error(`[DeliveryDateUpdate] Error updating delivery date for ${deliveryId}:`, err);
      setError(err.response?.data?.error || err.message || 'Failed to update delivery date.');
      toast.error('Failed to update delivery date');
    }

    setUpdatingDate(prev => ({ ...prev, [deliveryId]: false }));
  }, [setDeliveries, setError, setUpdatingDate]);

  const openDateEditModal = (deliveryId: string, currentDate: string) => {
    setDateEditDeliveryId(deliveryId);
    setNewDeliveryDate(currentDate || new Date().toISOString().split('T')[0]);
    setShowDateEditModal(true);
  };

  const closeDateEditModal = () => {
    setShowDateEditModal(false);
    setDateEditDeliveryId('');
    setNewDeliveryDate('');
  };

  const statusOptions = getStatusOptions(currentUser?.role || '');
  const selectedStatusOption = statusOptions.find(opt => opt.value === modalSelectedStatus);

  return (
    <div className="p-4 md:p-6 lg:p-8 bg-gray-100 min-h-screen font-sans">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          {currentUser?.role === 'ADMIN' ? 'Admin Delivery Management' : 'Agency Delivery Schedule'}
        </h1>
        {currentUser?.role === 'ADMIN' && (
          <p className="text-sm text-gray-600">Viewing as Admin: {currentUser.name || 'Admin User'}</p>
        )}
        {currentUser?.role === 'AGENCY' && (
          <p className="text-sm text-gray-600">Agency: {currentUser.name || `Agency ${currentUser.agencyId}`}</p>
        )}
      </header>

      <div className="mb-6 p-4 bg-white rounded-lg shadow flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <label htmlFor="deliveryDate" className="font-semibold text-gray-700 whitespace-nowrap">Select Date:</label>
          <input
            id="deliveryDate"
            type="date"
            value={selectedDate}
            onChange={(e) => {
              console.log('[DateChange] New date:', e.target.value);
              setSelectedDate(e.target.value);
            }}
            className="border border-gray-300 rounded-md p-2 text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        {currentUser?.role === 'ADMIN' && (
          <div className="flex items-center gap-3 max-sm:flex-col">
            <label htmlFor="agencySelect" className="font-semibold text-gray-700 whitespace-nowrap">Select Agency:</label>
            <Select
              value={selectedAgencyIdForAdmin || ''}
              onValueChange={(value) => {
                const newAgencyId = value === 'NONE' ? null : value;
                console.log('[AgencyChange] New agency ID:', newAgencyId);
                setSelectedAgencyIdForAdmin(newAgencyId);
              }}
              disabled={loadingAgencies || agenciesList.length === 0}
            >
              <SelectTrigger id="agencySelect" className="min-w-[200px]">
                <SelectValue placeholder={loadingAgencies ? "Loading agencies..." : "Select an agency"} />
              </SelectTrigger>
              <SelectContent>
                {agenciesList.length === 0 && !loadingAgencies && <SelectItem value="NONE" disabled>No agencies found</SelectItem>}
                {agenciesList.map(agency => (
                  <SelectItem key={agency.id} value={agency.id}>{agency.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-2 mt-3 sm:mt-0">
          <button
            onClick={() => fetchDeliveries(selectedDate, selectedAgencyIdForAdmin ?? undefined)}
            disabled={loading || Object.values(updatingStatus).some(s => s === true)}
            className={clsx(
              "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
              (loading || Object.values(updatingStatus).some(s => s === true))
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-500 focus-visible:outline-indigo-600"
            )}
          >
            {(loading && !Object.values(updatingStatus).some(s => s === true) && !error) ? (
              <Spinner size="sm" color="white" className="mr-2" />
            ) : null}
            Refresh Deliveries
          </button>
          <button
            onClick={handleDownloadExcel}
            disabled={deliveries.length === 0 || loading}
            className={clsx(
              "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
              deliveries.length === 0 || loading ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700 focus-visible:outline-green-600"
            )}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-2">
              <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
              <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
            </svg>
            Download Excel
          </button>
        </div>
      </div>

      {loading && deliveries.length === 0 && !error && (
        <div className="flex justify-center items-center p-10">
          <Spinner size="lg" />
        </div>
      )}
    {error && (
      <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg border border-red-300" role="alert">
        <span className="font-medium">Error:</span> {error}
      </div>
    )}
  
    {!loading && deliveries.length === 0 && !error && (
      <div className="p-4 text-sm text-gray-700 bg-blue-100 rounded-lg border border-blue-300" role="alert">
        No deliveries scheduled for this date.
      </div>
    )}
 
    {deliveries.length > 0 && (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <table className="min-w-full divide-y divide-gray-200 [&>thead>tr>th]:!px-3 [&>tbody>tr>td]:!px-3">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
            <th scope="col" className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
            <th scope="col" className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
            <th scope="col" className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery Date</th>
            <th scope="col" className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
            <th scope="col" className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery Instructions</th>
            <th scope="col" className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th scope="col" className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Handler</th>
            <th scope="col" className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {deliveries.map((delivery) => (
            <tr key={delivery.id} className={clsx(getRowStatusClass(delivery.status), updatingStatus[delivery.id] && 'opacity-50')}>
              <td className="px-3 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{delivery.member.name}</div>
                <div className="text-xs text-gray-500">{delivery.deliveryAddress?.mobile || 'N/A'}</div>
              </td>
              <td className="px-3 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 break-words">{delivery.product.name}</div>
                {delivery.DepotProductVariant?.name && (
                  <div className="text-xs text-gray-500 break-words">{delivery.DepotProductVariant.name}</div>
                )}
              </td>
              <td className="px-3 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-900">{delivery.quantity}</span>
              </td>
              <td className="px-3 py-4 whitespace-nowrap">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-900">
                    {delivery.deliveryDate ? new Date(delivery.deliveryDate).toLocaleDateString() : 'N/A'}
                  </span>
                  {currentUser?.role === 'ADMIN' && (
                    <button
                      onClick={() => openDateEditModal(delivery.id, delivery.deliveryDate || selectedDate)}
                      disabled={updatingDate[delivery.id]}
                      className="text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                      title="Edit delivery date"
                    >
                      {updatingDate[delivery.id] ? (
                        <Spinner size="sm" color="blue" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </td>
              <td className="px-3 py-4 whitespace-normal max-w-xs">
                <div className="text-sm text-gray-900">{delivery.deliveryAddress?.recipientName}</div>
                <div className="text-sm text-gray-900">{delivery.deliveryAddress && `${delivery.deliveryAddress.plotBuilding || ''}${delivery.deliveryAddress.plotBuilding && delivery.deliveryAddress.streetArea ? ', ' : ''}${delivery.deliveryAddress.streetArea || ''}`}</div>
                <div className="text-sm text-gray-500">{delivery.deliveryAddress ? `${delivery.deliveryAddress.city}, ${delivery.deliveryAddress.pincode}` : 'Offline Depot Delivery'}</div>
                {delivery.member.user?.mobile && (
                  <div className="text-sm text-blue-600 mt-1">Phone: {delivery.member.user.mobile}</div>
                )}
                {delivery.deliveryAddress?.deliveryNotes && (
                  <div className="text-xs text-gray-500 mt-1 italic">Notes: {delivery.deliveryAddress.deliveryNotes}</div>
                )}
              </td>
              <td className="px-3 py-4 whitespace-normal max-w-xs">
                <div className="text-sm text-gray-900" title={delivery.subscription?.deliveryInstructions || 'N/A'}>
                  {truncateText(delivery.subscription?.deliveryInstructions, 40)}
                </div>
              </td>
              <td className="px-3 py-4 whitespace-nowrap">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className={clsx("px-2 inline-flex text-xs leading-5 font-semibold rounded-full", getStatusBadgeClass(delivery.status))}>
                      {delivery.status.replace(/_/g, ' ')}
                    </span>
                    {delivery.status !== DeliveryStatus.PENDING && (
                      <span className="text-xs text-gray-500" title="Status has been assigned and cannot be changed">
                        🔒
                      </span>
                    )}
                  </div>
                  {(delivery.adminNotes || adminNotes[delivery.id]) && (
                    <div className="text-xs bg-blue-50 border border-blue-200 rounded p-2 mt-1">
                      <div className="font-medium text-blue-800">Admin Notes:</div>
                      <div className="text-blue-700">{delivery.adminNotes || adminNotes[delivery.id]}</div>
                    </div>
                  )}
                  {(delivery.walletTransaction || walletTransactions[delivery.id]) && (
                    <div className="text-xs bg-green-50 border border-green-200 rounded p-2 mt-1">
                      <div className="font-medium text-green-800">
                        Wallet Credit: ₹{(delivery.walletTransaction || walletTransactions[delivery.id]).amount}
                      </div>
                    </div>
                  )}
                </div>
              </td>
              <td className="px-3 py-4 whitespace-nowrap">
                <div className="flex flex-col space-y-1">
                  {delivery.agent && (
                    <div className="text-xs text-blue-600">
                      <span className="font-medium">Handler:</span> <br />{delivery.agent.name}
                    </div>
                  )}
                  {!delivery.agent && delivery.status !== DeliveryStatus.PENDING && (
                    <div className="text-xs text-orange-600">
                      <span className="font-medium">Handler:</span> Not assigned
                    </div>
                  )}
                </div>
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-sm font-medium space-y-1">
                {currentUser?.role === 'AGENCY' && (
                  <div className="space-x-1">
                    <button
                      onClick={() => handleQuickStatusUpdate(delivery.id, DeliveryStatus.DELIVERED)}
                      disabled={delivery.status !== DeliveryStatus.PENDING || updatingStatus[delivery.id]}
                      className={clsx(
                        "text-xs font-medium py-1 px-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1",
                        (delivery.status !== DeliveryStatus.PENDING || updatingStatus[delivery.id])
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-green-600 text-white hover:bg-green-700 focus:ring-green-400"
                      )}
                      title={delivery.status !== DeliveryStatus.PENDING ? "Status already assigned" : "Mark as Delivered"}
                    >
                      {updatingStatus[delivery.id] ? (
                        <Spinner size="sm" color="white" className="mr-1 inline-block align-middle" />
                      ) : null}
                      Delivered
                    </button>
                    <button
                      onClick={() => handleQuickStatusUpdate(delivery.id, DeliveryStatus.NOT_DELIVERED)}
                      disabled={delivery.status !== DeliveryStatus.PENDING || updatingStatus[delivery.id]}
                      className={clsx(
                        "text-xs font-medium py-1 px-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1",
                        (delivery.status !== DeliveryStatus.PENDING || updatingStatus[delivery.id])
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-red-500 text-white hover:bg-red-600 focus:ring-red-400"
                      )}
                      title={delivery.status !== DeliveryStatus.PENDING ? "Status already assigned" : "Mark as Not Delivered"}
                    >
                      {updatingStatus[delivery.id] ? (
                        <Spinner size="sm" color="white" className="mr-1 inline-block align-middle" />
                      ) : null}
                      Not Delivered
                    </button>
                  </div>
                )}

                    {currentUser?.role === 'ADMIN' && (
                      <div className="space-y-1">
                        {/* Quick action buttons for common statuses */}
                        <div className="space-x-1">
                          <button
                            onClick={() => handleAdminStatusUpdate(delivery.id, DeliveryStatus.DELIVERED)}
                            disabled={delivery.status !== DeliveryStatus.PENDING || updatingStatus[delivery.id]}
                            className={clsx(
                              "text-xs font-medium py-1 px-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1",
                              (delivery.status !== DeliveryStatus.PENDING || updatingStatus[delivery.id])
                                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                : "bg-green-600 text-white hover:bg-green-700 focus:ring-green-400"
                            )}
                            title={delivery.status !== DeliveryStatus.PENDING ? "Status already assigned" : "Mark as Delivered"}
                          >
                            Delivered
                          </button>
                          <button
                            onClick={() => handleAdminStatusUpdate(delivery.id, DeliveryStatus.NOT_DELIVERED)}
                            disabled={delivery.status !== DeliveryStatus.PENDING || updatingStatus[delivery.id]}
                            className={clsx(
                              "text-xs font-medium py-1 px-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1",
                              (delivery.status !== DeliveryStatus.PENDING || updatingStatus[delivery.id])
                                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                : "bg-red-500 text-white hover:bg-red-600 focus:ring-red-400"
                            )}
                            title={delivery.status !== DeliveryStatus.PENDING ? "Status already assigned" : "Mark as Not Delivered"}
                          >
                            Not Delivered
                          </button>
                        </div>
                        {/* More options button */}
                        <button
                          onClick={() => openStatusModal(delivery.id, delivery.status)}
                          disabled={delivery.status !== DeliveryStatus.PENDING || updatingStatus[delivery.id]}
                          className={clsx(
                            "text-xs font-medium py-1 px-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 w-full",
                            (delivery.status !== DeliveryStatus.PENDING || updatingStatus[delivery.id])
                              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                              : "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-400"
                          )}
                          title={delivery.status !== DeliveryStatus.PENDING ? "Status already assigned" : "More status options"}
                        >
                          More Options
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Admin Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 lg:w-1/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Update Delivery Status</h3>

              <div className="mb-4">
                <label htmlFor="statusSelect" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Status:
                </label>
                {deliveries.find(d => d.id === modalDeliveryId)?.status !== DeliveryStatus.PENDING ? (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      <strong>Status already assigned:</strong> This delivery already has a status of "{deliveries.find(d => d.id === modalDeliveryId)?.status.replace(/_/g, ' ')}" and cannot be changed.
                    </p>
                  </div>
                ) : (
                  <>
                    <Select
                      value={modalSelectedStatus}
                      onValueChange={(value: DeliveryStatus) => setModalSelectedStatus(value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center space-x-2">
                              <span className={clsx("px-2 py-1 text-xs rounded-full", option.color)}>
                                {option.label}
                              </span>
                              {option.adminOnly && <span className="text-xs text-blue-600">(Admin Only)</span>}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedStatusOption?.description && (
                      <p className="mt-1 text-sm text-gray-500">{selectedStatusOption.description}</p>
                    )}
                  </>
                )}
              </div>



              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={closeStatusModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  {deliveries.find(d => d.id === modalDeliveryId)?.status !== DeliveryStatus.PENDING ? 'Close' : 'Cancel'}
                </button>
                {deliveries.find(d => d.id === modalDeliveryId)?.status === DeliveryStatus.PENDING && (
                  <button
                    onClick={() => handleAdminStatusUpdate(modalDeliveryId, modalSelectedStatus, modalNotes)}
                    className="px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-400"
                  >
                    Update Status
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Date Edit Modal */}
      {showDateEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 lg:w-1/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Delivery Date</h3>

              <div className="mb-4">
                <label htmlFor="deliveryDateInput" className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Date:
                </label>
                <input
                  id="deliveryDateInput"
                  type="date"
                  value={newDeliveryDate}
                  onChange={(e) => setNewDeliveryDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]} // Prevent selecting past dates
                  className="w-full border border-gray-300 rounded-md p-3 text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Select the new delivery date for this order
                </p>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={closeDateEditModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeliveryDateUpdate(dateEditDeliveryId, newDeliveryDate)}
                  disabled={!newDeliveryDate || updatingDate[dateEditDeliveryId]}
                  className={clsx(
                    "px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2",
                    (!newDeliveryDate || updatingDate[dateEditDeliveryId])
                      ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                      : "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-400"
                  )}
                >
                  {updatingDate[dateEditDeliveryId] ? (
                    <>
                      <Spinner size="sm" color="white" className="mr-2" />
                      Updating...
                    </>
                  ) : (
                    'Update Date'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedDeliveryView;
