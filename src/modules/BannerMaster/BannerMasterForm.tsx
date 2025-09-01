import React, { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Added for description
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as apiService from "@/services/apiService";
import { Banner } from "./BannerListPage"; // Import the full Banner type for initialData

const API_BASE_URL = "/api/admin/banners";
const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL === "production"
    ? ""
    : "https://snf.3.7.237.251.sslip.io/"; // Adjust as needed for production

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const bannerFormSchema = z.object({
  caption: z.string().optional().default(""),
  description: z.string().optional().default(""),
  bannerImageFile: z
    .instanceof(FileList)
    .optional()
    .refine(
      (files) => !files || files.length === 0 || files?.[0]?.size <= 5_000_000,
      `Max image size is 5MB.`
    )
    .refine(
      (files) =>
        !files ||
        files.length === 0 ||
        ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
      "Only .jpg, .jpeg, .png and .webp formats are supported."
    ),
  listOrder: z.preprocess(
    (val) => (typeof val === "string" ? parseInt(val, 10) : val),
    z
      .number()
      .int("List order must be an integer.")
      .min(0, "List order must be a positive number.")
  ),
});

export type BannerFormData = z.infer<typeof bannerFormSchema>;

interface BannerMasterFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: () => void;
  initialData?: Banner; // Use the full Banner type which includes id
}

const BannerMasterForm: React.FC<BannerMasterFormProps> = ({
  isOpen,
  onClose,
  onSubmitSuccess,
  initialData,
}) => {
  const queryClient = useQueryClient();
  const mode = initialData ? "edit" : "create";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<BannerFormData>({
    resolver: zodResolver(bannerFormSchema),
    defaultValues: initialData
      ? {
          caption: initialData.caption || "",
          description: initialData.description || "",
          listOrder: initialData.listOrder,
          bannerImageFile: undefined, // Initialize FileList as undefined
        }
      : {
          caption: "",
          description: "",
          listOrder: undefined,
          bannerImageFile: undefined,
        },
  });

  useEffect(() => {
    if (isOpen) {
      reset(
        initialData
          ? {
              caption: initialData.caption || "",
              description: initialData.description || "",
              listOrder: initialData.listOrder,
              bannerImageFile: undefined, // Reset FileList
            }
          : {
              caption: "",
              description: "",
              listOrder: undefined,
              bannerImageFile: undefined,
            }
      );
    }
  }, [isOpen, initialData, reset]);

  const mutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Expect FormData now
      if (mode === "edit" && initialData?.id) {
        return apiService.putupload(
          `${API_BASE_URL}/${initialData.id}`,
          formData
        );
      } else {
        return apiService.postupload(API_BASE_URL, formData);
      }
    },
    onSuccess: () => {
      toast.success(
        `Banner ${mode === "create" ? "created" : "updated"} successfully.`
      );
      queryClient.invalidateQueries({ queryKey: ["banners"] }); // Matches query key in BannerListPage
      onSubmitSuccess();
      onClose();
    },
    onError: (error: any) => {
      const defaultMessage = `Failed to ${mode} banner.`;
      const apiErrorMessage =
        error?.response?.data?.message || error?.response?.data?.error;

      if (error?.response?.data?.errors) {
        // Handle Zod validation errors from backend if any
        const backendErrors = error.response.data.errors;
        let messages = backendErrors.map((e: any) => e.message).join(", ");
        toast.error(messages || defaultMessage);
      } else {
        toast.error(apiErrorMessage || error.message || defaultMessage);
      }
      console.error(`Failed to ${mode} banner:`, error);
    },
  });

  const onSubmit: SubmitHandler<BannerFormData> = async (
    data: BannerFormData
  ) => {
    if (
      mode === "create" &&
      (!data.bannerImageFile || data.bannerImageFile.length === 0)
    ) {
      toast.error("Banner image is required to create a new banner.");
      // Manually set error for react-hook-form if needed, or rely on toast.
      // setError('bannerImageFile', { type: 'manual', message: 'Banner image is required.' });
      return;
    }

    const formData = new FormData();
    formData.append("caption", data.caption || "");
    formData.append("description", data.description || "");
    formData.append("listOrder", data.listOrder.toString());

    if (data.bannerImageFile && data.bannerImageFile.length > 0) {
      formData.append("bannerImage", data.bannerImageFile[0]); // Key 'bannerImage' must match backend field
    }
    // If in 'edit' mode and no new file is selected, 'bannerImage' will not be appended,
    // and the backend should not update the imagePath if it's not present in the request.

    mutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add New Banner" : "Edit Banner"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Fill in the details for the new banner."
              : "Update the details for this banner."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div>
            <Label htmlFor="listOrder" className="mb-2">
              List Order
            </Label>
            <Input id="listOrder" type="number" {...register("listOrder")} />
            {errors.listOrder && (
              <p className="text-red-500 text-xs mt-1">
                {errors.listOrder.message}
              </p>
            )}
          </div>

          <div>
            <Label className="mb-2" htmlFor="caption">
              Caption (Optional)
            </Label>
            <Input id="caption" {...register("caption")} />
            {errors.caption && (
              <p className="text-red-500 text-xs mt-1">
                {errors.caption.message}
              </p>
            )}
          </div>

          <div>
            <Label className="mb-2" htmlFor="description">
              Description (Optional)
            </Label>
            <Textarea id="description" {...register("description")} />
            {errors.description && (
              <p className="text-red-500 text-xs mt-1">
                {errors.description.message}
              </p>
            )}
          </div>

          <div>
            <Label className="mb-2" htmlFor="bannerImageFile">
              Banner Image
            </Label>
            <Input
              id="bannerImageFile"
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              {...register("bannerImageFile")}
            />
            {errors.bannerImageFile && (
              <p className="text-red-500 text-xs mt-1">
                {errors.bannerImageFile.message}
              </p>
            )}
            {mode === "edit" && initialData?.imagePath && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground">Current image:</p>
                {initialData.imagePath.startsWith("http") ||
                initialData.imagePath.startsWith("/") ? (
                  <>
                    <img
                      src={
                        initialData.imagePath.startsWith("http")
                          ? initialData.imagePath
                          : `${BACKEND_URL}${initialData.imagePath}`
                      }
                      alt={initialData.caption || "Current banner image"}
                      className="mt-1 h-20 w-auto object-contain border rounded shadow-sm"
                      onError={(e) => {
                        const imgElement = e.target as HTMLImageElement;
                        imgElement.style.display = "none";
                        const fallbackElement =
                          imgElement.nextElementSibling as HTMLElement | null;
                        if (fallbackElement)
                          fallbackElement.classList.remove("hidden");
                      }}
                    />
                    {/* Fallback text if image fails to load */}
                    <p className="text-xs text-red-500 hidden">
                      Unable to load image preview.
                    </p>
                  </>
                ) : (
                  <p className="text-xs font-medium">{initialData.imagePath}</p> // Display path if not a URL/relative path
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {mode === "create"
                ? "Select an image file."
                : "Select a new image file to change the existing one."}
            </p>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              )}
              {mode === "create" ? "Create Banner" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BannerMasterForm;
