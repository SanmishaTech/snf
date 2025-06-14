import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import PurchaseForm, { PurchaseFormData } from "./PurchaseForm";
import { get } from "@/services/apiService";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function EditPurchasePage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError } = useQuery<{ data: PurchaseFormData }>({
    queryKey: ["purchase", id],
    queryFn: () => get(`/purchases/${id}`),
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
    toast.error("Failed to load purchase");
    return null;
  }

  return (
    <div className="container mx-auto space-y-6">
      <Card>
        <CardHeader></CardHeader>
        <CardContent>
          <PurchaseForm mode="edit" purchaseId={id} initialData={data as unknown as PurchaseFormData} />
        </CardContent>
      </Card>
    </div>
  );
}
