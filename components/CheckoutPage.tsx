
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, ShieldCheck, Lock, CreditCard, CheckCircle2, ChevronRight, ShoppingCart, User, X, Tag, Ticket, AlertCircle, Loader2, Building2, Wallet, BookOpen, Plus, Minus } from 'lucide-react';
import { coursesApi, purchasesApi } from '../data/supabaseStore';
import { Course } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  getPaymentConfig, 
  isPaymentConfigured, 
  getAvailablePaymentMethods,
  paypalPayment,
  raiffeisenPayment,
  generateOrderId,
  PaymentMethod,
  PaymentRequest
} from '../lib/paymentService';

// Level-based color gradients
const LEVEL_COLORS: Record<string, string> = {
  'A1': 'from-blue-500 to-indigo-600',
  'A2': 'from-indigo-500 to-purple-600',
  'B1': 'from-purple-600 to-pink-600',
  'B2': 'from-blue-600 to-cyan-500',
  'Kids': 'from-pink-400 to-rose-500',
  'kids-basic': 'from-pink-400 to-rose-500',
  'kids-medium': 'from-orange-400 to-pink-400',
  'kids-advanced': 'from-purple-400 to-pink-500',
  'premium': 'from-violet-600 to-purple-700',
  'golden': 'from-amber-500 to-yellow-600',
  'Premium': 'from-violet-600 to-purple-700',
  'Gold': 'from-amber-500 to-yellow-600',
};

interface CartItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  color: string;
  // New fields for teaching materials
  teachingMaterialsPrice?: number;
  includeTeachingMaterials?: boolean;
  productType?: string;
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
  const { user: authUser, profile } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paypalContainerRef = useRef<HTMLDivElement>(null);
  
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Payment method selection
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [availableMethods, setAvailableMethods] = useState<PaymentMethod[]>([]);
  const [paymentConfig] = useState(() => getPaymentConfig());
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  
  // Form state
  const [customerName, setCustomerName] = useState(user?.name || profile?.name || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || profile?.email || '');
  
  // Discount state
  const [discountInput, setDiscountInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; amount: number } | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  
  // Teaching materials state
  const [teachingMaterialsSelections, setTeachingMaterialsSelections] = useState<Record<string, boolean>>({});

  // Check available payment methods
  useEffect(() => {
    const methods = getAvailablePaymentMethods();
    setAvailableMethods(methods);
    
    // Auto-select if only one method available
    if (methods.length === 1) {
      setSelectedPaymentMethod(methods[0]);
    }
  }, []);

  // Load PayPal SDK when PayPal is selected
  useEffect(() => {
    if (selectedPaymentMethod === 'paypal' && paymentConfig.paypal.isConfigured) {
      paypalPayment.loadSDK().then(loaded => {
        setPaypalLoaded(loaded);
      });
    }
  }, [selectedPaymentMethod, paymentConfig.paypal.isConfigured]);

  // Calculate totals - include teaching materials
  const subtotal = cartItems.reduce((acc, item) => acc + item.price, 0);
  const teachingMaterialsTotal = cartItems.reduce((acc, item) => {
    if (item.teachingMaterialsPrice && teachingMaterialsSelections[item.id]) {
      return acc + item.teachingMaterialsPrice;
    }
    return acc;
  }, 0);
  const total = Math.max(0, subtotal + teachingMaterialsTotal - (appliedDiscount?.amount || 0));

  // Toggle teaching materials for a cart item
  const toggleTeachingMaterials = (itemId: string) => {
    setTeachingMaterialsSelections(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Handle successful payment
  const handlePaymentSuccess = useCallback(async (transactionId: string, method: PaymentMethod) => {
    try {
      // Get user ID from auth context
      const userId = authUser?.id || profile?.id;
      
      if (!userId) {
        throw new Error('User not authenticated. Please log in to complete purchase.');
      }

      // Create purchase records for each item
      for (const item of cartItems) {
        await purchasesApi.create({
          userId,
          courseId: item.id,
          amount: item.price,
          currency: 'EUR',
          paymentMethod: method,
          transactionId,
          discountCode: appliedDiscount?.code,
        });
      }

      setPaymentSuccess(true);
      onClearCart();
    } catch (err) {
      console.error('Error recording purchase:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete purchase');
    }
  }, [authUser, profile, cartItems, appliedDiscount, onClearCart]);

  // Render PayPal buttons when ready
  useEffect(() => {
    if (paypalLoaded && selectedPaymentMethod === 'paypal' && paypalContainerRef.current && cartItems.length > 0) {
      const container = paypalContainerRef.current;
      container.innerHTML = ''; // Clear previous buttons
      
      const orderId = generateOrderId();
      const request: PaymentRequest = {
        orderId,
        amount: total,
        currency: 'EUR',
        description: `DSA Smart Start - ${cartItems.length} course(s)`,
        customerEmail,
        customerName,
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
        })),
        returnUrl: `${window.location.origin}/#checkout-success`,
        cancelUrl: `${window.location.origin}/#checkout`,
      };

      if (window.paypal) {
        window.paypal.Buttons(paypalPayment.getButtonOptions(request, {
          onApprove: async (transactionId) => {
            await handlePaymentSuccess(transactionId, 'paypal');
          },
          onError: (err) => {
            setError(`PayPal error: ${err.message}`);
          },
          onCancel: () => {
            setError('Payment was cancelled. Please try again.');
          },
        })).render(container);
      }
    }
  }, [paypalLoaded, selectedPaymentMethod, cartItems, total, customerEmail, customerName, handlePaymentSuccess]);

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
              color: LEVEL_COLORS[course.level] || 'from-purple-600 to-indigo-800',
              // New fields for teaching materials
              teachingMaterialsPrice: course.teachingMaterialsPrice,
              productType: course.productType
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

  // Canvas animation
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

  const handleApplyDiscount = async (e: React.MouseEvent) => {
    e.preventDefault();
    const code = discountInput.trim().toUpperCase();
    if (!code) return;

    setDiscountError(null);
    
    // Validate discount code server-side via Supabase
    try {
      const { data, error } = await supabase
        .from('discount_codes')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        setDiscountError('Invalid or expired discount code');
        setAppliedDiscount(null);
        return;
      }

      // Check if code has expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setDiscountError('This discount code has expired');
        setAppliedDiscount(null);
        return;
      }

      // Check usage limit
      if (data.max_uses && data.times_used >= data.max_uses) {
        setDiscountError('This discount code has reached its usage limit');
        setAppliedDiscount(null);
        return;
      }

      // Check minimum order amount
      if (data.min_order_amount && subtotal < data.min_order_amount) {
        setDiscountError(`Minimum order of €${data.min_order_amount} required for this code`);
        setAppliedDiscount(null);
        return;
      }

      // Calculate discount amount
      let discountAmount = 0;
      if (data.discount_type === 'percentage') {
        discountAmount = subtotal * (data.discount_value / 100);
        // Apply max discount cap if set
        if (data.max_discount && discountAmount > data.max_discount) {
          discountAmount = data.max_discount;
        }
        setAppliedDiscount({ code: `${code} (${data.discount_value}% OFF)`, amount: discountAmount });
      } else {
        // Fixed amount discount
        discountAmount = Math.min(data.discount_value, subtotal);
        setAppliedDiscount({ code: `${code} (-€${data.discount_value})`, amount: discountAmount });
      }
    } catch (err) {
      // If discount_codes table doesn't exist, show generic message
      setDiscountError('Discount codes are not available at this time');
      setAppliedDiscount(null);
    }
  };

  // Handle Raiffeisen card payment
  const handleRaiffeisenPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim() || !customerEmail.trim()) {
      setError('Please fill in your name and email');
      return;
    }

    setLoading(true);

    try {
      const orderId = generateOrderId();
      const request: PaymentRequest = {
        orderId,
        amount: total,
        currency: 'EUR',
        description: `DSA Smart Start - ${cartItems.length} course(s)`,
        customerEmail,
        customerName,
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
        })),
        returnUrl: `${window.location.origin}/#checkout-success?orderId=${orderId}`,
        cancelUrl: `${window.location.origin}/#checkout`,
      };

      // Store order info for callback verification
      sessionStorage.setItem('pending_order', JSON.stringify({
        orderId,
        items: cartItems,
        total,
        discountCode: appliedDiscount?.code,
      }));

      // Get payment form data and redirect
      const { formData, actionUrl } = await raiffeisenPayment.createPaymentRequest(request);

      // Create and submit form to Raiffeisen payment gateway
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = actionUrl;

      Object.entries(formData).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
      setLoading(false);
    }
  };

  // Success state
  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-[#f8f5ff] flex items-center justify-center px-6 py-20 relative z-[101]">
        <div className="max-w-2xl w-full bg-white rounded-[4rem] p-12 md:p-20 text-center shadow-2xl animate-reveal">
          <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white mx-auto mb-10 shadow-xl animate-bounce">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 tracking-tight">Payment Successful!</h2>
          <p className="text-gray-500 text-xl mb-12 font-medium">
            Your courses are now unlocked. Welcome to the DSA Smart Start family! 
            A confirmation email has been sent to {customerEmail}.
          </p>
          <button 
            onClick={() => window.location.hash = '#dashboard'}
            className="group flex items-center gap-3 bg-gray-900 text-white px-10 py-5 rounded-full font-black text-xs tracking-widest transition-all mx-auto uppercase shadow-xl hover:bg-purple-600"
          >
            Go to My Courses
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // Check if payment is not configured
  const paymentNotConfigured = !isPaymentConfigured();

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
            ) : paymentNotConfigured ? (
              // Payment not configured notice
              <div className="bg-white p-12 md:p-16 rounded-[4rem] border border-amber-200 text-center">
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mx-auto mb-8">
                  <AlertCircle size={40} />
                </div>
                <h2 className="text-3xl font-black text-gray-900 mb-4 uppercase tracking-tight">Payment Setup Required</h2>
                <p className="text-gray-500 mb-6 font-medium">
                  Payment processing is not yet configured. Please contact us to complete your enrollment.
                </p>
                <div className="bg-gray-50 rounded-3xl p-6 text-left mb-8">
                  <p className="text-sm text-gray-600 mb-2"><strong>Your courses:</strong></p>
                  <ul className="text-sm text-gray-500 list-disc list-inside">
                    {cartItems.map(item => (
                      <li key={item.id}>{item.name} - €{item.price.toFixed(2)}</li>
                    ))}
                  </ul>
                  <p className="text-sm font-bold text-gray-800 mt-4">Total: €{total.toFixed(2)}</p>
                </div>
                <button 
                  onClick={() => window.location.hash = '#contact'}
                  className="bg-purple-600 text-white px-12 py-5 rounded-full font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-all shadow-xl"
                >
                  Contact Us to Enroll
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

                {/* Error message */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                    <p className="text-red-700 text-sm font-medium">{error}</p>
                  </div>
                )}

                {/* Student Info */}
                <div className="bg-white p-10 md:p-14 rounded-[3.5rem] border border-gray-100 shadow-xl">
                  <h3 className="text-xl font-black text-gray-900 mb-8 uppercase tracking-tight flex items-center gap-3">
                    <User size={20} className="text-purple-500" />
                    Student Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Full Name</label>
                      <input 
                        required 
                        type="text" 
                        placeholder="Your Name" 
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-8 py-5 rounded-[2rem] bg-gray-50 border border-transparent focus:bg-white focus:border-purple-600 outline-none transition-all font-bold" 
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Email Address</label>
                      <input 
                        required 
                        type="email" 
                        placeholder="email@example.com" 
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="w-full px-8 py-5 rounded-[2rem] bg-gray-50 border border-transparent focus:bg-white focus:border-purple-600 outline-none transition-all font-bold" 
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Method Selection */}
                <div className="bg-white p-10 md:p-14 rounded-[3.5rem] border border-gray-100 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8">
                    <ShieldCheck size={40} className="text-green-500/20" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-8 uppercase tracking-tight flex items-center gap-3">
                    <Lock size={20} className="text-purple-500" />
                    Payment Method
                  </h3>

                  <div className="space-y-4">
                    {/* Card Payment Option (Raiffeisen) */}
                    {paymentConfig.raiffeisen.isConfigured && (
                      <button
                        type="button"
                        onClick={() => setSelectedPaymentMethod('card')}
                        className={`w-full p-6 rounded-3xl border-2 transition-all flex items-center gap-4 ${
                          selectedPaymentMethod === 'card' 
                            ? 'border-purple-600 bg-purple-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                          selectedPaymentMethod === 'card' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <CreditCard size={24} />
                        </div>
                        <div className="text-left flex-grow">
                          <p className="font-black text-gray-900 uppercase tracking-wide text-sm">Credit / Debit Card</p>
                          <p className="text-xs text-gray-500 mt-1">Secure payment via Raiffeisen Bank</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/200px-Visa_Inc._logo.svg.png" alt="Visa" className="h-6 object-contain" />
                          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/200px-Mastercard-logo.svg.png" alt="Mastercard" className="h-6 object-contain" />
                        </div>
                      </button>
                    )}

                    {/* PayPal Option */}
                    {paymentConfig.paypal.isConfigured && (
                      <button
                        type="button"
                        onClick={() => setSelectedPaymentMethod('paypal')}
                        className={`w-full p-6 rounded-3xl border-2 transition-all flex items-center gap-4 ${
                          selectedPaymentMethod === 'paypal' 
                            ? 'border-purple-600 bg-purple-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                          selectedPaymentMethod === 'paypal' ? 'bg-[#003087] text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <Wallet size={24} />
                        </div>
                        <div className="text-left flex-grow">
                          <p className="font-black text-gray-900 uppercase tracking-wide text-sm">PayPal</p>
                          <p className="text-xs text-gray-500 mt-1">Pay securely with your PayPal account</p>
                        </div>
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/PayPal.svg/200px-PayPal.svg.png" alt="PayPal" className="h-6 object-contain" />
                      </button>
                    )}
                  </div>

                  {/* PayPal Button Container */}
                  {selectedPaymentMethod === 'paypal' && (
                    <div className="mt-8">
                      {paypalLoaded ? (
                        <div ref={paypalContainerRef} className="paypal-button-container" />
                      ) : (
                        <div className="flex items-center justify-center p-8">
                          <Loader2 className="animate-spin text-purple-600" size={32} />
                          <span className="ml-3 text-gray-500">Loading PayPal...</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Card Payment Form - Redirects to Raiffeisen */}
                  {selectedPaymentMethod === 'card' && (
                    <div className="mt-8">
                      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
                        <p className="text-sm text-blue-800">
                          <Building2 className="inline mr-2" size={16} />
                          You will be redirected to Raiffeisen Bank's secure payment page to enter your card details.
                        </p>
                      </div>
                      <button 
                        type="button"
                        onClick={handleRaiffeisenPayment}
                        disabled={loading || !customerName || !customerEmail}
                        className="group w-full flex items-center justify-center gap-4 bg-[#8a3ffc] text-white py-6 rounded-[2.5rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-purple-500/20 hover:bg-[#7a2fec] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="animate-spin" size={20} />
                            REDIRECTING TO PAYMENT...
                          </>
                        ) : (
                          <>
                            PROCEED TO PAYMENT ({total.toFixed(2)}€)
                            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* No payment method selected */}
                  {!selectedPaymentMethod && availableMethods.length > 0 && (
                    <div className="mt-8 text-center text-gray-400 text-sm">
                      Please select a payment method above
                    </div>
                  )}
                </div>
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
                  <div className="space-y-4 mb-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {cartItems.map((item, idx) => (
                      <div key={item.id} className="group p-4 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all animate-reveal" style={{ animationDelay: `${idx * 0.1}s` }}>
                        <div className="flex items-center justify-between gap-4">
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
                        
                        {/* Teaching Materials Add-on for Services */}
                        {item.teachingMaterialsPrice && item.teachingMaterialsPrice > 0 && (
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <button
                              onClick={() => toggleTeachingMaterials(item.id)}
                              className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all ${
                                teachingMaterialsSelections[item.id]
                                  ? 'bg-green-500/20 border border-green-500/30'
                                  : 'bg-white/5 border border-white/10 hover:bg-white/10'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                  teachingMaterialsSelections[item.id] ? 'bg-green-500 text-white' : 'bg-white/10 text-gray-400'
                                }`}>
                                  <BookOpen size={14} />
                                </div>
                                <div className="text-left">
                                  <p className="text-[9px] font-black uppercase tracking-wider text-white">
                                    Teaching Materials
                                  </p>
                                  <p className="text-[8px] text-gray-400 mt-0.5">
                                    Study guides & workbooks
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black ${
                                  teachingMaterialsSelections[item.id] ? 'text-green-400' : 'text-white'
                                }`}>
                                  +€{item.teachingMaterialsPrice.toFixed(0)}
                                </span>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                  teachingMaterialsSelections[item.id] ? 'bg-green-500 text-white' : 'bg-white/10 text-gray-400'
                                }`}>
                                  {teachingMaterialsSelections[item.id] ? <Minus size={12} /> : <Plus size={12} />}
                                </div>
                              </div>
                            </button>
                          </div>
                        )}
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
                  {teachingMaterialsTotal > 0 && (
                    <div className="flex justify-between items-center text-xs font-bold text-purple-400 uppercase tracking-widest">
                      <span>Teaching Materials</span>
                      <span>+{teachingMaterialsTotal.toFixed(2)}€</span>
                    </div>
                  )}
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

              {/* Security badges */}
              <div className="flex items-center justify-center gap-6 text-gray-400">
                <div className="flex items-center gap-2">
                  <Lock size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">SSL Secured</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">3D Secure</span>
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
        .paypal-button-container { min-height: 150px; }
      `}} />
    </div>
  );
};

export default CheckoutPage;
