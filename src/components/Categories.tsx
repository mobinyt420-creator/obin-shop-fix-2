import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Category } from '../types';
import { Sparkles } from 'lucide-react';

interface CategoriesProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
}



export const Categories: React.FC<CategoriesProps> = ({ categories, selectedCategory, onSelectCategory }) => {
  const INFINITE_CATEGORIES = useMemo(() => {
    if (!categories || categories.length === 0) return [];
    return [...categories, ...categories, ...categories];
  }, [categories]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Sync with selectedCategory
  useEffect(() => {
    if (selectedCategory === 'all' && activeIndex === null) {
       const idx = INFINITE_CATEGORIES.findIndex(c => c.id === 'all');
       if (idx !== -1) setActiveIndex(idx);
    }
  }, [selectedCategory, INFINITE_CATEGORIES]);

  // Auto-scroll loop effect
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      const container = containerRef.current;
      if (!container) return;

      const singleSetWidth = container.scrollWidth / 3;
      const isMobile = window.innerWidth < 768;
      const visibleItems = isMobile ? 4 : 6;
      const itemWidth = container.clientWidth / visibleItems;

      // Snapping correction: If we scrolled past the center group, snap back gracefully
      if (container.scrollLeft >= singleSetWidth * 2) {
        container.scrollLeft -= singleSetWidth;
      } else if (container.scrollLeft <= 10) {
        container.scrollLeft += singleSetWidth;
      }

      // Custom smooth scroll with cubic-bezier
      const startLeft = container.scrollLeft;
      const targetLeft = startLeft + itemWidth;
      const duration = 1200; // ms
      let startTime: number | null = null;

      // cubic-bezier(0.25, 1, 0.5, 1) equivalent
      const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      const step = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = timestamp - startTime;
        const percent = Math.min(progress / duration, 1);
        const easedPercent = easeInOutCubic(percent);

        container.scrollLeft = startLeft + (targetLeft - startLeft) * easedPercent;

        if (percent < 1) {
          requestAnimationFrame(step);
        }
      };

      requestAnimationFrame(step);

    }, 3000);

    return () => clearInterval(interval);
  }, [isPaused]);

  // Handle snapping initial alignment to the center copy on component mount
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const singleSetWidth = container.scrollWidth / 3;
      // Start in the middle set of items so user can scroll in both directions infinitely
      container.scrollLeft = singleSetWidth;
    }
  }, []);

  // Temporary pause on interaction
  const triggerUserInteractionPause = () => {
    setIsPaused(true);
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
    }
    pauseTimerRef.current = setTimeout(() => {
      setIsPaused(false);
    }, 5000); // Resume auto-scroll after 5 seconds of absolute inactivity
  };

  return (
    <div className="w-full pt-1 sm:pt-1 pb-0" id="categories-section">
      {/* Looping Smooth Horizontal Scroll Track */}
      <div 
        ref={containerRef}
        onScroll={() => {
          // Trigger snap boundaries natively if user scrolls extreme left/right
          const container = containerRef.current;
          if (container) {
            const singleSetWidth = container.scrollWidth / 3;
            if (container.scrollLeft >= singleSetWidth * 2 - 10) {
              container.scrollLeft -= singleSetWidth;
            } else if (container.scrollLeft <= 10) {
              container.scrollLeft += singleSetWidth;
            }
          }
        }}
        onTouchStart={triggerUserInteractionPause}
        onMouseDown={triggerUserInteractionPause}
        className="flex items-start overflow-x-auto pt-1 pb-1 scrollbar-none -mx-4 px-4 select-none touch-pan-x" 
        id="categories-scroll-row"
      >
        {INFINITE_CATEGORIES.map((category, index) => {
          const isActive = activeIndex === index;
          return (
            <button
              key={`${category.id}-${index}`}
              onClick={() => {
                triggerUserInteractionPause();
                setActiveIndex(index);
                onSelectCategory(category.id);
              }}
              className="flex flex-col items-center text-center shrink-0 w-[84px] sm:w-[105px] focus:outline-none cursor-pointer group px-0.5 select-none transition-all duration-300"
            >
              {/* Premium sleek rounded-squares category card with soft borders and soft shadow (Requirement 1-10) */}
              <div 
                className={`relative w-[62px] h-[62px] sm:w-[72px] sm:h-[72px] rounded-2xl flex items-center justify-center bg-white transition-all duration-300 ${
                  isActive 
                    ? 'ring-2 ring-offset-2 ring-[#FF6B00] p-[4px] shadow-[0_6px_20px_rgba(255,107,0,0.3)] scale-[1.08] z-10 bg-white' 
                    : 'border border-gray-200 p-[5px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] group-hover:border-[#FF6B00]/40 group-hover:shadow-[0_6px_15px_rgba(255,107,0,0.06)] group-hover:scale-105 active:scale-95'
                }`}
              >
                <div className="w-full h-full rounded-[12px] overflow-hidden bg-[#FAF9F6] flex items-center justify-center">
                  <img onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/f3f4f6/a1a1aa?text=No+Image'; (e.target as HTMLImageElement).onerror = null; }}
                    src={category.icon}
                    alt={category.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                </div>

                {/* Sparkling tiny visual badge if active */}
                {isActive && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#85DF00] rounded-full border border-white" />
                )}
              </div>

              {/* Category label with gorgeous typography split */}
              <span className={`text-[12px] sm:text-[13px] font-[900] mt-2.5 tracking-wide line-clamp-1 leading-tight transition-colors duration-300 ${
                isActive ? 'text-[#EA580C] drop-shadow-sm' : 'text-slate-700 group-hover:text-[#FF6B00]'
              }`}>
                {category.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
