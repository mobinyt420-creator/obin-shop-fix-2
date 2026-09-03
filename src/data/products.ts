import { Product, PromoCode, Category, Slide } from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: "prod-1785438419771",
    name: "Kaftan Silk Sharee",
    price: 999,
    originalPrice: 1900,
    costPrice: 900,
    discountMessage: "Top Selling",
    brand: "Brand",
    category: "cat-1785091892859",
    sku: "SKU-214",
    origin: "Local",
    bestSeller: true,
    stockStatus: "In Stock",
    stockOut: false,
    timerSeconds: 10922,
    justForYou: false,
    offersPage: false,
    description: "Kaftan Silk Sharee",
    images: [
      "https://media.selfshop.com.bd/products/vendor/1771671718-l-12_fbYO4Fbe.jpeg",
      "https://media.selfshop.com.bd/products/vendor/1771671718-l-12_fbYO4Fbe.jpeg"
    ],
    benefits: [],
    specifications: {},
    youtubeUrl: ""
  },
  {
    id: "prod-1785438548784",
    name: "Men's Premium Quality Solid Band collar Long Sleeve Petrol Color Shirt",
    price: 499,
    originalPrice: 999,
    costPrice: 399,
    discountMessage: "Save 20%",
    brand: "Brand",
    category: "cat-1785060782576",
    sku: "SKU-88",
    origin: "Local",
    bestSeller: true,
    stockStatus: "In Stock",
    stockOut: false,
    justForYou: true,
    offersPage: true,
    description: "Men's Premium Quality Solid Band collar Long Sleeve Petrol Color Shirt",
    images: [
      "https://media.selfshop.com.bd/products/vendor/petrol_65gPd8vw.jpg"
    ],
    benefits: [],
    specifications: {},
    youtubeUrl: ""
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
  { 
    id: 'all', 
    name: 'All Products', 
    banglaName: 'সব পণ্য', 
    icon: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=120' 
  },
  {
    id: "cat-1785060782576",
    name: "MAN",
    banglaName: "ম্যান",
    icon: "https://media.selfshop.com.bd/products/vendor/1783950659-l-3_ErKUMOrd.jpeg"
  },
  {
    id: "cat-1785091892859",
    name: "WOMAN",
    banglaName: "উইম্যান",
    icon: "https://media.selfshop.com.bd/products/vendor/1763314180-l-1_d9eleUHu.jpg"
  }
];

export const INITIAL_SLIDES: Slide[] = [
  {
    id: "slide-1785093843355",
    image: "https://img.lazcdn.com/us/domino/268b6d02-b384-425b-b039-6c0753ef634d_BD-1976-688.jpg_2200x2200q80.jpg_.avif",
    targetUrl: "",
    badge: "",
    ctaText: "Shop Now",
    banglaTitle: "",
    subtitle: "",
    colorTheme: "from-blue-600 to-blue-900",
    title: ""
  }
];
