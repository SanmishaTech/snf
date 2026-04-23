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
import {
  PlusCircle,
  Edit,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { getProductOptions, ProductOption } from "../../services/productService";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
const DepotProductVariantListPage: React.FC = () => {
  const [variants, setVariants] = useState<DepotProductVariant[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("all");
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
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
        search: debouncedSearchTerm,
        productId: selectedProductId !== "all" ? Number(selectedProductId) : undefined,
      });
      setVariants(data.data);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch variants");
    }
  }, [currentPage, debouncedSearchTerm, selectedProductId]);

  // Fetch products for the filter
  const fetchProducts = useCallback(async (query?: string) => {
    try {
      const options = await getProductOptions(query);
      setProducts(options);
    } catch (err) {
      console.error("Failed to fetch product options:", err);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Debounced search for products in the dropdown
  useEffect(() => {
    if (isComboboxOpen) {
      const handler = setTimeout(() => {
        fetchProducts(productSearchQuery);
      }, 300);
      return () => clearTimeout(handler);
    }
  }, [productSearchQuery, isComboboxOpen, fetchProducts]);

  // Handle debouncing search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Main effect to fetch variants when filters change
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
          <div className="mb-8 flex flex-col gap-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Depot/Shop Product Variants
            </h1>
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative w-full flex-1">
                <Input
                  placeholder="Search by variant or product..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 min-h-11 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-sm"
                />
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
              </div>

              {/* Product Filter - Searchable Combobox */}
              <div className="w-full md:w-auto min-w-[280px]">
                <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isComboboxOpen}
                      className="w-full min-h-11 justify-between border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-sm bg-white px-4"
                    >
                      <div className="flex items-center gap-2 overflow-hidden mr-2">
                        <Filter size={16} className="text-gray-400 shrink-0" />
                        <span className="truncate">
                          {selectedProductId === "all"
                            ? "All Products"
                            : products.find((p) => p.id.toString() === selectedProductId)?.name || "Product Selected"}
                        </span>
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0 rounded-xl shadow-xl border-gray-200">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Search product..."
                        value={productSearchQuery}
                        onValueChange={setProductSearchQuery}
                      />
                      <CommandList>
                        <CommandEmpty>No product found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="all"
                            onSelect={() => {
                              setSelectedProductId("all");
                              setIsComboboxOpen(false);
                              setCurrentPage(1);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedProductId === "all" ? "opacity-100" : "opacity-0"
                              )}
                            />
                            All Products
                          </CommandItem>
                          {products.map((product) => (
                            <CommandItem
                              key={product.id}
                              value={product.id.toString()}
                              onSelect={() => {
                                setSelectedProductId(product.id.toString());
                                setIsComboboxOpen(false);
                                setCurrentPage(1);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedProductId === product.id.toString() ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {product.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <DialogTrigger asChild>
                <Button
                  variant="default"
                  size="lg"
                  onClick={handleAddNew}
                  className="gap-2 shadow-lg bg-red-600 hover:bg-red-700 text-white rounded-xl px-6 h-11 transition-all hover:scale-[1.02] active:scale-95 whitespace-nowrap w-full md:w-auto"
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
                    "Depot/Shop",
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
                      {v.closingQty}
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
