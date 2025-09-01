import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, AlertCircle, Search, Download } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { getAllSNFOrders, PaginatedSNFOrdersResponse, SNFOrderListItem, markSNFOrderAsPaid, MarkOrderPaidPayload, generateSNFOrderInvoice, downloadSNFOrderInvoice } from '@/services/snfOrderAdminService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';

const SNFOrdersListPage: React.FC = () => {
  const [orders, setOrders] = useState<SNFOrderListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [openPaymentId, setOpenPaymentId] = useState<number | null>(null);
  const [paymentMode, setPaymentMode] = useState<string>('CASH');
  const [paymentRefNo, setPaymentRefNo] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [limit, setLimit] = useState<number>(10);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  const fetchOrders = async (
    page = currentPage,
    pageSize = limit,
    search = debouncedSearchTerm,
    sortCol = sortBy,
    sortDir = sortOrder
  ) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: pageSize, search, sortBy: sortCol, sortOrder: sortDir };
      const response: PaginatedSNFOrdersResponse = await getAllSNFOrders(params);
      setOrders(response.orders);
      setCurrentPage(response.currentPage);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      setOrders([]);
      setTotalPages(0);
      setError(err.message || 'Failed to fetch orders');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm, currentPage, limit, sortBy, sortOrder]);

  const handleLimitChange = (value: string) => {
    setLimit(Number(value));
    setCurrentPage(1);
  };

  const handleSort = (columnKey: string) => {
    if (sortBy === columnKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnKey);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const resetPaymentForm = () => {
    setPaymentMode('CASH');
    setPaymentRefNo('');
    setPaymentDate(new Date().toISOString().slice(0, 10));
  };

  const handleMarkPaid = async (orderId: number, data: MarkOrderPaidPayload) => {
    try {
      setPayingId(orderId);
      await markSNFOrderAsPaid(orderId, data);
      toast.success('Order marked as paid');
      await fetchOrders();
      setOpenPaymentId(null);
      resetPaymentForm();
    } catch (e: any) {
      toast.error(e.message || 'Failed to mark order as paid');
    } finally {
      setPayingId(null);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>SNF Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div className="relative w-full md:max-w-sm">
              <Input
                placeholder="Search by order no, name, mobile, email, city..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show:</span>
              <Select value={String(limit)} onValueChange={handleLimitChange}>
                <SelectTrigger className="w-[90px]">
                  <SelectValue placeholder={String(limit)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm">Loading orders...</span>
            </div>
          )}

          {error && !loading && (
            <div className="flex items-center justify-center h-32 text-red-600">
              <AlertCircle className="h-6 w-6 mr-2" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && orders.length === 0 && (
            <p className="text-center text-muted-foreground py-6">No orders found.</p>
          )}

          {!loading && !error && orders.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px] cursor-pointer" onClick={() => handleSort('createdAt')}>
                      Date {sortBy === 'createdAt' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </TableHead>
                    <TableHead>Order No</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Depot</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('deliveryDate')}>
                      Delivery Date {sortBy === 'deliveryDate' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </TableHead>
                    <TableHead className="text-right cursor-pointer" onClick={() => handleSort('totalAmount')}>
                      Total {sortBy === 'totalAmount' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>{new Date(o.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="font-mono">{o.orderNo}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{o.name}</span>
                          <span className="text-xs text-muted-foreground">{o.email || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{o.mobile}</TableCell>
                      <TableCell>{o.city}</TableCell>
                      <TableCell>{o.depot?.name || '-'}</TableCell>
                      <TableCell>
                        {o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="text-right">₹{o.totalAmount.toFixed(2)}</TableCell>
                      <TableCell>{o._count?.items ?? 0}</TableCell>
                      <TableCell>
                        <span className="inline-flex rounded-full px-2 py-0.5 text-xs border">
                          {o.paymentStatus}
                        </span>
                      </TableCell>
                      <TableCell>
                        {o.invoiceNo && o.invoicePath ? (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={async () => {
                              try {
                                await downloadSNFOrderInvoice(o.id);
                              } catch (error: any) {
                                toast.error(error.message || 'Failed to download invoice');
                              }
                            }}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not generated</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link to={`/admin/snf-orders/${o.id}`}>View</Link>
                          </Button>
                          {o.paymentStatus === 'PAID' ? (
                            <Button size="sm" variant="secondary" disabled>
                              Paid
                            </Button>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                onClick={() => {
                                  resetPaymentForm();
                                  setOpenPaymentId(o.id);
                                }}
                                disabled={payingId === o.id}
                              >
                                Payment
                              </Button>
                              <AlertDialog
                                open={openPaymentId === o.id}
                                onOpenChange={(open) => {
                                  if (!open) {
                                    setOpenPaymentId(null);
                                    resetPaymentForm();
                                  }
                                }}
                              >
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Record Payment</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Enter payment details to mark this order as PAID.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>

                                  <div className="space-y-3">
                                    <div className="grid grid-cols-4 items-center gap-3">
                                      <Label htmlFor={`pay-mode-${o.id}`} className="col-span-1 text-right">Mode</Label>
                                      <div className="col-span-3">
                                        <Select value={paymentMode} onValueChange={setPaymentMode}>
                                          <SelectTrigger id={`pay-mode-${o.id}`}>
                                            <SelectValue placeholder="Select mode" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="CASH">CASH</SelectItem>
                                            <SelectItem value="ONLINE">ONLINE</SelectItem>
                                            <SelectItem value="UPI">UPI</SelectItem>
                                            <SelectItem value="BANK">BANK</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-4 items-center gap-3">
                                      <Label htmlFor={`pay-ref-${o.id}`} className="col-span-1 text-right">Reference No</Label>
                                      <div className="col-span-3">
                                        <Input
                                          id={`pay-ref-${o.id}`}
                                          placeholder="e.g. TXN123 / UPI Ref"
                                          value={paymentRefNo}
                                          onChange={(e) => setPaymentRefNo(e.target.value)}
                                        />
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-4 items-center gap-3">
                                      <Label htmlFor={`pay-date-${o.id}`} className="col-span-1 text-right">Payment Date</Label>
                                      <div className="col-span-3">
                                        <Input
                                          id={`pay-date-${o.id}`}
                                          type="date"
                                          value={paymentDate}
                                          onChange={(e) => setPaymentDate(e.target.value)}
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  <AlertDialogFooter>
                                    <AlertDialogCancel disabled={payingId === o.id}>Cancel</AlertDialogCancel>
                                    <Button
                                      onClick={() => {
                                        if (!paymentDate) {
                                          toast.error('Payment date is required');
                                          return;
                                        }
                                        if (paymentMode !== 'CASH' && !paymentRefNo.trim()) {
                                          toast.error('Reference no is required for non-cash payments');
                                          return;
                                        }
                                        handleMarkPaid(o.id, {
                                          paymentMode,
                                          paymentRefNo: paymentRefNo.trim() || null,
                                          paymentDate,
                                        });
                                      }}
                                      disabled={payingId === o.id}
                                    >
                                      {payingId === o.id ? (
                                        <span className="inline-flex items-center gap-1">
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                          Saving
                                        </span>
                                      ) : (
                                        'Save'
                                      )}
                                    </Button>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 0 && (
            <div className="flex items-center justify-between mt-6">
              <Button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || loading}
                variant="outline"
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
              <Button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || loading}
                variant="outline"
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SNFOrdersListPage;
