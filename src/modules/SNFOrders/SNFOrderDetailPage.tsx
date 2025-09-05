import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSNFOrderById, SNFOrderDetail, downloadSNFOrderInvoice, generateSNFOrderInvoice } from '@/services/snfOrderAdminService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, ArrowLeft, Download, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const LabelRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="grid grid-cols-12 gap-2 py-2 border-b last:border-0">
    <div className="col-span-4 text-sm text-muted-foreground">{label}</div>
    <div className="col-span-8 font-medium break-words">{value}</div>
  </div>
);

const SNFOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<SNFOrderDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const data = await getSNFOrderById(Number(id));
        setOrder(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch order');
      }
      setLoading(false);
    };
    fetchOrder();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-sm">Loading order...</span>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mx-auto py-8 px-4">
        <p className="text-red-600">{error || 'Order not found'}</p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/admin/snf-orders">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Orders
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">SNF Order Detail</h1>
        <Button asChild variant="outline">
          <Link to="/admin/snf-orders">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order #{order.orderNo}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3">Customer</h3>
              <div className="rounded-md border p-4">
                <LabelRow label="Name" value={order.name} />
                <LabelRow label="Email" value={order.email || '-'} />
                <LabelRow label="Mobile" value={order.mobile} />
                <LabelRow label="Address Line 1" value={order.addressLine1} />
                <LabelRow label="Address Line 2" value={order.addressLine2 || '-'} />
                <LabelRow label="City" value={order.city} />
                <LabelRow label="State" value={order.state || '-'} />
                <LabelRow label="Pincode" value={order.pincode} />
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Payment</h3>
              <div className="rounded-md border p-4">
                <LabelRow label="Subtotal" value={`₹${order.subtotal.toFixed(2)}`} />
                <LabelRow label="Delivery Fee" value={`₹${order.deliveryFee.toFixed(2)}`} />
                <LabelRow label="Total" value={`₹${order.totalAmount.toFixed(2)}`} />
                {typeof (order as any).walletamt === 'number' && (
                  <LabelRow label="Wallet Deduction" value={`-₹${(order as any).walletamt.toFixed(2)}`} />
                )}
                {typeof (order as any).payableAmount === 'number' && (
                  <LabelRow label="Amount Payable" value={`₹${(order as any).payableAmount.toFixed(2)}`} />
                )}
                <LabelRow label="Payment Mode" value={order.paymentMode || '-'} />
                <LabelRow label="Payment Status" value={order.paymentStatus} />
                <LabelRow label="Payment Ref" value={order.paymentRefNo || '-'} />
                <LabelRow label="Payment Date" value={order.paymentDate ? new Date(order.paymentDate).toLocaleDateString() : '-'} />
                <LabelRow label="Created At" value={new Date(order.createdAt).toLocaleDateString()} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Depot and Invoice Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Depot Information */}
        <Card>
          <CardHeader>
            <CardTitle>Depot Information</CardTitle>
          </CardHeader>
          <CardContent>
            {order.depot ? (
              <div className="rounded-md border p-4">
                <LabelRow label="Depot Name" value={order.depot.name} />
                {/* <LabelRow label="Depot ID" value={order.depot.id} /> */}
              </div>
            ) : (
              <p className="text-muted-foreground">No depot assigned to this order.</p>
            )}
          </CardContent>
        </Card>

        {/* Invoice Information */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Information</CardTitle>
          </CardHeader>
          <CardContent>
            {order.invoiceNo && order.invoicePath ? (
              <div className="space-y-4">
                <div className="rounded-md border p-4">
                  <LabelRow label="Invoice No" value={order.invoiceNo} />
                  <LabelRow label="Invoice Status" value="Generated" />
                </div>
                <Button 
                  onClick={async () => {
                    try {
                      await downloadSNFOrderInvoice(order.id);
                    } catch (error: any) {
                      toast.error(error.message || 'Failed to download invoice');
                    }
                  }}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Invoice
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-muted-foreground">Invoice not yet generated.</p>
                <Button 
                  onClick={async () => {
                    try {
                      await generateSNFOrderInvoice(order.id);
                      toast.success('Invoice generated successfully!');
                      // Refresh the order data
                      const updatedOrder = await getSNFOrderById(order.id);
                      setOrder(updatedOrder);
                    } catch (error: any) {
                      toast.error(error.message || 'Failed to generate invoice');
                    }
                  }}
                  className="w-full"
                >
                  Generate Invoice
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items ({order.items?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {(!order.items || order.items.length === 0) ? (
            <p className="text-muted-foreground">No items found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Line Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((it) => (
                    <TableRow key={it.id} className={cn(it.isCancelled && 'opacity-50 bg-red-50 dark:bg-red-950/20')}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {it.imageUrl ? (
                            <img src={it.imageUrl} alt={it.name} className="h-10 w-10 rounded object-cover border" />
                          ) : (
                            <div className="h-10 w-10 rounded bg-muted" />
                          )}
                          <div>
                            <div className={cn("font-medium", it.isCancelled && "line-through")}>{it.name}</div>
                            {/* <div className="text-xs text-muted-foreground">ID: {it.productId ?? '-'} | VariantID: {it.depotProductVariantId ?? '-'}</div> */}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className={cn(it.isCancelled && "line-through")}>{it.variantName || '-'}</TableCell>
                      <TableCell className={cn(it.isCancelled && "line-through")}>₹{it.price.toFixed(2)}</TableCell>
                      <TableCell className={cn(it.isCancelled && "line-through")}>{it.quantity}</TableCell>
                      <TableCell className={cn(it.isCancelled && "line-through")}>₹{it.lineTotal.toFixed(2)}</TableCell>
                      <TableCell>
                        {it.isCancelled ? (
                          <Badge variant="destructive">
                            <X className="h-3 w-3 mr-1" />
                            Cancelled
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Active</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SNFOrderDetailPage;
