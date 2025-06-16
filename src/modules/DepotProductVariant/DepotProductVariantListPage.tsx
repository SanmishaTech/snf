import React, { useCallback, useEffect, useState } from "react";
import {
  DepotProductVariant,
  getDepotProductVariants,
  deleteDepotProductVariant,
} from "../../services/depotProductVariantService";
import DepotProductVariantForm from "./DepotProductVariantForm";
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

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVariant, setEditingVariant] =
    useState<DepotProductVariant | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [variantIdToDelete, setVariantIdToDelete] = useState<number | null>(
    null
  );

  const fetchVariants = useCallback(async () => {
    try {
      const data = await getDepotProductVariants({
        page: currentPage,
        limit: recordsPerPage,
      });
      setVariants(data.data);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch variants");
    }
  }, [currentPage]);

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
            <h1 className="text-3xl font-semibold text-gray-800">
              Depot Product Variants
            </h1>
            <div className="flex flex-col md:flex-row gap-2 items-center">
              <div className="relative w-full max-md:w-2/5">
                <Input
                  placeholder="Search..."
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
                    "Selling",
                    "Purchase",
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
                {variants.map((v) => (
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
                      {formatCurrency(v.sellingPrice)}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm">
                      {formatCurrency(v.purchasePrice)}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm space-x-3">
                      <button
                        onClick={() => handleEdit(v)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => confirmDelete(v.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={18} />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {renderPagination()}
        </div>

        <DialogContent className="sm:max-w-[500px]">
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
