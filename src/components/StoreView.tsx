import React, { useState } from 'react';
import { Search, SlidersHorizontal, Store } from 'lucide-react';
import { Product } from '../types';
import { CATEGORIES } from '../data/mockProducts';
import { ProductCard } from './ProductCard';

interface StoreViewProps {
  products: Product[];
  onOrderClick: (product: Product) => void;
}

export const StoreView: React.FC<StoreViewProps> = ({
  products,
  onOrderClick,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'rating'>('default');

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  }).sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    if (sortBy === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
    return 0;
  });

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 animate-fadeIn">
      
      {/* Title Header */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm sm:rounded-2xl sm:px-5 sm:py-3">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-700 sm:h-11 sm:w-11">
            <Store className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-teal-700 sm:text-xs">متجر أوريكس</p>
            <h1 className="truncate text-lg font-black leading-tight text-slate-950 sm:text-2xl">تسوّق منتجاتنا</h1>
          </div>
        </div>

        <div className="shrink-0 rounded-lg border border-teal-100 bg-teal-50 px-2.5 py-1.5 text-center sm:px-4 sm:py-2">
          <span className="text-lg font-black leading-none text-teal-700 sm:text-xl">{filteredProducts.length}</span>
          <span className="ms-1 text-[11px] font-bold text-slate-600 sm:ms-1.5 sm:text-xs">منتج</span>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm sm:gap-3 sm:p-3">
        
        {/* Search Input */}
        <div className="relative min-w-0 flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث عن أي منتج..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 ps-3 pe-9 text-xs transition-all focus:border-teal-600 focus:bg-white focus:outline-none sm:py-2.5 sm:text-sm"
          />
        </div>

        {/* Sort Dropdown */}
        <div className="flex shrink-0 items-center gap-1.5">
          <SlidersHorizontal className="hidden h-4 w-4 text-slate-500 sm:block" />
          <span className="hidden text-xs font-bold text-slate-600 sm:block">ترتيب حسب:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            aria-label="ترتيب المنتجات"
            className="max-w-[7.5rem] rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-[11px] font-bold focus:border-teal-600 focus:outline-none sm:max-w-none sm:px-3 sm:py-2.5 sm:text-xs"
          >
            <option value="default">الأكثر طلباً</option>
            <option value="price-asc">الأرخص أولاً</option>
            <option value="price-desc">الأغلى أولاً</option>
            <option value="rating">الأعلى تقييماً</option>
          </select>
        </div>

      </div>

      {/* Categories Tabs */}
      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`shrink-0 rounded-lg px-4 py-2 text-xs font-bold transition-all whitespace-nowrap ${
              selectedCategory === cat.id
                ? 'bg-teal-700 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-24 space-y-3 bg-white rounded-3xl border border-slate-200">
          <h3 className="font-bold text-slate-800 text-lg">لم يتم العثور على منتجات مطابقة</h3>
          <p className="text-xs text-slate-500">جرب البحث بكلمات أخرى أو اختر فئة مختلفة.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onOrderClick={onOrderClick}
            />
          ))}
        </div>
      )}

    </div>
  );
};
