import { Card, CardContent, CardHeader } from "@/components/ui/card";
import PurchaseForm from "./PurchaseForm";

export default function CreatePurchasePage() {
  return (
    <div className="container mx-auto space-y-6">
      <Card>
        <CardHeader>
          {/* Header could include breadcrumb/title if needed */}
        </CardHeader>
        <CardContent>
          <PurchaseForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
