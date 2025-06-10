import React from "react";
import { useNavigate } from "react-router-dom";
import AgencyForm from "./AgencyForm";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";

const CreateAgencyPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate("/admin/agencies"); // Redirect to agencies list
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      
      <Card className=" mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Create New Delivery Agency</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-6">
            Fill in the details below to create a new delivery agency and an associated user account.
          </p>
          <AgencyForm mode="create" onSuccess={handleSuccess} />
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateAgencyPage;
