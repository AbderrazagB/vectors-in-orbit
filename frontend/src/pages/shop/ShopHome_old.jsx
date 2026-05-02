import React, { useContext, useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, ChevronLeft, ChevronRight, Tag, Package, Star, Search, X, Heart } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { StoreContext } from '../../context/StoreContext';
import { Navbar } from '../../components/Navbar';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';

const ProductCard = ({ product, source = 'all-products', position }) => {
  const { addToCart } = useContext(StoreContext);
  const navigate = useNavigate();
  const toast = useToast();
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);

  // Handle image_url field and fallback for missing images
  const imageUrl = (product.image_url && product.image_url !== 'nan' && product.image_url !== '') 
    ? product.image_url 
    : (product.image || 'https://placehold.co/300x300/e2e8f0/64748b?text=No+Image');

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
    // Navigate with source info for ProductViewedEvent
    navigate(`/product/${product.product_id}`, { state: { source } });
  };

  const handleAddToWishlist = async (e) => {
    e.stopPropagation();
    
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user._id) {
      alert('Please login to add items to your wishlist');
      return;
    }

    setIsAddingToWishlist(true);
    
    try {
      const response = await fetch('http://localhost:8000/api/wishlist/add/product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user._id,
          product_id:product.product_id,
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
          product_id:product.product_id,
          user_id: user._id,
          timestamp: new Date().toISOString(),
          session_id: `session_${user._id}`
        });
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to add to wishlist');
      }
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      alert('Failed to add to wishlist');
    } finally {
      setIsAddingToWishlist(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -5 }}
      className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 flex flex-col h-full cursor-pointer relative"
      onClick={handleProductClick}
    >
      <div className="relative h-56 overflow-hidden rounded-t-xl bg-slate-50">
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
        {product.has_discount && product.discount_amount && (
          <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg z-10">
            SAVE {product.discount_amount.toFixed(3)} DT
          </div>
        )}
      </div>
      
      <div className="p-5 flex-1 flex flex-col">
        <div className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-2">{product.category}</div>
        <h3 className="text-lg font-bold text-slate-900 mb-2 leading-tight">{product.name}</h3>
        <p className="text-slate-500 text-sm mb-4 line-clamp-2 flex-1">{product.description}</p>
        
        <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-auto">
          <div>
            <span className="text-xs text-slate-400 block">Price</span>
            {product.has_discount ? (
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-emerald-600">{product.price?.toFixed(3)} DT</span>
                <span className="text-sm text-slate-400 line-through">{product.original_price?.toFixed(3)} DT</span>
              </div>
            ) : (
              <span className="text-lg font-bold text-slate-900">{product.price?.toFixed(3)} DT</span>
            )}
          </div>
          <Button 
            onClick={(e) => {
              e.stopPropagation();
              addToCart(product);
            }} 
            variant="dark" 
            className="!px-4 !py-2"
          >
            <ShoppingCart size={16} /> Buy
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

const ShopHome = () => {
  const { addToCart } = useContext(StoreContext);
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [appliedFilters, setAppliedFilters] = useState({ category: '', priceMin: '', priceMax: '' });
  const [activeTab, setActiveTab] = useState('shop'); // Track active category tab
  const [selectedGender, setSelectedGender] = useState(''); // Fashion filter
  const [selectedCondition, setSelectedCondition] = useState(''); // Electronics filter
  const [selectedBrand, setSelectedBrand] = useState('');
  const [showDiscountOnly, setShowDiscountOnly] = useState(false);
  const [selectedSubcategories, setSelectedSubcategories] = useState([]); // Multi-select subcategory filter

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const API_URL = 'http://localhost:8000';
  const location = useLocation();

  // Handle URL query params for tab navigation
  const urlTab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    return tab && ['all', 'fashion', 'electronics', 'baby'].includes(tab) ? tab : 'shop';
  }, [location.search]);

  // Update activeTab when URL changes
  useEffect(() => {
    if (urlTab !== activeTab) {
      setActiveTab(urlTab);
      setSelectedSubcategories([]); // Reset subcategories when changing tabs
    }
  }, [urlTab]); // Only depend on urlTab, not activeTab to avoid loops

  // Placeholder products with new structure
  const [products] = useState([
    {
      product_id: 'prod_001',
      metadata: {
        name: 'Summer Floral Dress',
        description: 'Beautiful floral print summer dress perfect for casual outings',
        category: 'Fashion',
        subcategory: 'Women',
        brand: 'Zara',
        gender: 'Women',
        condition: 'New',
        price: 89.99,
        stock_quantity: 25,
        tags: ['dress', 'summer', 'floral', 'casual'],
        is_discounted: true,
        image_url: 'https://placehold.co/300x300/ffc0cb/ffffff?text=Floral+Dress',
        updated_at: '2026-01-20T10:00:00Z',
        created_at: '2026-01-15T10:00:00Z'
      }
    },
    {
      product_id: 'prod_002',
      metadata: {
        name: 'Dell PowerEdge Server',
        description: 'Enterprise-grade server with high performance capabilities',
        category: 'Electronics',
        subcategory: 'Servers',
        brand: 'Dell',
        gender: null,
        condition: 'New',
        price: 2499.99,
        stock_quantity: 5,
        tags: ['server', 'enterprise', 'dell', 'hardware'],
        is_discounted: false,
        image_url: 'https://placehold.co/300x300/4169e1/ffffff?text=Dell+Server',
        updated_at: '2026-01-22T10:00:00Z',
        created_at: '2026-01-18T10:00:00Z'
      }
    },
    {
      product_id: 'prod_003',
      metadata: {
        name: 'Men\'s Leather Jacket',
        description: 'Genuine leather jacket with modern fit',
        category: 'Fashion',
        subcategory: 'Men',
        brand: 'Levi\'s',
        gender: 'Men',
        condition: 'New',
        price: 199.99,
        stock_quantity: 15,
        tags: ['jacket', 'leather', 'winter', 'men'],
        is_discounted: true,
        image_url: 'https://placehold.co/300x300/8b4513/ffffff?text=Leather+Jacket',
        updated_at: '2026-01-21T10:00:00Z',
        created_at: '2026-01-16T10:00:00Z'
      }
    },
    {
      product_id: 'prod_004',
      metadata: {
        name: 'MacBook Pro 16"',
        description: 'Latest MacBook Pro with M3 chip',
        category: 'Electronics',
        subcategory: 'Laptops',
        brand: 'Apple',
        gender: null,
        condition: 'New',
        price: 2799.99,
        stock_quantity: 10,
        tags: ['laptop', 'apple', 'macbook', 'pro'],
        is_discounted: false,
        image_url: 'https://placehold.co/300x300/c0c0c0/000000?text=MacBook+Pro',
        updated_at: '2026-01-23T10:00:00Z',
        created_at: '2026-01-19T10:00:00Z'
      }
    },
    {
      product_id: 'prod_005',
      metadata: {
        name: 'Kids Sneakers',
        description: 'Comfortable sneakers for active kids',
        category: 'Fashion',
        subcategory: 'Kids',
        brand: 'Nike',
        gender: 'Kids',
        condition: 'New',
        price: 49.99,
        stock_quantity: 30,
        tags: ['shoes', 'sneakers', 'kids', 'sport'],
        is_discounted: true,
        image_url: 'https://placehold.co/300x300/ff6347/ffffff?text=Kids+Sneakers',
        updated_at: '2026-01-24T10:00:00Z',
        created_at: '2026-01-20T10:00:00Z'
      }
    },
    {
      product_id: 'prod_006',
      metadata: {
        name: 'Baby Feeding Set',
        description: 'Complete feeding set for babies including bottles and utensils',
        category: 'Baby',
        subcategory: 'Feeding',
        brand: 'Philips Avent',
        gender: null,
        condition: 'New',
        price: 45.99,
        stock_quantity: 20,
        tags: ['baby', 'feeding', 'bottles', 'essential'],
        is_discounted: false,
        image_url: 'https://placehold.co/300x300/ffd700/ffffff?text=Baby+Feeding',
        updated_at: '2026-01-25T10:00:00Z',
        created_at: '2026-01-21T10:00:00Z'
      }
    },
    {
      product_id: 'prod_007',
      metadata: {
        name: 'Educational Baby Toys',
        description: 'Safe and educational toys for early development',
        category: 'Baby',
        subcategory: 'Toys',
        brand: 'Fisher-Price',
        gender: null,
        condition: 'New',
        price: 35.50,
        stock_quantity: 40,
        tags: ['baby', 'toys', 'educational', 'safe'],
        is_discounted: true,
        image_url: 'https://placehold.co/300x300/87ceeb/ffffff?text=Baby+Toys',
        updated_at: '2026-01-26T10:00:00Z',
        created_at: '2026-01-22T10:00:00Z'
      }
    },
    {
      product_id: 'prod_008',
      metadata: {
        name: 'Baby Onesies Pack',
        description: 'Soft cotton onesies for babies, pack of 5',
        category: 'Baby',
        subcategory: 'Clothes',
        brand: 'Carter\'s',
        gender: null,
        condition: 'New',
        price: 29.99,
        stock_quantity: 35,
        tags: ['baby', 'clothes', 'cotton', 'onesies'],
        is_discounted: true,
        image_url: 'https://placehold.co/300x300/ffb6c1/ffffff?text=Baby+Clothes',
        updated_at: '2026-01-27T10:00:00Z',
        created_at: '2026-01-23T10:00:00Z'
      }
    },
    {
      product_id: 'prod_009',
      metadata: {
        name: 'Baby Crib',
        description: 'Safe and comfortable crib with adjustable mattress height',
        category: 'Baby',
        subcategory: 'Furniture',
        brand: 'IKEA',
        gender: null,
        condition: 'New',
        price: 299.99,
        stock_quantity: 8,
        tags: ['baby', 'furniture', 'crib', 'nursery'],
        is_discounted: false,
        image_url: 'https://placehold.co/300x300/dda0dd/ffffff?text=Baby+Crib',
        updated_at: '2026-01-27T10:00:00Z',
        created_at: '2026-01-24T10:00:00Z'
      }
    }
  ]);

  // Parse category from old format (e.g., "Fashion-Kids" -> category: "Fashion", subcategory: "Kids")
  const parseProductCategory = (product) => {
    const metadata = product.metadata || {};
    let category = metadata.category || '';
    let subcategory = metadata.subcategory || null;
    
    // Handle old format like "Fashion-Kids"
    if (category.includes('-')) {
      const parts = category.split('-');
      category = parts[0];
      subcategory = parts[1] || subcategory;
    }
    
    return {
      ...product,
      metadata: {
        ...metadata,
        category,
        subcategory
      },
      // Legacy fields for compatibility
      category,
      name: metadata.name,
      description: metadata.description,
      price: metadata.price,
      image_url: metadata.image_url,
      has_discount: metadata.is_discounted,
      brand: metadata.brand,
      _id: product.product_id
    };
  };

  // Get unique categories for tabs
  const parsedProducts = products.map(parseProductCategory);
  const uniqueCategories = [...new Set(parsedProducts.map(p => p.metadata.category))].filter(Boolean);
  
  // Generate tabs dynamically
  const tabs = [
    { id: 'shop', label: 'Shop', count: parsedProducts.length },
    { id: 'all', label: 'All Products', count: parsedProducts.length },
    ...uniqueCategories.map(cat => ({
      id: cat.toLowerCase(),
      label: cat,
      count: parsedProducts.filter(p => p.metadata.category === cat).length
    }))
  ];

  // Filter products by active tab first
  let tabFilteredProducts = parsedProducts;
  if (activeTab !== 'shop' && activeTab !== 'all') {
    const categoryName = tabs.find(t => t.id === activeTab)?.label;
    tabFilteredProducts = parsedProducts.filter(p => p.metadata.category === categoryName);
  }

  // Compute filtered products using useMemo
  const filteredProducts = useMemo(() => {
    let filtered = [...tabFilteredProducts];

    // Search filter - only use activeSearchQuery (submitted search)
    if (activeSearchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(activeSearchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(activeSearchQuery.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Price filter
    if (priceRange.min) {
      filtered = filtered.filter(p => p.price >= parseFloat(priceRange.min));
    }
    if (priceRange.max) {
      filtered = filtered.filter(p => p.price <= parseFloat(priceRange.max));
    }

    // Gender filter (Fashion)
    if (selectedGender) {
      filtered = filtered.filter(p => p.metadata?.gender === selectedGender);
    }

    // Condition filter (Electronics)
    if (selectedCondition) {
      filtered = filtered.filter(p => p.metadata?.condition === selectedCondition);
    }

    // Brand filter
    if (selectedBrand) {
      filtered = filtered.filter(p => p.metadata?.brand === selectedBrand);
    }

    // Subcategory filter (multi-select)
    if (selectedSubcategories.length > 0) {
      filtered = filtered.filter(p => selectedSubcategories.includes(p.metadata?.subcategory));
    }

    // Discount filter
    if (showDiscountOnly) {
      filtered = filtered.filter(p => p.has_discount);
    }

    return filtered;
  }, [tabFilteredProducts, activeSearchQuery, selectedCategory, priceRange.min, priceRange.max, selectedGender, selectedCondition, selectedBrand, showDiscountOnly, selectedSubcategories]);

  const handleSearchSubmit = () => {
    // Set the active search query to trigger filtering
    setActiveSearchQuery(searchQuery);
    setCurrentPage(1); // Reset to first page
    
    // Track search event (non-blocking) only when user submits
    if (searchQuery) {
      const params = new URLSearchParams({
        query: searchQuery,
        user_id: user._id || 'anonymous',
        timestamp: new Date().toISOString(),
        session_id: `session_${user._id || 'anonymous'}`
      });
    }
  };

  const handleFilterApply = () => {
    setCurrentPage(1); // Reset to first page
    
    // Send filter event when filters are applied
    if (selectedCategory || priceRange.min || priceRange.max) {
      // Check if filters actually changed
      if (selectedCategory !== appliedFilters.category || 
          priceRange.min !== appliedFilters.priceMin || 
          priceRange.max !== appliedFilters.priceMax) {
        
        const params = new URLSearchParams({
          user_id: user._id || 'anonymous',
          timestamp: new Date().toISOString(),
          session_id: `session_${user._id || 'anonymous'}`
        });
        
        if (selectedCategory) params.append('category', selectedCategory);
        if (priceRange.min) params.append('price_min', priceRange.min);
        if (priceRange.max) params.append('price_max', priceRange.max);
        
        
        // Update applied filters
        setAppliedFilters({
          category: selectedCategory,
          priceMin: priceRange.min,
          priceMax: priceRange.max
        });
      }
    }
  };

  // Get featured products for carousel (products with discounts or first 5)
  const featuredProducts = products.filter(p => p.has_discount).slice(0, 5).length > 0
    ? products.filter(p => p.has_discount).slice(0, 5)
    : products.slice(0, 5);

  // Auto-advance carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % featuredProducts.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [featuredProducts.length]);

  // Get different product categories
  const trendingProducts = filteredProducts.slice(0, 8);
  const discountedProducts = filteredProducts.filter(p => p.has_discount).slice(0, 4);
  const newArrivals = filteredProducts.slice(0, 4);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  // Get unique categories
  const categories = [...new Set(products.map(p => p.category))].filter(Boolean);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    const element = document.getElementById('all-products');
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % featuredProducts.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + featuredProducts.length) % featuredProducts.length);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Navbar/>
      {/* Search and Filter Bar */}
      <div className="bg-white  pt-20">
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Main Search Bar */}
          <div className="relative mb-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearchSubmit();
                    }
                  }}
                  className="w-full pl-12 pr-10 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
              <button
                onClick={handleSearchSubmit}
                className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
              >
                Search
              </button>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Category Filter - Only show on "All" tab */}
            {activeTab === 'all' && (
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setTimeout(() => handleFilterApply(), 300);
                }}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-white"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}

            {/* Fashion-specific filters */}
            {(activeTab === 'fashion' || (activeTab === 'all' && !selectedCategory)) && (
              <>
                {/* Gender Filter */}
                <select
                  value={selectedGender}
                  onChange={(e) => {
                    setSelectedGender(e.target.value);
                    setTimeout(() => handleFilterApply(), 300);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-white"
                >
                  <option value="">All Genders</option>
                  <option value="Men">Men</option>
                  <option value="Women">Women</option>
                  <option value="Kids">Kids</option>
                  <option value="Unisex">Unisex</option>
                </select>
              </>
            )}

            {/* Electronics-specific filters */}
            {(activeTab === 'electronics' || (activeTab === 'all' && !selectedCategory)) && (
              <>
                {/* Condition Filter */}
                <select
                  value={selectedCondition}
                  onChange={(e) => {
                    setSelectedCondition(e.target.value);
                    setTimeout(() => handleFilterApply(), 300);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-white"
                >
                  <option value="">All Conditions</option>
                  <option value="New">New</option>
                  <option value="Used">Used</option>
                  <option value="Refurbished">Refurbished</option>
                </select>
              </>
            )}

            {/* Baby-specific filters - show for Baby tab */}
            {activeTab === 'baby' && (
              <>
                {/* Age Range Filter (optional - can be added later) */}
              </>
            )}

            {/* Brand Filter - Show for all tabs */}
            <select
              value={selectedBrand}
              onChange={(e) => {
                setSelectedBrand(e.target.value);
                setTimeout(() => handleFilterApply(), 300);
              }}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-white"
            >
              <option value="">All Brands</option>
              {[...new Set(parsedProducts.map(p => p.metadata?.brand).filter(Boolean))].map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>

            {/* Discount Filter */}
            <label className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg bg-white cursor-pointer hover:border-emerald-500">
              <input
                type="checkbox"
                checked={showDiscountOnly}
                onChange={(e) => {
                  setShowDiscountOnly(e.target.checked);
                  setTimeout(() => handleFilterApply(), 300);
                }}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <span className="text-sm text-slate-700">Discounts Only</span>
            </label>

            {/* Price Range */}
            <div className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg">
              <span className="text-sm text-slate-600">Price:</span>
              <input
                type="number"
                placeholder="Min"
                value={priceRange.min}
                onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                onBlur={handleFilterApply}
                className="w-20 text-sm outline-none"
              />
              <span className="text-slate-400">-</span>
              <input
                type="number"
                placeholder="Max"
                value={priceRange.max}
                onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                onBlur={handleFilterApply}
                className="w-20 text-sm outline-none"
              />
              <span className="text-sm text-slate-600">DT</span>
            </div>

            {/* Apply Filters Button - Remove it since filters auto-apply now */}

            {/* Results Count */}
            <div className="ml-auto">
              <span className="text-sm text-slate-600">
                {filteredProducts.length} products
              </span>
            </div>
          </div>
          
          {/* Active Filters Display */}
          {(activeSearchQuery || selectedCategory || priceRange.min || priceRange.max || selectedGender || selectedCondition || selectedBrand || showDiscountOnly || selectedSubcategories.length > 0) && (
            <div className="mt-3 flex gap-2 flex-wrap items-center">
              {activeSearchQuery && (
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-sm flex items-center gap-2">
                  {activeSearchQuery}
                  <button onClick={() => { setActiveSearchQuery(''); setSearchQuery(''); }} className="hover:text-slate-900">
                    <X size={14} />
                  </button>
                </span>
              )}
              {selectedCategory && (
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-sm flex items-center gap-2">
                  {selectedCategory}
                  <button onClick={() => setSelectedCategory('')} className="hover:text-slate-900">
                    <X size={14} />
                  </button>
                </span>
              )}
              {selectedSubcategories.map((subcat) => (
                <span key={subcat} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-sm flex items-center gap-2">
                  Category: {subcat}
                  <button onClick={() => setSelectedSubcategories(selectedSubcategories.filter(s => s !== subcat))} className="hover:text-slate-900">
                    <X size={14} />
                  </button>
                </span>
              ))}
              {selectedGender && (
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-sm flex items-center gap-2">
                  Gender: {selectedGender}
                  <button onClick={() => setSelectedGender('')} className="hover:text-slate-900">
                    <X size={14} />
                  </button>
                </span>
              )}
              {selectedCondition && (
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-sm flex items-center gap-2">
                  Condition: {selectedCondition}
                  <button onClick={() => setSelectedCondition('')} className="hover:text-slate-900">
                    <X size={14} />
                  </button>
                </span>
              )}
              {selectedBrand && (
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-sm flex items-center gap-2">
                  Brand: {selectedBrand}
                  <button onClick={() => setSelectedBrand('')} className="hover:text-slate-900">
                    <X size={14} />
                  </button>
                </span>
              )}
              {showDiscountOnly && (
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-sm flex items-center gap-2">
                  Discounted
                  <button onClick={() => setShowDiscountOnly(false)} className="hover:text-slate-900">
                    <X size={14} />
                  </button>
                </span>
              )}
              {(priceRange.min || priceRange.max) && (
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-sm flex items-center gap-2">
                  {priceRange.min || '0'} - {priceRange.max || '∞'} DT
                  <button onClick={() => setPriceRange({ min: '', max: '' })} className="hover:text-slate-900">
                    <X size={14} />
                  </button>
                </span>
              )}
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveSearchQuery('');
                  setSelectedCategory('');
                  setPriceRange({ min: '', max: '' });
                  setSelectedGender('');
                  setSelectedCondition('');
                  setSelectedBrand('');
                  setShowDiscountOnly(false);
                  setSelectedSubcategories([]);
                }}
                className="px-3 py-1 text-sm text-slate-600 hover:text-slate-900 underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Show carousel and sections only when on main shop view (no filters) */}
      {!(activeSearchQuery || selectedCategory || priceRange.min || priceRange.max || selectedGender || selectedCondition || selectedBrand || showDiscountOnly) && activeTab === 'shop' && (
        <>
          {/* Hero Carousel */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50">
            <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="relative rounded-2xl overflow-hidden bg-white shadow-2xl">
            <AnimatePresence mode="wait">
              {featuredProducts.map((product, index) => {
                if (index !== currentSlide) return null;
                
                const imageUrl = (product.image_url && product.image_url !== 'nan' && product.image_url !== '') 
                  ? product.image_url 
                  : (product.image || 'https://placehold.co/600x600/e2e8f0/64748b?text=No+Image');

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="grid md:grid-cols-2 gap-6 items-center p-6 md:p-10 min-h-[350px] md:min-h-[400px]"
                  >
                    {/* Left - Product Info */}
                    <div className="space-y-3 ms-10 md:space-y-4 flex flex-col justify-center">
                      <div className="inline-block">
                        <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                          Featured Product
                        </span>
                      </div>
                      <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 leading-tight">
                        {product.name}
                      </h1>
                      <p className="text-sm md:text-base text-slate-600 leading-relaxed line-clamp-2">
                        {product.description}
                      </p>
                      <div className="flex items-center gap-3">
                        {product.has_discount ? (
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl md:text-3xl font-bold text-emerald-600">{product.price?.toFixed(3)} DT</span>
                            <span className="text-base md:text-lg text-slate-400 line-through">{product.original_price?.toFixed(3)} DT</span>
                          </div>
                        ) : (
                          <span className="text-2xl md:text-3xl font-bold text-slate-900">{product.price?.toFixed(3)} DT</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                        <Button 
                          onClick={() => {
                            const user = JSON.parse(localStorage.getItem('user') || '{}');
                            if (user._id) {
                              const params = new URLSearchParams({
                                product_id:product.product_id,
                                user_id: user._id,
                                source: 'carousel',
                                position: index.toString(),
                                timestamp: new Date().toISOString(),
                                session_id: `session_${user._id}`
                              });
                            }
                            navigate(`/product/${product.product_id}`, { state: { source: 'carousel' } });
                          }}
                          variant="primary"
                          className="!px-4 md:!px-6 !py-2 md:!py-2.5 !text-sm md:!text-base"
                        >
                          View Details
                        </Button>
                        <Button 
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(product);
                          }}
                          variant="outline"
                          className="!px-4 md:!px-6 !py-2 md:!py-2.5 !text-sm md:!text-base"
                        >
                          <ShoppingCart size={16} /> Add to Cart
                        </Button>
                      </div>
                    </div>

                    {/* Right - Product Image */}
                    <div className="relative flex items-center justify-center p-4 md:p-8">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl opacity-20"></div>
                      <div className="relative">
                        <img 
                          src={imageUrl}
                          alt={product.name}
                          className="relative z-10 w-full max-w-xs h-auto max-h-[200px] md:max-h-[280px] object-contain drop-shadow-2xl"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://placehold.co/600x600/e2e8f0/64748b?text=No+Image';
                          }}
                        />
                        {product.has_discount && product.discount_amount && (
                          <div className="absolute -top-2 -right-2 md:top-0 md:right-0 bg-red-500 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-bold shadow-xl z-20">
                            SAVE {product.discount_amount.toFixed(3)} DT
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Carousel Controls */}
            <button
              onClick={prevSlide}
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-30 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white p-2.5 rounded-full shadow-xl transition-all hover:scale-110"
            >
              <ChevronLeft size={20} strokeWidth={3} />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-30 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white p-2.5 rounded-full shadow-xl transition-all hover:scale-110"
            >
              <ChevronRight size={20} strokeWidth={3} />
            </button>

            {/* Carousel Indicators */}
            <div className="absolute bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {featuredProducts.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-1.5 rounded-full transition-all ${
                    index === currentSlide ? 'w-6 bg-emerald-600' : 'w-1.5 bg-slate-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Hot Deals Section */}
      {discountedProducts.length > 0 && (
        <div id="hot-deals" className="max-w-7xl mx-auto px-6 py-16">
          <div className="flex items-center gap-3 mb-8">
            <Tag className="text-red-500" size={32} />
            <div>
              <h2 className="text-3xl font-bold text-slate-900">Hot Deals</h2>
              <p className="text-slate-600 mt-1">Limited time offers you don't want to miss</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {discountedProducts.map((p, idx) => <ProductCard key={p._id || p.product_id || idx} product={p} source="hot-deals" position={idx} />)}
          </div>
        </div>
      )}

      {/* New Arrivals Section */}
      <div id="new-arrivals" className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-8">
            <Package className="text-emerald-600" size={32} />
            <div>
              <h2 className="text-3xl font-bold text-slate-900">New Arrivals</h2>
              <p className="text-slate-600 mt-1">Fresh products just added to our collection</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {newArrivals.map((p, idx) => <ProductCard key={p._id || p.product_id || idx} product={p} source="new-arrivals" position={idx} />)}
          </div>
        </div>
      </div>

      {/* Trending Now Section */}
      <div id="trending" className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-center gap-3 mb-8">
          <Star className="text-blue-600" size={32} />
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Trending Now</h2>
            <p className="text-slate-600 mt-1">Most popular items loved by our customers</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {trendingProducts.map((p, idx) => <ProductCard key={p._id || p.product_id || idx} product={p} source="trending" position={idx} />)}
        </div>
      </div>
        </>
      )}

      {/* All Products Section - Always visible but shows filtered results when filters are active */}
      <div id="all-products" className="bg-slate-100 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-6">
            {/* Subcategory Sidebar */}
            {(activeTab === 'fashion' || activeTab === 'electronics' || activeTab === 'baby') && (
              <div className="w-64 flex-shrink-0">
                <div className="bg-white rounded-lg shadow-sm p-5 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
                  <h3 className="text-base font-bold text-slate-900 mb-3">Filter by Category</h3>
                  
                  {/* Clear Selection Button */}
                  {selectedSubcategories.length > 0 && (
                    <button
                      onClick={() => setSelectedSubcategories([])}
                      className="w-full mb-3 px-3 py-1.5 text-xs text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors font-medium"
                    >
                      Clear Selection ({selectedSubcategories.length})
                    </button>
                  )}
                  
                  <div className="space-y-1.5">
                    {activeTab === 'fashion' && (
                      <>
                        {['Men', 'Women', 'Kids'].map((subcat) => (
                          <label key={subcat} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={selectedSubcategories.includes(subcat)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedSubcategories([...selectedSubcategories, subcat]);
                                } else {
                                  setSelectedSubcategories(selectedSubcategories.filter(s => s !== subcat));
                                }
                              }}
                              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 focus:ring-2 cursor-pointer"
                            />
                            <span className="text-sm text-slate-700">{subcat}</span>
                          </label>
                        ))}
                      </>
                    )}

                    {activeTab === 'electronics' && (
                      <>
                        {['Laptops', 'Desktops', 'Smartphones', 'Tablets', 'Screens', 'Keyboards', 'Mice', 'Chargers', 'Storage', 'Servers', 'TV', 'Media', 'Supplies', 'Other'].map((subcat) => (
                          <label key={subcat} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={selectedSubcategories.includes(subcat)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedSubcategories([...selectedSubcategories, subcat]);
                                } else {
                                  setSelectedSubcategories(selectedSubcategories.filter(s => s !== subcat));
                                }
                              }}
                              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 focus:ring-2 cursor-pointer"
                            />
                            <span className="text-sm text-slate-700">{subcat}</span>
                          </label>
                        ))}
                      </>
                    )}

                    {activeTab === 'baby' && (
                      <>
                        {['Feeding', 'Toys', 'Clothes', 'Furniture'].map((subcat) => (
                          <label key={subcat} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={selectedSubcategories.includes(subcat)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedSubcategories([...selectedSubcategories, subcat]);
                                } else {
                                  setSelectedSubcategories(selectedSubcategories.filter(s => s !== subcat));
                                }
                              }}
                              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 focus:ring-2 cursor-pointer"
                            />
                            <span className="text-sm text-slate-700">{subcat}</span>
                          </label>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Products Grid */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900">
                    {(activeSearchQuery || selectedCategory || priceRange.min || priceRange.max || selectedGender || selectedCondition || selectedBrand || showDiscountOnly) ? 'Search Results' : 
                     activeTab === 'fashion' ? 'Fashion Products' :
                     activeTab === 'electronics' ? 'Electronics Products' :
                     activeTab === 'baby' ? 'Baby Products' :
                     'All Products'}
                  </h2>
                  <p className="text-slate-600 mt-1">Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredProducts.length)} of {filteredProducts.length} products</p>
                </div>
              </div>
          
          {currentProducts.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">No products found</h3>
              <p className="text-slate-600 mb-6">Try adjusting your search or filters</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveSearchQuery('');
                  setSelectedCategory('');
                  setPriceRange({ min: '', max: '' });
                  setSelectedSubcategories([]);
                }}
                className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {currentProducts.map((p, idx) => {
                // Determine source based on context
                let source = 'all-products';
                if (activeSearchQuery || selectedCategory || priceRange.min || priceRange.max || selectedGender || selectedCondition || selectedBrand || showDiscountOnly) {
                  source = 'search-results';
                } else if (activeTab !== 'all') {
                  source = `${activeTab}-tab`;
                }
                
                return (
                  <ProductCard 
                    key={p._id || p.product_id || idx} 
                    product={p} 
                    source={source}
                    position={indexOfFirstItem + idx}
                  />
                );
              })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-12">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                >
                  <ChevronLeft size={20} />
                </button>

                {[...Array(totalPages)].map((_, index) => {
                  const pageNumber = index + 1;
                  if (
                    pageNumber === 1 ||
                    pageNumber === totalPages ||
                    (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => handlePageChange(pageNumber)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          currentPage === pageNumber
                            ? 'bg-emerald-600 text-white'
                            : 'border border-slate-200 hover:bg-white text-slate-700 bg-white'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  } else if (
                    pageNumber === currentPage - 2 ||
                    pageNumber === currentPage + 2
                  ) {
                    return <span key={pageNumber} className="px-2">...</span>;
                  }
                  return null;
                })}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopHome;