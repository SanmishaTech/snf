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
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { get, del } from "@/services/apiService";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, Plus, Trash2, Pencil } from "lucide-react";
import { formatCurrency } from "@/lib/formatter";
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
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

interface PurchaseDetail {
  quantity: number;
  purchaseRate: number;
}
interface Purchase {
  id: string;
  purchaseNo: string;
  purchaseDate: string;
  invoiceNo: string;
  invoiceDate: string;
  vendor: { id: string; name: string };
  depot?: { id: string; name: string };
  purchaseDetails: PurchaseDetail[];
  paidAmt?: number;
}

const PurchaseList = () => {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [inputValue, setInputValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const debounceRef = useRef<number | null>(null);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);

  // debounce search
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
    queryKey: ["purchases", page, searchTerm, dateFilter],
    queryFn: async () => {
      let url = `/purchases?page=${page}&limit=${pageSize}`;
      if (searchTerm) url += `&search=${searchTerm}`;
      if (dateFilter) url += `&date=${format(dateFilter, "yyyy-MM-dd")}`;
      return get(url);
    },
  });

  const purchases: Purchase[] = data?.data || [];
  const totalPages = data?.totalPages || 1;

  const clearFilters = () => {
    setInputValue("");
    setSearchTerm("");
    setDateFilter(undefined);
    setPage(1);
  };

  const calcTotal = (details: PurchaseDetail[]) =>
    details.reduce((sum, d) => sum + (d.purchaseRate || 0) * (d.quantity || 0), 0);

  const handleDelete = async () => {
    if (!selectedPurchaseId) return;
    try {
      await del(`/purchases/${selectedPurchaseId}`);
      toast.success("Purchase deleted");
      refetch();
      setSelectedPurchaseId(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to delete purchase");
    }
  };

  if (isLoading) return <div className="p-10 text-center">Loading purchases...</div>;
  if (isError) return <div className="p-10 text-center">Error loading purchases</div>;

  return (
    <div className="container mx-auto p-6">
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-2xl">Purchase Management</CardTitle>
          <Link to="/admin/purchases/create">
            <Button>
              <Plus className="mr-2 size-4" /> New Purchase
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Input
              placeholder="Search by purchase no / vendor"
              value={inputValue}
              onChange={handleInputChange}
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start", !dateFilter && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFilter ? format(dateFilter, "dd/MM/yyyy") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFilter} onSelect={setDateFilter} />
              </PopoverContent>
            </Popover>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>

          {purchases.length === 0 ? (
            <div className="py-10 text-center">No purchases found.</div>
          ) : (
            <Table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
              <TableHeader className="bg-gray-100">
                <TableRow>
                  <TableHead className="px-6 py-3">Purchase No</TableHead>
                  <TableHead className="px-6 py-3">Vendor</TableHead>
                  <TableHead className="px-6 py-3">Purchase Date</TableHead>
                  <TableHead className="px-6 py-3">Invoice No</TableHead>
                  <TableHead className="px-6 py-3">Invoice Date</TableHead>
                  <TableHead className="px-6 py-3 text-right">Total Amount</TableHead>
                  <TableHead className="px-6 py-3 text-right">Paid Amount</TableHead>
                  <TableHead className="px-6 py-3">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y">
                {purchases.map((p) => (
                  <TableRow key={p.id} className="hover:bg-gray-50">
                    <TableCell className="px-6 py-4 font-medium">{p.purchaseNo}</TableCell>
                    <TableCell className="px-6 py-4">{p.vendor?.name}</TableCell>
                    <TableCell className="px-6 py-4">
                      {format(new Date(p.purchaseDate), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="px-6 py-4">{p.invoiceNo}</TableCell>
                    <TableCell className="px-6 py-4">
                      {format(new Date(p.invoiceDate), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      {formatCurrency(calcTotal(p.purchaseDetails))}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      {formatCurrency(p.paidAmt || 0)}
                    </TableCell>
                    <TableCell className="px-6 py-4 space-x-2">
                      <Link to={`/admin/purchases/edit/${p.id}`}>
                        <Button size="icon" variant="ghost">
                          <Pencil className="size-4" />
                        </Button>
                      </Link>
                      {/* <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setSelectedPurchaseId(p.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the
                              purchase and remove its data from our servers.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setSelectedPurchaseId(null)}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete}>
                              Continue
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog> */}
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
                <span className="px-4 py-2 text-sm">Page {page} of {totalPages}</span>
                <PaginationNext onClick={() => setPage((p) => Math.min(totalPages, p + 1))} />
              </PaginationContent>
            </Pagination>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchaseList;
