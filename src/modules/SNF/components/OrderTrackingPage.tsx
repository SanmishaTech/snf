import React, { useState } from 'react';
import { Search, Download, Package, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getSNFOrderInvoiceStatus, downloadSNFOrderInvoiceByOrderNo, InvoiceStatusResponse } from '@/services/snfOrderAdminService';
import { toast } from 'sonner';

const OrderTrackingPage: React.FC = () => {
  const [orderNo, setOrderNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState<InvoiceStatusResponse['data'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!orderNo.trim()) {
      toast.error('Please enter an order number');
      return;
    }

    setLoading(true);
    setError(null);
    setOrderData(null);

    try {
      const response = await getSNFOrderInvoiceStatus(orderNo.trim());
      setOrderData(response.data);
    } catch (err: any) {
      setError(err.message || 'Order not found');
      setOrderData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (orderData && orderData.invoiceAvailableForDownload) {
      try {
        await downloadSNFOrderInvoiceByOrderNo(orderNo.trim());
      } catch (error: any) {
        toast.error(error.message || 'Failed to download invoice');
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PAID':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'PENDING':
      default:
        return <Clock className="h-5 w-5 text-orange-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PAID':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'FAILED':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'PENDING':
      default:
        return 'text-orange-600 bg-orange-50 border-orange-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Track Your SNF Order</h1>
          <p className="text-gray-600">Enter your order number to check status and download invoice</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter your order number (e.g., 2526-00001)"
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {orderData && (
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Order Number</label>
                  <p className="font-mono text-lg">{orderData.orderNo}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Order Date</label>
                  <p>{new Date(orderData.orderDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Total Amount</label>
                  <p className="text-lg font-semibold">₹{orderData.totalAmount.toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Payment Status</label>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon(orderData.paymentStatus)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(orderData.paymentStatus)}`}>
                      {orderData.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Invoice Section */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Invoice
                </h3>
                
                {orderData.hasInvoice ? (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-green-800 font-medium">Invoice Available</p>
                        <p className="text-green-600 text-sm mt-1">
                          Invoice #{orderData.invoiceNo}
                        </p>
                      </div>
                      {orderData.invoiceAvailableForDownload ? (
                        <Button 
                          onClick={handleDownloadInvoice}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      ) : (
                        <Button size="sm" disabled>
                          Processing...
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
                    <p className="text-orange-800 font-medium">Invoice Not Generated</p>
                    <p className="text-orange-600 text-sm mt-1">
                      Invoice will be available once your payment is processed.
                    </p>
                  </div>
                )}
              </div>

              {/* Order Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h4 className="text-blue-800 font-medium mb-2">Need Help?</h4>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• Contact us at sarkhotnaturalfarms@gmail.com for any queries</li>
                  <li>• Keep your order number handy for faster support</li>
                  <li>• Invoice will be auto-generated after successful payment</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default OrderTrackingPage;
