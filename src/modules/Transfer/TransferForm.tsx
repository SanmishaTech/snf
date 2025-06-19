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
const createTransferSchema = (isDepotUser: boolean) =>
  z
    .object({
      transferDate: z.date(),
      fromDepotId: isDepotUser
        ? z.string().optional()
        : z.string().min(1, "Origin depot is required"),
      toDepotId: z.string().min(1, "Destination depot is required"),
      notes: z.string().optional(),
      details: z
        .array(
          z.object({
            fromDepotVariantId: z.string().min(1, "Source variant is required"),
            toDepotVariantId: z
              .string()
              .min(1, "Destination variant is required"),
            quantity: z.number().min(1, "Quantity must be at least 1"),
          })
        )
        .min(1, "Add at least one line item"),
    })
    .refine((data) => data.fromDepotId !== data.toDepotId, {
      message: "Origin and destination depots cannot be the same",
      path: ["toDepotId"],
    });

// Create a schema for type inference purposes
const transferSchemaForType = createTransferSchema(true);
export type TransferFormData = z.infer<typeof transferSchemaForType>;

interface TransferFormProps {
  mode: "create" | "edit";
  transferId?: string;
  initialData?: Partial<TransferFormData>;
  onSuccess?: () => void;
}

// --------------------------- Types -----------------------------------------
interface DepotVariant {
  id: number; // depotProductVariant ID
  name: string;
  productId: number;
  productName: string;
  closingStock: number;
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

  useEffect(() => {
    setInputValue(formatDate(value));
    if (isValidDate(value)) setMonth(value);
  }, [value]);

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
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            >
              <CalendarIcon className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={value}
              onSelect={(d) => {
                onChange(d);
                setOpen(false);
              }}
              initialFocus
              month={month}
              onMonthChange={setMonth}
              fromDate={fromDate}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

// --------------------------- Component -------------------------------------
const TransferForm: React.FC<TransferFormProps> = ({
  mode,
  transferId,
  initialData,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  // Retrieve logged-in user info from localStorage (set during authentication)
  const storedUser = localStorage.getItem("user");
  const loggedInUser: { role?: string; depotId?: number } | null = storedUser ? JSON.parse(storedUser) : null;
  const isDepotUser = loggedInUser?.role?.toLowerCase().includes("depot") ?? false;
  const userDepotId = loggedInUser?.depotId ? String(loggedInUser.depotId) : "";

  const [depots, setDepots] = useState<Depot[]>([]);
  const [fromDepotVariants, setFromDepotVariants] = useState<DepotVariant[]>([]);
  const [toDepotVariants, setToDepotVariants] = useState<DepotVariant[]>([]);

  const {
    control,
    handleSubmit,
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TransferFormData>({
    resolver: zodResolver(createTransferSchema(isDepotUser)),
    defaultValues: {
      transferDate: new Date(),
      details: [{ fromDepotVariantId: "", toDepotVariantId: "", quantity: 1 }],
      ...initialData,
      fromDepotId: isDepotUser ? userDepotId : (initialData?.fromDepotId || ""),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "details",
  });

  const fromDepotId = watch("fromDepotId");
  const toDepotId = watch("toDepotId");



  // Filter depots so that destination options never include the origin depot
  const destinationDepots = depots.filter((d) => String(d.id) !== fromDepotId);

  // If user selected same depot for both, clear destination selection
  useEffect(() => {
    if (fromDepotId && fromDepotId === toDepotId) {
      setValue("toDepotId", "");
    }
  }, [fromDepotId, toDepotId, setValue]);

  useEffect(() => {
    const fetchDepots = async () => {
      try {
        const depotsResponse = await get("/depots");
        setDepots(depotsResponse.data || []);
      } catch (error) {
        console.error("Failed to fetch depots", error);
        toast.error("Failed to load depots.");
      }
    };
    fetchDepots();
  }, []);

  useEffect(() => {
    if (!fromDepotId) {
      setFromDepotVariants([]);
      // Clear existing selections related to fromDepot
      fields.forEach((_, idx) => {
        setValue(`details.${idx}.fromDepotVariantId`, "");
        setValue(`details.${idx}.toDepotVariantId`, "");
      });
      return;
    }
    const fetchVariants = async () => {
      try {
        const response = await get(`/depot-product-variants?depotId=${fromDepotId}&include=product,stock`);
        const variantsData = (response.data || []).map((v: any) => ({
          id: v.id,
          name: v.name,
          productId: v.productId,
          productName: v.product ? v.product.name : 'N/A',
          closingStock: v.closingQty ?? 0,
        }));
        setFromDepotVariants(variantsData);
      } catch (error) {
        console.error("Failed to fetch source variants", error);
        toast.error("Failed to load variants for the source depot.");
        setFromDepotVariants([]);
      }
    };
    fetchVariants();
  }, [fromDepotId]);

  useEffect(() => {
    if (!toDepotId) {
      setToDepotVariants([]);
      // Clear destination variant selections when depot changes
      fields.forEach((_, idx) => {
        setValue(`details.${idx}.toDepotVariantId`, "");
      });
      return;
    }
    const fetchVariants = async () => {
      try {
        const response = await get(`/depot-product-variants?depotId=${toDepotId}&include=product,stock`);
       
        const raw = Array.isArray(response.data)
        ? response.data                    // array at top level
        : response.data?.data || [];     
        const variantsData = raw?.map((v: any) => ({
          id: v.id,
          name: v.name,
          productId: v.productId,
          productName: v.product ? v.product.name : 'N/A',
          closingStock: v.closingQty ?? 0,
        }));
        setToDepotVariants(variantsData);
      } catch (error) {
        console.error("Failed to fetch destination variants", error);
        toast.error("Failed to load variants for the destination depot.");
        setToDepotVariants([]);
      }
    };
    fetchVariants();
  }, [toDepotId]);

  // Convert Date object to YYYY-MM-DD string to avoid timezone offset issues when sending to backend
const toApiDate = (d: Date | undefined) =>
  d
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`
    : undefined;

const mutationFn = (data: TransferFormData) => {
    const url = mode === "edit" ? `/transfers/${transferId}` : "/transfers";
    const method = mode === "edit" ? put : post;
    return method(url, {
      ...data,
      // For depot users, the fromDepotId is disabled and not included in form data, so we add it back.
      fromDepotId: isDepotUser ? userDepotId : data.fromDepotId,
      // Send only the date portion to prevent timezone conversion shifting the day
      transferDate: toApiDate(data.transferDate),
      details: data.details.map((d) => ({
        ...d,
        fromDepotVariantId: Number(d.fromDepotVariantId),
        toDepotVariantId: Number(d.toDepotVariantId),
        quantity: Number(d.quantity),
      })),
    });
  };

  const onSuccessMutation = () => {
    queryClient.invalidateQueries({ queryKey: ["transfers"] });
    toast.success(`Transfer ${mode === "edit" ? "updated" : "created"} successfully.`);
    if (onSuccess) onSuccess();
    navigate("/admin/transfers");
  };

  const onError = (e: any) => {
    toast.error(e.response?.data?.message || "An error occurred.");
  };

  const mutation = useMutation({ mutationFn, onSuccess: onSuccessMutation, onError });

  const onSubmit: SubmitHandler<TransferFormData> = (data) => {
    // Additional client-side validation
    for (const item of data.details) {
      const fromVariant = fromDepotVariants.find(v => String(v.id) === item.fromDepotVariantId);
      if (fromVariant && item.quantity > fromVariant.closingStock) {
        toast.error(`Quantity for ${fromVariant.productName} - ${fromVariant.name} exceeds available stock.`);
        return;
      }
    }
    mutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

      <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Controller
            control={control}
            name="transferDate"
            render={({ field }) => (
              <ControlledCalendar
                value={field.value}
                onChange={field.onChange}
                label="Transfer Date"
                id="transferDate"
              />
            )}
          />

          <div className="flex flex-col gap-3">
            <Label>From Depot</Label>
            <Controller
              control={control}
              name="fromDepotId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isDepotUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Origin Depot" />
                  </SelectTrigger>
                  <SelectContent>
                    {depots.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.fromDepotId && (
              <p className="text-sm text-red-600">{errors.fromDepotId.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Label>To Depot</Label>
            <Controller
              control={control}
              name="toDepotId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Destination Depot" />
                  </SelectTrigger>
                  <SelectContent>
                    {destinationDepots.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.toDepotId && (
              <p className="text-sm text-red-600">{errors.toDepotId.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-3 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Items</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({ fromDepotVariantId: "", toDepotVariantId: "", quantity: 1 })
            }
          >
            <Plus className="size-4 mr-2" /> Add Item
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {fields.map((field, idx) => {
              const fromVariantId = watch(`details.${idx}.fromDepotVariantId`);
              const selectedFromVariant = fromDepotVariants.find(v => String(v.id) === fromVariantId);

              const availableToVariants = selectedFromVariant
                ? toDepotVariants.filter(v => v.productId === selectedFromVariant.productId)
                : [];

              return (
                <div
                  key={field.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-4 border p-4 rounded-md"
                >
                  {/* From Depot Variant */}
                  <div className="md:col-span-5">
                    <Label className="mb-2">Source Variant</Label>
                    <Controller
                      control={control}
                      name={`details.${idx}.fromDepotVariantId`}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Source Variant" />
                          </SelectTrigger>
                          <SelectContent>
                            {fromDepotVariants.map((v) => (
                              <SelectItem key={v.id} value={String(v.id)}>
                                {`${v.productName} - ${v.name} (Stock: ${v.closingStock})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  {/* To Depot Variant */}
                  <div className="md:col-span-3">
                    <Label className="mb-2">Destination Variant</Label>
                    <Controller
                      control={control}
                      name={`details.${idx}.toDepotVariantId`}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange} disabled={!selectedFromVariant}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Destination Variant" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableToVariants.map((v) => (
                              <SelectItem key={v.id} value={String(v.id)}>
                                {`${v.productName} - ${v.name} (Stock: ${v.closingStock})`}
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
                            This will remove the selected line item from the transfer.
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
          Save Transfer
        </Button>
      </div>
    </form>
  );
};

export default TransferForm;
