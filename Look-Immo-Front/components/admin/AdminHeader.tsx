import React from 'react';
import { Menu, Home as HomeIcon, User as UserIcon } from 'lucide-react';
import { User } from '../../types';

interface AdminHeaderProps {
  user: User | null;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  onLogout: () => void;
  onNavigate: () => void;
  onProfileClick: () => void;
  title: string;
  isVisible?: boolean;
}

const AdminHeader = ({
  user,
  sidebarOpen,
  setSidebarOpen,
  onLogout,
  onNavigate,
  onProfileClick,
  title,
}: AdminHeaderProps) => {

  return (
    <header className="h-20 bg-white border-b border-gray-200 sticky top-0 z-30 px-6 flex items-center justify-between shadow-sm">
      <div className="flex items-center">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden mr-4 text-gray-500" aria-label="Basculer le menu latéral">
          <Menu size={24} />
        </button>
        <h1 className="text-2xl font-bold text-gray-800 ml-4 hidden md:block">{title}</h1>
      </div>

      {/* Center - Retour au Site Button */}
      <button
        onClick={onNavigate}
        className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg font-medium text-sm"
      >
        <HomeIcon size={18} />
        <span>Retour au Site</span>
      </button>

      <div className="flex items-center">
        {/* User Dropdown */}
        <div className="flex items-center pl-6 border-l border-gray-100 cursor-pointer group" onClick={onProfileClick}>
          <div className="text-right mr-3 hidden md:block">
            <p className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition">{user?.name}</p>
            <button onClick={(e) => { e.stopPropagation(); onLogout(); }} className="text-xs text-red-500 hover:underline">Déconnexion</button>
          </div>
          <div className="w-10 h-10 rounded-full border border-gray-200 shadow-sm group-hover:ring-2 ring-blue-500 ring-offset-2 transition flex items-center justify-center bg-gray-100 text-gray-600">
            <UserIcon size={20} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
