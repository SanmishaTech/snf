import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Home, MapPin, Plus, Edit } from "lucide-react";
import { useAddresses, type DeliveryAddress } from "../hooks/useAddresses";

interface AddressSelectorProps {
  selectedAddressId?: string;
  onAddressSelect: (address: DeliveryAddress) => void;
  onEditAddress?: (address: DeliveryAddress) => void;
}

const AddressSelector: React.FC<AddressSelectorProps> = ({
  selectedAddressId,
  onAddressSelect,
  onEditAddress
}) => {
  const { addresses, defaultAddress, isLoading, isError, error } = useAddresses();
  const [localSelectedId, setLocalSelectedId] = useState<string>(
    selectedAddressId || defaultAddress?.id || ""
  );

  // Auto-select default address if no address is selected
  React.useEffect(() => {
    if (!selectedAddressId && defaultAddress && !localSelectedId) {
      setLocalSelectedId(defaultAddress.id);
      onAddressSelect(defaultAddress);
    }
  }, [defaultAddress, selectedAddressId, localSelectedId, onAddressSelect]);

  const handleAddressSelection = (addressId: string) => {
    const address = addresses.find(addr => addr.id === addressId);
    if (address) {
      setLocalSelectedId(addressId);
      onAddressSelect(address);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="size-4" />
            Delivery Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-5/6" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <MapPin className="size-4" />
            Address Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600 mb-3">
            {(error as any)?.message || "Failed to load addresses"}
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/snf/address">Manage Addresses</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!addresses || addresses.length === 0) {
    return (
      <Card className="border-yellow-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="size-4" />
            No Addresses Found
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            You need to add a delivery address to place an order.
          </p>
          <Button asChild size="sm">
            <Link to="/snf/addresses">
              <Plus className="size-4 mr-2" />
              Add Address
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="size-4" />
            Select Delivery Address
          </CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link to="/snf/address">
              <Edit className="size-4 mr-2" />
              Manage
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={localSelectedId}
          onValueChange={handleAddressSelection}
          className="space-y-3"
        >
          {addresses.map((address) => (
            <div key={address.id} className="flex items-start space-x-3">
              <RadioGroupItem
                value={address.id}
                id={address.id}
                className="mt-1"
              />
              <Label
                htmlFor={address.id}
                className="flex-1 cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{address.recipientName}</span>
                    {address.label && (
                      <Badge variant="secondary" className="text-xs">
                        {address.label}
                      </Badge>
                    )}
                    {address.isDefault && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                        <Home className="h-3 w-3 mr-1" />
                        Default
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {address.plotBuilding}
                    {address.plotBuilding && address.streetArea ? ", " : ""}
                    {address.streetArea}
                  </p>
                  {address.landmark && (
                    <p className="text-xs text-muted-foreground">
                      Landmark: {address.landmark}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {address.city}, {address.state} - {address.pincode}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Mobile: {address.mobile}
                  </p>
                </div>
              </Label>
              {onEditAddress && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditAddress(address)}
                  className="mt-1"
                >
                  <Edit className="size-4" />
                </Button>
              )}
            </div>
          ))}
        </RadioGroup>
        
        <div className="mt-4 pt-3 border-t">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link to="/snf/address">
              <Plus className="size-4 mr-2" />
              Add New Address
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AddressSelector;