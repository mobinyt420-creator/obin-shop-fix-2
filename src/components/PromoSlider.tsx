import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Slide } from '../types';

interface PromoSliderProps {
  slides: Slide[];
  onSelectCategory: (categoryId: string) => void;
  onSelectProduct: (productId: string) => void;
}

export const PromoSlider: React.FC<PromoSliderProps> = ({ slides, onSelectCategory, onSelectProduct }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!slides || slides.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [slides]);

  const nextSlide = () => {
    if (!slides || slides.length === 0) return;
    setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
  };

  const prevSlide = () => {
    if (!slides || slides.length === 0) return;
    setCurrentIndex((prevIndex) => (prevIndex - 1 + slides.length) % slides.length);
  };

  const handleCtaClick = () => {
    if (!slides || slides.length === 0) return;
    const currentSlide = slides[currentIndex];
    if (currentSlide?.targetUrl) {
      if (currentSlide.targetUrl.startsWith('http')) {
        window.open(currentSlide.targetUrl, '_blank');
      } else {
        onSelectProduct(currentSlide.targetUrl);
      }
    } else {
      onSelectCategory('all');
    }
  };

  if (!slides || slides.length === 0) return null;

  return (
    <div className="-mx-2 sm:mx-0">
      <div className="relative w-full overflow-hidden bg-gray-100 rounded-[12px] shadow-[0_4px_10px_rgba(0,0,0,0.04)] border border-gray-100/60 aspect-[2/1] max-h-[170px] sm:max-h-none md:aspect-[21/9]" id="promo-banner-slider">
      <div className="absolute inset-0 flex items-center">
        {/* Animated Slide content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="absolute inset-0 w-full h-full"
          >
            {/* Background Image without Overlay */}
            <div 
              className="absolute inset-0 bg-cover bg-center transition-all duration-500 scale-100 cursor-pointer"
              style={{ backgroundImage: `url(${slides[currentIndex]?.image})` }}
              onClick={handleCtaClick}
            />
          </motion.div>
        </AnimatePresence>

        {/* Carousel indicators/dots */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 z-10">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-2.5 bg-[#FF6B00]' : 'w-1 bg-white/40 hover:bg-white/70'}`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* Arrow navigators */}
        <button
          onClick={prevSlide}
          className="absolute left-3 p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white transition-all hidden sm:flex items-center justify-center cursor-pointer"
          aria-label="Previous Slide"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-3 p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white transition-all hidden sm:flex items-center justify-center cursor-pointer"
          aria-label="Next Slide"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      </div>
    </div>
  );
};
