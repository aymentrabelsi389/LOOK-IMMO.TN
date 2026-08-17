import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Property } from '@/types';
import { getImageSrc, buildSrcSet, buildPropertyImageAlt } from '@/utils/imageUtils';

interface PropertyLightboxProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
  currentImageIndex: number;
  setCurrentImageIndex: (idx: number | ((prev: number) => number)) => void;
}

export const PropertyLightbox: React.FC<PropertyLightboxProps> = ({
  property,
  isOpen,
  onClose,
  currentImageIndex,
  setCurrentImageIndex
}) => {
  const [pointerStartX, setPointerStartX] = useState<number | null>(null);

  if (!isOpen) return null;

  const handlePointerDown = (e: React.PointerEvent) => {
    setPointerStartX(e.clientX);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (pointerStartX === null || !property?.images) return;
    const distance = pointerStartX - e.clientX;
    const minSwipeDistance = 50;

    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        // Swipe Left -> Next
        setCurrentImageIndex((currentImageIndex + 1) % property.images.length);
      } else {
        // Swipe Right -> Prev
        setCurrentImageIndex((currentImageIndex - 1 + property.images.length) % property.images.length);
      }
    }
    setPointerStartX(null);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md animate-fade-in flex flex-col"
      onClick={onClose}
    >
      {/* Header Content */}
      <div className="flex-shrink-0 p-4 sm:p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex flex-col text-left">
          <span className="text-white font-bold text-base sm:text-lg tracking-tight">Vue Plein Écran</span>
          <span className="text-white/60 text-xs font-medium uppercase tracking-widest">
            {currentImageIndex + 1} SUR {property.images.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-3 text-white bg-white/10 hover:bg-white/20 rounded-full transition-all duration-300 transform hover:rotate-90 group"
          aria-label="Fermer la vue plein écran"
        >
          <X size={24} />
        </button>
      </div>

      {/* Main Image Stage */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden select-none touch-pan-y"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        <img
          src={getImageSrc(property.images[currentImageIndex], 'large')}
          srcSet={buildSrcSet(property.images[currentImageIndex])}
          sizes="100vw"
          alt={buildPropertyImageAlt(
            {
              title: property.title,
              type: property.type,
              listingType: property.listingType,
              city: property.location.city,
              bedrooms: property.features.bedrooms,
              area: property.features.area,
              pool: property.features.pool,
              parking: property.features.parking,
            },
            currentImageIndex,
            property.images.length
          )}
          className="w-full h-full object-contain shadow-2xl animate-zoom-in pointer-events-none"
        />

        {/* Large Navigation Arrows */}
        {property.images.length > 1 && (
          <>
            <button
              onClick={() =>
                setCurrentImageIndex((currentImageIndex - 1 + property.images.length) % property.images.length)
              }
              className="absolute left-0 sm:left-4 top-1/2 -translate-y-1/2 p-3 sm:p-4 text-white/60 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-all transform hover:scale-110 active:scale-95 z-10"
              aria-label="Image précédente"
            >
              <ChevronLeft size={32} />
            </button>
            <button
              onClick={() => setCurrentImageIndex((currentImageIndex + 1) % property.images.length)}
              className="absolute right-0 sm:right-4 top-1/2 -translate-y-1/2 p-3 sm:p-4 text-white/60 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-all transform hover:scale-110 active:scale-95 z-10"
              aria-label="Image suivante"
            >
              <ChevronRight size={32} />
            </button>
          </>
        )}
      </div>

      {/* Caption Overlay */}
      <div className="flex-shrink-0 py-4 px-6 flex justify-center z-10">
        <span className="px-6 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white/90 text-sm font-medium text-center whitespace-nowrap">
          {property.title}
        </span>
      </div>
    </div>
  );
};
