import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { PasswordInput } from "@/components/ui/password-input";
import { LoaderCircle, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { get, postupload, putupload } from "@/services/apiService";
import { useAuth } from "@/hooks/useAuth";
import { Textarea } from "@/components/ui/textarea";

const partnerSchema = z.object({
  firstName: z.string().min(1, "First Name is required").regex(/^[a-zA-Z\s]+$/, "Only letters allowed"),
  middleName: z.string().optional().nullable(),
  lastName: z.string().min(1, "Last Name is required").regex(/^[a-zA-Z\s]+$/, "Only letters allowed"),
  dob: z.string().min(1, "DOB is required"),
  mobile: z.string().min(10, "Valid mobile required").max(10),
  email: z.string().email("Valid email required"),
  address1: z.string().min(1, "Address line 1 is required"),
  city: z.string().min(1, "City is required").regex(/^[a-zA-Z\s]+$/, "Only letters allowed"),
  state: z.string().min(1, "State is required").regex(/^[a-zA-Z\s]+$/, "Only letters allowed"),
  pincode: z.string().min(6, "Valid pincode required"),
  aadhaar: z.string().length(12, "Must be exactly 12 digits"),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  depotId: z.string().min(1, "Depot is required"),
  profilePhoto: z
    .instanceof(FileList)
    .optional()
    .nullable()
    .refine(
      (files) => !files || files.length === 0 || (files[0] && files[0].size <= 5 * 1024 * 1024),
      "Max image size is 5MB."
    )
    .refine(
      (files) =>
        !files ||
        files.length === 0 ||
        (files[0] && ["image/jpeg", "image/png", "image/webp"].includes(files[0].type)),
      "Only JPG, PNG and WebP formats are supported."
    ),
});

export type PartnerFormInputs = z.infer<typeof partnerSchema>;

interface PartnerFormProps {
  partnerId?: number | null;
  isReadOnly?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

const DeliveryPartnerForm: React.FC<PartnerFormProps> = ({
  partnerId,
  isReadOnly = false,
  onSuccess,
  onCancel,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isDepotAdmin = user?.role === "DepotAdmin";
  const userDepotId = user?.depotId;

  const [depots, setDepots] = useState<{ id: number; name: string }[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PartnerFormInputs>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      email: "",
      mobile: "",
      aadhaar: "",
      address1: "",
      city: "",
      state: "Maharashtra",
      pincode: "",
      password: "",
      dob: "",
      depotId: isDepotAdmin && userDepotId ? userDepotId.toString() : "",
    },
  });

  useEffect(() => {
    const fetchDepots = async () => {
      try {
        const response = await get("/depots");
        setDepots(response.data || response || []);
      } catch (error) {
        console.error("Failed to fetch depots", error);
      }
    };
    fetchDepots();
  }, []);

  const { data: fetchedPartner, isLoading: isFetchingPartner } = useQuery({
    queryKey: ["delivery-partner", partnerId],
    queryFn: async () => {
      if (!partnerId) return null;
      return await get(`/delivery-partners/${partnerId}`);
    },
    enabled: !!partnerId,
  });

  useEffect(() => {
    if (fetchedPartner) {
      reset({
        ...fetchedPartner,
        depotId: fetchedPartner.depotId ? String(fetchedPartner.depotId) : "",
        dob: fetchedPartner.dob ? new Date(fetchedPartner.dob).toISOString().split('T')[0] : "",
        password: "",
      });
      if (fetchedPartner.profilePhotoUrl) {
        const url = fetchedPartner.profilePhotoUrl;
        setPreviewUrl(url.startsWith("http") ? url : `${import.meta.env.VITE_BACKEND_URL}${url}`);
      }
    }
  }, [fetchedPartner, reset]);

  useEffect(() => {
    if (!partnerId) {
      reset({
        firstName: "",
        middleName: "",
        lastName: "",
        email: "",
        mobile: "",
        aadhaar: "",
        address1: "",
        city: "",
        state: "Maharashtra",
        pincode: "",
        password: "",
        dob: "",
        depotId: isDepotAdmin && userDepotId ? userDepotId.toString() : "",
      });
      setPreviewUrl(null);
      setFileName("");
    }
  }, [partnerId, reset, isDepotAdmin, userDepotId]);

  const mutation = useMutation({
    mutationFn: async (formData: FormData) => {
      if (partnerId) {
        return await putupload(`/delivery-partners/${partnerId}`, formData);
      } else {
        return await postupload("/delivery-partners", formData);
      }
    },
    onSuccess: () => {
      toast.success(`Partner ${partnerId ? "updated" : "registered"} successfully`);
      queryClient.invalidateQueries({ queryKey: ["delivery-partners"] });
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || "Something went wrong");
    },
  });

  const onSubmit = (data: PartnerFormInputs) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key !== "profilePhoto" && value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    if (data.profilePhoto && data.profilePhoto.length > 0) {
      formData.append("profilePhoto", data.profilePhoto[0]);
    }

    mutation.mutate(formData);
  };

  const handleNumberInput = (e: React.FormEvent<HTMLInputElement>) => {
    e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, "");
  };

  const handleNameInput = (e: React.FormEvent<HTMLInputElement>) => {
    e.currentTarget.value = e.currentTarget.value.replace(/[^a-zA-Z\s]/g, "");
  };

  if (partnerId && isFetchingPartner) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <LoaderCircle className="animate-spin text-red-600" size={40} />
        <p className="text-sm text-gray-500 font-medium">Fetching partner details...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 px-1">
      {/* Profile Photo Section - Compact */}
      <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
        <div className="relative group shrink-0 ml-1">
          <div
            className={`w-16 h-16 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 ${isReadOnly ? 'cursor-default' : 'cursor-pointer hover:border-blue-400'} transition-all`}
            onClick={() => !isReadOnly && document.getElementById("profile-photo-input")?.click()}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center text-gray-400 scale-75">
                <Upload size={20} />
              </div>
            )}
            {!isReadOnly && (
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Upload size={16} className="text-white" />
              </div>
            )}
          </div>
          {previewUrl && !isReadOnly && (
            <button
              type="button"
              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-all z-10 border border-white"
              style={{ width: '18px', height: '18px', minWidth: '18px', minHeight: '18px', padding: '0' }}
              onClick={(e) => {
                e.stopPropagation();
                setPreviewUrl(null);
                setFileName("");
                setValue("profilePhoto", null, { shouldDirty: true });
              }}
            >
              <X size={12} strokeWidth={3} />
            </button>
          )}
        </div>
        <div className="flex-1">
          <Label className="text-xs font-semibold text-gray-700">Profile Photo <span className="text-red-500">*</span></Label>
          <p className="text-[10px] text-gray-400 mt-0.5">Recommended: Square image, max 5MB</p>
          {errors.profilePhoto && <p className="text-[10px] text-red-500 mt-1">{errors.profilePhoto.message}</p>}
          {fileName && <p className="text-[9px] text-blue-500 font-medium truncate max-w-[200px] mt-1">{fileName}</p>}
        </div>
        <input
          id="profile-photo-input"
          type="file"
          className="hidden"
          accept="image/*"
          {...register("profilePhoto", {
            onChange: (e) => {
              const file = e.target.files?.[0];
              if (file) {
                setFileName(file.name);
                setPreviewUrl(URL.createObjectURL(file));
              }
            }
          })}
        />
      </div>

      {/* Row 1: Names */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label htmlFor="firstName" className="text-xs">First Name <span className="text-red-500">*</span></Label>
          <Input id="firstName" placeholder="First Name" {...register("firstName")} onInput={handleNameInput} disabled={isReadOnly} className="h-8 text-xs" />
          {errors.firstName && <p className="text-[10px] text-red-500">{errors.firstName.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="middleName" className="text-xs">Middle Name</Label>
          <Input id="middleName" placeholder="Middle Name" {...register("middleName")} onInput={handleNameInput} disabled={isReadOnly} className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="lastName" className="text-xs">Last Name <span className="text-red-500">*</span></Label>
          <Input id="lastName" placeholder="Last Name" {...register("lastName")} onInput={handleNameInput} disabled={isReadOnly} className="h-8 text-xs" />
          {errors.lastName && <p className="text-[10px] text-red-500">{errors.lastName.message}</p>}
        </div>
      </div>

      {/* Combined Row: Mobile, DOB, Depot, Aadhaar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="space-y-1">
          <Label htmlFor="mobile" className="text-xs">Mobile <span className="text-red-500">*</span></Label>
          <Input id="mobile" placeholder="Mobile" {...register("mobile")} onInput={handleNumberInput} inputMode="numeric" disabled={isReadOnly} className="h-8 text-xs" />
          {errors.mobile && <p className="text-[10px] text-red-500">{errors.mobile.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="dob" className="text-xs">DOB <span className="text-red-500">*</span></Label>
          <Input id="dob" type="date" {...register("dob")} disabled={isReadOnly} className="h-8 text-xs" />
          {errors.dob && <p className="text-[10px] text-red-500">{errors.dob.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="depotId" className="text-xs">Depot <span className="text-red-500">*</span></Label>
          <Controller
            name="depotId"
            control={control}
            render={({ field }) => {
              if (isDepotAdmin) {
                const myDepot = depots.find(d => d.id === userDepotId);
                return <Input value={myDepot ? myDepot.name : "Loading..."} disabled className="bg-gray-50 h-8 text-xs" />;
              }
              return (
                <Select onValueChange={field.onChange} value={field.value ? String(field.value) : undefined} disabled={isReadOnly}>
                  <SelectTrigger size="sm" className="h-8 text-xs"><SelectValue placeholder="Depot" /></SelectTrigger>
                  <SelectContent>
                    {depots.map(d => (
                      <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            }}
          />
          {errors.depotId && <p className="text-[10px] text-red-500">{errors.depotId.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="aadhaar" className="text-xs">Aadhaar <span className="text-red-500">*</span></Label>
          <Input id="aadhaar" maxLength={12} placeholder="Aadhaar" {...register("aadhaar")} onInput={handleNumberInput} inputMode="numeric" disabled={isReadOnly} className="h-8 text-xs" />
          {errors.aadhaar && <p className="text-[10px] text-red-500">{errors.aadhaar.message}</p>}
        </div>
      </div>

      {/* Address */}
      <div className="space-y-1">
        <Label htmlFor="address1" className="text-xs">Address <span className="text-red-500">*</span></Label>
        <Textarea id="address1" rows={1} placeholder="Full address..." {...register("address1")} disabled={isReadOnly} className="min-h-[40px] max-h-20 h-auto py-1.5 text-xs overflow-y-auto" />
        {errors.address1 && <p className="text-[10px] text-red-500">{errors.address1.message}</p>}
      </div>

      {/* Row 4: City, State, Pincode */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label htmlFor="city" className="text-xs">City <span className="text-red-500">*</span></Label>
          <Input id="city" placeholder="City" {...register("city")} onInput={handleNameInput} disabled={isReadOnly} className="h-8 text-xs" />
          {errors.city && <p className="text-[10px] text-red-500">{errors.city.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="state" className="text-xs">State <span className="text-red-500">*</span></Label>
          <Input id="state" placeholder="State" {...register("state")} onInput={handleNameInput} disabled={isReadOnly} className="h-8 text-xs" />
          {errors.state && <p className="text-[10px] text-red-500">{errors.state.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="pincode" className="text-xs">Pincode <span className="text-red-500">*</span></Label>
          <Input id="pincode" placeholder="Pincode" {...register("pincode")} onInput={handleNumberInput} inputMode="numeric" disabled={isReadOnly} className="h-8 text-xs" />
          {errors.pincode && <p className="text-[10px] text-red-500">{errors.pincode.message}</p>}
        </div>
      </div>

      {/* Row 5: Email, Password */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="email" className="text-xs">Email <span className="text-red-500">*</span></Label>
          <Input id="email" type="email" placeholder="Email" {...register("email")} disabled={isReadOnly} className="h-8 text-xs" />
          {errors.email && <p className="text-[10px] text-red-500">{errors.email.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="password" className="text-xs text-gray-700">Password {partnerId ? "" : <span className="text-red-500">*</span>}</Label>
          <PasswordInput id="password" placeholder="Password" {...register("password")} disabled={isReadOnly} className="h-8 text-xs" />
          {errors.password && <p className="text-[10px] text-red-500">{errors.password.message}</p>}
        </div>
      </div>

      {!isReadOnly && (
        <div className="flex justify-end gap-3 pt-6">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={mutation.isPending}>
            {mutation.isPending && <LoaderCircle className="animate-spin mr-2 h-4 w-4" />}
            {partnerId ? "Update Partner" : "Register Partner"}
          </Button>
        </div>
      )}
    </form>
  );
};

export default DeliveryPartnerForm;
