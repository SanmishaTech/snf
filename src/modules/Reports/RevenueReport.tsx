import { useMemo } from "react";
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
};

function formatDate(value: unknown): string {
  if (!value) return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return format(d, "dd/MM/yyyy");
}

export default function RevenueReport() {
  const { isAdmin } = useRoleAccess();

  const { data, isFetching, error, refetch } = useQuery<RevenueReportResponse>({
    queryKey: ["revenueReport"],
    queryFn: async () => {
      const token = localStorage.getItem("authToken") || localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/api/reports/revenue`, {
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
        Mobile: r.mobile,
        "Current Varient": r.currentVariant,
        "Milk Subscription Start Date": formatDate(r.milkSubscriptionStartDate),
        Address: r.address,
        Pincode: r.pincode,
        Depot: r.depot
      }))
    );
    XLSX.utils.book_append_sheet(workbook, worksheet, "Revenue");
    XLSX.writeFile(workbook, `Revenue_Report_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
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
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
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
        <CardContent className="space-y-4">
          {error ? (
            <div className="text-sm text-red-600">{(error as any)?.message || "Failed to load report"}</div>
          ) : null}

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Member ID</TableHead>
                  <TableHead className="text-right">Sale Amount</TableHead>
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
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
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
