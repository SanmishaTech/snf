import type React from "react"
import { useState, useEffect, useMemo, useCallback } from "react"
import { get, post } from "@/services/apiService"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, Plus, Minus, Package } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { BulkQuantityModal } from "./bulk-quantity-modal"

// Enhanced interfaces to support variants
interface ProductVariant {
  id: string
  name: string
  price: number
  rate: number
  unit?: string
  description?: string
  isAvailable?: boolean
}

interface AddressData {
  id: string
  recipientName: string
  mobile: string
  plotBuilding: string
  streetArea: string
  landmark?: string
  pincode: string
  city: string
  state: string
  isDefault?: boolean
  label: string
  depotId?: number // Added depotId
}

interface ProductData {
  id: number
  name: string
  price: number
  rate: number
  unit?: string
  variants?: ProductVariant[] // Added variants support
}

interface SelectedVariant {
  variantId: string
  quantity: number
  quantityVarying2?: number // For varying delivery option
}

interface SubscriptionModalProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  product: ProductData | null | undefined
  productId: string | undefined
  onSubscribeConfirm: (details: {
    productId: string | undefined
    quantity: number
    quantityVarying2?: number
    deliveryOption: string
    startDate: Date | undefined
    selectedAddress: string
    deliveryAddressLabel: string
    selectedPeriod: number
    selectedDays: string[]
    totalQuantity?: number
    totalAmount?: number
    selectedVariants?: SelectedVariant[] // Added variants to confirmation
  }) => void
}

const daysOfWeek = [
  { id: "mon", label: "Mon" },
  { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" },
  { id: "thu", label: "Thu" },
  { id: "fri", label: "Fri" },
  { id: "sat", label: "Sat" },
  { id: "sun", label: "Sun" },
]

const subscriptionPeriods = [
  { value: 7, label: "7 Days" },
  { value: 15, label: "15 Days" },
  { value: 30, label: "1 Month" },
  { value: 90, label: "3 Months" },
]

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onOpenChange,
  product,
  productId,
  onSubscribeConfirm,
}) => {
  const [quantity, setQuantity] = useState(1)
  const [quantityVarying2, setQuantityVarying2] = useState(1)
  const [deliveryOption, setDeliveryOption] = useState("daily")
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow
  })
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<number>(7)

  // New state for variant selection
  const [selectedVariants, setSelectedVariants] = useState<SelectedVariant[]>([])
  const [hasVariants, setHasVariants] = useState(false)
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([])

  // Address management state
  const [userAddresses, setUserAddresses] = useState<AddressData[]>([])
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false)
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [modalView, setModalView] = useState<"subscriptionDetails" | "addressForm" | "confirmation">(
    "subscriptionDetails",
  )
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [userMobile, setUserMobile] = useState<string>("")
  const [walletBalance, setWalletBalance] = useState<number>(0)
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [showBulkQuantityModal, setShowBulkQuantityModal] = useState(false)

  const [addressFormState, setAddressFormState] = useState<Omit<AddressData, "id">>({
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
  })

  const fetchVariants = useCallback(
    async (productId: string, depotId: number) => {
      if (!productId || !depotId) return;

      try {
        const fetchedVariants = await get(`/depot-product-variants/product/${productId}?depotId=${depotId}`);

        if (fetchedVariants && Array.isArray(fetchedVariants) && fetchedVariants.length > 0) {
          const variantsWithParsedPrices = fetchedVariants.map(variant => ({
            ...variant,
            price: parseFloat(variant.price || 0),
            rate: parseFloat(variant.rate || 0),
          }));

          setProductVariants(variantsWithParsedPrices);
          setHasVariants(true);
          if (selectedVariants.length === 0) {
            setSelectedVariants([
              {
                variantId: variantsWithParsedPrices[0].id,
                quantity: 1,
                quantityVarying2: 1,
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
    [get, selectedVariants.length],
  );

  // Fetch product variants when the modal opens
  useEffect(() => {
    if (isOpen && productId) {
      fetchVariants(productId, 2) // Using hardcoded depotId=2 as requested
    } else if (!isOpen) {
      // Reset on close
      setProductVariants([])
      setHasVariants(false)
      setSelectedVariants([])
    }
  }, [isOpen, productId, fetchVariants])


  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await get("/users/me")
        if (response && response.mobile) {
          setUserMobile(response.mobile)
        }
      } catch (error) {
        console.error("Failed to fetch user profile:", error)
      }
    }
    fetchUserProfile()
  }, [])

  const handleCancelAddAddress = () => {
    setModalView("subscriptionDetails")
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
    })
    setFormErrors({})
  }

  const validateAddressForm = (): boolean => {
    const errors: Record<string, string> = {}
    if (!addressFormState.recipientName.trim()) errors.recipientName = "Recipient name is required."
    if (!addressFormState.mobile.trim()) errors.mobile = "Mobile number is required."
    else if (!/^\d{10}$/.test(addressFormState.mobile.trim())) errors.mobile = "Mobile number must be 10 digits."
    if (!addressFormState.plotBuilding.trim()) errors.plotBuilding = "Plot/Building is required."
    if (!addressFormState.streetArea.trim()) errors.streetArea = "Street/Area is required."
    if (!addressFormState.pincode.trim()) errors.pincode = "Pincode is required."
    else if (!/^\d{6}$/.test(addressFormState.pincode.trim())) errors.pincode = "Pincode must be 6 digits."
    if (!addressFormState.city.trim()) errors.city = "City is required."
    if (!addressFormState.state.trim()) errors.state = "State is required."
    if (!addressFormState.label.trim()) errors.label = "Address label is required."

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateSubscriptionDetails = (): boolean => {
    const errors: Record<string, string> = {}
    if (!startDate) {
      errors.startDate = "Start date is required."
    } else {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (startDate < today) {
        errors.startDate = "Start date cannot be in the past."
      }
    }
    if (deliveryOption === "select-days" && selectedDays.length === 0) {
      errors.selectedDays = "Please select at least one delivery day."
    }
    if (!selectedAddressId) {
      errors.selectedAddressId = "Please select a delivery address."
    }
    if (hasVariants && selectedVariants.length === 0) {
      errors.selectedVariants = "Please select at least one variant."
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const addressService = {
    getUserAddresses: async (): Promise<AddressData[]> => {
      try {
        setIsLoadingAddresses(true)
        const response = await get("/delivery-addresses")
        console.log("Raw API response for addresses:", response)

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
          : []

        console.log("Mapped addresses:", mappedAddresses)
        setUserAddresses(mappedAddresses)

        if (mappedAddresses.length > 0 && !selectedAddressId) {
          setSelectedAddressId(mappedAddresses[0].id)
        }

        return mappedAddresses
      } catch (error) {
        console.error("Error fetching addresses:", error)
        return []
      } finally {
        setIsLoadingAddresses(false)
      }
    },
    createUserAddress: async (address: Omit<AddressData, "id">): Promise<AddressData> => {
      try {
        const response = await post("/delivery-addresses", address)
        console.log("Created new address response:", response)

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
        }

        console.log("Mapped new address:", mappedAddress)
        setUserAddresses((prev) => [...prev, mappedAddress])
        setSelectedAddressId(mappedAddress.id)
        return mappedAddress
      } catch (error) {
        console.error("Error creating address:", error)
        throw error
      }
    },
  }

  useEffect(() => {
    if (isOpen) {
      ;(async () => {
        try {
          const walletResp = await get("/api/wallet/balance")
          let balance = 0
          if (typeof walletResp === "number") {
            balance = walletResp
          } else if (walletResp && typeof walletResp.balance === "number") {
            balance = walletResp.balance
          } else if (walletResp && walletResp.data && typeof walletResp.data.balance === "number") {
            balance = walletResp.data.balance
          }
          setWalletBalance(balance)
        } catch (err) {
          console.error("Failed to fetch wallet balance", err)
        }
      })()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && modalView === "subscriptionDetails") {
      console.log("Modal opened, fetching addresses...")
      addressService
        .getUserAddresses()
        .then((addresses) => {
          console.log("Addresses loaded successfully:", addresses)
          if (addresses.length > 0) {
            console.log(
              "Available address IDs:",
              addresses.map((a) => `${a.id} (${typeof a.id})`),
            )
            if (!selectedAddressId && addresses.length > 0) {
              console.log("Setting default address ID:", addresses[0].id)
              setSelectedAddressId(addresses[0].id)
            }
          } else {
            console.log("No addresses available")
          }
        })
        .catch((err) => console.error("Error loading addresses:", err))
    }
    if (!isOpen) {
      setModalView("subscriptionDetails")
    }
  }, [isOpen, modalView])

  const handleAddressFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setAddressFormState((prev) => ({ ...prev, [name]: value }))
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const handleAddressLabelChange = (value: string) => {
    setAddressFormState((prev) => ({ ...prev, label: value }))
    if (formErrors.label) {
      setFormErrors((prev) => ({ ...prev, label: "" }))
    }
  }

  const handleSaveAddress = async () => {
    if (!validateAddressForm()) return
    const addressToCreate = {
      ...addressFormState,
    }

    try {
      await addressService.createUserAddress(addressToCreate)
      toast.success("Address saved successfully!")
      setModalView("subscriptionDetails")
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
      })
    } catch (error) {
      console.error("Failed to save address:", error)
      const errorMessage = "An error occurred while saving your address. Please try again."
      toast.error(errorMessage)
    }
  }

  const toggleDaySelection = (dayId: string) => {
    if (selectedDays.includes(dayId)) {
      setSelectedDays(selectedDays.filter((day) => day !== dayId))
    } else {
      setSelectedDays([...selectedDays, dayId])
    }
  }

  const handleProceedToConfirmation = () => {
    if (!selectedAddressId) {
      console.error("No address selected. Please select or add an address.")
      toast.error("Please select a delivery address")
      return
    }

    setModalView("confirmation")
  }

  const handleConfirmSubscription = () => {
    if (!validateSubscriptionDetails()) return

    if (!product || !productId || !selectedAddressId || !startDate) {
      toast.error("Missing product details or critical information.")
      return
    }

    const selectedFullAddress = userAddresses.find((addr) => addr.id === selectedAddressId)
    const currentDeliveryAddressLabel = selectedFullAddress?.label || "Home"

    const normalizedDate = startDate ? new Date(startDate) : new Date()
    normalizedDate.setHours(12, 0, 0, 0)

    const totalQuantity = subscriptionSummary?.totalQuantity || 0
    const totalAmount = subscriptionSummary?.totalAmount || 0

    onSubscribeConfirm({
      productId,
      quantity,
      ...(deliveryOption === "varying" && { quantityVarying2 }),
      deliveryOption,
      startDate: normalizedDate,
      selectedAddress: selectedAddressId!,
      deliveryAddressLabel: currentDeliveryAddressLabel,
      selectedPeriod,
      selectedDays,
      totalQuantity,
      totalAmount,
      selectedVariants: hasVariants ? selectedVariants : undefined,
    })

    onOpenChange(false)
  }

  const subscriptionSummary = useMemo(() => {
    if (!product) return null

    let deliveryCount = 0
    let totalQuantity = 0
    let totalPrice = 0
    let deliveryDescription = ""

    if (hasVariants && selectedVariants.length > 0) {
      // Calculate for variants
      switch (deliveryOption) {
        case "daily":
          deliveryCount = selectedPeriod
          selectedVariants.forEach((variant) => {
            const variantData = product.variants?.find((v) => v.id === variant.variantId)
            if (variantData) {
              const variantQuantity = variant.quantity * deliveryCount
              totalQuantity += variantQuantity
              totalPrice += variantData.rate * variantQuantity
            }
          })
          deliveryDescription = `Daily delivery of selected variants`
          break

        case "select-days":
          if (selectedDays.length === 0) {
            deliveryCount = 0
            totalQuantity = 0
            totalPrice = 0
            deliveryDescription = "No days selected"
          } else {
            const selectedDayNumbers = selectedDays
              .map((day) => {
                switch (day) {
                  case "mon":
                    return 1
                  case "tue":
                    return 2
                  case "wed":
                    return 3
                  case "thu":
                    return 4
                  case "fri":
                    return 5
                  case "sat":
                    return 6
                  case "sun":
                    return 0
                  default:
                    return -1
                }
              })
              .filter((day) => day >= 0)

            deliveryCount = 0
            if (startDate) {
              const startDateCopy = new Date(startDate)
              const endDate = new Date(startDate)
              endDate.setDate(endDate.getDate() + selectedPeriod - 1)

              for (let d = new Date(startDateCopy); d <= endDate; d.setDate(d.getDate() + 1)) {
                const dayNumber = d.getDay()
                if (selectedDayNumbers.includes(dayNumber as 0 | 1 | 2 | 3 | 4 | 5 | 6)) {
                  deliveryCount++
                }
              }
            }

            selectedVariants.forEach((variant) => {
              const variantData = product.variants?.find((v) => v.id === variant.variantId)
              if (variantData) {
                const variantQuantity = variant.quantity * deliveryCount
                totalQuantity += variantQuantity
                totalPrice += variantData.rate * variantQuantity
              }
            })

            const dayLabels = daysOfWeek.filter((day) => selectedDays.includes(day.id)).map((day) => day.label)
            deliveryDescription = `On ${dayLabels.join(", ") || "selected days"}`
          }
          break

        case "varying":
          deliveryCount = selectedPeriod
          const days1 = Math.ceil(selectedPeriod / 2)
          const days2 = Math.floor(selectedPeriod / 2)

          selectedVariants.forEach((variant) => {
            const variantData = product.variants?.find((v) => v.id === variant.variantId)
            if (variantData) {
              const variantQuantity = variant.quantity * days1 + (variant.quantityVarying2 || 1) * days2
              totalQuantity += variantQuantity
              totalPrice += variantData.rate * variantQuantity
            }
          })
          deliveryDescription = `Alternating quantities for selected variants`
          break
      }
    } else {
      // Original calculation for single product
      switch (deliveryOption) {
        case "daily":
          deliveryCount = selectedPeriod
          totalQuantity = quantity * deliveryCount
          deliveryDescription = `Daily delivery of ${quantity} item${quantity > 1 ? "s" : ""}`
          break

        case "select-days":
          if (selectedDays.length === 0) {
            deliveryCount = 0
            totalQuantity = 0
            deliveryDescription = "No days selected"
          } else {
            const selectedDayNumbers = selectedDays
              .map((day) => {
                switch (day) {
                  case "mon":
                    return 1
                  case "tue":
                    return 2
                  case "wed":
                    return 3
                  case "thu":
                    return 4
                  case "fri":
                    return 5
                  case "sat":
                    return 6
                  case "sun":
                    return 0
                  default:
                    return -1
                }
              })
              .filter((day) => day >= 0)

            deliveryCount = 0
            if (startDate) {
              const startDateCopy = new Date(startDate)
              const endDate = new Date(startDate)
              endDate.setDate(endDate.getDate() + selectedPeriod - 1)

              for (let d = new Date(startDateCopy); d <= endDate; d.setDate(d.getDate() + 1)) {
                const dayNumber = d.getDay()
                if (selectedDayNumbers.includes(dayNumber as 0 | 1 | 2 | 3 | 4 | 5 | 6)) {
                  deliveryCount++
                }
              }
            }

            totalQuantity = quantity * deliveryCount
            const dayLabels = daysOfWeek.filter((day) => selectedDays.includes(day.id)).map((day) => day.label)
            deliveryDescription = `On ${dayLabels.join(", ") || "selected days"}`
          }
          break

        case "varying":
          deliveryCount = selectedPeriod
          const days1 = Math.ceil(selectedPeriod / 2)
          const days2 = Math.floor(selectedPeriod / 2)
          totalQuantity = quantity * days1 + quantityVarying2 * days2
          deliveryDescription = `Alternate: ${quantity} & ${quantityVarying2} Qty`
          break
      }

      totalPrice = product.rate * totalQuantity
    }

    return {
      deliveryCount,
      totalQuantity,
      deliveryDescription,
      totalPrice,
      period: subscriptionPeriods.find((p) => p.value === selectedPeriod)?.label || `${selectedPeriod} days`,
      startDate:
        startDate && !isNaN(new Date(startDate).getTime()) ? format(new Date(startDate), "dd/MM/yyyy") : "Not set",
    }
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
  ])

  const walletDeduction = useMemo(() => {
    if (!subscriptionSummary) return 0
    return Math.min(walletBalance || 0, subscriptionSummary.totalPrice || 0)
  }, [walletBalance, subscriptionSummary])

  const remainingPayable = useMemo(() => {
    if (!subscriptionSummary) return 0
    return (subscriptionSummary.totalPrice || 0) - walletDeduction
  }, [subscriptionSummary, walletDeduction])

  if (!product) return null

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        onOpenChange(open)
        if (!open) setModalView("subscriptionDetails")
      }}
    >
      <DialogContent
        className="max-sm:max-w-md flex flex-col max-h-[90vh] p-0 bg-white min-w-[50%] rounded-xl overflow-hidden"
        onPointerDownOutside={(event) => {
          const target = event.target as HTMLElement
          if (
            target.closest("[data-radix-popover-content]") ||
            target.closest(".rdp") ||
            target.closest(".calendar-day") ||
            target.closest('[role="gridcell"]')
          ) {
            event.preventDefault()
          }
        }}
      >
        <DialogHeader className="p-5 border-b">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl font-semibold text-gray-800">Create Subscription for {product?.name}</DialogTitle>
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-500">{hasVariants ? "From:" : "Price:"}</span>
              <p className="text-lg font-bold">
                ₹{hasVariants && product.variants ? Math.min(...product.variants.map((v) => v.rate)) : product?.rate}
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
                  {/* Variant Selection Section */}
                  {hasVariants && productVariants.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Select Product Variants
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {selectedVariants.length} of {productVariants.length} selected
                        </Badge>
                      </div>

                      {/* Variant Grid Selection */}
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {productVariants.map((variant) => {
                          const isSelected = selectedVariants.some((sv) => sv.variantId === variant.id)
                          const selectedVariant = selectedVariants.find((sv) => sv.variantId === variant.id)

                          return (
                            <div
                              key={variant.id}
                              className={`border rounded-lg p-3 transition-all cursor-pointer ${
                                isSelected
                                  ? "border-green-500 bg-green-50"
                                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                              }`}
                              onClick={() => {
                                if (isSelected) {
                                  // Remove variant
                                  setSelectedVariants((prev) => prev.filter((sv) => sv.variantId !== variant.id))
                                } else {
                                  // Add variant
                                  setSelectedVariants((prev) => [
                                    ...prev,
                                    {
                                      variantId: variant.id,
                                      quantity: 1,
                                      quantityVarying2: 1,
                                    },
                                  ])
                                }
                              }}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3 flex-1">
                                  {/* Checkbox */}
                                  <div
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                                      isSelected ? "bg-green-500 border-green-500" : "border-gray-300"
                                    }`}
                                  >
                                    {isSelected && (
                                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
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
                                      <h4 className="font-medium text-gray-900">{variant.name}</h4>
                                      <Badge variant="outline" className="text-xs">
                                        ₹{variant.rate} {variant.unit && `per ${variant.unit}`}
                                      </Badge>
                                    </div>
                                    {variant.description && (
                                      <p className="text-xs text-gray-600 mb-2">{variant.description}</p>
                                    )}

                                    {/* Quantity Controls - Only show when selected */}
                                    {isSelected && selectedVariant && (
                                      <div
                                        className="mt-3 pt-3 border-t border-gray-200"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {(deliveryOption === "daily" || deliveryOption === "select-days") && (
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-gray-700">
                                              Quantity per delivery:
                                            </span>
                                            <div className="flex items-center border rounded overflow-hidden bg-white">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  const newQuantity = Math.max(1, selectedVariant.quantity - 1)
                                                  setSelectedVariants((prev) =>
                                                    prev.map((sv) =>
                                                      sv.variantId === variant.id
                                                        ? { ...sv, quantity: newQuantity }
                                                        : sv,
                                                    ),
                                                  )
                                                }}
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
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  const newQuantity = selectedVariant.quantity + 1
                                                  setSelectedVariants((prev) =>
                                                    prev.map((sv) =>
                                                      sv.variantId === variant.id
                                                        ? { ...sv, quantity: newQuantity }
                                                        : sv,
                                                    ),
                                                  )
                                                }}
                                                className="h-7 w-7 p-0 hover:bg-gray-100"
                                              >
                                                <Plus className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          </div>
                                        )}

                                        {deliveryOption === "varying" && (
                                          <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs font-medium text-gray-700">Quantity A:</span>
                                              <div className="flex items-center border rounded overflow-hidden bg-white">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    const newQuantity = Math.max(1, selectedVariant.quantity - 1)
                                                    setSelectedVariants((prev) =>
                                                      prev.map((sv) =>
                                                        sv.variantId === variant.id
                                                          ? { ...sv, quantity: newQuantity }
                                                          : sv,
                                                      ),
                                                    )
                                                  }}
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
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    const newQuantity = selectedVariant.quantity + 1
                                                    setSelectedVariants((prev) =>
                                                      prev.map((sv) =>
                                                        sv.variantId === variant.id
                                                          ? { ...sv, quantity: newQuantity }
                                                          : sv,
                                                      ),
                                                    )
                                                  }}
                                                  className="h-7 w-7 p-0 hover:bg-gray-100"
                                                >
                                                  <Plus className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs font-medium text-gray-700">Quantity B:</span>
                                              <div className="flex items-center border rounded overflow-hidden bg-white">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    const newQuantity = Math.max(
                                                      1,
                                                      (selectedVariant.quantityVarying2 || 1) - 1,
                                                    )
                                                    setSelectedVariants((prev) =>
                                                      prev.map((sv) =>
                                                        sv.variantId === variant.id
                                                          ? { ...sv, quantityVarying2: newQuantity }
                                                          : sv,
                                                      ),
                                                    )
                                                  }}
                                                  className="h-7 w-7 p-0 hover:bg-gray-100"
                                                >
                                                  <Minus className="h-3 w-3" />
                                                </Button>
                                                <span className="px-3 py-1 text-sm font-medium min-w-[40px] text-center">
                                                  {selectedVariant.quantityVarying2 || 1}
                                                </span>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    const newQuantity = (selectedVariant.quantityVarying2 || 1) + 1
                                                    setSelectedVariants((prev) =>
                                                      prev.map((sv) =>
                                                        sv.variantId === variant.id
                                                          ? { ...sv, quantityVarying2: newQuantity }
                                                          : sv,
                                                      ),
                                                    )
                                                  }}
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
                          )
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
                                })) || []
                              setSelectedVariants(allVariants)
                            }}
                            className="text-xs h-8"
                            disabled={selectedVariants.length === productVariants?.length}
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
                          {/* {selectedVariants.length > 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowBulkQuantityModal(true)}
                              className="text-xs h-8 ml-2"
                            >
                              Bulk Edit Quantities
                            </Button>
                          )} */}
                        </div>

                        {selectedVariants.length > 0 && (
                          <div className="text-xs text-gray-600">
                            {selectedVariants.length} variant{selectedVariants.length > 1 ? "s" : ""} selected
                          </div>
                        )}
                      </div>

                      {formErrors.selectedVariants && (
                        <p className="text-red-500 text-xs mt-2">{formErrors.selectedVariants}</p>
                      )}
                    </div>
                  )}

                  {/* Subscription Period */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Subscription Period</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {subscriptionPeriods.map((period) => (
                        <Button
                          key={period.value}
                          variant={selectedPeriod === period.value ? "default" : "outline"}
                          className={`h-10 ${selectedPeriod === period.value ? "bg-green-500 hover:bg-green-600" : "border-gray-300"}`}
                          onClick={() => setSelectedPeriod(period.value)}
                        >
                          {period.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Delivery Options */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Delivery Schedule</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: "daily", label: "Daily" },
                        { value: "select-days", label: "Select Days" },
                        { value: "varying", label: "Alternate Days" },
                      ].map((option) => (
                        <Button
                          key={option.value}
                          variant={deliveryOption === option.value ? "default" : "outline"}
                          className={`h-9 text-xs ${deliveryOption === option.value ? "bg-blue-500 hover:bg-blue-600" : "border-gray-300"}`}
                          onClick={() => setDeliveryOption(option.value)}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>

                    {deliveryOption === "select-days" && (
                      <div className="mt-4 p-3 rounded-md bg-white border border-gray-200">
                        <h4 className="text-xs font-medium text-gray-600 mb-2">Select delivery days:</h4>
                        <div className="flex flex-wrap gap-2">
                          {daysOfWeek.map((day) => (
                            <Button
                              key={day.id}
                              type="button"
                              size="sm"
                              variant={selectedDays.includes(day.id) ? "default" : "outline"}
                              className={`h-8 w-9 p-0 ${selectedDays.includes(day.id) ? "bg-orange-500" : "border-gray-300 text-gray-700"}`}
                              onClick={() => {
                                toggleDaySelection(day.id)
                                if (formErrors.selectedDays) setFormErrors((prev) => ({ ...prev, selectedDays: "" }))
                              }}
                            >
                              {day.label}
                            </Button>
                          ))}
                        </div>
                        {formErrors.selectedDays && (
                          <p className="text-red-500 text-xs mt-1">{formErrors.selectedDays}</p>
                        )}
                      </div>
                    )}

                    {/* Quantity selectors for non-variant products */}
                    {!hasVariants && (
                      <div className="mt-4">
                        {(deliveryOption === "daily" || deliveryOption === "select-days") && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Quantity per delivery:</span>
                            <div className="flex items-center border rounded-lg overflow-hidden bg-white w-28">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="h-9 w-9 p-0 hover:bg-gray-100"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="flex-1 text-center font-medium">{quantity}</span>
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

                        {deliveryOption === "varying" && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Quantity A:</span>
                              <div className="flex items-center border rounded-lg overflow-hidden bg-white w-28">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                  className="h-9 w-9 p-0 hover:bg-gray-100"
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="flex-1 text-center font-medium">{quantity}</span>
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
                              <span className="text-sm font-medium text-gray-700">Quantity B:</span>
                              <div className="flex items-center border rounded-lg overflow-hidden bg-white w-28">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setQuantityVarying2(Math.max(1, quantityVarying2 - 1))}
                                  className="h-9 w-9 p-0 hover:bg-gray-100"
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="flex-1 text-center font-medium">{quantityVarying2}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setQuantityVarying2(quantityVarying2 + 1)}
                                  className="h-9 w-9 p-0 hover:bg-gray-100"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Start Date */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Start Date</h3>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal border-gray-300 rounded-md",
                            !startDate && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "dd/MM/yyyy") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={(date) => {
                            setStartDate(date)
                            setCalendarOpen(false)
                            if (formErrors.startDate) setFormErrors((prev) => ({ ...prev, startDate: "" }))
                          }}
                          initialFocus
                          disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))}
                        />
                      </PopoverContent>
                    </Popover>
                    {formErrors.startDate && <p className="text-red-500 text-xs mt-1">{formErrors.startDate}</p>}
                  </div>
                </div>

                {/* Right Column - Address Section */}
                <div className="space-y-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-medium text-gray-700">Delivery Address</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAddressFormState((prev) => ({ ...prev, mobile: userMobile }))
                          setModalView("addressForm")
                        }}
                        className="text-xs h-8"
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add New
                      </Button>
                    </div>

                    {isLoadingAddresses ? (
                      <div className="flex items-center justify-center py-6">
                        <span className="text-gray-500 text-sm">Loading Delivery addresses...</span>
                      </div>
                    ) : userAddresses.length > 0 ? (
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        <RadioGroup
                          value={selectedAddressId || ""}
                          onValueChange={(id: string) => {
                            setSelectedAddressId(id)
                            if (formErrors.selectedAddressId)
                              setFormErrors((prev) => ({ ...prev, selectedAddressId: "" }))
                          }}
                          className="space-y-3"
                        >
                          {userAddresses.map((address) => (
                            <div
                              key={address.id}
                              className={`p-3 border rounded-lg cursor-pointer transition-all ${selectedAddressId === address.id ? "border-green-500 bg-green-50" : "border-gray-200 hover:bg-gray-50"}`}
                            >
                              <Label
                                htmlFor={`address-item-${address.id}`}
                                className="flex items-start space-x-3 w-full"
                              >
                                <RadioGroupItem value={address.id} id={`address-item-${address.id}`} className="mt-1" />
                                <div className="flex-1">
                                  <div className="flex justify-between">
                                    <span className="font-medium text-gray-900">{address.recipientName}</span>
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
                        <p className="text-gray-500 text-sm mb-3">No addresses saved</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAddressFormState((prev) => ({ ...prev, mobile: userMobile }))
                            setModalView("addressForm")
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add Delivery Address
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Enhanced Summary Section with Variant Details */}
                  {subscriptionSummary && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Order Summary</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Period:</span>
                          <span>{subscriptionSummary.period}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Schedule:</span>
                          <span className="text-right">{subscriptionSummary.deliveryDescription}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Start Date:</span>
                          <span>{subscriptionSummary.startDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Deliveries:</span>
                          <span>{subscriptionSummary.deliveryCount}</span>
                        </div>

                        {/* Variant Summary */}
                        {hasVariants && selectedVariants.length > 0 && (
                          <div className="border-t border-gray-200 pt-2 mt-2">
                            <span className="text-xs font-medium text-gray-600 block mb-2">Selected Variants:</span>
                            {selectedVariants.map((selectedVariant, index) => {
                              const variant = product.variants?.find((v) => v.id === selectedVariant.variantId)
                              if (!variant) return null

                              let variantTotalQty = 0
                              if (deliveryOption === "daily" || deliveryOption === "select-days") {
                                variantTotalQty = selectedVariant.quantity * subscriptionSummary.deliveryCount
                              } else if (deliveryOption === "varying") {
                                const days1 = Math.ceil(selectedPeriod / 2)
                                const days2 = Math.floor(selectedPeriod / 2)
                                variantTotalQty =
                                  selectedVariant.quantity * days1 + (selectedVariant.quantityVarying2 || 1) * days2
                              }

                              return (
                                <div key={index} className="flex justify-between text-xs py-1">
                                  <span className="text-gray-600">{variant.name}:</span>
                                  <span>
                                    {variantTotalQty} {variant.unit || ""} × ₹{variant.rate} = ₹
                                    {(variantTotalQty * variant.rate).toFixed(2)}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Quantity:</span>
                          <span>
                            {subscriptionSummary.totalQuantity} {!hasVariants ? product?.unit || "" : "items"}
                          </span>
                        </div>

                        <div className="border-t border-gray-200 pt-2 mt-2">
                          <div className="flex justify-between font-medium">
                            <span>Total Price:</span>
                            <span className="text-green-600">₹{subscriptionSummary.totalPrice.toFixed(2)}</span>
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
              <h3 className="text-lg font-semibold text-center">Confirm Your Subscription</h3>

              <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Product:</span>
                  <span className="font-semibold">{product.name}</span>
                </div>

                {/* Enhanced Variant Summary in Confirmation */}
                {hasVariants && selectedVariants.length > 0 && (
                  <div className="border-t border-gray-200 pt-3">
                    <span className="text-sm font-medium block mb-2">Selected Variants:</span>
                    <div className="space-y-2">
                      {selectedVariants.map((selectedVariant, index) => {
                        const variant = product.variants?.find((v) => v.id === selectedVariant.variantId)
                        if (!variant) return null

                        return (
                          <div key={index} className="bg-white p-2 rounded border text-sm">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{variant.name}</span>
                              <Badge variant="outline">
                                ₹{variant.rate} {variant.unit && `per ${variant.unit}`}
                              </Badge>
                            </div>
                            {deliveryOption === "varying" ? (
                              <div className="text-xs text-gray-600 mt-1">
                                Qty A: {selectedVariant.quantity}, Qty B: {selectedVariant.quantityVarying2 || 1}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-600 mt-1">
                                Quantity per delivery: {selectedVariant.quantity}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Period:</span>
                  <span>{subscriptionSummary?.period}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Delivery:</span>
                  <span>{subscriptionSummary?.deliveryDescription}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Start Date:</span>
                  <span>{subscriptionSummary?.startDate}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Quantity:</span>
                  <span>
                    {subscriptionSummary?.totalQuantity} {!hasVariants ? product?.unit || "" : "items"}
                  </span>
                </div>

                <div className="pt-2 border-t border-gray-200 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Subtotal:</span>
                    <span className="text-sm">₹{subscriptionSummary?.totalPrice?.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Wallet Credit:</span>
                    <span className="text-sm text-green-600">-₹{walletDeduction.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between font-medium pt-2">
                    <span className="text-sm font-semibold">Amount Payable:</span>
                    <span className="text-sm font-semibold text-green-600">₹{remainingPayable.toFixed(2)}</span>
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
                          ? `₹${walletDeduction.toFixed(2)} will be deducted from your wallet. The remaining ₹${remainingPayable.toFixed(2)} will be collected via Cash/UPI on delivery.`
                          : `Full amount of ₹${remainingPayable.toFixed(2)} will be collected via Cash/UPI on delivery.`}
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
                        Full amount of ₹{subscriptionSummary?.totalPrice?.toFixed(2)} will be deducted from your wallet.
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="bg-white p-4 rounded-md border">
                <h4 className="text-sm font-medium mb-2">Delivery Address:</h4>
                {userAddresses.map((address) => {
                  if (address.id === selectedAddressId) {
                    return (
                      <div key={address.id} className="text-sm">
                        <Badge variant="outline" className="mt-1">
                          {address.label}
                        </Badge>
                        <p>
                          <span className="font-medium">{address.recipientName}</span> • {address.mobile}
                        </p>
                        <p>
                          {address.plotBuilding}, {address.streetArea}
                        </p>
                        {address.landmark && <p>{address.landmark}</p>}
                        <p>
                          {address.city}, {address.state} - {address.pincode}
                        </p>
                      </div>
                    )
                  }
                  return null
                })}
              </div>
            </div>
          ) : (
            // Address Form View
            <div className="bg-white p-4 rounded-md space-y-4">
              <h3 className="text-lg font-semibold">Add New Address</h3>
              <div className="space-y-5">
                <div>
                  <Label htmlFor="address-label" className="text-sm font-medium mb-2 block">
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
                      <RadioGroupItem value="Home" id="type-home" className="text-green-500" />
                      <Label htmlFor="type-home" className="text-sm">
                        Home
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Work" id="type-work" className="text-green-500" />
                      <Label htmlFor="type-work" className="text-sm">
                        Work
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Other" id="label-other" />
                      <Label htmlFor="label-other">Other</Label>
                    </div>
                  </RadioGroup>
                  {formErrors.label && <p className="text-red-500 text-xs mt-1">{formErrors.label}</p>}
                </div>
                <div>
                  <Label htmlFor="recipientName" className="text-sm font-medium mb-1.5 block">
                    Delivery To*
                  </Label>
                  <Input
                    id="recipientName"
                    name="recipientName"
                    value={addressFormState.recipientName}
                    onChange={handleAddressFormChange}
                    placeholder="Full name of recipient"
                    className="h-11 bg-white"
                  />
                  {formErrors.recipientName && <p className="text-red-500 text-xs mt-1">{formErrors.recipientName}</p>}
                </div>
                <div>
                  <Label htmlFor="mobile" className="text-sm font-medium mb-1.5 block">
                    Mobile*
                  </Label>
                  <Input
                    id="mobile"
                    name="mobile"
                    value={addressFormState.mobile}
                    onChange={handleAddressFormChange}
                    placeholder="Mobile number"
                    className="h-11 bg-white"
                  />
                  {formErrors.mobile && <p className="text-red-500 text-xs mt-1">{formErrors.mobile}</p>}
                </div>
                <div>
                  <Label htmlFor="plotBuilding" className="text-sm font-medium mb-1.5 block">
                    Plot/Building*
                  </Label>
                  <Input
                    id="plotBuilding"
                    name="plotBuilding"
                    value={addressFormState.plotBuilding}
                    onChange={handleAddressFormChange}
                    placeholder="Plot number, building name"
                    className="h-11 bg-white"
                  />
                  {formErrors.plotBuilding && <p className="text-red-500 text-xs mt-1">{formErrors.plotBuilding}</p>}
                </div>
                <div>
                  <Label htmlFor="streetArea" className="text-sm font-medium mb-1.5 block">
                    Street/Area*
                  </Label>
                  <Input
                    id="streetArea"
                    name="streetArea"
                    value={addressFormState.streetArea}
                    onChange={handleAddressFormChange}
                    placeholder="Street, area"
                    className="h-11 bg-white"
                  />
                  {formErrors.streetArea && <p className="text-red-500 text-xs mt-1">{formErrors.streetArea}</p>}
                </div>
                <div>
                  <Label htmlFor="landmark" className="text-sm font-medium mb-1.5 block">
                    Landmark (Optional)
                  </Label>
                  <Input
                    id="landmark"
                    name="landmark"
                    value={addressFormState.landmark}
                    onChange={handleAddressFormChange}
                    placeholder="Nearby landmark"
                    className="h-11 bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city" className="text-sm font-medium mb-1.5 block">
                      City*
                    </Label>
                    <Input
                      id="city"
                      name="city"
                      value={addressFormState.city}
                      onChange={handleAddressFormChange}
                      placeholder="City"
                      className="h-11 bg-white"
                    />
                    {formErrors.city && <p className="text-red-500 text-xs mt-1">{formErrors.city}</p>}
                  </div>
                  <div>
                    <Label htmlFor="state" className="text-sm font-medium mb-1.5 block">
                      State*
                    </Label>
                    <Input
                      id="state"
                      name="state"
                      value={addressFormState.state}
                      onChange={handleAddressFormChange}
                      placeholder="State"
                      className="h-11 bg-white"
                    />
                    {formErrors.state && <p className="text-red-500 text-xs mt-1">{formErrors.state}</p>}
                  </div>
                </div>
                <div>
                  <Label htmlFor="pincode" className="text-sm font-medium mb-1.5 block">
                    Pincode*
                  </Label>
                  <Input
                    id="pincode"
                    name="pincode"
                    type="text"
                    value={addressFormState.pincode}
                    onChange={handleAddressFormChange}
                    placeholder="Pincode"
                    className="h-11 bg-white"
                  />
                  {formErrors.pincode && <p className="text-red-500 text-xs mt-1">{formErrors.pincode}</p>}
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isDefault"
                    name="isDefault"
                    checked={addressFormState.isDefault}
                    onChange={(e) => setAddressFormState((prev) => ({ ...prev, isDefault: e.target.checked }))}
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

        <DialogFooter className="p-4 border-t bg-white">
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
              <Button variant="outline" onClick={handleCancelAddAddress} className="rounded-lg h-11 border-gray-300">
                Cancel
              </Button>
              <Button
                onClick={handleSaveAddress}
                className="bg-green-500 hover:bg-green-600 text-white rounded-lg h-11 "
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
                className="bg-green-500 hover:bg-green-600 text-white rounded-lg h-11 "
                onClick={handleConfirmSubscription}
                disabled={!!(formErrors.startDate || formErrors.selectedDays || formErrors.selectedAddressId)}
              >
                Confirm Subscription
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
      {/* Bulk Quantity Modal */}
      <BulkQuantityModal
        isOpen={showBulkQuantityModal}
        onOpenChange={setShowBulkQuantityModal}
        selectedVariants={selectedVariants}
        productVariants={product?.variants || []}
        deliveryOption={deliveryOption}
        onUpdateQuantities={(updatedVariants) => {
          setSelectedVariants(updatedVariants)
        }}
      />
    </Dialog>
  )
}
