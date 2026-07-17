
import React, { useState, useEffect } from 'react';
import {
  Users, Search, Calendar, Heart, Eye,
  Trash2, X, Phone, User as UserIcon, Edit,
  Check, Clock, Star, MapPin, AlertCircle, MessageCircle, CalendarDays,
  ChevronLeft, ChevronRight, List, ChevronDown
} from 'lucide-react';
import { User, Property, Rating, Message, Appointment } from '../../types';
import { usersAPI } from '../../services/api';
import Price from '../Price';
import { getImageSrc, getLQIP } from '../../utils/imageUtils';

interface CustomDropdownProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  triggerClassName?: string;
  menuClassName?: string;
  optionClassName?: string;
}

const CustomDropdown = <T extends string>({
  value,
  onChange,
  options,
  triggerClassName = "w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-brand-teal/50 focus:outline-none focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10 transition-all text-xs font-bold text-gray-600 cursor-pointer",
  menuClassName = "absolute right-0 z-[60] mt-2 w-full sm:w-[220px] bg-white border border-gray-100 rounded-2xl shadow-lg py-2 overflow-y-auto max-h-60 animate-fade-in-up",
  optionClassName = "w-full flex items-center justify-between px-4 py-2 text-left text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
}: CustomDropdownProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative inline-block w-full sm:w-auto" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={triggerClassName}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : ''}</span>
        <ChevronDown size={14} className={`text-gray-400 transform transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={menuClassName}>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`${optionClassName} ${
                opt.value === value
                  ? 'bg-brand-teal/5 text-brand-teal font-black'
                  : ''
              }`}
            >
              <span>{opt.label}</span>
              {opt.value === value && <Check size={12} className="text-brand-teal flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface UsersManagementProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  properties: Property[];
  ratings: Rating[];
  messages: Message[];
  appointments: Appointment[];
  targetUserId?: string | null;
  currentUser?: User | null;
  onCloseProfile?: () => void;
}

const UsersManagement = ({
  users,
  setUsers,
  properties,
  ratings,
  messages,
  appointments,
  targetUserId,
  currentUser,
  onCloseProfile
}: UsersManagementProps) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const closeProfile = () => {
    setShowProfileModal(false);
    setSelectedUser(null);
    if (onCloseProfile) {
      onCloseProfile();
    }
  };
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [showRoleSuccess, setShowRoleSuccess] = useState(false);
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'name'>('date-desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showAll, setShowAll] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' });

  // Auto-open user profile when targetUserId is set (navigation from Ratings)
  useEffect(() => {
    if (targetUserId) {
      const user = users.find(u => u.id === targetUserId);
      if (user) {
        setSelectedUser(user);
        setShowProfileModal(true);
      }
    }
  }, [targetUserId, users]);

  // Ensure users is an array
  if (!Array.isArray(users)) return null;

  // Filter users by search query
  const filteredUsers = users.filter(u =>
    u &&
    ((u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getRegistrationDate = (u: any) => {
    return u.registrationDate || u.createdAt || 0;
  };

  const handleRoleChange = async (userId: string, newRole: 'user' | 'agent' | 'admin') => {
    try {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser({ ...selectedUser, role: newRole });
      }

      // PERSIST TO DATABASE
      await usersAPI.update(userId, { role: newRole });

      setIsEditingRole(false);
      setShowRoleSuccess(true);
      setTimeout(() => setShowRoleSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to update role:", err);
    }
  };

  const openProfile = (user: User) => {
    // Mark user as viewed when admin opens their profile
    if (!user.viewedByAdmin) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, viewedByAdmin: true } : u));
    }
    setSelectedUser({ ...user, viewedByAdmin: true });
    setIsEditingDetails(false);
    setEditForm({ name: user.name || '', email: user.email || '', phone: user.phone || '' });
    setShowProfileModal(true);
  };

  const handleSaveDetails = async () => {
    if (!selectedUser) return;
    setIsSavingDetails(true);
    try {
      const updated = await usersAPI.update(selectedUser.id, {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
      });
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, ...updated } : u));
      setSelectedUser(prev => prev ? { ...prev, ...updated } : prev);
      setIsEditingDetails(false);
      setShowRoleSuccess(true);
      setTimeout(() => setShowRoleSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save user details:', err);
    } finally {
      setIsSavingDetails(false);
    }
  };

  const confirmDelete = (userId: string) => {
    setDeleteUserId(userId);
    setShowDeleteConfirm(true);
  };

  const handleDeleteUser = async () => {
    if (deleteUserId) {
      try {
        setUsers(prev => prev.filter(u => u.id !== deleteUserId));
        // PERSIST TO DATABASE
        await usersAPI.delete(deleteUserId);
      } catch (err) {
        console.error("Failed to delete user:", err);
      }
    }
    setShowDeleteConfirm(false);
    setDeleteUserId(null);
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Sort users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    switch (sortBy) {
      case 'date-asc': return getRegistrationDate(a) - getRegistrationDate(b);
      case 'name': return a.name.localeCompare(b.name);
      case 'date-desc': default: return getRegistrationDate(b) - getRegistrationDate(a);
    }
  });

  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
  const paginatedUsers = showAll ? sortedUsers : sortedUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <>
      <div className="space-y-6 animate-fade-in-up">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">Gestion des Utilisateurs</h1>
          <p className="text-sm text-gray-500 mt-1">Gérez tous les utilisateurs inscrits sur le site</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="flex items-center space-x-2 px-5 py-2.5 bg-blue-50 rounded-xl border border-blue-100 shadow-sm">
            <Users size={18} className="text-blue-600" />
            <span className="text-xs font-black text-blue-600 uppercase tracking-widest">{users.length} Inscrits</span>
          </div>

          <CustomDropdown
            value={sortBy}
            onChange={(val) => setSortBy(val as any)}
            options={[
              { value: 'date-desc', label: '📅 Inscription (Récent)' },
              { value: 'date-asc', label: '📅 Inscription (Ancien)' },
              { value: 'name', label: '👤 Nom (A-Z)' }
            ]}
            triggerClassName="w-full sm:w-[220px] flex items-center justify-between gap-3 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10 shadow-sm text-xs font-bold text-gray-600 cursor-pointer hover:border-brand-teal/50 transition bg-white"
          />
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Rechercher par nom ou email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm focus:outline-none focus:border-brand-teal transition-all outline-none"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50">
              <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-8 py-5">Utilisateur</th>
                <th className="px-6 py-5">Contact</th>
                <th className="px-6 py-5">Date</th>
                <th className="px-6 py-5">Engagement</th>
                <th className="px-6 py-5">Rôle</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <Users size={64} className="text-gray-100 mb-6" />
                      <h3 className="text-xl font-black text-gray-900 mb-2">Aucun résultat</h3>
                      <p className="text-gray-500 text-sm">Nous n'avons trouvé aucun utilisateur correspondant à votre recherche.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const isNewUser = !user.viewedByAdmin;
                  return (
                    <tr
                      key={user.id}
                      className={`group hover:bg-blue-50/30 transition-all duration-200 cursor-default ${isNewUser ? 'bg-green-50/30' : ''}`}
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-400 group-hover:bg-white group-hover:shadow-sm transition-all">
                              <UserIcon size={20} />
                            </div>
                            {isNewUser && (
                              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-gray-900 group-hover:text-brand-dark transition-colors">{user.name}</span>
                              {isNewUser && (
                                <span className="px-1.5 py-0.5 bg-green-500 text-white text-[8px] font-black rounded uppercase tracking-tighter">Nouveau</span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">ID: {user.id.substring(0, 8)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-xs font-bold text-gray-600">{user.email}</span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center text-xs font-bold text-gray-500 uppercase tracking-widest">
                          <Calendar size={14} className="mr-2 text-gray-300" />
                          {formatDate(getRegistrationDate(user))}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center" title="Favoris">
                            <Heart size={14} className="text-red-500 mr-1.5" fill="currentColor" />
                            <span className="text-xs font-black text-gray-900">{user.favorites?.length || 0}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${user.role === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                            user.role === 'agent' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                              'bg-teal-50 text-brand-teal border-teal-100'
                          }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openProfile(user)}
                            className="p-2.5 bg-white border border-gray-200 text-gray-400 rounded-xl hover:text-brand-dark hover:shadow-sm transition-all"
                            title="Voir Profil"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => confirmDelete(user.id)}
                            disabled={!!(currentUser && currentUser.id === user.id)}
                            className={`p-2.5 bg-white border border-gray-200 text-gray-400 rounded-xl hover:text-red-500 hover:shadow-sm transition-all ${currentUser && currentUser.id === user.id ? 'opacity-30 cursor-not-allowed' : ''}`}
                            title={currentUser && currentUser.id === user.id ? "Vous ne pouvez pas supprimer votre propre compte" : "Supprimer"}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-100">
          {paginatedUsers.length === 0 ? (
            <div className="text-center text-gray-400 py-16">Aucun utilisateur trouvé.</div>
          ) : (
            paginatedUsers.map((user) => {
              const isNewUser = !user.viewedByAdmin;
              return (
                <div key={user.id} className="p-5 bg-white hover:bg-gray-50 transition-colors space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-400">
                          <UserIcon size={24} />
                        </div>
                        {isNewUser && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
                        )}
                      </div>
                      <div className="ml-4">
                        <h4 className="font-black text-gray-900 leading-none mb-1">{user.name}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{user.email}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${user.role === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                        user.role === 'agent' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          'bg-teal-50 text-brand-teal border-teal-100'
                      }`}>
                      {user.role}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 p-2.5 rounded-xl">
                      <Calendar size={12} className="mr-2" />
                      {formatDate(getRegistrationDate(user))}
                    </div>
                    <div className="flex items-center text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 p-2.5 rounded-xl">
                      <Heart size={12} className="mr-2 text-red-500" fill="currentColor" />
                      {user.favorites?.length || 0} favoris
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => openProfile(user)}
                      className="flex-1 py-3 bg-brand-dark text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-brand-primary shadow-lg shadow-brand-dark/20 transition-all active:scale-95"
                    >
                      Voir le Profil
                    </button>
                    <button
                      onClick={() => confirmDelete(user.id)}
                      disabled={!!(currentUser && currentUser.id === user.id)}
                      className={`p-3 bg-gray-50 text-gray-400 rounded-xl hover:text-red-500 transition-all ${currentUser && currentUser.id === user.id ? 'opacity-30 cursor-not-allowed' : ''}`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-100 bg-white flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xs text-gray-500 font-medium">
            Affichage de <span className="font-bold text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> à <span className="font-bold text-gray-900">{Math.min(currentPage * itemsPerPage, sortedUsers.length)}</span> sur <span className="font-bold text-gray-900">{sortedUsers.length}</span>
          </div>

          <div className="flex items-center gap-3">
            {sortedUsers.length > itemsPerPage && (
              <button
                onClick={() => setShowAll(!showAll)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border transition-all shadow-sm mr-2 ${showAll
                    ? 'bg-blue-600 border-blue-600 text-white shadow-blue-200'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <List size={14} />
                {showAll ? 'Pagination' : 'Afficher tout'}
              </button>
            )}

            {!showAll && totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:bg-gray-50 disabled:opacity-30 transition"
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-[32px] h-8 px-2 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${currentPage === page
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                        : 'text-gray-600 hover:bg-gray-50 border border-transparent hover:border-gray-100'
                      }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:bg-gray-50 disabled:opacity-30 transition"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

      {/* User Detail Modal */}
      {showProfileModal && selectedUser && (() => {
        const userRatingsCount = selectedUser.ratings ? selectedUser.ratings.length : 0;
        const userMessagesCount = messages.filter(m => m.email === selectedUser.email).length;
        const userAppointmentsCount = appointments.filter(a => a.userId === selectedUser.id || a.clientEmail === selectedUser.email).length;

        return (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={closeProfile}>
            <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto flex flex-col scale-100 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-br from-brand-dark to-blue-900 p-8 md:p-12 text-white relative">
                <button
                  onClick={closeProfile}
                  className="absolute top-6 right-6 p-2.5 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>

                <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-8">
                  <div className="w-32 h-32 rounded-3xl border-4 border-white/20 shadow-2xl bg-white/10 flex items-center justify-center text-white shrink-0">
                    <UserIcon size={64} />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <h2 className="text-4xl font-black leading-none mb-2">{selectedUser.name}</h2>
                      <p className="text-blue-100 font-bold uppercase tracking-widest text-xs opacity-70">{selectedUser.email}</p>
                    </div>

                    <div className="flex flex-wrap justify-center md:justify-start gap-3">
                      {isEditingRole ? (
                        <div className="bg-white rounded-xl p-1 shadow-xl animate-scale-in">
                          <select
                            value={selectedUser.role}
                            onChange={(e) => handleRoleChange(selectedUser.id, e.target.value as 'user' | 'agent' | 'admin')}
                            onBlur={() => setIsEditingRole(false)}
                            autoFocus
                            className="px-4 py-2 rounded-lg text-sm font-black uppercase tracking-widest bg-transparent text-gray-900 focus:outline-none"
                          >
                            <option value="user">Utilisateur</option>
                            <option value="agent">Agent</option>
                            <option value="admin">Administrateur</option>
                          </select>
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsEditingRole(true)}
                          className={`inline-flex items-center px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:shadow-lg active:scale-95 ${selectedUser.role === 'admin' ? 'bg-purple-500/90' :
                              selectedUser.role === 'agent' ? 'bg-blue-500/90' : 'bg-teal-500/90'
                            }`}
                        >
                          {selectedUser.role}
                          <Edit size={14} className="ml-2 opacity-50" />
                        </button>
                      )}
                      <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 backdrop-blur-md px-5 py-2 rounded-xl border border-white/10">
                        Membre depuis {formatDate(getRegistrationDate(selectedUser))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {showRoleSuccess && (
                <div className="absolute top-10 left-1/2 -translate-x-1/2 z-10">
                  <div className="bg-white text-brand-dark px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-brand-teal/20 animate-fade-in-up">
                    <Check className="text-brand-teal" size={20} />
                    <span className="font-black text-xs uppercase tracking-widest">Rôle mis à jour</span>
                  </div>
                </div>
              )}

              <div className="p-8 md:p-12 space-y-12">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Favoris', val: selectedUser.favorites.length, icon: Heart, color: 'text-red-500', bg: 'bg-red-50' },
                    { label: 'Avis', val: userRatingsCount, icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-50' },
                    { label: 'Messages', val: userMessagesCount, icon: MessageCircle, color: 'text-green-500', bg: 'bg-green-50' },
                    { label: 'Rendez-vous', val: userAppointmentsCount, icon: CalendarDays, color: 'text-purple-500', bg: 'bg-purple-50' }
                  ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-center space-y-2">
                      <div className={`w-12 h-12 ${stat.bg} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                        <stat.icon size={24} className={stat.color} />
                      </div>
                      <div className="text-3xl font-black text-gray-900">{stat.val}</div>
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-1 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-gray-900 flex items-center uppercase tracking-widest">
                        <UserIcon className="mr-3 text-brand-teal" size={18} />
                        Détails Compte
                      </h3>
                      {!isEditingDetails ? (
                        <button
                          onClick={() => {
                            setEditForm({ name: selectedUser.name || '', email: selectedUser.email || '', phone: selectedUser.phone || '' });
                            setIsEditingDetails(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-teal/10 text-brand-teal rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-teal/20 transition-all"
                        >
                          <Edit size={12} /> Modifier
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setIsEditingDetails(false)}
                            className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={handleSaveDetails}
                            disabled={isSavingDetails}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-teal text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-600 transition-all disabled:opacity-60"
                          >
                            <Check size={12} />{isSavingDetails ? '...' : 'Sauver'}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {isEditingDetails ? (
                        <>
                          {[
                            { label: 'Nom Complet', field: 'name' as const, icon: UserIcon, type: 'text' },
                            { label: 'Email', field: 'email' as const, icon: AlertCircle, type: 'email' },
                            { label: 'Téléphone', field: 'phone' as const, icon: Phone, type: 'tel' },
                          ].map((item) => (
                            <div key={item.field} className="bg-gray-50/50 p-3 rounded-2xl border border-brand-teal/20">
                              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{item.label}</div>
                              <div className="flex items-center gap-2">
                                <item.icon size={13} className="text-brand-teal/50 shrink-0" />
                                <input
                                  type={item.type}
                                  value={editForm[item.field]}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, [item.field]: e.target.value }))}
                                  className="flex-1 bg-transparent text-sm font-bold text-gray-900 focus:outline-none border-b border-brand-teal/30 pb-0.5"
                                />
                              </div>
                            </div>
                          ))}
                          <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Dernière Connexion</div>
                            <div className="text-sm font-bold text-gray-900 flex items-center">
                              <Clock size={14} className="mr-2 text-brand-teal/50" />
                              {formatDate(selectedUser.lastLogin)}
                            </div>
                          </div>
                          <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Identifiant</div>
                            <div className="text-sm font-bold text-gray-900 flex items-center">
                              <MapPin size={14} className="mr-2 text-brand-teal/50" />
                              {selectedUser.id.substring(0, 16)}
                            </div>
                          </div>
                        </>
                      ) : (
                        [
                          { label: 'Nom Complet', val: selectedUser.name, icon: UserIcon },
                          { label: 'Téléphone', val: selectedUser.phone || 'Non renseigné', icon: Phone },
                          { label: 'Dernière Connexion', val: formatDate(selectedUser.lastLogin), icon: Clock },
                          { label: 'Identifiant', val: selectedUser.id.substring(0, 16), icon: MapPin }
                        ].map((item, i) => (
                          <div key={i} className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{item.label}</div>
                            <div className="text-sm font-bold text-gray-900 flex items-center">
                              <item.icon size={14} className="mr-2 text-brand-teal/50" />
                              {item.val}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-6">
                    <h3 className="text-sm font-black text-gray-900 flex items-center uppercase tracking-widest">
                      <Heart className="mr-3 text-red-500" size={18} fill="currentColor" />
                      Coups de Cœur ({selectedUser.favorites.length})
                    </h3>
                    {properties.filter(p => selectedUser.favorites?.includes(p.id)).length === 0 ? (
                      <div className="bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200 p-12 text-center">
                        <Heart size={48} className="mx-auto text-gray-200 mb-4" />
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Liste de favoris vide</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {properties.filter(p => selectedUser.favorites?.includes(p.id)).slice(0, 4).map(property => (
                          <div key={property.id} className="flex gap-4 bg-white p-3 rounded-2xl border border-gray-100 hover:shadow-lg transition-all group cursor-pointer">
                            <div
                              className="w-20 h-20 rounded-xl overflow-hidden shrink-0"
                              style={{
                                backgroundImage: getLQIP(property.images[0]) ? `url(${getLQIP(property.images[0])})` : undefined,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                backgroundColor: getLQIP(property.images[0]) ? undefined : '#f3f4f6',
                              }}
                            >
                              <img src={getImageSrc(property.images[0], 'thumb')} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                              <h4 className="font-black text-gray-900 text-xs truncate mb-1">{property.title}</h4>
                              <p className="text-[10px] text-brand-teal font-black uppercase tracking-widest mb-2">{property.location.city}</p>
                              <div className="text-xs font-black text-gray-900">
                                <Price amount={property.price} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                  <button
                    onClick={closeProfile}
                    className="px-8 py-4 bg-white border border-gray-200 text-gray-700 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-[0.98] shadow-sm"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
              <Trash2 size={40} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Supprimer ?</h3>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              Vous êtes sur le point de supprimer définitivement le compte de cet utilisateur. Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-4 border border-gray-200 text-gray-700 font-bold rounded-2xl hover:bg-gray-50 transition-all">
                Annuler
              </button>
              <button onClick={handleDeleteUser} className="flex-1 py-4 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all active:scale-95">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UsersManagement;



