import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Property } from '@/types';
import { PropertyGallery } from '@/features/properties/components/PropertyGallery';
import { propertiesAPI } from '@/services/api';
import { useSEO } from '@/hooks/useSEO';
import { useBreadcrumbSchema } from '@/hooks/useBreadcrumbSchema';
import { useUI } from '@/context/UIContext';
import { useAuthStore } from '@/stores/useAuthStore';
import { useData } from '@/context/DataContext';
import { formatPropertyType } from '@/features/properties/utils/propertyUtils';
import { trackViewContent } from '@/utils/metaPixel';
import { useTranslation } from '@/hooks/useTranslation';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';
import Breadcrumb from '@/components/ui/Breadcrumb';

// Modular Subcomponents
import { PropertyHeader } from '@/features/properties/components/PropertyHeader';
import { PropertyFeaturesGrid } from '@/features/properties/components/PropertyFeaturesGrid';
import { PropertyRatingSection } from '@/features/ratings/components/PropertyRatingSection';
import { PropertyLocationMap } from '@/features/properties/components/PropertyLocationMap';
import { PropertyBookingForm } from '@/features/appointments/components/PropertyBookingForm';
import { PropertySimilarListings } from '@/features/properties/components/PropertySimilarListings';
import { PropertyLightbox } from '@/features/properties/components/PropertyLightbox';

const AdminEditPropertyModal = lazy(() => import('@/features/properties/admin/AdminEditPropertyModal'));

const PropertyDetailsPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { selectedPropertyId: contextPropertyId, handleNavigate, setAuthModalReason, setShowAuthModal } = useUI();
  const propertyId = id || contextPropertyId;

  const {
    properties,
    handleNewAppointment: onBookAppointment,
    handleNewMessage: onSendMessage,
    handleRateProperty: onRate,
    handleSelectProperty: onSelectProperty
  } = useData();

  const { user, handleToggleFavorite } = useAuthStore();
  const onToggleFavorite = (propId: string) => handleToggleFavorite(propId, onOpenAuth);

  const onBack = () => handleNavigate('listings');
  const onOpenAuth = () => {
    setAuthModalReason('appointment');
    setShowAuthModal(true);
  };

  const baseProperty = properties.find((p) => p.id === propertyId);
  const [fullProperty, setFullProperty] = useState<Property | null>(null);
  const property = fullProperty || baseProperty;

  const { displayText: displayTitle } = useAutoTranslate(property?.title);

  const [userRating, setUserRating] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Fetch full property (e.g. for complete ratings list)
  useEffect(() => {
    if (propertyId) {
      propertiesAPI.getById(propertyId).then(setFullProperty).catch(console.error);
    }
  }, [propertyId]);

  // Track Meta Pixel ViewContent event
  useEffect(() => {
    if (property) {
      trackViewContent({
        id: property.id,
        title: property.title,
        price: property.price,
        type: property.type,
        listingType: property.listingType,
        city: property.location?.city
      });
    }
  }, [property?.id]);

  useEffect(() => {
    if (property && user) {
      const existing = property.ratings?.find((r) => r.userId === user.id || r.userId === user.name);
      if (existing) setUserRating(existing.value);
    }
  }, [property, user]);

  useSEO({
    title: property
      ? `${displayTitle || property.title} - ${formatPropertyType(property.type, undefined, t)} à ${property.listingType === 'sale' ? (t('forSale') || 'Vente') : (t('forRent') || 'Location')} à ${property.location.city}`
      : t('propertyNotFound'),
    description: property
      ? `${formatPropertyType(property.type, undefined, t)} à ${property.listingType === 'sale' ? (t('tabBuy') || 'vendre') : (t('tabRent') || 'louer')} située à ${property.location.city}, ${property.location.address}. ${property.features.bedrooms ? `${property.features.bedrooms} chambres, ` : ''}${property.features.bathrooms ? `${property.features.bathrooms} SDB, ` : ''}${property.features.area}m². Découvrez les photos et détails de cette propriété d'exception.`
      : "Découvrez les détails de cette propriété d'exception sur Look Immo."
  });

  // JSON-LD Structured Data for Google Rich Results
  const jsonLd = useMemo(() => {
    if (!property) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'RealEstateListing',
      name: displayTitle || property.title,
      description: property.description || `${formatPropertyType(property.type, undefined, t)} à ${property.location.city}`,
      url: window.location.href,
      image: property.images,
      datePosted: property.createdAt ? new Date(property.createdAt).toISOString() : undefined,
      offers: {
        '@type': 'Offer',
        price: property.price,
        priceCurrency: 'TND',
        availability: property.status === 'available' ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut'
      },
      address: {
        '@type': 'PostalAddress',
        addressLocality: property.location.city,
        streetAddress: property.location.address,
        addressCountry: 'TN'
      },
      numberOfRooms: property.features.bedrooms || undefined,
      floorSize: property.features.area
        ? { '@type': 'QuantitativeValue', value: property.features.area, unitCode: 'MTK' }
        : undefined,
      aggregateRating:
        property.averageRating && property.ratingsCount && property.ratingsCount > 0
          ? {
              '@type': 'AggregateRating',
              ratingValue: property.averageRating,
              reviewCount: property.ratingsCount,
              bestRating: 5,
              worstRating: 1
            }
          : undefined
    };
  }, [property, t, displayTitle]);

  const breadcrumbItems = useMemo(
    () => [{ label: t('navHome'), href: '/' }, { label: t('propertiesTitle'), href: '/listings' }, { label: displayTitle || property?.title || t('propertyFallback') }],
    [displayTitle, property?.title, t]
  );

  const breadcrumbSchemaItems = useMemo(
    () => [
      { name: t('navHome'), item: `${window.location.origin}/` },
      { name: t('propertiesTitle'), item: `${window.location.origin}/listings` },
      { name: displayTitle || property?.title || t('propertyFallback') }
    ],
    [displayTitle, property?.title, t]
  );

  useBreadcrumbSchema(breadcrumbSchemaItems);

  if (!property) return <div className="p-8 text-center text-gray-500 font-medium">{t('propertyNotFound')}</div>;

  const similarProperties = properties
    .filter((p) => p.id !== property.id && p.listingType === property.listingType && p.type === property.type)
    .slice(0, 3);

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
      )}

      <div className="bg-gray-50 min-h-screen animate-fade-in">
        {/* Breadcrumb Header */}
        <div className="bg-white shadow-sm border-b z-[60] px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <button
              onClick={onBack}
              aria-label={t('backToProperties')}
              className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 text-brand-grey hover:text-brand-teal hover:border-brand-teal transition-colors duration-150"
            >
              <ChevronRight className="rotate-180" size={16} />
            </button>
            <span className="h-4 w-px bg-gray-200 flex-shrink-0" aria-hidden="true" />
            <Breadcrumb items={breadcrumbItems} className="min-w-0 flex-1" />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 pt-3 pb-8 md:pt-6 md:pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content - Left Side */}
            <div className="lg:col-span-2 space-y-6">
              {/* Image Gallery */}
              <div className="opacity-0 animate-fade-in-up">
                <PropertyGallery
                  images={property.images}
                  title={property.title}
                  listingType={property.listingType}
                  onOpenLightbox={(idx) => {
                    setCurrentImageIndex(idx);
                    setShowLightbox(true);
                  }}
                  currentImageIndex={currentImageIndex}
                  setCurrentImageIndex={setCurrentImageIndex}
                  propertyAltContext={{
                    title: property.title,
                    type: property.type,
                    listingType: property.listingType,
                    city: property.location.city,
                    bedrooms: property.features.bedrooms,
                    area: property.features.area,
                    pool: property.features.pool,
                    parking: property.features.parking
                  }}
                />
              </div>

              {/* Property Header + Price */}
              <div className="opacity-0 animate-fade-in-up delay-100">
                <PropertyHeader
                  property={property}
                  user={user}
                  onToggleFavorite={onToggleFavorite}
                  onOpenAuth={onOpenAuth}
                  onEditProperty={() => setShowEditModal(true)}
                />
              </div>

              {/* Specs & Description */}
              <PropertyFeaturesGrid property={property} />

              {/* Ratings */}
              <PropertyRatingSection
                property={property}
                user={user}
                userRating={userRating}
                setUserRating={setUserRating}
                onRate={onRate}
                setFullProperty={setFullProperty}
                onOpenAuth={onOpenAuth}
              />

              {/* Map Section */}
              <PropertyLocationMap
                lat={property.location.lat}
                lng={property.location.lng}
                city={property.location.city}
              />
            </div>

            {/* Right Sidebar */}
            <div className="lg:col-span-1 space-y-6 opacity-0 animate-fade-in-up delay-150">
              <PropertyBookingForm
                property={property}
                user={user}
                onOpenAuth={onOpenAuth}
                onSendMessage={onSendMessage}
                onBookAppointment={onBookAppointment}
              />

              <PropertySimilarListings
                similarProperties={similarProperties}
                onSelectProperty={onSelectProperty}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      <PropertyLightbox
        property={property}
        isOpen={showLightbox}
        onClose={() => setShowLightbox(false)}
        currentImageIndex={currentImageIndex}
        setCurrentImageIndex={setCurrentImageIndex}
      />

      {/* Inline Admin Edit Property Modal */}
      {user?.role === 'admin' && property && showEditModal && (
        <Suspense fallback={null}>
          <AdminEditPropertyModal
            property={property}
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            onPropertyUpdated={(updated) => setFullProperty(updated)}
          />
        </Suspense>
      )}
    </>
  );
};

export default PropertyDetailsPage;
