import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Plus, X, Heart, Image as ImageIcon, Type, ShoppingBag, Trash2, Edit, Star, FileText } from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import { ErrorScreen } from '../../components/ErrorScreen';
import { Navigate } from 'react-router-dom';

const SmartWishlist = () => {
  const [wishes, setWishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formType, setFormType] = useState('text'); // 'text', 'image', 'text_with_image'
  const [filter, setFilter] = useState('all'); // 'all', 'product', 'text', 'text_with_image'
  const [editingItem, setEditingItem] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const API_URL = import.meta.env.VITE_MONGO_BACKEND_URL;

  // Form State - UPDATED
  const [formData, setFormData] = useState({
    description: '',
    image_url: '',
    wishlist_notes: '',
    urgency_days: 7,
    budget_min: '',
    budget_max: '',
    desired_attributes: '',
  });

  const toast = useToast();

  useEffect(() => {
    if (user._id) {
      setFetchError(null);
      fetchWishlist();
    }
  }, [filter, retryCount]);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const url = filter === 'all'
        ? `${API_URL}/api/wishlist/${user._id}`
        : `${API_URL}/api/wishlist/${user._id}?item_type=${filter}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setWishes(data);
      }
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      setFetchError(error.message || 'Failed to load wishlist');
      toast.error(error.message || 'Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user._id) {
      toast.error('Please login to manage your wishlist');
      return;
    }

    try {
      let endpoint;
      let payload;

      // Convert desired_attributes from string to array
      const attributesArray = formData.desired_attributes
        ? formData.desired_attributes.split(',').map(attr => attr.trim()).filter(attr => attr.length > 0)
        : null;

      if (formType === 'text') {
        endpoint = `${API_URL}/api/wishlist/add/text`;
        payload = {
          user_id: user._id,
          description: formData.description,
          wishlist_notes: formData.wishlist_notes || null,
          urgency_days: formData.urgency_days,
          budget_min: formData.budget_min ? parseFloat(formData.budget_min) : null,
          budget_max: formData.budget_max ? parseFloat(formData.budget_max) : null,
          desired_attributes: attributesArray
        };
      } else if (formType === 'image') {
        endpoint = `${API_URL}/api/wishlist/add/text-with-image`;
        payload = {
          user_id: user._id,
          description: formData.description || 'Image item',
          image_url: formData.image_url,
          wishlist_notes: formData.wishlist_notes || null,
          urgency_days: formData.urgency_days,
          budget_min: formData.budget_min ? parseFloat(formData.budget_min) : null,
          budget_max: formData.budget_max ? parseFloat(formData.budget_max) : null,
          desired_attributes: attributesArray
        };
      } else {
        endpoint = `${API_URL}/api/wishlist/add/text-with-image`;
        payload = {
          user_id: user._id,
          description: formData.description,
          image_url: formData.image_url,
          wishlist_notes: formData.wishlist_notes || null,
          urgency_days: formData.urgency_days,
          budget_min: formData.budget_min ? parseFloat(formData.budget_min) : null,
          budget_max: formData.budget_max ? parseFloat(formData.budget_max) : null,
          desired_attributes: attributesArray
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setIsFormOpen(false);
        setFormData({ 
          description: '', 
          image_url: '', 
          wishlist_notes: '', 
          urgency_days: 7,
          budget_min: '',
          budget_max: '',
          desired_attributes: ''
        });
        fetchWishlist();
        toast.success('Item added to wishlist');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to add item to wishlist');
      }
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      toast.error('Failed to add item to wishlist');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    
    try {
      // Convert desired_attributes from string to array
      const attributesArray = formData.desired_attributes
        ? formData.desired_attributes.split(',').map(attr => attr.trim()).filter(attr => attr.length > 0)
        : null;

      const response = await fetch(`${API_URL}/api/wishlist/item/${editingItem._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: formData.description,
          image_url: formData.image_url || null,
          wishlist_notes: formData.wishlist_notes || null,
          urgency_days: formData.urgency_days,
          budget_min: formData.budget_min ? parseFloat(formData.budget_min) : null,
          budget_max: formData.budget_max ? parseFloat(formData.budget_max) : null,
          desired_attributes: attributesArray
        })
      });

      if (response.ok) {
        setEditingItem(null);
        setFormData({ 
          description: '', 
          image_url: '', 
          wishlist_notes: '', 
          urgency_days: 7,
          budget_min: '',
          budget_max: '',
          desired_attributes: ''
        });
        fetchWishlist();
      } else {
        toast.error('Failed to update item');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
    }
  };

  const handleDelete = async (itemId) => {
    if (!confirm('Are you sure you want to remove this item from your wishlist?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/wishlist/item/${itemId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchWishlist();
        toast.success('Item deleted');
      } else {
        toast.error('Failed to delete item');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const handleClearWishlist = async () => {
    if (!confirm('Are you sure you want to clear your entire wishlist? This cannot be undone.')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/wishlist/${user._id}/clear`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchWishlist();
        toast.success('Wishlist cleared');
      } else {
        toast.error('Failed to clear wishlist');
      }
    } catch (error) {
      console.error('Error clearing wishlist:', error);
      toast.error('Failed to clear wishlist');
    }
  };

  const getUrgencyLabel = (days) => {
    if (days <= 3) return { text: `${days} days`, color: 'bg-red-100 text-red-700' };
    if (days <= 7) return { text: `${days} days`, color: 'bg-orange-100 text-orange-700' };
    if (days <= 14) return { text: `${days} days`, color: 'bg-yellow-100 text-yellow-700' };
    if (days <= 30) return { text: `${days} days`, color: 'bg-blue-100 text-blue-700' };
    return { text: `${days} days`, color: 'bg-gray-100 text-gray-700' };
  };

  if (!user._id) {
    return <Navigate to="/login" replace />;
  }

  if (fetchError) {
    return <ErrorScreen message={fetchError} onRetry={() => setRetryCount(c => c + 1)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 pt-24 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              My Wishlist
            </h1>
            <p className="text-slate-500">
              Products you've saved, custom ideas, or inspiration with images
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => { setFormType('text'); setIsFormOpen(true); }} variant="outline">
              <Plus size={18} /> Add Idea
            </Button>
            <Button onClick={() => { setFormType('image'); setIsFormOpen(true); }} variant="outline">
              <Plus size={18} /> Add Photo
            </Button>
            <Button onClick={() => { setFormType('text_with_image'); setIsFormOpen(true); }}>
              <Plus size={18} /> Add Both
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            {[
              { id: 'all', label: 'All Items' },
              { id: 'product', label: 'Products' },
              { id: 'text', label: 'Ideas' },
              { id: 'text_with_image', label: 'With Photos' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  filter === tab.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          
          {wishes.length > 0 && (
            <button
              onClick={handleClearWishlist}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Wishlist Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          </div>
        ) : wishes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Heart size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Your wishlist is empty</h3>
            <p className="text-slate-500 mb-6">
              {filter === 'all' 
                ? 'Start adding items you love or ideas you want to remember.'
                : `No ${filter === 'product' ? 'products' : filter === 'text' ? 'ideas' : 'inspiration items'} in your wishlist yet.`}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {wishes.map((wish) => (
                <WishCard 
                  key={wish._id} 
                  wish={wish} 
                  onDelete={handleDelete}
                  onEdit={(item) => {
                    setEditingItem(item);
                    setFormType(item.item_type);
                    setFormData({
                      description: item.description || item.text_description || '',
                      image_url: item.image_url || '',
                      wishlist_notes: item.wishlist_notes || item.notes || '',
                      urgency_days: item.urgency_days || item.priority || 7,
                      budget_min: item.budget_min !== null && item.budget_min !== undefined ? item.budget_min : '',
                      budget_max: item.budget_max !== null && item.budget_max !== undefined ? item.budget_max : '',
                      desired_attributes: Array.isArray(item.desired_attributes) 
                        ? item.desired_attributes.join(', ') 
                        : item.desired_attributes || ''
                    });
                  }}
                  getUrgencyLabel={getUrgencyLabel}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Modal Form */}
      <AnimatePresence>
        {(isFormOpen || editingItem) && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setIsFormOpen(false); setEditingItem(null); }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-lg rounded-2xl shadow-2xl relative z-10 overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <h3 className="text-lg font-bold text-slate-900">
                  {editingItem ? 'Edit Wishlist Item' : `Add ${formType === 'text' ? 'Text Idea' : 'Item with Image'}`}
                </h3>
                <button 
                  onClick={() => { setIsFormOpen(false); setEditingItem(null); }} 
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X size={20}/>
                </button>
              </div>
              
              <form onSubmit={editingItem ? handleUpdate : handleSubmit} className="p-6 space-y-5">
                {formType !== 'image' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Description {formType !== 'image' && '*'}
                    </label>
                    <textarea
                      required={formType !== 'image'}
                      placeholder="e.g., Red running shoes size 42, winter jacket with hood..."
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all resize-none"
                      rows="3"
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                    />
                  </div>
                )}

                {(formType === 'image' || formType === 'text_with_image' || editingItem?.item_type === 'text_with_image') && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Image URL *
                    </label>
                    <div className="relative">
                      <ImageIcon size={16} className="absolute left-3 top-3 text-slate-400" />
                      <input 
                        required={formType === 'image' || formType === 'text_with_image'}
                        placeholder="https://example.com/image.jpg"
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                        value={formData.image_url}
                        onChange={e => setFormData({...formData, image_url: e.target.value})}
                      />
                    </div>
                    {formData.image_url && (
                      <img 
                        src={formData.image_url} 
                        alt="Preview" 
                        className="mt-2 w-full h-32 object-cover rounded-lg"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Urgency (Days)
                  </label>
                  <input 
                    type="number"
                    min="1"
                    max="365"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none bg-white"
                    value={formData.urgency_days}
                    onChange={e => setFormData({...formData, urgency_days: parseInt(e.target.value) || 7})}
                  />
                  <p className="text-xs text-slate-500 mt-1">How many days until you need this item?</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Max Budget (DT)
                    </label>
                    <input 
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="e.g., 200"
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                      value={formData.budget_max}
                      onChange={e => setFormData({...formData, budget_max: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Desired Attributes
                  </label>
                  <textarea 
                    placeholder="e.g., red color, size 42, waterproof, brand: Nike..."
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none resize-none"
                    rows="2"
                    value={formData.desired_attributes}
                    onChange={e => setFormData({...formData, desired_attributes: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Notes (optional)
                  </label>
                  <textarea 
                    placeholder="Add any additional notes or preferences..."
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none resize-none"
                    rows="3"
                    value={formData.wishlist_notes}
                    onChange={e => setFormData({...formData, wishlist_notes: e.target.value})}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="submit" className="flex-1 justify-center">
                    {editingItem ? 'Update Item' : 'Add to Wishlist'}
                  </Button>
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => { setIsFormOpen(false); setEditingItem(null); }}
                    className="flex-1 justify-center"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const WishCard = ({ wish, onDelete, onEdit, getUrgencyLabel }) => {
  const urgencyInfo = getUrgencyLabel(wish.urgency_days || wish.priority || 7);
  
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }} 
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${urgencyInfo.color}`}>
            {urgencyInfo.text}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => onEdit(wish)}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit"
            >
              <Edit size={14} />
            </button>
            <button
              onClick={() => onDelete(wish._id)}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Display based on type */}
        {wish.item_type === 'product' ? (
          <div className="flex gap-4 mb-3">
            <img 
              src={wish.product_image_url || 'https://placehold.co/80x80/e2e8f0/64748b?text=No+Image'} 
              alt={wish.product_name}
              className="w-20 h-20 rounded-lg object-cover bg-slate-100 border border-slate-100"
            />
            <div className="flex-1">
              <h4 className="font-bold text-slate-900 leading-tight mb-1">{wish.product_name}</h4>
              <p className="text-lg font-bold text-emerald-600">{wish.product_price.toFixed(3)} DT</p>
            </div>
          </div>
        ) : (
          <div>
            {wish.image_url && (
              <img 
                src={wish.image_url} 
                alt="Inspiration" 
                className="w-full h-32 rounded-lg object-cover bg-slate-100 border border-slate-100 mb-3"
              />
            )}
            <p className="text-sm text-slate-700 leading-relaxed mb-2">
              {wish.description || wish.text_description}
            </p>
          </div>
        )}

        {/* Budget Display */}
        {(wish.budget_min || wish.budget_max) && (
          <div className="mt-2 mb-2 flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600">Budget:</span>
            <span className="text-emerald-600 font-medium">
              {wish.budget_min && wish.budget_max 
                ? `${wish.budget_min} - ${wish.budget_max} DT`
                : wish.budget_min 
                ? `From ${wish.budget_min} DT`
                : `Up to ${wish.budget_max} DT`}
            </span>
          </div>
        )}

        {/* Desired Attributes */}
        {wish.desired_attributes && wish.desired_attributes.length > 0 && (
          <div className="mt-2 mb-2 p-2 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700">
              <Star size={12} className="inline mr-1" />
              {Array.isArray(wish.desired_attributes) 
                ? wish.desired_attributes.join(', ') 
                : wish.desired_attributes}
            </p>
          </div>
        )}

        {(wish.wishlist_notes || wish.notes) && (
          <div className="mt-3 p-2 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-600">
              <FileText size={12} className="inline mr-1" />
              {wish.wishlist_notes || wish.notes}
            </p>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              {wish.item_type === 'product' ? 'Product' : wish.item_type === 'text' ? 'Idea' : 'Inspiration'}
            </span>
            <span>{new Date(wish.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SmartWishlist;