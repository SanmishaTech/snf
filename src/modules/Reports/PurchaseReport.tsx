import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { 
  Calendar,
  Download, 
  Filter, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  FileText,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock,
  Wallet,
  ChevronDown,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Pagination, 
  PaginationContent, 
  PaginationEllipsis, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination';

import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatter';
import { get } from '@/services/apiService';
import { 
  fetchPurchaseReport,
  fetchPaymentReport,
  fetchVendorPurchaseSummary,
  exportPurchaseReport,
  PurchaseReportFilters,
  PurchaseReportResponse,
  PaymentReportResponse,
  VendorPurchaseSummary
} from '@/services/purchaseReportService';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
  subtitle?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  trend = 'neutral',
  className,
  subtitle
}) => (
  <Card className={cn("relative overflow-hidden", className)}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      {change !== undefined && (
        <div className="flex items-center space-x-1 text-xs mt-1">
          {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
          {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
          <span className={cn(
            trend === 'up' && 'text-green-500',
            trend === 'down' && 'text-red-500',
            trend === 'neutral' && 'text-muted-foreground'
          )}>
            {change > 0 && '+'}{change}%
          </span>
        </div>
      )}
    </CardContent>
  </Card>
);

const PurchaseReport: React.FC = () => {
  // State management
  const [filters, setFilters] = useState<PurchaseReportFilters>({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    status: 'all'
  });

  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [vendors, setVendors] = useState<Array<{ id: number; name: string }>>([]);
  const [depots, setDepots] = useState<Array<{ id: number; name: string }>>([]);

  const pageSize = 20;

  // Fetch reference data
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const [vendorsRes, depotsRes] = await Promise.all([
          get('/vendors?limit=1000'),
          get('/depots')
        ]);
        setVendors(vendorsRes?.data || vendorsRes || []);
        setDepots(depotsRes?.data || depotsRes || []);
      } catch (error) {
        console.error('Failed to fetch reference data:', error);
      }
    };
    fetchReferenceData();
  }, []);

  // Main purchase report query
  const { data: reportData, isLoading: isLoadingReport, refetch: refetchReport } = useQuery({
    queryKey: ['purchaseReport', filters, page],
    queryFn: () => fetchPurchaseReport({ ...filters, page, limit: pageSize }),
    placeholderData: (previousData) => previousData,
  });

  // Payment report query
  const { data: paymentData, isLoading: isLoadingPayments } = useQuery({
    queryKey: ['paymentReport', filters, page],
    queryFn: () => fetchPaymentReport({ 
      startDate: filters.startDate,
      endDate: filters.endDate,
      vendorId: filters.vendorId,
      page, 
      limit: pageSize 
    }),
    placeholderData: (previousData) => previousData,
  });

  // Vendor summary query
  const { data: vendorSummaries } = useQuery({
    queryKey: ['vendorPurchaseSummary', filters],
    queryFn: () => fetchVendorPurchaseSummary({
      startDate: filters.startDate,
      endDate: filters.endDate,
      vendorId: filters.vendorId
    }),
  });

  // Filter handlers
  const handleFilterChange = (key: keyof PurchaseReportFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset pagination
  };

  const handleDateSelect = (field: 'startDate' | 'endDate') => (date: Date | undefined) => {
    if (date) {
      handleFilterChange(field, format(date, 'yyyy-MM-dd'));
    }
  };

  const clearFilters = () => {
    setFilters({
      startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      status: 'all'
    });
    setSearchTerm('');
    setPage(1);
  };

  // Export handlers
  const handleExport = async (format: 'excel' | 'csv') => {
    try {
      await exportPurchaseReport(filters, format);
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error: any) {
      toast.error(error.message || 'Export failed');
    }
  };

  // Row expansion
  const toggleRowExpansion = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Filtered data
  const filteredPurchases = useMemo(() => {
    if (!reportData?.purchases || !searchTerm) return reportData?.purchases || [];
    
    return reportData.purchases.filter(purchase =>
      purchase.purchaseNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [reportData?.purchases, searchTerm]);

  const getPaymentStatusBadge = (status: 'paid' | 'partial' | 'unpaid') => {
    const variants = {
      paid: { variant: 'default' as const, icon: CheckCircle2, text: 'Paid' },
      partial: { variant: 'secondary' as const, icon: Clock, text: 'Partial' },
      unpaid: { variant: 'destructive' as const, icon: AlertCircle, text: 'Unpaid' }
    };
    
    const config = variants[status];
    const IconComponent = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <IconComponent className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  if (isLoadingReport) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const summary = reportData?.summary;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase Report</h1>
          <p className="text-muted-foreground">
            Track purchases, payments, and outstanding balances
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetchReport()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('excel')}>
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Start Date */}
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <Calendar className="h-4 w-4 mr-2" />
                    {filters.startDate ? format(new Date(filters.startDate), 'dd/MM/yyyy') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={filters.startDate ? new Date(filters.startDate) : undefined}
                    onSelect={handleDateSelect('startDate')}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <Calendar className="h-4 w-4 mr-2" />
                    {filters.endDate ? format(new Date(filters.endDate), 'dd/MM/yyyy') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={filters.endDate ? new Date(filters.endDate) : undefined}
                    onSelect={handleDateSelect('endDate')}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Vendor Filter */}
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Select
                value={filters.vendorId || 'all'}
                onValueChange={(value) => handleFilterChange('vendorId', value === 'all' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Vendors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id.toString()}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Status Filter */}
            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => handleFilterChange('status', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Fully Paid</SelectItem>
                  <SelectItem value="partial">Partially Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <Button variant="outline" onClick={clearFilters} className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      
 
    </div>
  );
};

export default PurchaseReport;
