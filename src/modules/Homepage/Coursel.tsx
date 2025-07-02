import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface HeroImage {
  id: string | number;
  src: string;
  alt: string;
}

interface HeroSectionProps {
  images: HeroImage[];
  subtitle?: string;
  description?: string;
  className?: string;
}

const HeroSection: React.FC<HeroSectionProps> = ({
  images,
  subtitle = "",
  description = "",
  className
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (images && images.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentImageIndex((prevIndex) => 
          prevIndex === images.length - 1 ? 0 : prevIndex + 1
        );
      }, 5000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [images]);

  const handleImageLoad = (index: number) => {
    if (index === 0) {
      setIsLoaded(true);
    }
  };

  if (!images || images.length === 0) {
    return (
        <section className={cn("relative w-full h-screen overflow-hidden flex items-center justify-center bg-gray-200", className)}>
            <div className="text-center">
                <p>Loading Banners...</p>
            </div>
        </section>
    );
  }

  return (
    <section className={cn("relative w-full h-full overflow-hidden", className)}>
      {/* Background Images */}
      <div className="absolute inset-0">
        {images.map((image, index) => (
          <div
            key={image.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-1000 ease-in-out",
             )}
          >
            <img src={image.src} alt={image.alt} className="w-full h-full object-fit object-center" onLoad={() => handleImageLoad(index)} loading={index === 0 ? "eager" : "lazy"} />
          </div>
        ))}
        
        {/* Overlay */}
       </div>

      {/* Content Overlay */}
      <div className="relative z-10 flex items-center justify-center h-full px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 1, y: 30 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 1 : 30 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-6"
          >
            {/* Main Title */}
            <motion.h1
              initial={{ opacity: 1, y: 30 }}
              animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 1 : 30 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight"
            >
              {subtitle}
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 1, y: 20 }}
              animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 1 : 20 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed"
            >
              {description}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 1, y: 20 }}
              animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 1 : 20 }}
              transition={{ duration: 0.6, delay: 1.0 }}
              className="flex justify-center items-bottom pt-8"
            >
              <button className="px-8 py-3 bg-red-500 text-white font-semibold rounded-full hover:bg-red-400/90 transition-colors duration-300 min-w-[240px]">
                Join Our Milk Club
              </button>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Image Indicators */}
      {images.length > 1 && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
          <div className="flex space-x-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={cn(
                  "w-3 h-3 rounded-full transition-all duration-300",
                  index === currentImageIndex
                    ? "bg-white scale-110"
                    : "bg-white/50 hover:bg-white/70"
                )}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Scroll Indicator */}
 
    </section>
  );
};

export default HeroSection;
