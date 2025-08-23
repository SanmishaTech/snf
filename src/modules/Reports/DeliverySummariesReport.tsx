import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Download, BarChart3, TrendingUp, Package, Clock, Filter } from 'lucide-react';
import { format } from 'date-fns';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { 
  DeliverySummaryFilters, 
  DeliverySummaryResponse,
  DeliverySummaryItem,
  DeliveryAgencySummary,
  DeliveryVariantSummary,
  DeliveryCombinedSummary,
  ExcelExportConfig
} from './types';
import { ExcelExporter } from './utils/excelExport';
import { backendUrl } from '@/config';

const API_URL = backendUrl;

export default function DeliverySummariesReport() {
  const { isAdmin } = useRoleAccess();
  
  // Determine if current user is a delivery agent (AGENCY)
  let isAgency = false;
  let currentAgencyId: string | null = null;
  try {
    const userStr = localStorage.getItem('user');
    const agencyIdStr = localStorage.getItem('agencyId');
    if (userStr) {
      const userObj = JSON.parse(userStr);
      const role = (userObj?.role || '').toString().toUpperCase();
      isAgency = role === 'AGENCY';
      if (!agencyIdStr && userObj?.agencyId) {
        currentAgencyId = String(userObj.agencyId);
      } else {
        currentAgencyId = agencyIdStr;
      }
    }
  } catch (e) {
    // ignore parsing errors
  }
  
  // State for filters
  const [filters, setFilters] = useState<DeliverySummaryFilters>({
    startDate: format(new Date(new Date().setDate(new Date().getDate() - 7)), 'yyyy-MM-dd'), // 7 days ago
    endDate: format(new Date(new Date().setDate(new Date().getDate() + 30)), 'yyyy-MM-dd'), // 30 days from today
    groupBy: 'agency,variant' // Always group by both agency and variants
  });
  
// Fetch list of agencies for admin filter
  const { data: filterOptions } = useQuery<any>({
    queryKey: ['deliveryFiltersForSummaries'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/reports/delivery-filters`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    },
    enabled: isAdmin
  });

  // Fetch report data
const { data: reportData, isLoading, refetch } = useQuery<DeliverySummaryResponse>({
    queryKey: ['deliverySummariesReport', filters, isAdmin, isAgency, currentAgencyId],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (!value) return;
        // For AGENCY users, let the backend infer via token; do not send conflicting agencyId
        if (isAgency && key === 'agencyId') return;
        params.append(key, value.toString());
        console.log(`Adding param: ${key} = ${value}`);
      });
      // For admins, allow selecting an agency via filters (if we add UI). If not present, no agencyId will be sent.
      if (isAdmin && (filters as any).agencyId) {
        params.set('agencyId', String((filters as any).agencyId));
      }
      
      const url = `${API_URL}/api/reports/delivery-summaries?${params.toString()}`;
      console.log('Making request to:', url);
      console.log('Current filters:', filters);
      
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('API Response:', response.data);
      return response.data;
    },
    enabled: isAdmin || isAgency
  });
  
  // Handle filter changes
  const handleFilterChange = (key: keyof DeliverySummaryFilters, value: any) => {
    console.log(`Filter change: ${key} = ${value}`);
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      console.log('New filters state:', newFilters);
      return newFilters;
    });
  };
  
  // Export to Excel
  const handleExportToExcel = () => {
    if (!reportData?.data?.summary) {
      toast.error('No data to export');
      return;
    }
    
    const exporter = new ExcelExporter();
    
    // Create headers based on grouping type
    const statusList = reportData.data.statusList || [];
    const groupBy = reportData.data.groupBy || 'agency';
    
    let headers = [
      { key: 'name', label: getGroupingLabel(groupBy), width: 30 }
    ];
    
    // Add conditional headers based on grouping
    if (groupBy === 'agency') {
      headers.push({ key: 'city', label: 'City', width: 15 });
    } else if (groupBy === 'variant') {
      headers.push(
        { key: 'productName', label: 'Product', width: 20 },
        { key: 'variantName', label: 'Variant', width: 20 }
      );
    } else if (groupBy.includes('agency') && groupBy.includes('variant')) {
      headers.push(
        { key: 'agency', label: 'Agency', width: 20 },
        { key: 'agencyCity', label: 'Agency City', width: 15 },
        { key: 'productName', label: 'Product', width: 20 },
        { key: 'variantName', label: 'Variant', width: 20 }
      );
    }
    
    // Add status count columns
    statusList.forEach(status => {
      headers.push(
        {
          key: `${status.toLowerCase()}_count`,
          label: `${status} Count`,
          width: 12,
          align: 'right' as const
        },
        {
          key: `${status.toLowerCase()}_qty`,
          label: `${status} Qty`,
          width: 12,
          align: 'right' as const
        }
      );
    });
    
    headers.push(
      { key: 'totalCount', label: 'Total Count', width: 12, align: 'right' as const },
      { key: 'totalQuantity', label: 'Total Qty', width: 12, align: 'right' as const }
    );
    
    // Transform data for Excel - each item becomes a row with status counts as columns
    const excelData = reportData.data.summary.map((item: DeliverySummaryItem, index: number) => {
      console.log(`Excel Export Debug - Item ${index}:`, item);
      
      const row: any = {
        name: item.name,
        totalCount: item.totalCount,
        totalQuantity: item.totalQuantity || 0
      };
      
      // Handle different data structures properly
      if (groupBy === 'agency' && 'city' in item) {
        row.city = item.city || '';
        console.log('Agency grouping - added city:', row.city);
      } else if (groupBy === 'variant' && 'productName' in item) {
        row.productName = (item as any).productName || '';
        row.variantName = (item as any).variantName || '';
        console.log('Variant grouping - added productName/variantName:', row.productName, row.variantName);
      } else if (groupBy.includes('agency') && groupBy.includes('variant')) {
        // For agency+variant combination, extract all fields directly from item
        const itemData = item as any;
        
        row.agency = itemData.agencyName || '';
        row.agencyCity = itemData.agencyCity || '';
        row.productName = itemData.productName || '';
        row.variantName = itemData.variantName || '';
        
        console.log('Agency+Variant grouping - Item data:', {
          agencyName: itemData.agencyName,
          agencyCity: itemData.agencyCity,
          productName: itemData.productName,
          variantName: itemData.variantName
        });
        console.log('Agency+Variant grouping - Row data:', {
          agency: row.agency,
          agencyCity: row.agencyCity,
          productName: row.productName,
          variantName: row.variantName
        });
      }
      
      // Add status counts as columns
      statusList.forEach(status => {
        row[`${status.toLowerCase()}_count`] = item.statusCounts[status] || 0;
        if (item.quantityCounts) {
          row[`${status.toLowerCase()}_qty`] = item.quantityCounts[status] || 0;
        }
      });
      
      console.log(`Final row for Excel item ${index}:`, row);
      return row;
    });
    
    // Add totals row
    const totalsRow: any = {
      name: 'TOTAL',
      totalCount: reportData.data.totals.totalDeliveries,
      totalQuantity: reportData.data.summary.reduce((sum, item) => sum + (item.totalQuantity || 0), 0)
    };
    
    // Add empty values for conditional columns based on grouping
    if (groupBy === 'agency') {
      totalsRow.city = '';
    } else if (groupBy === 'variant') {
      totalsRow.productName = '';
      totalsRow.variantName = '';
    } else if (groupBy.includes('agency') && groupBy.includes('variant')) {
      totalsRow.agency = '';
      totalsRow.agencyCity = '';
      totalsRow.productName = '';
      totalsRow.variantName = '';
    }
    
    statusList.forEach(status => {
      totalsRow[`${status.toLowerCase()}_count`] = reportData.data.totals.statusTotals[status] || 0;
      totalsRow[`${status.toLowerCase()}_qty`] = reportData.data.summary.reduce((sum, item) => 
        sum + ((item.quantityCounts && item.quantityCounts[status]) || 0), 0);
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
  
  // Get grouping label based on groupBy value
  const getGroupingLabel = (groupBy: string): string => {
    switch (groupBy) {
      case 'agency':
        return 'Delivery Agency';
      case 'variant':
        return 'Product Variant';
      case 'agency,variant':
      case 'variant,agency':
        return 'Agency + Variant';
      default:
        return 'Item';
    }
  };
  
  // Render conditional headers based on grouping
  const renderConditionalHeaders = (groupBy: string) => {
    if (groupBy === 'agency') {
      return <TableHead className="font-semibold">City</TableHead>;
    } else if (groupBy === 'variant') {
      return (
        <>
          <TableHead className="font-semibold">Product</TableHead>
          <TableHead className="font-semibold">Variant</TableHead>
        </>
      );
    } else if (groupBy.includes('agency') && groupBy.includes('variant')) {
      return (
        <>
          <TableHead className="font-semibold">Agency</TableHead>
          <TableHead className="font-semibold">City</TableHead>
          <TableHead className="font-semibold">Product</TableHead>
          <TableHead className="font-semibold">Variant</TableHead>
        </>
      );
    }
    return null;
  };
  
  // Render conditional cells based on grouping and item type
  const renderConditionalCells = (item: DeliverySummaryItem, groupBy: string) => {
    if (groupBy === 'agency' && 'city' in item) {
      return <TableCell>{item.city || '-'}</TableCell>;
    } else if (groupBy === 'variant' && 'productName' in item) {
      return (
        <>
          <TableCell>{item.productName}</TableCell>
          <TableCell>{item.variantName}</TableCell>
        </>
      );
    } else if (groupBy.includes('agency') && groupBy.includes('variant') && 'agencyName' in item) {
      return (
        <>
          <TableCell>{item.agencyName}</TableCell>
          <TableCell>{item.agencyCity}</TableCell>
          <TableCell>{item.productName}</TableCell>
          <TableCell>{item.variantName}</TableCell>
        </>
      );
    }
    return null;
  };
  
  // Render conditional total cells (empty cells for totals row)
  const renderConditionalTotalCells = (groupBy: string) => {
    if (groupBy === 'agency') {
      return <TableCell className="font-bold">-</TableCell>;
    } else if (groupBy === 'variant') {
      return (
        <>
          <TableCell className="font-bold">-</TableCell>
          <TableCell className="font-bold">-</TableCell>
        </>
      );
    } else if (groupBy.includes('agency') && groupBy.includes('variant')) {
      return (
        <>
          <TableCell className="font-bold">-</TableCell>
          <TableCell className="font-bold">-</TableCell>
          <TableCell className="font-bold">-</TableCell>
          <TableCell className="font-bold">-</TableCell>
        </>
      );
    }
    return null;
  };
  
const canView = isAdmin || isAgency;
  if (!canView) {
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
                Status-wise delivery counts grouped by agency and product variants
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
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            {isAdmin && (
              <div className="space-y-2">
                <Label htmlFor="summaryAgencyId">Delivery Agency</Label>
                <Select
                  value={(filters as any).agencyId ? String((filters as any).agencyId) : 'all'}
                  onValueChange={(value) => handleFilterChange('agencyId' as any, value === 'all' ? undefined : parseInt(value))}
                >
                  <SelectTrigger id="summaryAgencyId">
                    <SelectValue placeholder="All Agencies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Agencies</SelectItem>
                    {filterOptions?.data?.agencies?.map((agency: any) => (
                      <SelectItem key={agency.id} value={agency.id.toString()}>
                        {agency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          {/* Summary Statistics */}
          {totals && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <Card className="p-4">
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Deliveries</p>
                    <p className="text-2xl font-bold">{totals.totalDeliveries.toLocaleString()}</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {getGroupingLabel(reportData?.data?.groupBy || 'agency')}s
                    </p>
                    <p className="text-2xl font-bold">
                      {totals.totalAgencies || totals.totalVariants || totals.totalCombinations || 0}
                    </p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Delivered</p>
                    <p className="text-2xl font-bold text-green-600">
                      {totals.statusTotals?.['DELIVERED'] || 0}
                    </p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {totals.statusTotals?.['PENDING'] || 0}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}
          
          {/* Data Table */}
          {reportData?.data?.summary && (
            <Card className="mt-4">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold">
                          {getGroupingLabel(reportData.data.groupBy || 'agency')}
                        </TableHead>
                        {renderConditionalHeaders(reportData.data.groupBy || 'agency')}
                        {statusList.map(status => (
                          <React.Fragment key={status}>
                            <TableHead className="text-center font-semibold">
                              {status}
                            </TableHead>
                            <TableHead className="text-center font-semibold text-xs text-gray-500">
                              Qty
                            </TableHead>
                          </React.Fragment>
                        ))}
                        <TableHead className="text-center font-semibold">Total</TableHead>
                        <TableHead className="text-center font-semibold text-xs text-gray-500">
                          Total Qty
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summaryData.map((item, index) => (
                        <TableRow key={index} className="hover:bg-gray-50">
                          <TableCell className="font-medium">
                            {item.name}
                          </TableCell>
                          {renderConditionalCells(item, reportData.data.groupBy || 'agency')}
                          {statusList.map(status => (
                            <React.Fragment key={status}>
                              <TableCell className="text-center">
                                <Badge 
                                  variant={getStatusBadgeVariant(status)}
                                  className="min-w-[40px]"
                                >
                                  {item.statusCounts[status] || 0}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center text-sm text-gray-600">
                                {item.quantityCounts?.[status] || 0}
                              </TableCell>
                            </React.Fragment>
                          ))}
                          <TableCell className="text-center font-semibold">
                            {item.totalCount}
                          </TableCell>
                          <TableCell className="text-center text-sm font-medium text-gray-600">
                            {item.totalQuantity || 0}
                          </TableCell>
                        </TableRow>
                      ))}
                      
                      {/* Totals Row */}
                      <TableRow className="bg-gray-100 font-semibold">
                        <TableCell className="font-bold">TOTAL</TableCell>
                        {renderConditionalTotalCells(reportData.data.groupBy || 'agency')}
                        {statusList.map(status => (
                          <React.Fragment key={status}>
                            <TableCell className="text-center font-bold">
                              {totals.statusTotals[status] || 0}
                            </TableCell>
                            <TableCell className="text-center text-sm font-bold">
                              {summaryData.reduce((sum, item) => 
                                sum + ((item.quantityCounts && item.quantityCounts[status]) || 0), 0)}
                            </TableCell>
                          </React.Fragment>
                        ))}
                        <TableCell className="text-center font-bold">
                          {totals.totalDeliveries}
                        </TableCell>
                        <TableCell className="text-center text-sm font-bold">
                          {summaryData.reduce((sum, item) => sum + (item.totalQuantity || 0), 0)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
          
          {isLoading && (
            <Card className="mt-4">
              <CardContent className="py-8">
                <div className="text-center text-gray-500">Loading delivery summaries...</div>
              </CardContent>
            </Card>
          )}
          
          {!isLoading && (!reportData?.data?.summary || reportData.data.summary.length === 0) && (
            <Card className="mt-4">
              <CardContent className="py-8">
                <div className="text-center text-gray-500">No delivery data found for the selected period.</div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
