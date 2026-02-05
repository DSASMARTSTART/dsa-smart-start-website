
import React, { useState, useEffect } from 'react';
import { Menu, X, ShoppingCart, User, LogOut, Layout, Shield } from 'lucide-react';

interface NavbarProps {
  onNavigate: (path: string) => void;
  currentPath: string;
  cartCount: number;
  isLoggedIn?: boolean;
  user?: {name: string, email: string} | null;
  onLogout?: () => void;
  isAdmin?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentPath, cartCount, isLoggedIn, user, onLogout, isAdmin }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = isLoggedIn 
    ? [
        { name: 'Dashboard', path: 'dashboard' },
        { name: 'Browse Courses', path: 'courses' },
        { name: 'FAQ', path: 'faq' },
        { name: 'Contacts', path: 'contact' },
      ]
    : [
        { name: 'Home', path: 'home' },
        { name: 'Who We Are', path: 'who-we-are' },
        { name: 'Courses', path: 'courses' },
        { name: 'FAQ', path: 'faq' },
        { name: 'Contacts', path: 'contact' },
        { name: 'Login/Register', path: 'login' },
      ];

  const handleLinkClick = (path: string) => {
    onNavigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <nav className={`fixed top-0 left-0 w-full z-[100] transition-all duration-500 ${isScrolled ? 'py-4' : 'py-6'}`}>
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className={`flex items-center justify-between bg-black/60 backdrop-blur-xl border border-white/10 px-4 md:px-8 py-3 rounded-full transition-shadow duration-500 ${isScrolled ? 'shadow-xl shadow-purple-500/10' : ''}`}>
          
          <button onClick={() => handleLinkClick(isLoggedIn ? 'dashboard' : 'home')} className="flex items-center gap-3 shrink-0">
            <img 
              src="/assets/logo.svg" 
              alt="Eduway Logo" 
              className="w-9 h-9 md:w-10 md:h-10 object-contain"
            />
            <span className="hidden sm:inline-block text-lg font-black tracking-tighter text-white whitespace-nowrap">
              EDU<span className="text-[#AB8FFF]">WAY</span>
            </span>
          </button>

          <div className="hidden lg:flex items-center gap-6 xl:gap-8 mx-4">
            {navLinks.map((link) => (
              <button 
                key={link.name} 
                onClick={() => handleLinkClick(link.path)}
                className={`text-[10px] xl:text-[11px] font-black transition-colors tracking-widest whitespace-nowrap uppercase ${currentPath === link.path ? 'text-[#AB8FFF]' : 'text-gray-300 hover:text-[#AB8FFF]'}`}
              >
                {link.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 md:gap-4 shrink-0">
            <button 
              onClick={() => handleLinkClick('checkout')}
              className="relative p-2.5 rounded-full bg-white/5 text-gray-300 hover:bg-purple-500/20 hover:text-purple-400 transition-all border border-white/10"
            >
              <ShoppingCart size={18} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg border-2 border-black animate-bounce">
                  {cartCount}
                </span>
              )}
            </button>

            {isLoggedIn ? (
              <div className="relative">
                <button 
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white border-2 border-white/20 shadow-md hover:scale-105 transition-transform"
                >
                  <User size={18} />
                </button>
                {profileOpen && (
                  <div className="absolute top-full right-0 mt-4 w-48 bg-black/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-2 overflow-hidden animate-reveal">
                    {isAdmin && (
                      <button 
                        onClick={() => { handleLinkClick('admin'); setProfileOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-black uppercase text-purple-400 hover:bg-purple-500/20 rounded-xl transition-all"
                      >
                        <Shield size={14} />
                        Admin Panel
                      </button>
                    )}
                    <button 
                      onClick={() => { handleLinkClick('dashboard'); setProfileOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-black uppercase text-gray-300 hover:bg-white/10 hover:text-purple-400 rounded-xl transition-all"
                    >
                      <Layout size={14} />
                      Dashboard
                    </button>
                    <button 
                      onClick={() => { onLogout?.(); setProfileOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-black uppercase text-pink-400 hover:bg-pink-500/20 rounded-xl transition-all"
                    >
                      <LogOut size={14} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            {!mobileMenuOpen && (
              <button 
                className="lg:hidden p-2 text-white"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu size={24} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={`fixed inset-0 bg-black/95 backdrop-blur-2xl z-[110] transition-all duration-500 lg:hidden ${mobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}`}>
        <button 
          onClick={() => setMobileMenuOpen(false)}
          className="absolute top-8 right-8 p-3 bg-white/10 text-white rounded-full"
        >
          <X size={28} strokeWidth={2.5} />
        </button>

        <div className="flex flex-col items-center justify-center h-full gap-8 p-6 text-center">
          {navLinks.map((link, idx) => (
            <button 
              key={link.name} 
              onClick={() => handleLinkClick(link.path)}
              className="text-2xl font-black transition-all uppercase tracking-tight text-white hover:text-[#AB8FFF]"
            >
              {link.name}
            </button>
          ))}
          {isLoggedIn && onLogout && (
             <button onClick={() => { onLogout(); setMobileMenuOpen(false); }} className="text-2xl font-black text-pink-400 uppercase tracking-tight">
               Logout
             </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
