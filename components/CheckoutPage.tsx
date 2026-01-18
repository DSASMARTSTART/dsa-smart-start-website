
import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ShieldCheck, Lock, CreditCard, CheckCircle2, Star, Sparkles, ChevronRight, ShoppingCart, User, X, Tag, Ticket } from 'lucide-react';
import { coursesApi, purchasesApi, authApi } from '../data/supabaseStore';
import { Course } from '../types';

// Level-based color gradients
const LEVEL_COLORS: Record<string, string> = {
  'A1': 'from-blue-500 to-indigo-600',
  'A2': 'from-indigo-500 to-purple-600',
  'B1': 'from-purple-600 to-pink-600',
  'Kids': 'from-pink-400 to-rose-500',
};

interface CartItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  color: string;
}

interface CheckoutProps {
  cart: string[];
  onBack: () => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  onBrowse: () => void;
  user: { name: string; email: string } | null;
}

const CheckoutPage: React.FC<CheckoutProps> = ({ cart, onBack, onRemoveItem, onClearCart, onBrowse, user }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  
  // Discount state
  const [discountInput, setDiscountInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; amount: number } | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);

  // Load cart items from store
  useEffect(() => {
    const loadCartItems = async () => {
      const items: CartItem[] = [];
      for (const id of cart) {
        try {
          const course = await coursesApi.getById(id);
          if (course && course.isPublished) {
            const pricing = course.pricing;
            const now = new Date();
            const hasActiveDiscount = pricing.discountPrice !== undefined && 
              (!pricing.discountStartDate || new Date(pricing.discountStartDate) <= now) &&
              (!pricing.discountEndDate || new Date(pricing.discountEndDate) >= now);
            
            items.push({
              id: course.id,
              name: course.title,
              price: hasActiveDiscount && pricing.discountPrice !== undefined ? pricing.discountPrice : pricing.price,
              originalPrice: hasActiveDiscount ? pricing.price : undefined,
              color: LEVEL_COLORS[course.level] || 'from-purple-600 to-indigo-800'
            });
          }
        } catch (error) {
          console.error('Error loading course:', id, error);
        }
      }
      setCartItems(items);
    };
    loadCartItems();
  }, [cart]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationFrameId: number;
    let particles: { x: number; y: number; size: number; speedX: number; speedY: number; opacity: number }[] = [];
    const particleCount = 20;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = Array.from({ length: particleCount }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        speedX: (Math.random() - 0.5) * 0.1,
        speedY: (Math.random() - 0.5) * 0.1,
        opacity: Math.random() * 0.2 + 0.05,
      }));
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.speedX; p.y += p.speedY;
        if (p.x > canvas.width) p.x = 0; if (p.x < 0) p.x = canvas.width;
        if (p.y > canvas.height) p.y = 0; if (p.y < 0) p.y = canvas.height;
        ctx.fillStyle = `rgba(168, 85, 247, ${p.opacity})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize); resize(); animate();
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animationFrameId); };
  }, []);

  const subtotal = cartItems.reduce((acc, item) => acc + item.price, 0);
  const total = Math.max(0, subtotal - (appliedDiscount?.amount || 0));

  const handleApplyDiscount = (e: React.MouseEvent) => {
    e.preventDefault(); // Extra safety
    const code = discountInput.trim().toUpperCase();
    if (!code) return;

    if (code === 'DSA2025') {
      setAppliedDiscount({ code: 'DSA2025 (10% OFF)', amount: subtotal * 0.1 });
      setDiscountError(null);
    } else if (code === 'WELCOMEDSA') {
      setAppliedDiscount({ code: 'WELCOMEDSA (-20€)', amount: 20 });
      setDiscountError(null);
    } else {
      setDiscountError('Invalid code. Try DSA2025');
      setAppliedDiscount(null);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setLoading(true);
    
    try {
      // Get current user or create a mock user ID
      const currentUser = await authApi.getCurrentUser();
      const userId = currentUser?.id || 'user-1';
      
      // Create purchases for each cart item (this also auto-enrolls)
      for (const item of cartItems) {
        await purchasesApi.create({
          userId,
          courseId: item.id,
          amount: item.price,
          currency: 'EUR',
          paymentMethod: 'card',
          discountCode: appliedDiscount?.code
        });
      }
      
      setPaymentSuccess(true);
      onClearCart();
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-[#f8f5ff] flex items-center justify-center px-6 py-20 relative z-[101]">
        <div className="max-w-2xl w-full bg-white rounded-[4rem] p-12 md:p-20 text-center shadow-2xl animate-reveal">
          <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white mx-auto mb-10 shadow-xl animate-bounce">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 tracking-tight">Success!</h2>
          <p className="text-gray-500 text-xl mb-12 font-medium">Your courses are now unlocked. Welcome to the DSA Smart Start family! A confirmation email has been sent to your inbox.</p>
          <button 
            onClick={() => window.location.hash = '#courses'}
            className="group flex items-center gap-3 bg-gray-900 text-white px-10 py-5 rounded-full font-black text-xs tracking-widest transition-all mx-auto uppercase shadow-xl hover:bg-purple-600"
          >
            Start Learning
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pt-32 pb-20 relative">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>

      <section className="relative z-10 max-w-7xl mx-auto px-6">
        <button 
          onClick={(e) => { e.preventDefault(); onBack(); }}
          className="group flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-purple-600 transition-all mb-12 bg-white/50 backdrop-blur-sm px-6 py-3 rounded-full border border-gray-100 shadow-sm relative z-50 pointer-events-auto"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Go back to previous page
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-start">
          {/* Left Column: Form or Empty State */}
          <div className="lg:col-span-7 animate-reveal">
            {cartItems.length === 0 ? (
              <div className="bg-white p-12 md:p-24 rounded-[4rem] border border-dashed border-gray-200 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mx-auto mb-8">
                  <ShoppingCart size={40} />
                </div>
                <h2 className="text-3xl font-black text-gray-900 mb-4 uppercase tracking-tight">Your cart is empty</h2>
                <p className="text-gray-500 mb-10 font-medium">Add some courses to your cart to begin your journey with us.</p>
                <button 
                  onClick={onBrowse}
                  className="bg-gray-900 text-white px-12 py-5 rounded-full font-black text-xs uppercase tracking-widest hover:bg-purple-600 transition-all shadow-xl"
                >
                  Browse Courses
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                    <CreditCard size={24} />
                  </div>
                  <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter uppercase">Checkout</h1>
                </div>

                <form className="space-y-8" onSubmit={handleCheckout}>
                  {/* Student Info */}
                  <div className="bg-white p-10 md:p-14 rounded-[3.5rem] border border-gray-100 shadow-xl">
                    <h3 className="text-xl font-black text-gray-900 mb-8 uppercase tracking-tight flex items-center gap-3">
                      <User size={20} className="text-purple-500" />
                      Student Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Full Name</label>
                        <input required type="text" placeholder="Your Name" className="w-full px-8 py-5 rounded-[2rem] bg-gray-50 border border-transparent focus:bg-white focus:border-purple-600 outline-none transition-all font-bold" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Email Address</label>
                        <input required type="email" placeholder="email@example.com" className="w-full px-8 py-5 rounded-[2rem] bg-gray-50 border border-transparent focus:bg-white focus:border-purple-600 outline-none transition-all font-bold" />
                      </div>
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div className="bg-white p-10 md:p-14 rounded-[3.5rem] border border-gray-100 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8">
                      <ShieldCheck size={40} className="text-green-500/20" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 mb-8 uppercase tracking-tight flex items-center gap-3">
                      <Lock size={20} className="text-purple-500" />
                      Payment Details
                    </h3>
                    <div className="space-y-6">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Card Number</label>
                        <div className="relative">
                          <CreditCard className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                          <input required type="text" placeholder="•••• •••• •••• ••••" className="w-full pl-16 pr-8 py-5 rounded-[2rem] bg-gray-50 border border-transparent focus:bg-white focus:border-purple-600 outline-none transition-all font-bold" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Expiry</label>
                          <input required type="text" placeholder="MM/YY" className="w-full px-8 py-5 rounded-[2rem] bg-gray-50 border border-transparent focus:bg-white focus:border-purple-600 outline-none transition-all font-bold" />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">CVC</label>
                          <input required type="text" placeholder="•••" className="w-full px-8 py-5 rounded-[2rem] bg-gray-50 border border-transparent focus:bg-white focus:border-purple-600 outline-none transition-all font-bold" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={loading}
                    className={`group w-full flex items-center justify-center gap-4 bg-[#8a3ffc] text-white py-6 rounded-[2.5rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-purple-500/20 hover:bg-[#7a2fec] hover:scale-[1.02] active:scale-[0.98] transition-all ${loading ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    {loading ? 'PROCESSING...' : `COMPLETE ENROLLMENT (${total.toFixed(2)}€)`}
                    {!loading && <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-5 animate-reveal stagger-1">
            <div className="sticky top-32 space-y-8">
              <div className="bg-gradient-to-br from-[#1a1c2d] to-black p-10 md:p-12 rounded-[3.5rem] text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/20 rounded-full blur-[60px] translate-x-1/2 -translate-y-1/2"></div>
                <h3 className="text-xl font-black mb-8 uppercase tracking-widest border-b border-white/10 pb-6">Your Courses</h3>
                
                {cartItems.length > 0 ? (
                  <div className="space-y-4 mb-8 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {cartItems.map((item, idx) => (
                      <div key={item.id} className="group flex items-center justify-between gap-4 p-4 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all animate-reveal" style={{ animationDelay: `${idx * 0.1}s` }}>
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shrink-0`}>
                            <ShoppingCart size={16} />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-[10px] font-black uppercase tracking-tight leading-tight truncate">{item.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-[10px] font-bold text-white uppercase tracking-widest">{item.price.toFixed(2)}€</p>
                              {item.originalPrice && (
                                <p className="text-[9px] font-bold text-gray-500 line-through">{item.originalPrice.toFixed(2)}€</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => onRemoveItem(item.id)}
                          className="p-2 text-gray-500 hover:text-pink-500 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center text-gray-500 italic text-sm">No courses selected</div>
                )}

                {/* Discount Code Field */}
                {cartItems.length > 0 && (
                  <div className="mb-8 p-6 bg-white/5 rounded-3xl border border-white/10">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3 block">Promo Code</label>
                    <div className="flex gap-2">
                      <div className="relative flex-grow">
                        <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                        <input 
                          type="text" 
                          value={discountInput}
                          onChange={(e) => setDiscountInput(e.target.value)}
                          placeholder="ENTER CODE"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-[10px] font-black uppercase tracking-widest text-white focus:border-purple-500 focus:outline-none transition-all"
                        />
                      </div>
                      <button 
                        type="button"
                        onClick={handleApplyDiscount}
                        className="bg-white text-gray-900 px-6 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-purple-500 hover:text-white transition-all shadow-md active:scale-95"
                      >
                        Apply
                      </button>
                    </div>
                    {discountError && (
                      <p className="text-[9px] font-bold text-pink-500 mt-2 ml-2 uppercase tracking-widest">{discountError}</p>
                    )}
                    {appliedDiscount && (
                      <div className="flex items-center gap-2 mt-3 ml-2 text-green-400">
                        <Ticket size={14} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Code Applied: {appliedDiscount.code}</span>
                        <button onClick={() => setAppliedDiscount(null)} className="ml-auto text-white/40 hover:text-white transition-colors">
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-6 border-t border-white/10 space-y-4">
                  <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                    <span>Subtotal</span>
                    <span>{subtotal.toFixed(2)}€</span>
                  </div>
                  {appliedDiscount && (
                    <div className="flex justify-between items-center text-xs font-bold text-green-400 uppercase tracking-widest">
                      <span>Discount Applied</span>
                      <span>-{appliedDiscount.amount.toFixed(2)}€</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-4">
                    <span className="text-lg font-black uppercase tracking-widest">Total</span>
                    <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                      {total.toFixed(2)}€
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl">
                <div className="space-y-4">
                  {[
                    "Lifetime course updates",
                    "Official DSA Smart Start Certificate",
                    "24/7 Priority specialist support",
                    "Satisfaction guarantee"
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle2 size={16} className="text-purple-500" />
                      <span className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        @keyframes reveal { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-reveal { animation: reveal 0.5s ease-out forwards; }
      `}} />
    </div>
  );
};

export default CheckoutPage;
