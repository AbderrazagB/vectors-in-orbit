import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from './ToastContext';

export const StoreContext = createContext();

const API_URL = import.meta.env.VITE_MONGO_BACKEND_URL;

const getUserId = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return user._id || null;
};

export const StoreProvider = ({ children }) => {
  const toast = useToast();

  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [wishes, setWishes] = useState([]); 
  const [userRole, setUserRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [addingToCart, setAddingToCart] = useState(false);
  const [removingFromCart, setRemovingFromCart] = useState(false);
  const [creatingWish, setCreatingWish] = useState(false);


  // Check authentication on mount and fetch cart immediately
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    console.log('🔍 Initial auth check, user:', user);
    
    // Check if user exists by _id (more reliable than user_type)
    if (user._id) {
      console.log('✅ User authenticated, fetching cart for:', user._id);
      const role = user.user_type === 'customer' ? 'shopper' : (user.user_type || 'customer');
      setUserRole(role);
      setIsAuthenticated(true);
      // Fetch cart immediately on mount
      fetchCart(user._id);
    } else {
      console.log('❌ User not authenticated');
      setIsAuthenticated(false);
      setUserRole(null);
      setCart([]);
    }
  }, []);

  const checkAuthStatus = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    console.log('🔄 Checking auth status, user:', user);
    
    // Check if user exists by _id
    if (user._id) {
      const role = user.user_type === 'customer' ? 'shopper' : (user.user_type || 'customer');
      setUserRole(role);
      setIsAuthenticated(true);
      fetchCart(user._id);
    } else {
      setIsAuthenticated(false);
      setUserRole(null);
      setCart([]);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/products`);
      setProducts(res.data);
    } catch (err) { 
      console.error("API Error", err);
      toast.error('Failed to load products');
    }
  };

  const fetchCart = async (userId) => {
    try {
      console.log('🛒 Fetching cart for user:', userId);
      const res = await axios.get(`${API_URL}/api/cart/${userId}`);
      console.log('📦 Cart response:', res.data);
      setCart(res.data.items || []);
      console.log('✅ Cart updated with', res.data.items?.length || 0, 'items');
    } catch (err) { 
      console.error("❌ Cart fetch error", err);
      toast.error('Failed to fetch cart');
      setCart([]);
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUserRole(null);
    setIsAuthenticated(false);
    setCart([]);
    setWishes([]);
  };



  const addToCart = async (product) => {
    const userId = getUserId();
    if (!userId) {
      toast.error('Please login to add items to cart');
      return;
    }

    setAddingToCart(true);

    // Get proper image URL with fallback
    const imageUrl = (product.image_url && product.image_url !== 'nan' && product.image_url !== '') 
      ? product.image_url 
      : (product.image || '');

    try {
      console.log("product", product);
      await axios.post(`${API_URL}/api/cart/add`, {
        user_id: userId,
        product_id: product.product_id,
        product_name: product.name,
        price: product.price,
        image_url: imageUrl,
        quantity: 1
      });
      await fetchCart(userId);
      toast.success('Added to cart');
      console.log('✅ Added to cart');
    } catch (err) {
      console.error('Add to cart error:', err);
      toast.error('Failed to add item to cart');
      throw err;
    } finally {
      setAddingToCart(false);
    }
  };

  const removeFromCart = async (index, product) => {
    const userId = getUserId();
    if (!userId) return;

    setRemovingFromCart(true);

    try {
      // Get proper image URL with fallback
      const imageUrl = (product.image_url && product.image_url !== 'nan' && product.image_url !== '') 
        ? product.image_url 
        : (product.image || '');
      await axios.post(`${API_URL}/api/cart/remove`, {
        user_id: userId,
        product_id: product.product_id,
        product_name: product.name,
        price: product.price,
        image_url: imageUrl,
        quantity: 1

      });
      await fetchCart(userId);
      toast.success('Removed from cart');
      console.log('✅ Removed from cart');
    } catch (err) {
      console.error('Remove from cart error:', err);
      toast.error('Failed to remove from cart');
      // Fallback to local removal
      const newCart = [...cart];
      newCart.splice(index, 1);
      setCart(newCart);
    } finally {
      setRemovingFromCart(false);
    }
  };

  // NEW: Create a Wish Intent (local + optional server call)
  const createWish = async (wishData) => {
    setCreatingWish(true);
    try {
      const newWish = { id: Date.now(), ...wishData };
      setWishes([newWish, ...wishes]);

      // Track wishlist event (non-blocking)
      const userId = getUserId();
      if (userId) {
        const params = new URLSearchParams({
          user_id: userId,
          product_id: wishData.productId || 'custom',
          timestamp: new Date().toISOString(),
          session_id: `session_${userId}`
        });

        // Optionally send to server (non-blocking)
        fetch(`${API_URL}/events/wishlist-add?${params}`).catch(err => console.log('Event tracking failed:', err));
      }

      toast.success('Added to wishlist');
      return newWish;
    } catch (err) {
      toast.error('Failed to add to wishlist');
      throw err;
    } finally {
      setCreatingWish(false);
    }
  };

  return (
    <StoreContext.Provider value={{ 
      products, cart, wishes, userRole, 
      setWishes, setUserRole, addToCart, removeFromCart, createWish,
      fetchProducts, fetchCart, API_URL, isAuthenticated, logout, checkAuthStatus,
      addingToCart, removingFromCart, creatingWish
    }}>
      {children}
    </StoreContext.Provider>
  );
};