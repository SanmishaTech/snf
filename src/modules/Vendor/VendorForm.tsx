import { useEffect } from "react";
import { useForm, SubmitHandler, Controller, ControllerRenderProps } from "react-hook-form"; 
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query"; 
import { get, post, put } from "@/services/apiService";
import Validate from "@/lib/Handlevalidation";
import { PasswordInput } from "@/components/ui/password-input"; 

const baseVendorSchema = z.object({
  name: z.string().min(1, "Farmer name is required"),
  contactPersonName: z.string().min(1, "Contact person's name is required").optional(),
  email: z.string().optional().nullable(),
  mobile: z.string().regex(/^\d{10}$/, "Mobile number must be 10 digits"),
  alternateMobile: z.union([z.literal(''), z.string().regex(/^\d{10}$/, "Alternate mobile must be 10 digits")]).nullable().optional(),
  address1: z.string().min(1, "Address Line 1 is required"),
  address2: z.string().nullable().optional(),
  city: z.string().optional().nullable(),
  pincode: z.coerce.number().int("Pincode must be an integer").positive("Pincode must be positive").refine(val => String(val).length === 6, "Pincode must be 6 digits"),
  isDairySupplier: z.boolean().optional(),
});

const newUserSchema = z.object({
  userLoginEmail: z.string().email("Invalid login email for user"),
  userPassword: z.string().min(6, "Password must be at least 6 characters"),
});

const internalFormRepresentationSchema = baseVendorSchema.extend({
  userFullName: z.string().optional(),
  userLoginEmail: z.string().email().optional(),
  userPassword: z.string().optional(),
  // contactPersonName and alternateMobile are already in baseVendorSchema
});

type VendorFormInputs = z.infer<typeof internalFormRepresentationSchema>;

const createResolverSchema = baseVendorSchema.merge(newUserSchema);

const updateResolverSchema = baseVendorSchema; 

interface VendorFormProps {
  mode: "create" | "edit";
  vendorId?: string; 
  initialData?: Partial<VendorFormInputs> | null; 
  onSuccess?: () => void;
  className?: string;
}

const VendorForm: React.FC<VendorFormProps> = ({ mode, vendorId, onSuccess, initialData, className }) => {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
    control,
  } = useForm<VendorFormInputs>({
    mode: 'onChange', // Validate on every change for immediate error clearing
    resolver: zodResolver(mode === "create" ? createResolverSchema : updateResolverSchema),
    defaultValues: initialData || {
      name: '',
      contactPersonName: '', // Already present, kept for clarity
      email: '',
      mobile: '',
      alternateMobile: null, // Already present, kept for clarity
      address1: '',
      address2: null, // Already present, kept for clarity
      city: '',
      pincode: undefined, // Or a suitable default number like 0
      isDairySupplier: false,
      ...(mode === "create" ? { userFullName: '', userLoginEmail: '', userPassword: '' } : {}),
    },
  });

  useEffect(() => {
    if (mode === "edit" && vendorId && !initialData) { // Added !initialData to prevent re-fetch if already provided
      const fetchVendor = async () => {
        try {
          const vendor = await get(`/vendors/${vendorId}`);
          setValue("name", vendor.name);
          setValue("contactPersonName", vendor.contactPersonName || '');
          setValue("mobile", vendor.mobile);
          setValue("alternateMobile", vendor.alternateMobile || null);
          setValue("address1", vendor.address1);
          setValue("address2", vendor.address2 || null);
          setValue("city", vendor.city);
          setValue("pincode", vendor.pincode);
          setValue("email", vendor.email);
          setValue("isDairySupplier", vendor.isDairySupplier || false);
        } catch (error: any) {
          toast.error("Failed to fetch farmer details");
        }
      };
      fetchVendor();
    } else if (initialData) { // Populate form if initialData is provided (e.g., from EditVendorPage)
        Object.keys(initialData).forEach(key => {
            const val = initialData[key as keyof VendorFormInputs];
            setValue(key as keyof VendorFormInputs, val);
        });
    }
  }, [vendorId, mode, setValue, initialData]);

  const mutation = useMutation({
    mutationFn: (data: VendorFormInputs) => {
      if (mode === "create") {
        const createPayload = {
          vendorName: data.name, 
          contactPersonName: data.contactPersonName,
          vendorContactEmail: data.email, 
          mobile: data.mobile,
          alternateMobile: data.alternateMobile,
          address1: data.address1,
          address2: data.address2,
          city: data.city,
          pincode: data.pincode,
          isDairySupplier: data.isDairySupplier,
          userFullName: data.name, // Send contactPersonName as userFullName
          userLoginEmail: data.userLoginEmail,
          userPassword: data.userPassword,
          role: "VENDOR", 
        };
        return post("/vendors", createPayload); 
      } else {
        // For update, only send vendor fields. Vendor fields are not updatable via this form.
        const { userFullName, userLoginEmail, userPassword, ...vendorData } = data;
        const updatePayload = {
            name: vendorData.name,
            contactPersonName: vendorData.contactPersonName,
            email: vendorData.email,
            mobile: vendorData.mobile,
            alternateMobile: vendorData.alternateMobile,
            address1: vendorData.address1,
            address2: vendorData.address2,
            city: vendorData.city,
            pincode: vendorData.pincode,
            isDairySupplier: vendorData.isDairySupplier,
        };
        return put(`/vendors/${vendorId}`, updatePayload);
      }
    },
    onSuccess: () => {
      toast.success(`Farmer ${mode === "create" ? "created (with user)" : "updated"} successfully`);
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      queryClient.invalidateQueries({ queryKey: ["users"] }); 
      if (vendorId && mode === 'edit') {
        queryClient.invalidateQueries({ queryKey: ["vendor", vendorId] });
      }
      onSuccess?.();
    },
    onError: (error: any) => {
      Validate(error, setError); 
      const defaultMessage = `Failed to ${mode} farmer.`;
      toast.error(error?.response?.data?.message || error.message || defaultMessage);
    },
  });

  const onSubmit: SubmitHandler<VendorFormInputs> = (data) => {
    mutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={`space-y-6 ${className}`}>
       
        <div className="border-b pb-4 mb-4 mt-6">
             <h3 className="text-lg font-medium leading-6 text-gray-900">Farmer Details</h3>
          </div>

      <div className="grid gap-2 relative">
        <Label htmlFor="name">Farmer Company Name</Label>
        <Input id="name" type="text"   {...register("name")} disabled={isSubmitting} />
        {errors.name && <span className="text-red-500 text-xs absolute bottom-0 translate-y-full pt-1">{errors.name.message}</span>}
      </div>

      <div className="grid gap-2 relative">
        <Label htmlFor="contactPersonName">Contact Person Name</Label>
        <Input id="contactPersonName" type="text" {...register("contactPersonName")} disabled={isSubmitting} />
        {errors.contactPersonName && <span className="text-red-500 text-xs absolute bottom-0 translate-y-full pt-1">{errors.contactPersonName.message}</span>}
      </div>

      <div className="grid gap-2 relative">
        <Label htmlFor="email">Contact Person Email</Label>
        <Input id="email" type="email" {...register("email")} disabled={isSubmitting} />
        {errors.email && <span className="text-red-500 text-xs absolute bottom-0 translate-y-full pt-1">{errors.email.message}</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-2 relative">
          <Label htmlFor="mobile">Mobile Number</Label>
          <Input max={10} maxLength={10} id="mobile" type="tel" {...register("mobile")} disabled={isSubmitting} />
          {errors.mobile && <span className="text-red-500 text-xs absolute bottom-0 translate-y-full pt-1">{errors.mobile.message}</span>}
        </div>
        <div className="grid gap-2 relative">
          <Label htmlFor="alternateMobile">Alternate Mobile (Optional)</Label>
          <Input max={10} maxLength={10} id="alternateMobile" type="tel" {...register("alternateMobile")} disabled={isSubmitting} />
          {errors.alternateMobile && <span className="text-red-500 text-xs absolute bottom-0 translate-y-full pt-1">{errors.alternateMobile.message}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-2 relative">
            <Label htmlFor="address1">Address Line 1</Label>
            <Input id="address1" type="text" {...register("address1")} disabled={isSubmitting} />
            {errors.address1 && <span className="text-red-500 text-xs absolute bottom-0 translate-y-full pt-1">{errors.address1.message}</span>}
        </div>
        <div className="grid gap-2 relative">
            <Label htmlFor="address2">Address Line 2 (Optional)</Label>
            <Input id="address2" type="text" {...register("address2")} disabled={isSubmitting} />
            {errors.address2 && <span className="text-red-500 text-xs absolute bottom-0 translate-y-full pt-1">{errors.address2.message}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-2 relative">
            <Label htmlFor="city">City</Label>
            <Input id="city" type="text" {...register("city")} disabled={isSubmitting} />
            {errors.city && <span className="text-red-500 text-xs absolute bottom-0 translate-y-full pt-1">{errors.city.message}</span>}
        </div>
        <div className="grid gap-2 relative">
          <Label htmlFor="pincode">Pincode</Label>
          <Input id="pincode" type="number" {...register("pincode")} disabled={isSubmitting} />
          {errors.pincode && <span className="text-red-500 text-xs absolute bottom-0 translate-y-full pt-1">{errors.pincode.message}</span>}
        </div>
      </div>

      <div className="flex items-center space-x-2 my-4">
        <Controller
          name="isDairySupplier"
          control={control} // Assuming 'control' is available from useForm
          render={({ field }: { field: ControllerRenderProps<VendorFormInputs, 'isDairySupplier'> }) => (
            <Checkbox 
              id="isDairySupplier" 
              checked={field.value} 
              onCheckedChange={field.onChange} 
              disabled={isSubmitting} 
            />
          )}
        />
        <Label htmlFor="isDairySupplier" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Is Dairy Supplier?
        </Label>
        {errors.isDairySupplier && <span className="text-red-500 text-xs">{errors.isDairySupplier.message}</span>}
      </div>
      {mode === "create" && (
        <>
          <div className="border-b pb-4 mb-4">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Account Details</h3>
           </div>
          <div className="grid gap-2 relative">
            <Label htmlFor="userLoginEmail">Login Email</Label>
            <Input id="userLoginEmail" type="email" {...register("userLoginEmail")} disabled={isSubmitting} />
            {errors.userLoginEmail && <span className="text-red-500 text-xs absolute bottom-0 translate-y-full pt-1">{errors.userLoginEmail.message}</span>}
          </div>
          <div className="grid gap-2 relative">
            <Label htmlFor="userPassword">Password</Label>
            <PasswordInput id="userPassword" {...register("userPassword")} disabled={isSubmitting} />
            {errors.userPassword && <span className="text-red-500 text-xs absolute bottom-0 translate-y-full pt-1">{errors.userPassword.message}</span>}
          </div>
        </>
      )}
      <div className="w-full  flex items-end justify-end">
      <Button type="submit" disabled={isSubmitting || mutation.isPending} className="w-full sm:w-auto right-0">
        {isSubmitting || mutation.isPending ? (
          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        {mode === "create" ? "Create Farmer" : "Save Changes"}
      </Button>
      </div>
      
    </form>
  );
};

export default VendorForm;
