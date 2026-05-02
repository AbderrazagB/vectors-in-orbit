import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CategorySidebar } from '../../components/shop/CategorySidebar';
import { useToast } from '../../context/ToastContext';
import { ProductGrid } from '../../components/shop/ProductGrid';
import { ProductSection } from '../../components/shop/ProductSection';
import { SearchAndFilters } from '../../components/shop/SearchAndFilters';
import { ErrorScreen } from '../../components/ErrorScreen';

// Define subcategories for each category (must match CategorySidebar)
const CATEGORY_SUBCATEGORIES = {
  fashion: ['Fashion-Men', 'Fashion-Women', 'Fashion-Kids'],
  electronics: ['Electronics-Laptops', 'Electronics-Desktops', 'Electronics-Smartphones', 'Electronics-Tablets', 'Electronics-Screens', 'Electronics-Keyboards', 'Electronics-Mice', 'Electronics-Chargers', 'Electronics-Storage', 'Electronics-Servers', 'Electronics-TV', 'Electronics-Media', 'Electronics-Supplies', 'Electronics-Other'],
  baby: ['Baby-Feeding', 'Baby-Toys', 'Baby-Clothes', 'Baby-Furniture']
};

const SUBCATEGORY_LABELS = {
  'Fashion-Men': 'Men\'s Fashion',
  'Fashion-Women': 'Women\'s Fashion',
  'Fashion-Kids': 'Kids Fashion',
  'Electronics-Laptops': 'Laptops',
  'Electronics-Desktops': 'Desktop Computers',
  'Electronics-Smartphones': 'Smartphones',
  'Electronics-Tablets': 'Tablets',
  'Electronics-Screens': 'Monitors & Screens',
  'Electronics-Keyboards': 'Keyboards',
  'Electronics-Mice': 'Mice & Pointing Devices',
  'Electronics-Chargers': 'Chargers & Cables',
  'Electronics-Storage': 'Storage Devices',
  'Electronics-Servers': 'Servers',
  'Electronics-TV': 'TVs & Home Entertainment',
  'Electronics-Media': 'Media Devices',
  'Electronics-Supplies': 'Office Supplies',
  'Electronics-Other': 'Other Electronics',
  'Baby-Feeding': 'Feeding & Nursing',
  'Baby-Toys': 'Toys & Play',
  'Baby-Clothes': 'Baby Clothing',
  'Baby-Furniture': 'Nursery Furniture'
};

export const CategoryTab = ({ category }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
    // Restore full search/filter state from sessionStorage on mount
  // This prevents refetching when returning from ProductDetail and preserves filters/results
  React.useEffect(() => {
    // Prefer history.state snapshot (this captures the exact state when user navigated away)
    try {
      const historySnapshot = window.history.state?.categorySnapshots?.[category];
      if (historySnapshot && ((Array.isArray(historySnapshot.products) && historySnapshot.products.length > 0) || (historySnapshot.productsBySubcategory && Object.keys(historySnapshot.productsBySubcategory).length > 0))) {
        const parsed = historySnapshot;
        if (parsed.searchQuery) setSearchQuery(parsed.searchQuery);
        if (parsed.activeSearchQuery) setActiveSearchQuery(parsed.activeSearchQuery);
        if (parsed.currentPage) setCurrentPage(parsed.currentPage);
        if (parsed.priceRange) setPriceRange(parsed.priceRange);
        if (parsed.selectedGender) setSelectedGender(parsed.selectedGender);
        if (parsed.selectedCondition) setSelectedCondition(parsed.selectedCondition);
        if (parsed.selectedBrand) setSelectedBrand(parsed.selectedBrand);
        if (typeof parsed.showDiscountOnly === 'boolean') setShowDiscountOnly(parsed.showDiscountOnly);
        if (parsed.selectedSubcategories) setSelectedSubcategories(parsed.selectedSubcategories);
        if (parsed.products && Array.isArray(parsed.products) && parsed.products.length > 0) {
          setProducts(parsed.products);
          setIsSearchResults(!!parsed.isSearchResults);
        }
        if (parsed.productsBySubcategory && Object.keys(parsed.productsBySubcategory).length > 0) {
          setProductsBySubcategory(parsed.productsBySubcategory);
        }
        console.debug('Restored category state from history.state for', category, parsed);
        // Re-persist the restored snapshot to both sessionStorage and history.state to make it the authoritative snapshot
        try {
          sessionStorage.setItem(`searchState-${category}`, JSON.stringify(parsed));
          const currentState = window.history.state || {};
          const newState = { ...(currentState || {}), categorySnapshots: { ...(currentState?.categorySnapshots || {}), [category]: parsed } };
          window.history.replaceState(newState, document.title);
          console.debug('Re-persisted restored snapshot to history/session for', category);
        } catch (err) {}
        return;
      }
    } catch (err) {
      console.warn('Failed to read history.state snapshot:', err);
    }

    // Fallback to sessionStorage
    const saved = sessionStorage.getItem(`searchState-${category}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.searchQuery) setSearchQuery(parsed.searchQuery);
        if (parsed.activeSearchQuery) setActiveSearchQuery(parsed.activeSearchQuery);
        if (parsed.currentPage) setCurrentPage(parsed.currentPage);
        if (parsed.priceRange) setPriceRange(parsed.priceRange);
        if (parsed.selectedGender) setSelectedGender(parsed.selectedGender);
        if (parsed.selectedCondition) setSelectedCondition(parsed.selectedCondition);
        if (parsed.selectedBrand) setSelectedBrand(parsed.selectedBrand);
        if (typeof parsed.showDiscountOnly === 'boolean') setShowDiscountOnly(parsed.showDiscountOnly);
        if (parsed.selectedSubcategories) setSelectedSubcategories(parsed.selectedSubcategories);
        // Only restore search results if there are actual results saved
        if (parsed.products && Array.isArray(parsed.products) && parsed.products.length > 0) {
          setProducts(parsed.products);
          setIsSearchResults(!!parsed.isSearchResults);
        }
        // Only restore category snapshot if it has subcategory data
        if (parsed.productsBySubcategory && Object.keys(parsed.productsBySubcategory).length > 0) {
          setProductsBySubcategory(parsed.productsBySubcategory);
        }
        console.debug('Restored category state from sessionStorage for', category, parsed);
      } catch (err) {
        console.warn('Failed to parse saved search state:', err);
      }
    } else {
      setIsSearchResults(false);
      setActiveSearchQuery('');
    }
  }, [category]);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedGender, setSelectedGender] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [showDiscountOnly, setShowDiscountOnly] = useState(false);
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [productsBySubcategory, setProductsBySubcategory] = useState({});
  const [loading, setLoading] = useState(false);
  const [isSearchResults, setIsSearchResults] = useState(false); // Track if showing search results
  const [fetchError, setFetchError] = useState(null);
  const [retryCount, setRetryCount] = useState(0); // increment to retry fetches

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const API_URL = import.meta.env.VITE_SEARCH_API_URL;
  const toast = useToast();
  // Used to prevent unnecessary refetch when we have a restored snapshot
  const skipFetchRef = useRef(false);

  // Fetch products for each subcategory when not searching
  useEffect(() => {
    const subcategories = CATEGORY_SUBCATEGORIES[category] || [];

    // Clear previous fetch error when (re)running
    setFetchError(null);

    // Try to restore snapshot (history first, then session) and skip fetch entirely if found
    // reset flag for new category
    skipFetchRef.current = false;
    let restored = false;
    try {
      const historySnapshot = window.history.state?.categorySnapshots?.[category];
      if (historySnapshot && ((Array.isArray(historySnapshot.products) && historySnapshot.products.length > 0) || (historySnapshot.productsBySubcategory && Object.keys(historySnapshot.productsBySubcategory).length > 0))) {
        if (historySnapshot.products && historySnapshot.products.length > 0) {
          setProducts(historySnapshot.products);
          setIsSearchResults(!!historySnapshot.isSearchResults);
        }
        if (historySnapshot.productsBySubcategory && Object.keys(historySnapshot.productsBySubcategory).length > 0) {
          setProductsBySubcategory(historySnapshot.productsBySubcategory);
        }
        setLoading(false);
        restored = true;
        skipFetchRef.current = true;
        console.debug('fetchCategoryProducts: restored from history.state for', category);
      }
    } catch (err) {}

    if (!restored) {
      const saved = sessionStorage.getItem(`searchState-${category}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.isSearchResults && Array.isArray(parsed.products) && parsed.products.length > 0) {
            setProducts(parsed.products);
            setProductsBySubcategory(parsed.productsBySubcategory || {});
            setIsSearchResults(true);
            setLoading(false);
            restored = true;
            skipFetchRef.current = true;
            console.debug('fetchCategoryProducts: restored from session storage search snapshot for', category);
          } else if (parsed && parsed.productsBySubcategory && Object.keys(parsed.productsBySubcategory).length > 0) {
            setProductsBySubcategory(parsed.productsBySubcategory);
            setProducts(Object.values(parsed.productsBySubcategory).flat());
            setIsSearchResults(false);
            setLoading(false);
            restored = true;
            skipFetchRef.current = true;
            console.debug('fetchCategoryProducts: restored from session storage category snapshot for', category);
          } else if (parsed && Array.isArray(parsed.products) && parsed.products.length > 0) {
            setProducts(parsed.products);
            setIsSearchResults(!!parsed.isSearchResults);
            setLoading(false);
            restored = true;
            skipFetchRef.current = true;
            // Persist restored session snapshot back into history.state to make it authoritative
            try {
              const snapshot = parsed;
              const currentState = window.history.state || {};
              const newState = { ...(currentState || {}), categorySnapshots: { ...(currentState?.categorySnapshots || {}), [category]: snapshot } };
              window.history.replaceState(newState, document.title);
              console.debug('Synchronized session snapshot to history.state for', category);
            } catch (err) {}
            console.debug('fetchCategoryProducts: restored from session storage products snapshot for', category);
          }
        } catch (err) {}
      }
    }

    if (restored) {
      console.debug('fetchCategoryProducts: skipping network fetch because snapshot restored for', category);
      return; // skip fetch if we restored
    }

    const fetchCategoryProducts = async () => {
      setLoading(true);
      const productsBySubcat = {};
      try {
        // Fetch products for each subcategory
        const API_GATEWAY_URL = import.meta.env.VITE_API_GATEWAY_URL;
        for (const subcategory of subcategories) {
          const response = await fetch(`${API_GATEWAY_URL}/products/${subcategory}`);
          if (response.ok) {
            const data = await response.json();
            // Transform products
            console.log("data",data)
            const transformedProducts = (data.products || []).map(p => {
              const isDiscounted = p.metadata.is_discounted || false;
              const discountAmount = p.metadata.discount_percentage || p.metadata.discount_amount || (isDiscounted ? 15 : 0);
              return {
                _id: p.id || p.product_id || p._id,
                product_id: p.id || p.product_id || p._id,
                name: p.metadata.name,
                price: p.metadata.price,
                image_url: p.image || p.metadata.image_url,
                description: p.metadata.description || '',
                category: p.metadata.category,
                brand: p.metadata.brand || '',
                has_discount: isDiscounted,
                discount_amount: discountAmount,
                stock_quantity: p.metadata.stock_quantity || 0,
                vendor: p.metadata.brand || 'Unknown',
                metadata: p
              };
            });
            productsBySubcat[subcategory] = transformedProducts;
          }
        }
        setProductsBySubcategory(productsBySubcat);
        // Flatten all products for filtering
        const allProducts = Object.values(productsBySubcat).flat();
        setProducts(allProducts);

        // Save fetched category data to sessionStorage so we can restore it when user returns
        try {
          sessionStorage.setItem(`searchState-${category}`, JSON.stringify({
            productsBySubcategory: productsBySubcat,
            products: allProducts,
            isSearchResults: false,
            timestamp: Date.now()
          }));
        } catch (err) {}
      } catch (error) {
        console.error('Failed to fetch category products:', error);
        setFetchError(error.message || 'Failed to load category products');
        toast.error(error.message || 'Failed to load category products');
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if we didn't restore a snapshot
    if (!skipFetchRef.current) {
      fetchCategoryProducts();
    }
    
    // Only reset selected subcategories when there's no saved state
    const saved = sessionStorage.getItem(`searchState-${category}`);
    if (!saved) setSelectedSubcategories([]);
    // Don't reset search state - preserve when navigating back from product detail
  }, [category, retryCount]);

  // Listen to popstate to restore snapshot when browser Back/Forward occurs
  React.useEffect(() => {
    const handlePopState = (e) => {
      try {
        const historySnapshot = window.history.state?.categorySnapshots?.[category];
        if (historySnapshot && ((Array.isArray(historySnapshot.products) && historySnapshot.products.length > 0) || (historySnapshot.productsBySubcategory && Object.keys(historySnapshot.productsBySubcategory).length > 0))) {
          if (historySnapshot.products && Array.isArray(historySnapshot.products) && historySnapshot.products.length > 0) {
            setProducts(historySnapshot.products);
            setIsSearchResults(!!historySnapshot.isSearchResults);
          }
          if (historySnapshot.productsBySubcategory && Object.keys(historySnapshot.productsBySubcategory).length > 0) {
            setProductsBySubcategory(historySnapshot.productsBySubcategory);
          }
          if (historySnapshot.searchQuery) setSearchQuery(historySnapshot.searchQuery);
          if (historySnapshot.activeSearchQuery) setActiveSearchQuery(historySnapshot.activeSearchQuery);
          if (historySnapshot.currentPage) setCurrentPage(historySnapshot.currentPage);
          // Mark that we've restored so the fetchEffect won't refetch
          skipFetchRef.current = true;
          // Also suppress visibility-based clearing which might fire after popstate
          try { suppressClearRef.current = true; } catch (err) {}
          // Persist the snapshot to sessionStorage as a safeguard
          try {
            sessionStorage.setItem(`searchState-${category}`, JSON.stringify(historySnapshot));
          } catch (err) {}
          console.debug('popstate: restored category state from history.state for', category);
        }
      } catch (err) {
        // ignore
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [category]);

  // Apply filters
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // If showing search results from API, don't apply text search filter
    // The API already handled the search relevance
    if (activeSearchQuery && !isSearchResults) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(activeSearchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(activeSearchQuery.toLowerCase())
      );
    }

    // Don't apply subcategory filter when showing search results
    // The search API already filtered by category
    if (selectedSubcategories.length > 0 && !isSearchResults) {
      filtered = filtered.filter(p => selectedSubcategories.includes(p.metadata?.subcategory));
    }

    // These filters can still be applied to search results if needed
    if (priceRange.min) {
      filtered = filtered.filter(p => p.price >= parseFloat(priceRange.min));
    }
    if (priceRange.max) {
      filtered = filtered.filter(p => p.price <= parseFloat(priceRange.max));
    }

    if (selectedGender) {
      filtered = filtered.filter(p => p.metadata?.gender === selectedGender);
    }

    if (selectedCondition) {
      filtered = filtered.filter(p => p.metadata?.condition === selectedCondition);
    }

    if (selectedBrand) {
      filtered = filtered.filter(p => p.metadata?.brand === selectedBrand);
    }

    if (showDiscountOnly) {
      filtered = filtered.filter(p => p.has_discount);
    }

    return filtered;
  }, [products, activeSearchQuery, priceRange, selectedGender, selectedCondition, selectedBrand, showDiscountOnly, selectedSubcategories, isSearchResults]);

  const handleSearchSubmit = async () => {
    // Prevent sending empty search queries
    if (!searchQuery || !searchQuery.trim()) {
      toast.error('Please enter a search term');
      return;
    }

    setActiveSearchQuery(searchQuery);
    setCurrentPage(1);
    setSearchLoading(true);
    try {
      // Prepare filters - if no subcategories selected, use all subcategories for this category
      // Convert subcategory names to "Category-Subcategory" format
      const categoryPrefix = category.charAt(0).toUpperCase() + category.slice(1);
      const subcategoriesToSend = selectedSubcategories.length > 0 
        ? selectedSubcategories.map(sub => `${categoryPrefix}-${sub}`)
        : CATEGORY_SUBCATEGORIES[category] || [];
      const filters = {
        category: subcategoriesToSend,
        ...(priceRange.min && { min_price: parseFloat(priceRange.min) }),
        ...(priceRange.max && { max_price: parseFloat(priceRange.max) })
      };
      // Send search request
      const searchRequest = {
        user_id: user._id || 'anonymous',
        query_text: searchQuery,
        filters: filters,
        limit: 20
      };
      const response = await fetch(`${API_URL}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchRequest)
      });
      if (response.ok) {
        const data = await response.json();
        // Transform search results to match product structure
        if (data.results && Array.isArray(data.results)) {
          const transformedProducts = data.results.map(result => {
            const isDiscounted = result.payload?.metadata?.is_discounted || false;
            const discountAmount = result.payload?.metadata?.discount_percentage || 
                                  result.payload?.metadata?.discount_amount || 
                                  (isDiscounted ? 15 : 0);
            return {
              _id: result.product_id,
              product_id: result.product_id,
              name: result.name,
              price: result.price,
              image_url: result.image_url,
              description: result.payload?.metadata?.description || '',
              category: result.payload?.metadata?.category || category,
              brand: result.payload?.metadata?.brand || '',
              has_discount: isDiscounted,
              discount_amount: discountAmount,
              stock_quantity: result.payload?.metadata?.stock_quantity || 0,
              vendor: result.payload?.metadata?.brand || 'Unknown',
              match_reason: result.match_reason,
              metadata: result.payload?.metadata || {}
            };
          });
          setProducts(transformedProducts);
          setIsSearchResults(true); // Mark as search results
          // Save search state to sessionStorage
          sessionStorage.setItem(`searchState-${category}`, JSON.stringify({
            searchQuery,
            activeSearchQuery: searchQuery,
            products: transformedProducts,
            isSearchResults: true
          }));
        }
      }
    } catch (err) {
      console.error('Search failed:', err);
      setFetchError(err.message || 'Search request failed');
      toast.error(err.message || 'Search request failed');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleFilterApply = () => {
    setCurrentPage(1);
  };

  // Ensure category snapshot is kept for navigation and only removed when we truly have no category data
  React.useEffect(() => {
    if (!isSearchResults && !activeSearchQuery) {
      try {
        if (productsBySubcategory && Object.keys(productsBySubcategory).length > 0) {
          // Persist the current category browse state so returning to the tab shows sections as usual
          sessionStorage.setItem(`searchState-${category}`, JSON.stringify({
            productsBySubcategory,
            products: Object.values(productsBySubcategory).flat(),
            isSearchResults: false,
            timestamp: Date.now()
          }));
        } else {
          // Nothing to restore - remove saved snapshot
          sessionStorage.removeItem(`searchState-${category}`);
        }
      } catch (err) {
        console.warn('Failed to update persisted category state:', err);
      }
    }
  }, [isSearchResults, activeSearchQuery, category, productsBySubcategory]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 100, behavior: 'smooth' });
  };

  const brands = [...new Set(products.map(p => p.metadata?.brand).filter(Boolean))];
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;

  // Persist current search/filter state so we can restore it when navigating back from product details
  React.useEffect(() => {
    const toSave = {
      searchQuery,
      activeSearchQuery,
      currentPage,
      priceRange,
      selectedGender,
      selectedCondition,
      selectedBrand,
      showDiscountOnly,
      selectedSubcategories,
      products,
      productsBySubcategory,
      isSearchResults,
      timestamp: Date.now()
    };

    try {
      sessionStorage.setItem(`searchState-${category}`, JSON.stringify(toSave));
    } catch (err) {
      console.warn('Failed to persist category state:', err);
    }

    // helper: persist into history.state for robust browser Back restore
    const persistToHistory = (snapshot) => {
      try {
        const currentState = window.history.state || {};
        const newState = { ...(currentState || {}), categorySnapshots: { ...(currentState?.categorySnapshots || {}), [category]: snapshot } };
        window.history.replaceState(newState, document.title);
      } catch (err) {
        console.warn('Failed to write category snapshot to history.state:', err);
      }
    };

    // Immediately persist when an external request happens (e.g., ProductCard dispatches 'persistCategoryState')
    const handlePersistRequest = () => {
      // Only persist when user is viewing search results (i.e., they performed a search)
      if (!isSearchResults && !activeSearchQuery) {
        console.debug('persistCategoryState ignored - not a search snapshot for', category);
        return;
      }

      try {
        const snapshot = {
          searchQuery,
          activeSearchQuery,
          currentPage,
          priceRange,
          selectedGender,
          selectedCondition,
          selectedBrand,
          showDiscountOnly,
          selectedSubcategories,
          products,
          productsBySubcategory,
          isSearchResults,
          timestamp: Date.now()
        };
        // Persist to sessionStorage
        sessionStorage.setItem(`searchState-${category}`, JSON.stringify(snapshot));
        // Persist to history.state synchronously so Back will have it
        persistToHistory(snapshot);
        console.debug('Category snapshot persisted to history for', category, snapshot);
      } catch (err) {
        console.warn('Failed to persist category state on external request:', err);
      }
    };

    window.addEventListener('persistCategoryState', handlePersistRequest);

    // On unmount (when user navigates to ProductDetail), ensure we save a final snapshot immediately
    return () => {
      try {
        const finalSnapshot = {
          searchQuery,
          activeSearchQuery,
          currentPage,
          priceRange,
          selectedGender,
          selectedCondition,
          selectedBrand,
          showDiscountOnly,
          selectedSubcategories,
          products,
          productsBySubcategory,
          isSearchResults,
          timestamp: Date.now(),
        };

        // Merge with any existing snapshot to avoid overwriting valid data with empty state
        try {
          const existingHistory = window.history.state?.categorySnapshots?.[category];
          const existingSession = JSON.parse(sessionStorage.getItem(`searchState-${category}`) || 'null');
          const existing = existingHistory && ((Array.isArray(existingHistory.products) && existingHistory.products.length > 0) || (existingHistory.productsBySubcategory && Object.keys(existingHistory.productsBySubcategory).length > 0))
            ? existingHistory
            : (existingSession && ((Array.isArray(existingSession.products) && existingSession.products.length > 0) || (existingSession.productsBySubcategory && Object.keys(existingSession.productsBySubcategory).length > 0))
              ? existingSession
              : null);

          if (existing) {
            // Preserve products/productsBySubcategory when finalSnapshot has none
            if ((!finalSnapshot.products || finalSnapshot.products.length === 0) && existing.products && existing.products.length > 0) {
              finalSnapshot.products = existing.products;
              finalSnapshot.isSearchResults = existing.isSearchResults || finalSnapshot.isSearchResults;
            }
            if ((!finalSnapshot.productsBySubcategory || Object.keys(finalSnapshot.productsBySubcategory).length === 0) && existing.productsBySubcategory && Object.keys(existing.productsBySubcategory).length > 0) {
              finalSnapshot.productsBySubcategory = existing.productsBySubcategory;
            }
            // Preserve searchQuery and activeSearchQuery if empty
            if (!finalSnapshot.searchQuery && existing.searchQuery) finalSnapshot.searchQuery = existing.searchQuery;
            if (!finalSnapshot.activeSearchQuery && existing.activeSearchQuery) finalSnapshot.activeSearchQuery = existing.activeSearchQuery;
            if (!finalSnapshot.currentPage && existing.currentPage) finalSnapshot.currentPage = existing.currentPage;
            if ((!finalSnapshot.selectedSubcategories || finalSnapshot.selectedSubcategories.length === 0) && existing.selectedSubcategories) finalSnapshot.selectedSubcategories = existing.selectedSubcategories;
          }
        } catch (mergeErr) {
          // ignore merge errors
        }

        // Always persist on unmount if we have products (either search results or category data)
        if ((finalSnapshot.products && finalSnapshot.products.length > 0) || (finalSnapshot.productsBySubcategory && Object.keys(finalSnapshot.productsBySubcategory).length > 0)) {
          sessionStorage.setItem(`searchState-${category}`, JSON.stringify(finalSnapshot));
          persistToHistory(finalSnapshot);
          console.debug('Category snapshot persisted on unmount for', category, finalSnapshot);
        }
      } catch (err) {
        console.warn('Failed to persist category state on unmount:', err);
      }

      window.removeEventListener('persistCategoryState', handlePersistRequest);
    };
  }, [searchQuery, activeSearchQuery, currentPage, priceRange, selectedGender, selectedCondition, selectedBrand, showDiscountOnly, selectedSubcategories, products, productsBySubcategory, isSearchResults, category]);

  // Track the previous category to detect actual tab switches (not back button navigation)
  const prevCategoryRef = useRef(category);
  React.useEffect(() => {
    // Only clear if this is an actual category switch by the user (not a back button restore)
    if (prevCategoryRef.current !== category && prevCategoryRef.current !== undefined) {
      // This is a real category switch, not initial mount or back button
      setSearchQuery('');
      setActiveSearchQuery('');
      setIsSearchResults(false);
      setCurrentPage(1);

      // Show category sections if we have them
      if (productsBySubcategory && Object.keys(productsBySubcategory).length > 0) {
        setProducts(Object.values(productsBySubcategory).flat());
      }

      // Persist cleared category snapshot to sessionStorage
      try {
        sessionStorage.setItem(`searchState-${category}`, JSON.stringify({
          productsBySubcategory,
          products: Object.values(productsBySubcategory || {}).flat(),
          isSearchResults: false,
          timestamp: Date.now()
        }));
      } catch (err) {}
    }
    
    prevCategoryRef.current = category;
  }, [category, productsBySubcategory]);

  const categoryTitles = {
    fashion: 'Fashion Products',
    electronics: 'Electronics Products',
    baby: 'Baby Products'
  };

  if (fetchError) {
    return <ErrorScreen message={fetchError} onRetry={() => setRetryCount(c => c + 1)} />;
  }

  return (
    <>
      {/* Search and Filter Bar */}
      <SearchAndFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeSearchQuery={activeSearchQuery}
        setActiveSearchQuery={setActiveSearchQuery}
        selectedCategory=""
        setSelectedCategory={() => {}}
        selectedGender={selectedGender}
        setSelectedGender={setSelectedGender}
        selectedCondition={selectedCondition}
        setSelectedCondition={setSelectedCondition}
        selectedBrand={selectedBrand}
        setSelectedBrand={setSelectedBrand}
        showDiscountOnly={showDiscountOnly}
        setShowDiscountOnly={setShowDiscountOnly}
        priceRange={priceRange}
        setPriceRange={setPriceRange}
        selectedSubcategories={selectedSubcategories}
        setSelectedSubcategories={setSelectedSubcategories}
        activeTab={category}
        categories={[]}
        brands={brands}
        filteredCount={filteredProducts.length}
        onSearch={handleSearchSubmit}
        onFilterApply={handleFilterApply}
        loading={searchLoading}
      />

      {/* Category Products Section */}
      <div className="bg-slate-100 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-6">
            {/* Category Sidebar */}
            <CategorySidebar
              activeTab={category}
              selectedSubcategories={selectedSubcategories}
              setSelectedSubcategories={setSelectedSubcategories}
            />

            {/* Products Display */}
            <div className="flex-1">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                </div>
              ) : searchLoading ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
                  <p className="text-slate-600">Searching for <span className="font-medium">{activeSearchQuery || searchQuery}</span>...</p>
                </div>
              ) : isSearchResults || activeSearchQuery ? (
                /* Search Results - Grid View */
                (filteredProducts.length === 0) ? (
                  <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No results found</h3>
                    <p className="text-slate-600 mb-6">Try adjusting your search or filters.</p>
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setActiveSearchQuery('');
                          setIsSearchResults(false);
                          sessionStorage.removeItem(`searchState-${category}`);
                        }}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                      >
                        Clear Search
                      </button>
                    </div>
                  </div>
                ) : (
                  <ProductGrid
                    products={filteredProducts}
                    currentPage={currentPage}
                    itemsPerPage={100000}
                    onPageChange={handlePageChange}
                    source={`${category}-tab`}
                    description={`Showing ${indexOfFirstItem + 1}-${Math.min(indexOfLastItem, filteredProducts.length)} of ${filteredProducts.length} products`}
                    layout="horizontal"
                  />
                )
              ) : (
                /* Category Browse - Subcategory Sections */
                <div className="space-y-12">
                  {Object.entries(productsBySubcategory).map(([subcategory, products], index) => {
                    if (products.length === 0) return null;
                    
                    return (
                      <div 
                        key={subcategory}
                        className={'bg-white p-8 rounded-lg'}
                      >
                        <ProductSection
                          products={products.slice(0, 8)}
                          title={SUBCATEGORY_LABELS[subcategory] || subcategory}
                          source={subcategory}
                          layout="horizontal"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};