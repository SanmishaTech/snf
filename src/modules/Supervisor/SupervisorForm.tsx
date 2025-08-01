import { useEffect, useState } from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { get, post, put } from "@/services/apiService";
import Validate from "@/lib/Handlevalidation";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const baseSupervisorSchema = z.object({
  name: z.string().min(1, "Supervisor name is required"),
  contactPersonName: z.string().optional(),
  email: z.string().optional().nullable(),
  mobile: z.string().regex(/^\d{10}$/, "Mobile number must be 10 digits"),
  alternateMobile: z.any().nullable().optional(),
  address1: z.string().min(1, "Address Line 1 is required"),
  address2: z.any().nullable().optional(),
  city: z.string().optional().nullable(),
  pincode: z.coerce
    .number()
    .int("Pincode must be an integer")
    .positive("Pincode must be positive")
    .refine((val) => String(val).length === 6, "Pincode must be 6 digits"),
  depotId: z.coerce.number().optional().nullable(),
  agencyId: z.coerce.number().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

const newUserSchema = z.object({
  userFullName: z.string().min(1, "User's full name is required"),
  userLoginEmail: z.string().email("Invalid login email for user"),
  userPassword: z
    .string()
    .min(6, "User password must be at least 6 characters"),
});

const internalFormRepresentationSchema = baseSupervisorSchema.extend({
  userFullName: z.string().optional(),
  userLoginEmail: z.string().email().optional(),
  userPassword: z.string().optional(),
});

type SupervisorFormInputs = z.infer<typeof internalFormRepresentationSchema>;

const createResolverSchema = baseSupervisorSchema.merge(newUserSchema);

const updateResolverSchema = baseSupervisorSchema;

interface SupervisorFormProps {
  mode: "create" | "edit";
  supervisorId?: string;
  initialData?: Partial<SupervisorFormInputs> | null;
  onSuccess?: () => void;
  className?: string;
}

const SupervisorForm: React.FC<SupervisorFormProps> = ({
  mode,
  supervisorId,
  onSuccess,
  initialData,
  className,
}) => {
  const queryClient = useQueryClient();
  const [isLoadingData, setIsLoadingData] = useState(
    mode === "edit" && supervisorId && !initialData
  );
  // Add a state to track the agencyId that needs to be set
  const [pendingAgencyId, setPendingAgencyId] = useState<number | null>(null);

  // Fetch depots for the dropdown
  const { data: depots = [] } = useQuery({
    queryKey: ["depots"],
    queryFn: async () => {
      const response = await get("/depots");
      return response.data || response;
    },
  });

  // Fetch agencies for the dropdown
  const { data: agencies = [], isLoading: isLoadingAgencies } = useQuery({
    queryKey: ["agencies"],
    queryFn: async () => {
      const response = await get("/agencies");
      return response.data || response;
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SupervisorFormInputs>({
    mode: "onChange", // Validate on every change for immediate error clearing
    resolver: zodResolver(
      mode === "create" ? createResolverSchema : updateResolverSchema
    ),
    defaultValues: initialData || {
      name: "",
      contactPersonName: "",
      email: "",
      mobile: "",
      alternateMobile: null,
      address1: "",
      address2: null,
      city: "",
      pincode: undefined,
      depotId: undefined,
      agencyId: undefined,
      status: "ACTIVE",
      userFullName: "",
      userLoginEmail: "",
      userPassword: "",
    },
  });

  const supervisorName = watch("name");

  useEffect(() => {
    if (mode === "create" && supervisorName) {
      setValue("userFullName", supervisorName);
    }
  }, [supervisorName, mode, setValue]);

  useEffect(() => {
    if (mode === "edit" && supervisorId && !initialData) {
      setIsLoadingData(true);
      const fetchSupervisor = async () => {
        try {
          const supervisor = await get(`/supervisors/${supervisorId}`);
          console.log("Fetched supervisor data:", supervisor); // Debug log
          setValue("name", supervisor.name);
          setValue("contactPersonName", supervisor.contactPersonName || "");
          setValue("mobile", supervisor.mobile);
          setValue("alternateMobile", supervisor.alternateMobile || null);
          setValue("address1", supervisor.address1);
          setValue("address2", supervisor.address2 || null);
          setValue("city", supervisor.city);
          setValue("pincode", supervisor.pincode);
          setValue("email", supervisor.email);
          setValue("depotId", supervisor.depotId || null);
          // Fix: Ensure agencyId is properly set, handle both agencyId and agency.id
          const agencyIdValue =
            supervisor.agencyId || supervisor.agency?.id || null;
          console.log("Setting agencyId to:", agencyIdValue); // Debug log
          console.log(
            "Agencies loaded?",
            agencies.length > 0,
            "Agencies:",
            agencies,
            "isLoadingAgencies:",
            isLoadingAgencies
          ); // Debug log

          if (agencyIdValue !== null) {
            if (agencies.length > 0) {
              // Agencies are already loaded, set the value directly
              console.log("Agencies already loaded, setting agencyId directly");
              setValue("agencyId", agencyIdValue);
            } else {
              // Agencies not loaded yet, store for later
              console.log("Agencies not loaded yet, storing agencyId for later");
              setPendingAgencyId(agencyIdValue);
            }
          }
          setValue("status", supervisor.user?.active ? "ACTIVE" : "INACTIVE");
        } catch (error: any) {
          console.error("Error fetching supervisor:", error); // Debug log
          toast.error("Failed to fetch supervisor details");
        } finally {
          setIsLoadingData(false);
        }
      };
      fetchSupervisor();
    } else if (initialData) {
      Object.keys(initialData).forEach((key) => {
        setValue(
          key as keyof SupervisorFormInputs,
          initialData[key as keyof SupervisorFormInputs]
        );
      });
      setIsLoadingData(false);
    } else {
      setIsLoadingData(false);
    }
  }, [supervisorId, mode, setValue, initialData]);

  // Effect to handle setting agencyId once agencies are loaded
  useEffect(() => {
    if (!isLoadingAgencies && agencies.length > 0 && pendingAgencyId !== null) {
      console.log(
        "Agencies loaded, setting pending agencyId:",
        pendingAgencyId
      );
      setValue("agencyId", pendingAgencyId);
      setPendingAgencyId(null);
    }
  }, [isLoadingAgencies, agencies, pendingAgencyId, setValue]);

  const mutation = useMutation({
    mutationFn: async (data: SupervisorFormInputs) => {
      // Set contactPersonName to be the same as supervisor name before sending to backend
      data.contactPersonName = data.name;

      if (mode === "create") {
        const createPayload = {
          name: data.name,
          contactPersonName: data.contactPersonName,
          email: data.email,
          mobile: data.mobile,
          alternateMobile: data.alternateMobile,
          address1: data.address1,
          address2: data.address2,
          city: data.city,
          pincode: data.pincode,
          depotId: data.depotId || null,
          agencyId: data.agencyId || null,
          userFullName: data.userFullName,
          userLoginEmail: data.userLoginEmail,
          userPassword: data.userPassword,
          role: "SUPERVISOR",
          status: data.status,
        };
        return post("/supervisors", createPayload);
      } else {
        // For update, only send supervisor fields. User fields are not updatable via this form.
        const {
          userFullName,
          userLoginEmail,
          userPassword,
          ...supervisorData
        } = data;
        // Make sure we explicitly include alternateMobile, depotId and status in the update payload
        const updatePayload = {
          name: supervisorData.name,
          contactPersonName: supervisorData.contactPersonName,
          email: supervisorData.email,
          mobile: supervisorData.mobile,
          alternateMobile: supervisorData.alternateMobile,
          address1: supervisorData.address1,
          address2: supervisorData.address2,
          city: supervisorData.city,
          pincode: supervisorData.pincode,
          depotId: supervisorData.depotId || null,
          agencyId: supervisorData.agencyId || null,
          status: supervisorData.status,
        };
        return put(`/supervisors/${supervisorId}`, updatePayload);
      }
    },
    onSuccess: () => {
      toast.success(
        `Supervisor ${
          mode === "create" ? "created (with user)" : "updated"
        } successfully`
      );
      queryClient.invalidateQueries({ queryKey: ["supervisors"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      if (supervisorId && mode === "edit") {
        queryClient.invalidateQueries({
          queryKey: ["supervisor", supervisorId],
        });
      }
      onSuccess?.();
    },
    onError: (error: any) => {
      Validate(error, setError);
      const defaultMessage = `Failed to ${mode} supervisor.`;
      toast.error(
        error?.response?.data?.message || error.message || defaultMessage
      );
    },
  });

  const onSubmit: SubmitHandler<SupervisorFormInputs> = (data) => {
    mutation.mutate(data);
  };

  // Show loading indicator while fetching supervisor data in edit mode
  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoaderCircle className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading supervisor details...</span>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={`space-y-6 ${className}`}
    >
      {/* Supervisor Details Section */}
      <div className="border-b pb-4 mb-4 mt-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          Supervisor Details
        </h3>
      </div>

      <div className="grid gap-2 relative">
        <Label htmlFor="name">Supervisor Name</Label>
        <Input
          id="name"
          type="text"
          {...register("name")}
          disabled={isSubmitting}
        />
        {errors.name && (
          <span className="text-red-500 text-xs absolute bottom-0 translate-y-full pt-1">
            {errors.name.message}
          </span>
        )}
      </div>

      <div className="grid gap-2 relative">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register("email")}
          disabled={isSubmitting}
        />
        {errors.email && (
          <span className="text-red-500 text-xs absolute bottom-0 translate-y-full pt-1">
            {errors.email.message}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-2 relative">
          <Label htmlFor="mobile">Mobile Number</Label>
          <Input
            max={10}
            maxLength={10}
            id="mobile"
            type="text"
            {...register("mobile")}
            disabled={isSubmitting}
          />
          {errors.mobile && (
            <span className="text-red-500 text-xs absolute bottom-0 translate-y-full pt-1">
              {errors.mobile.message}
            </span>
          )}
        </div>
        <div className="grid gap-2 relative">
          <Label htmlFor="alternateMobile">Alternate Mobile (Optional)</Label>
          <Input
            max={10}
            maxLength={10}
            id="alternateMobile"
            type="text"
            {...register("alternateMobile")}
            disabled={isSubmitting}
          />
          {errors.alternateMobile && (
            <span className="text-red-500 text-xs absolute bottom-0 translate-y-full pt-1">
              {String(errors.alternateMobile?.message)}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-2 relative">
          <Label htmlFor="address1">Address Line 1</Label>
          <Input
            id="address1"
            type="text"
            {...register("address1")}
            disabled={isSubmitting}
          />
          {errors.address1 && (
            <span className="text-red-500 text-xs absolute bottom-0 translate-y-full pt-1">
              {errors.address1.message}
            </span>
          )}
        </div>
        <div className="grid gap-2 relative">
          <Label htmlFor="address2">Address Line 2 (Optional)</Label>
          <Input
            id="address2"
            type="text"
            {...register("address2")}
            disabled={isSubmitting}
          />
          {errors.address2 && (
            <span className="text-red-500 text-xs absolute bottom-0 translate-y-full pt-1">
              {String(errors.address2?.message)}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="grid gap-2 relative">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            type="text"
            {...register("city")}
            disabled={isSubmitting}
          />
          {errors.city && (
            <span className="text-red-500 text-xs absolute bottom-0 translate-y-full pt-1">
              {errors.city.message}
            </span>
          )}
        </div>
        <div className="grid gap-2 relative">
          <Label htmlFor="pincode">Pin Code</Label>
          <Input
            id="pincode"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            {...register("pincode", {
              required: "Pin code is required",
              pattern: {
                value: /^[0-9]{6}$/,
                message: "Pin code must be exactly 6 digits",
              },
            })}
            disabled={isSubmitting}
          />
          {errors.pincode && (
            <span className="text-red-500 text-xs absolute bottom-0 translate-y-full pt-1">
              {errors.pincode.message}
            </span>
          )}
        </div>
        <div className="grid gap-2 relative">
          <Label htmlFor="depotId">Assigned Depot (Optional)</Label>
          <Controller
            name="depotId"
            control={control}
            render={({ field }) => {
              const currentValue = field.value ? String(field.value) : "none";
              console.log(
                "Depot field render - current value:",
                currentValue,
                "field.value:",
                field.value
              ); // Debug log
              return (
                <Select
                  key={`depot-${currentValue}`} // Force re-render when value changes
                  onValueChange={(value) => {
                    const newValue = value === "none" ? null : Number(value);
                    console.log("Depot value changing to:", newValue); // Debug log
                    field.onChange(newValue);
                  }}
                  value={currentValue}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select depot..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No depot assigned</SelectItem>
                    {depots.map((depot: any) => (
                      <SelectItem key={depot.id} value={String(depot.id)}>
                        {depot.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            }}
          />
          {errors.depotId && (
            <span className="text-red-500 text-xs absolute bottom-0 translate-y-full pt-1">
              {String(errors.depotId?.message)}
            </span>
          )}
        </div>
        <div className="grid gap-2 relative">
          <Label htmlFor="agencyId">Assigned Agency (Optional)</Label>
          <Controller
            name="agencyId"
            control={control}
            render={({ field }) => {
              const currentValue = field.value ? String(field.value) : "none";
              console.log(
                "Agency field render - current value:",
                currentValue,
                "field.value:",
                field.value
              ); // Debug log
              return (
                <Select
                  key={`agency-${currentValue}`} // Force re-render when value changes
                  onValueChange={(value) => {
                    const newValue = value === "none" ? null : Number(value);
                    console.log("Agency value changing to:", newValue); // Debug log
                    field.onChange(newValue);
                  }}
                  value={currentValue}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select agency..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No agency assigned</SelectItem>
                    {agencies.map((agency: any) => (
                      <SelectItem key={agency.id} value={String(agency.id)}>
                        {agency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            }}
          />
          {errors.agencyId && (
            <span className="text-red-500 text-xs absolute bottom-0 translate-y-full pt-1">
              {String(errors.agencyId?.message)}
            </span>
          )}
        </div>
      </div>

      {/* User Account Details Section */}
      {mode === "create" && (
        <>
          <div className="border-b pb-4 mb-4 pt-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Account Details
            </h3>
          </div>

          <div className="grid gap-2 relative">
            <Label htmlFor="userLoginEmail">Login Email</Label>
            <Input
              id="userLoginEmail"
              type="email"
              {...register("userLoginEmail")}
              disabled={isSubmitting}
            />
            {errors.userLoginEmail && (
              <span className="text-red-500 text-xs absolute bottom-0 translate-y-full pt-1">
                {errors.userLoginEmail.message}
              </span>
            )}
          </div>

          <div className="grid gap-2 relative">
            <Label htmlFor="userPassword">Password</Label>
            <PasswordInput
              id="userPassword"
              {...register("userPassword")}
              disabled={isSubmitting}
            />
            {errors.userPassword && (
              <span className="text-red-500 text-xs absolute bottom-0 translate-y-full pt-1">
                {errors.userPassword.message}
              </span>
            )}
          </div>
        </>
      )}

      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto"
        >
          {isSubmitting ? (
            <>
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              {mode === "create" ? "Creating..." : "Updating..."}
            </>
          ) : (
            <>{mode === "create" ? "Create Supervisor" : "Update Supervisor"}</>
          )}
        </Button>
      </div>
    </form>
  );
};

export default SupervisorForm;
