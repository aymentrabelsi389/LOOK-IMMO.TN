
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface InfiniteCarouselProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  visibleCount?: number;
}

export const InfiniteCarousel = <T extends { id: string }>({
  items,
  renderItem,
  visibleCount: initialVisibleCount
}: InfiniteCarouselProps<T>) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Responsive visible count
  const [visibleCount, setVisibleCount] = useState(initialVisibleCount || 3);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) setVisibleCount(1);
      else if (width < 1024) setVisibleCount(2);
      else setVisibleCount(initialVisibleCount || 3);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initialVisibleCount]);

  const totalSlides = items.length;
  const shouldCarousel = totalSlides > visibleCount;

  useEffect(() => {
    if (isPaused || !shouldCarousel) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % totalSlides);
    }, 3000);
    return () => clearInterval(interval);
  }, [isPaused, shouldCarousel, totalSlides]);

  const pauseAutoPlay = () => {
    setIsPaused(true);
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    pauseTimeoutRef.current = setTimeout(() => setIsPaused(false), 5000);
  };

  const extendedItems = useMemo(() => {
    return [...items, ...items.slice(0, visibleCount)];
  }, [items, visibleCount]);

  const goToNext = () => {
    pauseAutoPlay();
    setCurrentIndex(prev => (prev + 1) % totalSlides);
  };

  const goToPrev = () => {
    pauseAutoPlay();
    setCurrentIndex(prev => (prev - 1 + totalSlides) % totalSlides);
  };

  if (totalSlides === 0) return null;

  return (
    <div 
      className="relative overflow-hidden py-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div 
        className="flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${currentIndex * (100 / visibleCount)}%)` }}
      >
        {extendedItems.map((item, index) => (
          <div 
            key={`${item.id}-${index}`}
            className="flex-shrink-0 px-2"
            style={{ width: `${100 / visibleCount}%` }}
          >
            {renderItem(item)}
          </div>
        ))}
      </div>

      {shouldCarousel && (
        <>
          <button onClick={goToPrev} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-white/80 rounded-full shadow hover:bg-white transition ml-2"><ChevronLeft size={24} /></button>
          <button onClick={goToNext} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-white/80 rounded-full shadow hover:bg-white transition mr-2"><ChevronRight size={24} /></button>
        </>
      )}
    </div>
  );
};
