import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Property, User } from '../../types';
import PropertyCarousel from './PropertyCarousel';
import { SkeletonPropertyCard } from '../ui/SkeletonCard';

const FeaturedPropertiesSection = ({
  properties,
  onSelectProperty,
  userRole,
  onToggleFavorite,
  user,
  onViewAll,
  isLoading
}: {
  properties: Property[],
  onSelectProperty: (id: string) => void,
  userRole?: string,
  onToggleFavorite: (propertyId: string) => void,
  user: User | null,
  onViewAll: () => void,
  isLoading?: boolean
}) => {
  const featuredProperties = properties
    .filter(p => p.isFeatured)
    .sort((a, b) => {
      const orderA = a.displayOrder || 999999;
      const orderB = b.displayOrder || 999999;
      if (orderA !== orderB) return orderA - orderB;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

  if (!isLoading && featuredProperties.length === 0) return null;

  return (
    <section className="py-16 bg-brand-light relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-teal/5 rounded-full filter blur-3xl -translate-y-1/2 translate-x-1/2"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12 relative">
          <span className="inline-block px-4 py-1 rounded-full bg-brand-dark text-brand-teal text-xs font-bold tracking-wider uppercase mb-3">Exclusivité</span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-brand-dark">Sélection Exclusive</h2>
          <p className="text-gray-500 mt-4 max-w-2xl mx-auto text-sm md:text-base">Découvrez les meilleures opportunités immobilières sélectionnées pour vous.</p>

          <button
            onClick={onViewAll}
            className="flex absolute right-0 top-0 text-brand-dark font-semibold items-center hover:text-brand-teal transition">
            Voir tout <ChevronRight size={20} />
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <SkeletonPropertyCard />
            <SkeletonPropertyCard />
            <SkeletonPropertyCard />
          </div>
        ) : (
          <PropertyCarousel
            properties={featuredProperties}
            onSelectProperty={onSelectProperty}
            userRole={userRole}
            onToggleFavorite={onToggleFavorite}
            user={user}
          />
        )}
      </div>
    </section>
  );
};

export default FeaturedPropertiesSection;
