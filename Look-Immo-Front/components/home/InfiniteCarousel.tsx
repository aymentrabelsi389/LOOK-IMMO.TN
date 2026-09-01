import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DefaultCardWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;

const InfiniteCarousel = <T extends { id: string }>({
  items,
  renderItem,
  CardWrapper = DefaultCardWrapper
}: {
  items: T[],
  renderItem: (item: T) => React.ReactNode,
  CardWrapper?: React.ComponentType<{ children: React.ReactNode }>
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Touch state for swipe gestures
  const touchStartXRef = useRef(0);
  const touchEndXRef = useRef(0);

  // Responsive visible count
  const [visibleCount, setVisibleCount] = useState(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 768) return 2;  // Mobile: 2 cards
      if (window.innerWidth < 1024) return 2; // Tablet: 2 cards
    }
    return 3; // Desktop: 3 cards
  });

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) setVisibleCount(2);
      else if (width < 1024) setVisibleCount(2);
      else setVisibleCount(3);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const totalSlides = items.length;
  const isMobile = visibleCount === 2;
  const shouldCarousel = totalSlides > visibleCount;
  const buffer = visibleCount;

  // Initialize currentIndex to the start of real items (after prepended clones)
  const [currentIndex, setCurrentIndex] = useState(buffer);

  // Reset index when items or visibleCount change
  useEffect(() => {
    setCurrentIndex(buffer);
    setTransitionEnabled(true);
  }, [totalSlides, buffer]);

  // Extended items with bidirectional buffer clones
  const extendedItems = useMemo(() => {
    if (!shouldCarousel || totalSlides === 0) return items;
    const prependClones = items.slice(-buffer);
    const appendClones = items.slice(0, buffer);
    return [...prependClones, ...items, ...appendClones];
  }, [items, shouldCarousel, totalSlides, buffer]);

  // Pause auto-play for 5 seconds after manual interaction
  const pauseAutoPlay = useCallback(() => {
    setIsPaused(true);
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    pauseTimeoutRef.current = setTimeout(() => {
      setIsPaused(false);
    }, 5000);
  }, []);

  const handleNext = useCallback(() => {
    if (!transitionEnabled) return;
    setCurrentIndex(prev => prev + 1);
  }, [transitionEnabled]);

  const handlePrev = useCallback(() => {
    if (!transitionEnabled) return;
    setCurrentIndex(prev => prev - 1);
  }, [transitionEnabled]);

  // Auto-play: advance every 3.5 seconds (unless paused)
  useEffect(() => {
    if (isPaused || !shouldCarousel) return;

    const interval = setInterval(() => {
      handleNext();
    }, 3500);

    return () => clearInterval(interval);
  }, [isPaused, shouldCarousel, handleNext]);

  // Clean transition wrap-around
  const handleTransitionEnd = () => {
    if (currentIndex >= buffer + totalSlides) {
      // Reached cloned items at the end -> silently snap back to real start
      setTransitionEnabled(false);
      const resetIndex = currentIndex - totalSlides;
      setCurrentIndex(resetIndex);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTransitionEnabled(true);
        });
      });
    } else if (currentIndex < buffer) {
      // Reached cloned items at the start -> silently snap forward to real end
      setTransitionEnabled(false);
      const resetIndex = currentIndex + totalSlides;
      setCurrentIndex(resetIndex);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTransitionEnabled(true);
        });
      });
    }
  };

  // Touch handlers for swipe gestures (mobile)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchEndXRef.current - touchStartXRef.current;
    if (Math.abs(diff) > 40) {
      pauseAutoPlay();
      if (diff < 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  };

  // Calculate active dot index (0 to totalSlides - 1)
  const activeDotIndex = totalSlides > 0
    ? (((currentIndex - buffer) % totalSlides) + totalSlides) % totalSlides
    : 0;

  // Don't carousel if not enough items
  if (!shouldCarousel) {
    return (
      <div className={`grid gap-4 ${visibleCount === 2 ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
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
      className="relative overflow-hidden py-4 select-none"
      onMouseEnter={() => !isMobile && setIsPaused(true)}
      onMouseLeave={() => !isMobile && setIsPaused(false)}
    >
      {/* Carousel Track */}
      <div
        className="flex"
        style={{
          transform: `translate3d(-${currentIndex * (100 / visibleCount)}%, 0, 0)`,
          transition: transitionEnabled ? 'transform 500ms cubic-bezier(0.25, 1, 0.5, 1)' : 'none',
          willChange: 'transform',
        }}
        onTransitionEnd={handleTransitionEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {extendedItems.map((item, index) => (
          <div
            key={`${item.id}-${index}`}
            className="flex-shrink-0 px-2"
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
            type="button"
            onClick={() => {
              pauseAutoPlay();
              handlePrev();
            }}
            className="absolute left-2 top-[40%] -translate-y-1/2 z-30 w-10 h-10 bg-white/90 rounded-full shadow-md flex items-center justify-center hover:bg-white hover:scale-110 transition-all cursor-pointer"
            aria-label="Previous"
          >
            <ChevronLeft size={24} className="text-gray-700" />
          </button>
          <button
            type="button"
            onClick={() => {
              pauseAutoPlay();
              handleNext();
            }}
            className="absolute right-2 top-[40%] -translate-y-1/2 z-30 w-10 h-10 bg-white/90 rounded-full shadow-md flex items-center justify-center hover:bg-white hover:scale-110 transition-all cursor-pointer"
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
              type="button"
              onClick={() => {
                pauseAutoPlay();
                setCurrentIndex(buffer + index);
              }}
              className={`h-2.5 rounded-full transition-all duration-300 ${index === activeDotIndex
                ? 'bg-brand-teal w-6'
                : 'bg-gray-300 hover:bg-gray-400 w-2.5'
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
