import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Square, ChevronRight } from 'lucide-react';
import { Property } from '@/types';
import Price from '@/components/Price';
import { getImageSrc, buildSrcSet } from '@/utils/imageUtils';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

interface PropertySimilarListingsProps {
  similarProperties: Property[];
  onSelectProperty: (id: string) => void;
}

export const PropertySimilarListings: React.FC<PropertySimilarListingsProps> = ({
  similarProperties,
  onSelectProperty
}) => {
  if (similarProperties.length === 0) return null;

  return (
    <ScrollReveal>
      <div className="bg-white rounded-2xl p-6 shadow-sm mt-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Propriétés Similaires</h2>
        <div className="flex flex-col gap-6">
          {similarProperties.slice(0, 3).map((prop) => (
            <Link
              key={prop.id}
              to={`/property/${prop.id}`}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
                e.preventDefault();
                onSelectProperty(prop.id);
              }}
              className="relative group block"
            >
              {/* Blue Glow Shadow Effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-brand-teal to-blue-600 rounded-2xl blur opacity-10 group-hover:opacity-30 transition duration-500"></div>

              <div className="relative border border-gray-200 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer bg-white block isolate">
                <div className="relative h-48 w-full overflow-hidden rounded-t-2xl isolate">
                  <img
                    src={getImageSrc(prop.images[0], 'medium')}
                    srcSet={buildSrcSet(prop.images[0])}
                    sizes="(max-width: 640px) 400px, 800px"
                    alt={prop.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 rounded-t-2xl"
                    loading="lazy"
                    decoding="async"
                  />

                  {/* Glassmorphism Status Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    <div className="bg-white/40 backdrop-blur-md border border-white/60 p-5 rounded-2xl shadow-xl flex flex-col items-center justify-center text-center transform group-hover:scale-105 transition-all duration-500 min-w-[160px]">
                      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-dark mb-1 opacity-70">
                        {prop.type === 'land'
                          ? 'Terrain'
                          : prop.type === 'villa'
                          ? 'Villa'
                          : prop.type === 'apartment'
                          ? 'Appartement'
                          : prop.type === 'depot'
                          ? 'Dépôt'
                          : prop.type === 'studio'
                          ? 'Studio'
                          : prop.type === 'duplex'
                          ? 'Duplex'
                          : prop.type === 'triplex'
                          ? 'Triplex'
                          : prop.type === 'penthouse'
                          ? 'Penthouse'
                          : 'Propriété'}
                      </span>
                      <span className="text-sm font-bold uppercase tracking-[0.1em] text-brand-dark border-t border-brand-dark/10 pt-1 mt-1">
                        {prop.listingType === 'sale' ? 'À Vendre' : 'À Louer'}
                      </span>
                    </div>
                  </div>

                  {/* Decorative Chevrons */}
                  <div className="absolute top-4 left-4 flex flex-col gap-0.5 opacity-40">
                    {[1, 2, 3].map((i) => (
                      <ChevronRight key={i} className="-rotate-90 text-white" size={10} strokeWidth={3} />
                    ))}
                  </div>
                  <div className="absolute bottom-4 right-4 flex flex-col gap-0.5 opacity-40 rotate-180">
                    {[1, 2, 3].map((i) => (
                      <ChevronRight key={i} className="-rotate-90 text-white" size={10} strokeWidth={3} />
                    ))}
                  </div>
                </div>
                <div className="p-4">
                  <h4 className="font-bold text-brand-dark truncate group-hover:text-brand-teal transition-colors text-base mb-1.5 font-serif">
                    {prop.title}
                  </h4>

                  <div className="flex items-center justify-between gap-2 mt-3">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <div className="flex items-center text-[10px] text-gray-500 bg-gray-50/60 px-2 py-1 rounded-lg border border-gray-100 shrink-0 font-sans">
                        <MapPin size={10} className="mr-1 text-blue-500" />
                        <span className="truncate max-w-[80px] font-bold uppercase tracking-wider">{prop.location.city}</span>
                      </div>

                      {prop.features.area && prop.features.area > 0 && (
                        <div className="flex items-center text-[10px] text-gray-500 bg-gray-50/60 px-2 py-1 rounded-lg border border-gray-100 shrink-0 font-sans">
                          <Square size={10} className="mr-1 text-brand-teal" />
                          <span className="font-bold uppercase tracking-wider">{prop.features.area} m²</span>
                        </div>
                      )}
                    </div>

                    <Price
                      amount={prop.price}
                      priceType={prop.type === 'land' ? 'per_m2' : 'total'}
                      className="text-blue-600 font-extrabold text-sm whitespace-nowrap font-serif"
                    />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </ScrollReveal>
  );
};
