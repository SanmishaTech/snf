
import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Plus, Minus } from "lucide-react"

interface ProductVariant {
  id: string
  name: string
  price: number
  rate: number
  unit?: string
  description?: string
}

interface SelectedVariant {
  variantId: string
  quantity: number
  quantityVarying2?: number
}

interface BulkQuantityModalProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  selectedVariants: SelectedVariant[]
  productVariants: ProductVariant[]
  deliveryOption: string
  onUpdateQuantities: (updatedVariants: SelectedVariant[]) => void
}

export const BulkQuantityModal: React.FC<BulkQuantityModalProps> = ({
  isOpen,
  onOpenChange,
  selectedVariants,
  productVariants,
  deliveryOption,
  onUpdateQuantities,
}) => {
  const [tempVariants, setTempVariants] = useState<SelectedVariant[]>(selectedVariants)

  const handleSave = () => {
    onUpdateQuantities(tempVariants)
    onOpenChange(false)
  }

  const handleCancel = () => {
    setTempVariants(selectedVariants) // Reset to original values
    onOpenChange(false)
  }

  const updateQuantity = (variantId: string, field: "quantity" | "quantityVarying2", value: number) => {
    setTempVariants((prev) =>
      prev.map((variant) => (variant.variantId === variantId ? { ...variant, [field]: Math.max(1, value) } : variant)),
    )
  }

  const setBulkQuantity = (quantity: number) => {
    setTempVariants((prev) =>
      prev.map((variant) => ({
        ...variant,
        quantity: Math.max(1, quantity),
      })),
    )
  }

  const setBulkQuantityVarying2 = (quantity: number) => {
    setTempVariants((prev) =>
      prev.map((variant) => ({
        ...variant,
        quantityVarying2: Math.max(1, quantity),
      })),
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Update Quantities</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Bulk Actions */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Quick Bulk Actions</h4>
            <div className="flex gap-3 items-center">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Set all quantities to:</Label>
                <div className="flex items-center border rounded overflow-hidden bg-white">
                  <Button variant="ghost" size="sm" onClick={() => setBulkQuantity(1)} className="h-8 px-2 text-xs">
                    1
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setBulkQuantity(2)} className="h-8 px-2 text-xs">
                    2
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setBulkQuantity(5)} className="h-8 px-2 text-xs">
                    5
                  </Button>
                </div>
              </div>

              {deliveryOption === "varying" && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Set all Qty B to:</Label>
                  <div className="flex items-center border rounded overflow-hidden bg-white">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setBulkQuantityVarying2(1)}
                      className="h-8 px-2 text-xs"
                    >
                      1
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setBulkQuantityVarying2(2)}
                      className="h-8 px-2 text-xs"
                    >
                      2
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setBulkQuantityVarying2(5)}
                      className="h-8 px-2 text-xs"
                    >
                      5
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Individual Variant Controls */}
          <div className="space-y-3">
            {tempVariants.map((selectedVariant) => {
              const variant = productVariants.find((v) => v.id === selectedVariant.variantId)
              if (!variant) return null

              return (
                <div key={selectedVariant.variantId} className="border rounded-lg p-4 bg-white">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{variant.name}</h4>
                      <Badge variant="outline" className="text-xs mt-1">
                        ₹{variant.rate} {variant.unit && `per ${variant.unit}`}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Primary Quantity */}
                    <div>
                      <Label className="text-sm font-medium mb-2 block">
                        {deliveryOption === "varying" ? "Quantity A" : "Quantity per delivery"}
                      </Label>
                      <div className="flex items-center border rounded-lg overflow-hidden bg-gray-50">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            updateQuantity(selectedVariant.variantId, "quantity", selectedVariant.quantity - 1)
                          }
                          className="h-10 w-10 p-0 hover:bg-gray-100"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={selectedVariant.quantity}
                          onChange={(e) =>
                            updateQuantity(selectedVariant.variantId, "quantity", Number.parseInt(e.target.value) || 1)
                          }
                          className="border-0 text-center font-medium bg-transparent h-10"
                          min="1"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            updateQuantity(selectedVariant.variantId, "quantity", selectedVariant.quantity + 1)
                          }
                          className="h-10 w-10 p-0 hover:bg-gray-100"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Secondary Quantity for Varying */}
                    {deliveryOption === "varying" && (
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Quantity B</Label>
                        <div className="flex items-center border rounded-lg overflow-hidden bg-gray-50">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              updateQuantity(
                                selectedVariant.variantId,
                                "quantityVarying2",
                                (selectedVariant.quantityVarying2 || 1) - 1,
                              )
                            }
                            className="h-10 w-10 p-0 hover:bg-gray-100"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            type="number"
                            value={selectedVariant.quantityVarying2 || 1}
                            onChange={(e) =>
                              updateQuantity(
                                selectedVariant.variantId,
                                "quantityVarying2",
                                Number.parseInt(e.target.value) || 1,
                              )
                            }
                            className="border-0 text-center font-medium bg-transparent h-10"
                            min="1"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              updateQuantity(
                                selectedVariant.variantId,
                                "quantityVarying2",
                                (selectedVariant.quantityVarying2 || 1) + 1,
                              )
                            }
                            className="h-10 w-10 p-0 hover:bg-gray-100"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-green-500 hover:bg-green-600">
            Update Quantities
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
