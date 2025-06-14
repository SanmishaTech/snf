import React, { useState, useEffect } from "react";
import {
  useForm,
  useFieldArray,
  Controller,
  SubmitHandler,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put } from "@/services/apiService";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// --------------------------- Schema ----------------------------------------
const wastageSchema = z.object({
  wastageNo: z.string().optional(),
  wastageDate: z.date(),
  invoiceNo: z.string().min(1, "Invoice number is required"),
  invoiceDate: z.date(),
  vendorId: z.string().min(1, "Vendor is required"),
  depotId: z.string().min(1, "Depot is required"),
  notes: z.string().optional(),
  details: z
    .array(
      z.object({
        productId: z.string().min(1, "Product is required"),
        variantId: z.string().min(1, "Variant is required"),
        quantity: z.number().min(1, "Quantity must be at least 1"),
      })
    )
    .min(1, "Add at least one line item"),
});

export type WastageFormData = z.infer<typeof wastageSchema>;

interface WastageFormProps {
  mode: "create" | "edit";
  wastageId?: string;
  initialData?: Partial<WastageFormData>;
  onSuccess?: () => void;
}

// --------------------------- Types -----------------------------------------
interface Product {
  id: number;
  name: string;
  unit?: string;
}
interface Variant {
  id: number;
  name: string;
  productId: number;
  purchasePrice?: number;
}
interface Vendor {
  id: number;
  name: string;
}
interface Depot {
  id: number;
  name: string;
}

// --------------------------- Date helpers ----------------------------------
function formatDate(date?: Date) {
  if (!date) return "";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
function isValidDate(date?: Date) {
  return !!date && !isNaN(date.getTime());
}
interface ControlledCalendarProps {
  value: Date | undefined;
  onChange: (d?: Date) => void;
  label: string;
  id: string;
  fromDate?: Date;
}
function ControlledCalendar({
  value,
  onChange,
  label,
  id,
  fromDate,
}: ControlledCalendarProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date | undefined>(value);
  const [inputValue, setInputValue] = useState(formatDate(value));
  const [vendors, setvendors] = useState()
  useEffect(() => {
    setInputValue(formatDate(value));
    if (isValidDate(value)) setMonth(value);
  }, [value]);

  useEffect(()=>{
    const fetchVendor = async() =>{
      const response = await get("/vendors")
       setvendors(response.data)
    }
     fetchVendor()
  },[])


  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative flex gap-2">
        <Input
          id={id}
          value={inputValue}
          placeholder="dd/mm/yyyy"
          className="pr-10"
          onChange={(e) => {
            const raw = e.target.value;
            setInputValue(raw);
            const parsed = new Date(raw);
            if (isValidDate(parsed)) {
              onChange(parsed);
              setMonth(parsed);
            } else onChange(undefined);
          }}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="absolute right-2 top-1/2 -translate-y-1/2 size-6"
              type="button"
            >
              <CalendarIcon className="size-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0">
            <Calendar
              mode="single"
              selected={value}
              month={month}
              captionLayout="dropdown"
              onMonthChange={setMonth}
              fromDate={fromDate}
              onSelect={(d) => {
                onChange(d);
                setInputValue(formatDate(d));
                setOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

// --------------------------- Component -------------------------------------
const WastageForm: React.FC<WastageFormProps> = ({
  mode,
  wastageId,
  initialData,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WastageFormData>({
    resolver: zodResolver(wastageSchema),
    defaultValues: {
      wastageNo: mode === "edit" ? initialData?.wastageNo : "",
      wastageDate:
        mode === "edit" && initialData?.wastageDate
          ? new Date(initialData.wastageDate)
          : new Date(),
      invoiceNo: initialData?.invoiceNo || "",
      invoiceDate:
        mode === "edit" && initialData?.invoiceDate
          ? new Date(initialData.invoiceDate)
          : new Date(),
      vendorId: initialData?.vendorId ? String(initialData.vendorId) : "",
      depotId: initialData?.depotId ? String(initialData.depotId) : "",
      notes: initialData?.notes || "",
      details:
        mode === "edit" && initialData?.details?.length
          ? initialData.details.map((d) => ({
              productId: String(d.productId),
              variantId: String(d.variantId),
              quantity: d.quantity,
            }))
          : [
              {
                productId: "",
                variantId: "",
                quantity: 1,
              },
            ],
    },
  });

  // Lookup data --------------------------------------------------------------
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [depots, setDepots] = useState<Depot[]>([]);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const prodRes = await get("/products");
        setProducts(prodRes?.data || prodRes || []);
        const varRes = await get("/product-variants");
        setVariants(varRes?.data || varRes || []);
        const venRes = await get("/vendors?limit=1000");
        setVendors(venRes?.data || venRes || []);
        const depRes = await get("/depots");
        setDepots(depRes?.data || depRes || []);
      } catch {
        toast.error("Failed to fetch reference data");
      }
    })();
  }, []);

  // Field array --------------------------------------------------------------
  const { fields, append, remove } = useFieldArray({
    control,
    name: "details",
  });

  // Mutation -----------------------------------------------------------------
  const mutation = useMutation({
    mutationFn: async (data: WastageFormData) => {
      const payload: any = {
        ...data,
        details: data.details,
      };
      if (mode === "edit" && wastageId) {
        return put(`/wastages/${wastageId}`, payload);
      }
      return post("/wastages", payload);
    },
    onSuccess: () => {
      toast.success("Wastage saved");
      qc.invalidateQueries({ queryKey: ["wastages"] });
      navigate("/admin/wastages");
      onSuccess?.();
    },
    onError: (e: any) => toast.error(e.message || "Error saving wastage"),
  });

  const onSubmit: SubmitHandler<WastageFormData> = (data) => mutation.mutate(data);

  // --------------------------- UI ------------------------------------------
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle>Wastage Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mode === "edit" && (
              <div>
                <Label className="mb-2">Wastage No</Label>
                <Input disabled {...register("wastageNo")} />
              </div>
            )}
            <Controller
              control={control}
              name="wastageDate"
              render={({ field }) => (
                <ControlledCalendar
                  id="wastageDate"
                  label="Wastage Date"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <div>
              <Label className="mb-2">Invoice No</Label>
              <Input {...register("invoiceNo")}></Input>
              {errors.invoiceNo && (
                <p className="text-xs text-red-600">{errors.invoiceNo.message}</p>
              )}
            </div>
            <Controller
              control={control}
              name="invoiceDate"
              render={({ field }) => (
                <ControlledCalendar
                  id="invoiceDate"
                  label="Invoice Date"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <div>
              <Label className="mb-2">Notes</Label>
              <Textarea rows={3} {...register("notes")} />
            </div>
          </CardContent>
        </Card>

        {/* Vendor & Depot */}
        <Card>
          <CardHeader>
            <CardTitle>Vendor & Depot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Controller
              control={control}
              name="vendorId"
              render={({ field }) => (
                <div>
                  <Label className="mb-2">Vendor</Label>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={String(v.id)}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.vendorId && (
                    <p className="text-xs text-red-600">{errors.vendorId.message}</p>
                  )}
                </div>
              )}
            />
            <Controller
              control={control}
              name="depotId"
              render={({ field }) => (
                <div>
                  <Label className="mb-2 block w-full" htmlFor="depotId">Depot</Label>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select depot" />
                    </SelectTrigger>
                    <SelectContent>
                      {depots.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.depotId && (
                    <p className="text-xs text-red-600">{errors.depotId.message}</p>
                  )}
                </div>
              )}
            />
          </CardContent>
        </Card>
      </div>

      {/* Line items */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Items</CardTitle>
          <Button
            type="button"
            size="sm"
            onClick={() =>
              append({ productId: "", variantId: "", quantity: 1 })
            }
          >
            <Plus className="mr-2 size-4" /> Add Item
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {fields.map((field, idx) => {
              const selectedProductId = watch(`details.${idx}.productId`);
              const variantsForProduct = variants.filter(
                (v) => String(v.productId) === selectedProductId
              );

              return (
                <div
                  key={field.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border rounded-md items-end"
                >
                  {/* Product */}
                  <div className="md:col-span-3">
                    <Label>Product</Label>
                    <Controller
                      control={control}
                      name={`details.${idx}.productId`}
                      render={({ field: pField }) => (
                        <Select value={pField.value} onValueChange={pField.onChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  {/* Variant */}
                  <div className="md:col-span-3">
                    <Label>Variant</Label>
                    <Controller
                      control={control}
                      name={`details.${idx}.variantId`}
                      render={({ field: vField }) => (
                        <Select
                          value={vField.value}
                          onValueChange={(val) => {
                            vField.onChange(val);
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Variant" />
                          </SelectTrigger>
                          <SelectContent>
                            {variantsForProduct.map((v) => (
                              <SelectItem key={v.id} value={String(v.id)}>
                                {v.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  {/* Quantity */}
                  <div className="md:col-span-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      {...register(`details.${idx}.quantity`, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>

                  {/* Delete */}
                  <div className="md:col-span-2 flex items-end justify-between gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button type="button" size="icon" variant="ghost">
                          <Trash2 className="size-4 text-red-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove item?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove the selected line item from the wastage.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(idx)}>
                            Continue
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
          </div>
          {errors.details && (
            <p className="text-sm text-red-600 mt-2">
              {"message" in errors.details
                ? (errors.details as any).message
                : null}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="text-right">
        <Button type="submit" disabled={mutation.isPending}>
          Save Wastage
        </Button>
      </div>
    </form>
  );
};

export default WastageForm;
