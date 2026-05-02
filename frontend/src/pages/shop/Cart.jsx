import React, { useContext } from 'react';
import { Trash2, ArrowRight, ShoppingBag } from 'lucide-react';
import { StoreContext } from '../../context/StoreContext';
import { Navbar } from '../../components/Navbar';
import { Button } from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';

const Cart = () => {
  const { cart, removeFromCart } = useContext(StoreContext);
  const navigate = useNavigate();
  const total = cart.reduce((acc, item) => acc + item.price, 0).toFixed(3);

  const handleBuyNow = (item) => {
    // Navigate to checkout with single item
    navigate('/checkout', { state: { items: [item] } });
  };

  const handleCheckoutAll = () => {
    // Navigate to checkout with all cart items
    navigate('/checkout', { state: { items: cart } });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-12 pt-24">
        <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>
        
        {cart.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <p className="text-slate-400 text-lg">Your cart is currently empty.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8">
            {/* Items List */}
            <div className="md:col-span-2 space-y-4">
              {cart.map((item, idx) => {
                const imageUrl = (item.image_url && item.image_url !== 'nan' && item.image_url !== '') 
                  ? item.image_url 
                  : (item.image || 'https://placehold.co/200x200/e2e8f0/64748b?text=No+Image');
                
                return (
                  <div key={idx} className="flex gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <img 
                      src={imageUrl} 
                      alt={item.product_name || item.name} 
                      className="w-24 h-24 object-cover rounded-lg bg-slate-100"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://placehold.co/200x200/e2e8f0/64748b?text=No+Image';
                      }}
                    />
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-lg">{item.product_name || item.name}</h3>
                        <p className="text-emerald-600 font-medium">{item.price?.toFixed(3)} DT</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleBuyNow(item)} 
                          className="text-emerald-600 text-sm font-semibold hover:text-emerald-700 flex items-center gap-1"
                        >
                          <ShoppingBag size={14} /> Buy Now
                        </button>
                        <button 
                          onClick={() => removeFromCart(idx, item)} 
                          className="text-red-500 text-sm hover:text-red-700 flex items-center gap-1"
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className="h-fit bg-white p-6 rounded-xl border border-slate-200 shadow-lg sticky top-24">
              <h3 className="font-bold text-lg mb-4">Order Summary</h3>
              <div className="flex justify-between mb-2 text-slate-600">
                <span>Subtotal</span>
                <span>{total} DT</span>
              </div>
              <div className="flex justify-between mb-6 text-slate-600">
                <span>Shipping</span>
                <span>Free</span>
              </div>
              <div className="border-t pt-4 mb-6 flex justify-between font-bold text-xl">
                <span>Total</span>
                <span>{total} DT</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;