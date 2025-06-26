import type React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { get, post } from "@/services/apiService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Plus, Minus, Package, Clock } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  createOrderWithSubscriptions,
  type OrderWithSubscriptionsRequest,
  type SubscriptionDetail,
} from "@/services/subscriptionService";

// Enhanced interfaces to support variants with individual delivery schedules
interface ProductVariant {
  id: string;
  name: string;
  price: number; // base price (sellingPrice)
  rate: number; // alias for base price for backward compatibility
  price3Day?: number;
  price7Day?: number;
  price15Day?: number;
  price1Month?: number;
  unit?: string;
  description?: string;
  isAvailable?: boolean;
}

interface LocationData {
  id: number;
  name: string;
}

interface AddressData {
  id: string;
  recipientName: string;
  mobile: string;
  plotBuilding: string;
  streetArea: string;
  landmark?: string;
  pincode: string;
  city: string;
  state: string;
  isDefault?: boolean;
  label: string;
  depotId?: number;
  locationId?: number;
  location?: LocationData; 
}

interface ProductData {
  id: number;
  name: string;
  price: number;
  rate: number;
  unit?: string;
  variants?: ProductVariant[];
}

interface SelectedVariant {
  variantId: string;
  quantity: number;
  quantityVarying2?: number;
  deliveryOption: string; // Per-variant delivery option
  selectedDays: string[]; // Per-variant selected days
}

// Add this new interface
interface DepotData {
  id: number;
  name: string;
  isOnline: boolean;
  addressId: string;
  address: string;
  pincode?: string;
  city?: string;
  state?: string;
}

interface SubscriptionModalProps {
  depotId: number | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  product: ProductData | null | undefined;
  productId: string | undefined;
  selectedDepot: DepotData | null; // Add this new prop
}

const daysOfWeek = [
  { id: "mon", label: "Mon" },
  { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" },
  { id: "thu", label: "Thu" },
  { id: "fri", label: "Fri" },
  { id: "sat", label: "Sat" },
  { id: "sun", label: "Sun" },
];

const subscriptionPeriods = [
  { value: 3, label: "3 Days" },
  { value: 7, label: "7 Days" },
  { value: 15, label: "15 Days" },
  { value: 30, label: "1 Month" },
] as const;

type SubscriptionPeriodValue = (typeof subscriptionPeriods)[number]["value"];

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onOpenChange,
  product,
  productId,
  depotId,
  selectedDepot, // Destructure the new prop
}) => {
  const [quantity, setQuantity] = useState(1);
  const [quantityVarying2, setQuantityVarying2] = useState(1);
  const [deliveryOption, setDeliveryOption] = useState("daily");
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 3);
    return tomorrow;  
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] =
    useState<SubscriptionPeriodValue>(7);

  // Enhanced state for variant selection with individual delivery schedules
  const [selectedVariants, setSelectedVariants] = useState<SelectedVariant[]>(
    []
  );
  const [hasVariants, setHasVariants] = useState(false);
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);

  // Address management state
  const [userAddresses, setUserAddresses] = useState<AddressData[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null
  );
  const [modalView, setModalView] = useState<
    "subscriptionDetails" | "addressForm" | "confirmation"
  >("subscriptionDetails");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [userMobile, setUserMobile] = useState<string>("");
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [locations, setLocations] = useState<LocationData[]>([]);

  useEffect(() => {
    const resetOptionIfNeeded = (option: string) => {
      const isAlternateInvalid = selectedPeriod < 15 && option === "alternate-days";
      const isDay1Day2Invalid = selectedPeriod < 7 && option === "day1-day2";
      const isSelectDaysInvalid = selectedPeriod < 30 && option === "select-days";

      if (isAlternateInvalid || isDay1Day2Invalid || isSelectDaysInvalid) {
        return "daily";
      }
      return option;
    };

    // For products with variants
    if (hasVariants) {
      setSelectedVariants((prev) =>
        prev.map((v) => ({
          ...v,
          deliveryOption: resetOptionIfNeeded(v.deliveryOption),
        }))
      );
    } else {
      // For products without variants
      setDeliveryOption(resetOptionIfNeeded(deliveryOption));
    }
  }, [selectedPeriod, hasVariants]); // Rerun when period or variant status changes

  const [addressFormState, setAddressFormState] = useState<
    Omit<AddressData, "id" | "location">
  >({
    recipientName: "",
    mobile: userMobile,
    plotBuilding: "",
    streetArea: "",
    landmark: "",
    city: "",
    state: "",
    pincode: "",
    isDefault: false,
    label: "Home",
    locationId: undefined,
  });

  const handleAddressChange = (
    field: keyof Omit<AddressData, "id" | "location">,
    value: string | number | boolean | undefined
  ) => {
    setAddressFormState((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field as string]) {
      setFormErrors((prev) => ({ ...prev, [field as string]: "" }));
    }
  };

  const handleAddressFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    handleAddressChange(
      name as keyof Omit<AddressData, "id" | "location">,
      value
    );
  };

  const handleAddressLabelChange = (value: string) => {
    handleAddressChange("label", value);
  };



  // Utility to map backend variant to frontend variant structure with numeric prices
  const toNumber = (v: any): number | undefined => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  const transformVariant = (variant: any): ProductVariant => ({
    ...variant,
    price: toNumber(variant.sellingPrice ?? variant.price) ?? 0,
    rate: toNumber(variant.sellingPrice ?? variant.rate) ?? 0,
    price3Day: toNumber(variant.price3Day),
    price7Day: toNumber(variant.price7Day),
    price15Day: toNumber(variant.price15Day),
    price1Month: toNumber(variant.price1Month),
  });

  // Helper to get price of a variant based on selected period
  const getVariantPriceForPeriod = (
    variant: ProductVariant,
    period: SubscriptionPeriodValue
  ): number => {
    const pick = (val: number | undefined) =>
      Number.isFinite(val) && val! > 0 ? val! : undefined;
    let candidate: number | undefined;
    switch (period) {
      case 3:
        candidate = pick(variant.price3Day);
        break;
      case 7:
        candidate = pick(variant.price7Day);
        break;
      case 15:
        candidate = pick(variant.price15Day);
        break;
      case 30:
        candidate = pick(variant.price1Month);
        break;
    }
    return candidate ?? variant.rate;
  };

  const fetchVariants = useCallback(
    async (productId: string, depotId: number) => {
      if (!productId || depotId == null) return;

      try {
        const fetchedVariants = await get(
          `/depot-product-variants/product/${productId}?depotId=${depotId}`
        );

        if (
          fetchedVariants &&
          Array.isArray(fetchedVariants) &&
          fetchedVariants.length > 0
        ) {
          const variantsWithParsedPrices: ProductVariant[] =
            fetchedVariants.map((variant: any) => transformVariant(variant));

          setProductVariants(variantsWithParsedPrices);
          setHasVariants(true);
          if (selectedVariants.length === 0) {
            setSelectedVariants([
              {
                variantId: variantsWithParsedPrices[0].id,
                quantity: 1,
                quantityVarying2: 1,
                deliveryOption: "daily",
                selectedDays: [],
              },
            ]);
          }
        } else {
          setProductVariants([]);
          setHasVariants(false);
        }
      } catch (error) {
        console.error("Failed to fetch product variants:", error);
        toast.error("Could not load product variants.");
        setProductVariants([]);
        setHasVariants(false);
      }
    },
    [selectedVariants.length]
  );

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await get("/admin/locations");
        if (response && Array.isArray(response.locations)) {
          setLocations(response.locations);
        }
      } catch (error) {
        console.error("Failed to fetch locations:", error);
        toast.error("Could not load locations.");
      }
    };

    if (isOpen) {
      if (productId && depotId != null) {
        fetchVariants(productId, depotId);
      }
      fetchLocations();
    } else {
      // Reset on close
      setProductVariants([]);
      setHasVariants(false);
      setSelectedVariants([]);
      setModalView("subscriptionDetails");
    }
  }, [isOpen, productId, depotId, fetchVariants]);



  // Helper functions for variant management
  const updateVariantDeliveryOption = (
    variantId: string,
    deliveryOption: string
  ) => {
    setSelectedVariants((prev) =>
      prev.map((variant) =>
        variant.variantId === variantId
          ? {
              ...variant,
              deliveryOption,
              selectedDays:
                deliveryOption === "select-days" ? variant.selectedDays : [],
            }
          : variant
      )
    );
  };

  const toggleVariantDay = (variantId: string, dayId: string) => {
    setSelectedVariants((prev) =>
      prev.map((variant) => {
        if (variant.variantId === variantId) {
          const newSelectedDays = variant.selectedDays.includes(dayId)
            ? variant.selectedDays.filter((day) => day !== dayId)
            : [...variant.selectedDays, dayId];
          return { ...variant, selectedDays: newSelectedDays };
        }
        return variant;
      })
    );
  };

  const updateVariantQuantity = (
    variantId: string,
    field: "quantity" | "quantityVarying2",
    value: number
  ) => {
    setSelectedVariants((prev) =>
      prev.map((variant) =>
        variant.variantId === variantId
          ? { ...variant, [field]: Math.max(1, value) }
          : variant
      )
    );
  };

  // Calculate delivery count for a specific variant based on its delivery schedule
  const calculateVariantDeliveryCount = (variant: SelectedVariant): number => {
    switch (variant.deliveryOption) {
      case "daily":
        return selectedPeriod;
      case "select-days":
        if (variant.selectedDays.length === 0) return 0;

        const selectedDayNumbers = variant.selectedDays
          .map((day) => {
            switch (day) {
              case "mon":
                return 1;
              case "tue":
                return 2;
              case "wed":
                return 3;
              case "thu":
                return 4;
              case "fri":
                return 5;
              case "sat":
                return 6;
              case "sun":
                return 0;
              default:
                return -1;
            }
          })
          .filter((day) => day >= 0);

        if (!startDate) return 0;

        let deliveryCount = 0;
        const startDateCopy = new Date(startDate);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + selectedPeriod - 1);

        for (
          let d = new Date(startDateCopy);
          d <= endDate;
          d.setDate(d.getDate() + 1)
        ) {
          const dayNumber = d.getDay();
          if (
            selectedDayNumbers.includes(dayNumber as 0 | 1 | 2 | 3 | 4 | 5 | 6)
          ) {
            deliveryCount++;
          }
        }
        return deliveryCount;
      case "day1-day2":
        return selectedPeriod;
      case "alternate-days":
        if (!startDate) return 0;
        // Delivery on day 1, 3, 5, ...
        return Math.ceil(selectedPeriod / 2);
      default:
        return selectedPeriod;
    }
  };

  // Fetch product variants when the modal opens
  useEffect(() => {
    if (isOpen && productId && depotId != null) {
      fetchVariants(productId, depotId);
    } else if (!isOpen) {
      // Reset on close
      setProductVariants([]);
      setHasVariants(false);
      setSelectedVariants([]);
    }
  }, [isOpen, productId, depotId, fetchVariants]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await get("/users/me");
        if (response && response.mobile) {
          setUserMobile(response.mobile);
        }
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
      }
    };
    fetchUserProfile();
  }, []);

  const handleCancelAddAddress = () => {
    setModalView("subscriptionDetails");
    setAddressFormState({
      recipientName: "",
      mobile: "",
      plotBuilding: "",
      streetArea: "",
      landmark: "",
      city: "",
      state: "",
      pincode: "",
      isDefault: false,
      label: "Home",
    });
    setFormErrors({});
  };

  const validateAddressForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!addressFormState.recipientName.trim())
      errors.recipientName = "Recipient name is required.";
    if (!addressFormState.mobile.trim())
      errors.mobile = "Mobile number is required.";
    else if (!/^\d{10}$/.test(addressFormState.mobile.trim()))
      errors.mobile = "Mobile number must be 10 digits.";
    if (!addressFormState.plotBuilding.trim())
      errors.plotBuilding = "Plot/Building is required.";
    if (!addressFormState.streetArea.trim())
      errors.streetArea = "Street/Area is required.";
    if (!addressFormState.pincode.trim())
      errors.pincode = "Pincode is required.";
    else if (!/^\d{6}$/.test(addressFormState.pincode.trim()))
      errors.pincode = "Pincode must be 6 digits.";
    if (!addressFormState.city.trim()) errors.city = "City is required.";
    if (!addressFormState.state.trim()) errors.state = "State is required.";
    if (!addressFormState.label.trim())
      errors.label = "Address label is required.";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateSubscriptionDetails = (): boolean => {
    const errors: Record<string, string> = {};
    if (!startDate) {
      errors.startDate = "Start date is required.";
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (startDate < today) {
        errors.startDate = "Start date cannot be in the past.";
      }
    }

    if (hasVariants && selectedVariants.length > 0) {
      let hasValidVariants = true;
      selectedVariants.forEach((variant) => {
        if (
          variant.deliveryOption === "select-days" &&
          variant.selectedDays.length === 0
        ) {
          hasValidVariants = false;
        }
      });
      if (!hasValidVariants) {
        errors.variantSchedules =
          "Please select delivery days for all variants with 'Select Days' option.";
      }
    } else if (deliveryOption === "select-days" && selectedDays.length === 0) {
      errors.selectedDays = "Please select at least one delivery day.";
    }

    // Only validate selectedAddressId for offline depots
    if (!selectedDepot?.isOnline && (!selectedAddressId || selectedAddressId.trim() === "")) {
      errors.selectedAddressId = "Please select a delivery address.";
    }
    
    if (hasVariants && selectedVariants.length === 0) {
      errors.selectedVariants = "Please select at least one variant.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const addressService = {
    getUserAddresses: async (): Promise<AddressData[]> => {
      try {
        setIsLoadingAddresses(true);
        const response = await get("/delivery-addresses");

        const mappedAddresses = Array.isArray(response)
          ? response.map((addr) => ({
              id: addr.id.toString(),
              recipientName: addr.recipientName || "",
              mobile: addr.mobile || "",
              plotBuilding: addr.plotBuilding || "",
              streetArea: addr.streetArea || "",
              landmark: addr.landmark || "",
              city: addr.city || "",
              state: addr.state || "",
              pincode: addr.pincode || "",
              isDefault: addr.isDefault || false,
              label: addr.label || addr.type || "Home",
            }))
          : [];

        setUserAddresses(mappedAddresses);

        if (mappedAddresses.length > 0 && !selectedAddressId) {
          setSelectedAddressId(mappedAddresses[0].id);
        }

        return mappedAddresses;
      } catch (error) {
        console.error("Error fetching addresses:", error);
        return [];
      } finally {
        setIsLoadingAddresses(false);
      }
    },
    createUserAddress: async (
      address: Omit<AddressData, "id">
    ): Promise<AddressData> => {
      try {
        const response = await post("/delivery-addresses", address);

        const mappedAddress: AddressData = {
          id: response.id.toString(),
          recipientName: response.recipientName || "",
          mobile: response.mobile || "",
          plotBuilding: response.plotBuilding || "",
          streetArea: response.streetArea || "",
          landmark: response.landmark || "",
          city: response.city || "",
          state: response.state || "",
          pincode: response.pincode || "",
          isDefault: response.isDefault || false,
          label: response.label || response.type || address.label || "Home",
        };

        setUserAddresses((prev) => [...prev, mappedAddress]);
        setSelectedAddressId(mappedAddress.id);
        return mappedAddress;
      } catch (error) {
        console.error("Error creating address:", error);
        throw error;
      }
    },
  };

  useEffect(() => {
    if (isOpen) {
      (async () => {
        try {
          const walletResp = await get("/api/wallet/balance");
          let balance = 0;
          if (typeof walletResp === "number") {
            balance = walletResp;
          } else if (walletResp && typeof walletResp.balance === "number") {
            balance = walletResp.balance;
          } else if (
            walletResp &&
            walletResp.data &&
            typeof walletResp.data.balance === "number"
          ) {
            balance = walletResp.data.balance;
          }
          setWalletBalance(balance);
        } catch (err) {
          console.error("Failed to fetch wallet balance", err);
        }
      })();
    }
  }, [isOpen]);

  useEffect(() => {
    // Only fetch user addresses if the depot is online
    if (isOpen && modalView === "subscriptionDetails" && selectedDepot?.isOnline) {
      addressService
        .getUserAddresses()
        .then((addresses) => {
          if (addresses.length > 0) {
            if (!selectedAddressId && addresses.length > 0) {
              setSelectedAddressId(addresses[0].id);
            }
          }
        })
        .catch((err) => console.error("Error loading addresses:", err));
    }
    if (!isOpen) {
      setModalView("subscriptionDetails");
    }
  }, [isOpen, modalView, selectedDepot]); // Add selectedDepot to dependency array



  const handleSaveAddress = async () => {
    if (!validateAddressForm()) return;
    const addressToCreate = {
      ...addressFormState,
    };

    try {
      await addressService.createUserAddress(addressToCreate);
      toast.success("Address saved successfully!");
      setModalView("subscriptionDetails");
      setAddressFormState({
        recipientName: "",
        mobile: "",
        plotBuilding: "",
        streetArea: "",
        landmark: "",
        city: "",
        state: "",
        pincode: "",
        isDefault: false,
        label: "Home",
      });
    } catch (error) {
      console.error("Failed to save address:", error);
      const errorMessage =
        "An error occurred while saving your address. Please try again.";
      toast.error(errorMessage);
    }
  };

  const toggleDaySelection = (dayId: string) => {
    if (selectedDays.includes(dayId)) {
      setSelectedDays(selectedDays.filter((day) => day !== dayId));
    } else {
      setSelectedDays([...selectedDays, dayId]);
    }
  };

  const handleProceedToConfirmation = () => {
    if (!selectedAddressId) {
      console.error("No address selected. Please select or add an address.");
      toast.error("Please select a delivery address");
      return;
    }

    setModalView("confirmation");
  };

  const handleConfirmSubscription = async () => {
    if (!validateSubscriptionDetails()) return;
    
    // Determine the correct address ID based on depot type
    const deliveryAddressIdForPayload = selectedDepot?.isOnline
      ? selectedAddressId
      : selectedDepot?.addressId;

    if (!product || !productId || !deliveryAddressIdForPayload || !startDate) {
      toast.error("Missing product details or critical information.");
      return;
    }

    let subscriptions: SubscriptionDetail[] = [];

    if (hasVariants) {
      subscriptions = selectedVariants
        .filter((variant) => variant.quantity > 0)
        .map((variant) => {
          const deliverySchedule = variant.deliveryOption;

          const sub: SubscriptionDetail = {
            productId: parseInt(variant.variantId, 10),
            period: selectedPeriod,
            startDate: startDate.toISOString(),
            deliverySchedule,
            qty: variant.quantity,
            internalScheduleLogicType: deliverySchedule,
          };

          if (
            deliverySchedule === "select-days" ||
            deliverySchedule === "SELECT-DAYS"
          ) {
            sub.weekdays = variant.selectedDays;
          }
          if (deliverySchedule === "day1-day2") {
            sub.altQty = variant.quantityVarying2;
          }
          return sub;
        });
    } else {
      const deliverySchedule = deliveryOption;
      const sub: SubscriptionDetail = {
        productId: parseInt(productId, 10),
        period: selectedPeriod,
        startDate: startDate.toISOString(),
        deliverySchedule,
        qty: quantity,
        internalScheduleLogicType: deliverySchedule,
      };
      if (
        deliverySchedule === "select-days" ||
        deliverySchedule === "SELECT-DAYS"
      ) {
        sub.weekdays = selectedDays;
      }

      if (deliverySchedule === "day1-day2") {
        sub.altQty = quantityVarying2;
      }

      subscriptions.push(sub);
    }

    if (subscriptions.length === 0) {
      toast.error("Please set a quantity for at least one subscription.");
      return;
    }

    const payload: OrderWithSubscriptionsRequest = {
      subscriptions,
      deliveryAddressId: String(selectedAddressId),
      walletamt: 0, // Wallet amount not handled in this form
    };

    try {
      setIsLoading(true);
      await createOrderWithSubscriptions(payload);
      toast.success("Subscription created successfully!");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create subscription:", error);
      const errorMessage =
        (error as any).response?.data?.message ||
        "An unexpected error occurred.";
      toast.error(`Failed to create subscription: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const subscriptionSummary = useMemo(() => {
    if (!product) return null;

    let totalQuantity = 0;
    let totalPrice = 0;
    let deliveryDescription = "";

    if (hasVariants && selectedVariants.length > 0) {
      // Calculate for variants with individual delivery schedules
      const variantSummaries: Array<{
        variant: ProductVariant;
        deliveryCount: number;
        totalQty: number;
        totalPrice: number;
      }> = [];

      selectedVariants.forEach((selectedVariant) => {
        const variantData = productVariants.find(
          (v) => v.id === selectedVariant.variantId
        );
        if (!variantData) return;

        const deliveryCount = calculateVariantDeliveryCount(selectedVariant);
        let variantTotalQty = 0;

        switch (selectedVariant.deliveryOption) {
          case "daily":
          case "select-days":
            variantTotalQty = selectedVariant.quantity * deliveryCount;
            break;
          case "day1-day2":
            const days1 = Math.ceil(selectedPeriod / 2);
            const days2 = Math.floor(selectedPeriod / 2);
            variantTotalQty =
              selectedVariant.quantity * days1 +
              (selectedVariant.quantityVarying2 || 1) * days2;
            break;
          case "alternate-days":
            variantTotalQty =
              selectedVariant.quantity * Math.ceil(selectedPeriod / 2);
            break;
        }

        const variantRate = getVariantPriceForPeriod(
          variantData,
          selectedPeriod
        );
        const variantTotalPrice = variantRate * variantTotalQty;
        totalQuantity += variantTotalQty;
        totalPrice += variantTotalPrice;

        variantSummaries.push({
          variant: variantData,
          deliveryCount,
          totalQty: variantTotalQty,
          totalPrice: variantTotalPrice,
        });
      });

      deliveryDescription = `${selectedVariants.length} variant${
        selectedVariants.length > 1 ? "s" : ""
      } `;
    } else {
      // Original calculation for single product
      let deliveryCount = 0;
      switch (deliveryOption) {
        case "daily":
          deliveryCount = selectedPeriod;
          totalQuantity = quantity * deliveryCount;
          deliveryDescription = `Daily delivery of ${quantity} item${
            quantity > 1 ? "s" : ""
          }`;
          break;

        case "select-days":
          if (selectedDays.length === 0) {
            deliveryCount = 0;
            totalQuantity = 0;
            deliveryDescription = "No days selected";
          } else {
            const selectedDayNumbers = selectedDays
              .map((day) => {
                switch (day) {
                  case "mon":
                    return 1;
                  case "tue":
                    return 2;
                  case "wed":
                    return 3;
                  case "thu":
                    return 4;
                  case "fri":
                    return 5;
                  case "sat":
                    return 6;
                  case "sun":
                    return 0;
                  default:
                    return -1;
                }
              })
              .filter((day) => day >= 0);

            deliveryCount = 0;
            if (startDate) {
              const startDateCopy = new Date(startDate);
              const endDate = new Date(startDate);
              endDate.setDate(endDate.getDate() + selectedPeriod - 1);

              for (
                let d = new Date(startDateCopy);
                d <= endDate;
                d.setDate(d.getDate() + 1)
              ) {
                const dayNumber = d.getDay();
                if (
                  selectedDayNumbers.includes(
                    dayNumber as 0 | 1 | 2 | 3 | 4 | 5 | 6
                  )
                ) {
                  deliveryCount++;
                }
              }
            }

            totalQuantity = quantity * deliveryCount;
            const dayLabels = daysOfWeek
              .filter((day) => selectedDays.includes(day.id))
              .map((day) => day.label);
            deliveryDescription = `On ${
              dayLabels.join(", ") || "selected days"
            }`;
          }
          break;

        case "day1-day2":
          deliveryCount = selectedPeriod;
          const days1 = Math.ceil(selectedPeriod / 2);
          const days2 = Math.floor(selectedPeriod / 2);
          totalQuantity = quantity * days1 + quantityVarying2 * days2;
          deliveryDescription = `Day1-Day2: ${quantity} & ${quantityVarying2} Qty`;
          break;

        case "alternate-days":
          deliveryCount = Math.ceil(selectedPeriod / 2);
          totalQuantity = quantity * deliveryCount;
          deliveryDescription = `Alternate Day, starting from start date`;
          break;
      }

      totalPrice = product.rate * totalQuantity;
    }

    return {
      totalQuantity,
      deliveryDescription,
      totalPrice,
      period:
        subscriptionPeriods.find((p) => p.value === selectedPeriod)?.label ||
        `${selectedPeriod} days`,
      startDate:
        startDate && !isNaN(new Date(startDate).getTime())
          ? format(new Date(startDate), "dd/MM/yyyy")
          : "Not set",
    };
  }, [
    product,
    deliveryOption,
    selectedPeriod,
    quantity,
    quantityVarying2,
    selectedDays,
    startDate,
    hasVariants,
    selectedVariants,
    productVariants,
  ]);

  const walletDeduction = useMemo(() => {
    if (!subscriptionSummary) return 0;
    return Math.min(walletBalance || 0, subscriptionSummary.totalPrice || 0);
  }, [walletBalance, subscriptionSummary]);

  const remainingPayable = useMemo(() => {
    if (!subscriptionSummary) return 0;
    return (subscriptionSummary.totalPrice || 0) - walletDeduction;
  }, [subscriptionSummary, walletDeduction]);

  if (!product) return null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) setModalView("subscriptionDetails");
      }}
    >
      <DialogContent 
        className="max-sm:max-w-md flex flex-col max-h-[90vh] p-0 bg-white min-w-[70%] rounded-xl overflow-hidden"
        onPointerDownOutside={(event) => {
          const target = event.target as HTMLElement;
          if (
            target.closest("[data-radix-popover-content]") ||
            target.closest(".rdp") ||
            target.closest(".calendar-day") ||
            target.closest('[role="gridcell"]')
          ) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader className="p-5 border-b">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl font-semibold text-gray-800">
              Create Subscription for {product?.name}
            </DialogTitle>
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-500">
                {hasVariants ? "From:" : "Price:"}
              </span>
              <p className="text-lg font-bold">
                ₹
                {hasVariants && productVariants.length > 0
                  ? Math.min(
                      ...productVariants.map((v) =>
                        getVariantPriceForPeriod(v, selectedPeriod)
                      )
                    )
                  : product?.rate}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto px-5 py-4 space-y-6 bg-gray-50">
          {modalView === "subscriptionDetails" ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Subscription Period */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      Subscription Period
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {subscriptionPeriods.map((period) => (
                        <Button
                          key={period.value}
                          variant={
                            selectedPeriod === period.value
                              ? "default"
                              : "outline"
                          }
                          className={`h-10 ${
                            selectedPeriod === period.value
                              ? "bg-green-500 hover:bg-green-600"
                              : "border-gray-300"
                          }`}
                          onClick={() => setSelectedPeriod(period.value)}
                        >
                          {period.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Start Date */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </h3>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal border-gray-300 rounded-md",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? (
                            format(startDate, "dd/MM/yyyy")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-0 pointer-events-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={(date) => {
                            setStartDate(date);
                            setCalendarOpen(false);
                            if (formErrors.startDate)
                              setFormErrors((prev) => ({
                                ...prev,
                                startDate: "",
                              }));
                          }}
                          initialFocus
                          disabled={(date) =>
                            date <
                            new Date(
                              new Date().setDate(new Date().getDate() - 1)
                            )
                          }
                        />
                      </PopoverContent>
                    </Popover>
                    {formErrors.startDate && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors.startDate}
                      </p>
                    )}
                  </div>

                  {/* Variant Selection Section */}
                  {hasVariants && productVariants.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Select Product Variants & Schedules
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {selectedVariants.length} of {productVariants.length}{" "}
                          selected
                        </Badge>
                      </div>

                      {/* Variant Grid Selection with Individual Delivery Schedules */}
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {productVariants.map((variant) => {
                          const isSelected = selectedVariants.some(
                            (sv) => sv.variantId === variant.id
                          );
                          const selectedVariant = selectedVariants.find(
                            (sv) => sv.variantId === variant.id
                          );

                          return (
                            <div
                              key={variant.id}
                              className={`border rounded-lg p-4 transition-all ${
                                isSelected
                                  ? "border-green-500 bg-green-50"
                                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-start gap-3 flex-1">
                                  {/* Checkbox */}
                                  <div
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 cursor-pointer ${
                                      isSelected
                                        ? "bg-green-500 border-green-500"
                                        : "border-gray-300"
                                    }`}
                                    onClick={() => {
                                      if (isSelected) {
                                        // Remove variant
                                        setSelectedVariants((prev) =>
                                          prev.filter(
                                            (sv) => sv.variantId !== variant.id
                                          )
                                        );
                                      } else {
                                        // Add variant
                                        setSelectedVariants((prev) => [
                                          ...prev,
                                          {
                                            variantId: variant.id,
                                            quantity: 1,
                                            quantityVarying2: 1,
                                            deliveryOption: "daily",
                                            selectedDays: [],
                                          },
                                        ]);
                                      }
                                    }}
                                  >
                                    {isSelected && (
                                      <svg
                                        className="w-3 h-3 text-white"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    )}
                                  </div>

                                  {/* Variant Info */}
                                  <div className="flex-1">
                                    <div className="flex justify-between items-start mb-1">
                                      <h4 className="font-medium text-gray-900">
                                        {variant.name}
                                      </h4>
                                      <Badge variant="outline">
                                        ₹
                                        {getVariantPriceForPeriod(
                                          variant,
                                          selectedPeriod
                                        )}{" "}
                                        {variant.unit && `per ${variant.unit}`}
                                      </Badge>
                                    </div>
                                    {variant.description && (
                                      <p className="text-xs text-gray-600 mb-3">
                                        {variant.description}
                                      </p>
                                    )}

                                    {/* Individual Delivery Schedule Controls - Only show when selected */}
                                    {isSelected && selectedVariant && (
                                      <div className="space-y-4 pt-3 border-t border-gray-200">
                                        {/* Delivery Schedule Options */}
                                        <div>
                                          <Label className="text-xs font-medium text-gray-700 mb-2 block flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            Delivery Schedule
                                          </Label>
                                          <div className="grid grid-cols-2 gap-1">
                                            <Button
                                              variant={selectedVariant.deliveryOption === 'daily' ? 'default' : 'outline'}
                                              size="sm"
                                              className={`h-7 text-xs ${selectedVariant.deliveryOption === 'daily' ? 'bg-blue-500 hover:bg-blue-600' : 'border-gray-300'} truncate`}
                                              title="Delivery every day"
                                              onClick={() => updateVariantDeliveryOption(variant.id, 'daily')}
                                            >
                                              Daily
                                            </Button>
                                            {selectedPeriod >= 15 && (
                                              <Button
                                                variant={selectedVariant.deliveryOption === 'alternate-days' ? 'default' : 'outline'}
                                                size="sm"
                                                className={`h-7 text-xs ${selectedVariant.deliveryOption === 'alternate-days' ? 'bg-blue-500 hover:bg-blue-600' : 'border-gray-300'}`}
                                                title="Delivery every other day"
                                                onClick={() => updateVariantDeliveryOption(variant.id, 'alternate-days')}
                                              >
                                                Alternate Days
                                              </Button>
                                            )}
                                            {selectedPeriod >= 7 && (
                                              <Button
                                                variant={selectedVariant.deliveryOption === 'day1-day2' ? 'default' : 'outline'}
                                                size="sm"
                                                className={`h-7 text-xs ${selectedVariant.deliveryOption === 'day1-day2' ? 'bg-blue-500 hover:bg-blue-600' : 'border-gray-300'} truncate`}
                                                title="Customize quantities for Day 1 and Day 2"
                                                onClick={() => updateVariantDeliveryOption(variant.id, 'day1-day2')}
                                              >
                                                Day 1 - Day 2
                                              </Button>
                                            )}
                                            {selectedPeriod >= 30 && (
                                              <Button
                                                variant={selectedVariant.deliveryOption === 'select-days' ? 'default' : 'outline'}
                                                size="sm"
                                                className={`h-7 text-xs ${selectedVariant.deliveryOption === 'select-days' ? 'bg-blue-500 hover:bg-blue-600' : 'border-gray-300'}`}
                                                title="Choose specific days for delivery"
                                                onClick={() => updateVariantDeliveryOption(variant.id, 'select-days')}
                                              >
                                                Weekdays
                                              </Button>
                                            )}
                                          </div>
                                        </div>

                                        {/* Day Selection for Select Days Option */}
                                        {selectedVariant.deliveryOption ===
                                          "select-days" && (
                                          <div>
                                            <Label className="text-xs font-medium text-gray-700 mb-2 block">
                                              Select delivery days:
                                            </Label>
                                            <div className="flex flex-wrap gap-1">
                                              {daysOfWeek.map((day) => (
                                                <Button
                                                  key={day.id}
                                                  type="button"
                                                  size="sm"
                                                  variant={
                                                    selectedVariant.selectedDays.includes(
                                                      day.id
                                                    )
                                                      ? "default"
                                                      : "outline"
                                                  }
                                                  className={`h-6 w-8 p-0 text-xs ${
                                                    selectedVariant.selectedDays.includes(
                                                      day.id
                                                    )
                                                      ? "bg-orange-500"
                                                      : "border-gray-300 text-gray-700"
                                                  }`}
                                                  onClick={() =>
                                                    toggleVariantDay(
                                                      variant.id,
                                                      day.id
                                                    )
                                                  }
                                                >
                                                  {day.label}
                                                </Button>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {/* Quantity Controls */}
                                        {(selectedVariant.deliveryOption ===
                                          "daily" ||
                                          selectedVariant.deliveryOption ===
                                            "select-days" ||
                                          selectedVariant.deliveryOption ===
                                            "alternate-days") && (
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-gray-700">
                                              Quantity per delivery:
                                            </span>
                                            <div className="flex items-center border rounded overflow-hidden bg-white">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                  updateVariantQuantity(
                                                    variant.id,
                                                    "quantity",
                                                    selectedVariant.quantity - 1
                                                  )
                                                }
                                                className="h-7 w-7 p-0 hover:bg-gray-100"
                                              >
                                                <Minus className="h-3 w-3" />
                                              </Button>
                                              <span className="px-3 py-1 text-sm font-medium min-w-[40px] text-center">
                                                {selectedVariant.quantity}
                                              </span>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                  updateVariantQuantity(
                                                    variant.id,
                                                    "quantity",
                                                    selectedVariant.quantity + 1
                                                  )
                                                }
                                                className="h-7 w-7 p-0 hover:bg-gray-100"
                                              >
                                                <Plus className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          </div>
                                        )}

                                        {selectedVariant.deliveryOption ===
                                          "day1-day2" && (
                                          <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs font-medium text-gray-700">
                                                Day A:
                                              </span>
                                              <div className="flex items-center border rounded overflow-hidden bg-white">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() =>
                                                    updateVariantQuantity(
                                                      variant.id,
                                                      "quantity",
                                                      selectedVariant.quantity -
                                                        1
                                                    )
                                                  }
                                                  className="h-7 w-7 p-0 hover:bg-gray-100"
                                                >
                                                  <Minus className="h-3 w-3" />
                                                </Button>
                                                <span className="px-3 py-1 text-sm font-medium min-w-[40px] text-center">
                                                  {selectedVariant.quantity}
                                                </span>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() =>
                                                    updateVariantQuantity(
                                                      variant.id,
                                                      "quantity",
                                                      selectedVariant.quantity +
                                                        1
                                                    )
                                                  }
                                                  className="h-7 w-7 p-0 hover:bg-gray-100"
                                                >
                                                  <Plus className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs font-medium text-gray-700">
                                                Day B:
                                              </span>
                                              <div className="flex items-center border rounded overflow-hidden bg-white">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() =>
                                                    updateVariantQuantity(
                                                      variant.id,
                                                      "quantityVarying2",
                                                      (selectedVariant.quantityVarying2 ||
                                                        1) - 1
                                                    )
                                                  }
                                                  className="h-7 w-7 p-0 hover:bg-gray-100"
                                                >
                                                  <Minus className="h-3 w-3" />
                                                </Button>
                                                <span className="px-3 py-1 text-sm font-medium min-w-[40px] text-center">
                                                  {selectedVariant.quantityVarying2 ||
                                                    1}
                                                </span>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() =>
                                                    updateVariantQuantity(
                                                      variant.id,
                                                      "quantityVarying2",
                                                      (selectedVariant.quantityVarying2 ||
                                                        1) + 1
                                                    )
                                                  }
                                                  className="h-7 w-7 p-0 hover:bg-gray-100"
                                                >
                                                  <Plus className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Quick Actions */}
                      <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Select all variants
                              const allVariants =
                                productVariants?.map((variant) => ({
                                  variantId: variant.id,
                                  quantity: 1,
                                  quantityVarying2: 1,
                                  deliveryOption: "daily",
                                  selectedDays: [],
                                })) || [];
                              setSelectedVariants(allVariants);
                            }}
                            className="text-xs h-8"
                            disabled={
                              selectedVariants.length ===
                              productVariants?.length
                            }
                          >
                            Select All
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedVariants([])}
                            className="text-xs h-8"
                            disabled={selectedVariants.length === 0}
                          >
                            Clear All
                          </Button>
                        </div>

                        {selectedVariants.length > 0 && (
                          <div className="text-xs text-gray-600">
                            {selectedVariants.length} variant
                            {selectedVariants.length > 1 ? "s" : ""} selected
                          </div>
                        )}
                      </div>

                      {formErrors.selectedVariants && (
                        <p className="text-red-500 text-xs mt-2">
                          {formErrors.selectedVariants}
                        </p>
                      )}
                      {formErrors.variantSchedules && (
                        <p className="text-red-500 text-xs mt-2">
                          {formErrors.variantSchedules}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Non-variant delivery options */}
                  {!hasVariants && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-3">
                        Delivery Schedule
                      </h3>
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          variant={deliveryOption === 'daily' ? 'default' : 'outline'}
                          className={`h-9 text-xs ${deliveryOption === 'daily' ? 'bg-blue-500 hover:bg-blue-600' : 'border-gray-300'}`}
                          title="Delivery every day"
                          onClick={() => setDeliveryOption('daily')}
                        >
                          Daily
                        </Button>
                        {selectedPeriod >= 15 && (
                          <Button
                            variant={deliveryOption === 'alternate-days' ? 'default' : 'outline'}
                            className={`h-9 text-xs ${deliveryOption === 'alternate-days' ? 'bg-blue-500 hover:bg-blue-600' : 'border-gray-300'}`}
                            title="Delivery every other day"
                            onClick={() => setDeliveryOption('alternate-days')}
                          >
                            Alternate Days
                          </Button>
                        )}
                        {selectedPeriod >= 7 && (
                          <Button
                            variant={deliveryOption === 'day1-day2' ? 'default' : 'outline'}
                            className={`h-9 text-xs ${deliveryOption === 'day1-day2' ? 'bg-blue-500 hover:bg-blue-600' : 'border-gray-300'}`}
                            title="Customize quantities for Day 1 and Day 2"
                            onClick={() => setDeliveryOption('day1-day2')}
                          >
                            Day 1 - Day 2
                          </Button>
                        )}
                        {selectedPeriod >= 30 && (
                          <Button
                            variant={deliveryOption === 'select-days' ? 'default' : 'outline'}
                            className={`h-9 text-xs ${deliveryOption === 'select-days' ? 'bg-blue-500 hover:bg-blue-600' : 'border-gray-300'}`}
                            title="Choose specific days for delivery"
                            onClick={() => setDeliveryOption('select-days')}
                          >
                            Weekdays
                          </Button>
                        )}
                      </div>

                      {deliveryOption === "select-days" && (
                        <div className="mt-4 p-3 rounded-md bg-white border border-gray-200">
                          <h4 className="text-xs font-medium text-gray-600 mb-2">
                            Select delivery days:
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {daysOfWeek.map((day) => (
                              <Button
                                key={day.id}
                                type="button"
                                size="sm"
                                variant={
                                  selectedDays.includes(day.id)
                                    ? "default"
                                    : "outline"
                                }
                                className={`h-8 w-9 p-0 ${
                                  selectedDays.includes(day.id)
                                    ? "bg-orange-500"
                                    : "border-gray-300 text-gray-700"
                                }`}
                                onClick={() => {
                                  toggleDaySelection(day.id);
                                  if (formErrors.selectedDays)
                                    setFormErrors((prev) => ({
                                      ...prev,
                                      selectedDays: "",
                                    }));
                                }}
                              >
                                {day.label}
                              </Button>
                            ))}
                          </div>
                          {formErrors.selectedDays && (
                            <p className="text-red-500 text-xs mt-1">
                              {formErrors.selectedDays}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Quantity selectors for non-variant products */}
                      <div className="mt-4">
                        {(deliveryOption === "daily" ||
                          deliveryOption === "select-days" ||
                          deliveryOption === "alternate-days") && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">
                              Quantity per delivery:
                            </span>
                            <div className="flex items-center border rounded-lg overflow-hidden bg-white w-28">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setQuantity(Math.max(1, quantity - 1))
                                }
                                className="h-9 w-9 p-0 hover:bg-gray-100"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="flex-1 text-center font-medium">
                                {quantity}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setQuantity(quantity + 1)}
                                className="h-9 w-9 p-0 hover:bg-gray-100"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {deliveryOption === "day1-day2" && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">
                                D A:
                              </span>
                              <div className="flex items-center border rounded-lg overflow-hidden bg-white w-28">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setQuantity(Math.max(1, quantity - 1))
                                  }
                                  className="h-9 w-9 p-0 hover:bg-gray-100"
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="flex-1 text-center font-medium">
                                  {quantity}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setQuantity(quantity + 1)}
                                  className="h-9 w-9 p-0 hover:bg-gray-100"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">
                                Day B:
                              </span>
                              <div className="flex items-center border rounded-lg overflow-hidden bg-white w-28">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setQuantityVarying2(
                                      Math.max(1, quantityVarying2 - 1)
                                    )
                                  }
                                  className="h-9 w-9 p-0 hover:bg-gray-100"
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="flex-1 text-center font-medium">
                                  {quantityVarying2}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setQuantityVarying2(quantityVarying2 + 1)
                                  }
                                  className="h-9 w-9 p-0 hover:bg-gray-100"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column - Address Section */}
                <div className="space-y-6">
{/* START: Replace the original address section with this code */}
<div className="bg-white border border-gray-200 rounded-lg p-4">
  {/* Conditionally render based on depot type */}
  {selectedDepot?.isOnline ? (
    <>
      {/* ===== UI for ONLINE Depots (Home Delivery) ===== */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-gray-700">
          Delivery Address
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setAddressFormState((prev) => ({
              ...prev,
              mobile: userMobile,
            }));
            setModalView("addressForm");
          }}
          className="text-xs h-8"
        >
          <Plus className="h-3 w-3 mr-1" /> Add New
        </Button>
      </div>

      {isLoadingAddresses ? (
        <div className="flex items-center justify-center py-6">
          <span className="text-gray-500 text-sm">
            Loading your addresses...
          </span>
        </div>
      ) : userAddresses.length > 0 ? (
        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
          <RadioGroup
            value={selectedAddressId || ""}
            onValueChange={(id: string) => {
              setSelectedAddressId(id);
              if (formErrors.selectedAddressId)
                setFormErrors((prev) => ({
                  ...prev,
                  selectedAddressId: "",
                }));
            }}
            className="space-y-3"
          >
            {userAddresses.map((address) => (
              <div
                key={address.id}
                className={`p-3 border rounded-lg cursor-pointer transition-all ${
                  selectedAddressId === address.id
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <Label
                  htmlFor={`address-item-${address.id}`}
                  className="flex items-start space-x-3 w-full"
                >
                  <RadioGroupItem
                    value={address.id}
                    id={`address-item-${address.id}`}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-900">
                        {address.recipientName}
                      </span>
                      <Badge variant="outline">{address.label}</Badge>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {address.plotBuilding}, {address.streetArea}
                    </p>
                    <p className="text-xs text-gray-600">
                      {address.city}, {address.state} - {address.pincode}
                    </p>
                    {address.isDefault && (
                      <span className="inline-block mt-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                        Default
                      </span>
                    )}
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-gray-500 text-sm mb-3">
            No delivery addresses saved.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAddressFormState((prev) => ({
                ...prev,
                mobile: userMobile,
              }));
              setModalView("addressForm");
            }}
          >
            <Plus className="h-3 w-3 mr-1" /> Add Delivery Address
          </Button>
        </div>
      )}
    </>
  ) : (
    <>
      {/* ===== UI for OFFLINE Depots (Pickup) ===== */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-gray-700">
          Pickup From
        </h3>
      </div>
      {selectedDepot ? (
        <div className="p-3 border rounded-lg bg-gray-100">
          <div className="flex-1">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-900">
                {selectedDepot.name}
              </span>
              <Badge variant="secondary">Pickup Point</Badge>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {selectedDepot.address}
            </p>
            <p className="text-xs text-gray-600">
              {selectedDepot.city} {selectedDepot.state} {selectedDepot.pincode}
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-gray-500 text-sm">
            Depot address not available.
          </p>
        </div>
      )}
    </>
  )}
</div>
 

                  {/* Enhanced Summary Section with Per-Variant Details */}
                  {subscriptionSummary && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-3">
                        Order Summary
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Period:</span>
                          <span>{subscriptionSummary.period}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Schedule:</span>
                          <span className="text-right">
                            {subscriptionSummary.deliveryDescription}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Start Date:</span>
                          <span>{subscriptionSummary.startDate}</span>
                        </div>

                        {/* Per-Variant Summary */}
                        {hasVariants && selectedVariants.length > 0 && (
                          <div className="border-t border-gray-200 pt-2 mt-2">
                            <span className="text-xs font-medium text-gray-600 block mb-2">
                              Variant Details:
                            </span>
                            {selectedVariants.map((selectedVariant, index) => {
                              const variant = productVariants.find(
                                (v) => v.id === selectedVariant.variantId
                              );
                              if (!variant) return null;

                              const deliveryCount =
                                calculateVariantDeliveryCount(selectedVariant);
                              let variantTotalQty = 0;

                              switch (selectedVariant.deliveryOption) {
                                case "daily":
                                case "select-days":
                                  variantTotalQty =
                                    selectedVariant.quantity * deliveryCount;
                                  break;
                                case "day1-day2":
                                  const days1 = Math.ceil(selectedPeriod / 2);
                                  const days2 = Math.floor(selectedPeriod / 2);
                                  variantTotalQty =
                                    selectedVariant.quantity * days1 +
                                    (selectedVariant.quantityVarying2 || 1) *
                                      days2;
                                  break;
                                case "alternate-days":
                                  variantTotalQty =
                                    selectedVariant.quantity *
                                    Math.ceil(selectedPeriod / 2);
                                  break;
                              }

                              const scheduleText =
                                selectedVariant.deliveryOption === "daily"
                                  ? "Daily"
                                  : selectedVariant.deliveryOption ===
                                    "select-days"
                                  ? `${selectedVariant.selectedDays.length} days/week`
                                  : selectedVariant.deliveryOption ===
                                    "alternate-days"
                                  ? "Alternate Day"
                                  : "Day1-Day2";

                              return (
                                <div
                                  key={index}
                                  className="bg-gray-50 rounded p-2 mb-2 text-xs"
                                >
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium text-gray-800">
                                      {variant.name}
                                    </span>
                                    <div>
                                      <Badge
                                        variant="outline"
                                        className="mr-2 text-xs"
                                      >
                                        {scheduleText}
                                      </Badge>
                                      <Badge variant="outline">
                                        ₹
                                        {getVariantPriceForPeriod(
                                          variant,
                                          selectedPeriod
                                        )}{" "}
                                        {variant.unit && `per ${variant.unit}`}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      {variantTotalQty} {variant.unit || ""} × ₹
                                      {getVariantPriceForPeriod(
                                        variant,
                                        selectedPeriod
                                      )}
                                    </span>
                                    <span className="font-medium">
                                      ₹
                                      {(
                                        variantTotalQty *
                                        getVariantPriceForPeriod(
                                          variant,
                                          selectedPeriod
                                        )
                                      ).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Quantity:</span>
                          <span>
                            {subscriptionSummary.totalQuantity}{" "}
                            {!hasVariants ? product?.unit || "" : "items"}
                          </span>
                        </div>

                        <div className="border-t border-gray-200 pt-2 mt-2">
                          <div className="flex justify-between font-medium">
                            <span>Total Price:</span>
                            <span className="text-green-600">
                              ₹{subscriptionSummary.totalPrice.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : modalView === "confirmation" ? (
            <div className="bg-white p-4 rounded-md space-y-4">
              <h3 className="text-lg font-semibold text-center">
                Confirm Your Subscription
              </h3>

              <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Product:</span>
                  <span className="font-semibold">{product.name}</span>
                </div>

                {/* Enhanced Variant Summary in Confirmation with Individual Schedules */}
                {hasVariants && selectedVariants.length > 0 && (
                  <div className="border-t border-gray-200 pt-3">
                    <span className="text-sm font-medium block mb-2">
                      Selected Variants & Schedules:
                    </span>
                    <div className="space-y-3">
                      {selectedVariants.map((selectedVariant, index) => {
                        const variant = productVariants.find(
                          (v) => v.id === selectedVariant.variantId
                        );
                        if (!variant) return null;

                        const deliveryCount =
                          calculateVariantDeliveryCount(selectedVariant);
                        const scheduleText =
                          selectedVariant.deliveryOption === "daily"
                            ? "Daily delivery"
                            : selectedVariant.deliveryOption === "select-days"
                            ? `On ${selectedVariant.selectedDays
                                .map(
                                  (day) =>
                                    daysOfWeek.find((d) => d.id === day)?.label
                                )
                                .join(", ")}`
                            : selectedVariant.deliveryOption ===
                              "alternate-days"
                            ? "Alternate Day"
                            : "Day1-Day2";

                        return (
                          <div
                            key={index}
                            className="bg-white p-3 rounded border text-sm"
                          >
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium">
                                {variant.name}
                              </span>
                              <Badge variant="outline">
                                ₹
                                {getVariantPriceForPeriod(
                                  variant,
                                  selectedPeriod
                                )}{" "}
                                {variant.unit && `per ${variant.unit}`}
                              </Badge>
                            </div>
                            <div className="text-xs text-gray-600 space-y-1">
                              <div>Schedule: {scheduleText}</div>
                              <div>Deliveries: {deliveryCount} times</div>
                              {selectedVariant.deliveryOption !==
                                "day1-day2" && (
                                <div>
                                  Quantity per delivery:{" "}
                                  {selectedVariant.quantity}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Period:</span>
                  <span>{subscriptionSummary?.period}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Start Date:</span>
                  <span>{subscriptionSummary?.startDate}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Quantity:</span>
                  <span>
                    {subscriptionSummary?.totalQuantity}{" "}
                    {!hasVariants ? product?.unit || "" : "items"}
                  </span>
                </div>

                <div className="pt-2 border-t border-gray-200 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Subtotal:</span>
                    <span className="text-sm">
                      ₹{subscriptionSummary?.totalPrice?.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Wallet Credit:</span>
                    <span className="text-sm text-green-600">
                      -₹{walletDeduction.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between font-medium pt-2">
                    <span className="text-sm font-semibold">
                      Amount Payable:
                    </span>
                    <span className="text-sm font-semibold text-green-600">
                      ₹{remainingPayable.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {subscriptionSummary && (
                <>
                  {remainingPayable > 0 ? (
                    <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                      <p className="text-xs text-blue-700 flex items-start">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-1.5 mt-0.5 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        {walletDeduction > 0
                          ? `₹${walletDeduction.toFixed(
                              2
                            )} will be deducted from your wallet. The remaining ₹${remainingPayable.toFixed(
                              2
                            )} will be collected via Cash/UPI on delivery.`
                          : `Full amount of ₹${remainingPayable.toFixed(
                              2
                            )} will be collected via Cash/UPI on delivery.`}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-green-50 p-3 rounded-md border border-green-100">
                      <p className="text-xs text-green-700 flex items-start">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-1.5 mt-0.5 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Full amount of ₹
                        {subscriptionSummary?.totalPrice?.toFixed(2)} will be
                        deducted from your wallet.
                      </p>
                    </div>
                  )}
                </>
              )}

              {selectedDepot?.isOnline ? (
                <div className="bg-white p-4 rounded-md border">
                  <h4 className="text-sm font-medium mb-2">
                    Delivery Address:
                  </h4>
                  {userAddresses.map((address) => {
                    if (address.id === selectedAddressId) {
                      return (
                        <div key={address.id} className="text-sm">
                          <Badge variant="outline" className="mt-1">
                            {address.label}
                          </Badge>
                          <p>
                            <span className="font-medium">
                              {address.recipientName}
                            </span>{" "}
                            • {address.mobile}
                          </p>
                          <p>
                            {address.plotBuilding}, {address.streetArea}
                          </p>
                          {address.landmark && <p>{address.landmark}</p>}
                          <p>
                            {address.city}, {address.state} - {address.pincode}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              ) : (
                <div className="bg-white p-4 rounded-md border">
                  <h4 className="text-sm font-medium mb-2">Pickup from Depot:</h4>
                  <div className="text-sm">
                    <p className="font-medium">{selectedDepot?.name}</p>
                    <p>{selectedDepot?.address}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Address Form View
            <div className="bg-white p-4 rounded-md space-y-4">
              <h3 className="text-lg font-semibold">Add New Address</h3>
              <div className="space-y-5">
                <div>
                  <Label
                    htmlFor="address-label"
                    className="text-sm font-medium mb-2 block"
                  >
                    Address Label
                  </Label>
                  <RadioGroup
                    defaultValue="Home"
                    value={addressFormState.label}
                    onValueChange={handleAddressLabelChange}
                    className="flex gap-4 mt-1"
                    id="address-label"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="Home"
                        id="type-home"
                        className="text-green-500"
                      />
                      <Label htmlFor="type-home" className="text-sm">
                        Home
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="Work"
                        id="type-work"
                        className="text-green-500"
                      />
                      <Label htmlFor="type-work" className="text-sm">
                        Work
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Other" id="label-other" />
                      <Label htmlFor="label-other">Other</Label>
                    </div>
                  </RadioGroup>
                  {formErrors.label && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.label}
                    </p>
                  )}
                </div>
                <div>
                  <Label
                    htmlFor="recipientName"
                    className="text-sm font-medium mb-1.5 block"
                  >
                    Delivery To*
                  </Label>
                  <input
                    id="recipientName"
                    name="recipientName"
                    value={addressFormState.recipientName}
                    onChange={handleAddressFormChange}
                    placeholder="Full name of recipient"
                    className="w-full h-11 px-3 border border-gray-300 rounded-md bg-white"
                  />
                  {formErrors.recipientName && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.recipientName}
                    </p>
                  )}
                </div>
                <div>
                  <Label
                    htmlFor="mobile"
                    className="text-sm font-medium mb-1.5 block"
                  >
                    Mobile*
                  </Label>
                  <input
                    id="mobile"
                    name="mobile"
                    value={addressFormState.mobile}
                    onChange={handleAddressFormChange}
                    placeholder="Mobile number"
                    className="w-full h-11 px-3 border border-gray-300 rounded-md bg-white"
                  />
                  {formErrors.mobile && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.mobile}
                    </p>
                  )}
                </div>
                <div>
                  <Label
                    htmlFor="plotBuilding"
                    className="text-sm font-medium mb-1.5 block"
                  >
                    Plot/Building*
                  </Label>
                  <input
                    id="plotBuilding"
                    name="plotBuilding"
                    value={addressFormState.plotBuilding}
                    onChange={handleAddressFormChange}
                    placeholder="Plot number, building name"
                    className="w-full h-11 px-3 border border-gray-300 rounded-md bg-white"
                  />
                  {formErrors.plotBuilding && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.plotBuilding}
                    </p>
                  )}
                </div>
                <div>
                  <Label
                    htmlFor="streetArea"
                    className="text-sm font-medium mb-1.5 block"
                  >
                    Street/Area*
                  </Label>
                  <input
                    id="streetArea"
                    name="streetArea"
                    value={addressFormState.streetArea}
                    onChange={handleAddressFormChange}
                    placeholder="Street, area"
                    className="w-full h-11 px-3 border border-gray-300 rounded-md bg-white"
                  />
                  {formErrors.streetArea && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.streetArea}
                    </p>
                  )}
                </div>
                <div>
                  <Label
                    htmlFor="landmark"
                    className="text-sm font-medium mb-1.5 block"
                  >
                    Landmark (Optional)
                  </Label>
                  <input
                    id="landmark"
                    name="landmark"
                    value={addressFormState.landmark}
                    onChange={handleAddressFormChange}
                    placeholder="Nearby landmark"
                    className="w-full h-11 px-3 border border-gray-300 rounded-md bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="city"
                      className="text-sm font-medium mb-1.5 block"
                    >
                      City*
                    </Label>
                    <Input
                      id="city"
                      value={addressFormState.city}
                      onChange={(e) =>
                        handleAddressChange("city", e.target.value)
                      }
                      placeholder="e.g., Metropolis"
                      className={formErrors.city ? "border-red-500" : ""}
                    />
                    {formErrors.city && (
                      <p className="text-red-500 text-sm mt-1">
                        {formErrors.city}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label
                      htmlFor="state"
                      className="text-sm font-medium mb-1.5 block"
                    >
                      State*
                    </Label>
                    <Input
                      id="state"
                      value={addressFormState.state}
                      onChange={(e) =>
                        handleAddressChange("state", e.target.value)
                      }
                      placeholder="e.g., State of Mind"
                      className={formErrors.state ? "border-red-500" : ""}
                    />
                    {formErrors.state && (
                      <p className="text-red-500 text-sm mt-1">
                        {formErrors.state}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <Label
                    htmlFor="location"
                    className="text-sm font-medium mb-1.5 block"
                  >
                    Location*
                  </Label>
                  <Select
                    onValueChange={(value) =>
                      handleAddressChange("locationId", parseInt(value))
                    }
                    value={addressFormState.locationId?.toString()}
                  >
                    <SelectTrigger
                      className={
                        formErrors.locationId ? "border-red-500" : ""
                      }
                    >
                      <SelectValue placeholder="Select a location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem
                          key={location.id}
                          value={location.id.toString()}
                        >
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.locationId && (
                    <p className="text-red-500 text-sm mt-1">
                      {formErrors.locationId}
                    </p>
                  )}
                </div>
                <div>
                  <Label
                    htmlFor="pincode"
                    className="text-sm font-medium mb-1.5 block"
                  >
                    Pincode*
                  </Label>
                  <input
                    id="pincode"
                    name="pincode"
                    type="text"
                    value={addressFormState.pincode}
                    onChange={handleAddressFormChange}
                    placeholder="Pincode"
                    className="w-full h-11 px-3 border border-gray-300 rounded-md bg-white"
                  />
                  {formErrors.pincode && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.pincode}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isDefault"
                    name="isDefault"
                    checked={addressFormState.isDefault}
                    onChange={(e) =>
                      setAddressFormState((prev) => ({
                        ...prev,
                        isDefault: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 text-green-500 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <Label htmlFor="isDefault" className="text-sm">
                    Set as default address
                  </Label>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-white">
          {modalView === "subscriptionDetails" ? (
            <Button
              onClick={handleProceedToConfirmation}
              disabled={isLoadingAddresses}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-md font-medium"
            >
              Review Subscription
            </Button>
          ) : modalView === "addressForm" ? (
            <div className="flex justify-end gap-3 w-full">
              <Button
                variant="outline"
                onClick={handleCancelAddAddress}
                className="rounded-lg h-11 border-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveAddress}
                className="bg-green-500 hover:bg-green-600 text-white rounded-lg h-11"
                disabled={
                  !!(
                    formErrors.recipientName ||
                    formErrors.mobile ||
                    formErrors.plotBuilding ||
                    formErrors.streetArea ||
                    formErrors.pincode ||
                    formErrors.city ||
                    formErrors.state ||
                    formErrors.label
                  )
                }
              >
                Save Address
              </Button>
            </div>
          ) : (
            <div className="flex justify-end items-center gap-3 w-full">
              <Button
                variant="outline"
                className="rounded-lg h-11 border-gray-300"
                onClick={() => setModalView("subscriptionDetails")}
              >
                Back
              </Button>

              <Button
                className="bg-green-500 hover:bg-green-600 text-white rounded-lg h-11"
                onClick={handleConfirmSubscription}
                disabled={
                  isLoading ||
                  !!(
                    formErrors.startDate ||
                    formErrors.selectedDays ||
                    formErrors.selectedAddressId ||
                    formErrors.variantSchedules
                  )
                }
              >
                {isLoading ? "Confirming..." : "Confirm Subscription"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
