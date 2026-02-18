
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ArrowLeft, ShieldCheck, Lock, CreditCard, CheckCircle2, ChevronRight, ShoppingCart, User, X, Tag, Ticket, AlertCircle, Loader2, Building2, Wallet, BookOpen, Plus, Minus, Mail, Check, LogIn } from 'lucide-react';
import { coursesApi, purchasesApi, enrollmentsApi } from '../data/supabaseStore';
import AuthModal from './AuthModal';
import { Course } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  getPaymentConfig, 
  isPaymentConfigured, 
  getAvailablePaymentMethods,
  paypalPayment,
  raiAcceptPayment,
  generateOrderId,
  eurToRsd,
  formatRsdAmount,
  EUR_TO_RSD_RATE,
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
  initialTeachingMaterials?: Record<string, boolean>;
  onTeachingMaterialsChange?: (courseId: string, selected: boolean) => void;
}

// Email validation regex - standard RFC 5322 compliant pattern
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const isValidEmail = (email: string): boolean => {
  if (!email || email.length < 5 || email.length > 254) return false;
  return EMAIL_REGEX.test(email.trim());
};

const CheckoutPage: React.FC<CheckoutProps> = ({ 
  cart, 
  onBack, 
  onRemoveItem, 
  onClearCart, 
  onBrowse, 
  user,
  initialTeachingMaterials = {},
  onTeachingMaterialsChange
}) => {
  const { user: authUser, profile } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paypalContainerRef = useRef<HTMLDivElement>(null);
  const isProcessingRef = useRef(false); // Prevent double-execution of handlePaymentSuccess
  const raiAcceptOrderIdRef = useRef<string | null>(null); // Store orderId for iframe handler
  
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartLoading, setCartLoading] = useState(true); // Track cart items loading
  const [error, setError] = useState<string | null>(null);
  
  // Pending removal state for undo functionality
  const [pendingRemoval, setPendingRemoval] = useState<{ id: string; name: string; timer: NodeJS.Timeout | null } | null>(null);
  
  // Payment method selection
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [availableMethods, setAvailableMethods] = useState<PaymentMethod[]>([]);
  const [paymentConfig] = useState(() => getPaymentConfig());
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  
  // Form state
  const [customerName, setCustomerName] = useState(user?.name || profile?.name || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || profile?.email || '');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);
  
  // Auth modal state (shown when unauthenticated user tries to pay)
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Discount state
  const [discountInput, setDiscountInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ 
    code: string; 
    amount: number; 
    discountCodeId: string;
  } | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  
  // RaiAccept iframe state
  const [showPaymentIframe, setShowPaymentIframe] = useState(false);
  const [paymentIframeUrl, setPaymentIframeUrl] = useState<string | null>(null);
  const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null);
  
  // Screen reader announcements
  const [announcement, setAnnouncement] = useState<string>('');
  
  // Announce message to screen readers
  const announce = useCallback((message: string) => {
    setAnnouncement('');
    // Small delay to ensure the change is detected
    setTimeout(() => setAnnouncement(message), 100);
  }, []);
  
  // Teaching materials state - initialized from props (syllabus page selections)
  const [teachingMaterialsSelections, setTeachingMaterialsSelections] = useState<Record<string, boolean>>(initialTeachingMaterials);

  // Handle item removal with undo capability
  const handleRemoveItem = useCallback((itemId: string, itemName: string) => {
    // Clear any existing pending removal
    if (pendingRemoval?.timer) {
      clearTimeout(pendingRemoval.timer);
      // Immediately remove the previous pending item
      onRemoveItem(pendingRemoval.id);
    }

    // Set new pending removal with 5 second delay
    const timer = setTimeout(() => {
      onRemoveItem(itemId);
      setPendingRemoval(null);
      announce(`${itemName} removed from cart`);
    }, 5000);

    setPendingRemoval({ id: itemId, name: itemName, timer });
    announce(`${itemName} will be removed. Press undo to cancel.`);
  }, [pendingRemoval, onRemoveItem, announce]);

  // Undo the pending removal
  const undoRemoval = useCallback(() => {
    if (pendingRemoval?.timer) {
      clearTimeout(pendingRemoval.timer);
    }
    const itemName = pendingRemoval?.name || 'Item';
    setPendingRemoval(null);
    announce(`${itemName} removal cancelled`);
  }, [pendingRemoval, announce]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (pendingRemoval?.timer) {
        clearTimeout(pendingRemoval.timer);
      }
    };
  }, [pendingRemoval]);

  // Session timeout warning state
  const [sessionWarning, setSessionWarning] = useState<{ show: boolean; minutesLeft: number }>({ show: false, minutesLeft: 0 });
  const [checkoutStartTime] = useState(() => Date.now());
  const CHECKOUT_TIMEOUT_MINUTES = 30; // Warn after 25 minutes, timeout at 30
  const WARNING_THRESHOLD_MINUTES = 5;

  // Listen for RaiAccept iframe postMessage events (payment completion)
  useEffect(() => {
    const handleIframeMessage = (event: MessageEvent) => {
      // RaiAccept sends: { name: "orderResult", payload: { status, orderIdentification, errorMessage } }
      if (event.data?.name !== 'orderResult') return;
      const payload = event.data.payload || {};
      const status: string = payload.status || '';

      console.log('RaiAccept iframe message:', status, payload);

      // Close the iframe modal
      setShowPaymentIframe(false);
      setPaymentIframeUrl(null);

      if (status === 'success') {
        // Payment succeeded in iframe — clear cart immediately since payment
        // is already charged at the gateway level, regardless of enrollment state.
        onClearCart();

        // Now confirm purchases server-side.
        // The webhook may or may not fire (sandbox often doesn't), so we
        // call confirm_purchases_by_transaction as a client-side fallback.
        const orderId = raiAcceptOrderIdRef.current;
        const userId = authUser?.id || profile?.id;
        
        if (orderId && userId) {
          // Client-side confirmation: confirm ALL pending purchases for this transaction
          supabase.rpc('confirm_purchases_by_transaction', {
            p_transaction_id: orderId,
            p_user_id: userId,
          }).then(({ data, error }) => {
            if (error) {
              console.error('Client-side confirmation failed:', error);
            } else {
              console.log('Client-side confirmation result:', data);
            }
          }).catch((err) => {
            console.error('Client-side confirmation error:', err);
          });
          
          // Also call handlePaymentSuccess to record purchase and redirect
          handlePaymentSuccess(orderId, 'card').then(() => {
            setPaymentSuccess(true);
            announce('Payment successful! Your purchase is confirmed.');
          }).catch((err) => {
            console.error('Error processing RaiAccept payment success:', err);
            setPaymentSuccess(true);
            announce('Payment successful! Your courses will be available shortly.');
          });
        } else {
          // Fallback: no orderId stored, just show success
          setPaymentSuccess(true);
          announce('Payment successful! Your courses will be available shortly.');
        }
      } else if (status === 'cancel') {
        setLoading(false);
        setError('Payment was cancelled. You can try again.');
        announce('Payment cancelled.');
      } else {
        // failure / exception
        setLoading(false);
        setError(payload.errorMessage || 'Payment failed. Please try again.');
        announce('Payment failed.');
      }
    };

    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, [announce]);

  // Session/checkout timeout monitoring
  useEffect(() => {
    // Check session timeout every minute
    const checkTimeout = () => {
      const elapsedMinutes = (Date.now() - checkoutStartTime) / (1000 * 60);
      const remainingMinutes = Math.max(0, Math.ceil(CHECKOUT_TIMEOUT_MINUTES - elapsedMinutes));
      
      if (remainingMinutes <= WARNING_THRESHOLD_MINUTES && remainingMinutes > 0) {
        setSessionWarning({ show: true, minutesLeft: remainingMinutes });
      } else if (remainingMinutes <= 0) {
        // Session timed out - clear sensitive data and redirect
        setSessionWarning({ show: false, minutesLeft: 0 });
        setAppliedDiscount(null);
        setError('Your checkout session has expired. Please refresh and try again.');
      }
    };

    const intervalId = setInterval(checkTimeout, 30000); // Check every 30 seconds
    
    return () => clearInterval(intervalId);
  }, [checkoutStartTime]);

  // Extend session / dismiss warning
  const extendSession = useCallback(() => {
    // Reset the warning by updating checkoutStartTime would require state setter
    // For now, just dismiss the warning - user activity is implicit extension
    setSessionWarning({ show: false, minutesLeft: 0 });
  }, []);

  // Validate email on change (for non-logged-in users)
  useEffect(() => {
    if (!authUser && !profile && emailTouched) {
      if (!customerEmail) {
        setEmailError('Email is required');
      } else if (!isValidEmail(customerEmail)) {
        setEmailError('Please enter a valid email address');
      } else {
        setEmailError(null);
      }
    }
  }, [customerEmail, emailTouched, authUser, profile]);

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
    const newValue = !teachingMaterialsSelections[itemId];
    const item = cartItems.find(i => i.id === itemId);
    setTeachingMaterialsSelections(prev => ({
      ...prev,
      [itemId]: newValue
    }));
    // Sync change back to parent (App.tsx) for localStorage persistence
    onTeachingMaterialsChange?.(itemId, newValue);
    // Announce change to screen readers
    if (item) {
      announce(newValue 
        ? `Teaching materials added for ${item.name}` 
        : `Teaching materials removed for ${item.name}`);
    }
  };

  // Re-validate discount code before payment (in case it expired while user was filling form)
  const revalidateDiscountCode = useCallback(async (): Promise<boolean> => {
    if (!appliedDiscount) return true; // No discount to validate
    
    interface DiscountCodeRecord {
      id: string;
      code: string;
      discount_type: string;
      discount_value: number;
      max_discount: number | null;
      min_order_amount: number | null;
      max_uses: number | null;
      times_used: number;
      is_active: boolean;
      expires_at: string | null;
    }

    try {
      const { data, error } = await supabase
        .from('discount_codes')
        .select('*')
        .eq('id', appliedDiscount.discountCodeId)
        .single();

      const discountData = data as DiscountCodeRecord | null;

      if (error || !discountData) {
        setAppliedDiscount(null);
        setError('Your discount code is no longer valid. Please review your order.');
        return false;
      }

      // Check if code has expired
      if (discountData.expires_at && new Date(discountData.expires_at) < new Date()) {
        setAppliedDiscount(null);
        setError('Your discount code has expired. Please review your order.');
        return false;
      }

      // Check usage limit
      if (discountData.max_uses && discountData.times_used >= discountData.max_uses) {
        setAppliedDiscount(null);
        setError('Your discount code has reached its usage limit. Please review your order.');
        return false;
      }

      // Check if code is still active
      if (!discountData.is_active) {
        setAppliedDiscount(null);
        setError('Your discount code has been deactivated. Please review your order.');
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error revalidating discount code:', err);
      // On error, allow the purchase but clear the discount to be safe
      setAppliedDiscount(null);
      return true;
    }
  }, [appliedDiscount]);

  // Handle auth modal success — update form fields from fresh auth state
  const handleAuthModalSuccess = useCallback(() => {
    setShowAuthModal(false);
    // Form fields will auto-update from authUser/profile via effects
  }, []);

  // Update customer name/email when auth state changes (after login via modal)
  useEffect(() => {
    if (authUser || profile) {
      if (!customerName && (profile?.name || authUser?.user_metadata?.name)) {
        setCustomerName(profile?.name || authUser?.user_metadata?.name || '');
      }
      if (!customerEmail && (profile?.email || authUser?.email)) {
        setCustomerEmail(profile?.email || authUser?.email || '');
      }
    }
  }, [authUser, profile]);

  // Handle successful payment (authenticated users only)
  const handlePaymentSuccess = useCallback(async (transactionId: string, method: PaymentMethod) => {
    // Idempotency guard: prevent double-execution
    if (isProcessingRef.current) {
      console.warn('handlePaymentSuccess already in progress, skipping duplicate call');
      return;
    }
    isProcessingRef.current = true;

    try {
      // Re-validate discount code before processing
      const discountValid = await revalidateDiscountCode();
      if (!discountValid) {
        setLoading(false);
        isProcessingRef.current = false;
        return;
      }

      // User must be logged in — auth modal should have been shown already
      const userId = authUser?.id || profile?.id;
      
      if (!userId) {
        setShowAuthModal(true);
        isProcessingRef.current = false;
        return;
      }

      // CRITICAL: Check for duplicate purchases before processing
      const alreadyOwnedItems: string[] = [];
      const itemsToPurchase: typeof cartItems = [];
      
      for (const item of cartItems) {
        const isEnrolled = await enrollmentsApi.checkEnrollment(userId, item.id);
        if (isEnrolled) {
          alreadyOwnedItems.push(item.name);
        } else {
          itemsToPurchase.push(item);
        }
      }

      // If ALL items are already owned, show error
      if (itemsToPurchase.length === 0) {
        throw new Error(`You already own all items in your cart: ${alreadyOwnedItems.join(', ')}. Please check your dashboard.`);
      }

      // If SOME items are already owned, warn but continue with remaining items
      if (alreadyOwnedItems.length > 0) {
        console.warn(`User already owns: ${alreadyOwnedItems.join(', ')}. Processing only new items.`);
      }

      // For CARD payments (RaiAccept): the Edge Function already created pending purchase
      // records server-side via create_pending_purchase RPC. Do NOT create again here
      // to avoid duplicate rows. The webhook will confirm the existing purchase.
      //
      // For PAYPAL payments: no server-side pre-creation exists, so we must create
      // the pending purchase client-side here before the webhook fires.
      if (method === 'paypal') {
        for (const item of itemsToPurchase) {
          const includeTeachingMaterials = !!(teachingMaterialsSelections[item.id] && item.teachingMaterialsPrice);
          const teachingMaterialsCost = includeTeachingMaterials ? item.teachingMaterialsPrice! : 0;
          const itemTotalPrice = item.price + teachingMaterialsCost;
          
          const orderTotal = subtotal + teachingMaterialsTotal;
          const itemDiscountAmount = appliedDiscount 
            ? (itemTotalPrice / orderTotal) * appliedDiscount.amount 
            : 0;
          const finalAmount = itemTotalPrice - itemDiscountAmount;
          
          await purchasesApi.create({
            userId,
            courseId: item.id,
            amount: finalAmount,
            originalAmount: item.price,
            discountAmount: itemDiscountAmount,
            discountCodeId: appliedDiscount?.discountCodeId,
            currency: 'EUR',
            paymentMethod: method,
            transactionId,
            discountCode: appliedDiscount?.code,
            includeTeachingMaterials,
            teachingMaterialsAmount: teachingMaterialsCost,
          });
        }
      } else {
        console.log('Card payment: skipping client-side purchase creation (Edge Function already created pending purchases server-side)');
      }

      // Clear cart and redirect to success page
      onClearCart();
      window.location.hash = '#checkout-success';
    } catch (err) {
      console.error('Error recording purchase:', err);
      // Still clear cart — payment already succeeded at gateway level
      onClearCart();
      setError(err instanceof Error ? err.message : 'Failed to complete purchase');
    } finally {
      isProcessingRef.current = false;
    }
  }, [authUser, profile, cartItems, appliedDiscount, onClearCart, subtotal, teachingMaterialsSelections, teachingMaterialsTotal, revalidateDiscountCode]);

  // Memoize PayPal request to prevent unnecessary re-renders
  // Only rebuild when cart items or total actually change
  const paypalRequest = useMemo(() => {
    if (cartItems.length === 0) return null;
    const userId = authUser?.id || profile?.id;
    // Build userCourseKey for webhook fallback matching (first item only for now)
    const firstItemId = cartItems[0]?.id || '';
    return {
      orderId: generateOrderId(),
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
      metadata: userId && firstItemId ? { userCourseKey: `${userId}|${firstItemId}` } : undefined,
    } as PaymentRequest;
  }, [cartItems, total]); // Only depend on cart items and total, not customer info

  // Render PayPal buttons when ready - with proper cleanup
  useEffect(() => {
    if (!paypalLoaded || selectedPaymentMethod !== 'paypal' || !paypalContainerRef.current || !paypalRequest) {
      return;
    }

    const container = paypalContainerRef.current;
    container.innerHTML = ''; // Clear previous buttons
    
    // Update request with latest customer info at render time
    const request: PaymentRequest = {
      ...paypalRequest,
      customerEmail,
      customerName,
    };

    let buttonsInstance: { close?: () => Promise<void> } | null = null;

    if (window.paypal) {
      const options = paypalPayment.getButtonOptions(request, {
        onApprove: async (transactionId) => {
          await handlePaymentSuccess(transactionId, 'paypal');
        },
        onError: (err) => {
          setError(`PayPal error: ${err.message}`);
        },
        onCancel: () => {
          setError('Payment was cancelled. Please try again.');
        },
      });

      // Add terms validation
      const buttonsConfig = {
        ...options,
        onClick: (data: any, actions: any) => {
          // Auth gate: require login before PayPal payment
          const userId = authUser?.id || profile?.id;
          if (!userId) {
            setShowAuthModal(true);
            return actions.reject();
          }
          if (!termsAccepted) {
            setTermsError(true);
            setError('Please accept the Terms & Conditions to proceed');
            return actions.reject();
          }
          setTermsError(false);
          return actions.resolve();
        }
      };

      buttonsInstance = window.paypal.Buttons(buttonsConfig);
      buttonsInstance.render(container);
    }

    // Cleanup function to properly close PayPal buttons
    return () => {
      if (buttonsInstance && typeof buttonsInstance.close === 'function') {
        buttonsInstance.close().catch(() => {
          // Ignore errors during cleanup
        });
      }
    };
  }, [paypalLoaded, selectedPaymentMethod, paypalRequest, handlePaymentSuccess, customerEmail, customerName, termsAccepted]);

  // Load cart items from store
  useEffect(() => {
    const loadCartItems = async () => {
      setCartLoading(true);
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
      setCartLoading(false);
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
    
    // Define discount code type for type safety
    interface DiscountCodeData {
      id: string;
      code: string;
      discount_type: 'percentage' | 'fixed';
      discount_value: number;
      max_discount: number | null;
      min_order_amount: number | null;
      max_uses: number | null;
      times_used: number;
      is_active: boolean;
      expires_at: string | null;
    }
    
    // Validate discount code server-side via Supabase
    try {
      const { data, error } = await supabase
        .from('discount_codes')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .single();

      const discountData = data as DiscountCodeData | null;

      if (error || !discountData) {
        setDiscountError('Invalid or expired discount code');
        setAppliedDiscount(null);
        return;
      }

      // Check if code has expired
      if (discountData.expires_at && new Date(discountData.expires_at) < new Date()) {
        setDiscountError('This discount code has expired');
        setAppliedDiscount(null);
        return;
      }

      // Check usage limit
      if (discountData.max_uses && discountData.times_used >= discountData.max_uses) {
        setDiscountError('This discount code has reached its usage limit');
        setAppliedDiscount(null);
        return;
      }

      // Check per-user usage limit
      const emailToCheck = user?.email || customerEmail.trim().toLowerCase();
      if (emailToCheck) {
        const { data: existingUse } = await supabase
          .from('discount_code_uses')
          .select('id')
          .eq('discount_code_id', discountData.id)
          .or(`user_id.eq.${user?.id || '00000000-0000-0000-0000-000000000000'},guest_email.eq.${emailToCheck}`)
          .maybeSingle();

        if (existingUse) {
          setDiscountError('You have already used this discount code');
          setAppliedDiscount(null);
          return;
        }
      }

      // Check minimum order amount (include teaching materials in order total)
      const orderTotalBeforeDiscount = subtotal + teachingMaterialsTotal;
      if (discountData.min_order_amount && orderTotalBeforeDiscount < discountData.min_order_amount) {
        setDiscountError(`Minimum order of €${discountData.min_order_amount} required for this code (your order: €${orderTotalBeforeDiscount.toFixed(2)})`);
        setAppliedDiscount(null);
        return;
      }

      // Calculate discount amount (apply to full order total including teaching materials)
      let discountAmount = 0;
      if (discountData.discount_type === 'percentage') {
        discountAmount = orderTotalBeforeDiscount * (discountData.discount_value / 100);
        // Apply max discount cap if set
        if (discountData.max_discount && discountAmount > discountData.max_discount) {
          discountAmount = discountData.max_discount;
        }
        setAppliedDiscount({ 
          code: `${code} (${discountData.discount_value}% OFF)`, 
          amount: discountAmount,
          discountCodeId: discountData.id
        });
        announce(`Discount code applied! You save €${discountAmount.toFixed(2)}`);
      } else {
        // Fixed amount discount (cap at full order total)
        discountAmount = Math.min(discountData.discount_value, orderTotalBeforeDiscount);
        setAppliedDiscount({ 
          code: `${code} (-€${discountData.discount_value})`, 
          amount: discountAmount,
          discountCodeId: discountData.id
        });
        announce(`Discount code applied! You save €${discountAmount.toFixed(2)}`);
      }
    } catch (err) {
      // If discount_codes table doesn't exist, show generic message
      setDiscountError('Discount codes are not available at this time');
      setAppliedDiscount(null);
    }
  };

  // Handle Raiffeisen card payment (RaiAccept iframe flow)
  const handleRaiffeisenPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Auth gate: require login before payment
    const userId = authUser?.id || profile?.id;
    if (!userId) {
      setShowAuthModal(true);
      return;
    }

    if (!termsAccepted) {
      setTermsError(true);
      setError('Please accept the Terms & Conditions to proceed');
      return;
    }

    if (!customerName.trim() || !customerEmail.trim()) {
      setError('Please fill in your name and email');
      return;
    }

    setLoading(true);

    try {
      // Re-validate discount code before processing payment
      const discountValid = await revalidateDiscountCode();
      if (!discountValid) {
        setLoading(false);
        return;
      }

      const orderId = generateOrderId();
      // Store orderId in ref so the iframe message handler can access it
      raiAcceptOrderIdRef.current = orderId;
      
      // Build purchase items for server-side creation (eliminates race condition)
      const orderTotal = subtotal + teachingMaterialsTotal;
      const purchaseItems = cartItems.map(item => {
        const includeTeachingMaterials = !!(teachingMaterialsSelections[item.id] && item.teachingMaterialsPrice);
        const teachingMaterialsCost = includeTeachingMaterials ? item.teachingMaterialsPrice! : 0;
        const itemTotalPrice = item.price + teachingMaterialsCost;
        const itemDiscountAmount = appliedDiscount 
          ? (itemTotalPrice / orderTotal) * appliedDiscount.amount 
          : 0;
        return {
          courseId: item.id,
          amount: itemTotalPrice - itemDiscountAmount,
          originalAmount: item.price,
          discountAmount: itemDiscountAmount,
          discountCodeId: appliedDiscount?.discountCodeId,
          teachingMaterialsIncluded: includeTeachingMaterials,
          teachingMaterialsPrice: teachingMaterialsCost,
        };
      });

      // Convert EUR amounts to RSD for RaiAccept (bank account accepts RSD only)
      // Display prices stay in EUR; only the gateway charge is in RSD
      const rsdTotal = eurToRsd(total);
      const rsdPurchaseItems = purchaseItems.map(item => ({
        ...item,
        amount: eurToRsd(item.amount),
        originalAmount: eurToRsd(item.originalAmount),
        discountAmount: item.discountAmount ? eurToRsd(item.discountAmount) : 0,
        teachingMaterialsPrice: item.teachingMaterialsPrice ? eurToRsd(item.teachingMaterialsPrice) : 0,
      }));

      const request: PaymentRequest = {
        orderId,
        amount: rsdTotal,
        currency: 'RSD',
        description: `DSA Smart Start - ${cartItems.length} course(s)`,
        customerEmail,
        customerName,
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: eurToRsd(item.price),
          quantity: 1,
        })),
        returnUrl: `${window.location.origin}/#checkout-success?orderId=${orderId}`,
        cancelUrl: `${window.location.origin}/#checkout`,
        // Server-side purchase creation fields (auth-only, no guest path)
        userId,
        purchaseItems: rsdPurchaseItems,
        paymentMethod: 'card',
      };

      // Store order info for callback verification
      sessionStorage.setItem('pending_order', JSON.stringify({
        orderId,
        items: cartItems,
        total,
        discountCode: appliedDiscount?.code,
      }));

      // Create RaiAccept payment session via Edge Function
      const { paymentFormUrl, orderIdentification } = await raiAcceptPayment.createPaymentSession(request);

      // Store for reference & open iframe
      setPaymentOrderId(orderIdentification);
      setPaymentIframeUrl(paymentFormUrl);
      setShowPaymentIframe(true);
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
      setLoading(false);
    }
  };

  // Success state
  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6 py-20 relative z-[101]">
        <div className="max-w-2xl w-full bg-white/5 rounded-[4rem] p-12 md:p-20 text-center shadow-2xl border border-white/10 animate-reveal">
          <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white mx-auto mb-10 shadow-xl animate-bounce">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">Payment Successful!</h2>
          <p className="text-gray-400 text-xl mb-12 font-medium">
            Your courses are now unlocked. Welcome to the DSA Smart Start family! 
            A confirmation email has been sent to {customerEmail}.
          </p>
          <button 
            onClick={() => window.location.hash = '#dashboard'}
            className="group flex items-center gap-3 bg-white text-gray-900 px-10 py-5 rounded-full font-black text-xs tracking-widest transition-all mx-auto uppercase shadow-xl hover:bg-purple-600 hover:text-white"
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
    <div className="bg-black min-h-screen pt-32 pb-20 relative">
      {/* Screen reader announcements - visually hidden live region */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
      
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>

      <section className="relative z-10 max-w-7xl mx-auto px-6">
        <button 
          onClick={(e) => { e.preventDefault(); onBack(); }}
          className="group flex items-center gap-2 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-purple-400 transition-all mb-8 sm:mb-12 bg-white/5 backdrop-blur-sm px-4 sm:px-6 py-3 sm:py-3 rounded-full border border-white/10 shadow-sm relative z-50 pointer-events-auto min-h-[44px]"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="hidden sm:inline">Go back to previous page</span>
          <span className="sm:hidden">Back</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-16 lg:gap-24 items-start">
          {/* Left Column: Form or Empty State */}
          <div className="lg:col-span-7 animate-reveal">
            {cartItems.length === 0 ? (
              <div className="bg-white/5 p-8 sm:p-12 md:p-24 rounded-[2rem] sm:rounded-[4rem] border border-dashed border-white/20 text-center">
                <div className="w-16 sm:w-20 h-16 sm:h-20 bg-purple-500/10 rounded-full flex items-center justify-center text-purple-400 mx-auto mb-6 sm:mb-8">
                  <ShoppingCart size={32} className="sm:hidden" />
                  <ShoppingCart size={40} className="hidden sm:block" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white mb-3 sm:mb-4 uppercase tracking-tight">Your cart is empty</h2>
                <p className="text-gray-400 mb-6 font-medium text-sm sm:text-base">
                  Start your learning journey today! Browse our courses designed specifically for students with learning differences.
                </p>
                
                {/* Quick suggestions */}
                <div className="bg-white/5 rounded-2xl p-4 sm:p-6 mb-8 text-left border border-white/10">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Popular choices:</p>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                      Interactive A1-B1 English Courses
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-pink-400 rounded-full"></span>
                      Kids English Programs (Basic to Advanced)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                      Premium & Gold Pathways for intensive learning
                    </li>
                  </ul>
                </div>
                
                <button 
                  onClick={onBrowse}
                  className="bg-purple-600 text-white px-8 sm:px-12 py-4 sm:py-5 rounded-full font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-all shadow-xl shadow-purple-500/20 min-h-[48px]"
                >
                  Browse Courses
                </button>
              </div>
            ) : paymentNotConfigured ? (
              // Payment not configured notice
              <div className="bg-white/5 p-12 md:p-16 rounded-[4rem] border border-amber-500/30 text-center">
                <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 mx-auto mb-8">
                  <AlertCircle size={40} />
                </div>
                <h2 className="text-3xl font-black text-white mb-4 uppercase tracking-tight">Payment Setup Required</h2>
                <p className="text-gray-400 mb-6 font-medium">
                  Payment processing is not yet configured. Please contact us to complete your enrollment.
                </p>
                <div className="bg-white/5 rounded-3xl p-6 text-left mb-8 border border-white/10">
                  <p className="text-sm text-gray-300 mb-2"><strong>Your courses:</strong></p>
                  <ul className="text-sm text-gray-400 list-disc list-inside">
                    {cartItems.map(item => (
                      <li key={item.id}>{item.name} - €{item.price.toFixed(2)}</li>
                    ))}
                  </ul>
                  <p className="text-sm font-bold text-white mt-4">Total: €{total.toFixed(2)}</p>
                </div>
                <button 
                  onClick={() => window.location.hash = '#contact'}
                  className="bg-purple-600 text-white px-12 py-5 rounded-full font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-all shadow-xl shadow-purple-500/20"
                >
                  Contact Us to Enroll
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
                    <CreditCard size={24} />
                  </div>
                  <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase">Checkout</h1>
                </div>

                {/* Error message */}
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
                    <p className="text-red-400 text-sm font-medium">{error}</p>
                  </div>
                )}

                {/* Session Timeout Warning */}
                {sessionWarning.show && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-4 animate-pulse">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-amber-400 font-bold text-sm">Session expiring soon</p>
                        <p className="text-amber-500/80 text-xs mt-0.5">
                          Your checkout session will expire in {sessionWarning.minutesLeft} minute{sessionWarning.minutesLeft !== 1 ? 's' : ''}. 
                          Please complete your purchase.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={extendSession}
                      className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-amber-600 transition-all flex-shrink-0"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Login Banner — shown when not authenticated */}
                {!authUser && !profile && (
                  <div className="p-5 bg-purple-500/10 border border-purple-500/30 rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <LogIn size={20} className="text-purple-400" />
                      </div>
                      <div>
                        <p className="text-purple-300 font-bold text-sm">Log in to complete your purchase</p>
                        <p className="text-purple-400/70 text-xs mt-0.5">
                          An account is required so your courses appear on your dashboard after purchase.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className="px-5 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-purple-700 transition-all flex-shrink-0 shadow-lg shadow-purple-500/20"
                    >
                      Log In / Register
                    </button>
                  </div>
                )}

                {/* Student Info */}
                <div className="bg-white/5 p-6 sm:p-10 md:p-14 rounded-[2rem] sm:rounded-[3.5rem] border border-white/10 shadow-xl">
                  <h3 className="text-lg sm:text-xl font-black text-white mb-6 sm:mb-8 uppercase tracking-tight flex items-center gap-3">
                    <User size={20} className="text-purple-400" />
                    Student Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div className="flex flex-col gap-2">
                      <label htmlFor="checkout-name" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Full Name</label>
                      <input 
                        id="checkout-name"
                        required 
                        type="text" 
                        placeholder="Your Name" 
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-5 sm:px-8 py-4 sm:py-5 rounded-2xl sm:rounded-[2rem] bg-white/5 border border-white/10 focus:bg-white/10 focus:border-purple-500 outline-none transition-all font-bold text-base text-white placeholder:text-gray-500" 
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label htmlFor="checkout-email" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Email Address</label>
                      <input 
                        id="checkout-email"
                        required 
                        type="email" 
                        placeholder="email@example.com" 
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        onBlur={() => setEmailTouched(true)}
                        aria-invalid={emailError && emailTouched ? 'true' : 'false'}
                        aria-describedby={emailError && emailTouched ? 'checkout-email-error' : undefined}
                        className={`w-full px-5 sm:px-8 py-4 sm:py-5 rounded-2xl sm:rounded-[2rem] bg-white/5 border outline-none transition-all font-bold text-base text-white placeholder:text-gray-500 ${
                          emailError && emailTouched
                            ? 'border-red-400 bg-red-500/10 focus:border-red-500'
                            : 'border-white/10 focus:bg-white/10 focus:border-purple-500'
                        }`}
                      />
                      {emailError && emailTouched && (
                        <p id="checkout-email-error" className="text-red-400 text-xs font-medium ml-4 flex items-center gap-1" role="alert">
                          <AlertCircle size={12} />
                          {emailError}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payment Method Selection */}
                <div className="bg-white/5 p-10 md:p-14 rounded-[3.5rem] border border-white/10 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8">
                    <ShieldCheck size={40} className="text-green-500/20" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white mb-6 sm:mb-8 uppercase tracking-tight flex items-center gap-3">
                    <Lock size={20} className="text-purple-400" />
                    Payment Method
                  </h3>

                  <div className="space-y-3 sm:space-y-4">
                    {/* Card Payment Option (RaiAccept) */}
                    {paymentConfig.raiaccept.isConfigured && (
                      <button
                        type="button"
                        onClick={() => setSelectedPaymentMethod('card')}
                        className={`w-full p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-2 transition-all flex items-center gap-3 sm:gap-4 min-h-[72px] ${
                          selectedPaymentMethod === 'card' 
                            ? 'border-purple-500 bg-purple-500/10' 
                            : 'border-white/10 hover:border-white/20 bg-white/5'
                        }`}
                      >
                        <div className={`w-10 sm:w-12 h-10 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 ${
                          selectedPaymentMethod === 'card' ? 'bg-purple-600 text-white' : 'bg-white/10 text-gray-400'
                        }`}>
                          <CreditCard size={20} className="sm:hidden" />
                          <CreditCard size={24} className="hidden sm:block" />
                        </div>
                        <div className="text-left flex-grow min-w-0">
                          <p className="font-black text-white uppercase tracking-wide text-xs sm:text-sm">Credit / Debit Card</p>
                          <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1 truncate">Secure payment via Raiffeisen Bank</p>
                        </div>
                        <div className="hidden sm:flex items-center gap-2 shrink-0">
                          <img src="/assets/images/visa-logo.jpg" alt="Visa" className="h-5 sm:h-6 object-contain" />
                          <img src="/assets/images/mastercard-logo.png" alt="Mastercard" className="h-5 sm:h-6 object-contain" />
                          <img src="/assets/images/dinacard-logo.jpg" alt="DinaCard" className="h-5 sm:h-6 object-contain" />
                        </div>
                      </button>
                    )}

                    {/* PayPal Option */}
                    {paymentConfig.paypal.isConfigured && (
                      <button
                        type="button"
                        onClick={() => setSelectedPaymentMethod('paypal')}
                        className={`w-full p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-2 transition-all flex items-center gap-3 sm:gap-4 min-h-[72px] ${
                          selectedPaymentMethod === 'paypal' 
                            ? 'border-purple-500 bg-purple-500/10' 
                            : 'border-white/10 hover:border-white/20 bg-white/5'
                        }`}
                      >
                        <div className={`w-10 sm:w-12 h-10 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 ${
                          selectedPaymentMethod === 'paypal' ? 'bg-[#003087] text-white' : 'bg-white/10 text-gray-400'
                        }`}>
                          <Wallet size={20} className="sm:hidden" />
                          <Wallet size={24} className="hidden sm:block" />
                        </div>
                        <div className="text-left flex-grow min-w-0">
                          <p className="font-black text-white uppercase tracking-wide text-xs sm:text-sm">PayPal</p>
                          <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">Pay securely with your PayPal account</p>
                        </div>
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/PayPal.svg/200px-PayPal.svg.png" alt="PayPal" className="h-5 sm:h-6 object-contain shrink-0" />
                      </button>
                    )}
                  </div>

                  {/* PayPal Button Container */}
                  {selectedPaymentMethod === 'paypal' && (
                    <div className="mt-8">
                      {/* Terms Checkbox for PayPal */}
                      <div className="mb-6">
                        <label className={`flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer hover:bg-white/5 ${
                          termsError ? 'border-red-500/30 bg-red-500/10' : 'border-white/10'
                        }`}>
                          <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors mt-0.5 ${
                            termsAccepted ? 'bg-purple-600 border-purple-600' : 'border-gray-500'
                          }`}>
                            {termsAccepted && <Check size={14} className="text-white" />}
                          </div>
                          <input 
                            type="checkbox" 
                            checked={termsAccepted}
                            onChange={(e) => {
                              setTermsAccepted(e.target.checked);
                              if(e.target.checked) setTermsError(false);
                            }}
                            className="sr-only"
                          />
                          <div className="text-sm text-gray-400 leading-relaxed max-w-[90%]">
                            I accept the <a href="#terms" target="_blank" rel="noopener noreferrer" className="text-purple-400 font-bold hover:underline" onClick={(e) => e.stopPropagation()}>Terms & Conditions</a> and <a href="#privacy-policy" target="_blank" rel="noopener noreferrer" className="text-purple-400 font-bold hover:underline" onClick={(e) => e.stopPropagation()}>Privacy Policy</a>
                          </div>
                        </label>
                        {termsError && <p className="text-red-400 text-xs font-bold mt-2 ml-2">You must accept the terms to continue</p>}
                      </div>

                      {paypalLoaded ? (
                        <div ref={paypalContainerRef} className="paypal-button-container" />
                      ) : (
                        <div className="flex items-center justify-center p-8">
                          <Loader2 className="animate-spin text-purple-400" size={32} />
                          <span className="ml-3 text-gray-400">Loading PayPal...</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Card Payment Form - RaiAccept iframe */}
                  {selectedPaymentMethod === 'card' && (
                    <div className="mt-8">
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 mb-6">
                        <p className="text-sm text-blue-300">
                          <Building2 className="inline mr-2" size={16} />
                          A secure payment form by Raiffeisen Bank will appear on this page for you to enter your card details.
                        </p>
                      </div>

                      {/* Terms Checkbox */}
                      <div className="mb-6">
                        <label className={`flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer hover:bg-white/5 ${
                          termsError ? 'border-red-500/30 bg-red-500/10' : 'border-white/10'
                        }`}>
                          <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors mt-0.5 ${
                            termsAccepted ? 'bg-purple-600 border-purple-600' : 'border-gray-500'
                          }`}>
                            {termsAccepted && <Check size={14} className="text-white" />}
                          </div>
                          <input 
                            type="checkbox" 
                            checked={termsAccepted}
                            onChange={(e) => {
                              setTermsAccepted(e.target.checked);
                              if(e.target.checked) setTermsError(false);
                            }}
                            className="sr-only"
                          />
                          <div className="text-sm text-gray-400 leading-relaxed max-w-[90%]">
                            I accept the <a href="#terms" target="_blank" rel="noopener noreferrer" className="text-purple-400 font-bold hover:underline" onClick={(e) => e.stopPropagation()}>Terms & Conditions</a> and <a href="#privacy-policy" target="_blank" rel="noopener noreferrer" className="text-purple-400 font-bold hover:underline" onClick={(e) => e.stopPropagation()}>Privacy Policy</a>
                          </div>
                        </label>
                        {termsError && <p className="text-red-400 text-xs font-bold mt-2 ml-2">You must accept the terms to continue</p>}
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
              <div className="bg-gradient-to-br from-[#1a1c2d] to-black p-6 sm:p-10 md:p-12 rounded-[2rem] sm:rounded-[3.5rem] text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/20 rounded-full blur-[60px] translate-x-1/2 -translate-y-1/2"></div>
                <h3 className="text-lg sm:text-xl font-black mb-6 sm:mb-8 uppercase tracking-widest border-b border-white/10 pb-4 sm:pb-6">Your Courses</h3>
                
                {/* Cart Loading Skeleton */}
                {cartLoading && cart.length > 0 ? (
                  <div className="space-y-4 mb-8">
                    {cart.slice(0, 3).map((_, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/10 animate-pulse">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white/10"></div>
                          <div className="flex-1">
                            <div className="h-3 w-3/4 bg-white/10 rounded mb-2"></div>
                            <div className="h-3 w-1/4 bg-white/10 rounded"></div>
                          </div>
                          <div className="w-8 h-8 rounded-lg bg-white/10"></div>
                        </div>
                      </div>
                    ))}
                    <div className="pt-6 border-t border-white/10 space-y-3">
                      <div className="flex justify-between">
                        <div className="h-3 w-16 bg-white/10 rounded"></div>
                        <div className="h-3 w-20 bg-white/10 rounded"></div>
                      </div>
                      <div className="flex justify-between">
                        <div className="h-4 w-12 bg-white/10 rounded"></div>
                        <div className="h-5 w-24 bg-white/20 rounded"></div>
                      </div>
                    </div>
                  </div>
                ) : cartItems.length > 0 ? (
                  <div className="space-y-4 mb-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {cartItems.map((item, idx) => (
                      <div 
                        key={item.id} 
                        className={`group p-3 sm:p-4 rounded-2xl sm:rounded-3xl border transition-all animate-reveal ${
                          pendingRemoval?.id === item.id 
                            ? 'bg-red-500/10 border-red-500/30 opacity-50' 
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`} 
                        style={{ animationDelay: `${idx * 0.1}s` }}
                      >
                        <div className="flex items-center justify-between gap-2 sm:gap-4">
                          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                            <div className={`w-9 sm:w-10 h-9 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shrink-0`}>
                              <ShoppingCart size={14} className="sm:hidden" />
                              <ShoppingCart size={16} className="hidden sm:block" />
                            </div>
                            <div className="overflow-hidden min-w-0">
                              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight leading-tight truncate">{item.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-[9px] sm:text-[10px] font-bold text-white uppercase tracking-widest">{item.price.toFixed(2)}€</p>
                                {item.originalPrice && (
                                  <p className="text-[8px] sm:text-[9px] font-bold text-gray-500 line-through">{item.originalPrice.toFixed(2)}€</p>
                                )}
                              </div>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleRemoveItem(item.id, item.name)}
                            disabled={pendingRemoval?.id === item.id}
                            className={`p-2 sm:p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg transition-colors ${
                              pendingRemoval?.id === item.id 
                                ? 'text-red-400 cursor-not-allowed' 
                                : 'text-gray-500 hover:text-pink-500 hover:bg-white/10'
                            }`}
                          >
                            <X size={18} />
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

                {/* Undo Removal Toast */}
                {pendingRemoval && (
                  <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-2xl flex items-center justify-between animate-reveal">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-500/30 flex items-center justify-center">
                        <X size={14} className="text-red-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-tight text-red-400">
                          Removing: {pendingRemoval.name}
                        </p>
                        <p className="text-[8px] text-gray-400 mt-0.5">Will be removed in 5 seconds</p>
                      </div>
                    </div>
                    <button
                      onClick={undoRemoval}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[9px] font-black uppercase tracking-widest text-white transition-all"
                    >
                      Undo
                    </button>
                  </div>
                )}

                {/* Discount Code Field */}
                {cartItems.length > 0 && (
                  <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-white/5 rounded-2xl sm:rounded-3xl border border-white/10">
                    <label htmlFor="promo-code" className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 sm:mb-3 block">Promo Code</label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-grow">
                        <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                        <input 
                          id="promo-code"
                          type="text" 
                          value={discountInput}
                          onChange={(e) => setDiscountInput(e.target.value)}
                          placeholder="ENTER CODE"
                          aria-describedby={discountError ? 'promo-code-error' : appliedDiscount ? 'promo-code-success' : undefined}
                          className="w-full bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl py-3 pl-10 pr-4 text-[10px] font-black uppercase tracking-widest text-white focus:border-purple-500 focus:outline-none transition-all"
                        />
                      </div>
                      <button 
                        type="button"
                        onClick={handleApplyDiscount}
                        className="bg-white text-gray-900 px-6 py-3 sm:py-0 rounded-xl sm:rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-purple-500 hover:text-white transition-all shadow-md active:scale-95 min-h-[44px]"
                      >
                        Apply
                      </button>
                    </div>
                    {discountError && (
                      <p id="promo-code-error" className="text-[9px] font-bold text-pink-500 mt-2 ml-2 uppercase tracking-widest" role="alert">{discountError}</p>
                    )}
                    {appliedDiscount && (
                      <div id="promo-code-success" className="flex items-center gap-2 mt-3 ml-2 text-green-400" role="status">
                        <Ticket size={14} />
                        <span className="text-[9px] font-black uppercase tracking-widest flex-1 truncate">Code Applied: {appliedDiscount.code}</span>
                        <button onClick={() => setAppliedDiscount(null)} className="ml-auto text-white/40 hover:text-white transition-colors p-1 min-w-[32px] min-h-[32px] flex items-center justify-center">
                          <X size={14} />
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

                  {/* Digital delivery note */}
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-3">
                    📦 Digital product — instant access upon payment confirmation
                  </p>

                  {/* Currency conversion notice */}
                  <div className="mt-4 p-3 bg-blue-500/5 rounded-xl border border-blue-500/10">
                    <p className="text-[9px] text-gray-500 leading-relaxed">
                      <strong className="text-gray-400">Currency notice:</strong> All prices are shown in EUR. Card payments are processed in RSD (Serbian Dinars) at a fixed rate of 1 EUR = {EUR_TO_RSD_RATE} RSD. Your card will be charged approximately <strong className="text-gray-400">{formatRsdAmount(total)}</strong> for this order.
                    </p>
                  </div>
                </div>
              </div>

              {/* Pre-contractual information */}
              <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 shadow-lg">
                <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 mb-3">Seller Information</h4>
                <div className="space-y-1.5 text-[10px] text-gray-500">
                  <p><span className="text-gray-400 font-bold">Seller:</span> ANA MILATOVIĆ PR CENTAR ZA EDUKACIJE EDUWAY</p>
                  <p><span className="text-gray-400 font-bold">PIB:</span> 115450214 &nbsp;|&nbsp; <span className="text-gray-400 font-bold">MB:</span> 68375720</p>
                  <p><span className="text-gray-400 font-bold">Product type:</span> Digital educational content</p>
                  <p><span className="text-gray-400 font-bold">Delivery:</span> Instant digital access upon payment</p>
                  <p><span className="text-gray-400 font-bold">Right to withdraw:</span> 14 days (<a href="#terms" className="text-purple-400 hover:underline">see conditions</a>)</p>
                </div>
                <a href="#terms" className="inline-block mt-3 text-[9px] text-purple-400 font-bold uppercase tracking-widest hover:underline">
                  Full Terms & Conditions →
                </a>
                <div className="space-y-4">
                  {[
                    "Lifetime course updates",
                    "Official DSA Smart Start Certificate",
                    "24/7 Priority specialist support",
                    "Satisfaction guarantee"
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle2 size={16} className="text-purple-400" />
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{item}</span>
                    </div>
                  ))}
                </div>
                
                {/* Email confirmation note */}
                {customerEmail && (
                  <div className="mt-6 pt-4 border-t border-white/10">
                    <div className="flex items-start gap-3 text-gray-500">
                      <Mail size={16} className="mt-0.5 flex-shrink-0" />
                      <p className="text-xs">
                        Order confirmation will be sent to <strong className="text-gray-300">{customerEmail}</strong>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Security badges */}
              <div className="flex flex-col items-center gap-4 text-gray-400">
                <div className="flex items-center justify-center gap-6">
                  <div className="flex items-center gap-2">
                    <Lock size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">SSL Secured</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">3D Secure</span>
                  </div>
                </div>
                {/* Card brand & 3D Secure logos */}
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <img src="/assets/images/visa-secure-logo.jpg" alt="Visa Secure" className="h-7 opacity-60" />
                  <img src="/assets/images/mastercard-id-check-logo.jpg" alt="Mastercard ID Check" className="h-7 opacity-60" />
                  <img src="/assets/images/visa-logo.jpg" alt="Visa" className="h-5 opacity-50" />
                  <img src="/assets/images/mastercard-logo.png" alt="Mastercard" className="h-5 opacity-50" />
                  <img src="/assets/images/dinacard-logo.jpg" alt="DinaCard" className="h-5 opacity-50" />
                </div>
                {/* Raiffeisen Bank badge */}
                <div className="flex items-center gap-2 mt-1">
                  <img src="/assets/images/raiffeisen-logo.png" alt="Raiffeisen Bank" className="h-5 opacity-50" />
                  <span className="text-[9px] text-gray-500 uppercase tracking-widest">Payment processing by Raiffeisen Bank</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── RaiAccept Payment Iframe Modal ───────────────────────────── */}
      {showPaymentIframe && paymentIframeUrl && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ height: '80vh' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
              <div className="flex items-center gap-2">
                <Lock size={18} />
                <span className="font-semibold text-sm">Secure Payment – Raiffeisen Bank</span>
              </div>
              <button
                onClick={() => {
                  setShowPaymentIframe(false);
                  setPaymentIframeUrl(null);
                  setLoading(false);
                  setError('Payment was cancelled.');
                }}
                className="p-1 rounded-full hover:bg-white/20 transition"
                aria-label="Close payment"
              >
                <X size={20} />
              </button>
            </div>
            {/* Loading indicator while iframe loads */}
            <div className="absolute inset-0 top-14 flex items-center justify-center pointer-events-none">
              <Loader2 size={36} className="animate-spin text-blue-500 opacity-50" />
            </div>
            {/* Payment iframe */}
            <iframe
              src={paymentIframeUrl}
              title="RaiAccept Payment"
              className="w-full border-0 relative z-10"
              style={{ height: 'calc(80vh - 56px)' }}
              sandbox="allow-forms allow-modals allow-same-origin allow-scripts allow-popups allow-storage-access-by-user-activation allow-downloads"
            />
          </div>
        </div>
      )}

      {/* ── Auth Modal (inline login/register for checkout) ───────── */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLoginSuccess={handleAuthModalSuccess}
      />

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
