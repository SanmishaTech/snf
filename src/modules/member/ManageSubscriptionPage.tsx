import React, { useState, useEffect } from 'react';
import { get, patch } from '../../services/apiService';
import { toast } from 'sonner';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CalendarDays, CheckCircle, XCircle, SkipForward } from 'lucide-react';
import { format, parseISO, isAfter, addDays, differenceInDays, startOfDay } from 'date-fns';
import { MemberSubscription as BaseMemberSubscription } from './MySubscriptionsPage'; // Assuming the interface is exported

// API service to get subscription details using apiService
const getSubscriptionDetails = async (id: string): Promise<ExtendedMemberSubscription | null> => {
  console.log(`Fetching subscription details for ${id} using apiService...`);
  try {
    // apiService.get prepends /api, so pass 'subscriptions/:id'
    // It also returns the data directly (type ExtendedMemberSubscription)
    const data = await get<ExtendedMemberSubscription>(`subscriptions/${id}`);
    return data;
  } catch (error: any) { // Catch errors thrown by apiService.get
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
  status: 'PENDING' | 'DELIVERED' | 'NOT_DELIVERED' | 'CANCELLED' | 'SKIPPED_BY_MEMBER' | 'SKIPPED_BY_ADMIN';
  quantity: number;
  // Add other fields if your backend sends them, e.g., product details for this specific delivery if they can vary
}

// Extended MemberSubscription type to include delivery schedule entries from API
interface ExtendedMemberSubscription extends BaseMemberSubscription {
  memberId: string; // Added memberId, assuming it comes from the backend
  deliveryScheduleEntries?: DeliveryScheduleEntryFromAPI[];
}

// Frontend representation of a delivery for display
interface Delivery {
  id: number; // This is the DeliveryScheduleEntry ID
  date: Date;
  status: 'PENDING' | 'SCHEDULED' | 'SKIPPED' | 'DELIVERED' | 'NOT_DELIVERED' | 'CANCELLED'; // Consolidated status for UI
  originalQty?: number;
}

interface ApiServiceError {
  message: string;
  status?: number;
  // Add other properties if your apiService error object has more that you need to access
}

const ManageSubscriptionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [subscription, setSubscription] = useState<ExtendedMemberSubscription | null>(null);
  const [isSkipping, setIsSkipping] = useState<Record<number, boolean>>({}); // Tracks loading state for skip buttons by delivery ID
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = startOfDay(new Date());

  useEffect(() => {
    if (!id) {
      setError('Subscription ID is missing.');
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
          setError('Subscription not found.');
        }
      } catch (err: any) { // Keep 'any' here as apiService can throw various things, but we'll check props
        const apiError = err as ApiServiceError; // Type assertion for easier access
        setError(apiError.message || 'Failed to load subscription details.');
        console.error('Error in fetchDetails useEffect:', apiError);
      }
      setIsLoading(false);
    };

    fetchDetails();
  }, [id]);

  const processDeliverySchedule = (sub: ExtendedMemberSubscription) => {
    if (!sub.deliveryScheduleEntries || sub.deliveryScheduleEntries.length === 0) {
      // Fallback or handle case where backend doesn't send entries - though it should.
      // For now, we'll rely on the backend sending these.
      // If you need to keep the old generation logic as a fallback, it can be placed here.
      // However, skipping would not work without entry IDs from the backend.
      console.warn('No delivery schedule entries received from backend. Displaying empty schedule.');
      setDeliveries([]);
      return;
    }

    const today = startOfDay(new Date());
    const processedDeliveries: Delivery[] = sub.deliveryScheduleEntries.map(entry => {
      const deliveryDate = parseISO(entry.deliveryDate);
      let uiStatus: Delivery['status'];

      switch (entry.status) {
        case 'SKIPPED':
        case 'SKIPPED':
          uiStatus = 'SKIPPED';
          break;
        case 'PENDING':
          uiStatus = deliveryDate.getTime() === today.getTime() ? 'SCHEDULED' : 'PENDING';
          break;
        case 'DELIVERED':
          uiStatus = 'DELIVERED';
          break;
        case 'NOT_DELIVERED':
          uiStatus = 'NOT_DELIVERED';
          break;
        case 'CANCELLED':
          uiStatus = 'CANCELLED';
          break;
        default:
          // Should not happen if backend sends valid statuses
          uiStatus = deliveryDate < today ? 'DELIVERED' : (deliveryDate.getTime() === today.getTime() ? 'SCHEDULED' : 'PENDING');
      }

      return {
        id: entry.id,
        date: deliveryDate,
        status: uiStatus,
        originalQty: entry.quantity,
      };
    });

    // Sort deliveries by date just in case they aren't sorted from backend
    processedDeliveries.sort((a, b) => a.date.getTime() - b.date.getTime());
    setDeliveries(processedDeliveries);
  };

  const handleSkipDelivery = async (deliveryEntryId: number) => {
    setIsSkipping(prev => ({ ...prev, [deliveryEntryId]: true }));
    try {
      // The backend PATCH /subscriptions/member/deliveries/:deliveryEntryId/skip endpoint
      // is now responsible for both skipping the delivery and processing any applicable refund.
      const response = await patch<{ message: string; deliveryEntry: DeliveryScheduleEntryFromAPI }>(`/subscriptions/member/deliveries/${deliveryEntryId}/skip`, {});
      
      // Update local state with the new status from the backend response
      setDeliveries(prevDeliveries =>
        prevDeliveries.map(delivery =>
          delivery.id === deliveryEntryId
            ? { ...delivery, status: 'SKIPPED' } // Assuming SKIPPED_BY_MEMBER or similar maps to 'SKIPPED'
            : delivery
        )
      );
      // The backend should provide a comprehensive message, e.g., "Delivery skipped and refund processed."
      // Or, if a refund wasn't applicable, "Delivery skipped."
      toast.success(response.message || 'Delivery action processed successfully!');

      // Optional: If the backend response includes specific details about the refund (e.g., amount),
      // you could display an additional toast.info here. For now, relying on the main success message.

    } catch (error: any) {
      console.error('Failed to process delivery skip/refund:', error);
      const errorMessage = error?.response?.data?.message || error.message || 'Could not process delivery action. Please try again.';
      toast.error(errorMessage);
    }
    setIsSkipping(prev => ({ ...prev, [deliveryEntryId]: false }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg text-gray-600">Loading subscription details...</p>
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || 'Could not load subscription details.'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Card className="shadow-lg">
        <CardHeader className='bg-gray-50 dark:bg-gray-800 pb-4'>
          <CardTitle className="text-xl md:text-2xl font-bold text-primary">
            Manage Subscription: {subscription.product.name}
          </CardTitle>
          <CardDescription>
            ID: {subscription.id} | Status: <span className={`font-medium ${subscription.status === 'ACTIVE' ? 'text-green-600' : 'text-yellow-600'}`}>{subscription.status}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300 flex items-center">
            <CalendarDays className="mr-2 h-5 w-5 text-primary" /> Delivery Schedule
          </h3>
          {deliveries.length > 0 ? (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {deliveries.map((delivery, index) => {
                console.log(`Rendering delivery - ID: ${JSON.stringify(delivery)}, Status: ${delivery.status}, Date: ${delivery.date ? delivery.date.toISOString() : 'N/A'}, isAfterToday: ${delivery.date ? isAfter(delivery.date, today) : 'N/A'}`);
                return (
                  <div 
                  key={index} 
                  className={`flex items-center justify-between p-3 rounded-md border ${ 
                    delivery.status === 'SKIPPED' ? 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-700'
                    : delivery.status === 'DELIVERED' ? 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700'
                    : delivery.date.getTime() === today.getTime() ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700'
                    : 'bg-gray-50 border-gray-200 dark:bg-gray-700/30 dark:border-gray-600'
                  }`}
                >
                  <div className="flex items-center">
                    {delivery.status === 'SKIPPED' && <XCircle className="h-5 w-5 mr-2 text-red-500 flex-shrink-0" />}
                    {delivery.status === 'DELIVERED' && <CheckCircle className="h-5 w-5 mr-2 text-green-500 flex-shrink-0" />}
                    {delivery.status === 'NOT_DELIVERED' && <XCircle className="h-5 w-5 mr-2 text-orange-500 flex-shrink-0" />}
                    {delivery.status === 'CANCELLED' && <XCircle className="h-5 w-5 mr-2 text-gray-400 flex-shrink-0" />}
                    {(delivery.status === 'PENDING' || delivery.status === 'SCHEDULED') && <CalendarDays className="h-5 w-5 mr-2 text-gray-500 flex-shrink-0" />}
                    <div>
                      <span className="font-medium text-gray-800 dark:text-gray-100">{format(delivery.date, 'EEE, dd MMM yyyy')}</span>
                      <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        delivery.status === 'SKIPPED' ? 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100'
                        : delivery.status === 'DELIVERED' ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100'
                        : delivery.status === 'NOT_DELIVERED' ? 'bg-orange-100 text-orange-700 dark:bg-orange-700 dark:text-orange-100'
                        : delivery.status === 'CANCELLED' ? 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                        : delivery.date.getTime() === today.getTime() && delivery.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-100'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-200'
                      }`}>
                        {delivery.date.getTime() === today.getTime() && delivery.status === 'SCHEDULED' ? 'TODAY' : delivery.status}
                      </span>
                    </div>
                  </div>
                  {isAfter(delivery.date, today) && (delivery.status === 'PENDING' || (delivery.status === 'SCHEDULED' && delivery.date.getTime() !== today.getTime())) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSkipDelivery(delivery.id)}
                      disabled={isSkipping[delivery.id]}
                      className="flex items-center text-sm text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/50 border-amber-300 hover:border-amber-400"
                    >
                      {isSkipping[delivery.id] ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <SkipForward className="mr-1.5 h-4 w-4" />}
                      {isSkipping[delivery.id] ? 'Skipping...' : 'Skip'}
                    </Button>
                  )}
                  {delivery.status === 'SKIPPED' && isAfter(delivery.date, today) && (
                     <span className='text-xs text-red-500 italic ml-auto'>Skipped by you</span>
                  )}
                </div>
              );
            })}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No delivery dates found for this subscription.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ManageSubscriptionPage;
