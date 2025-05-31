import React, { useState, useEffect, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { get, put, ApiDeliveryScheduleEntry, DeliveryStatus } from '../../services/apiService';
import clsx from 'clsx';
import * as XLSX from 'xlsx';

// Helper function to get user details from localStorage
const getUserDetailsFromLocalStorage = (): { role: string | null; userId: string | null; agencyId: string | null; name: string | null; } => {
  const userString = localStorage.getItem('user');
  const agencyId = localStorage.getItem('agencyId'); // Specific to AGENCY users, might be set separately
  
  if (userString) {
    try {
      const userObject = JSON.parse(userString);
      const role = userObject.role || null;
      const userId = userObject.id ? String(userObject.id) : null; // Ensure userId is a string or null
      const name = userObject.name || null;
      // console.log('Parsed user details from localStorage:', { role, userId, name, agencyId });
      return { role, userId, agencyId, name };
    } catch (error) {
      console.error('Failed to parse user details from localStorage:', error);
      // Fallback if parsing fails but agencyId might still be relevant
      return { role: null, userId: null, agencyId, name: null };
    }
  }
  // console.log('No user string found in localStorage. Returning agencyId if present.');
  return { role: null, userId: null, agencyId, name: null };
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

  const fetchDeliveries = useCallback(async (date: string, adminSelectedAgencyId?: string | null) => {
    if (!currentUser) return;

    let fetchUrl = '';

    if (currentUser.role === 'ADMIN') {
      if (!adminSelectedAgencyId) {
        setDeliveries([]); 
        return;
      }
      fetchUrl = `/delivery-schedules/agency/by-date?date=${date}&agencyId=${adminSelectedAgencyId}`;
    } else if (currentUser.role === 'AGENCY') {
      if (!currentUser.agencyId) {
        setError('Agency user profile is incomplete (missing agency ID).');
        setDeliveries([]);
        return;
      }
      fetchUrl = `/delivery-schedules/agency/by-date?date=${date}`;
    } else {
      setError('You do not have permission to view this page.');
      setDeliveries([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await get<ApiDeliveryScheduleEntry[]>(fetchUrl);
      setDeliveries(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch deliveries.');
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const userDetails = getUserDetailsFromLocalStorage();
    setCurrentUser(userDetails);

    if (userDetails.role === 'ADMIN') {
      const fetchAgencies = async () => {
        setLoadingAgencies(true);
        try {
          const fetchedAgencies = await get<ApiAgency[]>('/agencies'); 
          setAgenciesList(fetchedAgencies.map(ag => ({ id: ag.id, name: (ag as any).user?.name || ag.name || `Agency ${ag.id}` }))); 
        } catch (err: any) {
          setError(err.message || 'Failed to fetch agencies.');
        }
        setLoadingAgencies(false);
      };
      fetchAgencies();
    }
  }, []);

  useEffect(() => {
    if (currentUser?.role === 'ADMIN' && selectedAgencyIdForAdmin) {
      fetchDeliveries(selectedDate, selectedAgencyIdForAdmin);
    } else if (currentUser?.role === 'AGENCY' && currentUser.agencyId) {
      fetchDeliveries(selectedDate);
    } else if (currentUser?.role === 'ADMIN' && !selectedAgencyIdForAdmin) {
        setDeliveries([]);
    }
  }, [selectedDate, fetchDeliveries, currentUser, selectedAgencyIdForAdmin]);

  const handleUpdateStatus = async (deliveryId: string, status: DeliveryStatus) => {
    setUpdatingStatus(prev => ({ ...prev, [deliveryId]: true }));
    try {
      const updatedEntry = await put<ApiDeliveryScheduleEntry>(`/delivery-schedules/${deliveryId}/status`, { status });
      setDeliveries(prevDeliveries =>
        prevDeliveries.map(d => (d.id === deliveryId ? updatedEntry : d))
      );
    } catch (err: any) {
      setError(err.message || 'Failed to update status.');
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [deliveryId]: false }));
    }
  };

  const handleDownloadExcel = () => {
    if (!deliveries.length) {
      alert('No delivery data available to download for the selected date.');
      return;
    }

    const formattedData = deliveries.map(delivery => ({
      'Member Name': delivery.member.name,
      'Product Name': delivery.product.name,
      'Quantity': delivery.quantity,
      'Delivery Address': `${delivery.deliveryAddress.plotBuilding || ''}${delivery.deliveryAddress.plotBuilding && delivery.deliveryAddress.streetArea ? ', ' : ''}${delivery.deliveryAddress.streetArea || ''}, ${delivery.deliveryAddress.city}, ${delivery.deliveryAddress.pincode}${delivery.member.phoneNumber ? ` (Phone: ${delivery.member.phoneNumber})` : ''}`,
      'Status': delivery.status,
      'Phone': delivery.deliveryAddress.mobile || 'N/A', // Dedicated phone column remains
      // 'Notes': delivery.deliveryAddress.deliveryNotes || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Deliveries');

    const columnWidths = [
      { wch: 20 }, // Member Name
      { wch: 25 }, // Product Name
      { wch: 10 }, // Quantity
      { wch: 40 }, // Delivery Address
      { wch: 15 }, // Status
      { wch: 15 }, // Phone
      { wch: 30 }  // Notes
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
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-gray-300 rounded-md p-2 text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        {currentUser?.role === 'ADMIN' && (
          <div className="flex items-center gap-3">
            <label htmlFor="agencySelect" className="font-semibold text-gray-700 whitespace-nowrap">Select Agency:</label>
            <Select
              value={selectedAgencyIdForAdmin || ''}
              onValueChange={(value) => setSelectedAgencyIdForAdmin(value === 'NONE' ? null : value)}
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
            onClick={() => fetchDeliveries(selectedDate, selectedAgencyIdForAdmin)}
            disabled={loading && !Object.keys(updatingStatus).length}
            className={clsx(
              "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
              (loading && !Object.keys(updatingStatus).length) ? "bg-gray-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-500 focus-visible:outline-indigo-600"
            )}
          >
            {(loading && !Object.keys(updatingStatus).length && !error) ? (
              <Spinner size="sm" color="white" className="mr-2" />
            ) : null}
            Refresh Deliveries
          </button>
          <button
            onClick={handleDownloadExcel}
            disabled={deliveries.length === 0 || loading}
            className={clsx(
              "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
              deliveries.length === 0 || loading ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-500 focus-visible:outline-green-600"
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
                    <div className="text-xs text-gray-500">{delivery.deliveryAddress.mobile || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{delivery.product.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{delivery.quantity}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-normal max-w-xs"> {/* Allow address to wrap */}
                    <div className="text-sm text-gray-900">{delivery.deliveryAddress.recipientName}</div>
                    <div className="text-sm text-gray-900">{`${delivery.deliveryAddress.plotBuilding || ''}${delivery.deliveryAddress.plotBuilding && delivery.deliveryAddress.streetArea ? ', ' : ''}${delivery.deliveryAddress.streetArea || ''}`}</div>
                    <div className="text-sm text-gray-500">{`${delivery.deliveryAddress.city}, ${delivery.deliveryAddress.pincode}`}</div>
                    {delivery.member.phoneNumber && (
                      <div className="text-sm text-blue-600 mt-1">Phone: {delivery.member.phoneNumber}</div>
                    )}
                    {delivery.deliveryAddress.deliveryNotes && (
                      <div className="text-xs text-gray-500 mt-1 italic">Notes: {delivery.deliveryAddress.deliveryNotes}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={clsx("px-2 inline-flex text-xs leading-5 font-semibold rounded-full", getStatusBadgeClass(delivery.status))}>
                      {delivery.status.replace('_', ' ')}
                    </span>
                  </td>
                  {currentUser?.role === 'AGENCY' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleUpdateStatus(delivery.id, DeliveryStatus.DELIVERED)}
                      disabled={delivery.status !== DeliveryStatus.PENDING || updatingStatus[delivery.id]}
                      className={clsx(
                        "text-xs font-medium py-1 px-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1",
                        (delivery.status !== DeliveryStatus.PENDING || updatingStatus[delivery.id])
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-green-500 text-white hover:bg-green-600 focus:ring-green-400"
                      )}
                    >
                      {updatingStatus[delivery.id] && delivery.status === DeliveryStatus.PENDING ? (
                        <Spinner size="sm" color="white" className="mr-1 inline-block" />
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
                    >
                      {updatingStatus[delivery.id] && delivery.status === DeliveryStatus.PENDING ? (
                        <Spinner size="sm" color="white" className="mr-1 inline-block" />
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
