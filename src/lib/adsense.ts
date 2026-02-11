const SCRIPT_TAG_PATTERN = /<script\b[^>]*>[\s\S]*?<\/script>/gi;

type AdsByGoogleQueue = Array<Record<string, unknown>>;

type AdSenseWindow = Window & {
  adsbygoogle?: AdsByGoogleQueue;
};

const getAdsQueue = (): AdsByGoogleQueue | null => {
  if (typeof window === 'undefined') return null;
  const queue = (window as AdSenseWindow).adsbygoogle;
  return Array.isArray(queue) ? queue : null;
};

const isSlotInitialized = (slot: HTMLElement): boolean =>
  slot.dataset.adUnitInitialized === '1' || slot.hasAttribute('data-adsbygoogle-status');

const isSlotVisible = (slot: HTMLElement): boolean => {
  if (typeof window === 'undefined') return false;
  if (!slot.isConnected) return false;

  const style = window.getComputedStyle(slot);
  if (style.display === 'none' || style.visibility === 'hidden') return false;

  const rect = slot.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
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

  const maxAttempts = options?.maxAttempts ?? 20;
  const intervalMs = options?.intervalMs ?? 400;

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
