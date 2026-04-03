import { CartItem } from '../context/CartContext';

const API_ORIGIN = import.meta.env.VITE_BACKEND_URL || window.location.origin;

function getHeaders() {
  const token = localStorage.getItem('authToken');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const cartApiService = {
  async getCart(): Promise<any> {
    const response = await fetch(`${API_ORIGIN}/api/cart`, {
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch cart');
    return response.json();
  },

  async syncCart(items: CartItem[]): Promise<any> {
    const response = await fetch(`${API_ORIGIN}/api/cart/sync`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ items })
    });
    if (!response.ok) throw new Error('Failed to sync cart');
    return response.json();
  },

  async addOrUpdateItem(item: CartItem): Promise<any> {
    const response = await fetch(`${API_ORIGIN}/api/cart/items`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(item)
    });
    if (!response.ok) throw new Error('Failed to update cart item');
    return response.json();
  },

  async removeItem(variantId: number): Promise<any> {
    const response = await fetch(`${API_ORIGIN}/api/cart/items/${variantId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Failed to remove cart item');
    return response.json();
  },

  async clearCart(): Promise<any> {
    const response = await fetch(`${API_ORIGIN}/api/cart`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Failed to clear cart');
    return response.json();
  }
};
