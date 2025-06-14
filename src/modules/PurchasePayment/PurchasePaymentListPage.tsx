import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/pagination';
import { Plus, Trash2, Eye } from 'lucide-react';
import {
  fetchPurchasePayments,
  deletePurchasePayment,
} from '@/services/purchasePaymentService';
import { formatCurrency } from '@/lib/formatter';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { m } from 'framer-motion';

interface PurchasePayment {
  id: number;
  paymentno: string;
  paymentDate: string;
  mode: string;
  totalAmount: number;
  vendor: { id: number; name: string };
  notes: string;
}

const PurchasePaymentListPage = () => {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [searchTerm, setSearchTerm] = useState('');
  const [inputValue, setInputValue] = useState('');
  const debounceRef = useRef<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  // debounce search
  if (debounceRef.current) window.clearTimeout(debounceRef.current);
  debounceRef.current = window.setTimeout(() => setSearchTerm(inputValue), 400);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['purchase-payments', page, searchTerm],
    queryFn: () => fetchPurchasePayments({ page, limit: pageSize, search: searchTerm }),
    placeholderData: { payments: [], totalPages: 1 },
  });

  const payments: PurchasePayment[] = data.payments || [];
  console.log("Payment is here", payments)
  const totalPages = data?.totalPages || 1;

  const handleDelete = async () => {
    if (!selectedId) return;
    try {
      await deletePurchasePayment(selectedId);
      toast.success('Payment deleted');
      refetch();
      setSelectedId(null);
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete payment');
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-2xl">Purchase Payments</CardTitle>
          <Link to="/admin/purchase-payments/create">
            <Button>
              <Plus className="mr-2 size-4" /> New Payment
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Input
              value={inputValue}
              onChange={handleInputChange}
              placeholder="Search by vendor/mode..."
              className="max-w-sm"
            />
          </div>

          {isLoading && <div className="p-10 text-center">Loading...</div>}
          {isError && <div className="p-10 text-center">Error loading payments</div>}
          {!isLoading && !isError && (
            <Table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
              <TableHeader className="bg-gray-100">
                <TableRow>
                  <TableHead className="px-6 py-3">Payment No</TableHead>
                  <TableHead className="px-6 py-3">Date</TableHead>
                  <TableHead className="px-6 py-3">Vendor</TableHead>
                  <TableHead className="px-6 py-3">Mode</TableHead>
                  <TableHead className="px-6 py-3 text-right">Total</TableHead>
                  <TableHead className="px-6 py-3">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y">
                {payments&&  payments?.map((p) => (
                  <TableRow key={p.id} className="hover:bg-gray-50">
                    <TableCell className="px-6 py-4">{p.paymentno}</TableCell>
                    <TableCell className="px-6 py-4">
                      {format(new Date(p.paymentDate), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="px-6 py-4">{p.vendor?.name}</TableCell>
                    <TableCell className="px-6 py-4">{p.mode}</TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      {formatCurrency(p.totalAmount)}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Link to={`/admin/purchase-payments/${p.id}`}>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setSelectedId(p.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Payment?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the payment.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setSelectedId(null)}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {totalPages > 1 && (
            <Pagination className="mt-6">
              <PaginationContent>
                <PaginationPrevious onClick={() => setPage((p) => Math.max(1, p - 1))} />
                <span className="px-4 py-2 text-sm">
                  Page {page} of {totalPages}
                </span>
                <PaginationNext onClick={() => setPage((p) => Math.min(totalPages, p + 1))} />
              </PaginationContent>
            </Pagination>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchasePaymentListPage;
