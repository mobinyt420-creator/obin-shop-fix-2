import React from 'react';
import { ThumbsUp, Check, PartyPopper, Receipt, MapPin, CreditCard, ShoppingBag, ArrowRight } from 'lucide-react';
import { CartItem } from '../types';
import { motion } from 'motion/react';

interface OrderSuccessModalProps {
  orderId: string;
  cart: CartItem[];
  address: { name: string; phone: string; street: string; city: string; area: string };
  paymentMethod: 'cod' | 'bkash' | 'online';
  total: number;
  deliveryCharge: number;
  discount: number;
  onClose: () => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  orderId,
  cart,
  address,
  paymentMethod,
  total,
  deliveryCharge,
  discount,
  onClose
}) => {
  const getPaymentName = () => {
    if (paymentMethod === 'bkash') return 'bKash Mobile Wallet';
    if (paymentMethod === 'online') return 'Online Payment (Authorized)';
    return 'Cash on Delivery (COD)';
  };

  const getWhatsAppReceipt = () => {
    const itemsText = cart.map(i => `${i.product.name} x${i.quantity} (৳${i.product.price * i.quantity})`).join('\n');
    const text = encodeURIComponent(
      `🎉 ORDER CONFIRMED! 🏆\n` +
      `NEXMART SHOP Invoice: ${orderId}\n` +
      `---------------------------------\n` +
      `👤 Name: ${address.name}\n` +
      `📞 Phone: ${address.phone}\n` +
      `📍 Delivery: ${address.street}, ${address.area}, ${address.city}\n` +
      `💳 Payment: ${getPaymentName()}\n\n` +
      `Items:\n${itemsText}\n` +
      `---------------------------------\n` +
      `Delivery Charge: ৳${deliveryCharge}\n` +
      `Discount applied: -৳${discount}\n` +
      `💰 Grand Total Paid: ৳${total}\n\n` +
      `Thank you for shopping healthy food from NEXMART SHOP!`
    );
    return `https://wa.me/8801825000010?text=${text}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-blue-950/70 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl relative border border-blue-100 overflow-hidden"
        id="order-success-modal"
      >
        {/* Confetti decoration */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-[#FF6B00]/10 rounded-full blur-xl" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-blue-700/10 rounded-full blur-xl" />

        {/* Success Icon animation */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center p-1.5 shadow-lg shadow-blue-500/30 animate-bounce mb-3">
            <Check className="w-10 h-10 stroke-[3]" />
          </div>
          
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#25D366] font-mono flex items-center gap-1 bg-[#25D366]/10 px-2.5 py-1 rounded-full border border-[#25D366]/20">
            <PartyPopper className="w-3.5 h-3.5" />
            Order Received successfully
          </span>

          <h2 className="text-2xl font-black text-blue-950 font-sans tracking-tight mt-3 mb-1">
            Thank you for your order!
          </h2>
          <p className="text-xs text-gray-500">Your order index represents: <span className="font-mono font-bold text-orange-600 text-sm">{orderId}</span></p>
        </div>

        {/* Receipt Details Invoice block */}
        <div className="bg-gray-50 border border-gray-150 rounded-2xl p-4 my-5 text-sm space-y-3.5">
          <div className="flex items-center gap-2 border-b border-gray-150 pb-2.5">
            <Receipt className="w-4 h-4 text-blue-700" />
            <span className="font-extrabold text-blue-950 font-sans">Payment & Shipping Summary</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            {/* Receiver name and phone context */}
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono font-bold uppercase text-gray-400">Ship To</span>
              <p className="font-extrabold text-blue-950">{address.name}</p>
              <p className="text-gray-500 font-medium">{address.phone}</p>
              <p className="text-gray-400 font-light mt-0.5 leading-relaxed">{address.street}, {address.area}</p>
            </div>

            {/* Payment method name */}
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono font-bold uppercase text-gray-400">Payment Channel</span>
              <p className="font-extrabold text-blue-950 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-[#FF6B00]" />
                {getPaymentName()}
              </p>
              <p className="text-[11px] font-mono text-blue-600 font-extrabold mt-1">Status: Pending Verification</p>
            </div>
          </div>

          {/* Recalculate bill structure details */}
          <div className="border-t border-gray-150 pt-2.5 space-y-1 text-xs">
            {cart.map((item) => (
              <div key={item.product.id} className="flex justify-between items-center text-gray-600 leading-tight">
                <span className="truncate max-w-[280px] font-medium">{item.product.name} <span className="font-bold text-gray-900">x{item.quantity}</span></span>
                <span className="font-semibold text-gray-900 font-sans">৳{((item.product?.price || 0) * item.quantity).toLocaleString('en-US')}</span>
              </div>
            ))}
            
            <div className="flex justify-between items-center text-[#25D366] text-xs pt-1">
              <span>Promo Code Discount</span>
              <span>-৳{discount}</span>
            </div>

            <div className="flex justify-between items-center text-gray-500 text-xs">
              <span>Delivery Charge</span>
              <span>৳{deliveryCharge}</span>
            </div>

            <div className="flex justify-between items-center border-t border-gray-150 pt-2 text-md font-extrabold text-blue-950">
              <span>Final Total Paid</span>
              <span className="text-orange-600 font-black">৳{total.toLocaleString('en-US')}</span>
            </div>
          </div>
        </div>

        {/* Confirmation buttons drawer: Send Invoice to WhatsApp (Bangladeshi native touch!) & close */}
        <div className="space-y-2">
          <a
            href={getWhatsAppReceipt()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold text-xs py-3.5 rounded-xl transition-all shadow-md shadow-[#25D366]/20 text-center cursor-pointer"
          >
            <img onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/f3f4f6/a1a1aa?text=No+Image'; (e.target as HTMLImageElement).onerror = null; }} src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" className="w-4 h-4 invert brightness-200" alt="WA" />
            Send Receipt to WhatsApp / Helpline
          </a>

          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-1.5 border border-blue-800 bg-blue-50 hover:bg-blue-100 text-blue-950 font-bold py-3.5 rounded-xl text-xs sm:text-sm cursor-pointer transition-colors"
          >
            <ShoppingBag className="w-4.5 h-4.5 text-blue-800" />
            Continue Shopping
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
