import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Home, Grid, Tag, ShoppingBag, User, Headphones, Phone, MessageCircle, ChevronRight } from 'lucide-react';
import { Category } from '../types';

interface SidebarMenuProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSelectCategory: (catId: string) => void;
  onNavigateView: (view: 'home' | 'search' | 'checkout' | 'account' | 'admin' | 'offers') => void;
  onOpenCart: () => void;
  cartCount: number;
  supportNumber: string;
}

export const SidebarMenu: React.FC<SidebarMenuProps> = ({
  isOpen,
  onClose,
  categories,
  onSelectCategory,
  onNavigateView,
  onOpenCart,
  cartCount,
  supportNumber
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10010] overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            onClick={onClose}
          />

          {/* Slide-over Menu Panel (Left) */}
          <div className="fixed inset-y-0 left-0 max-w-full flex pr-10">
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-screen max-w-xs bg-white shadow-2xl flex flex-col justify-between"
            >
              {/* Top Header */}
              <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-white text-gray-900 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center justify-center gap-1.5">
                    <svg viewBox="0 0 100 100" className="w-[26px] h-[26px] sm:w-[30px] sm:h-[30px] shrink-0 drop-shadow-sm self-center -mt-[2px] sm:-mt-[3px]">
                      <path d="M 35 28 C 35 10, 65 10, 65 28" fill="none" stroke="#111" strokeWidth="6" strokeLinecap="round" />
                      <clipPath id="bagClipSidebar2">
                        <path d="M 18 28 h 64 c 5 0 8 4 7 10 l -5 45 c -1 5 -4 10 -10 10 h -48 c -6 0 -9 -5 -10 -10 l -5 -45 c -1 -6 2 -10 7 -10 z" />
                      </clipPath>
                      <g clipPath="url(#bagClipSidebar2)">
                        <rect x="0" y="0" width="100" height="100" fill="#FFC107" />
                        <path d="M 100 50 Q 55 60 40 100 L 100 100 Z" fill="#111" />
                        <path d="M 100 50 Q 55 60 40 100" fill="none" stroke="#FFF" strokeWidth="8" />
                        <circle cx="50" cy="55" r="16" fill="none" stroke="#FFF" strokeWidth="10" />
                      </g>
                      <circle cx="35" cy="28" r="4" fill="#FFF" stroke="#111" strokeWidth="3" />
                      <circle cx="65" cy="28" r="4" fill="#FFF" stroke="#111" strokeWidth="3" />
                    </svg>
                    <div className="flex items-center self-center gap-1">
                      <span className="font-black text-[22px] sm:text-[26px] tracking-tight text-[#000000] uppercase leading-none" style={{ fontFamily: 'Inter, sans-serif', paddingTop: '2px' }}>OBIN</span>
                      <span className="font-black text-[22px] sm:text-[26px] text-[#FFB800] tracking-tight uppercase leading-none" style={{ fontFamily: 'Inter, sans-serif', paddingTop: '2px' }}>SHOP</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-3 block mb-1">
                    Navigation
                  </span>

                  <button
                    onClick={() => {
                      onNavigateView('home');
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm text-gray-700 hover:bg-blue-50 hover:text-[#1E3A8A] transition-colors text-left cursor-pointer"
                  >
                    <Home className="w-4 h-4 text-gray-500" />
                    <span>Home (হোম)</span>
                  </button>

                  <button
                    onClick={() => {
                      onClose();
                      onOpenCart();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <ShoppingBag className="w-4 h-4 text-gray-500" />
                      <span>Shopping Cart (কার্ট)</span>
                    </div>
                    {cartCount > 0 && (
                      <span className="bg-[#FF6B00] text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                        {cartCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      onNavigateView('offers');
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors text-left cursor-pointer"
                  >
                    <Tag className="w-4 h-4 text-gray-500" />
                    <span>Special Offers (স্পেশাল অফার)</span>
                  </button>

                  <button
                    onClick={() => {
                      onNavigateView('account');
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm text-gray-700 hover:bg-blue-50 hover:text-[#1E3A8A] transition-colors text-left cursor-pointer"
                  >
                    <User className="w-4 h-4 text-gray-500" />
                    <span>My Account (প্রোফাইল)</span>
                  </button>
                </div>

                <hr className="border-gray-100" />

                {/* Categories */}
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-3 block mb-1">
                    Categories
                  </span>

                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        onSelectCategory(cat.id);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors text-left cursor-pointer"
                    >
                      <span className="truncate">{cat.name} ({cat.banglaName})</span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer Helpline Contacts */}
              <div className="p-4 border-t border-gray-100 bg-[#FAF9F6] space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                  Support & Helpline
                </span>

                <a
                  href={`tel:${supportNumber}`}
                  className="w-full flex items-center gap-2.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-[#1E3A8A] font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call: {supportNumber}</span>
                </a>

                <a
                  href={`https://wa.me/88${supportNumber}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center gap-2.5 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp Chat</span>
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
