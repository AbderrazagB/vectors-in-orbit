import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import { CartProvider } from './context/CartContext';
import { OrderProvider } from './context/OrderContext';
import { ToastProvider } from './context/ToastContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import ShopHome from './pages/shop/ShopHome';
import ProductDetail from './pages/shop/ProductDetail';
import Cart from './pages/shop/Cart';
import CartPage from './pages/shop/CartPage';
import CheckoutPage from './pages/shop/CheckoutPage';
import OrdersPage from './pages/shop/OrdersPage';
import PurchaseHistory from './pages/shop/PurchaseHistory';
import SmartWishlist from './pages/shop/SmartWishlist';
import VendorDashboard from './pages/vendor/VendorDashboard';

function App() {
  return (
    <ToastProvider>
      <StoreProvider>
        <CartProvider>
          <OrderProvider>
            <Router>
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />

                {/* Protected routes - require auth (only Landing + Login are public) */}
                <Route path="/shop" element={<ProtectedRoute><ShopHome /></ProtectedRoute>} />
                <Route path="/product/:id" element={<ProtectedRoute><ProductDetail /></ProtectedRoute>} />

                <Route path="/wishlist" element={<ProtectedRoute><SmartWishlist /></ProtectedRoute>} />
                <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
                <Route path="/cart-new" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
                <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
                <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
                <Route path="/purchases" element={<ProtectedRoute><PurchaseHistory /></ProtectedRoute>} />
                <Route path="/vendor" element={<ProtectedRoute><VendorDashboard /></ProtectedRoute>} />

                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </ErrorBoundary>
          </Router>
        </OrderProvider>
      </CartProvider>
    </StoreProvider>
    </ToastProvider>
  );
}

export default App;