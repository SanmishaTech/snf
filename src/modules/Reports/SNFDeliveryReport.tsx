import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, MapPin, Truck, User, Phone, Clock, AlertCircle, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import axios from 'axios';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import { backendUrl as API_URL } from '@/config';
import { ReportFiltersResponse, SNFDeliveryResponse } from './types';
import { ExcelExporter } from './utils/excelExport';

const SNFDeliveryReport: React.FC = () => {
  const [depotId, setDepotId] = useState<string>('');
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [status, setStatus] = useState<string>('ALL');
  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>({});

  // Fetch report filters (Depots)
  const { data: filterOptions } = useQuery<ReportFiltersResponse>({
    queryKey: ['reportFilters'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/reports/filters`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    }
  });

  // Auto-select depot if only one is available
  useEffect(() => {
    if (filterOptions?.data?.depots && filterOptions.data.depots.length === 1 && !depotId) {
      setDepotId(filterOptions.data.depots[0].id.toString());
    }
  }, [filterOptions, depotId]);

  // Fetch report data
  const { data: reportData, isLoading, error, refetch } = useQuery<SNFDeliveryResponse>({
    queryKey: ['snfDeliveryReport', depotId, date, status],
    queryFn: async () => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/reports/snf-delivery`, {
        params: { depotId, date, status: status !== 'ALL' ? status : undefined },
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    enabled: !!depotId && !!date
  });

  // Grand totals calculation (Summed across all areas)
  const grandTotals = useMemo(() => {
    if (!reportData?.data) return { totalAmount: 0, orderCount: 0 };
    
    let totalAmount = 0;
    let orderCount = 0;
    
    Object.values(reportData.data).forEach(orders => {
      orderCount += orders.length;
      orders.forEach(order => {
        totalAmount += order.totalAmount || 0;
      });
    });
    
    return { totalAmount, orderCount };
  }, [reportData]);

  // Area totals calculation
  const areaSummaries = useMemo(() => {
    if (!reportData?.data) return {};

    const summaries: Record<string, { totalQty: number; totalAmount: number; orderCount: number }> = {};

    Object.entries(reportData.data).forEach(([area, orders]) => {
      let totalQty = 0;
      let totalAmount = 0;

      orders.forEach(order => {
        totalAmount += order.totalAmount || 0;
        order.items.forEach(item => {
          totalQty += item.quantity || 0;
        });
      });

      summaries[area] = {
        totalQty,
        totalAmount,
        orderCount: orders.length
      };
    });

    return summaries;
  }, [reportData]);

  const toggleArea = (area: string) => {
    setExpandedAreas(prev => ({
      ...prev,
      [area]: prev[area] === false ? true : false // Default to true if undefined
    }));
  };

  const handleExportToExcel = () => {
    if (!reportData?.data) return;

    const exporter = new ExcelExporter();

    // Flatten data for Excel export: Split by items but duplicate order data for merging
    const exportItems: any[] = [];
    Object.entries(reportData.data).forEach(([area, orders]) => {
      orders.forEach((order) => {
        if (order.items.length === 0) {
          exportItems.push({
            ...order,
            areaName: area,
            itemName: '-',
            itemVariant: '-',
            itemQty: 0
          });
        } else {
          order.items.forEach((item) => {
            exportItems.push({
              ...order,
              areaName: area,
              orderNo: order.orderNo, // Ensure keys match exactly for merging
              customerName: order.customerName,
              mobile: order.mobile,
              address: order.address,
              deliveryPartner: order.deliveryPartner,
              status: order.status,
              paymentStatus: order.paymentStatus,
              totalAmount: order.totalAmount,
              itemName: item.name,
              itemVariant: item.variant || '-',
              itemQty: item.quantity
            });
          });
        }
      });
    });

    exporter.exportToExcel({
      data: exportItems,
      config: {
        fileName: `SNF_Delivery_Report_${date}`,
        sheetName: 'Delivery Report',
        headers: [
          { key: 'areaName', label: 'Area', width: 25 },
          { key: 'orderNo', label: 'Order No', width: 15 },
          { key: 'customerName', label: 'Customer', width: 25 },
          { key: 'mobile', label: 'Mobile', width: 15 },
          { key: 'itemName', label: 'Material/Items', width: 35 },
          { key: 'itemVariant', label: 'Variant', width: 20 },
          { key: 'itemQty', label: 'Qty', width: 10, align: 'center' },
          { key: 'address', label: 'Address', width: 45 },
          { key: 'deliveryPartner', label: 'Delivery Partner', width: 20 },
          { key: 'status', label: 'Status', width: 15 },
          { key: 'paymentStatus', label: 'Payment', width: 15 },
          { key: 'totalAmount', label: 'Amount', width: 12, align: 'right' }
        ],
        mergeColumns: [
          'areaName',
          'orderNo',
          'customerName',
          'mobile',
          'address',
          'deliveryPartner',
          'status',
          'paymentStatus',
          'totalAmount'
        ],
        grouping: {
          enabled: true,
          levels: ['areaName'],
          showTotals: false
        }
      }
    });
  };

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    switch (s) {
      case 'DELIVERED':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Delivered</Badge>;
      case 'OUT_FOR_DELIVERY':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">Out for Delivery</Badge>;
      case 'FAILED':
      case 'NOT_DELIVERED':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">Failed</Badge>;
      case 'ASSIGNED':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">Assigned</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card className="border-none shadow-sm bg-gradient-to-br from-white to-slate-50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
          <div className="space-y-1.5">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Truck className="h-6 w-6 text-primary" />
              Delivery Report
            </CardTitle>
            <CardDescription className="text-slate-500">
              Delivery statuses and partner assignments for SNF orders
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                if (depotId) refetch();
                else toast.error('Please select a depot first');
              }}
              variant="outline"
              size="sm"
              disabled={!depotId || isLoading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={handleExportToExcel} disabled={!reportData?.data || Object.keys(reportData.data).length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="space-y-2">
              <Label htmlFor="depotId" className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-slate-400" />
                Select Depot
              </Label>
              <Select value={depotId} onValueChange={setDepotId}>
                <SelectTrigger id="depotId" className="bg-slate-50/50 border-slate-200 focus:ring-primary/20">
                  <SelectValue placeholder="Choose a depot" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions?.data?.depots?.map(depot => (
                    <SelectItem key={depot.id} value={depot.id.toString()}>
                      {depot.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-slate-400" />
                Delivery Date
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-slate-50/50 border-slate-200 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-slate-400" />
                Filter by Status
              </Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status" className="bg-slate-50/50 border-slate-200 focus:ring-primary/20">
                  <SelectValue placeholder="Choose status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="NOT_DELIVERED">Not Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!depotId ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-slate-50 rounded-xl border-2 border-dashed h-[400px]">
          <MapPin className="h-12 w-12 mb-3 opacity-20 text-primary" />
          <p className="text-lg font-medium">Please select a depot to view the delivery report</p>
          <p className="text-sm opacity-60">Choose a depot from the dropdown above</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-4 pt-10">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-red-50 rounded-xl border border-red-100">
          <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-lg font-semibold text-red-900">Failed to load report</h3>
          <p className="text-red-700 max-w-md mx-auto mt-2">There was an error fetching the delivery data. Please try again or contact support.</p>
          <Button variant="outline" className="mt-6 border-red-200 text-red-700 hover:bg-red-100" onClick={() => refetch()}>Try Again</Button>
        </div>
      ) : Object.keys(reportData?.data || {}).length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed">
          <Truck className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-lg font-medium">No deliveries found for this date</p>
          <p className="text-sm opacity-60">Try selecting a different date or depot</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden shadow-sm bg-white min-h-[500px] flex flex-col">
          <div className="overflow-x-auto flex-1">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-20 shadow-sm">
                <TableRow className="hover:bg-transparent border-slate-200">
                  <TableHead className="w-12 text-center text-slate-500 font-bold uppercase text-[10px] tracking-wider">SL</TableHead>
                  <TableHead className="w-[120px] text-slate-500 font-bold uppercase text-[10px] tracking-wider">Order No</TableHead>
                  <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Customer</TableHead>
                  <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Address</TableHead>
                  <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Items</TableHead>
                  <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Delivery Partner</TableHead>
                  <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Status</TableHead>
                  <TableHead className="text-right text-slate-500 font-bold uppercase text-[10px] tracking-wider">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(reportData?.data || {}).map(([area, orders]) => {
                  const isExpanded = expandedAreas[area] !== false; // Default to true
                  const stats = areaSummaries[area];

                  return (
                    <React.Fragment key={area}>
                      {/* Area Group Header Row */}
                      <TableRow
                        className="cursor-pointer bg-slate-100/80 hover:bg-slate-200/60 group/header transition-colors transition-all duration-200 sticky z-10"
                        style={{ top: '40px' }} // Below the main TableHeader
                        onClick={() => toggleArea(area)}
                      >
                        <TableCell colSpan={8} className="py-2.5 px-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center h-5 w-5 rounded bg-white shadow-sm border border-slate-200 text-slate-500 group-hover/header:text-primary transition-colors">
                                {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              </div>
                              <span className="font-bold text-slate-800 flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-primary" />
                                Area: {area}
                                <Badge variant="secondary" className="ml-2 bg-white text-slate-600 font-semibold border-slate-200 shadow-sm h-5 text-[10px]">
                                  {stats?.orderCount || 0} Orders
                                </Badge>
                              </span>
                            </div>
                            <div className="flex items-center gap-6 text-slate-600 font-medium text-[11px] group-data-[collapsible=icon]:hidden">
                              <div className="flex items-center gap-1.5 px-3 py-1 bg-white/50 rounded-lg border border-slate-200/30">
                                <span className="text-slate-400">Total Qty:</span>
                                <span className="font-black text-slate-900">{stats?.totalQty || 0}</span>
                              </div>
                              <div className="flex items-center gap-1.5 px-3 py-1 bg-white/50 rounded-lg border border-slate-200/30">
                                <span className="text-slate-400">Total Amount:</span>
                                <span className="font-black text-primary">₹{(stats?.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Data Rows for this Area */}
                      {isExpanded && orders.map((order, idx) => (
                        <TableRow key={order.id} className="hover:bg-slate-50 transition-colors group">
                          <TableCell className="text-center text-slate-400 font-medium">{idx + 1}</TableCell>
                          <TableCell className="font-mono text-xs font-bold text-primary">{order.orderNo}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 leading-tight">{order.customerName}</span>
                              <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                                <Phone className="h-2.5 w-2.5" />
                                {order.mobile}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[300px] text-xs leading-relaxed text-slate-600 font-medium whitespace-normal break-words">
                            {order.address}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-2 min-w-[200px] py-1">
                              {order.items.map((item, i) => (
                                <div key={i} className="flex items-start gap-2 bg-slate-50/80 p-1.5 rounded-md border border-slate-100 group/item hover:bg-white hover:shadow-sm hover:border-primary/20 transition-all">
                                  <div className="h-4 w-4 rounded bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mt-0.5">
                                    {item.quantity}
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-[11px] font-bold text-slate-800 leading-tight">
                                      {item.name}
                                    </span>
                                    {item.variant && (
                                      <span className="text-[10px] text-slate-500 font-medium">
                                        {item.variant}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3 group">
                              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary border border-primary/10 group-hover:from-primary/20 group-hover:to-primary/10 transition-all shadow-sm">
                                <User className="h-5 w-5" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-800 tracking-tight leading-none mb-1">{order.deliveryPartner}</span>
                                {order.deliveryPartnerMobile ? (
                                  <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                                    <Phone className="h-3 w-3 text-primary/60" />
                                    {order.deliveryPartnerMobile}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-medium italic">Unassigned</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-2">
                              {getStatusBadge(order.status)}
                              {order.deliveredAt && (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100/50 rounded-full border border-slate-200/50 w-fit">
                                  <Clock className="h-3 w-3 text-slate-400" />
                                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                                    {format(new Date(order.deliveredAt), 'hh:mm a')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-sm font-black text-slate-900 tabular-nums">₹{order.totalAmount.toFixed(2)}</span>
                              <Badge variant="outline" className={`text-[9px] px-1.5 h-4 font-bold border rounded-md uppercase tracking-wide ${order.paymentStatus === 'PAID'
                                ? 'bg-green-50 text-green-600 border-green-200'
                                : 'bg-slate-50 text-slate-500 border-slate-200'
                                }`}>
                                {order.paymentStatus}
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Sticky Total Row - Professional Accounting Style */}
          {status === 'DELIVERED' && reportData?.data && Object.keys(reportData.data).length > 0 && (
            <div className="bg-slate-50/95 backdrop-blur-md border-t-2 border-slate-200 sticky bottom-0 z-30 px-6 py-4 flex items-center justify-between shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
              <div className="flex items-center gap-12">
                <span className="text-sm font-black text-slate-900 tracking-[0.1em]">TOTAL</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total SR:</span>
                  <span className="text-xl font-black text-slate-900 tabular-nums">{grandTotals.orderCount}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest translate-y-0.5">Total Amount:</span>
                <span className="text-2xl font-black text-slate-900 tabular-nums">
                  ₹{grandTotals.totalAmount.toLocaleString('en-IN', { 
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SNFDeliveryReport;
