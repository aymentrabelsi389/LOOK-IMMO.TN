import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, MapPin, BedDouble, Bath, Square, Search } from 'lucide-react';
import { Property, User } from '@/types';
import Price from '@/components/Price';
import { getImageSrc, getLQIP } from '@/utils/imageUtils';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

interface FavoritesSectionProps {
  user: User;
  properties: Property[];
  onSelectProperty: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onNavigateHome: () => void;
}

export const FavoritesSection: React.FC<FavoritesSectionProps> = ({
  user,
  properties,
  onSelectProperty,
  onToggleFavorite,
  onNavigateHome
}) => {
  const favoriteProperties = properties.filter((p) => user.favorites.includes(p.id));

  return (
    <ScrollReveal className="lg:col-span-2 lg:row-start-1" delay={200}>
      <div className="bg-white rounded-3xl shadow-soft border border-gray-100/80 p-4 sm:p-6 md:p-8">
      <h2 className="text-xl font-serif font-bold text-brand-dark mb-6 flex items-center">
        <Heart className="mr-2.5 text-red-500 animate-pulse" size={24} fill="currentColor" />
        Mes Favoris
        {user.favorites.length > 0 && (
          <span className="ml-2 px-2.5 py-0.5 bg-red-50 text-red-600 text-xs font-extrabold rounded-full border border-red-100">
            {user.favorites.length}
          </span>
        )}
      </h2>

      {favoriteProperties.length > 0 ? (
        <div className="space-y-4">
          {favoriteProperties.map((property) => (
            <div
              key={property.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-white hover:bg-gray-50/30 rounded-2xl hover:border-brand-teal/20 transition-all duration-300 border border-gray-100 cursor-pointer gap-4 group shadow-sm hover:shadow-soft"
              onClick={() => onSelectProperty(property.id)}
            >
              {/* Property Image & Info */}
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 w-full sm:w-auto">
                <div
                  className="w-20 h-16 sm:w-24 sm:h-20 rounded-xl overflow-hidden flex-shrink-0 relative shadow-inner"
                  style={{
                    backgroundImage: getLQIP(property.images[0]) ? `url(${getLQIP(property.images[0])})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundColor: getLQIP(property.images[0]) ? undefined : '#f3f4f6'
                  }}
                >
                  <img
                    src={getImageSrc(property.images[0], 'thumb')}
                    alt={property.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/5"></div>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-serif font-bold text-gray-900 mb-1 truncate text-xs sm:text-base group-hover:text-brand-teal transition-colors">
                    <Link
                      to={`/property/${property.id}`}
                      onClick={(e) => {
                        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
                        e.preventDefault();
                        e.stopPropagation();
                        onSelectProperty(property.id);
                      }}
                      className="hover:text-brand-teal transition-colors"
                    >
                      {property.title}
                    </Link>
                  </h3>
                  <div className="flex items-center text-[11px] sm:text-xs text-brand-grey mb-1.5">
                    <MapPin size={12} className="mr-1 text-brand-teal flex-shrink-0" />
                    <span className="truncate">{property.location.city}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-brand-grey font-medium">
                    {property.type === 'land' ? (
                      <>
                        <span className="flex items-center bg-gray-50 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md flex-shrink-0">
                          <span className="mr-1 sm:mr-1.5">🏗️</span>
                          {property.features.vocation
                            ? property.features.vocation.replace(/résidentiel|residentiel/gi, '').trim()
                            : 'N/A'}
                        </span>
                        <span className="flex items-center bg-gray-50 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md flex-shrink-0">
                          <span className="mr-1 sm:mr-1.5">📊</span>
                          COS {property.features.cos || 'N/A'}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="flex items-center bg-gray-50 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md flex-shrink-0">
                          <BedDouble size={12} className="mr-1 sm:mr-1.5 text-brand-teal flex-shrink-0" />
                          {property.features.bedrooms} ch.
                        </span>
                        <span className="flex items-center bg-gray-50 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md flex-shrink-0">
                          <Bath size={12} className="mr-1 sm:mr-1.5 text-brand-teal flex-shrink-0" />
                          {property.features.bathrooms} sdb
                        </span>
                      </>
                    )}
                    <span className="flex items-center bg-gray-50 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md flex-shrink-0">
                      <Square size={12} className="mr-1 sm:mr-1.5 text-brand-teal flex-shrink-0" />
                      {property.features.area} m²
                    </span>
                  </div>
                </div>
              </div>

              {/* Price and Actions Group */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100 w-full sm:w-auto gap-3">
                <div className="text-left sm:text-right">
                  <p className="text-base sm:text-lg font-bold text-brand-dark">
                    <Price amount={property.price} priceType={property.priceType} />
                  </p>
                  {property.listingType === 'rent' && (
                    <p className="text-[10px] text-gray-400 uppercase font-sans font-bold tracking-wider"> / Mois</p>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(property.id);
                  }}
                  className="p-2 hover:bg-red-50 rounded-full transition text-red-500 hover:scale-105 active:scale-95"
                  title="Retirer des favoris"
                >
                  <Heart size={18} fill="currentColor" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-14 text-gray-500 bg-gray-50/30 rounded-2xl border border-dashed border-gray-200">
          <Heart className="mx-auto text-gray-300 mb-3" size={44} />
          <h4 className="font-serif font-bold text-brand-dark text-lg mb-1.5">Aucun favori</h4>
          <p className="text-sm text-gray-500 mb-6">Vous n'avez pas encore ajouté de propriétés à vos favoris.</p>
          <button
            onClick={onNavigateHome}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-brand-teal to-cyan-500 hover:from-cyan-500 hover:to-brand-teal text-white rounded-2xl font-bold transition-all duration-300 shadow-md shadow-brand-teal/15 hover:shadow-brand-teal/25"
          >
            <Search size={16} className="mr-2" />
            Explorer les propriétés
          </button>
        </div>
      )}
    </div>
    </ScrollReveal>
  );
};
