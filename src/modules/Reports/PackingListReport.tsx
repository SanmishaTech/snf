import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, MapPin, Package, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import {
  SNFPackingListResponse,
  ReportFiltersResponse
} from './types';
import { backendUrl } from '@/config';

const API_URL = backendUrl;

export default function PackingListReport() {
  const [depotId, setDepotId] = useState<string>('');
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

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
  const { data: reportData, isLoading, error, refetch } = useQuery<SNFPackingListResponse>({
    queryKey: ['snfPackingList', depotId, date],
    queryFn: async () => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/reports/snf-packing-list`, {
        params: { depotId, date },
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    enabled: !!depotId && !!date
  });

  const handleExportToExcel = () => {
    if (!reportData?.data || reportData.data.length === 0) {
      toast.error('No data to export');
      return;
    }

    const table = document.createElement('table');
    table.id = 'temp-export-table-packing';
    
    let html = `
      <thead>
        <tr><th colspan="6" style="font-size: 16px; font-weight: bold; text-align: center;">SNF Packing List Report - ${date}</th></tr>
        <tr><th></th></tr>
        <tr>
          <th style="font-weight: bold; background-color: #E0E0E0; text-align: center; vertical-align: middle;">Member Name</th>
          <th style="font-weight: bold; background-color: #E0E0E0; text-align: left; vertical-align: middle;">Material/Items</th>
          <th style="font-weight: bold; background-color: #E0E0E0; text-align: left; vertical-align: middle;">Variant</th>
          <th style="font-weight: bold; background-color: #E0E0E0; text-align: center; vertical-align: middle;">Quantity</th>
          <th style="font-weight: bold; background-color: #E0E0E0; text-align: center; vertical-align: middle;">Address</th>
          <th style="font-weight: bold; background-color: #E0E0E0; text-align: center; vertical-align: middle;">Pincode</th>
        </tr>
      </thead>
      <tbody>
    `;

    reportData.data.forEach(order => {
      order.items.forEach((item, idx) => {
        html += '<tr>';
        if (idx === 0) {
          html += `<td rowspan="${order.items.length}" align="center" valign="middle" style="vertical-align: middle; text-align: center;">${order.customerName || ''}</td>`;
        }
        html += `<td align="left">${item.name || ''}</td>`;
        html += `<td align="left">${item.variant || ''}</td>`;
        html += `<td align="center" style="text-align: center;">${item.quantity || ''}</td>`;
        
        if (idx === 0) {
          html += `<td rowspan="${order.items.length}" align="center" valign="middle" style="vertical-align: middle; text-align: center;">${order.address || ''}</td>`;
          html += `<td rowspan="${order.items.length}" align="center" valign="middle" style="vertical-align: middle; text-align: center;">${order.pincode || ''}</td>`;
        }
        html += '</tr>';
      });
    });

    html += '</tbody>';
    table.innerHTML = html;
    document.body.appendChild(table);

    try {
      const wb = XLSX.utils.table_to_book(table, { sheet: "Packing List" });
      
      const ws = wb.Sheets["Packing List"];
      ws['!cols'] = [
        { wch: 35 }, // Member Name
        { wch: 30 }, // Material
        { wch: 20 }, // Variant
        { wch: 12 }, // Quantity
        { wch: 50 }, // Address
        { wch: 12 }  // Pincode
      ];

      XLSX.writeFile(wb, `SNF_Packing_List_${date}.xlsx`);
      toast.success('Report exported successfully');
    } catch (e) {
      console.error(e);
      toast.error('Export failed');
    } finally {
      document.body.removeChild(table);
    }
  };

  const orders = reportData?.data || [];

  return (
    <div className="h-[calc(100vh-6rem)] w-full max-w-full p-4 flex flex-col gap-4">
      <Card className="flex flex-col flex-1 overflow-hidden">
        <CardHeader className="flex-none pb-4">
          <div className="flex justify-between items-end">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                SNF Packing List Report
              </CardTitle>
              <CardDescription>
                Detailed packing summary for SNF (one-time) orders
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => refetch()} variant="outline" size="sm">
                Refresh
              </Button>
              <Button onClick={handleExportToExcel} disabled={orders.length === 0}>
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
              <Label htmlFor="date">Packing Date</Label>
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
              <p>Please select a depot to view the packing list</p>
            </div>
          ) : isLoading ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-600">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
              Loading packing list...
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center text-sm text-red-600">
              Error fetching report: {(error as any)?.message || 'Unknown error'}
            </div>
          ) : orders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-slate-50 rounded-lg border">
              <Package className="h-8 w-8 mb-2 opacity-20" />
              <p>No orders found for this date and depot</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden flex-1 flex flex-col min-h-0 bg-white shadow-sm">
              <div className="flex-1 overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-slate-100 hover:bg-slate-100 uppercase text-[10px] tracking-wider font-bold">
                    <TableRow>
                      <TableHead className="w-[280px]">Member Name</TableHead>
                      <TableHead>Material / Items</TableHead>
                      <TableHead className="w-[150px]">Variants</TableHead>
                      <TableHead className="w-[100px] text-center">Quantity</TableHead>
                      <TableHead className="w-[300px]">Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <React.Fragment key={order.id}>
                        {order.items.map((item, idx) => (
                          <TableRow key={`${order.id}-${idx}`} className="group hover:bg-slate-50">
                            {idx === 0 && (
                              <TableCell rowSpan={order.items.length} className="align-top font-medium text-sm text-slate-900 border-r">
                                {order.customerName}
                              </TableCell>
                            )}
                            <TableCell className="text-sm text-slate-700">
                              <div className="flex items-center gap-2">
                                <Package className="h-3.5 w-3.5 text-primary/40" />
                                {item.name}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-slate-600 italic">
                              {item.variant}
                            </TableCell>
                            <TableCell className="text-center font-bold text-slate-900">
                              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">
                                {item.quantity}
                              </span>
                            </TableCell>
                            {idx === 0 && (
                              <TableCell rowSpan={order.items.length} className="align-top border-l">
                                <div className="text-xs text-slate-600 line-clamp-2">
                                  {order.address}
                                  <div className="font-medium text-[10px] text-slate-400 uppercase mt-0.5">PIN: {order.pincode}</div>
                                </div>
                              </TableCell>
                            )}
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
