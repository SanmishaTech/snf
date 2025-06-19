import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import TransferForm from "./TransferForm";
import type { TransferFormData } from "./TransferForm";
import { get } from "@/services/apiService";

// convert API response to form data shape
function mapToFormData(api: any): Partial<TransferFormData> {
  if (!api) return {};
  return {
    transferNo: api.transferNo,
    transferDate: api.transferDate ? new Date(api.transferDate) : undefined,
    fromDepotId: String(api.fromDepotId),
    toDepotId: String(api.toDepotId),
    notes: api.notes || "",
    details: (api.details || []).map((d: any) => ({
      fromDepotVariantId: String(d.fromDepotVariantId),
      toDepotVariantId: String(d.toDepotVariantId),
      quantity: d.quantity,
    })),
  };
}
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function EditTransferPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError } = useQuery<{ data: any }>({
    queryKey: ["transfer", id],
    queryFn: () => get(`/transfers/${id}`),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (isError || !data) {
    toast.error("Failed to load transfer");
    return null;
  }

  return (
    <div className="container mx-auto space-y-6">
      <Card>
        <CardHeader></CardHeader>
        <CardContent>
          {id && (
            <TransferForm
              mode="edit"
              transferId={id}
              initialData={mapToFormData(data.data)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
