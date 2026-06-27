import { create } from 'zustand';
import { User } from '../types';
import { authAPI, usersAPI, favoritesAPI } from '../services/api';
import { notify } from '../services/notificationStore';

interface AuthStore {
  user: User | null;
  isSessionLoading: boolean;
  pendingToggles: string[];
  // Setters
  setUser: (user: User | null) => void;
  // Actions
  initSession: () => Promise<void>;
  handleLogin: (userData: User, isNewSignup?: boolean) => void;
  handleLogout: () => Promise<void>;
  handleUpdateUser: (userData: Partial<User>) => Promise<void>;
  handleToggleFavorite: (
    propertyId: string,
    onRequireAuth?: () => void
  ) => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isSessionLoading: true,
  pendingToggles: [],

  setUser: (user) => set({ user }),

  initSession: async () => {
    try {
      const me = await authAPI.getMe();
      set({ user: me, isSessionLoading: false });
    } catch {
      // Session is invalid — clear everything so the user gets a clean login prompt
      await authAPI.logout().catch(() => {});
      set({ user: null, isSessionLoading: false });
    }
  },

  handleLogin: (userData, isNewSignup = false) => {
    set({ user: userData });
    notify.success(
      isNewSignup ? 'Compte créé avec succès.' : 'Bienvenue! Connexion réussie.'
    );
  },

  handleLogout: async () => {
    try {
      await authAPI.logout();
      set({ user: null });
      notify.info('Vous êtes déconnecté.');
    } catch {
      notify.error('Erreur lors de la déconnexion.');
    }
  },

  handleUpdateUser: async (userData) => {
    const { user } = get();
    if (!user) return;
    try {
      const updated = await usersAPI.update(user.id, userData);
      // Merge to preserve fields the API doesn't return (favorites, avatar, etc.)
      set({ user: { ...user, ...updated } });
      notify.success('Profil mis à jour.');
    } catch (error) {
      notify.error('Erreur de mise à jour.');
      throw error;
    }
  },

  handleToggleFavorite: async (propertyId, onRequireAuth) => {
    const { user, pendingToggles } = get();

    if (!user) {
      onRequireAuth?.();
      return;
    }

    if (pendingToggles.includes(propertyId)) return;

    const isFav = user.favorites.includes(propertyId);
    const originalFavorites = user.favorites;

    // Mark as pending
    set({ pendingToggles: [...pendingToggles, propertyId] });

    // Optimistic update
    set((state) => ({
      user: state.user
        ? {
            ...state.user,
            favorites: isFav
              ? state.user.favorites.filter((id) => id !== propertyId)
              : [...state.user.favorites, propertyId],
          }
        : null,
    }));

    try {
      if (isFav) {
        await favoritesAPI.remove(propertyId);
        notify.info('Retiré des favoris.');
      } else {
        await favoritesAPI.add(propertyId);
        notify.success('Ajouté aux favoris.');
      }
    } catch {
      // Rollback
      set((state) => ({
        user: state.user ? { ...state.user, favorites: originalFavorites } : null,
      }));
      notify.error('Erreur favoris.');
    } finally {
      set((state) => ({
        pendingToggles: state.pendingToggles.filter((id) => id !== propertyId),
      }));
    }
  },
}));
