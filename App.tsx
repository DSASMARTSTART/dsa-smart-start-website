
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { parseRoute } from './lib/routes';
import { lazyPage } from './lib/lazyPage';
import { preloadRouteData } from './lib/preloadRouteData';
// Eager: the landing page + always-visible chrome (first paint needs these).
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import AboutSection from './components/AboutSection';
import MissionSection from './components/MissionSection';
import RootsSection from './components/RootsSection';
import MethodSection from './components/MethodSection';
import PathwaysDetail from './components/PathwaysDetail';
import TestimonialsSection from './components/TestimonialsSection';
import Footer from './components/Footer';
import WhatsAppButton from './components/WhatsAppButton';
import CartBubble from './components/CartBubble';

// Lazy: everything behind a route change. Keeps these out of the initial bundle
// (audit P3 — main chunk was ~817 kB). React.lazy needs a default export.
const FaqPage = lazyPage(() => import('./components/FaqPage'), ['faq']);
const WhoWeAre = lazyPage(() => import('./components/WhoWeAre'), ['home']);
const ContactPage = lazyPage(() => import('./components/ContactPage'), ['contact']);
const LoginRegisterPage = lazyPage(() => import('./components/LoginRegisterPage'), ['auth']);
const CoursesPage = lazyPage(() => import('./components/CoursesPage'), ['courses']);
const CourseSyllabusPage = lazyPage(() => import('./components/CourseSyllabusPage'), ['courses']);
const EbookDetailPage = lazyPage(() => import('./components/EbookDetailPage'), ['courses']);
const LiveCourseDetailPage = lazyPage(() => import('./components/LiveCourseDetailPage'), ['courses']);
const CheckoutPage = lazyPage(() => import('./components/CheckoutPage'), ['checkout']);
const CheckoutSuccessPage = lazyPage(() => import('./components/CheckoutSuccessPage'), ['checkout', 'dashboard']);
const DashboardPage = lazyPage(() => import('./components/DashboardPage'), ['dashboard']);
const CourseViewer = lazyPage(() => import('./components/CourseViewer'), ['courses']);
const PolicyPage = lazyPage(() => import('./components/PolicyPage'), ['policies']);
const ResetPasswordPage = lazyPage(() => import('./components/ResetPasswordPage'), ['auth']);
import { useAuth } from './contexts/AuthContext';
import { clearCoursesCache, enrollmentsApi } from './data/supabaseStore';
import { CheckCircle, AlertCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Each admin screen loads independently, including the large course editor.
const AdminLayout = lazyPage(() => import('./components/admin/AdminLayout'));
const AdminHome = lazyPage(() => import('./components/admin/AdminHome'));
const AdminUsers = lazyPage(() => import('./components/admin/AdminUsers'));
const AdminCourses = lazyPage(() => import('./components/admin/AdminCourses'));
const CourseEditor = lazyPage(() => import('./components/admin/CourseEditor'));
const AdminAudit = lazyPage(() => import('./components/admin/AdminAudit'));
const AdminDiscountCodes = lazyPage(() => import('./components/admin/AdminDiscountCodes'));
const AdminTransactions = lazyPage(() => import('./components/admin/AdminTransactions'));
const AdminPaymentOrphans = lazyPage(() => import('./components/admin/AdminPaymentOrphans'));
const TeacherWorkspace = lazyPage(() => import('./components/live-learning/TeacherWorkspace'));
const LiveLearningPage = lazyPage(() => import('./components/live-learning/LiveLearningPage'));
const LiveLearningStudio = lazyPage(() => import('./components/live-learning/LiveLearningStudio'));
const AdminSettings = lazyPage(() => import('./components/admin/AdminSettings'));

// Start the requested page chunk while startup translations are still loading.
export function preloadPage(path: string) {
  const pages = {
    faq: FaqPage, 'who-we-are': WhoWeAre, contact: ContactPage, login: LoginRegisterPage,
    courses: CoursesPage, syllabus: CourseSyllabusPage, ebook: EbookDetailPage,
    'live-course': LiveCourseDetailPage, checkout: CheckoutPage,
    'checkout-success': CheckoutSuccessPage, dashboard: DashboardPage, viewer: CourseViewer,
    terms: PolicyPage, 'privacy-policy': PolicyPage, 'cookie-policy': PolicyPage,
    'refund-policy': PolicyPage, 'reset-password': ResetPasswordPage,
    'teacher-calendar': TeacherWorkspace, 'live-learning': LiveLearningPage,
    admin: AdminHome, 'admin-users': AdminUsers, 'admin-courses': AdminCourses,
    'admin-course-edit': CourseEditor, 'admin-transactions': AdminTransactions,
    'admin-payment-orphans': AdminPaymentOrphans, 'admin-discounts': AdminDiscountCodes,
    'admin-audit': AdminAudit, 'admin-settings': AdminSettings, 'admin-teachers': LiveLearningStudio,
  };
  void pages[path as keyof typeof pages]?.preload().catch(() => {});
  if (path.startsWith('admin')) void AdminLayout.preload().catch(() => {});
}

// Toast notification type
interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

// LocalStorage key for cart persistence
const CART_STORAGE_KEY = 'dsa_cart';
const MATERIALS_STORAGE_KEY = 'dsa_materials';

const App: React.FC = () => {
  const { t } = useTranslation('common');
  const { user, profile, loading: authLoading, signOut, isAdmin: checkIsAdmin, canAccessAdmin } = useAuth();
  // Note: useUserProgress is now called only in components that need it (DashboardPage, CourseViewer)
  // This prevents unnecessary API calls on every page load
  const [route, setRoute] = useState(() => parseRoute());
  const { currentPath, selectedCourseId, selectedTeacherId, liveBookingView,
    adminUserId, coursesDefaultTab } = route;

  // Initialize cart from localStorage
  const [cart, setCart] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Initialize teaching materials selections from localStorage
  const [teachingMaterialsCart, setTeachingMaterialsCart] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(MATERIALS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Toast notifications state
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Show toast notification
  const showToast = useCallback((type: Toast['type'], message: string) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, type, message }]);
    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  // Remove toast manually
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
      console.error('Failed to save cart to localStorage:', error);
    }
  }, [cart]);

  // Persist teaching materials selections to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(MATERIALS_STORAGE_KEY, JSON.stringify(teachingMaterialsCart));
    } catch (error) {
      console.error('Failed to save materials to localStorage:', error);
    }
  }, [teachingMaterialsCart]);

  // Toggle teaching materials for a cart item
  const toggleTeachingMaterials = useCallback((courseId: string, selected?: boolean) => {
    setTeachingMaterialsCart(prev => ({
      ...prev,
      [courseId]: selected !== undefined ? selected : !prev[courseId]
    }));
  }, []);

  // Derived auth state from context
  const isLoggedIn = !!user;
  const currentUser = profile ? { name: profile.name, email: profile.email, role: profile.role } : null;

  // Robust hash routing logic
  useEffect(() => {
    const handleHash = () => {
      const nextRoute = parseRoute();
      preloadPage(nextRoute.currentPath);
      preloadRouteData(nextRoute);
      setRoute(nextRoute);
      window.scrollTo({ top: 0, behavior: 'instant' });
      if (nextRoute.currentPath === 'checkout-success') {
        setCart([]);
        setTeachingMaterialsCart({});
      }
    };

    window.addEventListener('hashchange', handleHash);
    handleHash();
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Dynamic per-route document title (audit P4). The SPA previously kept a single
  // static <title> on every route, which hurts SEO and shareability.
  useEffect(() => {
    const BRAND = 'Eduway Academy';
    const titles: Record<string, string> = {
      home: 'Eduway Academy | English Learning for Dyslexia',
      courses: `Products & Courses — ${BRAND}`,
      faq: `FAQ — ${BRAND}`,
      'who-we-are': `Who We Are — ${BRAND}`,
      contact: `Contact — ${BRAND}`,
      login: `Log In / Register — ${BRAND}`,
      checkout: `Checkout — ${BRAND}`,
      'checkout-success': `Order Confirmed — ${BRAND}`,
      dashboard: `My Dashboard — ${BRAND}`,
      viewer: `Course — ${BRAND}`,
      syllabus: `Course Syllabus — ${BRAND}`,
      ebook: `E-book — ${BRAND}`,
      'live-course': `Live Course — ${BRAND}`,
      terms: `Terms & Conditions — ${BRAND}`,
      privacy: `Privacy Policy — ${BRAND}`,
      'privacy-policy': `Privacy Policy — ${BRAND}`,
      'cookie-policy': `Cookie Policy — ${BRAND}`,
      'refund-policy': `Refund Policy — ${BRAND}`,
      'reset-password': `Reset Password — ${BRAND}`,
      'live-learning': `Live Learning — ${BRAND}`,
      'not-found': `Page Not Found — ${BRAND}`,
    };
    const key = currentPath.startsWith('admin') ? 'admin' : currentPath;
    document.title = key === 'admin'
      ? `Admin — ${BRAND}`
      : (titles[currentPath] || `${BRAND} | English Learning for Dyslexia`);
  }, [currentPath]);

  const navigateTo = (path: string, params?: string) => {
    if (path === 'syllabus' && params) {
      window.location.hash = `#syllabus-${params}`;
    } else if (path === 'ebook' && params) {
      window.location.hash = `#ebook-${params}`;
    } else if (path === 'live-course' && params) {
      window.location.hash = `#live-course-${params}`;
    } else if (path === 'viewer' && params) {
      window.location.hash = `#viewer-${params}`;
    } else if (path === 'admin-course-edit' && params) {
      window.location.hash = `#admin-course-edit-${params}`;
    } else if (path === 'home') {
      window.location.hash = '#home';
    } else if (path.startsWith('courses-')) {
      window.location.hash = `#${path}`;
    } else {
      window.location.hash = `#${path}`;
    }
  };

  const handleLoginSuccess = () => {
    // Check if user has admin access and redirect accordingly
    if (canAccessAdmin()) {
      navigateTo('admin');
    } else {
      navigateTo('dashboard');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      clearCoursesCache(); // Clear cached data
      // Small delay to ensure signOut completes before reload
      setTimeout(() => {
        window.location.hash = '#home';
        window.location.reload(); // Force full refresh to clear all state
      }, 100);
    } catch (error) {
      console.error('Logout error:', error);
      // Force reload anyway
      window.location.hash = '#home';
      window.location.reload();
    }
  };

  // Check for admin access
  const isAdmin = canAccessAdmin();
  const isAdminPath = currentPath.startsWith('admin');

  // Get user ID for enrollment checks
  const userId = user?.id || profile?.id;

  // Loading state for add to cart (prevents rapid clicks during enrollment check)
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  const addToCart = useCallback(async (id: string) => {
    // Prevent rapid clicks
    if (addingToCart) return;
    
    // Check if already in cart
    if (cart.includes(id)) {
      showToast('info', t('toast.alreadyInCart'));
      return;
    }

    setAddingToCart(id);

    // Check if user is logged in and already owns this product
    if (userId) {
      try {
        const isEnrolled = await enrollmentsApi.checkEnrollment(userId, id);
        if (isEnrolled) {
          showToast('info', t('toast.alreadyOwn'));
          setAddingToCart(null);
          return;
        }
      } catch (error) {
        // Don't block cart if check fails, just log it
        console.error('Error checking enrollment:', error);
      }
    }

    // Add to cart
    setCart(prev => [...prev, id]);
    showToast('success', t('toast.addedToCart'));
    setAddingToCart(null);
  }, [cart, userId, showToast, addingToCart]);

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item !== id));
    // Also remove teaching materials selection
    setTeachingMaterialsCart(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const enrollNow = useCallback(async (id: string) => {
    // Check if user already owns this
    if (userId) {
      try {
        const isEnrolled = await enrollmentsApi.checkEnrollment(userId, id);
        if (isEnrolled) {
          showToast('info', t('toast.alreadyOwn'));
          navigateTo('dashboard');
          return;
        }
      } catch (error) {
        console.error('Error checking enrollment:', error);
      }
    }
    
    await addToCart(id);
    navigateTo('checkout');
  }, [userId, addToCart, showToast]);

  return (
    <main className="min-h-screen bg-white selection:bg-purple-100 selection:text-purple-900 scroll-smooth">
      {/* Skip to main content link for keyboard/screen reader users */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:bg-purple-600 focus:text-white focus:px-6 focus:py-3 focus:rounded-full focus:font-bold focus:text-sm focus:shadow-lg"
      >
        {t('skipToContent')}
      </a>
      
      {!isAdminPath && (
        <Navbar 
          onNavigate={navigateTo} 
          currentPath={currentPath} 
          cartCount={cart.length}
          isLoggedIn={isLoggedIn}
          user={currentUser}
          onLogout={handleLogout}
          isAdmin={isAdmin}
        />
      )}
      
      {/* Main content area - skip link target */}
      <div id="main-content">
        <Suspense fallback={
          <div className="min-h-[60vh] flex items-center justify-center bg-black">
            <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }>
        {currentPath === 'home' && (
          <>
            <HeroSection onNavigate={navigateTo} />
            <div id="about"><AboutSection onNavigate={navigateTo} /></div>
            <MissionSection onNavigate={navigateTo} />
            <div id="roots"><RootsSection onNavigate={navigateTo} /></div>
            <div id="methods"><MethodSection onNavigate={navigateTo} /></div>
            <PathwaysDetail />
            <TestimonialsSection />
          </>
        )}
        
        {currentPath === 'faq' && <FaqPage />}
        {currentPath === 'who-we-are' && <WhoWeAre />}
        {currentPath === 'contact' && <ContactPage />}
        {currentPath === 'login' && <LoginRegisterPage onLoginSuccess={handleLoginSuccess} />}
        {currentPath === 'reset-password' && <ResetPasswordPage onComplete={() => navigateTo('login')} />}
        
        {currentPath === 'courses' && (
          <CoursesPage 
            onSelectCourse={(id) => navigateTo('syllabus', id)} 
            onEnroll={enrollNow}
            onNavigate={navigateTo}
            cart={cart}
            onAddToCart={addToCart}
            defaultTab={coursesDefaultTab}
          />
        )}

        {currentPath === 'syllabus' && selectedCourseId && (
          <CourseSyllabusPage 
            courseId={selectedCourseId} 
            onBack={() => navigateTo('courses')} 
            onEnroll={enrollNow}
            onAddToCart={addToCart}
            isInCart={cart.includes(selectedCourseId)}
            teachingMaterialsSelected={teachingMaterialsCart[selectedCourseId] || false}
            onToggleTeachingMaterials={(selected) => toggleTeachingMaterials(selectedCourseId, selected)}
            isAddingToCart={addingToCart === selectedCourseId}
          />
      )}

      {currentPath === 'ebook' && selectedCourseId && (
        <EbookDetailPage 
          courseId={selectedCourseId} 
          onBack={() => navigateTo('courses')} 
          onEnroll={enrollNow}
          onAddToCart={addToCart}
          isInCart={cart.includes(selectedCourseId)}
          isAddingToCart={addingToCart === selectedCourseId}
        />
      )}

      {currentPath === 'live-course' && selectedCourseId && (
        <LiveCourseDetailPage
          courseId={selectedCourseId}
          onBack={() => navigateTo('courses')}
          onEnroll={enrollNow}
          onAddToCart={addToCart}
          isInCart={cart.includes(selectedCourseId)}
          isAddingToCart={addingToCart === selectedCourseId}
        />
      )}

      {currentPath === 'checkout' && (
        <CheckoutPage 
          cart={cart}
          onBack={() => navigateTo('courses')} 
          onRemoveItem={removeFromCart}
          onClearCart={() => { setCart([]); setTeachingMaterialsCart({}); }}
          onBrowse={() => navigateTo('courses')}
          onNavigate={navigateTo}
          user={currentUser}
          initialTeachingMaterials={teachingMaterialsCart}
          onTeachingMaterialsChange={(courseId, selected) => {
            setTeachingMaterialsCart(prev => ({
              ...prev,
              [courseId]: selected
            }));
          }}
        />
      )}

      {currentPath === 'checkout-success' && (
        <CheckoutSuccessPage onNavigate={navigateTo} />
      )}

      {currentPath === 'dashboard' && (
        <DashboardPage 
          user={currentUser} 
          onOpenCourse={(id) => navigateTo('viewer', id)}
          onNavigate={navigateTo}
        />
      )}

      {currentPath === 'teacher-calendar' && <TeacherWorkspace />}
      {currentPath === 'live-learning' && <LiveLearningPage courseId={selectedCourseId} teacherId={selectedTeacherId} bookingView={liveBookingView} onNavigate={navigateTo} />}

      {currentPath === 'viewer' && selectedCourseId && (
        <CourseViewer 
          courseId={selectedCourseId}
          onBack={() => navigateTo('dashboard')}
          onNavigateToCheckout={(courseId) => {
            setCart([courseId]);
            navigateTo('checkout');
          }}
        />
      )}

      {/* Policy Pages */}
      {currentPath === 'terms' && (
        <PolicyPage type="terms" onBack={() => navigateTo('home')} />
      )}
      {currentPath === 'privacy-policy' && (
        <PolicyPage type="privacy" onBack={() => navigateTo('home')} />
      )}
      {currentPath === 'cookie-policy' && (
        <PolicyPage type="cookie" onBack={() => navigateTo('home')} />
      )}
      {currentPath === 'refund-policy' && (
        <PolicyPage type="refund" onBack={() => navigateTo('home')} />
      )}

      {/* 404 — unknown route (audit U4) */}
      {currentPath === 'not-found' && (
        <div className="min-h-[70vh] flex items-center justify-center bg-black px-6">
          <div className="text-center max-w-md">
            <p className="text-7xl font-black text-purple-500 mb-4">404</p>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-3">
              {t('notFound.title', 'Page not found')}
            </h1>
            <p className="text-gray-400 mb-8">
              {t('notFound.message', "The page you're looking for doesn't exist or has moved.")}
            </p>
            <button
              onClick={() => navigateTo('home')}
              className="px-8 py-4 bg-purple-600 text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-all"
            >
              {t('notFound.goHome', 'Back to home')}
            </button>
          </div>
        </div>
      )}

      {/* Admin Routes */}
      {isAdminPath && isAdmin && (
        <AdminLayout currentPath={currentPath} onNavigate={navigateTo} onLogout={handleLogout}>
          {currentPath === 'admin' && <AdminHome onNavigate={navigateTo} />}
          {currentPath === 'admin-teachers' && <LiveLearningStudio />}
          {currentPath === 'admin-users' && <AdminUsers onNavigate={navigateTo} initialUserId={adminUserId} />}
          {currentPath === 'admin-courses' && <AdminCourses onNavigate={navigateTo} />}
          {currentPath === 'admin-transactions' && <AdminTransactions onNavigate={navigateTo} />}
          {currentPath === 'admin-payment-orphans' && <AdminPaymentOrphans onNavigate={navigateTo} />}
          {currentPath === 'admin-discounts' && <AdminDiscountCodes onNavigate={navigateTo} />}
          {currentPath === 'admin-course-edit' && selectedCourseId && (
            <CourseEditor courseId={selectedCourseId} onNavigate={navigateTo} />
          )}
          {currentPath === 'admin-audit' && <AdminAudit onNavigate={navigateTo} />}
          {currentPath === 'admin-settings' && <AdminSettings onNavigate={navigateTo} />}
        </AdminLayout>
      )}

      {/* Redirect non-admin users trying to access admin pages */}
      {isAdminPath && !isAdmin && (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('accessDenied.title')}</h1>
            <p className="text-gray-600 mb-6">{t('accessDenied.message')}</p>
            <button 
              onClick={() => navigateTo('home')}
              className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
            >
              {t('accessDenied.goToHome')}
            </button>
          </div>
        </div>
      )}
        </Suspense>
      </div>{/* End main-content */}
      
      {!isAdminPath && <Footer onNavigate={navigateTo} />}
      {!isAdminPath && currentPath !== 'live-learning' && currentPath !== 'dashboard' && currentPath !== 'teacher-calendar' && <WhatsAppButton />}
      {!isAdminPath && <CartBubble cart={cart} onNavigateToCheckout={() => navigateTo('checkout')} />}

      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-lg border backdrop-blur-xl animate-reveal ${
              toast.type === 'success' ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800' :
              toast.type === 'error' ? 'bg-red-50/95 border-red-200 text-red-800' :
              'bg-purple-50/95 border-purple-200 text-purple-800'
            }`}
          >
            {toast.type === 'success' && <CheckCircle size={20} className="text-emerald-500 flex-shrink-0" />}
            {toast.type === 'error' && <AlertCircle size={20} className="text-red-500 flex-shrink-0" />}
            {toast.type === 'info' && <AlertCircle size={20} className="text-purple-500 flex-shrink-0" />}
            <span className="text-sm font-semibold">{toast.message}</span>
            <button 
              onClick={() => removeToast(toast.id)}
              className="ml-2 p-1 hover:bg-black/5 rounded-full transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </main>
  );
};

export default App;
