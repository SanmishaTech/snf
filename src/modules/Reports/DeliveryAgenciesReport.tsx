import React, { useState, useEffect } from 'react';
import { Download, ChevronDown, ChevronRight, UserCheck, MapPin, Package } from 'lucide-react';
import { format } from 'date-fns';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { 
  DeliveryAgencyFilters, 
  DeliveryAgencyReportResponse, 
  DeliveryAgencyFiltersResponse,
  DeliveryGroupedData,
  DeliveryItem,
  ExcelExportConfig
} from './types';
import { ExcelExporter } from './utils/excelExport';
import { backendUrl } from '@/config';

const API_URL = backendUrl;

export default function DeliveryAgenciesReport() {
  const { isAdmin, isAgency } = useRoleAccess();
  
  // State for filters
  const [filters, setFilters] = useState<DeliveryAgencyFilters>({
    startDate: format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    groupBy: 'agency,area,variant,status'
  });
  
  // State for UI
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  
  // Fetch filter options
  const { data: filterOptions } = useQuery<DeliveryAgencyFiltersResponse>({
    queryKey: ['deliveryReportFilters'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/reports/delivery-filters`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    },
    enabled: isAdmin || isAgency
  });
  
  // For AGENCY users, reflect their current agency in filters so exports use it
  useEffect(() => {
    if (isAgency) {
      const currentAgencyId = filterOptions?.data?.agencies?.[0]?.id;
      if (currentAgencyId && !filters.agencyId) {
        setFilters(prev => ({ ...prev, agencyId: currentAgencyId }));
      }
    }
    // We only want to run when the filter options are loaded or agency-ness changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAgency, filterOptions]);
  
  // Fetch report data
  const { data: reportData } = useQuery<DeliveryAgencyReportResponse>({
    queryKey: ['deliveryAgenciesReport', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });
      
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/reports/delivery-agencies?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    },
    enabled: isAdmin || isAgency
  });
  
  // Handle filter changes
  const handleFilterChange = (key: keyof DeliveryAgencyFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  // Handle group expansion
  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };
  
  // Export to Excel
  const handleExportToExcel = () => {
    if (!reportData?.data?.report) {
      toast.error('No data to export');
      return;
    }
    
    const exporter = new ExcelExporter();
    const exportConfig: ExcelExportConfig = {
      fileName: 'Delivery_Agencies_Report',
      sheetName: 'Delivery Agencies',
      headers: [
        { key: 'orderId', label: 'Order ID', width: 15 },
        { key: 'date', label: 'Delivery Date', width: 12 },
        { key: 'product', label: 'Product', width: 25 },
        { key: 'qty', label: 'Quantity', width: 10, align: 'right' },
        { key: 'customer', label: 'Customer', width: 20 },
        { key: 'address', label: 'Delivery Address', width: 30 },
        { key: 'area', label: 'Area', width: 15 },
        { key: 'agency', label: 'Agency', width: 20 },
        { key: 'status', label: 'Status', width: 12 },
        { key: 'amount', label: 'Amount', width: 15, align: 'right' },
       ],
      grouping: {
        enabled: true,
        levels: filters.groupBy?.split(',') || [],
        showTotals: true
      }
    };
    
    exporter.exportToExcel({
      data: reportData.data.report,
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
  
  // Render grouped data recursively
  const renderGroupedData = (data: DeliveryGroupedData[] | DeliveryItem[], level: number = 0): React.ReactElement[] => {
    if (!Array.isArray(data)) return [];
    
    // Check if this is grouped data or flat data
    const isGrouped = data.length > 0 && 'level' in data[0];
    
    if (!isGrouped) {
      // Render flat data as table rows
      return (data as DeliveryItem[]).map((item, index) => (
        <TableRow key={`${item.orderId}-${index}`} className="hover:bg-gray-50">
          <TableCell className="pl-8">{item.orderId}</TableCell>
          <TableCell className="text-sm">
            {format(new Date(item.deliveryDate), 'dd MMM yyyy')}
          </TableCell>
          <TableCell className="text-sm">{item.productName} - {item.variantName}</TableCell>
          <TableCell className="text-right">{item.quantity}</TableCell>
          <TableCell>{item.customerName}</TableCell>
          <TableCell className="text-sm max-w-xs truncate" title={item.deliveryAddress}>
            {item.deliveryAddress}
          </TableCell>
          <TableCell>{item.areaName}</TableCell>
          <TableCell>
            <Badge variant={getStatusBadgeVariant(item.status)}>
              {item.status}
            </Badge>
          </TableCell>
          <TableCell className="text-right font-medium">
            ₹{(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </TableCell>
        </TableRow>
      ));
    }
    
    // Render grouped data
    return (data as DeliveryGroupedData[]).map((group) => {
      const groupId = `${group.level}-${group.id}`;
      const isExpanded = expandedGroups.has(groupId);
      const indent = level * 20;
      
      // Get icon based on group level
      const getGroupIcon = () => {
        switch (group.level) {
          case 'agency':
            return <UserCheck size={16} className="mr-2" />;
          case 'area':
            return <MapPin size={16} className="mr-2" />;
          case 'variant':
            return <Package size={16} className="mr-2" />;
          case 'status':
            return <Package size={16} className="mr-2" />;
          default:
            return null;
        }
      };
      
      return (
        <React.Fragment key={groupId}>
          <TableRow 
            className={`cursor-pointer hover:bg-gray-100 ${
              group.level === 'agency' ? 'bg-blue-50' : 
              group.level === 'area' ? 'bg-green-50' : 
              group.level === 'variant' ? 'bg-purple-50' :
              'bg-orange-50'
            }`}
            onClick={() => toggleGroupExpansion(groupId)}
          >
            <TableCell colSpan={9} style={{ paddingLeft: `${indent + 16}px` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  {getGroupIcon()}
                  <span className="font-semibold">
                    {group.level === 'agency' && `Delivery Agent: ${group.name}`}
                    {group.level === 'area' && `Area: ${group.name} ${group.city ? `(${group.city})` : ''}`}
                    {group.level === 'variant' && `Product: ${group.name}`}
                    {group.level === 'status' && `Status: ${group.name}`}
                  </span>
                  <Badge variant="outline" className="ml-2">
                    {group.totals.itemCount} deliveries
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span>Packages: <strong>{group.totals.totalQuantity}</strong></span>
                  <span>Delivered: <strong>{group.totals.deliveredCount}</strong></span>
                  <span>Pending: <strong>{group.totals.pendingCount}</strong></span>
                  <span>Amount: <strong>₹{(group.totals.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                </div>
              </div>
            </TableCell>
          </TableRow>
          
          {isExpanded && Array.isArray(group.data) && renderGroupedData(group.data, level + 1)}
        </React.Fragment>
      );
    });
  };
  
  // Note: Table rendering is currently disabled; export uses reportData directly.

  if (!(isAdmin || isAgency)) {
    return (
      <Card className="m-4">
        <CardContent className="pt-6">
          <p className="text-center text-gray-600">You don't have permission to view this report.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Delivery Agencies Report</CardTitle>
              <CardDescription>
                Track delivery performance by agency, area, and status
              </CardDescription>
            </div>
            <Button onClick={handleExportToExcel} disabled={!reportData?.data?.report}>
              <Download className="mr-2 h-4 w-4" />
              Export to Excel
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            
            {isAdmin ? (
              <div className="space-y-2">
                <Label htmlFor="agencyId">Delivery Agency</Label>
                <Select
                  value={filters.agencyId?.toString() || 'all'}
                  onValueChange={(value) => handleFilterChange('agencyId', value === 'all' ? undefined : parseInt(value))}
                >
                  <SelectTrigger id="agencyId">
                    <SelectValue placeholder="All Agencies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Agencies</SelectItem>
                    {filterOptions?.data?.agencies?.map((agency: { id: number; name: string }) => (
                      <SelectItem key={agency.id} value={agency.id.toString()}>
                        {agency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="currentAgency">Current Agency</Label>
                <Input
                  id="currentAgency"
                  value={filterOptions?.data?.agencies?.[0]?.name || 'Your Agency'}
                  disabled
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="areaId">Delivery Area</Label>
              <Select
                value={filters.areaId?.toString() || 'all'}
                onValueChange={(value) => handleFilterChange('areaId', value === 'all' ? undefined : parseInt(value))}
              >
                <SelectTrigger id="areaId">
                  <SelectValue placeholder="All Areas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Areas</SelectItem>
                  {filterOptions?.data?.areas?.map((area: { id: number; name: string; city?: string }) => (
                    <SelectItem key={area.id} value={area.id.toString()}>
                      {area.name} {area.city && `(${area.city})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Grouping Options */}
          {/* <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <Label>Group By:</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={filters.groupBy?.includes('agency')}
                  onCheckedChange={(checked) => {
                    const groups = filters.groupBy?.split(',') || [];
                    if (checked) {
                      groups.push('agency');
                    } else {
                      const index = groups.indexOf('agency');
                      if (index > -1) groups.splice(index, 1);
                    }
                    handleFilterChange('groupBy', groups.join(','));
                  }}
                />
                Delivery Agent
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={filters.groupBy?.includes('area')}
                  onCheckedChange={(checked) => {
                    const groups = filters.groupBy?.split(',') || [];
                    if (checked) {
                      groups.push('area');
                    } else {
                      const index = groups.indexOf('area');
                      if (index > -1) groups.splice(index, 1);
                    }
                    handleFilterChange('groupBy', groups.join(','));
                  }}
                />
                Area
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={filters.groupBy?.includes('status')}
                  onCheckedChange={(checked) => {
                    const groups = filters.groupBy?.split(',') || [];
                    if (checked) {
                      groups.push('status');
                    } else {
                      const index = groups.indexOf('status');
                      if (index > -1) groups.splice(index, 1);
                    }
                    handleFilterChange('groupBy', groups.join(','));
                  }}
                />
                Status
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={filters.groupBy?.includes('variant')}
                  onCheckedChange={(checked) => {
                    const groups = filters.groupBy?.split(',') || [];
                    if (checked) {
                      groups.push('variant');
                    } else {
                      const index = groups.indexOf('variant');
                      if (index > -1) groups.splice(index, 1);
                    }
                    handleFilterChange('groupBy', groups.join(','));
                  }}
                />
                Variants
              </label>
            </div>
          </div> */}
          
          {/* Summary Stats */}
          {/* {reportData?.data?.totals && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{reportData.data.totals.totalDeliveries}</div>
                  <p className="text-xs text-muted-foreground">Total Deliveries</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-600">{reportData.data.totals.deliveredCount}</div>
                  <p className="text-xs text-muted-foreground">Delivered</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-orange-600">{reportData.data.totals.pendingCount}</div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    ₹{reportData.data.totals.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                </CardContent>
              </Card>
            </div>
          )} */}
          
          {/* Search */}
          {/* <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search orders, customers, areas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div> */}
          
          {/* Data Table */}
          {/* <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Loading report data...
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      No data available for the selected filters
                    </TableCell>
                  </TableRow>
                ) : (
                  renderGroupedData(filteredData)
                )}
              </TableBody>
            </Table>
          </div> */}
        </CardContent>
      </Card>
    </div>
  );
}
