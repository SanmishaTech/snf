import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CarouselSlide {
  id: number;
  desktopImage: string;
  mobileImage: string;
  alt: string;
  title?: string;
  subtitle?: string;
}

const Carousel: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Carousel slides with Unsplash images
  const slides: CarouselSlide[] = [
    {
      id: 1,
      desktopImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop',
      mobileImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=640&auto=format&fit=crop',
      alt: 'Mountain landscape',
      title: 'Welcome to Our Site',
      subtitle: 'Discover amazing experiences'
    },
    {
      id: 2,
      desktopImage: 'https://images.unsplash.com/photo-1511876484235-b5246a4d6dd5?q=80&w=2071&auto=format&fit=crop',
      mobileImage: 'https://images.unsplash.com/photo-1511876484235-b5246a4d6dd5?q=80&w=640&auto=format&fit=crop',
      alt: 'Forest pathway',
      title: 'Explore Nature',
      subtitle: 'Find your perfect adventure'
    },
    {
      id: 3,
      desktopImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=2070&auto=format&fit=crop',
      mobileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=640&auto=format&fit=crop',
      alt: 'Ocean sunset',
      title: 'Unwind & Relax',
      subtitle: 'Your journey starts here'
    }
  ];

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-play carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(timer);
  }, [slides.length]);

  const goToPrevious = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Slides Container */}
      <div className="relative w-full h-full">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* Background Image Container */}
            <div className="relative w-full h-full">
              <img
                src={isMobile ? slide.mobileImage : slide.desktopImage}
                alt={slide.alt}
                className="w-full h-full object-contain bg-black"
                style={{
                  objectPosition: 'center',
                }}
              />
              
              {/* Optional: Add a subtle background for better contrast */}
              <div className="absolute inset-0 bg-black/20" />
              
              {/* Content Overlay */}
              {(slide.title || slide.subtitle) && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white px-4 max-w-4xl">
                    {slide.title && (
                      <h1 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">
                        {slide.title}
                      </h1>
                    )}
                    {slide.subtitle && (
                      <p className="text-xl md:text-2xl drop-shadow-lg">
                        {slide.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={goToPrevious}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/30 backdrop-blur-sm text-white p-2 md:p-3 rounded-full hover:bg-white/50 transition-colors duration-300"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
      </button>
      
      <button
        onClick={goToNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/30 backdrop-blur-sm text-white p-2 md:p-3 rounded-full hover:bg-white/50 transition-colors duration-300"
        aria-label="Next slide"
      >
        <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex space-x-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentSlide
                ? 'bg-white w-8'
                : 'bg-white/50 hover:bg-white/75'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default Carousel;
