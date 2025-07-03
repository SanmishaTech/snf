import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import mobilebg from "./images/for mobile .png"
// Removed hardcoded mobile background import - now using dynamic mobileSrc

interface HeroImage {
  id: string | number;
  src: string;
  alt: string;
  mobileSrc?: string; // Optional mobile image source
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
  const [isMobile, setIsMobile] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Handle responsive detection with better breakpoints
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 640); // Mobile only (sm breakpoint)
    };
    
    // Check on mount
    checkIsMobile();
    
    // Listen for resize events
    window.addEventListener('resize', checkIsMobile);
    
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
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

  const handleJoinMilkClub = () => {
    // Check if user is logged in by checking localStorage
    const authToken = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    
    if (authToken && user) {
      // User is logged in, scroll to product detail section
      const productSection = document.getElementById('product-detail-section');
      if (productSection) {
        productSection.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }
    } else {
      // User not logged in, redirect to login page
      navigate('/login');
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
              index === currentImageIndex ? "opacity-100" : "opacity-0"
             )}
          >
            {/* Conditional rendering based on screen size and available mobile image */}
            <div className="w-full h-full">
              {/* Mobile Image - only show if mobileSrc is provided */}
              {mobilebg && (
                <img
                  src={mobilebg}
                  alt={image.alt}
                  className="w-full h-full object-contain object-center transition-all duration-300 sm:hidden"
                  onLoad={() => handleImageLoad(index)}
                  loading={index === 0 ? "eager" : "lazy"}
                  style={{ 
                    minHeight: '600px',
                    maxHeight: '800px',
                    height: '100vh'
                  }}
                />
              )}
              
              {/* Desktop/Tablet Image (or fallback for mobile if no mobileSrc) */}
              <img
                src={image.src}
                alt={image.alt}
                className={cn(
                  "w-full h-full transition-all duration-300",
                  // Show on mobile only if no mobileSrc is available
                  image.mobileSrc ? "hidden sm:block" : "block",
                  // Mobile fallback: object-cover
                  image.mobileSrc ? "" : "object-cover object-center sm:object-contain sm:object-center",
                  // Tablet: object-contain to prevent cropping
                  "sm:object-contain sm:object-center",
                  // Desktop: object-cover for full coverage
                  "lg:object-cover lg:object-center"
                )}
                onLoad={() => handleImageLoad(index)}
                loading={index === 0 ? "eager" : "lazy"}
                style={{ 
                  minHeight: '600px',
                  maxHeight: '800px',
                  height: '100vh',
                  backgroundColor: '#f8f9fa' // Fallback background for object-contain
                }}
              />
            </div>
          </div>
        ))}
        
        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/30 to-black/50 z-[1]" />
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
 
      {/* CTA Buttons - Moved to bottom */}
      <motion.div
        initial={{ opacity: 1, y: 20 }}
        animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 1 : 20 }}
        transition={{ duration: 0.6, delay: 1.0 }}
        className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-20"
      >
        <button 
          onClick={handleJoinMilkClub}
          className="px-8 py-3 bg-red-500 text-white font-semibold rounded-full hover:bg-red-400/90 transition-colors duration-300 min-w-[240px]"
        >
          Join Our Milk Club
        </button>
      </motion.div>

    </section>
  );
};

export default HeroSection;
