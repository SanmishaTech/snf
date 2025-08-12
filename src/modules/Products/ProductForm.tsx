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
import { LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { post, put } from "@/services/apiService";
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
  const [currentAttachmentPreview, setCurrentAttachmentPreview] = useState<
    string | null
  >(null);
  const [attachmentFileName, setAttachmentFileName] = useState<string>("");

  const form = useForm<ProductFormInputs>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      isDairyProduct: false,
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
        maintainStock: initialData.maintainStock || false,
        variants: initialData.variants || [],
        categoryId: (initialData as any).categoryId || null,
      };
      reset(resetValues as any);
      if ((initialData as any).attachmentUrl) {
        const initialurl = `${import.meta.env.VITE_BACKEND_URL}${
          initialData?.attachmentUrl
        }`;
        setCurrentAttachmentPreview(initialurl);
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
    { productData: FormData; variants: ProductVariantDto[] }
  >({
    mutationFn: async ({ productData, variants }) => {
      // Step 1: Create or Update the product
      const endpoint =
        mode === "create" ? "/products" : `/products/${productId}`;
      const method = mode === "create" ? post : put;
      if (mode === "edit" && !productId)
        throw new Error("Product ID is required for update.");

      const productResult = await method(endpoint, productData);
      const returnedProductId = productResult?.id || productId;

      if (!returnedProductId) throw new Error("Failed to get product ID.");

      // Step 2: Bulk update the variants for that product
      if (variants && variants.length > 0) {
        await bulkUpdateVariants(returnedProductId, variants);
      }

      return productResult;
    },
    onSuccess: (data) => {
      toast.success(
        `Product ${mode === "create" ? "created" : "updated"} successfully!`
      );
      queryClient.invalidateQueries({ queryKey: ["products"] });
      const returnedId = data?.id || productId;
      if (returnedId) {
        queryClient.invalidateQueries({ queryKey: ["product", returnedId] });
      }
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

    mutation.mutate({ productData: formData, variants: data.variants || [] });
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

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="attachmentUrl">Product Image</Label>
            <Input
              id="attachmentUrl"
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              {...register("attachmentUrl", {
                onChange: (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const previewUrl = URL.createObjectURL(file);
                    setCurrentAttachmentPreview(previewUrl);
                    setAttachmentFileName(file.name);
                  } else {
                    setCurrentAttachmentPreview(null);
                    setAttachmentFileName("");
                  }
                },
              })}
              disabled={mutation.isPending}
            />
            {attachmentFileName && (
              <p className="text-xs text-gray-500 mt-1">
                Selected: {attachmentFileName}
              </p>
            )}
            {errors.attachmentUrl && (
              <p className="text-red-500 text-xs mt-1">
                {errors.attachmentUrl.message as string}
              </p>
            )}
            {currentAttachmentPreview && (
              <div className="mt-4 relative w-48 h-48 border rounded-md overflow-hidden">
                <img
                  src={currentAttachmentPreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-1 right-1 h-6 w-6 p-0"
                  onClick={() => {
                    setCurrentAttachmentPreview(null);
                    setAttachmentFileName("");
                    form.setValue("attachmentUrl", null, { shouldDirty: true });
                  }}
                >
                  X
                </Button>
              </div>
            )}
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
        <Button type="submit" disabled={mutation.isPending || !isDirty}>
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
