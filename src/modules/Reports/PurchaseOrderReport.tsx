import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { 
  PurchaseOrderFilters, 
  PurchaseOrderReportResponse, 
  ReportFiltersResponse,
  GroupedData,
  PurchaseOrderItem,
  ExcelExportConfig
} from './types';
import { ExcelExporter } from './utils/excelExport';
import { backendUrl } from '@/config';

const API_URL = backendUrl;

export default function PurchaseOrderReport() {
  const { isAdmin, isVendor } = useRoleAccess();
  
  // State for filters
  const [filters, setFilters] = useState<PurchaseOrderFilters>({
    startDate: format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    groupBy: 'farmer,depot,variant'
  });
  
  // State for UI
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // Fetch filter options
  const { data: filterOptions } = useQuery<ReportFiltersResponse>({
    queryKey: ['reportFilters'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/reports/filters`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    },
    enabled: isAdmin || isVendor
  });
  
  // If VENDOR user, set their current farmerId automatically (locked filter)
  useEffect(() => {
    if (isVendor) {
      const currentFarmerId = filterOptions?.data?.farmers?.[0]?.id;
      if (currentFarmerId && !filters.farmerId) {
        setFilters(prev => ({ ...prev, farmerId: currentFarmerId }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVendor, filterOptions]);
  
  // Fetch report data
  const { data: reportData } = useQuery<PurchaseOrderReportResponse>({
    queryKey: ['purchaseOrderReport', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });
      
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/reports/purchase-orders?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    },
    enabled: isAdmin || isVendor
  });
  
  // Handle filter changes
  const handleFilterChange = (key: keyof PurchaseOrderFilters, value: any) => {
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
      fileName: 'Purchase_Order_Report',
      sheetName: 'Purchase Orders',
      headers: [
        { key: 'status', label: 'Status', width: 12 },
        { key: 'product', label: 'Product', width: 20 },
        { key: 'qty', label: 'Quantity', width: 15 },
        { key: 'agency', label: 'Agency', width: 15 },
        { key: 'amount', label: 'Amount', width: 15, align: 'right' },
        { key: 'purchaseNo', label: 'Purchase No', width: 15 },
        { key: 'date', label: 'Date', width: 12 },
        { key: 'invoice', label: 'Invoice No', width: 15 },
        { key: 'farmer', label: 'Farmer', width: 20 },
        { key: 'depot', label: 'Depot', width: 20 },
        { key: 'rate', label: 'Rate', width: 12, align: 'right' }
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
  
  // Render grouped data recursively
  const renderGroupedData = (data: GroupedData[] | PurchaseOrderItem[], level: number = 0): React.ReactElement[] => {
    if (!Array.isArray(data)) return [];
    
    // Check if this is grouped data or flat data
    const isGrouped = data.length > 0 && 'level' in data[0];
    
    if (!isGrouped) {
      // Render flat data as table rows
      return (data as PurchaseOrderItem[]).map((item, index) => (
        <TableRow key={`${item.purchaseId}-${index}`} className="hover:bg-gray-50">
          <TableCell className="pl-8">{item.purchaseNo}</TableCell>
          <TableCell className="text-sm">
            {format(new Date(item.purchaseDate), 'dd MMM yyyy')}
          </TableCell>
          <TableCell className="text-sm">
            {item.deliveryDate ? format(new Date(item.deliveryDate), 'dd MMM yyyy') : '-'}
          </TableCell>
          <TableCell>{item.farmerName}</TableCell>
          <TableCell>{item.productName} - {item.variantName}</TableCell>
          <TableCell className="text-right">{item.quantity}</TableCell>
          <TableCell className="text-right">{item.deliveredQuantity || 0}</TableCell>
          <TableCell className="text-right font-medium">
            ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </TableCell>
          <TableCell>
            <Badge variant={
              item.status === 'delivered' ? 'default' : 
              item.status === 'pending' ? 'secondary' :
              item.status === 'cancelled' ? 'destructive' : 'outline'
            }>
              {item.status}
            </Badge>
          </TableCell>
        </TableRow>
      ));
    }
    
    // Render grouped data
    return (data as GroupedData[]).map((group) => {
      const groupId = `${group.level}-${group.id}`;
      const isExpanded = expandedGroups.has(groupId);
      const indent = level * 20;
      
      return (
        <React.Fragment key={groupId}>
          <TableRow 
            className={`cursor-pointer hover:bg-gray-100 ${
              group.level === 'farmer' ? 'bg-blue-50' : 
              group.level === 'depot' ? 'bg-green-50' : 
              'bg-orange-50'
            }`}
            onClick={() => toggleGroupExpansion(groupId)}
          >
            <TableCell colSpan={9} style={{ paddingLeft: `${indent + 16}px` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span className="font-semibold">
                    {group.level === 'farmer' && `Farmer: ${group.name}`}
                    {group.level === 'depot' && `Depot: ${group.name} ${group.location ? `(${group.location})` : ''}`}
                    {group.level === 'variant' && `${group.productName} - ${group.name} ${group.unit ? `(${group.unit})` : ''}`}
                  </span>
                  <Badge variant="outline" className="ml-2">
                    {group.totals.itemCount} items
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span>Qty: <strong>{group.totals.totalQuantity}</strong></span>
                  <span>Amount: <strong>₹{group.totals.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                  <span>Avg Rate: <strong>₹{group.totals.avgRate.toFixed(2)}</strong></span>
                </div>
              </div>
            </TableCell>
          </TableRow>
          
          {isExpanded && Array.isArray(group.data) && renderGroupedData(group.data, level + 1)}
        </React.Fragment>
      );
    });
  };
  
  if (!(isAdmin || isVendor)) {
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
              <CardTitle>Purchase Order Report</CardTitle>
              <CardDescription>
                View and export purchase orders with grouped data by farmer, depot, and variants
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
                <Label htmlFor="farmerId">Farmer</Label>
                <Select
                  value={filters.farmerId?.toString() || 'all'}
                  onValueChange={(value) => handleFilterChange('farmerId', value === 'all' ? undefined : parseInt(value))}
                >
                  <SelectTrigger id="farmerId">
                    <SelectValue placeholder="All Farmers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Farmers</SelectItem>
                    {filterOptions?.data?.farmers?.map((farmer) => (
                      <SelectItem key={farmer.id} value={farmer.id.toString()}>
                        {farmer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="currentFarmer">Current Farmer</Label>
                <Input
                  id="currentFarmer"
                  value={filterOptions?.data?.farmers?.[0]?.name || 'Your Farmer Profile'}
                  disabled
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="depotId">Depot</Label>
              <Select
                value={filters.depotId?.toString() || 'all'}
                onValueChange={(value) => handleFilterChange('depotId', value === 'all' ? undefined : parseInt(value))}
              >
                <SelectTrigger id="depotId">
                  <SelectValue placeholder="All Depots" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Depots</SelectItem>
                  {filterOptions?.data?.depots?.map((depot) => (
                    <SelectItem key={depot.id} value={depot.id.toString()}>
                      {depot.name} {depot.location && `(${depot.location})`}
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
                  checked={filters.groupBy?.includes('farmer')}
                  onCheckedChange={(checked) => {
                    const groups = filters.groupBy?.split(',') || [];
                    if (checked) {
                      groups.push('farmer');
                    } else {
                      const index = groups.indexOf('farmer');
                      if (index > -1) groups.splice(index, 1);
                    }
                    handleFilterChange('groupBy', groups.join(','));
                  }}
                />
                Farmer
              </label>
              
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={filters.groupBy?.includes('depot')}
                  onCheckedChange={(checked) => {
                    const groups = filters.groupBy?.split(',') || [];
                    if (checked) {
                      groups.push('depot');
                    } else {
                      const index = groups.indexOf('depot');
                      if (index > -1) groups.splice(index, 1);
                    }
                    handleFilterChange('groupBy', groups.join(','));
                  }}
                />
                Depot
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
            
            <Button onClick={() => refetch()} className="ml-auto">
              <Filter className="mr-2 h-4 w-4" />
              Apply Filters
            </Button>
          </div> */}
          
          {/* Search */}
          {/* <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              placeholder="Search in results..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div> */}
          
          {/* Summary Cards */}
          {/* {reportData?.data?.totals && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{reportData.data.totals.totalPurchases}</div>
                  <p className="text-xs text-muted-foreground">Total Purchases</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{reportData.data.totals.totalItems}</div>
                  <p className="text-xs text-muted-foreground">Total Items</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{reportData.data.totals.totalQuantity}</div>
                  <p className="text-xs text-muted-foreground">Total Quantity</p>
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
          
          {/* Data Table */}
          {/* <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order No</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Delivery Date</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Ordered</TableHead>
                  <TableHead className="text-right">Delivered</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Loading report data...
                    </TableCell>
                  </TableRow>
                ) : filteredData && filteredData.length > 0 ? (
                  renderGroupedData(filteredData)
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No data found for the selected filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div> */}
        </CardContent>
      </Card>
    </div>
  );
}
