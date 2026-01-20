import { useEffect } from 'react';
import { useAuthStore } from '@/store/useStore';
import { authService } from '@/lib/api/services/auth';

export function useUserRefresh() {
  const { isAuthenticated, login } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    const refreshUser = async () => {
      try {
        const freshUser = await authService.me();
        login(freshUser);
      } catch (error) {
        console.error('Failed to refresh user profile:', error);
      }
    };

    refreshUser();
  }, [isAuthenticated, login]);
}
