import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, ChevronDown, Check, Zap, ShoppingCart, Leaf } from 'lucide-react';
import { CartItem } from '../types';
import { districts, getThanas } from '../data/bd-geo';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface CheckoutViewProps {
  cart: CartItem[];
  onBack: () => void;
  onConfirmOrder: (orderDetails: {
    address: { name: string; phone: string; street: string; city: string; area: string };
    notes: string;
    paymentMethod: 'cod' | 'bkash' | 'online';
    promoCodeApplied: string;
    deliveryCharge: number;
    discountAmount: number;
    finalTotal: number;
  }) => void | Promise<void>;
  onEditCart: () => void;
  defaultProfile?: { name: string; phone: string; email: string; address: string };
  updateQuantity?: (productId: string, delta: number, selectedSize?: string, selectedColor?: string) => void;
  removeFromCart?: (productId: string, selectedSize?: string, selectedColor?: string) => void;
  onLoginClick?: () => void;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  cart,
  onBack,
  onConfirmOrder,
  defaultProfile,
  onLoginClick,
}) => {
  // Form Fields State
  const [tempName, setTempName] = useState('');
  const [tempPhone, setTempPhone] = useState('');
  const [tempStreet, setTempStreet] = useState('');
  const [tempDistrict, setTempDistrict] = useState('');
  const [tempThana, setTempThana] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableThanas, setAvailableThanas] = useState<string[]>([]);

  useEffect(() => {
    if (tempDistrict) {
      setAvailableThanas(getThanas(tempDistrict));
      setTempThana('');
    } else {
      setAvailableThanas([]);
    }
  }, [tempDistrict]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod');
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentScreenshot, setPaymentScreenshot] = useState<string>('');
  
  const [adminBkash, setAdminBkash] = useState('01825000010');
  const [adminNagad, setAdminNagad] = useState('01825000010');

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.bkashNumber) setAdminBkash(data.bkashNumber);
        if (data.nagadNumber) setAdminNagad(data.nagadNumber);
      }
    });
    return () => unsub();
  }, []);

  
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingImage(true);
      const apiKey = import.meta.env.VITE_IMGBB_API_KEY || '50be96ff0f81d113824bb8d3df6c6328';
      const formData = new FormData();
      formData.append('image', file);
      
      try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        
        if (data.success && data.data && data.data.url) {
          setPaymentScreenshot(data.data.url);
        } else {
           const reader = new FileReader();
           reader.onloadend = () => {
             const img = new Image();
             img.onload = () => setPaymentScreenshot(reader.result as string);
             img.src = reader.result as string;
           };
           reader.readAsDataURL(file);
        }
      } catch (err) {
        console.error("ImgBB upload failed", err);
        const reader = new FileReader();
        reader.onloadend = () => {
          const img = new Image();
          img.onload = () => setPaymentScreenshot(reader.result as string);
          img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
      } finally {
        setIsUploadingImage(false);
      }
    }
  };


  useEffect(() => {
    if (tempDistrict) {
      setAvailableThanas(getThanas(tempDistrict));
      setTempThana('');
    } else {
      setAvailableThanas([]);
      setTempThana('');
    }
  }, [tempDistrict]);

  // Math Calculations
  const totalProductPrice = cart.reduce((acc, item) => acc + ((item.product?.price || 0) * item.quantity), 0);
  const deliveryCharge = 130;
  
  // Dynamic discount logic based on payment method
  const discountAmount = paymentMethod === 'online' ? 20 : 0;
  const finalTotal = Math.max(0, totalProductPrice + deliveryCharge - discountAmount);

  const submitFinalOrder = async () => {
    setIsSubmitting(true);
    try {
      // Guarantee a minimum 800ms loading state for smooth UI transition
      await new Promise(resolve => setTimeout(resolve, 800));
      await onConfirmOrder({
        address: { 
          name: tempName, 
          phone: tempPhone, 
          street: tempStreet, 
          city: tempDistrict, 
          area: tempThana 
        },
        notes: notes,
        paymentMethod: paymentMethod,
        paymentScreenshotRef: paymentMethod === 'online' ? paymentScreenshot : undefined,
        promoCodeApplied: paymentMethod === 'online' ? 'ONLINE20' : '',
        deliveryCharge,
        discountAmount,
        finalTotal
      });
      setIsSubmitting(false);
      setShowPaymentModal(false);
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
    }
  };

  const handlePlaceOrder = async () => {
    const newErrors: Record<string, string> = {};
    if (!tempName.trim()) newErrors.name = 'Full Name is required';
    if (!tempPhone.trim()) newErrors.phone = 'Mobile Number is required';
    if (!tempStreet.trim()) newErrors.street = 'Address is required';
    if (!tempDistrict) newErrors.district = 'District is required';
    if (!tempThana) newErrors.thana = 'Upazila/Thana is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Smooth scroll to first error
      const firstErrorKey = Object.keys(newErrors)[0];
      const element = document.getElementById(`input-${firstErrorKey}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    setErrors({});
    
    if (paymentMethod === 'online') {
      setShowPaymentModal(true);
      return;
    }

    await submitFinalOrder();
  };

  return (
    <div className="min-h-[100dvh] bg-[#F8F9FA] pb-32 font-sans selection:bg-[#2563EB]/30 relative flex flex-col">
      {/* 1. Header (Top): Clean "Checkout" title. No distractors. */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-xl mx-auto flex items-center justify-between px-4 h-14 relative">
          <div className="flex items-center z-10">
            <button 
              onClick={onBack}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
            </button>
          </div>
          
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 flex items-center justify-center">
            <div className="flex items-center gap-2 text-left group scale-[1.05] sm:scale-110 active:scale-95 transition-transform cursor-pointer" onClick={onBack}>
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
                  <div className="flex items-center self-center gap-1">
                    <span className="font-black text-[22px] sm:text-[26px] tracking-tight text-[#000000] uppercase leading-none" style={{ fontFamily: 'Inter, sans-serif', paddingTop: '2px' }}>OBIN</span>
                    <span className="font-black text-[22px] sm:text-[26px] text-[#FFB800] tracking-tight uppercase leading-none" style={{ fontFamily: 'Inter, sans-serif', paddingTop: '2px' }}>SHOP</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center z-10">
            <button 
              onClick={onLoginClick}
              className="text-[11px] sm:text-[12px] font-bold text-[#2563EB] hover:text-[#EA580C] bg-blue-50 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
            >
              Login
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto p-4 space-y-4 flex-1 w-full">
        {/* 2. Cart Summary */}
        <section className="bg-gray-50 rounded-xl p-5 shadow-[0_4px_16px_rgba(0,0,0,0.03)] border border-blue-50/50">
          <h2 className="text-[15px] font-black text-gray-900 mb-4 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-[#2563EB]" />
            Your Order
          </h2>
          <div className="space-y-4">
            {cart.map((item) => (
              <div key={item.product.id} className="flex gap-4 items-center">
                <div className="w-16 h-16 shrink-0 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center">
                  <img onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/f3f4f6/a1a1aa?text=No+Image'; (e.target as HTMLImageElement).onerror = null; }} src={item.product.images?.[1] || item.product.images?.[0]} alt={item.product.name} className="max-w-full max-h-full object-contain p-1" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-gray-800 line-clamp-2 leading-tight">{item.product.name}</h3>
                  <div className="flex justify-between items-center mt-1.5">
                    <span className="text-[13px] font-medium text-gray-500">Qty: {item.quantity}</span>
                    <span className="text-[14px] font-black text-[#2563EB]">৳{((item.product?.price || 0) * item.quantity).toLocaleString('en-US')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Delivery Information */}
        <section className="bg-gray-50 rounded-xl p-5 shadow-[0_4px_16px_rgba(0,0,0,0.03)] border border-gray-100">
          <h2 className="text-[15px] font-black text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-[#2563EB] rounded-full inline-block"></span>
            Delivery Information
          </h2>
          
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                
                <input 
                  id="input-name"
                  type="text" 
                  value={tempName}
                  onChange={e => { setTempName(e.target.value); setErrors(p => ({...p, name: ''})) }}
                  placeholder="Full Name *" 
                  className={`w-full bg-gray-50 border rounded-xl px-4 py-2.5 text-[14px] focus:bg-white focus:outline-none focus:ring-2 transition-all font-medium ${errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 focus:border-[#2563EB] focus:ring-[#2563EB]/20'}`}
                />
                {errors.name && <p className="text-red-500 text-[10px] mt-1 font-semibold">{errors.name}</p>}
              </div>
              
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none border-r border-gray-200 pr-2">
                    <span className="text-gray-500 text-sm font-bold">+880</span>
                  </div>
                  <input 
                    id="input-phone"
                    type="tel" 
                    value={tempPhone}
                    onChange={e => { setTempPhone(e.target.value); setErrors(p => ({...p, phone: ''})) }}
                    placeholder="1XXXXXXXXX *" 
                    className={`w-full bg-gray-50 border rounded-xl pl-[72px] pr-4 py-2.5 text-[14px] focus:bg-white focus:outline-none focus:ring-2 transition-all font-mono font-medium ${errors.phone ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 focus:border-[#FF6B00] focus:ring-#FF6B00/20'}`}
                  />
                </div>
                {errors.phone && <p className="text-red-500 text-[10px] mt-1 font-semibold">{errors.phone}</p>}
              </div>
            </div>
            
            <div>
              <textarea 
                id="input-street"
                value={tempStreet}
                onChange={e => { setTempStreet(e.target.value); setErrors(p => ({...p, street: ''})) }}
                placeholder="House 12, Road 5, Block C *" 
                rows={3}
                className={`w-full bg-gray-50 border rounded-xl px-4 py-3 text-[14px] focus:bg-white focus:outline-none focus:ring-2 transition-all font-medium resize-none leading-relaxed ${errors.street ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 focus:border-[#2563EB] focus:ring-[#2563EB]/20'}`}
              />
              {errors.street && <p className="text-red-500 text-[10px] mt-1 font-semibold">{errors.street}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="relative">
                  <select 
                    id="input-district"
                    value={tempDistrict}
                    onChange={e => { setTempDistrict(e.target.value); setErrors(p => ({...p, district: ''})) }}
                    className={`w-full h-[48px] bg-gray-50 border rounded-xl px-3 sm:px-4 py-2.5 text-[13px] sm:text-[14px] focus:bg-white focus:outline-none focus:ring-2 transition-all font-medium appearance-none cursor-pointer truncate ${errors.district ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 focus:border-[#2563EB] focus:ring-[#2563EB]/20'}`}
                  >
                    <option value="" disabled>জেলা নির্বাচন করুন (Select District)</option>
                    {districts.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {errors.district && <p className="text-red-500 text-[10px] mt-1 font-semibold">{errors.district}</p>}
              </div>
              
              <div>
                <div className="relative">
                  <select 
                    id="input-thana"
                    value={tempThana}
                    onChange={e => { setTempThana(e.target.value); setErrors(p => ({...p, thana: ''})) }}
                    disabled={!tempDistrict}
                    className={`w-full h-[48px] bg-gray-50 border rounded-xl px-3 sm:px-4 py-2.5 text-[13px] sm:text-[14px] focus:bg-white focus:outline-none focus:ring-2 transition-all font-medium appearance-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer truncate ${errors.thana ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 focus:border-[#2563EB] focus:ring-[#2563EB]/20'}`}
                  >
                    <option value="" disabled>থানা / এলাকা (Select Area / Thana)</option>
                    {availableThanas.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {errors.thana && <p className="text-red-500 text-[10px] mt-1 font-semibold">{errors.thana}</p>}
              </div>
            </div>
          </div>
        </section>

        {/* 4. Payment Method */}
        <section className="bg-gray-50 rounded-xl p-5 shadow-[0_4px_16px_rgba(0,0,0,0.03)] border border-gray-100">
          <h2 className="text-[15px] font-black text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-[#2563EB] rounded-full inline-block"></span>
            Payment Method
          </h2>
          <div className="space-y-3">
            <button
              onClick={() => setPaymentMethod('cod')}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                paymentMethod === 'cod' 
                  ? 'border-[#2563EB] bg-blue-50/30' 
                  : 'border-gray-100 hover:border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'cod' ? 'border-[#2563EB]' : 'border-gray-300'}`}>
                  {paymentMethod === 'cod' && <div className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />}
                </div>
                <span className={`font-bold ${paymentMethod === 'cod' ? 'text-gray-900' : 'text-gray-600'}`}>
                  Cash On Delivery (COD)
                </span>
              </div>
            </button>

            <button
              onClick={() => setPaymentMethod('online')}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                paymentMethod === 'online' 
                  ? 'border-blue-500 bg-blue-50/30' 
                  : 'border-gray-100 hover:border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'online' ? 'border-blue-500' : 'border-gray-300'}`}>
                  {paymentMethod === 'online' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                </div>
                <span className={`font-bold ${paymentMethod === 'online' ? 'text-blue-900' : 'text-gray-600'}`}>
                  Online Payment
                </span>
                <span className="bg-[#85DF00] text-blue-950 font-black text-[10px] px-2 py-0.5 rounded-md shadow-sm ml-1 animate-pulse">
                  ৳২০ ছাড়!
                </span>
              </div>
            </button>
          </div>
        </section>

        {/* 5. Billing Total & Notes */}
        <section className="bg-gray-50 rounded-xl p-5 shadow-[0_4px_16px_rgba(0,0,0,0.03)] border border-gray-100">
          <h2 className="text-[15px] font-black text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-[#2563EB] rounded-full inline-block"></span>
            Order Summary
          </h2>
          <div className="space-y-3 text-[14px]">
            <div className="flex justify-between text-gray-600 font-medium">
              <span>Subtotal</span>
              <span>৳{totalProductPrice.toLocaleString('en-US')}</span>
            </div>
            <div className="flex justify-between text-gray-600 font-medium">
              <span>Delivery Charge</span>
              <span>৳{deliveryCharge.toLocaleString('en-US')}</span>
            </div>
            <AnimatePresence>
              {discountAmount > 0 && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  exit={{ opacity: 0, height: 0 }}
                  className="flex justify-between text-blue-600 font-bold overflow-hidden"
                >
                  <span>Online Payment Discount</span>
                  <span>-৳{discountAmount.toLocaleString('en-US')}</span>
                </motion.div>
              )}
            </AnimatePresence>
            
          </div>

          <div className="mt-5">
            <label className="block text-[12px] font-bold text-gray-700 mb-1.5">Order Notes (Optional)</label>
            <textarea 
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any specific delivery instructions..." 
              rows={1}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-[13px] focus:bg-white focus:outline-none focus:border-[#2563EB] transition-all resize-none mb-3"
            />
            <div className="bg-yellow-50/50 border border-yellow-200/60 rounded-xl p-3 flex items-start gap-2">
              <span className="text-yellow-600">✨</span>
              <p className="text-[12px] font-bold text-yellow-800 leading-snug pt-0.5">
                সম্পূর্ণ পেমেন্ট অনলাইনে করলে <span className="text-blue-700 font-black">৳২০ ছাড়!</span>
              </p>
            </div>
          </div>
        </section>

      </div>

      {/* 6. Sticky CTA */}
      
      {/* 7. Payment Sub-Modal for Online Payment */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border border-gray-100 flex flex-col pointer-events-auto max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-black text-gray-900">Complete Online Payment</h3>
                <button onClick={() => setShowPaymentModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-500 hover:bg-gray-100">
                  <Trash2 className="w-4 h-4 opacity-0 hidden" />
                  <span className="text-xl leading-none -mt-1">&times;</span>
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                  <p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-1">Total to pay:</p>
                  <p className="text-2xl font-black text-slate-900">৳{finalTotal.toLocaleString('en-US')}</p>
                </div>
                
                <div>
                  <p className="text-sm font-bold text-gray-800 mb-2">1. Send money to any of these numbers:</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-500 uppercase">bKash (Personal)</span>
                        <span className="font-mono font-black text-lg text-pink-600">{adminBkash}</span>
                      </div>
                      <button onClick={() => navigator.clipboard.writeText(adminBkash)} className="px-3 py-1.5 bg-white border border-gray-200 rounded text-xs font-bold shadow-sm active:bg-gray-100">Copy</button>
                    </div>
                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-500 uppercase">Nagad (Personal)</span>
                        <span className="font-mono font-black text-lg text-blue-700">{adminNagad}</span>
                      </div>
                      <button onClick={() => navigator.clipboard.writeText(adminNagad)} className="px-3 py-1.5 bg-white border border-gray-200 rounded text-xs font-bold shadow-sm active:bg-gray-100">Copy</button>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-bold text-gray-800 mb-2">2. Upload Payment Screenshot</p>
                  {isUploadingImage && <p className="text-xs font-bold text-blue-600 mb-2 animate-pulse">Uploading screenshot securely...</p>}
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    {paymentScreenshot ? (
                      <div className="relative w-full h-full p-2">
                         <img onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/f3f4f6/a1a1aa?text=No+Image'; (e.target as HTMLImageElement).onerror = null; }} src={paymentScreenshot} className="w-full h-full object-contain rounded-lg" alt="Screenshot" />
                         <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 rounded-lg transition-opacity">
                            <span className="text-white font-bold text-xs bg-black/60 px-3 py-1.5 rounded-full">Change</span>
                         </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-8 h-8 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                        <p className="text-xs text-gray-500 font-semibold"><span className="font-bold">Click to upload</span> your receipt</p>
                      </div>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={handleScreenshotUpload} />
                  </label>
                </div>

                <button
                  onClick={submitFinalOrder}
                  disabled={isSubmitting || !paymentScreenshot}
                  className={`w-full py-4 rounded-xl text-white font-black text-[16px] tracking-wide uppercase shadow-lg transition-all ${isSubmitting || !paymentScreenshot ? 'bg-gray-400 cursor-not-allowed opacity-70' : 'bg-[#FF6B00] hover:bg-orange-600'}`}
                >
                  {isSubmitting ? 'PROCESSING...' : (!paymentScreenshot ? 'UPLOAD SCREENSHOT FIRST' : 'CONFIRM PAYMENT')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <div className="fixed bottom-0 left-0 right-0 z-[60] pointer-events-none pb-0">

        <div className="fixed bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#F8F9FA] via-[#F8F9FA]/90 to-transparent pointer-events-none z-[9998]" />
        <div className="fixed bottom-0 left-0 w-full z-[9999] bg-white/90 backdrop-blur-xl p-3 md:p-4 pb-[calc(env(safe-area-inset-bottom,16px)+12px)] pointer-events-auto border-t border-gray-200 shadow-[0_-10px_30px_rgba(0,0,0,0.06)]">
          <div className="max-w-xl mx-auto flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-700">Total Payable</span>
              <span className="text-[20px] font-black text-slate-900">
                ৳{finalTotal.toLocaleString('en-US')}
              </span>
            </div>
            <motion.button
              animate={{ y: [0, -3, 0], scale: [1, 1.02, 1], boxShadow: ["0px 10px 15px -3px rgba(37, 99, 235, 0.2)", "0px 15px 25px -5px rgba(37, 99, 235, 0.4)", "0px 10px 15px -3px rgba(37, 99, 235, 0.2)"] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={handlePlaceOrder}
              disabled={isSubmitting}
              style={{ willChange: "transform" }}
              className={`relative w-full h-[54px] rounded-xl text-white font-black text-[16px] tracking-wide uppercase shadow-lg overflow-hidden cursor-pointer ${
                isSubmitting ? 'bg-[#FF8C00]/70 cursor-not-allowed' : 'bg-[#FF6B00] hover:bg-orange-600 hover:shadow-xl'
              }`}
            >
              {/* Sleek horizontal shimmer/shine effect */}
              <motion.div
                animate={{ x: ["-100%", "200%"] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut", repeatDelay: 1 }}
                className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 pointer-events-none"
                style={{ willChange: "transform" }}
              />
              
              <div className="relative flex items-center justify-center gap-2 w-full h-full">
                {isSubmitting ? (
                  'PROCESSING...'
                ) : (
                  <>
                    <Zap className="w-5 h-5 fill-current" />
                    PLACE ORDER
                  </>
                )}
              </div>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};
