import React, { useState, useEffect } from "react";
import { useForm, useFieldArray, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put } from "@/services/apiService";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { LoaderCircle, CalendarIcon, Plus, Trash2, Package, Truck, ShoppingCart, Save, PackageSearch, ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";
import {Textarea } from "@/components/ui/textarea"
import {Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/formatter";

// Schema for order creation
const orderSchema = z.object({
  poNumber: z.string().optional(),
  orderDate: z.date(),
  deliveryDate: z.date(),
  contactPersonName: z.string().min(1, "Contact person name is required"),
  vendorId: z.string().min(1, "Vendor is required"),
  notes: z.string().optional(),
  orderItems: z.array(z.object({
    productId: z.string().min(1, "Product is required"),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    agencyId: z.string().min(1, "Agency is required for each product"), // Simplified: 1 agency per product item
  })).min(1, "At least one product item is required"),
});

type OrderFormData = z.infer<typeof orderSchema>;

interface OrderFormProps {
  mode: "create" | "edit";
  orderId?: string;
  initialData?: Partial<OrderFormData>;
  onSuccess?: () => void;
}

interface Product {
  id: number;
  name: string;
  price: string;
  description?: string;
  unit?: string; // Added to display product unit
}

interface Vendor {
  id: string;
  name: string;
  contactPersonName?: string;
  email: string;
  mobile: string;
}

interface Agency {
  id: string;
  name: string;
}

// Helper functions from user's Calendar28
function formatDate(date: Date | undefined) {
  if (!date) {
    return ""
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function isValidDate(date: Date | undefined) {
  if (!date) {
    return false
  }
  return !isNaN(date.getTime())
}

// Adapted Calendar28 for react-hook-form
interface ControlledCalendar28Props {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  label: string;
  id: string;
  fromDate?: Date;
}

function ControlledCalendar28({ value, onChange, label, id, fromDate }: ControlledCalendar28Props) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date | undefined>(value);
  const [inputValue, setInputValue] = useState(formatDate(value));

  useEffect(() => {
    setInputValue(formatDate(value));
    if (isValidDate(value)) {
        setMonth(value);
    }
  }, [value]);

  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor={id} className="px-1">
        {label}
      </Label>
      <div className="relative flex gap-2">
        <Input
          id={id}
          value={inputValue}
          placeholder="01/06/2025"
          className="bg-background pr-10"
          onChange={(e) => {
            const newInputValue = e.target.value;
            setInputValue(newInputValue);
            const parsedDate = new Date(newInputValue);
            if (isValidDate(parsedDate)) {
              onChange(parsedDate);
              setMonth(parsedDate);
            } else {
              onChange(undefined);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
            }
          }}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
            >
              <CalendarIcon className="size-3.5" />
              <span className="sr-only">Select date</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto overflow-hidden p-0"
            align="end"
            alignOffset={-8}
            sideOffset={10}
          >
            <Calendar
              mode="single"
              selected={value}
              captionLayout="dropdown"
              month={month}
              onMonthChange={setMonth}
              onSelect={(selectedDate) => {
                onChange(selectedDate);
                setInputValue(formatDate(selectedDate));
                setOpen(false);
              }}
              fromDate={fromDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

const OrderForm: React.FC<OrderFormProps> = ({ mode, orderId, initialData, onSuccess }) => {
  const queryClient = useQueryClient();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [orderTotal, setordertotal] = useState()
  const [isFetchingPrefill, setIsFetchingPrefill] = useState<boolean>(false);
  const navigate = useNavigate()

  const { 
    register, 
    control, 
    handleSubmit, 
    setValue, 
    watch, 
    formState: { errors, isSubmitting },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      // Core change: poNumber is empty in create mode, uses initialData in edit mode.
      poNumber: mode === 'create' ? '' : (initialData?.poNumber || ''),

      // Initialize other fields based on mode and initialData
      orderDate: (mode === 'edit' && initialData?.orderDate) ? new Date(initialData.orderDate) : new Date(),
      deliveryDate: (mode === 'edit' && initialData?.deliveryDate) ? new Date(initialData.deliveryDate) : addDays(new Date(), 1),
      contactPersonName: (mode === 'edit' && initialData?.contactPersonName) ? initialData.contactPersonName : '',
      vendorId: (mode === 'edit' && initialData?.vendorId) ? initialData.vendorId : '',
      notes: (mode === 'edit' && initialData?.notes) ? initialData.notes : '',
      orderItems: (mode === 'edit' && initialData?.orderItems && initialData.orderItems.length > 0)
        ? initialData.orderItems.map(item => ({
            productId: String(item?.productId || ''),
            quantity: Number(item?.quantity || 1),
            agencyId: String(item?.agencyId || '')
          }))
        : [{ productId: "", quantity: 1, agencyId: "" }],
    },
    mode: "onChange", // Changed to onChange for more responsive validation feedback
  });

  const watchedOrderItems = watch("orderItems");
  const watchedOrderItemsString = JSON.stringify(watchedOrderItems); // Stringify for dependency
  const watchedDeliveryDate = watch('deliveryDate');

  const groupedProductSummary = React.useMemo(() => {
    console.log("[OrderForm] Recalculating groupedProductSummary. Watched items (stringified for dep):", watchedOrderItemsString, "Product count:", products.length);
    const summary: { [productId: string]: { name: string; totalQuantity: number; unit?: string } } = {};
    if (!watchedOrderItems || watchedOrderItems.length === 0 || !products || products.length === 0) {
      return summary;
    }

    watchedOrderItems.forEach(item => {
      if (!item || !item.productId || item.quantity === undefined || item.quantity === null || Number(item.quantity) <= 0) {
        return; // Skip if essential data is missing or quantity is not positive
      }

      const product = products.find(p => String(p.id) === item.productId);
      if (product) {
        if (summary[item.productId]) {
          summary[item.productId].totalQuantity += Number(item.quantity);
        } else {
          summary[item.productId] = {
            name: product.name,
            totalQuantity: Number(item.quantity),
            unit: product.unit,
          };
        }
      }
    });
    console.log("[OrderForm] groupedProductSummary result:", JSON.parse(JSON.stringify(summary)));
    return summary;
  }, [watchedOrderItemsString, products]); // Use stringified version in dependency

  const { fields, append, remove } = useFieldArray({
    control,
    name: "orderItems",
  });

  // Fetch vendors
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const response = await get("/vendors?limit=1000&dairyOnly=true"); // Fetch only dairy vendors, up to 1000
        if (response && Array.isArray(response)) {
            setVendors(response.map(v => ({ ...v, id: String(v.id) })));
        } else if (response && response.data && Array.isArray(response.data)) {
            setVendors(response.data.map((v: any) => ({ ...v, id: String(v.id) })));
        } else {
            setVendors([]);
            toast.error("Failed to fetch vendors or data is not in expected format.");
        }
      } catch (error) {
        toast.error("Failed to fetch vendors");
        setVendors([]);
      }
    };
    fetchVendors();
  }, []);

  // Fetch products and set order items if in edit mode
  useEffect(() => {
    const fetchProductsAndSetItems = async () => {
      try {
        const response = await get("/products");
        let productsList: Product[] = [];
        
        if (response && Array.isArray(response)) {
          productsList = response;
        } else if (response && response.data && Array.isArray(response.data)) {
          productsList = response.data;
        } else {
          console.error("Unexpected product API response structure:", response);
          toast.error("Products data is not in the expected array format.");
        }
        
        setProducts(productsList);
        
        // If in edit mode, initialData has orderItems, and both products and agencies are loaded, set them
        if (mode === "edit" && initialData?.orderItems && Array.isArray(initialData.orderItems) && initialData.orderItems.length > 0 && productsList.length > 0 && agencies.length > 0) {
          console.log("Attempting to set order items. initialData.orderItems:", initialData.orderItems);

          const itemsToSet = initialData.orderItems.map(item => ({
            ...item,
            productId: String(item?.productId || ''),
            quantity: Number(item?.quantity || 1),
            agencyId: String(item?.agencyId || '')
          }));

          // Optional: Check if products for these items actually exist in the fetched list
          const allProductsExist = itemsToSet.every(item => 
            productsList.some(p => String(p.id) === item.productId)
          );

          if (!allProductsExist) {
            console.warn("Some products in initialData.orderItems do not exist in the fetched products list. Items might not display correctly or be selectable.");
            // Consider filtering itemsToSet here if products must exist, or provide feedback
          }
          
          setValue("orderItems", itemsToSet as { productId: string; quantity: number; agencyId: string; }[]);
          console.log("Order items set in form with:", itemsToSet);
        }
      } catch (error) {
        console.error("Error fetching products or setting items:", error);
        setProducts([]);
        toast.error("Failed to fetch products");
      }
    };
    fetchProductsAndSetItems();
  }, [mode, initialData, setValue, agencies]); // Rerun if mode, initialData, setValue, or agencies changes

  // Fetch agencies
  useEffect(() => {
    const fetchAgencies = async () => {
      try {
        const response = await get("/agencies");
        let agenciesData: Agency[] = [];
        if (response && Array.isArray(response.data)) {
          agenciesData = response.data.map((ag: any) => ({ ...ag, id: String(ag.id) }));
        } else if (response && Array.isArray(response)) { 
          agenciesData = response.map((ag: any) => ({ ...ag, id: String(ag.id) }));
        }
        setAgencies(agenciesData);
        if (!(agenciesData.length > 0)) {
          setAgencies([]);
          console.warn("Fetched agencies data is not an array or is missing:", response);
          toast.error("Could not load agencies.")
        }
      } catch (error) {
        console.error("Error fetching agencies:", error);
        toast.error("Failed to fetch agencies.");
        setAgencies([]);
      }
    };
    fetchAgencies();
  }, []);

  // Effect to fetch and prefill order items based on selected deliveryDate
  useEffect(() => {
    if (mode === "create" && watchedDeliveryDate) {
      const fetchPrefillData = async () => {
        setIsFetchingPrefill(true);
        try {
          const formattedDate = format(watchedDeliveryDate, "yyyy-MM-dd");
          // Ensure 'get' is correctly typed or cast the response if necessary
          const response = await get(`/api/vendor-orders/get-order-details?date=${formattedDate}`);
          
          // Assuming response is the array of items or an object with a data property
          const data = response && response.data && Array.isArray(response.data) ? response.data : response;

          if (data && Array.isArray(data) && data.length > 0) {
            const newOrderItems = data.map((item: any) => ({
              productId: String(item.productId), // Ensure string ID
              quantity: Number(item.totalQty),
              agencyId: String(item.agencyId),   // Ensure string ID
            }));            
            setValue("orderItems", newOrderItems, { shouldValidate: true });
            toast.success(`${newOrderItems.length} order items prefilled for ${format(watchedDeliveryDate, "dd/MM/yyyy")}.`);
          } else {
            setValue("orderItems", [], { shouldValidate: true }); // Clear items if no data found
            toast.info(`No scheduled order items found for ${format(watchedDeliveryDate, "dd/MM/yyyy")}.`);
          }
        } catch (error: any) {
          console.error("Error fetching prefill data:", error);
          toast.error(error.message || "Failed to fetch prefill order items.");
        } finally {
          setIsFetchingPrefill(false);
        }
      };
      fetchPrefillData();
    }
  }, [watchedDeliveryDate, mode, setValue, products, agencies]);

  // useEffect for populating basic form fields from initialData
  useEffect(() => {
    if (mode === "edit" && initialData) {
      console.log("Populating basic form fields with initialData:", initialData);

      if (initialData.poNumber) setValue("poNumber", initialData.poNumber);
      if (initialData.orderDate) setValue("orderDate", new Date(initialData.orderDate));
      if (initialData.deliveryDate) setValue("deliveryDate", new Date(initialData.deliveryDate));
      if (initialData.contactPersonName) setValue("contactPersonName", initialData.contactPersonName);
      if (initialData.notes) setValue("notes", initialData.notes);
    }
  }, [mode, initialData, setValue]);

  // useEffect for setting vendorId and selectedVendor from initialData
  useEffect(() => {
    if (mode === "edit" && initialData?.vendorId && vendors.length > 0) {
      const vendorIdStr = String(initialData.vendorId);
      setValue("vendorId", vendorIdStr);
      const vendorDetail = vendors.find(v => v.id === vendorIdStr); // vendor.id is already string from fetchVendors
      if (vendorDetail) {
        setSelectedVendor(vendorDetail);
        console.log("Vendor set in form:", initialData.vendorId, vendorDetail);
      } else {
        console.warn(`Vendor with ID ${initialData.vendorId} not found in fetched vendors list. Cannot preselect.`);
        setSelectedVendor(null); // Clear if not found to avoid stale selection
      }
    }
  }, [mode, initialData?.vendorId, vendors, setValue]); // Rerun if these specific values change

  // Watch for vendor changes
  const watchVendorId = watch("vendorId");
  useEffect(() => {
    if (watchVendorId) {
      const vendor = vendors.find(v => v.id === watchVendorId);
      setSelectedVendor(vendor || null);
      if (vendor?.contactPersonName) {
        setValue("contactPersonName", vendor.contactPersonName);
      }
    } else {
      setSelectedVendor(null);
    }
  }, [watchVendorId, vendors, setValue]);


  // Create order mutation
  const mutation = useMutation({
    mutationFn: async (data: OrderFormData) => {
      if (mode === "edit" && orderId) {
        return put(`/vendor-orders/${orderId}`, data);
      } else {
        return post("/vendor-orders", data);
      }
    },
    onSuccess: () => {
      toast.success("Order created successfully");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      navigate(`/admin/orders`)
      if (onSuccess) onSuccess();

    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create order");
    },
  });

  const onSubmit: SubmitHandler<OrderFormData> = (data) => {
    mutation.mutate(data);
  };

 

  useEffect(() => {
    console.log(
      "[OrderForm] Recalculating orderTotal. groupedProductSummary:", JSON.parse(JSON.stringify(groupedProductSummary)), 
      "Product count:", products.length, 
      "Watched items (stringified for dep):", watchedOrderItemsString
    );
    const calculatedTotalPrice = Object.values(groupedProductSummary).reduce((accumulator, summaryItem) => {
      const product = products.find(p => p.name === summaryItem.name);
      // Ensure product exists and its price is valid (not null or undefined)
      if (product && product.price != null) {
        const price = Number(product.price);
        const quantity = Number(summaryItem.totalQuantity);

        // Add to total only if both price and quantity are valid numbers
        if (!isNaN(price) && !isNaN(quantity)) {
          return accumulator + (price * quantity);
        }
      }
      return accumulator; // Otherwise, this item does not contribute to the total
    }, 0);
    console.log("[OrderForm] calculatedTotalPrice:", calculatedTotalPrice);
    setordertotal(calculatedTotalPrice);
  }, [groupedProductSummary, products, watchedOrderItemsString]); // Use stringified version in dependency
  // Helper to render current step content
  const renderStepContent = () => {
    return (
      <React.Fragment>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6"> 
          {/* Order Details Section */}
          <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              {/* <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Order Information</h3> */}
            </div>
            
            <div className="grid gap-4">
              {mode !== "create" && (
                <div className="relative">
                  <Label htmlFor="poNumber" className="text-gray-700 dark:text-gray-300 font-medium">PO Number</Label>
                  <Input 
                    id="poNumber" 
                    className="bg-white/80 dark:bg-gray-900/80 border-gray-300 dark:border-gray-700"
                    {...register("poNumber")} 
                    disabled 
                  />
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <Controller
                    control={control}
                    name="orderDate"
                    render={({ field }) => (
                      <ControlledCalendar28
                        id="orderDate"
                        label="Order Date"
                        value={field.value}
                        onChange={field.onChange}
                        fromDate={new Date()} // Disable past dates
                      />
                    )}
                  />
                  {errors.orderDate && <span className="text-gray-500 text-xs absolute -bottom-5">{errors.orderDate.message}</span>}
                </div>
                
                <div className="relative">
                  <Controller
                    control={control}
                    name="deliveryDate"
                    render={({ field }) => (
                      <ControlledCalendar28
                        id="deliveryDate"
                        label="Delivery Date"
                        value={field.value}
                        onChange={field.onChange}
                        fromDate={watch("orderDate") || new Date()} // Disable dates before selected orderDate or today
                      />
                    )}
                  />
                  {errors.deliveryDate && <span className="text-gray-500 text-xs absolute -bottom-5">{errors.deliveryDate.message}</span>}
                  {/* Prefill loading indicator and info text */}
                  {mode === "create" && (
                    <>
                      {isFetchingPrefill && (
                        <div className="flex items-center text-sm text-blue-600 mt-2">
                          <LoaderCircle className="animate-spin h-4 w-4 mr-2" />
                          Checking for scheduled items...
                        </div>
                      )}
                 
                    </>
                  )}
                </div>
              </div>

              <div className="relative mt-2">
                <Label htmlFor="notes" className="text-gray-700 dark:text-gray-300 font-medium mb-2">Notes / Special Instructions</Label>
                <Textarea 
                  id="notes" 
                  {...register("notes")} 
                   
                  rows={3} 
                  className="bg-white/80 dark:bg-gray-900/80 border-gray-300 dark:border-gray-700"
                />
                {errors.notes && <span className="text-gray-500 text-xs mt-1">{errors.notes.message}</span>}
              </div>

            </div>
          </div>
          
          {/* Vendor Section */}
          <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Vendor Information</h3>
            </div>
            
            <div className="grid gap-4">
              <div className="relative">
                <Label htmlFor="vendorId" className="text-gray-700 dark:text-gray-300 font-medium mb-2">Select Vendor</Label>
                <Controller
                  control={control}
                  name="vendorId"
                  render={({ field }) => (
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value || ""} 
                      defaultValue={field.value || ""}
                    >
                      <SelectTrigger className="bg-white dark:bg-gray-700 w-full">
                        <SelectValue  />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.vendorId && <span className="text-gray-500 text-xs absolute -bottom-5">{errors.vendorId.message}</span>}
              </div>
              
              <div className="relative">
                <Label htmlFor="contactPersonName" className="text-gray-700 dark:text-gray-300 font-medium mb-2">Contact Person</Label>
                <Input 
                  id="contactPersonName" 
                  disabled
                  className="bg-white/80 dark:bg-gray-900/80 border-emerald-200 dark:border-emerald-800"
                  {...register("contactPersonName")} 
                />
                {errors.contactPersonName && <span className="text-gray-500 text-xs absolute -bottom-5">{errors.contactPersonName.message}</span>}
              </div>
            </div>

            {selectedVendor && (
              <div className="mt-4 p-3 bg-white/90 dark:bg-gray-900/90 rounded-md border border-emerald-200 dark:border-emerald-800">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Vendor Details</p>
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Email:</span>
                    <p className="font-medium text-gray-700 dark:text-gray-300">{selectedVendor.email}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Phone:</span>
                    <p className="font-medium text-gray-700 dark:text-gray-300">{selectedVendor.mobile}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Products & Agencies Section */}
        <Card className="shadow-lg mt-6">
          <CardHeader className="bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <CardTitle className="text-gray-700 dark:text-gray-300">Products & Agencies</CardTitle>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  append({
                    productId: "",
                    quantity: 1,
                    agencyId: "",
                  })
                }
                className="border-gray-300 mt-4 mb-4 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Product Item
              </Button>
            </div>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Add products to your order, specify quantities, and assign an agency to each item.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {fields.length === 0 && (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                <PackageSearch className="h-12 w-12 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                No products added yet. Click "Add Product Item" to begin.
              </div>
            )}
            {fields.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[150px]">Agency</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[200px]">Product</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[80px]">QTY</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[80px]">Unit</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[100px]">Unit Price</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[100px]">Total</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[80px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {fields.map((itemField, index) => {
                      const productInfo = products.find(p => String(p.id) === watchedOrderItems[index]?.productId);
                      const unitPrice = productInfo ? Number(productInfo.price) : 0;
                      const itemTotal = unitPrice * (watchedOrderItems[index]?.quantity || 0);

                      return (
                        <tr key={itemField.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{index + 1}</td>
                          <td className="px-4 py-3 whitespace-nowrap min-w-[200px]">
                            <Controller
                              control={control}
                              name={`orderItems.${index}.agencyId`}
                              render={({ field: agencyField }) => (
                                <Select onValueChange={agencyField.onChange} value={agencyField.value || ""}>
                                  <SelectTrigger className="h-9 text-sm bg-white dark:bg-gray-700 min-w-full">
                                    <SelectValue  />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {agencies.map(agency => (
                                      <SelectItem key={agency.id} value={agency.id}>{agency.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                            {errors.orderItems?.[index]?.agencyId && (
                              <span className="text-gray-500 text-xs mt-1 block">{errors.orderItems[index]?.agencyId?.message}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap min-w-[200px]">
                            <Controller
                              control={control}
                              name={`orderItems.${index}.productId`}
                              render={({ field: controllerField }) => (
                                <Select onValueChange={controllerField.onChange} value={controllerField.value || ""}>
                                  <SelectTrigger className="h-9 text-sm bg-white dark:bg-gray-700/50 border-gray-300 dark:border-gray-600 w-full">
                                    <SelectValue  />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {products.map((product) => (
                                      <SelectItem key={product.id} value={String(product.id)}>
                                        {product.name} {product.unit ? `(${product.unit})` : ''}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                            {errors.orderItems?.[index]?.productId && (
                              <span className="text-gray-500 text-xs mt-1 block">{errors.orderItems[index]?.productId?.message}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap min-w-[100px]">
                            <Input
                              id={`orderItems.${index}.quantity`}
                              type="number"
                              min="1"
                              {...register(`orderItems.${index}.quantity`, { valueAsNumber: true })}
                              className="h-9 text-sm bg-white dark:bg-gray-700/50 border-gray-300 dark:border-gray-600 w-full"
                            />
                            {errors.orderItems?.[index]?.quantity && (
                              <span className="text-gray-500 text-xs mt-1 block">{errors.orderItems[index]?.quantity?.message}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 min-w-[80px]">
                            {(() => {
                              const currentProductId = watch(`orderItems.${index}.productId`);
                              const selectedProduct = products.find(p => String(p.id) === currentProductId);
                              return (
                                selectedProduct?.unit || 'N/A'
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 min-w-[100px]">
                            {formatCurrency(unitPrice.toFixed(2))}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-700 dark:text-gray-300">
                            {formatCurrency(itemTotal.toFixed(2))}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => remove(index)}
                              className="h-8 w-8 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800/50"
                              disabled={fields.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
            {errors.orderItems && typeof errors.orderItems === 'object' && 'message' in errors.orderItems && (
              <p className="text-gray-500 text-sm mt-2">{(errors.orderItems as any).message}</p>
            )}

             {fields.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center text-lg">
                    <span className="font-semibold text-gray-800 dark:text-gray-300">Current Order Total :</span>
                    <span className="font-bold text-lg text-gray-800 dark:text-gray-300">{formatCurrency(orderTotal)}</span>
                  </div>
                  {/* <p className="text-xs text-right text-gray-500 dark:text-gray-400">(Subtotal: ₹{(orderTotal || 0).toFixed(2)})</p> */}
              </div>
            )} 
          </CardContent>
        </Card>

        {/* Order Summary Section - Disabled */}
        {fields.length > 0 && (
          <Card className="shadow-lg mt-6">
            <CardHeader className="bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center gap-2">
                <ListOrdered className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <CardTitle className="text-gray-700 dark:text-gray-300">Order Summary</CardTitle>
              </div>
              <CardDescription className="text-gray-600 dark:text-gray-400">Review your ordered items and quantities before submission.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {(() => {
                const summaryEntries = Object.entries(groupedProductSummary);
                // Defensive: If groupedProductSummary is empty but there are valid order items, show those directly
                if (summaryEntries.length === 0) {
                  const validItems = watchedOrderItems?.filter(item => item.productId && Number(item.quantity) > 0) || [];
                  if (products.length === 0 && validItems.length > 0) {
                    return Array.from({ length: Math.min(validItems.length, 3) }).map((_, index) => (
                      <div key={`summary-loading-${index}`} className="flex justify-between items-center border-b pb-2 mb-2 animate-pulse">
                        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-1"></div>
                        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/6"></div>
                      </div>
                    ));
                  }
                  if (validItems.length > 0) {
                    // Show a fallback summary for each valid item
                    return validItems.map((item, idx) => (
                      <div key={`summary-fallback-${item.productId}-${idx}`} className="flex justify-between items-center border-b pb-2 mb-2 last:border-b-0 last:pb-0 last:mb-0">
                        {/* <p className="font-medium text-gray-700 dark:text-gray-300">Product ID: {item.productId}</p> */}
                        <p className="font-medium text-gray-700 dark:text-gray-300">Qty: {item.quantity}</p>
                      </div>
                    ));
                  }
                  // Products loaded, or no items with positive quantity/valid product ID.
                  return <p className="text-sm text-gray-500 dark:text-gray-400">Review your selections. No products with positive quantities to summarize.</p>;
                }
                return summaryEntries.map(([productId, summaryItem]) => (
                  <div key={`summary-group-${productId}`} className="flex justify-between items-center border-b pb-2 mb-2 last:border-b-0 last:pb-0 last:mb-0">
                    <p className="font-medium text-gray-700 dark:text-gray-300">{summaryItem.name}</p>
                    <p className="font-medium text-gray-700 dark:text-gray-300">Qty: {summaryItem.totalQuantity} {summaryItem.unit ? `(${summaryItem.unit})` : ''}</p>
                  </div>
                ));
              })()}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                <div className="flex justify-between text-md">
                  {/* <span className="font-semibold text-gray-700 dark:text-gray-300">Total Units:</span> */}
                  {/* <span className="font-bold text-lg text-gray-800 dark:text-gray-200">
                    {watch("orderItems").reduce((sum, currentItem) => sum + (Number(currentItem.quantity) || 0), 0)}
                  </span> */}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-8 mx-auto p-4 sm:p-6 lg:p-8">
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">
          {mode === "create" ? "Create New Order" : "Edit Order"}
        </h2>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          {renderStepContent()} 

          {/* Submit Button */}
          <div className="flex justify-end items-center pt-6 border-t dark:border-gray-700">
            <Button
              type="submit"
              disabled={isSubmitting || mutation.isPending}
              className="bg-gray-600 hover:bg-gray-700 text-white font-semibold px-6 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-150 flex items-center gap-2"
            >
              {isSubmitting || mutation.isPending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              Submit Order
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderForm;
