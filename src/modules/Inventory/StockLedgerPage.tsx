import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/apiService";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  CalendarIcon,
  Search,
  X,
  TrendingUp,
  TrendingDown,
  BookOpen,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface StockLedgerEntry {
  id: number;
  transactionDate: string;
  receivedQty: number;
  issuedQty: number;
  module: string;
  foreignKey: number;
  product: { id: number; name: string };
  variant: { id: number; name: string };
  depot: { id: number; name: string };
}

interface Depot {
  id: number;
  name: string;
}

const MODULE_OPTIONS = [
  { value: "all", label: "All Modules" },
  { value: "Purchase", label: "Purchase" },
  { value: "Transfer", label: "Transfer" },
  { value: "Wastage", label: "Wastage" },
  { value: "Order", label: "Order" },
  { value: "POS", label: "POS" },
];

const getModuleBadgeVariant = (module: string) => {
  switch (module.toLowerCase()) {
    case "purchase":
      return "default";
    case "transfer":
      return "secondary";
    case "wastage":
      return "destructive";
    case "order":
      return "outline";
    default:
      return "secondary";
  }
};

interface Props {
  isDairy: boolean;
}

const StockLedgerPage = ({ isDairy }: Props) => {
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [inputValue, setInputValue] = useState("");
  const [depotId, setDepotId] = useState<string>("all");
  const [module, setModule] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [depots, setDepots] = useState<Depot[]>([]);
  const debounceRef = useRef<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const label = isDairy ? "Indraai" : "SNF";
  const isDairyParam = isDairy ? "true" : "false";

  // Fetch depots
  useEffect(() => {
    get("/depots").then((res: any) => {
      const list = Array.isArray(res) ? res : res?.data || [];
      setDepots(list);
    }).catch(() => {});
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setSearchTerm(inputValue);
      setPage(1);
    }, 400);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [inputValue]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["stock-ledger", page, searchTerm, depotId, module, dateFilter, isDairy],
    queryFn: async () => {
      let url = `/stock-ledgers?page=${page}&limit=${pageSize}&isDairy=${isDairyParam}`;
      if (depotId && depotId !== "all") url += `&depotId=${depotId}`;
      if (module && module !== "all") url += `&module=${module}`;
      if (dateFilter) url += `&date=${format(dateFilter, "yyyy-MM-dd")}`;
      return get(url);
    },
  });

  const entries: StockLedgerEntry[] = data?.data || [];
  const totalPages = data?.totalPages || 1;
  const totalRecords = data?.totalRecords || 0;

  const clearFilters = () => {
    setInputValue("");
    setSearchTerm("");
    setDepotId("all");
    setModule("all");
    setDateFilter(undefined);
    setPage(1);
  };

  const hasFilters = inputValue || depotId !== "all" || module !== "all" || dateFilter;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <BookOpen className="h-6 w-6 text-blue-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{label} Stock Ledger</h1>
            <p className="text-sm text-gray-500">
              All {label} stock movement transactions — received and issued
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="self-start sm:self-auto text-sm px-3 py-1">
          {totalRecords.toLocaleString()} entries
        </Badge>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium flex items-center gap-2 text-gray-700">
            <Filter className="h-4 w-4" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Search product or variant..."
                value={inputValue}
                onChange={handleInputChange}
              />
            </div>

            {/* Depot */}
            <Select value={depotId} onValueChange={(v) => { setDepotId(v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="All Depots" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Depots</SelectItem>
                {depots.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Module */}
            <Select value={module} onValueChange={(v) => { setModule(v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="All Modules" />
              </SelectTrigger>
              <SelectContent>
                {MODULE_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date */}
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("flex-1 justify-start", !dateFilter && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFilter ? format(dateFilter, "dd/MM/yyyy") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFilter} onSelect={(d) => { setDateFilter(d); setPage(1); }} />
                </PopoverContent>
              </Popover>
              {hasFilters && (
                <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear filters">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[140px]">Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead>Depot</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead className="text-right text-green-700">Received</TableHead>
                  <TableHead className="text-right text-red-700">Issued</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-red-500">
                      Failed to load stock ledger data.
                    </TableCell>
                  </TableRow>
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-14">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <BookOpen className="h-10 w-10" />
                        <p className="font-medium text-gray-600">No stock entries found</p>
                        <p className="text-sm">Try adjusting your filters</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry) => {
                    const net = entry.receivedQty - entry.issuedQty;
                    return (
                      <TableRow key={entry.id} className="hover:bg-gray-50">
                        <TableCell className="text-sm text-gray-600">
                          {format(new Date(entry.transactionDate), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell className="font-medium">{entry.product?.name || "-"}</TableCell>
                        <TableCell className="text-gray-600">{entry.variant?.name || "-"}</TableCell>
                        <TableCell className="text-gray-600">{entry.depot?.name || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={getModuleBadgeVariant(entry.module)} className="text-xs">
                            {entry.module}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.receivedQty > 0 ? (
                            <span className="flex items-center justify-end gap-1 text-green-700 font-medium">
                              <TrendingUp className="h-3.5 w-3.5" />
                              {entry.receivedQty}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.issuedQty > 0 ? (
                            <span className="flex items-center justify-end gap-1 text-red-600 font-medium">
                              <TrendingDown className="h-3.5 w-3.5" />
                              {entry.issuedQty}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={cn(
                              "font-semibold",
                              net > 0 ? "text-green-700" : net < 0 ? "text-red-600" : "text-gray-500"
                            )}
                          >
                            {net > 0 ? `+${net}` : net}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="px-4 py-3 border-t flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages} · {totalRecords.toLocaleString()} entries
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationPrevious
                    onClick={() => page > 1 && setPage(page - 1)}
                    className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                  <PaginationNext
                    onClick={() => page < totalPages && setPage(page + 1)}
                    className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StockLedgerPage;
