import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { format } from "date-fns";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { backendUrl } from "@/config";
import { useRoleAccess } from "@/hooks/useRoleAccess";

const API_URL = backendUrl;

type RevenueReportRow = {
  name: string;
  memberId: number | string;
  saleAmount: number;
  refundAmount?: number;
  netAmount?: number;
  mobile: string;
  currentVariant: string;
  milkSubscriptionStartDate: string | null;
  address: string;
  pincode: string;
  depot: string;
};

type RevenueReportResponse = {
  success: boolean;
  data: {
    report: RevenueReportRow[];
    recordCount: number;
  };
  filters?: {
    startDate?: string | null;
    endDate?: string | null;
    name?: string | null;
  };
};

function formatDate(value: unknown): string {
  if (!value) return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return format(d, "dd/MM/yyyy");
}

export default function RevenueReport() {
  const { isAdmin } = useRoleAccess();

  const [startDate, setStartDate] = useState<string>(format(new Date(new Date().setDate(new Date().getDate() - 30)), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [nameSearch, setNameSearch] = useState<string>("");

  const { data, isFetching, error, refetch } = useQuery<RevenueReportResponse>({
    queryKey: ["revenueReport", startDate, endDate, nameSearch],
    queryFn: async () => {
      const token = localStorage.getItem("authToken") || localStorage.getItem("token");
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const term = String(nameSearch || "").trim();
      if (term) params.set('name', term);

      const response = await axios.get(`${API_URL}/api/reports/revenue?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    },
    enabled: isAdmin
  });

  const rows = useMemo<RevenueReportRow[]>(() => {
    const report = data?.data?.report || [];
    return [...report].sort((a, b) => (Number(b.saleAmount) || 0) - (Number(a.saleAmount) || 0));
  }, [data]);

  const totalSaleAmount = useMemo(() => {
    return rows.reduce((sum, r) => sum + (Number(r.saleAmount) || 0), 0);
  }, [rows]);

  const totalRefundAmount = useMemo(() => {
    return rows.reduce((sum, r) => sum + (Number(r.refundAmount) || 0), 0);
  }, [rows]);

  const totalNetAmount = useMemo(() => {
    return rows.reduce((sum, r) => sum + (Number(r.netAmount) || 0), 0);
  }, [rows]);

  const handleExportToExcel = () => {
    if (!rows.length) {
      toast.error("No data to export");
      return;
    }

    const exportRows = [
      ...rows,
      {
        name: "TOTAL",
        memberId: "",
        saleAmount: totalSaleAmount,
        refundAmount: totalRefundAmount,
        netAmount: totalNetAmount,
        mobile: "",
        currentVariant: "",
        milkSubscriptionStartDate: null,
        address: "",
        pincode: "",
        depot: "",
      } satisfies RevenueReportRow,
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(
      exportRows.map((r) => ({
        Name: r.name,
        "Member ID": r.memberId,
        "Sale Amount": Number(r.saleAmount || 0),
        "Refund Amount": Number(r.refundAmount || 0),
        "Net Amount": Number(r.netAmount || 0),
        Mobile: r.mobile,
        "Current Varient": r.currentVariant,
        "Milk Subscription Start Date": formatDate(r.milkSubscriptionStartDate),
        Address: r.address,
        Pincode: r.pincode,
        Depot: r.depot
      }))
    );
    XLSX.utils.book_append_sheet(workbook, worksheet, "Revenue");
    const safeName = String(nameSearch || "").trim().replace(/\s+/g, "_");
    const namePart = safeName ? `_Search_${safeName}` : "";
    XLSX.writeFile(workbook, `Revenue_Report_${startDate || "ALL"}_to_${endDate || "ALL"}${namePart}.xlsx`);
    toast.success("Report exported successfully");
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
    <div className="h-[calc(100vh-6rem)] w-full max-w-full p-4 flex flex-col gap-4">
      <Card className="flex flex-col flex-1 overflow-hidden">
        <CardHeader className="flex-none pb-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-2xl font-bold">Revenue Report</CardTitle>
              <CardDescription>Customer-wise total sale amount (till now)</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
                Refresh
              </Button>
              <Button onClick={handleExportToExcel} disabled={!rows.length} className="gap-2">
                <Download className="h-4 w-4" />
                Export to Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col flex-1 overflow-hidden gap-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-none">
            <div className="space-y-2">
              <div className="text-sm font-medium">Search Name</div>
              <input
                type="text"
                value={nameSearch}
                onChange={(e) => setNameSearch(e.target.value)}
                placeholder="Search by name"
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">From Date</div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">To Date</div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
                Apply
              </Button>
            </div>
          </div>

          {error ? (
            <div className="text-sm text-red-600 flex-none">{(error as any)?.message || "Failed to load report"}</div>
          ) : null}

          <div className="border rounded-lg overflow-hidden flex-1 flex flex-col min-h-0">
            <Table containerClassName="flex-1 overflow-auto relative h-full">
              <TableHeader className="sticky top-0 z-10 bg-card shadow-sm">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Member ID</TableHead>
                  <TableHead className="text-right">Sale Amount</TableHead>
                  <TableHead className="text-right">Refund</TableHead>
                  <TableHead className="text-right">Net Amount</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Current Varient</TableHead>
                  <TableHead>Milk Subscription Start Date</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Pincode</TableHead>
                  <TableHead>Depot</TableHead>
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
                      No data found
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {rows.map((r, idx) => (
                      <TableRow key={`${r.memberId}-${idx}`} className="hover:bg-gray-50">
                        <TableCell>{r.name || "-"}</TableCell>
                        <TableCell>{r.memberId || "-"}</TableCell>
                        <TableCell className="text-right">
                          ₹{Number(r.saleAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{Number(r.refundAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{Number(r.netAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>{r.mobile || "-"}</TableCell>
                        <TableCell>{r.currentVariant || "-"}</TableCell>
                        <TableCell>{formatDate(r.milkSubscriptionStartDate) || "-"}</TableCell>
                        <TableCell className="max-w-[360px] whitespace-normal break-words" title={r.address || ""}>
                          {r.address || "-"}
                        </TableCell>
                        <TableCell>{r.pincode || "-"}</TableCell>
                        <TableCell>{r.depot || "-"}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell className="font-bold">TOTAL</TableCell>
                      <TableCell />
                      <TableCell className="text-right font-bold">
                        ₹{Number(totalSaleAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        ₹{Number(totalRefundAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        ₹{Number(totalNetAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell />
                      <TableCell />
                      <TableCell />
                      <TableCell />
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
