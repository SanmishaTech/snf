import { Card, CardContent, CardHeader } from "@/components/ui/card";
import WastageForm from "./WastageForm";

export default function CreateWastagePage() {
  return (
    <div className="container mx-auto space-y-6">
      <Card>
        <CardHeader>
          {/* Header could include breadcrumb/title if needed */}
        </CardHeader>
        <CardContent>
          <WastageForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
