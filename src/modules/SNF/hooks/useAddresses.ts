import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as apiService from "@/services/apiService";
import { toast } from "sonner";

export interface DeliveryAddress {
  id: string;
  memberId: number;
  recipientName: string;
  mobile: string;
  plotBuilding: string;
  streetArea: string;
  landmark?: string;
  pincode: string;
  city: string;
  state: string;
  isDefault: boolean;
  label?: string;
  createdAt: string;
  updatedAt: string;
  locationId?: number;
  location?: {
    id: number;
    name: string;
    cityId: number;
    createdAt: string;
    updatedAt: string;
    agencyId: number;
  };
}

export const useAddresses = () => {
  const queryClient = useQueryClient();

  const {
    data: addresses = [],
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ["addresses"],
    queryFn: async () => {
      const data = await apiService.get("/delivery-addresses");
      return data as DeliveryAddress[];
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (addressId: string) => {
      return await apiService.patch(`/delivery-addresses/${addressId}/set-default`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      toast.success("Default address updated");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to set default"),
  });

  const defaultAddress = addresses.find(addr => addr.isDefault);

  return {
    addresses,
    defaultAddress,
    isLoading,
    isError,
    error,
    refetch,
    setDefaultAddress: setDefaultMutation.mutate,
    isSettingDefault: setDefaultMutation.isPending
  };
};