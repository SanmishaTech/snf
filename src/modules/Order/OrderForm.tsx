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
import { LoaderCircle, CalendarIcon, Plus, Trash2, Package, Truck, ShoppingCart, Save, PackageSearch, ListOrdered, ChevronDown, ChevronRight } from "lucide-react";
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
  vendorId: z.string().min(1, "Farmer is required"),
  notes: z.string().optional(),
  orderItems: z.array(z.object({
    depotId: z.string().min(1, "Depot is required"),
    agencyId: z.string().min(1, "Agency is required"),
    productId: z.string().min(1, "Product is required"),
    depotVariantId: z.string().min(1, "Depot variant is required"),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    variantUnit: z.string().optional(),
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

interface Depot {
  id: string;
  name: string;
}

interface DepotVariant {
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
  const [depots, setDepots] = useState<Depot[]>([]);
  const [depotVariants, setDepotVariants] = useState<DepotVariant[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [orderTotal, setordertotal] = useState()
  const [isFetchingPrefill, setIsFetchingPrefill] = useState<boolean>(false);
  const [isOrderSummaryExpanded, setIsOrderSummaryExpanded] = useState<boolean>(true);
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});
  const navigate = useNavigate()

  // Basic toggle functions for collapsible sections
  const toggleOrderSummary = () => {
    setIsOrderSummaryExpanded(!isOrderSummaryExpanded);
  };

  const toggleProductExpansion = (productId: string) => {
    setExpandedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

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
      receivedById: (mode === 'edit' && initialData?.receivedById) ? initialData.receivedById : '',
      contactPersonName: (mode === 'edit' && initialData?.contactPersonName) ? initialData.contactPersonName : '',
      vendorId: (mode === 'edit' && initialData?.vendorId) ? initialData.vendorId : '',
      notes: (mode === 'edit' && initialData?.notes) ? initialData.notes : '',
      orderItems: (mode === 'edit' && initialData?.orderItems && initialData.orderItems.length > 0)
        ? initialData.orderItems.map(item => ({
            productId: String(item?.productId || ''),
            quantity: Number(item?.quantity || 1),
            agencyId: String(item?.agencyId || ''),
            depotId: String(item?.depotId || ''),
            depotVariantId: String(item?.depotVariantId || '')
          }))
        : [{ productId: "", quantity: 1, agencyId: "", depotId: "", depotVariantId: "" }],
    },
    mode: "onChange", // Changed to onChange for more responsive validation feedback
  });

  const watchedOrderItems = watch("orderItems");
  const watchedOrderItemsString = JSON.stringify(watchedOrderItems); // Stringify for dependency
  const watchedDeliveryDate = watch('deliveryDate');

  // Enhanced grouped product summary with variant details
  const groupedProductSummary = React.useMemo(() => {
    console.log("[OrderForm] Recalculating groupedProductSummary. Watched items (stringified for dep):", watchedOrderItemsString, "Product count:", products.length);
    const summary: { 
      [productId: string]: { 
        name: string; 
        totalQuantity: number; 
        unit?: string;
        price?: number;
        totalPrice?: number;
        variants: {
          [variantId: string]: {
            name: string;
            quantity: number;
            agencies: string[];
            depots: string[];
          }
        }
      } 
    } = {};
    
    if (!watchedOrderItems || watchedOrderItems.length === 0 || !products || products.length === 0) {
      return summary;
    }

    watchedOrderItems.forEach(item => {
      if (!item || !item.productId || item.quantity === undefined || item.quantity === null || Number(item.quantity) <= 0) {
        return; // Skip if essential data is missing or quantity is not positive
      }

      const product = products.find(p => String(p.id) === item.productId);
      const variant = depotVariants.find(v => String(v.id) === item.depotVariantId);
      const agency = agencies.find(a => String(a.id) === item.agencyId);
      const depot = depots.find(d => String(d.id) === item.depotId);
      
      if (product) {
        const productPrice = Number(product.price) || 0;
        const itemQuantity = Number(item.quantity);
        
        if (!summary[item.productId]) {
          summary[item.productId] = {
            name: product.name,
            totalQuantity: 0,
            unit: product.unit,
            price: productPrice,
            totalPrice: 0,
            variants: {}
          };
        }
        
        summary[item.productId].totalQuantity += itemQuantity;
        summary[item.productId].totalPrice = (summary[item.productId].totalPrice || 0) + (productPrice * itemQuantity);
        
        // Handle variants
        if (variant && item.depotVariantId) {
          if (!summary[item.productId].variants[item.depotVariantId]) {
            summary[item.productId].variants[item.depotVariantId] = {
              name: variant.name,
              quantity: 0,
              agencies: [],
              depots: []
            };
          }
          
          summary[item.productId].variants[item.depotVariantId].quantity += itemQuantity;
          
          // Add unique agencies and depots
          if (agency && !summary[item.productId].variants[item.depotVariantId].agencies.includes(agency.name)) {
            summary[item.productId].variants[item.depotVariantId].agencies.push(agency.name);
          }
          if (depot && !summary[item.productId].variants[item.depotVariantId].depots.includes(depot.name)) {
            summary[item.productId].variants[item.depotVariantId].depots.push(depot.name);
          }
        }
      }
    });
    
    console.log("[OrderForm] Enhanced groupedProductSummary result:", JSON.parse(JSON.stringify(summary)));
    return summary;
  }, [watchedOrderItemsString, products, depotVariants, agencies, depots]); // Use stringified version in dependency

  // Expand/Collapse all products functions - defined after groupedProductSummary
  const expandAllProducts = () => {
    const newExpandedState: Record<string, boolean> = {};
    Object.keys(groupedProductSummary).forEach(productId => {
      newExpandedState[productId] = true;
    });
    setExpandedProducts(newExpandedState);
  };

  const collapseAllProducts = () => {
    const newExpandedState: Record<string, boolean> = {};
    Object.keys(groupedProductSummary).forEach(productId => {
      newExpandedState[productId] = false;
    });
    setExpandedProducts(newExpandedState);
  };

  // Check if all products are expanded or collapsed
  const allProductsExpanded = Object.keys(groupedProductSummary).length > 0 && 
    Object.keys(groupedProductSummary).every(productId => expandedProducts[productId] !== false);
  const allProductsCollapsed = Object.keys(groupedProductSummary).length > 0 && 
    Object.keys(groupedProductSummary).every(productId => expandedProducts[productId] === false);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "orderItems",
  });
  
  // Log field changes
  useEffect(() => {
    console.log("[OrderForm] Fields updated:", fields);
    console.log("[OrderForm] Fields length:", fields.length);
  }, [fields]);

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
            agencyId: String(item?.agencyId || ''),
            depotId: String(item?.depotId || ''),
            depotVariantId: String(item?.depotVariantId || '')
          }));

          // Optional: Check if products for these items actually exist in the fetched list
          const allProductsExist = itemsToSet.every(item => 
            productsList.some(p => String(p.id) === item.productId)
          );

          if (!allProductsExist) {
            console.warn("Some products in initialData.orderItems do not exist in the fetched products list. Items might not display correctly or be selectable.");
            // Consider filtering itemsToSet here if products must exist, or provide feedback
          }
          
          setValue("orderItems", itemsToSet as { productId: string; quantity: number; agencyId: string; depotId: string; depotVariantId: string; }[]);
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

  useEffect(() => {
    const fetchDepots = async () => {
      try {
        const response = await get("/depots");
        let depotsData: Depot[] = [];
        if (response && Array.isArray(response.data)) {
          depotsData = response.data.map((depot: any) => ({ ...depot, id: String(depot.id) }));
        } else if (response && Array.isArray(response)) {
          depotsData = response.map((depot: any) => ({ ...depot, id: String(depot.id) }));
        }
        setDepots(depotsData);
        if (!(depotsData.length > 0)) {
          setDepots([]);
          console.warn("Fetched depots data is not an array or is missing:", response);
          toast.error("Could not load depots.")
        }
      } catch (error) {
        console.error("Error fetching depots:", error);
        toast.error("Failed to fetch depots.");
        setDepots([]);
      }
    };
    fetchDepots();
  }, []);

  useEffect(() => {
    const fetchDepotVariants = async () => {
      try {
        const response = await get("/depot-product-variants");
        let depotVariantsData: DepotVariant[] = [];
        if (response && Array.isArray(response.data)) {
          depotVariantsData = response.data.map((variant: any) => ({ ...variant, id: String(variant.id) }));
        } else if (response && Array.isArray(response)) {
          depotVariantsData = response.map((variant: any) => ({ ...variant, id: String(variant.id) }));
        }
        setDepotVariants(depotVariantsData);
        if (!(depotVariantsData.length > 0)) {
          setDepotVariants([]);
          console.warn("Fetched depot variants data is not an array or is missing:", response);
          toast.error("Could not load depot variants.")
        }
      } catch (error) {
        console.error("Error fetching depot variants:", error);
        toast.error("Failed to fetch depot variants.");
        setDepotVariants([]);
      }
    };
    fetchDepotVariants();
  }, []);

  // Effect to fetch and prefill order items based on selected deliveryDate
  useEffect(() => {
    if (mode === "create" && watchedDeliveryDate) {
      const fetchPrefillData = async () => {
        setIsFetchingPrefill(true);
        try {
          const formattedDate = format(watchedDeliveryDate, "yyyy-MM-dd");
          console.log("[OrderForm] Fetching prefill data for date:", formattedDate);
          
          const response = await get(`/vendor-orders/get-order-details?date=${formattedDate}`);
          console.log("[OrderForm] Raw API response:", response);
          
          // Handle the new enhanced API response format
          // The API returns { date, summary, data } directly
          const responseData = response;
          console.log("[OrderForm] Response data:", responseData);
          console.log("[OrderForm] Type of responseData:", typeof responseData);
          console.log("[OrderForm] responseData.data exists:", !!responseData.data);
          console.log("[OrderForm] responseData.data is Array:", Array.isArray(responseData.data));
          console.log("[OrderForm] responseData.data length:", responseData.data ? responseData.data.length : 'N/A');
          
          if (responseData && responseData.data && Array.isArray(responseData.data) && responseData.data.length > 0) {
            console.log("[OrderForm] Number of depot-variant groups from API:", responseData.data.length);
            console.log("[OrderForm] Summary:", responseData.summary);
            
            const newOrderItems: any[] = [];
            
            // Process each depot-variant group
            responseData.data.forEach((group: any) => {
              console.log("[OrderForm] Processing group:", group);
              
              // Each group can have multiple agencies and members
              if (group.depot && group.variant && group.product) {
                // Check if we should split by agencies or create a single item
                if (group.agencies && group.agencies.ids.length > 1) {
                  // Multiple agencies - create separate items for each agency
                  // Calculate quantity per agency based on member distribution
                  const membersByAgency: Record<string, number> = {};
                  
                  // If we have member details, use them to distribute quantity accurately
                  if (group.members && Array.isArray(group.members)) {
                    group.members.forEach((member: any) => {
                      // For now, we'll distribute evenly since member data doesn't include agency info
                      // In a real scenario, you might want to map members to agencies
                    });
                  }
                  
                  // For now, distribute quantity evenly among agencies
                  const quantityPerAgency = Math.ceil(group.statistics.totalQuantity / group.agencies.ids.length);
                  
                  group.agencies.ids.forEach((agencyId: number, index: number) => {
                    const mappedItem = {
                      depotId: String(group.depot.id || ''),
                      agencyId: String(agencyId),
                      productId: String(group.product.id || ''),
                      depotVariantId: String(group.variant.id || ''),
                      quantity: quantityPerAgency,
                    };
                    
                    console.log(`[OrderForm] Mapped item for agency ${group.agencies.names[index]}:`, mappedItem);
                    
                    // Only add valid items
                    if (mappedItem.depotId && mappedItem.agencyId && mappedItem.productId && 
                        mappedItem.depotVariantId && mappedItem.quantity > 0) {
                      newOrderItems.push(mappedItem);
                    }
                  });
                } else {
                  // Single agency or no agency - create one item
                  const agencyId = group.agencies && group.agencies.ids.length > 0 
                    ? String(group.agencies.ids[0]) 
                    : "";
                  
                  const mappedItem = {
                    depotId: String(group.depot.id || ''),
                    agencyId: agencyId,
                    productId: String(group.product.id || ''),
                    depotVariantId: String(group.variant.id || ''),
                    quantity: Number(group.statistics.totalQuantity || 0),
                  };
                  
                  console.log("[OrderForm] Mapped item:", mappedItem);
                  
                  // Validate mapped item
                  if (!mappedItem.depotId) console.warn("[OrderForm] Item missing depotId");
                  if (!mappedItem.agencyId) console.warn("[OrderForm] Item missing agencyId - user will need to select");
                  if (!mappedItem.productId) console.warn("[OrderForm] Item missing productId");
                  if (!mappedItem.depotVariantId) console.warn("[OrderForm] Item missing depotVariantId");
                  if (mappedItem.quantity <= 0) console.warn("[OrderForm] Item has invalid quantity:", mappedItem.quantity);
                  
                  // Only add valid items (allow missing agencyId as user can select it)
                  if (mappedItem.depotId && mappedItem.productId && mappedItem.depotVariantId && mappedItem.quantity > 0) {
                    newOrderItems.push(mappedItem);
                  }
                }
              }
            });
            
            console.log("[OrderForm] Final mapped order items:", newOrderItems);
            console.log("[OrderForm] Setting form with", newOrderItems.length, "items");
            
            if (newOrderItems.length > 0) {
              setValue("orderItems", newOrderItems, { shouldValidate: true });
              toast.success(
                `${newOrderItems.length} order items prefilled for ${format(watchedDeliveryDate, "dd/MM/yyyy")}. ` +
                `Total quantity: ${responseData.summary.totalQuantity} units across ${responseData.summary.totalDepots} depots.`
              );
            } else {
              console.warn("[OrderForm] No valid items could be mapped from the response");
              setValue("orderItems", [{ depotId: "", agencyId: "", productId: "", depotVariantId: "", quantity: 1 }], { shouldValidate: true });
              toast.warning(`Data found but could not map items for ${format(watchedDeliveryDate, "dd/MM/yyyy")}.`);
            }
          } else {
            console.log("[OrderForm] No data found or data format incorrect");
            console.log("[OrderForm] responseData:", responseData);
            console.log("[OrderForm] Condition failed:", {
              hasResponseData: !!responseData,
              hasDataProperty: !!(responseData && responseData.data),
              isDataArray: Array.isArray(responseData && responseData.data),
              dataLength: responseData && responseData.data ? responseData.data.length : 0
            });
            setValue("orderItems", [{ depotId: "", agencyId: "", productId: "", depotVariantId: "", quantity: 1 }], { shouldValidate: true });
            toast.info(`No scheduled order items found for ${format(watchedDeliveryDate, "dd/MM/yyyy")}.`);
          }
        } catch (error: any) {
          console.error("[OrderForm] Error fetching prefill data:", error);
          toast.error(error.message || "Failed to fetch prefill order items.");
          // Set empty item on error
          setValue("orderItems", [{ depotId: "", agencyId: "", productId: "", depotVariantId: "", quantity: 1 }], { shouldValidate: true });
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
    // Prepare the complete order data with all required fields
    const completeOrderData = {
      ...data,
      // Ensure all order items include the collected depot and variant information
      orderItems: data.orderItems.map((item, index) => {
        const originalItem = watchedOrderItems[index];
        return {
          productId: item.productId,
          quantity: item.quantity,
          agencyId: item.agencyId,
          depotId: originalItem?.depotId || item.depotId || "",
          depotVariantId: originalItem?.depotVariantId || item.depotVariantId || ""
        };
      }),
      // Include additional order-level data
      totalAmount: orderTotal || 0
    };
    
    console.log("[OrderForm] Submitting complete order data:", completeOrderData);
    mutation.mutate(completeOrderData);
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
                  {errors.orderDate && <span className="text-red-500 text-xs absolute -bottom-5">{errors.orderDate.message}</span>}
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
                  {errors.deliveryDate && <span className="text-red-500 text-xs absolute -bottom-5">{errors.deliveryDate.message}</span>}
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
                {errors.notes && <span className="text-red-500 text-xs mt-1">{errors.notes.message}</span>}
              </div>

            </div>
          </div>
          
          {/* Vendor Section */}
          <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Farmer Information</h3>
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
                        <SelectValue placeholder="Select a Farmer" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.vendorId && <span className="text-red-500 text-xs absolute -bottom-5">{errors.vendorId.message}</span>}
              </div>
              
              <div className="relative">
                <Label htmlFor="contactPersonName" className="text-gray-700 dark:text-gray-300 font-medium mb-2">Contact Person</Label>
                <Input 
                  id="contactPersonName" 
                  disabled
                  className="bg-white/80 dark:bg-gray-900/80 border-emerald-200 dark:border-emerald-800"
                  {...register("contactPersonName")} 
                />
                {errors.contactPersonName && <span className="text-red-500 text-xs absolute -bottom-5">{errors.contactPersonName.message}</span>}
              </div>
            </div>

            {selectedVendor && (
              <div className="mt-4 p-3 bg-white/90 dark:bg-gray-900/90 rounded-md border border-emerald-200 dark:border-emerald-800">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Farmer Details</p>
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
                    depotId: "",
                    depotVariantId: ""
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
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Depot</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[150px]">Agency</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[200px]">Product</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Depot Variant</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[80px]">QTY</th>
                       <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[80px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {fields.map((itemField, index) => {
                      console.log(`[OrderForm] Rendering field ${index}:`, itemField, "Watched item:", watchedOrderItems[index]);
                      const productInfo = products.find(p => String(p.id) === watchedOrderItems[index]?.productId);
                      const unitPrice = productInfo ? Number(productInfo.price) : 0;
                      const itemTotal = unitPrice * (watchedOrderItems[index]?.quantity || 0);

                      return (
                        <tr key={itemField.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="px-4 py-3 whitespace-nowrap min-w-[200px]">
                            <Controller
                              control={control}
                              name={`orderItems.${index}.depotId`}
                              render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <SelectTrigger className="h-9 text-sm bg-white dark:bg-gray-700 min-w-full">
                                    <SelectValue placeholder="Select Depot" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {depots.map(depot => (
                                      <SelectItem key={depot.id} value={depot.id}>{depot.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap min-w-[200px]">
                            <Controller
                              control={control}
                              name={`orderItems.${index}.agencyId`}
                              render={({ field: agencyField }) => (
                                <Select onValueChange={agencyField.onChange} value={agencyField.value || ""}>
                                  <SelectTrigger className="h-9 text-sm bg-white dark:bg-gray-700 min-w-full">
                                    <SelectValue placeholder="Select Agency" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {agencies.map(agency => (
                                      <SelectItem key={agency.id} value={agency.id}>{agency.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap min-w-[200px]">
                            <Controller
                              control={control}
                              name={`orderItems.${index}.productId`}
                              render={({ field: controllerField }) => (
                                <Select onValueChange={controllerField.onChange} value={controllerField.value || ""}>
                                  <SelectTrigger className="h-9 text-sm bg-white dark:bg-gray-700/50 border-gray-300 dark:border-gray-600 w-full">
                                    <SelectValue placeholder="Select Product" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {products.map((product) => (
                                      <SelectItem key={product.id} value={String(product.id)}>
                                        {product.name} 
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap min-w-[200px]">
                            <Controller
                              control={control}
                              name={`orderItems.${index}.depotVariantId`}
                              render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <SelectTrigger className="h-9 text-sm bg-white dark:bg-gray-700 min-w-full">
                                    <SelectValue placeholder="Select Depot Variant" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {depotVariants.map(variant => (
                                      <SelectItem key={variant.id} value={variant.id}>{variant.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap min-w-[100px]">
                            <Input
                              id={`orderItems.${index}.quantity`}
                              type="number"
                              min="1"
                              {...register(`orderItems.${index}.quantity`, { valueAsNumber: true })}
                              className="h-9 text-sm bg-white dark:bg-gray-700/50 border-gray-300 dark:border-gray-600 w-full"
                            />
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
              <p className="text-red-500 text-sm mt-2">{(errors.orderItems as any).message}</p>
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

        {/* Enhanced Collapsible Order Summary Section */}
        {fields.length > 0 && (
          <Card className="shadow-lg mt-6 border-2 border-blue-100 dark:border-blue-900">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
              <div 
                className="flex items-center justify-between cursor-pointer hover:bg-blue-100/50 dark:hover:bg-blue-900/50 transition-colors rounded p-2 -m-2"
                onClick={toggleOrderSummary}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleOrderSummary();
                  }
                }}
                tabIndex={0}
                role="button"
                aria-expanded={isOrderSummaryExpanded}
                aria-label={`${isOrderSummaryExpanded ? 'Collapse' : 'Expand'} order summary`}
              >
                <div className="flex items-center gap-2">
                  <ListOrdered className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <CardTitle className="text-blue-800 dark:text-blue-200">Order Summary</CardTitle>
                  <span className="text-sm text-blue-600 dark:text-blue-400 ml-2">
                    ({Object.keys(groupedProductSummary).length} product{Object.keys(groupedProductSummary).length !== 1 ? 's' : ''})
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900"
                >
                  {isOrderSummaryExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {/* Expand/Collapse All Controls - Only show when summary is expanded */}
              {isOrderSummaryExpanded && Object.keys(groupedProductSummary).length > 1 && (
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                  <CardDescription className="text-blue-600 dark:text-blue-300">
                    Detailed breakdown of products, variants, and distribution.
                  </CardDescription>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        expandAllProducts();
                      }}
                      disabled={allProductsExpanded}
                      className="h-7 text-xs border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/50"
                    >
                      Expand All
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        collapseAllProducts();
                      }}
                      disabled={allProductsCollapsed}
                      className="h-7 text-xs border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/50"
                    >
                      Collapse All
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Simple description when collapsed or no expand/collapse controls needed */}
              {(!isOrderSummaryExpanded || Object.keys(groupedProductSummary).length <= 1) && (
                <CardDescription className="text-blue-600 dark:text-blue-300">
                  {isOrderSummaryExpanded 
                    ? "Detailed breakdown of products, variants, and distribution."
                    : `${Object.values(groupedProductSummary).reduce((sum, item) => sum + item.totalQuantity, 0)} total items • ${formatCurrency(orderTotal || 0)}`
                  }
                </CardDescription>
              )}
            </CardHeader>
            <div className={cn(
              "transition-all duration-300 ease-in-out overflow-hidden",
              isOrderSummaryExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
            )}>
              <CardContent className="p-6">
              {(() => {
                const summaryEntries = Object.entries(groupedProductSummary);
                
                if (summaryEntries.length === 0) {
                  const validItems = watchedOrderItems?.filter(item => item.productId && Number(item.quantity) > 0) || [];
                  if (products.length === 0 && validItems.length > 0) {
                    return (
                      <div className="space-y-3">
                        {Array.from({ length: Math.min(validItems.length, 3) }).map((_, index) => (
                          <div key={`summary-loading-${index}`} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg animate-pulse">
                            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return (
                    <div className="text-center py-8">
                      <PackageSearch className="h-12 w-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" />
                      <p className="text-gray-500 dark:text-gray-400">No products selected yet</p>
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-6">
                    {summaryEntries.map(([productId, summaryItem]) => {
                      const hasVariants = Object.keys(summaryItem.variants).length > 0;
                      const totalOrderValue = (summaryItem.totalPrice || 0);
                      
                      const isProductExpanded = expandedProducts[productId] ?? true; // Default to expanded
                      
                      return (
                        <div key={`summary-group-${productId}`} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
                          {/* Collapsible Product Header */}
                          <div 
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            onClick={() => toggleProductExpansion(productId)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                toggleProductExpansion(productId);
                              }
                            }}
                            tabIndex={0}
                            role="button"
                            aria-expanded={isProductExpanded}
                            aria-label={`${isProductExpanded ? 'Collapse' : 'Expand'} ${summaryItem.name} details`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-8 bg-secondary rounded-full"></div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-gray-500 dark:text-gray-400"
                                >
                                  {isProductExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                              <div>
                                <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">
                                  {summaryItem.name}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  Unit Price: {formatCurrency(summaryItem.price || 0)}
                                  {summaryItem.unit && ` per ${summaryItem.unit}`}
                                  {!isProductExpanded && hasVariants && (
                                    <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                                      {Object.keys(summaryItem.variants).length} variant{Object.keys(summaryItem.variants).length !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                                {summaryItem.totalQuantity} {summaryItem.unit || 'units'}
                              </p>
                              <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                                {formatCurrency(totalOrderValue)}
                              </p>
                            </div>
                          </div>
                          
                          {/* Collapsible Variants Breakdown */}
                          {isProductExpanded && hasVariants && (
                            <div className="p-4 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50">
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600 pb-2 mb-3">
                                Variant Distribution
                              </h4>
                              <div className="grid gap-3">
                                {Object.entries(summaryItem.variants).map(([variantId, variantInfo]) => (
                                  <div key={`variant-${variantId}`} className="bg-white dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-medium text-gray-700 dark:text-gray-300">
                                        {variantInfo.name}
                                      </span>
                                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                                        {variantInfo.quantity} {summaryItem.unit || 'units'}
                                      </span>
                                    </div>
                                    
                                    {/* Agencies and Depots */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                      {variantInfo.agencies.length > 0 && (
                                        <div>
                                          <span className="text-gray-500 dark:text-gray-400">Agencies:</span>
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {variantInfo.agencies.map((agency, idx) => (
                                              <span key={`agency-${idx}`} className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full text-xs">
                                                {agency}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {variantInfo.depots.length > 0 && (
                                        <div>
                                          <span className="text-gray-500 dark:text-gray-400">Depots:</span>
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {variantInfo.depots.map((depot, idx) => (
                                              <span key={`depot-${idx}`} className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded-full text-xs">
                                                {depot}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* No variants fallback - only show when expanded */}
                          {isProductExpanded && !hasVariants && (
                            <div className="p-4 border-t border-gray-200 dark:border-gray-600 bg-yellow-50 dark:bg-yellow-900/20">
                              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                No variant details available for this product
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Order Totals */}
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg p-4 border-2 border-gray-200 dark:border-gray-600">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Total Items:</span>
                          <span className="font-medium text-gray-800 dark:text-gray-200">
                            {Object.values(groupedProductSummary).reduce((sum, item) => sum + item.totalQuantity, 0)} units
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Product Types:</span>
                          <span className="font-medium text-gray-800 dark:text-gray-200">
                            {Object.keys(groupedProductSummary).length}
                          </span>
                        </div>
                        <div className="border-t border-gray-300 dark:border-gray-500 pt-2">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-semibold text-gray-800 dark:text-gray-200">Total Order Value:</span>
                            <span className="text-xl font-bold text-green-600 dark:text-green-400">
                              {formatCurrency(orderTotal || 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
              </CardContent>
            </div>
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
