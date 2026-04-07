// frontend/src/modules/Wallet/AdminMembersListPage.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get, patch } from '@/services/apiService'; // Corrected API service import, added patch
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,  
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Edit, CheckCircle2, XCircle, Wallet, Search, Filter } from 'lucide-react'; // Icons
import { Input } from "@/components/ui/input"; // Assuming Input component exists
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // For items per page
import { Separator } from "@/components/ui/separator";

interface MemberWalletInfo {
  _id: string; // or number, depending on your ID type
  id: string; // or number
  userUniqueId?: string;
  name: string;
  email: string;
  role?: string; // Added from backend
  active?: boolean; // Added from backend
  walletBalance: number;
}

interface ApiResponse {
  members: MemberWalletInfo[];
  page: number;
  totalPages: number;
  totalRecords: number;
}

const AdminMembersListPage: React.FC = () => {
  const [members, setMembers] = useState<MemberWalletInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State for pagination, search, and sorting
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [limit, setLimit] = useState<number>(10); // Or your preferred default
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("name"); // Default sort column
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>("asc"); // Default sort order
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  // Instant search matches UserList.tsx behavior
  const searchTermForFetch = searchTerm;

  const handleToggleMemberStatus = async (memberId: string, currentStatus: boolean) => {
    try {
      // Optimistically update UI or wait for response
      // For now, let's update after successful API call
      await patch(`/admin/members/${memberId}/status`, { active: !currentStatus });
      setMembers(prevMembers =>
        prevMembers.map(m => (m._id === memberId ? { ...m, active: !currentStatus } : m))
      );
      // Optionally, show a success toast notification here
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to update member status');
      console.error('Failed to update member status:', err);
      // Optionally, show an error toast notification here
    }
  };

  const fetchMembers = async (page = currentPage, currentLimit = limit, search = searchTermForFetch, currentSortBy = sortBy, currentSortOrder = sortOrder, status = activeFilter) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', currentLimit.toString());
      if (search) params.append('search', search);
      if (status !== "all") params.append('active', status);
      params.append('sortBy', currentSortBy);
      params.append('sortOrder', currentSortOrder);

      const response = await get<ApiResponse>(`/admin/members?${params.toString()}`);
      
      setMembers(response.members);
      setCurrentPage(response.page);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch members');
      console.error('Failed to fetch members:', err);
      setMembers([]); // Clear members on error
      setTotalPages(0);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Fetch members when any relevant param changes
    fetchMembers(currentPage, limit, searchTermForFetch, sortBy, sortOrder, activeFilter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, limit, searchTermForFetch, sortBy, sortOrder, activeFilter]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handleSort = (columnKey: string) => {
    if (sortBy === columnKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnKey);
      setSortOrder('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  const handleLimitChange = (newLimit: string) => {
    setLimit(Number(newLimit));
    setCurrentPage(1); // Reset to first page when limit changes
  };



  return (
    <div className="mt-2 p-4 sm:p-6">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Admin - Customer Wallets</h1>
      </div>

      <Card className="mx-auto mt-6">
        <CardContent className="pt-6">
          {/* Toolbar - Matches UserList.tsx structure */}
          <div className="flex flex-wrap gap-4 mb-6">
            {/* Search Input */}
            <div className="flex-grow">
              <Input
                type="text"
                placeholder="Search customer by name or email..."
                value={searchTerm}
                onChange={handleSearchChange}
                icon={<Search className="h-4 w-4" />}
                className="w-full"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={`shadow-sm transition-all duration-200 ${
                  activeFilter !== "all" || searchTerm
                    ? "bg-green-600 hover:bg-green-700 text-white border-green-600"
                    : "bg-background hover:bg-muted text-foreground border border-input"
                }`}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
              {(searchTerm || activeFilter !== "all") && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchTerm("");
                    setActiveFilter("all");
                    setCurrentPage(1);
                  }}
                  className="h-10 text-gray-500 hover:text-red-600 hover:bg-red-50 px-3"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Collapsible Filters */}
          {showFilters && (
            <Card className="p-4 mb-6 bg-gray-50/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 animate-in slide-in-from-top-2 duration-200">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block text-gray-700 dark:text-gray-300">
                    Member Status
                  </label>
                  <Select value={activeFilter} onValueChange={(val) => { setActiveFilter(val); setCurrentPage(1); }}>
                    <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Members</SelectItem>
                      <SelectItem value="true">Active Only</SelectItem>
                      <SelectItem value="false">Inactive Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          )}

          <Separator className="mb-4" />
          
          <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Syncing members...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-40 text-red-600">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p>Error: {error}</p>
              <Button variant="outline" size="sm" onClick={() => fetchMembers()} className="mt-2 text-red-600 border-red-200">
                Try Again
              </Button>
            </div>
          ) : members.length === 0 ? (
            <p className="text-center text-gray-500 py-10 bg-gray-50/50 rounded-lg border border-dashed">No Customer found matching your search.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    User Unique ID
                  </TableHead>
                  <TableHead onClick={() => handleSort('name')} className="cursor-pointer">
                    Name {sortBy === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </TableHead>
                  <TableHead onClick={() => handleSort('email')} className="cursor-pointer">
                    Email {sortBy === 'email' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </TableHead>
                  <TableHead onClick={() => handleSort('walletBalance')} className="cursor-pointer">
                    Wallet Balance {sortBy === 'walletBalance' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </TableHead>
                  <TableHead onClick={() => handleSort('active')} className="cursor-pointer">
                    Status {sortBy === 'active' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member._id}>
                    <TableCell>{member.userUniqueId || '-'}</TableCell>
                    <TableCell>{member.name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>₹{member.walletBalance.toFixed(2)}</TableCell>
                    <TableCell>
                      {member.active === undefined ? (
                        <span className="text-gray-500">Unknown</span>
                      ) : member.active ? (
                        <span className="text-green-600 font-semibold">Active</span>
                      ) : (
                        <span className="text-red-600 font-semibold">Inactive</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center space-x-1">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/admin/wallet?memberId=${member._id}`}>
                           <Wallet className="h-4 w-4" />

                        </Link>
                      </Button>
                      {/* Edit Member Button */}
                      <Button asChild variant="outline" size="sm" className="ml-2" title="Edit Customer Details">
                        <Link to={`/admin/members/${member._id}/edit`}> {/* Ensure this route exists or will be created */}

                          <Edit className="h-4 w-4" />

                        </Link>
                      </Button>
                      {/* Activate/Deactivate Button */}
                      {member.active !== undefined && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="ml-2" 
                          onClick={() => handleToggleMemberStatus(member._id, member.active!)}
                          title={member.active ? "Deactivate Customer" : "Activate Customer"}
                        >
                          {member.active ? (
                            <XCircle className="h-4 w-4 text-red-500" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {totalPages > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-4 border-t">
              <div className="flex items-center space-x-3 bg-secondary/5 p-1 px-3 rounded-md border border-dashed">
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap uppercase tracking-wider">Entries/Page:</span>
                <Select value={limit.toString()} onValueChange={handleLimitChange}>
                  <SelectTrigger className="w-[85px] h-8 border-none bg-transparent focus:ring-0 text-sm font-bold">
                    <SelectValue placeholder={limit.toString()} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-4">
                <Button 
                  onClick={handlePreviousPage} 
                  disabled={currentPage <= 1 || loading}
                  variant="outline"
                  size="sm"
                  className="h-9 px-4"
                >
                  Previous
                </Button>
                <div className="flex items-center px-3 h-9 bg-gray-50 dark:bg-gray-800 rounded-md border text-sm font-medium">
                  <span className="text-muted-foreground mr-1">Page</span>
                  <span className="text-primary">{currentPage}</span>
                  <span className="mx-1 text-muted-foreground">of</span>
                  <span>{totalPages}</span>
                </div>
                <Button 
                  onClick={handleNextPage} 
                  disabled={currentPage >= totalPages || loading}
                  variant="outline"
                  size="sm"
                  className="h-9 px-4"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMembersListPage;
