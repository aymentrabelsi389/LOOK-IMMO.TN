import React from 'react';
import { Square, BedDouble, Bath, Home as HomeIcon, Flame, Wind, Waves, Trees, Car as CarIcon, Shield, Check, X, Globe, Loader2 } from 'lucide-react';
import { Property } from '@/types';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { useTranslation } from '@/hooks/useTranslation';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';
import { formatPropertyType } from '@/utils/propertyUtils';

interface PropertyFeaturesGridProps {
  property: Property;
}

export const PropertyFeaturesGrid: React.FC<PropertyFeaturesGridProps> = ({ property }) => {
  const { t } = useTranslation();
  const {
    displayText,
    isTranslating,
    isTranslated,
    showOriginal,
    toggleOriginal,
    language
  } = useAutoTranslate(property.description);

  return (
    <>
      {/* Property Specs */}
      <ScrollReveal delay={100}>
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 font-serif">{t('mainFeaturesTitle')}</h2>
          {property.type === 'land' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <Square className="mx-auto text-brand-teal mb-2" size={32} />
                <p className="text-2xl font-bold text-gray-900">{property.features.area}</p>
                <p className="text-sm text-gray-600">m² {t('surfaceLabel')}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <div className="text-4xl mx-auto mb-2">🏗️</div>
                <p className="text-2xl font-bold text-gray-900">
                  {property.features.vocation
                    ? property.features.vocation.replace(/résidentiel|residentiel/gi, '').trim()
                    : 'N/A'}
                </p>
                <p className="text-sm text-gray-600">{t('vocationLabel')}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <div className="text-4xl mx-auto mb-2">📊</div>
                <p className="text-2xl font-bold text-gray-900">{property.features.cos || 'N/A'}</p>
                <p className="text-sm text-gray-600">{t('cosLabel')}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <HomeIcon className="mx-auto text-brand-teal mb-2" size={32} />
                <p className="text-2xl font-bold text-gray-900 capitalize">
                  {formatPropertyType(property.type, undefined, t)}
                </p>
                <p className="text-sm text-gray-600">{t('typeLabel')}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <Square className="mx-auto text-brand-teal mb-2" size={32} />
                <p className="text-2xl font-bold text-gray-900">{property.features.area}</p>
                <p className="text-sm text-gray-600">m² {t('surfaceLabel')}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <BedDouble className="mx-auto text-brand-teal mb-2" size={32} />
                <p className="text-2xl font-bold text-gray-900">{property.features.bedrooms}</p>
                <p className="text-sm text-gray-600">{t('bedroomsLabel')}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <Bath className="mx-auto text-brand-teal mb-2" size={32} />
                <p className="text-2xl font-bold text-gray-900">{property.features.bathrooms}</p>
                <p className="text-sm text-gray-600">{t('bathroomsLabel')}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <HomeIcon className="mx-auto text-brand-teal mb-2" size={32} />
                <p className="text-2xl font-bold text-gray-900 capitalize">{formatPropertyType(property.type, undefined, t)}</p>
                <p className="text-sm text-gray-600">{t('typeLabel')}</p>
              </div>
            </div>
          )}
        </div>
      </ScrollReveal>

      {/* Equipment / Amenities */}
      {property.type !== 'land' && (
        <ScrollReveal>
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('amenitiesTitle')}</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: <Flame size={20} />, label: t('amenityHeating'), available: property.features.heating },
                { icon: <Wind size={20} />, label: t('amenityAC'), available: property.features.airConditioning },
                { icon: <Waves size={20} />, label: t('amenityPool'), available: property.features.pool },
                { icon: <Trees size={20} />, label: t('amenityGarden'), available: property.features.garden },
                { icon: <CarIcon size={20} />, label: t('amenityParking'), available: property.features.parking },
                { icon: <Shield size={20} />, label: t('amenitySecurity'), available: property.features.security }
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
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('descriptionTitle')}</h2>
          <p className="text-gray-700 leading-relaxed text-lg whitespace-pre-wrap">{displayText}</p>

          {language === 'en' && (isTranslated || isTranslating) && (
            <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                {isTranslating ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-blue-600" />
                    <span className="italic">{t('translating')}</span>
                  </>
                ) : isTranslated ? (
                  <>
                    <Globe size={14} className="text-blue-500" />
                    <span>{t('translatedFromFrench')}</span>
                  </>
                ) : null}
              </div>
              {isTranslated && !isTranslating && (
                <button
                  type="button"
                  onClick={toggleOriginal}
                  className="text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2 transition-colors cursor-pointer"
                >
                  {showOriginal ? t('showTranslation') : t('showOriginal')}
                </button>
              )}
            </div>
          )}
        </div>
      </ScrollReveal>
    </>
  );
};


