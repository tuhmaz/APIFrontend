'use client';

import NextImage, { ImageProps } from 'next/image';

type AppImageProps = ImageProps & {
  eager?: boolean;
};

export default function AppImage({
  loading,
  priority,
  eager,
  ...props
}: AppImageProps) {
  const isDev = process.env.NODE_ENV !== 'production';
  const resolvedLoading = loading ?? ((eager || isDev) ? 'eager' : undefined);

  return (
    <NextImage
      {...props}
      loading={resolvedLoading}
      priority={priority}
    />
  );
}
