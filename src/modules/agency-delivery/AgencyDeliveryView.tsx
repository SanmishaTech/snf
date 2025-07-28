import React, { useState, useEffect, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { get, put, ApiDeliveryScheduleEntry, DeliveryStatus } from '../../services/apiService';
import clsx from 'clsx';
import * as XLSX from 'xlsx';

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

// Spinner component (can be moved to a shared UI library if used elsewhere)
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

const AgencyDeliveryView: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<{ role: string | null; userId: string | null; agencyId: string | null; name: string | null; } | null>(null);
  const [agenciesList, setAgenciesList] = useState<ApiAgency[]>([]);
  const [selectedAgencyIdForAdmin, setSelectedAgencyIdForAdmin] = useState<string | null>(null);
  const [loadingAgencies, setLoadingAgencies] = useState<boolean>(false);
  const [deliveries, setDeliveries] = useState<ApiDeliveryScheduleEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<Record<string, boolean>>({}); // deliveryId: boolean

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
      // For AGENCY role, agencyId is inferred by the backend from the user's token.
      // Frontend does not need to send it or have it in localStorage for this API call.
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
      // Debug: Check if DepotProductVariant is present in the response
      if (data && data.length > 0) {
        console.log('[fetchDeliveries] First delivery item:', data[0]);
        console.log('[fetchDeliveries] depotProductVariant in first item:', data[0].depotProductVariant);
      }
      setDeliveries(data || []);
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
          const response = await get<any>('/agencies'); // Get as 'any' first to inspect
          console.log('Raw /agencies response:', response);
          let agenciesArray: ApiAgency[] = [];
          if (Array.isArray(response)) {
            agenciesArray = response;
          } else if (response && Array.isArray(response.data)) { // Common wrapper
            agenciesArray = response.data;
          } else if (response && Array.isArray(response.agencies)) { // Another common wrapper
            agenciesArray = response.agencies;
          } else if (response && typeof response === 'object' && response !== null) {
            // If it's a single object, or some other structure, log and treat as empty or handle as needed
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
        // Admin role, but no agency selected yet. Clear deliveries.
        setDeliveries([]);
      }
    }
  }, [selectedDate, selectedAgencyIdForAdmin, currentUser, fetchDeliveries]);

  // useEffect for AGENCY data fetching
  useEffect(() => {
    if (currentUser?.role === 'AGENCY' && selectedDate) {
      console.log('[AGENCY Effect for FetchDeliveries] Triggered. Date:', selectedDate, 'Role:', currentUser.role);
      // For AGENCY role, agencyId is inferred by the backend. We just need a date.
      fetchDeliveries(selectedDate);
    } else if (currentUser?.role === 'AGENCY' && !selectedDate) {
      console.log('[AGENCY Effect for FetchDeliveries] AGENCY role, but no date selected. Clearing deliveries.');
      setDeliveries([]); // Clear deliveries if no date is selected
    }
  }, [selectedDate, currentUser, fetchDeliveries]);

  const handleDownloadExcel = () => {
    if (!deliveries.length) {
      alert('No delivery data available to download for the selected date.');
      return;
    }

    // Debug: Log the first delivery to see the data structure
    console.log('First delivery data:', deliveries[0]);
    console.log('depotProductVariant:', deliveries[0]?.depotProductVariant);

    const formattedData = deliveries.map(delivery => ({
      'Customer Name': delivery.member.name,
      'Product Name': delivery.product.name,
      'Product Variant': delivery.depotProductVariant?.name || 'N/A',
      'Quantity': delivery.quantity,
      'Delivery Address': `${delivery.deliveryAddress.plotBuilding || ''}${delivery.deliveryAddress.plotBuilding && delivery.deliveryAddress.streetArea ? ', ' : ''}${delivery.deliveryAddress.streetArea || ''}, ${delivery.deliveryAddress.city}, ${delivery.deliveryAddress.pincode}${delivery.member.user?.mobile ? ` (Phone: ${delivery.member.user.mobile})` : ''}`,
      'Landmark': delivery.deliveryAddress?.landmark || 'N/A',
      'Status': delivery.status,
      'Phone': delivery.deliveryAddress.mobile || 'N/A', // Dedicated phone column remains
      // 'Notes': delivery.deliveryAddress.deliveryNotes || ''
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
      { wch: 15 }, // Status
      { wch: 15 }  // Phone
    ];
    worksheet['!cols'] = columnWidths;

    XLSX.writeFile(workbook, `delivery_schedule_${selectedDate}.xlsx`);
  };

  const getStatusBadgeClass = (status: DeliveryStatus) => {
    switch (status) {
      case DeliveryStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case DeliveryStatus.DELIVERED:
        return 'bg-green-100 text-green-800';
      case DeliveryStatus.NOT_DELIVERED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleUpdateStatus = useCallback(async (deliveryId: string, newStatus: DeliveryStatus) => {
    console.log(`[UpdateStatus] Attempting to update delivery ${deliveryId} to ${newStatus}`);
    if (currentUser?.role === 'ADMIN') {
      setError('Admins cannot update delivery status.');
      console.warn('[UpdateStatus] Admin role detected, update forbidden by frontend logic.');
      return;
    }

    setUpdatingStatus(prev => ({ ...prev, [deliveryId]: true }));
    setError(null);

    try {
      await put(`/delivery-schedules/${deliveryId}/status`, { status: newStatus });
      console.log(`[UpdateStatus] Successfully updated status for ${deliveryId} to ${newStatus}`);
      setDeliveries(prevDeliveries =>
        prevDeliveries.map(d => (d.id === deliveryId ? { ...d, status: newStatus } : d))
      );
    } catch (err: any) {
      console.error(`[UpdateStatus] Error updating status for ${deliveryId}:`, err);
      setError(err.response?.data?.error || err.message || 'Failed to update delivery status.');
    }
    setUpdatingStatus(prev => ({ ...prev, [deliveryId]: false }));
  }, [currentUser, setDeliveries, setError, setUpdatingStatus]);

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
          <div className="flex items-center gap-3">
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
              deliveries.length === 0 || loading ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-primary focus-visible:outline-green-600"
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
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                {currentUser?.role === 'AGENCY' && (
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deliveries.map((delivery) => (
                <tr key={delivery.id} className={updatingStatus[delivery.id] ? 'opacity-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{delivery.member.name}</div>
                    <div className="text-xs text-gray-500">{delivery.deliveryAddress?.mobile || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{delivery.product.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{delivery.quantity}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-normal max-w-xs"> {/* Allow address to wrap */}
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={clsx("px-2 inline-flex text-xs leading-5 font-semibold rounded-full", getStatusBadgeClass(delivery.status))}>
                      {delivery.status.replace('_', ' ')}
                    </span>
                  </td>
                  {currentUser?.role === 'AGENCY' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-1 text-center">
                      <button
                        onClick={() => handleUpdateStatus(delivery.id, DeliveryStatus.DELIVERED)}
                        disabled={delivery.status !== DeliveryStatus.PENDING || updatingStatus[delivery.id]}
                        className={clsx(
                          "text-xs font-medium py-1 px-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1",
                          (delivery.status !== DeliveryStatus.PENDING || updatingStatus[delivery.id])
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-primary text-white hover:bg-primary focus:ring-green-400"
                        )}
                        title="Mark as Delivered"
                      >
                        {updatingStatus[delivery.id] ? (
                          <Spinner size="sm" color="white" className="mr-1 inline-block align-middle" />
                        ) : null}
                        Delivered
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(delivery.id, DeliveryStatus.NOT_DELIVERED)}
                        disabled={delivery.status !== DeliveryStatus.PENDING || updatingStatus[delivery.id]}
                        className={clsx(
                          "text-xs font-medium py-1 px-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1",
                          (delivery.status !== DeliveryStatus.PENDING || updatingStatus[delivery.id])
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-red-500 text-white hover:bg-red-600 focus:ring-red-400"
                        )}
                        title="Mark as Not Delivered"
                      >
                        {updatingStatus[delivery.id] ? (
                          <Spinner size="sm" color="white" className="mr-1 inline-block align-middle" />
                        ) : null}
                        Not Delivered
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AgencyDeliveryView;
