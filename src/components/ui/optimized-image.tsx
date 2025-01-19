import React from 'react';
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
}

const OptimizedImage = ({ src, alt, className, ...props }: OptimizedImageProps) => {
  // Function to generate responsive srcSet
  const generateSrcSet = (url: string) => {
    if (url.includes('unsplash.com')) {
      return `
        ${url}&w=320 320w,
        ${url}&w=480 480w,
        ${url}&w=800 800w
      `;
    }
    return undefined;
  };

  // Function to add blur placeholder
  const addBlurPlaceholder = (url: string) => {
    if (url.includes('unsplash.com')) {
      return `${url}&blur=20`;
    }
    return url;
  };

  return (
    <img
      src={src}
      alt={alt}
      className={cn(
        "transition-opacity duration-300 ease-in-out",
        className
      )}
      loading="lazy"
      decoding="async"
      srcSet={generateSrcSet(src)}
      sizes="(max-width: 320px) 280px, (max-width: 480px) 440px, 800px"
      style={{ 
        backgroundImage: `url(${addBlurPlaceholder(src)})`,
        backgroundSize: 'cover'
      }}
      {...props}
    />
  );
};

export default OptimizedImage;