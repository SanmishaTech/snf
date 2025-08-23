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

      {/* Summary Statistics */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Purchases"
            value={summary.totalPurchases}
            icon={FileText}
            className="border-l-4 border-l-blue-500"
            subtitle={`Avg: ${formatCurrency(summary.averageOrderValue)}`}
          />
          <StatsCard
            title="Total Amount"
            value={formatCurrency(summary.totalAmount)}
            icon={DollarSign}
            className="border-l-4 border-l-green-500"
          />
          <StatsCard
            title="Amount Paid"
            value={formatCurrency(summary.totalPaid)}
            icon={CheckCircle2}
            className="border-l-4 border-l-emerald-500"
            subtitle={`${Math.round((summary.totalPaid / summary.totalAmount) * 100 || 0)}% of total`}
          />
          <StatsCard
            title="Outstanding"
            value={formatCurrency(summary.totalOutstanding)}
            icon={AlertCircle}
            className="border-l-4 border-l-red-500"
            subtitle={`${summary.unpaidCount} unpaid purchases`}
          />
        </div>
      )}

      {/* Payment Status Breakdown */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Status Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-700">Fully Paid</span>
                  <Badge variant="default">{summary.fullyPaidCount}</Badge>
                </div>
                <Progress value={(summary.fullyPaidCount / summary.totalPurchases) * 100} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-orange-700">Partially Paid</span>
                  <Badge variant="secondary">{summary.partiallyPaidCount}</Badge>
                </div>
                <Progress value={(summary.partiallyPaidCount / summary.totalPurchases) * 100} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-red-700">Unpaid</span>
                  <Badge variant="destructive">{summary.unpaidCount}</Badge>
                </div>
                <Progress value={(summary.unpaidCount / summary.totalPurchases) * 100} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Purchase Overview</TabsTrigger>
          <TabsTrigger value="purchases">Purchase Details</TabsTrigger>
          <TabsTrigger value="vendors">Vendor Summary</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
        </TabsList>

        {/* Purchase Overview Tab */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Overview</CardTitle>
              <CardDescription>
                Summary of purchase data for the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Quick Search */}
              <div className="flex items-center gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search purchases by number, vendor, or invoice..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Recent Purchases Table */}
              {filteredPurchases && filteredPurchases.length > 0 ? (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Purchase No</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Invoice No</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Outstanding</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPurchases.map((purchase) => (
                        <React.Fragment key={purchase.purchaseId}>
                          <TableRow className="hover:bg-muted/50">
                            <TableCell className="font-medium">
                              {purchase.purchaseNo}
                            </TableCell>
                            <TableCell>
                              {format(new Date(purchase.purchaseDate), 'dd MMM yyyy')}
                            </TableCell>
                            <TableCell>{purchase.vendorName}</TableCell>
                            <TableCell>{purchase.invoiceNo || '-'}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(purchase.totalAmount)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(purchase.paidAmount)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(purchase.outstandingAmount)}
                            </TableCell>
                            <TableCell>
                              {getPaymentStatusBadge(purchase.paymentStatus)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleRowExpansion(purchase.purchaseId)}
                              >
                                {expandedRows.has(purchase.purchaseId) ? 
                                  <ChevronDown className="h-4 w-4" /> : 
                                  <ChevronRight className="h-4 w-4" />
                                }
                              </Button>
                            </TableCell>
                          </TableRow>
                          {expandedRows.has(purchase.purchaseId) && (
                            <TableRow>
                              <TableCell colSpan={9} className="bg-muted/30">
                                <div className="py-4 space-y-2">
                                  <h4 className="font-semibold text-sm">Product Details:</h4>
                                  <div className="grid gap-2">
                                    {purchase.products.map((product, idx) => (
                                      <div key={idx} className="flex justify-between items-center text-sm bg-white p-2 rounded border">
                                        <span>{product.productName} - {product.variantName}</span>
                                        <div className="flex items-center gap-4">
                                          <span>Qty: {product.quantity}</span>
                                          <span>Rate: {formatCurrency(product.rate)}</span>
                                          <span className="font-medium">Amount: {formatCurrency(product.amount)}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  {purchase.paymentCount > 0 && (
                                    <div className="pt-2 text-sm text-muted-foreground">
                                      <span>Payments made: {purchase.paymentCount}</span>
                                      {purchase.lastPaymentDate && (
                                        <span className="ml-4">Last payment: {format(new Date(purchase.lastPaymentDate), 'dd MMM yyyy')}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">No purchases found for the selected criteria</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Purchase Details Tab */}
        <TabsContent value="purchases">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Purchase List</CardTitle>
              <CardDescription>
                Complete list of all purchases with product details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredPurchases && filteredPurchases.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Showing {filteredPurchases.length} of {reportData?.purchases?.length || 0} purchases
                    </p>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Purchase No</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Depot</TableHead>
                        <TableHead>Invoice No</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                        <TableHead className="text-right">Paid Amount</TableHead>
                        <TableHead className="text-right">Outstanding</TableHead>
                        <TableHead>Payment Status</TableHead>
                        <TableHead className="text-right">Payment Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPurchases.map((purchase) => (
                        <TableRow key={purchase.purchaseId}>
                          <TableCell className="font-medium">
                            {purchase.purchaseNo}
                          </TableCell>
                          <TableCell>
                            {format(new Date(purchase.purchaseDate), 'dd MMM yyyy')}
                          </TableCell>
                          <TableCell>{purchase.vendorName}</TableCell>
                          <TableCell>{purchase.depotName || '-'}</TableCell>
                          <TableCell>{purchase.invoiceNo || '-'}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(purchase.totalAmount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(purchase.paidAmount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(purchase.outstandingAmount)}
                          </TableCell>
                          <TableCell>
                            {getPaymentStatusBadge(purchase.paymentStatus)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline">{purchase.paymentCount}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {/* Pagination */}
                  {reportData && reportData.totalPages > 1 && (
                    <div className="flex items-center justify-center mt-6">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => setPage(Math.max(1, page - 1))}
                              className={page === 1 ? 'pointer-events-none opacity-50' : ''}
                            />
                          </PaginationItem>
                          
                          {Array.from({ length: Math.min(5, reportData.totalPages) }, (_, i) => {
                            const pageNum = i + 1;
                            return (
                              <PaginationItem key={pageNum}>
                                <PaginationLink
                                  onClick={() => setPage(pageNum)}
                                  isActive={page === pageNum}
                                >
                                  {pageNum}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          })}
                          
                          {reportData.totalPages > 5 && (
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                          )}
                          
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => setPage(Math.min(reportData.totalPages, page + 1))}
                              className={page === reportData.totalPages ? 'pointer-events-none opacity-50' : ''}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">No detailed purchase data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vendor Summary Tab */}
        <TabsContent value="vendors">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Summary</CardTitle>
              <CardDescription>
                Purchase and payment summary grouped by vendor
              </CardDescription>
            </CardHeader>
            <CardContent>
              {vendorSummaries && vendorSummaries.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor Name</TableHead>
                      <TableHead className="text-right">Total Purchases</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      <TableHead className="text-right">Amount Paid</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead>Last Purchase</TableHead>
                      <TableHead>Last Payment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendorSummaries.map((vendor) => (
                      <TableRow key={vendor.vendorId}>
                        <TableCell className="font-medium">{vendor.vendorName}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">{vendor.totalPurchases}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(vendor.totalAmount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(vendor.totalPaid)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            "font-medium",
                            vendor.totalOutstanding > 0 ? "text-red-600" : "text-green-600"
                          )}>
                            {formatCurrency(vendor.totalOutstanding)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {vendor.lastPurchaseDate ? 
                            format(new Date(vendor.lastPurchaseDate), 'dd MMM yyyy') : 
                            '-'
                          }
                        </TableCell>
                        <TableCell>
                          {vendor.lastPaymentDate ? 
                            format(new Date(vendor.lastPaymentDate), 'dd MMM yyyy') : 
                            '-'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">No vendor summary data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment History Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                All payments made against purchases
              </CardDescription>
            </CardHeader>
            <CardContent>
              {paymentData && paymentData.payments && paymentData.payments.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Total payments: {paymentData.totalAmount ? formatCurrency(paymentData.totalAmount) : '-'}
                    </p>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment No</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Reference No</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Purchase Count</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentData.payments.map((payment) => (
                        <React.Fragment key={payment.paymentId}>
                          <TableRow className="hover:bg-muted/50">
                            <TableCell className="font-medium">
                              {payment.paymentNo}
                            </TableCell>
                            <TableCell>
                              {format(new Date(payment.paymentDate), 'dd MMM yyyy')}
                            </TableCell>
                            <TableCell>{payment.vendorName}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{payment.mode}</Badge>
                            </TableCell>
                            <TableCell>{payment.referenceNo || '-'}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(payment.totalAmount)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline">{payment.purchaseCount}</Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleRowExpansion(payment.paymentId)}
                              >
                                {expandedRows.has(payment.paymentId) ? 
                                  <ChevronDown className="h-4 w-4" /> : 
                                  <ChevronRight className="h-4 w-4" />
                                }
                              </Button>
                            </TableCell>
                          </TableRow>
                          {expandedRows.has(payment.paymentId) && (
                            <TableRow>
                              <TableCell colSpan={8} className="bg-muted/30">
                                <div className="py-4 space-y-2">
                                  <h4 className="font-semibold text-sm">Associated Purchases:</h4>
                                  <div className="grid gap-2">
                                    {payment.purchases.map((purchase, idx) => (
                                      <div key={idx} className="flex justify-between items-center text-sm bg-white p-2 rounded border">
                                        <span>{purchase.purchaseNo} (Invoice: {purchase.invoiceNo})</span>
                                        <div className="flex items-center gap-4">
                                          <span>Purchase Date: {format(new Date(purchase.purchaseDate), 'dd MMM yyyy')}</span>
                                          <span className="font-medium">Amount: {formatCurrency(purchase.amount)}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Wallet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">No payment history available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PurchaseReport;
