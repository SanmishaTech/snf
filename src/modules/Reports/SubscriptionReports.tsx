import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, X } from 'lucide-react';
import { format } from 'date-fns';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
      { key: 'id', label: 'ID', width: 10 },
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
      { key: 'startDate', label: 'Start Date', width: 12 },
      { key: 'expiryDate', label: 'Expiry Date', width: 12 },
      { key: 'isExpired', label: 'Expired', width: 10 },
      { key: 'deliveryAddress', label: 'Delivery Address', width: 30 }
    ];
    
    // Transform data for Excel export
    const excelData = reportData.data.map((subscription: SubscriptionReportItem) => ({
      id: subscription.id,
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
      data: excelData,
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
    <div className="container mx-auto p-4 space-y-4">
      <Card>
        	<CardHeader>
          	<div className="flex justify-end items-center gap-2">
            	<Button 
              onClick={handleExportToExcel} 
              disabled={!reportData?.data || reportData.data.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Export to Excel
            </Button>
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
    </div>
  );
}
