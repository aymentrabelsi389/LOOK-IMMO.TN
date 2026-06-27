import React from 'react';
import { LayoutDashboard, Home as HomeIcon, Users, MessageSquare, CalendarDays, Star, MapPin, Globe, Settings, Target, TrendingUp } from 'lucide-react';
import { User } from '../../types';

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  user: User | null;
  unreadMessagesCount?: number;
  pendingAppointmentsCount?: number;
  newUsersCount?: number;
  unreadRatingsCount?: number;
  activeDemandsMatchesCount?: number;
}

const AdminSidebar = ({
  activeTab,
  setActiveTab,
  sidebarOpen,
  setSidebarOpen,
  user,
  unreadMessagesCount,
  pendingAppointmentsCount,
  newUsersCount,
  unreadRatingsCount,
  activeDemandsMatchesCount
}: AdminSidebarProps) => {
  const menuItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: <LayoutDashboard size={20} /> },
    { id: 'properties', label: 'Propriétés', icon: <HomeIcon size={20} /> },
    { id: 'users', label: 'Utilisateurs', icon: <Users size={20} />, badge: newUsersCount, badgeColor: 'bg-green-500' },
    { id: 'demands', label: 'Demandes Clients', icon: <Target size={20} />, badge: activeDemandsMatchesCount, badgeColor: 'bg-blue-500' },

    { id: 'messages', label: 'Messages reçus', icon: <MessageSquare size={20} />, badge: unreadMessagesCount, badgeColor: 'bg-red-500' },
    { id: 'appointments', label: 'Rendez-vous', icon: <CalendarDays size={20} />, badge: pendingAppointmentsCount, badgeColor: 'bg-yellow-500' },
    { id: 'ratings', label: 'Avis et notes', icon: <Star size={20} />, badge: unreadRatingsCount, badgeColor: 'bg-orange-500' },
    { id: 'localisations', label: 'Localisations', icon: <MapPin size={20} /> },
    { id: 'blog', label: 'Blog & Actualités', icon: <Globe size={20} /> },
    { id: 'finances', label: 'Finances', icon: <TrendingUp size={20} /> },
    { id: 'settings', label: 'Paramètres', icon: <Settings size={20} /> },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
          aria-label="Fermer le menu"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-72 bg-[#0F1E2E] text-white z-40 transform transition-transform duration-300 md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col shadow-2xl`}
      >
        <div className="h-20 flex items-center px-8 border-b border-white/10">
          <span className="font-serif text-2xl font-bold tracking-wider">Look<span className="text-brand-teal">Admin</span></span>
        </div>

        <div className="p-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-4">Menu Principal</div>
          <nav className="space-y-2">
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center px-4 py-3.5 rounded-xl transition-all duration-200 group font-medium text-sm ${activeTab === item.id
                  ? 'bg-blue-600/20 text-blue-400 shadow-inner border border-blue-500/30'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
              >
                <span className={`${activeTab === item.id ? 'text-blue-400' : 'text-gray-400 group-hover:text-white'} mr-3`}>
                  {item.icon}
                </span>
                {item.label}

                {/* Generalized Badge Rendering - Correctly handles 0 by not rendering */}
                {(item.badge ?? 0) > 0 && (
                  <span className={`ml-auto mr-2 ${item.badgeColor} text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center`}>
                    {item.badge}
                  </span>
                )}

                {activeTab === item.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>}
              </button>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
