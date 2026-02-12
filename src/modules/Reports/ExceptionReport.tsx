import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { format } from "date-fns";
import * as XLSX from "xlsx";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

import { backendUrl } from "@/config";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { ExceptionReportFilters, ExceptionReportResponse, ExceptionReportRow } from "./types";

const API_URL = backendUrl;

function formatDisplayDate(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return format(d, "dd MMM yyyy");
}

export default function ExceptionReport() {
  const { isAdmin } = useRoleAccess();

  const [filters, setFilters] = useState<ExceptionReportFilters>({});

  const { data, isFetching, error, refetch } = useQuery<ExceptionReportResponse>({
    queryKey: ["exceptionReport", filters],
    queryFn: async () => {
      const token = localStorage.getItem("authToken") || localStorage.getItem("token");
      const params = new URLSearchParams();

      if (filters.startDate) {
        params.set("startDate", filters.startDate);
      }
      if (filters.endDate) {
        params.set("endDate", filters.endDate);
      }
      if (filters.name && String(filters.name).trim()) {
        params.set("name", String(filters.name).trim());
      }

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

    const workbook = XLSX.utils.book_new();

    const worksheet = XLSX.utils.json_to_sheet(
      rows.map((r) => ({
        "Exception Type": r.exceptionType || "",
        "Date": formatDisplayDate(r.date),
        "Customer ID": r.customerId,
        "Customer Unique Id": r.customerUniqueId || "",
        "Customer Name": r.customerName || "",
        "Mobile Number": r.mobileNumber,
        "Address": r.address,
        "Pincode": r.pincode,
        "Depot Name": r.depotName,
        "Sub From date": formatDisplayDate(r.subFromDate),
        "Sub To Date": formatDisplayDate(r.subToDate),
        "Last Varient": r.lastVariant,
        "New Varient": r.newVariant,
      }))
    );
    XLSX.utils.book_append_sheet(workbook, worksheet, "Exceptions");

    const safeStart = filters.startDate || "ALL";
    const safeEnd = filters.endDate || "ALL";
    const safeName = (filters.name && String(filters.name).trim()) ? `_NAME_${String(filters.name).trim().replace(/\s+/g, '_')}` : '';
    XLSX.writeFile(workbook, `Exception_Report_${safeStart}_to_${safeEnd}${safeName}.xlsx`);
    toast.success("Report exported successfully");
  };

  return (
    <div className="h-[calc(100vh-6rem)] w-full max-w-full p-4 flex flex-col gap-4">
      <Card className="flex flex-col flex-1 overflow-hidden">
        <CardHeader className="flex-none pb-4">
          <CardTitle className="text-2xl font-bold">Exception Report</CardTitle>
          <CardDescription>Stopped subscriptions, new customers, and subscription variant changes by date range</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col flex-1 overflow-hidden gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-none">
            <div className="space-y-2">
              <Label htmlFor="nameSearch">Search Name</Label>
              <Input
                id="nameSearch"
                type="text"
                value={filters.name || ""}
                placeholder="Search by name"
                onChange={(e) =>
                  setFilters((prev: ExceptionReportFilters) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate || ""}
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
                value={filters.endDate || ""}
                onChange={(e) =>
                  setFilters((prev: ExceptionReportFilters) => ({ ...prev, endDate: e.target.value }))
                }
              />
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={() => refetch()} disabled={!isAdmin || isFetching}>
                Refresh
              </Button>
              <Button
                onClick={handleExportToExcel}
                disabled={!rows.length}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export to Excel
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
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer ID</TableHead>
                  <TableHead>Customer Unique Id</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Mobile Number</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Pincode</TableHead>
                  <TableHead>Depot Name</TableHead>
                  <TableHead>Sub From date</TableHead>
                  <TableHead>Sub To Date</TableHead>
                  <TableHead>Last Varient</TableHead>
                  <TableHead>New Varient</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isFetching ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8 text-gray-500">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8 text-gray-500">
                      No data found for selected dates
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r, idx) => (
                    <TableRow key={`${r.customerId}-${r.date}-${idx}`} className="hover:bg-gray-50">
                      <TableCell>{r.exceptionType || "-"}</TableCell>
                      <TableCell>{formatDisplayDate(r.date) || "-"}</TableCell>
                      <TableCell>{r.customerId || "-"}</TableCell>
                      <TableCell>{r.customerUniqueId || "-"}</TableCell>
                      <TableCell>{r.customerName || "-"}</TableCell>
                      <TableCell>{r.mobileNumber || "-"}</TableCell>
                      <TableCell className="max-w-[360px] whitespace-normal break-words" title={r.address || ""}>
                        {r.address || "-"}
                      </TableCell>
                      <TableCell>{r.pincode || "-"}</TableCell>
                      <TableCell>{r.depotName || "-"}</TableCell>
                      <TableCell>{formatDisplayDate(r.subFromDate) || "-"}</TableCell>
                      <TableCell>{formatDisplayDate(r.subToDate) || "-"}</TableCell>
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
