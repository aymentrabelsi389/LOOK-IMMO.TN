
import React from 'react';
import { X, ExternalLink, Copy, MapPin, Building2, Maximize2, BedDouble, Trash2 } from 'lucide-react';
import { Property, ClientDemand } from '@/types';
import Price from '../Price';
import { getImageSrc, getLQIP } from '@/utils/imageUtils';
import { createPortal } from 'react-dom';

interface PropertyMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  demand: ClientDemand;
  matches: { property: Property; score: number }[];
  onIgnoreMatch: (propertyId: string) => void;
}

const PropertyMatchModal = ({ isOpen, onClose, demand, matches, onIgnoreMatch }: PropertyMatchModalProps) => {
  if (!isOpen) return null;

  const propertyTypeLabels: Record<string, string> = {
    land: 'Terrain',
    apartment: 'Appartement',
    villa: 'Villa',
    house: 'Maison',
    office: 'Bureau',
    commercial: 'Local commercial',
    studio: 'Studio',
    duplex: 'Duplex',
    farm: 'Ferme',
  };

  const getTypeLabel = (type: string) =>
    propertyTypeLabels[type?.toLowerCase()] ?? type;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Lien copié dans le presse-papier !');
  };

  return createPortal(
    <div className="fixed inset-0 bg-brand-dark/80 z-[100] flex items-center justify-center p-2 md:p-4 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] md:max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="p-3 md:p-8 border-b border-gray-100 bg-gradient-to-br from-brand-dark/5 via-white to-white flex flex-col gap-2 md:gap-6 relative">
          <div className="flex justify-between items-start">
            <div className="pr-10">
              <span className="text-[10px] font-semibold text-brand-teal tracking-wide mb-1 block">Opportunités de match</span>
              <h3 className="text-base md:text-2xl font-bold text-gray-900 tracking-tight leading-none mb-1">
                Correspondances pour {demand.clientName}
              </h3>
              <p className="text-[10px] md:text-sm text-gray-500 font-medium italic line-clamp-1">
                "{demand.description}"
              </p>
            </div>
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 bg-gray-100 text-gray-400 rounded-xl hover:bg-gray-200 hover:text-gray-600 transition-all active:scale-90"
            >
              <X size={20} />
            </button>
          </div>

          {/* Client Demand Context Info Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50/50 p-2 md:p-4 rounded-xl md:rounded-2xl border border-gray-100">
            <div>
              <span className="text-[9px] font-semibold text-gray-400 tracking-wide block mb-1">Budget max</span>
              {demand.budget ? (
                <div className="text-sm font-bold text-brand-teal flex items-center gap-1.5">
                  <Price amount={demand.budget} />
                </div>
              ) : (
                <span className="text-xs font-medium text-gray-400 italic">Non spécifié</span>
              )}
            </div>
            
            <div>
              <span className="text-[9px] font-semibold text-gray-400 tracking-wide block mb-1">Type de bien</span>
              <span className="text-xs font-semibold text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-100 block w-fit capitalize">
                {demand.type}
              </span>
            </div>

            <div>
              <span className="text-[9px] font-semibold text-gray-400 tracking-wide block mb-1">Secteur cible</span>
              <div className="text-xs font-medium text-gray-700 truncate flex items-center gap-1">
                <MapPin size={12} className="text-brand-teal" /> {demand.location}
              </div>
            </div>

            <div>
              <span className="text-[9px] font-semibold text-gray-400 tracking-wide block mb-1">Correspondances</span>
              <span className="inline-flex items-center px-2 py-0.5 bg-brand-teal text-white text-[9px] font-semibold rounded tracking-wide">
                {matches.length} match{matches.length > 1 ? 'es' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Matches List */}
        <div className="flex-1 overflow-y-auto p-3 md:p-8 space-y-4 md:space-y-6">
          {matches.map(({ property, score }) => (
            <div key={property.id} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-brand-teal/20 transition-all duration-300 overflow-hidden flex flex-col md:flex-row isolate">
              {/* Image Thumbnail */}
              <div
                className="w-full md:w-64 h-36 md:h-auto relative overflow-hidden bg-gray-200 flex-shrink-0 rounded-t-2xl md:rounded-t-none md:rounded-l-2xl isolate"
                style={{
                  backgroundImage: property.images && property.images.length > 0 && getLQIP(property.images[0])
                    ? `url(${getLQIP(property.images[0])})`
                    : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <img
                  src={getImageSrc(property.images && property.images.length > 0 ? property.images[0] : '', 'thumb') || '/placeholder-property.jpg'}
                  alt={property.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 rounded-t-2xl md:rounded-t-none md:rounded-l-2xl"
                />
                <div className="absolute top-4 left-4">
                  <div className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold tracking-wide shadow-lg ${
                    score >= 90 ? 'bg-green-500 text-white' : 
                    score >= 70 ? 'bg-orange-500 text-white' : 
                    'bg-gray-500 text-white'
                  }`}>
                    {score}% compatible
                  </div>
                </div>
              </div>

              {/* Property Details */}
              <div className="flex-1 p-3 md:p-6 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2 gap-4">
                    <h4 className="text-md md:text-lg font-bold text-gray-900 group-hover:text-brand-teal transition-colors line-clamp-1 leading-tight">
                      {property.title}
                    </h4>
                    <div className="text-md md:text-lg font-bold text-brand-dark whitespace-nowrap">
                      <Price amount={property.price} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] md:text-xs text-gray-500 font-medium mb-4 line-clamp-1">
                    <MapPin size={14} className="text-brand-teal flex-shrink-0" />
                    {(() => {
                      const city = property.location.city || '';
                      const address = property.location.address || '';
                      if (!city) return address;
                      if (!address) return city;
                      if (address.toLowerCase().includes(city.toLowerCase())) return address;
                      return `${city}, ${address}`;
                    })()}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-4 mb-3 md:mb-6">
                    <div className="flex items-center gap-2 text-[10px] md:text-[11px] font-medium text-gray-500">
                      <Building2 size={14} className="text-gray-300" />
                      <span className="truncate capitalize">{getTypeLabel(property.type)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] md:text-[11px] font-medium text-gray-500">
                      <Maximize2 size={14} className="text-gray-300" />
                      <span className="truncate">{property.features.area} m²</span>
                    </div>
                    {property.type === 'land' ? (
                      <>
                        {property.features.vocation && (
                          <div className="flex items-center gap-2 text-[10px] md:text-[11px] font-medium text-gray-500">
                            <span className="text-gray-300">🏗️</span>
                            <span className="truncate capitalize">{property.features.vocation.replace(/résidentiel|residentiel/gi, '').trim()}</span>
                          </div>
                        )}
                        {property.features.cos && (
                          <div className="flex items-center gap-2 text-[10px] md:text-[11px] font-medium text-gray-500">
                            <span className="text-gray-300">📊</span>
                            <span className="truncate">COS: {property.features.cos}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      (property.features.bedrooms || 0) > 0 && (
                        <div className="flex items-center gap-2 text-[10px] md:text-[11px] font-medium text-gray-500">
                          <BedDouble size={14} className="text-gray-300" />
                          <span className="truncate">{property.features.bedrooms} ch.</span>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 md:gap-3 pt-2 md:pt-4 border-t border-gray-50">
                  <button
                    onClick={() => window.open(`/property/${property.id}`, '_blank')}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-900 text-white text-xs font-semibold tracking-wide rounded-xl hover:bg-brand-dark transition-all active:scale-95"
                  >
                    <ExternalLink size={14} /> Voir le bien
                  </button>
                  <button
                    onClick={() => copyToClipboard(`${window.location.origin}/property/${property.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 text-gray-600 text-xs font-semibold tracking-wide rounded-xl hover:bg-gray-50 transition-all active:scale-95"
                  >
                    <Copy size={14} /> Copier le lien
                  </button>
                  <button
                    onClick={() => onIgnoreMatch(property.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-50 border border-red-100 text-red-600 text-xs font-semibold tracking-wide rounded-xl hover:bg-red-600 hover:text-white hover:border-transparent transition-all active:scale-95 shadow-sm"
                  >
                    <Trash2 size={14} /> Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PropertyMatchModal;
