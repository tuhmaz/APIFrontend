'use client';

import { useEffect } from 'react';
import { useThemeStore, useSettingsStore } from '@/store/useStore';
import { settingsService } from '@/lib/api/services/settings';

export default function ThemeInitializer() {
  const { isDarkMode, primaryColor } = useThemeStore();
  const { siteName, siteFavicon, setSettings } = useSettingsStore();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await settingsService.getAll();
        const siteNameValue = (data as any).site_name ?? (data as any).siteName;
        const siteEmailValue = (data as any).site_email ?? (data as any).siteEmail;
        const siteUrlValue = (data as any).site_url ?? (data as any).siteUrl;
        const siteLogoValue = (data as any).site_logo ?? (data as any).siteLogo;
        const siteFaviconValue = (data as any).site_favicon ?? (data as any).siteFavicon;
        
        const siteDescription = (data as any).site_description ?? '';
        const contactEmail = (data as any).contact_email ?? '';
        const contactPhone = (data as any).contact_phone ?? '';
        const contactAddress = (data as any).contact_address ?? '';
        const recaptchaSiteKey = (data as any).recaptcha_site_key ?? '';

        const socialLinks = {
          facebook: (data as any).social_facebook,
          twitter: (data as any).social_twitter,
          linkedin: (data as any).social_linkedin,
          instagram: (data as any).social_instagram,
          whatsapp: (data as any).social_whatsapp,
          youtube: (data as any).social_youtube,
          tiktok: (data as any).social_tiktok,
        };

        const nextSettings: Parameters<typeof setSettings>[0] = {};
        if (typeof siteNameValue === 'string') nextSettings.siteName = siteNameValue;
        if (typeof siteEmailValue === 'string') nextSettings.siteEmail = siteEmailValue;
        if (typeof siteUrlValue === 'string') nextSettings.siteUrl = siteUrlValue;
        if (siteLogoValue === null || typeof siteLogoValue === 'string') nextSettings.siteLogo = siteLogoValue;
        if (siteFaviconValue === null || typeof siteFaviconValue === 'string') nextSettings.siteFavicon = siteFaviconValue;
        
        nextSettings.siteDescription = siteDescription;
        nextSettings.contactEmail = contactEmail;
        nextSettings.contactPhone = contactPhone;
        nextSettings.contactAddress = contactAddress;
        if (typeof recaptchaSiteKey === 'string') nextSettings.recaptchaSiteKey = recaptchaSiteKey;
        nextSettings.socialLinks = socialLinks;

        setSettings(nextSettings);
      } catch {
        return;
      }
    };
    fetchSettings();
  }, [setSettings]);

  useEffect(() => {
    // Update Title and Favicon
    if (siteName && siteName.trim()) document.title = siteName.trim();

    if (siteFavicon) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = `/storage/${siteFavicon}`;
    }
  }, [siteName, siteFavicon]);

  useEffect(() => {
    const root = document.documentElement;

    // Apply Dark Mode
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Apply Primary Color
    // We assume the CSS variable is --color-primary
    // Since the global css defines it as hsl(...), we can override it.
    // However, for best compatibility with Tailwind opacity modifiers if they rely on channels,
    // we should test. But given modern CSS 'color-mix', hex should work fine.
    if (primaryColor) {
      root.style.setProperty('--color-primary', primaryColor);
      
      // We might also want to update the ring color to match
      root.style.setProperty('--color-ring', primaryColor);
    }
  }, [isDarkMode, primaryColor]);

  return null;
}
