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
   */
  static async validateCartItems(
    cartItems: CartItem[], 
    currentDepotId: number
  ): Promise<CartValidationResult> {
    if (cartItems.length === 0) {
      return {
        isValid: true,
        availableItems: [],
        unavailableItems: [],
        validatedItems: [],
      };
    }

    try {
      // Get all variants for the current depot
      const currentDepotVariants = await productService.getDepotVariants(currentDepotId);
      
      // Create a map for quick lookup
      const variantMap = new Map<number, DepotVariant>();
      currentDepotVariants.forEach(variant => {
        variantMap.set(variant.id, variant);
      });

      const validatedItems: CartItem[] = [];
      const availableItems: CartItem[] = [];
      const unavailableItems: CartItem[] = [];

      for (const cartItem of cartItems) {
        const currentVariant = variantMap.get(cartItem.variantId);
        let updatedItem: CartItem;

        if (!currentVariant) {
          // Variant doesn't exist in current depot
          updatedItem = {
            ...cartItem,
            isAvailable: false,
            unavailableReason: 'Not available in this location',
          };
          unavailableItems.push(updatedItem);
        } else if (currentVariant.notInStock || currentVariant.isHidden) {
          // Variant exists but is out of stock or hidden
          updatedItem = {
            ...cartItem,
            isAvailable: false,
            unavailableReason: currentVariant.notInStock ? 'Out of stock' : 'Currently unavailable',
          };
          unavailableItems.push(updatedItem);
        } else if (currentVariant.closingQty !== undefined && currentVariant.closingQty < cartItem.quantity) {
          // Variant exists but insufficient quantity
          updatedItem = {
            ...cartItem,
            isAvailable: false,
            unavailableReason: `Only ${currentVariant.closingQty} available`,
          };
          unavailableItems.push(updatedItem);
        } else {
          // Variant is available - update price if different
          const currentPrice = currentVariant.buyOncePrice || currentVariant.mrp || 0;
          updatedItem = {
            ...cartItem,
            isAvailable: true,
            unavailableReason: undefined,
            price: currentPrice,
            depotId: currentDepotId,
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
      console.error('Error validating cart items:', error);
      
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
}

export default CartValidationService;