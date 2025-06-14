import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { fetchPurchasePaymentById, fetchVendorPurchases } from '../../services/purchasePaymentService';
import { get } from '../../services/apiService';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from '../../components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  TableCaption
} from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { format } from 'date-fns';
import { 
  CalendarDays, 
  CreditCard, 
  FileText, 
  Info, 
  Landmark, 
  User, 
  Wallet
} from 'lucide-react';
import { Skeleton } from '../../components/ui/skeleton';
import { formatCurrency } from '../../lib/formatter';

interface PurchaseDetail {
  id: number;
  purchaseNo: string;
  purchaseDate: string;
  invoiceNo?: string;
  invoiceDate?: string;
  totalAmt?: string;
  paidAmt?: string;
  details?: any[];
}

interface PaymentDetail {
  id: number;
  amount: string;
  purchase: PurchaseDetail;
}

interface Vendor {
  id: number;
  name: string;
}

interface PurchasePayment {
  id: number;
  paymentno: string;
  paymentDate: string;
  totalAmount: string;
  mode: string;
  referenceNo?: string | null;
  notes?: string | null;
  vendor: Vendor;
  details: PaymentDetail[];
}

interface VendorStats {
  totalPaid: number;
  lastPaymentDate: Date | null;
  outstanding: number;
}

const PurchasePaymentViewPage = () => {
  const { id } = useParams<{ id: string }>();

  const { data: payment, isLoading, isError } = useQuery<PurchasePayment>({
    queryKey: ['purchase-payment', id],
    queryFn: () => fetchPurchasePaymentById(Number(id)),
    enabled: !!id,
  });

  const vendorId = payment?.vendor.id;

  const {
    data: vendorPayments = [],
    isLoading: isLoadingVendorPayments,
  } = useQuery<any[]>({
    queryKey: ['vendor-payments', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const res = await get('/api/admin/purchase-payments', { vendorId, limit: 1000 });
      if (Array.isArray(res)) return res; // API might directly return array
      return res?.payments || [];
    },
  });

  const {
    data: vendorPurchases = [],
    isLoading: isLoadingVendorPurchases,
  } = useQuery<any[]>({
    queryKey: ['vendor-purchases', vendorId],
    enabled: !!vendorId,
    queryFn: () => fetchVendorPurchases(vendorId!),
  });

  const vendorStats: VendorStats | null = (() => {
    if (!vendorId || isLoadingVendorPayments || isLoadingVendorPurchases) return null;
    const totalPaid = vendorPayments.reduce((sum, p: any) => sum + parseFloat(p.totalAmount || '0'), 0);
    const lastPaymentDate = vendorPayments.reduce((latest: Date | null, p: any) => {
      const d = new Date(p.paymentDate);
      return !latest || d > latest ? d : latest;
    }, null as Date | null);
    const outstanding = vendorPurchases.reduce((sum, pu: any) => {
      let total = 0;
      if (pu.totalAmt) {
        total = parseFloat(pu.totalAmt);
      } else if (Array.isArray(pu.details)) {
        total = pu.details.reduce((s: number, item: any) => s + parseFloat(item.purchaseRate || item.rate || '0') * (item.quantity || 1), 0);
      }
      const paid = parseFloat(pu.paidAmt || '0');
      return sum + Math.max(total - paid, 0);
    }, 0);
    return { totalPaid, lastPaymentDate, outstanding };
  })();

  // helper to calculate purchase total
  const getPurchaseTotal = (purchase: any): number => {
    if (!purchase) return 0;
    if (purchase.totalAmt) return parseFloat(purchase.totalAmt);
    if (Array.isArray(purchase.details)) {
      return purchase.details.reduce(
        (sum: number, item: any) =>
          sum +
          parseFloat(item.purchaseRate || item.rate || '0') * (item.quantity || 1),
        0,
      );
    }
    return 0;
  };

  if (isLoading) return <PageSkeleton />;
  if (isError || !payment) return <div className="container mx-auto p-6 text-destructive">Error fetching payment details or payment not found.</div>;

  // Calculate paid amount using purchase.paidAmt if available, otherwise fallback to payment.totalAmount
  const paidAmount = (() => {
    if (Array.isArray(payment.details) && payment.details.length > 0) {
      // Sum paidAmt from each related purchase if it exists
      const sumPaid = payment.details.reduce((sum: number, d: any) => {
        const p = d.purchase;
        if (p && p.paidAmt !== undefined && p.paidAmt !== null) {
          return sum + Number(p.paidAmt);
        }
        return sum;
      }, 0);
      if (sumPaid > 0) return sumPaid;
    }
    // fallback to totalAmount field if no purchase.paidAmt
    return parseFloat(payment.totalAmount ?? '0');
  })();

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Payment Details</h1>
        {/* <Badge variant="secondary" className="px-3 py-1 text-sm">
          Payment ID: {id}
        </Badge> */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Payment Card */}
        <Card className="lg:col-span-2">
          <CardHeader className="bg-muted/50">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-6 w-6 text-primary" />
                  {payment.paymentno}
                </CardTitle>
                <CardDescription className="mt-2">
                  Payment Information
                </CardDescription>
              </div>
              <Badge className="text-sm px-3 py-1">
                {payment.mode}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <User className="h-5 w-5 mt-0.5 text-muted-foreground mr-3" />
                  <div>
                    <p className="text-sm text-muted-foreground">Vendor</p>
                    <p className="font-medium">{payment.vendor.name}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <CalendarDays className="h-5 w-5 mt-0.5 text-muted-foreground mr-3" />
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Date</p>
                    <p className="font-medium">
                      {format(new Date(payment.paymentDate), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <Landmark className="h-5 w-5 mt-0.5 text-muted-foreground mr-3" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="font-medium text-xl">
                      {formatCurrency(paidAmount)}
                    </p>
                  </div>
                </div>
                
                {payment.referenceNo && (
                  <div className="flex items-start">
                    <CreditCard className="h-5 w-5 mt-0.5 text-muted-foreground mr-3" />
                    <div>
                      <p className="text-sm text-muted-foreground">Reference No</p>
                      <p className="font-medium">{payment.referenceNo}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {payment.notes && (
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-start">
                  <Info className="h-5 w-5 mt-0.5 text-muted-foreground mr-3" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Notes</p>
                    <p className="text-sm bg-muted/30 rounded-lg p-4">
                      {payment.notes}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Vendor Summary Card */}
        {/* <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Vendor Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(isLoadingVendorPayments || isLoadingVendorPurchases || !vendorStats) ? (
              <div className="space-y-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-5 w-3/4" />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Payments</p>
                  <p className="font-medium">${formatCurrency(vendorStats.totalPaid.toString())}</p>
                </div>
                {vendorStats.lastPaymentDate && (
                  <div>
                    <p className="text-sm text-muted-foreground">Last Payment</p>
                    <p className="font-medium">{format(vendorStats.lastPaymentDate, 'dd/MM/yyyy')}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                  <p className="font-medium">${formatCurrency(vendorStats.outstanding.toString())}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card> */}
      </div>

      {/* Payment Breakdown */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoices
          </CardTitle>
          <CardDescription>
            Applied to purchase invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Invoice No</TableHead>
                <TableHead>Invoice Date</TableHead>
                <TableHead>Purchase No</TableHead>
                <TableHead className="text-right">Invoice Amount</TableHead>
                <TableHead className="text-right">Amount Paid</TableHead>
                {/* <TableHead className="text-right">Balance</TableHead> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {payment?.details?.map((detail) => {
                const purchaseData = vendorPurchases.find(
                  (p: any) => p.id === detail.purchase.id,
                );
                const invoiceTotal = getPurchaseTotal(purchaseData || detail.purchase);
                const amountPaid = parseFloat(detail.amount ?? '0');
                return (
                  <TableRow key={detail.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">
                      {detail.purchase.invoiceNo || detail.purchase.purchaseNo}
                    </TableCell>
                    <TableCell>
                      {format(new Date(detail.purchase.invoiceDate || detail.purchase.purchaseDate), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      {detail.purchase.purchaseNo}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(invoiceTotal)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(amountPaid)}
                    </TableCell>
                    {/* Uncomment if balance column is required */}
                    {/* <TableCell className="text-right">
                      {formatCurrency(balance)}
                    </TableCell> */}
                  </TableRow>
                );
              })}
            </TableBody>
            <TableCaption className="bg-muted/30">
              <TableRow className='w-full justify-center'>
                <TableCell colSpan={3} className="text-center font-medium">Total</TableCell>
                <TableCell className="text-center font-bold">
                  {formatCurrency(parseFloat(payment.totalAmount ?? '0'))}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableCaption>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

// Skeleton loader component
const PageSkeleton = () => (
  <div className="container mx-auto p-4 max-w-6xl">
    <div className="flex justify-between items-center mb-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-6 w-32" />
    </div>
    
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader className="bg-muted/50">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2 mt-2" />
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-6 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-2/3" />
        </CardHeader>
        <CardContent>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2 mb-4">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-5 w-3/4" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
    
    <Card className="mt-6">
      <CardHeader>
        <Skeleton className="h-6 w-1/4" />
        <Skeleton className="h-4 w-1/3 mt-2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  </div>
);

export default PurchasePaymentViewPage;