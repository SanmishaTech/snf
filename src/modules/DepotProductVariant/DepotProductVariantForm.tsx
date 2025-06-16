import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  DepotProductVariant,
  createDepotProductVariant,
  updateDepotProductVariant,
} from '../../services/depotProductVariantService';
import { getProductOptions } from '../../services/productService';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, PlusCircle, Save } from 'lucide-react';

const formSchema = z.object({
  productId: z.coerce.number().int().positive({ message: 'Product ID is required' }),
  name: z.string().min(1, 'Variant name is required'),
  hsnCode: z.string().optional(),
  sellingPrice: z.coerce.number({ invalid_type_error: 'Selling price must be a number' }).nonnegative(),
  purchasePrice: z.coerce.number({ invalid_type_error: 'Purchase price must be a number' }).nonnegative(),
  minimumQty: z.coerce.number().int().nonnegative(),
  notInStock: z.boolean().default(false),
  isHidden: z.boolean().default(false),
});

export type DepotVariantFormData = z.infer<typeof formSchema>;

interface Props {
  initialData?: DepotProductVariant | null;
  onClose: () => void;
  onSuccess: () => void;
}

const DepotProductVariantForm: React.FC<Props> = ({ initialData, onClose, onSuccess }) => {
  const [productOptions, setProductOptions] = useState<{ id: number; name: string }[]>([]);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DepotVariantFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productId: initialData?.productId || 0,
      name: initialData?.name || '',
      hsnCode: initialData?.hsnCode || '',
      sellingPrice: initialData?.sellingPrice || 0,
      purchasePrice: initialData?.purchasePrice || 0,
      minimumQty: initialData?.minimumQty || 0,
      notInStock: initialData?.notInStock || false,
      isHidden: initialData?.isHidden || false,
    },
  });

  // fetch products once
  useEffect(() => {
    (async () => {
      try {
        const opts = await getProductOptions();
        setProductOptions(opts);
      } catch (e) {
        console.error('Failed to load products', e);
      }
    })();
  }, []);

  useEffect(() => {
    if (initialData) {
      reset({
        productId: initialData.productId,
        name: initialData.name,
        hsnCode: initialData.hsnCode ?? '',
        sellingPrice: initialData.sellingPrice,
        purchasePrice: initialData.purchasePrice,
        minimumQty: initialData.minimumQty,
        notInStock: initialData.notInStock,
        isHidden: initialData.isHidden,
      });
    }
  }, [initialData, reset]);

  const onSubmit = async (data: DepotVariantFormData) => {
    try {
      if (initialData) {
        await updateDepotProductVariant(initialData.id, data);
        toast.success('Variant updated');
      } else {
        await createDepotProductVariant(data);
        toast.success('Variant created');
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Error saving variant');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="productId">Product *</Label>
        <Select
          value={watch('productId') ? String(watch('productId')) : undefined}
          onValueChange={(val) => setValue('productId', Number(val), { shouldValidate: true })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select product" />
          </SelectTrigger>
          <SelectContent>
            {productOptions.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.productId && <p className="text-sm text-red-600">{errors.productId.message}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="name">Variant Name *</Label>
        <Input id="name" {...register('name')} />
        {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="hsnCode">HSN Code</Label>
        <Input id="hsnCode" {...register('hsnCode')} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="sellingPrice">Selling Price *</Label>
        <Input type="number" step="0.01" id="sellingPrice" {...register('sellingPrice')} />
        {errors.sellingPrice && <p className="text-sm text-red-600">{errors.sellingPrice.message}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="purchasePrice">Purchase Price *</Label>
        <Input type="number" step="0.01" id="purchasePrice" {...register('purchasePrice')} />
        {errors.purchasePrice && <p className="text-sm text-red-600">{errors.purchasePrice.message}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="minimumQty">Minimum Qty *</Label>
        <Input type="number" id="minimumQty" {...register('minimumQty')} />
        {errors.minimumQty && <p className="text-sm text-red-600">{errors.minimumQty.message}</p>}
      </div>

      {/* <div className="grid gap-2">
        <Label htmlFor="closingQty">Closing Qty</Label>
         <Input
          type="number"
          id="closingQty"
          readOnly
          className="bg-gray-100 cursor-not-allowed"
          {...register('closingQty')}
        />
      </div> */}

      <div className="flex items-center space-x-2">
        <Switch
          id="notInStock"
          checked={watch('notInStock')}
          onCheckedChange={(c) => setValue('notInStock', c)}
        />
        <Label htmlFor="notInStock">Not In Stock</Label>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="isHidden"
          checked={watch('isHidden')}
          onCheckedChange={(c) => setValue('isHidden', c)}
        />
        <Label htmlFor="isHidden">Hidden?</Label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="gap-2">
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : initialData ? (
            <Save className="h-4 w-4" />
          ) : (
            <PlusCircle className="h-4 w-4" />
          )}
          {isSubmitting ? (initialData ? 'Updating…' : 'Creating…') : initialData ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
};

export default DepotProductVariantForm;
