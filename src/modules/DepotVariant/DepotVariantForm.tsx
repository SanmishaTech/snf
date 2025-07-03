import React, { useEffect, useState } from 'react';
import {
  DepotProductVariant as DepotVariant,
  createDepotProductVariant as createDepotVariant,
  updateDepotProductVariant as updateDepotVariant,
} from '../../services/depotProductVariantService';
import { getProductOptions, ProductOption } from '../../services/productService';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface DepotVariantFormData {
  productId: string;
  name: string;
  hsnCode: string;
  mrp: string;
  minimumQty: string;
  notInStock: boolean;
  isHidden: boolean;
  price3Day: string;
  price7Day: string;
  price15Day: string;
  price1Month: string;
}

interface Props {
  initialData?: DepotVariant;
  onClose: () => void;
  onSuccess: () => void;
}

const DepotVariantForm: React.FC<Props> = ({ initialData, onClose, onSuccess }) => {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<DepotVariantFormData>({
    productId: '',
    name: '',
    hsnCode: '',
    mrp: '',
    minimumQty: '',
    notInStock: false,
    isHidden: false,
    price3Day: '',
    price7Day: '',
    price15Day: '',
    price1Month: '',
  });

  // fetch products for dropdown
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await getProductOptions();
        setProducts(res);
      } catch (err: any) {
        toast.error(err.message || 'Failed to load products');
      }
    };
    fetchProducts();
  }, []);

  // populate when editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        productId: String(initialData.productId),
        name: initialData.name,
        hsnCode: initialData.hsnCode ?? '',
        mrp: initialData.mrp !== undefined ? String(initialData.mrp) : '',
        minimumQty: initialData.minimumQty !== undefined ? String(initialData.minimumQty) : '',
        notInStock: initialData.notInStock ?? false,
        isHidden: initialData.isHidden ?? false,
        price3Day: initialData.price3Day !== undefined ? String(initialData.price3Day) : '',
        price7Day: initialData.price7Day !== undefined ? String(initialData.price7Day) : '',
        price15Day: initialData.price15Day !== undefined ? String(initialData.price15Day) : '',
        price1Month: initialData.price1Month !== undefined ? String(initialData.price1Month) : '',
      });
    }
  }, [initialData]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.productId) errs.productId = 'Product is required';
    if (!formData.name.trim()) errs.name = 'Variant name required';
    if (!formData.mrp) errs.mrp = 'MRP required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fix errors');
      return;
    }
    setLoading(true);
    try {
      const submissionData = {
        ...formData,
        productId: parseInt(formData.productId, 10),
        mrp: parseFloat(formData.mrp),
        minimumQty: formData.minimumQty ? parseInt(formData.minimumQty, 10) : 0,
        price3Day: formData.price3Day ? parseFloat(formData.price3Day) : undefined,
        price7Day: formData.price7Day ? parseFloat(formData.price7Day) : undefined,
        price15Day: formData.price15Day ? parseFloat(formData.price15Day) : undefined,
        price1Month: formData.price1Month ? parseFloat(formData.price1Month) : undefined,
      };

      if (initialData) {
        await updateDepotVariant(initialData.id, submissionData);
        toast.success('Variant updated');
      } else {
        await createDepotVariant(submissionData);
        toast.success('Variant created');
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label>Product *</Label>
        <Select
          value={formData.productId}
          onValueChange={val => setFormData(prev => ({ ...prev, productId: val }))}
        >
          <SelectTrigger className={errors.productId ? 'border-red-500' : ''}>
            <SelectValue placeholder="Select product" />
          </SelectTrigger>
          <SelectContent>
            {products.map(p => (
              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.productId && <p className="text-xs text-red-500">{errors.productId}</p>}
      </div>

      <div className="space-y-2">
        <Label>Variant Name *</Label>
        <Input name="name" value={formData.name} onChange={handleChange} className={errors.name ? 'border-red-500' : ''} />
        {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
      </div>

      <div className="space-y-2">
        <Label>HSN Code</Label>
        <Input name="hsnCode" value={formData.hsnCode} onChange={handleChange} />
      </div>

      <div className="space-y-2">
        <Label>MRP *</Label>
        <Input name="mrp" type="number" value={formData.mrp} onChange={handleChange} className={errors.mrp ? 'border-red-500' : ''} />
        {errors.mrp && <p className="text-xs text-red-500">{errors.mrp}</p>}
      </div>

      <div className="space-y-2">
        <Label>Minimum Qty</Label>
        <Input name="minimumQty" type="number" value={formData.minimumQty} onChange={handleChange} />
      </div>

      {/* Time-based Pricing */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>Price – 3 Day</Label>
          <Input name="price3Day" type="number" step="0.01" value={formData.price3Day} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label>Price – 7 Day</Label>
          <Input name="price7Day" type="number" step="0.01" value={formData.price7Day} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label>Price – 15 Day</Label>
          <Input name="price15Day" type="number" step="0.01" value={formData.price15Day} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label>Price – 1 Month</Label>
          <Input name="price1Month" type="number" step="0.01" value={formData.price1Month} onChange={handleChange} />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Checkbox checked={formData.notInStock} onCheckedChange={val => setFormData(prev => ({ ...prev, notInStock: val as boolean }))} />
          <span>Not in Stock</span>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox checked={formData.isHidden} onCheckedChange={val => setFormData(prev => ({ ...prev, isHidden: val as boolean }))} />
          <span>Hidden</span>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? (initialData ? 'Updating...' : 'Creating...') : (initialData ? 'Update Variant' : 'Create Variant')}</Button>
      </div>
    </form>
  );
};

export default DepotVariantForm;
