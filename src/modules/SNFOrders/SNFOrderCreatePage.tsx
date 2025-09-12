import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Trash2, ArrowLeft, Save, Search as SearchIcon, User, MapPin } from 'lucide-react';
import { getAllDepotsList } from '@/services/depotService';
import { getDepotProductVariants, DepotProductVariant } from '@/services/depotProductVariantService';
import { post } from '@/services/apiService';
import { getAdminMembers, AdminMembersResponse, AdminMemberItem } from '@/services/memberAdminService';
import { getAdminDeliveryAddresses, AdminDeliveryAddress } from '@/services/adminDeliveryAddressService';
import SearchableCombobox from '@/components/ui/searchable-combobox';
import { useDebounce } from '@/hooks/useDebounce';

// Create via public endpoint (optionally authenticated)
const CREATE_API_URL = '/snf-orders';

interface CreateOrderItemPayload {
  name: string;
  variantName?: string | null;
  imageUrl?: string | null;
  price: number;
  quantity: number;
  productId?: number | null;
  depotProductVariantId?: number | null;
}

interface CreateOrderPayload {
  customer: {
    name: string;
    email?: string | null;
    mobile: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state?: string | null;
    pincode: string;
  };
  items: CreateOrderItemPayload[];
  subtotal: number;
  deliveryFee?: number;
  totalAmount: number;
  walletamt?: number;
  payableAmount?: number;
  deliveryDate?: string | null; // yyyy-MM-dd
  depotId?: number | null;
  memberId?: number | null;
}

interface CreateOrderResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    orderNo: string;
    totalAmount: number;
    paymentStatus: string;
    depot?: { id: number; name: string } | null;
    createdAt: string;
  };
}

const formatCurrency = (n: any) => `₹${Number(n ?? 0).toFixed(2)}`;

const SNFOrderCreatePage: React.FC = () => {
  const navigate = useNavigate();

  // Customer state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setStateVal] = useState('');
  const [pincode, setPincode] = useState('');

  // Delivery and depot
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [depots, setDepots] = useState<{ id: number; name: string }[]>([]);
  const [selectedDepotId, setSelectedDepotId] = useState<number | null>(null);

  // Member and address selection
  const [memberQuery, setMemberQuery] = useState('');
  const debouncedMemberQuery = useDebounce(memberQuery, 300);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberOptions, setMemberOptions] = useState<AdminMemberItem[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [selectedMemberWallet, setSelectedMemberWallet] = useState<number>(0);
  const [addresses, setAddresses] = useState<AdminDeliveryAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  // Items builder
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [variantResults, setVariantResults] = useState<DepotProductVariant[]>([]);
  const [items, setItems] = useState<CreateOrderItemPayload[]>([]);

  const subtotal = useMemo(() => items.reduce((sum, it) => sum + Number(it.price) * Number(it.quantity), 0), [items]);
  const totalAmount = useMemo(() => Number(subtotal) + Number(deliveryFee || 0), [subtotal, deliveryFee]);

  useEffect(() => {
    const loadDepots = async () => {
      try {
        const list = await getAllDepotsList();
        setDepots(list || []);
        if (list?.length) {
          setSelectedDepotId(list[0].id);
        }
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load depots');
      }
    };
    loadDepots();
  }, []);

  // Live search members (admin) as you type
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const q = debouncedMemberQuery?.trim() || '';
      if (q.length < 2) {
        setMemberOptions([]);
        return;
      }
      setLoadingMembers(true);
      try {
        const res: AdminMembersResponse = await getAdminMembers({ limit: 20, search: q });
        if (!cancelled) setMemberOptions(res.members || []);
      } catch (e: any) {
        if (!cancelled) toast.error(e?.message || 'Failed to search members');
      } finally {
        if (!cancelled) setLoadingMembers(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [debouncedMemberQuery]);

  const loadAddressesForMember = async (memberId: number) => {
    setLoadingAddresses(true);
    try {
      const list = await getAdminDeliveryAddresses(memberId);
      setAddresses(list || []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load addresses');
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleSelectMember = (memberId: number | null) => {
    setSelectedMemberId(memberId);
    setAddresses([]);
    setSelectedAddressId(null);
    if (!memberId) return;
    const m = memberOptions.find((u) => u.id === memberId);
    if (m) {
      // Prefill name/email from user
      setName(m.name || '');
      setEmail(m.email || '');
      setSelectedMemberWallet(Number(m.walletBalance || 0));
      // Load addresses
      loadAddressesForMember(memberId);
    }
  };

  const applyAddressToForm = (addr: AdminDeliveryAddress) => {
    // Prefill mobile, name, address lines, city/state/pincode
    setMobile(addr.mobile || '');
    setName((prev) => prev || addr.recipientName || '');
    const parts = [addr.plotBuilding, addr.streetArea].filter(Boolean);
    setAddressLine1(parts.join(', '));
    setAddressLine2(addr.landmark || '');
    setCity(addr.city || '');
    setStateVal(addr.state || '');
    setPincode(addr.pincode || '');
  };

  const handleSelectAddress = (addressId: number | null) => {
    setSelectedAddressId(addressId);
    if (!addressId) return;
    const addr = addresses.find((a) => a.id === addressId);
    if (addr) applyAddressToForm(addr);
  };

  const handleSearchVariants = async () => {
    setSearching(true);
    try {
      const res = await getDepotProductVariants({ limit: 10, search, depotId: selectedDepotId ?? undefined });
      setVariantResults(res.data || []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to search variants');
    } finally {
      setSearching(false);
    }
  };

  const addVariantAsItem = (v: DepotProductVariant) => {
    const price = Number(v.buyOncePrice) > 0 ? Number(v.buyOncePrice) : Number(v.mrp) || 0;
    const newItem: CreateOrderItemPayload = {
      name: v.productName || v.name,
      variantName: v.name,
      imageUrl: undefined,
      price,
      quantity: 1,
      productId: v.productId,
      depotProductVariantId: v.id,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const updateItemQty = (index: number, qty: number) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, quantity: Math.max(0, qty) } : it)));
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = (): string | null => {
    if (!name.trim()) return 'Customer name is required';
    if (!mobile.trim()) return 'Mobile is required';
    if (!addressLine1.trim()) return 'Address Line 1 is required';
    if (!city.trim()) return 'City is required';
    if (!pincode.trim()) return 'Pincode is required';
    if (items.length === 0) return 'Please add at least one item';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    const payload: CreateOrderPayload = {
      customer: {
        name: name.trim(),
        email: email.trim() || null,
        mobile: mobile.trim(),
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim() || null,
        city: city.trim(),
        state: state.trim() || null,
        pincode: pincode.trim(),
      },
      items: items.map((it) => ({
        ...it,
        price: Number(it.price),
        quantity: Number(it.quantity),
      })),
      subtotal: Number(subtotal),
      deliveryFee: Number(deliveryFee || 0),
      totalAmount: Number(totalAmount),
      walletamt: 0,
      payableAmount: Math.max(0, Number(totalAmount) - 0),
      deliveryDate: deliveryDate || null,
      depotId: selectedDepotId || null,
      memberId: selectedMemberId || null,
    };

    try {
      const res = await post<CreateOrderResponse>(CREATE_API_URL, payload);
      toast.success('Order created');
      const newId = res?.data?.id;
      if (newId) {
        navigate(`/admin/snf-orders/${newId}/edit`);
      } else {
        navigate('/admin/snf-orders');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create order');
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Create SNF Order</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/admin/snf-orders')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to List
          </Button>
          <Button onClick={handleSubmit}>
            <Save className="h-4 w-4 mr-1" /> Save Order
          </Button>
        </div>
      </div>

      {/* Customer Details */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Details</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Member selection */}
          <div className="rounded-md border p-3 mb-4">
            <div className="text-sm font-semibold mb-3 flex items-center gap-2"><User className="h-4 w-4" /> Select Member</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
              <div className="space-y-1">
                <Label>Member</Label>
                <SearchableCombobox
                  value={selectedMemberId ? String(selectedMemberId) : null}
                  onChange={(val) => handleSelectMember(val ? Number(val) : null)}
                  items={memberOptions.map((m) => ({ value: String(m.id), label: m.name, subLabel: m.email || undefined }))}
                  placeholder="Search and select member"
                  searchPlaceholder="Type name or email..."
                  emptyText={debouncedMemberQuery?.length < 2 ? 'Type at least 2 characters' : 'No results'}
                  loading={loadingMembers}
                  onQueryChange={(q) => setMemberQuery(q)}
                />
              </div>
              {selectedMemberId && (
                <div className="text-sm text-muted-foreground mt-6">Wallet Balance: <span className="font-medium">{formatCurrency(selectedMemberWallet)}</span></div>
              )}
            </div>
            {selectedMemberId && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="space-y-1 md:col-span-3">
                  <Label className="flex items-center gap-1"><MapPin className="h-4 w-4" /> Address</Label>
                  <SearchableCombobox
                    value={selectedAddressId ? String(selectedAddressId) : null}
                    onChange={(val) => handleSelectAddress(val ? Number(val) : null)}
                    items={addresses.map((a) => {
                      const line1 = [a.plotBuilding, a.streetArea].filter(Boolean).join(', ');
                      const line2 = [a.city, a.pincode].filter(Boolean).join(' ');
                      return {
                        value: String(a.id),
                        label: `${a.label ? a.label + ': ' : ''}${line1}`,
                        subLabel: `${line2}${a.isDefault ? ' • Default' : ''}`.trim(),
                      };
                    })}
                    placeholder={loadingAddresses ? 'Loading...' : 'Select address'}
                    searchPlaceholder="Type to filter addresses..."
                    emptyText={addresses.length === 0 ? 'No addresses' : 'No matches'}
                    loading={loadingAddresses}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="cust-name">Name</Label>
              <Input id="cust-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cust-mobile">Mobile</Label>
              <Input id="cust-mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cust-email">Email</Label>
              <Input id="cust-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1 lg:col-span-2">
              <Label htmlFor="cust-addr1">Address Line 1</Label>
              <Input id="cust-addr1" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cust-addr2">Address Line 2</Label>
              <Input id="cust-addr2" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cust-city">City</Label>
              <Input id="cust-city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cust-state">State</Label>
              <Input id="cust-state" value={state} onChange={(e) => setStateVal(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cust-pincode">Pincode</Label>
              <Input id="cust-pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery & Depot */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery & Depot</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-1">
              <Label htmlFor="depot">Depot</Label>
              <Select value={selectedDepotId?.toString() || ''} onValueChange={(v) => setSelectedDepotId(v ? Number(v) : null)}>
                <SelectTrigger id="depot">
                  <SelectValue placeholder="Select depot" />
                </SelectTrigger>
                <SelectContent>
                  {depots.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="delivery-date">Delivery Date</Label>
              <Input id="delivery-date" type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="delivery-fee">Delivery Fee</Label>
              <Input id="delivery-fee" type="number" value={deliveryFee} onChange={(e) => setDeliveryFee(Number(e.target.value) || 0)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Items */}
      <Card>
        <CardHeader>
          <CardTitle>Add Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-3">
            <Input className="max-w-sm" placeholder="Search product/variant..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <Button onClick={handleSearchVariants} disabled={searching}>
              {searching ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <SearchIcon className="h-4 w-4 mr-1" />} Search
            </Button>
          </div>

          {variantResults.length > 0 && (
            <div className="rounded-md border mb-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variant</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variantResults.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>{v.name}</TableCell>
                      <TableCell>{v.productName || ''}</TableCell>
                      <TableCell>{formatCurrency(Number(v.buyOncePrice) > 0 ? Number(v.buyOncePrice) : Number(v.mrp) || 0)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => addVariantAsItem(v)}>
                          <Plus className="h-3 w-3 mr-1" /> Add
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">No items added yet.</TableCell>
                  </TableRow>
                ) : (
                  items.map((it, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{it.name}</TableCell>
                      <TableCell>{it.variantName || '-'}</TableCell>
                      <TableCell>{formatCurrency(it.price)}</TableCell>
                      <TableCell className="w-32">
                        <Input type="number" value={it.quantity} min={0} onChange={(e) => updateItemQty(idx, parseInt(e.target.value) || 0)} />
                      </TableCell>
                      <TableCell>{formatCurrency(Number(it.price) * Number(it.quantity))}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="destructive" onClick={() => removeItem(idx)}>
                          <Trash2 className="h-3 w-3 mr-1" /> Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
            <div className="text-sm text-muted-foreground">Subtotal:</div>
            <div className="font-medium">{formatCurrency(subtotal)}</div>
            <div className="text-sm text-muted-foreground sm:ml-6">Delivery Fee:</div>
            <div className="font-medium">{formatCurrency(deliveryFee)}</div>
            <div className="text-sm text-muted-foreground sm:ml-6">Total:</div>
            <div className="font-semibold">{formatCurrency(totalAmount)}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SNFOrderCreatePage;
