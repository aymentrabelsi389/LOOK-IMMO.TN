import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin, Star, Share2, Heart, Square, BedDouble, Bath, Home as HomeIcon,
  Flame, Wind, Waves, Trees, Car as CarIcon, Shield, Check, X,
  ChevronRight, ChevronLeft, MessageSquare, Calendar, User as UserIcon, Send
} from 'lucide-react';
import '@/utils/leafletSetup';
import { MapContainer, TileLayer, Circle, useMap } from 'react-leaflet';
import { Property } from '@/types';
import { PropertyGallery } from '@/components/PropertyGallery';
import Price from '@/components/Price';
import { CustomDatePicker, CustomTimePicker } from '@/components/ui/DateTimePicker';
import { propertiesAPI } from '@/services/api';
import { useParams } from 'react-router-dom';
import { useSEO } from '@/hooks/useSEO';
import { useUI } from '@/context/UIContext';
import { useAuthStore } from '@/stores/useAuthStore';
import { useData } from '@/context/DataContext';
import { getImageSrc, buildSrcSet, buildPropertyImageAlt } from '@/utils/imageUtils';

const PropertyDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const { selectedPropertyId: contextPropertyId, handleNavigate, setAuthModalReason, setShowAuthModal } = useUI();
  const propertyId = id || contextPropertyId;
  const { properties, handleNewAppointment: onBookAppointment, handleNewMessage: onSendMessage, handleRateProperty: onRate, handleSelectProperty: onSelectProperty } = useData();
  const { user, handleToggleFavorite } = useAuthStore();
  const onToggleFavorite = (propertyId: string) =>
    handleToggleFavorite(propertyId, onOpenAuth);

  const onBack = () => handleNavigate('listings');
  const onOpenAuth = () => {
    setAuthModalReason('appointment');
    setShowAuthModal(true);
  };

  const baseProperty = properties.find(p => p.id === propertyId);
  const [fullProperty, setFullProperty] = useState<Property | null>(null);
  const property = fullProperty || baseProperty;

  const formatPropertyType = (type: string): string => {
    const types: Record<string, string> = {
      apartment: 'Appartement',
      villa: 'Villa',
      depot: 'Dépôt',
      commercial: 'Bureau / Local',
      land: 'Terrain',
      studio: 'Studio',
      duplex: 'Duplex',
      triplex: 'Triplex',
      penthouse: 'Penthouse',
      commerce: 'Commerce'
    };
    return types[type] || 'Bien';
  };

  useSEO({
    title: property ? `${property.title} - ${formatPropertyType(property.type)} à ${property.listingType === 'sale' ? 'Vente' : 'Location'} à ${property.location.city}` : "Détails de la propriété",
    description: property
      ? `${formatPropertyType(property.type)} à ${property.listingType === 'sale' ? 'vendre' : 'louer'} située à ${property.location.city}, ${property.location.address}. ${property.features.bedrooms ? `${property.features.bedrooms} chambres, ` : ''}${property.features.bathrooms ? `${property.features.bathrooms} SDB, ` : ''}${property.features.area}m². Découvrez les photos et détails de cette propriété d'exception.`
      : "Découvrez les détails de cette propriété d'exception sur Look Immo."
  });

  // JSON-LD Structured Data for Google Rich Results
  const jsonLd = property ? {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: property.title,
    description: property.description || `${formatPropertyType(property.type)} à ${property.location.city}`,
    url: window.location.href,
    image: property.images,
    datePosted: property.createdAt,
    offers: {
      '@type': 'Offer',
      price: property.price,
      priceCurrency: 'TND',
      availability: property.status === 'available'
        ? 'https://schema.org/InStock'
        : 'https://schema.org/SoldOut',
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: property.location.city,
      streetAddress: property.location.address,
      addressCountry: 'TN',
    },
    numberOfRooms: property.features.bedrooms || undefined,
    floorSize: property.features.area
      ? { '@type': 'QuantitativeValue', value: property.features.area, unitCode: 'MTK' }
      : undefined,
    aggregateRating: (property.averageRating && property.ratingsCount && property.ratingsCount > 0) ? {
      '@type': 'AggregateRating',
      ratingValue: property.averageRating,
      reviewCount: property.ratingsCount,
      bestRating: 5,
      worstRating: 1,
    } : undefined,
  } : null;

  const [userRating, setUserRating] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [contactForm, setContactForm] = useState({ message: '' });
  const [appointmentForm, setAppointmentForm] = useState({ date: '', time: '', message: '' });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [appointmentSubmitted, setAppointmentSubmitted] = useState(false);
  const [contactTab, setContactTab] = useState<'message' | 'appointment'>('message');

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLightbox, setShowLightbox] = useState(false);
  const [pointerStartX, setPointerStartX] = useState<number | null>(null);

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

  // Fetch full property to get all ratings
  useEffect(() => {
    if (propertyId) {
      propertiesAPI.getById(propertyId).then(setFullProperty).catch(console.error);
    }
  }, [propertyId]);

  // Auto-scroll thumbnails when image index changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      const thumbnails = scrollContainerRef.current.children;
      if (thumbnails[currentImageIndex]) {
        thumbnails[currentImageIndex].scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }, [currentImageIndex]);

  // Map Updater Component
  const MapUpdater = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
      map.setView(center, 13);
    }, [center, map]);

    useEffect(() => {
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 200);
      return () => clearTimeout(timer);
    }, [map]);

    return null;
  };


  useEffect(() => {
    if (property && user) {
      // Backend returns ratings with userName mapped to userId (schema missing userId)
      // So we check match by ID (local session) OR Name (backend data)
      const existing = property.ratings?.find(r => r.userId === user.id || r.userId === user.name);
      if (existing) setUserRating(existing.value);
    }
  }, [property, user]);

  if (!property) return <div className="p-8 text-center">Property not found</div>;

  // Find similar properties (same property type and listing type)
  const similarProperties = properties
    .filter(p =>
      p.id !== property.id &&
      p.listingType === property.listingType &&
      p.type === property.type
    )
    .slice(0, 3);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      onOpenAuth();
      return;
    }

    try {
      // Send message via callback to save to admin dashboard
      await onSendMessage({
        fullName: user.name,
        email: user.email,
        phone: user.phone || '',
        subject: `À propos de: ${property.title}`,
        message: contactForm.message
      });

      setFormSubmitted(true);
      setTimeout(() => setFormSubmitted(false), 3000);
      setContactForm({ message: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAppointmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check if user is logged in
    if (!user) {
      onOpenAuth();
      return;
    }

    // Call appointment booking function
    onBookAppointment({
      propertyId: property.id,
      propertyTitle: property.title,
      date: appointmentForm.date,
      time: appointmentForm.time,
      message: appointmentForm.message
    });

    setAppointmentSubmitted(true);
    setTimeout(() => setAppointmentSubmitted(false), 3000);

    // Reset form
    setAppointmentForm({ date: '', time: '', message: '' });
  };

  return (
    <>
      {/* JSON-LD Structured Data for SEO */}
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <div className="bg-gray-50 min-h-screen">
        {/* Back Button Header */}
        <div className="bg-white shadow-sm border-b z-[60] px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center">
            <button onClick={onBack} className="flex items-center text-gray-600 hover:text-brand-dark transition mr-4">
              <ChevronRight className="rotate-180 mr-1" size={20} /> Retour
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 pt-3 pb-8 md:pt-6 md:pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content - Left Side */}
            <div className="lg:col-span-2 space-y-6">
              {/* Image Gallery with Slider */}
              <PropertyGallery
                images={property.images}
                title={property.title}
                listingType={property.listingType}
                onOpenLightbox={(idx) => { setCurrentImageIndex(idx); setShowLightbox(true); }}
                currentImageIndex={currentImageIndex}
                setCurrentImageIndex={setCurrentImageIndex}
                propertyAltContext={{
                  title:       property.title,
                  type:        property.type,
                  listingType: property.listingType,
                  city:        property.location.city,
                  bedrooms:    property.features.bedrooms,
                  area:        property.features.area,
                  pool:        property.features.pool,
                  parking:     property.features.parking,
                }}
              />

              {/* Property Header */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
                  <div className="flex-1 w-full overflow-hidden">
                    <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 truncate" title={property.title}>{property.title}</h1>
                    <div className="flex items-center text-gray-600 mb-3">
                      <MapPin size={20} className="mr-2 text-brand-teal flex-shrink-0" />
                      <span className="text-sm sm:text-lg truncate">{property.location.city}</span>
                    </div>
                    <div className="flex justify-between items-center w-full sm:block">
                      {/* Rating */}
                      <div className="flex items-center">
                        <div className="flex text-yellow-400 mr-2 flex-shrink-0">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={14} className="sm:w-[18px] sm:h-[18px]" fill={i < Math.round(property.averageRating || 0) ? "currentColor" : "none"} />
                          ))}
                        </div>
                        <span className="font-bold text-gray-900 text-xs sm:text-base">{property.averageRating ? property.averageRating.toFixed(1) : 'N/A'}</span>
                        <span className="text-gray-500 ml-1 text-[10px] sm:text-sm shadow-sm whitespace-nowrap">({property.ratingsCount || 0} avis)</span>
                      </div>

                      {/* Share & Favorite (Mobile) */}
                      <div className="flex gap-2 sm:hidden flex-shrink-0">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            alert('Lien copié dans le presse-papier !');
                          }}
                          className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition"
                          title="Partager"
                        >
                          <Share2 size={18} className="text-gray-700" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!user) {
                              onOpenAuth();
                              return;
                            }
                            onToggleFavorite(property.id);
                          }}
                          className={`p-2 rounded-full transition ${user?.favorites.includes(property.id) ? 'bg-red-50 hover:bg-red-100' : 'bg-gray-100 hover:bg-gray-200'}`}
                        >
                          <Heart size={18} className={`${user?.favorites.includes(property.id) ? "text-red-500" : "text-gray-400"}`} fill={user?.favorites.includes(property.id) ? "currentColor" : "none"} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Share & Favorite (Desktop) */}
                  <div className="hidden sm:flex gap-2 sm:ml-4 flex-shrink-0">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        alert('Lien copié dans le presse-papier !');
                      }}
                      className="p-3 bg-gray-100 hover:bg-gray-200 rounded-full transition flex-shrink-0"
                      title="Partager"
                    >
                      <Share2 size={20} className="text-gray-700" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!user) {
                          onOpenAuth();
                          return;
                        }
                        onToggleFavorite(property.id);
                      }}
                      className={`p-3 rounded-full transition flex-shrink-0 ${user?.favorites.includes(property.id) ? 'bg-red-50 hover:bg-red-100' : 'bg-gray-100 hover:bg-gray-200'}`}
                      title={user?.favorites.includes(property.id) ? "Retirer des favoris" : "Ajouter aux favoris"}
                    >
                      <Heart size={20} className={`${user?.favorites.includes(property.id) ? "text-red-500" : "text-gray-400"}`} fill={user?.favorites.includes(property.id) ? "currentColor" : "none"} />
                    </button>
                  </div>
                </div>

                {/* Price */}
                <div className={`bg-gradient-to-r from-brand-dark to-blue-900 text-white p-4 sm:p-6 rounded-xl flex flex-col sm:flex-row items-center ${property.priceType === 'per_m2' && property.features.area > 0 ? 'justify-between' : 'justify-center'} shadow-inner gap-4 sm:gap-0`}>
                  <div className={`flex flex-col items-center ${property.priceType === 'per_m2' && property.features.area > 0 ? 'sm:items-start' : 'sm:items-center'}`}>
                    <span className="text-xs sm:text-sm text-blue-200/80 uppercase tracking-[0.1em] font-bold mb-1">Prix</span>
                    <span className="text-2xl sm:text-3xl lg:text-4xl font-bold whitespace-nowrap drop-shadow-md font-serif">
                      <Price amount={property.price} priceType={property.priceType} />
                      {property.listingType === 'rent' && <span className="ml-1 text-[0.6em] sm:text-[0.55em] font-medium">/ Mois</span>}
                    </span>
                  </div>
                  {property.priceType === 'per_m2' && property.features.area > 0 && (
                    <div className="flex flex-col items-center sm:items-end w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-white/20 pt-4 sm:pt-0 sm:pl-6 animate-fade-in-up">
                      <span className="text-xs sm:text-sm text-blue-200/80 uppercase tracking-[0.1em] font-bold mb-1">Total estimé</span>
                      <span className="text-xl sm:text-2xl font-bold text-[#C6A75E] drop-shadow-md whitespace-nowrap">
                        <Price amount={property.price * property.features.area} />
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Property Specs */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 font-serif">Caractéristiques Principales</h2>
                {property.type === 'land' ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center p-4 bg-gray-50 rounded-xl">
                      <Square className="mx-auto text-brand-teal mb-2" size={32} />
                      <p className="text-2xl font-bold text-gray-900">{property.features.area}</p>
                      <p className="text-sm text-gray-600">m² Surface</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-xl">
                      <div className="text-4xl mx-auto mb-2">🏗️</div>
                      <p className="text-2xl font-bold text-gray-900">
                        {property.features.vocation
                          ? property.features.vocation.replace(/résidentiel|residentiel/gi, '').trim()
                          : 'N/A'}
                      </p>
                      <p className="text-sm text-gray-600">Vocation</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-xl">
                      <div className="text-4xl mx-auto mb-2">📊</div>
                      <p className="text-2xl font-bold text-gray-900">{property.features.cos || 'N/A'}</p>
                      <p className="text-sm text-gray-600">COS</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-xl">
                      <HomeIcon className="mx-auto text-brand-teal mb-2" size={32} />
                      <p className="text-2xl font-bold text-gray-900 capitalize">{property.type === 'land' ? 'Terrain' : property.type === 'depot' ? 'Dépôt' : property.type}</p>
                      <p className="text-sm text-gray-600">Type</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center p-4 bg-gray-50 rounded-xl">
                      <Square className="mx-auto text-brand-teal mb-2" size={32} />
                      <p className="text-2xl font-bold text-gray-900">{property.features.area}</p>
                      <p className="text-sm text-gray-600">m² Surface</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-xl">
                      <BedDouble className="mx-auto text-brand-teal mb-2" size={32} />
                      <p className="text-2xl font-bold text-gray-900">{property.features.bedrooms}</p>
                      <p className="text-sm text-gray-600">Chambres</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-xl">
                      <Bath className="mx-auto text-brand-teal mb-2" size={32} />
                      <p className="text-2xl font-bold text-gray-900">{property.features.bathrooms}</p>
                      <p className="text-sm text-gray-600">Salles de bain</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-xl">
                      <HomeIcon className="mx-auto text-brand-teal mb-2" size={32} />
                      <p className="text-2xl font-bold text-gray-900 capitalize">{property.type === 'depot' ? 'Dépôt' : property.type}</p>
                      <p className="text-sm text-gray-600">Type</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Caractéristiques */}
              {property.type !== 'land' && (
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Caractéristiques</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { icon: <Flame size={20} />, label: 'Chauffage Central', available: property.features.heating },
                      { icon: <Wind size={20} />, label: 'Climatisation Central', available: property.features.airConditioning },
                      { icon: <Waves size={20} />, label: 'Piscine', available: property.features.pool },
                      { icon: <Trees size={20} />, label: 'Jardin', available: property.features.garden },
                      { icon: <CarIcon size={20} />, label: 'Parking', available: property.features.parking },
                      { icon: <Shield size={20} />, label: 'Sécurité 24/7', available: property.features.security }
                    ].map((feature, idx) => (
                      <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg ${feature.available ? 'bg-green-50' : 'bg-gray-50'}`}>
                        <div className={`${feature.available ? 'text-green-600' : 'text-gray-400'}`}>{feature.icon}</div>
                        <span className={`font-medium ${feature.available ? 'text-gray-900' : 'text-gray-400'}`}>{feature.label}</span>
                        {feature.available ? (
                          <Check size={16} className="ml-auto text-green-600" />
                        ) : (
                          <X size={16} className="ml-auto text-gray-400" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Description</h2>
                <p className="text-gray-700 leading-relaxed text-lg whitespace-pre-wrap">{property.description}</p>
              </div>

              {/* Avis Clients - New Section */}
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
                        <Star key={star} size={24} fill={star <= Math.round(property.averageRating || 0) ? "currentColor" : "none"} />
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
                                const updated = await onRate(property.id, star);
                                if (updated) {
                                  setFullProperty(updated);
                                }
                              }}
                              aria-label={`Noter ${star} étoiles`}
                              className={`p-1 transition-all transform hover:scale-125 hover:-translate-y-1 ${star <= userRating ? 'text-yellow-400 drop-shadow-sm' : 'text-gray-200 hover:text-yellow-300'
                                }`}
                            >
                              <Star size={42} fill="currentColor" />
                            </button>
                          ))}
                        </div>
                        <span className={`h-6 text-sm font-bold transition-all duration-300 ${userRating > 0 ? 'text-green-600 opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                          {userRating > 0 ? "✨ Merci pour votre avis !" : ""}
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

              {/* Map Section */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Localisation du Bien</h2>
                <div className="rounded-xl overflow-hidden h-[300px] md:h-96 border border-gray-200 relative z-0">
                  <MapContainer
                    center={[property.location.lat, property.location.lng]}
                    zoom={13}
                    style={{ height: '100%', width: '100%', zIndex: 0 }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Circle
                      center={[property.location.lat, property.location.lng]}
                      radius={500}
                      pathOptions={{
                        color: '#1D4ED8',
                        fillColor: '#3B82F6',
                        fillOpacity: 0.25,
                        weight: 2
                      }}
                    />
                    <MapUpdater center={[property.location.lat, property.location.lng]} />
                  </MapContainer>
                </div>
              </div>
            </div>

            {/* Right Sidebar - Contact & Appointment */}
            <div className="lg:col-span-1 space-y-6">
              {/* Contact Panel */}
              <div className="bg-white rounded-2xl shadow-lg sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
                {/* Tabs Header */}
                <div className="flex border-b border-gray-100">
                  <button
                    onClick={() => setContactTab('message')}
                    className={`flex-1 py-4 px-4 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${contactTab === 'message'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    <MessageSquare size={18} />
                    Envoyer un Message
                  </button>
                  <button
                    onClick={() => setContactTab('appointment')}
                    className={`flex-1 py-4 px-4 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${contactTab === 'appointment'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    <Calendar size={18} />
                    Prendre Rendez-vous
                  </button>
                </div>

                <div className="p-6">
                  {/* If user is NOT logged in */}
                  {!user ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <UserIcon size={32} className="text-blue-600" />
                      </div>
                      <h4 className="text-lg font-bold text-gray-900 mb-2">Connexion requise</h4>
                      <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                        Veuillez vous connecter pour envoyer un message ou prendre un rendez-vous.
                      </p>
                      <button
                        onClick={onOpenAuth}
                        className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition shadow-md flex items-center justify-center gap-2"
                      >
                        <UserIcon size={18} />
                        Se connecter
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Tab Content: Message */}
                      {contactTab === 'message' && (
                        <form onSubmit={handleContactSubmit} className="space-y-4">
                          <div className="bg-gray-50 rounded-xl p-3 mb-4">
                            <p className="text-xs text-gray-500 mb-1">Connecté en tant que</p>
                            <p className="font-semibold text-gray-900">{user.name}</p>
                            <p className="text-sm text-gray-600">{user.email}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Votre message</label>
                            <textarea
                              value={contactForm.message}
                              onChange={(e) => setContactForm({ message: e.target.value })}
                              required
                              minLength={10}
                              rows={5}
                              placeholder="Écrivez votre message (minimum 10 caractères)…"
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 resize-none text-gray-900"
                            />
                          </div>
                          <button
                            type="submit"
                            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition shadow-md flex items-center justify-center gap-2"
                          >
                            <Send size={18} />
                            Envoyer le message
                          </button>
                          {formSubmitted && (
                            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                              <Check size={16} />
                              Message envoyé avec succès!
                            </div>
                          )}
                        </form>
                      )}

                      {/* Tab Content: Appointment */}
                      {contactTab === 'appointment' && (
                        <form onSubmit={handleAppointmentSubmit} className="space-y-4">
                          <div className="bg-gray-50 rounded-xl p-3 mb-4">
                            <p className="text-xs text-gray-500 mb-1">Connecté en tant que</p>
                            <p className="font-semibold text-gray-900">{user.name}</p>
                            <p className="text-sm text-gray-600">{user.email}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Choisir une date</label>
                            <CustomDatePicker
                              value={appointmentForm.date}
                              onChange={(date) => setAppointmentForm({ ...appointmentForm, date })}
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Choisir une heure</label>
                            <CustomTimePicker
                              value={appointmentForm.time}
                              onChange={(time) => setAppointmentForm({ ...appointmentForm, time })}
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Message (optionnel)</label>
                            <textarea
                              value={appointmentForm.message}
                              onChange={(e) => setAppointmentForm({ ...appointmentForm, message: e.target.value })}
                              rows={3}
                              placeholder="Précisez vos préférences ou questions..."
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 resize-none text-gray-900"
                            />
                          </div>
                          <button
                            type="submit"
                            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition shadow-md flex items-center justify-center gap-2"
                          >
                            <Calendar size={18} />
                            Réserver maintenant
                          </button>
                          {appointmentSubmitted && (
                            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                              <Check size={16} />
                              Rendez-vous demandé avec succès!
                            </div>
                          )}
                        </form>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Similar Properties (Right Sidebar) */}
              {similarProperties.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-sm mt-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Propriétés Similaires</h2>
                  <div className="flex flex-col gap-6">
                    {similarProperties.slice(0, 3).map(prop => (
                      <div
                        key={prop.id}
                        className="relative group"
                        onClick={() => onSelectProperty(prop.id)}
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
                                  {prop.type === 'land' ? 'Terrain' :
                                    prop.type === 'villa' ? 'Villa' :
                                      prop.type === 'apartment' ? 'Appartement' :
                                        prop.type === 'depot' ? 'Dépôt' :
                                          prop.type === 'studio' ? 'Studio' :
                                            prop.type === 'duplex' ? 'Duplex' :
                                              prop.type === 'triplex' ? 'Triplex' :
                                                prop.type === 'penthouse' ? 'Penthouse' : 'Propriété'}
                                </span>
                                <span className="text-sm font-bold uppercase tracking-[0.1em] text-brand-dark border-t border-brand-dark/10 pt-1 mt-1">
                                  {prop.listingType === 'sale' ? 'À Vendre' : 'À Louer'}
                                </span>
                              </div>
                            </div>

                            {/* Decorative Chevrons */}
                            <div className="absolute top-4 left-4 flex flex-col gap-0.5 opacity-40">
                              {[1, 2, 3].map(i => <ChevronRight key={i} className="-rotate-90 text-white" size={10} strokeWidth={3} />)}
                            </div>
                            <div className="absolute bottom-4 right-4 flex flex-col gap-0.5 opacity-40 rotate-180">
                              {[1, 2, 3].map(i => <ChevronRight key={i} className="-rotate-90 text-white" size={10} strokeWidth={3} />)}
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

                                {prop.features.area > 0 && (
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
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      {showLightbox && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 md:p-12 animate-fade-in" onClick={() => setShowLightbox(false)}>
          {/* Header Content */}
          <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/60 to-transparent">
            <div className="flex flex-col text-left">
              <span className="text-white font-bold text-lg tracking-tight">Vue Plein Écran</span>
              <span className="text-white/60 text-xs font-medium uppercase tracking-widest">{currentImageIndex + 1} SUR {property.images.length}</span>
            </div>
            <button
              onClick={() => setShowLightbox(false)}
              className="p-3 text-white bg-white/10 hover:bg-white/20 rounded-full transition-all duration-300 transform hover:rotate-90 group"
            >
              <X size={32} />
            </button>
          </div>

          {/* Main Image Stage with Pointer-based Swipe Gestures */}
          <div
            className="relative w-full h-full flex items-center justify-center select-none touch-pan-y"
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
                  title:       property.title,
                  type:        property.type,
                  listingType: property.listingType,
                  city:        property.location.city,
                  bedrooms:    property.features.bedrooms,
                  area:        property.features.area,
                  pool:        property.features.pool,
                  parking:     property.features.parking,
                },
                currentImageIndex,
                property.images.length
              )}
              className="max-w-full max-h-full object-contain shadow-2xl animate-zoom-in rounded-sm pointer-events-none"
            />

            {/* Large Navigation Arrows */}
            {property.images.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentImageIndex((currentImageIndex - 1 + property.images.length) % property.images.length)}
                  className="absolute left-0 md:left-4 top-1/2 -translate-y-1/2 p-4 text-white/50 hover:text-white bg-white/0 hover:bg-white/10 rounded-full transition-all transform hover:scale-110 active:scale-95"
                >
                  <ChevronLeft size={48} />
                </button>
                <button
                  onClick={() => setCurrentImageIndex((currentImageIndex + 1) % property.images.length)}
                  className="absolute right-0 md:right-4 top-1/2 -translate-y-1/2 p-4 text-white/50 hover:text-white bg-white/0 hover:bg-white/10 rounded-full transition-all transform hover:scale-110 active:scale-95"
                >
                  <ChevronRight size={48} />
                </button>
              </>
            )}
          </div>

          {/* Caption Overlay */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white/90 text-sm font-medium text-center whitespace-nowrap">
            {property.title}
          </div>
        </div>
      )}
    </>
  );
};

export default PropertyDetailsPage;
