import React from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { ProductCard } from './ProductCard';

export const ProductGrid = ({ 
  products, 
  currentPage, 
  itemsPerPage, 
  onPageChange, 
  source = 'all-products',
  description,
  layout = 'vertical'
}) => {
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = products.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(products.length / itemsPerPage);

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          {description && (
            <p className="text-slate-600 mt-1">{description}</p>
          )}
        </div>
      </div>

      {currentProducts.length === 0 ? (
        <div className="text-center py-20">
          <div className="flex justify-center mb-4">
            <Search size={64} className="text-slate-300" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">No products found</h3>
          <p className="text-slate-600 mb-6">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className={layout === 'horizontal' ? 'flex flex-col gap-4' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'}>
          {currentProducts.map((p, idx) => (
            <ProductCard 
              key={p._id || p.product_id || idx} 
              product={p} 
              source={source}
              position={indexOfFirstItem + idx}
              layout={layout}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-12">
          <button
            onClick={() => onPageChange(currentPage - 1)}
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
                  onClick={() => onPageChange(pageNumber)}
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
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed bg-white"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </>
  );
};
