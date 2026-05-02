import React from 'react';
import { ProductCard } from './ProductCard';

export const ProductSection = ({ products, title, description, icon: Icon, source, layout = 'vertical' }) => {
  if (!products || products.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="flex items-center gap-3 mb-8">
        {Icon && <Icon className={getIconColor(source)} size={32} />}
        <div>
          <h2 className="text-3xl font-bold text-slate-900">{title}</h2>
          {description && <p className="text-slate-600 mt-1">{description}</p>}
        </div>
      </div>

      {layout === 'horizontal' ? (
        <div className="flex flex-col gap-6">
          {products.map((p, idx) => (
            <div key={p._id || p.product_id || idx} className="w-full">
              <ProductCard 
                product={p} 
                source={source} 
                position={idx}
                layout={layout}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((p, idx) => (
            <ProductCard 
              key={p._id || p.product_id || idx} 
              product={p} 
              source={source} 
              position={idx}
              layout={layout}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const getIconColor = (source) => {
  switch (source) {
    case 'hot-deals':
      return 'text-red-500';
    case 'new-arrivals':
      return 'text-emerald-600';
    case 'trending':
      return 'text-blue-600';
    default:
      return 'text-slate-600';
  }
};
