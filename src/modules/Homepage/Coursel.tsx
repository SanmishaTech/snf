"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface CarouselImage {
  id: string
  src: string
  alt: string
  title?: string
  description?: string
}

interface InfiniteImageCarouselProps {
  images?: CarouselImage[]
  autoPlay?: boolean
  autoPlayInterval?: number
  showDots?: boolean
  showArrows?: boolean
  showPlayPause?: boolean
  className?: string
}

const defaultImages: CarouselImage[] = [
  {
    id: '1',
    src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=600&fit=crop',
    alt: 'Mountain landscape',
    title: 'Majestic Mountains',
    description: 'Breathtaking mountain views at sunrise'
  },
  {
    id: '2',
    src: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&h=600&fit=crop',
    alt: 'Ocean waves',
    title: 'Ocean Paradise',
    description: 'Crystal clear waters and pristine beaches'
  },
  {
    id: '3',
    src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&h=600&fit=crop',
    alt: 'Forest path',
    title: 'Enchanted Forest',
    description: 'Mysterious paths through ancient woods'
  },
  {
    id: '4',
    src: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&h=600&fit=crop',
    alt: 'Desert landscape',
    title: 'Desert Dunes',
    description: 'Golden sands stretching to the horizon'
  },
  {
    id: '5',
    src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=600&fit=crop',
    alt: 'City skyline',
    title: 'Urban Lights',
    description: 'City that never sleeps'
  }
]

const InfiniteImageCarousel: React.FC<InfiniteImageCarouselProps> = ({
  images = defaultImages,
  autoPlay = true,
  autoPlayInterval = 4000,
  showDots = true,
  showArrows = true,
  showPlayPause = true,
  className = ''
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(autoPlay)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const carouselRef = useRef<HTMLDivElement>(null)

  const minSwipeDistance = 50

  const preloadImage = useCallback((src: string) => {
    const img = new Image()
    img.onload = () => {
      setLoadedImages(prev => new Set(prev).add(src))
    }
    img.src = src
  }, [])

  useEffect(() => {
    images.forEach(image => preloadImage(image.src))
  }, [images, preloadImage])

  const nextSlide = useCallback(() => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setCurrentIndex(prev => (prev + 1) % images.length)
    // Transition duration is 700ms for the background, 500ms for the main image
    // We set isTransitioning to false after the longest transition
    setTimeout(() => setIsTransitioning(false), 700); 
  }, [images.length, isTransitioning])

  const prevSlide = useCallback(() => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setCurrentIndex(prev => (prev - 1 + images.length) % images.length)
    setTimeout(() => setIsTransitioning(false), 700);
  }, [images.length, isTransitioning])

  const goToSlide = useCallback((index: number) => {
    if (isTransitioning || index === currentIndex) return
    setIsTransitioning(true)
    setCurrentIndex(index)
    setTimeout(() => setIsTransitioning(false), 700);
  }, [currentIndex, isTransitioning])

  useEffect(() => {
    if (isPlaying && images.length > 1) {
      intervalRef.current = setInterval(nextSlide, autoPlayInterval)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPlaying, nextSlide, autoPlayInterval, images.length])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault()
        prevSlide()
        break
      case 'ArrowRight':
        e.preventDefault()
        nextSlide()
        break
      case ' ':
        e.preventDefault()
        setIsPlaying(prev => !prev)
        break
    }
  }, [nextSlide, prevSlide])

  useEffect(() => {
    const carousel = carouselRef.current
    if (carousel) {
      carousel.addEventListener('keydown', handleKeyDown)
      return () => carousel.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      nextSlide()
    } else if (isRightSwipe) {
      prevSlide()
    }
  }

  const togglePlayPause = () => {
    setIsPlaying(prev => !prev)
  }

  if (images.length === 0) {
    return (
      <Card className="w-full h-96 flex items-center justify-center bg-muted">
        <p className="text-muted-foreground">No images to display</p>
      </Card>
    )
  }

  const currentImage = images[currentIndex]

  return (
    <div 
      ref={carouselRef}
      className={`relative w-full h-[600px] md:h-[800px] lg:h-[900px] overflow-hidden group focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}
      tabIndex={0}
      role="region"
      aria-label="Image carousel"
      onMouseEnter={() => autoPlay && setIsPlaying(false)}
      onMouseLeave={() => autoPlay && setIsPlaying(true)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Background with parallax effect */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <div 
          className={`absolute inset-0 bg-cover bg-center transition-all duration-700 ease-out ${isTransitioning ? 'scale-110 blur-sm opacity-30' : 'scale-100 blur-none opacity-100'}`}
          style={{ 
            backgroundImage: `url(${currentImage.src})`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-background/40" />
      </div>

      {/* Main carousel container */}
      <div className="relative w-full h-full overflow-hidden rounded-lg z-10">
        {/* Current image */}
        <div className="relative w-full h-full">
          {loadedImages.has(currentImage.src) ? (
            <img
              src={currentImage.src}
              alt={currentImage.alt}
              className={`w-full h-full object-cover transition-all duration-500 ease-out ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
            />
          ) : (
            <div className="w-full h-full bg-muted animate-pulse flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          
          {/* Image overlay content */}
          {(currentImage.title || currentImage.description) && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
              {currentImage.title && (
                <h3 className="text-white text-xl md:text-2xl font-bold mb-2">
                  {currentImage.title}
                </h3>
              )}
              {currentImage.description && (
                <p className="text-white/90 text-sm md:text-base">
                  {currentImage.description}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

       {showArrows && images.length > 1 && (
        <>
          <Button
            variant="outline"
            size="icon"
            className="absolute left-4 top-[20rem]  -translate-y-1/2 bg-background/80 backdrop-blur-sm border-border/50 hover:bg-background/90 transition-all duration-300 focus:opacity-100 z-20"
            onClick={prevSlide}
            onMouseEnter={() => autoPlay && setIsPlaying(false)}
            onMouseLeave={() => autoPlay && setIsPlaying(true)}
            disabled={isTransitioning}
            aria-label="Previous image"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            className="absolute right-4 top-[20rem] -translate-y-1/2 bg-background/80 backdrop-blur-sm border-border/50 hover:bg-background/90 transition-all duration-300 focus:opacity-100 z-20"
            onClick={nextSlide}
            onMouseEnter={() => autoPlay && setIsPlaying(false)}
            onMouseLeave={() => autoPlay && setIsPlaying(true)}
            disabled={isTransitioning}
            aria-label="Next image"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </>
      )} 

      {/* Play/Pause button */}
      {/* {showPlayPause && images.length > 1 && (
        <Button
          variant="outline"
          size="icon"
          className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm border-border/50 hover:bg-background/90 opacity-0 group-hover:opacity-100 transition-all duration-300 focus:opacity-100"
          onClick={togglePlayPause}
          aria-label={isPlaying ? "Pause slideshow" : "Play slideshow"}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
      )} */}

      {/* Dots indicator */}
      {showDots && images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-20">
          {images.map((_, index) => (
            <button
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                index === currentIndex
                  ? 'bg-primary w-8'
                  : 'bg-white/50 hover:bg-white/70'
              }`}
              onClick={() => goToSlide(index)}
              disabled={isTransitioning}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Image {currentIndex + 1} of {images.length}: {currentImage.alt}
        {currentImage.title && `, ${currentImage.title}`}
      </div>
    </div>
  )
}

export default InfiniteImageCarousel
