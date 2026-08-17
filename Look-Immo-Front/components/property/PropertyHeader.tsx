import React from 'react';
import { MapPin, Star, Share2, Heart } from 'lucide-react';
import { Property, User } from '@/types';
import Price from '@/components/Price';

interface PropertyHeaderProps {
  property: Property;
  user: User | null;
  onToggleFavorite: (id: string) => void;
  onOpenAuth: () => void;
}

export const PropertyHeader: React.FC<PropertyHeaderProps> = ({
  property,
  user,
  onToggleFavorite,
  onOpenAuth
}) => {
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Lien copié dans le presse-papier !');
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      onOpenAuth();
      return;
    }
    onToggleFavorite(property.id);
  };

  const isFav = user?.favorites.includes(property.id) || false;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
        <div className="flex-1 w-full overflow-hidden">
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 truncate" title={property.title}>
            {property.title}
          </h1>
          <div className="flex items-center text-gray-600 mb-3">
            <MapPin size={20} className="mr-2 text-brand-teal flex-shrink-0" />
            <span className="text-sm sm:text-lg truncate">{property.location.city}</span>
          </div>
          <div className="flex justify-between items-center w-full sm:block">
            {/* Rating */}
            <div className="flex items-center">
              <div className="flex text-yellow-400 mr-2 flex-shrink-0">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className="sm:w-[18px] sm:h-[18px]"
                    fill={i < Math.round(property.averageRating || 0) ? 'currentColor' : 'none'}
                  />
                ))}
              </div>
              <span className="font-bold text-gray-900 text-xs sm:text-base">
                {property.averageRating ? property.averageRating.toFixed(1) : 'N/A'}
              </span>
              <span className="text-gray-500 ml-1 text-[10px] sm:text-sm shadow-sm whitespace-nowrap">
                ({property.ratingsCount || 0} avis)
              </span>
            </div>

            {/* Share & Favorite (Mobile) */}
            <div className="flex gap-2 sm:hidden flex-shrink-0">
              <button
                onClick={handleShare}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition"
                title="Partager"
              >
                <Share2 size={18} className="text-gray-700" />
              </button>
              <button
                onClick={handleFavoriteClick}
                className={`p-2 rounded-full transition ${isFav ? 'bg-red-50 hover:bg-red-100' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                <Heart size={18} className={isFav ? 'text-red-500' : 'text-gray-400'} fill={isFav ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>
        </div>

        {/* Share & Favorite (Desktop) */}
        <div className="hidden sm:flex gap-2 sm:ml-4 flex-shrink-0">
          <button
            onClick={handleShare}
            className="p-3 bg-gray-100 hover:bg-gray-200 rounded-full transition flex-shrink-0"
            title="Partager"
          >
            <Share2 size={20} className="text-gray-700" />
          </button>
          <button
            onClick={handleFavoriteClick}
            className={`p-3 rounded-full transition flex-shrink-0 ${isFav ? 'bg-red-50 hover:bg-red-100' : 'bg-gray-100 hover:bg-gray-200'}`}
            title={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Heart size={20} className={isFav ? 'text-red-500' : 'text-gray-400'} fill={isFav ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      {/* Price */}
      <div
        className={`bg-gradient-to-r from-brand-dark to-blue-900 text-white p-4 sm:p-6 rounded-xl flex flex-col sm:flex-row items-center ${
          property.priceType === 'per_m2' && property.features?.area && property.features.area > 0
            ? 'justify-between'
            : 'justify-center'
        } shadow-inner gap-4 sm:gap-0`}
      >
        <div
          className={`flex flex-col items-center ${
            property.priceType === 'per_m2' && property.features?.area && property.features.area > 0
              ? 'sm:items-start'
              : 'sm:items-center'
          }`}
        >
          <span className="text-xs sm:text-sm text-blue-200/80 uppercase tracking-[0.1em] font-bold mb-1">Prix</span>
          <span className="text-2xl sm:text-3xl lg:text-4xl font-bold whitespace-nowrap drop-shadow-md font-serif">
            <Price amount={property.price} priceType={property.priceType} />
            {property.listingType === 'rent' && <span className="ml-1 text-[0.6em] sm:text-[0.55em] font-medium">/ Mois</span>}
          </span>
        </div>
        {property.priceType === 'per_m2' && property.features?.area && property.features.area > 0 && (
          <div className="flex flex-col items-center sm:items-end w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-white/20 pt-4 sm:pt-0 sm:pl-6 animate-fade-in-up">
            <span className="text-xs sm:text-sm text-blue-200/80 uppercase tracking-[0.1em] font-bold mb-1">Total estimé</span>
            <span className="text-xl sm:text-2xl font-bold text-[#C6A75E] drop-shadow-md whitespace-nowrap">
              <Price amount={property.price * property.features.area} />
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
