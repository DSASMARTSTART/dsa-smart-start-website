
import React, { useState, useEffect } from 'react';
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
import CheckoutPage from './components/CheckoutPage';
import WhatsAppButton from './components/WhatsAppButton';
import DashboardPage from './components/DashboardPage';
import CourseViewer from './components/CourseViewer';
import PolicyPage from './components/PolicyPage';
import { useAuth } from './contexts/AuthContext';
import { useUserProgress } from './src/hooks/useUserProgress';

// Admin Dashboard Components
import { 
  AdminLayout, AdminHome, AdminUsers, AdminCourses, 
  CourseEditor, AdminAudit 
} from './components/admin';

const App: React.FC = () => {
  const { user, profile, loading: authLoading, signOut, isAdmin: checkIsAdmin, canAccessAdmin } = useAuth();
  const { progress, toggleProgress, isLoading: progressLoading } = useUserProgress();
  const [currentPath, setCurrentPath] = useState('home');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [cart, setCart] = useState<string[]>([]);

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
      else if (hash === '#dashboard') setCurrentPath('dashboard');
      // Policy pages
      else if (hash === '#privacy-policy') setCurrentPath('privacy-policy');
      else if (hash === '#cookie-policy') setCurrentPath('cookie-policy');
      else if (hash === '#refund-policy') setCurrentPath('refund-policy');
      // Admin routes
      else if (hash === '#admin') setCurrentPath('admin');
      else if (hash === '#admin-users') setCurrentPath('admin-users');
      else if (hash === '#admin-courses') setCurrentPath('admin-courses');
      else if (hash === '#admin-audit') setCurrentPath('admin-audit');
      else if (hash.startsWith('#admin-course-edit-')) {
        setCurrentPath('admin-course-edit');
        setSelectedCourseId(hash.replace('#admin-course-edit-', ''));
      }
      else if (hash.startsWith('#admin-user-')) {
        setCurrentPath('admin-user-detail');
        setSelectedCourseId(hash.replace('#admin-user-', ''));
      }
      else if (hash.startsWith('#syllabus-')) {
        setCurrentPath('syllabus');
        setSelectedCourseId(hash.replace('#syllabus-', ''));
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
    } else if (path === 'viewer' && params) {
      window.location.hash = `#viewer-${params}`;
    } else if (path === 'admin-course-edit' && params) {
      window.location.hash = `#admin-course-edit-${params}`;
    } else if (path === 'admin-user-detail' && params) {
      window.location.hash = `#admin-user-${params}`;
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
    await signOut();
    navigateTo('home');
  };

  // Check for admin access
  const isAdmin = canAccessAdmin();
  const isAdminPath = currentPath.startsWith('admin');

  const addToCart = (id: string) => {
    if (!cart.includes(id)) {
      setCart(prev => [...prev, id]);
    }
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item !== id));
  };

  const enrollNow = (id: string) => {
    addToCart(id);
    navigateTo('checkout');
  };

  return (
    <main className="min-h-screen bg-white selection:bg-purple-100 selection:text-purple-900 scroll-smooth">
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
      
      {currentPath === 'home' && (
        <>
          <HeroSection onNavigate={navigateTo} />
          <div id="about"><AboutSection /></div>
          <MissionSection />
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
        />
      )}

      {currentPath === 'checkout' && (
        <CheckoutPage 
          cart={cart}
          onBack={() => navigateTo('courses')} 
          onRemoveItem={removeFromCart}
          onClearCart={() => setCart([])}
          onBrowse={() => navigateTo('courses')}
          user={currentUser}
        />
      )}

      {currentPath === 'dashboard' && (
        <DashboardPage 
          user={currentUser} 
          progress={progress} 
          onOpenCourse={(id) => navigateTo('viewer', id)}
        />
      )}

      {currentPath === 'viewer' && selectedCourseId && (
        <CourseViewer 
          courseId={selectedCourseId}
          progress={progress}
          onToggleProgress={toggleProgress}
          onBack={() => navigateTo('dashboard')}
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
      
      {!isAdminPath && <Footer onNavigate={navigateTo} />}
      {!isAdminPath && <WhatsAppButton />}
    </main>
  );
};

export default App;
