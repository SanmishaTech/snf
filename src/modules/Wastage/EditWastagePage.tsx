import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import WastageForm, { WastageFormData } from "./WastageForm";
import { get } from "@/services/apiService";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function EditWastagePage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError } = useQuery<{ data: WastageFormData }>({
    queryKey: ["wastage", id],
    queryFn: () => get(`/wastages/${id}`),
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
    toast.error("Failed to load wastage");
    return null;
  }

  return (
    <div className="container mx-auto space-y-6">
      <Card>
        <CardHeader></CardHeader>
        <CardContent>
          <WastageForm mode="edit" wastageId={id} initialData={data as unknown as WastageFormData} />
        </CardContent>
      </Card>
    </div>
  );
}
