// frontend/src/modules/Wallet/AdminMembersListPage.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get } from '@/services/apiService'; // Corrected API service import
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Edit } from 'lucide-react'; // Icons
import { Input } from "@/components/ui/input"; // Assuming Input component exists
import { useDebounce } from '@/hooks/useDebounce'; // Assuming a debounce hook
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // For items per page

interface MemberWalletInfo {
  _id: string; // or number, depending on your ID type
  id: string; // or number
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

  const debouncedSearchTerm = useDebounce(searchTerm, 500); // Debounce search term by 500ms

  const fetchMembers = async (page = currentPage, currentLimit = limit, search = debouncedSearchTerm, currentSortBy = sortBy, currentSortOrder = sortOrder) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', currentLimit.toString());
      if (search) params.append('search', search);
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
    // Fetch members when debouncedSearchTerm changes, or other params like currentPage, limit, sortBy, sortOrder
    fetchMembers(currentPage, limit, debouncedSearchTerm, sortBy, sortOrder);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, limit, debouncedSearchTerm, sortBy, sortOrder]); // Add debouncedSearchTerm to dependencies

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading members...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-red-600">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>Admin - Members Wallets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <Input
              type="text"
              placeholder="Search members by name or email..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="max-w-sm flex-grow"
            />
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700 dark:text-gray-300">Show:</span>
              <Select value={limit.toString()} onValueChange={handleLimitChange}>
                <SelectTrigger className="w-[80px]">
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
          </div>

          {members.length === 0 && !loading ? (
            <p className="text-center text-gray-500 py-4">No members found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead onClick={() => handleSort('name')} className="cursor-pointer">
                    Name {sortBy === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </TableHead>
                  <TableHead onClick={() => handleSort('email')} className="cursor-pointer">
                    Email {sortBy === 'email' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </TableHead>
                  <TableHead onClick={() => handleSort('walletBalance')} className="cursor-pointer">
                    Wallet Balance {sortBy === 'walletBalance' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member._id}>
                    <TableCell>{member.name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>₹{member.walletBalance.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/admin/wallet?memberId=${member._id}`}>
                          <Edit className="mr-2 h-4 w-4" /> Manage Wallet
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {totalPages > 0 && (
            <div className="flex items-center justify-between mt-6">
              <Button 
                onClick={handlePreviousPage} 
                disabled={currentPage <= 1 || loading}
                variant="outline"
              >
                Previous
              </Button>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </span>
              <Button 
                onClick={handleNextPage} 
                disabled={currentPage >= totalPages || loading}
                variant="outline"
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMembersListPage;
