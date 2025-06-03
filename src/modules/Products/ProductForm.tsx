import React, { useEffect } from "react";
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css'; // Import Quill styles
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { post, put } from "@/services/apiService";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  price: z.coerce.number().positive({ message: "Price must be a positive number" }),
  rate: z.coerce.number().positive({ message: "Rate must be a positive number" }),
  unit: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  attachmentUrl: z
    .instanceof(FileList)
    .optional()
    .nullable()
    .refine((files) => !files || files.length === 0 || files[0].size <= MAX_FILE_SIZE, `Max image size is 5MB.`)
    .refine(
      (files) => !files || files.length === 0 || ACCEPTED_IMAGE_TYPES.includes(files[0].type),
      "Only .jpg, .jpeg, .png, .webp and .gif formats are supported."
    ),
});

export type ProductFormInputs = z.infer<typeof productSchema>;

export interface ProductFormProps {
  mode: "create" | "edit";
  productId?: string;
  initialData?: Partial<ProductFormInputs>;
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
  const [currentAttachmentPreview, setCurrentAttachmentPreview] = React.useState<string | null>(null);
  const [attachmentFileName, setAttachmentFileName] = React.useState<string>("");

  const {
    register,
    handleSubmit,
    reset,
    control, // Added for Controller
    formState: { errors, isSubmitting },
  } = useForm<ProductFormInputs>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      price: undefined,
      rate: undefined,
      unit: null,
      description: "",
      attachmentUrl: null,
    },
  });

  useEffect(() => {
    if (initialData) {
      const resetValues: Partial<ProductFormInputs & { attachmentUrl_existing?: string }> = {
        name: initialData.name || "",
        price: initialData.price !== undefined ? Number(initialData.price) : undefined,
        rate: initialData.rate !== undefined ? Number(initialData.rate) : undefined,
        unit: initialData.unit || null,
        description: (initialData as any).description || "",
      };
      reset(resetValues as any); // Cast as any because attachmentUrl is FileList in form but string in initialData
      if ((initialData as any).attachmentUrl) {
        const initialurl = `${import.meta.env.VITE_BACKEND_URL}${initialData?.attachmentUrl}`
        setCurrentAttachmentPreview(initialurl);
      } else {
        setCurrentAttachmentPreview(null);
      }
      setAttachmentFileName("");
    } else if (mode === 'create') {
      reset({
        name: "",
        price: undefined,
        rate: undefined,
        unit: null,
        description: "",
        attachmentUrl: null,
      });
      setCurrentAttachmentPreview(null);
      setAttachmentFileName("");
    }
  }, [initialData, mode, reset]);

  const mutation = useMutation<
    any,
    Error,
    ProductFormInputs
  >({
    mutationFn: async (data: ProductFormInputs) => {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("price", String(data.price)); // Ensure price is string for FormData
      formData.append("rate", String(data.rate));   // Ensure rate is string for FormData
      if (data.unit) {
        formData.append("unit", data.unit);
      }
      if (data.description) {
        formData.append("description", data.description);
      }
      // Append other text fields from 'data' as needed, e.g., 'url' if it exists in your schema for product
      // Assuming 'url' is part of ProductFormInputs if it's a general purpose URL field for the product
      // For this example, let's assume 'url' is not part of ProductFormInputs or is handled elsewhere.
      // If you have a general 'url' field for the product distinct from 'attachmentUrl':
      // if (data.url) { formData.append("url", data.url); }

      // Handle file attachment
      if (data.attachmentUrl && data.attachmentUrl.length > 0) {
        formData.append("productAttachment", data.attachmentUrl[0], data.attachmentUrl[0].name);
      } else {
        // No new file selected. Check if we need to signal removal of existing attachment.
        if (initialData?.attachmentUrl && currentAttachmentPreview === null) {
          // An attachment existed, and user cleared the preview (wants to remove)
          formData.append("attachmentUrl", ""); // Signal backend to clear this field
        }
        // If an attachment existed and preview is still there, or no attachment ever existed,
        // do nothing here; backend will keep existing or leave as null.
      }

      // DEBUG: Log FormData entries
      console.log("Frontend FormData entries before sending:");
      for (const pair of formData.entries()) {
        console.log(pair[0] + ": ", pair[1]);
      }

      const endpoint = mode === "create" ? "/products" : `/products/${productId}`;
      const method = mode === "create" ? post : put;

      if (mode === "edit" && !productId) {
        throw new Error("Product ID is required for update.");
      }

      return await method(endpoint, formData);
    },
    onSuccess: () => {
      toast.success(`Product ${mode === "create" ? "created" : "updated"} successfully!`);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      if (productId) {
        queryClient.invalidateQueries({ queryKey: ["product", productId] });
      }
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.message || error.message || "An unexpected error occurred";
      toast.error(`Failed to ${mode} product: ${errorMsg}`);
    },
  });

  const onSubmit: SubmitHandler<ProductFormInputs> = (data) => {
    mutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn("space-y-6", className)}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="name">Product Name</Label>
          <Input
            id="name"
            type="text"
            {...register("name")}
            disabled={isSubmitting || mutation.isPending}
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
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
                readOnly={isSubmitting || mutation.isPending}
                placeholder="Enter product description (optional)"
                modules={{
                  toolbar: [
                    [{ 'header': '1'}, {'header': '2'}, { 'font': [] }],
                    [{size: []}],
                    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                    [{'list': 'ordered'}, {'list': 'bullet'}, 
                     {'indent': '-1'}, {'indent': '+1'}],
                    ['link', 'image'], // 'image' and 'video' can be added if needed
                    ['clean']
                  ],
                }}
                formats={[
                  'header', 'font', 'size',
                  'bold', 'italic', 'underline', 'strike', 'blockquote',
                  'list', 'bullet', 'indent',
                  'link', 'image'
                ]}
                style={{ backgroundColor: (isSubmitting || mutation.isPending) ? '#f3f4f6' : 'white' }} // Optional: style to indicate readOnly
              />
            )}
          />
          {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">Purchase Price</Label>
          <Input
            id="price"
            type="number"
            step="any" // Allow decimal inputs
            {...register("price")}
            disabled={isSubmitting || mutation.isPending}
          />
          {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="rate">Selling Price</Label>
          <Input
            id="rate"
            type="number"
            step="any" // Allow decimal inputs
            {...register("rate")}
            disabled={isSubmitting || mutation.isPending}
          />
          {errors.rate && <p className="text-red-500 text-xs mt-1">{errors.rate.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="unit">Unit (e.g., kg, pcs, ltr)</Label>
          <Input
            id="unit"
            type="text"
            {...register("unit")}
            disabled={isSubmitting || mutation.isPending}
          />
          {errors.unit && <p className="text-red-500 text-xs mt-1">{errors.unit.message}</p>}
        </div>

        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="attachmentUrl">Product Image</Label>
          <Input
            id="attachmentUrl"
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            {...register("attachmentUrl", {
              onChange: (e) => {
                if (e.target.files && e.target.files[0]) {
                  setAttachmentFileName(e.target.files[0].name);
                } else {
                  setAttachmentFileName("");
                }
              }
            })}
            disabled={isSubmitting || mutation.isPending}
          />
          <p className="text-sm text-muted-foreground mt-1">
            Recommended: Landscape image (e.g., 4:3 aspect ratio, like 3179x4239 pixels)
          </p>
          {attachmentFileName && !errors.attachmentUrl && <p className="text-xs text-muted-foreground mt-1">Selected: {attachmentFileName}</p>}
          {errors.attachmentUrl && <p className="text-red-500 text-xs mt-1">{errors.attachmentUrl.message as string}</p>}
        </div>
      </div> {/* End of grid */} 

      {currentAttachmentPreview && (
        <div className="mt-4">
          <p className="text-sm font-medium mb-1">Image Preview:</p>
          <img src={currentAttachmentPreview} alt="Current attachment" className="h-32 w-auto object-contain rounded border" />
          <Button 
            type="button" 
            variant="link" 
            size="sm" 
            className="text-red-600 hover:text-red-800 px-0 pt-1"
            onClick={() => {
              setCurrentAttachmentPreview(null); 
              setAttachmentFileName("");
              reset(prev => ({...prev, attachmentUrl: null})); 
            }}>
            Remove Image
          </Button>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={isSubmitting || mutation.isPending} className="min-w-[120px]">
          {isSubmitting || mutation.isPending ? (
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {mode === "create" ? "Create Product" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
};

export default ProductForm;
