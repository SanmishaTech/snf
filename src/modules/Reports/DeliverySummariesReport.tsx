import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

export default function DeliverySummariesReport() {
  const { isAdmin, isAgency } = useRoleAccess();
  
  // State for filters
  const [filters, setFilters] = useState<DeliverySummaryFilters>({
    startDate: format(new Date(new Date().setDate(new Date().getDate() - 7)), 'yyyy-MM-dd'), // 7 days ago
    endDate: format(new Date(new Date().setDate(new Date().getDate() + 30)), 'yyyy-MM-dd') // 30 days from today
  });
  
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
      if (currentAgencyId && !filters.agencyId) {
        setFilters(prev => ({ ...prev, agencyId: currentAgencyId }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAgency, filterOptions]);
  
  // Fetch report data
  const { data: reportData } = useQuery<DeliverySummaryResponse>({
    queryKey: ['deliverySummariesReport', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
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
  
  // Handle filter changes
  const handleFilterChange = (key: keyof DeliverySummaryFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
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
      { key: 'agency', label: 'Delivery Agency', width: 25 },
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
        agency: agency.name,
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
      agency: 'TOTAL',
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
          </div>
          
          
        </CardContent>
      </Card>
    </div>
  );
}
