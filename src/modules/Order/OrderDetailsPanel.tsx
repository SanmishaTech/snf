import React, { useMemo } from "react";
import { format } from "date-fns";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, ShoppingCart } from "lucide-react";
import { formatCurrency } from "@/lib/formatter";

function useMediaQuery(query: string) {
  const getMatches = (q: string) => {
    if (typeof window !== "undefined") {
      return window.matchMedia(q).matches;
    }
    return false;
  };
  const [matches, setMatches] = React.useState(getMatches(query));

  React.useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    try {
      mediaQueryList.addEventListener("change", listener);
    } catch {
      // Safari
      mediaQueryList.addListener(listener as any);
    }
    setMatches(mediaQueryList.matches);
    return () => {
      try {
        mediaQueryList.removeEventListener("change", listener);
      } catch {
        mediaQueryList.removeListener(listener as any);
      }
    };
  }, [query]);

  return matches;
}

export interface OrderItem {
  id: string | number;
  productId: string | number;
  productName: string;
  price?: number;
  priceAtPurchase?: number;
  quantity: number;
  deliveredQuantity?: number | null;
  receivedQuantity?: number | null;
  supervisorQuantity?: number | null;
  unit?: string;
  depotVariantId?: string | number;
  depotVariantName?: string; // some APIs
  depotVariant?: { id?: number | string; name?: string } | null; // other APIs
  agencyName?: string;
  depotName?: string;
  agency?: { id: number | string; name?: string } | null;
  depot?: { id: number | string; name?: string; city?: string } | null;
  depotCityName?: string;
}

export interface OrderDetailsPanelProps {
  order: {
    id: string;
    poNumber: string;
    orderDate: string | Date;
    deliveryDate: string | Date;
    contactPersonName?: string;
    vendor: { id: string; name: string };
    status: "PENDING" | "DELIVERED" | "RECEIVED";
    items: OrderItem[];
    totalAmount: number;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "PENDING":
      return "bg-yellow-500";
    case "DELIVERED":
      return "bg-secondary";
    case "RECEIVED":
      return "bg-primary";
    default:
      return "bg-gray-500";
  }
}

function OrderDetailsContent({ order }: { order: OrderDetailsPanelProps["order"] }) {
  // Debug: let's see the actual structure
  console.log("[DEBUG] Full order object:", JSON.stringify(order, null, 2));
  console.log("[DEBUG] First item:", JSON.stringify(order.items[0], null, 2));
  
  const groupedByVariant = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; amount: number }>();
    for (const it of order.items) {
      const variantName = it.depotVariantName || it.depotVariant?.name || (it as any).variantName || (it as any).variant || "Unknown";
      const price = typeof it.priceAtPurchase === 'number' ? it.priceAtPurchase : (it.price ?? 0);
      const key = variantName || "Unknown";
      const prev = map.get(key) || { name: key, qty: 0, amount: 0 };
      prev.qty += it.quantity ?? 0;
      prev.amount += (it.quantity ?? 0) * price;
      map.set(key, prev);
    }
    return Array.from(map.values());
  }, [order.items]);

  const vendorsBreakdown = useMemo(() => {
    // If items can belong to different agencies/depots, show per-depot summary
    const map = new Map<string, { label: string; qty: number; amount: number }>();
    for (const it of order.items) {
      const label = it.depotName || it.depot?.name || it.agencyName || it.agency?.name || it.depotCityName || "-";
      const price = typeof it.priceAtPurchase === 'number' ? it.priceAtPurchase : (it.price ?? 0);
      const prev = map.get(label) || { label, qty: 0, amount: 0 };
      prev.qty += it.quantity ?? 0;
      prev.amount += (it.quantity ?? 0) * price;
      map.set(label, prev);
    }
    return Array.from(map.values());
  }, [order.items]);

  const totalQty = order.items.reduce((s, it) => s + (it.quantity ?? 0), 0);

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">PO Number</div>
          <div className="text-lg font-semibold">{order.poNumber}</div>
        </div>
        <Badge className={cn("text-white", getStatusBadgeClass(order.status))}>{order.status}</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-secondary"/> Order</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div><span className="text-muted-foreground">Vendor:</span> {order.vendor?.name}</div>
            <div><span className="text-muted-foreground">Order Date:</span> {format(new Date(order.orderDate), "dd/MM/yyyy")}</div>
            <div><span className="text-muted-foreground">Delivery Date:</span> {format(new Date(order.deliveryDate), "dd/MM/yyyy")}</div>
            {order.contactPersonName && (
              <div><span className="text-muted-foreground">Contact:</span> {order.contactPersonName}</div>
            )}
            <div><span className="text-muted-foreground">Items:</span> {totalQty}</div>
            <div className="font-medium"><span className="text-muted-foreground">Total:</span> {formatCurrency(order.totalAmount)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Variant-wise Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {groupedByVariant.map((v) => (
                <div key={v.name} className="flex items-center justify-between text-sm">
                  <div className="truncate max-w-[60%]">{v.name}</div>
                  <div className="text-muted-foreground">x{v.qty}</div>
                  <div className="font-medium">{formatCurrency(v.amount)}</div>
                </div>
              ))}
              {groupedByVariant.length === 0 && (
                <div className="text-sm text-muted-foreground">No items</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Vendor/Depot Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {vendorsBreakdown.map((b) => (
              <div key={b.label} className="flex items-center justify-between text-sm">
                <div className="truncate max-w-[60%]">{b.label}</div>
                <div className="text-muted-foreground">x{b.qty}</div>
                <div className="font-medium">{formatCurrency(b.amount)}</div>
              </div>
            ))}
            {vendorsBreakdown.length === 0 && (
              <div className="text-sm text-muted-foreground">No items</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Package className="h-4 w-4"/> Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {order.items.map((it) => (
              <div key={it.id} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="font-medium truncate">{it.productName} {(it.depotVariantName || it.depotVariant?.name) && `(${it.depotVariantName || it.depotVariant?.name})`}</div>
                  <div className="text-muted-foreground truncate">{it.depotName || it.depot?.name || it.agencyName || it.agency?.name || it.depotCityName || '-'}</div>
                </div>
                <div className="text-right">
                  <div>x{it.quantity}</div>
                  <div className="font-medium">{formatCurrency((it.quantity ?? 0) * (typeof it.priceAtPurchase === 'number' ? it.priceAtPurchase : (it.price ?? 0)))}</div>
                </div>
              </div>
            ))}
            {order.items.length === 0 && (
              <div className="text-sm text-muted-foreground">No items</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OrderDetailsPanel({ order, open, onOpenChange, onClose }: OrderDetailsPanelProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0">
          <SheetHeader className="px-4 pt-4">
            <SheetTitle>Order Details</SheetTitle>
            <SheetDescription>Comprehensive view of this vendor order.</SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-80px)]">
            <OrderDetailsContent order={order} />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="p-0 h-[90vh] flex flex-col">
        <DrawerHeader className="px-4 pt-4">
          <DrawerTitle>Order Details</DrawerTitle>
          <DrawerDescription>Everything about this order.</DrawerDescription>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto">
          <OrderDetailsContent order={order} />
        </div>
        <div className="p-4 border-t flex justify-end">
          <Button onClick={onClose} variant="outline">Close</Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

