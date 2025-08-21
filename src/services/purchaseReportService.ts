import { get } from './apiService';
import { fetchPurchasePayments, fetchVendorPurchases } from './purchasePaymentService';
import * as XLSX from 'xlsx';

export interface PurchaseReportFilters {
  startDate?: string;
  endDate?: string;
  vendorId?: string;
  depotId?: string;
  status?: 'all' | 'paid' | 'partial' | 'unpaid';
  groupBy?: string;
}

export interface PurchaseSummaryStats {
  totalPurchases: number;
  totalAmount: number;
  totalPaid: number;
  totalOutstanding: number;
  averageOrderValue: number;
  fullyPaidCount: number;
  partiallyPaidCount: number;
  unpaidCount: number;
}

export interface VendorPurchaseSummary {
  vendorId: number;
  vendorName: string;
  totalPurchases: number;
  totalAmount: number;
  totalPaid: number;
  totalOutstanding: number;
  lastPurchaseDate?: string;
  lastPaymentDate?: string;
}

export interface PurchaseReportItem {
  purchaseId: number;
  purchaseNo: string;
  purchaseDate: string;
  invoiceNo: string;
  invoiceDate: string;
  vendorId: number;
  vendorName: string;
  depotId: number;
  depotName: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  paymentCount: number;
  lastPaymentDate?: string;
  products: Array<{
    productName: string;
    variantName: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
}

export interface PurchaseReportResponse {
  summary: PurchaseSummaryStats;
  vendorSummaries: VendorPurchaseSummary[];
  purchases: PurchaseReportItem[];
  totalPages: number;
  currentPage: number;
}

export interface PaymentReportItem {
  paymentId: number;
  paymentNo: string;
  paymentDate: string;
  vendorId: number;
  vendorName: string;
  mode: string;
  referenceNo?: string;
  totalAmount: number;
  purchaseCount: number;
  purchases: Array<{
    purchaseId: number;
    purchaseNo: string;
    invoiceNo: string;
    amount: number;
    purchaseDate: string;
  }>;
}

export interface PaymentReportResponse {
  payments: PaymentReportItem[];
  totalAmount: number;
  totalPages: number;
  currentPage: number;
}

// Helper function to calculate purchase totals
const calculatePurchaseTotal = (purchaseDetails: any[]): number => {
  if (!Array.isArray(purchaseDetails)) return 0;
  return purchaseDetails.reduce((sum, detail) => {
    const rate = parseFloat(detail.purchaseRate || detail.rate || '0');
    const quantity = parseInt(detail.quantity || '0');
    return sum + (rate * quantity);
  }, 0);
};

// Helper function to determine payment status
const getPaymentStatus = (totalAmount: number, paidAmount: number): 'paid' | 'partial' | 'unpaid' => {
  if (paidAmount === 0) return 'unpaid';
  if (paidAmount >= totalAmount) return 'paid';
  return 'partial';
};

// Purchase Report Services using existing endpoints
export const fetchPurchaseReport = async (filters: PurchaseReportFilters & { page?: number; limit?: number }) => {
  try {
    // Build query parameters for purchases endpoint
    let purchaseUrl = `/purchases?page=${filters.page || 1}&limit=${filters.limit || 20}`;
    if (filters.vendorId) purchaseUrl += `&vendorId=${filters.vendorId}`;
    if (filters.startDate) purchaseUrl += `&startDate=${filters.startDate}`;
    if (filters.endDate) purchaseUrl += `&endDate=${filters.endDate}`;
    
    // Fetch purchases using existing endpoint
    const purchasesResponse = await get(purchaseUrl);
    const purchases = purchasesResponse?.data || [];
    const totalPages = purchasesResponse?.totalPages || 1;
    
    // Fetch all payments to calculate paid amounts
    const paymentsResponse = await fetchPurchasePayments({ limit: 1000 });
    const allPayments = paymentsResponse?.payments || paymentsResponse?.data || [];
    
    // Fetch product and variant data for name resolution
    const [productsResponse, variantsResponse] = await Promise.all([
      get('/products?limit=1000'),
      get('/depot-product-variants?limit=1000')
    ]);
    
    const allProducts = productsResponse?.data || productsResponse || [];
    const allVariants = variantsResponse?.data || variantsResponse || [];
    
    // Create lookup maps for product and variant names
    const productMap = new Map();
    const variantMap = new Map();
    const variantToProductNameMap = new Map();
    
    allProducts.forEach((product: any) => {
      productMap.set(product.id, product.name);
    });
    
    allVariants.forEach((variant: any) => {
      variantMap.set(variant.id, variant.name);
      // Depot variants may include productName or productId for lookup
      if (variant.productName) {
        variantToProductNameMap.set(variant.id, variant.productName);
      } else if (variant.productId && productMap.has(variant.productId)) {
        variantToProductNameMap.set(variant.id, productMap.get(variant.productId));
      }
    });
    
    // Create a map of purchase ID to payment info
    const purchasePaymentMap = new Map();
    allPayments.forEach((payment: any) => {
      if (payment.details && Array.isArray(payment.details)) {
        payment.details.forEach((detail: any) => {
          const purchaseId = detail.purchase?.id || detail.purchaseId;
          if (purchaseId) {
            if (!purchasePaymentMap.has(purchaseId)) {
              purchasePaymentMap.set(purchaseId, {
                totalPaid: 0,
                paymentCount: 0,
                lastPaymentDate: null
              });
            }
            const existing = purchasePaymentMap.get(purchaseId);
            existing.totalPaid += parseFloat(detail.amount || '0');
            existing.paymentCount += 1;
            
            const paymentDate = new Date(payment.paymentDate);
            if (!existing.lastPaymentDate || paymentDate > existing.lastPaymentDate) {
              existing.lastPaymentDate = paymentDate;
            }
          }
        });
      }
    });
    
    // Transform purchases data
    const transformedPurchases: PurchaseReportItem[] = purchases.map((purchase: any) => {
      const totalAmount = calculatePurchaseTotal(purchase.purchaseDetails || []);
      const paymentInfo = purchasePaymentMap.get(purchase.id) || { totalPaid: 0, paymentCount: 0, lastPaymentDate: null };
      const paidAmount = paymentInfo.totalPaid;
      const outstandingAmount = Math.max(0, totalAmount - paidAmount);
      
      return {
        purchaseId: purchase.id,
        purchaseNo: purchase.purchaseNo || '',
        purchaseDate: purchase.purchaseDate,
        invoiceNo: purchase.invoiceNo || '',
        invoiceDate: purchase.invoiceDate || purchase.purchaseDate,
        vendorId: purchase.vendor?.id || 0,
        vendorName: purchase.vendor?.name || '',
        depotId: purchase.depot?.id || 0,
        depotName: purchase.depot?.name || '',
        totalAmount,
        paidAmount,
        outstandingAmount,
        paymentStatus: getPaymentStatus(totalAmount, paidAmount),
        paymentCount: paymentInfo.paymentCount,
        lastPaymentDate: paymentInfo.lastPaymentDate?.toISOString(),
        products: (purchase.purchaseDetails || []).map((detail: any) => ({
          productName: variantToProductNameMap.get(detail.variantId) || productMap.get(detail.productId) || detail.product?.name || 'Unknown Product',
          variantName: variantMap.get(detail.variantId) || detail.variant?.name || 'Unknown Variant',
          quantity: parseInt(detail.quantity || '0'),
          rate: parseFloat(detail.purchaseRate || detail.rate || '0'),
          amount: parseFloat(detail.purchaseRate || detail.rate || '0') * parseInt(detail.quantity || '0')
        }))
      };
    });
    
    // Filter by payment status if specified
    let filteredPurchases = transformedPurchases;
    if (filters.status && filters.status !== 'all') {
      filteredPurchases = transformedPurchases.filter(p => p.paymentStatus === filters.status);
    }
    
    // Calculate summary statistics
    const summary: PurchaseSummaryStats = {
      totalPurchases: filteredPurchases.length,
      totalAmount: filteredPurchases.reduce((sum, p) => sum + p.totalAmount, 0),
      totalPaid: filteredPurchases.reduce((sum, p) => sum + p.paidAmount, 0),
      totalOutstanding: filteredPurchases.reduce((sum, p) => sum + p.outstandingAmount, 0),
      averageOrderValue: filteredPurchases.length > 0 ? Math.round(filteredPurchases.reduce((sum, p) => sum + p.totalAmount, 0) / filteredPurchases.length) : 0,
      fullyPaidCount: filteredPurchases.filter(p => p.paymentStatus === 'paid').length,
      partiallyPaidCount: filteredPurchases.filter(p => p.paymentStatus === 'partial').length,
      unpaidCount: filteredPurchases.filter(p => p.paymentStatus === 'unpaid').length
    };
    
    return {
      summary,
      vendorSummaries: [], // Will be populated by separate function
      purchases: filteredPurchases,
      totalPages,
      currentPage: filters.page || 1
    } as PurchaseReportResponse;
    
  } catch (error) {
    console.error('Error fetching purchase report:', error);
    throw error;
  }
};

export const fetchVendorPurchaseSummary = async (filters: Pick<PurchaseReportFilters, 'startDate' | 'endDate' | 'vendorId'>) => {
  try {
    // Build query for purchases
    let purchaseUrl = '/purchases?limit=1000';
    if (filters.vendorId) purchaseUrl += `&vendorId=${filters.vendorId}`;
    if (filters.startDate) purchaseUrl += `&startDate=${filters.startDate}`;
    if (filters.endDate) purchaseUrl += `&endDate=${filters.endDate}`;
    
    const purchasesResponse = await get(purchaseUrl);
    const purchases = purchasesResponse?.data || [];
    
    // Fetch payments
    const paymentsResponse = await fetchPurchasePayments({ limit: 1000 });
    const allPayments = paymentsResponse?.payments || paymentsResponse?.data || [];
    
    // Group by vendor
    const vendorMap = new Map<number, {
      vendorName: string;
      totalPurchases: number;
      totalAmount: number;
      totalPaid: number;
      lastPurchaseDate?: string;
      lastPaymentDate?: string;
    }>();
    
    // Process purchases
    purchases.forEach((purchase: any) => {
      const vendorId = purchase.vendor?.id;
      if (!vendorId) return;
      
      if (!vendorMap.has(vendorId)) {
        vendorMap.set(vendorId, {
          vendorName: purchase.vendor.name,
          totalPurchases: 0,
          totalAmount: 0,
          totalPaid: 0,
          lastPurchaseDate: purchase.purchaseDate
        });
      }
      
      const vendor = vendorMap.get(vendorId)!;
      vendor.totalPurchases += 1;
      vendor.totalAmount += calculatePurchaseTotal(purchase.purchaseDetails || []);
      
      if (!vendor.lastPurchaseDate || purchase.purchaseDate > vendor.lastPurchaseDate) {
        vendor.lastPurchaseDate = purchase.purchaseDate;
      }
    });
    
    // Process payments
    allPayments.forEach((payment: any) => {
      const vendorId = payment.vendor?.id;
      if (!vendorId || !vendorMap.has(vendorId)) return;
      
      const vendor = vendorMap.get(vendorId)!;
      vendor.totalPaid += parseFloat(payment.totalAmount || '0');
      
      if (!vendor.lastPaymentDate || payment.paymentDate > vendor.lastPaymentDate) {
        vendor.lastPaymentDate = payment.paymentDate;
      }
    });
    
    // Convert to array format
    const vendorSummaries: VendorPurchaseSummary[] = Array.from(vendorMap.entries()).map(([vendorId, data]) => ({
      vendorId,
      vendorName: data.vendorName,
      totalPurchases: data.totalPurchases,
      totalAmount: data.totalAmount,
      totalPaid: data.totalPaid,
      totalOutstanding: Math.max(0, data.totalAmount - data.totalPaid),
      lastPurchaseDate: data.lastPurchaseDate,
      lastPaymentDate: data.lastPaymentDate
    }));
    
    return vendorSummaries;
  } catch (error) {
    console.error('Error fetching vendor purchase summary:', error);
    return [];
  }
};

export const fetchPaymentReport = async (filters: Pick<PurchaseReportFilters, 'startDate' | 'endDate' | 'vendorId'> & { page?: number; limit?: number }) => {
  try {
    // Use existing fetchPurchasePayments function
    const params: any = {
      page: filters.page || 1,
      limit: filters.limit || 20
    };
    
    if (filters.vendorId) params.vendorId = filters.vendorId;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    
    const paymentsResponse = await fetchPurchasePayments(params);
    const payments = paymentsResponse?.payments || paymentsResponse?.data || [];
    
    // Transform payment data
    const transformedPayments: PaymentReportItem[] = payments.map((payment: any) => ({
      paymentId: payment.id,
      paymentNo: payment.paymentno || '',
      paymentDate: payment.paymentDate,
      vendorId: payment.vendor?.id || 0,
      vendorName: payment.vendor?.name || '',
      mode: payment.mode,
      referenceNo: payment.referenceNo,
      totalAmount: parseFloat(payment.totalAmount || '0'),
      purchaseCount: payment.details?.length || 0,
      purchases: (payment.details || []).map((detail: any) => ({
        purchaseId: detail.purchase?.id || 0,
        purchaseNo: detail.purchase?.purchaseNo || '',
        invoiceNo: detail.purchase?.invoiceNo || '',
        amount: parseFloat(detail.amount || '0'),
        purchaseDate: detail.purchase?.purchaseDate || ''
      }))
    }));
    
    return {
      payments: transformedPayments,
      totalAmount: transformedPayments.reduce((sum, p) => sum + p.totalAmount, 0),
      totalPages: paymentsResponse?.totalPages || 1,
      currentPage: filters.page || 1
    } as PaymentReportResponse;
    
  } catch (error) {
    console.error('Error fetching payment report:', error);
    return {
      payments: [],
      totalAmount: 0,
      totalPages: 1,
      currentPage: 1
    } as PaymentReportResponse;
  }
};

// Utility: apply number and date formats, autofilter, widths, and totals
function applySheetFormatting(ws: XLSX.WorkSheet, options: {
  headerRow: number;
  dateCols?: number[];           // 1-indexed column numbers with dates
  currencyCols?: number[];       // 1-indexed column numbers with currency
  integerCols?: number[];        // 1-indexed column numbers with integers
  percentCols?: number[];        // 1-indexed column numbers with percentage (0..1 values)
  columnWidths?: number[];       // per-column width
  addTotalsRow?: { labelCol: number; label: string; sumCols: number[] };
}) {
  const ref = ws['!ref'];
  if (!ref) return;
  const range = XLSX.utils.decode_range(ref);

  // Autofilter on header row
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ r: options.headerRow - 1, c: range.s.c }, range.e) } as any;

  // Column widths
  if (options.columnWidths) {
    ws['!cols'] = options.columnWidths.map(w => ({ width: w }));
  }

  // Iterate through cells and apply number formats
  for (let C = range.s.c; C <= range.e.c; ++C) {
    for (let R = options.headerRow; R <= range.e.r; ++R) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell: any = ws[addr];
      if (!cell) continue;
      
      // Skip header row formatting
      if (R === options.headerRow - 1) continue;

      const colIndex = C + 1; // 1-indexed for easier mapping

      // Dates
      if (options.dateCols?.includes(colIndex)) {
        // Convert string to date if needed
        const val = cell.v;
        
        // Skip if value is null, undefined, empty string, or epoch
        if (!val || val === '' || val === 0 || (val instanceof Date && val.getTime() === 0)) {
          cell.v = '';
          cell.t = 's';
          continue;
        }
        
        const date = val instanceof Date ? val : new Date(val);
        
        // Check if it's a valid date and not epoch (1970-01-01)
        if (!isNaN(date.getTime()) && date.getFullYear() > 1970) {
          cell.v = date;
          cell.t = 'd';
          cell.z = 'dd/mm/yyyy';
        } else {
          // Invalid date, show as empty
          cell.v = '';
          cell.t = 's';
        }
      }

      // Currency numbers
      if (options.currencyCols?.includes(colIndex)) {
        const num = typeof cell.v === 'number' ? cell.v : parseFloat(cell.v || '0');
        cell.v = isNaN(num) ? 0 : num;
        cell.t = 'n';
        cell.z = '#,##0.00';
      }

      // Integer numbers
      if (options.integerCols?.includes(colIndex)) {
        const num = typeof cell.v === 'number' ? cell.v : parseInt(cell.v || '0', 10);
        cell.v = isNaN(num) ? 0 : num;
        cell.t = 'n';
        cell.z = '0';
      }

      // Percentage numbers
      if (options.percentCols?.includes(colIndex)) {
        const num = typeof cell.v === 'number' ? cell.v : parseFloat((cell.v || '0').toString().replace('%',''))/100;
        cell.v = isNaN(num) ? 0 : num;
        cell.t = 'n';
        cell.z = '0.0%';
      }
    }
  }

  // Totals row with SUM formulas
  if (options.addTotalsRow) {
    const lastRow = range.e.r + 2; // 1-indexed row number for next row (since range.e.r is 0-indexed)
    const startRow = options.headerRow + 1;
    // Add label in labelCol
    const labelCell = XLSX.utils.encode_cell({ r: lastRow - 1, c: options.addTotalsRow.labelCol - 1 });
    ws[labelCell] = { t: 's', v: options.addTotalsRow.label } as any;

    // Add SUM formulas for specified columns
    options.addTotalsRow.sumCols.forEach(col => {
      const colLetter = XLSX.utils.encode_col(col - 1);
      const target = XLSX.utils.encode_cell({ r: lastRow - 1, c: col - 1 });
      ws[target] = {
        t: 'n',
        f: `SUM(${colLetter}${startRow}:${colLetter}${range.e.r + 1})`,
      } as any;
    });

    // Extend the range
    const newRange = { s: range.s, e: { r: lastRow - 1, c: range.e.c } };
    ws['!ref'] = XLSX.utils.encode_range(newRange);
  }
}

// Comprehensive Excel and CSV export function
export const exportPurchaseReport = async (filters: PurchaseReportFilters, format: 'excel' | 'csv' = 'excel') => {
  try {
    // Fetch all data for export (remove pagination for complete export)
    const [reportData, vendorSummaries, paymentData] = await Promise.all([
      fetchPurchaseReport({ ...filters, page: 1, limit: 10000 }),
      fetchVendorPurchaseSummary(filters),
      fetchPaymentReport({ ...filters, page: 1, limit: 10000 })
    ]);
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const dateRange = filters.startDate && filters.endDate 
      ? `_${filters.startDate}_to_${filters.endDate}`
      : '';
    
    if (format === 'excel') {
      // Create a single-sheet Excel workbook
      const workbook = XLSX.utils.book_new();
      const wsData: any[][] = [];

      // Title and filters
      wsData.push(['Purchase Report']);
      wsData.push(['Report Date:', new Date()]);
      wsData.push(['Date Range:', filters.startDate || 'All', 'to', filters.endDate || 'All']);
      wsData.push(['Vendor Filter:', filters.vendorId ? `Vendor ID: ${filters.vendorId}` : 'All Vendors']);
      wsData.push(['Status Filter:', filters.status || 'All Status']);
      wsData.push([]);

      // Summary metrics
      wsData.push(['Summary']);
      wsData.push(['Metric', 'Value']);
      wsData.push(['Total Purchases', reportData.summary.totalPurchases]);
      wsData.push(['Total Amount', reportData.summary.totalAmount]);
      wsData.push(['Amount Paid', reportData.summary.totalPaid]);
      wsData.push(['Outstanding Amount', reportData.summary.totalOutstanding]);
      wsData.push(['Average Order Value', reportData.summary.averageOrderValue]);
      wsData.push(['Fully Paid Purchases', reportData.summary.fullyPaidCount]);
      wsData.push(['Partially Paid Purchases', reportData.summary.partiallyPaidCount]);
      wsData.push(['Unpaid Purchases', reportData.summary.unpaidCount]);
      wsData.push([]);

      // Section: Purchase Details
      wsData.push(['Purchase Details']);
      const purchaseHeaderRow = wsData.length + 1;
      const purchaseHeaders = [
        'Purchase No','Purchase Date','Vendor Name','Invoice No','Invoice Date','Depot Name','Total Amount','Paid Amount','Outstanding Amount','Payment Status','Payment Count'
      ];
      wsData.push(purchaseHeaders);
      const purchaseStartDataRow = wsData.length + 1;
      reportData.purchases.forEach(purchase => {
        wsData.push([
          purchase.purchaseNo,
          purchase.purchaseDate ? new Date(purchase.purchaseDate) : '',
          purchase.vendorName,
          purchase.invoiceNo,
          purchase.invoiceDate ? new Date(purchase.invoiceDate) : '',
          purchase.depotName,
          purchase.totalAmount,
          purchase.paidAmount,
          purchase.outstandingAmount,
          purchase.paymentStatus.toUpperCase(),
          purchase.paymentCount
        ]);
      });
      const purchaseEndDataRow = wsData.length; // last data row for purchases
      // Totals row for purchases (11 columns to match headers)
      wsData.push(['', '', '', '', 'TOTALS', '', { f: `SUM(G${purchaseStartDataRow}:G${purchaseEndDataRow})` }, { f: `SUM(H${purchaseStartDataRow}:H${purchaseEndDataRow})` }, { f: `SUM(I${purchaseStartDataRow}:I${purchaseEndDataRow})` }, '', '']);
      wsData.push([]);

      // Section: Purchase Items
      wsData.push(['Purchase Items']);
      const itemHeaderRow = wsData.length + 1;
      const itemHeaders = ['Purchase No','Vendor Name','Product Name','Variant Name','Quantity','Rate','Amount'];
      wsData.push(itemHeaders);
      const itemStartDataRow = wsData.length + 1;
      reportData.purchases.forEach(purchase => {
        purchase.products.forEach(product => {
          wsData.push([
            purchase.purchaseNo,
            purchase.vendorName,
            product.productName,
            product.variantName,
            product.quantity,
            product.rate,
            product.amount
          ]);
        });
      });
      const itemEndDataRow = wsData.length;
      // Totals row for items (7 columns to match headers)
      wsData.push(['', '', '', 'TOTALS', { f: `SUM(E${itemStartDataRow}:E${itemEndDataRow})` }, '', { f: `SUM(G${itemStartDataRow}:G${itemEndDataRow})` }]);
      wsData.push([]);

      // Section: Payment History
      if (paymentData.payments.length > 0) {
        wsData.push(['Payment History']);
        const payHeaderRow = wsData.length + 1;
        const payHeaders = ['Payment No','Payment Date','Vendor Name','Mode','Reference No','Total Amount','Purchase Count',];
        wsData.push(payHeaders);
        const payStartDataRow = wsData.length + 1;
        paymentData.payments.forEach(payment => {
          wsData.push([
            payment.paymentNo,
            payment.paymentDate ? new Date(payment.paymentDate) : '',
            payment.vendorName,
            payment.mode,
            payment.referenceNo || '',
            payment.totalAmount,
            payment.purchaseCount,
            // payment.purchases.map(p => `${p.purchaseNo} (${p.amount})`).join('; ')
          ]);
        });
        const payEndDataRow = wsData.length;
        // Totals row for payments (8 columns to match headers)
        wsData.push(['', '', '', '', 'TOTALS', { f: `SUM(F${payStartDataRow}:F${payEndDataRow})` }, { f: `SUM(G${payStartDataRow}:G${payEndDataRow})` }, '']);
        wsData.push([]);
      }

      // Section: Vendor Summary
      if (vendorSummaries.length > 0) {
        wsData.push(['Vendor Summary']);
        const vendHeaderRow = wsData.length + 1;
        const vendHeaders = ['Vendor Name','Total Purchases','Total Amount','Amount Paid','Outstanding Amount'];
        wsData.push(vendHeaders);
        const vendStartDataRow = wsData.length + 1;
        vendorSummaries.forEach(vendor => {
          wsData.push([
            vendor.vendorName,
            vendor.totalPurchases,
            vendor.totalAmount,
            vendor.totalPaid,
            vendor.totalOutstanding
          ]);
        });
        const vendEndDataRow = wsData.length;
        // Totals row for vendor summary (5 columns to match headers)
        wsData.push(['TOTALS', { f: `SUM(B${vendStartDataRow}:B${vendEndDataRow})` }, { f: `SUM(C${vendStartDataRow}:C${vendEndDataRow})` }, { f: `SUM(D${vendStartDataRow}:D${vendEndDataRow})` }, { f: `SUM(E${vendStartDataRow}:E${vendEndDataRow})` }]);
        wsData.push([]);
      }

      // Build sheet
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Apply basic column widths only to avoid header corruption
      ws['!cols'] = [
        { width: 16 }, { width: 14 }, { width: 24 }, { width: 14 }, { width: 14 }, 
        { width: 18 }, { width: 14 }, { width: 14 }, { width: 16 }, { width: 14 }, 
        { width: 14 }, { width: 16 }, { width: 24 }, { width: 24 }, { width: 18 }, 
        { width: 10 }, { width: 12 }, { width: 14 }, { width: 40 }
      ];

      XLSX.utils.book_append_sheet(workbook, ws, 'Purchase Report');

      // Save
      XLSX.writeFile(workbook, `Purchase_Report${dateRange}_${timestamp}.xlsx`);

    } else {
      // CSV Export
      const csvHeaders = [
        'Purchase No',
        'Date',
        'Vendor',
        'Invoice No',
        'Total Amount',
        'Paid Amount', 
        'Outstanding',
        'Status',
        'Payment Count',
        'Last Payment Date'
      ];
      
      const csvRows = reportData.purchases.map(purchase => [
        purchase.purchaseNo,
        purchase.purchaseDate ? new Date(purchase.purchaseDate).toLocaleDateString() : '',
        purchase.vendorName,
        purchase.invoiceNo,
        purchase.totalAmount.toFixed(2),
        purchase.paidAmount.toFixed(2),
        purchase.outstandingAmount.toFixed(2),
        purchase.paymentStatus,
        purchase.paymentCount,
        purchase.lastPaymentDate ? new Date(purchase.lastPaymentDate).toLocaleDateString() : ''
      ]);
      
      // Convert to CSV format
      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Purchase_Report${dateRange}_${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    }
    
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
};
