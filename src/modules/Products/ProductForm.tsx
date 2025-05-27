import React, { useEffect } from "react";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LoaderCircle, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { post, put } from "@/services/apiService";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  url: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().url({ message: "Invalid URL format" }).optional().nullable()
  ),
  price: z.coerce.number().positive({ message: "Price must be a positive number" }),
  unit: z.string().optional().nullable(),
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

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormInputs>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      url: null, // Consistent with schema optional().nullable()
      price: undefined, // Zod schema expects number; undefined is a valid 'empty' state for a number field
      unit: null,    // Consistent with schema optional().nullable()
    },
  });

  // Effect to reset form when initialData changes (e.g., for edit mode)
  useEffect(() => {
    if (initialData) {
      // Ensure that all form fields are in the expected format (e.g., strings for text inputs)
      const formDataToReset = {
        name: initialData.name || "",
        url: initialData.url || null, // Handled by preprocess in Zod schema
        price: initialData.price != null ? Number(initialData.price) : undefined, // Ensure price is number or undefined
        unit: initialData.unit || null, // Handled by preprocess or optional in Zod schema
      };
      reset(formDataToReset);
    } else if (mode === 'create') {
      // Ensure form is cleared for create mode if initialData is not present
      reset({
        name: "",
        url: null,
        price: undefined,
        unit: null,
      });
    }
  }, [initialData, mode, reset]);

  const mutation = useMutation<
    any,
    Error,
    ProductFormInputs
  >({
    mutationFn: async (data: ProductFormInputs) => {
      const payload = {
        ...data,
      };
      if (mode === "create") {
        return await post("/products", payload);
      } else {
        if (!productId) throw new Error("Product ID is required for update.");
        return await put(`/products/${productId}`, payload);
      }
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
    // data.price is now already a number due to z.coerce.number()
    mutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn("space-y-6", className)}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Product Name</Label>
          <Input
            id="name"
            type="text"
            
            {...register("name")}
            disabled={isSubmitting || mutation.isPending}
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="url">Product URL (Optional)</Label>
          <Input
            id="url"
            type="text"
            
            {...register("url")}
            disabled={isSubmitting || mutation.isPending}
          />
          {errors.url && <p className="text-red-500 text-xs mt-1">{errors.url.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="price">Price</Label>
          <Input
            id="price"
            type="number"
            
            {...register("price")}
            disabled={isSubmitting || mutation.isPending}
          />
          {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
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
      </div>

      {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            
            {...register("quantity")}
            disabled={isSubmitting || mutation.isPending}
          />
          {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity.message}</p>}
        </div>
      </div> */}

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
