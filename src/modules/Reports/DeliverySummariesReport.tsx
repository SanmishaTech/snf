import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, BarChart3, X } from 'lucide-react';
import { format } from 'date-fns';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { 
  DeliverySummaryFilters, 
  DeliverySummaryResponse,
  DeliveryAgencyFiltersResponse,
  DeliveryAgencySummary,
  ExcelExportConfig
} from './types';
import { ExcelExporter } from './utils/excelExport';
import { backendUrl } from '@/config';

const API_URL = backendUrl;

function formatShortDate(value?: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return format(d, 'dd-MM-yyyy');
}

export default function DeliverySummariesReport() {
  const { isAdmin, isAgency } = useRoleAccess();
  
  // State for filters
  const [draftFilters, setDraftFilters] = useState<DeliverySummaryFilters>({
    startDate: format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });

  const [appliedFilters, setAppliedFilters] = useState<DeliverySummaryFilters>(draftFilters);
  
  // Fetch filter options for agency dropdown / current agency
  const { data: filterOptions } = useQuery<DeliveryAgencyFiltersResponse>({
    queryKey: ['deliveryReportFilters'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/reports/delivery-filters`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    enabled: isAdmin || isAgency
  });
  
  // If AGENCY user, set their current agencyId automatically (locked filter)
  useEffect(() => {
    if (isAgency) {
      const currentAgencyId = filterOptions?.data?.agencies?.[0]?.id;
      if (currentAgencyId && !draftFilters.agencyId) {
        setDraftFilters(prev => ({ ...prev, agencyId: currentAgencyId }));
      }
      if (currentAgencyId && !appliedFilters.agencyId) {
        setAppliedFilters(prev => ({ ...prev, agencyId: currentAgencyId }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAgency, filterOptions]);
  
  // Fetch report data
  const { data: reportData, refetch, isLoading, error } = useQuery<DeliverySummaryResponse>({
    queryKey: ['deliverySummariesReport', appliedFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(appliedFilters).forEach(([key, value]) => {
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
    enabled: isAdmin || isAgency
  });
  
  const handleDraftFilterChange = (key: keyof DeliverySummaryFilters, value: any) => {
    setDraftFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    const nextApplied: DeliverySummaryFilters = {
      ...draftFilters,
    };

    const isSameAsApplied =
      nextApplied.startDate === appliedFilters.startDate &&
      nextApplied.endDate === appliedFilters.endDate &&
      nextApplied.agencyId === appliedFilters.agencyId;

    if (isSameAsApplied) {
      refetch();
      return;
    }

    setAppliedFilters(nextApplied);
  };

  const clearFilters = () => {
    const cleared: DeliverySummaryFilters = {
      startDate: format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd')
    };

    if (isAgency) {
      const currentAgencyId = filterOptions?.data?.agencies?.[0]?.id;
      if (currentAgencyId) {
        cleared.agencyId = currentAgencyId;
      }
    }

    setDraftFilters(cleared);
    setAppliedFilters(cleared);
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
      { key: 'fromDate', label: 'From Date', width: 12 },
      { key: 'toDate', label: 'To Date', width: 12 },
      { key: 'agency', label: 'Delivery Agency', width: 25 },
      { key: 'variant', label: 'Varient', width: 22 },
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
        fromDate: formatShortDate(appliedFilters.startDate),
        toDate: formatShortDate(appliedFilters.endDate),
        agency: agency.name,
        variant: agency.variantName || '',
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
      fromDate: '',
      toDate: '',
      agency: 'TOTAL',
      variant: '',
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={draftFilters.startDate}
                onChange={(e) => handleDraftFilterChange('startDate', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={draftFilters.endDate}
                onChange={(e) => handleDraftFilterChange('endDate', e.target.value)}
              />
            </div>

            {isAdmin ? (
              <div className="space-y-2">
                <Label htmlFor="agencyId">Delivery Agency</Label>
                <Select
                  value={draftFilters.agencyId?.toString() || 'all'}
                  onValueChange={(value) =>
                    handleDraftFilterChange('agencyId', value === 'all' ? undefined : parseInt(value))
                  }
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
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={clearFilters}>
              <X className="mr-2 h-4 w-4" />
              Clear Filters
            </Button>
            <Button onClick={applyFilters}>
              Apply Filters
            </Button>
          </div>

          {isLoading ? (
            <div className="py-10 text-center text-sm text-gray-600">Loading report...</div>
          ) : error ? (
            <div className="py-10 text-center text-sm text-red-600">
              Error loading report: {(error as any)?.message || 'Unknown error'}
            </div>
          ) : !reportData?.data?.summary || reportData.data.summary.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-600">
              No data found for selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From Date</TableHead>
                    <TableHead>To Date</TableHead>
                    <TableHead>Delivery Agency</TableHead>
                    <TableHead>Varient</TableHead>
                    <TableHead>City</TableHead>
                    {(reportData.data.statusList || []).map((status: string) => (
                      <TableHead key={status} className="text-right">
                        {status}
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.data.summary.map((agency: DeliveryAgencySummary) => (
                    <TableRow key={agency.id}>
                      <TableCell>{formatShortDate(appliedFilters.startDate)}</TableCell>
                      <TableCell>{formatShortDate(appliedFilters.endDate)}</TableCell>
                      <TableCell className="font-medium">{agency.name}</TableCell>
                      <TableCell>{agency.variantName || ''}</TableCell>
                      <TableCell>{agency.city || ''}</TableCell>
                      {(reportData.data.statusList || []).map((status: string) => (
                        <TableCell key={status} className="text-right">
                          {agency.statusCounts?.[status] ?? 0}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-medium">{agency.totalCount ?? 0}</TableCell>
                    </TableRow>
                  ))}

                  <TableRow>
                    <TableCell />
                    <TableCell />
                    <TableCell className="font-bold">TOTAL</TableCell>
                    <TableCell />
                    <TableCell />
                    {(reportData.data.statusList || []).map((status: string) => (
                      <TableCell key={status} className="text-right font-bold">
                        {reportData.data.totals?.statusTotals?.[status] ?? 0}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-bold">{reportData.data.totals?.totalDeliveries ?? 0}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
