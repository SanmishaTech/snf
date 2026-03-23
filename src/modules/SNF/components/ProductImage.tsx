import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface ProductImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  containerClassName?: string;
  name?: string;
  showNameFallback?: boolean;
}

const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  className,
  containerClassName,
  name,
  showNameFallback = true,
}) => {
  const [error, setError] = useState(false);

  const hasImage = src && src.trim().length > 0 && !error;
  const displayName = name || alt;

  return (
    <div className={cn("relative overflow-hidden flex items-center justify-center bg-muted/20", containerClassName)}>
      {!hasImage ? (
        <div className="h-full w-full flex flex-col items-center justify-center p-2 text-center bg-muted/30">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-muted/50 flex items-center justify-center mb-1.5">
            <span className="text-muted-foreground font-bold text-[10px] md:text-xs">
              {displayName.substring(0, 2).toUpperCase()}
            </span>
          </div>
          {showNameFallback && (
            <span className="text-[9px] md:text-[10px] text-muted-foreground font-medium line-clamp-2 px-1">
              {displayName}
            </span>
          )}
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setError(true)}
          className={cn("h-full w-full object-cover transition-all duration-300", className)}
        />
      )}
    </div>
  );
};

export default ProductImage;
