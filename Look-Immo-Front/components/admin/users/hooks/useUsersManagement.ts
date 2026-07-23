import { useState, useEffect } from 'react';
import { User, Property, Rating, Message, Appointment } from '@/types';
import { usersAPI } from '@/services/api';

interface UseUsersManagementProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  properties: Property[];
  ratings: Rating[];
  messages: Message[];
  appointments: Appointment[];
  targetUserId?: string | null;
  onCloseProfile?: () => void;
}

export function useUsersManagement({
  users,
  setUsers,
  targetUserId,
  onCloseProfile
}: UseUsersManagementProps) {
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

  // Filter users by search query
  const filteredUsers = Array.isArray(users) ? users.filter(u =>
    u &&
    ((u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()))
  ) : [];

  const getRegistrationDate = (u: any) => {
    return u.registrationDate || u.createdAt || 0;
  };

  const handleRoleChange = async (userId: string, newRole: 'user' | 'agent' | 'admin') => {
    try {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser({ ...selectedUser, role: newRole });
      }

      await usersAPI.update(userId, { role: newRole });

      setIsEditingRole(false);
      setShowRoleSuccess(true);
      setTimeout(() => setShowRoleSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to update role:", err);
    }
  };

  const openProfile = (user: User) => {
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
  return {
    getRegistrationDate,
    selectedUser,
    setSelectedUser,
    showProfileModal,
    setShowProfileModal,
    closeProfile,
    showDeleteConfirm,
    setShowDeleteConfirm,
    deleteUserId,
    isEditingRole,
    setIsEditingRole,
    showRoleSuccess,
    sortBy,
    setSortBy,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    showAll,
    setShowAll,
    isEditingDetails,
    setIsEditingDetails,
    isSavingDetails,
    editForm,
    setEditForm,
    filteredUsers,
    handleRoleChange,
    openProfile,
    handleSaveDetails,
    confirmDelete,
    handleDeleteUser,
    formatDate,
    sortedUsers,
    totalPages,
    paginatedUsers
  };
}
