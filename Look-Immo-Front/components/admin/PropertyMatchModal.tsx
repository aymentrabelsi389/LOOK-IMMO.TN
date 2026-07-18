
import React from 'react';
import { X, ExternalLink, Copy, MapPin, Building2, Maximize2, BedDouble, Trash2 } from 'lucide-react';
import { Property, ClientDemand } from '@/types';
import Price from '../Price';
import { getImageSrc, getLQIP } from '@/utils/imageUtils';

interface PropertyMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  demand: ClientDemand;
  matches: { property: Property; score: number }[];
  onIgnoreMatch: (propertyId: string) => void;
}

const PropertyMatchModal = ({ isOpen, onClose, demand, matches, onIgnoreMatch }: PropertyMatchModalProps) => {
  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Lien copié dans le presse-papier !');
  };

  return (
    <div className="fixed inset-0 bg-brand-dark/80 z-[100] flex items-center justify-center p-2 md:p-4 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] md:max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-gray-100 bg-gradient-to-br from-brand-dark/5 via-white to-white flex flex-col gap-4 md:gap-6 relative">
          <div className="flex justify-between items-start">
            <div className="pr-10">
              <span className="text-[10px] font-black text-brand-teal uppercase tracking-widest mb-1 block">Opportunités de Match</span>
              <h3 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tight leading-none mb-2">
                Correspondances pour {demand.clientName}
              </h3>
              <p className="text-xs md:text-sm text-gray-500 font-medium italic">
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
            <div>
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Budget Max</span>
              {demand.budget ? (
                <div className="text-sm font-black text-brand-teal flex items-center gap-1.5">
                  <Price amount={demand.budget} />
                </div>
              ) : (
                <span className="text-xs font-bold text-gray-400 italic">Non spécifié</span>
              )}
            </div>
            
            <div>
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Type de Bien</span>
              <span className="text-xs font-black text-gray-900 uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-gray-100 block w-fit">
                {demand.type}
              </span>
            </div>

            <div>
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Secteur Cible</span>
              <div className="text-xs font-bold text-gray-700 truncate flex items-center gap-1">
                <MapPin size={12} className="text-brand-teal" /> {demand.location}
              </div>
            </div>

            <div>
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Correspondances</span>
              <span className="inline-flex items-center px-2 py-0.5 bg-brand-teal text-white text-[9px] font-black rounded uppercase tracking-wider">
                {matches.length} Match{matches.length > 1 ? 'es' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Matches List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {matches.map(({ property, score }) => (
            <div key={property.id} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-brand-teal/20 transition-all duration-300 overflow-hidden flex flex-col md:flex-row isolate">
              {/* Image Thumbnail */}
              <div
                className="w-full md:w-64 h-48 md:h-auto relative overflow-hidden bg-gray-200 flex-shrink-0 rounded-t-2xl md:rounded-t-none md:rounded-l-2xl isolate"
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
                  <div className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg ${
                    score >= 90 ? 'bg-green-500 text-white' : 
                    score >= 70 ? 'bg-orange-500 text-white' : 
                    'bg-gray-500 text-white'
                  }`}>
                    {score}% Compatible
                  </div>
                </div>
              </div>

              {/* Property Details */}
              <div className="flex-1 p-5 md:p-6 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2 gap-4">
                    <h4 className="text-md md:text-lg font-black text-gray-900 group-hover:text-brand-teal transition-colors line-clamp-1 uppercase tracking-tight leading-tight">
                      {property.title}
                    </h4>
                    <div className="text-md md:text-lg font-black text-brand-dark whitespace-nowrap">
                      <Price amount={property.price} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] md:text-xs text-gray-500 font-bold mb-4 uppercase tracking-widest line-clamp-1">
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

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
                    <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <Building2 size={14} className="text-gray-300" />
                      <span className="truncate">{property.type}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <Maximize2 size={14} className="text-gray-300" />
                      <span className="truncate">{property.features.area} m²</span>
                    </div>
                    {property.type === 'land' ? (
                      <>
                        {property.features.vocation && (
                          <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            <span className="text-gray-300">🏗️</span>
                            <span className="truncate">{property.features.vocation.replace(/résidentiel|residentiel/gi, '').trim()}</span>
                          </div>
                        )}
                        {property.features.cos && (
                          <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            <span className="text-gray-300">📊</span>
                            <span className="truncate">COS: {property.features.cos}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      property.features.bedrooms > 0 && (
                        <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          <BedDouble size={14} className="text-gray-300" />
                          <span className="truncate">{property.features.bedrooms} Ch.</span>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 md:gap-3 pt-4 border-t border-gray-50">
                  <button
                    onClick={() => window.open(`/property/${property.id}`, '_blank')}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-900 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-brand-dark transition-all active:scale-95"
                  >
                    <ExternalLink size={14} /> Voir Bien
                  </button>
                  <button
                    onClick={() => copyToClipboard(`${window.location.origin}/property/${property.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 text-gray-600 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all active:scale-95"
                  >
                    <Copy size={14} /> Copier Lien
                  </button>
                  <button
                    onClick={() => onIgnoreMatch(property.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-50 border border-red-100 text-red-600 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-red-600 hover:text-white hover:border-transparent transition-all active:scale-95 shadow-sm"
                  >
                    <Trash2 size={14} /> Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PropertyMatchModal;
