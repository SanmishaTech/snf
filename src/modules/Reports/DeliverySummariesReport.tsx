import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Download, BarChart3, TrendingUp, Package, Clock } from 'lucide-react';
import { format } from 'date-fns';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { 
  DeliverySummaryFilters, 
  DeliverySummaryResponse,
  DeliveryAgencySummary,
  ExcelExportConfig
} from './types';
import { ExcelExporter } from './utils/excelExport';
import { backendUrl } from '@/config';

const API_URL = backendUrl;

export default function DeliverySummariesReport() {
  const { isAdmin } = useRoleAccess();
  
  // State for filters
  const [filters, setFilters] = useState<DeliverySummaryFilters>({
    startDate: format(new Date(new Date().setDate(new Date().getDate() - 7)), 'yyyy-MM-dd'), // 7 days ago
    endDate: format(new Date(new Date().setDate(new Date().getDate() + 30)), 'yyyy-MM-dd') // 30 days from today
  });
  
  // Fetch report data
  const { data: reportData, isLoading, refetch } = useQuery<DeliverySummaryResponse>({
    queryKey: ['deliverySummariesReport', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });
      
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/reports/delivery-summaries?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    },
    enabled: isAdmin
  });
  
  // Handle filter changes
  const handleFilterChange = (key: keyof DeliverySummaryFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  // Export to Excel
  const handleExportToExcel = () => {
    if (!reportData?.data?.summary) {
      toast.error('No data to export');
      return;
    }
    
    const exporter = new ExcelExporter();
    
    // Create headers - first column is Agency, then dynamic status columns
    const statusList = reportData.data.statusList || [];
    const headers = [
      { key: 'agency', label: 'Delivery Agency', width: 25 },
      { key: 'city', label: 'City', width: 15 },
      ...statusList.map(status => ({
        key: status.toLowerCase(),
        label: status.charAt(0).toUpperCase() + status.slice(1),
        width: 12,
        align: 'right' as const
      })),
      { key: 'total', label: 'Total', width: 12, align: 'right' as const }
    ];
    
    // Transform data for Excel - each agency becomes a row with status counts as columns
    const excelData = reportData.data.summary.map((agency: DeliveryAgencySummary) => {
      const row: any = {
        agency: agency.name,
        city: agency.city || '',
        total: agency.totalCount
      };
      
      // Add status counts as columns
      statusList.forEach(status => {
        row[status.toLowerCase()] = agency.statusCounts[status] || 0;
      });
      
      return row;
    });
    
    // Add totals row
    const totalsRow: any = {
      agency: 'TOTAL',
      city: '',
      total: reportData.data.totals.totalDeliveries
    };
    
    statusList.forEach(status => {
      totalsRow[status.toLowerCase()] = reportData.data.totals.statusTotals[status] || 0;
    });
    
    excelData.push(totalsRow);
    
    const exportConfig: ExcelExportConfig = {
      fileName: 'Delivery_Summaries_Report',
      sheetName: 'Delivery Summaries',
      headers,
      grouping: {
        enabled: false, // This is a flat summary table
        levels: [],
        showTotals: false // We manually add totals row
      }
    };
    
    exporter.exportToExcel({
      data: excelData,
      totals: reportData.data.totals,
      config: exportConfig
    });
    
    toast.success('Report exported successfully');
  };
  
  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      case 'in_transit':
        return 'outline';
      default:
        return 'secondary';
    }
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
  
  const statusList = reportData?.data?.statusList || [];
  const summaryData = reportData?.data?.summary || [];
  const totals = reportData?.data?.totals;
  
  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Delivery Summaries Report
              </CardTitle>
              <CardDescription>
                Status-wise delivery counts by agency
              </CardDescription>
            </div>
            <Button onClick={handleExportToExcel} disabled={!reportData?.data?.summary}>
              <Download className="mr-2 h-4 w-4" />
              Export to Excel
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
          
          {/* Summary Stats */}
          {totals && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{totals.totalDeliveries}</div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    Total Deliveries
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{totals.totalAgencies}</div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Active Agencies
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-600">
                    {totals.statusTotals?.DELIVERED || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Delivered</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-orange-600">
                    {totals.statusTotals?.PENDING || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Summary Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Delivery Agency</TableHead>
                  <TableHead className="font-semibold">City</TableHead>
                  {statusList.map(status => (
                    <TableHead key={status} className="text-center font-semibold">
                      <Badge variant={getStatusBadgeVariant(status)} className="text-xs">
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Badge>
                    </TableHead>
                  ))}
                  <TableHead className="text-center font-semibold">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={statusList.length + 3} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <Clock className="h-4 w-4 animate-spin" />
                        Loading report data...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : summaryData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={statusList.length + 3} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Package className="h-8 w-8" />
                        <p>No data available for the selected date range</p>
                        <p className="text-sm">Try adjusting your filters or selecting a different date range</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {summaryData.map((agency, index) => (
                      <TableRow key={agency.id || index} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{agency.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{agency.city || '-'}</TableCell>
                        {statusList.map(status => (
                          <TableCell key={status} className="text-center">
                            <span className="font-mono">
                              {agency.statusCounts[status] || 0}
                            </span>
                          </TableCell>
                        ))}
                        <TableCell className="text-center font-semibold">
                          {agency.totalCount}
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {/* Totals Row */}
                    {totals && (
                      <TableRow className="border-t-2 bg-gray-50 font-semibold">
                        <TableCell className="font-bold">TOTAL</TableCell>
                        <TableCell>-</TableCell>
                        {statusList.map(status => (
                          <TableCell key={status} className="text-center font-bold">
                            {totals.statusTotals[status] || 0}
                          </TableCell>
                        ))}
                        <TableCell className="text-center font-bold">
                          {totals.totalDeliveries}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Additional Info */}
          {reportData?.data && (
            <div className="text-sm text-muted-foreground">
              Report generated for {format(new Date(filters.startDate), 'dd MMM yyyy')} to{' '}
              {format(new Date(filters.endDate), 'dd MMM yyyy')} •{' '}
              {reportData.data.recordCount} total delivery records processed
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
