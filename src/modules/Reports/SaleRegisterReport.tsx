import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { format } from "date-fns";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { backendUrl } from "@/config";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { getAreaMastersByPincode } from "@/services/areaMasterService";

const API_URL = backendUrl;

type SaleRegisterFilters = {
  startDate: string;
  endDate: string;
};

type SaleRegisterRow = {
  name: string;
  customerId: string | number;
  saleAmount: number;
  refundAmount: number;
  netAmount: number;
  address: string;
  pincode: string | number;
  mobile: string;
  depot: string;
  variant: string;
  subscriptionStartDate: string;
};

function extractPincodeFromText(value: unknown): string {
  if (!value) return "";
  const text = String(value);
  const match = text.match(/\b\d{6}\b/);
  return match?.[0] || "";
}

function toSaleRegisterRow(raw: any): SaleRegisterRow {
  const name =
    raw?.name ??
    raw?.memberName ??
    raw?.customerName ??
    raw?.member?.name ??
    raw?.customer?.name ??
    "";

  const customerId =
    raw?.customerId ?? raw?.memberId ?? raw?.customer?.id ?? raw?.member?.id ?? raw?.id ?? "";

  const saleAmountRaw =
    raw?.receivedamt ?? raw?.saleAmount ?? raw?.amount ?? raw?.totalAmount ?? raw?.sale ?? 0;
  const saleAmount = Number(saleAmountRaw) || 0;

  const refundAmount = Number(raw?.refundAmount ?? raw?.refund ?? 0) || 0;
  const netAmount = Number(raw?.netAmount ?? raw?.net ?? saleAmount - refundAmount) || 0;

  const address =
    raw?.address ??
    raw?.fullAddress ??
    raw?.deliveryAddress?.fullAddress ??
    (typeof raw?.deliveryAddress === "string" ? raw.deliveryAddress : "") ??
    raw?.customer?.address ??
    "";

  const pincode = raw?.pincode ?? raw?.pinCode ?? raw?.deliveryAddress?.pincode ?? "";

  const variant =
    raw?.variant ??
    raw?.variantName ??
    raw?.DepotProductVariant?.name ??
    raw?.subscription?.variantName ??
    "";

  const mobile =
    raw?.mobile ??
    raw?.phone ??
    raw?.memberMobile ??
    raw?.customerMobile ??
    raw?.deliveryAddress?.mobile ??
    "";

  const depot = raw?.depot ?? raw?.depotName ?? raw?.depot?.name ?? "";

  const normalizedAddress = String(address || "");
  const finalPincode =
    pincode ||
    extractPincodeFromText(raw?.deliveryAddress?.fullAddress) ||
    extractPincodeFromText(normalizedAddress);

  const finalDepot =
    depot ||
    raw?.depotMaster?.name ||
    raw?.depotDetails?.name ||
    raw?.Depot?.name ||
    "";

  const startDateRaw =
    raw?.subscriptionStartDate ?? raw?.startDate ?? raw?.subscription?.startDate ?? raw?.createdAt ?? "";

  const subscriptionStartDate = startDateRaw
    ? (() => {
        const d = new Date(startDateRaw);
        return Number.isNaN(d.getTime()) ? String(startDateRaw) : format(d, "dd/MM/yyyy");
      })()
    : "";

  return {
    name: String(name || ""),
    customerId,
    saleAmount,
    refundAmount,
    netAmount,
    address: String(address || ""),
    pincode: finalPincode,
    mobile: String(mobile || ""),
    depot: String(finalDepot || ""),
    variant: String(variant || ""),
    subscriptionStartDate,
  };
}

export default function SaleRegisterReport() {
  const { isAdmin } = useRoleAccess();

  const [filters, setFilters] = useState<SaleRegisterFilters>({
    startDate: format(new Date(new Date().setDate(new Date().getDate() - 30)), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
  });

  const [nameSearch, setNameSearch] = useState<string>("");

  const { data, isFetching, refetch, error } = useQuery<{ success?: boolean; data?: any }>(
    {
      queryKey: ["saleRegisterReport", filters, nameSearch],
      queryFn: async () => {
        const token = localStorage.getItem("authToken") || localStorage.getItem("token");
        const params = new URLSearchParams();
        params.append("startDate", filters.startDate);
        params.append("endDate", filters.endDate);
        params.append("paymentStatus", "PAID");
        params.append("page", "1");
        params.append("limit", "1000");

        const term = String(nameSearch || "").trim();
        if (term) params.append("name", term);

        const response = await axios.get(`${API_URL}/api/reports/sale-register?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        return response.data;
      },
      enabled: isAdmin,
    }
  );

  const rows: SaleRegisterRow[] = useMemo(() => {
    if (!data) return [];

    const payload = (data as any)?.data ?? data;
    const rawRows = Array.isArray(payload) ? payload : Array.isArray(payload?.rows) ? payload.rows : [];
    return rawRows.map(toSaleRegisterRow);
  }, [data]);

  const pincodesNeedingDepot = useMemo(() => {
    const pins = new Set<string>();
    rows.forEach((r) => {
      const pin = String(r.pincode || "").trim();
      if (!/^\d{6}$/.test(pin)) return;
      if (r.depot && String(r.depot).trim()) return;
      pins.add(pin);
    });
    return Array.from(pins).sort();
  }, [rows]);

  const { data: depotByPincode } = useQuery<Record<string, string>>({
    queryKey: ["saleRegisterDepotByPincode", pincodesNeedingDepot],
    queryFn: async () => {
      const entries = await Promise.all(
        pincodesNeedingDepot.map(async (pincode) => {
          try {
            const areas = await getAreaMastersByPincode(pincode);
            const areaWithDepot = areas.find((a) => a.depot && a.depot.name);
            return [pincode, areaWithDepot?.depot?.name || ""] as const;
          } catch {
            return [pincode, ""] as const;
          }
        })
      );
      return Object.fromEntries(entries);
    },
    enabled: isAdmin && pincodesNeedingDepot.length > 0,
  });

  const resolvedRows = useMemo(() => {
    if (!depotByPincode) return rows;
    return rows.map((r) => {
      if (r.depot && String(r.depot).trim()) return r;
      const pin = String(r.pincode || "").trim();
      const depotName = depotByPincode[pin];
      return depotName ? { ...r, depot: depotName } : r;
    });
  }, [rows, depotByPincode]);

  const totalSaleAmount = useMemo(
    () => resolvedRows.reduce((sum, r) => sum + (Number(r.saleAmount) || 0), 0),
    [resolvedRows]
  );

  const totalRefundAmount = useMemo(
    () => resolvedRows.reduce((sum, r) => sum + (Number(r.refundAmount) || 0), 0),
    [resolvedRows]
  );

  const totalNetAmount = useMemo(
    () => resolvedRows.reduce((sum, r) => sum + (Number(r.netAmount) || 0), 0),
    [resolvedRows]
  );

  const handleExportToExcel = () => {
    if (!resolvedRows || resolvedRows.length === 0) {
      toast.error("No data to export");
      return;
    }

    const formattedData = resolvedRows.map((r) => ({
      "Name": r.name,
      "Customer ID": r.customerId,
      "Sale Amount": Number(r.saleAmount) || 0,
      "Refund Amount": Number(r.refundAmount) || 0,
      "Net Amount": Number(r.netAmount) || 0,
      "Address": r.address,
      "Pincode": r.pincode,
      "Mobile": r.mobile,
      "Depot": r.depot,
      "Variant": r.variant,
      "Milk Subscription Start Date": r.subscriptionStartDate,
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sale Register");

    worksheet["!cols"] = [
      { wch: 22 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 40 },
      { wch: 10 },
      { wch: 14 },
      { wch: 18 },
      { wch: 20 },
      { wch: 24 },
    ];

    XLSX.writeFile(workbook, `Sale_Register_${filters.startDate}_to_${filters.endDate}.xlsx`);
    toast.success("Excel downloaded");
  };

  if (!isAdmin) {
    return (
      <Card className="m-4">
        <CardContent className="pt-6">
          <p className="text-center text-gray-600">You don't have permission to view this report.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center gap-4">
            <div>
              <CardTitle>Sale Register</CardTitle>
              <CardDescription>
                Date-wise sale register listing with export
              </CardDescription>
            </div>
            <Button onClick={handleExportToExcel} disabled={!rows || rows.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Download Excel
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nameSearch">Search Name</Label>
              <Input
                id="nameSearch"
                type="text"
                value={nameSearch}
                placeholder="Search by name"
                onChange={(e) => setNameSearch(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">From Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">To Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
              />
            </div>

            <div className="flex items-end">
              <Button onClick={() => refetch()} className="w-full" disabled={isFetching}>
                Apply Filter
              </Button>
            </div>
          </div>

          {error ? (
            <div className="text-sm text-red-600">
              Failed to load report: {(error as any)?.message || "Unknown error"}
            </div>
          ) : null}

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Customer ID</TableHead>
                  <TableHead className="text-right">Sale Amount</TableHead>
                  <TableHead className="text-right">Refund</TableHead>
                  <TableHead className="text-right">Net Amount</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Pincode</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Depot</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead>Milk Subscription start date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isFetching ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                      No data found for selected dates
                    </TableCell>
                  </TableRow>
                ) : (
                  resolvedRows.map((r, idx) => (
                    <TableRow key={`${r.customerId}-${idx}`} className="hover:bg-gray-50">
                      <TableCell>{r.name || "-"}</TableCell>
                      <TableCell>{r.customerId || "-"}</TableCell>
                      <TableCell className="text-right font-medium">
                        ₹{(Number(r.saleAmount) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ₹{(Number(r.refundAmount) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ₹{(Number(r.netAmount) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="max-w-[360px] whitespace-normal break-words" title={r.address}>
                        {r.address || "-"}
                      </TableCell>
                      <TableCell>{r.pincode || "-"}</TableCell>
                      <TableCell>{r.mobile || "-"}</TableCell>
                      <TableCell>{r.depot || "-"}</TableCell>
                      <TableCell>{r.variant || "-"}</TableCell>
                      <TableCell>{r.subscriptionStartDate || "-"}</TableCell>
                    </TableRow>
                  ))
                )}

                {!isFetching && resolvedRows.length > 0 ? (
                  <TableRow className="bg-gray-50 font-semibold">
                    <TableCell colSpan={2}>Total</TableCell>
                    <TableCell className="text-right">
                      ₹{totalSaleAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{totalRefundAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{totalNetAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell colSpan={6} />
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
