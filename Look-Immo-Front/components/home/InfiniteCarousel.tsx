import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Auto-slide: 3s, pauses for 5s after manual swipe
const InfiniteCarousel = <T extends { id: string }>({
  items,
  renderItem,
  CardWrapper = ({ children }: { children: React.ReactNode }) => <>{children}</>
}: {
  items: T[],
  renderItem: (item: T) => React.ReactNode,
  CardWrapper?: React.ComponentType<{ children: React.ReactNode }>
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Touch state for swipe gestures
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);


  // Responsive visible count
  const [visibleCount, setVisibleCount] = useState(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 768) return 2;  // MOBILE: Show 2 cards
      if (window.innerWidth < 1024) return 2; // Tablet: 2 cards
    }
    return 3; // Desktop: 3 cards
  });

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) setVisibleCount(2);  // MOBILE: 2 cards
      else if (width < 1024) setVisibleCount(2);
      else setVisibleCount(3);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const totalSlides = items.length;
  const isMobile = visibleCount === 2;  // Mobile/tablet shows 2, desktop shows 3

  // Start carousel if more items than visible
  const shouldCarousel = totalSlides > visibleCount;

  // Auto-play: advance every 3 seconds (unless paused)
  useEffect(() => {
    if (isPaused || !shouldCarousel) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % totalSlides);
    }, 3000);

    return () => clearInterval(interval);
  }, [isPaused, shouldCarousel, totalSlides]);

  // Pause auto-play for 5 seconds after manual interaction
  const pauseAutoPlay = () => {
    setIsPaused(true);
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    pauseTimeoutRef.current = setTimeout(() => {
      setIsPaused(false);
    }, 5000);
  };

  // Touch handlers for swipe gestures (mobile)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    setTouchStartX(e.touches[0].clientX);
    setTouchEndX(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || !isSwiping) return;
    const currentX = e.touches[0].clientX;
    setTouchEndX(currentX);
  };

  const handleTouchEnd = () => {
    if (!isMobile || !isSwiping) return;
    setIsSwiping(false);

    const swipeThreshold = 50; // Minimum px to trigger swipe
    const diff = touchEndX - touchStartX;

    if (Math.abs(diff) > swipeThreshold) {
      pauseAutoPlay();
      if (diff < 0) {
        // Swipe left -> next
        setCurrentIndex(prev => (prev + 1) % totalSlides);
      } else {
        // Swipe right -> previous
        setCurrentIndex(prev => (prev - 1 + totalSlides) % totalSlides);
      }
    }
  };

  // Navigation controls
  const goToNext = () => {
    pauseAutoPlay();
    setCurrentIndex(prev => (prev + 1) % totalSlides);
  };

  const goToPrev = () => {
    pauseAutoPlay();
    setCurrentIndex(prev => (prev - 1 + totalSlides) % totalSlides);
  };

  // Create extended items for infinite loop (must be before any returns - React hooks rule)
  const extendedItems = useMemo(() => {
    return [...items, ...items.slice(0, visibleCount)];
  }, [items, visibleCount]);

  // Don't carousel if not enough items (based on shouldCarousel logic)
  if (!shouldCarousel) {
    return (
      <div className={`grid gap-4 ${visibleCount === 2 ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        }`}>
        {items.map((item) => (
          <CardWrapper key={item.id}>
            {renderItem(item)}
          </CardWrapper>
        ))}
      </div>
    );
  }



  return (
    <div
      className="relative overflow-hidden py-4"
      onMouseEnter={() => !isMobile && setIsPaused(true)}
      onMouseLeave={() => !isMobile && setIsPaused(false)}
    >
      {/* Carousel Track - Simplified */}
      <div
        className="flex transition-transform duration-500 ease-in-out"
        style={{
          transform: `translateX(-${currentIndex * (100 / visibleCount)}%)`,
          transition: isSwiping ? 'none' : undefined,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {extendedItems.map((item, index) => (
          <div
            key={`${item.id}-${index}`}
            className="flex-shrink-0 px-2 carousel-item-container"
            style={{
              width: `${100 / visibleCount}%`,
            }}
          >
            <CardWrapper>
              {renderItem(item)}
            </CardWrapper>
          </div>
        ))}
      </div>

      {/* Navigation Arrows (Desktop/Tablet only) */}
      {!isMobile && totalSlides > visibleCount && (
        <>
          <button
            onClick={goToPrev}
            className="absolute left-2 top-[40%] -translate-y-1/2 z-10 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white hover:scale-110 transition-all"
            aria-label="Previous"
          >
            <ChevronLeft size={24} className="text-gray-700" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-2 top-[40%] -translate-y-1/2 z-10 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white hover:scale-110 transition-all"
            aria-label="Next"
          >
            <ChevronRight size={24} className="text-gray-700" />
          </button>
        </>
      )}

      {/* Dot Indicators (Mobile) */}
      {isMobile && totalSlides > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                pauseAutoPlay();
                setCurrentIndex(index);
              }}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${index === currentIndex
                ? 'bg-brand-teal w-6'
                : 'bg-gray-300 hover:bg-gray-400'
                }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default InfiniteCarousel;
