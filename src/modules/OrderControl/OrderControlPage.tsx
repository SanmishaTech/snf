import React, { useState, useEffect } from 'react';
import { Calendar, Edit2, X, Save, RefreshCw, Package, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SNFOrderItem {
  id: number;
  name: string;
  variantName?: string;
  price: number;
  quantity: number;
  lineTotal: number;
  isCancelled: boolean;
  imageUrl?: string;
  depotProductVariantId?: number;
  productId?: number;
}

interface SNFOrder {
  id: number;
  orderNo: string;
  name: string;
  mobile: string;
  email?: string;
  city: string;
  totalAmount: number;
  paymentStatus: string;
  deliveryDate?: string;
  items: SNFOrderItem[];
}

interface ProductGroup {
  productName: string;
  variantName?: string;
  price: number;
  totalQuantity: number;
  activeQuantity: number;
  totalAmount: number;
  activeAmount: number;
  orders: {
    order: SNFOrder;
    item: SNFOrderItem;
  }[];
}

const OrderControlPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [orders, setOrders] = useState<SNFOrder[]>([]);
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<{
    orderId: number;
    itemId: number;
    quantity: number;
  } | null>(null);
  const [regeneratingInvoices, setRegeneratingInvoices] = useState<Set<number>>(new Set());
  const [downloadingDetailed, setDownloadingDetailed] = useState<boolean>(false);
  const [downloadingSummary, setDownloadingSummary] = useState<boolean>(false);

  // Fetch orders for the selected date
  const fetchOrdersForDate = async (date: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/order-control/orders-by-date?date=${date}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch orders for selected date');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Download PDFs (detailed/summary)
  const downloadOrderControlPdf = async (type: 'detailed' | 'summary') => {
    const setter = type === 'detailed' ? setDownloadingDetailed : setDownloadingSummary;
    setter(true);
    try {
      const url = `/api/admin/order-control/download-${type}-pdf?date=${selectedDate}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to download ${type} PDF`);
      }
      const blob = await response.blob();
      const filename = `OrderControl_${type}_${selectedDate}.pdf`;
      const link = document.createElement('a');
      const blobUrl = window.URL.createObjectURL(blob);
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      toast.success(`${type === 'detailed' ? 'Detailed' : 'Summary'} PDF downloaded`);
    } catch (error: any) {
      toast.error(error.message || `Failed to download ${type} PDF`);
    } finally {
      setter(false);
    }
  };

  // Group orders by product
  const groupOrdersByProduct = (orders: SNFOrder[]): ProductGroup[] => {
    const groups: { [key: string]: ProductGroup } = {};

    orders.forEach(order => {
      order.items.forEach(item => {
        const key = `${item.name}-${item.variantName || 'default'}-${item.price}`;
        
        if (!groups[key]) {
          groups[key] = {
            productName: item.name,
            variantName: item.variantName,
            price: item.price,
            totalQuantity: 0,
            activeQuantity: 0,
            totalAmount: 0,
            activeAmount: 0,
            orders: [],
          };
        }

        groups[key].orders.push({
          order: order,
          item: item
        });
        
        groups[key].totalQuantity += item.quantity;
        groups[key].totalAmount += item.lineTotal;
        
        if (!item.isCancelled) {
          groups[key].activeQuantity += item.quantity;
          groups[key].activeAmount += item.lineTotal;
        }
      });
    });

    return Object.values(groups);
  };

  useEffect(() => {
    if (selectedDate) {
      fetchOrdersForDate(selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    setProductGroups(groupOrdersByProduct(orders));
  }, [orders]);

  // Handle quantity update
  const handleQuantityUpdate = async (orderId: number, itemId: number, newQuantity: number) => {
    if (newQuantity < 0) {
      toast.error('Quantity cannot be negative');
      return;
    }

    try {
      const response = await fetch(`/api/admin/order-control/update-item-quantity`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          orderId,
          itemId,
          quantity: newQuantity,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update quantity');
      }

      const result = await response.json();
      
      // Update local state
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? {
                ...order,
                items: order.items.map(item =>
                  item.id === itemId
                    ? { ...item, quantity: newQuantity, lineTotal: newQuantity * item.price }
                    : item
                ),
                totalAmount: result.newOrderTotal,
              }
            : order
        )
      );

      setEditingItem(null);
      toast.success('Quantity updated successfully');

      // Check if invoice needs regeneration
      if (result.needsInvoiceRegeneration) {
        toast.info('Invoice will be regenerated due to changes');
        await regenerateInvoiceForOrder(orderId);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update quantity');
    }
  };

  // Handle item cancellation
  const handleItemCancellation = async (orderId: number, itemId: number, cancel: boolean) => {
    try {
      const response = await fetch(`/api/admin/order-control/toggle-item-cancellation`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          orderId,
          itemId,
          isCancelled: cancel,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update item cancellation');
      }

      const result = await response.json();

      // Update local state
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? {
                ...order,
                items: order.items.map(item =>
                  item.id === itemId ? { ...item, isCancelled: cancel } : item
                ),
                totalAmount: result.newOrderTotal,
              }
            : order
        )
      );

      toast.success(`Item ${cancel ? 'cancelled' : 'restored'} successfully`);

      // Check if invoice needs regeneration
      if (result.needsInvoiceRegeneration) {
        toast.info('Invoice will be regenerated due to changes');
        await regenerateInvoiceForOrder(orderId);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update item cancellation');
    }
  };

  // Regenerate invoice for order
  const regenerateInvoiceForOrder = async (orderId: number) => {
    setRegeneratingInvoices(prev => new Set(prev.add(orderId)));
    
    try {
      const response = await fetch(`/api/admin/snf-orders/${orderId}/generate-invoice`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate invoice');
      }

      toast.success('Invoice regenerated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to regenerate invoice');
    } finally {
      setRegeneratingInvoices(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  const totalActiveAmount = productGroups.reduce((sum, group) => sum + group.activeAmount, 0);
  const totalCancelledAmount = productGroups.reduce((sum, group) => sum + (group.totalAmount - group.activeAmount), 0);

  return (
    <div className="container mx-auto py-6 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-6 w-6" />
            Order Control Management
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <Label htmlFor="delivery-date">Delivery Date:</Label>
              <Input
                id="delivery-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-40"
              />
            </div>
            {loading && <span className="text-sm text-muted-foreground">Loading...</span>}
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                disabled={loading || productGroups.length === 0 || downloadingSummary}
                onClick={() => downloadOrderControlPdf('summary')}
              >
                {downloadingSummary ? (
                  <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                ) : (
                  <Download className="h-3 w-3 mr-2" />
                )}
                Summary PDF
              </Button>
              <Button
                size="sm"
                disabled={loading || productGroups.length === 0 || downloadingDetailed}
                onClick={() => downloadOrderControlPdf('detailed')}
              >
                {downloadingDetailed ? (
                  <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                ) : (
                  <Download className="h-3 w-3 mr-2" />
                )}
                Detailed PDF
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
           

          {/* Product-centric view */}
          {productGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {loading ? 'Loading orders...' : 'No orders found for the selected date'}
            </div>
          ) : (
            <div className="space-y-6">
              {productGroups.map((productGroup, productIndex) => (
                <Card key={productIndex}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl">{productGroup.productName}</CardTitle>
                        {productGroup.variantName && (
                          <p className="text-sm text-muted-foreground">
                            Variant: {productGroup.variantName} • Rate: ₹{productGroup.price.toFixed(2)}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold">
                          {productGroup.activeQuantity} / {productGroup.totalQuantity} qty
                        </div>
                        <div className="text-sm text-muted-foreground">₹{productGroup.activeAmount.toFixed(2)} active</div>
                        {productGroup.totalAmount !== productGroup.activeAmount && (
                          <div className="text-sm text-red-600">₹{(productGroup.totalAmount - productGroup.activeAmount).toFixed(2)} cancelled</div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order No</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Mobile</TableHead>
                          <TableHead>City</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Line Total</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productGroup.orders.map(({ order, item }) => (
                          <TableRow key={`${order.id}-${item.id}`} className={cn(item.isCancelled && 'opacity-50 bg-red-50 dark:bg-red-950/20')}>
                            <TableCell className="font-mono">
                              {order.orderNo}
                              {regeneratingInvoices.has(order.id) && (
                                <RefreshCw className="inline h-3 w-3 ml-1 animate-spin" />
                              )}
                            </TableCell>
                            <TableCell className={cn(item.isCancelled && 'line-through')}>
                              {order.name}
                            </TableCell>
                            <TableCell>{order.mobile}</TableCell>
                            <TableCell>{order.city}</TableCell>
                            <TableCell className="text-right">
                              {editingItem?.orderId === order.id && editingItem?.itemId === item.id ? (
                                <div className="flex items-center gap-2 justify-end">
                                  <Input
                                    type="number"
                                    value={editingItem.quantity}
                                    onChange={(e) => setEditingItem({
                                      ...editingItem,
                                      quantity: parseInt(e.target.value) || 0
                                    })}
                                    className="w-20"
                                    min={0}
                                    max={item.quantity}
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      if (editingItem.quantity > item.quantity) {
                                        toast.error('Quantity cannot exceed the current ordered quantity');
                                        return;
                                      }
                                      handleQuantityUpdate(order.id, item.id, editingItem.quantity);
                                    }}
                                  >
                                    <Save className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => setEditingItem(null)}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className={cn('flex items-center gap-2 justify-end', item.isCancelled && 'line-through')}>
                                  {item.quantity}
                                  {!item.isCancelled && (
                                    <Button size="sm" variant="ghost" onClick={() => setEditingItem({ orderId: order.id, itemId: item.id, quantity: item.quantity })}>
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className={cn('text-right', item.isCancelled && 'line-through')}>₹{item.lineTotal.toFixed(2)}</TableCell>
                            <TableCell className="text-center">
                              {item.isCancelled ? (
                                <Badge variant="destructive">
                                  <X className="h-3 w-3 mr-1" />
                                  Cancelled
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Active</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                size="sm"
                                variant={item.isCancelled ? 'outline' : 'destructive'}
                                onClick={() => handleItemCancellation(order.id, item.id, !item.isCancelled)}
                              >
                                {item.isCancelled ? 'Restore' : 'Cancel'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderControlPage;
