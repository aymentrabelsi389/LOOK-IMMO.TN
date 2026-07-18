import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Image as ImageIcon } from 'lucide-react';
import { getImageSrc, buildSrcSet, getLQIP, buildPropertyImageAlt, PropertyAltContext } from '@/utils/imageUtils';

interface PropertyGalleryProps {
  images: string[];
  title: string;
  listingType?: 'sale' | 'rent';
  onOpenLightbox: (index: number) => void;
  currentImageIndex: number;
  setCurrentImageIndex: (index: number) => void;
  /** Property context for generating SEO-rich alt text on gallery images. */
  propertyAltContext?: PropertyAltContext;
}

export const PropertyGallery: React.FC<PropertyGalleryProps> = ({
  images,
  title,
  listingType,
  onOpenLightbox,
  currentImageIndex,
  setCurrentImageIndex,
  propertyAltContext,
}) => {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [loadedImages, setLoadedImages] = useState<Record<number, boolean>>({});
  const [imageOrientations, setImageOrientations] = useState<Record<number, 'vertical' | 'horizontal'>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Minimum swipe distance
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEndEvent = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && images.length > 1) {
      nextImage();
    }
    if (isRightSwipe && images.length > 1) {
      prevImage();
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((currentImageIndex + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((currentImageIndex - 1 + images.length) % images.length);
  };

  const handleImageLoad = (idx: number, e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const isVertical = img.naturalHeight > img.naturalWidth;

    setLoadedImages((prev) => ({ ...prev, [idx]: true }));
    setImageOrientations((prev) => ({ ...prev, [idx]: isVertical ? 'vertical' : 'horizontal' }));
  };

  // Auto-scroll active thumbnail into view
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const activeThumb = container.children[currentImageIndex] as HTMLElement;
      if (activeThumb) {
        const thumbLeft = activeThumb.offsetLeft;
        const thumbWidth = activeThumb.offsetWidth;
        const containerWidth = container.offsetWidth;
        const containerScrollLeft = container.scrollLeft;

        // Check if thumbnail is fully visible
        const isVisible = thumbLeft >= containerScrollLeft && (thumbLeft + thumbWidth) <= (containerScrollLeft + containerWidth);

        if (!isVisible) {
          container.scrollTo({
            left: thumbLeft - containerWidth / 2 + thumbWidth / 2,
            behavior: 'smooth'
          });
        }
      }
    }
  }, [currentImageIndex]);

  // Manual scrolling for thumbnail carousel on desktop
  const scrollThumbnails = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollAmount = container.offsetWidth * 0.8;
      container.scrollTo({
        left: container.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount),
        behavior: 'smooth'
      });
    }
  };


  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 flex flex-col group/gallery">
      {/* Main Hero Image */}
      <div
        className="relative group aspect-[16/9] w-full overflow-hidden bg-gray-900 cursor-zoom-in"
        onClick={() => onOpenLightbox(currentImageIndex)}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEndEvent}
      >
        {images.length > 0 ? (
          <>
            {/* Background Blur — purely decorative, hidden from screen readers */}
            <img
              src={getImageSrc(images[currentImageIndex], 'medium')}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-50 scale-110 transition-all duration-500"
              loading="lazy"
              decoding="async"
            />

            {/* LQIP Placeholder — visible while the full image loads */}
            {!loadedImages[currentImageIndex] && (
              <div
                className="absolute inset-0 z-0 bg-cover bg-center transition-opacity duration-300"
                style={{
                  backgroundImage: getLQIP(images[currentImageIndex])
                    ? `url(${getLQIP(images[currentImageIndex])})`
                    : undefined,
                  backgroundColor: getLQIP(images[currentImageIndex]) ? undefined : '#d1d5db',
                }}
              />
            )}

            {/* Foreground Main Image */}
            <img
              src={getImageSrc(images[currentImageIndex], 'large')}
              srcSet={buildSrcSet(images[currentImageIndex])}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 800px"
              alt={
                propertyAltContext
                  ? buildPropertyImageAlt(propertyAltContext, currentImageIndex, images.length)
                  : title
              }
              onLoad={(e) => handleImageLoad(currentImageIndex, e)}
              className={`relative z-10 w-full h-full transform scale-100 group-hover:scale-[1.02] transition-all duration-700 ease-in-out ${loadedImages[currentImageIndex] ? 'opacity-100' : 'opacity-0'} ${imageOrientations[currentImageIndex] === 'vertical' ? 'object-contain' : 'object-cover'}`}
              loading="eager"
              fetchPriority="high"
              decoding="sync"
            />
          </>
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-gray-100">
            <ImageIcon className="text-gray-400" size={48} />
          </div>
        )}

        {/* Floating Badge */}
        {listingType && (
          <div className="absolute top-4 left-4 z-20">
            <span className={`px-2.5 py-1 md:px-4 md:py-2 rounded-full text-[11px] md:text-sm font-bold uppercase tracking-wider text-white shadow-lg ${listingType === 'sale' ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gradient-to-r from-green-600 to-green-700'}`}>
              {listingType === 'sale' ? 'À VENDRE' : 'À LOUER'}
            </span>
          </div>
        )}



        {/* Desktop Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-white/90 hover:bg-white text-gray-800 p-3 rounded-full shadow-xl transition-all opacity-0 md:group-hover/gallery:opacity-100 transform -translate-x-4 group-hover:translate-x-0 hover:scale-110 active:scale-95"
              aria-label="Image précédente"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-white/90 hover:bg-white text-gray-800 p-3 rounded-full shadow-xl transition-all opacity-0 md:group-hover/gallery:opacity-100 transform translate-x-4 group-hover:translate-x-0 hover:scale-110 active:scale-95"
              aria-label="Image suivante"
            >
              <ChevronRight size={24} />
            </button>

            {/* Mobile Image Indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-medium md:hidden tracking-widest shadow-lg">
              {currentImageIndex + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {/* Horizontal Thumbnail Carousel */}
      {images.length > 1 && (
        <div className="relative border-t border-gray-100 bg-white z-10 group/carousel">
          {/* Scroll Left Button */}
          <button
            onClick={() => scrollThumbnails('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-all opacity-0 md:group-hover/carousel:opacity-100 transform hover:scale-110 active:scale-95"
            aria-label="Scroll left"
          >
            <ChevronLeft size={20} />
          </button>

          <div
            ref={scrollContainerRef}
            className="p-4 flex gap-3 overflow-x-auto snap-x scroll-smooth scrollbar-none"
            style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
          >
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentImageIndex(idx)}
                aria-label={`Voir l'image ${idx + 1}`}
                style={{
                  backgroundImage: getLQIP(img) ? `url(${getLQIP(img)})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundColor: getLQIP(img) ? undefined : '#e5e7eb',
                }}
                className={`flex-shrink-0 w-24 h-16 md:w-28 md:h-20 rounded-lg overflow-hidden border-[3px] transition-all duration-300 snap-center focus:outline-none ${idx === currentImageIndex
                    ? 'border-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.35)] scale-105 z-10'
                    : 'border-transparent opacity-60 hover:opacity-100 hover:border-gray-200'
                  }`}
              >
                <img
                  src={getImageSrc(img, 'thumb')}
                  alt={
                    propertyAltContext
                      ? buildPropertyImageAlt(propertyAltContext, idx, images.length)
                      : `${title} — photo ${idx + 1}`
                  }
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                  loading="lazy"
                  decoding="async"
                />
              </button>
            ))}
          </div>

          {/* Scroll Right Button */}
          <button
            onClick={() => scrollThumbnails('right')}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-all opacity-0 md:group-hover/carousel:opacity-100 transform hover:scale-110 active:scale-95"
            aria-label="Scroll right"
          >
            <ChevronRight size={20} />
          </button>

          {/* Subtle gradient edges for thumbnails */}
          <div className="absolute top-0 bottom-0 left-0 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none z-10" />
          <div className="absolute top-0 bottom-0 right-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />
        </div>
      )}
    </div>
  );
};
