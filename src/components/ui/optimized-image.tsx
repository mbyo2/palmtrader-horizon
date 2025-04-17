
import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  caption?: string;
  decorative?: boolean;
}

const OptimizedImage = ({ 
  src, 
  alt, 
  className, 
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  priority = false,
  caption,
  decorative = false,
  ...props 
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  
  // Generate responsive srcSet based on image source
  const generateSrcSet = (url: string) => {
    if (url.includes('unsplash.com')) {
      return `
        ${url}&w=320 320w,
        ${url}&w=480 480w,
        ${url}&w=640 640w,
        ${url}&w=800 800w,
        ${url}&w=1024 1024w,
        ${url}&w=1280 1280w
      `;
    }
    
    // Add CDN support for serving optimized images from the project
    if (!url.includes('http') && !url.startsWith('data:')) {
      const baseUrl = '/assets/images';
      const extension = url.split('.').pop() || 'jpg';
      const baseName = url.split('/').pop()?.split('.')[0] || '';
      
      return `
        ${baseUrl}/${baseName}-320.${extension} 320w,
        ${baseUrl}/${baseName}-480.${extension} 480w,
        ${baseUrl}/${baseName}-640.${extension} 640w,
        ${baseUrl}/${baseName}-800.${extension} 800w,
        ${baseUrl}/${baseName}-1024.${extension} 1024w,
        ${baseUrl}/${baseName}-1280.${extension} 1280w
      `;
    }
    
    return undefined;
  };

  // Generate blur placeholder for images
  const getBlurPlaceholder = (url: string) => {
    if (url.includes('unsplash.com')) {
      return `${url}&blur=20&w=20`;
    }
    
    // For local images
    if (!url.includes('http') && !url.startsWith('data:')) {
      return '/placeholder.svg';
    }
    
    return url;
  };
  
  // Handle image load event
  const handleLoad = () => {
    setIsLoaded(true);
  };
  
  // Handle image error event
  const handleError = () => {
    setIsError(true);
  };
  
  // Use effect to preload high-priority images
  useEffect(() => {
    if (priority) {
      const img = new Image();
      img.src = src;
      img.onload = handleLoad;
      img.onerror = handleError;
    }
  }, [priority, src]);

  // Determine if we should omit alt text for decorative images
  const imgAlt = decorative ? '' : (alt || 'Image');
  
  // Use aria-hidden for decorative images
  const ariaHidden = decorative ? true : undefined;

  // Wrap the image in a figure if it has a caption
  if (caption) {
    return (
      <figure className={className}>
        <div className="relative overflow-hidden">
          {!isLoaded && !isError && (
            <div 
              className="absolute inset-0 blur-sm bg-cover bg-center animate-pulse" 
              style={{ backgroundImage: `url(${getBlurPlaceholder(src)})` }}
              aria-hidden="true"
            />
          )}
          
          <img
            src={src}
            alt={imgAlt}
            className={cn(
              "transition-opacity duration-300 w-full h-full object-cover",
              isLoaded ? "opacity-100" : "opacity-0"
            )}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            onLoad={handleLoad}
            onError={handleError}
            srcSet={generateSrcSet(src)}
            sizes={sizes}
            aria-hidden={ariaHidden}
            {...props}
          />
          
          {isError && (
            <div 
              className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800"
              role="alert"
            >
              <span className="text-sm text-gray-500 dark:text-gray-400">Failed to load image</span>
            </div>
          )}
        </div>
        <figcaption className="mt-2 text-sm text-center text-muted-foreground">{caption}</figcaption>
      </figure>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {!isLoaded && !isError && (
        <div 
          className="absolute inset-0 blur-sm bg-cover bg-center animate-pulse" 
          style={{ backgroundImage: `url(${getBlurPlaceholder(src)})` }}
          aria-hidden="true"
        />
      )}
      
      <img
        src={src}
        alt={imgAlt}
        className={cn(
          "transition-opacity duration-300 w-full h-full object-cover",
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        srcSet={generateSrcSet(src)}
        sizes={sizes}
        aria-hidden={ariaHidden}
        {...props}
      />
      
      {isError && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800"
          role="alert"
        >
          <span className="text-sm text-gray-500 dark:text-gray-400">Failed to load image</span>
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;
