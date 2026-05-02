import React, { useContext, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { StoreContext } from "../../context/StoreContext";
import { useToast } from '../../context/ToastContext';
import { Button } from "../ui/Button";

export const FeaturedCarousel = ({
  featuredProducts,
  currentSlide,
  nextSlide,
  prevSlide,
  sectionTitle,
  wishText,
  hideMainTitle = false,
}) => {
  const { addToCart } = useContext(StoreContext);
  const toast = useToast();
  const [addingIndex, setAddingIndex] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    console.log("🎠 FeaturedCarousel rendered with products:", featuredProducts);
  }, [featuredProducts]);
  return (
    <div
      className={
        hideMainTitle ? "" : "bg-gradient-to-br from-emerald-50 to-teal-50"
      }
    >
      <div className={hideMainTitle ? "" : "max-w-7xl mx-auto px-6 py-8"}>
        {/* Section Title and Wish Text */}
        {!hideMainTitle && (
          <div className="mb-6">
            {sectionTitle && (
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
                {sectionTitle}
              </h2>
            )}
            {wishText && (
              <p className="text-lg text-emerald-600 mt-2 font-medium">
                {wishText}
              </p>
            )}
          </div>
        )}

        {/* Wish text when hideMainTitle is true */}
        {hideMainTitle && wishText && (
          <div className="my-6">
            <p className="text-xl font-bold text-emerald-600 px-4">
               {wishText}
            </p>
          </div>
        )}

        <div
          className={`relative ${hideMainTitle ? "" : "rounded-2xl overflow-hidden bg-white shadow-2xl"}`}
        >
            
          <AnimatePresence mode="wait">
            {featuredProducts.map((product, index) => {
              if (index !== currentSlide) return null;

              const imageUrl =
                product.image_url &&
                product.image_url !== "nan" &&
                product.image_url !== ""
                  ? product.image_url
                  : product.image ||
                    "https://placehold.co/600x600/e2e8f0/64748b?text=No+Image";

              const hasDiscount =
                product.has_discount && product.discount_amount > 0;
              const discountedPrice = product.price;
              const originalPrice = hasDiscount
                ? discountedPrice / (1 - product.discount_amount / 100)
                : product.price;

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

                    {product.match_reason && (
                      <div className="inline-block">
                        <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                          {product.match_reason}{" "}
                        </span>
                      </div>
                    )}

                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 leading-tight">
                      {product.name}
                    </h1>
                    <p className="text-sm md:text-base text-slate-600 leading-relaxed line-clamp-2">
                      {product.description}
                    </p>
                    <div className="flex items-center gap-3">
                      {hasDiscount ? (
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl md:text-3xl font-bold text-emerald-600">
                            {discountedPrice?.toFixed(3)} DT
                          </span>
                          <span className="text-base md:text-lg text-slate-400 line-through">
                            {originalPrice?.toFixed(3)} DT
                          </span>
                          <span className="text-sm font-bold text-red-500">
                            -{product.discount_amount}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-2xl md:text-3xl font-bold text-slate-900">
                          {product.price?.toFixed(3)} DT
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                      <Button
                        onClick={() => {
                          // Request CategoryTab to persist its state immediately to history/sessionStorage
                          try {
                            window.dispatchEvent(new CustomEvent('persistCategoryState'));
                          } catch (err) {}

                          // Normalize product to same shape ProductCard sends
                          const normalized = {
                            _id: product.product_id || product._id || product.id,
                            product_id: product.product_id || product._id || product.id,
                            name: product.name || product.title || 'Product',
                            price: product.price || 0,
                            image_url: product.image_url || product.image || '',
                            description: product.description || product.desc || '',
                            category: product.category || '',
                            brand: product.brand || product.vendor || '',
                            vendor: product.vendor || product.brand || '',
                            has_discount: product.has_discount || false,
                            discount_amount: product.discount_amount || 0,
                            original_price: product.original_price || (product.price && product.discount_amount ? product.price / (1 - product.discount_amount / 100) : product.price) || product.price || 0,
                            stock: product.stock || product.stock_quantity || 0
                          };

                          navigate(
                            `/product/${normalized.product_id}`,
                            { state: { source: "carousel", from: location.pathname + location.search, position: index, product: normalized } },
                          );
                        }}
                        variant="primary"
                        className="!px-4 md:!px-6 !py-2 md:!py-2.5 !text-sm md:!text-base"
                      >
                        View Details
                      </Button>
                      <Button
                        onClick={async (e) => {
                          e.stopPropagation();
                          setAddingIndex(index);
                          try {
                            await addToCart(product);
                            // addToCart displays toast on success
                          } catch (err) {
                            toast.error(err.message || 'Failed to add to cart');
                          } finally {
                            setAddingIndex(null);
                          }
                        }}
                        variant="outline"
                        className="!px-4 md:!px-6 !py-2 md:!py-2.5 !text-sm md:!text-base"
                        disabled={addingIndex === index}
                      >
                        {addingIndex === index ? 'Adding...' : (<><ShoppingCart size={16} /> Add to Cart</>)}
                      </Button>
                    </div>
                  </div>

                  {/* Right - Product Image */}
                  <div className="relative flex items-center justify-center p-4 md:p-8">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl opacity-20"></div>
                    {hasDiscount && (
                      <div className="absolute top-6 right-6 bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg z-20">
                        -{product.discount_amount}% OFF
                      </div>
                    )}
                    <div className="relative">
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="relative z-10 w-full max-w-xs h-auto max-h-[200px] md:max-h-[280px] object-contain drop-shadow-2xl"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src =
                            "https://placehold.co/600x600/e2e8f0/64748b?text=No+Image";
                        }}
                      />
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
                onClick={() => {}}
                className={`h-1.5 rounded-full transition-all ${
                  index === currentSlide
                    ? "w-6 bg-emerald-600"
                    : "w-1.5 bg-slate-300"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};