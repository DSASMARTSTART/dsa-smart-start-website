// ============================================
// Admin Layout - Reuses Student Dashboard patterns
// ============================================

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, BookOpen, History, Settings, LogOut, 
  ChevronRight, Menu, X, Bell, Search, Shield
} from 'lucide-react';
import { User } from '../../types';
import { authApi } from '../../data/supabaseStore';

interface AdminLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, currentPath, onNavigate, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const navItems = [
    { id: 'admin', label: 'Dashboard', icon: LayoutDashboard, path: 'admin' },
    { id: 'admin-users', label: 'Users', icon: Users, path: 'admin-users' },
    { id: 'admin-courses', label: 'Courses', icon: BookOpen, path: 'admin-courses' },
    { id: 'admin-audit', label: 'Audit Log', icon: History, path: 'admin-audit' },
  ];

  const isActive = (path: string) => {
    if (path === 'admin' && currentPath === 'admin') return true;
    if (path !== 'admin' && currentPath.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      {/* Top Bar - Reuses Navbar styling */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-b border-gray-100">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-50 rounded-xl transition-colors"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            
            <button 
              onClick={() => onNavigate('home')} 
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-[#8a3ffc] rounded-xl rotate-12 flex items-center justify-center shadow-lg shadow-purple-200">
                <span className="text-white font-black text-sm -rotate-12">S</span>
              </div>
              <div className="hidden sm:block">
                <span className="text-lg font-black tracking-tighter text-gray-900">
                  DSA <span className="text-[#8a3ffc]">SMART START</span>
                </span>
                <div className="flex items-center gap-2">
                  <Shield size={10} className="text-purple-500" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-purple-500">Admin Panel</span>
                </div>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick Search */}
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent text-sm font-medium text-gray-600 placeholder:text-gray-400 outline-none w-40"
              />
              <kbd className="text-[9px] font-bold text-gray-400 px-1.5 py-0.5 bg-gray-100 rounded">⌘K</kbd>
            </div>

            {/* Notifications */}
            <button className="relative p-2.5 rounded-xl bg-gray-50 text-gray-600 hover:bg-purple-50 hover:text-purple-600 transition-all border border-gray-100">
              <Bell size={18} />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                3
              </span>
            </button>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <div className="hidden md:block text-right">
                <p className="text-sm font-bold text-gray-900">{user?.name || 'Admin'}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{user?.role}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-purple-200">
                {user?.name?.charAt(0) || 'A'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`fixed left-0 top-[73px] bottom-0 w-64 bg-white border-r border-gray-100 z-40 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full p-4">
          <nav className="flex-1 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.path);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all ${
                  isActive(item.path)
                    ? 'bg-purple-50 text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon size={18} />
                <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
                {isActive(item.path) && <ChevronRight size={14} className="ml-auto" />}
              </button>
            ))}
          </nav>

          {/* Bottom Actions */}
          <div className="pt-4 border-t border-gray-100 space-y-1">
            <button
              onClick={() => onNavigate('dashboard')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-600 hover:bg-gray-50 transition-all"
            >
              <LayoutDashboard size={18} />
              <span className="text-xs font-black uppercase tracking-widest">Student View</span>
            </button>
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-pink-600 hover:bg-pink-50 transition-all"
            >
              <LogOut size={18} />
              <span className="text-xs font-black uppercase tracking-widest">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-64 pt-[73px] min-h-screen">
        <div className="p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
