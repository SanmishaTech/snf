import { CartItem } from '../context/CartContext';
import { productService } from './api';
import { DepotVariant } from '../types';

export interface CartValidationResult {
  isValid: boolean;
  availableItems: CartItem[];
  unavailableItems: CartItem[];
  validatedItems: CartItem[];
}

/**
 * Service to validate cart items against current depot availability
 */
export class CartValidationService {
  /**
   * Validate all cart items against the current depot
   * This function preserves items when switching depots by:
   * 1. Keeping items that exist in both depots (matching by product & variant name)
   * 2. Updating variant IDs for the new depot
   * 3. Marking items as unavailable if they don't exist in the new depot
   */
  static async validateCartItems(
    cartItems: CartItem[], 
    currentDepotId: number
  ): Promise<CartValidationResult> {
    console.log('[CartValidation] Starting validation:', { 
      cartItems: cartItems.length, 
      depotId: currentDepotId,
      itemDetails: cartItems.map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        name: item.name,
        variantName: item.variantName,
        fromDepot: item.depotId
      }))
    });
    
    if (cartItems.length === 0) {
      console.log('[CartValidation] No items to validate');
      return {
        isValid: true,
        availableItems: [],
        unavailableItems: [],
        validatedItems: [],
      };
    }

    try {
      // Invalidate cache to ensure fresh data
      if (typeof (productService as any).invalidateCache === 'function') {
        (productService as any).invalidateCache(currentDepotId);
        console.log('[CartValidation] Cache invalidated for depot:', currentDepotId);
      }
      
      // Get all variants for the current depot
      console.log('[CartValidation] Fetching depot variants for depot:', currentDepotId);
      
      // Add timeout to the API call
      const apiTimeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('API timeout')), 5000);
      });
      
      const currentDepotVariants = await Promise.race([
        productService.getDepotVariants(currentDepotId),
        apiTimeout
      ]);
      
      console.log('[CartValidation] Fetched variants:', currentDepotVariants.length);
      
      // If no variants returned, use fallback validation
      if (currentDepotVariants.length === 0) {
        console.log('[CartValidation] No variants found, using fallback validation');
        return this.fallbackValidation(cartItems, currentDepotId);
      }
      
      // Create maps for quick lookup
      const variantMap = new Map<number, DepotVariant>();
      const productVariantMap = new Map<number, DepotVariant[]>(); // Group variants by product ID
      const productNameMap = new Map<string, DepotVariant[]>(); // Group variants by product name (normalized)
      
      currentDepotVariants.forEach(variant => {
        variantMap.set(variant.id, variant);
        
        if (!productVariantMap.has(variant.productId)) {
          productVariantMap.set(variant.productId, []);
        }
        productVariantMap.get(variant.productId)!.push(variant);
        
        // Also map by product name for cross-depot matching
        // Note: variant.product might contain the product object with name
        if (variant.product && variant.product.name) {
          const normalizedProductName = variant.product.name.trim().toLowerCase();
          if (!productNameMap.has(normalizedProductName)) {
            productNameMap.set(normalizedProductName, []);
          }
          productNameMap.get(normalizedProductName)!.push(variant);
        }
      });

      const validatedItems: CartItem[] = [];
      const availableItems: CartItem[] = [];
      const unavailableItems: CartItem[] = [];

      for (const cartItem of cartItems) {
        let currentVariant: DepotVariant | undefined;
        let updatedItem: CartItem;
        let swappedVariant = false;

        // Check if we're switching back to the original depot
        const isOriginalDepot = cartItem.originalDepotId === currentDepotId;
        
        console.log(`[CartValidation] Processing item:`, {
          name: cartItem.name,
          variantId: cartItem.variantId,
          originalVariantId: cartItem.originalVariantId,
          depotId: cartItem.depotId,
          originalDepotId: cartItem.originalDepotId,
          currentDepotId,
          isOriginalDepot
        });
        
        // If switching back to original depot, try to restore original variant
        if (isOriginalDepot && cartItem.originalVariantId) {
          currentVariant = variantMap.get(cartItem.originalVariantId);
          if (currentVariant) {
            console.log(`[CartValidation] Restoring original variant for ${cartItem.name}: variant ${cartItem.originalVariantId} in depot ${currentDepotId}`);
            swappedVariant = cartItem.variantId !== cartItem.originalVariantId;
          }
        }
        
        // If not found or not original depot, check if the current variant ID exists
        if (!currentVariant) {
          currentVariant = variantMap.get(cartItem.variantId);
          if (currentVariant) {
            console.log(`[CartValidation] Found variant ${cartItem.variantId} in current depot`, {
              variantName: currentVariant.name,
              closingQty: currentVariant.closingQty,
              notInStock: currentVariant.notInStock
            });
          }
        }
        
        // If exact variant ID not found, it means we switched depots
        // Look for equivalent variant in the new depot for the same product
        if (!currentVariant) {
          // First try to match by product ID
          let productVariants = productVariantMap.get(cartItem.productId) || [];
          
          // If no variants found by product ID, try matching by product name
          // This handles cases where product IDs differ between depots for the same product
          if (productVariants.length === 0) {
            const normalizedProductName = cartItem.name.trim().toLowerCase();
            productVariants = productNameMap.get(normalizedProductName) || [];
            
            if (productVariants.length > 0) {
              console.log(`[CartValidation] Found ${productVariants.length} variants by product name '${cartItem.name}' in depot ${currentDepotId}`);
            }
          }
          
          if (productVariants.length > 0) {
            // Simplified variant matching using normalized names
            const normalizedCartVariant = this.normalizeVariantName(cartItem.variantName);
            
            console.log(`[CartValidation] Attempting to match variant '${cartItem.variantName}' (normalized: '${normalizedCartVariant}')`);
            console.log('[CartValidation] Available variants in depot:', productVariants.map(v => ({
              id: v.id,
              name: v.name,
              normalized: this.normalizeVariantName(v.name),
              closingQty: v.closingQty,
              notInStock: v.notInStock,
              isHidden: v.isHidden
            })));
            
            // Try to find matching variant
            let equivalentVariant = productVariants.find(variant => {
              const normalizedDepotVariant = this.normalizeVariantName(variant.name);
              
              // Check each availability condition separately for better debugging
              const nameMatches = normalizedDepotVariant === normalizedCartVariant;
              
              // STOCK MANAGEMENT: Currently disabled as no stock management system is in place
              // When enabling stock management, uncomment and use these checks:
              // const inStock = !variant.notInStock;
              // const notHidden = !variant.isHidden;
              // const hasEnoughQty = variant.closingQty === undefined || variant.closingQty >= cartItem.quantity;
              // const isMatch = nameMatches && inStock && notHidden && hasEnoughQty;
              
              // For now, only check name match (all items considered in stock)
              const isMatch = nameMatches;
              
              if (nameMatches) {
                console.log(`[CartValidation] Name match found for variant ${variant.id}:`, {
                  variantName: variant.name,
                  normalizedName: normalizedDepotVariant,
                  matches: true,
                  available: isMatch,
                  note: 'Stock checks disabled - all items considered available'
                });
              }
              
              return isMatch;
            });
            
            // If not found with stock, try to find any matching variant
            if (!equivalentVariant) {
              // Stricter validation: Do not hot-swap to a variant that is out of stock.
              // We will still check if a match exists to provide a better "unavailable" message.
              const outOfStockEquivalent = productVariants.find(variant =>
                this.normalizeVariantName(variant.name) === normalizedCartVariant
              );

              if (outOfStockEquivalent) {
                console.log(`[CartValidation] Found a matching variant for ${cartItem.name} but it is unavailable. Won't hot-swap.`);
              }
            }
            
            // Add debug logging for non-matches
            if (!equivalentVariant && productVariants.length > 0) {
              console.log('[CartValidation] ❌ No variant match found for item:', {
                productName: cartItem.name,
                cartVariant: cartItem.variantName,
                normalizedCart: normalizedCartVariant,
                availableVariants: productVariants.map(v => ({
                  id: v.id,
                  name: v.name,
                  normalized: this.normalizeVariantName(v.name),
                  closingQty: v.closingQty,
                  inStock: !v.notInStock
                }))
              });
            }

            if (equivalentVariant) {
              console.log(`[CartValidation] Hot-swapping to variant: ${equivalentVariant.id}`)
              currentVariant = equivalentVariant; // Set currentVariant so we don't fall through to the error cases
              
              // STOCK MANAGEMENT: Currently disabled - all matched variants are considered available
              // When enabling stock management, uncomment these checks:
              // const hasStock = equivalentVariant.closingQty === undefined || equivalentVariant.closingQty >= cartItem.quantity;
              // const isAvailable = !equivalentVariant.notInStock && !equivalentVariant.isHidden && hasStock;
              
              // For now, all matched variants are available
              const isAvailable = true;
              
              updatedItem = {
                ...cartItem,
                variantId: equivalentVariant.id,
                variantName: equivalentVariant.name,
                price: equivalentVariant.buyOncePrice || equivalentVariant.mrp || 0,
                depotId: currentDepotId,
                isAvailable: isAvailable,
                unavailableReason: undefined, // No stock management, so no unavailable reasons
                // Preserve original depot info for restoration
                originalDepotId: cartItem.originalDepotId || cartItem.depotId,
                originalVariantId: cartItem.originalVariantId || cartItem.variantId,
              };
              
              // All hot-swapped items are available when stock management is disabled
              availableItems.push(updatedItem);
            } else {
              // No equivalent variant found - mark as unavailable
              updatedItem = {
                ...cartItem,
                isAvailable: false,
                unavailableReason: 'Not available in this area',
                depotId: currentDepotId,
                // Preserve original depot info for restoration
                originalDepotId: cartItem.originalDepotId || cartItem.depotId,
                originalVariantId: cartItem.originalVariantId || cartItem.variantId,
              };
              unavailableItems.push(updatedItem);
            }
          } else {
            console.log(`[CartValidation] No variants found for product ${cartItem.productId} (${cartItem.name}) in depot ${currentDepotId}`);
          }
        }

        if (!currentVariant) {
          // No variant available for this product in current depot
          // Check if any variant exists for this product (even if out of stock)
          let productVariants = productVariantMap.get(cartItem.productId) || [];
          
          // Also check by product name if no variants found by ID
          if (productVariants.length === 0) {
            const normalizedProductName = cartItem.name.trim().toLowerCase();
            productVariants = productNameMap.get(normalizedProductName) || [];
          }
          
          // Check if there's a matching variant by name (even if out of stock)
          const normalizedCartVariant = this.normalizeVariantName(cartItem.variantName);
          const matchingVariant = productVariants.find(v => 
            this.normalizeVariantName(v.name) === normalizedCartVariant
          );
          
          let unavailableReason = 'Not available in your area';
          if (matchingVariant) {
            if (matchingVariant.notInStock) {
              unavailableReason = `${cartItem.variantName} is out of stock in this area`;
            } else if (matchingVariant.isHidden) {
              unavailableReason = `${cartItem.variantName} is currently unavailable in this area`;
            } else if (matchingVariant.closingQty !== undefined && matchingVariant.closingQty < cartItem.quantity) {
              unavailableReason = `Only ${matchingVariant.closingQty} ${cartItem.variantName} available in this area`;
            }
          } else if (productVariants.length > 0) {
            // Product exists but this specific variant doesn't
            unavailableReason = `${cartItem.variantName} variant not available in this area`;
          }
          
          updatedItem = {
            ...cartItem,
            isAvailable: false,
            unavailableReason,
            depotId: currentDepotId, // Update current depot ID
            // Preserve original depot info for restoration
            originalDepotId: cartItem.originalDepotId || cartItem.depotId,
            originalVariantId: cartItem.originalVariantId || cartItem.variantId,
          };
          unavailableItems.push(updatedItem);
        } 
        // STOCK MANAGEMENT: The following stock checks are currently disabled
        // When enabling stock management, uncomment these blocks:
        /*
        else if (currentVariant.notInStock || currentVariant.isHidden) {
          // Variant exists but is out of stock or hidden
          updatedItem = {
            ...cartItem,
            variantId: currentVariant.id,
            isAvailable: false,
            unavailableReason: currentVariant.notInStock ? 'Out of stock' : 'Currently unavailable',
            depotId: currentDepotId,
            originalDepotId: cartItem.originalDepotId || cartItem.depotId,
            originalVariantId: cartItem.originalVariantId || cartItem.variantId,
          };
          unavailableItems.push(updatedItem);
        } else if (currentVariant.closingQty !== undefined && currentVariant.closingQty < cartItem.quantity) {
          // Variant exists but insufficient quantity
          const stockMessage = currentVariant.closingQty === 0 
            ? 'Out of stock in this area' 
            : `Only ${currentVariant.closingQty} available in this area`;
          
          updatedItem = {
            ...cartItem,
            variantId: currentVariant.id,
            isAvailable: false,
            unavailableReason: stockMessage,
            depotId: currentDepotId,
            originalDepotId: cartItem.originalDepotId || cartItem.depotId,
            originalVariantId: cartItem.originalVariantId || cartItem.variantId,
          };
          unavailableItems.push(updatedItem);
        } 
        */
        else {
          // Variant is available - update with current depot's variant info
          const currentPrice = currentVariant.buyOncePrice || currentVariant.mrp || 0;
          updatedItem = {
            ...cartItem,
            variantId: currentVariant.id, // Update to current depot's variant ID
            variantName: currentVariant.name, // Update variant name in case it changed
            isAvailable: true,
            unavailableReason: undefined,
            price: currentPrice,
            depotId: currentDepotId,
            // Preserve original depot info for restoration
            originalDepotId: cartItem.originalDepotId || cartItem.depotId,
            originalVariantId: cartItem.originalVariantId || cartItem.variantId,
          };
          
          // Log if we hot-swapped the variant
          if (swappedVariant) {
            console.log(`[CartValidation] Successfully swapped to depot ${currentDepotId} variant:`, {
              productName: cartItem.name,
              oldVariantId: cartItem.variantId,
              newVariantId: currentVariant.id,
              newVariantName: currentVariant.name,
              newPrice: currentPrice
            });
          }
          availableItems.push(updatedItem);
        }

        validatedItems.push(updatedItem);
      }

      console.log('[CartValidation] Validation complete:', {
        depotId: currentDepotId,
        totalItems: cartItems.length,
        availableCount: availableItems.length,
        unavailableCount: unavailableItems.length,
        swappedItems: validatedItems.filter(item => 
          cartItems.find(original => 
            original.variantId !== item.variantId && original.productId === item.productId
          )
        ).length
      });

      return {
        isValid: unavailableItems.length === 0,
        availableItems,
        unavailableItems,
        validatedItems,
      };
    } catch (error) {
      console.error('[CartValidation] Error validating cart items:', error);
      
      // On error, mark all items as potentially unavailable
      const validatedItems = cartItems.map(item => ({
        ...item,
        isAvailable: false,
        unavailableReason: 'Unable to verify availability',
      }));

      console.log('[CartValidation] Returning error result');
      return {
        isValid: false,
        availableItems: [],
        unavailableItems: validatedItems,
        validatedItems,
      };
    }
  }

  /**
   * Check if a specific variant is available in the current depot
   */
  static async checkVariantAvailability(
    variantId: number, 
    currentDepotId: number,
    requestedQuantity: number = 1
  ): Promise<{
    isAvailable: boolean;
    reason?: string;
    maxQuantity?: number;
    currentPrice?: number;
  }> {
    try {
      const currentDepotVariants = await productService.getDepotVariants(currentDepotId);
      const variant = currentDepotVariants.find(v => v.id === variantId);

      if (!variant) {
        return {
          isAvailable: false,
          reason: 'Not available in this location',
        };
      }

      if (variant.notInStock || variant.isHidden) {
        return {
          isAvailable: false,
          reason: variant.notInStock ? 'Out of stock' : 'Currently unavailable',
        };
      }

      if (variant.closingQty !== undefined && variant.closingQty < requestedQuantity) {
        return {
          isAvailable: false,
          reason: `Only ${variant.closingQty} available`,
          maxQuantity: variant.closingQty,
        };
      }

      return {
        isAvailable: true,
        currentPrice: variant.buyOncePrice || variant.mrp || 0,
        maxQuantity: variant.closingQty,
      };
    } catch (error) {
      console.error('Error checking variant availability:', error);
      return {
        isAvailable: false,
        reason: 'Unable to verify availability',
      };
    }
  }

  /**
   * Remove unavailable items from cart
   */
  static filterAvailableItems(cartItems: CartItem[]): CartItem[] {
    return cartItems.filter(item => item.isAvailable !== false);
  }

  /**
   * Get summary of cart validation issues
   */
  static getValidationSummary(validationResult: CartValidationResult): {
    totalItems: number;
    availableCount: number;
    unavailableCount: number;
    message: string;
  } {
    const totalItems = validationResult.validatedItems.length;
    const availableCount = validationResult.availableItems.length;
    const unavailableCount = validationResult.unavailableItems.length;

    let message = '';
    if (unavailableCount === 0) {
      message = 'All items are available for delivery';
    } else if (availableCount === 0) {
      message = 'No items are available in this location';
    } else {
      message = `${unavailableCount} item${unavailableCount > 1 ? 's' : ''} not available in this location`;
    }

    return {
      totalItems,
      availableCount,
      unavailableCount,
      message,
    };
  }

  /**
   * Enhanced normalization for variant name matching
   * Handles common variations in naming (e.g., 1Ltr vs 1Ltrs, 500ml vs 500ML)
   */
  private static normalizeVariantName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '') // Remove ALL spaces
      .replace(/litres?/gi, 'ltr') // Normalize litre/litres/ltr/ltrs to 'ltr'
      .replace(/ltrs?/gi, 'ltr') // Normalize ltr/ltrs to 'ltr'
      .replace(/mls?/gi, 'ml') // Normalize ml/mls to 'ml'
      .replace(/grams?/gi, 'g') // Normalize gram/grams to 'g'
      .replace(/gms?/gi, 'g') // Normalize gm/gms to 'g'
      .replace(/kgs?/gi, 'kg') // Normalize kg/kgs to 'kg'
      .replace(/kilograms?/gi, 'kg') // Normalize kilogram/kilograms to 'kg'
      .replace(/pcs?/gi, 'pc') // Normalize pc/pcs to 'pc'
      .replace(/pieces?/gi, 'pc'); // Normalize piece/pieces to 'pc'
  }

  /**
   * Fallback validation when API fails or returns no data
   * Assumes items from same depot are available, others are not
   */
  private static fallbackValidation(
    cartItems: CartItem[], 
    currentDepotId: number
  ): CartValidationResult {
    console.log('[CartValidation] Using fallback validation');
    
    const validatedItems: CartItem[] = [];
    const availableItems: CartItem[] = [];
    const unavailableItems: CartItem[] = [];

    cartItems.forEach(item => {
      const updatedItem = {
        ...item,
        depotId: currentDepotId,
        // Preserve original depot info for restoration
        originalDepotId: item.originalDepotId || item.depotId,
        originalVariantId: item.originalVariantId || item.variantId,
      };

      // Check if we're back to the original depot
      const isOriginalDepot = item.originalDepotId === currentDepotId;
      
      // Simple heuristic: if item is from same depot or depot is not set, assume available
      if (!item.depotId || item.depotId === currentDepotId || isOriginalDepot) {
        updatedItem.isAvailable = true;
        updatedItem.unavailableReason = undefined;
        // If returning to original depot, restore original variant ID
        if (isOriginalDepot && item.originalVariantId) {
          updatedItem.variantId = item.originalVariantId;
        }
        availableItems.push(updatedItem);
      } else {
        updatedItem.isAvailable = false;
        updatedItem.unavailableReason = 'Not available in this location';
        unavailableItems.push(updatedItem);
      }

      validatedItems.push(updatedItem);
    });

    return {
      isValid: unavailableItems.length === 0,
      availableItems,
      unavailableItems,
      validatedItems,
    };
  }
}

export default CartValidationService;