/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  name: string;
  banglaName?: string;
  sku: string;
  price: number;
  originalPrice?: number;
  costPrice?: number;
  discountMessage?: string;
  brand: string;
  category: string;
  images: string[];
  youtubeUrl?: string;
  description: string;
  specifications: { [key: string]: string };
  benefits: string[];
  origin: string;
  bestSeller?: boolean;
  justForYou?: boolean;
  offersPage?: boolean;
  popular?: boolean;
  topRated?: boolean;
  preOrder?: boolean;
  isCombo?: boolean;
  timerSeconds?: number;
  stockStatus: 'In Stock' | 'Low Stock' | 'Pre-Order' | 'Out of Stock';
  sizes?: string[];
  colors?: string[];
  stockOut?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
}

export interface Order {
  id: string;
  orderId?: string;
  items: CartItem[];
  deliveryAddress: {
    name: string;
    phone: string;
    street: string;
    city: string;
    area: string;
  } | null;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  orderNotes?: string;
  paymentMethod: 'cod' | 'bkash' | 'online' | '' | string;
  totalProductPrice: number;
  vat: number;
  deliveryCharge: number;
  promoCode?: string;
  discount: number;
  total: number;
  orderDate: string;
  status: 'Pending' | 'Confirmed' | 'Delivered' | 'Pending Verification' | 'Processing' | 'Cancelled' | 'Returned' | string;
  createdAt?: string;
  paymentScreenshotRef?: string | null;
}

export interface Category {
  id: string;
  name: string;
  banglaName?: string;
  icon: string;
}

export interface Slide {
  id: string;
  title: string;
  banglaTitle?: string;
  subtitle: string;
  badge?: string;
  image: string;
  ctaText?: string;
  colorTheme?: string;
  targetUrl?: string;
  categoryId?: string;
  buttonText?: string;
}

export interface PromoCode {
  code: string;
  discountType: 'fixed' | 'percentage';
  value: number;
  minSpend?: number;
  description: string;
}


export interface Review {
  id: string;
  productId: string;
  name: string;
  rating: number;
  date: string;
  comment: string;
  verified: boolean;
  avatar?: string;
}