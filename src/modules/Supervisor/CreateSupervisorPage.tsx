import React from "react";
import { useNavigate } from "react-router-dom";
import SupervisorForm from "./SupervisorForm";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";

const CreateSupervisorPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate("/admin/supervisors"); // Redirect to supervisors list
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      
      <Card className=" mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Create New Supervisor</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-6">
            Fill in the details below to create a new supervisor and an associated user account.
          </p>
          <SupervisorForm mode="create" onSuccess={handleSuccess} />
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateSupervisorPage;