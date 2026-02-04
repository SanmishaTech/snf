import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { format } from "date-fns";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

import { backendUrl } from "@/config";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { ExcelExporter } from "./utils/excelExport";
import { ExcelExportConfig, ExceptionReportFilters, ExceptionReportResponse, ExceptionReportRow } from "./types";

const API_URL = backendUrl;

function formatDisplayDate(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return format(d, "dd MMM yyyy");
}

export default function ExceptionReport() {
  const { isAdmin } = useRoleAccess();

  const [filters, setFilters] = useState<ExceptionReportFilters>({
    startDate: format(new Date(new Date().setDate(new Date().getDate() - 30)), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
  });

  const { data, isFetching, error, refetch } = useQuery<ExceptionReportResponse>({
    queryKey: ["exceptionReport", filters],
    queryFn: async () => {
      const token = localStorage.getItem("authToken") || localStorage.getItem("token");
      const params = new URLSearchParams();
      params.set("startDate", filters.startDate);
      params.set("endDate", filters.endDate);

      const response = await axios.get(`${API_URL}/api/reports/exceptions?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    },
    enabled: isAdmin,
  });

  const rows = useMemo<ExceptionReportRow[]>(() => data?.data?.report || [], [data]);

  const handleExportToExcel = () => {
    if (!rows.length) {
      toast.error("No data to export");
      return;
    }

    const exporter = new ExcelExporter();

    const exportConfig: ExcelExportConfig = {
      fileName: "Exception_Report",
      sheetName: "Exceptions",
      headers: [
        { key: "date", label: "Date", width: 12 },
        { key: "customerId", label: "Customer ID", width: 12 },
        { key: "address", label: "Address", width: 35 },
        { key: "pincode", label: "Pincode", width: 10 },
        { key: "depotName", label: "Depot Name", width: 20 },
        { key: "subFromDate", label: "Sub From date", width: 14 },
        { key: "subToDate", label: "Sub To Date", width: 14 },
        { key: "mobileNumber", label: "Mobile Number", width: 14 },
        { key: "lastVariant", label: "Last Varient", width: 25 },
        { key: "newVariant", label: "New Varient", width: 25 },
      ],
      includeTitle: false,
    };

    exporter.exportToExcel({
      data: rows as any,
      config: exportConfig,
    });

    toast.success("Report exported successfully");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Exception Report</CardTitle>
          <CardDescription>Subscription variant exceptions by date range</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters((prev: ExceptionReportFilters) => ({ ...prev, startDate: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters((prev: ExceptionReportFilters) => ({ ...prev, endDate: e.target.value }))
                }
              />
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={() => refetch()} disabled={!isAdmin || isFetching}>
                Refresh
              </Button>
              <Button onClick={handleExportToExcel} disabled={!rows.length} className="gap-2">
                <Download className="h-4 w-4" />
                Export to Excel
              </Button>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer ID</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Pincode</TableHead>
                  <TableHead>Depot Name</TableHead>
                  <TableHead>Sub From date</TableHead>
                  <TableHead>Sub To Date</TableHead>
                  <TableHead>Mobile Number</TableHead>
                  <TableHead>Last Varient</TableHead>
                  <TableHead>New Varient</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isFetching ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-red-600">
                      {(error as any)?.message || "Failed to load report"}
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                      No data found for selected dates
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r, idx) => (
                    <TableRow key={`${r.customerId}-${r.date}-${idx}`} className="hover:bg-gray-50">
                      <TableCell>{formatDisplayDate(r.date) || "-"}</TableCell>
                      <TableCell>{r.customerId || "-"}</TableCell>
                      <TableCell className="max-w-[360px] whitespace-normal break-words" title={r.address || ""}>
                        {r.address || "-"}
                      </TableCell>
                      <TableCell>{r.pincode || "-"}</TableCell>
                      <TableCell>{r.depotName || "-"}</TableCell>
                      <TableCell>{formatDisplayDate(r.subFromDate) || "-"}</TableCell>
                      <TableCell>{formatDisplayDate(r.subToDate) || "-"}</TableCell>
                      <TableCell>{r.mobileNumber || "-"}</TableCell>
                      <TableCell>{r.lastVariant || "-"}</TableCell>
                      <TableCell>{r.newVariant || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
