import * as XLSX from 'xlsx';
import { GroupedData, PurchaseOrderItem, DeliveryGroupedData, DeliveryItem, ExcelExportConfig } from '../types';

interface ExportData {
  data: GroupedData[] | PurchaseOrderItem[] | DeliveryGroupedData[] | DeliveryItem[];
  totals?: any;
  config: ExcelExportConfig;
}

export class ExcelExporter {
  private workbook: XLSX.WorkBook;
  private worksheet: XLSX.WorkSheet;
  private currentRow: number;
  private indentLevel: number;

  constructor() {
    this.workbook = XLSX.utils.book_new();
    this.worksheet = {};
    this.currentRow = 1;
    this.indentLevel = 0;
  }

  /**
   * Export data to Excel with grouping support
   */
  exportToExcel(exportData: ExportData): void {
    const { data, totals, config } = exportData;
    
    // Initialize worksheet
    this.worksheet = {};
    this.currentRow = 1;
    
    // Add title
    this.addTitle(config.fileName);
    
    // Add headers
    this.addHeaders(config.headers);

    // Prepare columns and store header keys before writing any data
    this.applyColumnWidths(config.headers);
    
    // Process data based on grouping
    if (config.grouping?.enabled && this.isGroupedData(data)) {
      this.processGroupedData(data as GroupedData[] | DeliveryGroupedData[], config);
    } else {
      this.processFlatData(data as PurchaseOrderItem[] | DeliveryItem[], config);
    }
    
    // Add grand totals if provided
    if (totals && config.grouping?.showTotals) {
      this.addGrandTotals(totals);
    }
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(this.workbook, this.worksheet, config.sheetName);
    
    // Generate and download file
    this.downloadExcel(config.fileName);
  }

  /**
   * Add title row
   */
  private addTitle(title: string): void {
    const cell = `A${this.currentRow}`;
    this.worksheet[cell] = {
      v: title,
      s: {
        font: { bold: true, sz: 16 },
        alignment: { horizontal: 'center' }
      }
    };
    
    // Merge cells for title
    if (!this.worksheet['!merges']) {
      this.worksheet['!merges'] = [];
    }
    this.worksheet['!merges'].push({
      s: { r: this.currentRow - 1, c: 0 },
      e: { r: this.currentRow - 1, c: 10 }
    });
    
    this.currentRow += 2; // Skip a row after title
  }

  /**
   * Add header row
   */
  private addHeaders(headers: any[]): void {
    headers.forEach((header, index) => {
      const cell = XLSX.utils.encode_cell({ r: this.currentRow - 1, c: index });
      this.worksheet[cell] = {
        v: header.label,
        s: {
          font: { bold: true },
          fill: { fgColor: { rgb: 'E0E0E0' } },
          alignment: { horizontal: header.align || 'left' },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          }
        }
      };
    });
    this.currentRow++;
  }

  /**
   * Process grouped data recursively
   */
  private processGroupedData(groups: (GroupedData | DeliveryGroupedData)[], config: ExcelExportConfig): void {
    groups.forEach(group => {
      // Add group header
      this.addGroupHeader(group);
      
      // Process group data
      if (Array.isArray(group.data)) {
        this.indentLevel++;
        
        if (this.isGroupedData(group.data)) {
          // Nested groups
          this.processGroupedData(group.data as (GroupedData | DeliveryGroupedData)[], config);
        } else {
          // Leaf data
          this.processFlatData(group.data as (PurchaseOrderItem | DeliveryItem)[], config);
        }
        
        this.indentLevel--;
      }
      
      // Add group totals
      if (config.grouping?.showTotals && group.totals) {
        this.addGroupTotals(group);
      }
      
      // Add separator row
      this.currentRow++;
    });
  }

  /**
   * Add group header row
   */
  private addGroupHeader(group: GroupedData | DeliveryGroupedData): void {
    const indent = '  '.repeat(this.indentLevel);
    const headerText = this.getGroupHeaderText(group);
    const headerKeys: string[] = (this as any).headerKeys || [];
    const totalCols = Math.max(headerKeys.length, 11);

    // Group headers span full width starting from first column
    const cell = XLSX.utils.encode_cell({ r: this.currentRow - 1, c: 0 });
    this.worksheet[cell] = {
      v: `${indent}${headerText}`,
      s: {
        font: { bold: true, sz: 12 },
        fill: { fgColor: { rgb: this.getGroupColor(group.level) } }
      }
    };

    // Merge cells for full-width group header
    if (!this.worksheet['!merges']) {
      this.worksheet['!merges'] = [];
    }
    this.worksheet['!merges'].push({
      s: { r: this.currentRow - 1, c: 0 },
      e: { r: this.currentRow - 1, c: totalCols - 1 }
    });

    this.currentRow++;
  }

  /**
   * Get group header text based on level
   */
  private getGroupHeaderText(group: GroupedData | DeliveryGroupedData): string {
    switch (group.level) {
      case 'farmer':
        return `Farmer: ${(group as any).name}`;
      case 'depot':
        return `Depot: ${(group as any).name}${(group as GroupedData).location ? ` (${(group as GroupedData).location})` : ''}`;
      case 'variant':
        return `Product: ${(group as GroupedData).productName || ''} - Variant: ${(group as any).name}${(group as GroupedData).unit ? ` (${(group as GroupedData).unit})` : ''}`;
      case 'agency':
        return `Delivery Agency: ${(group as any).name}`;
      case 'area':
        return `Area: ${(group as any).name}${(group as DeliveryGroupedData).city ? ` (${(group as DeliveryGroupedData).city})` : ''}`;
      case 'status':
        return `Status: ${(group as any).name}`;
      default:
        return (group as any).name;
    }
  }

  /**
   * Get background color for group level
   */
  private getGroupColor(level: string): string {
    switch (level) {
      case 'farmer':
        return 'D4E6F1'; // Light blue
      case 'depot':
        return 'D5F4E6'; // Light green
      case 'variant':
        return 'FDEBD0'; // Light orange
      case 'agency':
        return 'E3F2FD'; // Light blue for agencies
      case 'area':
        return 'E8F5E8'; // Light green for areas
      case 'status':
        return 'FFF3E0'; // Light orange for status
      default:
        return 'F0F0F0'; // Light gray
    }
  }

  /**
   * Process flat data rows
   */
  private processFlatData(data: (PurchaseOrderItem | DeliveryItem)[], config: ExcelExportConfig): void {
    const headers = config.headers;
    data.forEach(item => {
      const indent = '  '.repeat(this.indentLevel + 1);

      headers.forEach((header, index) => {
        let value: any = '';

        // Check if this is a delivery item or purchase order item
        const isDeliveryItem = 'orderId' in item;
        console.log("isDeliveryItem",item)
        
        switch (header.key) {
          case 'status':
            value = item.status || 'pending';
            break;
          case 'product':
            value = `${item.productName} - ${item.variantName}`;
            break;
          case 'qty':
            value = Number(item.quantity) || 0;
            break;
          case 'agency':
            // Handle different data structures
            if ((item as any).agency) {
              // Custom report format (like Delivery Summaries) where agency is directly available
              value = (item as any).agency;
            } else if (isDeliveryItem) {
              // Standard DeliveryItem format
              value = (item as DeliveryItem).agencyName || 'N/A';
            } else {
              // Standard PurchaseOrderItem format  
              value = (item as PurchaseOrderItem).agencyName || 'N/A';
            }
            break;
          case 'amount':
            value = this.formatCurrency(item.amount);
            break;
          case 'orderId':
            value = isDeliveryItem ? (item as DeliveryItem).orderId : '';
            break;
          case 'date':
            value = isDeliveryItem 
              ? this.formatDate((item as DeliveryItem).deliveryDate)
              : this.formatDate((item as PurchaseOrderItem).purchaseDate);
            break;
          case 'customer':
            value = isDeliveryItem ? (item as DeliveryItem).customerName : '';
            break;
          case 'address':
            value = isDeliveryItem ? (item as DeliveryItem).deliveryAddress : '';
            break;
          case 'area':
            value = isDeliveryItem ? (item as DeliveryItem).areaName : '';
            break;
          case 'deliveredBy':
            value = isDeliveryItem ? (item as DeliveryItem).deliveredBy || '' : '';
            break;
          case 'deliveryTime':
            value = isDeliveryItem ? (item as DeliveryItem).deliveryTime || '' : '';
            break;
          case 'purchaseNo':
            value = !isDeliveryItem ? (item as PurchaseOrderItem).purchaseNo : '';
            break;
          case 'invoice':
            value = '';
            break;
          case 'farmer':
            value = !isDeliveryItem ? (item as PurchaseOrderItem).farmerName : '';
            break;
          case 'depot':
            value = !isDeliveryItem ? (item as PurchaseOrderItem).depotName : '';
            break;
          case 'rate':
            value = !isDeliveryItem ? this.formatCurrency((item as PurchaseOrderItem).purchaseRate) : '';
            break;
          default:
            // Fallback to item property if key matches
            value = (item as any)[header.key] ?? '';
        }

        // Apply indent only to the first visible column
        if (index === 0 && typeof value === 'string') {
          value = `${indent}${value}`;
        }

        const cell = XLSX.utils.encode_cell({ r: this.currentRow - 1, c: index });
        this.worksheet[cell] = {
          v: value
        };
      });

      this.currentRow++;
    });
  }

  /**
   * Add group totals row
   */
  private addGroupTotals(group: GroupedData | DeliveryGroupedData): void {
    const indent = '  '.repeat(this.indentLevel);
    const totalLabel = `${indent}Total for ${group.level === 'variant' ? group.productName + ' - ' + group.name : group.name}:`;
    const headerKeys: string[] = (this as any).headerKeys || [];
    const totalCols = Math.max(headerKeys.length, 11);

    // Write totals aligned to each header column
    for (let col = 0; col < totalCols; col++) {
      const headerKey = headerKeys[col];
      let value: any = '';

      // First column gets the label
      if (col === 0) {
        value = totalLabel;
      } else if (headerKey === 'qty') {
        value = (group as any).totals?.totalQuantity?.toString() || '0';
      } else if (headerKey === 'amount') {
        value = this.formatCurrency((group as any).totals?.totalAmount || 0);
      } else if (headerKey === 'rate') {
        value = `Avg: ${this.formatCurrency((group as any).totals?.avgRate || 0)}`;
      } else if (headerKey === 'agency') {
        value = `${(group as any).totals?.itemCount || 0} items`;
      }

      if (value !== '') {
        const cell = XLSX.utils.encode_cell({ r: this.currentRow - 1, c: col });
        this.worksheet[cell] = {
          v: value
        };
      }
    }

    this.currentRow++;
  }

  /**
   * Add grand totals row
   */
  private addGrandTotals(totals: any): void {
    this.currentRow++; // Skip a row
    
    const rowData = [
      'GRAND TOTAL',
      `Purchases: ${totals.totalPurchases}`,
      `Items: ${totals.totalItems}`,
      `Qty: ${totals.totalQuantity}`,
      this.formatCurrency(totals.totalAmount),
      '', '', '', '', '',
      `Avg Value: ${this.formatCurrency(totals.avgPurchaseValue)}`
    ];
    
    rowData.forEach((value, index) => {
      const cell = XLSX.utils.encode_cell({ r: this.currentRow - 1, c: index });
      this.worksheet[cell] = {
        v: value,
        s: {
          font: { bold: true, sz: 14 },
          fill: { fgColor: { rgb: 'CCCCCC' } },
          alignment: { horizontal: index >= 4 ? 'right' : 'left' },
          border: {
            top: { style: 'medium' },
            bottom: { style: 'medium' }
          }
        }
      };
    });
    
    this.currentRow++;
  }

  /**
   * Apply column widths
   */
  private applyColumnWidths(headers: any[]): void {
    const wscols = headers.map(header => ({
      wch: header.width || 15
    }));
    this.worksheet['!cols'] = wscols;
    // Store header keys for totals alignment
    (this as any).headerKeys = headers.map(h => h.key);
  }

  /**
   * Set worksheet range
   */
  private setWorksheetRange(): void {
    const range = {
      s: { c: 0, r: 0 },
      e: { c: 10, r: this.currentRow - 1 }
    };
    this.worksheet['!ref'] = XLSX.utils.encode_range(range);
  }

  /**
   * Download Excel file
   */
  private downloadExcel(fileName: string): void {
    this.setWorksheetRange();
    const wbout = XLSX.write(this.workbook, { bookType: 'xlsx', type: 'binary' });
    const blob = new Blob([this.s2ab(wbout)], { type: 'application/octet-stream' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Convert string to array buffer
   */
  private s2ab(s: string): ArrayBuffer {
    const buf = new ArrayBuffer(s.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < s.length; i++) {
      view[i] = s.charCodeAt(i) & 0xFF;
    }
    return buf;
  }

  /**
   * Check if data is grouped
   */
  private isGroupedData(data: any[]): boolean {
    return data.length > 0 && 'level' in data[0] && 'totals' in data[0];
  }

  /**
   * Format currency
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Format date
   */
  private formatDate(date: string): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
