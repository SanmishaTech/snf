import { get } from './apiService';
import { getAllSNFOrders, getSNFOrderById } from './snfOrderAdminService';
import { format, parseISO, isAfter, isBefore, isSameDay } from 'date-fns';

export interface SNFOrderReportFilters {
  startDate?: string;
  endDate?: string;
  depotId?: number;
  paymentStatus?: string;
  paymentMode?: string;
  city?: string;
  groupBy?: string;
  page?: number;
  limit?: number;
}

export interface EnhancedSNFOrderItem {
  id: number;
  orderNo: string;
  customerName: string;
  mobile: string;
  email?: string;
  city: string;
  state?: string;
  pincode: string;
  addressLine1: string;
  addressLine2?: string;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  paymentMode?: string;
  paymentStatus: string;
  paymentRefNo?: string;
  paymentDate?: string;
  invoiceNo?: string;
  orderDate: string;
  depot?: {
    id: number;
    name: string;
  };
  items: Array<{
    id: number;
    name: string;
    variantName?: string;
    price: number;
    quantity: number;
    lineTotal: number;
    imageUrl?: string;
  }>;
}

export interface DepotPerformanceStats {
  depotId: number;
  depotName: string;
  totalOrders: number;
  uniqueCustomers: number;
  totalAmount: number;
  totalQuantity: number;
  avgOrderValue: number;
  paymentBreakdown: {
    paid: { count: number; amount: number };
    pending: { count: number; amount: number };
    failed: { count: number; amount: number };
  };
  topProducts: Array<{
    name: string;
    variantName?: string;
    quantity: number;
    amount: number;
    orderCount: number;
  }>;
  customerRetentionRate: number;
  monthlyTrend: Array<{
    month: string;
    orderCount: number;
    amount: number;
  }>;
}

export interface CustomerAnalytics {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  customerRetentionRate: number;
  avgOrdersPerCustomer: number;
  avgSpendPerCustomer: number;
  topCustomers: Array<{
    name: string;
    mobile: string;
    city: string;
    orderCount: number;
    totalSpent: number;
    avgOrderValue: number;
    lastOrderDate: string;
  }>;
  cityDistribution: Array<{
    city: string;
    customerCount: number;
    orderCount: number;
    totalAmount: number;
    avgOrderValue: number;
    marketShare: number;
  }>;
}

export interface ProductPerformance {
  productStats: Array<{
    productName: string;
    variantName?: string;
    totalQuantity: number;
    totalAmount: number;
    orderCount: number;
    avgQuantityPerOrder: number;
    avgPricePerUnit: number;
    revenueShare: number;
  }>;
  categoryStats: Array<{
    categoryName: string;
    productCount: number;
    totalQuantity: number;
    totalAmount: number;
    orderCount: number;
  }>;
}

export interface SNFOrdersReportData {
  summary: {
    totalOrders: number;
    totalCustomers: number;
    totalAmount: number;
    totalQuantity: number;
    avgOrderValue: number;
    reportPeriod: {
      startDate: string;
      endDate: string;
    };
  };
  depotPerformance: DepotPerformanceStats[];
  customerAnalytics: CustomerAnalytics;
  productPerformance: ProductPerformance;
  paymentAnalytics: {
    byStatus: Record<string, { count: number; amount: number; percentage: number }>;
    byMode: Record<string, { count: number; amount: number; percentage: number }>;
    trends: Array<{
      date: string;
      paidCount: number;
      pendingCount: number;
      failedCount: number;
      totalAmount: number;
    }>;
  };
  orders: EnhancedSNFOrderItem[];
}

/**
 * Fetch comprehensive SNF Orders report data with advanced analytics
 */
export const fetchSNFOrdersReport = async (filters: SNFOrderReportFilters): Promise<SNFOrdersReportData> => {
  try {
    // Fetch all SNF orders with pagination
    let allOrders: any[] = [];
    let currentPage = 1;
    let hasMorePages = true;
    
    while (hasMorePages) {
      const response = await getAllSNFOrders({
        page: currentPage,
        limit: 100, // Fetch in batches
        search: '',
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      
      allOrders = [...allOrders, ...response.orders];
      
      if (currentPage >= response.totalPages) {
        hasMorePages = false;
      } else {
        currentPage++;
      }
    }

    // Apply date filters
    let filteredOrders = allOrders;
    if (filters.startDate || filters.endDate) {
      filteredOrders = allOrders.filter(order => {
        const orderDate = parseISO(order.createdAt);
        
        if (filters.startDate && isBefore(orderDate, parseISO(filters.startDate))) {
          return false;
        }
        
        if (filters.endDate && isAfter(orderDate, parseISO(filters.endDate))) {
          return false;
        }
        
        return true;
      });
    }

    // Apply other filters
    if (filters.paymentStatus) {
      filteredOrders = filteredOrders.filter(order => order.paymentStatus === filters.paymentStatus);
    }

    if (filters.paymentMode) {
      filteredOrders = filteredOrders.filter(order => order.paymentMode === filters.paymentMode);
    }

    if (filters.city) {
      filteredOrders = filteredOrders.filter(order => 
        order.city.toLowerCase().includes(filters.city!.toLowerCase())
      );
    }

    if (filters.depotId) {
      filteredOrders = filteredOrders.filter(order => order.depot?.id === filters.depotId);
    }

    // Fetch detailed order items for selected orders (limited to avoid performance issues)
    const ordersWithDetails = await Promise.all(
      filteredOrders.slice(0, 50).map(async (order) => {
        try {
          const detailedOrder = await getSNFOrderById(order.id);
          return {
            ...order,
            items: detailedOrder.items || [],
            addressLine1: detailedOrder.addressLine1 || '',
            addressLine2: detailedOrder.addressLine2 || '',
            state: detailedOrder.state || '',
            pincode: detailedOrder.pincode || '',
            paymentRefNo: detailedOrder.paymentRefNo || '',
            paymentDate: detailedOrder.paymentDate || ''
          };
        } catch (error) {
          console.error(`Error fetching details for order ${order.id}:`, error);
          return {
            ...order,
            items: [],
            addressLine1: '',
            addressLine2: '',
            state: '',
            pincode: '',
            paymentRefNo: '',
            paymentDate: ''
          };
        }
      })
    );

    // Transform to enhanced format
    const enhancedOrders: EnhancedSNFOrderItem[] = ordersWithDetails.map(order => ({
      id: order.id,
      orderNo: order.orderNo,
      customerName: order.name,
      mobile: order.mobile,
      email: order.email,
      city: order.city,
      state: order.state,
      pincode: order.pincode,
      addressLine1: order.addressLine1,
      addressLine2: order.addressLine2,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      totalAmount: order.totalAmount,
      paymentMode: order.paymentMode,
      paymentStatus: order.paymentStatus,
      paymentRefNo: order.paymentRefNo,
      paymentDate: order.paymentDate,
      invoiceNo: order.invoiceNo,
      orderDate: order.createdAt,
      depot: order.depot,
      items: order.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        variantName: item.variantName,
        price: item.price,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
        imageUrl: item.imageUrl
      }))
    }));

    // Calculate analytics
    const analytics = calculateSNFOrderAnalytics(filteredOrders, enhancedOrders);

    return {
      summary: {
        totalOrders: filteredOrders.length,
        totalCustomers: new Set(filteredOrders.map(o => o.mobile)).size,
        totalAmount: filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0),
        totalQuantity: enhancedOrders.reduce((sum, o) => 
          sum + o.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0),
        avgOrderValue: filteredOrders.length > 0 
          ? filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0) / filteredOrders.length 
          : 0,
        reportPeriod: {
          startDate: filters.startDate || format(new Date(), 'yyyy-MM-dd'),
          endDate: filters.endDate || format(new Date(), 'yyyy-MM-dd')
        }
      },
      ...analytics,
      orders: enhancedOrders
    };

  } catch (error) {
    console.error('Error generating SNF Orders report:', error);
    throw error;
  }
};

/**
 * Calculate comprehensive analytics from SNF orders data
 */
function calculateSNFOrderAnalytics(
  allOrders: any[], 
  enhancedOrders: EnhancedSNFOrderItem[]
): Omit<SNFOrdersReportData, 'summary' | 'orders'> {
  
  // Depot Performance Analysis
  const depotMap = new Map<number, DepotPerformanceStats>();
  const customersByDepot = new Map<number, Set<string>>();
  
  allOrders.forEach(order => {
    const depotId = order.depot?.id || 0;
    const depotName = order.depot?.name || 'No Depot Assigned';
    
    if (!depotMap.has(depotId)) {
      depotMap.set(depotId, {
        depotId,
        depotName,
        totalOrders: 0,
        uniqueCustomers: 0,
        totalAmount: 0,
        totalQuantity: 0,
        avgOrderValue: 0,
        paymentBreakdown: {
          paid: { count: 0, amount: 0 },
          pending: { count: 0, amount: 0 },
          failed: { count: 0, amount: 0 }
        },
        topProducts: [],
        customerRetentionRate: 0,
        monthlyTrend: []
      });
      customersByDepot.set(depotId, new Set());
    }

    const depot = depotMap.get(depotId)!;
    const customers = customersByDepot.get(depotId)!;
    
    depot.totalOrders++;
    depot.totalAmount += order.totalAmount;
    customers.add(order.mobile);
    
    // Payment breakdown
    const status = order.paymentStatus?.toLowerCase() || 'unknown';
    if (status === 'paid') {
      depot.paymentBreakdown.paid.count++;
      depot.paymentBreakdown.paid.amount += order.totalAmount;
    } else if (status === 'pending') {
      depot.paymentBreakdown.pending.count++;
      depot.paymentBreakdown.pending.amount += order.totalAmount;
    } else {
      depot.paymentBreakdown.failed.count++;
      depot.paymentBreakdown.failed.amount += order.totalAmount;
    }
  });

  // Finalize depot stats
  depotMap.forEach((depot, depotId) => {
    const customers = customersByDepot.get(depotId)!;
    depot.uniqueCustomers = customers.size;
    depot.avgOrderValue = depot.totalOrders > 0 ? depot.totalAmount / depot.totalOrders : 0;
    depot.customerRetentionRate = depot.totalOrders > 0 ? (depot.uniqueCustomers / depot.totalOrders) * 100 : 0;
  });

  // Customer Analytics
  const customerMap = new Map<string, {
    name: string;
    mobile: string;
    city: string;
    orders: any[];
    totalSpent: number;
  }>();

  allOrders.forEach(order => {
    if (!customerMap.has(order.mobile)) {
      customerMap.set(order.mobile, {
        name: order.name,
        mobile: order.mobile,
        city: order.city,
        orders: [],
        totalSpent: 0
      });
    }
    
    const customer = customerMap.get(order.mobile)!;
    customer.orders.push(order);
    customer.totalSpent += order.totalAmount;
  });

  const customerAnalytics: CustomerAnalytics = {
    totalCustomers: customerMap.size,
    newCustomers: customerMap.size, // Simplified - would need historical data
    returningCustomers: Array.from(customerMap.values()).filter(c => c.orders.length > 1).length,
    customerRetentionRate: customerMap.size > 0 
      ? (Array.from(customerMap.values()).filter(c => c.orders.length > 1).length / customerMap.size) * 100
      : 0,
    avgOrdersPerCustomer: allOrders.length / Math.max(customerMap.size, 1),
    avgSpendPerCustomer: allOrders.reduce((sum, o) => sum + o.totalAmount, 0) / Math.max(customerMap.size, 1),
    topCustomers: Array.from(customerMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)
      .map(customer => ({
        name: customer.name,
        mobile: customer.mobile,
        city: customer.city,
        orderCount: customer.orders.length,
        totalSpent: customer.totalSpent,
        avgOrderValue: customer.totalSpent / customer.orders.length,
        lastOrderDate: customer.orders.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0]?.createdAt || ''
      })),
    cityDistribution: []
  };

  // City distribution
  const cityMap = new Map<string, {
    customers: Set<string>;
    orders: any[];
    totalAmount: number;
  }>();

  allOrders.forEach(order => {
    if (!cityMap.has(order.city)) {
      cityMap.set(order.city, {
        customers: new Set(),
        orders: [],
        totalAmount: 0
      });
    }
    
    const cityData = cityMap.get(order.city)!;
    cityData.customers.add(order.mobile);
    cityData.orders.push(order);
    cityData.totalAmount += order.totalAmount;
  });

  const totalRevenue = allOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  customerAnalytics.cityDistribution = Array.from(cityMap.entries())
    .map(([city, data]) => ({
      city,
      customerCount: data.customers.size,
      orderCount: data.orders.length,
      totalAmount: data.totalAmount,
      avgOrderValue: data.totalAmount / data.orders.length,
      marketShare: totalRevenue > 0 ? (data.totalAmount / totalRevenue) * 100 : 0
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  // Product Performance Analysis
  const productMap = new Map<string, {
    variantName?: string;
    quantity: number;
    amount: number;
    orderCount: number;
  }>();

  enhancedOrders.forEach(order => {
    order.items.forEach(item => {
      const key = `${item.name}_${item.variantName || 'default'}`;
      
      if (!productMap.has(key)) {
        productMap.set(key, {
          variantName: item.variantName,
          quantity: 0,
          amount: 0,
          orderCount: 0
        });
      }
      
      const product = productMap.get(key)!;
      product.quantity += item.quantity;
      product.amount += item.lineTotal;
      product.orderCount++;
    });
  });

  const totalProductAmount = Array.from(productMap.values()).reduce((sum, p) => sum + p.amount, 0);
  const productPerformance: ProductPerformance = {
    productStats: Array.from(productMap.entries())
      .map(([key, data]) => {
        const productName = key.split('_')[0];
        return {
          productName,
          variantName: data.variantName,
          totalQuantity: data.quantity,
          totalAmount: data.amount,
          orderCount: data.orderCount,
          avgQuantityPerOrder: data.orderCount > 0 ? data.quantity / data.orderCount : 0,
          avgPricePerUnit: data.quantity > 0 ? data.amount / data.quantity : 0,
          revenueShare: totalProductAmount > 0 ? (data.amount / totalProductAmount) * 100 : 0
        };
      })
      .sort((a, b) => b.totalAmount - a.totalAmount),
    categoryStats: [] // Simplified for now
  };

  // Payment Analytics
  const paymentByStatus = new Map<string, { count: number; amount: number }>();
  const paymentByMode = new Map<string, { count: number; amount: number }>();

  allOrders.forEach(order => {
    const status = order.paymentStatus || 'UNKNOWN';
    const mode = order.paymentMode || 'NOT_SPECIFIED';
    
    // By status
    if (!paymentByStatus.has(status)) {
      paymentByStatus.set(status, { count: 0, amount: 0 });
    }
    const statusData = paymentByStatus.get(status)!;
    statusData.count++;
    statusData.amount += order.totalAmount;

    // By mode
    if (!paymentByMode.has(mode)) {
      paymentByMode.set(mode, { count: 0, amount: 0 });
    }
    const modeData = paymentByMode.get(mode)!;
    modeData.count++;
    modeData.amount += order.totalAmount;
  });

  const totalOrders = allOrders.length;
  const paymentAnalytics = {
    byStatus: Object.fromEntries(
      Array.from(paymentByStatus.entries()).map(([status, data]) => [
        status,
        {
          ...data,
          percentage: totalOrders > 0 ? (data.count / totalOrders) * 100 : 0
        }
      ])
    ),
    byMode: Object.fromEntries(
      Array.from(paymentByMode.entries()).map(([mode, data]) => [
        mode,
        {
          ...data,
          percentage: totalOrders > 0 ? (data.count / totalOrders) * 100 : 0
        }
      ])
    ),
    trends: [] // Would require more complex date grouping
  };

  return {
    depotPerformance: Array.from(depotMap.values()),
    customerAnalytics,
    productPerformance,
    paymentAnalytics
  };
}

/**
 * Fetch filter options for the report
 */
export const fetchSNFOrderReportFilters = async () => {
  try {
    const [depotsResponse] = await Promise.all([
      get('/depots')
    ]);

    const depots = depotsResponse?.data || depotsResponse || [];

    return {
      depots: depots.map((depot: any) => ({
        id: depot.id,
        name: depot.name
      })),
      paymentStatuses: [
        { value: 'PAID', label: 'Paid' },
        { value: 'PENDING', label: 'Pending' },
        { value: 'FAILED', label: 'Failed' }
      ],
      paymentModes: [
        { value: 'CASH', label: 'Cash' },
        { value: 'ONLINE', label: 'Online' },
        { value: 'UPI', label: 'UPI' },
        { value: 'BANK', label: 'Bank Transfer' }
      ]
    };
  } catch (error) {
    console.error('Error fetching SNF order report filters:', error);
    return {
      depots: [],
      paymentStatuses: [],
      paymentModes: []
    };
  }
};

/**
 * Export SNF Orders report to CSV format
 */
export const exportSNFOrdersToCSV = (orders: EnhancedSNFOrderItem[], filename?: string) => {
  const headers = [
    'Order No', 'Date', 'Customer Name', 'Mobile', 'Email', 'City', 'State',
    'Pincode', 'Address Line 1', 'Address Line 2', 'Depot', 'Subtotal',
    'Delivery Fee', 'Total Amount', 'Payment Status', 'Payment Mode',
    'Payment Ref', 'Payment Date', 'Invoice No', 'Items Count'
  ];

  const csvData = orders.map(order => [
    order.orderNo,
    format(new Date(order.orderDate), 'dd/MM/yyyy'),
    order.customerName,
    order.mobile,
    order.email || '',
    order.city,
    order.state || '',
    order.pincode,
    order.addressLine1,
    order.addressLine2 || '',
    order.depot?.name || 'N/A',
    order.subtotal.toFixed(2),
    order.deliveryFee.toFixed(2),
    order.totalAmount.toFixed(2),
    order.paymentStatus,
    order.paymentMode || '',
    order.paymentRefNo || '',
    order.paymentDate ? format(new Date(order.paymentDate), 'dd/MM/yyyy') : '',
    order.invoiceNo || '',
    order.items.length
  ]);

  const csvContent = [headers, ...csvData]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename || `SNF_Orders_Report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
