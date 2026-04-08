import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, BarChart3, MapPin, Phone, Package, CreditCard, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import {
  SNFDeliveryListResponse,
  ReportFiltersResponse,
  ExcelExportConfig
} from './types';
import { ExcelExporter } from './utils/excelExport';
import { backendUrl } from '@/config';
import { cn } from '@/lib/utils';

const API_URL = backendUrl;

export default function SNFDeliveryListReport() {
  const [depotId, setDepotId] = useState<string>('');
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
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

  // Fetch report data
  const { data: reportData, isLoading, error, refetch } = useQuery<SNFDeliveryListResponse>({
    queryKey: ['snfDeliveryList', depotId, date],
    queryFn: async () => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/reports/snf-delivery-list`, {
        params: { depotId, date },
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    enabled: !!depotId && !!date
  });

  const toggleArea = (area: string) => {
    setExpandedAreas(prev => ({ ...prev, [area]: !prev[area] }));
  };

  const handleExportToExcel = () => {
    if (!reportData?.data) {
      toast.error('No data to export');
      return;
    }

    const exporter = new ExcelExporter();
    const excelData: any[] = [];

    Object.entries(reportData.data).forEach(([area, orders]) => {
      orders.forEach(order => {
        excelData.push({
          area,
          orderNo: order.orderNo,
          customer: order.customerName,
          mobile: order.mobile,
          address: order.address,
          pincode: order.pincode,
          items: order.items.map(i => `${i.name} (${i.variant}) x ${i.quantity}`).join(', '),
          payment: `${order.paymentMode || 'COD'} (${order.paymentStatus})`,
          amount: order.totalAmount
        });
      });
    });

    const headers = [
      { key: 'area', label: 'Area', width: 20 },
      { key: 'orderNo', label: 'Order No', width: 15 },
      { key: 'customer', label: 'Customer', width: 25 },
      { key: 'mobile', label: 'Mobile', width: 15 },
      { key: 'address', label: 'Address', width: 40 },
      { key: 'pincode', label: 'Pincode', width: 10 },
      { key: 'items', label: 'Items', width: 40 },
      { key: 'payment', label: 'Payment', width: 20 },
      { key: 'amount', label: 'Amount', width: 12, align: 'center' as const }
    ];

    const exportConfig: ExcelExportConfig = {
      fileName: `SNF_Delivery_List_${date}`,
      sheetName: 'Delivery List',
      headers,
      grouping: {
        enabled: true,
        levels: ['area'],
        showTotals: true
      }
    };

    exporter.exportToExcel({
      data: excelData,
      config: exportConfig
    });

    toast.success('Report exported successfully');
  };

  const areas = reportData?.data ? Object.keys(reportData.data) : [];

  return (
    <div className="h-[calc(100vh-6rem)] w-full max-w-full p-4 flex flex-col gap-4">
      <Card className="flex flex-col flex-1 overflow-hidden">
        <CardHeader className="flex-none pb-4">
          <div className="flex justify-between items-end">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                SNF Delivery List Report
              </CardTitle>
              <CardDescription>
                Area-wise delivery list for SNF (one-time) orders
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => refetch()} variant="outline" size="sm">
                Refresh
              </Button>
              <Button onClick={handleExportToExcel} disabled={!reportData?.data}>
                <Download className="mr-2 h-4 w-4" />
                Export to Excel
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col flex-1 overflow-hidden gap-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-none items-end">
            <div className="space-y-2">
              <Label htmlFor="depotId">Select Depot</Label>
              <Select value={depotId} onValueChange={setDepotId}>
                <SelectTrigger id="depotId">
                  <SelectValue placeholder="Chose a depot" />
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
              <Label htmlFor="date">Delivery Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {!depotId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-slate-50 rounded-lg border-2 border-dashed">
              <MapPin className="h-8 w-8 mb-2 opacity-20" />
              <p>Please select a depot to view the delivery list</p>
            </div>
          ) : isLoading ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-600">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
              Loading delivery list...
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center text-sm text-red-600">
              Error fetching report: {(error as any)?.message || 'Unknown error'}
            </div>
          ) : areas.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-slate-50 rounded-lg border">
              <Package className="h-8 w-8 mb-2 opacity-20" />
              <p>No deliveries scheduled for this date and depot</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden flex-1 flex flex-col min-h-0 bg-white shadow-sm">
              <div className="flex-1 overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-slate-100 hover:bg-slate-100 uppercase text-[10px] tracking-wider font-bold">
                    <TableRow>
                      <TableHead className="w-[150px]">Order No</TableHead>
                      <TableHead className="w-[200px]">Customer</TableHead>
                      <TableHead className="w-[300px]">Address</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="w-[120px]">Payment</TableHead>
                      <TableHead className="text-right w-[100px]">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {areas.map(area => (
                      <React.Fragment key={area}>
                        {/* Area Header */}
                        <TableRow 
                          className="bg-slate-50 hover:bg-slate-100 cursor-pointer group select-none"
                          onClick={() => toggleArea(area)}
                        >
                          <TableCell colSpan={6} className="py-2 px-4 shadow-inner">
                            <div className="flex items-center gap-2">
                              {expandedAreas[area] === false ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronUp className="h-4 w-4 text-primary" />}
                              <span className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5 text-primary/60" />
                                {area} 
                                <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px] ml-2 font-medium">
                                  {reportData?.data?.[area]?.length || 0} Orders
                                </span>
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Area Orders */}
                        {expandedAreas[area] !== false && reportData?.data?.[area]?.map((order) => (
                          <TableRow key={order.id} className="group hover:bg-blue-50/30">
                            <TableCell className="font-mono text-xs font-semibold text-blue-600">
                              {order.orderNo}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium text-sm text-slate-900">{order.customerName}</span>
                                <a href={`tel:${order.mobile}`} className="text-xs text-slate-500 flex items-center gap-1 hover:text-primary transition-colors">
                                  <Phone className="h-3 w-3" />
                                  {order.mobile}
                                </a>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs text-slate-600 line-clamp-2 max-w-[280px]">
                                {order.address}
                                <div className="font-medium text-[10px] text-slate-400 uppercase mt-0.5">PIN: {order.pincode}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {order.items.map((item, idx) => (
                                  <div key={idx} className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 text-[11px] font-medium flex items-center gap-1">
                                    <Package className="h-3 w-3 opacity-60" />
                                    {item.name} ({item.variant}) x {item.quantity}
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <span className={cn(
                                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full w-fit uppercase",
                                  order.paymentStatus === 'PAID' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                                )}>
                                  {order.paymentStatus}
                                </span>
                                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                                  <CreditCard className="h-3 w-3" />
                                  {order.paymentMode || 'COD'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-slate-900">
                              ₹{order.totalAmount.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
