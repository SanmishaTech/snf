import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Category, createCategory, updateCategory } from '../../services/categoryMasterService';
 import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch'; // For boolean fields
import { Loader2, PlusCircle, Save, XCircle } from 'lucide-react';

// Zod schema definition
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const categoryFormSchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100, 'Name must be 100 characters or less'),
  // isPerishable: z.boolean().default(false),
  isDairy: z.boolean().default(false),
  attachment: z
    .custom<FileList>()
    .optional()
    .nullable()
    .transform((fileList) => {
      if (fileList && fileList.length > 0) {
        return fileList[0]; // Return the first File object
      }
      return null; // Return null if no file or empty FileList
    })
    .refine((file) => !file || file instanceof File, {
      message: 'Attachment must be a valid file.', // Should be redundant due to transform but good practice
    })
    .refine((file) => !file || file.size <= MAX_FILE_SIZE, {
      message: `Max file size is 5MB.`,
    })
    .refine((file) => !file || ACCEPTED_IMAGE_TYPES.includes(file.type), {
      message: 'Only .jpeg, .jpg, .png, and .webp formats are supported.',
    }),
  imageUrl: z.string().optional().nullable(), // For displaying existing image
});

export type CategoryFormData = z.infer<typeof categoryFormSchema>;

interface CategoryMasterFormProps {
  initialData?: Category | null; // Assuming Category type includes id, imageUrl, isPerishable, isDairy
  onClose: () => void;
  onSuccess: (category: Category) => void; // Pass back the created/updated category
}

const CategoryMasterForm: React.FC<CategoryMasterFormProps> = ({ initialData, onClose, onSuccess }) => {
  const [previewImage, setPreviewImage] = useState<string | null>(initialData?.imageUrl || null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      // isPerishable: initialData?.isPerishable || false,
      isDairy: initialData?.isDairy || false,
      attachment: null,
      imageUrl: initialData?.imageUrl || null,
    },
  });

  const attachmentFile = watch('attachment'); // This is a FileList | null
  const formImageUrl = watch('imageUrl');   // This is a string | null | undefined

  useEffect(() => {
    if (initialData) {
      reset({ 
        name: initialData.name,
        // isPerishable: initialData.isPerishable || false,
        isDairy: initialData.isDairy || false,
        attachment: null, // Don't repopulate file input for security reasons
        imageUrl: initialData.imageUrl || null,
      });
      setPreviewImage(initialData.imageUrl ? `${import.meta.env.VITE_BACKEND_URL}${initialData.imageUrl}` : null);
    } else {
      reset({ name: '', isDairy: false, attachment: null, imageUrl: null });
      setPreviewImage(null);
    }
  }, [initialData, reset]);

  useEffect(() => {
    // If a new file is selected in the input (attachmentFile is a File object here)
    if (attachmentFile && attachmentFile instanceof File) { // Check if it's a File object
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(attachmentFile); // Use attachmentFile directly
    }
    // Else, if there's an image URL stored in the form state (could be from initialData or set otherwise)
    // and no new file is currently selected (first condition of 'if' is false)
    else if (formImageUrl) {
      setPreviewImage(formImageUrl.startsWith('data:') ? formImageUrl : `${import.meta.env.VITE_BACKEND_URL}${formImageUrl}`);
    } else if (!attachmentFile) {
      // If no new file and no formImageUrl (e.g., on initial load without initialData or after removing an image)
      setPreviewImage(null);
    }
  }, [attachmentFile, formImageUrl, import.meta.env.VITE_BACKEND_URL]); // React to changes in selected file or form's image URL

  const handleRemoveImage = () => {
    setValue('attachment', null, { shouldValidate: true });
    setValue('imageUrl', null); // Indicate that existing image should be removed if any
    setPreviewImage(null);
  };

  const onSubmit = async (data: CategoryFormData) => {
    const formDataToSubmit = new FormData();
    formDataToSubmit.append('name', data.name);
    formDataToSubmit.append('isDairy', String(data.isDairy));

    if (data.attachment) {
      formDataToSubmit.append('attachment', data.attachment);
    }
    // If imageUrl is explicitly set to null (by handleRemoveImage) and there was an initial image,
    // this signals to the backend to remove the existing image.
    // The backend needs to be designed to handle this logic.
    if (initialData?.id && data.imageUrl === null && initialData.imageUrl) {
        formDataToSubmit.append('removeImage', 'true');
    }

    try {
      let result: Category;
      if (initialData && initialData.id) {
        result = await updateCategory(initialData.id, formDataToSubmit);
        toast.success('Category updated successfully!');
      } else {
        result = await createCategory(formDataToSubmit);
        toast.success('Category created successfully!');
      }
      onSuccess(result);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || (initialData ? 'Failed to update category' : 'Failed to create category');
      toast.error(errorMessage);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-2">
        <Label htmlFor="name">Category Name <span className="text-red-500">*</span></Label>
        <Input id="name" {...register('name')} autoFocus />
        {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
      </div>

      <div className="flex items-center space-x-2">
        <Switch 
          id="isDairy"
          checked={watch('isDairy')}
          onCheckedChange={(checked) => setValue('isDairy', checked)}
        />
        <Label htmlFor="isDairy">Is Dairy?</Label>
        {errors.isDairy && <p className="text-sm text-red-600 mt-1">{errors.isDairy.message}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="attachment">Category Image</Label>
        <Input 
          id="attachment" 
          type="file" 
          accept="image/*" 
          {...register('attachment')} 
        />
        {errors.attachment && <p className="text-sm text-red-600 mt-1">{errors.attachment.message}</p>}
      </div>

      {previewImage && (
        <div className="mt-4 relative w-32 h-32 border rounded-md overflow-hidden group">
          <img src={previewImage.startsWith('data:') || previewImage.startsWith('http') ? previewImage : `${import.meta.env.VITE_BACKEND_URL}${previewImage}`} alt="Preview" className="w-full h-full object-cover" />
          <Button 
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6"
            onClick={handleRemoveImage}
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      )}
      {!previewImage && <div className="mt-2 text-sm text-muted-foreground">No image selected.</div>}

      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="gap-2">
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : initialData?.id ? (
            <Save className="h-4 w-4" />
          ) : (
            <PlusCircle className="h-4 w-4" />
          )}
          {isSubmitting ? (initialData?.id ? 'Updating...' : 'Creating...') : (initialData?.id ? 'Update Category' : 'Create Category')}
        </Button>
      </div>
    </form>
  );
};

export default CategoryMasterForm;
