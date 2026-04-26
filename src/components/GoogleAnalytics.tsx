'use client';

type Props = {
  gaId?: string | null;
};

export default function GoogleAnalytics({ gaId }: Props) {
  if (!gaId) return null;

  return (
    <>
      {/* Blocked by CookieYes until the user accepts "analytics" cookies */}
      <script
        type="text/plain"
        data-cookieconsent="analytics"
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
      <script
        type="text/plain"
        data-cookieconsent="analytics"
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`,
        }}
      />
    </>
  );
}
