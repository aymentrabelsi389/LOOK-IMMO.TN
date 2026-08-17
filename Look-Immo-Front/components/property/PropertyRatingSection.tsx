import React from 'react';
import { Star } from 'lucide-react';
import { Property, User } from '@/types';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

interface PropertyRatingSectionProps {
  property: Property;
  user: User | null;
  userRating: number;
  setUserRating: (rating: number) => void;
  onRate: (propertyId: string, rating: number) => Promise<Property | undefined>;
  setFullProperty: (property: Property) => void;
  onOpenAuth: () => void;
}

export const PropertyRatingSection: React.FC<PropertyRatingSectionProps> = ({
  property,
  user,
  userRating,
  setUserRating,
  onRate,
  setFullProperty,
  onOpenAuth
}) => {
  return (
    <ScrollReveal>
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <span className="bg-yellow-100 text-yellow-600 p-2 rounded-lg mr-3">
            <Star size={24} fill="currentColor" />
          </span>
          Avis Clients
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Summary Score */}
          <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-2xl border border-gray-100">
            <span className="text-6xl font-black text-gray-900 mb-2">
              {property.averageRating ? property.averageRating.toFixed(1) : '0.0'}
            </span>
            <div className="flex text-yellow-400 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={24}
                  fill={star <= Math.round(property.averageRating || 0) ? 'currentColor' : 'none'}
                />
              ))}
            </div>
            <span className="text-gray-500 font-medium">{property.ratingsCount || 0} avis pour ce bien</span>
          </div>

          {/* Rating Action */}
          <div className="flex flex-col items-center text-center">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Une expérience avec ce bien ?</h3>
            <p className="text-gray-500 mb-6">Partagez votre avis avec notre communauté</p>

            {user ? (
              <div className="flex flex-col items-center animate-fade-in">
                <div className="flex gap-2 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={async () => {
                        setUserRating(star);
                        try {
                          const updated = await onRate(property.id, star);
                          if (updated) {
                            setFullProperty(updated);
                          }
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      aria-label={`Noter ${star} étoiles`}
                      className={`p-1 transition-all transform hover:scale-125 hover:-translate-y-1 ${
                        star <= userRating ? 'text-yellow-400 drop-shadow-sm' : 'text-gray-200 hover:text-yellow-300'
                      }`}
                    >
                      <Star size={42} fill="currentColor" />
                    </button>
                  ))}
                </div>
                <span
                  className={`h-6 text-sm font-bold transition-all duration-300 ${
                    userRating > 0 ? 'text-green-600 opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                  }`}
                >
                  {userRating > 0 ? '✨ Merci pour votre avis !' : ''}
                </span>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Se connecter pour noter
              </button>
            )}
          </div>
        </div>
      </div>
    </ScrollReveal>
  );
};
