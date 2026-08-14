import React from 'react';
import { Menu, ShoppingBag, Search, Gem, Leaf, User, ShoppingCart } from 'lucide-react';

interface HeaderProps {
  cartCount: number;
  onOpenCart: () => void;
  onNavigateHome: () => void;
  onSearchClick: () => void;
  onOpenMenu: () => void;
  onLoginClick?: () => void;
  currentView: string;
  isProductOpen?: boolean;
  onCloseProduct?: () => void;
}

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export const Header: React.FC<HeaderProps> = ({
  cartCount,
  onOpenCart,
  onNavigateHome,
  onSearchClick,
  onOpenMenu,
  onLoginClick,
  currentView,
  isProductOpen,
  onCloseProduct
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 w-full z-[10005] bg-white/80 backdrop-blur-md shadow-[0_2px_10px_rgba(0,0,0,0.02)] border-b border-gray-100 transition-all" id="app-header">
      <div className="max-w-6xl mx-auto px-4 h-11 flex items-center justify-between relative">
        {/* Left: Hamburger menu button or Back */}
        <div className="flex items-center z-10 gap-2">
          {(currentView === 'admin' || currentView === 'search' || isProductOpen) ? (
            <button 
              onClick={isProductOpen && onCloseProduct ? onCloseProduct : onNavigateHome}
              className="p-1.5 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="Back"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            </button>
          ) : null}
          {currentView !== 'search' && !isProductOpen && (
          <button 
            id="mobile-menu-btn"
            onClick={onOpenMenu}
            className="p-1.5 rounded-md text-gray-700 hover:text-[#2563EB] hover:bg-blue-50 transition-colors cursor-pointer"
            aria-label="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          )}
        </div>
        
        {/* Center: Brand logo or View Title */}
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 flex items-center justify-center">
          {currentView === 'search' ? (
            <span className="text-[22px] font-extrabold text-slate-900 tracking-tight mt-1">Categories</span>
          ) : (
            <button 
              id="logo-brand-btn"
              onClick={onNavigateHome}
              className="flex items-center gap-2 text-left group scale-[1.05] sm:scale-110 active:scale-95 transition-transform cursor-pointer"
            >
              {/* COMPACT logo block */}
              <div className="flex items-center">
                <div className="inline-flex items-center justify-center gap-1.5">

                  <svg viewBox="0 0 100 100" className="w-[26px] h-[26px] sm:w-[30px] sm:h-[30px] shrink-0 drop-shadow-sm self-center -mt-[2px] sm:-mt-[3px]">
                    <path d="M 35 28 C 35 10, 65 10, 65 28" fill="none" stroke="#111" strokeWidth="6" strokeLinecap="round" />
                    
                    <clipPath id="bagClip">
                      <path d="M 18 28 h 64 c 5 0 8 4 7 10 l -5 45 c -1 5 -4 10 -10 10 h -48 c -6 0 -9 -5 -10 -10 l -5 -45 c -1 -6 2 -10 7 -10 z" />
                    </clipPath>
                    
                    <g clipPath="url(#bagClip)">
                      <rect x="0" y="0" width="100" height="100" fill="#FFC107" />
                      <path d="M 100 50 Q 55 60 40 100 L 100 100 Z" fill="#111" />
                      <path d="M 100 50 Q 55 60 40 100" fill="none" stroke="#FFF" strokeWidth="8" />
                      <circle cx="50" cy="55" r="16" fill="none" stroke="#FFF" strokeWidth="10" />
                    </g>
                    
                    <circle cx="35" cy="28" r="4" fill="#FFF" stroke="#111" strokeWidth="3" />
                    <circle cx="65" cy="28" r="4" fill="#FFF" stroke="#111" strokeWidth="3" />
                  </svg>
                  <div className="flex items-center self-center gap-1 -ml-2 sm:-ml-2.5">
                    <span className="font-black text-[22px] sm:text-[26px] tracking-tight text-[#000000] uppercase leading-none" style={{ fontFamily: 'Inter, sans-serif', paddingTop: '2px' }}>OBIN</span>
                    <span className="font-black text-[22px] sm:text-[26px] text-[#FFB800] tracking-tight uppercase leading-none" style={{ fontFamily: 'Inter, sans-serif', paddingTop: '2px' }}>SHOP</span>
                  </div>
                </div>
              </div>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 z-10">
          {/* Right: Action controls with Search and Cart */}

          <button
            id="search-trigger-btn"
            onClick={onSearchClick}
            className={`p-2 rounded-full text-gray-700 hover:bg-blue-50 hover:text-[#2563EB] transition-all cursor-pointer ${
              currentView === 'search' ? 'bg-amber-50 text-[#2563EB] font-semibold' : ''
            }`}
            title="Search Products"
          >
            <Search className="w-5 h-5" />
          </button>

          <button
            id="cart-trigger-btn"
            onClick={onOpenCart}
            className="relative p-2 rounded-full text-gray-700 hover:bg-blue-50 hover:text-[#2563EB] transition-all cursor-pointer"
            title="View Shopping Cart"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute top-0 right-0 bg-[#FF6B00] text-white font-black text-[9px] w-4.5 h-4.5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
