import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/apiService";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Boxes,
  TrendingDown,
  TrendingUp,
  PackageSearch,
  BookOpen,
  ArrowRight,
  AlertTriangle,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VariantStockEntry {
  id: number;
  closingQty: string;
  product: { id: number; name: string };
  variant: { id: number; name: string };
  depot: { id: number; name: string };
}

interface DepotStat {
  id: number;
  name: string;
  totalVariants: number;
  totalQty: number;
  lowStockCount: number;
}

interface Props {
  isDairy: boolean;
}

const LOW_STOCK_THRESHOLD = 10;

const StatCard = ({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  sub?: string;
}) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={cn("p-3 rounded-xl", color)}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const InventoryDashboard = ({ isDairy }: Props) => {
  const [depotStats, setDepotStats] = useState<DepotStat[]>([]);
  const label = isDairy ? "Indraai" : "SNF";
  const stockLedgerPath = isDairy ? "/admin/indraai-inventory/stock-ledger" : "/admin/snf-inventory/stock-ledger";
  const variantStockPath = isDairy ? `/admin/variantstock?isDairy=true` : `/admin/variantstock?isDairy=false`;
  const isDairyParam = isDairy ? "true" : "false";
  const accentColor = isDairy ? "bg-blue-100" : "bg-indigo-100";
  const accentIcon = isDairy ? "text-blue-700" : "text-indigo-700";

  // Fetch variant stocks filtered by product type
  const { data: stockData, isLoading: stockLoading } = useQuery({
    queryKey: ["inventory-all-stocks", isDairy],
    queryFn: () => get(`/variant-stocks?limit=1000&isDairy=${isDairyParam}`),
  });

  // Fetch ledger summary filtered by product type
  const { data: ledgerData, isLoading: ledgerLoading } = useQuery({
    queryKey: ["inventory-ledger-summary", isDairy],
    queryFn: () => get(`/stock-ledgers?limit=1000&isDairy=${isDairyParam}`),
  });

  const allStocks: VariantStockEntry[] = stockData?.data || [];
  const allLedger: Array<{ receivedQty: number; issuedQty: number; depot: { id: number; name: string } }> = ledgerData?.data || [];

  // Aggregate totals
  const totalVariantEntries = allStocks.length;
  const totalQtyOnHand = allStocks.reduce((sum, s) => sum + parseFloat(s.closingQty || "0"), 0);
  const totalLowStock = allStocks.filter((s) => parseFloat(s.closingQty || "0") < LOW_STOCK_THRESHOLD).length;
  const totalReceived = allLedger.reduce((sum, e) => sum + (e.receivedQty || 0), 0);
  const totalIssued = allLedger.reduce((sum, e) => sum + (e.issuedQty || 0), 0);

  // Build per-depot stats
  useEffect(() => {
    if (!allStocks.length) return;

    const depotMap = new Map<number, DepotStat>();
    for (const s of allStocks) {
      if (!s.depot) continue;
      const existing = depotMap.get(s.depot.id);
      const qty = parseFloat(s.closingQty || "0");
      if (existing) {
        existing.totalVariants += 1;
        existing.totalQty += qty;
        if (qty < LOW_STOCK_THRESHOLD) existing.lowStockCount += 1;
      } else {
        depotMap.set(s.depot.id, {
          id: s.depot.id,
          name: s.depot.name,
          totalVariants: 1,
          totalQty: qty,
          lowStockCount: qty < LOW_STOCK_THRESHOLD ? 1 : 0,
        });
      }
    }
    setDepotStats(Array.from(depotMap.values()).sort((a, b) => b.totalQty - a.totalQty));
  }, [allStocks]);

  const isLoading = stockLoading || ledgerLoading;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", accentColor)}>
            <Boxes className={cn("h-7 w-7", accentIcon)} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{label} Inventory Overview</h1>
            <p className="text-sm text-gray-500">Real-time stock health across all depots &amp; shops</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to={variantStockPath}>
            <Button variant="outline" size="sm" className="gap-2">
              <PackageSearch className="h-4 w-4" /> Variant Stock
            </Button>
          </Link>
          <Link to={stockLedgerPath}>
            <Button size="sm" className="gap-2">
              <BookOpen className="h-4 w-4" /> Stock Ledger
            </Button>
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatCard
              label="Total Variants Tracked"
              value={totalVariantEntries.toLocaleString()}
              icon={Boxes}
              color="bg-indigo-500"
              sub="product-variant-depot combinations"
            />
            <StatCard
              label="Total Qty On Hand"
              value={totalQtyOnHand.toLocaleString()}
              icon={PackageSearch}
              color="bg-blue-500"
              sub="closing stock units"
            />
            <StatCard
              label="Total Received (All Time)"
              value={totalReceived.toLocaleString()}
              icon={TrendingUp}
              color="bg-green-500"
              sub="from purchases &amp; transfers"
            />
            <StatCard
              label="Low Stock Items"
              value={totalLowStock.toLocaleString()}
              icon={AlertTriangle}
              color={totalLowStock > 0 ? "bg-amber-500" : "bg-gray-400"}
              sub={`below ${LOW_STOCK_THRESHOLD} units`}
            />
          </>
        )}
      </div>

      {/* Flow Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Received</p>
              <p className="text-2xl font-bold text-green-700">
                {isLoading ? <Skeleton className="h-8 w-20 inline-block" /> : totalReceived.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400">units received across all ledger entries</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-xl">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Issued</p>
              <p className="text-2xl font-bold text-red-700">
                {isLoading ? <Skeleton className="h-8 w-20 inline-block" /> : totalIssued.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400">units issued across all ledger entries</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-Depot Breakdown */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gray-500" /> Stock by Depot / Shop
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Depot / Shop</TableHead>
                  <TableHead className="text-right">Variants</TableHead>
                  <TableHead className="text-right">Total Qty</TableHead>
                  <TableHead className="text-right">Low Stock</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : depotStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                      <Boxes className="h-10 w-10 mx-auto mb-2" />
                      <p className="font-medium text-gray-600">No stock data available</p>
                      <p className="text-sm">Add purchases or transfers to see inventory here</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  depotStats.map((depot) => (
                    <TableRow key={depot.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{depot.name}</TableCell>
                      <TableCell className="text-right">{depot.totalVariants}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {depot.totalQty.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {depot.lowStockCount > 0 ? (
                          <span className="flex items-center justify-end gap-1 text-amber-600 font-medium">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {depot.lowStockCount}
                          </span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {depot.lowStockCount > 0 ? (
                          <Badge variant="outline" className="border-amber-400 text-amber-700 bg-amber-50">
                            Attention
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-green-400 text-green-700 bg-green-50">
                            Healthy
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link to={`/admin/variantstock?depotId=${depot.id}`}>
                          <Button variant="ghost" size="sm" className="gap-1 text-xs">
                            View Stock <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Purchases", desc: "Record incoming stock from farmers", href: `/admin/purchases?isDairy=${isDairy}`, color: "text-blue-600 bg-blue-50 border-blue-200" },
          { label: "Wastage", desc: "Log damaged or expired stock", href: `/admin/wastages?isDairy=${isDairy}`, color: "text-red-600 bg-red-50 border-red-200" },
          { label: "Transfers", desc: "Move stock between depots", href: `/admin/transfers?isDairy=${isDairy}`, color: "text-purple-600 bg-purple-50 border-purple-200" },
        ].map((item) => (
          <Link key={item.href} to={item.href}>
            <Card className={cn("border hover:shadow-md transition-shadow cursor-pointer", item.color)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{item.label}</p>
                  <p className="text-xs opacity-70 mt-0.5">{item.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 opacity-60 flex-shrink-0" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default InventoryDashboard;
