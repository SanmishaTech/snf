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
  url: z.string().url("Invalid URL format").optional().nullable(),
  price: z.string().min(1, "Price is required"),
  date: z.date({ required_error: "Date is required" }),
  quantity: z.coerce.number().int("Quantity must be an integer").min(1, "Quantity must be at least 1"),
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
    defaultValues: initialData || {
      name: "",
      url: "",
      price: "",
      date: new Date(),
      quantity: 1,
    },
  });

  useEffect(() => {
    if (initialData) {
      const dataToReset = {
        name: initialData.name || "",
        ...initialData,
        date: initialData.date ? new Date(initialData.date) : new Date(),
      };
      reset(dataToReset);
    }
  }, [initialData, reset]);

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
       data.price = Number(data.price)
    
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
          <Label htmlFor="date">Date</Label>
          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                    disabled={isSubmitting || mutation.isPending}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {field.value ? format(field.value, "dd/MM/yy") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value) : undefined}
                    onSelect={(date) => field.onChange(date || new Date())}
                    initialFocus
                    disabled={isSubmitting || mutation.isPending}
                  />
                </PopoverContent>
              </Popover>
            )}
          />
          {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
      </div>

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
