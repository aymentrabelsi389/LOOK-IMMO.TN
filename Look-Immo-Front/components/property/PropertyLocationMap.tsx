import React, { useEffect } from 'react';
import '@/utils/leafletSetup';
import { MapContainer, TileLayer, Circle, useMap } from 'react-leaflet';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

interface PropertyLocationMapProps {
  lat: number;
  lng: number;
  city: string;
}

// Map Updater Component to ensure correct center & invalidate container dimensions
const MapUpdater: React.FC<{ center: [number, number] }> = ({ center }) => {
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

export const PropertyLocationMap: React.FC<PropertyLocationMapProps> = ({ lat, lng }) => {
  return (
    <ScrollReveal>
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Localisation du Bien</h2>
        <div className="rounded-xl overflow-hidden h-[300px] md:h-96 border border-gray-200 relative z-0">
          <MapContainer
            center={[lat, lng]}
            zoom={13}
            style={{ height: '100%', width: '100%', zIndex: 0 }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Circle
              center={[lat, lng]}
              radius={500}
              pathOptions={{
                color: '#1D4ED8',
                fillColor: '#3B82F6',
                fillOpacity: 0.25,
                weight: 2,
              }}
            />
            <MapUpdater center={[lat, lng]} />
          </MapContainer>
        </div>
      </div>
    </ScrollReveal>
  );
};
