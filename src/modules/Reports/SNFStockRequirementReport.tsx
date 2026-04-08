import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, MapPin, Package, Boxes } from 'lucide-react';
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
  SNFStockRequirementResponse,
  ReportFiltersResponse
} from './types';
import { backendUrl } from '@/config';

const API_URL = backendUrl;

interface GroupedRequirement {
  name: string;
  items: {
    variant: string;
    totalQuantity: number;
  }[];
}

export default function SNFStockRequirementReport() {
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
  const { data: reportData, isLoading, error, refetch } = useQuery<SNFStockRequirementResponse>({
    queryKey: ['snfStockRequirement', depotId, date],
    queryFn: async () => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/reports/snf-stock-requirement`, {
        params: { depotId, date },
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    enabled: !!depotId && !!date
  });

  // Transform data for visual grouping
  const getGroupedData = (): GroupedRequirement[] => {
    if (!reportData?.data) return [];
    
    const groups: { [key: string]: GroupedRequirement } = {};
    
    reportData.data.forEach(item => {
      if (!groups[item.name]) {
        groups[item.name] = {
          name: item.name,
          items: []
        };
      }
      groups[item.name].items.push({
        variant: item.variant,
        totalQuantity: item.totalQuantity
      });
    });
    
    return Object.values(groups);
  };

  const handleExportToExcel = () => {
    const groupedData = getGroupedData();
    if (groupedData.length === 0) {
      toast.error('No data to export');
      return;
    }

    const table = document.createElement('table');
    table.id = 'temp-export-table-stock-requirement';
    
    let html = `
      <thead>
        <tr><th colspan="3" style="font-size: 16px; font-weight: bold; text-align: center;">SNF Stock Requirement Report - ${date}</th></tr>
        <tr><th></th></tr>
        <tr>
          <th style="font-weight: bold; background-color: #E0E0E0; text-align: center; vertical-align: middle;">Product Name</th>
          <th style="font-weight: bold; background-color: #E0E0E0; text-align: left; vertical-align: middle;">Variant</th>
          <th style="font-weight: bold; background-color: #E0E0E0; text-align: center; vertical-align: middle;">Total Quantity</th>
        </tr>
      </thead>
      <tbody>
    `;

    groupedData.forEach(group => {
      group.items.forEach((item, idx) => {
        html += '<tr>';
        if (idx === 0) {
          html += `
            <td rowspan="${group.items.length}" align="center" valign="middle" style="vertical-align: middle; text-align: center;">
              ${group.name}
            </td>`;
        }
        html += `<td align="left">${item.variant}</td>`;
        html += `<td align="center">${item.totalQuantity}</td>`;
        html += '</tr>';
      });
    });

    html += '</tbody>';
    table.innerHTML = html;
    document.body.appendChild(table);

    try {
      const wb = XLSX.utils.table_to_book(table, { sheet: "Stock Requirement" });
      const ws = wb.Sheets["Stock Requirement"];
      ws['!cols'] = [
        { wch: 45 }, // Product
        { wch: 25 }, // Variant
        { wch: 15 }  // Quantity
      ];

      XLSX.writeFile(wb, `SNF_Stock_Requirement_${date}.xlsx`);
      toast.success('Report exported successfully');
    } catch (e) {
      console.error(e);
      toast.error('Export failed');
    } finally {
      document.body.removeChild(table);
    }
  };

  const groupedRecords = getGroupedData();

  return (
    <div className="h-[calc(100vh-6rem)] w-full max-w-full p-4 flex flex-col gap-4">
      <Card className="flex flex-col flex-1 overflow-hidden">
        <CardHeader className="flex-none pb-4">
          <div className="flex justify-between items-end">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Boxes className="h-5 w-5" />
                SNF Stock Requirement Report
              </CardTitle>
              <CardDescription>
                Consolidated product requirements for a specific day
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => refetch()} variant="outline" size="sm">
                Refresh
              </Button>
              <Button onClick={handleExportToExcel} disabled={groupedRecords.length === 0}>
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
              <p>Please select a depot to view the stock requirement</p>
            </div>
          ) : isLoading ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-600">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
              Loading requirements...
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center text-sm text-red-600">
              Error fetching report: {(error as any)?.message || 'Unknown error'}
            </div>
          ) : groupedRecords.length === 0 ? (
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
                      <TableHead className="text-center">Product Name</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead className="w-[150px] text-center">Total Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedRecords.map((group) => (
                      group.items.map((item, idx) => (
                        <TableRow key={`${group.name}-${item.variant}`} className="group hover:bg-slate-50">
                          {idx === 0 && (
                            <TableCell 
                              rowSpan={group.items.length} 
                              className="font-bold text-slate-900 border-r text-center align-middle bg-slate-50/30"
                            >
                              {group.name}
                            </TableCell>
                          )}
                          <TableCell className="text-slate-600 italic border-r">
                            {item.variant}
                          </TableCell>
                          <TableCell className="text-center font-bold text-slate-900">
                            <span className="bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm min-w-[3rem] inline-block">
                              {item.totalQuantity}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
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
