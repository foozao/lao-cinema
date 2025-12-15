import NextImage, { ImageProps } from 'next/image';

/**
 * Custom Image wrapper that automatically handles localhost URLs
 * by disabling Next.js optimization (which doesn't work with private IPs)
 */
export function OptimizedImage(props: ImageProps) {
  const { src, unoptimized, ...rest } = props;
  
  // Check if src is a string and contains localhost
  const isLocalhost = typeof src === 'string' && src.includes('localhost');
  
  // Only set unoptimized if explicitly provided or if localhost
  const shouldBeUnoptimized = unoptimized !== undefined ? unoptimized : (isLocalhost || undefined);
  
  return (
    <NextImage
      {...rest}
      src={src}
      unoptimized={shouldBeUnoptimized}
    />
  );
}
