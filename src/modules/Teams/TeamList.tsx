import React, { useState, useEffect, useCallback, useRef } from 'react';
import { get, del, patch } from '../../services/apiService';
import { Edit, Trash2, Search, ChevronsUpDown, ArrowDown, ArrowUp, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { User } from './Teams';

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Pagination } from '@/components/common/Pagination';



interface TeamListProps {
  searchTerm: string;
  onEditUser: (user: User) => void;
  refreshKey: number;
}

const TeamList: React.FC<TeamListProps> = ({ searchTerm, onEditUser, refreshKey }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [sortColumn, setSortColumn] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const limit = 10;
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await get('/teams/users', {
        page: currentPage,
        limit: limit,
        search: searchTerm,
        sortBy: sortColumn,
        sortOrder: sortOrder,
      });
      setUsers(response.users || []);
      setTotalPages(response.totalPages || 1);
      setTotalRecords(response.totalRecords || 0);
    } catch (error: any) {
      console.error('Failed to fetch users:', error);
      toast.error(error.message || 'Failed to fetch users.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, sortColumn, sortOrder, refreshKey]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      fetchUsers();
    }, 300); // Debounce search
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [fetchUsers, searchTerm]);

  const handleDeleteConfirmation = (user: User) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    try {
      // Assuming an endpoint like /teams/users/:id
      await del(`/teams/users/${userToDelete.id}`);
      toast.success('User deleted successfully.');
      fetchUsers(); // Refresh list
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      toast.error(error.message || 'Failed to delete user.');
      setShowDeleteConfirm(false);
    }
  };

    const handleChangeStatus = async (user: User) => {
    try {
      await patch(`/teams/users/${user.id}/status`, {});
      toast.success(`User ${user.active ? 'deactivated' : 'activated'} successfully.`);
      fetchUsers(); // Refresh list to show new status
    } catch (error: any) {
      console.error('Failed to change user status:', error);
      toast.error(error.message || 'Failed to change user status.');
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortOrder('asc');
    }
    setCurrentPage(1); // Reset to first page on sort
  };

  const SortIndicator = ({ column }: { column: string }) => {
    if (sortColumn !== column) return <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />;
    return sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  return (
    <>
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="bg-slate-100 dark:bg-slate-800 rounded-full p-5 mb-6">
            <Search className="h-10 w-10 text-slate-500 dark:text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">
            {searchTerm ? 'No Matching Users Found' : 'No Users Yet'}
          </h3>
          <p className="text-muted-foreground max-w-md mb-6">
            {searchTerm
              ? 'Try adjusting your search criteria or add a new user.'
              : 'Get started by adding your first user.'}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader className="bg-slate-50 dark:bg-slate-800">
                <TableRow>
                  <TableHead onClick={() => handleSort('name')} className="cursor-pointer px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">Name <SortIndicator column='name' /></div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('email')} className="cursor-pointer px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">Email <SortIndicator column='email' /></div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('mobile')} className="cursor-pointer px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">Phone <SortIndicator column='mobile' /></div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('role')} className="cursor-pointer px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">Role <SortIndicator column='role' /></div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('depot.name')} className="cursor-pointer px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">Depot <SortIndicator column='depot.name' /></div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('joiningDate')} className="cursor-pointer px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">Joining Date <SortIndicator column='joiningDate' /></div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('active')} className="cursor-pointer px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">Status <SortIndicator column='active' /></div>
                  </TableHead>
                  <TableHead className="px-4 py-3">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <TableCell className="px-4 py-3 font-medium">{user.name}</TableCell>
                    <TableCell className="px-4 py-3">{user.email}</TableCell>
                    <TableCell className="px-4 py-3">{user.mobile || 'N/A'}</TableCell>
                    <TableCell className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'ADMIN' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3">{user.depot?.name || 'N/A'}</TableCell>
                    <TableCell className="px-4 py-3">{new Date(user.joiningDate).toLocaleDateString()}</TableCell>
                    <TableCell className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {user.active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                                                <Button variant="ghost" size="icon" onClick={() => onEditUser(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleChangeStatus(user)} title={user.active ? 'Deactivate' : 'Activate'}>
                          {user.active ? <XCircle className="h-4 w-4 text-red-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteConfirmation(user)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            totalRecords={totalRecords}
            limit={limit}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteConfirm(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TeamList;
