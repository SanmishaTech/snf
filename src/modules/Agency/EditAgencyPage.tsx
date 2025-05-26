import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/apiService";
import AgencyForm from "./AgencyForm";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader } from "lucide-react";

const EditAgencyPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formInitialData, setFormInitialData] = useState<any>(null);

  const { isLoading, isError, error } = useQuery({
    queryKey: ["agency", id],
    queryFn: async () => {
      const data = await get(`/agencies/${id}`);
      // Transform backend data to match form structure
      setFormInitialData({
        name: data.name,
        email: data.email,
        mobile: data.mobile,
        address1: data.address1,
        contactPersonName: data.contactPersonName,
        alternateMobile: data.alternateMobile,
        address2: data.address2 || null,
        city: data.city,
        pincode: data.pincode,
      });
      return data;
    },
    enabled: !!id,
  });

  const handleSuccess = () => {
    navigate("/admin/agencies"); // Redirect to agencies list
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader className="animate-spin h-8 w-8" />
      </div>
    );
  }

  if (isError && error instanceof Error) {
    return (
      <div className="p-4 text-red-600">
        <p>Error loading agency: {error.message}</p>
      </div>
    );
  }

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
          <CardTitle className="text-2xl">Edit Agency</CardTitle>
          <CardDescription>
            Update the agency details below
          </CardDescription>
        </CardHeader>
        <CardContent>
          {formInitialData && (
            <AgencyForm
              mode="edit"
              agencyId={id}
              initialData={formInitialData}
              onSuccess={handleSuccess}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EditAgencyPage;
