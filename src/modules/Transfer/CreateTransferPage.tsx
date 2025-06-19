import { Card, CardContent, CardHeader } from "@/components/ui/card";
import TransferForm from "./TransferForm";

export default function CreateTransferPage() {
  return (
    <div className="container mx-auto space-y-6">
      <Card>
        <CardHeader>
          {/* Header could include breadcrumb/title if needed */}
        </CardHeader>
        <CardContent>
          <TransferForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
