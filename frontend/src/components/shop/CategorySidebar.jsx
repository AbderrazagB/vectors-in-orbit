import React from 'react';

export const CategorySidebar = ({ activeTab, selectedSubcategories, setSelectedSubcategories }) => {
  const categories = {
    fashion: ['Men', 'Women', 'Kids'],
    electronics: ['Laptops', 'Desktops', 'Smartphones', 'Tablets', 'Screens', 'Keyboards', 'Mice', 'Chargers', 'Storage', 'Servers', 'TV', 'Media', 'Supplies', 'Other'],
    baby: ['Feeding', 'Toys', 'Clothes', 'Furniture']
  };

  const handleToggleSubcategory = (subcat) => {
    if (selectedSubcategories.includes(subcat)) {
      setSelectedSubcategories(selectedSubcategories.filter(s => s !== subcat));
    } else {
      setSelectedSubcategories([...selectedSubcategories, subcat]);
    }
  };

  const currentCategories = categories[activeTab] || [];

  return (
    <div className="w-64 flex-shrink-0">
      <div className="bg-white rounded-lg shadow-sm p-5 fixed left-6 top-[180px] w-64 max-h-[calc(100vh-200px)] overflow-y-auto z-30">
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
          {currentCategories.map((subcat) => (
            <label key={subcat} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={selectedSubcategories.includes(subcat)}
                onChange={() => handleToggleSubcategory(subcat)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 focus:ring-2 cursor-pointer"
              />
              <span className="text-sm text-slate-700">{subcat}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};
