import { createContext, useState, useContext } from 'react';

const OrderContext = createContext();

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrder must be used within OrderProvider');
  }
  return context;
};

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_BASE_URL = `${import.meta.env.VITE_MONGO_BACKEND_URL}/api`;
  const userId = 'demo_user_001';

  // Fetch user orders
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/orders/user/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      setOrders(data.orders || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create order
  const createOrder = async (shippingAddress, paymentMethod = 'credit_card') => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          shipping_address: shippingAddress,
          payment_method: paymentMethod
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create order');
      }
      
      const data = await response.json();
      setError(null);
      await fetchOrders(); // Refresh orders list
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Error creating order:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get single order
  const getOrder = async (orderId) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`);
      if (!response.ok) throw new Error('Failed to fetch order');
      const data = await response.json();
      setError(null);
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Error fetching order:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    orders,
    loading,
    error,
    fetchOrders,
    createOrder,
    getOrder
  };

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
};
