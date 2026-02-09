// Report configuration types
export interface ReportConfig {
  name: string;
  endpoint: string;
  filters: FilterConfig[];
  columns: ColumnConfig[];
  groupBy?: string[];
  exportEnabled: boolean;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'date-range' | 'select' | 'multi-select' | 'text';
  required?: boolean;
  options?: FilterOption[];
}

export interface FilterOption {
  value: string | number;
  label: string;
}

export interface ColumnConfig {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'currency';
  format?: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
}

// Purchase Order Report specific types
export interface PurchaseOrderFilters {
  startDate?: string;
  endDate?: string;
  farmerId?: number;
  depotId?: number;
  variantId?: number;
  productId?: number;
  agencyId?: number;
  status?: string;
  groupBy?: string;
}

export interface PurchaseOrderItem {
  purchaseId: number;
  purchaseNo: string;
  purchaseDate: string;
  deliveryDate?: string;
  status: string;
  
  // Farmer/Vendor info
  farmerId: number;
  farmerName: string;
  isDairySupplier?: boolean;
  
  // Depot info
  depotId: number;
  depotName: string;
  depotCity?: string;
  depotAddress?: string;
  
  // Product/Variant info
  productId: number;
  productName: string;
  productCategory?: number;
  variantId: number;
  variantName: string;
  variantMrp?: number;
  
  // Quantities and amounts
  quantity: number;
  deliveredQuantity?: number;
  receivedQuantity?: number;
  supervisorQuantity?: number;
  purchaseRate: number;
  amount: number;
  
  // Agency info
  agencyId?: number;
  agencyName?: string;
  
  // Delivery info
  deliveredBy?: string;
  receivedBy?: string;
  
  // Registered wastage data
  farmerWastage?: number;
  farmerNotReceived?: number;
  agencyWastage?: number;
  agencyNotReceived?: number;
  wastageRegisteredAt?: string;
}

export interface GroupTotals {
  totalQuantity: number;
  totalAmount: number;
  itemCount: number;
  avgRate: number;
}

export interface GroupedData {
  level: 'farmer' | 'depot' | 'variant';
  id: string | number;
  name: string;
  location?: string;
  productName?: string;
  unit?: string;
  data: GroupedData[] | PurchaseOrderItem[];
  totals: GroupTotals;
}

export interface ReportTotals {
  totalPurchases: number;
  totalItems: number;
  totalQuantity: number;
  totalAmount: number;
  avgPurchaseValue: number;
}

export interface PurchaseOrderReportResponse {
  success: boolean;
  data: {
    report: GroupedData[] | PurchaseOrderItem[];
    totals: ReportTotals;
    filters: PurchaseOrderFilters;
    recordCount: number;
  };
}

export interface ReportFiltersResponse {
  success: boolean;
  data: {
    farmers: Array<{ id: number; name: string }>;
    depots: Array<{ id: number; name: string; location?: string }>;
    products: Array<{ id: number; name: string; category?: string }>;
    variants: Array<{ id: number; name: string; unit?: string }>;
  };
}

// Excel export types
export interface ExcelExportConfig {
  fileName: string;
  sheetName: string;
  headers: ExcelHeader[];
  includeTitle?: boolean;
  grouping?: {
    enabled: boolean;
    levels: string[];
    showTotals: boolean;
  };
}

export interface ExcelHeader {
  key: string;
  label: string;
  width?: number;
  style?: ExcelCellStyle;
  align?: 'left' | 'center' | 'right';
}

export interface ExcelCellStyle {
  bold?: boolean;
  fontSize?: number;
  backgroundColor?: string;
  color?: string;
  alignment?: 'left' | 'center' | 'right';
  border?: boolean;
}

// Delivery Agencies Report specific types
export interface DeliveryAgencyFilters {
  startDate?: string;
  endDate?: string;
  agencyId?: number;
  areaId?: number;
  status?: string;
  groupBy?: string;
}

export interface DeliveryItem {
  orderId: string;
  deliveryDate: string;
  status: string;
  
  // Product info
  productId: number;
  productName: string;
  variantId: number;
  variantName: string;
  quantity: number;
  amount: number;
  
  // Customer info
  customerId: number;
  customerName: string;
  deliveryAddress: string;
  pincode?: string;
  
  // Area info
  areaId: number;
  areaName: string;
  city?: string;
  
  // Agency info
  agencyId?: number;
  agencyName?: string;
  deliveredBy?: string;
  deliveryTime?: string;

  // Depot info
  depotId?: number;
  depotName?: string;
}

export interface DeliveryGroupTotals {
  totalQuantity: number;
  totalAmount: number;
  itemCount: number;
  deliveredCount: number;
  pendingCount: number;
  avgDeliveryTime?: number;
}

export interface DeliveryGroupedData {
  level: 'agency' | 'area' | 'variant' | 'status';
  id: string | number;
  name: string;
  city?: string;
  productName?: string;
  variantName?: string;
  data: DeliveryGroupedData[] | DeliveryItem[];
  totals: DeliveryGroupTotals;
}

export interface DeliveryReportTotals {
  totalDeliveries: number;
  totalItems: number;
  totalQuantity: number;
  totalAmount: number;
  deliveredCount: number;
  pendingCount: number;
  avgDeliveryValue: number;
}

export interface DeliveryAgencyReportResponse {
  success: boolean;
  data: {
    report: DeliveryGroupedData[] | DeliveryItem[];
    totals: DeliveryReportTotals;
    filters: DeliveryAgencyFilters;
    recordCount: number;
  };
}

export interface DeliveryAgencyFiltersResponse {
  success: boolean;
  data: {
    agencies: Array<{ id: number; name: string }>;
    areas: Array<{ id: number; name: string; city?: string }>;
  };
}

// Delivery Summaries Report Types
export interface DeliverySummaryFilters {
  startDate: string;
  endDate: string;
  agencyId?: number;
}

export interface DeliveryAgencySummary {
  id: number | string;
  agencyId?: number | string;
  name: string;
  city?: string;
  variantId?: number | string;
  variantName?: string;
  statusCounts: Record<string, number>;
  totalCount: number;
}

export interface DeliverySummaryTotals {
  totalDeliveries: number;
  totalAgencies: number;
  statusTotals: Record<string, number>;
}

export interface DeliverySummaryResponse {
  success: boolean;
  data: {
    summary: DeliveryAgencySummary[];
    statusList: string[];
    totals: DeliverySummaryTotals;
    filters: DeliverySummaryFilters;
    recordCount: number;
  };
}

export interface ExceptionReportFilters {
  startDate?: string;
  endDate?: string;
  name?: string;
}

export interface ExceptionReportRow {
  exceptionType?: string;
  date: string;
  customerId: string | number;
  customerName?: string;
  address: string;
  pincode: string;
  depotName: string;
  subFromDate: string;
  subToDate: string;
  mobileNumber: string;
  lastVariant: string;
  newVariant: string;
}

export interface ExceptionReportResponse {
  success: boolean;
  data: {
    report: ExceptionReportRow[];
    variantChanges?: ExceptionReportRow[];
    stoppedSubscriptions?: ExceptionReportRow[];
    newCustomers?: ExceptionReportRow[];
    counts?: {
      variantChanges: number;
      stoppedSubscriptions: number;
      newCustomers: number;
    };
    filters: ExceptionReportFilters;
    recordCount: number;
  };
}

// Subscription Reports Types
export interface SubscriptionReportFilters {
  startDate?: string;
  endDate?: string;
  name?: string;
  status?: 'expired' | 'not_expired' | 'all';
  paymentStatus?: string;
  agencyId?: number;
  productId?: number;
  memberId?: number;
  page?: number;
  limit?: number;
}

export interface SubscriptionReportItem {
  id: number;
  memberId: number;
  memberName: string;
  memberEmail: string;
  memberMobile: string;
  memberActive?: boolean;
  productName: string;
  variantName: string;
  deliverySchedule: string;
  weekdays?: string | null;
  // Updated quantity fields
  dailyQty: number;
  alternateQty?: number | null;
  totalQty: number;
  rate: number;
  amount: number;
  walletamt: number;
  payableamt: number;
  receivedamt: number;
  paymentStatus: string;
  paymentMode?: string | null;
  paymentReferenceNo?: string | null;
  paymentDate?: string | null;
  startDate: string;
  expiryDate?: string | null;
  isExpired: boolean;
  // Enhanced agency assignment details
  agencyId?: number | null;
  agencyName: string;
  agencyCity: string;
  agencyAssigned: boolean;
  deliveryAddress: {
    recipientName: string;
    mobile: string;
    fullAddress: string;
  } | null;
  deliveryInstructions?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionReportStatistics {
  byPaymentStatus: Record<string, {
    count: number;
    totalAmount: number;
    totalReceived: number;
    totalPayable: number;
  }>;
  expiredCount: number;
  activeCount: number;
}

export interface SubscriptionReportSummary {
  totalSubscriptions: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  statistics: SubscriptionReportStatistics;
}

export interface SubscriptionReportResponse {
  success: boolean;
  data: SubscriptionReportItem[];
  summary: SubscriptionReportSummary;
  filters: SubscriptionReportFilters;
}
