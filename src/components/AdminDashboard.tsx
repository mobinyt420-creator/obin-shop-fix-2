import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, Package, ShoppingBag, Users, 
  BarChart3, Settings, Tag, DollarSign, Star, Image as ImageIcon,
  Search, PlusCircle, Edit2, Trash2, X, Check, ArrowLeft,
  Clock, Save, Send, AlertCircle, FileText, Truck, Shield, Mail, Phone
} from 'lucide-react';
import { Product, Slide, Category } from '../types';
import { collection, doc, updateDoc, setDoc, onSnapshot, query, orderBy, deleteDoc } from 'firebase/firestore';
import { db, GOOGLE_SHEETS_WEBHOOK_URL } from '../firebase';

interface FBOrder {
  id: string; // firestore document id
  orderId: string; // OB-DDMM-XXXX
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  orderNotes?: string;
  paymentMethod: string;
  paymentScreenshotRef?: string;
  totalPayable: number;
  orderDate: string;
  status: 'Pending' | 'Processing' | 'Completed' | 'Cancelled' | 'Returned';
  cartItems: any[];
}

interface FBUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  joinDate?: string;
}

interface AdminDashboardProps {
  products: Product[];
  orders: any[];
  slides: Slide[];
  categories: Category[];
  supportNumber: string;
  onBack: () => void;
  onUpdateProducts: (updated: Product[]) => void;
  onUpdateOrders: (orders: any[]) => void;
  onUpdateSlides: (slides: Slide[]) => void;
  onUpdateCategories: (cats: Category[]) => void;
  onUpdateSupportNumber: (num: string) => void;
  isSidebarOpen: boolean;
  onCloseSidebar: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  products,
  orders,
  slides,
  categories,
  supportNumber,
  onBack,
  onUpdateProducts,
  onUpdateOrders,
  onUpdateSlides,
  onUpdateCategories,
  onUpdateSupportNumber,
  isSidebarOpen,
  onCloseSidebar
}) => {
  const getBadgeStyles = (msg: string) => {
    const lowerMsg = msg.toLowerCase();
    if (lowerMsg === 'top selling') return 'bg-red-600 border-red-500';
    if (lowerMsg.includes('save') || lowerMsg.includes('%')) return 'bg-blue-600 border-blue-500';
    return 'bg-blue-600 border-blue-500';
  };
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'products' | 'categories' | 'banners' | 'coupons' | 'reports' | 'finance' | 'settings' | 'users'>('dashboard');
  const [orderFilterTab, setOrderFilterTab] = useState<'today' | 'all'>('today');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const toggleOrderExpand = (id: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };
  
  // Realtime Orders & Users & Analytics
  const [fbOrders, setFbOrders] = useState<FBOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [fbUsers, setFbUsers] = useState<FBUser[]>([]);
  const [todayViewers, setTodayViewers] = useState(0);
  const [viewingScreenshot, setViewingScreenshot] = useState<string | null>(null);
  
  useEffect(() => {
    
    if (!db) return;
    const q = query(collection(db, 'orders'), orderBy('orderDate', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as FBOrder));
      setFbOrders(data);
    });
    
    
    if (!db) return;
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const uData = snap.docs.map(d => ({ id: d.id, ...d.data() } as FBUser));
      setFbUsers(uData);
    });

    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    const today = (new Date(Date.now() - tzoffset)).toISOString().split('T')[0];
    
    if (!db) return;
    const unsubViews = onSnapshot(doc(db, 'analytics', today), (docSnap) => {
      if (docSnap.exists()) {
        setTodayViewers(docSnap.data()?.viewers || 0);
      }
    });

    return () => { unsub(); unsubUsers(); unsubViews(); };
  }, []);

  const handleUpdateStatus = async (ord: FBOrder, newStatus: string) => {
    try {
      if (!db) throw new Error("DB Error");
      await updateDoc(doc(db, 'orders', ord.id), { status: newStatus });
      
      const GOOGLE_SHEETS_WEBHOOK = "https://script.google.com/macros/s/AKfycbw216IALTpxTrWOw_pGvT_kd_tLIE7hFJYs8_LSt4zs2HoFhdGu-uKCAKm97WUcnz2z/exec";
      fetch(GOOGLE_SHEETS_WEBHOOK, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: "updateStatus",
          orderId: ord.orderId,
          status: newStatus,
          customerName: ord.customerName,
          phoneNumber: ord.customerPhone,
          address: ord.customerAddress,
          productDetails: (ord.cartItems || []).map((i: any) => `${i.title} (x${i.quantity})`).join(', '),
          totalPrice: ord.totalPayable,
          paymentMethod: ord.paymentMethod
        })
      }).catch(console.error);
    } catch (e) {
      console.error(e);
      alert('Failed to update status');
    }
  };

  const handleUpdateSettings = async (field: string, value: string) => {
    try {
      if (!db) throw new Error("DB Error");
      await setDoc(doc(db, 'settings', 'global'), { [field]: value }, { merge: true });
      alert('Setting updated successfully!');
    } catch(e) {
      console.error(e);
      alert('Failed to update setting. Are you sure you have permission?');
    }
  };

  // Products form state
  

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [isProductAddOpen, setIsProductAddOpen] = useState(false);
  const [productForm, setProductForm] = useState({
    id: '', name: '', price: '', originalPrice: '', costPrice: '', description: '', youtubeUrl: '', images: [] as string[], 
    hours: '0', minutes: '0', seconds: '0', 
    category: '', promoBadge: '', promoText: '',
    sizes: '', colors: '', stockOut: false, bestSeller: false, justForYou: false, offersPage: false
  });
  const [formError, setFormError] = useState('');
  const [toastMessage, setToastMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  const showToast = (text: string, type: 'success'|'error' = 'success') => {
    setToastMessage({text, type});
    setTimeout(() => setToastMessage(null), 3000);
  };

  
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingImage(true);
      const apiKey = import.meta.env.VITE_IMGBB_API_KEY || '50be96ff0f81d113824bb8d3df6c6328'; // Fallback key for demo purposes if needed
      
      const formData = new FormData();
      formData.append('image', file);
      
      try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        
        if (data.success && data.data && data.data.url) {
          setter(data.data.url);
        } else {
           // Fallback to base64 if api fails
           const reader = new FileReader();
           reader.onloadend = () => setter(reader.result as string);
           reader.readAsDataURL(file);
        }
      } catch (err) {
        console.error("ImgBB upload failed, falling back to Base64", err);
        const reader = new FileReader();
        reader.onloadend = () => setter(reader.result as string);
        reader.readAsDataURL(file);
      } finally {
        setIsUploadingImage(false);
      }
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.images || productForm.images.length === 0 || !productForm.images[0]) {
      setFormError('Please provide at least the main image (Image 1)');
      return;
    }
    setFormError('');
    
    // Calculate total timer seconds
    const totalTimerSeconds = (parseInt(productForm.hours) || 0) * 3600 + 
                              (parseInt(productForm.minutes) || 0) * 60 + 
                              (parseInt(productForm.seconds) || 0);

    const newProduct: Product = {
      ...(editingProduct || {
        sku: 'SKU-' + Math.floor(Math.random()*1000), brand: 'Brand', specifications: {}, benefits: [], origin: 'Local', stockStatus: 'In Stock'
      }),
      id: productForm.id || `prod-${Date.now()}`,
      name: productForm.name,
      price: Number(productForm.price),
      originalPrice: productForm.originalPrice ? Number(productForm.originalPrice) : undefined,
      costPrice: productForm.costPrice ? Number(productForm.costPrice) : undefined,
      description: productForm.description,
      images: productForm.images.filter(Boolean),
      youtubeUrl: productForm.youtubeUrl,
      category: productForm.category || 'all',
      timerSeconds: totalTimerSeconds > 0 ? totalTimerSeconds : undefined,
      discountMessage: productForm.promoBadge === 'custom' ? productForm.promoText : (productForm.promoBadge || undefined),
      sizes: productForm.sizes ? productForm.sizes.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      colors: productForm.colors ? productForm.colors.split(',').map(c => c.trim()).filter(Boolean) : undefined,
      stockOut: productForm.stockOut,
      bestSeller: productForm.bestSeller,
      justForYou: productForm.justForYou,
      offersPage: productForm.offersPage,
      stockStatus: productForm.stockOut ? 'Out of Stock' : 'In Stock'
    };

    try {
      if (!db) throw new Error("Database not connected.");
      // Firestore rejects any field whose value is `undefined` (e.g. an empty
      // timer, empty originalPrice/costPrice, empty sizes/colors). Strip those
      // out before writing, while keeping `newProduct` (with undefined) for
      // local state/UI use below.
      const firestoreSafeProduct = JSON.parse(JSON.stringify(newProduct));
      // Persist the product to Firestore so it saves permanently and syncs
      // to every visitor/device instead of only the local browser state.
      await setDoc(doc(db, 'products', newProduct.id), firestoreSafeProduct, { merge: true });

      // Optimistically update local state too so the admin sees it instantly
      // (Firestore's onSnapshot listener in App.tsx will also sync this shortly).
      if (editingProduct) {
        onUpdateProducts(products.map(p => p.id === newProduct.id ? newProduct : p));
      } else {
        onUpdateProducts([newProduct, ...products]);
      }
      showToast(editingProduct ? 'Product updated successfully!' : 'Product added successfully!');
      setIsProductAddOpen(false);
      setEditingProduct(null);
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Failed to save product. Are you sure you have permission?');
      showToast(err.message || 'Error saving product', 'error');
    }
  };

  const handleDeleteProduct = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setProductToDelete(id);
  };
  
  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      if (!db) throw new Error("DB Error");
      await deleteDoc(doc(db, 'products', productToDelete));
    } catch (error) {
      console.error("Failed to delete product from Firebase:", error);
    }
    onUpdateProducts(products.filter(p => p.id !== productToDelete));
    setProductToDelete(null);
  };
  
  // Settings state
  const [tempSupportNumber, setTempSupportNumber] = useState(supportNumber);
  const [tempEmail, setTempEmail] = useState('support@nexmart.bd');
  const [tempHelpline, setTempHelpline] = useState('01825000010');
  const [tempBkash, setTempBkash] = useState('01825000010');
  const [tempNagad, setTempNagad] = useState('01825000010');
  const [tempLogo, setTempLogo] = useState('');
  const [tempFavicon, setTempFavicon] = useState('');

  useEffect(() => {
    
    if (!db) return;
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.supportNumber) setTempSupportNumber(data.supportNumber);
        if (data.supportEmail) setTempEmail(data.supportEmail);
        if (data.helplineNumber) setTempHelpline(data.helplineNumber);
        if (data.bkashNumber) setTempBkash(data.bkashNumber);
        if (data.nagadNumber) setTempNagad(data.nagadNumber);
        if (data.logoUrl) setTempLogo(data.logoUrl);
        if (data.faviconUrl) setTempFavicon(data.faviconUrl);
      }
    });
    return () => unsub();
  }, []);

  // Banner state
  const [editingSlide, setEditingSlide] = useState<Slide | null>(null);
  const [isSlideAddOpen, setIsSlideAddOpen] = useState(false);
  const [slideForm, setSlideForm] = useState({ id: '', title: '', image: '', ctaText: 'Shop Now', colorTheme: 'from-blue-600 to-blue-900', targetUrl: '' });

  
  const handleSlideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const slideId = slideForm.id || `slide-${Date.now()}`;
    const newSlide: Slide = {
      id: slideId,
      title: slideForm.title,
      banglaTitle: slideForm.title,
      subtitle: '',
      badge: '',
      image: slideForm.image,
      ctaText: slideForm.ctaText,
      colorTheme: slideForm.colorTheme,
      targetUrl: slideForm.targetUrl
    };
    try {
      if (!db) throw new Error("Database not connected.");
      const firestoreSafeSlide = JSON.parse(JSON.stringify(newSlide));
      await setDoc(doc(db, 'banners', slideId), firestoreSafeSlide);
      setIsSlideAddOpen(false);
      setEditingSlide(null);
      setSlideForm({ id: '', title: '', image: '', ctaText: 'Shop Now', colorTheme: 'from-blue-600 to-blue-900', targetUrl: '' });
      showToast('Banner saved successfully!');
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Failed to save banner. Are you sure you have permission?');
      showToast(err.message || 'Error saving banner', 'error');
    }
  };


  // Category state
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isCategoryAddOpen, setIsCategoryAddOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ id: '', name: '', banglaName: '', icon: '' });

  
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const generateId = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const catId = categoryForm.id || generateId(categoryForm.name);
    
    const newCat: Category = {
      id: catId,
      name: categoryForm.name,
      banglaName: categoryForm.banglaName || '',
      icon: categoryForm.icon
    };
    try {
      if (!db) throw new Error("Database not connected.");
      await setDoc(doc(db, 'categories', catId), newCat);
      setIsCategoryAddOpen(false);
      setEditingCategory(null);
      setCategoryForm({ id: '', name: '', banglaName: '', icon: '' });
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error saving banner', 'error');
    }
  };


  // Analytics Engine
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekAgo = todayMidnight - (7 * 24 * 60 * 60 * 1000);
  const monthAgo = todayMidnight - (30 * 24 * 60 * 60 * 1000);
  
  const ordersLast24h = fbOrders.filter(o => {
    const orderTime = new Date(o.orderDate).getTime();
    return !isNaN(orderTime) && orderTime >= todayMidnight;
  });

  const orders7Days = fbOrders.filter(o => {
    const orderTime = new Date(o.orderDate).getTime();
    return !isNaN(orderTime) && orderTime >= weekAgo;
  });

  const orders30Days = fbOrders.filter(o => {
    const orderTime = new Date(o.orderDate).getTime();
    return !isNaN(orderTime) && orderTime >= monthAgo;
  });

  const calculateCompletedRevenue = (orderList) => {
    return orderList.filter(o => o.status === 'Completed').reduce((sum, o) => sum + (Number(o.totalPayable) || 0), 0);
  };
  
  const calculateTotalRevenue = (orderList) => {
    return orderList.filter(o => o.status !== 'Cancelled').reduce((sum, o) => sum + (Number(o.totalPayable) || 0), 0);
  };

  const calculateProfit = (orderList) => {
    return orderList.filter(o => o.status === 'Completed').reduce((orderSum, order) => {
      const itemsProfit = (order.cartItems || []).reduce((itemSum, item) => {
        // Match by productId if available, otherwise by title
        const prod = products.find(p => 
          (item.productId && p.id === item.productId) || 
          (item.title && p.name === item.title) || 
          (item.product && p.id === item.product.id)
        );
        
        // If we found the product, get its costPrice and selling price
        // Otherwise try to fallback to the item's saved price, and 0 for costPrice
        const sellPrice = prod ? Number(prod.price) : (Number(item.price || item.product?.price) || 0);
        const costPrice = prod ? Number(prod.costPrice) : 0;
        
        const profitPerItem = costPrice > 0 ? (sellPrice - costPrice) : 0;
        return itemSum + (profitPerItem * (Number(item.quantity) || 1));
      }, 0);
      return orderSum + itemsProfit;
    }, 0);
  };

  const revenue24h = calculateTotalRevenue(ordersLast24h);
  const revenue7Days = calculateTotalRevenue(orders7Days);
  const revenue30Days = calculateTotalRevenue(orders30Days);

  const profit24h = calculateProfit(ordersLast24h);
  const profit7Days = calculateProfit(orders7Days);
  const profit30Days = calculateProfit(orders30Days);

  // For top row
  const todayOrdersCount = ordersLast24h.length;
  const todayPendingCount = ordersLast24h.filter(o => o.status === 'Pending' || o.status === 'Pending Verification').length;
  const todayProcessingCount = ordersLast24h.filter(o => o.status === 'Processing').length;
  const todayCompletedCount = ordersLast24h.filter(o => o.status === 'Completed').length;
  const todayCancelledCount = ordersLast24h.filter(o => o.status === 'Cancelled').length;
  const todayReturnedCount = ordersLast24h.filter(o => o.status === 'Returned').length;
  
  const pendingCount = fbOrders.filter(o => o.status === 'Pending' || o.status === 'Pending Verification').length;
  const completedCount = fbOrders.filter(o => o.status === 'Completed').length;
  const cancelledCount = fbOrders.filter(o => o.status === 'Cancelled').length;
  const returnedCount = fbOrders.filter(o => o.status === 'Returned').length;
  
  const handleCopyOrderInfo = (ord: FBOrder) => {
    const textToCopy = `Name: ${ord.customerName}\nPhone: ${ord.customerPhone}\nAddress: ${ord.customerAddress}\nOrder ID: ${ord.orderId}`;
    navigator.clipboard.writeText(textToCopy);
    alert('Copied info to clipboard!');
  };

  // Sidebar Tabs Config
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'products', label: 'Products', icon: ShoppingBag },
    { id: 'categories', label: 'Categories', icon: Tag },
    { id: 'banners', label: 'Banners', icon: ImageIcon },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'coupons', label: 'Coupons (Pro)', icon: Settings },
    { id: 'reports', label: 'Reports (Pro)', icon: BarChart3 },
    { id: 'finance', label: 'Finance (Pro)', icon: DollarSign },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row relative">


      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onCloseSidebar} />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white text-gray-900">
          <h2 className="font-black text-lg text-blue-700 tracking-tight">Dashboard</h2>
          <button onClick={onCloseSidebar} className="p-2 hover:bg-gray-100 rounded-full md:hidden text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isPro = tab.label.includes('(Pro)');
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); onCloseSidebar(); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === tab.id 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className="flex-1 text-left">{tab.label.replace(' (Pro)', '')}</span>
                {isPro && (
                  <span className="text-[9px] uppercase tracking-wider font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
                    PRO
                  </span>
                )}
              </button>
            )
          })}
        </div>
        
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-700" />
            <p className="text-xs font-mono text-gray-500">Security Gate Active</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 h-screen overflow-y-auto p-4 md:p-6 bg-gray-50">
        
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <h2 className="text-2xl font-black text-gray-800">Enterprise Dashboard</h2>
            
            {/* Top Row: Order Status Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Today's Orders</p>
                <p className="text-2xl font-black text-gray-800 mt-1">{todayOrdersCount}</p>
                <p className="text-[10px] text-gray-400 mt-1">Total placed today</p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-xs text-[#FF6B00] font-bold uppercase tracking-wider">Today's Pending</p>
                <p className="text-2xl font-black text-gray-800 mt-1">{todayPendingCount}</p>
                <p className="text-[10px] text-gray-400 mt-1">Requires action</p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-xs text-purple-500 font-bold uppercase tracking-wider">Today's Processing</p>
                <p className="text-2xl font-black text-gray-800 mt-1">{todayProcessingCount}</p>
                <p className="text-[10px] text-gray-400 mt-1">In progress</p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-xs text-blue-500 font-bold uppercase tracking-wider">Today's Completed</p>
                <p className="text-2xl font-black text-gray-800 mt-1">{todayCompletedCount}</p>
                <p className="text-[10px] text-gray-400 mt-1">Delivered</p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-xs text-red-500 font-bold uppercase tracking-wider">Today's Cancelled</p>
                <p className="text-2xl font-black text-gray-800 mt-1">{todayCancelledCount}</p>
                <p className="text-[10px] text-gray-400 mt-1">Cancelled</p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-xs text-rose-600 font-bold uppercase tracking-wider">Today's Returned</p>
                <p className="text-2xl font-black text-gray-800 mt-1">{todayReturnedCount}</p>
                <p className="text-[10px] text-gray-400 mt-1">Returned items</p>
              </div>
            </div>

            {/* Bottom Row: Financial & Revenue Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                   <DollarSign className="w-16 h-16 text-blue-600" />
                 </div>
                 <div>
                   <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Today's Finance</p>
                   <div className="mt-2">
                     <p className="text-[10px] text-gray-400 uppercase font-semibold">Revenue</p>
                     <p className="text-2xl font-black text-gray-800">৳{revenue24h.toLocaleString('en-US')}</p>
                   </div>
                   <div className="mt-2">
                     <p className="text-[10px] text-blue-600 uppercase font-semibold">Net Profit (Completed)</p>
                     <p className="text-xl font-black text-blue-600">৳{profit24h.toLocaleString('en-US')}</p>
                   </div>
                 </div>
               </div>
               <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                   <BarChart3 className="w-16 h-16 text-blue-600" />
                 </div>
                 <div>
                   <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">7-Day Finance</p>
                   <div className="mt-2">
                     <p className="text-[10px] text-gray-400 uppercase font-semibold">Revenue</p>
                     <p className="text-2xl font-black text-gray-800">৳{revenue7Days.toLocaleString('en-US')}</p>
                   </div>
                   <div className="mt-2">
                     <p className="text-[10px] text-blue-600 uppercase font-semibold">Net Profit (Completed)</p>
                     <p className="text-xl font-black text-blue-600">৳{profit7Days.toLocaleString('en-US')}</p>
                   </div>
                 </div>
               </div>
               <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                   <BarChart3 className="w-16 h-16 text-purple-600" />
                 </div>
                 <div>
                   <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">30-Day Finance</p>
                   <div className="mt-2">
                     <p className="text-[10px] text-gray-400 uppercase font-semibold">Revenue</p>
                     <p className="text-2xl font-black text-gray-800">৳{revenue30Days.toLocaleString('en-US')}</p>
                   </div>
                   <div className="mt-2">
                     <p className="text-[10px] text-purple-600 uppercase font-semibold">Net Profit (Completed)</p>
                     <p className="text-xl font-black text-purple-600">৳{profit30Days.toLocaleString('en-US')}</p>
                   </div>
                 </div>
               </div>
            </div>

            {/* Absolute Bottom Row: Operational Metrics */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-indigo-500 font-bold uppercase tracking-wider">Today's Users</p>
                  <p className="text-2xl font-black text-gray-800 mt-1">
                    {fbUsers.filter(u => {
                      if(!u.joinDate) return false;
                      const d = new Date(u.joinDate);
                      const tzoffset = d.getTimezoneOffset() * 60000;
                      const localDate = new Date(d.getTime() - tzoffset).toISOString().split('T')[0];
                      const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
                      return localDate === today;
                    }).length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center">
                  <Users className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
              
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-500 font-bold uppercase tracking-wider">Today's Viewers</p>
                  <p className="text-2xl font-black text-gray-800 mt-1">{todayViewers}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="space-y-4 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
              <h2 className="text-2xl font-black text-gray-800">Order Ledger</h2>
              <div className="flex bg-gray-200 p-1 rounded-xl">
                <button
                  onClick={() => setOrderFilterTab('today')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${orderFilterTab === 'today' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Today's Orders
                </button>
                <button
                  onClick={() => setOrderFilterTab('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${orderFilterTab === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  All Orders
                </button>
              </div>
            </div>
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search Live by Order ID (e.g. #5429)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-gray-200 p-4 pl-12 rounded-2xl text-sm font-semibold shadow-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            
            <div className="space-y-4">
              {(orderFilterTab === 'today' ? ordersLast24h : fbOrders).length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
                  <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 font-semibold">No orders found.</p>
                </div>
              ) : 
                (orderFilterTab === 'today' ? ordersLast24h : fbOrders).filter(ord => ord.orderId.toLowerCase().includes(searchQuery.toLowerCase())).map((ord, index, arr) => (
                <React.Fragment key={ord.id}>
                  <div className="border border-gray-200 p-3 sm:p-4 rounded-xl space-y-0 bg-white shadow-sm hover:shadow-md transition-shadow relative">
                    {/* Visual Order Block */}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-blue-800 text-lg bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">{ord.orderId}</span>
                      <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${
                        ord.status === 'Pending' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                        ord.status === 'Processing' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        ord.status === 'Completed' ? 'bg-green-100 text-green-800 border-green-200' :
                        ord.status === 'Returned' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                        'bg-red-100 text-red-800 border-red-200'
                      }`}>{ord.status}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-500 hidden sm:flex items-center gap-1"><Clock className="w-3.5 h-3.5"/> {new Date(ord.orderDate).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      <button 
                        onClick={() => toggleOrderExpand(ord.id)}
                        className="px-4 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1 shadow-sm"
                      >
                        {expandedOrders.has(ord.id) ? 'Hide Details' : 'View More'}
                      </button>
                    </div>
                  </div>
                  
                  {expandedOrders.has(ord.id) && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }} 
                      animate={{ opacity: 1, height: 'auto' }} 
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mt-4"
                    >
                      <div className="pt-4 border-t border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                          <div className="space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div className="flex justify-between items-center mb-2">
                              <p className="text-[10px] uppercase font-black text-gray-500 tracking-wider flex items-center gap-1"><Users className="w-3 h-3"/> Buyer Details</p>
                              <button onClick={() => handleCopyOrderInfo(ord)} className="px-2 py-1 bg-white border border-gray-200 rounded text-[10px] font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
                                Copy Info
                              </button>
                            </div>
                            <p className="text-base font-black text-gray-900">{ord.customerName}</p>
                            <p className="text-sm font-mono text-[#2563EB] font-bold">{ord.customerPhone}</p>
                            <p className="text-xs text-gray-600 font-medium leading-relaxed">{ord.customerAddress}</p>
                            {ord.orderNotes && <p className="text-xs text-amber-800 bg-amber-100/50 p-2 rounded-lg border border-amber-200/50 mt-2 font-medium">Note: {ord.orderNotes}</p>}
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] uppercase font-black text-gray-500 tracking-wider flex items-center gap-1"><ShoppingBag className="w-3 h-3"/> Items</p>
                            <div className="space-y-1.5">
                              {ord.cartItems && ord.cartItems.map((item, idx) => {
                                const title = item.title || item.product?.name || 'Unknown Item';
                                const price = item.price || item.product?.price || 0;
                                return (
                                  <div key={idx} className="flex justify-between items-start text-sm">
                                    <span className="font-semibold text-gray-800 pr-2">{title} <span className="text-gray-500">x{item.quantity}</span></span>
                                    <span className="font-bold text-gray-900 whitespace-nowrap">৳{price * item.quantity}</span>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="flex justify-between items-center border-t border-gray-100 pt-2 mt-2">
                              <span className="text-xs font-bold text-gray-500">Payment: {ord.paymentMethod === 'cod' ? 'COD' : ord.paymentMethod}</span>
                              <span className="text-base font-black text-blue-700">Total: ৳{ord.totalPayable}</span>
                            </div>
                            
                            {ord.paymentMethod === 'online' && ord.paymentScreenshotRef && (
                              <div className="mt-3">
                                <button 
                                  onClick={() => setViewingScreenshot(ord.paymentScreenshotRef!)} 
                                  className="w-full flex items-center justify-center gap-2 text-xs font-black text-white bg-indigo-600 px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
                                >
                                  <ImageIcon className="w-4 h-4" /> View Payment Screenshot
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* 4-Stage Status Control */}
                        <div className="flex gap-2 pt-3 border-t border-gray-100 flex-wrap">
                          <button onClick={() => handleUpdateStatus(ord, 'Pending')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${ord.status === 'Pending' ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Pending</button>
                          <button onClick={() => handleUpdateStatus(ord, 'Processing')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${ord.status === 'Processing' ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Processing</button>
                          <button onClick={() => handleUpdateStatus(ord, 'Completed')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${ord.status === 'Completed' ? 'bg-green-500 text-white shadow-md shadow-green-500/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Completed</button>
                          <button onClick={() => handleUpdateStatus(ord, 'Cancelled')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${ord.status === 'Cancelled' ? 'bg-red-500 text-white shadow-md shadow-red-500/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Cancelled</button>
                          <button onClick={() => handleUpdateStatus(ord, 'Returned')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${ord.status === 'Returned' ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Returned</button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
                {/* Visual Isolation Partition */}
                {index !== arr.length - 1 && (
                  <div className="h-6 w-full flex items-center justify-center opacity-50">
                    <div className="w-full border-t-2 border-dashed border-gray-300"></div>
                  </div>
                )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <h2 className="text-xl font-black text-gray-900 mb-6">Registered Users</h2>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase font-black text-[10px] tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Phone</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Join Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {fbUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-bold text-gray-900">{user.name}</td>
                        <td className="px-6 py-4 font-mono font-medium text-gray-600">{user.phone}</td>
                        <td className="px-6 py-4 text-gray-500">{user.email}</td>
                        <td className="px-6 py-4 text-xs font-medium text-gray-400">
                          {user.joinDate ? new Date(user.joinDate).toLocaleString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-gray-800">Products Engine</h2>
              <button onClick={() => {
                setProductForm({ 
                  id: `prod-${Date.now()}`, name: '', price: '', originalPrice: '', costPrice: '', description: '', youtubeUrl: '', images: [] as string[], 
                  hours: '0', minutes: '0', seconds: '0', category: '', promoBadge: '', promoText: '', sizes: '', colors: '', stockOut: false, bestSeller: true, justForYou: true, offersPage: true
                });
                setEditingProduct(null);
                setFormError('');
                setIsProductAddOpen(true);
              }} className="bg-[#2563EB] hover:bg-[#e47a1c] text-white px-4 py-2 rounded-xl text-sm font-black flex items-center gap-2 shadow-md transition-colors">
                <PlusCircle className="w-5 h-5" /> Add Product
              </button>
            </div>

            {isProductAddOpen && (
              <form onSubmit={handleProductSubmit} className="bg-white p-6 border border-gray-200 rounded-3xl shadow-sm space-y-5 relative">
                <button type="button" onClick={() => setIsProductAddOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full">
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-xl font-black text-gray-800">{editingProduct ? 'Edit Product' : 'Create New Product'}</h3>
                
                {formError && <p className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl border border-red-100">{formError}</p>}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Product Name</label>
                    <input required type="text" placeholder="E.g. Apple Watch Series 9" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-500 focus:bg-white transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Selling Price (৳)</label>
                    <input required type="number" placeholder="E.g. 1100" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-500 focus:bg-white transition-colors" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">Strikeout (৳)</label>
                      <input type="number" placeholder="E.g. 1250" value={productForm.originalPrice} onChange={e => setProductForm({...productForm, originalPrice: e.target.value})} className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-500 focus:bg-white transition-colors" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">Cost Price (৳)</label>
                      <input type="number" placeholder="E.g. 800" value={productForm.costPrice} onChange={e => setProductForm({...productForm, costPrice: e.target.value})} className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-500 focus:bg-white transition-colors" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Category (Dynamic)</label>
                    <select value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})} className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-500 focus:bg-white transition-colors">
                      <option value="">Select Category (Optional)</option>
                      <option value="all">All / Default</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-1 md:col-span-2 border border-gray-200 rounded-2xl p-4 bg-gray-50/50 space-y-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">Main Image (Featured)</label>
                      <div className="space-y-1">
                        <input type="text" placeholder="URL or Base64..." value={productForm.images?.[0] || ''} onChange={e => {
                          const newImages = [...(productForm.images || [])];
                          newImages[0] = e.target.value;
                          setProductForm({...productForm, images: newImages});
                        }} className="w-full border border-gray-200 bg-white p-2 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500" />
                        <input type="file" accept="image/*" onChange={e => handleImageUpload(e, (val) => {
                          const newImages = [...(productForm.images || [])];
                          newImages[0] = val;
                          setProductForm({...productForm, images: newImages});
                        })} className="text-[10px] text-gray-500" />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-gray-500">Gallery Images</label>
                        <button type="button" onClick={() => {
                          const newImages = [...(productForm.images || [])];
                          newImages.push('');
                          setProductForm({...productForm, images: newImages});
                        }} className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"><PlusCircle className="w-3 h-3"/> Add Image</button>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {productForm.images?.map((img, idx) => {
                          if (idx === 0) return null; // skip main
                          return (
                            <div key={idx} className="relative border border-gray-200 p-2 rounded-lg bg-white space-y-1">
                              <button type="button" onClick={() => {
                                const newImages = [...(productForm.images || [])];
                                newImages.splice(idx, 1);
                                setProductForm({...productForm, images: newImages});
                              }} className="absolute -top-2 -right-2 bg-red-100 text-red-500 p-1 rounded-full hover:bg-red-200"><X className="w-3 h-3"/></button>
                              <span className="text-[10px] font-bold text-gray-400">Image {idx + 1}</span>
                              <input type="text" placeholder="URL or Base64..." value={img} onChange={e => {
                                const newImages = [...(productForm.images || [])];
                                newImages[idx] = e.target.value;
                                setProductForm({...productForm, images: newImages});
                              }} className="w-full border border-gray-200 bg-gray-50 p-1.5 rounded text-xs focus:outline-none focus:border-blue-500" />
                              <input type="file" accept="image/*" onChange={e => handleImageUpload(e, (val) => {
                                const newImages = [...(productForm.images || [])];
                                newImages[idx] = val;
                                setProductForm({...productForm, images: newImages});
                              })} className="text-[10px] text-gray-500 w-full" />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">Product Description</label>
                  <textarea placeholder="Product Description... (Optional)" value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl text-sm font-semibold h-24 resize-none focus:outline-none focus:border-blue-500 focus:bg-white transition-colors" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Sizes (comma separated) - Optional</label>
                    <input type="text" placeholder="e.g. S, M, L, XL" value={productForm.sizes} onChange={e => setProductForm({...productForm, sizes: e.target.value})} className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-500 focus:bg-white transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Colors (comma separated) - Optional</label>
                    <input type="text" placeholder="e.g. Red, Blue, Black" value={productForm.colors} onChange={e => setProductForm({...productForm, colors: e.target.value})} className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-500 focus:bg-white transition-colors" />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={productForm.bestSeller} onChange={e => setProductForm({...productForm, bestSeller: e.target.checked})} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 accent-blue-600" />
                    <span className="text-sm font-bold text-blue-900">Show in Premium Products</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={productForm.justForYou} onChange={e => setProductForm({...productForm, justForYou: e.target.checked})} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 accent-blue-600" />
                    <span className="text-sm font-bold text-blue-900">Show in Just For You</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={productForm.offersPage} onChange={e => setProductForm({...productForm, offersPage: e.target.checked})} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 accent-blue-600" />
                    <span className="text-sm font-bold text-blue-900">Show in Offers Page</span>
                  </label>
                </div>

                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                  <input type="checkbox" id="stockOutToggle" checked={productForm.stockOut} onChange={e => setProductForm({...productForm, stockOut: e.target.checked})} className="w-4 h-4 text-red-600 rounded focus:ring-red-500" />
                  <label htmlFor="stockOutToggle" className="text-sm font-bold text-red-700 cursor-pointer select-none">Mark as Stock Out</label>
                </div>
                
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">YouTube Review Link URL (Optional)</label>
                  <input type="text" placeholder="https://youtube.com/watch?v=..." value={productForm.youtubeUrl} onChange={e => setProductForm({...productForm, youtubeUrl: e.target.value})} className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl text-sm font-semibold focus:outline-none focus:border-red-500 focus:bg-white transition-colors" />
                  <p className="text-[10px] text-gray-400 mt-1">If left blank, video section auto-hides.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-amber-200 bg-amber-50 rounded-2xl p-4">
                    <label className="text-xs font-black text-amber-800 block mb-3 flex items-center gap-1"><Clock className="w-4 h-4"/> Flash Sale Timer</label>
                    {isUploadingImage && <div className="text-sm font-bold text-blue-600 mb-2">Uploading image...</div>}
                <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-amber-700 block mb-1">Hours</label>
                        <input type="number" min="0" value={productForm.hours} onChange={e => setProductForm({...productForm, hours: e.target.value})} className="w-full border border-amber-200 p-2 rounded-lg text-sm text-center font-mono font-bold focus:outline-none focus:border-[#FF6B00]" />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-amber-700 block mb-1">Minutes</label>
                        <input type="number" min="0" max="59" value={productForm.minutes} onChange={e => setProductForm({...productForm, minutes: e.target.value})} className="w-full border border-amber-200 p-2 rounded-lg text-sm text-center font-mono font-bold focus:outline-none focus:border-[#FF6B00]" />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-amber-700 block mb-1">Seconds</label>
                        <input type="number" min="0" max="59" value={productForm.seconds} onChange={e => setProductForm({...productForm, seconds: e.target.value})} className="w-full border border-amber-200 p-2 rounded-lg text-sm text-center font-mono font-bold focus:outline-none focus:border-[#FF6B00]" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="border border-blue-200 bg-blue-50 rounded-2xl p-4">
                    <label className="text-xs font-black text-blue-800 block mb-3 flex items-center gap-1"><Tag className="w-4 h-4"/> Promotion Badge</label>
                    <select value={productForm.promoBadge} onChange={e => setProductForm({...productForm, promoBadge: e.target.value})} className="w-full border border-blue-200 p-2.5 rounded-xl text-sm font-bold bg-white focus:outline-none focus:border-blue-500 mb-2">
                      <option value="">None</option>
                      <option value="Best Seller">Best Seller</option>
                      <option value="Top Selling">Top Selling</option>
                      <option value="Save 10%">Save 10%</option>
                      <option value="Save 20%">Save 20%</option>
                      <option value="custom">Custom Text...</option>
                    </select>
                    {productForm.promoBadge === 'custom' && (
                      <input type="text" placeholder="Custom Promo Text" value={productForm.promoText} onChange={e => setProductForm({...productForm, promoText: e.target.value})} className="w-full border border-blue-200 p-2.5 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-500" />
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button type="submit" className="bg-[#1E3A8A] hover:bg-[#00472e] text-white px-8 py-3 rounded-xl text-sm font-black shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2">
                    <Save className="w-4 h-4"/> Save Product
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {products.map(p => (
                <div key={p.id} className="border border-gray-200 bg-white p-3 rounded-2xl flex gap-4 items-center shadow-sm hover:shadow-md transition-shadow group">
                  <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 relative">
                    <img onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/f3f4f6/a1a1aa?text=No+Image'; (e.target as HTMLImageElement).onerror = null; }} src={p.images[0]} className="w-full h-full object-cover" alt={p.name} />
                    {p.discountMessage && (
                      <div className={`absolute top-0 right-0 text-white text-[8px] font-black px-1.5 py-0.5 rounded-bl-lg z-10 border ${getBadgeStyles(p.discountMessage)}`}>
                        {p.discountMessage}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 py-1">
                    <h4 className="font-bold text-sm text-gray-900 truncate">{p.name}</h4>
                    <p className="text-xs font-mono font-bold text-blue-600 mt-0.5">৳{p.price}</p>
                    <p className="text-[10px] font-semibold text-gray-400 mt-1 uppercase tracking-wider">{p.category}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => {
                      const totalSecs = p.timerSeconds || 0;
                      const h = Math.floor(totalSecs / 3600);
                      const m = Math.floor((totalSecs % 3600) / 60);
                      const s = totalSecs % 60;
                      
                      setEditingProduct(p);
                      setProductForm({
                        id: p.id, name: p.name, price: p.price.toString(), 
                        originalPrice: p.originalPrice ? p.originalPrice.toString() : '',
                        costPrice: p.costPrice ? p.costPrice.toString() : '',
                        description: p.description, 
                        images: [...(p.images || [])], 
                        youtubeUrl: p.youtubeUrl || '', 
                        category: p.category || 'all',
                        hours: h.toString(), minutes: m.toString(), seconds: s.toString(),
                        promoBadge: p.discountMessage ? 'custom' : '', 
                        promoText: p.discountMessage || '',
                        sizes: p.sizes ? p.sizes.join(', ') : '',
                        colors: p.colors ? p.colors.join(', ') : '',
                        stockOut: p.stockOut || p.stockStatus === 'Out of Stock' || false,
                        bestSeller: p.bestSeller || false,
                        justForYou: p.justForYou || false,
                        offersPage: p.offersPage || false
                      });
                      setIsProductAddOpen(true);
                    }} className="p-2 bg-gray-50 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4"/>
                    </button>
                    <button onClick={(e) => handleDeleteProduct(p.id, e)} className="p-2 bg-gray-50 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BANNERS TAB */}
        {activeTab === 'banners' && (
          <div className="space-y-6 max-w-5xl mx-auto">
             <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-gray-800">Hero Banners</h2>
              <button onClick={() => {
                setSlideForm({ id: `slide-${Date.now()}`, title: '', image: '', ctaText: 'Shop Now', colorTheme: 'from-blue-600 to-blue-900', targetUrl: '' });
                setEditingSlide(null);
                setFormError('');
                setIsSlideAddOpen(true);
              }} className="bg-[#2563EB] text-white px-4 py-2 rounded-xl text-sm font-black flex items-center gap-2 shadow-md">
                <PlusCircle className="w-5 h-5" /> Add Banner
              </button>
            </div>
            
            {isSlideAddOpen && (
              <form onSubmit={handleSlideSubmit} className="bg-white p-5 border border-gray-200 rounded-2xl shadow-sm space-y-4">
                <input type="text" placeholder="Banner Title (Optional)" value={slideForm.title} onChange={e => setSlideForm({...slideForm, title: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-gray-50" />

                <div className="space-y-1">
                  <input type="text" placeholder="Banner Image URL or Base64..." value={slideForm.image} onChange={e => setSlideForm({...slideForm, image: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-gray-50" />
                  <input type="file" accept="image/*" onChange={e => handleImageUpload(e, (val) => setSlideForm({...slideForm, image: val}))} className="text-xs text-gray-500" />
                </div>
                {isUploadingImage && <div className="text-sm font-bold text-blue-600 mb-2">Uploading image...</div>}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500">Click Action (Optional)</label>
                  <input type="text" placeholder="Product ID to open on click, or a full https:// link" value={slideForm.targetUrl} onChange={e => setSlideForm({...slideForm, targetUrl: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-gray-50" />
                  <p className="text-[11px] text-gray-400">Leave blank to just open the "All Products" page when tapped.</p>
                </div>

                {formError && <div className="text-sm font-bold text-red-600">{formError}</div>}
                <div className="flex gap-2">
                  <button type="submit" className="bg-[#1E3A8A] text-white px-6 py-2.5 rounded-xl text-sm font-black">Save Banner</button>
                  <button type="button" onClick={() => setIsSlideAddOpen(false)} className="bg-gray-100 text-gray-600 px-6 py-2.5 rounded-xl text-sm font-bold">Cancel</button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {slides.map(s => (
                <div key={s.id} className="border border-gray-200 bg-white p-4 rounded-2xl relative overflow-hidden group shadow-sm">
                  <img onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/f3f4f6/a1a1aa?text=No+Image'; (e.target as HTMLImageElement).onerror = null; }} src={s.image} className="w-full h-40 object-cover rounded-xl" />
                  <div className="absolute top-6 right-6 flex gap-2">
                    <button onClick={() => {
                      setEditingSlide(s);
                      setSlideForm({ ...(s as any), targetUrl: (s as any).targetUrl || '' });
                      setFormError('');
                      setIsSlideAddOpen(true);
                    }} className="p-2 bg-white/90 backdrop-blur shadow-sm rounded-lg text-blue-600 hover:bg-white"><Edit2 className="w-4 h-4"/></button>
                    <button onClick={async () => {
    if(confirm('Delete banner?')) {
      try {
        await deleteDoc(doc(db, 'banners', s.id));
        showToast('Banner deleted successfully');
      } catch(err) {
        console.error(err);
      }
    }
  }} className="p-2 bg-white/90 backdrop-blur shadow-sm rounded-lg text-red-500 hover:bg-white"><Trash2 className="w-4 h-4"/></button>
                  </div>
                  <p className="font-bold text-base mt-3 text-gray-800">{s.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CATEGORIES TAB */}
        {activeTab === 'categories' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-gray-800">Dynamic Categories</h2>
              <button onClick={() => {
                setCategoryForm({ id: `cat-${Date.now()}`, name: '', banglaName: '', icon: '' });
                setEditingCategory(null);
                setIsCategoryAddOpen(true);
              }} className="bg-[#2563EB] text-white px-4 py-2 rounded-xl text-sm font-black flex items-center gap-2 shadow-md">
                <PlusCircle className="w-5 h-5" /> Add Category
              </button>
            </div>
            
            {isCategoryAddOpen && (
              <form onSubmit={handleCategorySubmit} className="bg-white p-5 border border-gray-200 rounded-2xl shadow-sm space-y-4">
                <input required type="text" placeholder="Category ID (e.g. fashion)" value={categoryForm.id} onChange={e => setCategoryForm({...categoryForm, id: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-gray-50" />
                <input required type="text" placeholder="Display Name" value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-gray-50" />
                
                <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/50">
                  <label className="text-xs font-bold text-gray-500 block mb-2">Category Icon Image (URL or Upload)</label>
                  <div className="flex gap-2 mb-2">
                    <input type="text" placeholder="https://... image URL" value={categoryForm.icon} onChange={e => setCategoryForm({...categoryForm, icon: e.target.value})} className="flex-1 border border-gray-200 p-2.5 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white" />
                  </div>
                  <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50/30 transition-colors group cursor-pointer flex flex-col items-center justify-center">
                    <input type="file" accept="image/*" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if(file){
                        const reader = new FileReader();
                        reader.onloadend = () => setCategoryForm({...categoryForm, icon: reader.result as string});
                        reader.readAsDataURL(file);
                      }
                    }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <ImageIcon className="w-6 h-6 text-gray-400 group-hover:text-blue-500 mb-1" />
                    <span className="text-xs text-gray-500 font-semibold group-hover:text-blue-600">Click to Upload Local File</span>
                  </div>
                  {categoryForm.icon && (
                    <div className="mt-2 flex justify-center">
                      <img onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/f3f4f6/a1a1aa?text=No+Image'; (e.target as HTMLImageElement).onerror = null; }} src={categoryForm.icon} alt="Preview" className="w-12 h-12 rounded-full border border-gray-200 bg-white object-cover" />
                    </div>
                  )}
                </div>
                {isUploadingImage && <div className="text-sm font-bold text-blue-600 mb-2">Uploading image...</div>}
                <div className="flex gap-2">
                  <button type="submit" className="bg-[#1E3A8A] text-white px-6 py-2.5 rounded-xl text-sm font-black">Save Category</button>
                  <button type="button" onClick={() => setIsCategoryAddOpen(false)} className="bg-gray-100 text-gray-600 px-6 py-2.5 rounded-xl text-sm font-bold">Cancel</button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {categories.map(c => (
                <div key={c.id} className="border border-gray-200 bg-white p-4 rounded-2xl flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
                  <img onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/f3f4f6/a1a1aa?text=No+Image'; (e.target as HTMLImageElement).onerror = null; }} src={c.icon} className="w-12 h-12 rounded-full object-cover bg-gray-100" />
                  <div className="flex-grow min-w-0">
                    <p className="font-bold text-sm text-gray-800 truncate">{c.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono truncate">{c.id}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => {
                      setEditingCategory(c);
                      setCategoryForm(c as any);
                      setIsCategoryAddOpen(true);
                    }} className="text-gray-400 hover:text-blue-600 p-1"><Edit2 className="w-4 h-4"/></button>
                    <button onClick={() => onUpdateCategories(categories.filter(x => x.id !== c.id))} className="text-gray-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <h2 className="text-2xl font-black text-gray-800">Global System Settings</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 border border-gray-200 rounded-2xl bg-white shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-2">
                  <img onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/f3f4f6/a1a1aa?text=No+Image'; (e.target as HTMLImageElement).onerror = null; }} src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" className="w-5 h-5" alt="WA" />
                </div>
                <label className="text-xs font-bold text-gray-500 block">WhatsApp Alert Number</label>
                <input 
                  type="text" 
                  value={tempSupportNumber} 
                  onChange={e => setTempSupportNumber(e.target.value)}
                  className="w-full border border-gray-200 p-3 rounded-xl text-sm font-mono focus:outline-none focus:border-blue-500 bg-gray-50"
                />
                <button 
                  onClick={() => {
                    onUpdateSupportNumber(tempSupportNumber);
                    handleUpdateSettings('supportNumber', tempSupportNumber);
                  }}
                  className="w-full bg-[#1E3A8A] hover:bg-[#00472e] text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-colors"
                >
                  <Save className="w-4 h-4" /> Save WhatsApp
                </button>
              </div>

              <div className="p-5 border border-gray-200 rounded-2xl bg-white shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <label className="text-xs font-bold text-gray-500 block">Support Email Address</label>
                <input 
                  type="email" 
                  value={tempEmail} 
                  onChange={e => setTempEmail(e.target.value)}
                  className="w-full border border-gray-200 p-3 rounded-xl text-sm font-mono focus:outline-none focus:border-blue-500 bg-gray-50"
                />
                <button 
                  onClick={() => handleUpdateSettings('supportEmail', tempEmail)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-colors"
                >
                  <Save className="w-4 h-4" /> Save Email
                </button>
              </div>

              {/* Logo & Favicon */}
              <div className="p-5 border border-gray-100 rounded-2xl bg-white shadow-sm space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="font-bold text-gray-800">Website Branding</h3>
                </div>
                
                <input type="text" placeholder="Target URL or Product ID (Optional)" value={slideForm.targetUrl || ''} onChange={e => setSlideForm({...slideForm, targetUrl: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-gray-50" />
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 block">Logo Base64/URL</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={tempLogo} 
                      onChange={e => setTempLogo(e.target.value)}
                      className="w-full border border-gray-200 p-3 rounded-xl text-sm font-mono focus:outline-none focus:border-blue-500 bg-gray-50"
                      placeholder="Paste Image URL or Upload below"
                    />
                  </div>
                  <input type="file" accept="image/*" onChange={e => handleImageUpload(e, (val) => setTempLogo(val))} className="text-xs text-gray-500" />
                  <button 
                    onClick={() => handleUpdateSettings('logoUrl', tempLogo)}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-colors mt-2"
                  >
                    <Save className="w-4 h-4" /> Save Logo
                  </button>
                </div>

                <div className="space-y-1 mt-6">
                  <label className="text-xs font-bold text-gray-500 block">Favicon Base64/URL</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={tempFavicon} 
                      onChange={e => setTempFavicon(e.target.value)}
                      className="w-full border border-gray-200 p-3 rounded-xl text-sm font-mono focus:outline-none focus:border-blue-500 bg-gray-50"
                      placeholder="Paste Icon URL or Upload below"
                    />
                  </div>
                  <input type="file" accept="image/*" onChange={e => handleImageUpload(e, (val) => setTempFavicon(val))} className="text-xs text-gray-500" />
                  <button 
                    onClick={() => handleUpdateSettings('faviconUrl', tempFavicon)}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-colors mt-2"
                  >
                    <Save className="w-4 h-4" /> Save Favicon
                  </button>
                </div>
              </div>
              
              <div className="p-5 border border-gray-200 rounded-2xl bg-white shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mb-2">
                  <Phone className="w-5 h-5 text-amber-600" />
                </div>
                <label className="text-xs font-bold text-gray-500 block">Helpline Number</label>
                <input 
                  type="text" 
                  value={tempHelpline} 
                  onChange={e => setTempHelpline(e.target.value)}
                  className="w-full border border-gray-200 p-3 rounded-xl text-sm font-mono focus:outline-none focus:border-blue-500 bg-gray-50"
                />
                <button 
                  onClick={() => handleUpdateSettings('helplineNumber', tempHelpline)}
                  className="w-full bg-[#2563EB] hover:bg-[#e47a1c] text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-colors"
                >
                  <Save className="w-4 h-4" /> Save Helpline
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PLACEHOLDERS (Future Upgrades) */}
        {activeTab === 'coupons' && (
          <div className="max-w-3xl mx-auto text-center py-20">
            <div className="w-24 h-24 bg-gray-100 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-inner border border-gray-200">
               {activeTab === 'coupons' && <Tag className="w-10 h-10 text-gray-400" />}
               {activeTab === 'reports' && <BarChart3 className="w-10 h-10 text-gray-400" />}
               {activeTab === 'finance' && <DollarSign className="w-10 h-10 text-gray-400" />}
            </div>
            <h2 className="text-2xl font-black text-gray-800 mb-2 capitalize">{activeTab} Module (Pro)</h2>
            <p className="text-sm text-gray-500 font-medium max-w-md mx-auto leading-relaxed">
              This module's UI layout is ready. The backend logic is currently a <code className="bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-mono text-xs">// Future Upgrade Placeholder</code> to keep the app ultra-fast and lightweight.
            </p>
            <button className="mt-8 bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-black shadow-lg">
              Upgrade to Unlock
            </button>
          </div>
        )}

        {/* REPORTS TAB */}
        {activeTab === 'reports' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <h2 className="text-2xl font-black text-gray-800">Weekly Sales Velocity</h2>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex h-64 items-end gap-2 sm:gap-4 mt-8 pb-4 border-b border-gray-100">
                {[40, 70, 45, 90, 60, 100, 85].map((val, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-2 group cursor-crosshair">
                    <div className="w-full bg-blue-100 hover:bg-blue-200 rounded-t-lg relative transition-all duration-300" style={{ height: `${val}%` }}>
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        {val}%
                      </div>
                    </div>
                    <span className="text-xs font-bold text-gray-400">Day {i+1}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500 font-medium text-center mt-4">CSS-based responsive analytical graph placeholder.</p>
            </div>
          </div>
        )}

        {/* FINANCE TAB */}
        {activeTab === 'finance' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <h2 className="text-2xl font-black text-gray-800">Finance & Payment Integration</h2>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
              <div className="space-y-4 max-w-md">
                <input type="text" placeholder="Target URL or Product ID (Optional)" value={slideForm.targetUrl || ''} onChange={e => setSlideForm({...slideForm, targetUrl: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-gray-50" />
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">bKash Personal Number</label>
                  <input 
                    type="text" 
                    value={tempBkash} 
                    onChange={e => setTempBkash(e.target.value)}
                    className="w-full border border-gray-200 p-3 rounded-xl text-sm font-mono focus:outline-none focus:border-blue-500 bg-gray-50"
                  />
                  <button 
                    onClick={() => handleUpdateSettings('bkashNumber', tempBkash)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-black transition-colors mt-2"
                  >
                    Save bKash Number
                  </button>
                </div>
                
                <div className="space-y-1 mt-6">
                  <label className="text-xs font-bold text-gray-500 uppercase">Nagad Personal Number</label>
                  <input 
                    type="text" 
                    value={tempNagad} 
                    onChange={e => setTempNagad(e.target.value)}
                    className="w-full border border-gray-200 p-3 rounded-xl text-sm font-mono focus:outline-none focus:border-blue-500 bg-gray-50"
                  />
                  <button 
                    onClick={() => handleUpdateSettings('nagadNumber', tempNagad)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-black transition-colors mt-2"
                  >
                    Save Nagad Number
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {viewingScreenshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm" onClick={() => setViewingScreenshot(null)}>
          <div className="relative max-w-3xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="absolute top-4 right-4 z-10">
              <button onClick={() => setViewingScreenshot(null)} className="p-2 bg-black/50 hover:bg-black text-white rounded-full transition-colors backdrop-blur-md">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-1 bg-gray-100 max-h-[90vh] overflow-y-auto">
              <img onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/f3f4f6/a1a1aa?text=No+Image'; (e.target as HTMLImageElement).onerror = null; }} src={viewingScreenshot} alt="Payment Receipt" className="w-full h-auto rounded-xl object-contain" />
            </div>
          </div>
        </div>
      )}
      {/* DELETE CONFIRMATION MODAL */}
      {productToDelete && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full text-center"
          >
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-black text-gray-800 mb-2">Delete Product?</h3>
            <p className="text-sm text-gray-500 mb-6 font-medium">This action cannot be undone. Are you sure you want to permanently delete this product?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setProductToDelete(null)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteProduct}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
