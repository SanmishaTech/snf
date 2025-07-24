import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { INDIAN_STATES } from '@/config/states';
import { createLead, type CreateLeadData } from '@/services/leadService';

// Validation schema
const leadFormSchema = z.object({
  name: z.string().min(1, 'Name is required').min(2, 'Name must be at least 2 characters'),
  mobile: z.string()
    .min(1, 'Mobile number is required')
    .regex(/^\d{10,}$/, 'Mobile number must be at least 10 digits and contain only numbers'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  plotBuilding: z.string().min(1, 'Flat/House/Plot number is required'),
  streetArea: z.string().min(1, 'Street/Area name is required'),
  landmark: z.string().optional(),
  pincode: z.string()
    .min(1, 'Pincode is required')
    .regex(/^\d{6}$/, 'Pincode must be exactly 6 digits'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  notes: z.string().optional(),
});

type LeadFormData = z.infer<typeof leadFormSchema>;

interface LeadFormProps {
  productId?: number;
  isDairyProduct?: boolean;
  initialData?: Partial<LeadFormData>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const LeadForm: React.FC<LeadFormProps> = ({
  productId,
  isDairyProduct = false,
  initialData,
  onSuccess,
  onCancel,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      name: '',
      mobile: '',
      email: '',
      plotBuilding: '',
      streetArea: '',
      landmark: '',
      pincode: '',
      city: 'Dombivli', // Default city
      state: 'Maharashtra', // Default state
      notes: '',
      ...initialData,
    },
  });

  const onSubmit = async (data: LeadFormData) => {
    setIsSubmitting(true);
    
    try {
      const leadData: CreateLeadData = {
        ...data,
        email: data.email || undefined,
        landmark: data.landmark || undefined,
        notes: data.notes || undefined,
        productId,
        isDairyProduct,
      };

      await createLead(leadData);
      
      toast.success('Lead submitted successfully! We will contact you soon.');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error submitting lead:', error);
      toast.error(error.message || 'Failed to submit lead. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your full name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mobile"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mobile Number *</FormLabel>
                <FormControl>
                  <Input 
                  max={10}
                    placeholder="Enter 10-digit mobile number" 
                    {...field} 
                    maxLength={10}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address (Optional)</FormLabel>
              <FormControl>
                <Input 
                  type="email" 
                  placeholder="Enter your email address" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="plotBuilding"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Flat/House/Plot Number *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., A-101, House No. 25" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="streetArea"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Street/Area *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., MG Road, Sector 5" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="landmark"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Landmark (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Near City Mall, Opposite School" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="pincode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pincode *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., 421201" 
                    {...field} 
                    maxLength={6}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter city name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {INDIAN_STATES.filter(state => state && typeof state.label === 'string').map((state) => (
                      <SelectItem key={state.value} value={state.label}>
                        {state.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Any additional information you'd like to share..."
                  rows={3}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {isDairyProduct && (
          <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> You're interested in a dairy product. We'll prioritize expanding our dairy delivery services to your area.
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          {onCancel && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Lead'}
          </Button>
        </div>
      </form>
    </Form>
  );
};