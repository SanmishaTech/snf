import React from "react";
import { useNavigate } from "react-router-dom";
import AgencyForm from "./AgencyForm";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

const CreateAgencyPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate("/admin/agencies"); // Redirect to agencies list
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Button 
        variant="ghost" 
        className="mb-4" 
        onClick={() => navigate("/admin/agencies")}
      >
        <ChevronLeft className="mr-2 h-4 w-4" />
        Back to Agencies
      </Button>
      
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">Create New Agency</CardTitle>
          <CardDescription>
            Fill in the details below to create a new agency with a user account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AgencyForm mode="create" onSuccess={handleSuccess} />
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateAgencyPage;
