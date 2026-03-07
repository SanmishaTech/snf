import React, { useEffect, useState } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import {
  useForm,
  SubmitHandler,
  Controller,
  useFieldArray,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { LoaderCircle, Trash2, Plus, X, Image as ImageIcon, Upload, Info, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { post, put, postupload } from "@/services/apiService";
import { getAllCategories } from "@/services/categoryService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  bulkUpdateVariants,
  ProductVariantDto,
} from "@/services/productVariantService";
import { cn } from "@/lib/utils";

// Define the Category type based on the backend model
interface Category {
  id: number;
  name: string;
  // Add other category fields if needed
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

const productVariantSchema = z.object({
  id: z.number().optional(),
  hsnCode: z.string().optional().nullable(),
  mrp: z.coerce.number().positive("MRP must be positive"),
  sellingPrice: z.coerce.number().positive("Selling price must be positive"),
  purchasePrice: z.coerce.number().positive("Purchase price must be positive"),
  name: z.string().min(1, "Variant name is required"),
  gstRate: z.coerce.number().min(0, "GST rate cannot be negative"),
});

const productSchema = z.object({
  tags: z.string().optional().nullable(),
  maintainStock: z.boolean().default(false),
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional().nullable(),
  isDairyProduct: z.boolean().default(false),
  isSubscription: z.boolean().default(false),
  categoryId: z.coerce
    .number()
    .positive("Please select a category")
    .optional()
    .nullable(),
  attachmentUrl: z
    .instanceof(FileList)
    .optional()
    .nullable()
    .refine(
      (files) => !files || files.length === 0 || files[0].size <= MAX_FILE_SIZE,
      `Max image size is 5MB.`
    )
    .refine(
      (files) =>
        !files ||
        files.length === 0 ||
        ACCEPTED_IMAGE_TYPES.includes(files[0].type),
      "Only .jpg, .jpeg, .png, .webp and .gif formats are supported."
    ),
  variants: z.array(productVariantSchema).optional(),
});

export type ProductFormInputs = z.infer<typeof productSchema>;

export interface ProductFormProps {
  mode: "create" | "edit";
  productId?: string;
  initialData?: Partial<ProductFormInputs & { variants: ProductVariantDto[] }>;
  onSuccess?: () => void;
  className?: string;
}

const ProductForm: React.FC<ProductFormProps> = ({
  mode,
  productId,
  initialData,
  onSuccess,
  className,
}) => {
  const queryClient = useQueryClient();

  const { data: categories, isLoading: isLoadingCategories } = useQuery<
    Category[],
    Error
  >({
    queryKey: ["categories"],
    queryFn: getAllCategories,
  });
  const [currentAttachmentPreview, setCurrentAttachmentPreview] = useState<string | null>(null);
  const [attachmentFileName, setAttachmentFileName] = useState<string>("");
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);

  const form = useForm<ProductFormInputs>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      isDairyProduct: false,
      isSubscription: false,
      maintainStock: false,
      attachmentUrl: null,
      variants: [],
      categoryId: null,
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty },
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "variants",
  });

  useEffect(() => {
    // Only reset the form if initialData is present AND categories have been loaded.
    // This prevents a race condition where the form is reset before the dropdown has its options.
    if (mode === "edit" && initialData && categories) {
      const resetValues = {
        name: initialData.name || "",
        description: (initialData as any).description || "",
        tags: (initialData as any).tags || "",
        isDairyProduct: initialData.isDairyProduct || false,
        isSubscription: initialData.isSubscription || false,
        maintainStock: initialData.maintainStock || false,
        variants: initialData.variants || [],
        categoryId: (initialData as any).categoryId || null,
      };
      reset(resetValues as any);
      if ((initialData as any).attachmentUrl && (initialData as any).attachmentUrl !== "null" && (initialData as any).attachmentUrl !== "undefined") {
        const attachmentUrl = (initialData as any).attachmentUrl;
        let initialurl = attachmentUrl;
        if (typeof attachmentUrl === 'string' && !attachmentUrl.startsWith("http")) {
          initialurl = `${import.meta.env.VITE_BACKEND_URL}${attachmentUrl.startsWith("/") ? "" : "/"}${attachmentUrl}`;
        }
        setCurrentAttachmentPreview(`${initialurl}?t=${Date.now()}`);
      } else {
        setCurrentAttachmentPreview(null);
      }
    } else if (mode === "create") {
      reset();
      setCurrentAttachmentPreview(null);
      setAttachmentFileName("");
    }
  }, [initialData, mode, reset, categories]);

  const mutation = useMutation<
    any,
    Error,
    { productData: FormData; variants: ProductVariantDto[]; newImages?: File[] }
  >({
    mutationFn: async ({ productData, variants, newImages }) => {
      const endpoint = mode === "create" ? "/products" : `/products/${productId}`;
      const method = mode === "create" ? post : put;
      if (mode === "edit" && !productId) throw new Error("Product ID is required for update.");

      const productResult = await method(endpoint, productData);
      const returnedProductId = productResult?.id || productId;
      if (!returnedProductId) throw new Error("Failed to get product ID.");

      if (variants && variants.length > 0) {
        await bulkUpdateVariants(returnedProductId, variants);
      }

      // Upload additional images
      if (newImages && newImages.length > 0) {
        const imgFormData = new FormData();
        newImages.forEach(f => imgFormData.append("productImages", f, f.name));
        await postupload(`/products/${returnedProductId}/images`, imgFormData);
      }

      return productResult;
    },
    onSuccess: async (data) => {
      toast.success(
        `Product ${mode === "create" ? "created" : "updated"} successfully!`
      );

      const returnedId = data?.id || productId;

      // Wait for queries to invalidate so the list/edit pages get fresh data
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      if (returnedId) {
        await queryClient.invalidateQueries({ queryKey: ["product", returnedId] });
      }

      setNewImageFiles([]);
      setNewImagePreviews([]);
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "An unexpected error occurred";
      toast.error(`Failed to save product: ${errorMsg}`);
    },
  });

  const onSubmit: SubmitHandler<ProductFormInputs> = (data) => {
    console.log("Submitting variants:", data.variants); // Debugging line
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("isDairyProduct", String(data.isDairyProduct));
    formData.append("isSubscription", String(data.isSubscription));
    formData.append("maintainStock", String(data.maintainStock));
    if (data.description) formData.append("description", data.description);
    if (data.tags) formData.append("tags", data.tags);
    if (data.categoryId) formData.append("categoryId", String(data.categoryId));

    if (data.attachmentUrl && data.attachmentUrl.length > 0) {
      formData.append(
        "productAttachment",
        data.attachmentUrl[0],
        data.attachmentUrl[0].name
      );
    } else if (
      initialData?.attachmentUrl &&
      currentAttachmentPreview === null
    ) {
      formData.append("attachmentUrl", "");
    }

    mutation.mutate({ productData: formData, variants: data.variants || [], newImages: newImageFiles });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn("space-y-8", className)}
    >
      {/* Product Details Section */}
      <div className="space-y-6">
        <h3 className="text-lg font-medium border-b pb-2">Product Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="name">Product Name</Label>
            <Input
              id="name"
              type="text"
              {...register("name")}
              disabled={mutation.isPending}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoryId">Category</Label>
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <Select
                  key={field.value} // Add key to force re-render
                  onValueChange={field.onChange}
                  value={field.value ? String(field.value) : ""}
                  disabled={mutation.isPending || isLoadingCategories}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        isLoadingCategories ? "Loading..." : "Select a category"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.categoryId && (
              <p className="text-red-500 text-xs mt-1">
                {errors.categoryId.message}
              </p>
            )}
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              type="text"
              {...register("tags")}
              disabled={mutation.isPending}
              placeholder="e.g. organic, fresh, featured"
            />
            {errors.tags && (
              <p className="text-red-500 text-xs mt-1">{errors.tags.message}</p>
            )}
          </div>

          {/* Maintain Stock Checkbox */}
          <div className="flex items-center space-x-2">
            <Controller
              name="maintainStock"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="maintainStock"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={mutation.isPending}
                />
              )}
            />
            <Label htmlFor="maintainStock">Maintain Stock</Label>
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="description">Description</Label>

            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <ReactQuill
                  theme="snow"
                  value={field.value || ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
            {errors.description && (
              <p className="text-red-500 text-xs mt-1">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2 pt-8">
            <Controller
              name="isDairyProduct"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="isDairyProduct"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={mutation.isPending}
                />
              )}
            />
            <Label htmlFor="isDairyProduct">Is this a Dairy Product?</Label>
          </div>

          <div className="flex items-center space-x-2 pt-8">
            <Controller
              name="isSubscription"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="isSubscription"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={mutation.isPending}
                />
              )}
            />
            <Label htmlFor="isSubscription">Is Subscription?</Label>
          </div>

          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Product Gallery</Label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  id="additional-images"
                  multiple
                  accept={ACCEPTED_IMAGE_TYPES.join(",")}
                  onChange={(e) => {
                    if (e.target.files) {
                      const filesArray = Array.from(e.target.files);
                      const validFiles = filesArray.filter(f => f.size <= MAX_FILE_SIZE && ACCEPTED_IMAGE_TYPES.includes(f.type));
                      if (validFiles.length < filesArray.length) toast.warning("Some files were skipped (too large or wrong type)");
                      setNewImageFiles((prev) => [...prev, ...validFiles]);
                      const newPreviews = validFiles.map((file) => URL.createObjectURL(file));
                      setNewImagePreviews((prev) => [...prev, ...newPreviews]);
                      e.target.value = "";
                    }
                  }}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 border-dashed border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-blue-600 font-medium"
                  onClick={() => document.getElementById("additional-images")?.click()}
                  disabled={mutation.isPending}
                >
                  <Plus size={16} className="mr-1.5" />
                  Add Images
                </Button>
              </div>
            </div>

            {/* Image Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {/* Existing saved images */}
              {(initialData as any)?.images && (initialData as any).images.map((img: any) => (
                <div key={img.id} className="group relative aspect-square rounded-lg border border-gray-100 overflow-hidden bg-gray-50 hover:border-blue-200 transition-all duration-300 shadow-sm">
                  <img
                    src={`${import.meta.env.VITE_BACKEND_URL}${img.url}?t=${Date.now()}`}
                    alt="Product"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="h-7 w-7 rounded-full shadow-lg scale-90 group-hover:scale-100 transition-transform"
                      onClick={async () => {
                        try {
                          await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/products/${productId}/images/${img.id}`, {
                            method: "DELETE",
                            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                          });
                          queryClient.invalidateQueries({ queryKey: ["product", productId] });
                        } catch {
                          toast.error("Failed to delete image");
                        }
                      }}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                  <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-white/90 backdrop-blur-sm border border-gray-100 rounded text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Saved
                  </div>
                </div>
              ))}

              {/* New image previews */}
              {newImagePreviews.map((src, idx) => (
                <div key={`new-${idx}`} className="group relative aspect-square rounded-lg border border-dashed border-blue-200 overflow-hidden bg-blue-50/30 hover:border-blue-400 transition-all duration-300 shadow-sm">
                  <img src={src} alt={`New upload ${idx + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="h-7 w-7 rounded-full shadow-lg scale-90 group-hover:scale-100 transition-transform"
                      onClick={() => {
                        setNewImagePreviews(p => p.filter((_, i) => i !== idx));
                        setNewImageFiles(f => f.filter((_, i) => i !== idx));
                      }}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                  <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-blue-600 border border-blue-500 rounded text-[10px] font-bold text-white uppercase tracking-wider">
                    New
                  </div>
                </div>
              ))}

              {/* Empty placeholder */}
              {!((initialData as any)?.images?.length > 0 || newImageFiles.length > 0) && (
                <div
                  className="aspect-square flex flex-col items-center justify-center gap-2 border border-dashed border-gray-200 rounded-lg bg-gray-50 text-gray-400 hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50 transition-all cursor-pointer group"
                  onClick={() => document.getElementById("additional-images")?.click()}
                >
                  <ImageIcon size={24} className="group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-medium">Add Gallery</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 p-2.5 bg-blue-50/50 rounded-lg border border-blue-100 border-l-4 border-l-blue-400">
              <Info size={14} className="text-blue-500 shrink-0" />
              <p className="text-[11px] text-blue-700 leading-tight">
                <span className="font-bold uppercase tracking-wider mr-1">Guidelines:</span>
                Max 5MB per image. High-quality JPG, PNG, and WebP are supported for best results.
              </p>
            </div>
          </div>

          {/* Primary Attachment Section */}
          <div className="md:col-span-2 pt-4 border-t border-gray-100">
            <Label className="text-(sm) font-semibold mb-3 block text-gray-700">Cover Image</Label>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="w-full md:w-32 lg:w-40">
                <div className="group relative aspect-square rounded-xl border border-gray-100 overflow-hidden bg-gray-50 hover:border-blue-200 transition-all duration-300 shadow-sm">
                  {currentAttachmentPreview ? (
                    <>
                      <img
                        src={currentAttachmentPreview}
                        alt="Primary Preview"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-8 rounded-full shadow-lg font-medium text-xs px-3"
                          onClick={() => {
                            setCurrentAttachmentPreview(null);
                            setAttachmentFileName("");
                            form.setValue("attachmentUrl", null, { shouldDirty: true });
                          }}
                        >
                          <Trash2 size={13} className="mr-1.5" /> Remove
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400 py-6">
                      <Upload size={32} strokeWidth={1.5} className="mb-0.5" />
                      <span className="text-xs font-medium">No Photo</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 w-full space-y-3">
                <div
                  className="relative flex items-center justify-center w-full min-h-[100px] border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 hover:bg-white hover:border-blue-400 transition-all cursor-pointer group"
                  onClick={() => document.getElementById("primary-image-input")?.click()}
                >
                  <div className="flex flex-col items-center gap-2 p-4 text-center">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                      <Upload size={20} />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-gray-700">
                        {attachmentFileName ? "Change Cover" : "Upload Main Image"}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {attachmentFileName || "Recommend high quality JPG/PNG"}
                      </p>
                    </div>
                  </div>
                  <input
                    id="primary-image-input"
                    type="file"
                    className="hidden"
                    accept={ACCEPTED_IMAGE_TYPES.join(",")}
                    {...register("attachmentUrl", {
                      onChange: (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > MAX_FILE_SIZE) {
                            toast.error("File size too large (max 5MB)");
                            e.target.value = "";
                            return;
                          }
                          setAttachmentFileName(file.name);
                          setCurrentAttachmentPreview(URL.createObjectURL(file));
                        }
                      },
                    })}
                  />
                </div>

                <div className="flex items-start gap-2.5 p-3 bg-amber-50/50 rounded-lg border border-amber-100 border-l-4 border-l-amber-400 text-amber-900 shadow-sm transition-all hover:bg-amber-50">
                  <Lightbulb className="mt-0.5 shrink-0 text-amber-600" size={16} />
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700">Expert Tip</p>
                    <p className="text-[11px] leading-relaxed opacity-90 font-medium">The cover image is your first impression. Crisp, well-lit photos can significantly improve engagement and sales conversion.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Variants Section */}
      {/* <div className="space-y-6">
        <h3 className="text-lg font-medium border-b pb-2">Product Variants</h3>
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid grid-cols-1 md:grid-cols-6 gap-3 p-4 border rounded-md relative"
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={() => remove(index)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
              <div className="space-y-1">
                <Label>Variant Name</Label>
                <Input
                  {...register(`variants.${index}.name`)}
                  placeholder="Variant Name"
                  className="w-full"
                  disabled={mutation.isPending}
                />
                {errors.variants?.[index]?.name && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.variants?.[index]?.name?.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label>HSN Code</Label>
                <Input
                  {...register(`variants.${index}.hsnCode`)}
                  placeholder="HSN Code"
                  className="w-full"
                  disabled={mutation.isPending}
                />
              </div>
              <div className="space-y-1">
                <Label>MRP</Label>
                <Input
                  type="number"
                  {...register(`variants.${index}.mrp`)}
                  placeholder="MRP"
                  className="w-full"
                  disabled={mutation.isPending}
                />
                {errors.variants?.[index]?.mrp && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.variants?.[index]?.mrp?.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Selling Price</Label>
                <Input
                  type="number"
                  {...register(`variants.${index}.sellingPrice`)}
                  placeholder="95.00"
                  disabled={mutation.isPending}
                />
                {errors.variants?.[index]?.sellingPrice && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.variants[index].sellingPrice.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Purchase Price</Label>
                <Input
                  type="number"
                  {...register(`variants.${index}.purchasePrice`)}
                  placeholder="80.00"
                  disabled={mutation.isPending}
                />
                {errors.variants?.[index]?.purchasePrice && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.variants[index].purchasePrice.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label>GST Rate (%)</Label>
                <Input
                  type="number"
                  {...register(`variants.${index}.gstRate`)}
                  placeholder="GST Rate"
                  className="w-full"
                  disabled={mutation.isPending}
                />
                {errors.variants?.[index]?.gstRate && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.variants?.[index]?.gstRate?.message}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            append({
              mrp: 0,
              sellingPrice: 0,
              purchasePrice: 0,
              gstRate: 0,
              name: "",
            })
          }
          disabled={mutation.isPending}
        >
          + Add Variant
        </Button>
      </div> */}

      {/* Form Actions */}
      <div className="flex justify-end space-x-4 pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => onSuccess?.()}
          disabled={mutation.isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending || (!isDirty && newImageFiles.length === 0)}>
          {mutation.isPending ? (
            <LoaderCircle className="animate-spin mr-2" />
          ) : null}
          {mode === "create" ? "Create Product" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
};

export default ProductForm;
