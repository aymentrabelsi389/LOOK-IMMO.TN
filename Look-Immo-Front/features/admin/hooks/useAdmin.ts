import { useAuthStore } from '@/stores/useAuthStore';

export function useAdmin() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const isAgent = user?.role === 'agent';
  const isAdminOrAgent = isAdmin || isAgent;

  return {
    user,
    isAdmin,
    isAgent,
    isAdminOrAgent
  };
}
