import { useEffect } from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form"; 
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query"; 
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

const baseAgencySchema = z.object({
  name: z.string().min(1, "Agency name is required"),
  contactPersonName: z.string().optional(),
  email: z.string().optional().nullable(),
  mobile: z.string().regex(/^\d{10}$/, "Mobile number must be 10 digits"),
  alternateMobile: z.any().nullable().optional(),
  address1: z.string().min(1, "Address Line 1 is required"),
  address2: z.any().nullable().optional(),
  city: z.string().optional().nullable(),
  pincode: z.coerce.number().int("Pincode must be an integer").positive("Pincode must be positive").refine(val => String(val).length === 6, "Pincode must be 6 digits"),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

const newUserSchema = z.object({
  userFullName: z.string().min(1, "User's full name is required"),
  userLoginEmail: z.string().email("Invalid login email for user"),
  userPassword: z.string().min(6, "User password must be at least 6 characters"),
});

const internalFormRepresentationSchema = baseAgencySchema.extend({
  userFullName: z.string().optional(),
  userLoginEmail: z.string().email().optional(),
  userPassword: z.string().optional(),
});

type AgencyFormInputs = z.infer<typeof internalFormRepresentationSchema>;

const createResolverSchema = baseAgencySchema.merge(newUserSchema); 

const updateResolverSchema = baseAgencySchema; 

interface AgencyFormProps {
  mode: "create" | "edit";
  agencyId?: string; 
  initialData?: Partial<AgencyFormInputs> | null; 
  onSuccess?: () => void;
  className?: string;
}

const AgencyForm: React.FC<AgencyFormProps> = ({ mode, agencyId, onSuccess, initialData, className }) => {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AgencyFormInputs>({
    mode: 'onChange', // Validate on every change for immediate error clearing
    resolver: zodResolver(mode === "create" ? createResolverSchema : updateResolverSchema),
    defaultValues: initialData || { 
      name: '',
      contactPersonName: '',
      email: '',
      mobile: '',
      alternateMobile: null,
      address1: '',
      address2: null, 
      city: '',
      pincode: undefined, // Or a suitable default number like 0 if your schema allows
      status: "ACTIVE",
      userFullName: '', 
      userLoginEmail: '', 
      userPassword: '',
    },
  });

  const agencyName = watch("name");

  useEffect(() => {
    if (mode === "create" && agencyName) {
      setValue("userFullName", agencyName);
    }
  }, [agencyName, mode, setValue]);

  useEffect(() => {
    if (mode === "edit" && agencyId && !initialData) {
      const fetchAgency = async () => {
        try {
          const agency = await get(`/agencies/${agencyId}`)
          console.log("Agency Data:", agency)
          setValue("name", agency.name);
          setValue("contactPersonName", agency.contactPersonName || '');
          setValue("mobile", agency.mobile);
          setValue("alternateMobile", agency.alternateMobile || null);
          setValue("address1", agency.address1);
          setValue("address2", agency.address2 || null);
          setValue("city", agency.city);
          setValue("pincode", agency.pincode);
          setValue("email", agency.email);
          setValue("status", agency.user?.active ? "ACTIVE" : "INACTIVE");
        } catch (error: any) {
          toast.error("Failed to fetch agency details");
        }
      };
      fetchAgency();
    } else if (initialData) {
        Object.keys(initialData).forEach(key => {
            setValue(key as keyof AgencyFormInputs, initialData[key as keyof AgencyFormInputs]);
        });
    }
  }, [agencyId, mode, setValue, initialData]);

  const mutation = useMutation({
    mutationFn: async (data: AgencyFormInputs) => {
      // Set contactPersonName to be the same as agency name before sending to backend
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
          userFullName: data.userFullName,
          userLoginEmail: data.userLoginEmail,
          userPassword: data.userPassword,
          role: "AGENCY",
          status: data.status,
        };
        return post("/agencies", createPayload);
      } else {
        // For update, only send agency fields. User fields are not updatable via this form.
        const { userFullName, userLoginEmail, userPassword, ...agencyData } = data;
        // Make sure we explicitly include alternateMobile and status in the update payload
        const updatePayload = {
          name: agencyData.name,
          contactPersonName: agencyData.contactPersonName,
          email: agencyData.email,
          mobile: agencyData.mobile,
          alternateMobile: agencyData.alternateMobile,
          address1: agencyData.address1,
          address2: agencyData.address2,
          city: agencyData.city,
          pincode: agencyData.pincode,
          status: agencyData.status,
        };
        return put(`/agencies/${agencyId}`, updatePayload);
      }
    },
    onSuccess: () => {
      toast.success(`Agency ${mode === "create" ? "created (with user)" : "updated"} successfully`);
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      if (agencyId && mode === 'edit') {
        queryClient.invalidateQueries({ queryKey: ["agency", agencyId] });
      }
      onSuccess?.();
    },
    onError: (error: any) => {
      Validate(error, setError);
      const defaultMessage = `Failed to ${mode} agency.`;
      toast.error(error?.response?.data?.message || error.message || defaultMessage);
    },
  });

  const onSubmit: SubmitHandler<AgencyFormInputs> = (data) => {
    mutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={`space-y-6 ${className}`}>
      {/* Agency Details Section */}
      <div className="border-b pb-4 mb-4 mt-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Agency Details</h3>
      </div>

      <div className="grid gap-2 relative">
        <Label htmlFor="name">Agency Name</Label>
        <Input id="name" type="text"  {...register("name")} disabled={isSubmitting} />
        {errors.name && <span className="text-red-500 text-xs absolute bottom-0 translate-y-full pt-1">{errors.name.message}</span>}
      </div>

      {/* 
      <div className="grid gap-2 relative">
        <Label htmlFor="contactPersonName">Contact Person Name (Optional)</Label>
        <Input id="contactPersonName" type="text" {...register("contactPersonName")} disabled={isSubmitting} />
        {errors.contactPersonName && <span className="text-red-500 text-xs absolute bottom-0 translate-y-full pt-1">{errors.contactPersonName.message}</span>}
      </div>
      */}

      <div className="grid gap-2 relative">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email"  {...register("email")} disabled={isSubmitting} />
        {errors.email && <span className="text-red-500 text-xs absolute bottom-0 translate-y-full pt-1">{errors.email.message}</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-2 relative">
          <Label htmlFor="mobile">Mobile Number</Label>
          <Input id="mobile" type="text"  {...register("mobile")} disabled={isSubmitting} />
          {errors.mobile && <span className="text-red-500 text-xs absolute bottom-0 translate-y-full pt-1">{errors.mobile.message}</span>}
        </div>
        <div className="grid gap-2 relative">
          <Label htmlFor="alternateMobile">Alternate Mobile (Optional)</Label>
          <Input id="alternateMobile" type="text"  {...register("alternateMobile")} disabled={isSubmitting} />
          {errors.alternateMobile && <span className="text-red-500 text-xs absolute bottom-0 translate-y-full pt-1">{errors.alternateMobile.message}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-2 relative">
          <Label htmlFor="address1">Address Line 1</Label>
          <Input id="address1" type="text"  {...register("address1")} disabled={isSubmitting} />
          {errors.address1 && <span className="text-red-500 text-xs absolute bottom-0 translate-y-full pt-1">{errors.address1.message}</span>}
        </div>
        <div className="grid gap-2 relative">
          <Label htmlFor="address2">Address Line 2 (Optional)</Label>
          <Input id="address2" type="text"  {...register("address2")} disabled={isSubmitting} />
          {errors.address2 && <span className="text-red-500 text-xs absolute bottom-0 translate-y-full pt-1">{errors.address2.message}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-2 relative">
          <Label htmlFor="city">City</Label>
          <Input id="city" type="text"  {...register("city")} disabled={isSubmitting} />
          {errors.city && <span className="text-red-500 text-xs absolute bottom-0 translate-y-full pt-1">{errors.city.message}</span>}
        </div>
        <div className="grid gap-2 relative">
          <Label htmlFor="pincode">Pin Code</Label>
          <Input id="pincode" type="number"  {...register("pincode")} disabled={isSubmitting} />
          {errors.pincode && <span className="text-red-500 text-xs absolute bottom-0 translate-y-full pt-1">{errors.pincode.message}</span>}
        </div>
      </div>

      {/* <div className="grid gap-2 relative">
        <Label htmlFor="status">Status</Label>
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <Select
              onValueChange={field.onChange}
              value={field.value}
              defaultValue={field.value}
              disabled={isSubmitting}
            >
              <SelectTrigger className="w-full">
                <SelectValue  />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors.status && <span className="text-red-500 text-xs absolute bottom-0 translate-y-full pt-1">{errors.status.message}</span>}
      </div> */}

      {/* User Account Details Section */}
      {mode === "create" && (
        <>
          <div className="border-b pb-4 mb-4 pt-6"> 
            <h3 className="text-lg font-medium leading-6 text-gray-900">Agency User Account Details</h3>
           </div>

          <div className="grid gap-2 relative">
            <Label htmlFor="userLoginEmail">Agency Login Email</Label>
            <Input id="userLoginEmail" type="email"  {...register("userLoginEmail")} disabled={isSubmitting} />
            {errors.userLoginEmail && <span className="text-red-500 text-xs absolute bottom-0 translate-y-full pt-1">{errors.userLoginEmail.message}</span>}
          </div>

          <div className="grid gap-2 relative">
            <Label htmlFor="userPassword">Agency Password</Label>
            <PasswordInput id="userPassword"  {...register("userPassword")} disabled={isSubmitting} />
            {errors.userPassword && <span className="text-red-500 text-xs absolute bottom-0 translate-y-full pt-1">{errors.userPassword.message}</span>}
          </div>
        </>
      )}

      <div className="flex justify-end pt-4"> 
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? (
            <>
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              {mode === "create" ? "Creating..." : "Updating..."}
            </>
          ) : (
            <>{mode === "create" ? "Create Agency" : "Update Agency"}</>
          )}
        </Button>
      </div>
    </form>
  );
};

export default AgencyForm;
