
import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import AboutSection from './components/AboutSection';
import MissionSection from './components/MissionSection';
import RootsSection from './components/RootsSection';
import MethodSection from './components/MethodSection';
import PathwaysDetail from './components/PathwaysDetail';
import CareerSection from './components/CareerSection';
import TestimonialsSection from './components/TestimonialsSection';
import Footer from './components/Footer';
import FaqPage from './components/FaqPage';
import WhoWeAre from './components/WhoWeAre';
import ContactPage from './components/ContactPage';
import LoginRegisterPage from './components/LoginRegisterPage';
import CoursesPage from './components/CoursesPage';
import CourseSyllabusPage from './components/CourseSyllabusPage';
import EbookDetailPage from './components/EbookDetailPage';
import CheckoutPage from './components/CheckoutPage';
import CheckoutSuccessPage from './components/CheckoutSuccessPage';
import WhatsAppButton from './components/WhatsAppButton';
import CartBubble from './components/CartBubble';
import DashboardPage from './components/DashboardPage';
import CourseViewer from './components/CourseViewer';
import PolicyPage from './components/PolicyPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import { useAuth } from './contexts/AuthContext';
import { clearCoursesCache, enrollmentsApi } from './data/supabaseStore';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

// Admin Dashboard Components
import { 
  AdminLayout, AdminHome, AdminUsers, AdminCourses, 
  CourseEditor, AdminAudit, AdminDiscountCodes, AdminTransactions 
} from './components/admin';

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
  const { user, profile, loading: authLoading, signOut, isAdmin: checkIsAdmin, canAccessAdmin } = useAuth();
  // Note: useUserProgress is now called only in components that need it (DashboardPage, CourseViewer)
  // This prevents unnecessary API calls on every page load
  const [currentPath, setCurrentPath] = useState('home');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  
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
      const hash = window.location.hash || '#home';
      window.scrollTo({ top: 0, behavior: 'instant' });

      if (hash === '#home') setCurrentPath('home');
      else if (hash === '#faq') setCurrentPath('faq');
      else if (hash === '#who-we-are') setCurrentPath('who-we-are');
      else if (hash === '#contact') setCurrentPath('contact');
      else if (hash === '#login') setCurrentPath('login');
      else if (hash === '#courses') setCurrentPath('courses');
      else if (hash === '#checkout') setCurrentPath('checkout');
      else if (hash === '#checkout-success' || hash.startsWith('#checkout-success?')) setCurrentPath('checkout-success');
      else if (hash === '#dashboard') setCurrentPath('dashboard');
      // Policy pages
      else if (hash === '#privacy-policy') setCurrentPath('privacy-policy');
      else if (hash === '#cookie-policy') setCurrentPath('cookie-policy');
      else if (hash === '#refund-policy') setCurrentPath('refund-policy');
      else if (hash === '#reset-password') setCurrentPath('reset-password');
      // Admin routes
      else if (hash === '#admin') setCurrentPath('admin');
      else if (hash === '#admin-users') setCurrentPath('admin-users');
      else if (hash === '#admin-courses') setCurrentPath('admin-courses');
      else if (hash === '#admin-transactions') setCurrentPath('admin-transactions');
      else if (hash === '#admin-discounts') setCurrentPath('admin-discounts');
      else if (hash === '#admin-audit') setCurrentPath('admin-audit');
      else if (hash.startsWith('#admin-course-edit-')) {
        setCurrentPath('admin-course-edit');
        setSelectedCourseId(hash.replace('#admin-course-edit-', ''));
      }
      // Note: User details are handled via modal in AdminUsers, not a separate route
      else if (hash.startsWith('#syllabus-')) {
        setCurrentPath('syllabus');
        setSelectedCourseId(hash.replace('#syllabus-', ''));
      }
      else if (hash.startsWith('#ebook-')) {
        setCurrentPath('ebook');
        setSelectedCourseId(hash.replace('#ebook-', ''));
      }
      else if (hash.startsWith('#viewer-')) {
        setCurrentPath('viewer');
        setSelectedCourseId(hash.replace('#viewer-', ''));
      }
      else setCurrentPath('home');
    };

    window.addEventListener('hashchange', handleHash);
    handleHash(); 
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const navigateTo = (path: string, params?: string) => {
    if (path === 'syllabus' && params) {
      window.location.hash = `#syllabus-${params}`;
    } else if (path === 'ebook' && params) {
      window.location.hash = `#ebook-${params}`;
    } else if (path === 'viewer' && params) {
      window.location.hash = `#viewer-${params}`;
    } else if (path === 'admin-course-edit' && params) {
      window.location.hash = `#admin-course-edit-${params}`;
    } else if (path === 'home') {
      window.location.hash = '#home';
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
      showToast('info', 'This item is already in your cart');
      return;
    }

    setAddingToCart(id);

    // Check if user is logged in and already owns this product
    if (userId) {
      try {
        const isEnrolled = await enrollmentsApi.checkEnrollment(userId, id);
        if (isEnrolled) {
          showToast('info', 'You already own this product! Check your dashboard.');
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
    showToast('success', 'Added to cart!');
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
          showToast('info', 'You already own this product! Check your dashboard.');
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
        Skip to main content
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
        {currentPath === 'home' && (
          <>
            <HeroSection onNavigate={navigateTo} />
            <div id="about"><AboutSection /></div>
            <MissionSection onNavigate={navigateTo} />
            <div id="roots"><RootsSection onNavigate={navigateTo} /></div>
            <div id="methods"><MethodSection /></div>
            <PathwaysDetail />
            <CareerSection />
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
            cart={cart}
            onAddToCart={addToCart}
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

      {currentPath === 'checkout' && (
        <CheckoutPage 
          cart={cart}
          onBack={() => navigateTo('courses')} 
          onRemoveItem={removeFromCart}
          onClearCart={() => { setCart([]); setTeachingMaterialsCart({}); }}
          onBrowse={() => navigateTo('courses')}
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
        />
      )}

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
      {currentPath === 'privacy-policy' && (
        <PolicyPage type="privacy" onBack={() => navigateTo('home')} />
      )}
      {currentPath === 'cookie-policy' && (
        <PolicyPage type="cookie" onBack={() => navigateTo('home')} />
      )}
      {currentPath === 'refund-policy' && (
        <PolicyPage type="refund" onBack={() => navigateTo('home')} />
      )}

      {/* Admin Routes */}
      {isAdminPath && isAdmin && (
        <AdminLayout currentPath={currentPath} onNavigate={navigateTo} onLogout={handleLogout}>
          {currentPath === 'admin' && <AdminHome onNavigate={navigateTo} />}
          {currentPath === 'admin-users' && <AdminUsers onNavigate={navigateTo} />}
          {currentPath === 'admin-courses' && <AdminCourses onNavigate={navigateTo} />}
          {currentPath === 'admin-transactions' && <AdminTransactions onNavigate={navigateTo} />}
          {currentPath === 'admin-discounts' && <AdminDiscountCodes onNavigate={navigateTo} />}
          {currentPath === 'admin-course-edit' && selectedCourseId && (
            <CourseEditor courseId={selectedCourseId} onNavigate={navigateTo} />
          )}
          {currentPath === 'admin-audit' && <AdminAudit onNavigate={navigateTo} />}
        </AdminLayout>
      )}

      {/* Redirect non-admin users trying to access admin pages */}
      {isAdminPath && !isAdmin && (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-6">You don't have permission to access this page.</p>
            <button 
              onClick={() => navigateTo('home')}
              className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      )}
      </div>{/* End main-content */}
      
      {!isAdminPath && <Footer onNavigate={navigateTo} />}
      {!isAdminPath && <WhatsAppButton />}
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
