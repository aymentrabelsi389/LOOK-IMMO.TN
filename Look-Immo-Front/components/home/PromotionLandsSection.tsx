import React from 'react';
import { User } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { propertiesAPI } from '@/services/api';
import PropertyCarousel from './PropertyCarousel';
import { SkeletonPropertyCard } from '../ui/SkeletonCard';
import { LAND_OR_HOTDEAL_MAX_PRICE, PROMOTION_LAND_MIN_AREA } from '@/constants/filterConstants';

const PromotionLandsSection = ({
  onSelectProperty,
  userRole,
  onToggleFavorite,
  user,
}: {
  onSelectProperty: (id: string) => void,
  userRole?: string,
  onToggleFavorite: (propertyId: string) => void,
  user: User | null,
}) => {
  // Fetch promotion land properties directly with server-side filters.
  // This bypasses the paginated global context (page 1, limit 24) so these
  // properties always appear even if they have a high displayOrder.
  const { data: result, isLoading } = useQuery({
    queryKey: ['promotionLands'],
    queryFn: () => propertiesAPI.getAll({
      category: 'land',
      type: 'sale',
      isHotDeal: 'true',
      noLimit: 'true',
      excludeSold: 'true',
    }),
    staleTime: 5 * 60 * 1000,
  });

  const devLands = (result?.data ?? [])
    .filter(p =>
      p.price <= LAND_OR_HOTDEAL_MAX_PRICE &&
      (p.features?.area ?? 0) >= PROMOTION_LAND_MIN_AREA
    )
    .sort((a, b) => {
      const orderA = a.displayOrder || 999999;
      const orderB = b.displayOrder || 999999;
      if (orderA !== orderB) return orderA - orderB;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

  if (!isLoading && devLands.length === 0) return null;

  return (
    <section className="py-16 bg-brand-light relative z-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 relative">
          <span className="inline-block px-4 py-1 rounded-full bg-brand-dark text-brand-teal text-xs font-bold tracking-wider uppercase mb-3">
            Promotion Immobilière
          </span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-brand-dark">
            Terrains Promoteurs
          </h2>
          <p className="text-gray-500 mt-4 max-w-2xl mx-auto text-sm md:text-base">
            Découvrez des terrains à fort potentiel pour vos projets de développement.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <SkeletonPropertyCard />
            <SkeletonPropertyCard />
            <SkeletonPropertyCard />
          </div>
        ) : (
          <PropertyCarousel
            properties={devLands}
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

export default PromotionLandsSection;
