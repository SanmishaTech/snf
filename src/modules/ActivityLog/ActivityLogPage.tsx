import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Loader2, RefreshCcw } from "lucide-react";
import { formatDate, formatTime } from "@/lib/formatter.js";
import { useDebounce } from "@/hooks/useDebounce";
import CustomPagination from "@/components/common/custom-pagination";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { get } from "@/services/apiService";

interface AuditLogEntry {
  id: number;
  userName: string | null;
  userRole: string | null;
  category: string;
  action: string;
  description: string | null;
  pagePath: string | null;
  requestPath: string | null;
  method: string | null;
  statusCode: number | null;
  ipAddress: string | null;
  createdAt: string;
}

interface AuditLogResponse {
  logs: AuditLogEntry[];
  page: number;
  totalPages: number;
  totalRecords: number;
}

const CATEGORY_OPTIONS = [
  { value: "ALL", label: "All Activity Types" },
  { value: "AUTH", label: "Logins & Signups" },
  { value: "PAGE", label: "Page Views" },
  { value: "API", label: "System Actions" },
];

const ROLE_OPTIONS = [
  { value: "ALL", label: "All Roles" },
  { value: "ADMIN", label: "Admin" },
  { value: "AGENCY", label: "Agency" },
  { value: "VENDOR", label: "Vendor" },
  { value: "DepotAdmin", label: "Depot Admin" },
  { value: "SUPERVISOR", label: "Supervisor" },
];

function formatRole(role: string | null) {
  if (!role) {
    return "System";
  }

  return role
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatAction(action: string) {
  return action
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}


async function fetchAuditLogs(params: {
  page: number;
  limit: number;
  search: string;
  category: string;
  role: string;
}) {
  const query = new URLSearchParams();
  query.set("page", String(params.page));
  query.set("limit", String(params.limit));

  if (params.search) {
    query.set("search", params.search);
  }

  if (params.category !== "ALL") {
    query.set("category", params.category);
  }

  if (params.role !== "ALL") {
    query.set("role", params.role);
  }

  return get<AuditLogResponse>(`/audit-logs?${query.toString()}`);
}

export default function ActivityLogPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [role, setRole] = useState("ALL");
  const debouncedSearch = useDebounce(search, 400);

  const currentUser = useMemo(() => {
    try {
      const storedUser = localStorage.getItem("user");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  }, []);

  const isAdminUser =
    currentUser?.role === "ADMIN" || currentUser?.role === "SUPER_ADMIN";

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: [
      "audit-logs",
      currentPage,
      recordsPerPage,
      debouncedSearch,
      category,
      role,
    ],
    queryFn: () =>
      fetchAuditLogs({
        page: currentPage,
        limit: recordsPerPage,
        search: debouncedSearch,
        category,
        role,
      }),
    enabled: isAdminUser,
  });

  if (!isAdminUser) {
    return (
      <div className="p-4 sm:p-6">
        <Card>
          <CardContent className="py-10">
            <div className="flex flex-col items-center justify-center gap-3 text-center">
              <AlertCircle className="h-8 w-8 text-amber-500" />
              <div>
                <h1 className="text-xl font-semibold">Access Restricted</h1>
                <p className="text-sm text-muted-foreground">
                  Only admins can view the activity log.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const logs = data?.logs || [];
  const totalPages = data?.totalPages || 1;
  const totalRecords = data?.totalRecords || 0;

  return (
    <div className="p-4 sm:p-6">
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Activity Log</CardTitle>
              <p className="text-sm text-muted-foreground">
                Login events, page visits, and admin portal actions across roles.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCcw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by user, activity, page, or API path..."
            />

            <Select
              value={category}
              onValueChange={(value) => {
                setCategory(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={role}
              onValueChange={(value) => {
                setRole(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              onClick={() => {
                setSearch("");
                setCategory("ALL");
                setRole("ALL");
                setCurrentPage(1);
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>Loading activity log...</span>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <div>
                <h2 className="font-semibold">Could not load activity log</h2>
                <p className="text-sm text-muted-foreground">
                  {(error as { message?: string })?.message || "Something went wrong."}
                </p>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              No activity found for the selected filters.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[170px]">Time</TableHead>
                      <TableHead className="min-w-[170px]">User</TableHead>
                      <TableHead className="min-w-[260px]">Activity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          <div className="text-sm font-medium text-foreground">
                            {formatDate(log.createdAt)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatTime(log.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{log.userName || "System"}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatRole(log.userRole)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{log.description || formatAction(log.action)}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatAction(log.action)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <CustomPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalRecords={totalRecords}
                recordsPerPage={recordsPerPage}
                onPageChange={setCurrentPage}
                onRecordsPerPageChange={(nextRecordsPerPage) => {
                  setRecordsPerPage(nextRecordsPerPage);
                  setCurrentPage(1);
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
