import React, { useContext, useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Heart, Sparkles } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { StoreContext } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../ui/Button';

export const ProductCard = ({ product, source = 'all-products', position, layout = 'vertical' }) => {
  const { addToCart } = useContext(StoreContext);
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // Handle image_url field and fallback for missing images
  const imageUrl = (product.image_url && product.image_url !== 'nan' && product.image_url !== '') 
    ? product.image_url 
    : (product.image || 'https://placehold.co/300x300/e2e8f0/64748b?text=No+Image');

  // Calculate original price from discount percentage if product has discount
  const hasDiscount = product.has_discount && product.discount_amount > 0;
  const discountedPrice = product.price;
  const originalPrice = hasDiscount 
    ? discountedPrice / (1 - product.discount_amount / 100)
    : product.price;
  const savingsAmount = hasDiscount ? originalPrice - discountedPrice : 0;

  const handleProductClick = () => {
    // Track product click event (non-blocking)
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user._id) {
      const params = new URLSearchParams({
        product_id: product.product_id,
        user_id: user._id,
        source: source,
        timestamp: new Date().toISOString(),
        session_id: `session_${user._id}`
      });
      if (position !== undefined) params.append('position', position);
    }

    // Ask any CategoryTab to persist its snapshot immediately to avoid race on navigation
    try {
      window.dispatchEvent(new CustomEvent('persistCategoryState'));
    } catch (err) {
      // ignore
    }

    // Navigate with product data and source info - no need to fetch from API
    navigate(`/product/${product.product_id}`, { 
      state: { 
        source,
        from: location.pathname + location.search,
        product: {
          _id: product.product_id,
          product_id: product.product_id,
          name: product.name,
          price: product.price,
          image_url: imageUrl,
          description: product.description,
          category: product.category,
          brand: product.brand,
          vendor: product.vendor || product.metadata?.vendor || 'Unknown',
          has_discount: hasDiscount,
          discount_amount: product.discount_amount,
          original_price: originalPrice,
          stock: product.stock_quantity || 0
        }
      } 
    });
  };

  const handleAddToWishlist = async (e) => {
    e.stopPropagation();
    
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user._id) {
      toast.error('Please login to add items to your wishlist');
      return;
    }

    setIsAddingToWishlist(true);
    
    const MONGO_BACKEND_URL = import.meta.env.VITE_MONGO_BACKEND_URL;
    try {
      const response = await fetch(`${MONGO_BACKEND_URL}/api/wishlist/add/product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user._id,
          product_id: product.product_id,
          product_name: product.name,
          product_price: product.price,
          product_image_url: imageUrl,
          priority: 3
        })
      });

      if (response.ok) {
        // Show success feedback
        toast.success('Added to wishlist!');
        
        // Track wishlist event
        const params = new URLSearchParams({
          product_id: product.product_id,
          user_id: user._id,
          timestamp: new Date().toISOString(),
          session_id: `session_${user._id}`
        });

        fetch(`${MONGO_BACKEND_URL}/events/wishlist-add?${params}`).catch(err => console.log('Event tracking failed:', err));
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to add to wishlist');
      }
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      toast.error('Failed to add to wishlist');
    } finally {
      setIsAddingToWishlist(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: layout === 'horizontal' ? -2 : -5 }}
      className={`bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 cursor-pointer relative ${
        layout === 'horizontal' ? 'flex flex-row h-auto' : 'flex flex-col h-full'
      }`}
      onClick={handleProductClick}
    >
      <div className={`relative overflow-hidden bg-slate-50 flex-shrink-0 ${
        layout === 'horizontal' ? 'w-48 h-48 rounded-l-xl' : 'h-56 rounded-t-xl'
      }`}>
        {/* Wishlist Button */}
        <button
          onClick={handleAddToWishlist}
          disabled={isAddingToWishlist}
          className="absolute top-3 left-3 z-20 p-2 bg-white rounded-full shadow-md hover:bg-pink-50 transition-colors disabled:opacity-50"
          title="Add to wishlist"
        >
          <Heart 
            size={18} 
            className={`${isAddingToWishlist ? 'text-pink-500 fill-pink-500' : 'text-slate-400 hover:text-pink-500'}`}
          />
        </button>

        <img 
          src={imageUrl} 
          alt={product.name} 
          className="w-full h-full object-cover mix-blend-multiply" 
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://placehold.co/300x300/e2e8f0/64748b?text=No+Image';
          }}
        />
        {hasDiscount && (
          <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg z-10">
            -{product.discount_amount}%
          </div>
        )}
      </div>
      
      <div className={layout === 'horizontal' ? 'p-4 flex-1 flex flex-col justify-between' : 'p-5 flex-1 flex flex-col'}>
        <div className={layout === 'horizontal' ? '' : 'flex-1'}>
          {/* Match Reason Badge */}
          {product.match_reason && (
            <div className="flex items-center gap-1.5 mb-2 text-emerald-600">
              <Sparkles size={14} className="flex-shrink-0" />
              <span className="text-xs font-semibold">{product.match_reason}</span>
            </div>
          )}
          {product.category && (
            <div className={`font-bold text-emerald-600 uppercase tracking-wide ${layout === 'horizontal' ? 'text-xs mb-1' : 'text-xs mb-2'}`}>
              {product.category.split('-')[1] || product.category}
            </div>
          )}
          <h3 className={`font-bold text-slate-900 leading-tight ${layout === 'horizontal' ? 'text-base mb-1 line-clamp-1' : 'text-lg mb-2'}`}>{product.name}</h3>
          <p className={`text-slate-500 line-clamp-2 ${layout === 'horizontal' ? 'text-xs mb-2' : 'text-sm mb-4'}`}>{product.description}</p>
        </div>
        
        <div className={`flex items-center justify-between gap-3 ${layout === 'vertical' ? 'pt-4 border-t border-slate-50 mt-auto' : ''}`}>
          <div>
            <span className="text-xs text-slate-400 block">Price</span>
            {hasDiscount ? (
              <div className="flex items-center gap-2">
                <span className={`font-bold text-emerald-600 ${layout === 'horizontal' ? 'text-xl' : 'text-lg'}`}>{discountedPrice?.toFixed(3)} DT</span>
                <span className="text-sm text-slate-400 line-through">{originalPrice?.toFixed(3)} DT</span>
              </div>
            ) : (
              <span className={`font-bold text-slate-900 ${layout === 'horizontal' ? 'text-xl' : 'text-lg'}`}>{product.price?.toFixed(3)} DT</span>
            )}
          </div>
          <Button 
            onClick={async (e) => {
              e.stopPropagation();
              setIsAddingToCart(true);
              try {
                await addToCart(product);
                // addToCart already displays toast on success
              } catch (err) {
                toast.error(err.message || 'Failed to add to cart');
              } finally {
                setIsAddingToCart(false);
              }
            }} 
            variant="dark" 
            className="!px-4 !py-2 flex-shrink-0"
            disabled={isAddingToCart}
          >
            {isAddingToCart ? 'Adding...' : (<><ShoppingCart size={16} /> Buy</>)}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
