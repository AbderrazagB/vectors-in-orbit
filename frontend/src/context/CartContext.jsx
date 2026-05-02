import { createContext, useState, useEffect, useContext } from 'react';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // For demo purposes, using a static user ID
  // In production, this would come from authentication
  const userId = 'demo_user_001';

  const API_BASE_URL = `${import.meta.env.VITE_MONGO_BACKEND_URL}/api`;

  // Fetch cart
  const fetchCart = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/cart/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch cart');
      const data = await response.json();
      setCart(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching cart:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add item to cart
  const addToCart = async (productId, quantity = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/cart/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          product_id: productId,
          quantity
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to add item to cart');
      }
      
      const data = await response.json();
      setCart(data);
      setError(null);
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Error adding to cart:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update item quantity
  const updateCartItem = async (productId, quantity) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/cart/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          product_id: productId,
          quantity
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update cart');
      }
      
      const data = await response.json();
      setCart(data);
      setError(null);
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Error updating cart:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Remove item from cart
  const removeFromCart = async (productId) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/cart/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          product_id: productId
        })
      });
      
      if (!response.ok) throw new Error('Failed to remove item from cart');
      
      const data = await response.json();
      setCart(data);
      setError(null);
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Error removing from cart:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Clear cart
  const clearCart = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/cart/${userId}/clear`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to clear cart');
      
      const data = await response.json();
      setCart(data);
      setError(null);
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Error clearing cart:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Load cart on mount
  useEffect(() => {
    fetchCart();
  }, []);

  const value = {
    cart,
    loading,
    error,
    userId,
    fetchCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    cartItemCount: cart?.items?.length || 0,
    cartTotal: cart?.total_amount || 0
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
