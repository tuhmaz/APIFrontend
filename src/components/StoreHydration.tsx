'use client';

import { useEffect } from 'react';
import { useThemeStore, useAuthStore, useCountryStore, useSettingsStore } from '@/store/useStore';

/**
 * Rehydrates all Zustand persist stores after the first client render.
 *
 * All stores use skipHydration:true so the server HTML and the initial
 * client render are identical (both use store defaults). Once this
 * component mounts, the stores read from localStorage and update state.
 * This eliminates the React #418 hydration-mismatch error and the
 * cascading infinite postMessage loop it caused.
 */
export default function StoreHydration() {
  useEffect(() => {
    useThemeStore.persist.rehydrate();
    useAuthStore.persist.rehydrate();
    useCountryStore.persist.rehydrate();
    useSettingsStore.persist.rehydrate();
  }, []);

  return null;
}
