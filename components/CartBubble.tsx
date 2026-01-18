import React, { useEffect, useState } from 'react';
import { ShoppingCart, Loader2 } from 'lucide-react';
import { coursesApi } from '../data/supabaseStore';
import { CoursePricing } from '../types';

interface CartBubbleProps {
  cart: string[];
  onNavigateToCheckout: () => void;
}

const CartBubble: React.FC<CartBubbleProps> = ({ cart, onNavigateToCheckout }) => {
  const [totalPrice, setTotalPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Calculate total price whenever cart changes
  useEffect(() => {
    const calculateTotal = async () => {
      if (cart.length === 0) {
        setTotalPrice(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      let total = 0;

      try {
        for (const courseId of cart) {
          const course = await coursesApi.getById(courseId);
          if (course?.pricing) {
            const pricing = course.pricing as CoursePricing;
            const now = new Date();
            
            // Check if there's an active discount
            const hasActiveDiscount = pricing.discountPrice !== undefined && 
              (!pricing.discountStartDate || new Date(pricing.discountStartDate) <= now) &&
              (!pricing.discountEndDate || new Date(pricing.discountEndDate) >= now);
            
            const price = hasActiveDiscount ? (pricing.discountPrice ?? pricing.price) : pricing.price;
            total += price;
          }
        }
        setTotalPrice(total);
      } catch (error) {
        console.error('Error calculating cart total:', error);
        setTotalPrice(null);
      } finally {
        setLoading(false);
      }
    };

    calculateTotal();
  }, [cart]);

  // Don't render if cart is empty
  if (cart.length === 0) {
    return null;
  }

  return (
    <button
      onClick={onNavigateToCheckout}
      className="fixed top-20 sm:top-24 right-4 sm:right-8 z-[150] flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-2 sm:px-5 sm:py-3 rounded-full shadow-2xl shadow-purple-500/40 hover:scale-105 active:scale-95 transition-all duration-300 animate-pulse-subtle group"
      aria-label="Go to checkout"
    >
      {/* Pulse ring animation */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full animate-ping opacity-20"></div>
      
      {/* Cart icon with badge */}
      <div className="relative">
        <ShoppingCart size={18} className="sm:w-5 sm:h-5" strokeWidth={2.5} />
        <span className="absolute -top-2 -right-2 w-4 h-4 sm:w-5 sm:h-5 bg-white text-purple-600 text-[9px] sm:text-[10px] font-black rounded-full flex items-center justify-center shadow-lg">
          {cart.length}
        </span>
      </div>

      {/* Text content */}
      <div className="flex flex-col items-start leading-tight">
        <span className="text-[10px] sm:text-xs font-bold opacity-90">
          {cart.length} {cart.length === 1 ? 'course' : 'courses'} in cart
        </span>
        <span className="text-sm sm:text-base font-black">
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            `€${totalPrice?.toFixed(2) ?? '0.00'}`
          )}
        </span>
      </div>

      {/* Arrow indicator on hover */}
      <svg 
        className="w-4 h-4 sm:w-5 sm:h-5 opacity-0 group-hover:opacity-100 transition-opacity -mr-1" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
      </svg>

      <style>{`
        @keyframes pulse-subtle {
          0%, 100% {
            box-shadow: 0 25px 50px -12px rgba(147, 51, 234, 0.4);
          }
          50% {
            box-shadow: 0 25px 50px -12px rgba(147, 51, 234, 0.6), 0 0 30px rgba(147, 51, 234, 0.3);
          }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </button>
  );
};

export default CartBubble;
