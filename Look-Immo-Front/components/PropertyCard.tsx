import React, { useMemo, useState } from 'react';
import { Bath, BedDouble, Crown, Flame, Heart, MapPin, Sparkles, Square, Star } from 'lucide-react';
import { Property } from '../types';
import Price from './Price';
import { getImageSrc, buildSrcSet, getLQIP, buildPropertyImageAlt } from '../utils/imageUtils';

interface PropertyCardProps {
  property: Property;
  onSelect: (id: string) => void;
  isFavorite: boolean;
  userRole?: string;
  onToggleFavorite?: (propertyId: string) => void;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property, onSelect, isFavorite, userRole, onToggleFavorite }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const isAdmin = userRole === 'admin';

  const displayLocation = useMemo(() => {
    const city = property.location.city || '';
    const address = property.location.address || '';
    if (!city) return address;
    if (!address) return city;
    if (address.toLowerCase().includes(city.toLowerCase())) return address;
    return `${city}, ${address}`;
  }, [property.location.city, property.location.address]);

  return (
    <div className="relative group h-full">
      <div className="absolute -inset-1 bg-gradient-to-r from-brand-teal to-blue-600 rounded-2xl blur opacity-25 md:group-hover:opacity-50 transition duration-500"></div>
      <div onClick={() => onSelect(property.id)} className="group bg-white rounded-2xl shadow-soft md:hover:shadow-2xl md:hover:shadow-brand-teal/10 transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100 flex flex-col h-full md:transform md:hover:-translate-y-1 relative isolate">
        <div
          className="relative h-44 sm:h-52 md:h-64 overflow-hidden rounded-t-2xl isolate"
          style={{
            backgroundImage: getLQIP(property.images[0]) ? `url(${getLQIP(property.images[0])})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: getLQIP(property.images[0]) ? undefined : '#f3f4f6',
          }}
        >
          <img
            src={getImageSrc(property.images[0], 'medium')}
            srcSet={buildSrcSet(property.images[0])}
            sizes="(max-width: 640px) 400px, (max-width: 1024px) 800px, 1400px"
            alt={buildPropertyImageAlt({
              title:       property.title,
              type:        property.type,
              listingType: property.listingType,
              city:        property.location.city,
              bedrooms:    property.features.bedrooms,
              area:        property.features.area,
              pool:        property.features.pool,
              parking:     property.features.parking,
            })}
            className="w-full h-full object-cover transform md:group-hover:scale-110 transition duration-700 rounded-t-2xl"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute top-3 left-3 flex flex-col space-y-1 z-10">
            <span className={`px-1.5 md:px-3 py-0.5 md:py-1 rounded-full text-[9px] md:text-xs font-bold uppercase tracking-wide md:tracking-wider text-white shadow-md ${property.listingType === 'sale' ? 'bg-blue-600' : 'bg-green-600'}`}>
              {property.listingType === 'sale' ? 'À VENDRE' : 'À LOUER'}
            </span>
            {property.status === 'sold' && <span className="px-1.5 md:px-3 py-0.5 md:py-1 rounded-full text-[9px] md:text-xs font-bold uppercase tracking-wide md:tracking-wider text-white bg-red-600 shadow-md">VENDU</span>}
            {property.status === 'rented' && <span className="px-1.5 md:px-3 py-0.5 md:py-1 rounded-full text-[9px] md:text-xs font-bold uppercase tracking-wide md:tracking-wider text-white bg-orange-500 shadow-md">LOUÉ</span>}
            {(property.isFeatured && (property.status === 'available' || !property.status)) && (
              <span className="px-1.5 md:px-3 py-0.5 md:py-1 rounded-full text-[9px] md:text-xs font-black uppercase tracking-wide md:tracking-wider text-amber-950 bg-gradient-to-r from-amber-200 to-amber-500 shadow-md flex items-center w-fit">
                <Crown size={9} className="mr-1 fill-current" /> EXCLUSIVITÉ
              </span>
            )}
            {(property.isNew && (property.status === 'available' || !property.status)) && (
              <span className="px-1.5 md:px-3 py-0.5 md:py-1 rounded-full text-[9px] md:text-xs font-bold uppercase tracking-wide md:tracking-wider text-white bg-brand-teal shadow-md flex items-center w-fit">
                <Sparkles size={9} className="mr-1" /> NOUVEAU
              </span>
            )}
            {(property.isHotDeal && (property.status === 'available' || !property.status)) && (
              <span className="px-1.5 md:px-3 py-0.5 md:py-1 rounded-full text-[9px] md:text-xs font-bold uppercase tracking-wide md:tracking-wider text-white bg-red-500 shadow-md flex items-center w-fit animate-pulse">
                <Flame size={9} className="mr-1" /> PROMOTION
              </span>
            )}
          </div>

          {!isAdmin && onToggleFavorite && (
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAnimating(true);
                  onToggleFavorite(property.id);
                  setTimeout(() => setIsAnimating(false), 300);
                }}
                aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                className={`p-2 rounded-full ${isFavorite ? 'bg-red-50 text-red-500' : 'bg-white/90 text-gray-600 hover:text-red-500'} shadow-md backdrop-blur-sm hover:scale-110 ${isAnimating ? 'animate-bounce' : ''}`}
                style={{ transform: isAnimating ? 'scale(1.2)' : 'scale(1)' }}
              >
                <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} className="transition-all" />
              </button>
            </div>
          )}

          {(property.status === 'sold' || property.status === 'rented') && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-0">
              <span className="text-white text-3xl font-bold border-4 border-white px-6 py-2 transform -rotate-12 uppercase tracking-widest">
                {property.status === 'sold' ? 'VENDU' : 'LOUÉ'}
              </span>
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-brand-dark/90 via-brand-dark/50 to-transparent p-4 pt-12">
            <p className="text-lg md:text-2xl font-bold text-white font-serif tracking-wide drop-shadow-md">
              <Price amount={property.price} priceType={property.priceType} />
              {property.listingType === 'rent' && <span className="ml-1 text-[0.7em] font-medium">/ Mois</span>}
            </p>
          </div>
        </div>

        <div className="p-3 md:p-5 flex-1 flex flex-col">
          <div className="flex-1">
            <div className="flex justify-between items-start mb-1.5 md:mb-2">
              <h3 className="text-sm md:text-lg font-bold text-brand-dark line-clamp-1 md:group-hover:text-brand-teal transition">{property.title}</h3>
            </div>
            <div className="flex items-center text-brand-grey text-xs md:text-sm mb-2 md:mb-4">
              <MapPin size={12} className="mr-1 text-brand-teal flex-shrink-0" />
              <span className="line-clamp-1">{displayLocation}</span>
            </div>
            {(property.averageRating || 0) > 0 && (
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-400"><Star size={14} fill="currentColor" /></div>
                <span className="text-xs font-bold ml-1 text-gray-700">{property.averageRating.toFixed(1)}</span>
                <span className="text-xs text-gray-400 ml-1">({property.ratingsCount} avis)</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between text-gray-500 text-[10px] md:text-sm border-t border-gray-100 pt-3 md:pt-4 mt-auto">
            {property.type === 'land' ? (
              <>
                <div className="flex items-center whitespace-nowrap" title="Surface"><span className="mr-1">📐</span><span className="truncate">{property.features.area} m²</span></div>
                <div className="flex items-center whitespace-nowrap" title="Vocation"><span className="mr-1">🏗️</span><span className="truncate">{property.features.vocation ? property.features.vocation.replace(/résidentiel|residentiel/gi, '').trim() : 'N/A'}</span></div>
                <div className="flex items-center whitespace-nowrap" title="COS"><span className="mr-1">📊</span><span className="truncate">COS {property.features.cos || 'N/A'}</span></div>
              </>
            ) : (
              <>
                <div className="flex items-center whitespace-nowrap" title="Bedrooms"><BedDouble size={14} className="md:w-4 md:h-4 mr-1 text-brand-teal flex-shrink-0" /><span>{property.features.bedrooms}</span></div>
                <div className="flex items-center whitespace-nowrap" title="Bathrooms"><Bath size={14} className="md:w-4 md:h-4 mr-1 text-brand-teal flex-shrink-0" /><span>{property.features.bathrooms}</span></div>
                <div className="flex items-center whitespace-nowrap" title="Area"><Square size={14} className="md:w-4 md:h-4 mr-1 text-brand-teal flex-shrink-0" /><span>{property.features.area} m²</span></div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
