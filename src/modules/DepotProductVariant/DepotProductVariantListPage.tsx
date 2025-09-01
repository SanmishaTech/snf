import React, { useCallback, useEffect, useState } from "react";
import {
  DepotProductVariant,
  getDepotProductVariants,
  deleteDepotProductVariant,
} from "../../services/depotProductVariantService";
import DepotProductVariantForm from "./DepotProductVariantForm";
import { get } from "../../services/apiService";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { format } from "date-fns";
import {
  PlusCircle,
  Edit,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatter";

const DepotProductVariantListPage: React.FC = () => {
  const [variants, setVariants] = useState<DepotProductVariant[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const recordsPerPage = 10;

  // User role and depot filtering state
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserDepotId, setCurrentUserDepotId] = useState<number | null>(null);
  const [isUserInfoLoading, setIsUserInfoLoading] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVariant, setEditingVariant] =
    useState<DepotProductVariant | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [variantIdToDelete, setVariantIdToDelete] = useState<number | null>(
    null
  );

  // Get user role and depot information from localStorage (fallback to /users/me)
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const userStr = localStorage.getItem("user");
        let role: string | null = null;
        let depotIdFromStorage: number | null = null;
        if (userStr) {
          const user = JSON.parse(userStr);
          role = user?.role || null;
          // Try multiple shapes: direct depotId or nested depot.id
          depotIdFromStorage = user?.depotId ?? user?.depot?.id ?? null;
        }
        setCurrentUserRole(role);

        const normalizedRole = (role || "").toString().toUpperCase();
        const isDepotRole = normalizedRole === "DEPOTADMIN" || normalizedRole.includes("DEPOT");

        if (isDepotRole) {
          // Prefer depotId from localStorage, fallback to /users/me
          if (depotIdFromStorage) {
            setCurrentUserDepotId(Number(depotIdFromStorage));
          } else {
            setIsUserInfoLoading(true);
            try {
              const userInfo = await get("/users/me");
              setCurrentUserDepotId(
                userInfo?.depot?.id || userInfo?.depotId || null
              );
            } catch (error) {
              console.error("Failed to fetch user depot info:", error);
              toast.error("Could not load depot details.");
              setCurrentUserDepotId(null);
            } finally {
              setIsUserInfoLoading(false);
            }
          }
        }
      } catch (error) {
        console.error("Failed to parse user data from localStorage", error);
      }
    };
    fetchUserInfo();
  }, []);

  const fetchVariants = useCallback(async () => {
    // Don't fetch if depot user info is still loading
    const normalizedRole = (currentUserRole || "").toString().toUpperCase();
    const isDepotRole = normalizedRole === "DEPOTADMIN" || normalizedRole.includes("DEPOT");

    if (isDepotRole && isUserInfoLoading) {
      return;
    }
    
    // Don't fetch if depot role but no depot assigned
    if (isDepotRole && !currentUserDepotId && !isUserInfoLoading) {
      setVariants([]);
      setTotalPages(0);
      toast.info("No depot assigned to your account. Please contact administrator.");
      return;
    }

    try {
      const params: any = {
        page: currentPage,
        limit: recordsPerPage,
      };

      // Add depot filtering if user is a depot user
      if (isDepotRole && currentUserDepotId) {
        params.depotId = currentUserDepotId;
      }

      // Add search parameter if search term exists
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const data = await getDepotProductVariants(params);

      // Frontend safeguard: if depot role, filter by depotId just in case backend ignores depotId filter
      const serverData = Array.isArray(data.data) ? data.data : [];
      const filtered = isDepotRole && currentUserDepotId
        ? serverData.filter((v: any) => Number(v.depotId) === Number(currentUserDepotId) || Number(v?.depot?.id) === Number(currentUserDepotId))
        : serverData;
      setVariants(filtered);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch variants");
    }
  }, [currentPage, currentUserRole, currentUserDepotId, isUserInfoLoading, searchTerm]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Reset to first page when search changes
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        fetchVariants();
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants]);

  const handleAddNew = () => {
    setEditingVariant(null);
    setIsFormOpen(true);
  };

  const handleEdit = (v: DepotProductVariant) => {
    setEditingVariant(v);
    setIsFormOpen(true);
  };

  const confirmDelete = (id: number) => {
    setVariantIdToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const executeDelete = async () => {
    if (variantIdToDelete == null) return;
    try {
      await deleteDepotProductVariant(variantIdToDelete);
      toast.success("Variant deleted");
      fetchVariants();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete variant");
    }
    setIsDeleteDialogOpen(false);
    setVariantIdToDelete(null);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    return (
      <div className="flex justify-center items-center space-x-2 mt-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft size={16} className="mr-1" /> Previous
        </Button>
        {pages.map((n) => (
          <Button
            key={n}
            variant={currentPage === n ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentPage(n)}
          >
            {n}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          disabled={currentPage === totalPages}
        >
          Next <ChevronRight size={16} className="ml-1" />
        </Button>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <Dialog
        open={isFormOpen}
        onOpenChange={(o) => {
          setIsFormOpen(o);
          if (!o) setEditingVariant(null);
        }}
      >
        <div className="bg-white p-8 rounded-xl shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-semibold text-gray-800">Depot Product Variants</h1>
            <div className="flex flex-col md:flex-row gap-2 items-center">
              <div className="relative w-full max-md:w-2/5">
                <Input
                  placeholder="Search products, depots..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 min-h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={20}
                />
              </div>
              <DialogTrigger asChild>
                <Button
                  variant="default"
                  size="lg"
                  onClick={handleAddNew}
                  className="gap-2 shadow-md"
                >
                  <PlusCircle size={20} /> Add New Variant
                </Button>
              </DialogTrigger>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  {[
                    "Depot",
                    "Product",
                    "Name",
                     "Closing Qty",
                    "Actions",
                  ].map((h) => (
                    <TableHead
                      key={h}
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-200">
                {isUserInfoLoading ? (
                  // Loading state
                  <TableRow>
                    <TableCell colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                        <span>Loading depot information...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : variants.length === 0 ? (
                  // Empty state
                  <TableRow>
                    <TableCell colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center space-y-2">
                        <PlusCircle size={48} className="text-gray-400" />
                        <span className="text-lg font-medium">
                          {((currentUserRole || "").toUpperCase().includes("DEPOT")) 
                            ? "No product variants found for your depot" 
                            : "No depot product variants found"}
                        </span>
                        <span className="text-sm">
                          {((currentUserRole || "").toUpperCase().includes("DEPOT")) 
                            ? "Contact your administrator to add variants for your depot." 
                            : "Click 'Add New Variant' to create your first variant."}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  variants.map((v) => (
                    <TableRow key={v.id} className="hover:bg-gray-50">
                      {/* <TableCell className="px-6 py-4 text-sm">{v.id}</TableCell> */}
                      <TableCell className="px-6 py-4 text-sm">
                        {v?.depot?.name ?? v.depotId}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm">
                        {v?.product?.name}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm font-medium">
                        {v.name}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm">
                        {v.closingQty}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm space-x-3">
                        <button
                          onClick={() => handleEdit(v)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit variant"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => confirmDelete(v.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete variant"
                        >
                          <Trash2 size={18} />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {renderPagination()}
        </div>

        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVariant ? "Edit Variant" : "Add New Variant"}
            </DialogTitle>
            <DialogDescription>
              {editingVariant
                ? "Update variant details"
                : "Fill details to create variant"}
            </DialogDescription>
          </DialogHeader>
          <DepotProductVariantForm
            initialData={editingVariant}
            onClose={() => setIsFormOpen(false)}
            onSuccess={() => {
              setIsFormOpen(false);
              fetchVariants();
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will delete the variant.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={executeDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DepotProductVariantListPage;
