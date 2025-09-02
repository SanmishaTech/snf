import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Download, Filter, FileText, Package, Printer } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

const API_URL = backendUrl;

// Types for the labeling report
interface LabelingFilters {
  deliveryDate: string;
  depotId?: number;
}

interface OrderItem {
  id: number;
  name: string;
  variantName?: string;
  quantity: number;
  price: number;
  lineTotal: number;
  product?: {
    name: string;
    category?: {
      name: string;
    };
  };
  depotProductVariant?: {
    name: string;
    mrp: number;
  };
}

interface LabelingOrder {
  id: number;
  orderNo: string;
  name: string; // Customer name
  mobile: string;
  email?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  pincode: string;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  paymentStatus: string;
  paymentMode?: string;
  deliveryDate: string;
  createdAt: string;
  items: OrderItem[];
  depot?: {
    id: number;
    name: string;
  };
}

interface LabelingReportResponse {
  success: boolean;
  orders: LabelingOrder[];
  summary: {
    totalOrders: number;
    totalAmount: number;
    paidOrders: number;
    pendingOrders: number;
    paidAmount: number;
    pendingAmount: number;
  };
}

interface ReportFiltersResponse {
  success: boolean;
  filters: {
    depots: { id: number; name: string }[];
  };
}

export default function DeliveryLabelingReport() {
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
  const [filters, setFilters] = useState<LabelingFilters>(() => {
    const initialFilters: LabelingFilters = {
      deliveryDate: format(new Date(), 'yyyy-MM-dd'),
    };
    
    // If depot user, set their depot as default
    if (isDepotUser && currentUser?.depotId) {
      initialFilters.depotId = currentUser.depotId;
    }
    
    return initialFilters;
  });
  
  // Fetch filter options
  const { data: filterOptions } = useQuery<ReportFiltersResponse>({
    queryKey: ['labelingReportFilters'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/admin/reports/filters`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    },
    enabled: Boolean(canAccess)
  });
  
  // Fetch labeling report data
  const { data: reportData, isLoading } = useQuery<LabelingReportResponse>({
    queryKey: ['labelingReport', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });
      
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/admin/reports/delivery-labeling?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    },
    enabled: Boolean(canAccess && filters.deliveryDate && (isDepotUser || (filters.depotId && filters.depotId > 0)))
  });
  
  // Handle filter changes
  const handleFilterChange = (key: keyof LabelingFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  // Generate PDF for labeling
  const generatePDF = () => {
    if (!reportData?.orders || reportData.orders.length === 0) {
      toast.error('No orders to generate PDF');
      return;
    }
    
    try {
      // Custom label dimensions to eliminate white space
      const labelWidth = 100; // Standard label width in mm
      const labelHeight = 150; // Adjust height based on content needs
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [labelWidth, labelHeight] // Custom dimensions instead of 'a5'
      });
      const pageWidth = doc.internal.pageSize.width;
      const margin = 4; // Reduced from 10mm to 4mm for better space utilization
      
      // Document properties
      doc.setProperties({
        title: `Delivery Labels - ${format(new Date(filters.deliveryDate), 'dd MMM yyyy')}`,
      });

      const depotName = filterOptions?.filters?.depots?.find(d => d.id === filters.depotId)?.name || 'All Depots';

      let yPosition = margin; // Start from top margin

      reportData.orders.forEach((order, orderIndex) => {
        // Each order starts on a new page (except the first one)
        if (orderIndex > 0) {
          doc.addPage();
          yPosition = margin;
        }
        
        // Packing Slip Header - Enhanced Styling
        yPosition += 2; // Extra top margin
        
        // Header background box
        doc.setFillColor(240, 240, 240);
        const headerWidth = pageWidth - (2 * margin);
        doc.rect(margin, yPosition - 2, headerWidth, 12, 'F');
        
        // Header text
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(50, 50, 50);
        doc.text('PACKING SLIP', pageWidth / 2, yPosition + 6, { align: 'center' });
        
        // Reset text color
        doc.setTextColor(0, 0, 0);
        yPosition += 16;
        
        // Order number as simple text
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`Order #${order.orderNo}`, margin, yPosition);
        doc.text(`${order.paymentStatus}`, pageWidth - margin - 20, yPosition, undefined, undefined, 'right');
        yPosition += 6;
        
        // Customer Info
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Customer Details', margin, yPosition);
        yPosition += 4;
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Name: ${order.name}`, margin, yPosition);
        doc.text(`Mobile: ${order.mobile}`, margin + 50, yPosition);
        yPosition += 4;
        
        const address = `Address: ${order.addressLine1}${order.addressLine2 ? ', ' + order.addressLine2 : ''}, ${order.city}, ${order.pincode}`;
        const addressLines = doc.splitTextToSize(address, pageWidth - 2 * margin);
        doc.text(addressLines, margin, yPosition);
        yPosition += addressLines.length * 3.5 + 5;
        
        // Helper function to format price with fixed width
        const formatPrice = (amount: number) => {
          const formatted = amount.toFixed(2);
          return `Rs. ${formatted}`;
        };
        
        // Payment Status Details
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Payment Details', margin, yPosition);
        yPosition += 4;
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Status: ${order.paymentStatus}`, margin, yPosition);
        doc.text(`Total: ${formatPrice(order.totalAmount)}`, margin + 50, yPosition);
        yPosition += 4;
        
        if (order.paymentStatus === 'PAID') {
          doc.text(`Paid: ${formatPrice(order.totalAmount)}`, margin, yPosition);
          doc.text(`Remaining: Rs. 0.00`, margin + 50, yPosition);
        } else if (order.paymentStatus === 'PARTIAL') {
          // Assuming partial payment - you may need to adjust based on your data structure
          const paidAmount = order.totalAmount * 0.5; // This is a placeholder - replace with actual paid amount
          const remainingAmount = order.totalAmount - paidAmount;
          doc.text(`Paid: ${formatPrice(paidAmount)}`, margin, yPosition);
          doc.text(`Remaining: ${formatPrice(remainingAmount)}`, margin + 50, yPosition);
        } else {
          doc.text(`Paid: Rs. 0.00`, margin, yPosition);
          doc.text(`Remaining: ${formatPrice(order.totalAmount)}`, margin + 50, yPosition);
        }
        
        if (order.paymentMode) {
          yPosition += 4;
          doc.text(`Payment Mode: ${order.paymentMode}`, margin, yPosition);
        }
        
        yPosition += 6;
        
        // Order Details Table - removed amount column and totals
        const tableData = order.items.map(item => [
          item.product?.name || item.name,
          item.depotProductVariant?.name || item.variantName || '-',
          item.quantity.toString()
        ]);
        
        autoTable(doc, {
          head: [['Product', 'Variant', 'Qty']],
          body: tableData,
          startY: yPosition,
          margin: { left: margin, right: margin },
          tableWidth: 'auto', // Use full available width
          styles: { 
            font: 'helvetica', 
            fontSize: 8, 
            cellPadding: 1.5, // Reduced padding for more compact layout
            overflow: 'linebreak', 
            valign: 'middle', 
            lineWidth: 0.1, 
            lineColor: [220, 220, 220] 
          },
          headStyles: { 
            fillColor: [64, 64, 64], 
            textColor: [255, 255, 255], 
            fontSize: 8, 
            fontStyle: 'bold' 
          },
          columnStyles: {
            0: { cellWidth: 'auto' }, // Product name takes remaining space
            1: { cellWidth: 30 }, // Variant column width
            2: { cellWidth: 15, halign: 'center' } // Quantity column width
          },
          theme: 'striped',
          alternateRowStyles: { fillColor: [250, 250, 250] },
          didParseCell: (data) => {
            // Apply monospace font only to quantity column
            if (data.column.index === 2) {
              data.cell.styles.font = 'courier';
              data.cell.styles.fontSize = 7;
            }
          }
        });
        
        // Order complete - no footer needed
      });
      
      // Optimized footer positioning - place immediately after content instead of at bottom
      const pageCount = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : doc.internal.getNumberOfPages();
      doc.setFontSize(6); // Smaller footer font
      doc.setTextColor(120);
      for (let i = 1; i <= pageCount; i++) {
        (doc as any).setPage(i);
        const footerText = `Page ${i} of ${pageCount}`;
        // Position footer closer to content, not at absolute bottom
        doc.text(footerText, pageWidth - margin, doc.internal.pageSize.height - 3, undefined, undefined, 'right');
      }

      // Save PDF
      const filename = `Delivery_Labels_${format(new Date(filters.deliveryDate), 'ddMMyyyy')}_${depotName.replace(/\\s+/g, '_')}.pdf`;
      doc.save(filename);
      toast.success('PDF generated successfully');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    }
  };
  
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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-6 w-6" />
            Delivery Labeling Report
          </CardTitle>
          <CardDescription>
            Generate labeling sheets for orders by delivery date and depot
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
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="deliveryDate">Delivery Date</Label>
            <Input
              id="deliveryDate"
              type="date"
              value={filters.deliveryDate || ''}
              onChange={(e) => handleFilterChange('deliveryDate', e.target.value)}
            />
          </div>
          
          {!isDepotUser ? (
            <div className="space-y-2">
              <Label htmlFor="depot">Depot</Label>
              <Select
                value={filters.depotId?.toString() || ''}
                onValueChange={(value) => handleFilterChange('depotId', value ? parseInt(value) : undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Depot" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions?.filters?.depots?.map(depot => (
                    <SelectItem key={depot.id} value={depot.id.toString()}>
                      {depot.name}
                    </SelectItem>
                  )) || []}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Current Depot</Label>
              <div className="px-3 py-2 bg-gray-50 border rounded-md text-sm">
                {filterOptions?.filters?.depots?.find(depot => depot.id === currentUser?.depotId)?.name || 'Your Depot'}
              </div>
            </div>
          )}
          
          <div className="space-y-2 flex items-end">
            <Button 
              onClick={generatePDF} 
              disabled={!reportData?.orders || reportData.orders.length === 0}
              className="w-full flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Generate PDF Labels
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Summary */}
      {reportData?.summary && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>
              {reportData.summary.totalOrders} orders for {format(new Date(filters.deliveryDate), 'dd MMM yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{reportData.summary.totalOrders}</div>
                <div className="text-sm text-gray-600">Total Orders</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{reportData.summary.paidOrders}</div>
                <div className="text-sm text-gray-600">Paid Orders</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{reportData.summary.pendingOrders}</div>
                <div className="text-sm text-gray-600">Pending Orders</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  ₹{reportData.summary.totalAmount.toLocaleString('en-IN')}
                </div>
                <div className="text-sm text-gray-600">Total Amount</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Orders List */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Loading orders...</div>
          </CardContent>
        </Card>
      ) : !reportData?.orders || reportData.orders.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">
              No orders found for the selected date and depot.
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Orders ({reportData.orders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData.orders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">Order #{order.orderNo}</h3>
                      <p className="text-sm text-gray-600">
                        Customer: {order.name} | Mobile: {order.mobile}
                      </p>
                      <p className="text-sm text-gray-600">
                        Address: {order.addressLine1}{order.addressLine2 ? ', ' + order.addressLine2 : ''}, {order.city}, {order.pincode}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={order.paymentStatus === 'PAID' ? 'default' : 'destructive'}>
                        {order.paymentStatus}
                      </Badge>
                      <p className="text-lg font-semibold mt-1">₹{order.totalAmount.toLocaleString('en-IN')}</p>
                      {order.paymentStatus !== 'PAID' && (
                        <p className="text-sm text-red-600">Remaining: ₹{order.totalAmount.toLocaleString('en-IN')}</p>
                      )}
                    </div>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Variant</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.items.map((item, itemIndex) => (
                        <TableRow key={itemIndex}>
                          <TableCell className="font-medium">
                            {item.product?.name || item.name}
                          </TableCell>
                          <TableCell>{item.depotProductVariant?.name || item.variantName || '-'}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">₹{item.price.toLocaleString('en-IN')}</TableCell>
                          <TableCell className="text-right">₹{item.lineTotal.toLocaleString('en-IN')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
