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
      // Get all variants for the current depot
      
      // Add timeout to the API call
      const apiTimeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('API timeout')), 5000);
      });
      
      const currentDepotVariants = await Promise.race([
        productService.getDepotVariants(currentDepotId),
        apiTimeout
      ]);
      
      // If no variants returned, use fallback validation
      if (currentDepotVariants.length === 0) {
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

        // Check if we're switching back to the original depot
        const isOriginalDepot = cartItem.originalDepotId === currentDepotId;
        
        // If switching back to original depot, try to restore original variant
        if (isOriginalDepot && cartItem.originalVariantId) {
          currentVariant = variantMap.get(cartItem.originalVariantId);
          if (currentVariant) {
            // Found original variant
          }
        }
        
        // If not found or not original depot, check if the current variant ID exists
        if (!currentVariant) {
          currentVariant = variantMap.get(cartItem.variantId);
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
          }
          
          if (productVariants.length > 0) {
            // Simplified variant matching using normalized names
            const normalizedCartVariant = this.normalizeVariantName(cartItem.variantName);
            
            // Try to find matching variant (prioritize available ones)
            let equivalentVariant = productVariants.find(variant => {
              const normalizedDepotVariant = this.normalizeVariantName(variant.name);
              const isMatch = normalizedDepotVariant === normalizedCartVariant && 
                     !variant.notInStock && 
                     !variant.isHidden &&
                     (variant.closingQty === undefined || variant.closingQty >= cartItem.quantity);
              
              return isMatch;
            });
            
            // If not found with stock, try to find any matching variant
            if (!equivalentVariant) {
              equivalentVariant = productVariants.find(variant => {
                const normalizedDepotVariant = this.normalizeVariantName(variant.name);
                return normalizedDepotVariant === normalizedCartVariant;
              });
            }
            
            if (equivalentVariant) {
              currentVariant = equivalentVariant;
            }
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
          
          const hasOutOfStockVariant = productVariants.some(v => v.notInStock);
          
          updatedItem = {
            ...cartItem,
            isAvailable: false,
            unavailableReason: hasOutOfStockVariant 
              ? 'Currently out of stock in this area' 
              : 'Not available in your area',
            depotId: currentDepotId, // Update current depot ID
            // Preserve original depot info for restoration
            originalDepotId: cartItem.originalDepotId || cartItem.depotId,
            originalVariantId: cartItem.originalVariantId || cartItem.variantId,
          };
          unavailableItems.push(updatedItem);
        } else if (currentVariant.notInStock || currentVariant.isHidden) {
          // Variant exists but is out of stock or hidden
          updatedItem = {
            ...cartItem,
            variantId: currentVariant.id, // Update to current depot's variant ID even if out of stock
            isAvailable: false,
            unavailableReason: currentVariant.notInStock ? 'Out of stock' : 'Currently unavailable',
            depotId: currentDepotId,
            // Preserve original depot info for restoration
            originalDepotId: cartItem.originalDepotId || cartItem.depotId,
            originalVariantId: cartItem.originalVariantId || cartItem.variantId,
          };
          unavailableItems.push(updatedItem);
        } else if (currentVariant.closingQty !== undefined && currentVariant.closingQty < cartItem.quantity) {
          // Variant exists but insufficient quantity
          // Special handling: If this is the original depot, keep item available
          // (user added it when it was in stock, let them keep it until checkout)
          const isInOriginalDepot = (cartItem.originalDepotId || cartItem.depotId) === currentDepotId;
          
          if (isInOriginalDepot) {
            // Keep item available in original depot even if stock depleted
            const currentPrice = currentVariant.buyOncePrice || currentVariant.mrp || 0;
            updatedItem = {
              ...cartItem,
              variantId: currentVariant.id,
              variantName: currentVariant.name,
              isAvailable: true, // Keep available in original depot
              unavailableReason: undefined,
              price: currentPrice,
              depotId: currentDepotId,
              originalDepotId: cartItem.originalDepotId || cartItem.depotId,
              originalVariantId: cartItem.originalVariantId || cartItem.variantId,
            };
            availableItems.push(updatedItem);
          } else {
            // Different depot - show as unavailable due to stock
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
        } else {
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
          availableItems.push(updatedItem);
        }

        validatedItems.push(updatedItem);
      }

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
   * Simple normalization for variant name matching
   * Removes all spaces and converts to lowercase for comparison
   */
  private static normalizeVariantName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, ''); // Remove ALL spaces for comparison
  }

  /**
   * Fallback validation when API fails or returns no data
   * Assumes items from same depot are available, others are not
   */
  private static fallbackValidation(
    cartItems: CartItem[], 
    currentDepotId: number
  ): CartValidationResult {
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