import React from 'react';
import { Square, BedDouble, Bath, Home as HomeIcon, Flame, Wind, Waves, Trees, Car as CarIcon, Shield, Check, X } from 'lucide-react';
import { Property } from '@/types';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

interface PropertyFeaturesGridProps {
  property: Property;
}

export const PropertyFeaturesGrid: React.FC<PropertyFeaturesGridProps> = ({ property }) => {
  return (
    <>
      {/* Property Specs */}
      <ScrollReveal delay={100}>
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
                <p className="text-2xl font-bold text-gray-900 capitalize">
                  {property.type === 'land' ? 'Terrain' : property.type === 'depot' ? 'Dépôt' : property.type}
                </p>
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
      </ScrollReveal>

      {/* Equipment / Amenities */}
      {property.type !== 'land' && (
        <ScrollReveal>
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
        </ScrollReveal>
      )}

      {/* Description */}
      <ScrollReveal>
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Description</h2>
          <p className="text-gray-700 leading-relaxed text-lg whitespace-pre-wrap">{property.description}</p>
        </div>
      </ScrollReveal>
    </>
  );
};
