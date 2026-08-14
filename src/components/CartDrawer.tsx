import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, ShieldCheck, Truck } from 'lucide-react';
import { CartItem } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number, selectedSize?: string, selectedColor?: string) => void;
  onRemoveItem: (productId: string, selectedSize?: string, selectedColor?: string) => void;
  onClearCart: () => void;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onProceedToCheckout
}) => {
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

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

          {/* Slide-over Drawer Panel */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between"
            >
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-[#FAF9F6]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#FF6B00]/10 text-[#FF6B00] flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                      <span>Shopping Cart</span>
                      <span className="text-xs font-extrabold bg-[#FF6B00] text-white px-2 py-0.5 rounded-full">
                        {totalItems}
                      </span>
                    </h2>
                    <p className="text-[11px] font-semibold text-gray-500">আপনার নির্বাচন করা পণ্যসমূহ</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {cart.length > 0 && (
                    <button
                      onClick={onClearCart}
                      className="text-[11px] font-bold text-red-500 hover:text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer mr-1"
                      title="Clear Cart"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 scrollbar-thin">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4 space-y-4">
                    <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center text-[#FF6B00] mb-2">
                      <ShoppingBag className="w-10 h-10 stroke-[1.5]" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-gray-800">Your cart is empty</h3>
                      <p className="text-xs text-gray-500 mt-1 max-w-[220px]">আপনার পছন্দসই পণ্যটি কার্টে যোগ করুন এবং কেনাকাটা সম্পন্ন করুন</p>
                    </div>
                    <button
                      onClick={onClose}
                      className="mt-4 px-6 py-2.5 bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      Browse Products
                    </button>
                  </div>
                ) : (
                  cart.map((item, index) => (
                    <div
                      key={`${item.product.id}-${item.selectedSize || ''}-${item.selectedColor || ''}-${index}`}
                      className="p-3 bg-white rounded-xl border border-gray-100 shadow-xs flex items-center gap-3 relative group hover:border-orange-200 transition-colors"
                    >
                      <img onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/f3f4f6/a1a1aa?text=No+Image'; (e.target as HTMLImageElement).onerror = null; }}
                        src={item.product.images?.[0] || 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&q=80&w=300'}
                        alt={item.product.name}
                        className="w-16 h-16 sm:w-18 sm:h-18 object-contain rounded-lg bg-gray-50 border border-gray-100 p-1 shrink-0"
                        referrerPolicy="no-referrer"
                      />

                      <div className="flex-1 min-w-0 text-left">
                        <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate pr-6">
                          {item.product.name}
                        </h4>
                        
                        {(item.selectedSize || item.selectedColor) && (
                          <div className="flex gap-1.5 mt-0.5">
                            {item.selectedSize && (
                              <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded">
                                Size: {item.selectedSize}
                              </span>
                            )}
                            {item.selectedColor && (
                              <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded">
                                Color: {item.selectedColor}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs sm:text-sm font-black text-[#1E3A8A]">
                            ৳{(item.product.price * item.quantity).toLocaleString('en-US')}
                          </span>

                          {/* Quantity selector */}
                          <div className="flex items-center bg-white border border-gray-200 rounded-full overflow-hidden h-8 shadow-sm">
                            <button
                              onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1, item.selectedSize, item.selectedColor)}
                              className="w-8 h-full flex items-center justify-center text-gray-500 hover:text-[#FF6B00] hover:bg-orange-50 transition-colors cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-1 text-xs font-black text-gray-900 bg-transparent h-full flex items-center min-w-[28px] justify-center select-none">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1, item.selectedSize, item.selectedColor)}
                              className="w-8 h-full flex items-center justify-center text-gray-500 hover:text-[#FF6B00] hover:bg-orange-50 transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={() => onRemoveItem(item.product.id, item.selectedSize, item.selectedColor)}
                        className="absolute top-2.5 right-2.5 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Bottom Footer & Checkout CTA */}
              {cart.length > 0 && (
                <div className="p-4 sm:p-5 border-t border-gray-100 bg-white space-y-4 shadow-[0_-10px_20px_rgba(0,0,0,0.03)] sticky bottom-0 z-10">
                  <div className="flex items-center justify-between text-xs text-gray-600 bg-green-50/50 p-2.5 rounded-xl border border-green-100/50">
                    <span className="flex items-center gap-1.5 font-bold text-green-700">
                      <Truck className="w-4 h-4" /> Cash on Delivery Available
                    </span>
                    <span className="font-semibold text-gray-500">Inside & Outside Dhaka</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Subtotal</span>
                      <span className="text-2xl font-black text-[#111827]">৳{totalAmount.toLocaleString('en-US')}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onClose();
                      onProceedToCheckout();
                    }}
                    className="w-full h-14 bg-[#FF6B00] hover:bg-[#E66000] text-white font-black text-[13px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20 active:scale-98 transition-all cursor-pointer group"
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
