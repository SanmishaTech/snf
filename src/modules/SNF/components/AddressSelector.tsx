import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Plus, Edit } from "lucide-react";
import { useAddresses, type DeliveryAddress } from "../hooks/useAddresses";
import { Label } from "@/components/ui/label";

interface AddressSelectorProps {
  selectedAddressId?: string;
  onAddressSelect: (address: DeliveryAddress) => void;
}

const AddressSelector: React.FC<AddressSelectorProps> = ({
  selectedAddressId,
  onAddressSelect,
}) => {
  const { addresses, defaultAddress, isLoading, isError, error } = useAddresses();
  const [localSelectedId, setLocalSelectedId] = useState<string>(
    selectedAddressId || ""
  );

  // Auto-select default address if no address is selected
  React.useEffect(() => {
    // If not selected yet, but we have a default address, select it
    if (!selectedAddressId && defaultAddress && !localSelectedId) {
      setLocalSelectedId(defaultAddress.id);
      onAddressSelect(defaultAddress);
    }
    // If no default address but we have addresses and none selected, select the first one
    else if (!selectedAddressId && !defaultAddress && !localSelectedId && addresses && addresses.length > 0) {
      setLocalSelectedId(addresses[0].id);
      onAddressSelect(addresses[0]);
    }
  }, [defaultAddress, addresses, selectedAddressId, localSelectedId, onAddressSelect]);

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
            {((error as any)?.message?.toLowerCase().includes("member not found"))
              ? "Member login required. Please sign in to your member account to continue with your order."
              : ((error as any)?.message || "Failed to load addresses")}
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/snf/addresses">Manage Addresses</Link>
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
    <Card className="overflow-hidden border-none shadow-lg bg-white ring-1 ring-slate-200">
      <div className="bg-gradient-to-r from-slate-50 to-white px-5 py-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-green-50 p-2 rounded-xl border border-green-100 shadow-sm">
            <MapPin className="size-5 text-green-600" />
          </div>
          <div className="flex flex-col">
            <h3 className="font-bold text-slate-900 leading-tight">Delivery Address</h3>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Where should we deliver?</span>
          </div>
        </div>
        <Button asChild variant="ghost" size="sm" className="h-8 text-slate-500 hover:text-green-700 hover:bg-green-50 transition-all rounded-lg">
          <Link to="/snf/addresses" className="flex items-center gap-1.5 px-2">
            <Edit className="size-3.5" />
            <span className="text-[11px] font-bold">Manage</span>
          </Link>
        </Button>
      </div>

      <CardContent className="p-5 space-y-5">
        <div className="space-y-2.5">
          <div className="flex justify-between items-center px-1">
            <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Saved Addresses</Label>
            {addresses && addresses.length > 0 && (
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                {addresses.length} total
              </span>
            )}
          </div>

          <Select
            value={localSelectedId}
            onValueChange={handleAddressSelection}
          >
            <SelectTrigger className="w-full h-auto py-4 px-5 border-2 border-slate-100 bg-white shadow-sm hover:border-green-200 hover:bg-green-50/10 focus:ring-4 focus:ring-green-500/10 transition-all rounded-2xl group min-h-[75px]">
              <SelectValue placeholder="Select a delivery address">
                {(() => {
                  const selected = addresses?.find(a => a.id === localSelectedId);
                  if (!selected) return <span className="text-slate-400 font-medium italic">Choose a delivery address...</span>;
                  return (
                    <div className="flex flex-col items-start text-left space-y-1.5 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-800 text-sm tracking-tight">{selected.recipientName}</span>
                        {selected.label && (
                          <Badge variant="secondary" className="bg-slate-900 text-white text-[9px] h-4 px-2 font-black uppercase tracking-tighter rounded-md border-none">
                            {selected.label}
                          </Badge>
                        )}
                        {selected.isDefault && (
                          <Badge variant="outline" className="bg-green-500 text-white border-none text-[9px] h-4 px-2 font-black uppercase tracking-tighter rounded-md shadow-sm">
                            Default
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 font-medium leading-normal line-clamp-1">
                        {selected.plotBuilding}{selected.plotBuilding && ", "}{selected.streetArea}{selected.streetArea && ", "}{selected.city}, {selected.pincode}
                      </span>
                    </div>
                  );
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-w-[calc(100vw-2rem)] sm:max-w-[480px] p-2 rounded-2xl shadow-2xl border-slate-100 overflow-y-auto max-h-[350px] custom-scrollbar">
              <div className="px-2 py-2 mb-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Your Locations</p>
              </div>
              {addresses.map((address) => (
                <SelectItem key={address.id} value={address.id} className="rounded-xl focus:bg-green-50 py-3.5 mb-1 last:mb-0 border border-transparent focus:border-green-100 cursor-pointer">
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-bold text-[13px] text-slate-900">{address.recipientName}</span>
                      {address.label && (
                        <Badge variant="secondary" className="bg-slate-100 text-slate-700 text-[9px] h-3.5 px-1.5 font-bold uppercase tracking-tighter rounded">
                          {address.label}
                        </Badge>
                      )}
                      {address.isDefault && (
                        <Badge variant="outline" className="bg-green-50 text-green-600 border-green-100 text-[9px] h-3.5 px-1.5 font-bold uppercase tracking-tighter rounded">
                          Default
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium leading-relaxed text-left space-y-0.5">
                      <p className="line-clamp-1 italic">{address.plotBuilding}{address.plotBuilding && ", "}{address.streetArea}</p>
                      <p className="font-bold">{address.city}, {address.state} - {address.pincode}</p>
                      <div className="flex items-center gap-2 mt-1 opacity-70">
                        <div className="w-1 h-1 bg-slate-300 rounded-full" />
                        <p className="text-[10px] font-bold">Mobile: {address.mobile}</p>
                      </div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Link
          to="/snf/addresses"
          className="group relative flex items-center gap-3 py-2.5 px-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/20 hover:bg-green-50/30 hover:border-green-300 transition-all duration-200"
        >
          <div className="bg-white p-1.5 rounded-lg shadow-sm ring-1 ring-slate-100 group-hover:scale-105 transition-transform">
            <Plus className="size-3.5 text-green-600" />
          </div>
          <div className="flex flex-col text-left">
            <span className="block text-xs font-bold text-slate-700 tracking-tight">Add New Address</span>
            <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-widest leading-none">New Delivery Location</span>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
};

export default AddressSelector;