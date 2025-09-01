import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calculator, History } from 'lucide-react';
import { toast } from 'sonner';

import { getAllDepotsList, DepotListItem } from '@/services/depotService';
import { 
  getProductVariantsInDepot,
  getConversionSuggestions,
  performBulkConversion,
} from '@/services/unitConversionService';
import { DepotProductVariant } from '@/services/depotProductVariantService';
import { getProductOptions, ProductOption } from '@/services/productService';
import { Link } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export const UnitConversionPage: React.FC = () => {
  type TargetRow = { targetVariantId: string; targetQuantity: string };
  const [depots, setDepots] = useState<DepotListItem[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [variants, setVariants] = useState<DepotProductVariant[]>([]);
  
  const [selectedDepot, setSelectedDepot] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [sourceVariant, setSourceVariant] = useState<string>('');
  const [sourceQuantity, setSourceQuantity] = useState<string>('');
  const [targetRows, setTargetRows] = useState<TargetRow[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmErrors, setConfirmErrors] = useState<string[]>([]);
  const [confirmWarnings, setConfirmWarnings] = useState<string[]>([]);

  // Load initial data
  useEffect(() => {
    loadDepots();
  }, []);

  // Load products when depot changes
  useEffect(() => {
    if (selectedDepot) {
      loadProducts();
      setSelectedProduct('');
      setVariants([]);
    }
  }, [selectedDepot]);

  // Load variants when product changes
  useEffect(() => {
    if (selectedDepot && selectedProduct) {
      loadVariants();
    }
  }, [selectedDepot, selectedProduct]);

  // Load suggestions when source variant changes
  useEffect(() => {
    if (sourceVariant) {
      loadSuggestions();
    }
  }, [sourceVariant]);

  const loadDepots = async () => {
    try {
      const data = await getAllDepotsList();
      setDepots(data);
    } catch (error) {
      toast.error('Failed to load depots');
    }
  };

  const computeValidations = () => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // No validations - all validation checks removed per user request
    return { errors, warnings };
  };

  const openConfirm = () => {
    const { errors, warnings } = computeValidations();
    setConfirmErrors(errors);
    setConfirmWarnings(warnings);
    setConfirmOpen(true);
  };

  const loadProducts = async () => {
    if (!selectedDepot) return;
    
    try {
      setLoading(true);
      const data = await getProductOptions();
      setProducts(data);
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const loadVariants = async () => {
    if (!selectedDepot || !selectedProduct) return;
    
    try {
      setLoading(true);
      const data: DepotProductVariant[] = await getProductVariantsInDepot(parseInt(selectedDepot), parseInt(selectedProduct));
      setVariants(data);
    } catch (error) {
      toast.error('Failed to load variants');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkConversion = async () => {
    if (!selectedDepot || !sourceVariant || targetRows.length === 0) {
      toast.error('Please fill required fields and add at least one target');
      return;
    }

    const totalSourceQty = parseFloat(sourceQuantity) || 0;
    const totalTargetQty = targetRows.reduce((acc, row) => acc + (parseFloat(row.targetQuantity) || 0), 0);
    
    // Validate data before sending to backend
    if (!Number.isFinite(totalSourceQty) || totalSourceQty <= 0) {
      toast.error('Invalid source quantity');
      return;
    }
    
    if (totalTargetQty <= 0) {
      toast.error('Total target quantity must be greater than 0');
      return;
    }

    const conversions = targetRows
      .filter(r => r.targetVariantId && parseFloat(r.targetQuantity) > 0)
      .map(r => {
        const targetQty = parseFloat(r.targetQuantity);
        
        return {
          sourceVariantId: parseInt(sourceVariant),
          targetVariantId: parseInt(r.targetVariantId),
          sourceQuantity: totalSourceQty, // Use exact source quantity as entered
          targetQuantity: Math.round(targetQty * 100) / 100, // Round to 2 decimal places
        };
      });

    try {
      setLoading(true);
      const result = await performBulkConversion({
        depotId: parseInt(selectedDepot),
        conversions,
      });

      if (result.success) {
        toast.success(`Bulk conversion completed. ${result.results.length} applied${result.errors.length ? `, ${result.errors.length} errors` : ''}`);
        // Reset form (preserve depot and product)
        setSourceVariant('');
        setSourceQuantity('');
        setTargetRows([]);
        // Reload variants to reflect stock
        if (selectedProduct) {
          loadVariants();
        }
      } else {
        toast.error(`Bulk conversion completed with errors: ${result.errors[0] || 'Unknown error'}`);
      }
    } catch (e) {
      toast.error('Bulk conversion failed');
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestions = async () => {
    if (!sourceVariant) return;
    
    try {
      const data = await getConversionSuggestions(parseInt(sourceVariant));
      setSuggestions(data);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const applySuggestion = (suggestion: any) => {
    const tvId = suggestion.targetVariant.id.toString();
    setTargetRows((prev) => {
      const idx = prev.findIndex((r) => r.targetVariantId === tvId);
      const maybeCalculatedTQty = sourceQuantity
        ? (parseFloat(sourceQuantity) * suggestion.suggestedRatio).toString()
        : '';
      if (idx >= 0) {
        const next = [...prev];
  
        // Prefill/overwrite only the targetQuantity from suggestion if available
        next[idx] = { ...next[idx], targetQuantity: maybeCalculatedTQty };
        return next;
      }
      return [
        ...prev,
        { targetVariantId: tvId, targetQuantity: maybeCalculatedTQty },
      ];
    });
  };

  const getVariantById = (id: string) => {
    return variants.find(v => v.id.toString() === id);
  };

  const sourceVariantData = getVariantById(sourceVariant);
  const totalSourceUsed = parseFloat(sourceQuantity) || 0;
  const targetsAggregated = React.useMemo(() => {
    const map: Record<string, { id: string; name: string; addQty: number; current: number }> = {};
    for (const r of targetRows) {
      if (!r.targetVariantId) continue;
      const tv = getVariantById(r.targetVariantId);
      if (!tv) continue;
      if (!map[r.targetVariantId]) {
        map[r.targetVariantId] = { id: r.targetVariantId, name: tv.name, addQty: 0, current: tv.closingQty };
      }
      map[r.targetVariantId].addQty += parseFloat(r.targetQuantity) || 0;
    }
    return Object.values(map);
  }, [targetRows, variants]);

  return (
    <div className="w-full h-full min-h-screen px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Unit Conversion</h1>
        <Button asChild variant="outline" className="flex items-center gap-2 w-full sm:w-auto">
          <Link to="/admin/unit-conversion/history">
            <History className="h-4 w-4" />
            <span className="sm:inline">View History</span>
          </Link>
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
        {/* Main Panel */}
        <Card className="lg:col-span-3 min-w-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Calculator className="h-5 w-5" />
              Unit Conversion Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            {/* Depot Selection */}
            {/* Depot Selection */}
            <div>
              <Label htmlFor="depot" className="text-sm font-medium">Select Depot *</Label>
              <Select value={selectedDepot} onValueChange={setSelectedDepot}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose depot" />
                </SelectTrigger>
                <SelectContent>
                  {depots.map((depot) => (
                    <SelectItem key={depot.id} value={depot.id.toString()}>
                      {depot.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Product Selection */}
            <div>
              <Label htmlFor="product" className="text-sm font-medium">Select Product *</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct} disabled={!selectedDepot}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Conversion Setup */}
            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {/* Source Section */}
              <div className="space-y-3 sm:space-y-4">
                <Label className="text-base font-semibold">From (Source)</Label>
                <div>
                  <Label htmlFor="sourceVariant" className="text-sm font-medium">Source Variant *</Label>
                  <Select value={sourceVariant} onValueChange={setSourceVariant} disabled={!selectedProduct}>
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder="Select source variant" />
                    </SelectTrigger>
                    <SelectContent>
                      {variants.map((variant) => (
                        <SelectItem key={variant.id} value={variant.id.toString()}>
                          <div className="flex justify-between items-center w-full">
                            <span>{variant.name}</span>
                            <Badge variant="secondary" className="ml-2">
                              Stock: {variant.closingQty}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="sourceQuantity" className="text-sm font-medium">Source Quantity *</Label>
                  <Input
                    id="sourceQuantity"
                    type="number"
                    step="0.01"
                    value={sourceQuantity}
                    onChange={(e) => setSourceQuantity(e.target.value)}
                    placeholder="Total quantity to convert"
                    disabled={!sourceVariant}
                    className="mt-1"
                  />
                  {sourceVariantData && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Available: {sourceVariantData?.closingQty} {sourceVariantData?.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Target Section */}
              <div className="space-y-4 lg:col-span-1 2xl:col-span-2 min-w-0">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">To (Target)</Label>
                </div>
                
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <Label className="text-sm font-medium">Target Conversions</Label>
                    <Button
                      size="sm"
                      
                      onClick={() =>
                        setTargetRows([
                          ...targetRows,
                          { targetVariantId: '', targetQuantity: '' },
                        ])
                      }
                      className="w-full sm:w-auto"
                    >
                      Add Target
                    </Button>
                  </div>
                  
                  <div className="space-y-3 sm:space-y-4">
                    {targetRows.map((row, idx) => {
                      const rowTarget = getVariantById(row.targetVariantId);
                      return (
                        <div key={idx} className="p-3 sm:p-4 border rounded-lg bg-muted/10">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-end">
                            <div className="sm:col-span-1 lg:col-span-2">
                              <Label className="text-sm font-medium">Target Variant *</Label>
                              <Select
                                value={row.targetVariantId}
                                onValueChange={(v) => {
                                  const next = [...targetRows];
                                  next[idx] = { ...row, targetVariantId: v };
                                  setTargetRows(next);
                                }}
                                disabled={!selectedProduct}
                              >
                                <SelectTrigger className="w-full mt-1">
                                  <SelectValue placeholder="Select target variant" />
                                </SelectTrigger>
                                <SelectContent>
                                  {variants
                                    .filter((v) => v.id.toString() !== sourceVariant)
                                    .map((variant) => (
                                      <SelectItem key={variant.id} value={variant.id.toString()}>
                                        <div className="flex justify-between items-center w-full">
                                          <span>{variant.name}</span>
                                          <Badge variant="secondary" className="ml-2">
                                            Stock: {variant.closingQty}
                                          </Badge>
                                        </div>
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <Label className="text-sm font-medium">Target Qty *</Label>
                                <Input
                                  className="w-full mt-1"
                                  type="number"
                                  step="0.01"
                                  value={row.targetQuantity}
                                  onChange={(e) => {
                                    const next = [...targetRows];
                                    next[idx] = { ...row, targetQuantity: e.target.value };
                                    setTargetRows(next);
                                  }}
                                  placeholder="e.g. 10.00"
                                />
                              </div>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setTargetRows(targetRows.filter((_, i) => i !== idx))}
                                className="mt-6 w-full sm:w-auto"
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                          {rowTarget && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Current: {rowTarget.closingQty} {rowTarget.name}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {sourceVariantData && (
                    <p className="text-xs text-muted-foreground">
                      Source to deduct: {totalSourceUsed} / Available: {sourceVariantData.closingQty}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button 
                onClick={openConfirm} 
                disabled={loading}
                className="w-full sm:w-auto"
                size="lg"
              >
                {loading ? 'Processing...' : 'Execute Conversion'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Suggestions Panel */}
        <div className="space-y-4 lg:col-span-1">
          {suggestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Conversion Suggestions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-2">
                      <span className="font-medium text-sm">{suggestion.targetVariant.name}</span>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => applySuggestion(suggestion)}
                        className="w-full sm:w-auto"
                      >
                        Apply
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ratio: 1:{suggestion.suggestedRatio}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Confirm & Summary Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Conversion</AlertDialogTitle>
            <AlertDialogDescription>
              Review the summary and validation before applying stock changes.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            {confirmErrors.length > 0 && (
              <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                <p className="font-medium">Please resolve the following:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  {confirmErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {confirmWarnings.length > 0 && (
              <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
                <p className="font-medium">Warnings:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  {confirmWarnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Summary */}
            <div className="rounded-md border p-3 text-sm">
              <p className="font-medium mb-2">Summary</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-2 rounded bg-red-50 border border-red-200">
                  <p className="font-semibold">From (Source)</p>
                  <p className="text-sm">
                    {sourceVariantData?.name || '—'}: {totalSourceUsed}
                  </p>
                  {sourceVariantData && (
                    <p className="text-xs text-red-700 mt-1">
                      {sourceVariantData?.closingQty} → {Math.max(0, (sourceVariantData?.closingQty ?? 0) - (totalSourceUsed || 0))}
                    </p>
                  )}
                </div>
                <div className="p-2 rounded bg-green-50 border border-green-200">
                  <p className="font-semibold">To (Target)</p>
                  <div className="space-y-1">
                    {targetsAggregated.length === 0 && <p className="text-sm">—</p>}
                    {targetsAggregated.map(t => (
                      <div key={t.id} className="text-xs">
                        <p className="font-medium">{t.name}</p>
                        <p className="text-green-700">{t.current} → {t.current + t.addQty}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel disabled={loading} className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="w-full sm:w-auto"
              onClick={() => {
                const { errors, warnings } = computeValidations();
                setConfirmErrors(errors);
                setConfirmWarnings(warnings);
                if (errors.length > 0) {
                  setConfirmOpen(true);
                  return;
                }
                setConfirmOpen(false);
                handleBulkConversion();
              }}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Confirm & Execute'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
