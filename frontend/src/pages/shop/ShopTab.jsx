import React, { useState, useEffect } from 'react';
import { FeaturedCarousel } from '../../components/shop/FeaturedCarousel';
import { ProductSection } from '../../components/shop/ProductSection';
import { ErrorScreen } from '../../components/ErrorScreen';
import { useToast } from '../../context/ToastContext';
import { Navigate } from 'react-router-dom';

export const ShopTab = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [feedSections, setFeedSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const toast = useToast();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const API_URL = import.meta.env.VITE_SEARCH_API_URL;

  useEffect(() => {
    if (user._id) {
      setFetchError(null);
      fetchFeed();
    }
  }, [user._id, retryCount]);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/feed/${user._id}`);
      const data = await response.json();
      
      console.log('📥 Feed data received:', data);
      
      // Transform feed sections to flatten product structure
      const transformedSections = (data.feed || []).map(section => ({
        section_title: section.section_title,
        items: (section.items || []).map(item => {
          const isDiscounted = item.payload?.metadata?.is_discounted || false;
          const discountPercentage = item.payload?.metadata?.discount_percentage || 
                                    item.payload?.metadata?.discount_amount || 
                                    (isDiscounted ? 15 : 0);
          return {
            _id: item.product_id,
            product_id: item.product_id,
            name: item.name,
            price: item.price,
            image_url: item.image_url,
            match_reason: item.match_reason,
            description: item.payload?.metadata?.description || '',
            category: item.payload?.metadata?.category || '',
            brand: item.payload?.metadata?.brand || '',
            has_discount: isDiscounted,
            discount_amount: discountPercentage,
            stock_quantity: item.payload?.metadata?.stock_quantity || 0,
            vendor: item.payload?.metadata?.brand || 'Unknown'
          };
        })
      }));
      
      console.log('🔄 Transformed sections:', transformedSections);
      console.log('🎠 First section:', transformedSections[0]);
      console.log('📊 Sections 2-3:', transformedSections.slice(1));
      
      setFeedSections(transformedSections);
    } catch (error) {
      console.error('Failed to fetch feed:', error);
      setFetchError(error.message || 'Failed to load feed');
      toast.error(error.message || 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  };

  // Get first section for carousel
  const firstSection = feedSections[0];
  const carouselProducts = firstSection?.items || [];

  // Auto-advance carousel
  useEffect(() => {
    if (carouselProducts.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselProducts.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [carouselProducts.length]);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % carouselProducts.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + carouselProducts.length) % carouselProducts.length);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (fetchError) {
    return <ErrorScreen message={fetchError} onRetry={() => setRetryCount(c => c + 1)} />;
  }

  if (!user._id) {
    return <Navigate to="/login" replace />;
  }

  // Separate 'Because' sections (wishlist-based) from other sections
  const wishlistSections = feedSections.filter(s => s.section_title.startsWith('Because'));
  const otherSections = feedSections.filter(s => !s.section_title.startsWith('Because'));
  
  // Extract wish text from 'Because' sections
  const extractWishText = (title) => {
    const match = title.match(/Because you want '(.+)'/);
    return match ? match[1] : 'your wishlist';
  };

  return (
    <>
      {/* Wishlist-based Section - Single Title, Multiple Carousels */}
      {wishlistSections.length > 0 && (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6">
              Based on your wishlist
            </h2>
            
            {wishlistSections.map((section, idx) => {
              const wishText = extractWishText(section.section_title);
              return (
                <div key={`wishlist-${idx}`} className="mb-8 last:mb-0">
                  <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
                    <FeaturedCarousel
                      featuredProducts={section.items || []}
                      currentSlide={currentSlide}
                      nextSlide={nextSlide}
                      prevSlide={prevSlide}
                      wishText={wishText}
                      hideMainTitle={true}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Other Sections - Grid Layout */}
      {otherSections.map((section, index) => (
        <div 
          key={index} 
          className={index % 2 === 0 ? 'py-16' : 'bg-white py-16'}
        >
          <ProductSection
            products={section.items || []}
            title={section.section_title}
            source={`feed-section-${index + 1}`}
          />
        </div>
      ))}
    </>
  );
};
