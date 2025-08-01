import React from "react"; 
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/apiService";
import SupervisorForm from "./SupervisorForm";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton"; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SupervisorUser {
  id: string | number;
  name: string;
  email: string;
  active: boolean;
}

interface SupervisorDepot {
  id: number;
  name: string;
}

interface SupervisorData {
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
  depotId?: number | null;
  agencyId?: number | null;
  userId: string | number;
  user?: SupervisorUser;
  depot?: SupervisorDepot;
  agency?: { id: number; name: string; } | null;
}

const EditSupervisorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const fetchSupervisorById = async (supervisorId: string): Promise<SupervisorData> => {
    const response = await get(`/supervisors/${supervisorId}`);
    return response;
  };

  const { data: supervisorData, isLoading, isError, error } = useQuery<SupervisorData, Error>({
    queryKey: ["supervisor", id],
    queryFn: () => fetchSupervisorById(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });

  const handleSuccess = () => {
    navigate("/admin/supervisors"); 
  };

  if (!id) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>No Supervisor ID provided. Please go back and select a supervisor to edit.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6"> 
        <Card className=" mx-auto">
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
          <AlertTitle>Error Fetching Supervisor</AlertTitle>
          <AlertDescription>
            There was a problem retrieving the supervisor details. Error: {error?.message || 'Unknown error'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!supervisorData) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="default">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Not Found</AlertTitle>
          <AlertDescription>Supervisor data could not be loaded or found.</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const transformedInitialData: Partial<SupervisorFormInputs> = {
    name: supervisorData.name,
    contactPersonName: supervisorData.contactPersonName || '',
    email: supervisorData.email || '',
    mobile: supervisorData.mobile,
    alternateMobile: supervisorData.alternateMobile || null,
    address1: supervisorData.address1,
    address2: supervisorData.address2 || null,
    city: supervisorData.city,
    pincode: supervisorData.pincode,
    depotId: supervisorData.depotId || null,
    agencyId: supervisorData.agencyId || null,
    status: supervisorData.user?.active ? "ACTIVE" : "INACTIVE",
  };

  return (
    <div className="container mx-auto p-6"> 
      <Card className="max-w-4xl mx-auto"> 
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Edit Supervisor</CardTitle> 
        </CardHeader>
        <CardContent>
          <SupervisorForm
            mode="edit"
            supervisorId={id!}
            initialData={transformedInitialData} 
            onSuccess={handleSuccess}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default EditSupervisorPage;

type SupervisorFormInputs = {
  name: string;
  contactPersonName?: string; 
  email?: string; 
  mobile: string;
  alternateMobile?: string | null;
  address1: string;
  address2?: string | null;
  city: string;
  pincode?: number; 
  depotId?: number | null;
  agencyId?: number | null;
  status?: "ACTIVE" | "INACTIVE";
  userFullName?: string; 
  userLoginEmail?: string; 
  userPassword?: string; 
};
