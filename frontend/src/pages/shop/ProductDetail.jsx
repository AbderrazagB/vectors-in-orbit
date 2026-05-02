import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Package, Star, Truck, ThumbsUp, CheckCircle, Edit, Trash2, Heart } from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { StoreContext } from '../../context/StoreContext';
import { useContext } from 'react';
import { useToast } from '../../context/ToastContext';
import { ErrorScreen } from '../../components/ErrorScreen';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart, products, fetchProducts } = useContext(StoreContext);
  const toast = useToast();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewData, setReviewData] = useState({ rating: 5, title: '', comment: '' });
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState(null);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [editingReview, setEditingReview] = useState(null);
  const [userReview, setUserReview] = useState(null);
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const API_URL = import.meta.env.VITE_MONGO_BACKEND_URL;

  const normalizeProduct = (p) => {
    if (!p) return null;
    return {
      _id: p.product_id || p._id || p.id || id,
      product_id: p.product_id || p._id || p.id || id,
      name: p.name || p.title || 'Product',
      price: p.price || p.price_amount || 0,
      image_url: p.image_url || p.image || p.imageUrl || '',
      description: p.description || p.desc || '',
      category: p.category || p.category_name || '',
      brand: p.brand || p.vendor || '',
      vendor: p.vendor || p.brand || '',
      has_discount: p.has_discount || (p.discount_amount && p.discount_amount > 0) || false,
      discount_amount: p.discount_amount || p.discount_percentage || 0,
      original_price: p.original_price || (p.price && p.discount_amount ? p.price / (1 - p.discount_amount / 100) : p.price) || p.price || 0,
      stock: p.stock || p.stock_quantity || p.stock_qty || 0
    };
  };

  useEffect(() => {
    // If product data was passed in navigation state, use it (fast)
    if (location.state?.product) {
      setProduct(normalizeProduct(location.state.product));
      setLoading(false);
      // Track product view event (non-blocking)
      if (user._id) {
        const source = location.state?.source || 'direct';
        const params = new URLSearchParams({
          product_id: id,
          user_id: user._id,
          source: source,
          timestamp: new Date().toISOString(),
          session_id: `session_${user._id}`
        });
      }
      // We can still fetch reviews/stats below
    } else {
      // Try to find the product in local store (when there's no backend)
      const found = products.find(p => p.product_id === id || p._id === id || p.id === id);
      if (found) {
        setProduct(normalizeProduct(found));
        setLoading(false);
      } else {
        // Nothing locally - fall back to fetching from API (if available)
        fetchProduct();
      }
    }

    // Always attempt to fetch reviews/stats (fails silently when backend is absent)
    fetchReviews();
    fetchReviewStats();
  }, [id, products]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/products/${id}`);
      if (!response.ok) throw new Error('Product not found');
      const data = await response.json();
      setProduct(data);
      
      // Track product view event (non-blocking)
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user._id) {
        const source = location.state?.source || 'direct';
        const params = new URLSearchParams({
          product_id: id,
          user_id: user._id,
          source: source,
          timestamp: new Date().toISOString(),
          session_id: `session_${user._id}`
        });
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      setFetchError(error.message || 'Failed to load product');
      toast.error('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      setLoadingReviews(true);
      const response = await fetch(`${API_URL}/api/reviews/product/${id}`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data);
        
        // Find user's review if exists
        if (user._id) {
          const userRev = data.find(r => r.user_id === user._id);
          setUserReview(userRev);
        }
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoadingReviews(false);
    }
  };

  const fetchReviewStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/reviews/product/${id}/stats`);
      if (response.ok) {
        const data = await response.json();
        setReviewStats(data);
      }
    } catch (error) {
      console.error('Error fetching review stats:', error);
      // non-critical but surface to user when available
      toast.error('Failed to load review stats');
    }
  };

  const handleAddToCart = async () => {
    try {
      // Ensure product_id exists for backend/cart API and pass normalized object
      const prodForCart = { ...product, product_id: product.product_id || product._id || id };
      setAddingToCart(true);
      await addToCart(prodForCart);
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2000);
    } catch (error) {
      toast.error(error.message || 'Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const [submittingReview, setSubmittingReview] = useState(false);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    
    if (!user._id) {
      toast.error('Please login to submit a review');
      return;
    }

    if (!reviewData.comment.trim()) {
      toast.error('Please write a comment');
      return;
    }

    try {
      setSubmittingReview(true);
      const reviewPayload = {
        product_id: product.product_id,
        user_id: user._id,
        user_name: user.username || user.email?.split('@')[0] || 'Anonymous',
        rating: reviewData.rating,
        title: reviewData.title,
        comment: reviewData.comment,
        verified_purchase: false // You can check if user actually purchased
      };

      const response = await fetch(`${API_URL}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewPayload)
      });

      if (response.ok) {
        // Track review event
        const params = new URLSearchParams({
          product_id: product.product_id,
          user_id: user._id,
          rating: reviewData.rating.toString(),
          timestamp: new Date().toISOString(),
          session_id: `session_${user._id}`
        });
        if (reviewData.comment) params.append('comment', reviewData.comment);
        

        toast.success('Review submitted successfully!');
        setShowReviewForm(false);
        setReviewData({ rating: 5, title: '', comment: '' });
        fetchReviews();
        fetchReviewStats();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleUpdateReview = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`${API_URL}/api/reviews/${editingReview._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: reviewData.rating,
          title: reviewData.title,
          comment: reviewData.comment
        })
      });

      if (response.ok) {
        toast.success('Review updated successfully!');
        setEditingReview(null);
        setReviewData({ rating: 5, title: '', comment: '' });
        fetchReviews();
        fetchReviewStats();
      } else {
        toast.error('Failed to update review');
      }
    } catch (error) {
      console.error('Error updating review:', error);
      toast.error('Failed to update review');
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!confirm('Are you sure you want to delete this review?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/reviews/${reviewId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Review deleted successfully!');
        fetchReviews();
        fetchReviewStats();
      } else {
        toast.error('Failed to delete review');
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete review');
    }
  };

  const handleMarkHelpful = async (reviewId) => {
    try {
      const response = await fetch(`${API_URL}/api/reviews/${reviewId}/helpful`, {
        method: 'POST'
      });

      if (response.ok) {
        fetchReviews();
      }
    } catch (error) {
      console.error('Error marking review as helpful:', error);
    }
  };

  const handleAddToWishlist = async () => {
    if (!user._id) {
      toast.error('Please login to add items to your wishlist');
      return;
    }

    setIsAddingToWishlist(true);
    
    try {
      const imageUrl = product.image_url && product.image_url !== 'nan' && product.image_url !== '' 
        ? product.image_url 
        : 'https://placehold.co/600x600/e2e8f0/64748b?text=No+Image+Available';

      const response = await fetch(`${API_URL}/api/wishlist/add/product`, {
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
        toast.success('Added to wishlist!');
        
        // Track wishlist event
        const params = new URLSearchParams({
          product_id: product.product_id,
          user_id: user._id,
          timestamp: new Date().toISOString(),
          session_id: `session_${user._id}`
        });

        fetch(`${API_URL}/events/wishlist-add?${params}`).catch(err => console.log('Event tracking failed:', err));

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return <ErrorScreen message={fetchError} onRetry={() => { setFetchError(null); fetchProduct(); }} />;
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-6 py-20 text-center">
          <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h2>
          <button
            onClick={() => navigate('/shop')}
            className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="mr-2" size={20} />
            Back to Shop
          </button>
        </div>
      </div>
    );
  }

  const imageUrl = product.image_url && product.image_url !== 'nan' && product.image_url !== '' 
    ? product.image_url 
    : 'https://placehold.co/600x600/e2e8f0/64748b?text=No+Image+Available';

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Back Button */}
        <button
          onClick={() => {
            if (location.state?.from) {
              navigate(location.state.from);
            } else {
              navigate(-1);
            }
          }}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="mr-2" size={20} />
          Back to Shop
        </button>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
            {/* Product Image */}
            <div className="relative flex items-center justify-center bg-gray-50 rounded-lg p-8">
              <img
                src={imageUrl}
                alt={product.name}
                className="max-w-full max-h-96 object-contain"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://placehold.co/600x600/e2e8f0/64748b?text=Image+Not+Available';
                }}
              />
              {product.has_discount && product.discount_amount && (
                <div className="absolute top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg text-lg font-bold shadow-lg">
                  {product.discount_amount} %
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex flex-col">
              {/* Category & Brand */}
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                  {product.category}
                </span>
                {product.brand && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                    {product.brand}
                  </span>
                )}
              </div>

              {/* Product Name */}
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {product.name}
              </h1>

              {/* Price */}
              <div className="mb-6">
                {product.has_discount ? (
                  <div>
                    <div className="flex items-baseline gap-3 mb-2">
                      <span className="text-4xl font-bold text-emerald-600">
                        {product.price.toFixed(3)} DT
                      </span>
                      <span className="text-2xl text-gray-400 line-through">
                        {product.original_price.toFixed(3)} DT
                      </span>
                    </div>
                    <div className="inline-block px-3 py-1 bg-red-100 text-red-700 text-sm font-bold rounded-full">
                      You save {(product.original_price - product.price).toFixed(3)} DT!
                    </div>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-gray-900">
                      {product.price.toFixed(3)} DT
                    </span>
                  </div>
                )}
              </div>

              {/* Stock Status */}
              <div className="mb-6">
                {product.stock > 0 || product.stock_quantity > 0 ? (
                  <div className="flex items-center text-green-600">
                    <Package className="mr-2" size={20} />
                    <span className="font-medium">In Stock</span>
                  </div>
                ) : (
                  <div className="flex items-center text-red-600">
                    <Package className="mr-2" size={20} />
                    <span className="font-medium">Out of Stock</span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-600 leading-relaxed">
                  {product.description || 'No description available.'}
                </p>
              </div>

              {/* Quantity Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    -
                  </button>
                  <span className="px-6 py-2 border border-gray-300 rounded-md font-medium">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                    disabled={quantity >= product.stock}
                  >
                    +
                  </button>
                </div>
              </div>



              {/* Add to Cart Button */}
              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={product.stock === 0 || addedToCart || addingToCart}
                  className={`flex-1 py-4 rounded-lg font-semibold text-white flex items-center justify-center gap-2 transition-colors ${
                    addedToCart || addingToCart
                      ? 'bg-green-600 hover:bg-green-700'
                      : product.stock === 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <ShoppingCart size={20} />
                  {addingToCart ? 'Adding...' : addedToCart ? 'Added to Cart!' : product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                </button>
                
                <button
                  onClick={handleAddToWishlist}
                  disabled={isAddingToWishlist}
                  className="px-6 py-4 rounded-lg font-semibold border-2 border-pink-600 text-pink-600 hover:bg-pink-50 transition-colors disabled:opacity-50 flex items-center gap-2"
                  title="Add to wishlist"
                >
                  <Heart size={20} className={isAddingToWishlist ? 'fill-pink-600' : ''} />
                  Wishlist
                </button>
              </div>

              {/* Additional Info */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center text-gray-600 mb-3">
                  <Truck className="mr-3" size={20} />
                  <span>Free shipping on orders over $50</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Star className="mr-3" size={20} />
                  <span>Sold by {(product.vendor || 'Unknown').toUpperCase()}</span>
                </div>
              </div>

              {/* Review Section */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                {!showReviewForm && !editingReview && !userReview ? (
                  <button
                    onClick={() => setShowReviewForm(true)}
                    className="w-full py-3 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                  >
                    Write a Review
                  </button>
                ) : (userReview && !editingReview) ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800 mb-2">You have already reviewed this product</p>
                    <button
                      onClick={() => {
                        setEditingReview(userReview);
                        setReviewData({
                          rating: userReview.rating,
                          title: userReview.title || '',
                          comment: userReview.comment
                        });
                      }}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                    >
                      Edit your review
                    </button>
                  </div>
                ) : (
                  <form onSubmit={editingReview ? handleUpdateReview : handleReviewSubmit} className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-900">
                      {editingReview ? 'Edit Your Review' : 'Write a Review'}
                    </h3>
                    
                    {/* Rating */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rating *
                      </label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewData({ ...reviewData, rating: star })}
                            className={`text-3xl transition-colors ${
                              star <= reviewData.rating ? 'text-yellow-400' : 'text-gray-300'
                            } hover:text-yellow-400`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Review Title (optional)
                      </label>
                      <input
                        type="text"
                        value={reviewData.title}
                        onChange={(e) => setReviewData({ ...reviewData, title: e.target.value })}
                        placeholder="Sum up your experience"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>

                    {/* Comment */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Review *
                      </label>
                      <textarea
                        value={reviewData.comment}
                        onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                        rows="4"
                        placeholder="Share your thoughts about this product..."
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                      >
                        {editingReview ? 'Update Review' : 'Submit Review'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowReviewForm(false);
                          setEditingReview(null);
                          setReviewData({ rating: 5, title: '', comment: '' });
                        }}
                        className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="border-t border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Reviews</h2>

            {/* Review Statistics */}
            {reviewStats && reviewStats.total_reviews > 0 && (
              <div className="bg-gray-50 rounded-lg p-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Overall Rating */}
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-5xl font-bold text-gray-900 mb-2">
                        {reviewStats.average_rating.toFixed(1)}
                      </div>
                      <div className="flex justify-center mb-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-5 h-5 ${
                              star <= Math.round(reviewStats.average_rating)
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="text-sm text-gray-600">
                        Based on {reviewStats.total_reviews} reviews
                      </div>
                    </div>
                  </div>

                  {/* Rating Distribution */}
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((rating) => {
                      const count = reviewStats.rating_distribution[rating] || 0;
                      const percentage = reviewStats.total_reviews > 0 
                        ? (count / reviewStats.total_reviews) * 100 
                        : 0;
                      
                      return (
                        <div key={rating} className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700 w-12">
                            {rating} star
                          </span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-yellow-400 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 w-12 text-right">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Reviews List */}
            {loadingReviews ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Star className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No reviews yet</h3>
                <p className="text-gray-600">Be the first to review this product!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {reviews.map((review) => (
                  <div key={review._id} className="border-b border-gray-200 pb-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= review.rating
                                    ? 'text-yellow-400 fill-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          {review.verified_purchase && (
                            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                              <CheckCircle className="w-3 h-3" />
                              Verified Purchase
                            </span>
                          )}
                        </div>
                        
                        {review.title && (
                          <h4 className="font-semibold text-gray-900 mb-1">
                            {review.title}
                          </h4>
                        )}
                        
                        <p className="text-gray-700 mb-2">{review.comment}</p>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="font-medium">{review.user_name}</span>
                          <span>•</span>
                          <span>{new Date(review.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      {/* User's own review actions */}
                      {user._id === review.user_id && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingReview(review);
                              setReviewData({
                                rating: review.rating,
                                title: review.title || '',
                                comment: review.comment
                              });
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit review"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteReview(review._id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete review"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Helpful button */}
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => handleMarkHelpful(review._id)}
                        className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        <ThumbsUp className="w-4 h-4" />
                        <span>Helpful ({review.helpful_count || 0})</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
