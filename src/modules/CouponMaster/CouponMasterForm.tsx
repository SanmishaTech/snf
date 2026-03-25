import React, { useState } from 'react';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Wand2, Calendar as CalendarIconComp, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';



import {
  Coupon,
  CouponFormData,
  DiscountType,
  createCoupon,
  updateCoupon,
  generateCouponCode
} from '../../services/couponMasterService';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const couponSchema = z.object({
  code: z.string().min(3, 'Code must be at least 3 characters').max(20, 'Code too long'),
  discountType: z.nativeEnum(DiscountType),
  discountValue: z.number().min(1, 'Value must be at least 1'),
  minOrderAmount: z.number().optional(),
  fromDate: z.string().optional(),

  toDate: z.string().optional(),
  expiryDate: z.string().optional(),
  isActive: z.boolean().default(true),

  usageLimit: z.number().optional(),
});

interface CouponMasterFormProps {
  initialData?: Coupon | null;
  onClose: () => void;
  onSuccess: () => void;
}

const CouponMasterForm: React.FC<CouponMasterFormProps> = ({
  initialData,
  onClose,
  onSuccess
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CouponFormData>({
    resolver: zodResolver(couponSchema),
    defaultValues: initialData ? {
      code: initialData.code,
      discountType: initialData.discountType,
      discountValue: initialData.discountValue,
      minOrderAmount: initialData.minOrderAmount,
      fromDate: initialData.fromDate || '',

      toDate: initialData.toDate || '',
      expiryDate: initialData.expiryDate || '',
      isActive: initialData.isActive,
      usageLimit: initialData.usageLimit,
    } : {
      code: '',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 0,
      isActive: true,
      fromDate: '',
      toDate: '',
      expiryDate: '',
      minOrderAmount: 0,
      usageLimit: 0,
    },
  });



  const onSubmit = async (data: CouponFormData) => {
    setIsSubmitting(true);
    try {
      if (initialData) {
        await updateCoupon(initialData.id, data);
        toast.success('Coupon updated successfully');
      } else {
        await createCoupon(data);
        toast.success('Coupon created successfully');
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save coupon');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateCode = () => {
    const newCode = generateCouponCode();
    form.setValue('code', newCode);
    toast.info(`Generated code: ${newCode}`);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <div className="flex gap-2 items-end">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Coupon Code</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. SAVE20" {...field} className="uppercase font-mono" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button 
            type="button" 
            variant="outline" 
            className="mb-0 text-blue-600 border-blue-200 hover:bg-blue-50" 
            onClick={handleGenerateCode}
            title="Generate random code"
          >
            <Wand2 size={18} />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="discountType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discount Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={DiscountType.PERCENTAGE}>Percentage (%)</SelectItem>
                    <SelectItem value={DiscountType.CASH}>Fixed Cash (₹)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="discountValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discount Value</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="Value" 
                    {...field} 
                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <FormField
            control={form.control}
            name="minOrderAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1">
                  Min. Order Amount
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={14} className="text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      The minimum order subtotal required for this coupon to be valid.
                    </TooltipContent>
                  </Tooltip>
                </FormLabel>

                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="Min. Amount" 
                    {...field} 
                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>


        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="fromDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="mb-2">Valid From</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        type="button"
                        variant={"outline"}

                        className={cn(
                          "pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value && typeof field.value === 'string' && field.value !== '' ? (
                          format(new Date(field.value), "PPP")
                        ) : (
                          <span>Pick start date</span>
                        )}
                        <CalendarIconComp className="ml-auto h-4 w-4 opacity-50" />

                      </Button>

                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[100]" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) => field.onChange(date?.toISOString() || '')}
                    />
                  </PopoverContent>

                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="toDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="mb-2">Valid Until</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        type="button"
                        variant={"outline"}

                        className={cn(
                          "pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value && typeof field.value === 'string' && field.value !== '' ? (
                          format(new Date(field.value), "PPP")
                        ) : (
                          <span>Pick end date</span>
                        )}
                        <CalendarIconComp className="ml-auto h-4 w-4 opacity-50" />

                      </Button>

                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[100]" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) => field.onChange(date?.toISOString() || '')}
                    />
                  </PopoverContent>

                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="usageLimit"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1">
                  Usage Limit
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={14} className="text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Total number of times this coupon can be used across all customers.
                    </TooltipContent>
                  </Tooltip>
                </FormLabel>

                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="Limit" 
                    {...field} 
                    onChange={e => field.onChange(parseInt(e.target.value) || 0)} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-gray-50/50">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Active Status</FormLabel>
                </div>
              </FormItem>
            )}
          />
        </div>


        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="px-8">
            {isSubmitting ? 'Saving...' : (initialData ? 'Update' : 'Create')}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default CouponMasterForm;
