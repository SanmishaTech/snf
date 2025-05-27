import React from "react"; 
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/apiService";
import AgencyForm from "./AgencyForm";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton"; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AgencyUser {
  id: string | number;
  name: string;
  email: string;
  active: boolean;
}

interface AgencyData {
  id: string | number;
  name: string;
  contactPersonName?: string | null;
  email?: string | null;
  mobile: string;
  alternateMobile?: string | null;
  address1: string;
  address2?: string | null;
  city: string;
  pincode: number;
  userId: string | number;
  user?: AgencyUser;
}

const EditAgencyPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const fetchAgencyById = async (agencyId: string): Promise<AgencyData> => {
    const response = await get(`/agencies/${agencyId}`);
    return response;
  };

  const { data: agencyData, isLoading, isError, error } = useQuery<AgencyData, Error>({
    queryKey: ["agency", id],
    queryFn: () => fetchAgencyById(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });

  const handleSuccess = () => {
    navigate("/admin/agencies"); 
  };

  if (!id) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>No Agency ID provided. Please go back and select an agency to edit.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6"> 
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-1/3 ml-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Fetching Agency</AlertTitle>
          <AlertDescription>
            There was a problem retrieving the agency details. Error: {error?.message || 'Unknown error'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!agencyData) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="default">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Not Found</AlertTitle>
          <AlertDescription>Agency data could not be loaded or found.</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const transformedInitialData: Partial<AgencyFormInputs> = {
    name: agencyData.name,
    contactPersonName: agencyData.contactPersonName || '',
    email: agencyData.email || '',
    mobile: agencyData.mobile,
    alternateMobile: agencyData.alternateMobile || null,
    address1: agencyData.address1,
    address2: agencyData.address2 || null,
    city: agencyData.city,
    pincode: agencyData.pincode,
    status: agencyData.user?.active ? "ACTIVE" : "INACTIVE",
  };

  return (
    <div className="container mx-auto p-6"> 
      <Card className="max-w-4xl mx-auto"> 
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Edit Agency</CardTitle> 
        </CardHeader>
        <CardContent>
          <AgencyForm
            mode="edit"
            agencyId={id!}
            initialData={transformedInitialData} 
            onSuccess={handleSuccess}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default EditAgencyPage;

type AgencyFormInputs = {
  name: string;
  contactPersonName?: string; 
  email?: string; 
  mobile: string;
  alternateMobile?: string | null;
  address1: string;
  address2?: string | null;
  city: string;
  pincode?: number; 
  status?: "ACTIVE" | "INACTIVE";
  userFullName?: string; 
  userLoginEmail?: string; 
  userPassword?: string; 
};
