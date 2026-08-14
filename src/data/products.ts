import { Product, PromoCode, Category } from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-smartwatch-01',
    name: 'Apple Watch Series 9',
    banglaName: 'অ্যাপল ওয়াচ সিরিজ ৯',
    sku: 'SKU: AW-S9',
    price: 45000,
    originalPrice: 48000,
    discountMessage: 'Save ৳3,000',
    brand: 'Apple',
    category: 'smartwatches',
    images: [
      'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?auto=format&fit=crop&q=80&w=800'
    ],
    description: 'The ultimate device for a healthy life. Apple Watch Series 9 features the most powerful chip ever in an Apple Watch, a magical new way to use your watch without touching the screen, a display that is twice as bright, and now you can choose a carbon neutral case and band combination.',
    specifications: {
      'Display': 'Always-On Retina display',
      'Processor': 'S9 SiP with 64-bit dual-core processor',
      'Water Resistance': 'Water resistant 50 meters',
      'Sensors': 'Blood oxygen sensor, electrical heart sensor'
    },
    benefits: [
      'Advanced health features including ECG and Blood Oxygen.',
      'Crash Detection and Fall Detection for safety.',
      'Seamless integration with your Apple devices.',
      'Carbon neutral options available.'
    ],
    origin: 'Imported',
    bestSeller: true,
    stockStatus: 'In Stock'
  },
  {
    id: 'prod-sneakers-01',
    name: 'Nike Air Max Sneakers',
    banglaName: 'নাইকি এয়ার ম্যাক্স স্নিকার্স',
    sku: 'SKU: NIKE-AM-01',
    price: 5500,
    originalPrice: 6500,
    discountMessage: 'Save ৳1,000',
    brand: 'Nike',
    category: 'footwear',
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800'
    ],
    description: 'Iconic style meets incredible comfort. The Nike Air Max features visible Air cushioning that changed the sneaker game forever. With its classic design and reliable support, it is the perfect shoe for everyday wear.',
    specifications: {
      'Upper Material': 'Synthetic and Mesh',
      'Sole': 'Rubber with Max Air unit',
      'Closure': 'Lace-up',
      'Style': 'Casual / Lifestyle'
    },
    benefits: [
      'Signature Max Air cushioning for all-day comfort.',
      'Durable rubber outsole provides multi-surface traction.',
      'Classic, versatile design that never goes out of style.',
      'Breathable materials keep your feet cool.'
    ],
    origin: 'Imported',
    bestSeller: true,
    stockStatus: 'In Stock'
  },
  {
    id: 'prod-polo-01',
    name: 'Premium Polo T-Shirt',
    banglaName: 'প্রিমিয়াম পোলো টি-শার্ট',
    sku: 'SKU: POLO-PRM-01',
    price: 1200,
    originalPrice: 1500,
    discountMessage: '20% OFF',
    brand: 'UrbanStyle',
    category: 'mens-fashion',
    images: [
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=80&w=800'
    ],
    description: 'Upgrade your casual wardrobe with our Premium Polo T-Shirt. Crafted from high-quality, breathable pique cotton, this polo offers a tailored fit that looks great tucked or untucked. Perfect for the office, the golf course, or a weekend out.',
    specifications: {
      'Material': '100% Pique Cotton',
      'Fit': 'Tailored Fit',
      'Collar': 'Ribbed collar with button placket',
      'Care': 'Machine wash cold'
    },
    benefits: [
      'Soft, breathable fabric for maximum comfort.',
      'Classic polo styling suitable for various occasions.',
      'Durable construction retains shape after washing.',
      'Available in a range of versatile colors.'
    ],
    origin: 'Bangladesh',
    bestSeller: false,
    stockStatus: 'In Stock'
  },
  {
    id: 'prod-earbuds-01',
    name: 'Sony Wireless Earbuds',
    banglaName: 'সনি ওয়্যারলেস ইয়ারবাড',
    sku: 'SKU: SONY-WF-01',
    price: 3400,
    originalPrice: 4000,
    discountMessage: 'Special Deal',
    brand: 'Sony',
    category: 'gadgets',
    images: [
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&q=80&w=800'
    ],
    description: 'Immerse yourself in your music with Sony Wireless Earbuds. Delivering high-quality sound and deep bass, these earbuds are designed for a comfortable, secure fit. With intuitive touch controls and long battery life, they are your perfect everyday audio companion.',
    specifications: {
      'Connectivity': 'Bluetooth 5.2',
      'Battery Life': 'Up to 24 hours with charging case',
      'Features': 'Water-resistant (IPX4), Touch Controls',
      'Microphone': 'Built-in for clear calls'
    },
    benefits: [
      'Exceptional sound quality with punchy bass.',
      'Comfortable, ergonomic design for extended wear.',
      'Reliable Bluetooth connectivity for skip-free listening.',
      'Clear voice capture for hands-free calling.'
    ],
    origin: 'Imported',
    bestSeller: true,
    stockStatus: 'In Stock'
  }
];

export const PROMO_CODES: PromoCode[] = [
  {
    code: 'NEXMART2026',
    discountType: 'fixed',
    value: 200,
    minSpend: 2000,
    description: '৳200 discount on orders above ৳2000!'
  },
  {
    code: 'MEGA10',
    discountType: 'percentage',
    value: 10,
    minSpend: 1000,
    description: '10% discount on orders above ৳1000!'
  }
];

export const PRODUCTS = INITIAL_PRODUCTS;

export const CATEGORIES: Category[] = [
  { id: 'all', name: 'All Products', banglaName: 'সব পণ্য', icon: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=120' },
  { id: 'mens-fashion', name: 'Men\'s Fashion', banglaName: 'ছেলেদের ফ্যাশন', icon: 'https://images.unsplash.com/photo-1550995694-3f5f4a7e1bd2?auto=format&fit=crop&q=80&w=120' },
  { id: 'womens-fashion', name: 'Women\'s Fashion', banglaName: 'মেয়েদের ফ্যাশন', icon: 'https://images.unsplash.com/photo-1618244972963-dbee1a7edc95?auto=format&fit=crop&q=80&w=120' },
  { id: 'electronics', name: 'Electronics', banglaName: 'ইলেকট্রনিক্স', icon: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&q=80&w=120' },
  { id: 'beauty', name: 'Beauty', banglaName: 'রূপচর্চা', icon: 'https://images.unsplash.com/photo-1596462502278-27bf85033e5a?auto=format&fit=crop&q=80&w=120' },
  { id: 'home-living', name: 'Home & Living', banglaName: 'বাড়ি এবং জীবনযাপন', icon: 'https://images.unsplash.com/photo-1583847268964-b28ce8f52859?auto=format&fit=crop&q=80&w=120' },
  { id: 'sports', name: 'Sports', banglaName: 'খেলাধুলা', icon: 'https://images.unsplash.com/photo-1518605328461-9f79af13c1c7?auto=format&fit=crop&q=80&w=120' },
  { id: 'footwear', name: 'Footwear', banglaName: 'জুতা', icon: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=120' },
  { id: 'baby-care', name: 'Baby Care', banglaName: 'শিশুর যত্ন', icon: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?auto=format&fit=crop&q=80&w=120' },
  { id: 'toys-games', name: 'Toys & Games', banglaName: 'খেলনা', icon: 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&q=80&w=120' },
  { id: 'automotive', name: 'Automotive', banglaName: 'গাড়ি', icon: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&q=80&w=120' },
  { id: 'books', name: 'Books', banglaName: 'বই', icon: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=120' },
  { id: 'pet-care', name: 'Pet Care', banglaName: 'পোষা প্রাণীর যত্ন', icon: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&q=80&w=120' }
];
