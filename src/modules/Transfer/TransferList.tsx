import { useState, useEffect, useRef, useCallback } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { get, del } from "@/services/apiService";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface TransferDetail {
  quantity: number;
}

interface Transfer {
  id: number;
  transferNo: string;
  transferDate: string;
  fromDepot: { name: string };
  toDepot: { name: string };
  details: TransferDetail[];
}

const TransferList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(() => {
    const pageParam = searchParams.get('page');
    return pageParam ? parseInt(pageParam, 10) : 1;
  });
  const pageSize = 10;
  const [inputValue, setInputValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const debounceRef = useRef<number | null>(null);
  const [selectedTransferId, setSelectedTransferId] = useState<number | null>(null);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => setSearchTerm(inputValue), 400);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [inputValue]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["transfers", page, searchTerm],
    queryFn: async () => {
      let url = `/transfers?page=${page}&pageSize=${pageSize}`;
      if (searchTerm) url += `&searchTerm=${searchTerm}`;
      return get(url);
    },
  });

  const transfers: Transfer[] = data?.data || [];
  const totalPages = data?.totalPages || 1;

  const clearFilters = () => {
    setInputValue("");
    setSearchTerm("");
    updatePage(1);
  };

  const updatePage = useCallback((newPage: number) => {
    setPage(newPage);
    const newSearchParams = new URLSearchParams(searchParams);
    if (newPage === 1) {
      newSearchParams.delete('page');
    } else {
      newSearchParams.set('page', newPage.toString());
    }
    setSearchParams(newSearchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const calcTotalQty = (details: TransferDetail[]) =>
    details.reduce((sum, d) => sum + (d.quantity || 0), 0);

  const handleDelete = async () => {
    if (!selectedTransferId) return;
    try {
      await del(`/transfers/${selectedTransferId}`);
      toast.success("Transfer deleted successfully");
      refetch();
      setSelectedTransferId(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to delete transfer");
    }
  };

  if (isLoading) return <div className="p-10 text-center">Loading transfers...</div>;
  if (isError) return <div className="p-10 text-center">Error loading transfers</div>;

  return (
    <div className="container mx-auto p-6">
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-2xl">Transfer Management</CardTitle>
          <Link to="/admin/transfers/create">
            <Button>
              <Plus className="mr-2 size-4" /> New Transfer
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Input
              placeholder="Search by TFR no, from/to depot..."
              value={inputValue}
              onChange={handleInputChange}
            />
            <Button onClick={clearFilters} variant="outline">
              Clear Filters
            </Button>
          </div>

          {transfers.length === 0 ? (
            <div className="py-10 text-center">No transfers found.</div>
          ) : (
            <Table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
              <TableHeader className="bg-gray-100">
                <TableRow>
                  <TableHead className="px-6 py-3">Transfer No</TableHead>
                  <TableHead className="px-6 py-3">Date</TableHead>
                  <TableHead className="px-6 py-3">From Depot</TableHead>
                  <TableHead className="px-6 py-3">To Depot</TableHead>
                  <TableHead className="px-6 py-3 text-right">Total Qty</TableHead>
                  <TableHead className="px-6 py-3">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y">
                {transfers.map((transfer) => (
                  <TableRow key={transfer.id} className="hover:bg-gray-50">
                    <TableCell className="px-6 py-4 font-medium">{transfer.transferNo}</TableCell>
                    <TableCell className="px-6 py-4">
                      {format(new Date(transfer.transferDate), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="px-6 py-4">{transfer.fromDepot.name}</TableCell>
                    <TableCell className="px-6 py-4">{transfer.toDepot.name}</TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      {calcTotalQty(transfer.details)}
                    </TableCell>
                    <TableCell className="px-6 py-4 space-x-2">
                      <Link to={`/admin/transfers/edit/${transfer.id}`}>
                        <Button size="icon" variant="ghost">
                          <Pencil className="size-4" />
                        </Button>
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setSelectedTransferId(transfer.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the
                              transfer and remove its data from our servers.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setSelectedTransferId(null)}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete}>
                              Continue
                            </AlertDialogAction>
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
                <PaginationPrevious onClick={() => page > 1 && updatePage(page - 1)} />
                <span className="px-4 py-2 text-sm">Page {page} of {totalPages}</span>
                <PaginationNext onClick={() => page < totalPages && updatePage(page + 1)} />
              </PaginationContent>
            </Pagination>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TransferList;
