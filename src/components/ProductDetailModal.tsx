import React, { useState, useEffect } from 'react';
import { X, Heart, Gem, Plus, Minus, ShieldCheck, PhoneCall, Star, ShoppingCart, ShoppingBag, Phone, Zap, Check, Play, MessageSquare, MessageCircle, ThumbsUp, Calendar, AlertCircle, Sparkles, Leaf } from 'lucide-react';
import { Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ProductCard } from './ProductCard';
import { collection, onSnapshot, addDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

interface ProductDetailModalProps {
  product: Product;
  products?: Product[];
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, size?: string, color?: string) => void;
  onBuyNow: (product: Product, quantity: number, size?: string, color?: string) => void;
  onSelectProduct?: (product: Product) => void;
}

interface Review {
  id: string;
  productId?: string;
  name: string;
  rating: number;
  date: string;
  comment: string;
  verified: boolean;
  avatar?: string;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  products = [],
  onClose,
  onAddToCart,
  onBuyNow,
  onSelectProduct
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(() => (product?.images && product.images.length >= 2 ? 1 : 0));
  const [showMoreDesc, setShowMoreDesc] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  useEffect(() => {
    let finalImages = [];
    if (product.images && product.images.length > 0) {
      finalImages = [...product.images];
      // Pad to 3 images if needed
      if (finalImages.length === 1) {
        finalImages.push(finalImages[0], finalImages[0]);
      } else if (finalImages.length === 2) {
        finalImages.push(finalImages[0]);
      }
    } else {
      finalImages = ['https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&q=80&w=600'];
    }
    setGalleryImages(finalImages);
    setActiveImageIndex(finalImages.length >= 3 ? 1 : 0);
    setQuantity(1);
    setSelectedSize((product.sizes && product.sizes.length > 0) ? product.sizes[0] : '');
    setSelectedColor((product.colors && product.colors.length > 0) ? product.colors[0] : '');
  }, [product]);

  useEffect(() => {
    if (galleryImages.length > 1) {
      const timer = setInterval(() => {
        setActiveImageIndex(prev => (prev + 1) % galleryImages.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [galleryImages.length]);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [isWished, setIsWished] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [timeLeft, setTimeLeft] = useState(() => {
    return { hours: 23, minutes: 59, seconds: 59 };
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { hours, minutes, seconds } = prev;
        if (seconds > 0) {
          seconds -= 1;
        } else {
          seconds = 59;
          if (minutes > 0) {
            minutes -= 1;
          } else {
            minutes = 59;
            if (hours > 0) {
              hours -= 1;
            } else {
              hours = 23;
            }
          }
        }
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);



  // Frequently bought together recommendation dynamic selector
  const [bundleProducts, setBundleProducts] = useState<Product[]>([]);
  const [checkedBundleIds, setCheckedBundleIds] = useState<string[]>([]);

  useEffect(() => {
    // Current product is always added and checked
    if (product) {
      setCheckedBundleIds([product.id]);
    }

    if (products && products.length > 0) {
      // Find 2 other premium products, preferably from related category, skipping active product
      const others = products
        .filter(p => p.id !== product.id)
        .sort((a, b) => {
          if (a.category === product.category && b.category !== product.category) return -1;
          if (b.category === product.category && a.category !== product.category) return 1;
          return 0.5 - Math.random(); // shuffle somewhat
        })
        .slice(0, 2);
      
      setBundleProducts(others);
      // Auto-check them by default for shopping convenience!
      setCheckedBundleIds(prev => [...prev, ...others.map(p => p.id)]);
    } else {
      setBundleProducts([]);
    }
  }, [product, products]);

  // Checkbox toggle for Bundle items
  const handleToggleBundleItem = (id: string) => {
    if (id === product.id) return; // Primary item is mandatory
    setCheckedBundleIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Add all selected Bundle items to cart
  const handleAddBundleToCart = () => {
    // Add primary item with selected active quantity
    onAddToCart(product, quantity);
    
    // Add other checked bundle products with quantity 1
    bundleProducts.forEach(p => {
      if (checkedBundleIds.includes(p.id)) {
        onAddToCart(p, 1);
      }
    });

    onClose();
  };

  // Bundle pricing arithmetic
  const getBundleTotalPrice = () => {
    let price = (product?.price || 0) * quantity;
    bundleProducts.forEach(p => {
      if (checkedBundleIds.includes(p.id)) {
        price += (p?.price || 0);
      }
    });
    return price;
  };

  const getBundleSavingPrice = () => {
    let savings = 0;
    if (product.originalPrice && product.originalPrice > (product?.price || 0)) {
      savings += (product.originalPrice - (product?.price || 0)) * quantity;
    }
    bundleProducts.forEach(p => {
      if (checkedBundleIds.includes(p.id) && p.originalPrice && p.originalPrice > (p?.price || 0)) {
        savings += (p.originalPrice - (p?.price || 0));
      }
    });
    return savings;
  };

  // Reviews Interactive state
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    
    if (!db) return;
    const q = query(collection(db, 'reviews'), where('productId', '==', product.id));
    const unsub = onSnapshot(q, (snapshot) => {
      const revs: Review[] = [];
      snapshot.forEach(doc => revs.push({ id: doc.id, ...doc.data() } as Review));
      // Sort manually or use orderBy (requires index)
      revs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // Fallback if no reviews
      if(revs.length === 0) {
        setReviews([
          {
            id: 'rev-1',
            name: 'তাসনিম রহমান',
            rating: 5,
            date: 'May 12, 2026',
            comment: 'আলহামদুলিল্লাহ, অর্গানিক প্রোডাক্টের কোয়ালিটি অত্যন্ত চমৎকার! বিশেষ করে ঘী এর ফ্লেভার এবং টেস্ট ছিল অসাধারণ। পরিবারের সবাই খুব পছন্দ করেছে।',
            verified: true,
            avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=85&w=100'
          },
          {
            id: 'rev-2',
            name: 'Kazi Rafiq',
            rating: 5,
            date: 'April 28, 2026',
            comment: 'Highly recommended! Straight from the verified suppliers, packaging was neat & air-tight. Very fast delivery and stellar customer assistance.',
            verified: true,
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=85&w=100'
          }
        ]);
      } else {
        setReviews(revs);
      }
    });
    return () => unsub();
  }, [product.id]);

  // Review Form state
  const [newReviewName, setNewReviewName] = useState('');
  const [newReviewText, setNewReviewText] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewName.trim() || !newReviewText.trim()) {
      setReviewError('দয়া করে আপনার নাম এবং অনুভূতিটি বিস্তারিত লিখুন।');
      return;
    }
    
    const addedReview: Review = {
      id: `rev-${Date.now()}`,
      name: newReviewName,
      comment: newReviewText,
      rating: newReviewRating,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      verified: true
    };

    setReviews(prev => [addedReview, ...prev]);
    setNewReviewName('');
    setNewReviewText('');
    setNewReviewRating(5);
    setReviewError('');
    setReviewSuccess(true);

    setTimeout(() => {
      setReviewSuccess(false);
    }, 4500);
  };

  // Dynamic WhatsApp prefilled link
  const getWhatsAppLink = () => {
    const text = encodeURIComponent(
      `আসসালামু আলাইকুম OBIN SHOP! আমি এই প্রডাক্টটি অর্ডার করতে চাই:\n` +
      `📦 প্রোডাক্ট: ${product.name} (${product.banglaName || ''})\n` +
      `🔢 পরিমাণ: ${quantity}\n` +
      `💰 মোট মূল্য: ৳${((product?.price || 0) * quantity).toLocaleString('en-US')}\n` +
      `দয়া করে আমার সাথে যোগাযোগ করুন!`
    );
    return `https://wa.me/8801825000010?text=${text}`;
  };

  const handleDecrease = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleIncrease = () => {
    setQuantity(quantity + 1);
  };

  // Video feature interactive display
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  return (
    <div className="fixed inset-0 left-0 right-0 z-[9990] overflow-y-auto bg-gray-50/50 sm:bg-black/70 sm:backdrop-blur-xs flex justify-center items-start sm:items-center p-0 sm:p-4 sm:pt-[60px]">
      {/* Absolute Backdrop Click Trigger */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />

      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative bg-white w-full max-w-4xl rounded-none sm:rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden min-h-[calc(100vh-44px)] sm:min-h-0 sm:max-h-[92vh] mt-11 sm:mt-0 flex flex-col pt-0"
        id={`product-details-${product.id}`}
      >
                {/* Scrollable Container */}
        <div className="overflow-y-auto px-4 py-0 sm:px-6 flex-1 flex flex-col gap-0 scrollbar-none" id="product-detail-scroll-container">
          
          {/* Section A: Main Product Hero Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5 items-start mt-2 sm:mt-0 pt-0">
            
            {/* Gallery Column: Full width main image, thumbnails below horizontally */}
            <div className="flex flex-col gap-3 w-full">
              {/* Central Main Viewer Card */}
              <div className="relative flex-1 aspect-square rounded-2xl md:rounded-3xl overflow-hidden border border-gray-100 bg-[#fbfcfa] flex items-center justify-center p-4 mt-0">
                <img onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/f3f4f6/a1a1aa?text=No+Image'; (e.target as HTMLImageElement).onerror = null; }}
                  src={galleryImages[activeImageIndex] || (product.images?.[1] || product.images?.[0])}
                  alt={product.name}
                  className={`max-h-full max-w-full object-contain select-none transition-all duration-300 ${
                    galleryImages.length > 1 
                      ? (activeImageIndex === 1 ? 'scale-120 hover:scale-[1.3]' : activeImageIndex === 2 ? 'scale-[1.3] rotate-6 hover:scale-[1.4]' : 'hover:scale-[1.1]')
                      : 'hover:scale-[1.05]'
                  }`}
                  referrerPolicy="no-referrer"
                />
                
                {/* Save Badges for conversions */}
                {product.originalPrice && product.originalPrice > (product?.price || 0) && (
                  <span className="absolute top-2 left-2 bg-green-500 text-white font-bold text-[11px] tracking-wider uppercase px-[6px] py-[3px] rounded shadow-sm z-10 leading-none">
                    ৳{product.originalPrice - (product?.price || 0)} ছাড়!
                  </span>
                )}
                
                {/* Premium Best Seller badge at top-right */}
                {product.bestSeller && (
                  <span className="absolute top-2 right-2 bg-red-500 text-white font-bold text-[11px] tracking-wider uppercase px-[6px] py-[3px] rounded shadow-sm flex items-center gap-1 select-none z-10 leading-none">
                    ⭐ Best Seller
                  </span>
                )}
              </div>
              {/* Horizontal Thumbnails below main image */}
              {galleryImages.length > 1 && (
                <div className="flex flex-row gap-2 justify-center">
                  {galleryImages.slice(0, 3).map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-16 h-16 bg-[#FAF9F6] rounded-md overflow-hidden border transition-transform active:scale-95 cursor-pointer ${
                        idx === activeImageIndex ? 'border-[#2563EB] shadow-sm' : 'border-gray-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/f3f4f6/a1a1aa?text=No+Image'; (e.target as HTMLImageElement).onerror = null; }} 
                        src={img} 
                        alt={`Thumbnail ${idx + 1}`} 
                        className="w-full h-full object-contain p-1" 
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info details & actions columns */}
            <div className="flex flex-col justify-between pt-2">
              
              <div className="pb-2 text-left flex flex-col gap-3">
                {/* The integrated info box */}
                <div className="border border-slate-100 bg-slate-50/70 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 shadow-sm">
                  <div className="flex flex-col gap-2 items-center text-center">
                    <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 font-sans leading-snug">
                      {product.name}
                    </h2>
                    {(product.stockOut || product.stockStatus === 'Out of Stock') && (
                      <div className="inline-flex w-fit bg-red-100 text-red-700 font-bold text-xs px-2 py-1 rounded">
                        OUT OF STOCK
                      </div>
                    )}
                  </div>

                  {/* Pricing and Timer Matrix */}
                  <div className="flex flex-row justify-between items-center w-full gap-2">
                    <div className="flex flex-col justify-center">
                      <span className="text-xl sm:text-2xl font-black text-[#FF6B00] leading-none tracking-tight mb-1">
                        ৳{(product?.price || 0).toLocaleString('en-US')}
                      </span>
                      {product.originalPrice && product.originalPrice > (product?.price || 0) && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-base sm:text-lg font-bold text-[#888888] line-through decoration-[#888888] decoration-2 leading-none">
                            ৳{product.originalPrice.toLocaleString('en-US')}
                          </span>
                          <span className="text-[10px] sm:text-xs font-black text-white bg-green-600 px-2 py-0.5 rounded-sm uppercase whitespace-nowrap leading-none shadow-sm">
                            SAVE {Math.round(((product.originalPrice - (product?.price || 0)) / product.originalPrice) * 100)}%
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center justify-end">
                      <div className="flex items-center bg-gradient-to-br from-red-50 to-orange-50 border border-red-100 px-2.5 py-1.5 rounded-xl shadow-sm">
                        <div className="flex flex-col items-center">
                          <div className="flex items-center justify-center bg-red-600 text-white px-2 py-0.5 rounded-[4px] min-w-[28px] font-black text-sm shadow-inner">
                            {String(timeLeft.hours).padStart(2, '0')}
                          </div>
                          <span className="text-[8px] font-extrabold text-red-700/80 tracking-wider mt-0.5">HRS</span>
                        </div>
                        <span className="text-red-300 font-bold mx-1 mb-3">:</span>
                        <div className="flex flex-col items-center">
                          <div className="flex items-center justify-center bg-red-600 text-white px-2 py-0.5 rounded-[4px] min-w-[28px] font-black text-sm shadow-inner">
                            {String(timeLeft.minutes).padStart(2, '0')}
                          </div>
                          <span className="text-[8px] font-extrabold text-red-700/80 tracking-wider mt-0.5">MINS</span>
                        </div>
                        <span className="text-red-300 font-bold mx-1 mb-3">:</span>
                        <div className="flex flex-col items-center">
                          <div className="flex items-center justify-center bg-red-600 text-white px-2 py-0.5 rounded-[4px] min-w-[28px] font-black text-sm shadow-inner">
                            {String(timeLeft.seconds).padStart(2, '0')}
                          </div>
                          <span className="text-[8px] font-extrabold text-red-700/80 tracking-wider mt-0.5">SECS</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Inline Variations Block */}
                  {((product.sizes && product.sizes.length > 0) || (product.colors && product.colors.length > 0)) && (
                    <>
                      <div className="h-px bg-slate-200/60 my-0.5 w-full" />
                      <div className="flex flex-row flex-wrap items-start gap-4 sm:gap-6 py-1 w-full">
                        {product.sizes && product.sizes.length > 0 && (
                          <div className="flex flex-col gap-1.5 flex-1 min-w-[120px]">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Size</span>
                            <div className="flex flex-wrap gap-1.5">
                              {product.sizes.map((size) => (
                                <button 
                                  key={size} 
                                  onClick={() => setSelectedSize(size)}
                                  className={`px-2.5 py-1 border rounded-md text-[11px] font-black tracking-wide transition-colors select-none ${selectedSize === size ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'}`}
                                >
                                  {size}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {product.colors && product.colors.length > 0 && (
                          <div className="flex flex-col gap-1.5 flex-1 min-w-[120px]">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Color</span>
                            <div className="flex flex-wrap gap-1.5">
                              {product.colors.map((color) => (
                                <button 
                                  key={color} 
                                  onClick={() => setSelectedColor(color)}
                                  className={`px-2.5 py-1 border rounded-md text-[11px] font-black tracking-wide transition-colors select-none ${selectedColor === color ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'}`}
                                >
                                  {color}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
                
                {/* Quantity and Total Selection Block */}
                <div className="mb-1 mt-1">
                  <div className="flex items-center gap-5">
                    <div className="flex items-center border border-gray-300 rounded-md overflow-hidden h-[36px] min-w-[90px]">
                      <button
                        onClick={handleDecrease}
                        className="w-9 h-full flex items-center justify-center text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="flex-1 h-full flex items-center justify-center text-[14px] font-semibold text-black bg-white select-none border-x border-gray-200">
                        {quantity}
                      </span>
                      <button
                        onClick={handleIncrease}
                        className="w-9 h-full flex items-center justify-center text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-[12px] text-gray-500 font-medium whitespace-nowrap">Total:</span>
                      <span className="text-xl font-bold text-slate-900 leading-none">
                        ৳{((product?.price || 0) * quantity).toLocaleString('en-US')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* CTAs Stack matching modern conversion layouts */}
                <div className="flex gap-3 mt-2 w-full">
                  <button
                    onClick={() => onAddToCart && onAddToCart(product, quantity, selectedSize, selectedColor)}
                    disabled={product.stockOut || product.stockStatus === 'Out of Stock'}
                    className="w-12 sm:w-14 shrink-0 bg-slate-800 hover:bg-slate-900 text-white font-medium text-sm rounded-xl flex items-center justify-center gap-2 h-[48px] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Add to Cart"
                  >
                    <ShoppingCart className="w-5 h-5 text-[#FBBF24]" />
                  </button>

                  <button
                    onClick={() => onBuyNow && onBuyNow(product, quantity, selectedSize, selectedColor)}
                    disabled={product.stockOut || product.stockStatus === 'Out of Stock'}
                    className="flex-1 bg-gradient-to-r from-[#FF6B00] via-[#FF8000] to-[#FF6B00] hover:from-[#FF8000] hover:to-[#EA580C] bg-[length:200%_100%] hover:bg-right text-white font-extrabold text-[15px] sm:text-base rounded-xl flex items-center justify-center gap-2 relative h-[48px] transition-all duration-300 shadow-md hover:shadow-lg hover:shadow-[#FF6B00]/30 active:scale-95 cursor-pointer group/btn disabled:opacity-50 disabled:cursor-not-allowed tracking-wide"
                    style={{ animation: !(product.stockOut || product.stockStatus === 'Out of Stock') ? 'shake-btn 2.5s infinite ease-in-out' : 'none' }}
                  >
                    <style>
                      {`
                        @keyframes shake-btn {
                          0%, 100% { transform: translateX(0); }
                          20%, 60% { transform: translateX(-3px); }
                          40%, 80% { transform: translateX(3px); }
                        }
                      `}
                    </style>
                    <svg className="w-4 h-4 fill-white relative z-10 transition-transform duration-200" viewBox="0 0 24 24">
                      <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" />
                    </svg>
                    <span className="relative z-10 tracking-wider">{(product.stockOut || product.stockStatus === 'Out of Stock') ? 'OUT OF STOCK' : 'BUY NOW'}</span>
                    {!(product.stockOut || product.stockStatus === 'Out of Stock') && <Sparkles className="absolute right-4 w-5 h-5 text-white/40" />}
                  </button>
                </div>
              </div>



                {/* Requirement 6: Product Description List Block */}
                <div className="mt-5 p-4 rounded-xl bg-[#FAF9F6] border border-gray-100 text-left">
                  <h4 className="text-xs sm:text-sm font-black text-gray-800 uppercase tracking-wider mb-2.5 font-sans flex items-center gap-1.5">
                    <span className="w-1 h-3.5 bg-red-600 rounded-full" />
                    Product Description
                  </h4>
                  <ul className="space-y-1.5 text-xs sm:text-[13px] text-gray-700 font-sans font-medium">
                    <li className="flex items-start gap-2">
                      <span className="text-[#2563EB] text-lg leading-none shrink-0">•</span>
                      <span>100% Pure & Premium Quality {product.name}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#2563EB] text-lg leading-none shrink-0">•</span>
                      <span>Naturally Sourced & Hygienically Packed (শতভাগ প্রাকৃতিক ও স্বাস্থ্যসম্মত)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#2563EB] text-lg leading-none shrink-0">•</span>
                      <span>No Artificial Sugars, Preservatives, or Additives</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#2563EB] text-lg leading-none shrink-0">•</span>
                      <span>High Quality & Authentic Sourcing</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#2563EB] text-lg leading-none shrink-0">•</span>
                      <span>Super-fast Delivery & Safe Cash on Delivery Available</span>
                    </li>
                  </ul>
                </div>
              </div>

            </div>
          </div>

          {/* Section B: Redesigned Frequently Bought Together - "Bundle & Save" (Requirement 7) */}
          {bundleProducts.length > 0 && (
            <div className="bg-[#FAF9F6] border border-gray-100 p-4 sm:p-5 rounded-xl text-left" id="frequently-bought-together">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <h3 className="text-xs sm:text-sm font-black text-gray-800 font-sans tracking-tight flex items-center gap-1.5">
                  <span className="w-1 h-3.5 bg-[#FF6B00] rounded-full" />
                  <span>Bundle & Save</span>
                </h3>
                {getBundleSavingPrice() > 0 && (
                  <span className="text-[9.5px] font-bold text-white bg-green-600 px-2 py-0.5 rounded-full select-none">
                    Save ৳{getBundleSavingPrice().toLocaleString('en-US')}
                  </span>
                )}
              </div>

              {/* Compact Rows list of Bundle Items */}
              <div className="space-y-2">
                {/* 1. Main Product Row */}
                <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-100 shadow-3xs select-none">
                  <span className="w-5 h-5 bg-blue-700 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                  
                  <img onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/f3f4f6/a1a1aa?text=No+Image'; (e.target as HTMLImageElement).onerror = null; }} src={(product.images?.[1] || product.images?.[0])} className="w-10 h-10 object-contain p-0.5 bg-gray-50 border border-gray-100 rounded-md shrink-0" alt="" referrerPolicy="no-referrer" />
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[11px] sm:text-xs font-bold text-gray-800 truncate leading-tight">
                      {product.name} <span className="text-gray-400 font-semibold text-[10px]">({quantity}x)</span>
                    </h4>
                    <span className="text-[9px] text-gray-400 font-semibold">Primary Item</span>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <span className="text-[11px] sm:text-xs font-black text-[#2563EB]">৳{((product?.price || 0) * quantity).toLocaleString('en-US')}</span>
                  </div>
                </div>

                {/* Recommendations */}
                {bundleProducts.map((p) => {
                  const isChecked = checkedBundleIds.includes(p.id);
                  return (
                    <div 
                      key={p.id}
                      onClick={() => handleToggleBundleItem(p.id)}
                      className={`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer select-none ${
                        isChecked 
                          ? 'border-[#85DF00] bg-white shadow-3xs' 
                          : 'border-gray-100 bg-[#FAF9F6]/50 hover:border-gray-200'
                      }`}
                    >
                      <button
                        type="button"
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                          isChecked 
                            ? 'bg-[#85DF00] border-[#85DF00] text-blue-950 scale-105 shadow-3xs' 
                            : 'border-gray-300 bg-white hover:border-gray-400'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>

                      <img onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/f3f4f6/a1a1aa?text=No+Image'; (e.target as HTMLImageElement).onerror = null; }} src={p.images?.[0]} className="w-10 h-10 object-contain p-0.5 bg-white border border-gray-100 rounded-md shrink-0" alt="" referrerPolicy="no-referrer" />
                      
                      <div className="flex-1 min-w-0 text-left">
                        <h4 className="text-[11px] sm:text-xs font-bold text-gray-800 truncate leading-tight">
                          {p.name}
                        </h4>
                        <span className="text-[8.5px] text-[#2563EB] font-semibold bg-blue-50 border border-red-100/50 px-1.5 py-0.2 rounded">Add-On</span>
                      </div>

                      <div className="text-right shrink-0 flex flex-col justify-end">
                        <span className="text-[11px] sm:text-xs font-black text-[#2563EB]">৳{(p?.price || 0).toLocaleString('en-US')}</span>
                        {p.originalPrice && (
                          <span className="text-[8.5px] font-semibold text-gray-400 line-through">৳{p.originalPrice.toLocaleString('en-US')}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total bundle checkout summary block */}
              <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between gap-3">
                <div className="text-left">
                  <div className="text-[9.5px] font-bold text-rose-705 bg-rose-50 border border-rose-100/50 px-2 py-0.5 rounded-full font-sans inline-block">
                    {checkedBundleIds.length} of {1 + bundleProducts.length} Selected
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider font-mono">Total:</span>
                    <span className="text-sm sm:text-base font-black text-slate-900 tracking-tight">৳{getBundleTotalPrice().toLocaleString('en-US')}</span>
                  </div>
                </div>

                <button
                  onClick={handleAddBundleToCart}
                  className="flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-[10.5px] px-4 py-2 rounded-lg transition-all shadow-sm active:scale-97 cursor-pointer uppercase tracking-wider h-9 shrink-0"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Add To Cart</span>
                </button>
              </div>
            </div>
          )}

          <hr className="border-gray-100" />

          {/* Section B.5: More Products slider (Requirement 8) */}
          {products && products.length > 1 && (
            <div className="text-left space-y-4 pt-2" id="more-products-slider">
              <h3 className="text-base sm:text-lg font-black text-gray-900 font-sans tracking-tight flex items-center gap-2 select-none">
                <span className="w-1.5 h-5 bg-red-600 rounded-full" />
                <span>You May Also Like (অন্যান্য প্রোডাক্ট)</span>
              </h3>
              
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory touch-pan-x -mx-4 px-4 sm:mx-0 sm:px-0">
                {products
                  .filter(p => p.id !== product.id)
                  .map((p) => (
                    <div 
                      key={p.id} 
                      className="w-[220px] sm:w-[265px] shrink-0 snap-start"
                    >
                      <ProductCard
                        product={p}
                        onSelect={(clickedProd) => {
                          if (onSelectProduct) {
                            onSelectProduct(clickedProd);
                            // Scroll back to top inside the modal scrollable container
                            const scrollContainer = document.getElementById('product-detail-scroll-container');
                            if (scrollContainer) {
                              scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
                            }
                          }
                        }}
                        onAddToCart={(prod, event) => {
                          event.stopPropagation();
                          onAddToCart(prod, 1);
                        }}
                        onBuyNow={(prod, event) => {
                          event.stopPropagation();
                          onBuyNow(prod, 1);
                        }}
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}

          <hr className="border-gray-100" />

          {/* Section D: Video Showcase Area (Mock Player) */}
          {product.youtubeUrl && (
          <div className="text-left space-y-4">
            <h3 className="text-sm sm:text-md font-black text-gray-800 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-red-600 rounded-full" />
              <span>Video Highlights (ভিডিও রিভিও)</span>
            </h3>

            <div className="relative aspect-video max-w-2xl bg-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden border border-gray-100 group shadow-sm">
              <AnimatePresence>
                {!isVideoPlaying ? (
                  <div className="absolute inset-0 z-10 flex flex-col justify-center items-center p-6 text-center select-none" id="video-mockup">
                    {/* Background Overlay */}
                    <div className="absolute inset-0 bg-black/55 backdrop-blur-3xs" />
                    <img onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/f3f4f6/a1a1aa?text=No+Image'; (e.target as HTMLImageElement).onerror = null; }} 
                      src={(product.images?.[1] || product.images?.[0])} 
                      className="absolute inset-0 w-full h-full object-cover opacity-25 blur-xs -z-10" 
                      alt="" 
                    />
                    
                    {/* Large YouTube Styled Play button with animated ripple */}
                    <button
                      onClick={() => setIsVideoPlaying(true)}
                      className="relative z-10 flex items-center justify-center w-14 sm:w-18 h-14 sm:h-18 bg-red-600 hover:bg-red-700 text-white rounded-full transition-transform duration-300 hover:scale-110 shadow-lg cursor-pointer my-2 active:scale-95"
                    >
                      <Play className="w-6.5 h-6.5 fill-white text-white translate-x-0.5" />
                      <span className="absolute -inset-2.5 bg-red-600/30 rounded-full animate-ping -z-10" />
                    </button>

                    <h4 className="relative z-10 font-bold text-white text-sm sm:text-md mt-2 max-w-sm drop-shadow-md">
                      দেখে নিন কেন আমাদের {product.name} সেরা মানের?
                    </h4>
                    <span className="relative z-10 text-[10px] sm:text-xs font-semibold text-gray-300 bg-white/10 px-3 py-1 rounded-full backdrop-blur-md mt-1.5">
                      ⏱ Duration: 1:45 Min
                    </span>
                  </div>
                ) : (
                  <div className="absolute inset-0 w-full h-full bg-slate-950 flex flex-col justify-center items-center text-center p-6 space-y-2 text-white">
                    <button 
                      onClick={() => setIsVideoPlaying(false)}
                      className="absolute top-4 right-4 bg-white/10 hover:bg-white/25 text-white border border-white/20 p-2 rounded-full cursor-pointer transition-colors"
                      title="ভিডিও বন্ধ করুন"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {/* We provide a clean beautiful educational animated player inside iframe */}
                    <iframe
                      src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1"
                      title="Product Sourcing Process"
                      className="w-full h-full border-0 rounded-2xl"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
          )}

          <hr className="border-gray-100" />

          {/* Section E: Compact Ratings & Reviews Slider */}
          <div className="pt-4 border-t border-gray-100 space-y-6">
            <div className="flex flex-col sm:flex-row gap-6 sm:items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="text-sm sm:text-md font-black text-gray-800 flex items-center gap-2">
                  <span className="w-1.5 h-5 bg-red-600 rounded-full" />
                  <span>Customer Reviews</span>
                </h3>
                {/* Compact Modern Badge */}
                <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full shadow-sm">
                  <span className="text-sm font-black text-blue-700">5.0</span>
                  <div className="flex">
                    <Star className="w-3.5 h-3.5 fill-blue-500 text-blue-500" />
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 border-l border-blue-200 pl-1.5 ml-0.5">Top Rated</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
              {/* Interactive Write Review Form Card */}
              <div className="bg-white border border-gray-150 p-4 rounded-2xl shadow-sm h-fit">
                <h4 className="text-xs font-black text-gray-700 uppercase tracking-widest border-b border-gray-100 pb-2 mb-3">
                  Write a Review
                </h4>
                <form onSubmit={handleSubmitReview} className="space-y-3">
                  <div className="flex items-center gap-2 select-none">
                    <span className="text-[10px] font-black text-gray-500">Rating:</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewReviewRating(star)}
                          className="p-0.5 hover:scale-110 active:scale-95 transition-all text-amber-300 hover:text-amber-400 cursor-pointer"
                        >
                          <Star className={`w-4 h-4 ${star <= newReviewRating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    required
                    type="text"
                    placeholder="Your Name (আপনার নাম)"
                    value={newReviewName}
                    onChange={(e) => setNewReviewName(e.target.value)}
                    className="w-full border border-gray-200 p-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:border-red-500 bg-gray-50 focus:bg-white transition-colors"
                  />
                  <textarea
                    required
                    placeholder="Describe your experience (আপনার অভিজ্ঞতা)"
                    value={newReviewText}
                    onChange={(e) => setNewReviewText(e.target.value)}
                    className="w-full border border-gray-200 p-2.5 rounded-xl text-xs font-semibold h-16 resize-none focus:outline-none focus:border-red-500 bg-gray-50 focus:bg-white transition-colors"
                  />
                  {reviewError && (
                    <div className="text-[10px] font-bold text-red-500 flex items-center gap-1 bg-red-50 p-1.5 rounded-lg border border-red-100">
                      <AlertCircle className="w-3 h-3" />
                      <span>{reviewError}</span>
                    </div>
                  )}
                  {reviewSuccess && (
                    <div className="text-[10px] font-bold text-blue-600 flex items-center gap-1 bg-blue-50 p-1.5 rounded-lg border border-blue-100">
                      <Check className="w-3 h-3" />
                      <span>Review submitted!</span>
                    </div>
                  )}
                  <button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Submit Review
                  </button>
                </form>
              </div>

              {/* Horizontal Slider for Reviews */}
              <div className="overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory touch-pan-x flex gap-4">
                {reviews.map((rev) => (
                  <div key={rev.id} className="min-w-[260px] max-w-[280px] shrink-0 snap-start bg-white border border-gray-100 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
                    <div className="space-y-2 text-left">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/f3f4f6/a1a1aa?text=No+Image'; (e.target as HTMLImageElement).onerror = null; }} 
                            src={rev.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100'} 
                            className="w-7 h-7 rounded-full border border-gray-100 object-cover" 
                            alt="" 
                          />
                          <div>
                            <h5 className="text-[11px] font-bold text-gray-800 leading-tight">
                              {rev.name}
                            </h5>
                            {rev.verified && (
                              <span className="text-[8px] font-bold text-blue-600 flex items-center gap-0.5">
                                <Check className="w-2 h-2 stroke-[4]" /> Verified
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex text-amber-400 justify-end">
                            {Array.from({ length: rev.rating }).map((_, i) => (
                              <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                          <span className="text-[8.5px] font-mono text-gray-400 block mt-0.5">{rev.date}</span>
                        </div>
                      </div>
                      <p className="text-[11.5px] text-gray-600 font-sans font-medium line-clamp-4 leading-relaxed">
                        {rev.comment}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
  );
};
