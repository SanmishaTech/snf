import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, Plus, Save, X, RefreshCw, Download, Calendar, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  getSNFOrderById,
  SNFOrderDetail,
  updateSNFOrder,
  addSNFOrderItem,
  updateSNFOrderItemQuantity,
  toggleSNFOrderItemCancellation,
  generateSNFOrderInvoice,
  downloadSNFOrderInvoice,
} from '@/services/snfOrderAdminService';
import { getDepotProductVariants, DepotProductVariant } from '@/services/depotProductVariantService';
import { getProductOptions, ProductOption } from '@/services/productService';
 import { getSNFOrderAuditLogs, SNFOrderAuditLogEntry } from '@/services/auditLogService';
 
const SNFOrderEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const orderId = useMemo(() => (id ? Number(id) : NaN), [id]);

  const [order, setOrder] = useState<SNFOrderDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [savingDeliveryDate, setSavingDeliveryDate] = useState<boolean>(false);
  const [deliveryDate, setDeliveryDate] = useState<string>('');

  const [addingItem, setAddingItem] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [variantResults, setVariantResults] = useState<DepotProductVariant[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [selectedQty, setSelectedQty] = useState<number>(1);

  const [editingItem, setEditingItem] = useState<{ itemId: number; qty: number } | null>(null);
  const [regenerating, setRegenerating] = useState<boolean>(false);

  // Product selection state
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [productVariants, setProductVariants] = useState<DepotProductVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [addQty, setAddQty] = useState<number>(1);
  const [addingProduct, setAddingProduct] = useState<boolean>(false);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);
  const [loadingVariants, setLoadingVariants] = useState<boolean>(false);
 
  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<SNFOrderAuditLogEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(false);
  const [expandedLogIds, setExpandedLogIds] = useState<Set<number>>(new Set());
 
  const isPaid = order?.paymentStatus === 'PAID';
  const hasInvoice = Boolean(order?.invoiceNo && order?.invoicePath);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await getSNFOrderById(orderId);
        setOrder(data);
        if (data.deliveryDate) {
          try {
            setDeliveryDate(new Date(data.deliveryDate).toISOString().slice(0, 10));
          } catch {
            setDeliveryDate('');
          }
        } else {
          setDeliveryDate('');
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load order');
      }
      setLoading(false);
    };
    fetchOrder();
  }, [orderId]);
 
  // Load audit logs on mount/order change
  useEffect(() => {
    if (!orderId) return;
    refreshAuditLogs();
  }, [orderId]);

  // Load products on mount
  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const productOptions = await getProductOptions();
        setProducts(productOptions);
      } catch (e: any) {
        toast.error('Failed to load products');
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  // Load variants when product is selected
  useEffect(() => {
    if (!selectedProductId || !order?.depot?.id) {
      setProductVariants([]);
      setSelectedVariantId(null);
      return;
    }
    
    const fetchVariants = async () => {
      setLoadingVariants(true);
      try {
        const res = await getDepotProductVariants({ 
          productId: selectedProductId, 
          depotId: order.depot?.id,
          limit: 100 
        });
        setProductVariants(res.data || []);
        setSelectedVariantId(null);
      } catch (e: any) {
        toast.error('Failed to load variants');
        setProductVariants([]);
      } finally {
        setLoadingVariants(false);
      }
    };
    fetchVariants();
  }, [selectedProductId, order?.depot?.id]);

  const refreshOrder = async () => {
    try {
      const data = await getSNFOrderById(orderId);
      setOrder(data);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to refresh order');
    }
  };
 
  const refreshAuditLogs = async () => {
    try {
      setLoadingAudit(true);
      const res = await getSNFOrderAuditLogs(orderId, { limit: 50 });
      setAuditLogs(res.data || []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load audit logs');
    } finally {
      setLoadingAudit(false);
    }
  };
 
  const toggleLogExpand = (id: number) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Helpers to render human-friendly audit details
  const formatCurrency = (n: any) => (typeof n === 'number' ? `₹${n.toFixed(2)}` : '—');
  const formatDateValue = (v: any) => {
    if (!v) return '—';
    try {
      const d = new Date(v);
      if (!isNaN(d.getTime())) return d.toLocaleString();
      return String(v);
    } catch {
      return String(v);
    }
  };
  const renderOrderUpdatedDiffs = (oldV: any, newV: any) => {
    const fields: { key: string; label: string; isDate?: boolean }[] = [
      { key: 'paymentStatus', label: 'Payment Status' },
      { key: 'paymentMode', label: 'Payment Mode' },
      { key: 'paymentRefNo', label: 'Payment Ref No' },
      { key: 'paymentDate', label: 'Payment Date', isDate: true },
      { key: 'deliveryDate', label: 'Delivery Date', isDate: true },
    ];
    const keys = Object.keys(newV || {});
    return (
      <div className="space-y-1 text-sm">
        {keys.length === 0 ? (
          <div className="text-muted-foreground">No changed fields captured.</div>
        ) : (
          keys.map((k) => {
            const meta = fields.find((f) => f.key === k) || { key: k, label: k };
            const oldVal = meta.isDate ? formatDateValue(oldV?.[k]) : (k.toLowerCase().includes('amount') ? formatCurrency(oldV?.[k]) : String(oldV?.[k] ?? '—'));
            const newVal = meta.isDate ? formatDateValue(newV?.[k]) : (k.toLowerCase().includes('amount') ? formatCurrency(newV?.[k]) : String(newV?.[k] ?? '—'));
            return (
              <div key={k} className="flex items-center gap-2">
                <div className="w-44 text-muted-foreground">{meta.label}</div>
                <div className="flex-1">
                  <span className="font-medium">{oldVal}</span>
                  <span className="mx-2">→</span>
                  <span className="font-medium">{newVal}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };
  const renderAuditDetails = (log: SNFOrderAuditLogEntry): React.ReactNode => {
    const o = log.oldValue || {};
    const n = log.newValue || {};
    switch (log.action) {
      case 'ITEM_CANCELLED':
      case 'ITEM_RESTORED': {
        const prev = o?.isCancelled ? 'Cancelled' : 'Active';
        const curr = n?.isCancelled ? 'Cancelled' : 'Active';
        return (
          <div className="text-sm space-y-2">
            <div>
              <span className="text-muted-foreground">Status:</span>{' '}
              <span className="font-medium">{prev}</span>
              <span className="mx-2">→</span>
              <span className="font-medium">{curr}</span>
            </div>
            {/* <div className="text-xs text-muted-foreground">Item ID: {n?.itemId ?? o?.itemId ?? '—'}</div> */}
          </div>
        );
      }
      case 'ITEM_QUANTITY_UPDATED': {
        return (
          <div className="text-sm space-y-2">
            <div>
              <span className="text-muted-foreground">Quantity:</span>{' '}
              <span className="font-medium">{o?.quantity ?? '—'}</span>
              <span className="mx-2">→</span>
              <span className="font-medium">{n?.quantity ?? '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Line Total:</span>{' '}
              <span className="font-medium">{formatCurrency(o?.lineTotal)}</span>
              <span className="mx-2">→</span>
              <span className="font-medium">{formatCurrency(n?.lineTotal)}</span>
            </div>
          </div>
        );
      }
      case 'ITEM_ADDED': {
        return (
          <div className="text-sm space-y-1">
            <div>
              Added: <span className="font-medium">{n?.name || 'Item'}</span>
              {n?.variantName ? <span> ({n.variantName})</span> : null}
            </div>
            <div className="text-muted-foreground">Qty: {n?.quantity ?? '—'} • Price: {formatCurrency(n?.price)} • Line Total: {formatCurrency(n?.lineTotal)}</div>
          </div>
        );
      }
      case 'ORDER_UPDATED': {
        return renderOrderUpdatedDiffs(o, n);
      }
      case 'PAYMENT_STATUS_UPDATED': {
        return (
          <div className="text-sm space-y-2">
            <div>
              <span className="text-muted-foreground">Payment Status:</span>{' '}
              <span className="font-medium">{o?.paymentStatus ?? '—'}</span>
              <span className="mx-2">→</span>
              <span className="font-medium">{n?.paymentStatus ?? '—'}</span>
            </div>
            <div className="text-muted-foreground">Mode: <span className="font-medium text-foreground">{n?.paymentMode ?? '—'}</span></div>
            <div className="text-muted-foreground">Ref: <span className="font-medium text-foreground">{n?.paymentRefNo ?? '—'}</span></div>
            <div className="text-muted-foreground">Date: <span className="font-medium text-foreground">{formatDateValue(n?.paymentDate)}</span></div>
          </div>
        );
      }
      default:
        return (
          <div className="text-sm text-muted-foreground">No additional details available.</div>
        );
    }
  };

  const handleSaveDeliveryDate = async () => {
    if (!order) return;
    setSavingDeliveryDate(true);
    try {
      await updateSNFOrder(order.id, { deliveryDate: deliveryDate || null });
      toast.success('Delivery date updated');
      if (isPaid && hasInvoice) {
        try {
          await generateSNFOrderInvoice(order.id);
          toast.info('Invoice regenerated to include changes');
        } catch {}
      }
      await refreshOrder();
      await refreshAuditLogs();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update delivery date');
    } finally {
      setSavingDeliveryDate(false);
    }
  };

  const handleSearchVariants = async () => {
    setSearching(true);
    try {
      const res = await getDepotProductVariants({ limit: 10, search, depotId: order?.depot?.id });
      setVariantResults(res.data || []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to search variants');
    } finally {
      setSearching(false);
    }
  };

  const handleAddProduct = async () => {
    if (!order || !selectedVariantId || addQty <= 0) {
      toast.error('Please select a product variant and valid quantity');
      return;
    }

    const selectedVariant = productVariants.find(v => v.id === selectedVariantId);
    if (!selectedVariant) {
      toast.error('Selected variant not found');
      return;
    }

    setAddingProduct(true);
    try {
      const price = (typeof selectedVariant.buyOncePrice === 'number' && selectedVariant.buyOncePrice > 0) 
        ? selectedVariant.buyOncePrice 
        : Number(selectedVariant.mrp) || 0;

      await addSNFOrderItem(order.id, {
        depotProductVariantId: selectedVariant.id,
        productId: selectedVariant.productId,
        price: Number(price),
        quantity: addQty,
      });

      toast.success('Product added');
      if (isPaid && hasInvoice) {
        try {
          await generateSNFOrderInvoice(order.id);
          toast.info('Invoice regenerated to include changes');
        } catch {}
      }
      
      // Reset form
      setSelectedProductId(null);
      setSelectedVariantId(null);
      setAddQty(1);
      await refreshOrder();
      await refreshAuditLogs();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add product');
    } finally {
      setAddingProduct(false);
    }
  };

  const handleAddItem = async (v: DepotProductVariant) => {
    if (!order) return;
    if (!selectedQty || selectedQty <= 0) {
      toast.error('Quantity must be at least 1');
      return;
    }
    setAddingItem(true);
    try {
      const price = (typeof v.buyOncePrice === 'number' && v.buyOncePrice > 0) ? v.buyOncePrice : v.mrp;
      await addSNFOrderItem(order.id, {
        depotProductVariantId: v.id,
        productId: v.productId,
        price: Number(price),
        quantity: selectedQty,
      });
      toast.success('Item added');
      if (isPaid && hasInvoice) {
        try {
          await generateSNFOrderInvoice(order.id);
          toast.info('Invoice regenerated to include changes');
        } catch {}
      }
      await refreshOrder();
      await refreshAuditLogs();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add item');
    } finally {
      setAddingItem(false);
    }
  };

  const handleSaveQty = async (itemId: number, qty: number) => {
    if (!order) return;
    if (qty < 0) {
      toast.error('Quantity cannot be negative');
      return;
    }
    try {
      await updateSNFOrderItemQuantity(order.id, itemId, qty);
      toast.success('Quantity updated');
      if (isPaid && hasInvoice) {
        try {
          await generateSNFOrderInvoice(order.id);
          toast.info('Invoice regenerated to include changes');
        } catch {}
      }
      setEditingItem(null);
      await refreshOrder();
      await refreshAuditLogs();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update quantity');
    }
  };

  const handleToggleCancel = async (itemId: number, isCancelled: boolean) => {
    if (!order) return;
    try {
      await toggleSNFOrderItemCancellation(order.id, itemId, isCancelled);
      toast.success(isCancelled ? 'Item cancelled' : 'Item restored');
      if (isPaid && hasInvoice) {
        try {
          await generateSNFOrderInvoice(order.id);
          toast.info('Invoice regenerated to include changes');
        } catch {}
      }
      await refreshOrder();
      await refreshAuditLogs();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update item');
    }
  };

  const handleRegenerateInvoice = async () => {
    if (!order) return;
    setRegenerating(true);
    try {
      await generateSNFOrderInvoice(order.id);
      toast.success('Invoice generated');
      await refreshOrder();
      await refreshAuditLogs();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to generate invoice');
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-sm">Loading order...</span>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mx-auto py-8 px-4">
        <p className="text-red-600">{error || 'Order not found'}</p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/admin/snf-orders"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Orders</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit SNF Order</h1>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link to={`/admin/snf-orders/${order.id}`}><ArrowLeft className="h-4 w-4 mr-1" /> View</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/snf-orders"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
          </Button>
        </div>
      </div>

      {/* Top summary */}
      <Card>
        <CardHeader>
          <CardTitle>Order #{order.orderNo}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-md border p-4 space-y-2">
              <div className="text-sm text-muted-foreground">Customer</div>
              <div className="font-medium">{order.name}</div>
              <div className="text-sm">{order.mobile}</div>
              <div className="text-sm text-muted-foreground break-words">{order.addressLine1}{order.addressLine2 ? `, ${order.addressLine2}` : ''}</div>
              <div className="text-sm">{order.city}{order.state ? `, ${order.state}` : ''} - {order.pincode}</div>
              {order.depot && (
                <div className="text-sm"><span className="text-muted-foreground">Depot:</span> {order.depot.name}</div>
              )}
            </div>
            <div className="rounded-md border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{order.paymentStatus}</Badge>
                {isPaid && hasInvoice && <Badge variant="outline">Invoiced</Badge>}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                <div className="text-muted-foreground">Subtotal</div>
                <div className="text-right font-medium">₹{Number(order.subtotal ?? 0).toFixed(2)}</div>
                <div className="text-muted-foreground">Delivery Fee</div>
                <div className="text-right font-medium">₹{Number(order.deliveryFee ?? 0).toFixed(2)}</div>
                <div className="text-muted-foreground">Total</div>
                <div className="text-right font-medium">₹{Number(order.totalAmount ?? 0).toFixed(2)}</div>
                {typeof (order as any).walletamt === 'number' && (
                  <>
                    <div className="text-muted-foreground">Wallet</div>
                    <div className="text-right font-medium">-₹{Number((order as any).walletamt ?? 0).toFixed(2)}</div>
                  </>
                )}
                {typeof (order as any).payableAmount === 'number' && (
                  <>
                    <div className="text-muted-foreground">Payable</div>
                    <div className="text-right font-medium">₹{Number((order as any).payableAmount ?? 0).toFixed(2)}</div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 mt-4">
                {hasInvoice ? (
                  <Button onClick={() => downloadSNFOrderInvoice(order.id)} variant="outline">
                    <Download className="h-4 w-4 mr-1" /> Download Invoice
                  </Button>
                ) : (
                  <Button onClick={handleRegenerateInvoice} disabled={regenerating}>
                    {regenerating ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />} Generate Invoice
                  </Button>
                )}
                {isPaid && hasInvoice && (
                  <Button onClick={handleRegenerateInvoice} disabled={regenerating} variant="secondary">
                    {regenerating ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />} Regenerate
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Date */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Delivery Date</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            <div className="w-60 space-y-1">
              <Label htmlFor="delivery-date">Date</Label>
              <Input id="delivery-date" type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleSaveDeliveryDate} disabled={savingDeliveryDate}>
                {savingDeliveryDate ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Save
              </Button>
              <Button variant="outline" onClick={() => setDeliveryDate(order.deliveryDate ? new Date(order.deliveryDate).toISOString().slice(0,10) : '')}>Reset</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Items ({order.items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Add Product from Catalog */}
          <div className="rounded-md border p-4 mb-4">
            <div className="text-sm font-semibold mb-3">Add Product from Catalog</div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div className="space-y-1">
                <Label htmlFor="select-product">Select Product</Label>
                <Select value={selectedProductId?.toString() || ""} onValueChange={(value) => setSelectedProductId(value ? Number(value) : null)}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingProducts ? "Loading..." : "Choose product"} />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="select-variant">Select Variant</Label>
                <Select 
                  value={selectedVariantId?.toString() || ""} 
                  onValueChange={(value) => setSelectedVariantId(value ? Number(value) : null)}
                  disabled={!selectedProductId || loadingVariants}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingVariants ? "Loading..." : "Choose variant"} />
                  </SelectTrigger>
                  <SelectContent>
                    {productVariants.map(v => (
                      <SelectItem key={v.id} value={v.id.toString()}>
                        {v.name} - ₹{((Number(v.buyOncePrice) > 0 ? Number(v.buyOncePrice) : Number(v.mrp) || 0)).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="add-qty">Quantity</Label>
                <Input id="add-qty" type="number" min="1" value={addQty} onChange={(e) => setAddQty(Number(e.target.value) || 1)} />
              </div>
              <div>
                <Button onClick={handleAddProduct} disabled={addingProduct || !selectedVariantId}>
                  {addingProduct ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />} Add Product
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <Input placeholder="Search product/variant to add..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
            {/* <Input placeholder="Qty" type="number" className="w-24" value={selectedQty} min={1} onChange={(e) => setSelectedQty(parseInt(e.target.value) || 1)} /> */}
            <Button onClick={handleSearchVariants} disabled={searching}>
              {searching ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <SearchIcon />} Search
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
                  {variantResults.map(v => (
                    <TableRow key={v.id}>
                      <TableCell>{v.name}</TableCell>
                      <TableCell>{v.productName || ''}</TableCell>
                      <TableCell>₹{((Number(v.buyOncePrice) > 0 ? Number(v.buyOncePrice) : Number(v.mrp) || 0)).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => handleAddItem(v)} disabled={addingItem}>
                          {addingItem ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />} Add
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {order.items.length === 0 ? (
            <div className="text-muted-foreground">No items.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Line Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((it) => (
                    <TableRow key={it.id} className={cn(it.isCancelled && 'opacity-50 bg-red-50 dark:bg-red-950/20')}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {it.imageUrl ? <img src={it.imageUrl} alt={it.name} className="h-10 w-10 rounded object-cover border" /> : <div className="h-10 w-10 rounded bg-muted" />}
                          <div className={cn('font-medium', it.isCancelled && 'line-through')}>{it.name}</div>
                        </div>
                      </TableCell>
                      <TableCell className={cn(it.isCancelled && 'line-through')}>{it.variantName || '-'}</TableCell>
                      <TableCell className={cn(it.isCancelled && 'line-through')}>₹{Number(it.price ?? 0).toFixed(2)}</TableCell>
                      <TableCell>
                        {editingItem?.itemId === it.id ? (
                          <div className="flex items-center gap-2">
                            <Input type="number" className="w-24" value={editingItem.qty} onChange={(e) => setEditingItem({ itemId: it.id, qty: parseInt(e.target.value) || 0 })} />
                            <Button size="sm" onClick={() => handleSaveQty(it.id, editingItem.qty)}><Save className="h-3 w-3" /></Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingItem(null)}><X className="h-3 w-3" /></Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={cn(it.isCancelled && 'line-through')}>{it.quantity}</span>
                            {!it.isCancelled && (
                              <Button size="sm" variant="ghost" onClick={() => setEditingItem({ itemId: it.id, qty: it.quantity })}><Pencil className="h-3 w-3" /></Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className={cn(it.isCancelled && 'line-through')}>₹{Number(it.lineTotal ?? 0).toFixed(2)}</TableCell>
                      <TableCell>
                        {it.isCancelled ? (
                          <Badge variant="destructive">Cancelled</Badge>
                        ) : (
                          <Badge variant="secondary">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" variant={it.isCancelled ? 'outline' : 'destructive'} onClick={() => handleToggleCancel(it.id, !it.isCancelled)}>
                          {it.isCancelled ? 'Restore' : 'Cancel'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
 
      {/* Audit History */}
      <Card>
        <CardHeader>
          <CardTitle>Audit History</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingAudit ? (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Loading audit logs...
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-sm text-muted-foreground">No audit entries yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => {
                    const isExpanded = expandedLogIds.has(log.id);
                    return (
                      <React.Fragment key={log.id}>
                        <TableRow>
                          <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                          <TableCell>{log.user?.name || 'System'}</TableCell>
                          <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                          <TableCell className="max-w-xl break-words">{log.description}</TableCell>
                          <TableCell className="text-right">
                            {(log.oldValue || log.newValue) ? (
                              <Button size="sm" variant="outline" onClick={() => toggleLogExpand(log.id)}>
                                {isExpanded ? 'Hide' : 'View'}
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={5}>
                              <div className="rounded-md border p-4 bg-muted/30">
                                {renderAuditDetails(log)}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="mt-3">
            <Button size="sm" variant="secondary" onClick={refreshAuditLogs} disabled={loadingAudit}>
              {loadingAudit ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const SearchIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 mr-1">
    <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 104.227 11.964l3.78 3.78a.75.75 0 101.06-1.06l-3.78-3.78A6.75 6.75 0 0010.5 3.75zm-5.25 6.75a5.25 5.25 0 1110.5 0 5.25 5.25 0 01-10.5 0z" clipRule="evenodd" />
  </svg>
);

export default SNFOrderEditPage;
