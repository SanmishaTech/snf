import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, X } from 'lucide-react';
import { format } from 'date-fns';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { 
  SubscriptionReportFilters, 
  SubscriptionReportResponse,
  SubscriptionReportItem,
  ExcelExportConfig
} from './types';
import { ExcelExporter } from './utils/excelExport';
import { backendUrl } from '@/config';

const API_URL = backendUrl;

export default function SubscriptionReports() {
  const { isAdmin } = useRoleAccess();

  const getOrderId = (subscription: SubscriptionReportItem): string | number => {
    const raw = subscription as any;
    return (
      raw?.orderId ??
      ''
    );
  };

  const getOrderDateRaw = (subscription: SubscriptionReportItem): string => {
    const raw = subscription as any;
    return (
      raw?.orderDate ??
      ''
    );
  };

  const formatOrderDate = (value: string): string => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return format(d, 'dd/MM/yyyy');
  };
  
  // State for filters
  const [filters, setFilters] = useState<SubscriptionReportFilters>({
    startDate: format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'), // 30 days ago
    endDate: format(new Date(), 'yyyy-MM-dd'), // today
    status: 'all',
    paymentStatus: undefined,
    page: 1,
    limit: 50
  });
  
  
  // Fetch report data
  const { data: reportData, isLoading, refetch, error } = useQuery<SubscriptionReportResponse>({
    queryKey: ['subscriptionReports', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
      
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/reports/subscriptions?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    },
    enabled: isAdmin
  });

  useEffect(() => {
    if (!reportData?.data || reportData.data.length === 0) return;
    const first = reportData.data[0] as any;
    const orderKeys = first?.order ? Object.keys(first.order) : [];
    console.log('[SubscriptionReports] first row keys:', Object.keys(first));
    if (orderKeys.length > 0) {
      console.log('[SubscriptionReports] first row order keys:', orderKeys);
    }
  }, [reportData]);
  
  // Handle filter changes
  const handleFilterChange = (key: keyof SubscriptionReportFilters, value: any) => {
    setFilters(prev => ({ 
      ...prev, 
      [key]: value,
      ...(key !== 'page' ? { page: 1 } : {}) // Reset to page 1 when other filters change
    }));
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      startDate: format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      status: 'all',
      paymentStatus: undefined,
      page: 1,
      limit: 50
    });
  };
  
  // Export to Excel
  const handleExportToExcel = () => {
    if (!reportData?.data || reportData.data.length === 0) {
      toast.error('No data to export');
      return;
    }
    
    const exporter = new ExcelExporter();
    
    // Create headers for subscription data
    const headers = [
      { key: 'orderId', label: 'Order ID', width: 12 },
      { key: 'orderDate', label: 'Order Date', width: 14 },
      { key: 'customerId', label: 'Member ID', width: 12 },
      { key: 'memberName', label: 'Member Name', width: 20 },
      { key: 'memberEmail', label: 'Email', width: 25 },
      { key: 'memberMobile', label: 'Mobile', width: 15 },
      { key: 'productName', label: 'Product', width: 20 },
      { key: 'variantName', label: 'Variant', width: 20 },
      { key: 'deliverySchedule', label: 'Schedule', width: 15 },
      { key: 'dailyQty', label: 'Daily Qty', width: 12, align: 'right' as const },
      { key: 'totalQty', label: 'Total Qty', width: 12, align: 'right' as const },
      { key: 'alternateQty', label: 'Alt Qty', width: 12, align: 'right' as const },
      { key: 'amount', label: 'Amount', width: 15, align: 'right' as const },
      { key: 'paymentStatus', label: 'Payment Status', width: 15 },
      { key: 'agencyName', label: 'Agency Name', width: 20 },
      { key: 'agencyCity', label: 'Agency City', width: 15 },
      { key: 'agencyAssigned', label: 'Agency Assigned', width: 15 },
      { key: 'startDate', label: 'From Date', width: 12 },
      { key: 'expiryDate', label: 'To Date', width: 12 },
      { key: 'isExpired', label: 'Expired', width: 10 },
      { key: 'deliveryAddress', label: 'Delivery Address', width: 30 }
    ];
    
    // Transform data for Excel export
    const excelData = reportData.data.map((subscription: SubscriptionReportItem) => ({
      orderId: getOrderId(subscription),
      orderDate: formatOrderDate(getOrderDateRaw(subscription)),
      customerId: subscription.memberId,
      memberName: subscription.memberName,
      memberEmail: subscription.memberEmail,
      memberMobile: subscription.memberMobile,
      productName: subscription.productName,
      variantName: subscription.variantName,
      deliverySchedule: subscription.deliverySchedule,
      dailyQty: subscription.dailyQty,
      totalQty: subscription.totalQty,
      alternateQty: subscription.alternateQty || 'N/A',
      amount: subscription.amount,
      paymentStatus: subscription.paymentStatus,
      agencyName: subscription.agencyName || 'Unassigned',
      agencyCity: subscription.agencyCity || 'N/A',
      agencyAssigned: subscription.agencyAssigned ? 'Yes' : 'No',
      startDate: subscription.startDate ? format(new Date(subscription.startDate), 'dd/MM/yyyy') : '',
      expiryDate: subscription.expiryDate ? format(new Date(subscription.expiryDate), 'dd/MM/yyyy') : '',
      isExpired: subscription.isExpired ? 'Yes' : 'No',
      deliveryAddress: subscription.deliveryAddress?.fullAddress || 'N/A'
    }));
    
    const exportConfig: ExcelExportConfig = {
      fileName: 'Subscription_Reports',
      sheetName: 'Subscriptions',
      headers,
      grouping: {
        enabled: false,
        levels: [],
        showTotals: false
      }
    };
    
    exporter.exportToExcel({
      data: excelData as any,
      config: exportConfig
    });
    
    toast.success('Report exported successfully');
  };
  
  if (!isAdmin) {
    return (
      <Card className="m-4">
        <CardContent className="pt-6">
          <p className="text-center text-gray-600">You don't have permission to view this report.</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="m-4">
        <CardContent className="pt-6">
          <p className="text-center text-red-600">Error loading subscription reports: {(error as any)?.message || 'Unknown error'}</p>
          <div className="text-center mt-4">
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="container mx-auto p-4 space-y-4 overflow-x-hidden">
      <Card>
        	<CardHeader>
          	<div className="flex items-center justify-between gap-2">
          		<CardTitle>Subscription Report</CardTitle>
          		<div className="flex justify-end items-center gap-2">
            	<Button 
              onClick={handleExportToExcel} 
              disabled={!reportData?.data || reportData.data.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Export to Excel
            </Button>
          		</div>
          	</div>
        	</CardHeader>
        
          <CardContent className="border-t bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Expiry Status</Label>
                <Select
                  value={filters.status || 'all'}
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Subscriptions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subscriptions</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="not_expired">Not Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="paymentStatus">Payment Status</Label>
                <Select
                  value={filters.paymentStatus || 'all'}
                  onValueChange={(value) => handleFilterChange('paymentStatus', value === 'all' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Payments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payments</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
              <Button onClick={() => refetch()}>
                Apply Filters
              </Button>
            </div>
          </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="py-10 text-center text-sm text-gray-600">Loading subscription reports...</div>
          ) : !reportData?.data || reportData.data.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-600">
              No subscriptions found for the selected filters.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                Total: {reportData?.summary?.totalSubscriptions ?? reportData.data.length}
              </div>

              <div className="overflow-x-auto">
                <Table className="min-w-[1400px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Order Date</TableHead>
                      <TableHead>Member ID</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead className="text-right">Daily Qty</TableHead>
                      <TableHead className="text-right">Total Qty</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Agency</TableHead>
                      <TableHead>From Date</TableHead>
                      <TableHead>To Date</TableHead>
                      <TableHead>Expired</TableHead>
                      <TableHead>Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.data.map((subscription: SubscriptionReportItem) => (
                      <TableRow key={subscription.id}>
                        <TableCell>{getOrderId(subscription) || '-'}</TableCell>
                        <TableCell>
                          {formatOrderDate(getOrderDateRaw(subscription)) || '-'}
                        </TableCell>
                        <TableCell>{subscription.memberId ?? '-'}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{subscription.memberName}</span>
                            <span className="text-xs text-gray-600">{subscription.memberEmail}</span>
                          </div>
                        </TableCell>
                        <TableCell>{subscription.productName}</TableCell>
                        <TableCell>{subscription.variantName}</TableCell>
                        <TableCell>{subscription.deliverySchedule}</TableCell>
                        <TableCell className="text-right">{subscription.dailyQty}</TableCell>
                        <TableCell className="text-right">{subscription.totalQty}</TableCell>
                        <TableCell className="text-right">
                          ₹{(subscription.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>{subscription.paymentStatus}</TableCell>
                        <TableCell>{subscription.agencyName || 'Unassigned'}</TableCell>
                        <TableCell>
                          {subscription.startDate ? format(new Date(subscription.startDate), 'dd/MM/yyyy') : ''}
                        </TableCell>
                        <TableCell>
                          {subscription.expiryDate ? format(new Date(subscription.expiryDate), 'dd/MM/yyyy') : ''}
                        </TableCell>
                        <TableCell>{subscription.isExpired ? 'Yes' : 'No'}</TableCell>
                        <TableCell
                          className="min-w-[420px] max-w-[520px] whitespace-normal break-words"
                          title={subscription.deliveryAddress?.fullAddress || ''}
                        >
                          {subscription.deliveryAddress?.fullAddress || 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {reportData?.summary?.totalPages ? (
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    disabled={(filters.page ?? 1) <= 1}
                    onClick={() => handleFilterChange('page', Math.max(1, (filters.page ?? 1) - 1))}
                  >
                    Prev
                  </Button>
                  <div className="text-sm text-gray-600">
                    Page {filters.page ?? 1} of {reportData.summary.totalPages}
                  </div>
                  <Button
                    variant="outline"
                    disabled={(filters.page ?? 1) >= reportData.summary.totalPages}
                    onClick={() => handleFilterChange('page', (filters.page ?? 1) + 1)}
                  >
                    Next
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
