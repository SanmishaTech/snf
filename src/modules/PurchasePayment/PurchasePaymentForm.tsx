import React, { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { get } from '@/services/apiService';
import {
  PurchasePaymentInput,
  createPurchasePayment,
  fetchVendorPurchases,
} from '@/services/purchasePaymentService';
import { useNavigate } from 'react-router-dom';

// ----------------------------- Schema ---------------------------------------

const paymentSchema = z.object({
  paymentDate: z.date({ required_error: 'Payment date required' }),
  vendorId: z.string().min(1, 'Vendor is required'),
  mode: z.string().min(1, 'Payment mode is required'),
  referenceNo: z.string().min(1, 'Reference no is required'),
  notes: z.string().optional(),
  details: z
    .array(
      z.object({
        purchaseId: z.number(),
        amount: z.number().nonnegative(),
      })
    )
    .nonempty('Enter at least one purchase payment'),
});

export type PaymentFormData = z.infer<typeof paymentSchema>;

// ----------------------------- Types ----------------------------------------
interface Vendor {
  id: number;
  name: string;
}
interface PurchaseDetail {
  purchaseRate: string;
  quantity: number;
}

interface Purchase {
  id: number;
  purchaseNo: string;
  purchaseDate: string;
  invoiceNo: string;
  invoiceDate: string;
  totalAmount: number;
  paidAmt?: number;
  outstanding?: number;
  details: PurchaseDetail[];
}

interface PurchasePaymentFormProps {
  onSuccess?: () => void;
}

const modes = ['CASH', 'NEFT', 'CHEQUE', 'UPI'];

const PurchasePaymentForm: React.FC<PurchasePaymentFormProps> = ({ onSuccess }) => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentDate: new Date(),
      vendorId: '',
      mode: '',
      referenceNo: '',
      notes: '',
      details: [],
    },
  });

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  const selectedVendorId = watch('vendorId');

  // Fetch vendor list once
  useEffect(() => {
    const loadVendors = async () => {
      try {
        const res = await get('/vendors');
        // API may return {data: [...] } or raw array. Normalize to array.
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        console.log('list', list, res);
        setVendors(list);
      } catch (e: any) {
        toast.error(e.message || 'Failed to load vendors');
      }
    };
    loadVendors();
  }, []);

  // When vendor or payment date changes, refetch purchases
  const paymentDate = watch('paymentDate');
  useEffect(() => {
    if (!selectedVendorId) return;
    const fetch = async () => {
      try {
        const dateStr = format(paymentDate, 'yyyy-MM-dd');
        const res = await fetchVendorPurchases(parseInt(selectedVendorId), {
          startDate: dateStr,
          endDate: dateStr,
        });
        const purchasesData = res || [];
        setPurchases(purchasesData);
        console.log('purchases', purchasesData);
        setValue(
          'details',
          purchasesData.map((p: any) => ({ purchaseId: p.id, amount: p.outstanding ?? 0 }))
        );
      } catch (e: any) {
        toast.error(e.message || 'Failed to load purchases');
      }
    };
    fetch();
  }, [selectedVendorId, paymentDate, setValue]);

  // total amount computed
  const details = watch('details');
  const totalAmount = useMemo(() => details?.reduce((sum, d) => sum + (d.amount || 0), 0), [details]);

  const onSubmit = async (data: PaymentFormData) => {
    // Ensure at least one amount entered
    if (totalAmount <= 0) {
      toast.error('Enter at least one payment amount');
      return;
    }

    // runtime validation for each detail not exceeding outstanding
    for (const d of data.details) {
      const purch = purchases.find((p) => p.id === d.purchaseId);
      if (!purch) continue;
      if (d.amount > (purch.outstanding ?? 0)) {
        toast.error(`Amount for purchase ${purch.purchaseNo} exceeds outstanding balance`);
        return;
      }
    }
    try {
      const payload: PurchasePaymentInput = {
        paymentDate: format(data.paymentDate, 'yyyy-MM-dd'),
        vendorId: parseInt(data.vendorId),
        mode: data.mode,
        referenceNo: data.referenceNo || undefined,
        notes: data.notes || undefined,
        totalAmount: totalAmount,
        details: data.details.filter((d) => d.amount > 0),
      };
      await createPurchasePayment(payload);
      toast.success('Payment recorded');
      onSuccess?.();
      navigate('/admin/purchase-payments');
    } catch (e: any) {
      toast.error(e.message || 'Failed to create payment');
    }
  };

  // Helper to update amount
  const updateAmount = (index: number, value: number) => {
    const maxOwe = purchases[index]?.outstanding ?? 0;
    let newVal = value;
    if (value > maxOwe) {
      toast.warning('Amount exceeds outstanding balance');
      newVal = maxOwe;
    }
    const detailsArr = [...details];
    detailsArr[index].amount = isNaN(newVal) ? 0 : newVal;
    setValue('details', detailsArr as any);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-7xl m-auto mt-8">
      {/* Payment Details Section */}
      <div className="bg-white p-6 rounded-lg shadow mb-6 max-w-7xl">
        <h2 className="text-lg font-semibold mb-4">Payment Details</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {/* Payment Date */}
          <Controller
            control={control}
            name="paymentDate"
            render={({ field }) => (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Payment Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(field.value ?? new Date(), 'dd/MM/yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(d) => field.onChange(d)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.paymentDate && <p className="text-xs text-red-500">{errors.paymentDate.message}</p>}
              </div>
            )}
          />

          {/* Vendor */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Vendor</label>
            <Select value={selectedVendorId} onValueChange={(v) => setValue('vendorId', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select vendor" />
              </SelectTrigger>
              <SelectContent>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id.toString()}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.vendorId && <p className="text-xs text-red-500">{errors.vendorId.message}</p>}
          </div>

          
        </div>
      </div>

      {/* Purchases Table Section */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Purchases</h2>
        {purchases.length > 0 ? (
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Purchase No</th>
                  <th className="px-4 py-2 text-left">Invoice No</th>
                  <th className="px-4 py-2 text-center">Purchase Date</th>
                  <th className="px-4 py-2 text-center">Invoice Date</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2 text-right">Pay Amount</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p, idx) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-4 py-2">{p.purchaseNo}</td>
                    <td className="px-4 py-2">{p.invoiceNo}</td>
                    <td className="px-4 py-2 text-center">
                      {format(new Date(p.purchaseDate), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {format(new Date(p.invoiceDate), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-4 py-2 text-right">{(p.totalAmount ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end">
                        <Input
                          type="number"
                          step="0.01"
                          value={details[idx]?.amount || 0}
                          onChange={(e) => updateAmount(idx, parseFloat(e.target.value))}
                          className="w-32 text-right px-2 py-1 border rounded"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No purchases found</p>
        )}
      </div>

      {/* Payment Summary Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Payment Summary</h2>
        
        <div className="grid sm:grid-cols-3 gap-4">
           {/* Mode */}
           <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Mode</label>
            <Select value={watch('mode')} onValueChange={(v) => setValue('mode', v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                {modes.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.mode && <p className="text-xs text-red-500">{errors.mode.message}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Reference No</label>
            <Input {...register('referenceNo')} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Notes</label>
            <Input {...register('notes')} />
          </div>
          {/* <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Total</label>
            <Input value={totalAmount.toFixed(2)} readOnly className="font-semibold" />
          </div> */}
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="gap-2">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
          {isSubmitting ? 'Saving...' : 'Save Payment'}
        </Button>
      </div>
    </form>
  );
};

export default PurchasePaymentForm;
