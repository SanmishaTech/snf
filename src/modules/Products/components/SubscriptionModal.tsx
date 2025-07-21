import type React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { get, post } from "@/services/apiService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { INDIAN_STATES } from "@/config/states";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  CalendarIcon,
  Plus,
  Minus,
  Package,
  Clock,
  Sparkles,
  TrendingDown,
  Gift,
  Star,
  Zap,
  Wallet,
} from "lucide-react";
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
import {
  getPublicAreaMasters,
  validateDairySupport,
  type AreaMaster,
} from "@/services/areaMasterService";
import { createLead } from "@/services/leadService";
import { ServiceNotAvailableDialog } from "@/modules/Lead";

// Enhanced interfaces to support variants with individual delivery schedules
interface ProductVariant {
  id: string;
  name: string;
  mrp?: number; // Maximum Retail Price for display only
  buyOncePrice?: number; // Buy once price
  price3Day?: number;
  price7Day?: number;
  price15Day?: number;
  price1Month?: number;
  name?: string;
  description?: string;
  isAvailable?: boolean;
}

interface LocationData {
  id: number;
  name: string;
  city?: {
    id: number;
    name: string;
  };
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
  mrp?: number; // Maximum Retail Price for display only
  buyOncePrice?: number; // Buy once price
  price3Day?: number;
  price7Day?: number;
  price15Day?: number;
  price1Month?: number;
  name?: string;
  isDairyProduct?: boolean; // Flag to indicate if product is dairy
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
  { id: "mon", label: "Mon", fullName: "Monday" },
  { id: "tue", label: "Tue", fullName: "Tuesday" },
  { id: "wed", label: "Wed", fullName: "Wednesday" },
  { id: "thu", label: "Thu", fullName: "Thursday" },
  { id: "fri", label: "Fri", fullName: "Friday" },
  { id: "sat", label: "Sat", fullName: "Saturday" },
  { id: "sun", label: "Sun", fullName: "Sunday" },
];

const subscriptionPeriods = [
  { value: 3, label: "3 Days (Trial Pack)" },
  // { value: 7, label: "7 Days (Regular Pack)" },
  { value: 15, label: "15 Days (Mid Saver Pack)" },
  { value: 30, label: "30 Days (Super Saver Pack)" },
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
    useState<SubscriptionPeriodValue>(3);

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
  const [useWallet, setUseWallet] = useState(true);
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [areaMasters, setAreaMasters] = useState<AreaMaster[]>([]);
  const [selectedAreaMaster, setSelectedAreaMaster] = useState<AreaMaster | null>(null);
  const [showServiceNotAvailableDialog, setShowServiceNotAvailableDialog] = useState(false);
  const [serviceNotAvailableMessage, setServiceNotAvailableMessage] = useState<string>("");

  useEffect(() => {
    const resetOptionIfNeeded = (option: string) => {
      const isAlternateInvalid =
        selectedPeriod < 15 && option === "alternate-days";
      const isDay1Day2Invalid = selectedPeriod < 7 && option === "day1-day2";
      const isSelectDaysInvalid =
        selectedPeriod < 30 && option === "select-days";

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
    mobile: userMobile || "",
    plotBuilding: "",
    streetArea: "",
    landmark: "",
    city: "Dombivli",
    state: "Maharashtra",
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
    id: variant.id?.toString() || variant.id,
    name: variant.name,
    mrp: toNumber(variant.mrp),
    buyOncePrice: toNumber(variant.buyOncePrice),
    price3Day: toNumber(variant.price3Day),
    price15Day: toNumber(variant.price15Day),
    price1Month: toNumber(variant.price1Month),
    unit: variant.name,
    description: variant.description,
    isAvailable: variant.isAvailable ?? true,
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
      case 15:
        candidate = pick(variant.price15Day);
        break;
      case 30:
        candidate = pick(variant.price1Month);
        break;
    }
    // Fallback to buyOncePrice then MRP if no period-specific price is available
    return candidate ?? variant.buyOncePrice ?? variant.mrp ?? 0;
  };

  const fetchVariants = useCallback(
    async (productId: string, depotId: number) => {
      if (!productId || depotId == null) return;

      try {
        const response = await get(
          `/public/depot-variants/${productId}?depotId=${depotId}`
        );
        const fetchedVariants = response?.data || response;

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
  const fetchAreaMasters = async () => {
    try {
      const areaMastersList = await getPublicAreaMasters();
      setAreaMasters(areaMastersList);
    } catch (error) {
      console.error("Failed to fetch area masters:", error);
      toast.error("Could not load delivery areas.");
    }
  };

    if (isOpen) {
      if (productId && depotId != null) {
        fetchVariants(productId, depotId);
      }
      fetchAreaMasters();
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
      // Only fetch user profile if user is authenticated
      const token = localStorage.getItem("authToken");
      if (!token) {
        return; // Don't make API calls for non-authenticated users
      }

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

  // Sync userMobile with addressFormState when userMobile is updated
  useEffect(() => {
    if (userMobile) {
      setAddressFormState(prev => ({
        ...prev,
        mobile: userMobile
      }));
    }
  }, [userMobile]);

  const handleCancelAddAddress = () => {
    setModalView("subscriptionDetails");
    setAddressFormState({
      recipientName: "",
      mobile: "",
      plotBuilding: "",
      streetArea: "",
      landmark: "",
      city: "Dombivli",
      state: "Maharashtra",
      pincode: "",
      isDefault: false,
      label: "Home",
      locationId: undefined,
    });
    setFormErrors({});
  };

  const validateAddressForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!addressFormState?.recipientName?.trim())
      errors.recipientName = "Recipient name is required.";
    if (!addressFormState?.mobile?.trim())
      errors.mobile = "Mobile number is required.";
    else if (!/^\d{10}$/.test(addressFormState.mobile.trim()))
      errors.mobile = "Mobile number must be 10 digits.";
    if (!addressFormState?.plotBuilding?.trim())
      errors.plotBuilding = "Plot/Building is required.";
    if (!addressFormState?.streetArea?.trim())
      errors.streetArea = "Street/Area is required.";
    if (!addressFormState?.pincode?.trim())
      errors.pincode = "Pincode is required.";
    else if (!/^\d{6}$/.test(addressFormState.pincode.trim()))
      errors.pincode = "Pincode must be 6 digits.";
    if (!addressFormState?.city?.trim()) errors.city = "City is required.";
    if (!addressFormState?.state?.trim()) errors.state = "State is required.";
    if (!addressFormState?.label?.trim())
      errors.label = "Address label is required.";
    
    // Area master selection is required
    if (!selectedAreaMaster) {
      errors.areaMaster = "Please select a delivery area.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateSubscriptionDetails = (): boolean => {
    const errors: Record<string, string> = {};
    if (!startDate) {
      errors.startDate = "Start date is required.";
    } else {
      // Minimum date should be +3 days from current date
      const minDate = new Date();
      minDate.setDate(minDate.getDate() + 3);
      minDate.setHours(0, 0, 0, 0);
      if (startDate < minDate) {
        errors.startDate = "Start date must be at least 3 days from today.";
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

    // Validate address based on depot type
    if (selectedDepot?.isOnline) {
      // For online depots, user must select a delivery address
      if (
        selectedAddressId == null ||
        String(selectedAddressId).trim() === ""
      ) {
        errors.selectedAddressId = "Please select a delivery address.";
      }
    } else {
      // For offline depots, ensure depot has an address ID for pickup
      if (selectedDepot?.address == null) {
        errors.depotAddress =
          "Depot address information is missing. Please contact support.";
      }
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
    if (
      isOpen &&
      modalView === "subscriptionDetails" &&
      selectedDepot?.isOnline
    ) {
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
  }, [isOpen, modalView, selectedDepot?.isOnline]); // Rerun when depot's online status changes

  const handleSaveAddress = async () => {
    if (!validateAddressForm()) return;
    
    // Check if this is a dairy product in a non-dairy area
    const isDairyProductInNonDairyArea = product?.isDairyProduct && 
      selectedAreaMaster && 
      !selectedAreaMaster.isDairyProduct;
    
    
    if (isDairyProductInNonDairyArea) {
      // Create lead instead of address
      const leadData = {
        name: addressFormState.recipientName,
        mobile: addressFormState.mobile,
        email: "", // Optional, we don't collect email in address form
        plotBuilding: addressFormState.plotBuilding,
        streetArea: addressFormState.streetArea,
        landmark: addressFormState.landmark || "",
        pincode: addressFormState.pincode,
        city: addressFormState.city,
        state: addressFormState.state,
        productId: product.id,
        isDairyProduct: true,
        notes: `Lead captured from subscription modal for area: ${selectedAreaMaster.name}`,
        status: "NEW"
      };

      try {
        await createLead(leadData);
        toast.success("Thank you for your interest! We've noted your details and will contact you when we expand dairy delivery to your area.");
        
        // Show area not served message
        setServiceNotAvailableMessage(`We don't currently serve dairy products in ${selectedAreaMaster.name}. However, we'd love to expand our dairy delivery services to your area! We've saved your details and will notify you when service becomes available.`);
        setShowServiceNotAvailableDialog(true);
        
        // Reset form and go back to subscription details
        setAddressFormState({
          recipientName: "",
          mobile: "",
          plotBuilding: "",
          streetArea: "",
          landmark: "",
          city: "",
          state: "",
          isDefault: false,
          label: "Home",
        });
        setSelectedAreaMaster(null);
        setModalView("subscriptionDetails");
      } catch (error) {
        console.error("Failed to save lead:", error);
        toast.error("An error occurred while saving your information. Please try again.");
      }
    } else {
      // Normal address saving flow
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
          isDefault: false,
          label: "Home",
        });
      } catch (error) {
        console.error("Failed to save address:", error);
        const errorMessage =
          "An error occurred while saving your address. Please try again.";
        toast.error(errorMessage);
      }
    }
  };

  // Handle area master selection 
  const handleAreaMasterSelection = async (areaMaster: AreaMaster) => {
    setSelectedAreaMaster(areaMaster);
    
    // Store dairy validation message for later use during save, but don't show dialog immediately
    if (product?.isDairyProduct && !areaMaster.isDairyProduct) {
      const message = `We don't currently serve dairy products in ${areaMaster.name}. However, we'd love to expand our dairy delivery services to your area!`;
      setServiceNotAvailableMessage(message);
    } else {
      // Area is valid for this product type
      setServiceNotAvailableMessage("");
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
    // Enforce minimum 3 selected days for weekday schedule
    if (
      !hasVariants &&
      deliveryOption === "select-days" &&
      selectedDays.length < 3
    ) {
      toast.error("Please select at least 3 delivery days.");
      return;
    }
    if (
      hasVariants &&
      selectedVariants.some(
        (v) => v.deliveryOption === "select-days" && v.selectedDays.length < 3
      )
    ) {
      toast.error(
        "Please select at least 3 delivery days for all selected variants."
      );
      return;
    }

    // Only require address selection for online depots (home delivery)
    if (selectedDepot?.isOnline && selectedAddressId == null) {
      console.error("No address selected. Please select or add an address.");
      toast.error("Please select a delivery address");
      return;
    }

    // For offline depots, ensure depot has address information
    if (!selectedDepot?.isOnline && selectedDepot?.address == null) {
      toast.error(
        "Depot address information is missing. Please contact support."
      );
      return;
    }

    setModalView("confirmation");
  };

  // Helper to get the subscription price for a base product based on the period
  const getProductPriceForPeriod = (
    product: ProductData,
    period: number
  ): number => {
    const pick = (val: number | null | undefined) =>
      Number.isFinite(val) && val! > 0 ? val! : undefined;
    let candidate: number | undefined;
    switch (period) {
      case 3:
        candidate = pick(product.price3Day);
        break;
      case 15:
        candidate = pick(product.price15Day);
        break;
      case 30:
        candidate = pick(product.price1Month);
        break;
    }
    return candidate ?? product.buyOncePrice ?? product.mrp ?? 0; // Fallback chain
  };

  // Helper to calculate delivery count for non-variant products
  const calculateDeliveryCount = (): number => {
    const dayMap = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0 };
    switch (deliveryOption) {
      case "daily":
        return selectedPeriod;
      case "select-days": {
        if (!startDate || selectedDays.length === 0) return 0;
        const selectedDayNumbers = selectedDays
          .map((day) => dayMap[day as keyof typeof dayMap])
          .filter((day): day is number => day !== undefined);

        let count = 0;
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + selectedPeriod - 1);
        for (
          let d = new Date(startDate);
          d <= endDate;
          d.setDate(d.getDate() + 1)
        ) {
          if (selectedDayNumbers.includes(d.getDay())) {
            count++;
          }
        }
        return count;
      }
      case "day1-day2":
        return selectedPeriod;
      case "alternate-days":
        return Math.ceil(selectedPeriod / 2);
      default:
        return selectedPeriod;
    }
  };

  // Calculate savings by comparing MRP with subscription prices
  const calculateSavings = () => {
    if (!hasVariants || selectedVariants.length === 0) {
      // For single product without variants
      if (!product) return 0;

      const deliveryCount = calculateDeliveryCount();
      // Use MRP for display/savings calculation only
      const mrp = product.mrp || product.buyOncePrice || 0;
      const subscriptionRate = getProductPriceForPeriod(
        product,
        selectedPeriod
      );


      // Only calculate savings if subscription rate is lower than MRP
      if (subscriptionRate >= mrp) return 0;

      let totalQty = 0;
      if (deliveryOption === "day1-day2") {
        const days1 = Math.ceil(selectedPeriod / 2);
        const days2 = Math.floor(selectedPeriod / 2);
        totalQty = quantity * days1 + quantityVarying2 * days2;
      } else {
        totalQty = quantity * deliveryCount;
      }

      const totalMrpPrice = mrp * totalQty;
      const totalSubscriptionPrice = subscriptionRate * totalQty;

      const savings = Math.max(0, totalMrpPrice - totalSubscriptionPrice);
      return savings;
    }

    // For products with variants
    let totalMrpPrice = 0;
    let totalSubscriptionPrice = 0;

    selectedVariants.forEach((selectedVariant) => {
      const variant = productVariants.find(
        (v) => v.id === selectedVariant.variantId
      );
      if (!variant) return;

      // Use MRP for display/savings calculation only
      const mrp = variant.mrp || variant.buyOncePrice || 0;
      const subscriptionPrice = getVariantPriceForPeriod(
        variant,
        selectedPeriod
      );
      const deliveryCount = calculateVariantDeliveryCount(selectedVariant);

      let totalQty = 0;
      switch (selectedVariant.deliveryOption) {
        case "daily":
        case "select-days":
        case "alternate-days":
          totalQty = selectedVariant.quantity * deliveryCount;
          break;
        case "day1-day2":
          const days1 = Math.ceil(selectedPeriod / 2);
          const days2 = Math.floor(selectedPeriod / 2);
          totalQty =
            selectedVariant.quantity * days1 +
            (selectedVariant.quantityVarying2 || 1) * days2;
          break;
      }

      totalMrpPrice += mrp * totalQty;
      totalSubscriptionPrice += subscriptionPrice * totalQty;
    });

    const savings = Math.max(0, totalMrpPrice - totalSubscriptionPrice);
    return savings;
  };

  const handleConfirmSubscription = async () => {
    if (!validateSubscriptionDetails()) return;

    // Check dairy product validation - show service not available dialog if trying to save with incompatible area
    if (product?.isDairyProduct && selectedAreaMaster && !selectedAreaMaster.isDairyProduct) {
      setShowServiceNotAvailableDialog(true);
      return;
    }

    // Determine the correct address ID based on depot type
    const deliveryAddressIdForPayload = selectedDepot?.isOnline
      ? selectedAddressId
      : selectedDepot?.address;

    if (
      product == null ||
      productId == null ||
      deliveryAddressIdForPayload == null ||
      startDate == null
    ) {
      const missingItems = [];
      if (product == null) missingItems.push("product information");
      if (productId == null) missingItems.push("product ID");
      if (deliveryAddressIdForPayload == null) {
        if (selectedDepot?.isOnline) {
          missingItems.push("delivery address");
        } else {
          missingItems.push("depot address information");
        }
      }
      if (startDate == null) missingItems.push("start date");

      const errorMessage = `Missing: ${missingItems.join(
        ", "
      )}. Please ensure all required information is provided.`;
      toast.error(errorMessage);
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
      deliveryAddressId: parseInt(String(deliveryAddressIdForPayload), 10),
      walletamt: useWallet ? walletDeduction : 0, // Wallet amount not handled in this form
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

      // Use period-specific pricing for non-variant products
      const productPriceForPeriod = getProductPriceForPeriod(product, selectedPeriod);
      totalPrice = productPriceForPeriod * totalQuantity;
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
    if (!subscriptionSummary || !useWallet) return 0;
    return Math.min(walletBalance || 0, subscriptionSummary.totalPrice || 0);
  }, [walletBalance, subscriptionSummary, useWallet]);

  const remainingPayable = useMemo(() => {
    if (!subscriptionSummary) return 0;
    const price = subscriptionSummary.totalPrice || 0;
    return useWallet ? price - walletDeduction : price;
  }, [subscriptionSummary, walletDeduction, useWallet]);

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
        className="max-sm:max-w-[95vw] flex flex-col max-h-[95vh] p-0 bg-white min-w-[95vw] max-w-2xl rounded-xl overflow-hidden"
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
        <DialogHeader className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <DialogTitle className="text-lg font-semibold text-gray-800">
            Create Subscription for {product?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto px-4 py-3 space-y-4 bg-gray-50">
          {modalView === "subscriptionDetails" ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column */}
                <div className="space-y-4">
                  {/* Subscription Period */}
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <h3 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-1">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      Subscription Period
                    </h3>
                    <div className="flex gap-1.5 bg-gray-50 p-1 rounded-lg">
                      {subscriptionPeriods.map((period) => (
                        <button
                          key={period.value}
                          type="button"
                          className={`flex-1 h-9 px-3 rounded-md transition-all duration-200 relative ${
                            selectedPeriod === period.value
                              ? "bg-primary text-white shadow-sm"
                              : "bg-white hover:bg-gray-100 text-gray-700 border border-gray-200"
                          }`}
                          onClick={() => setSelectedPeriod(period.value)}
                        >
                          <div className="flex items-center justify-center h-full">
                            <div className="flex items-baseline gap-1">
                              <span className="font-semibold text-base">
                                {period.value}
                              </span>
                              <span className={`text-sm ${
                                selectedPeriod === period.value ? "text-white/90" : "text-gray-500"
                              }`}>
                                days
                                
                              </span>
                            </div>
                            
                            {period.value === 30 && (
                              <span className="absolute -top-2 -right-1 bg-green-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-medium">
                                Best Value
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Start Date */}

                  {/* Variant Selection Section */}
                  {hasVariants && productVariants.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg p-2.5">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          Product Variants
                        </h3>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedVariants([])}
                            className="text-sm h-7"
                            disabled={selectedVariants.length === 0}
                          >
                            Clear
                          </Button>

                   
                      </div>

                      {/* Variant Grid Selection with Individual Delivery Schedules - Horizontal Layout */}
                      <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
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
                              className={`flex-shrink-0 w-72 border rounded-lg p-3 transition-all ${
                                isSelected
                                  ? "border-red-500 bg-red-50 shadow-md"
                                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              {/* Variant Header - Always Visible */}
                              <div className="mb-3">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-start gap-2 flex-1">
                                    {/* Checkbox */}
                                    <div
                                      className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 cursor-pointer flex-shrink-0 ${
                                        isSelected
                                          ? "bg-primary border-primary"
                                          : "border-gray-300"
                                      }`}
                                      onClick={() => {
                                        if (isSelected) {
                                          setSelectedVariants((prev) =>
                                            prev.filter(
                                              (sv) => sv.variantId !== variant.id
                                            )
                                          );
                                        } else {
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

                                    {/* Variant Name */}
                                    <h4 className="font-medium text-gray-900 text-sm">
                                      {variant.name}
                                    </h4>
                                  </div>
                                  
                                  {/* Price Badge */}
                                  <Badge variant="outline" className="bg-green-50 border-green-600 px-2 py-1">
                                    {variant.mrp && variant.mrp > getVariantPriceForPeriod(variant, selectedPeriod) ? (
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500 line-through">
                                          ₹{variant.mrp}
                                        </span>
                                        <span className="text-sm text-green-700 font-bold">
                                          ₹{getVariantPriceForPeriod(variant, selectedPeriod)}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-sm text-green-700 font-bold">
                                        ₹{getVariantPriceForPeriod(variant, selectedPeriod)}
                                      </span>
                                    )}
                                    {variant.unit && (
                                      <span className="text-xs text-gray-600 ml-1">/{variant.unit}</span>
                                    )}
                                  </Badge>
                                </div>
                                
                                {/* Description */}
                                {variant.description && (
                                  <p className="text-sm text-gray-600 ml-7">
                                    {variant.description}
                                  </p>
                                )}
                              </div>

                              {/* Expandable Content - Only show when selected */}
                              {isSelected && selectedVariant && (
                                <div className="space-y-3 border-t border-gray-200 pt-3">
                                  {/* Delivery Schedule Options */}
                                  <div>
                                    <Label className="text-[10px] font-medium text-gray-700 mb-1 block flex items-center gap-0.5">
                                      <Clock className="h-2.5 w-2.5" />
                                      Schedule
                                    </Label>
                                    <div className="grid grid-cols-2 gap-0.5">
                                      <Button
                                        variant={
                                          selectedVariant.deliveryOption ===
                                          "daily"
                                            ? "default"
                                            : "outline"
                                        }
                                        size="sm"
                                        className={`h-6 text-sm px-1 ${
                                          selectedVariant.deliveryOption ===
                                          "daily"
                                            ? "bg-secondary hover:bg-secondary/80"
                                            : "border-gray-300"
                                        }`}
                                        onClick={() =>
                                          updateVariantDeliveryOption(
                                            variant.id,
                                            "daily"
                                          )
                                        }
                                      >
                                        Daily
                                      </Button>
                                            {selectedPeriod >= 15 && (
                                              <Button
                                                variant={
                                                  selectedVariant.deliveryOption ===
                                                  "alternate-days"
                                                    ? "default"
                                                    : "outline"
                                                }
                                                size="sm"
                                                className={`h-7 text-sm ${
                                                  selectedVariant.deliveryOption ===
                                                  "alternate-days"
                                                    ? "bg-secondary hover:bg-secondary/80"
                                                    : "border-gray-300"
                                                }`}
                                                title="Delivery every other day"
                                                onClick={() =>
                                                  updateVariantDeliveryOption(
                                                    variant.id,
                                                    "alternate-days"
                                                  )
                                                }
                                              >
                                                Alternate Days
                                              </Button>
                                            )}
                                            {selectedPeriod >= 7 && (
                                              <Button
                                                variant={
                                                  selectedVariant.deliveryOption ===
                                                  "day1-day2"
                                                    ? "default"
                                                    : "outline"
                                                }
                                                size="sm"
                                                className={`h-7 text-sm ${
                                                  selectedVariant.deliveryOption ===
                                                  "day1-day2"
                                                    ? "bg-secondary hover:bg-blue-600"
                                                    : "border-gray-300"
                                                } truncate`}
                                                title="Daily Delivery with Varying Quantities"
                                                onClick={() =>
                                                  updateVariantDeliveryOption(
                                                    variant.id,
                                                    "day1-day2"
                                                  )
                                                }
                                              >
                                                Day 1 - Day 2
                                              </Button>
                                            )}
                                            {selectedPeriod >= 30 && (
                                              <Button
                                                variant={
                                                  selectedVariant.deliveryOption ===
                                                  "select-days"
                                                    ? "default"
                                                    : "outline"
                                                }
                                                size="sm"
                                                className={`h-7 text-sm ${
                                                  selectedVariant.deliveryOption ===
                                                  "select-days"
                                                    ? "bg-secondary hover:bg-blue-600"
                                                    : "border-gray-300"
                                                }`}
                                                title="Choose specific days for delivery"
                                                onClick={() =>
                                                  updateVariantDeliveryOption(
                                                    variant.id,
                                                    "select-days"
                                                  )
                                                }
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
                                      <Label className="text-sm font-medium text-gray-700 mb-1 block">
                                        Select days (min 3):
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
                                            className={`h-6 w-8 p-0 text-sm ${
                                              selectedVariant.selectedDays.includes(
                                                day.id
                                              )
                                                ? "bg-primary"
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
                                    <div>
                                      <Label className="text-sm font-medium text-gray-700 mb-1 block">
                                        Quantity per delivery:
                                      </Label>
                                      <div className="flex items-center border rounded overflow-hidden bg-white w-fit">
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
                                    <div>
                                      <Label className="text-sm font-medium text-gray-700 mb-1 block">
                                        Quantities:
                                      </Label>
                                      <div className="flex gap-3">
                                        <div>
                                          <div className="text-sm text-gray-600 mb-1">Day 1:</div>
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
                                            <span className="px-2 py-1 text-sm font-medium min-w-[30px] text-center">
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
                                        <div>
                                          <div className="text-sm text-gray-600 mb-1">Day 2:</div>
                                          <div className="flex items-center border rounded overflow-hidden bg-white">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                updateVariantQuantity(
                                                  variant.id,
                                                  "quantityVarying2",
                                                  (selectedVariant.quantityVarying2 || 1) - 1
                                                )
                                              }
                                              className="h-7 w-7 p-0 hover:bg-gray-100"
                                            >
                                              <Minus className="h-3 w-3" />
                                            </Button>
                                            <span className="px-2 py-1 text-sm font-medium min-w-[30px] text-center">
                                              {selectedVariant.quantityVarying2 || 1}
                                            </span>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                updateVariantQuantity(
                                                  variant.id,
                                                  "quantityVarying2",
                                                  (selectedVariant.quantityVarying2 || 1) + 1
                                                )
                                              }
                                              className="h-7 w-7 p-0 hover:bg-gray-100"
                                            >
                                              <Plus className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  {/* Schedule Summary */}
                                  <div className="bg-blue-50 px-2 py-1 rounded text-sm text-blue-700 border border-blue-200">
                                    <span className="font-medium">
                                      {selectedVariant.deliveryOption === "daily" && "Daily delivery"}
                                      {selectedVariant.deliveryOption === "select-days" &&
                                        (selectedVariant.selectedDays.length > 0
                                          ? `${selectedVariant.selectedDays.length} days/week`
                                          : "Select delivery days")}
                                      {selectedVariant.deliveryOption === "alternate-days" && "Alternate days"}
                                      {selectedVariant.deliveryOption === "day1-day2" && "Varying quantities"}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      

                      {formErrors.selectedVariants && (
                        <p className="text-red-500 text-sm mt-2">
                          {formErrors.selectedVariants}
                        </p>
                      )}
                      {formErrors.variantSchedules && (
                        <p className="text-red-500 text-sm mt-2">
                          {formErrors.variantSchedules}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Non-variant delivery options */}
                  {!hasVariants && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Delivery Schedule
                      </h3>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant={
                            deliveryOption === "daily" ? "default" : "outline"
                          }
                          className={`h-8 text-sm px-3 ${
                            deliveryOption === "daily"
                              ? "bg-secondary hover:bg-secondary/80"
                              : "border-gray-300"
                          }`}
                          title="Delivery every day"
                          onClick={() => setDeliveryOption("daily")}
                        >
                          Daily
                        </Button>
                        {selectedPeriod >= 15 && (
                          <Button
                            variant={
                              deliveryOption === "alternate-days"
                                ? "default"
                                : "outline"
                            }
                            className={`h-8 text-sm px-3 ${
                              deliveryOption === "alternate-days"
                                ? "bg-secondary hover:bg-secondary/80"
                                : "border-gray-300"
                            }`}
                            title="Delivery every other day"
                            onClick={() => setDeliveryOption("alternate-days")}
                          >
                            Alternate
                          </Button>
                        )}
                        {selectedPeriod >= 7 && (
                          <Button
                            variant={
                              deliveryOption === "day1-day2"
                                ? "default"
                                : "outline"
                            }
                            className={`h-8 text-sm px-3 ${
                              deliveryOption === "day1-day2"
                                ? "bg-secondary hover:bg-secondary/80"
                                : "border-gray-300"
                            }`}
                            title="Customize quantities for Day 1 and Day 2"
                            onClick={() => setDeliveryOption("day1-day2")}
                          >
                            Day 1-2
                          </Button>
                        )}
                        {selectedPeriod >= 30 && (
                          <Button
                            variant={
                              deliveryOption === "select-days"
                                ? "default"
                                : "outline"
                            }
                            className={`h-8 text-sm px-3 ${
                              deliveryOption === "select-days"
                                ? "bg-secondary hover:bg-secondary/80"
                                : "border-gray-300"
                            }`}
                            title="Choose specific days for delivery"
                            onClick={() => setDeliveryOption("select-days")}
                          >
                            Select Days
                          </Button>
                        )}
                      </div>

                      {/* Inline details based on selected option */}
                      <div className="mt-3">
                        {deliveryOption === "daily" && (
                          <div className="text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded-md border border-blue-200">
                            Daily delivery - Fresh products every day
                          </div>
                        )}
                        
                        {deliveryOption === "alternate-days" && (
                          <div className="text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded-md border border-blue-200">
                            Every other day starting from your selected start date
                          </div>
                        )}
                        
                        {deliveryOption === "day1-day2" && (
                          <div className="text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded-md border border-blue-200">
                            Daily delivery with different quantities on alternating days
                          </div>
                        )}

                        {deliveryOption === "select-days" && (
                          <div className="space-y-3">
                            <div className="text-sm text-gray-600">
                              Select delivery days (minimum 3):
                            </div>
                            <div className="flex flex-wrap gap-1">
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
                                  className={`h-7 w-10 p-0 text-sm ${
                                    selectedDays.includes(day.id)
                                      ? "bg-primary"
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
                              <p className="text-red-500 text-sm">
                                {formErrors.selectedDays}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Quantity selectors for non-variant products */}
                      <div className="mt-4 border-t pt-4">
                        {(deliveryOption === "daily" ||
                          deliveryOption === "select-days" ||
                          deliveryOption === "alternate-days") && (
                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">
                              Quantity per delivery:
                            </Label>
                            <div className="flex items-center border rounded overflow-hidden bg-white w-fit">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setQuantity(Math.max(1, quantity - 1))
                                }
                                className="h-8 w-8 p-0 hover:bg-gray-100"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="px-4 text-center font-medium min-w-[50px]">
                                {quantity}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setQuantity(quantity + 1)}
                                className="h-8 w-8 p-0 hover:bg-gray-100"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {deliveryOption === "day1-day2" && (
                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">
                              Quantities:
                            </Label>
                            <div className="flex gap-4">
                              <div>
                                <div className="text-sm text-gray-600 mb-1">Day A:</div>
                                <div className="flex items-center border rounded overflow-hidden bg-white">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      setQuantity(Math.max(1, quantity - 1))
                                    }
                                    className="h-8 w-8 p-0 hover:bg-gray-100"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="px-3 text-center font-medium min-w-[40px]">
                                    {quantity}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setQuantity(quantity + 1)}
                                    className="h-8 w-8 p-0 hover:bg-gray-100"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600 mb-1">Day B:</div>
                                <div className="flex items-center border rounded overflow-hidden bg-white">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      setQuantityVarying2(
                                        Math.max(1, quantityVarying2 - 1)
                                      )
                                    }
                                    className="h-8 w-8 p-0 hover:bg-gray-100"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="px-3 text-center font-medium min-w-[40px]">
                                    {quantityVarying2}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      setQuantityVarying2(quantityVarying2 + 1)
                                    }
                                    className="h-8 w-8 p-0 hover:bg-gray-100"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                
                </div>

                {/* Right Column - Address Section */}
                <div className="space-y-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-2.5">
                    {/* Conditionally render based on depot type */}
                    {selectedDepot?.isOnline ? (
                      <>
                        {/* ===== UI for ONLINE Depots (Home Delivery) ===== */}
                        <div className="flex justify-between items-center mb-1.5">
                          <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
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
                            className="text-[10px] h-6 px-1.5"
                          >
                            <Plus className="h-2.5 w-2.5 mr-0.5" /> Add
                          </Button>
                        </div>

                        {isLoadingAddresses ? (
                          <div className="flex items-center justify-center py-2">
                            <span className="text-gray-500 text-[10px]">
                              Loading...
                            </span>
                          </div>
                        ) : userAddresses.length > 0 ? (
                          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
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
                              className="flex gap-1.5"
                            >
                              {userAddresses.map((address) => (
                                <div
                                  key={address.id}
                                  className={`flex-shrink-0 w-52 p-1.5 border rounded cursor-pointer transition-all ${
                                    selectedAddressId === address.id
                                      ? "border-red-500 bg-red-50 shadow-sm"
                                      : "border-gray-200 hover:bg-gray-50"
                                  }`}
                                >
                                  <Label
                                    htmlFor={`address-item-${address.id}`}
                                    className="flex items-start space-x-1.5 w-full cursor-pointer"
                                  >
                                    <RadioGroupItem
                                      value={address.id}
                                      id={`address-item-${address.id}`}
                                      className="mt-0.5 h-3 w-3"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-1 mb-0.5">
                                        <span className="font-medium text-gray-900 text-[12px] truncate ">
                                          {address.recipientName}
                                        </span>
                                        <Badge variant="outline" className="text-[9px] py-0 px-1 h-3.5">
                                          {address.label}
                                        </Badge>
                                      </div>
                                      <p className="text-[10px] text-gray-600 truncate leading-tight">
                                        {address.plotBuilding}, {address.streetArea}
                                      </p>
                                      <p className="text-[10px] text-gray-600 truncate leading-tight">
                                        {address.city} - {address.pincode}
                                      </p>
                                      {address.isDefault && (
                                        <span className="inline-block mt-0.5 px-1 py-0 bg-blue-100 text-blue-800 rounded text-[8px]">
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
                          <div className="text-center py-2">
                            <p className="text-gray-500 text-[10px] mb-1">
                              No addresses saved
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
                              className="text-[10px] h-6 px-2"
                            >
                              <Plus className="h-2.5 w-2.5 mr-0.5" /> Add Address
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {/* ===== UI for OFFLINE Depots (Pickup) ===== */}
                        <div className="flex justify-between items-center mb-1.5">
                          <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            Pickup Location
                          </h3>
                        </div>
                        {selectedDepot ? (
                          <div className="p-1.5 border rounded bg-gray-50">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-gray-900 text-[11px]">
                                {selectedDepot.name}
                              </span>
                              <Badge variant="secondary" className="text-[9px] py-0 px-1 h-3.5">Pickup</Badge>
                            </div>
                            <p className="text-[10px] text-gray-600 mt-0.5">
                              {selectedDepot.address}, {selectedDepot.city} - {selectedDepot.pincode}
                            </p>
                            <div className="mt-3 p-1 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-[11px] text-blue-700 flex items-start ml-2 ">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5  flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          You will need to pick up your order from this depot location.
                        </p>
                      </div>
                          </div>
                        ) : (
                          <div className="text-center py-2">
                            <p className="text-gray-500 text-[10px]">
                              Depot address not available
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-2.5">
                    <h3 className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      Start Date
                    </h3>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal border-gray-300 rounded h-7 text-sm",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-1.5 h-3 w-3" />
                          {startDate ? (
                            format(startDate, "dd/MM/yyyy")
                          ) : (
                            <span>Select date</span>
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
                          disabled={(date) => {
                            // Disable dates before +3 days from current date
                            const minDate = new Date();
                            minDate.setDate(minDate.getDate() + 3);
                            minDate.setHours(0, 0, 0, 0);
                            return date < minDate;
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    {formErrors.startDate && (
                      <p className="text-red-500 text-sm mt-1">
                        {formErrors.startDate}
                      </p>
                    )}
                  </div>
                  {/* Enhanced Summary Section with Per-Variant Details */}
                  {subscriptionSummary && (
                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                      <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                        <Package className="h-3.5 w-3.5" />
                        Order Summary
                      </h3>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Period:</span>
                          <span>{subscriptionSummary.period}</span>
                        </div>
                        {/* <div className="flex justify-between">
                          <span className="text-gray-600">Schedule:</span>
                          <span className="text-right">
                            {subscriptionSummary.deliveryDescription}
                          </span>
                        </div> */}
                        {/* <div className="flex justify-between">
                          <span className="text-gray-600">Start Date:</span>
                          <span>{subscriptionSummary.startDate}</span>
                        </div> */}

                        {/* Per-Variant Summary - Enhanced */}
                        {hasVariants && selectedVariants.length > 0 && (
                          <div className="border-t border-gray-200 pt-2 mt-2">
                            <div className="flex items-center gap-1 mb-2">
                              <Package className="h-3 w-3 text-blue-600" />
                              <h4 className="text-sm font-semibold text-gray-800">
                                Variant Details
                              </h4>
                            </div>
                            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                              {selectedVariants.map(
                                (selectedVariant, index) => {
                                  const variant = productVariants.find(
                                    (v) => v.id === selectedVariant.variantId
                                  );
                                  if (!variant) return null;

                                  const deliveryCount =
                                    calculateVariantDeliveryCount(
                                      selectedVariant
                                    );
                                  let variantTotalQty = 0;

                                  switch (selectedVariant.deliveryOption) {
                                    case "daily":
                                    case "select-days":
                                      variantTotalQty =
                                        selectedVariant.quantity *
                                        deliveryCount;
                                      break;
                                    case "day1-day2":
                                      const days1 = Math.ceil(
                                        selectedPeriod / 2
                                      );
                                      const days2 = Math.floor(
                                        selectedPeriod / 2
                                      );
                                      variantTotalQty =
                                        selectedVariant.quantity * days1 +
                                        (selectedVariant.quantityVarying2 ||
                                          1) *
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
                                      ? "Alternate Days"
                                      : "Day1-Day2";

                                  const getScheduleIcon = () => {
                                    switch (selectedVariant.deliveryOption) {
                                      case "daily":
                                        return "🌅"; // Daily sunrise
                                      case "select-days":
                                        return "📅"; // Selected days
                                      case "alternate-days":
                                        return "🔄"; // Alternating
                                      case "day1-day2":
                                        return "⚖️"; // Varying quantities
                                      default:
                                        return "📦";
                                    }
                                  };

                                  return (
                                    <div
                                      key={index}
                                      className="flex-shrink-0 w-56 border border-gray-200 rounded-md p-2 bg-gradient-to-r from-gray-50 to-blue-50"
                                    >
                                      {/* Header with variant name and schedule */}
                                      <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-1 flex-1 min-w-0">
                                          <span className="text-sm">
                                            {getScheduleIcon()}
                                          </span>
                                          <span className="font-medium text-gray-800 text-sm truncate">
                                            {variant.name}
                                          </span>
                                        </div>
                                        <Badge
                                          variant="secondary"
                                          className="text-[11px] bg-blue-100 text-blue-700 border-blue-200 py-0 px-1.5 h-4"
                                        >
                                          {scheduleText}
                                        </Badge>
                                      </div>

                                      {/* Compact details */}
                                      <div className="text-[11px] space-y-1">
                                        <div className="flex justify-between items-center">
                                          <span className="text-gray-600 text-xs" >Qty/delivery:</span>
                                          <span className="text-gray-900 font-medium text-xs">
                                            {selectedVariant.deliveryOption === "day1-day2" ? (
                                              <>{selectedVariant.quantity} + {selectedVariant.quantityVarying2 || 1} - {variant.name || 'Quantity'}{selectedVariant.quantity > 1 || (selectedVariant.quantityVarying2 || 1) > 1 ? 's' : ''}</>                                              
                                            ) : (
                                              <>{selectedVariant.quantity} - {variant.name || 'Quantity'}</>                                              
                                            )}
                                          </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                          <span className="text-gray-600 text-xs">Total:</span>
                                          <span className="text-gray-900 font-medium text-xs">
                                            {variantTotalQty} - {variant.name || 'Quantity'}
                                          </span>
                                        </div>
                                        <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                                          <span className="text-gray-600">Price:</span>
                                          <span className="text-green-700 font-semibold">
                                            ₹{(variantTotalQty * getVariantPriceForPeriod(variant, selectedPeriod)).toFixed(2)}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Additional info for select-days */}
                                      {selectedVariant.deliveryOption === "select-days" && selectedVariant.selectedDays.length > 0 && (
                                        <div className="mt-1 pt-1 border-t border-gray-200">
                                          <div className="text-[10px] text-gray-600">
                                            Days: {selectedVariant.selectedDays.join(", ")}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Quantity:</span>
                          <span className="font-medium">
                            {subscriptionSummary.totalQuantity}{" "}
                            {!hasVariants ? product?.name || "" : "items"}
                          </span>
                        </div>

                        {/* Enhanced Savings Display */}
                        {calculateSavings() > 0 && (
                          <div className="relative overflow-hidden">
                            {/* Animated Background */}
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 animate-pulse"></div>
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/90 via-green-400/90 to-teal-400/90"></div>

                            {/* Sparkle Animation Elements */}
                            <div className="absolute top-2 left-4 animate-bounce delay-75">
                              <Star className="h-3 w-3 text-yellow-300 fill-yellow-300" />
                            </div>
                            <div className="absolute top-3 right-6 animate-bounce delay-150">
                              <Sparkles className="h-2 w-2 text-yellow-200 fill-yellow-200" />
                            </div>
                            <div className="absolute bottom-2 right-4 animate-bounce delay-300">
                              <Zap className="h-3 w-3 text-yellow-300 fill-yellow-300" />
                            </div>

                            {/* Main Content */}
                          </div>
                        )}

                        <div className="border-t border-gray-200 pt-1.5 mt-1.5">
                          <div className="flex justify-between font-medium text-sm">
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
                                {variant.name && `per ${variant.name}`}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
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
                    {!hasVariants ? product?.name || "" : "items"}
                  </span>
                </div>

                {/* Enhanced Savings Display in Confirmation */}

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

                  {/* <div className="flex items-center justify-between mt-4">
                    <Label htmlFor="useWallet" className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                      <Checkbox id="useWallet" checked={useWallet} onCheckedChange={(checked) => setUseWallet(Boolean(checked))} className="w-5 h-5 rounded border-gray-300" />
                      <span>Apply Wallet Balance</span>
                    </Label>
                  </div> */}
                </div>
              </div>

              {/* Wallet Balance Section */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <Label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <Wallet className="h-4 w-4" /> Use Wallet Balance
                  </Label>
                  <div className="text-sm font-medium">
                    Available: ₹{walletBalance.toFixed(2)}
                  </div>
                </div>

                {useWallet && walletBalance > 0 && (
                  <div className="bg-white p-3 rounded border border-blue-300">
                    <div className="text-sm text-blue-700 space-y-1">
                      <div className="flex justify-between">
                        <span>Wallet Balance:</span>
                        <span>₹{walletBalance.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Amount to be deducted:</span>
                        <span className="font-medium text-green-600">
                          ₹{walletDeduction.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between font-medium pt-1 border-t">
                        <span>Remaining in wallet:</span>
                        <span>
                          ₹{(walletBalance - walletDeduction).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {subscriptionSummary && (
                <>
                  {remainingPayable > 0 ? (
                    <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                      <p className="text-sm text-blue-700 flex items-start">
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
                            )} will be collected via Cash/UPI before delivery.`
                          : `Full amount of ₹${remainingPayable.toFixed(
                              2
                            )} will be collected via Cash/UPI before delivery.`}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-green-50 p-3 rounded-md border border-green-100">
                      <p className="text-sm text-green-700 flex items-start">
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
              <div className="bg-green-50 p-3 rounded-md border border-green-100">
                <p className="text-sm text-primary flex items-start">
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
                  This is not a cash on delivery. But Amount will be collected,
                  Our team will contact you for futher instructions
                </p>
              </div>

              {selectedDepot?.isOnline ? (
                <div className="bg-white p-4 rounded-md border">
                  <h4 className="text-sm font-medium mb-2">
                    Delivery Address:
                  </h4>
                  {userAddresses.map((address) => {
                    if (address.id === selectedAddressId) {
                      return (
                        <div key={address.id} className="text-sm">
                          <Badge variant="outline" className="mt-1 ">
                            {address.label}
                          </Badge>
                          <p>
                            <span className="font-medium ">
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
                  <h4 className="text-sm font-medium mb-2">
                    Pickup from Depot:
                  </h4>
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
                    <p className="text-red-500 text-sm mt-1">
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
                    <p className="text-red-500 text-sm mt-1">
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
                    <p className="text-red-500 text-sm mt-1">
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
                    <p className="text-red-500 text-sm mt-1">
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
                    <p className="text-red-500 text-sm mt-1">
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
                    <Select
                      onValueChange={(val) => handleAddressChange("state", val)}
                      defaultValue={addressFormState.state}
                    >
                      <SelectTrigger
                        className={formErrors.state ? "border-red-500" : ""}
                      >
                        <SelectValue placeholder="Select a state" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        {INDIAN_STATES.filter(st => st && typeof st.label === 'string').map((st) => (
                          <SelectItem key={st.value} value={st.label}>
                            {st.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.state && (
                      <p className="text-red-500 text-sm mt-1">
                        {formErrors.state}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <Label
                    htmlFor="areaMaster"
                    className="text-sm font-medium mb-1.5 block"
                  >
                    Our Delivery Areas*
                    {product?.isDairyProduct && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        Dairy Product
                      </span>
                    )}
                  </Label>
                  <Select
                    onValueChange={(value) => {
                      const areaMaster = areaMasters.find(am => am.id === parseInt(value));
                      if (areaMaster) {
                        handleAreaMasterSelection(areaMaster);
                      }
                    }}
                    value={selectedAreaMaster?.id?.toString() || ""}
                  >
                    <SelectTrigger
                      className={formErrors.areaMaster ? "border-red-500" : ""}
                    >
                      <SelectValue placeholder="Select your delivery area" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {areaMasters
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((areaMaster) => (
                        <SelectItem
                          key={areaMaster.id}
                          value={areaMaster.id.toString()}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span>{areaMaster.name}</span>
                            <div className="flex gap-1 ml-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                areaMaster.deliveryType === 'HandDelivery' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {areaMaster.deliveryType === 'HandDelivery' ? 'Hand Delivery' : 'Courier'}
                              </span>
                              {areaMaster.isDairyProduct && (
                                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                                  Dairy Available
                                </span>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.areaMaster && (
                    <p className="text-red-500 text-sm mt-1">
                      {formErrors.areaMaster}
                    </p>
                  )}
                  {/* {product?.isDairyProduct && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm text-yellow-700">
                        <span className="font-medium">Dairy Product Notice:</span> This product requires areas that support dairy delivery. Areas marked with "Dairy Available" can serve this product.
                      </p>
                    </div>
                  )} */}
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-700">
                      <span className="font-medium">Note:</span> If your area is
                      not listed above, please use the form that appears after selection to help us expand to your location.
                    </p>
                  </div>
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
                    <p className="text-red-500 text-sm mt-1">
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
            <div className="space-y-3">
              {/* Savings indicator */}
              {calculateSavings() > 0 && (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingDown className="h-4 w-4" />
                    <span className="font-medium">
                      You Save: ₹{calculateSavings().toFixed(2)}
                    </span>
                  </div>
                  <span className="text-gray-500 text-sm">vs MRP pricing</span>
                </div>
              )}
              <Button
                onClick={handleProceedToConfirmation}
                disabled={
                  isLoadingAddresses ||
                  (!hasVariants &&
                    deliveryOption === "select-days" &&
                    selectedDays.length < 3) ||
                  (hasVariants &&
                    selectedVariants.some(
                      (v) =>
                        v.deliveryOption === "select-days" &&
                        v.selectedDays.length < 3
                    ))
                }
                className="w-full bg-primary hover:bg-primary text-white py-2 rounded-md font-medium"
              >
                Review Subscription
              </Button>
            </div>
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
                className="bg-primary hover:bg-primary text-white rounded-lg h-11"
                disabled={
                  !!(
                    formErrors.recipientName ||
                    formErrors.mobile ||
                    formErrors.plotBuilding ||
                    formErrors.streetArea ||
                    formErrors.pincode ||
                    formErrors.city ||
                    formErrors.state ||
                    formErrors.label ||
                    formErrors.areaMaster
                  )
                }
              >
                Save Address
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Savings indicator for confirmation */}
              {calculateSavings() > 0 && (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingDown className="h-4 w-4" />
                    <span className="font-medium">
                      Total Savings: ₹{calculateSavings().toFixed(2)}
                    </span>
                  </div>
                  <span className="text-gray-500 text-sm">vs MRP pricing</span>
                </div>
              )}
              <div className="flex justify-end items-center gap-3 w-full">
                <Button
                  variant="outline"
                  className="rounded-lg h-11 border-gray-300"
                  onClick={() => setModalView("subscriptionDetails")}
                >
                  Back
                </Button>

                <Button
                  className="bg-primary hover:bg-primary text-white rounded-lg h-11"
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
            </div>
          )}
        </div>
      </DialogContent>
      
      {/* Service Not Available Dialog */}
      <ServiceNotAvailableDialog
        isOpen={showServiceNotAvailableDialog}
        onOpenChange={setShowServiceNotAvailableDialog}
        productName={product?.name}
        areaName={selectedAreaMaster?.name}
        message={serviceNotAvailableMessage}
      />
    </Dialog>
  );
};
