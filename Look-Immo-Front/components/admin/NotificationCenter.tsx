import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, X, Check, CheckCheck, Trash2, Trash,
  UserPlus, MessageSquare, Calendar, Heart,
  Star, Home, Sparkles, RefreshCw, Filter
} from 'lucide-react';
import { notificationsAPI } from '../../services/api';
import { socketService } from '../../services/socket';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface AppNotification {
  id: string;
  type: string;
  title?: string;
  message: string;
  icon?: string;
  link?: string;
  read: boolean;
  metadata?: any;
  createdAt: string;
  user?: { id: string; name: string } | null;
}

type FilterType = 'today' | 'week' | 'all';

// ── Icon resolver ─────────────────────────────────────────────────────────────
const getIcon = (iconName?: string, type?: string) => {
  const map: Record<string, React.ReactNode> = {
    UserPlus:     <UserPlus size={16} />,
    MessageSquare:<MessageSquare size={16} />,
    Calendar:     <Calendar size={16} />,
    Heart:        <Heart size={16} />,
    Star:         <Star size={16} />,
    Home:         <Home size={16} />,
    Sparkles:     <Sparkles size={16} />,
  };

  if (iconName && map[iconName]) return map[iconName];

  // Fallback by type
  const typeMap: Record<string, React.ReactNode> = {
    user_signup:      <UserPlus size={16} />,
    message_new:      <MessageSquare size={16} />,
    appointment_new:  <Calendar size={16} />,
    wishlist_add:     <Heart size={16} />,
    rating_new:       <Star size={16} />,
    property_add:     <Home size={16} />,
    demand_match:     <Sparkles size={16} />,
    morning_reminder: <Calendar size={16} />,
  };
  return typeMap[type || ''] || <Bell size={16} />;
};

const getIconColors = (type?: string) => {
  const map: Record<string, string> = {
    user_signup:      'bg-blue-500/10 text-blue-400',
    message_new:      'bg-purple-500/10 text-purple-400',
    appointment_new:  'bg-brand-teal/10 text-brand-teal',
    wishlist_add:     'bg-pink-500/10 text-pink-400',
    rating_new:       'bg-yellow-500/10 text-yellow-400',
    property_add:     'bg-emerald-500/10 text-emerald-400',
    demand_match:     'bg-amber-500/10 text-amber-400',
    morning_reminder: 'bg-sky-500/10 text-sky-400',
  };
  return map[type || ''] || 'bg-white/10 text-white/60';
};

// ── Relative time formatter ───────────────────────────────────────────────────
const formatRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1)   return "À l'instant";
  if (diffMin < 60)  return `Il y a ${diffMin} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7)  return `Il y a ${diffDays}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

// ── Notification Item ─────────────────────────────────────────────────────────
interface NotificationItemProps {
  notif: AppNotification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (notif: AppNotification) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notif, onRead, onDelete, onNavigate }) => {
  const handleClick = () => {
    if (!notif.read) onRead(notif.id);
    onNavigate(notif);
  };

  return (
    <div
      onClick={handleClick}
      className={`relative px-5 py-4 flex items-start gap-3.5 transition-all duration-200 cursor-pointer ${
        notif.read ? 'bg-transparent hover:bg-white/[0.02]' : 'bg-brand-teal/[0.03] hover:bg-brand-teal/[0.05]'
      } group`}
    >
      {/* Unread indicator dot */}
      {!notif.read && (
        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-brand-teal" />
      )}

      {/* Icon wrapper */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${getIconColors(notif.type)}`}>
        {getIcon(notif.icon, notif.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {notif.title && (
          <h4 className="text-[11px] font-bold text-[#C6A75E] uppercase tracking-wider mb-0.5">
            {notif.title}
          </h4>
        )}
        <p className="text-[13px] text-white/80 font-medium leading-relaxed break-words">
          {notif.message}
        </p>
        <span className="text-[10px] text-white/30 font-medium mt-1 block">
          {formatRelativeTime(notif.createdAt)}
        </span>
      </div>

      {/* Delete action */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(notif.id); }}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
        aria-label="Supprimer"
      >
        <Trash size={13} />
      </button>
    </div>
  );
};

// ── Main Notification Center Component ────────────────────────────────────────
interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  unreadCount: number;
  onUnreadCountChange: (count: number) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  unreadCount,
  onUnreadCountChange,
}) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<FilterType>('today');
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async (activeFilter: FilterType = filter) => {
    setIsLoading(true);
    try {
      const filterParam = activeFilter === 'all' ? undefined : activeFilter;
      const result = await notificationsAPI.getAll(filterParam ? { filter: filterParam } : undefined);
      setNotifications(result.notifications || []);
      setTotal(result.total || 0);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const result = await notificationsAPI.getUnreadCount();
      onUnreadCountChange(result.count ?? 0);
    } catch {}
  }, [onUnreadCountChange]);

  // Fetch on open / filter change
  useEffect(() => {
    if (isOpen) {
      fetchNotifications(filter);
    }
  }, [isOpen, filter]);

  // Socket.io listener for new notifications
  useEffect(() => {
    const handleNewNotification = (notif: AppNotification) => {
      setNotifications(prev => [notif, ...prev]);
      setTotal(prev => prev + 1);
      onUnreadCountChange(unreadCount + 1);
    };

    socketService.on('notification:new', handleNewNotification);
    return () => {
      socketService.off('notification:new');
    };
  }, [unreadCount, onUnreadCountChange]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen]);

  // Handle browser back
  useEffect(() => {
    if (!isOpen) return;
    window.history.pushState({ notifDrawerOpen: true }, '');
    const handlePopState = (e: PopStateEvent) => {
      if (!e.state?.notifDrawerOpen) onClose();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isOpen, onClose]);

  const handleClose = async () => {
    // Mark all unread as read silently when closing
    const hasUnreadNotifs = notifications.some(n => !n.read);
    if (hasUnreadNotifs) {
      try {
        await notificationsAPI.markAllAsRead();
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        onUnreadCountChange(0);
      } catch {}
    }
    if (window.history.state?.notifDrawerOpen) {
      window.history.back();
    } else {
      onClose();
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      await refreshUnreadCount();
    } catch (err) {
      console.error('Mark as read failed:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationsAPI.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setTotal(prev => Math.max(0, prev - 1));
      await refreshUnreadCount();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleDeleteRead = async () => {
    try {
      await notificationsAPI.deleteRead();
      setNotifications(prev => prev.filter(n => !n.read));
      await refreshUnreadCount();
    } catch (err) {
      console.error('Delete read failed:', err);
    }
  };

  const handleNavigate = (notif: AppNotification) => {
    handleClose();
    if (notif.link) {
      if (notif.type === 'demand_match' && notif.metadata?.demandId) {
        navigate('/admin', {
          replace: true,
          state: { tab: 'demands', highlightDemandId: notif.metadata.demandId }
        });
      } else {
        navigate(notif.link, { replace: true });
      }
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchNotifications(filter);
    await refreshUnreadCount();
    setIsRefreshing(false);
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'today',  label: "Auj." },
    { key: 'week',   label: 'Semaine' },
    { key: 'all',    label: 'Tout' },
  ];

  return (
    <div className={`fixed inset-0 z-[100] flex items-end justify-center lg:hidden ${
      isOpen ? 'pointer-events-auto' : 'pointer-events-none'
    }`}>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Slide-up sheet */}
      <div
        className={`relative w-full max-w-md bg-[#0C1F32] rounded-t-[28px] border-t border-white/10 shadow-[0_-12px_40px_rgba(0,0,0,0.5)] z-10 transition-transform duration-300 ease-in-out transform flex flex-col ${
          isOpen ? 'translate-y-0 pointer-events-auto' : 'translate-y-full pointer-events-none'
        }`}
        style={{ height: '70%', maxHeight: '85%' }}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto my-3 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-brand-teal" />
            <h3 className="text-white font-black text-base tracking-wide">Notifications</h3>
            {unreadCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-brand-teal text-white text-[10px] font-bold rounded-full min-w-[18px] text-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-full transition-all duration-200"
              aria-label="Actualiser"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-full transition-all duration-200"
              aria-label="Fermer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 px-5 py-3 border-b border-white/5 flex-shrink-0 overflow-x-auto scrollbar-hide">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-200 ${
                filter === f.key
                  ? 'bg-brand-teal text-white shadow-sm shadow-brand-teal/30'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div ref={scrollRef} className="overflow-y-auto flex-1 divide-y divide-white/[0.04]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <RefreshCw size={22} className="animate-spin text-brand-teal/60" />
              <p className="text-white/30 text-sm">Chargement...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
                <Bell size={24} className="text-white/20" />
              </div>
              <p className="text-white/50 text-sm font-medium">Aucune notification</p>
              <p className="text-white/25 text-xs">
                Aucune activité pour cette période.
              </p>
            </div>
          ) : (
            notifications.map(notif => (
              <NotificationItem
                key={notif.id}
                notif={notif}
                onRead={handleMarkAsRead}
                onDelete={handleDelete}
                onNavigate={handleNavigate}
              />
            ))
          )}
        </div>

        {/* Footer Actions */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/5 flex-shrink-0 pb-[calc(12px+env(safe-area-inset-bottom))]">
            <span className="text-[11px] text-white/30">
              {total} notification{total !== 1 ? 's' : ''}
            </span>
            <button
              onClick={handleDeleteRead}
              className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-red-400 transition-colors duration-200"
            >
              <Trash2 size={12} />
              <span>Supprimer lus</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
