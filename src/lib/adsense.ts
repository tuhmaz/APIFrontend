const SCRIPT_TAG_PATTERN = /<script\b[^>]*>[\s\S]*?<\/script>/gi;

/**
 * Get or create the adsbygoogle queue.
 *
 * CRITICAL: After Google's adsbygoogle.js loads, it replaces window.adsbygoogle
 * with a custom proxy object that has a push() method but is NOT a native Array.
 * Using Array.isArray() would return false and cause us to overwrite Google's
 * object with a plain [], destroying the entire ad processing system.
 *
 * We follow Google's exact recommended pattern:
 *   (window.adsbygoogle = window.adsbygoogle || [])
 */
const getAdsQueue = (): { push: (obj: Record<string, unknown>) => void } | null => {
  if (typeof window === 'undefined') return null;

  const win = window as Window & { adsbygoogle?: any };
  win.adsbygoogle = win.adsbygoogle || [];
  return win.adsbygoogle;
};

const isSlotInitialized = (slot: HTMLElement): boolean =>
  slot.dataset.adUnitInitialized === '1' || slot.hasAttribute('data-adsbygoogle-status');

/**
 * Check if an ad slot is visible to the user.
 * Uses offsetParent to detect ancestors with display:none — this is the
 * standard DOM way to determine effective visibility without walking the tree.
 *
 * Note: offsetParent is null for position:fixed elements too, but ad slots
 * should never be position:fixed so this is safe.
 */
const isSlotVisible = (slot: HTMLElement): boolean => {
  if (typeof window === 'undefined') return false;
  if (!slot.isConnected) return false;

  // offsetParent is null when the element or any ancestor has display:none.
  // This correctly handles the mobile/desktop hidden pattern where a parent
  // div uses Tailwind's "hidden md:block" or "block md:hidden".
  if (slot.offsetParent === null) {
    // Exception: the <body> or <html> element has offsetParent === null,
    // and position:fixed elements do too. Check the slot's own style.
    const style = window.getComputedStyle(slot);
    if (style.position === 'fixed') return true;
    return false;
  }

  const style = window.getComputedStyle(slot);
  if (style.visibility === 'hidden') return false;

  return true;
};

export function decodeAdSnippet(rawCode: string): string {
  const trimmed = rawCode.trim();
  if (!trimmed) return '';
  if (!trimmed.startsWith('__B64__')) return trimmed;

  const encoded = trimmed.slice(7);
  if (!encoded) return '';

  try {
    if (typeof atob === 'function') return atob(encoded).trim();
  } catch {
    return '';
  }

  return '';
}

export function normalizeAdSnippet(rawCode: string): string {
  const decoded = decodeAdSnippet(rawCode);
  if (!decoded) return '';

  // The snippet scripts are loaded globally from RootLayout and pushed manually per <ins>.
  const withoutScripts = decoded.replace(SCRIPT_TAG_PATTERN, '').trim();
  return withoutScripts;
}

export function initializeAdSlots(
  container: HTMLElement,
  options?: { maxAttempts?: number; intervalMs?: number }
): () => void {
  const adSlots = Array.from(container.querySelectorAll<HTMLElement>('ins.adsbygoogle'));
  if (!adSlots.length) return () => {};

  const maxAttempts = options?.maxAttempts ?? 25;
  const intervalMs = options?.intervalMs ?? 300;

  let attempts = 0;
  let disposed = false;
  let timer: number | null = null;

  const tryInitialize = (): boolean => {
    attempts += 1;
    const queue = getAdsQueue();

    if (!queue) return attempts >= maxAttempts;

    for (const slot of adSlots) {
      if (isSlotInitialized(slot) || !isSlotVisible(slot)) continue;

      try {
        queue.push({});
        slot.dataset.adUnitInitialized = '1';
      } catch {
        // Keep trying until maxAttempts is reached.
      }
    }

    const allInitialized = adSlots.every((slot) => !isSlotVisible(slot) || isSlotInitialized(slot));
    return allInitialized || attempts >= maxAttempts;
  };

  if (!tryInitialize()) {
    timer = window.setInterval(() => {
      if (disposed) return;
      if (tryInitialize() && timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    }, intervalMs);
  }

  return () => {
    disposed = true;
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  };
}
