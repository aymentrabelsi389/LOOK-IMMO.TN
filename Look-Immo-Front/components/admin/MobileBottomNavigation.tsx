import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutDashboard, Plus, Bell, User } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import QuickCreateSheet from './QuickCreateSheet';
import NotificationCenter from './NotificationCenter';
import { notificationsAPI } from '../../services/api';
import { socketService } from '../../services/socket';

const MobileBottomNavigation = () => {
  const location = useLocation();
  const { user } = useAuthStore();
  const currentPath = location.pathname;
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Active route helpers
  const isActive = (path: string) => {
    if (path === '/') {
      return currentPath === '/';
    }
    return currentPath.startsWith(path);
  };

  // Fetch unread count on mount and on socket events
  const refreshUnreadCount = useCallback(async () => {
    try {
      const result = await notificationsAPI.getUnreadCount();
      setUnreadCount(result.count ?? 0);
    } catch {
      // silent — user may not be admin yet
    }
  }, []);

  useEffect(() => {
    // Only fetch for admin/agent roles
    if (user?.role === 'admin' || user?.role === 'agent') {
      refreshUnreadCount();

      // Poll every 60s as a fallback
      const interval = setInterval(refreshUnreadCount, 60_000);

      // Listen to real-time updates
      socketService.on('notification:new', () => {
        setUnreadCount(prev => prev + 1);
      });

      return () => {
        clearInterval(interval);
        socketService.off('notification:new');
      };
    }
  }, [user?.role, refreshUnreadCount]);

  // Profile image / Avatar renderer
  const renderAvatar = () => {
    if (user?.avatar) {
      return (
        <img
          src={user.avatar}
          alt={user.name || 'Profil'}
          className={`w-6 h-6 rounded-full object-cover transition-all duration-300 ${
            isActive('/dashboard')
              ? 'ring-2 ring-brand-teal border-brand-teal scale-110'
              : 'border border-white/30 hover:border-white/60'
          }`}
        />
      );
    }
    return (
      <User
        size={22}
        className={`transition-all duration-300 ${
          isActive('/dashboard') ? 'text-brand-teal scale-110' : 'text-white/60 hover:text-white'
        }`}
      />
    );
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0C1F32]/95 backdrop-blur-lg border-t border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.3)] rounded-t-[30px] lg:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="h-[76px] flex items-center justify-around w-full relative px-6">
          
          {/* Item 1: Home */}
          <Link
            to="/"
            className="flex flex-col items-center justify-center flex-1 h-full py-2 transition-all duration-200"
            aria-label="Accueil"
          >
            <Home
              size={22}
              className={`transition-all duration-300 ${
                isActive('/') ? 'text-brand-teal scale-110' : 'text-white/60 hover:text-white'
              }`}
            />
            <span
              className={`text-[10px] font-medium mt-1 transition-all duration-300 ${
                isActive('/') ? 'text-brand-teal font-semibold' : 'text-white/40'
              }`}
            >
              Accueil
            </span>
          </Link>

          {/* Item 2: Admin Panel */}
          <Link
            to="/admin"
            className="flex flex-col items-center justify-center flex-1 h-full py-2 transition-all duration-200"
            aria-label="Administration"
          >
            <LayoutDashboard
              size={22}
              className={`transition-all duration-300 ${
                isActive('/admin') ? 'text-brand-teal scale-110' : 'text-white/60 hover:text-white'
              }`}
            />
            <span
              className={`text-[10px] font-medium mt-1 transition-all duration-300 ${
                isActive('/admin') ? 'text-brand-teal font-semibold' : 'text-white/40'
              }`}
            >
              Admin
            </span>
          </Link>

          {/* Item 3: Center FAB */}
          <div className="flex-1 flex justify-center h-full relative">
            <button
              onClick={() => setIsQuickCreateOpen(true)}
              type="button"
              className="absolute -top-6 w-[58px] h-[58px] bg-brand-teal text-white rounded-full flex items-center justify-center shadow-lg shadow-brand-teal/40 border-4 border-[#0C1F32] hover:scale-105 active:scale-95 transition-all duration-200 z-10 cursor-pointer"
              aria-label="Ajouter"
            >
              <Plus size={26} className="stroke-[2.5]" />
            </button>
          </div>

          {/* Item 4: Notifications */}
          <button
            onClick={() => setIsNotifOpen(true)}
            className="flex flex-col items-center justify-center flex-1 h-full py-2 transition-all duration-200 cursor-pointer relative group outline-none"
            aria-label="Notifications"
          >
            <div className="relative">
              <Bell
                size={22}
                className={`transition-all duration-300 ${
                  isNotifOpen ? 'text-brand-teal scale-110' : 'text-white/60 group-hover:text-white'
                }`}
              />
              {/* Live unread badge */}
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-0.5 leading-none shadow-sm shadow-red-500/50 animate-[badge-pop_0.3s_ease]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] font-medium mt-1 transition-all duration-300 ${
                isNotifOpen ? 'text-brand-teal font-semibold' : 'text-white/40 group-hover:text-white/60'
              }`}
            >
              Notifs
            </span>
          </button>

          {/* Item 5: Dashboard */}
          <Link
            to="/dashboard"
            className="flex flex-col items-center justify-center flex-1 h-full py-2 transition-all duration-200"
            aria-label="Mon Dashboard"
          >
            {renderAvatar()}
            <span
              className={`text-[10px] font-medium mt-1 transition-all duration-300 ${
                isActive('/dashboard') ? 'text-brand-teal font-semibold' : 'text-white/40'
              }`}
            >
              Profil
            </span>
          </Link>

        </div>
      </nav>

      {/* Quick Create bottom sheet */}
      <QuickCreateSheet isOpen={isQuickCreateOpen} onClose={() => setIsQuickCreateOpen(false)} />

      {/* Notification Center bottom sheet */}
      <NotificationCenter
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        unreadCount={unreadCount}
        onUnreadCountChange={setUnreadCount}
      />
    </>
  );
};

export default MobileBottomNavigation;
