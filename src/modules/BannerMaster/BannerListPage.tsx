import React, { useState, useEffect, useCallback, useRef } from "react";
import * as apiService from "@/services/apiService";
import {
  PlusCircle,
  Edit,
  Trash2,
  Search,
  ChevronsUpDown,
  ArrowDown,
  ArrowUp,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import BannerMasterForm, { BannerFormData } from "./BannerMasterForm";
import { Pagination } from "@/components/common/Pagination";

export interface Banner extends BannerFormData {
  id: string;
  imagePath: string; // Add imagePath, as it comes from the API
  createdAt: string;
  // caption, description, listOrder are inherited from BannerFormData
  // bannerImageFile is part of BannerFormData for form handling, not typically part of API response for existing banners
}

const API_BASE_URL = "/api/admin/banners";
const BACKEND_URL =
  process.env.NODE_ENV === "production" ? "" : "http://localhost:3006"; // Adjust as needed for production

const BannerMasterListPage: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | undefined>(
    undefined
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bannerToDelete, setBannerToDelete] = useState<Banner | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [sortColumn, setSortColumn] = useState("listOrder"); // Default sort
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const limit = 10;

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: limit,
        search: searchTerm,
        sortBy: sortColumn,
        sortOrder: sortOrder,
      };
      const responseData = await apiService.get<{
        banners: Banner[];
        totalPages: number;
        totalRecords: number;
      }>(API_BASE_URL, params);
      console.log("API Response Data in fetchBanners:", responseData);
      setBanners(responseData.banners || []);
      setTotalPages(responseData.totalPages || 1);
      setTotalRecords(responseData.totalRecords || 0);
    } catch (error: any) {
      console.error("Failed to fetch banners. Full error object:", error);
      let errorMessage = "Failed to fetch banners.";
      if (error && error.message) {
        errorMessage = error.message;
      }
      if (
        error &&
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        errorMessage = error.response.data.message;
      }
      toast.error(errorMessage);
      setBanners([]);
      setTotalPages(1);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, sortColumn, sortOrder]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      fetchBanners();
    }, 300); // Debounce search

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [fetchBanners, searchTerm]);

  const handleAdd = () => {
    setEditingBanner(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setIsFormOpen(true);
  };

  const handleDeleteConfirmation = (banner: Banner) => {
    setBannerToDelete(banner);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!bannerToDelete) return;
    try {
      await apiService.del(`${API_BASE_URL}/${bannerToDelete.id}`);
      toast.success("Banner deleted successfully.");
      fetchBanners(); // Refresh list
      setShowDeleteConfirm(false);
      setBannerToDelete(null);
    } catch (error) {
      console.error("Failed to delete banner:", error);
      toast.error("Failed to delete banner.");
      setShowDeleteConfirm(false);
    }
  };

  const handleFormSubmitSuccess = () => {
    fetchBanners();
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortOrder("asc");
    }
    setCurrentPage(1); // Reset to first page on sort
  };

  const SortIndicator = ({ column }: { column: string }) => {
    if (sortColumn !== column)
      return <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <Card className="border-0 shadow-sm">
        <CardHeader className="px-6 py-4 border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-2xl font-semibold">
              Banner Management
            </CardTitle>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <div className="relative flex-grow sm:flex-grow-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search banners..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 w-full sm:w-64 md:w-80"
                />
              </div>
              <Button onClick={handleAdd} className="gap-2 whitespace-nowrap">
                <PlusCircle className="h-4 w-4" /> Add Banner
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 sm:p-6">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : banners.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="bg-slate-100 dark:bg-slate-800 rounded-full p-5 mb-6">
                <ImageIcon className="h-10 w-10 text-slate-500 dark:text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {searchTerm ? "No Matching Banners Found" : "No Banners Yet"}
              </h3>
              <p className="text-muted-foreground max-w-md mb-6">
                {searchTerm
                  ? "Try adjusting your search criteria or add a new banner."
                  : "Get started by adding your first banner. It’s quick and easy!"}
              </p>
              {!searchTerm && (
                <Button onClick={handleAdd} className="gap-2">
                  <PlusCircle className="h-4 w-4" /> Add New Banner
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader className="bg-slate-50 dark:bg-slate-800">
                    <TableRow>
                      <TableHead
                        onClick={() => handleSort("listOrder")}
                        className="cursor-pointer px-4 py-3 whitespace-nowrap"
                      >
                        <div className="flex items-center">
                          Order <SortIndicator column="listOrder" />
                        </div>
                      </TableHead>
                      <TableHead className="px-4 py-3 whitespace-nowrap">
                        Image
                      </TableHead>
                      <TableHead
                        onClick={() => handleSort("caption")}
                        className="cursor-pointer px-4 py-3 whitespace-nowrap"
                      >
                        <div className="flex items-center">
                          Caption <SortIndicator column="caption" />
                        </div>
                      </TableHead>
                      <TableHead className="px-4 py-3 whitespace-nowrap">
                        Description
                      </TableHead>
                      <TableHead
                        onClick={() => handleSort("createdAt")}
                        className="cursor-pointer px-4 py-3 whitespace-nowrap"
                      >
                        <div className="flex items-center">
                          Created At <SortIndicator column="createdAt" />
                        </div>
                      </TableHead>
                      <TableHead className="text-right px-4 py-3 whitespace-nowrap">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {banners.map((banner) => (
                      <TableRow
                        key={banner.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
                      >
                        <TableCell className="px-4 py-3 font-medium">
                          {banner.listOrder}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          {banner.imagePath ? (
                            <img
                              src={`${BACKEND_URL}${banner.imagePath}`}
                              alt={banner.caption || "Banner image"}
                              className="h-10 w-16 object-cover rounded"
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              No image
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          {banner.caption || "-"}
                        </TableCell>
                        <TableCell className="px-4 py-3 truncate max-w-xs">
                          {banner.description || "-"}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          {new Date(banner.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right px-4 py-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(banner)}
                            className="hover:text-blue-600"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteConfirmation(banner)}
                            className="hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalRecords={totalRecords}
                  limit={limit}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {isFormOpen && (
        <BannerMasterForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmitSuccess={handleFormSubmitSuccess}
          initialData={editingBanner}
        />
      )}

      {showDeleteConfirm && bannerToDelete && (
        <AlertDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                banner "
                <strong>{bannerToDelete.caption || "this banner"}</strong>".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setBannerToDelete(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default BannerMasterListPage;
