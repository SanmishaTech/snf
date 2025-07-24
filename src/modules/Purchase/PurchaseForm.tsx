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
import { formatCurrency } from "@/lib/formatter";

// --------------------------- Schema ----------------------------------------
const purchaseSchema = z.object({
  purchaseNo: z.string().optional(),
  purchaseDate: z.date(),
  invoiceNo: z.string().min(1, "Invoice number is required"),
  invoiceDate: z.date(),
  vendorId: z.string().min(1, "Vendor is required"),
  depotId: z.string().min(1, "Depot is required"),
  notes: z.string().optional(),
  purchaseDetails: z
    .array(
      z.object({
        productId: z.string().min(1, "Product is required"),
        variantId: z.string().min(1, "Variant is required"),
        quantity: z.number().min(1, "Quantity must be at least 1"),
        purchaseRate: z.number().min(0, "Rate must not be negative"),
      })
    )
    .min(1, "Add at least one line item"),
});

export type PurchaseFormData = z.infer<typeof purchaseSchema>;

interface PurchaseFormProps {
  mode: "create" | "edit";
  purchaseId?: string;
  initialData?: Partial<PurchaseFormData>;
  onSuccess?: () => void;
}

// --------------------------- Types -----------------------------------------
interface Product {
  id: number;
  name: string;
  unit?: string;
}
// Depot–specific variant (DepotProductVariant)
interface DepotVariant {
  id: number;           // depotProductVariant ID
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
const PurchaseForm: React.FC<PurchaseFormProps> = ({
  mode,
  purchaseId,
  initialData,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Logged-in user information (parsed once at component start)
  const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const loggedUser: { role?: string; depotId?: number } | null = storedUser ? JSON.parse(storedUser) : null;

  console.log("PurchaseForm initial data", initialData);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      purchaseNo: mode === "edit" ? initialData?.purchaseNo : "",
      purchaseDate:
        mode === "edit" && initialData?.purchaseDate
          ? new Date(initialData.purchaseDate)
          : new Date(),
      invoiceNo: initialData?.invoiceNo || "",
      invoiceDate:
        mode === "edit" && initialData?.invoiceDate
          ? new Date(initialData.invoiceDate)
          : new Date(),
      vendorId: initialData?.vendorId ? String(initialData.vendorId) : "",
      depotId:
        mode === "edit" && initialData?.depotId
          ? String(initialData.depotId)
          : loggedUser?.depotId
          ? String(loggedUser.depotId)
          : "",
      notes: initialData?.notes || "",
      purchaseDetails:
        mode === "edit" && initialData?.purchaseDetails?.length
          ? initialData.purchaseDetails.map((d) => ({
              productId: String(d.productId),
              variantId: String(d.variantId),
              quantity: d.quantity,
              purchaseRate: d.purchaseRate,
            }))
          : [
              {
                productId: "",
                variantId: "",
                quantity: 1,
                purchaseRate: 0,
              },
            ],
    },
  });

  // Lookup data --------------------------------------------------------------
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<DepotVariant[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [depots, setDepots] = useState<Depot[]>([]);

  // When depots list is fetched, prefill depotId if it is still empty
  useEffect(() => {
    const currentDepotId = watch("depotId");
    if (!currentDepotId) {
      if (loggedUser?.depotId) {
        setValue("depotId", String(loggedUser.depotId));
      } else if (depots.length) {
        setValue("depotId", String(depots[0].id));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depots, loggedUser?.depotId]);

  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  
  useEffect(() => {
    (async () => {
      try {
        const prodRes = await get("/products");
        setProducts(prodRes?.data || prodRes || []);
        // Variants will be fetched separately based on selected depot

        const venRes = await get("/vendors?limit=1000");
        setVendors(venRes?.data || venRes || []);
        const depRes = await get("/depots");
        setDepots(depRes?.data || depRes || []);
      } catch {
        toast.error("Failed to fetch reference data");
      }
    })();
  }, []);

  // -------------------------------------------------------------------------
  // Fetch depot variants whenever depotId changes (and on mount if preset)
  // -------------------------------------------------------------------------
  const selectedDepotId = watch("depotId");
  // Use loggedUser.depotId when present (DepotAdmin) otherwise the selected form value
  const variantsDepotId = loggedUser?.depotId ?? selectedDepotId;
  useEffect(() => {
    if (!variantsDepotId) {
      setVariants([]);
      return;
    }
    (async () => {
      try {
        const res = await get(`/depot-product-variants?depotId=${variantsDepotId}&limit=1000`);
        setVariants(res?.data || res || []);
      } catch {
        toast.error("Failed to fetch depot variants");
      }
    })();
  }, [variantsDepotId, loggedUser?.depotId]); // Added loggedUser?.depotId to the dependency array

  // Field array --------------------------------------------------------------
  const { fields, append, remove } = useFieldArray({
    control,
    name: "purchaseDetails",
  });

  // Totals -------------------------------------------------------------------
  const details = watch("purchaseDetails");
  const grandTotal = details.reduce(
    (acc, item) => acc + (item.purchaseRate || 0) * (item.quantity || 0),
    0
  );

  // Mutation -----------------------------------------------------------------
  const mutation = useMutation({
    mutationFn: async (data: PurchaseFormData) => {
      if (mode === "edit" && purchaseId) {
        return put(`/purchases/${purchaseId}`, data);
      }
      return post("/purchases", data);
    },
    onSuccess: () => {
      toast.success("Purchase saved");
      qc.invalidateQueries({ queryKey: ["purchases"] });
      navigate("/admin/purchases");
      onSuccess?.();
    },
    onError: (e: any) => toast.error(e.message || "Error saving purchase"),
  });

  const onSubmit: SubmitHandler<PurchaseFormData> = (data) => {
    if (loggedUser?.role === 'DepotAdmin') {
      data.depotId = String(loggedUser?.depotId);
    }
    mutation.mutate(data);
  };

  // --------------------------- UI ------------------------------------------
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle>Purchase Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mode === "edit" && (
              <div>
                <Label className="mb-2">Purchase No</Label>
                <Input disabled {...register("purchaseNo")} />
              </div>
            )}
            <Controller
              control={control}
              name="purchaseDate"
              render={({ field }) => (
                <ControlledCalendar
                  id="purchaseDate"
                  label="Purchase Date"
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
            <CardTitle>Farmer & Depot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Controller
              control={control}
              name="vendorId"
              render={({ field }) => (
                <div>
                  <Label className="mb-2">Farmer</Label>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Farmer" />
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
                  <Select value={field.value} onValueChange={field.onChange}
                    disabled={loggedUser?.role === 'DepotAdmin'}>
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
              append({ productId: "", variantId: "", quantity: 1, purchaseRate: 0 })
            }
          >
            <Plus className="mr-2 size-4" /> Add Item
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {fields.map((field, idx) => {
              const selectedProductId = details[idx]?.productId;
              // Removed depotId filter
              const variantsForProduct = variants.filter(
                (v) => String(v.productId) === selectedProductId
              );
              const lineTotal =
                (details[idx]?.purchaseRate || 0) * (details[idx]?.quantity || 0);

              return (
                <div
                  key={field.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border rounded-md items-end"
                >
                  {/* Product */}
                  <div className="md:col-span-3">
                    <Label className="mb-2">Product</Label>
                    <Controller
                      control={control}
                      name={`purchaseDetails.${idx}.productId`}
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
                    <Label className="mb-2">Variant</Label>
                    <Controller
                      control={control}
                      name={`purchaseDetails.${idx}.variantId`}
                      render={({ field: vField }) => (
                        <Select
                          value={vField.value}
                          onValueChange={(val) => {
                            vField.onChange(val);
                            const selected = variantsForProduct.find((v) => String(v.id) === val);
                            if (selected && selected.purchasePrice != null) {
                              setValue(
                                `purchaseDetails.${idx}.purchaseRate`,
                                Number(selected.purchasePrice)
                              );
                            }
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
                    <Label className="mb-2">Quantity</Label>
                    <Input
                      type="number"
                      {...register(`purchaseDetails.${idx}.quantity`, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>

                  {/* Rate */}
                  <div className="md:col-span-2">
                    <Label className="mb-2">Rate</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...register(`purchaseDetails.${idx}.purchaseRate`, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>

                  {/* Total & Delete */}
                  <div className="md:col-span-2 flex items-end justify-between gap-2">
                    <div>
                      <Label className="mb-2">Total</Label>
                      <p className="font-medium h-10 flex items-center">
                        {formatCurrency(lineTotal)}
                      </p>
                    </div>
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
                            This will remove the selected line item from the purchase.
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
          {errors.purchaseDetails && (
            <p className="text-sm text-red-600 mt-2">
              {"message" in errors.purchaseDetails
                ? (errors.purchaseDetails as any).message
                : null}
            </p>
          )}
          <div className="text-right font-semibold mt-4">
            Grand Total: {formatCurrency(grandTotal)}
          </div>
        </CardContent>
      </Card>

      <div className="text-right">
        <Button type="submit" disabled={mutation.isPending}>
          Save Purchase
        </Button>
      </div>
    </form>
  );
};

export default PurchaseForm;
