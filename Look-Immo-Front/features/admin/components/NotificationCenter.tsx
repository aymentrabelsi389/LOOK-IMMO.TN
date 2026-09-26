import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, X, Trash2, Trash,
  UserPlus, UserCheck, UserX, MessageSquare, Calendar, CalendarCheck, CalendarX, Heart,
  Star, StarOff, Home, Sparkles, RefreshCw, FileText, MapPin
} from 'lucide-react';
import { notificationsAPI } from '@/services/api';
import { socketService } from '@/services/socket';
import { SiteNotification } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────
export type AppNotification = SiteNotification;

type FilterType = 'today' | 'week' | 'all';

// ── Icon resolver ─────────────────────────────────────────────────────────────
const getIcon = (iconName?: string, type?: string) => {
  const map: Record<string, React.ReactNode> = {
    UserPlus:     <UserPlus size={16} />,
    UserCheck:    <UserCheck size={16} />,
    UserX:        <UserX size={16} />,
    MessageSquare:<MessageSquare size={16} />,
    Calendar:     <Calendar size={16} />,
    CalendarCheck:<CalendarCheck size={16} />,
    CalendarX:    <CalendarX size={16} />,
    Heart:        <Heart size={16} />,
    Star:         <Star size={16} />,
    StarOff:      <StarOff size={16} />,
    Home:         <Home size={16} />,
    Sparkles:     <Sparkles size={16} />,
    FileText:     <FileText size={16} />,
    MapPin:       <MapPin size={16} />,
    Trash:        <Trash size={16} />,
  };

  if (iconName && map[iconName]) return map[iconName];

  // Fallback by type
  const typeMap: Record<string, React.ReactNode> = {
    user_signup:        <UserPlus size={16} />,
    user_role_change:   <UserCheck size={16} />,
    user_delete:        <UserX size={16} />,
    message_new:        <MessageSquare size={16} />,
    message_delete:     <Trash size={16} />,
    appointment_new:    <Calendar size={16} />,
    appointment_accept: <CalendarCheck size={16} />,
    appointment_reject: <CalendarX size={16} />,
    appointment_delete: <CalendarX size={16} />,
    wishlist_add:       <Heart size={16} />,
    rating_new:         <Star size={16} />,
    rating_delete:      <StarOff size={16} />,
    property_add:       <Home size={16} />,
    property_edit:      <Home size={16} />,
    property_delete:    <Home size={16} />,
    demand_match:       <Sparkles size={16} />,
    morning_reminder:   <Calendar size={16} />,
    blog_add:           <FileText size={16} />,
    blog_edit:          <FileText size={16} />,
    blog_delete:        <FileText size={16} />,
    location_add:       <MapPin size={16} />,
    location_edit:      <MapPin size={16} />,
    location_delete:    <MapPin size={16} />,
  };
  return typeMap[type || ''] || <Bell size={16} />;
};

const getIconColors = (type?: string) => {
  const map: Record<string, string> = {
    user_signup:        'bg-blue-500/10 text-blue-400',
    user_role_change:   'bg-indigo-500/10 text-indigo-400',
    user_delete:        'bg-rose-500/10 text-rose-400',
    message_new:        'bg-purple-500/10 text-purple-400',
    message_delete:     'bg-rose-500/10 text-rose-400',
    appointment_new:    'bg-brand-teal/10 text-brand-teal',
    appointment_accept: 'bg-emerald-500/10 text-emerald-400',
    appointment_reject: 'bg-rose-500/10 text-rose-400',
    appointment_delete: 'bg-rose-500/10 text-rose-400',
    wishlist_add:       'bg-pink-500/10 text-pink-400',
    rating_new:         'bg-yellow-500/10 text-yellow-400',
    rating_delete:      'bg-rose-500/10 text-rose-400',
    property_add:       'bg-emerald-500/10 text-emerald-400',
    property_edit:      'bg-sky-500/10 text-sky-400',
    property_delete:    'bg-rose-500/10 text-rose-400',
    demand_match:       'bg-amber-500/10 text-amber-400',
    morning_reminder:   'bg-sky-500/10 text-sky-400',
    blog_add:           'bg-emerald-500/10 text-emerald-400',
    blog_edit:          'bg-blue-500/10 text-blue-400',
    blog_delete:        'bg-rose-500/10 text-rose-400',
    location_add:       'bg-emerald-500/10 text-emerald-400',
    location_edit:      'bg-blue-500/10 text-blue-400',
    location_delete:    'bg-rose-500/10 text-rose-400',
  };
  return map[type || ''] || 'bg-white/10 text-white/60';
};

// ── Notification translation & formatting helper ──────────────────────────────
export function formatNotificationContent(notif: AppNotification): {
  title: string;
  message: string;
} {
  let title = notif.title || '';
  let message = notif.message || '';

  // 1. Translate legacy English messages to French
  if (/^Appointment accepted:\s*/i.test(message)) {
    let rest = message.replace(/^Appointment accepted:\s*/i, '');
    if (rest.startsWith('N/A for ')) {
      rest = 'pour ' + rest.substring(8);
    } else if (rest.includes(' for ')) {
      rest = rest.replace(' for ', ' pour ');
    }
    message = `Rendez-vous accepté : ${rest}`;
    if (!title) title = 'Rendez-vous Accepté';
  } else if (/^Appointment rejected:\s*/i.test(message)) {
    let rest = message.replace(/^Appointment rejected:\s*/i, '');
    if (rest.startsWith('N/A for ')) {
      rest = 'pour ' + rest.substring(8);
    } else if (rest.includes(' for ')) {
      rest = rest.replace(' for ', ' pour ');
    }
    message = `Rendez-vous refusé : ${rest}`;
    if (!title) title = 'Rendez-vous Refusé';
  } else if (/^Appointment deleted:\s*/i.test(message)) {
    let rest = message.replace(/^Appointment deleted:\s*/i, '');
    if (rest.startsWith('N/A for ')) {
      rest = 'pour ' + rest.substring(8);
    } else if (rest.includes(' for ')) {
      rest = rest.replace(' for ', ' pour ');
    }
    message = `Rendez-vous supprimé : ${rest}`;
    if (!title) title = 'Rendez-vous Supprimé';
  } else if (/^Property updated:\s*/i.test(message)) {
    message = `Propriété mise à jour : ${message.replace(/^Property updated:\s*/i, '')}`;
    if (!title) title = 'Propriété Modifiée';
  } else if (/^Property deleted:\s*/i.test(message)) {
    message = `Propriété supprimée : ${message.replace(/^Property deleted:\s*/i, '')}`;
    if (!title) title = 'Propriété Supprimée';
  } else if (/^New blog post:\s*/i.test(message)) {
    message = `Nouvel article de blog : ${message.replace(/^New blog post:\s*/i, '')}`;
    if (!title) title = 'Nouvel Article';
  } else if (/^Blog post updated:\s*/i.test(message)) {
    message = `Article de blog mis à jour : ${message.replace(/^Blog post updated:\s*/i, '')}`;
    if (!title) title = 'Article Modifié';
  } else if (/^Blog post deleted:\s*/i.test(message)) {
    message = `Article de blog supprimé : ${message.replace(/^Blog post deleted:\s*/i, '')}`;
    if (!title) title = 'Article Supprimé';
  } else if (/^New location added:\s*/i.test(message)) {
    message = `Nouvelle zone ajoutée : ${message.replace(/^New location added:\s*/i, '')}`;
    if (!title) title = 'Nouvelle Zone';
  } else if (/^Location updated:\s*/i.test(message)) {
    message = `Zone mise à jour : ${message.replace(/^Location updated:\s*/i, '')}`;
    if (!title) title = 'Zone Modifiée';
  } else if (/^Location deleted:\s*/i.test(message)) {
    message = `Zone supprimée : ${message.replace(/^Location deleted:\s*/i, '')}`;
    if (!title) title = 'Zone Supprimée';
  } else if (/^Message deleted from:\s*/i.test(message)) {
    message = `Message supprimé de : ${message.replace(/^Message deleted from:\s*/i, '')}`;
    if (!title) title = 'Message Supprimé';
  } else if (/^New user created:\s*/i.test(message)) {
    message = `Nouvel utilisateur créé : ${message.replace(/^New user created:\s*/i, '')}`;
    if (!title) title = 'Nouvel Utilisateur';
  } else if (/^User role changed:\s*/i.test(message)) {
    message = `Rôle utilisateur modifié : ${message.replace(/^User role changed:\s*/i, '')}`;
    if (!title) title = 'Rôle Modifié';
  } else if (/^User deleted:\s*/i.test(message)) {
    message = `Utilisateur supprimé : ${message.replace(/^User deleted:\s*/i, '')}`;
    if (!title) title = 'Utilisateur Supprimé';
  } else if (/^Rating deleted:\s*/i.test(message)) {
    const match = message.match(/^Rating deleted:\s*(\d+)\s*stars?\s+by\s+(.*?)\s+for\s+(.*)$/i);
    if (match) {
      message = `Avis supprimé : ${match[1]} étoiles par ${match[2]} pour ${match[3]}`;
    } else {
      message = `Avis supprimé : ${message.replace(/^Rating deleted:\s*/i, '')}`;
    }
    if (!title) title = 'Avis Supprimé';
  }

  // 2. Ensure title is present and translated
  if (!title) {
    switch (notif.type) {
      case 'property_add':
        title = 'Nouvelle Propriété';
        break;
      case 'property_edit':
        title = 'Propriété Modifiée';
        break;
      case 'property_delete':
        title = 'Propriété Supprimée';
        break;
      case 'appointment_new':
        title = 'Nouveau Rendez-vous';
        break;
      case 'appointment_accept':
        title = 'Rendez-vous Accepté';
        break;
      case 'appointment_reject':
        title = 'Rendez-vous Refusé';
        break;
      case 'appointment_delete':
        title = 'Rendez-vous Supprimé';
        break;
      case 'demand_match':
        title = 'Nouvelle Correspondance';
        break;
      case 'morning_reminder':
        title = "Visites d'Aujourd'hui";
        break;
      case 'wishlist_add':
        title = 'Bien Enregistré';
        break;
      case 'rating_new':
        title = 'Nouvel Avis';
        break;
      case 'rating_delete':
        title = 'Avis Supprimé';
        break;
      case 'message_new':
        title = 'Nouveau Message';
        break;
      case 'message_delete':
        title = 'Message Supprimé';
        break;
      case 'user_signup':
        title = 'Nouvel Utilisateur';
        break;
      case 'user_role_change':
        title = 'Rôle Modifié';
        break;
      case 'user_delete':
        title = 'Utilisateur Supprimé';
        break;
      case 'blog_add':
        title = 'Nouvel Article';
        break;
      case 'blog_edit':
        title = 'Article Modifié';
        break;
      case 'blog_delete':
        title = 'Article Supprimé';
        break;
      case 'location_add':
        title = 'Nouvelle Zone';
        break;
      case 'location_edit':
        title = 'Zone Modifiée';
        break;
      case 'location_delete':
        title = 'Zone Supprimée';
        break;
      default:
        title = 'Notification';
    }
  } else {
    // Translate any English titles
    if (/^Property updated/i.test(title)) title = 'Propriété Modifiée';
    else if (/^Property deleted/i.test(title)) title = 'Propriété Supprimée';
    else if (/^Appointment accepted/i.test(title)) title = 'Rendez-vous Accepté';
    else if (/^Appointment rejected/i.test(title)) title = 'Rendez-vous Refusé';
    else if (/^Appointment deleted/i.test(title)) title = 'Rendez-vous Supprimé';
    else if (/^New blog post/i.test(title)) title = 'Nouvel Article';
    else if (/^Blog post updated/i.test(title)) title = 'Article Modifié';
    else if (/^Blog post deleted/i.test(title)) title = 'Article Supprimé';
    else if (/^New location/i.test(title)) title = 'Nouvelle Zone';
    else if (/^Location updated/i.test(title)) title = 'Zone Modifiée';
    else if (/^Location deleted/i.test(title)) title = 'Zone Supprimée';
    else if (/^New user/i.test(title)) title = 'Nouvel Utilisateur';
    else if (/^User role/i.test(title)) title = 'Rôle Modifié';
    else if (/^User deleted/i.test(title)) title = 'Utilisateur Supprimé';
    else if (/^New rating/i.test(title)) title = 'Nouvel Avis';
    else if (/^Rating deleted/i.test(title)) title = 'Avis Supprimé';
    else if (/^New message/i.test(title)) title = 'Nouveau Message';
    else if (/^Message deleted/i.test(title)) title = 'Message Supprimé';
  }

  return { title, message };
}

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

  const { title, message } = formatNotificationContent(notif);

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
        {title && (
          <h4 className="text-[11px] font-bold text-[#C6A75E] uppercase tracking-wider mb-0.5">
            {title}
          </h4>
        )}
        <p className="text-[13px] text-white/80 font-medium leading-relaxed break-words">
          {message}
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
  const [isFullyClosed, setIsFullyClosed] = useState(!isOpen);

  useEffect(() => {
    if (isOpen) {
      setIsFullyClosed(false);
    } else {
      const timer = setTimeout(() => {
        setIsFullyClosed(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

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
    onClose();
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
    } ${isFullyClosed ? 'hidden' : ''}`}>
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
