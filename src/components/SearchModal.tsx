import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Package, Tag, ArrowRight } from 'lucide-react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product, e: React.MouseEvent) => void;
  onBuyNow: (product: Product, e: React.MouseEvent) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  products,
  onSelectProduct,
  onAddToCart,
  onBuyNow
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const filteredProducts = query.trim() === '' 
    ? [] 
    : products.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) || 
        (p.banglaName && p.banglaName.includes(query)) ||
        (p.category && p.category.toLowerCase().includes(query.toLowerCase()))
      );

  const popularSearches = ['ঘী', 'হানি', 'অয়েল', 'বাদাম', 'চা', 'খাজুর', 'Ghee', 'Honey', 'Nut'];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10010] overflow-y-auto bg-black/60 backdrop-blur-xs flex flex-col justify-start items-center p-2 sm:p-4 md:p-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[85vh] my-auto"
          >
            {/* Search Input Bar */}
            <div className="p-3 sm:p-4 border-b border-gray-100 flex items-center gap-3 bg-[#FAF9F6]">
              <Search className="w-5 h-5 text-gray-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="প্রোডাক্টের নাম দিয়ে খুঁজুন (Search products...)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent border-none text-sm sm:text-base font-bold text-gray-800 focus:outline-none placeholder:font-normal placeholder:text-gray-400"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                Close
              </button>
            </div>

            {/* Popular Quick Suggestions (when empty query) */}
            {query.trim() === '' ? (
              <div className="p-5 text-left space-y-4">
                <span className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#FF6B00]" /> Popular Searches
                </span>
                <div className="flex flex-wrap gap-2">
                  {popularSearches.map((term) => (
                    <button
                      key={term}
                      onClick={() => setQuery(term)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-orange-50 hover:text-[#FF6B00] hover:border-orange-200 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 transition-colors cursor-pointer"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Search Results Grid */
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 scrollbar-thin">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-gray-500">
                    Found {filteredProducts.length} results for "{query}"
                  </span>
                </div>

                {filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {filteredProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onSelect={(p) => {
                          onSelectProduct(p);
                          onClose();
                        }}
                        onAddToCart={onAddToCart}
                        onBuyNow={onBuyNow}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                    <Package className="w-12 h-12 text-gray-300" />
                    <h4 className="text-sm font-bold text-gray-700">No products matching "{query}"</h4>
                    <p className="text-xs text-gray-400">অক্ষরসমূহ আবার চেক করে চেষ্টা করে দেখুন।</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
