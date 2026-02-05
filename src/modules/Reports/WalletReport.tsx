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

const API_URL = backendUrl;

type WalletReportRow = {
  name: string;
  memberId: number | string;
  mobile: string;
  address: string;
  pincode: string;
  closingBalance: number;
};

type WalletReportResponse = {
  success: boolean;
  data: {
    report: WalletReportRow[];
    totals?: {
      totalClosingBalance?: number;
    };
    filters?: {
      endDate?: string | null;
    };
    recordCount: number;
  };
};

export default function WalletReport() {
  const { isAdmin } = useRoleAccess();

  const [endDate, setEndDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  const { data, isFetching, error, refetch } = useQuery<WalletReportResponse>({
    queryKey: ["walletReport", endDate],
    queryFn: async () => {
      const token = localStorage.getItem("authToken") || localStorage.getItem("token");
      const params = new URLSearchParams();
      if (endDate) params.append("endDate", endDate);
      const response = await axios.get(`${API_URL}/api/reports/wallet?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    },
    enabled: isAdmin,
  });

  const rows = useMemo<WalletReportRow[]>(() => {
    const report = data?.data?.report || [];
    return [...report].sort((a, b) => (Number(b.closingBalance) || 0) - (Number(a.closingBalance) || 0));
  }, [data]);

  const totalClosingBalance = useMemo(() => {
    const apiTotal = data?.data?.totals?.totalClosingBalance;
    if (typeof apiTotal === "number") return apiTotal;
    return rows.reduce((sum, r) => sum + (Number(r.closingBalance) || 0), 0);
  }, [data, rows]);

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
        mobile: "",
        address: "",
        pincode: "",
        closingBalance: totalClosingBalance,
      } satisfies WalletReportRow,
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(
      exportRows.map((r) => ({
        Name: r.name,
        "Member ID": r.memberId,
        Mobile: r.mobile,
        Address: r.address,
        Pincode: r.pincode,
        "Closing Balance": Number(r.closingBalance || 0),
      }))
    );

    XLSX.utils.book_append_sheet(workbook, worksheet, "Wallet");
    XLSX.writeFile(workbook, `Wallet_Report_As_Of_${endDate || format(new Date(), "yyyy-MM-dd")}.xlsx`);
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
              <CardTitle className="text-2xl font-bold">Wallet Report</CardTitle>
              <CardDescription>Member wallet closing balance as of selected date</CardDescription>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="endDate">As Of Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {error ? (
            <div className="text-sm text-red-600">{(error as any)?.message || "Failed to load report"}</div>
          ) : null}

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Member ID</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Pincode</TableHead>
                  <TableHead className="text-right">Closing Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isFetching ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No data found
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {rows.map((r, idx) => (
                      <TableRow key={`${r.memberId}-${idx}`} className="hover:bg-gray-50">
                        <TableCell>{r.name || "-"}</TableCell>
                        <TableCell>{r.memberId || "-"}</TableCell>
                        <TableCell>{r.mobile || "-"}</TableCell>
                        <TableCell className="max-w-[360px] whitespace-normal break-words" title={r.address || ""}>
                          {r.address || "-"}
                        </TableCell>
                        <TableCell>{r.pincode || "-"}</TableCell>
                        <TableCell className="text-right">
                          ₹{Number(r.closingBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell className="font-bold">TOTAL</TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell />
                      <TableCell />
                      <TableCell className="text-right font-bold">
                        ₹{Number(totalClosingBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </TableCell>
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
