
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Download, Filter, ChevronDown, ChevronRight, Search, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
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
import { backendUrl } from '@/config';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const API_URL = backendUrl;

// Types for the report
interface DeliveryDateOrdersFilters {
  deliveryDate?: string;
  depotId?: number;
  status?: string;
  productId?: number;
}

interface OrderDetail {
  orderId: number;
  poNumber?: string;
  orderDate: string;
  vendorName: string;
  agencyName: string;
  status: string;
  quantity: number;
  deliveredQuantity: number;
  receivedQuantity: number;
  supervisorQuantity: number;
  lineAmount: number;
  customerName?: string;
  customerMobile?: string;
  paymentStatus?: string;
  deliveryAddress?: string;
  areaName?: string;
}

interface DepotVariant {
  depotVariantId?: number;
  depotVariantName: string;
  depotId?: number;
  depotName: string;
  mrp: number;
  priceAtPurchase: number;
  orders: OrderDetail[];
  totalQuantity: number;
  totalDeliveredQuantity: number;
  totalReceivedQuantity: number;
  totalSupervisorQuantity: number;
  totalAmount: number;
}

interface ProductGroup {
  productId: number;
  productName: string;
  categoryName: string;
  totalQuantity: number;
  totalAmount: number;
  depotVariants: DepotVariant[];
}

interface DeliveryDateGroup {
  date: string;
  totalOrders: number;
  totalAmount: number;
  products: ProductGroup[];
}

interface ReportSummary {
  totalDeliveryDates: number;
  totalOrders: number;
  totalAmount: number;
  uniqueProducts: number;
  uniqueDepotVariants: number;
}

interface DeliveryDateOrdersReportResponse {
  success: boolean;
  data: DeliveryDateGroup[];
  summary: ReportSummary;
  filters: DeliveryDateOrdersFilters;
}

interface ReportFiltersResponse {
  success: boolean;
  filters: {
    depots: { id: number; name: string }[];
    products: { id: number; name: string; category?: { id: number; name: string } }[];
    dateRange: {
      minDate: string;
      maxDate: string;
    };
    statusOptions: { value: string; label: string }[];
  };
}

export default function DeliveryDateOrdersReport() {
  const { isAdmin } = useRoleAccess();

  // Get current user to check role
  const currentUser = useMemo(() => {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Failed to parse user data:', error);
      return null;
    }
  }, []);

  // Check if user can access the report (admin or depot)
  const canAccess = useMemo(() => {
    if (!currentUser) return false;
    const role = currentUser.role?.toUpperCase();
    return role === 'ADMIN' || role === 'SUPER_ADMIN' || role.includes('ADMIN') || role.includes('DEPOT');
  }, [currentUser]);

  const isDepotUser = useMemo(() => {
    return currentUser?.role?.toUpperCase()?.includes('DEPOT');
  }, [currentUser]);

  // State for filters
  const [filters, setFilters] = useState<DeliveryDateOrdersFilters>(() => {
    const initialFilters: DeliveryDateOrdersFilters = {
      deliveryDate: format(new Date(), 'yyyy-MM-dd'),
      status: 'ALL'
    };

    // If depot user, set their depot as default
    if (isDepotUser && currentUser?.depotId) {
      initialFilters.depotId = currentUser.depotId;
    }

    return initialFilters;
  });

  // State for UI
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch filter options
  const { data: filterOptions } = useQuery<ReportFiltersResponse>({
    queryKey: ['deliveryReportFilters'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/admin/reports/filters`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    },
    enabled: canAccess
  });

  // Fetch report data
  const { data: reportData, isLoading, refetch } = useQuery<DeliveryDateOrdersReportResponse>({
    queryKey: ['deliveryDateOrdersReport', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });

      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/admin/reports/delivery-date-orders?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    },
    enabled: canAccess
  });

  // Handle filter changes
  const handleFilterChange = (key: keyof DeliveryDateOrdersFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Handle expansion toggles
  const toggleDateExpansion = (date: string) => {
    setExpandedDates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const toggleProductExpansion = (productKey: string) => {
    setExpandedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productKey)) {
        newSet.delete(productKey);
      } else {
        newSet.add(productKey);
      }
      return newSet;
    });
  };

  // Export to Excel with grouped format
  const handleExportToExcel = () => {
    if (!reportData?.data) {
      toast.error('No data to export');
      return;
    }

    try {
      const workbook = XLSX.utils.book_new();

      // Create single grouped report sheet
      const reportData_grouped: any[][] = [];

      // Add header information
      reportData_grouped.push(['Delivery Date Orders Report']);
      reportData_grouped.push(['Generated on:', format(new Date(), 'dd MMM yyyy HH:mm')]);
      reportData_grouped.push(['Delivery Date:', filters.deliveryDate || 'All Dates']);
      reportData_grouped.push(['Total Orders:', reportData.summary.totalOrders, '', 'Total Amount:', `₹${reportData.summary.totalAmount.toLocaleString('en-IN')}`]);
      reportData_grouped.push(['', '', '', '', '', '', '', '', '']); // Empty row

      reportData.data.forEach(dateGroup => {
        // Add date header
        reportData_grouped.push([
          `DELIVERY DATE: ${dateGroup.date === 'No Delivery Date' ? 'No Delivery Date' : format(new Date(dateGroup.date), 'dd MMM yyyy')}`,
          '', '', `Orders: ${dateGroup.totalOrders}`, '', `Amount: ₹${dateGroup.totalAmount.toLocaleString('en-IN')}`, '', '', ''
        ]);
        reportData_grouped.push(['', '', '', '', '', '', '', '', '']); // Empty row

        dateGroup.products.forEach(product => {
          // Add product header
          reportData_grouped.push([
            `  PRODUCT: ${product.productName}`,
            `Category: ${product.categoryName}`,
            `Qty: ${product.totalQuantity}`,
            `Amount: ₹${product.totalAmount.toLocaleString('en-IN')}`,
            '', '', '', '', ''
          ]);

          // Add column headers for variants
          reportData_grouped.push([
            '    Variant', 'Depot', 'MRP', 'Price', 'Quantity', 'Amount', 'Customer', 'Mobile', 'Payment Status'
          ]);

          product.depotVariants.forEach(variant => {
            variant.orders.forEach((order, orderIndex) => {
              // Show variant info for each order (no ditto marks)
              reportData_grouped.push([
                `    ${variant.depotVariantName}`,
                variant.depotName,
                `₹${variant.mrp}`,
                `₹${variant.priceAtPurchase}`,
                order.quantity,
                `₹${order.lineAmount.toLocaleString('en-IN')}`,
                order.customerName,
                order.customerMobile,
                order.paymentStatus
              ]);
            });
          });

          reportData_grouped.push(['', '', '', '', '', '', '', '', '']); // Empty row after each product
        });

        reportData_grouped.push(['', '', '', '', '', '', '', '', '']); // Empty row after each date
      });

      const groupedSheet = XLSX.utils.aoa_to_sheet(reportData_grouped);

      // Set column widths
      const colWidths = [
        { wch: 30 }, // Product/Variant info
        { wch: 15 }, // Depot
        { wch: 10 }, // MRP
        { wch: 10 }, // Price
        { wch: 8 },  // Quantity
        { wch: 12 }, // Amount
        { wch: 20 }, // Customer
        { wch: 15 }, // Mobile
        { wch: 12 }  // Payment Status
      ];
      groupedSheet['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(workbook, groupedSheet, 'Delivery Orders Report');

      // Generate filename
      const deliveryDateStr = filters.deliveryDate ? format(new Date(filters.deliveryDate), 'ddMMyyyy') : 'all_dates';
      const filename = `Delivery_Orders_${deliveryDateStr}.xlsx`;

      // Save file
      XLSX.writeFile(workbook, filename);
      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    }
  };

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!reportData?.data || !searchTerm.trim()) {
      return reportData?.data || [];
    }

    const searchLower = searchTerm.toLowerCase();
    return reportData.data.filter(dateGroup =>
      dateGroup.products.some(product =>
        product.productName.toLowerCase().includes(searchLower) ||
        product.categoryName.toLowerCase().includes(searchLower) ||
        product.depotVariants.some(variant =>
          variant.depotVariantName.toLowerCase().includes(searchLower) ||
          variant.depotName.toLowerCase().includes(searchLower) ||
          variant.orders.some(order =>
            order.vendorName.toLowerCase().includes(searchLower) ||
            order.agencyName.toLowerCase().includes(searchLower) ||
            (order.poNumber && order.poNumber.toLowerCase().includes(searchLower))
          )
        )
      )
    );
  }, [reportData?.data, searchTerm]);

  // Show access denied if user cannot access
  if (!canAccess) {
    return (
      <Card className="m-6">
        <CardHeader>
          <CardTitle className="text-red-600">Access Denied</CardTitle>
          <CardDescription>You don't have permission to view this report.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="h-[calc(100vh-6rem)] w-full max-w-full p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Delivery Date Orders Report
          </CardTitle>
          <CardDescription>
            View orders grouped by delivery date, products, and depot variants with detailed breakdowns
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="deliveryDate">Delivery Date</Label>
            <Input
              id="deliveryDate"
              type="date"
              value={filters.deliveryDate || ''}
              onChange={(e) => handleFilterChange('deliveryDate', e.target.value)}
            />
          </div>

          {!isDepotUser && (
            <div className="space-y-2">
              <Label htmlFor="depot">Depot</Label>
              <Select
                value={filters.depotId?.toString() || 'all'}
                onValueChange={(value) => handleFilterChange('depotId', value === 'all' ? undefined : parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Depots" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Depots</SelectItem>
                  {filterOptions?.filters?.depots?.map(depot => (
                    <SelectItem key={depot.id} value={depot.id.toString()}>
                      {depot.name}
                    </SelectItem>
                  )) || []}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Show depot info for depot users, hide depot selector */}
          {isDepotUser ? (
            <div className="space-y-2">
              <Label>Current Depot</Label>
              <div className="px-3 py-2 bg-gray-50 border rounded-md text-sm">
                {filterOptions?.filters?.depots?.find(depot => depot.id === currentUser?.depotId)?.name || 'Your Depot'}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={filters.status || 'ALL'}
              onValueChange={(value) => handleFilterChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                {filterOptions?.filters?.statusOptions?.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                )) || []}
              </SelectContent>
            </Select>
          </div>



        </CardContent>
      </Card>

      {/* Summary and Actions */}
      {reportData?.summary && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Report Summary</CardTitle>
              <CardDescription>
                {reportData.summary.totalOrders} orders • ₹{reportData.summary.totalAmount.toLocaleString('en-IN')} total
              </CardDescription>
            </div>
            <Button onClick={handleExportToExcel} className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Export to Excel
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{reportData.summary.totalOrders}</div>
                <div className="text-sm text-gray-600">Total Orders</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  ₹{reportData.summary.totalAmount.toLocaleString('en-IN')}
                </div>
                <div className="text-sm text-gray-600">Total Amount</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{reportData.summary.uniqueProducts}</div>
                <div className="text-sm text-gray-600">Products</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Data */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Loading report data...</div>
          </CardContent>
        </Card>
      ) : filteredData.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">
              No data found for the selected filters.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredData.map((dateGroup, dateIndex) => (
            <Card key={dateGroup.date}>
              <Collapsible
                open={expandedDates.has(dateGroup.date)}
                onOpenChange={() => toggleDateExpansion(dateGroup.date)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {expandedDates.has(dateGroup.date) ?
                          <ChevronDown className="h-4 w-4" /> :
                          <ChevronRight className="h-4 w-4" />
                        }
                        <div>
                          <CardTitle className="text-lg">
                            {dateGroup.date === 'No Delivery Date' ? 'No Delivery Date' :
                              format(new Date(dateGroup.date), 'dd MMM yyyy')}
                          </CardTitle>
                          <CardDescription>
                            {dateGroup.totalOrders} orders • ₹{dateGroup.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {dateGroup.products.length} products
                      </Badge>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {dateGroup.products.map((product, productIndex) => {
                        const productKey = `${dateGroup.date}-${product.productId}`;
                        return (
                          <div key={productKey} className="border rounded-lg">
                            <Collapsible
                              open={expandedProducts.has(productKey)}
                              onOpenChange={() => toggleProductExpansion(productKey)}
                            >
                              <CollapsibleTrigger asChild>
                                <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 rounded-lg">
                                  <div className="flex items-center gap-3">
                                    {expandedProducts.has(productKey) ?
                                      <ChevronDown className="h-4 w-4" /> :
                                      <ChevronRight className="h-4 w-4" />
                                    }
                                    <div>
                                      <div className="font-medium">{product.productName}</div>
                                      <div className="text-sm text-gray-600">
                                        Category: {product.categoryName} •
                                        Qty: {product.totalQuantity} •
                                        ₹{product.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                      </div>
                                    </div>
                                  </div>
                                  <Badge variant="outline">
                                    {product.depotVariants.length} variants
                                  </Badge>
                                </div>
                              </CollapsibleTrigger>

                              <CollapsibleContent>
                                <div className="px-3 pb-3">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Depot Variant</TableHead>
                                        <TableHead>Depot</TableHead>
                                        <TableHead className="text-right">MRP</TableHead>
                                        <TableHead className="text-right">Purchase Price</TableHead>
                                        <TableHead className="text-right">Ordered</TableHead>
                                        <TableHead className="text-right">Delivered</TableHead>
                                        <TableHead className="text-right">Received</TableHead>
                                        <TableHead className="text-right">Supervisor</TableHead>
                                        <TableHead className="text-right">Total Amount</TableHead>
                                        <TableHead className="text-center">Orders</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {product.depotVariants.map((variant, variantIndex) => (
                                        <TableRow key={`${variant.depotVariantId || 'no-id'}-${variantIndex}`}>
                                          <TableCell className="font-medium">
                                            {variant.depotVariantName}
                                          </TableCell>
                                          <TableCell>{variant.depotName}</TableCell>
                                          <TableCell className="text-right">
                                            ₹{variant.mrp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                          </TableCell>
                                          <TableCell className="text-right">
                                            ₹{variant.priceAtPurchase.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                          </TableCell>
                                          <TableCell className="text-right font-medium">
                                            {variant.totalQuantity}
                                          </TableCell>
                                          <TableCell className="text-right">
                                            {variant.totalDeliveredQuantity}
                                          </TableCell>
                                          <TableCell className="text-right">
                                            {variant.totalReceivedQuantity}
                                          </TableCell>
                                          <TableCell className="text-right">
                                            {variant.totalSupervisorQuantity}
                                          </TableCell>
                                          <TableCell className="text-right font-medium">
                                            ₹{variant.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                          </TableCell>
                                          <TableCell className="text-center">
                                            <Badge variant="secondary">
                                              {variant.orders.length}
                                            </Badge>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
