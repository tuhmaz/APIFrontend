import { useEffect } from 'react';
import { useAuthStore } from '@/store/useStore';
import { authService } from '@/lib/api/services/auth';

export function useUserRefresh() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    authService.me()
      .then((freshUser) => useAuthStore.getState().login(freshUser))
      .catch(() => {});
  }, [isAuthenticated]);
}
