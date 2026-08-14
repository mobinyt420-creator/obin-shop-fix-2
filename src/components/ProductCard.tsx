import React, { useState, useEffect } from 'react';
import { ShoppingCart, Clock, Zap } from 'lucide-react';
import { Product } from '../types';
import { motion } from 'motion/react';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  onAddToCart: (product: Product, e: React.MouseEvent) => void;
  onBuyNow: (product: Product, e: React.MouseEvent) => void;
}

export const ProductCard: React.FC<ProductCardProps> = React.memo(({
  product,
  onSelect,
  onAddToCart,
  onBuyNow
}) => {
  const [timeLeft, setTimeLeft] = useState(product.timerSeconds || 0);

  useEffect(() => {
    if (product.timerSeconds && product.timerSeconds > 0) {
      setTimeLeft(product.timerSeconds);
    }
  }, [product.timerSeconds]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  // Calculate discount and save amount
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const savedAmount = hasDiscount && product.originalPrice ? product.originalPrice - product.price : 0;
  const isOutOfStock = product.stockStatus === 'Out of Stock';

  // Get percentage discount
  const discountPercent = hasDiscount && product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;
    
  // Format timer

  const getBadgeStyles = (msg: string) => {
    const lowerMsg = msg.toLowerCase();
    if (lowerMsg.includes('best seller') || lowerMsg.includes('top selling')) return 'bg-red-600 border-red-500';
    if (lowerMsg.includes('save') || lowerMsg.includes('%')) return 'bg-green-600 border-green-500';
    return 'bg-blue-600 border-blue-500';
  };

  const formatTime = (seconds: number) => {
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor(seconds % (3600*24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    
    if (d > 0) return `${d}d ${h}h`;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="group bg-white rounded-[12px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] border border-gray-100 transition-all duration-300 h-full flex flex-col justify-between p-0"
      id={`product-card-${product.id}`}
    >
      {/* 1. Giant Product Image Container */}
      <div 
        className="relative w-full aspect-[4/4.2] sm:aspect-square flex items-center justify-center bg-white cursor-pointer"
        onClick={() => onSelect(product)}
      >
        <div className="w-full h-full overflow-hidden absolute inset-0 rounded-t-[10px]">
          <img onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/f3f4f6/a1a1aa?text=No+Image'; (e.target as HTMLImageElement).onerror = null; }} loading="lazy" src={product.images?.[1] || product.images?.[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-500" referrerPolicy="no-referrer" />
        </div>
        {timeLeft > 0 && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center justify-center z-10 bg-red-600/95 shadow-sm py-0.5 px-2.5 rounded-full select-none border border-white">
            <div className="flex items-center gap-0.5 text-white">
              <span className="px-0.5 text-xs font-semibold tracking-wider">{Math.floor(timeLeft / 3600).toString().padStart(2, '0')}</span>
              <span className="text-[10px] font-semibold text-white/80 pb-0.5">:</span>
              <span className="px-0.5 text-xs font-semibold tracking-wider">{Math.floor((timeLeft % 3600) / 60).toString().padStart(2, '0')}</span>
              <span className="text-[10px] font-semibold text-white/80 pb-0.5">:</span>
              <span className="px-0.5 text-xs font-semibold tracking-wider">{Math.floor(timeLeft % 60).toString().padStart(2, '0')}</span>
            </div>
          </div>
        )}
        {product.discountMessage && (
          <div className={`absolute top-0 right-0 text-white text-[8px] sm:text-[9px] font-black tracking-wider px-2 py-0.5 rounded-bl-xl shadow-md backdrop-blur-md border z-10 ${getBadgeStyles(product.discountMessage)}`}>
            {product.discountMessage}
          </div>
        )}
      </div>

      {/* 2. Compact, Space-Optimized Information Section (Tightly spaced, with neat internal padding) */}
      <div className="p-2 sm:p-2.5 flex-1 flex flex-col justify-between text-left">
        <div>
          {/* Product Title: Compact, elegant typography, tight leading, unified fixed height to prevent vertical misalignment */}
          <h4 
            onClick={() => onSelect(product)}
            className="font-semibold text-slate-900 antialiased tracking-tight text-sm md:text-base leading-snug hover:text-[#2563EB] cursor-pointer transition-colors line-clamp-2 min-h-[40px] sm:min-h-[44px]"
            title={product.name}
          >
            {product.name}
          </h4>

          {/* Price Section: Large prominent current price, old price with line-through, and Save badge all in one line! */}
          <div className="flex items-end gap-1.5 w-full select-none mt-1" id={`price-stock-row-${product.id}`}>
            <span className="text-[18px] sm:text-[22px] font-extrabold text-[#FF6B00] tracking-tight leading-none">
              ৳{product.price.toLocaleString('en-US')}
            </span>
            {hasDiscount && (
              <div className="flex items-center gap-1.5 mb-[1px]">
                <span className="text-[15px] sm:text-[17px] text-[#888888] font-semibold decoration-[#888888] decoration-2 line-through leading-none whitespace-nowrap">
                  ৳{product.originalPrice?.toLocaleString('en-US')}
                </span>

              </div>
            )}
          </div>
        </div>

        <div>
          {/* 4. Action Buttons Row: Compact & Balanced - Swapped LEFT (Add to Cart) and RIGHT (Buy Now) as requested */}
          <div className="grid grid-cols-[36px_1fr] sm:grid-cols-[40px_1fr] gap-1.5 items-center w-full mt-2 pt-1.5 border-t border-gray-100">
            <button
              onClick={(e) => onAddToCart(product, e)}
              disabled={isOutOfStock}
              className="flex items-center justify-center bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200/60 h-7 sm:h-8 rounded-md sm:rounded-xl transition-all cursor-pointer active:scale-97 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Add to cart"
            >
              <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <button
              onClick={(e) => onBuyNow(product, e)}
              disabled={isOutOfStock}
              className="flex-grow flex items-center justify-center gap-1 bg-gradient-to-r from-[#FF6B00] via-[#FF8000] to-[#FF6B00] hover:from-[#FF8000] hover:to-[#EA580C] bg-[length:200%_100%] hover:bg-right text-white font-extrabold text-[10px] sm:text-[11px] tracking-wide h-7 sm:h-8 rounded-md sm:rounded-xl transition-all duration-300 shadow-sm hover:shadow-md hover:shadow-[#FF6B00]/30 active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group/btn overflow-hidden relative"
            >
              <span className="relative z-10 flex items-center gap-0.5 group-hover/btn:scale-105 transition-transform duration-200">
                {isOutOfStock ? 'OUT OF STOCK' : '⚡ BUY NOW'}
              </span>
              <span className="absolute inset-0 bg-white/20 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 ease-in-out" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
