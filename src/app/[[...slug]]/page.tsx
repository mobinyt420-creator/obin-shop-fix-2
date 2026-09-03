"use client";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Header } from '../../components/Header';
import { PromoSlider } from '../../components/PromoSlider';
import { Categories } from '../../components/Categories';
import { ProductCard } from '../../components/ProductCard';
import { ProductDetailModal } from '../../components/ProductDetailModal';
import { CheckoutView } from '../../components/CheckoutView';
import { CartDrawer } from '../../components/CartDrawer';
import { SidebarMenu } from '../../components/SidebarMenu';
import { SearchModal } from '../../components/SearchModal';
const AdminDashboard = React.lazy(() => import('../../components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
import { collection, addDoc, query, where, getDocs, onSnapshot, doc, updateDoc, increment, setDoc, getDoc } from 'firebase/firestore';

// Universal Retry Wrapper
const withRetry = async (fn, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(res => setTimeout(res, delay));
    }
  }
};

import { db, auth, storage, GOOGLE_SHEETS_WEBHOOK_URL, SECRET_ADMIN_EMAIL } from '../../firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, onAuthStateChanged } from 'firebase/auth';
import { CartItem, Product, Order, Slide, Category } from '../../types';
import { PRODUCTS, CATEGORIES as MOCK_CATEGORIES } from '../../data/products';
import { motion, AnimatePresence } from 'motion/react';
import { usePathname, useRouter } from 'next/navigation';
import { 
  ShoppingBag, ShoppingCart, Trash2, X, Plus, Minus, Search, Grid, Tag, 
  MapPin, User, ChevronDown, ChevronUp, LogOut, CheckCircle2, Phone, Sparkles, SlidersHorizontal, Home, Menu, Headphones,
  Lock, Mail, MessageCircle, Send, LayoutDashboard, Wallet, Bell, CreditCard, Settings, Moon, Sun, ChevronRight, Package, ArrowLeft
} from 'lucide-react';

export default function App() {
  
  const [slides, setSlides] = useState<Slide[]>([]);

  
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [supportNumber, setSupportNumber] = useState('01825000010');
  const [supportEmail, setSupportEmail] = useState('support@obinshop.com');
  const [helplineNumber, setHelplineNumber] = useState('01825000010');

  useEffect(() => {
    
    if (!db) return;
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.supportNumber) setSupportNumber(data.supportNumber);
        if (data.supportEmail) setSupportEmail(data.supportEmail);
        if (data.helplineNumber) setHelplineNumber(data.helplineNumber);
      }
    });
    return () => unsub();
  }, []);

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  useEffect(() => {
    // Load categories, banners, and products from cache on client mount
    try {
      const cached = localStorage.getItem('cached_products');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProducts(parsed);
          setProductsLoading(false);
        }
      }
      const cachedCats = localStorage.getItem('cached_categories');
      if (cachedCats) setCategories(JSON.parse(cachedCats));
      const cachedBanners = localStorage.getItem('cached_banners');
      if (cachedBanners) setSlides(JSON.parse(cachedBanners));
    } catch(e) {}

    if (!db) {
      setProducts(PRODUCTS);
      setCategories(MOCK_CATEGORIES);
      setSlides([{
        id: '1',
        title: 'Welcome to OBIN SHOP',
        subtitle: 'The best products at the best prices',
        image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=2000',
        categoryId: 'all',
        buttonText: 'Shop Now'
      }]);
      setProductsLoading(false);
      return;
    }
    
    // Check if we are opening a specific product deep link
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    let initialProductId: string | null = null;
    if (path.startsWith('/product/')) {
      initialProductId = path.replace('/product/', '');
    }

    if (initialProductId) {
      // Fetch ONLY the required product data immediately to bypass waiting for all products
      getDoc(doc(db, 'products', initialProductId)).then(docSnap => {
        if (docSnap.exists()) {
          const prod = { id: docSnap.id, ...docSnap.data() } as Product;
          setProducts(prev => {
            // Avoid duplicate if the main subscription already added it
            if (prev.find(p => p.id === prod.id)) return prev;
            const updated = [prod, ...prev];
            try {
              localStorage.setItem('cached_products', JSON.stringify(updated));
            } catch(e) {}
            return updated;
          });
          setProductsLoading(false); // Page becomes usable instantly!
        } else {
          setInvalidProduct(true);
          setProductsLoading(false);
        }
      }).catch(err => {
        console.error("Failed to fetch initial product", err);
        setProductsLoading(false);
      });
    }

    const unsubSlides = onSnapshot(
      collection(db, 'banners'),
      (snapshot) => {
        const fetchedSlides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Slide));
        setSlides(fetchedSlides);
        localStorage.setItem('cached_banners', JSON.stringify(fetchedSlides));
      },
      (error) => {
        console.error("Error fetching banners:", error);
      }
    );

    const unsubCategories = onSnapshot(
      collection(db, 'categories'),
      (snapshot) => {
        const fetchedCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
        setCategories(fetchedCategories);
        localStorage.setItem('cached_categories', JSON.stringify(fetchedCategories));
      },
      (error) => {
        console.error("Error fetching categories:", error);
      }
    );

    const unsubProducts = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const fetchedProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setProducts(fetchedProducts);
        setProductsLoading(false);
        try {
          localStorage.setItem('cached_products', JSON.stringify(fetchedProducts));
        } catch (e) {
          console.warn("Could not cache products, likely quota exceeded");
        }
      },
      (error) => {
        console.error("Error fetching products:", error);
        setProductsLoading(false);
      }
    );

    return () => {
      unsubSlides();
      unsubCategories();
      unsubProducts();
    };
  }, []);


  const handleUpdateProducts = (updatedList: Product[]) => {
    setProducts(updatedList);
    };

  const handleUpdateOrders = (updatedOrders: Order[]) => {
    setRecentOrders(updatedOrders);
  };

  // Navigation & Page State
  const [visibleCategoriesCount, setVisibleCategoriesCount] = useState(2);
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});

  const handleShowMore = (section: string, totalCount: number) => {
    setVisibleCounts(prev => {
      const current = prev[section] || 4;
      if (current >= totalCount) {
        return { ...prev, [section]: 4 };
      }
      return { ...prev, [section]: current + 4 };
    });
  };
  const pathname = usePathname() || '/';
  const router = useRouter();

  // Derive active view directly from URL
  const view: 'home' | 'search' | 'checkout' | 'account' | 'admin' | 'category_products' | 'offers' = React.useMemo(() => {
    if (pathname === '/checkout') return 'checkout';
    if (pathname === '/account') return 'account';
    if (pathname === '/admin') return 'admin';
    if (pathname === '/search') return 'search';
    if (pathname === '/offers') return 'offers';
    if (pathname.startsWith('/category/')) return 'category_products';
    return 'home';
  }, [pathname]);

  // Derive selected category directly from URL
  const selectedCategory = React.useMemo(() => {
    if (pathname.startsWith('/category/')) {
      return pathname.replace('/category/', '') || 'all';
    }
    return 'all';
  }, [pathname]);

  const setSelectedCategory = (catId: string) => {
    if (!catId || catId === 'all') {
      router.push('/');
    } else {
      router.push(`/category/${catId}`);
    }
  };

  // Product Detail Modal state & URL handling
  const productIdFromUrl = pathname.startsWith('/product/') ? pathname.replace('/product/', '') : null;
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [invalidProduct, setInvalidProduct] = useState(false);

  // Sync direct URL or deep link navigation to activeProduct
  useEffect(() => {
    if (productIdFromUrl) {
      if (products.length > 0) {
        const found = products.find(p => p.id === productIdFromUrl);
        if (found) {
          setActiveProduct(found);
          setInvalidProduct(false);
        } else if (!productsLoading) {
          setInvalidProduct(true);
        }
      }
    } else {
      setActiveProduct(null);
      setInvalidProduct(false);
    }
  }, [productIdFromUrl, products, productsLoading]);

  const handleCloseProductModal = () => {
    setActiveProduct(null);
    setInvalidProduct(false);
    if (pathname.startsWith('/product/')) {
      if (typeof window !== 'undefined' && window.history.length > 1) {
        router.back();
      } else {
        router.push('/', { scroll: false });
      }
    }
  };

  const setSelectedProduct = (p: Product | null | ((prev: Product | null) => Product | null)) => {
    if (!p) {
      handleCloseProductModal();
    } else if (typeof p === 'object') {
      setActiveProduct(p);
      setInvalidProduct(false);
      router.push(`/product/${p.id}`, { scroll: false });
    }
  };

  const selectedProduct = activeProduct;

  const navigate = (path: string, options?: any) => {
    if (options?.replace) {
      router.replace(path, { scroll: options?.scroll ?? true });
    } else {
      router.push(path, { scroll: options?.scroll ?? true });
    }
  };

  const setView = (v: any) => {
    const target = typeof v === 'function' ? v(view) : v;
    if (target === 'home') router.push('/');
    else if (target === 'category_products') router.push(`/category/${selectedCategory || 'all'}`);
    else router.push(`/${target}`);
  };


  const [searchQuery, setSearchQuery] = useState('');
  const [showSidebarMenu, setShowSidebarMenu] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [adminSidebarOpen, setAdminSidebarOpen] = useState(false);

  // Cart & Orders Management
  const [cart, setCart] = useState<CartItem[]>([]);
  const cartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [lastConfirmedOrder, setLastConfirmedOrder] = useState<Order | null>(null);
  

  // Simple User Information Persistence
  const [activeProfileModal, setActiveProfileModal] = useState<string | null>(null);
  const [darkModeToggle, setDarkModeToggle] = useState(false);
  const [userProfile, setUserProfile] = useState(() => { return {
      name: '',
      phone: '',
      email: '',
      address: ''
    };

  });

  // User Authentication optional states (Requirement 4)
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    if (!auth) return;
    let ordersUnsub: (() => void) | null = null;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsUserLoggedIn(true);
        setUserProfile(prev => ({ ...prev, email: user.email || '' }));
        if (user.email === SECRET_ADMIN_EMAIL) {
          setIsAdmin(true);
          if (view === 'account') {
            setView('admin');
          }
        } else {
          setIsAdmin(false);
          setView(prev => prev === 'admin' ? 'account' : prev);
        }
        
        // Load user's recent orders from Firestore
        
        if (!db) return;
        const q = query(collection(db, 'orders'), where('userId', '==', user.uid));
        if (ordersUnsub) ordersUnsub();
        ordersUnsub = onSnapshot(q, (snap) => {
          const userOrders = snap.docs.map(doc => {
            const data = doc.data();
            return {
              id: data.orderId,
              orderDate: new Date(data.orderDate).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
              items: (data.cartItems || []).map((ci: any) => ({
                product: {
                  id: ci.productId || Math.random().toString(),
                  name: ci.title || 'Unknown Product',
                  price: ci.price || 0,
                  images: ci.image ? [ci.image] : ['https://images.unsplash.com/photo-1542838132-92c53300491e?w=100'],
                  category: ''
                },
                quantity: ci.quantity || 1
              })),
              total: data.totalPayable,
              status: data.status,
              customerDetails: {
                name: data.customerName,
                phone: data.customerPhone,
                address: data.customerAddress
              }
            };
          });
          // Sort by date descending
          userOrders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
          setRecentOrders(userOrders as any);
        });
      } else {
        setIsUserLoggedIn(false);
        setIsAdmin(false);
        setView(prev => prev === 'admin' ? 'home' : prev);
        if (ordersUnsub) {
          ordersUnsub();
          ordersUnsub = null;
        }
      }
    });
    return () => {
      unsubscribe();
      if (ordersUnsub) ordersUnsub();
    };
  }, []);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [registerName, setRegisterName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [showSupportMenu, setShowSupportMenu] = useState(false);
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);
  const [supportChatMsg, setSupportChatMsg] = useState('');
  const [chatSending, setChatSending] = useState(false);

  // Firebase Auth states
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');


  
  useEffect(() => {
    // Record atomic visit
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    const today = (new Date(Date.now() - tzoffset)).toISOString().split('T')[0];
    {
      if (!db) return;
      const visitRef = doc(db, 'analytics', today);
      try {
        setDoc(visitRef, { viewers: increment(1) }, { merge: true });
      } catch (err) {
        // Silently ignore
      }
    }

    

// Mock orders eradicated. Orders are now exclusively loaded via Firestore auth listener.
  }, []);

  // Strict View Transition / Cart View top scroll reset bugfix (Requirement 5)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [view, showCartDrawer]);

  // Save cart changes
  const saveCartToStorage = (updatedCart: CartItem[]) => {
    setCart(updatedCart);
    };

  // Cart helper actions
  const handleAddToCart = (product: Product, quantity: number = 1, silent: boolean = false, selectedSize?: string, selectedColor?: string) => {
    const existingIdx = cart.findIndex((item) => item.product.id === product.id && item.selectedSize === selectedSize && item.selectedColor === selectedColor);
    let updatedCart = [...cart];

    if (existingIdx > -1) {
      updatedCart[existingIdx].quantity += quantity;
    } else {
      updatedCart.push({ product, quantity, selectedSize, selectedColor });
    }

    saveCartToStorage(updatedCart);
    
  };

  const handleUpdateQuantity = (productId: string, delta: number, selectedSize?: string, selectedColor?: string) => {
    const updated = cart.map((item) => {
      if (item.product.id === productId && item.selectedSize === selectedSize && item.selectedColor === selectedColor) {
        const nextQty = item.quantity + delta;
        return { ...item, quantity: Math.max(1, nextQty) };
      }
      return item;
    });
    saveCartToStorage(updated);
  };

  const handleRemoveFromCart = (productId: string, selectedSize?: string, selectedColor?: string) => {
    const filtered = cart.filter((item) => item.product.id !== productId);
    saveCartToStorage(filtered);
  };

  const handleClearCart = () => {
    saveCartToStorage([]);
  };

  // Direct buy flow shortcut trigger
  const handleDirectBuy = (product: Product, quantity: number = 1, selectedSize?: string, selectedColor?: string) => {
    // Add to cart silenty
    handleAddToCart(product, quantity, true, selectedSize, selectedColor);
    // Auto launch checkout screen immediately
    setSelectedProduct(null);
    setView('checkout');
  };

  // Confirm order & Save order receipt
  
  const handleSendSupportMessage = async () => {
    if(!supportChatMsg.trim()) return;
    setChatSending(true);
    try {
      {
        if (!db) throw new Error("Database not connected. Please set Firebase API keys to enable accounts.");
        await addDoc(collection(db, 'support_chats'), {
        message: supportChatMsg,
        timestamp: new Date().toISOString(),
        userName: userProfile?.name || 'Guest',
        userPhone: userProfile?.phone || 'Unknown',
        status: 'Unread'
        });
      }
      setSupportChatMsg('');
      alert('Message sent successfully to support!');
      setShowSupportMenu(false);
    } catch (e) {
      console.error(e);
      alert('Failed to send message');
    } finally {
      setChatSending(false);
    }
  };

  const handleOrderCompletion = async (details: {
    address: { name: string; phone: string; street: string; city: string; area: string };
    notes: string;
    paymentMethod: 'cod' | 'bkash' | 'online';
    paymentScreenshotRef?: string;
    promoCodeApplied: string;
    deliveryCharge: number;
    discountAmount: number;
    finalTotal: number;
  }) => {
    const now = new Date();
    
    
    const randomId = `OB-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder: any = {
      id: randomId,
      orderId: randomId, // For FBOrder
      userId: auth?.currentUser?.uid || null,
      items: [...cart],
      cartItems: cart.map(item => ({
        productId: item.product.id,
        title: item.product.name,
        quantity: item.quantity,
        price: (item.product?.price || 0),
        costPrice: item.product.costPrice || 0,
        image: (item.product.images && item.product.images.length > 0) ? (item.product.images[1] || item.product.images[0]) : '',
        selectedSize: item.selectedSize || '',
        selectedColor: item.selectedColor || ''
      })),
      deliveryAddress: details.address,
      customerName: details.address.name || '',
      customerPhone: details.address.phone || '',
      customerAddress: `${details.address.street}, ${details.address.area}, ${details.address.city}`,
      orderNotes: details.notes || '',
      paymentMethod: details.paymentMethod,
      totalProductPrice: cart.reduce((acc, i) => acc + ((i.product?.price || 0) * i.quantity), 0),
      vat: 0,
      deliveryCharge: details.deliveryCharge || 0,
      promoCode: details.promoCodeApplied || null,
      discount: details.discountAmount || 0,
      total: details.finalTotal || 0,
      totalPayable: details.finalTotal || 0,
      orderDate: new Date().toISOString(),
      status: details.paymentMethod === 'online' ? 'Pending Verification' : 'Pending',
      createdAt: now.toISOString(),
      paymentScreenshotRef: null
    };
    
    // Strip out any undefined values deeply as Firestore does not support them
    const firestoreSafeOrder = JSON.parse(JSON.stringify(newOrder));

    // Save order to Firestore (instant)
    try {
      if(db) {
        await setDoc(doc(db, 'orders', randomId), firestoreSafeOrder);
      }
    } catch (err) {
      console.error("Failed to save order to Firestore:", err);
    }
    
    setRecentOrders(prev => [newOrder, ...prev]);
    
    // Set the order success explicitly (INSTANT UI UPDATE)
    setLastConfirmedOrder(newOrder);
    setCart([]);
    setView('home');
        
    // Fire and forget Firebase background tasks
    const saveToFirebase = async () => {
    let screenshotUrl = null;
    try {
      if (details.paymentMethod === 'online' && details.paymentScreenshotRef && details.paymentScreenshotRef.startsWith('data:image')) {
        try {
          const imageRef = ref(storage, `payment_screenshots/${randomId}_${Date.now()}.jpg`);
          await withRetry(async () => await uploadString(imageRef, details.paymentScreenshotRef, 'data_url'));
          screenshotUrl = await getDownloadURL(imageRef);
          
          if (db) {
            await updateDoc(doc(db, 'orders', randomId), {
              paymentScreenshotRef: screenshotUrl
            });
          }
        } catch(e) {
          console.error('Screenshot upload failed', e);
        }
      }
    } catch (error) {
      console.error('Error in background order processing:', error);
    }
    
    try {
      // Google Sheets Webhook Integration
      const GOOGLE_SHEETS_WEBHOOK = GOOGLE_SHEETS_WEBHOOK_URL;
      if (GOOGLE_SHEETS_WEBHOOK) {
        await withRetry(async () => await fetch(GOOGLE_SHEETS_WEBHOOK, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            date: new Date().toLocaleString(),
            orderId: randomId,
            customerName: details.address.name,
            phoneNumber: details.address.phone,
            address: `${details.address.street}, ${details.address.area}, ${details.address.city}`,
            productDetails: cart.map(i => {
              let extras = [];
              if (i.selectedSize) extras.push(`Size: ${i.selectedSize}`);
              if (i.selectedColor) extras.push(`Color: ${i.selectedColor}`);
              const extraStr = extras.length > 0 ? ` [${extras.join(', ')}]` : '';
              return `${i.product.name}${extraStr} (x${i.quantity})`;
            }).join(', '),
            totalPrice: details.finalTotal,
            paymentMethod: details.paymentMethod || "Cash on Delivery",
            screenshotUrl: screenshotUrl || "N/A",
            status: "Pending"
          })
        }));
      }
    } catch (error) {
      console.error('Error saving to Google Sheets:', error);
    }
    };
    saveToFirebase(); // fire and forget
    
    
  };

  // Filter Catalog
  const filteredProducts = products.filter((product) => {
    const matchCategory = selectedCategory === 'all' || (product.category || '').trim().toLowerCase() === (selectedCategory || '').trim().toLowerCase();
    const matchSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (product.banglaName && product.banglaName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                        product.brand.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const cartTotalAmount = cart.reduce((acc, item) => acc + ((item.product?.price || 0) * item.quantity), 0);
  const cartTotalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen bg-[#FAFAFA]/30 text-gray-900 font-sans selection:bg-amber-100 selection:text-amber-900 overflow-x-hidden flex flex-col" id="global-application-layout">
      {/* Header element */}
      <Header
        isProductOpen={!!selectedProduct}
        onCloseProduct={() => setSelectedProduct(null)}
        cartCount={totalCartCount}
        onOpenCart={() => setShowCartDrawer(true)}
        onNavigateHome={() => {
          setView('home');
          setSelectedCategory('all');
          setSearchQuery('');
          setSelectedProduct(null);
        }}
        onSearchClick={() => {
          setShowSearchModal(true);
        }}
        onOpenMenu={() => view === 'admin' ? setAdminSidebarOpen(true) : setShowSidebarMenu(true)}
        onLoginClick={() => setView('account')}
        currentView={view}
      />

      {/* Main Layout Area */}
      <main className="flex-grow max-w-6xl w-full mx-auto px-4 pt-[50px] sm:pt-[54px] md:pt-[60px] pb-20 md:pb-6" id="root-viewport-panel">
        <React.Suspense fallback={<div className="flex justify-center items-center h-[50vh]"><div className="w-8 h-8 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin"></div></div>}>
        <AnimatePresence mode="wait">
          
          {/* VIEW: HOME PAGE */}
          {view === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex flex-col"
            >
              {/* Promo Banner Slider section */}
              <PromoSlider slides={slides} onSelectCategory={(cid) => setSelectedCategory(cid)}
                onSelectProduct={(pid) => {
                  const prod = products.find(p => p.id === pid);
                  if (prod) setSelectedProduct(prod);
                }}
              />

              {/* Browse bubble categories list */}
              <div className="mt-1 mb-1 sm:mb-2">
                <Categories categories={categories} selectedCategory={selectedCategory}
                  onSelectCategory={(catId) => {
                    setSelectedCategory(catId);
                    if (catId !== 'all') {
                      setView('category_products');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                />
              </div>

              {/* Catalog Section Headers & Dynamic Layout */}
              {filteredProducts.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {/* If searching, show single list with banner title */}
                  {searchQuery !== '' ? (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center select-none mt-1 sm:mt-1">
                        <h3 className="text-[13px] sm:text-[15px] font-black text-[#111827] tracking-[0.15em] uppercase font-sans ">
                          SEARCH RESULTS
                        </h3>
                        <button onClick={() => setSearchQuery('')} className="text-[10px] sm:text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors cursor-pointer flex items-center gap-1 bg-white hover:bg-[#FAFAFA] py-1 px-2.5 rounded-md shadow-sm border border-gray-200">
                          <span className="uppercase tracking-wider">Clear</span>
                          <span className="text-[11px]">&times;</span>
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 animate-fade-in">
                        {filteredProducts.map((product) => (
                          <ProductCard key={product.id} product={product} onSelect={setSelectedProduct} onAddToCart={(p, e) => { e.stopPropagation(); handleAddToCart(p, 1); }} onBuyNow={(p, e) => { e.stopPropagation(); handleDirectBuy(p, 1); }} />
                        ))}
                      </div>
                      {filteredProducts.length === 0 && (
                        <div className="py-20 flex flex-col items-center justify-center text-center">
                          <Package className="w-16 h-16 text-gray-300 mb-4" />
                          <h3 className="text-lg font-black text-gray-800 mb-1">No products found</h3>
                          <p className="text-sm text-gray-500">Try adjusting your search terms.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* HOME PAGE CUSTOM SECTIONED LAYOUT */
                    <div className="space-y-3 mt-0" id="home-sectioned-layout">
                      
                      {/* SECTION 1: PREMIUM PRODUCTS */}
                      {products.filter(p => p.bestSeller).length > 0 && (
                      <div className="flex flex-col gap-2 sm:gap-3" id="top-selling-section">
                        <div className="flex justify-center select-none mb-1">
                          <div className="flex flex-col items-center justify-center w-full relative before:absolute before:inset-0 before:top-1/2 before:-translate-y-1/2 before:w-full before:h-[2px] before:bg-gray-200">
                            <h3 className="text-[14px] sm:text-[16px] font-black text-[#1F2937] tracking-[0.05em] uppercase font-sans m-0 leading-none bg-[#F0F2F5] px-4 relative z-10">
                              PREMIUM PRODUCTS
                            </h3>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 animate-fade-in">
                          {products.filter(p => p.bestSeller).slice(0, visibleCounts['premium'] || 4).map((product) => (
                            <ProductCard key={product.id} product={product} onSelect={setSelectedProduct} onAddToCart={(p, e) => { e.stopPropagation(); handleAddToCart(p, 1); }} onBuyNow={(p, e) => { e.stopPropagation(); handleDirectBuy(p, 1); }} />
                          ))}
                        </div>
                        {products.filter(p => p.bestSeller).length > 4 && (
                          <div className="flex justify-center mt-2 mb-1">
                            <button 
                              onClick={() => handleShowMore('premium', products.filter(p => p.bestSeller).length)} 
                              className="text-[#FF6B00] transition-colors flex items-center justify-center gap-1 py-1 px-4 bg-white border border-[#FF6B00] hover:bg-orange-50 rounded-full active:scale-95 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider"
                            >
                              <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${((visibleCounts['premium'] || 4) >= products.filter(p => p.bestSeller).length) ? 'rotate-180' : ''}`} strokeWidth={2.5} />
                              <span>{((visibleCounts['premium'] || 4) >= products.filter(p => p.bestSeller).length) ? 'Show Less' : 'View All'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                      )}
                      
                      {/* ANIMATED CAROUSEL 1 (Replacing Flash Sale Ticker) */}
                      <div className="w-full mt-4 mb-2 overflow-hidden relative shadow-sm border border-gray-100 rounded-xl bg-orange-50/50 h-12 flex items-center cursor-pointer" onClick={() => setView('offers')}>
                        <div className="animate-[marquee_15s_linear_infinite] whitespace-nowrap flex items-center h-full">
                          <div className="flex items-center mx-4 gap-2">
                            <span className="text-[#FF6B00] font-black text-sm md:text-base uppercase tracking-widest">⚡ FLASH SALE</span>
                            <span className="bg-[#FF6B00] text-white px-2 py-0.5 rounded text-xs font-bold">40% OFF</span>
                          </div>
                          <div className="flex items-center mx-4 gap-2">
                            <span className="text-[#FF6B00] font-black text-sm md:text-base uppercase tracking-widest">⚡ PREMIUM DEALS</span>
                            <span className="bg-[#FF6B00] text-white px-2 py-0.5 rounded text-xs font-bold">SHOP NOW</span>
                          </div>
                          <div className="flex items-center mx-4 gap-2">
                            <span className="text-[#FF6B00] font-black text-sm md:text-base uppercase tracking-widest">⚡ FLASH SALE</span>
                            <span className="bg-[#FF6B00] text-white px-2 py-0.5 rounded text-xs font-bold">40% OFF</span>
                          </div>
                          <div className="flex items-center mx-4 gap-2">
                            <span className="text-[#FF6B00] font-black text-sm md:text-base uppercase tracking-widest">⚡ PREMIUM DEALS</span>
                            <span className="bg-[#FF6B00] text-white px-2 py-0.5 rounded text-xs font-bold">SHOP NOW</span>
                          </div>
                          {/* Duplicate for seamless loop */}
                          <div className="flex items-center mx-4 gap-2">
                            <span className="text-[#FF6B00] font-black text-sm md:text-base uppercase tracking-widest">⚡ FLASH SALE</span>
                            <span className="bg-[#FF6B00] text-white px-2 py-0.5 rounded text-xs font-bold">40% OFF</span>
                          </div>
                          <div className="flex items-center mx-4 gap-2">
                            <span className="text-[#FF6B00] font-black text-sm md:text-base uppercase tracking-widest">⚡ PREMIUM DEALS</span>
                            <span className="bg-[#FF6B00] text-white px-2 py-0.5 rounded text-xs font-bold">SHOP NOW</span>
                          </div>
                          <div className="flex items-center mx-4 gap-2">
                            <span className="text-[#FF6B00] font-black text-sm md:text-base uppercase tracking-widest">⚡ FLASH SALE</span>
                            <span className="bg-[#FF6B00] text-white px-2 py-0.5 rounded text-xs font-bold">40% OFF</span>
                          </div>
                          <div className="flex items-center mx-4 gap-2">
                            <span className="text-[#FF6B00] font-black text-sm md:text-base uppercase tracking-widest">⚡ PREMIUM DEALS</span>
                            <span className="bg-[#FF6B00] text-white px-2 py-0.5 rounded text-xs font-bold">SHOP NOW</span>
                          </div>
                        </div>
                      </div>
                      {/* SECTION 2: JUST FOR YOU */}
                      {products.filter(p => p.justForYou).length > 0 && (
                      <div className="flex flex-col gap-2 sm:gap-3 mt-3" id="just-for-you-section">
                        <div className="flex justify-center select-none mb-1">
                          <div className="flex flex-col items-center justify-center w-full relative before:absolute before:inset-0 before:top-1/2 before:-translate-y-1/2 before:w-full before:h-[2px] before:bg-gray-200">
                            <h3 className="text-[14px] sm:text-[16px] font-black text-[#1F2937] tracking-[0.05em] uppercase font-sans m-0 leading-none bg-[#F0F2F5] px-4 relative z-10">
                              JUST FOR YOU
                            </h3>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 animate-fade-in">
                          {products.filter(p => p.justForYou).slice(0, visibleCounts['jfy'] || 4).map((product) => (
                            <ProductCard key={product.id} product={product} onSelect={setSelectedProduct} onAddToCart={(p, e) => { e.stopPropagation(); handleAddToCart(p, 1); }} onBuyNow={(p, e) => { e.stopPropagation(); handleDirectBuy(p, 1); }} />
                          ))}
                        </div>
                        {products.filter(p => p.justForYou).length > 4 && (
                          <div className="flex justify-center mt-2 mb-1">
                            <button 
                              onClick={() => handleShowMore('jfy', products.filter(p => p.justForYou).length)} 
                              className="text-[#FF6B00] transition-colors flex items-center justify-center gap-1 py-1 px-4 bg-white border border-[#FF6B00] hover:bg-orange-50 rounded-full active:scale-95 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider"
                            >
                              <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${((visibleCounts['jfy'] || 4) >= products.filter(p => p.justForYou).length) ? 'rotate-180' : ''}`} strokeWidth={2.5} />
                              <span>{((visibleCounts['jfy'] || 4) >= products.filter(p => p.justForYou).length) ? 'Show Less' : 'View All'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                      )}
                      
                      {/* SECTION 3: DYNAMIC CATEGORIES */}
                      {categories.filter(c => c.id !== 'all' && products.some(p => (p.category || '').trim().toLowerCase() === (c.id || '').trim().toLowerCase())).map((category, index, arr) => (
                        <React.Fragment key={category.id}>
                          <div className="space-y-3 sm:space-y-4 mt-3 sm:mt-4 lg:mt-5">
                            <div className="flex justify-center select-none mt-1 sm:mt-1 pb-1 mb-2">
                              <div className="flex flex-col items-center justify-center w-full relative before:absolute before:inset-0 before:top-1/2 before:-translate-y-1/2 before:w-full before:h-[2px] before:bg-gray-200">
                                <h3 className="text-[14px] sm:text-[16px] font-black text-[#1F2937] tracking-[0.05em] uppercase font-sans m-0 leading-none bg-[#F0F2F5] px-4 relative z-10 text-center">
                                  {category.name}
                                </h3>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
                              {products.filter(p => (p.category || '').trim().toLowerCase() === (category.id || '').trim().toLowerCase()).slice(0, visibleCounts[category.id] || 4).map((product) => (
                                <ProductCard key={product.id} product={product} onSelect={setSelectedProduct} onAddToCart={(p, e) => { e.stopPropagation(); handleAddToCart(p, 1); }} onBuyNow={(p, e) => { e.stopPropagation(); handleDirectBuy(p, 1); }} />
                              ))}
                            </div>
                            {products.filter(p => (p.category || '').trim().toLowerCase() === (category.id || '').trim().toLowerCase()).length > 4 && (
                            <div className="flex justify-center mt-2 mb-1">
                              <button 
                              onClick={() => handleShowMore(category.id, products.filter(p => (p.category || '').trim().toLowerCase() === (category.id || '').trim().toLowerCase()).length)} 
                              className="text-[#FF6B00] transition-colors flex items-center justify-center gap-1 py-1 px-4 bg-white border border-[#FF6B00] hover:bg-orange-50 rounded-full active:scale-95 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider"
                            >
                              <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${((visibleCounts[category.id] || 4) >= products.filter(p => (p.category || '').trim().toLowerCase() === (category.id || '').trim().toLowerCase()).length) ? 'rotate-180' : ''}`} strokeWidth={2.5} />
                              <span>{((visibleCounts[category.id] || 4) >= products.filter(p => (p.category || '').trim().toLowerCase() === (category.id || '').trim().toLowerCase()).length) ? 'Show Less' : 'View All'}</span>
                            </button>
                            </div>
                          )}
                          </div>
                          
                          
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              ) : productsLoading ? (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 px-4 mb-8 w-full mt-4">
      {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
        <div key={i} className="animate-pulse bg-white border border-gray-100 shadow-sm rounded-xl h-64 w-full"></div>
      ))}
    </div>
  ) : (
    <div className="text-center py-16 bg-[#FAFAFA] rounded-2xl border border-gray-100 flex flex-col items-center justify-center">
                    <p className="text-base font-bold text-gray-700">No products match your query.</p>
                    <p className="text-xs text-gray-400 mt-1">Try keywords like 'Smartwatch', 'Sneakers', or 'Polo'.</p>
                  </div>
              )}
            </motion.div>
          )}

          {/* VIEW: CATEGORY PRODUCTS DEDICATED VIEW */}
          {view === 'category_products' && (
            <motion.div
              key="category_products"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="space-y-4 animate-fade-in pb-10"
            >
              <div className="flex items-center justify-between mb-2">
                <button onClick={() => { setView('home'); setSelectedCategory('all'); }} className="w-10 h-10 flex items-center justify-center bg-white shadow-sm border border-gray-100 rounded-full text-gray-600 hover:text-[#FF6B00] hover:border-orange-200 transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 uppercase tracking-wide">
                  {selectedCategory === 'premium' ? 'Premium Products' : selectedCategory === 'just_for_you' ? 'Just For You' : categories.find(c => c.id === selectedCategory)?.name || 'Products'}
                </h2>
                <div className="w-10"></div> {/* Spacer */}
              </div>
              
              <div className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-gray-100 mb-4">
                <span className="text-xs font-bold text-gray-500">{(selectedCategory === 'premium' ? products.filter(p => p.bestSeller) : selectedCategory === 'just_for_you' ? products.filter(p => p.justForYou) : products.filter(p => (p.category || '').trim().toLowerCase() === (selectedCategory || '').trim().toLowerCase() || selectedCategory === 'all')).length} Items</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sort:</span>
                  <select className="text-xs font-bold bg-[#FAFAFA] border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#FF6B00]">
                    <option>Featured</option>
                    <option>Price: Low to High</option>
                    <option>Price: High to Low</option>
                    <option>Newest Arrivals</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
                {(selectedCategory === 'premium' ? products.filter(p => p.bestSeller) : selectedCategory === 'just_for_you' ? products.filter(p => p.justForYou) : products.filter(p => (p.category || '').trim().toLowerCase() === (selectedCategory || '').trim().toLowerCase() || selectedCategory === 'all')).map((product) => (
                  <ProductCard key={product.id} product={product} onSelect={setSelectedProduct} onAddToCart={(p, e) => { e.stopPropagation(); handleAddToCart(p, 1); }} onBuyNow={(p, e) => { e.stopPropagation(); handleDirectBuy(p, 1); }} />
                ))}
              </div>
              
              {(selectedCategory === 'premium' ? products.filter(p => p.bestSeller) : selectedCategory === 'just_for_you' ? products.filter(p => p.justForYou) : products.filter(p => (p.category || '').trim().toLowerCase() === (selectedCategory || '').trim().toLowerCase() || selectedCategory === 'all')).length === 0 && (
                 <div className="py-20 flex flex-col items-center justify-center text-center">
                    <Package className="w-16 h-16 text-gray-300 mb-4" />
                    <h3 className="text-lg font-black text-gray-800 mb-1">No products found</h3>
                    <p className="text-sm text-gray-500">Check back later for new arrivals in this category.</p>
                 </div>
              )}
            </motion.div>
          )}

          {/* VIEW: CATEGORY BROWSER */}
          {view === 'search' && (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="animate-fade-in pb-10 flex flex-col h-full bg-white min-h-[100dvh]"
            >
              <div className="px-4 py-2">
                {/* Search Bar */}
                <div className="relative group z-10 mb-5 mt-2">
                  <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search categories"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onClick={() => setShowSearchModal(true)}
                    className="w-full bg-[#F5F5F7] border-transparent rounded-2xl py-3 pl-11 pr-4 text-[15px] font-medium text-gray-900 focus:outline-none focus:bg-[#EAEAEF] transition-colors placeholder:text-gray-500 cursor-text"
                  />
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 sm:gap-6 relative z-10 pt-2 pb-6 px-1">
                  {categories.filter(c => c.id !== 'all').map((category, idx) => {
                    return (
                      <motion.button
                        key={category.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => {
                          setSelectedCategory(category.id);
                          setSearchQuery('');
                          setView('category_products');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="flex flex-col items-center text-center active:scale-95 transition-transform group"
                      >
                        <div className="relative w-full aspect-square max-w-[110px] mx-auto rounded-[22px] flex items-center justify-center p-[6px] transition-all duration-300 bg-white border-[1.5px] border-gray-100 shadow-[0_4px_10px_rgba(0,0,0,0.04)] group-hover:border-[2.5px] group-hover:border-[#FF6B00] group-hover:bg-orange-50/50 group-hover:shadow-[0_3px_10px_rgba(255,107,0,0.2)] group-hover:scale-105 active:border-[2.5px] active:border-[#FF6B00] active:bg-orange-50/50 active:shadow-[0_3px_10px_rgba(255,107,0,0.2)]">
  <div className="w-full h-full rounded-[16px] overflow-hidden bg-[#FAF9F6]">
    <img onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/f3f4f6/a1a1aa?text=No+Image'; (e.target as HTMLImageElement).onerror = null; }} 
      src={category.icon} 
      alt={category.name} 
      style={{ aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: '16px' }} 
      className="w-full h-full block transition-transform duration-500 group-hover:scale-110" 
      referrerPolicy="no-referrer" 
      loading="lazy" 
    />
  </div></div>
                        <div className="w-full flex flex-col items-center justify-center pt-3 pb-1 px-1">
                          <span className="text-[12px] sm:text-[13px] font-[900] text-slate-700 group-hover:text-[#FF6B00] text-center tracking-wide line-clamp-1 leading-tight transition-colors duration-300">
                            {category.name}
                          </span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
                
                
              </div>
            </motion.div>
          )}

          {/* VIEW: OFFERS BROWSER */}
          {view === 'offers' && (
            <motion.div
              key="offers"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="space-y-4 animate-fade-in pb-10"
            >
              <div className="bg-gradient-to-r from-[#FF6B00] to-amber-500 rounded-2xl p-4 sm:p-6 shadow-md text-white relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="relative z-10">
                  <h2 className="text-xl sm:text-2xl font-black mb-1 flex items-center gap-2">
                    <Tag className="w-5 h-5 sm:w-6 sm:h-6" /> Special Offers (বিশেষ ছাড়)
                  </h2>
                  <p className="text-xs sm:text-sm text-white/90">সীমিত সময়ের জন্য সেরা অফার এবং মূল্যছাড় উপভোগ করুন!</p>
                </div>
                <span className="bg-white/20 backdrop-blur-xs text-white text-xs font-black px-3 py-1.5 rounded-full relative z-10 shrink-0">
                  ⚡ Up to 40% OFF
                </span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
                {products.filter(p => p.offersPage || (p.originalPrice && p.originalPrice > p.price)).length > 0 ? (
                  products.filter(p => p.offersPage || (p.originalPrice && p.originalPrice > p.price)).map(product => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      onSelect={setSelectedProduct} 
                      onAddToCart={(p, e) => { e.stopPropagation(); handleAddToCart(p, 1); }} 
                      onBuyNow={(p, e) => { e.stopPropagation(); handleDirectBuy(p, 1); }} 
                    />
                  ))
                ) : (
                  <div className="col-span-full py-12 text-center text-gray-400 font-medium">
                    No active offers at the moment. Please check back later!
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* VIEW: DETAILED CHECKOUT VIEW CONTAINER */}
          {view === 'checkout' && (
            <motion.div
              key="checkout"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-0 z-[10010] bg-[#F8F9FA] overflow-y-auto"
            >
              {cart.length > 0 ? (
                <CheckoutView
                  cart={cart}
                  onBack={() => { setView('home'); setShowCartDrawer(true); }}
                  onEditCart={() => {
                    setView('home');
                    setView('checkout');
                  }}
                  onConfirmOrder={handleOrderCompletion}
                  defaultProfile={userProfile}
                  updateQuantity={handleUpdateQuantity}
                  removeFromCart={handleRemoveFromCart}
                  onLoginClick={() => setView('account')}
                />
              ) : (
    <div className="text-center py-16 bg-[#FAFAFA] rounded-2xl border border-gray-100 max-w-md mx-auto p-6" id="checkout-empty-basket">
                  <p className="text-base font-bold text-gray-700 mb-4 font-sans leading-none">Your shopping basket is empty.</p>
                  <button
                    onClick={() => setView('home')}
                    className="px-6 py-2 bg-[#2563EB] hover:bg-[#EA580C] text-white rounded-xl text-xs font-extrabold cursor-pointer transition-colors font-sans"
                  >
                    Go Back To Shop
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* VIEW: ACCOUNT HISTORY AND CREDENTIALS */}
          {view === 'account' && (
            <motion.div
              key="account"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="max-w-2xl mx-auto space-y-6"
            >
              {!isUserLoggedIn ? (
                /* REDESIGNED OPTIONAL USER AUTHENTICATION & LOGIN/REGISTRATION (Requirement 4) */
                <div className="bg-[#FAFAFA] rounded-2xl border border-gray-150 p-6 md:p-8 shadow-xs relative overflow-hidden" id="auth-sub-interface">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF6B00]/10 rounded-full blur-xl" />
                  
                  {/* Brand info */}
                  <div className="text-center space-y-2 mb-6">
                    <div className="mx-auto w-12 h-12 bg-[#2563EB] rounded-2xl flex items-center justify-center p-2.5 shadow-md shadow-blue-600/10 select-none">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-900 font-sans tracking-tight uppercase tracking-[0.1em]">Welcome to OBIN SHOP</h3>
                    <p className="text-xs text-gray-400">Join optionally to save custom shipping settings, default phone, and check your order logs instantly.</p>
                  </div>

                  {/* Auth Mode Toggle Bar */}
                  <div className="grid grid-cols-2 p-1.5 bg-[#FAFAFA] rounded-2xl border border-gray-100 mb-6 font-semibold text-xs select-none">
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className={`py-2 p-3 rounded-xl transition-all cursor-pointer ${
                        authMode === 'login' 
                          ? 'bg-white text-[#2563EB] shadow-sm font-black' 
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      Sign In (সাইন ইন)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode('register')}
                      className={`py-2 p-3 rounded-xl transition-all cursor-pointer ${
                        authMode === 'register' 
                          ? 'bg-white text-[#2563EB] shadow-sm font-black' 
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      Create Account (নিবন্ধন)
                    </button>
                  </div>

                  {authMode === 'login' ? (
                    /* SIGN IN SUB-INTERFACE FORM */
                                        <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!loginEmail || !loginPassword) {
                          alert('Please enter your credentials.');
                          return;
                        }
                        
                        setAuthLoading(true);
                        setAuthError('');
                        try {
                          
                          let emailToLogin = loginEmail;
                          if (!db || !auth) {
                            throw new Error("Firebase API keys are missing! Please add them to your environment variables to enable login.");
                          }


                          const usersRef = collection(db, 'users');
                          
                          if (!loginEmail.includes('@')) {
                              const q = query(usersRef, where('phone', '==', loginEmail));
                              const querySnapshot = await getDocs(q);
                              if (!querySnapshot.empty) {
                                  emailToLogin = querySnapshot.docs[0].data().email;
                                  
                                  const userData = querySnapshot.docs[0].data();
                                  const updatedProfile = {
                                    name: userData.name,
                                    phone: userData.phone,
                                    email: userData.email,
                                    address: userData.address || ''
                                  };
                                  setUserProfile(updatedProfile);
                                  } else {
                                  throw new Error("Account not found with this number. Please register.");
                              }
                          } else {
                              const q = query(usersRef, where('email', '==', loginEmail));
                              const querySnapshot = await getDocs(q);
                              if (!querySnapshot.empty) {
                                  const userData = querySnapshot.docs[0].data();
                                  const updatedProfile = {
                                    name: userData.name,
                                    phone: userData.phone,
                                    email: userData.email,
                                    address: userData.address || ''
                                  };
                                  setUserProfile(updatedProfile);
                                  } else {
                                  // Fallback if not found in users collection but exists in auth
                                  const updatedProfile = {
                                    name: 'User',
                                    phone: '',
                                    email: loginEmail,
                                    address: ''
                                  };
                                  setUserProfile(updatedProfile);
                                  }
                          }

                          
                          const userCredential = await signInWithEmailAndPassword(auth, emailToLogin, loginPassword);
                          setIsUserLoggedIn(true);
                          if (userCredential.user.email === SECRET_ADMIN_EMAIL) {
                            setView('admin');
                          } else {
                            setView('account');
                          }
                          
                        } catch (error: any) {
                          let errorMessage = error.message;
                          if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
                            errorMessage = 'Incorrect email or password. Please try again or click Forgot Password.';
                          } else if (error.code === 'auth/user-not-found') {
                            errorMessage = 'Account not found. Please register first.';
                          } else if (error.code === 'auth/invalid-email') {
                            errorMessage = 'Please enter a valid email address.';
                          } else if (error.code === 'auth/too-many-requests') {
                            errorMessage = 'Too many attempts. Please try again later or reset your password.';
                          }
                          setAuthError(errorMessage);
                        } finally {
                          setAuthLoading(false);
                        }
                      }}
                      className="space-y-4 text-left"
                    >

                      <div>
                        <label className="text-[10px] font-extrabold tracking-wide text-gray-400 uppercase block mb-1">Email or Phone Number</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            required
                            placeholder=""
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            className="w-full bg-[#FAFAFA] border border-gray-150 rounded-xl p-3 pl-9.5 text-xs sm:text-sm focus:outline-none focus:border-[#2563EB] focus:bg-white font-medium"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-extrabold tracking-wide text-gray-400 uppercase block mb-1">Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                          <input
                            type="password"
                            required
                            placeholder="••••••••"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="w-full bg-[#FAFAFA] border border-gray-150 rounded-xl p-3 pl-9.5 text-xs sm:text-sm focus:outline-none focus:border-[#2563EB] focus:bg-white font-medium"
                          />
                        </div>
                      </div>

                                            
                      <div className="flex justify-between items-center mt-2">
                        <button
                          type="button"
                          disabled={authLoading}
                          onClick={async () => {
                            if (!loginEmail) {
                              alert('Please enter your email or phone number first.');
                              return;
                            }
                            setAuthLoading(true);
                            setAuthError('');
                            try {
                              
                              let emailToReset = loginEmail;
                              if (!loginEmail.includes('@')) {
                                if (!db) throw new Error("Database not connected. Please set Firebase API keys to enable accounts.");
                          const usersRef = collection(db, 'users');
                                const q = query(usersRef, where('phone', '==', loginEmail));
                                const querySnapshot = await getDocs(q);
                                if (!querySnapshot.empty) {
                                  emailToReset = querySnapshot.docs[0].data().email;
                                } else {
                                  throw new Error("Account not found with this number.");
                                }
                              }
                              await sendPasswordResetEmail(auth, emailToReset);
                              alert('Password reset email sent! Please check your inbox.');
                            } catch (error: any) {
                              let errorMessage = error.message;
                              if (error.code === 'auth/user-not-found') {
                                errorMessage = 'Account not found. Please register first.';
                              } else if (error.code === 'auth/invalid-email') {
                                errorMessage = 'Please enter a valid email address.';
                              }
                              setAuthError(errorMessage);
                            } finally {
                              setAuthLoading(false);
                            }
                          }}
                          className="text-[10px] text-gray-500 hover:text-[#2563EB] font-bold cursor-pointer underline"
                        >
                          Forgot Password?
                        </button>
                      </div>

                      {authError && <p className="text-red-500 text-xs font-bold bg-red-50 p-2 rounded-lg">{authError}</p>}
                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full h-11 bg-[#2563EB] hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-98 cursor-pointer mt-2 disabled:opacity-50"
                      >
                        {authLoading ? 'Please wait...' : 'Sign In Now'}
                      </button>
                    </form>
                  ) : (
                    /* SIGN UP / REGISTRATION SUB-INTERFACE FORM */
                                        <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!registerName || !registerPhone || !registerEmail || !registerPassword) {
                          alert('Please complete all fields.');
                          return;
                        }
                        
                        setAuthLoading(true);
                        setAuthError('');
                        try {
                          if (!db || !auth) {
    throw new Error("Firebase API keys are missing! Please add them to your environment variables to enable registration.");
  }
  const userCred = await createUserWithEmailAndPassword(auth, registerEmail, registerPassword);
                          
                          const updatedProfile = {
                            name: registerName,
                            phone: registerPhone,
                            email: registerEmail,
                            address: '',
                            joinDate: new Date().toISOString()
                          };
                          
                          if (!db || !auth) {
    throw new Error("Firebase is not configured! Please add your Firebase configuration to the environment variables on your hosting provider.");
  }
                          const firestoreSafeProfile = JSON.parse(JSON.stringify(updatedProfile));
                          await setDoc(doc(db, 'users', userCred.user.uid), firestoreSafeProfile);
                          
                          setUserProfile(updatedProfile);
                          setIsUserLoggedIn(true);
                          } catch (error: any) {
                          let errorMessage = error.message;
                          if (error.code === 'auth/email-already-in-use') {
                            errorMessage = 'An account with this email already exists. Please log in instead.';
                          } else if (error.code === 'auth/weak-password') {
                            errorMessage = 'Password should be at least 6 characters.';
                          }
                          setAuthError(errorMessage);
                        } finally {
                          setAuthLoading(false);
                        }
                      }}
                      className="space-y-4 text-left"
                    >

                      <div>
                        <label className="text-[10px] font-extrabold tracking-wide text-gray-400 uppercase block mb-1">Full Name</label>
                        <div className="relative">
                          <User className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            required
                            placeholder="e.g. Mobin Ahmed"
                            value={registerName}
                            onChange={(e) => setRegisterName(e.target.value)}
                            className="w-full bg-[#FAFAFA] border border-gray-150 rounded-xl p-3 pl-9.5 text-xs sm:text-sm focus:outline-none focus:border-[#2563EB] focus:bg-white font-medium"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-extrabold tracking-wide text-gray-400 uppercase block mb-1">Phone Number</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                          <input
                            type="tel"
                            required
                            placeholder={`e.g. ${supportNumber}`}
                            value={registerPhone}
                            onChange={(e) => setRegisterPhone(e.target.value)}
                            className="w-full bg-[#FAFAFA] border border-gray-150 rounded-xl p-3 pl-9.5 text-xs sm:text-sm focus:outline-none focus:border-[#2563EB] focus:bg-white font-mono font-medium"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-extrabold tracking-wide text-gray-400 uppercase block mb-1">Email address</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                          <input
                            type="email"
                            required
                            placeholder=""
                            value={registerEmail}
                            onChange={(e) => setRegisterEmail(e.target.value)}
                            className="w-full bg-[#FAFAFA] border border-gray-150 rounded-xl p-3 pl-9.5 text-xs sm:text-sm focus:outline-none focus:border-[#2563EB] focus:bg-white font-medium"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-extrabold tracking-wide text-gray-400 uppercase block mb-1">Passcode Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                          <input
                            type="password"
                            required
                            placeholder="••••••••"
                            value={registerPassword}
                            onChange={(e) => setRegisterPassword(e.target.value)}
                            className="w-full bg-[#FAFAFA] border border-gray-150 rounded-xl p-3 pl-9.5 text-xs sm:text-sm focus:outline-none focus:border-[#2563EB] focus:bg-white font-medium"
                          />
                        </div>
                      </div>

                                            {authError && <p className="text-red-500 text-xs font-bold bg-red-50 p-2 rounded-lg">{authError}</p>}
                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full h-11 bg-[#2563EB] hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-98 cursor-pointer mt-2 disabled:opacity-50"
                      >
                        {authLoading ? 'Please wait...' : 'Create Account Now'}
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                /* USER IS LOGGED IN - SHOW FULL PROFILE MANAGEMENT DETAILS & SETTINGS */
                <>
                  {/* Account profile card */}
                  <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm relative overflow-hidden" id="account-card-panel">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF6B00]/10 rounded-full blur-xl" />
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="w-16 h-16 bg-[#1E3A8A] text-white rounded-full flex items-center justify-center text-2xl font-black shadow-md shadow-[#1E3A8A]/10 select-none">
                        {userProfile.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-grow text-left space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xl font-extrabold text-[#111827]">{userProfile.name}</h3>
                          <span className="text-[10px] font-mono tracking-widest bg-blue-50 text-blue-850 border border-blue-100 px-2 py-0.5 rounded-md font-bold uppercase select-none font-siliguri">VIP Member</span>
                        </div>
                        <p className="text-sm text-gray-500 font-mono font-bold">{userProfile.phone}</p>
                        <p className="text-xs text-gray-400">{userProfile.email} (AI Studio Profile)</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <button
                            onClick={() => setView('admin')}
                            className="px-3 py-1.5 border border-blue-200 hover:bg-blue-50 text-blue-700 rounded-xl text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
                            title="Admin Panel"
                          >
                            <LayoutDashboard className="w-3.5 h-3.5" />
                            <span>Admin Panel</span>
                          </button>
                        )}
                        {/* Sign Out Button to return to optional Auth view */}
                        <button
                          
                          
                          onClick={async () => {
                            try {
                              if (auth) await signOut(auth);
                            } catch (e) {
                              console.error(e);
                            }
                            setIsUserLoggedIn(false);
                            const emptyProfile = { name: '', phone: '', email: '', address: '' };
                            setUserProfile(emptyProfile);
                            }}


                          className="px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Sign Out"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Modern Profile Navigation Grid */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <button onClick={() => setActiveProfileModal('orders')} className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col items-start gap-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-[#2563EB]/20 hover:shadow-[0_8px_20px_rgba(37,99,235,0.08)] active:scale-95 transition-all group">
                      <div className="w-12 h-12 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
                        <ShoppingBag className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-bold text-gray-900 text-sm">My Orders</h4>
                        <p className="text-[10px] text-gray-500">{recentOrders.length} orders found</p>
                      </div>
                    </button>
                    
                    <button onClick={() => setActiveProfileModal('wallet')} className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col items-start gap-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-[#2563EB]/20 hover:shadow-[0_8px_20px_rgba(37,99,235,0.08)] active:scale-95 transition-all group">
                      <div className="w-12 h-12 rounded-full bg-orange-50 text-[#FF6B00] flex items-center justify-center group-hover:bg-[#FF6B00] group-hover:text-white transition-colors">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-bold text-gray-900 text-sm">Wallet</h4>
                        <p className="text-[10px] text-gray-500">৳0.00 Balance</p>
                      </div>
                    </button>

                    <button onClick={() => setActiveProfileModal('addresses')} className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col items-start gap-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-[#2563EB]/20 hover:shadow-[0_8px_20px_rgba(37,99,235,0.08)] active:scale-95 transition-all group">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-bold text-gray-900 text-sm">Addresses</h4>
                        <p className="text-[10px] text-gray-500">Saved locations</p>
                      </div>
                    </button>

                    <button onClick={() => setActiveProfileModal('payments')} className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col items-start gap-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-[#2563EB]/20 hover:shadow-[0_8px_20px_rgba(37,99,235,0.08)] active:scale-95 transition-all group">
                      <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-colors">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-bold text-gray-900 text-sm">Payment Methods</h4>
                        <p className="text-[10px] text-gray-500">Cards & Mobile</p>
                      </div>
                    </button>
                  </div>

                  <button onClick={() => setActiveProfileModal('settings')} className="w-full mt-3 bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:border-gray-200 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#FAFAFA] text-gray-600 flex items-center justify-center">
                        <Settings className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-bold text-gray-900 text-sm">Account Settings</h4>
                        <p className="text-[10px] text-gray-500">Theme, Notifications, Privacy</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                  
                  {/* Modals for Profile Actions */}
                  <AnimatePresence>
                    {activeProfileModal && (
                      <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed inset-0 z-[10010] bg-white flex flex-col"
                      >
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 shadow-sm sticky top-0 bg-white/90 backdrop-blur-md z-10">
                          <button onClick={() => setActiveProfileModal(null)} className="w-10 h-10 flex items-center justify-center bg-[#FAFAFA] rounded-full text-gray-600">
                            <ArrowLeft className="w-5 h-5" />
                          </button>
                          <h3 className="font-black text-gray-900 capitalize">
                            {activeProfileModal === 'orders' && 'My Orders'}
                            {activeProfileModal === 'wallet' && 'My Wallet'}
                            {activeProfileModal === 'addresses' && 'Saved Addresses'}
                            {activeProfileModal === 'payments' && 'Payment Methods'}
                            {activeProfileModal === 'settings' && 'Account Settings'}
                          </h3>
                          <div className="w-10 h-10"></div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 pb-24 bg-[#FAFAFA]/50">
                          {activeProfileModal === 'orders' && (
                            <div className="space-y-4">
                              {recentOrders.length > 0 ? (
                                recentOrders.map(order => (
                                  <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
                                    <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                                      <span className="font-mono text-xs font-bold text-blue-600">#{order.orderId || order.id.slice(0,8)}</span>
                                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase ${
  order.status.toLowerCase().includes('pending') ? 'bg-orange-100 text-orange-700' : 
  order.status.toLowerCase().includes('complet') || order.status.toLowerCase().includes('deliver') ? 'bg-green-100 text-green-700' : 
  order.status.toLowerCase().includes('cancel') || order.status.toLowerCase().includes('fail') ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
}`}>{order.status}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm font-bold text-gray-900">{order.items.length} Items</span>
                                      <span className="font-black text-slate-900">৳{order.total.toLocaleString('en-US')}</span>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Ordered on {order.orderDate}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-center py-12 flex flex-col items-center opacity-50">
                                  <Package className="w-12 h-12 mb-3" />
                                  <p className="font-bold">No orders found</p>
                                </div>
                              )}
                            </div>
                          )}

                          {activeProfileModal === 'wallet' && (
                            <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100 flex flex-col items-center justify-center py-12">
                              <div className="w-16 h-16 bg-[#FAFAFA] rounded-full flex items-center justify-center mb-4 border border-gray-100">
                                <Wallet className="w-8 h-8 text-gray-400" />
                              </div>
                              <h3 className="font-black text-gray-900 text-lg mb-2">Under Development</h3>
                              <p className="text-gray-500 text-sm max-w-[250px]">The Wallet feature is coming soon in our next update!</p>
                            </div>
                          )}

                          {activeProfileModal === 'addresses' && (
                            <div className="space-y-4">
                              {userProfile.address ? (
                                <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm relative overflow-hidden">
                                  <div className="absolute top-0 right-0 p-2 bg-blue-100 text-blue-700 text-[9px] font-bold uppercase rounded-bl-lg">Default</div>
                                  <h4 className="font-bold text-gray-900 mb-1">{userProfile.name || 'Your Name'}</h4>
                                  <p className="text-xs text-gray-500 mb-1">{userProfile.phone || 'No phone added'}</p>
                                  <p className="text-sm text-gray-700 font-medium">{userProfile.address}</p>
                                </div>
                              ) : (
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center opacity-70">
                                  <MapPin className="w-8 h-8 text-gray-300 mb-3" />
                                  <p className="text-gray-500 text-sm font-bold mb-1">No saved addresses yet</p>
                                </div>
                              )}
                              <button className="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 text-gray-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#FAFAFA] hover:border-gray-400 transition-colors">
                                <Plus className="w-4 h-4" /> Add New Address
                              </button>
                            </div>
                          )}

                          {activeProfileModal === 'payments' && (
                            <div className="space-y-4">
                              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 opacity-70">
                                <div className="w-12 h-10 bg-[#E3106D]/10 rounded flex items-center justify-center">
                                  <span className="text-[#E3106D] font-black text-[10px]">bKash</span>
                                </div>
                                <div className="flex-1 text-left">
                                  <h4 className="font-bold text-gray-900 text-sm">bKash Merchant</h4>
                                  <p className="text-xs text-gray-500">Coming Soon</p>
                                </div>
                              </div>
                              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 opacity-70">
                                <div className="w-12 h-10 bg-blue-50 rounded flex items-center justify-center">
                                  <CreditCard className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex-1 text-left">
                                  <h4 className="font-bold text-gray-900 text-sm">Credit / Debit Cards</h4>
                                  <p className="text-xs text-gray-500">SSLCommerz (Coming Soon)</p>
                                </div>
                              </div>
                              <button className="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 text-gray-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#FAFAFA] hover:border-gray-400 transition-colors mt-2">
                                <Plus className="w-4 h-4" /> Add Payment Method
                              </button>
                            </div>
                          )}

                          {activeProfileModal === 'settings' && (
                            <div className="space-y-4">
                              <div className="bg-white border border-gray-100 rounded-2xl p-1 shadow-sm">
                                <div className="flex items-center justify-between p-3 border-b border-gray-50">
                                  <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
                                    <User className="w-4 h-4 text-gray-400" /> Edit Profile
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-gray-300" />
                                </div>
                                <div className="flex items-center justify-between p-3 border-b border-gray-50">
                                  <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
                                    <Bell className="w-4 h-4 text-gray-400" /> Notifications
                                  </div>
                                  <div className="w-10 h-6 bg-[#FF6B00] rounded-full relative cursor-pointer shadow-inner">
                                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between p-3">
                                  <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
                                    {darkModeToggle ? <Moon className="w-4 h-4 text-blue-600" /> : <Sun className="w-4 h-4 text-[#FF6B00]" />}
                                    Dark Mode
                                  </div>
                                  <button onClick={() => setDarkModeToggle(!darkModeToggle)} className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors shadow-inner ${darkModeToggle ? 'bg-orange-600' : 'bg-gray-200'}`}>
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${darkModeToggle ? 'right-1' : 'left-1'}`}></div>
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </motion.div>
          )}

          {/* VIEW: ADMIN PANEL CONTROL HUB */}
          {view === 'admin' && isAdmin && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <AdminDashboard
                products={products}
                orders={recentOrders}
                slides={slides}
                categories={categories}
                supportNumber={supportNumber}
                onBack={() => setView('home')}
                onUpdateProducts={handleUpdateProducts}
                onUpdateOrders={handleUpdateOrders}
                onUpdateSlides={(newSlides) => {
                  setSlides(newSlides);
                  }}
                onUpdateCategories={(newCats) => {
                  setCategories(newCats);
                  }}
                onUpdateSupportNumber={(num) => {
                  setSupportNumber(num);
                  }}
                isSidebarOpen={adminSidebarOpen}
                onCloseSidebar={() => setAdminSidebarOpen(false)}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </React.Suspense>
      </main>

      {/* FOOTER: Clean minimalist branded footer requested by the user */}
      {view !== 'admin' && (
        <footer className="text-center py-5 text-[11px] font-semibold text-gray-400 bg-[#FAFAFA] border-t border-gray-200 w-full mt-auto mb-14 md:mb-0 select-none">
          © Obin Shop | Made by Mr Mobin
        </footer>
      )}

{/* MOBILE FLOATING BOTTOM NAVIGATION */}
      {view !== 'admin' && !selectedProduct && (
        
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/85 backdrop-blur-xl border-t border-gray-200/50 px-4 py-0 flex justify-between items-center z-[150] pb-[env(safe-area-inset-bottom)] select-none shadow-[0_-4px_20px_rgba(0,0,0,0.03)] transition-all duration-200 ease-in-out pointer-events-auto" id="mobile-floating-nav">
        
        <button
          onClick={() => { setView('home'); setSelectedCategory('all'); setShowSidebarMenu(false); setSelectedProduct(null); }}
          className="flex flex-col items-center justify-center w-[52px] h-[52px] transition-all duration-300 ease-out cursor-pointer active:scale-95"
        >
          {view === 'home' ? (
            <div className="flex flex-col items-center gap-0.5">
              <div className="bg-[#FF6B00]/10 p-1.5 rounded-xl">
                <Home className="w-[18px] h-[18px] stroke-[2.5] text-[#FF6B00]" />
              </div>
              <span className="text-[9px] font-bold tracking-wide text-[#FF6B00]">Shop</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-900 transition-colors">
              <div className="p-1.5 rounded-xl transparent">
                <Home className="w-[18px] h-[18px] stroke-[2]" />
              </div>
              <span className="text-[9px] font-medium tracking-wide">Shop</span>
            </div>
          )}
        </button>

        <button
          onClick={() => { setView('search'); setShowSidebarMenu(false); setSelectedProduct(null); }}
          className="flex flex-col items-center justify-center w-[52px] h-[52px] transition-all duration-300 ease-out cursor-pointer active:scale-95"
        >
          {view === 'search' ? (
            <div className="flex flex-col items-center gap-0.5">
              <div className="bg-[#FF6B00]/10 p-1.5 rounded-xl">
                <Grid className="w-[18px] h-[18px] stroke-[2.5] text-[#FF6B00]" />
              </div>
              <span className="text-[9px] font-bold tracking-wide text-[#FF6B00]">Category</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-900 transition-colors">
              <div className="p-1.5 rounded-xl transparent">
                <Grid className="w-[18px] h-[18px] stroke-[2]" />
              </div>
              <span className="text-[9px] font-medium tracking-wide">Category</span>
            </div>
          )}
        </button>

        <button
          onClick={() => setShowCartDrawer(true)}
          className="flex flex-col items-center justify-center w-[52px] h-[52px] transition-all duration-300 ease-out cursor-pointer active:scale-95 relative"
        >
          <div className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-900 transition-colors relative">
            <div className="p-1.5 rounded-xl transparent relative">
              <ShoppingCart className={`w-[18px] h-[18px] ${showCartDrawer ? 'stroke-[2.5] text-[#FF6B00]' : 'stroke-[2]'}`} />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#FF6B00] text-white text-[9px] font-black w-[16px] h-[16px] flex items-center justify-center rounded-full shadow-sm ring-2 ring-white">
                  {cart.length}
                </span>
              )}
            </div>
            <span className={`text-[9px] tracking-wide ${showCartDrawer ? 'font-bold text-[#FF6B00]' : 'font-medium'}`}>Cart</span>
          </div>
        </button>
        
        <button
          onClick={() => { setView('offers'); setSelectedProduct(null); }}
          className="flex flex-col items-center justify-center w-[52px] h-[52px] transition-all duration-300 ease-out cursor-pointer active:scale-95"
        >
          {view === 'offers' ? (
            <div className="flex flex-col items-center gap-0.5">
              <div className="bg-[#FF6B00]/10 p-1.5 rounded-xl">
                <Tag className="w-[18px] h-[18px] stroke-[2.5] text-[#FF6B00]" />
              </div>
              <span className="text-[9px] font-bold tracking-wide text-[#FF6B00]">Offers</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-900 transition-colors">
              <div className="p-1.5 rounded-xl transparent">
                <Tag className="w-[18px] h-[18px] stroke-[2]" />
              </div>
              <span className="text-[9px] font-medium tracking-wide">Offers</span>
            </div>
          )}
        </button>

        <button
          onClick={() => { setView('account'); setSelectedProduct(null); }}
          className="flex flex-col items-center justify-center w-[52px] h-[52px] transition-all duration-300 ease-out cursor-pointer active:scale-95"
        >
          {view === 'account' ? (
            <div className="flex flex-col items-center gap-0.5">
              <div className="bg-[#FF6B00]/10 p-1.5 rounded-xl">
                <User className="w-[18px] h-[18px] stroke-[2.5] text-[#FF6B00]" />
              </div>
              <span className="text-[9px] font-bold tracking-wide text-[#FF6B00]">Account</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-900 transition-colors">
              <div className="p-1.5 rounded-xl transparent">
                <User className="w-[18px] h-[18px] stroke-[2]" />
              </div>
              <span className="text-[9px] font-medium tracking-wide">Account</span>
            </div>
          )}
        </button>
        </div>
        )}

      {/* FLOATING CIRCULAR HELPLINE FAB */}
      {view !== 'checkout' && view !== 'admin' && !selectedProduct && (
        <div className="fixed bottom-[56px] right-[8px] md:bottom-[24px] md:right-[24px] z-[1000] flex flex-col items-end gap-3 pointer-events-none" style={{ zIndex: 1000, bottom: '56px', right: '8px' }}>
          <AnimatePresence>
            {showSupportMenu && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                className="flex flex-col gap-3 pointer-events-auto items-end mb-2"
              >
                <a
                  href={`https://wa.me/88${supportNumber}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white px-4 py-2.5 rounded-full shadow-lg transition-transform hover:scale-105"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="font-bold text-sm">WhatsApp</span>
                </a>
                <a
                  href={`tel:${supportNumber}`}
                  className="flex items-center gap-2 bg-[#1E3A8A] hover:bg-blue-800 text-white px-4 py-2.5 rounded-full shadow-lg transition-transform hover:scale-105"
                >
                  <Phone className="w-4 h-4" />
                  <span className="font-bold text-sm">Call Now</span>
                </a>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            onClick={() => setShowSupportMenu(!showSupportMenu)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="pointer-events-auto flex items-center justify-center w-11 h-11 sm:w-14 sm:h-14 bg-[#FF6B00] hover:bg-orange-600 text-white rounded-full shadow-xl border-2 border-white/95 cursor-pointer select-none"
            id="floating-helpline-fab"
            title="Support Options"
          >
            {!showSupportMenu && <span className="absolute inset-0 rounded-full bg-[#FF6B00] opacity-40 animate-slow-ping pointer-events-none" />}
            <div className="relative flex items-center justify-center text-white w-full h-full" id="helpline-inside-wrapper">
              {showSupportMenu ? (
                <X className="w-5 h-5 sm:w-7 sm:h-7 stroke-[2.5]" />
              ) : (
                <Headphones className="w-5 h-5 sm:w-7 sm:h-7 stroke-[2.2] animate-pulse" style={{ animationDuration: '3s' }} />
              )}
            </div>
          </motion.button>
        </div>
      )}

      {/* Shopping Cart Drawer Modal */}
      <CartDrawer
        isOpen={showCartDrawer}
        onClose={() => setShowCartDrawer(false)}
        cart={cart}
        onUpdateQuantity={(productId, targetQty, size, color) => {
          handleUpdateQuantity(productId, targetQty - (cart.find(i => i.product.id === productId)?.quantity || 0), size, color);
        }}
        onRemoveItem={handleRemoveFromCart}
        onClearCart={handleClearCart}
        onProceedToCheckout={() => {
          setShowCartDrawer(false);
          setView('checkout');
        }}
      />

      {/* Sidebar Navigation Drawer Modal */}
      <SidebarMenu
        isOpen={showSidebarMenu}
        onClose={() => setShowSidebarMenu(false)}
        categories={categories}
        onSelectCategory={(catId) => {
          setSelectedCategory(catId);
          setSelectedProduct(null);
          if (catId !== 'all') {
            setView('category_products');
          } else {
            setView('home');
          }
        }}
        onNavigateView={(v) => {
          setView(v);
          setSelectedProduct(null);
          if (v === 'home') setSelectedCategory('all');
        }}
        onOpenCart={() => setShowCartDrawer(true)}
        cartCount={totalCartCount}
        supportNumber={supportNumber}
      />

      
      {/* Order Success Modal */}
      <AnimatePresence>
        {lastConfirmedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative"
            >
              <div className="p-6 md:p-8 flex flex-col items-center text-center">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                    className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-6"
                  >
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">Order Placed!</h3>
                  <p className="text-gray-500 mb-6 text-sm">Thank You For Your Order! Your order #{lastConfirmedOrder.id} has been placed successfully.</p>
                  
                  <div className="w-full bg-[#FAFAFA] rounded-2xl p-4 mb-6 border border-gray-100 text-left">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Amount</span>
                      <span className="text-base font-black text-gray-900">৳{lastConfirmedOrder.total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Payment</span>
                      <span className="text-xs font-bold text-gray-700">{lastConfirmedOrder.paymentMethod.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Items</span>
                      <span className="text-xs font-bold text-gray-700">{lastConfirmedOrder.items.length}</span>
                    </div>
                  </div>

                  <div className="w-full space-y-3">
                    <a
                      href={`https://wa.me/88${supportNumber}?text=${encodeURIComponent(`Hello! I just placed an order.\n\n*Order ID:* #${lastConfirmedOrder.id}\n*Name:* ${lastConfirmedOrder.deliveryAddress?.name}\n*Total:* ৳${lastConfirmedOrder.total}\n*Items:* ${lastConfirmedOrder.items.length}\n\nPlease confirm my order.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-4 rounded-xl text-white font-black text-[14px] tracking-wide uppercase shadow-lg transition-all bg-[#25D366] hover:bg-[#128C7E] flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                      Send Order to WhatsApp
                    </a>
                    
                    <button
                      onClick={() => {
                        setLastConfirmedOrder(null);
                      }}
                      className="w-full py-4 rounded-xl bg-gray-100 text-gray-700 font-black text-[14px] tracking-wide uppercase hover:bg-gray-200 transition-colors"
                    >
                      Continue Shopping
                    </button>
                  </div>
                </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Overlay Modal */}
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        products={products}
        onSelectProduct={(p) => {
          setSelectedProduct(p);
          setShowSearchModal(false);
        }}
        onAddToCart={(p, e) => {
          e.stopPropagation();
          handleAddToCart(p, 1);
        }}
        onBuyNow={(p, e) => {
          e.stopPropagation();
          handleDirectBuy(p, 1);
        }}
      />

      {/* Product Detail Modal */}
      <AnimatePresence>
        {invalidProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="w-24 h-24 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6">
              <Package className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h2>
            <p className="text-gray-500 mb-8 max-w-sm">The product you are looking for might have been removed or the link is invalid.</p>
            <button
              onClick={() => {
                setInvalidProduct(false);
                navigate('/');
              }}
              className="bg-[#FF6B00] text-white px-8 py-3.5 rounded-xl font-bold tracking-wide hover:bg-[#e66000] active:scale-95 transition-all shadow-lg shadow-[#FF6B00]/20"
            >
              Continue Shopping
            </button>
          </motion.div>
        )}
        {selectedProduct && (
          <ProductDetailModal
            product={selectedProduct}
            products={products}
            onClose={() => setSelectedProduct(null)}
            onAddToCart={(p, qty) => {
              handleAddToCart(p, qty);
            }}
            onBuyNow={(p, qty) => {
              handleDirectBuy(p, qty);
            }}
            onSelectProduct={setSelectedProduct}
          />
        )}
      </AnimatePresence>
    </div>
  );
}