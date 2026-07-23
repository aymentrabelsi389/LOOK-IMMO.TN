import React from 'react';
import { Property, User } from '@/types';
import InfiniteCarousel from './InfiniteCarousel';
import PropertyCard from '../PropertyCard';

// --- Updated Property Carousel Component ---
const PropertyCarousel = ({
  properties,
  onSelectProperty,
  userRole,
  onToggleFavorite,
  user,
  CardWrapper = ({ children }: { children: React.ReactNode }) => <>{children}</>
}: {
  properties: Property[],
  onSelectProperty: (id: string) => void,
  userRole?: string,
  onToggleFavorite: (id: string) => void,
  user: User | null,
  CardWrapper?: React.ComponentType<{ children: React.ReactNode }>
}) => {
  return (
    <InfiniteCarousel
      items={properties}
      CardWrapper={CardWrapper}
      renderItem={(property) => (
        <PropertyCard
          property={property}
          onSelect={onSelectProperty}
          isFavorite={user?.favorites.includes(property.id) || false}
          userRole={userRole}
          onToggleFavorite={onToggleFavorite}
        />
      )}
    />
  );
};

export default PropertyCarousel;
