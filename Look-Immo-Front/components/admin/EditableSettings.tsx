
import React, { useState, useEffect, useRef } from 'react';
import { 
  Globe, Phone, MapPin, MessageCircle, 
  Instagram, Facebook, Info, Edit2, Plus, 
  Trash2, AlertCircle, Eye, Check, RefreshCw,
  ChevronDown
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { SiteSettings } from '../../types';
import { settingsAPI } from '../../services/api';
import { notify } from '../../services/notificationStore';

interface EditableSettingsProps {
  settings: SiteSettings;
  setSettings: (settings: SiteSettings) => void;
  availableLocations: string[];
}

const SettingsMapUpdater = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);

  return null;
};

const MapClickHandler = ({ onLocationPick }: { onLocationPick: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e) {
      onLocationPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

interface LocationDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}

const LocationDropdown = ({ value, onChange, options }: LocationDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allOptions = [...options];
  if (value && !allOptions.includes(value)) {
    allOptions.push(value);
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-white border border-gray-300 rounded-lg hover:border-brand-teal/50 focus:outline-none focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10 transition-all text-sm font-semibold text-gray-700 cursor-pointer"
      >
        <span className="truncate">{value || "Choisir un lieu..."}</span>
        <ChevronDown size={16} className={`text-gray-400 transform transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 z-[60] mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-lg py-2 overflow-y-auto max-h-60 animate-fade-in-up">
          {allOptions.length === 0 ? (
            <div className="px-4 py-2 text-xs text-gray-400 text-center">Aucun lieu disponible</div>
          ) : (
            allOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors ${
                  opt === value
                    ? 'bg-brand-teal/5 text-brand-teal font-black'
                    : ''
                }`}
              >
                <span>{opt}</span>
                {opt === value && <Check size={14} className="text-brand-teal flex-shrink-0" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const EditableSettings = ({ settings, setSettings, availableLocations }: EditableSettingsProps) => {
  const [formData, setFormData] = useState<SiteSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [gpsInput, setGpsInput] = useState(settings.location ? `${settings.location.lat}, ${settings.location.lng}` : '');
  const [isEditingAbout, setIsEditingAbout] = useState(false);

  const handleChange = (field: string, value: any) => {
    const newData = { ...formData };
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      (newData as any)[parent] = { ...(newData as any)[parent], [child]: value };
    } else {
      (newData as any)[field] = value;
    }
    setFormData(newData);
    setHasChanges(true);
  };

  const handleGpsChange = (value: string) => {
    setGpsInput(value);
    const coords = value.split(',').map(s => parseFloat(s.trim()));
    if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
      setFormData(prev => ({
        ...prev,
        location: { lat: coords[0], lng: coords[1] }
      }));
      setHasChanges(true);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await settingsAPI.update(formData);
      setSettings(formData);
      setHasChanges(false);
      setIsEditingAbout(false);
      notify.success('Paramètres enregistrés avec succès !');
    } catch (error) {
      console.error("Failed to save settings:", error);
      notify.error('Erreur lors de l\'enregistrement. Veuillez réessayer.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-fade-in-up pb-12">
      {/* Sticky Save Bar — only shown when there are unsaved changes */}
      {hasChanges && (
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-between mb-6 bg-white p-4 rounded-2xl border border-brand-teal/30 shadow-md sticky top-0 z-20">
          <p className="text-sm text-brand-teal font-semibold text-center sm:text-left">Vous avez des modifications non enregistrées</p>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-brand-teal text-white px-5 sm:px-8 py-3 rounded-xl font-bold shadow-lg shadow-brand-teal/30 hover:shadow-brand-teal/50 transition transform hover:-translate-y-0.5 text-sm"
          >
            {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Check size={18} />}
            <span>Enregistrer les modifications</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: General Info */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
              <Globe size={20} className="text-brand-teal mr-2" />
              Informations Générales
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nom du site</label>
                <input
                  type="text"
                  value={formData.websiteName}
                  onChange={(e) => handleChange('websiteName', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-teal text-gray-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email de contact</label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => handleChange('contactEmail', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-teal text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Téléphone</label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => handleChange('phoneNumber', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-teal text-gray-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Adresse physique</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-teal text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* About Text */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <Info size={20} className="text-brand-teal mr-2" />
                Texte "À propos"
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingAbout(!isEditingAbout)}
                className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition ${isEditingAbout ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {isEditingAbout ? (
                  <>
                    <Check size={16} className="mr-1" /> Terminer
                  </>
                ) : (
                  <>
                    <Edit2 size={16} className="mr-1" /> Modifier
                  </>
                )}
              </button>
            </div>
            {isEditingAbout ? (
              <textarea
                value={formData.aboutText || ''}
                onChange={(e) => handleChange('aboutText', e.target.value)}
                rows={6}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-teal text-gray-900 resize-none animate-fade-in-up"
                placeholder="Description de l'entreprise..."
                autoFocus
              />
            ) : (
              <div
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm leading-relaxed min-h-[160px] cursor-pointer hover:bg-gray-100 transition whitespace-pre-wrap"
                onClick={() => setIsEditingAbout(true)}
                title="Cliquez pour modifier"
              >
                {formData.aboutText || <span className="text-gray-400 italic">Aucune description...</span>}
              </div>
            )}
          </div>

          {/* Discovery Links */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <MapPin className="mr-2 text-brand-teal" size={20} />
                Liens "Découvrir"
              </h3>
              {(!formData.discoveryLinks || formData.discoveryLinks.length < 3) && (
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      discoveryLinks: [...(prev.discoveryLinks || []), { label: '', url: '#' }]
                    }));
                    setHasChanges(true);
                  }}
                  className="flex items-center space-x-1 text-sm bg-brand-light text-brand-dark px-3 py-1 rounded-lg hover:bg-brand-teal hover:text-white transition"
                >
                  <Plus size={14} />
                  <span>Ajouter</span>
                </button>
              )}
            </div>

            <div className="space-y-4">
              {!formData.discoveryLinks || formData.discoveryLinks.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                  <p className="text-gray-500 text-sm">Aucun lien configuré.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.discoveryLinks.map((link, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200 animate-fade-in-up">
                      <div className="flex-1">
                        <LocationDropdown
                          value={link.label}
                          onChange={(newLabel) => {
                            const newUrl = `/listings?query=${encodeURIComponent(newLabel)}`;
                            const newLinks = [...(formData.discoveryLinks || [])];
                            newLinks[idx] = { ...newLinks[idx], label: newLabel, url: newUrl };
                            setFormData(prev => ({ ...prev, discoveryLinks: newLinks }));
                            setHasChanges(true);
                          }}
                          options={availableLocations}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newLinks = formData.discoveryLinks!.filter((_, i) => i !== idx);
                          setFormData(prev => ({ ...prev, discoveryLinks: newLinks }));
                          setHasChanges(true);
                        }}
                        className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {formData.discoveryLinks && formData.discoveryLinks.length >= 3 && (
                <p className="text-xs text-amber-600 flex items-center justify-end mt-2">
                  <AlertCircle size={12} className="mr-1" /> Maximum 3 liens recommandés
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Social Media & Map */}
        <div className="space-y-6 flex flex-col h-full">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <MessageCircle size={20} className="text-brand-teal mr-2" />
              Réseaux Sociaux
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <Instagram size={16} className="text-pink-500 mr-2" /> Instagram
                </label>
                <input
                  type="url"
                  value={formData.socialMedia.instagram}
                  onChange={(e) => handleChange('socialMedia.instagram', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-teal text-gray-900"
                  placeholder="https://instagram.com/lookimmo"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <Facebook size={16} className="text-blue-600 mr-2" /> Facebook
                </label>
                <input
                  type="url"
                  value={formData.socialMedia.facebook}
                  onChange={(e) => handleChange('socialMedia.facebook', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-teal text-gray-900"
                  placeholder="https://facebook.com/lookimmo"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <Phone size={16} className="text-green-600 mr-2" /> WhatsApp
                </label>
                <input
                  type="tel"
                  value={formData.socialMedia.whatsapp}
                  onChange={(e) => handleChange('socialMedia.whatsapp', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-teal text-gray-900"
                  placeholder="+216 70 123 456"
                />
                <p className="text-xs text-gray-500 mt-1">Format: +216 XX XXX XXX</p>
              </div>
            </div>
          </div>

          {/* Map Setting */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col min-h-[500px] flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <MapPin size={20} className="text-brand-teal mr-2" />
              Localisation de l'agence
            </h3>

            {/* Instruction banner */}
            <div className="flex items-start space-x-2 bg-teal-50 border border-teal-200 text-teal-800 px-4 py-3 rounded-xl text-sm mb-4">
              <MapPin size={16} className="mt-0.5 shrink-0 text-brand-teal" />
              <span>
                <strong>Cliquez sur la carte</strong> pour placer le marqueur de votre agence. Les coordonnées GPS se mettront à jour automatiquement.
              </span>
            </div>

            {/* GPS coordinates display/input */}
            <div className="mb-3">
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Coordonnées GPS</label>
              <input
                type="text"
                value={gpsInput}
                placeholder="Ex: 36.8624, 10.2407"
                onChange={(e) => handleGpsChange(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/10 outline-none transition font-mono"
              />
              <p className="text-xs text-gray-400 mt-1">
                Ou copiez depuis Google Maps : Clic droit sur un lieu → cliquez sur les chiffres de coordonnées
              </p>
            </div>

            <div className="flex-1 rounded-xl overflow-hidden border-2 border-brand-teal/20 relative z-0 min-h-[300px] mt-2 cursor-crosshair shadow-inner">
              <MapContainer
                center={formData.location ? [formData.location.lat, formData.location.lng] : [36.8065, 10.1815]}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />
                <MapClickHandler
                  onLocationPick={(lat, lng) => {
                    const rounded = (n: number) => Math.round(n * 1e6) / 1e6;
                    setFormData(prev => ({ ...prev, location: { lat: rounded(lat), lng: rounded(lng) } }));
                    setGpsInput(`${rounded(lat)}, ${rounded(lng)}`);
                    setHasChanges(true);
                  }}
                />
                {formData.location && formData.location.lat && formData.location.lng && (
                  <Marker
                    position={[formData.location.lat, formData.location.lng]}
                    icon={new L.Icon({
                      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
                      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                      iconSize: [25, 41],
                      iconAnchor: [12, 41],
                      popupAnchor: [1, -34],
                    })}
                  />
                )}
                <SettingsMapUpdater
                  center={formData.location ? [formData.location.lat, formData.location.lng] : [36.8065, 10.1815]}
                />
              </MapContainer>
            </div>

            {/* Preview Google Maps link */}
            {formData.location && formData.location.lat && formData.location.lng && (
              <a
                href={`https://www.google.com/maps?q=${formData.location.lat},${formData.location.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 text-xs text-brand-teal hover:underline flex items-center gap-1"
              >
                <Eye size={13} /> Vérifier sur Google Maps
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditableSettings;
