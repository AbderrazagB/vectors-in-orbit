import React from 'react';
import { Search, X } from 'lucide-react';

export const SearchAndFilters = ({
  searchQuery,
  setSearchQuery,
  activeSearchQuery,
  setActiveSearchQuery,
  selectedCategory,
  setSelectedCategory,
  selectedGender,
  setSelectedGender,
  selectedCondition,
  setSelectedCondition,
  selectedBrand,
  setSelectedBrand,
  showDiscountOnly,
  setShowDiscountOnly,
  priceRange,
  setPriceRange,
  selectedSubcategories,
  setSelectedSubcategories,
  activeTab,
  categories,
  brands,
  filteredCount,
  onSearch,
  onFilterApply,
  loading = false
}) => {
  const handleClearAll = () => {
    setSearchQuery('');
    setActiveSearchQuery('');
    setSelectedCategory('');
    setPriceRange({ min: '', max: '' });
    setSelectedGender('');
    setSelectedCondition('');
    setSelectedBrand('');
    setShowDiscountOnly(false);
    setSelectedSubcategories([]);
  };

  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-3">
        {/* Main Search Bar */}
        <div className="relative mb-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery && searchQuery.trim()) {
                    onSearch();
                  }
                }}
                className="w-full pl-10 pr-10 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-white/90"
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
              onClick={onSearch}
              disabled={!searchQuery || !searchQuery.trim() || loading}
              className={`px-4 py-2 text-sm rounded-lg transition-colors font-medium ${!searchQuery || !searchQuery.trim() || loading ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-2 items-center">

          {/* Discount Filter */}
          <label className="flex items-center gap-2 px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white/90 cursor-pointer hover:border-emerald-500">
            <input
              type="checkbox"
              checked={showDiscountOnly}
              onChange={(e) => {
                setShowDiscountOnly(e.target.checked);
                setTimeout(() => onFilterApply(), 300);
              }}
              className="w-3.5 h-3.5 text-emerald-600 rounded focus:ring-emerald-500"
            />
            <span className="text-xs text-slate-700">Discounts Only</span>
          </label>

          {/* Price Range */}
          <div className="flex items-center gap-2 px-3 py-1.5 border border-slate-300 rounded-lg bg-white/90">
            <span className="text-xs text-slate-600">Price:</span>
            <input
              type="number"
              placeholder="Min"
              value={priceRange.min}
              onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
              onBlur={onFilterApply}
              className="w-16 text-xs outline-none bg-transparent"
            />
            <span className="text-slate-400">-</span>
            <input
              type="number"
              placeholder="Max"
              value={priceRange.max}
              onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
              onBlur={onFilterApply}
              className="w-16 text-xs outline-none bg-transparent"
            />
            <span className="text-xs text-slate-600">DT</span>
          </div>

          {/* Results Count */}
          <div className="ml-auto">
            <span className="text-xs text-slate-600">
              {filteredCount} products
            </span>
          </div>
        </div>
    
      </div>
    </div>
  );
};