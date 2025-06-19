import React, { useEffect, useState } from 'react';
import {
  DepotVariant,
  DepotVariantFormData,
  createDepotVariant,
  updateDepotVariant,
  getAllProductsLite,
  ProductLite,
} from '../../services/depotVariantService';
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

interface Props {
  initialData?: DepotVariant;
  onClose: () => void;
  onSuccess: () => void;
}

const DepotVariantForm: React.FC<Props> = ({ initialData, onClose, onSuccess }) => {
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<DepotVariantFormData>({
    productId: '',
    name: '',
    hsnCode: '',
    sellingPrice: '',
    purchasePrice: '',
    minimumQty: '',
    notInStock: false,
    isHidden: false,
  });

  // fetch products for dropdown
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await getAllProductsLite();
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
        sellingPrice: String(initialData.sellingPrice),
        purchasePrice: String(initialData.purchasePrice),
        minimumQty: initialData.minimumQty !== undefined ? String(initialData.minimumQty) : '',
        notInStock: initialData.notInStock ?? false,
        isHidden: initialData.isHidden ?? false,
      });
    }
  }, [initialData]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.productId) errs.productId = 'Product is required';
    if (!formData.name.trim()) errs.name = 'Variant name required';
    if (!formData.sellingPrice) errs.sellingPrice = 'Selling price required';
    if (!formData.purchasePrice) errs.purchasePrice = 'Purchase price required';
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
      if (initialData) {
        await updateDepotVariant(initialData.id, {
          ...formData,
        });
        toast.success('Variant updated');
      } else {
        await createDepotVariant(formData);
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Selling Price *</Label>
          <Input name="sellingPrice" type="number" value={formData.sellingPrice} onChange={handleChange} className={errors.sellingPrice ? 'border-red-500' : ''} />
          {errors.sellingPrice && <p className="text-xs text-red-500">{errors.sellingPrice}</p>}
        </div>
        <div className="space-y-2">
          <Label>Purchase Price *</Label>
          <Input name="purchasePrice" type="number" value={formData.purchasePrice} onChange={handleChange} className={errors.purchasePrice ? 'border-red-500' : ''} />
          {errors.purchasePrice && <p classNames="text-xs text-red-500">{errors.purchasePrice}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Minimum Qty</Label>
        <Input name="minimumQty" type="number" value={formData.minimumQty} onChange={handleChange} />
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
