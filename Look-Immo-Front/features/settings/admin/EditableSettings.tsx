import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Globe, Phone, MapPin, MessageCircle, 
  Instagram, Facebook, Info, Edit2, Plus, 
  Trash2, AlertCircle, Eye, Check, RefreshCw,
  ChevronDown, Building, Mail, Clock, ExternalLink,
  Sparkles, ShieldCheck, Compass, CheckCircle2, RotateCcw
} from 'lucide-react';
import '@/utils/leafletSetup';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { SiteSettings } from '@/types';
import { settingsAPI } from '@/services/api';
import { notify } from '@/services/notificationStore';
import { useClickOutside } from '@/hooks/useClickOutside';

interface EditableSettingsProps {
  settings: SiteSettings;
  setSettings: (settings: SiteSettings) => void;
  availableLocations: string[];
}

const SettingsMapUpdater = ({ center }: { center?: [number, number] | null }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, 16, { animate: true, duration: 0.8 });
    }
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

  useClickOutside(containerRef, () => setIsOpen(false));

  const allOptions = [...options];
  if (value && !allOptions.includes(value)) {
    allOptions.push(value);
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-gray-50/80 hover:bg-white border border-gray-200/80 rounded-2xl hover:border-brand-teal/50 focus:outline-none focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10 transition-all text-xs font-bold text-gray-700 cursor-pointer shadow-sm"
      >
        <span className="flex items-center gap-2 truncate">
          <Compass size={14} className="text-brand-teal flex-shrink-0" />
          <span className="truncate">{value || "Sélectionner une ville..."}</span>
        </span>
        <ChevronDown size={14} className={`text-gray-400 transform transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180 text-brand-teal' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 z-[70] mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-xl py-2 overflow-y-auto max-h-56 animate-fade-in-up">
          {allOptions.length === 0 ? (
            <div className="px-4 py-3 text-xs text-gray-400 text-center font-medium">Aucun lieu disponible</div>
          ) : (
            allOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-xs font-bold text-gray-700 hover:bg-brand-teal/5 transition-colors ${
                  opt === value
                    ? 'bg-brand-teal/10 text-brand-teal'
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
  const [isResolvingMap, setIsResolvingMap] = useState(false);
  const [isEditingAbout, setIsEditingAbout] = useState(false);

  const parseLocationInput = useCallback((raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return { isUrl: false };

    const isUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('maps.app.goo.gl') || trimmed.startsWith('goo.gl/maps');
    const fullUrl = isUrl ? (trimmed.startsWith('http') ? trimmed : `https://${trimmed}`) : undefined;
    let coords: { lat: number; lng: number } | undefined;

    // 1. Check if URL contains @lat,lng
    const atMatch = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      coords = { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
    }

    // 2. Check if URL contains !3dlat!4dlng
    if (!coords) {
      const d3d4Match = trimmed.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
      if (d3d4Match) {
        coords = { lat: parseFloat(d3d4Match[1]), lng: parseFloat(d3d4Match[2]) };
      }
    }

    // 3. Check if URL contains ?q=lat,lng or &ll=lat,lng
    if (!coords) {
      const qMatch = trimmed.match(/[?&](?:q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (qMatch) {
        coords = { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
      }
    }

    // 4. Check DMS format (e.g. 36°52'46.1"N 10°15'40.0"E)
    if (!coords) {
      const dmsMatch = trimmed.match(/(\d+)[°\s]+(\d+)['\s]+([\d.]+)"?\s*([NSns])[,;\s]+(\d+)[°\s]+(\d+)['\s]+([\d.]+)"?\s*([EWew])/);
      if (dmsMatch) {
        let lat = parseInt(dmsMatch[1], 10) + parseInt(dmsMatch[2], 10) / 60 + parseFloat(dmsMatch[3]) / 3600;
        if (dmsMatch[4].toUpperCase() === 'S') lat = -lat;
        let lng = parseInt(dmsMatch[5], 10) + parseInt(dmsMatch[6], 10) / 60 + parseFloat(dmsMatch[7]) / 3600;
        if (dmsMatch[8].toUpperCase() === 'W') lng = -lng;
        coords = { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 };
      }
    }

    // 5. Standard decimal lat, lng (e.g. 36.879483, 10.261102)
    if (!coords) {
      const decMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)$/);
      if (decMatch) {
        coords = { lat: parseFloat(decMatch[1]), lng: parseFloat(decMatch[2]) };
      }
    }

    return { coords, isUrl, url: fullUrl };
  }, []);

  const resolveLocation = useCallback(async (rawUrl: string, showFeedback = false) => {
    const trimmed = (rawUrl || '').trim();
    if (!trimmed) return;

    // 1. Try local regex parsing first
    const parsed = parseLocationInput(trimmed);
    if (parsed.coords && parsed.coords.lat && parsed.coords.lng) {
      const rounded = (n: number) => Math.round(n * 1e6) / 1e6;
      setFormData(prev => ({
        ...prev,
        googleMapsUrl: trimmed,
        location: { lat: rounded(parsed.coords!.lat), lng: rounded(parsed.coords!.lng) }
      }));
      setHasChanges(true);
      if (showFeedback) notify.success("Position de l'agence synchronisée sur la carte ! 📍");
      return;
    }

    // 2. Resolve via backend API (follows Google Maps redirects)
    if (trimmed.includes('goo.gl') || trimmed.includes('maps') || trimmed.startsWith('http')) {
      setIsResolvingMap(true);
      try {
        const res = await settingsAPI.resolveMapUrl(trimmed);
        if (res.success && res.lat && res.lng) {
          const rounded = (n: number) => Math.round(n * 1e6) / 1e6;
          setFormData(prev => ({
            ...prev,
            googleMapsUrl: trimmed,
            location: { lat: rounded(res.lat!), lng: rounded(res.lng!) }
          }));
          setHasChanges(true);
          if (showFeedback) notify.success("Position de l'agence synchronisée sur la carte ! 📍");
        } else if (showFeedback) {
          notify.error("Impossible d'extraire la position depuis ce lien. Vérifiez le lien Google Maps.");
        }
      } catch (err) {
        console.warn('Could not resolve Google Maps URL:', err);
        if (showFeedback) notify.error("Erreur de connexion lors de la résolution du lien.");
      } finally {
        setIsResolvingMap(false);
      }
    }
  }, [parseLocationInput]);

  // Sync state if settings prop changes externally and auto-resolve missing location
  useEffect(() => {
    setFormData(settings);
    setHasChanges(false);

    if (settings.googleMapsUrl && (!settings.location?.lat || !settings.location?.lng)) {
      resolveLocation(settings.googleMapsUrl, false);
    }
  }, [settings, resolveLocation]);

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

  const handleGoogleMapsUrlChange = (urlValue: string) => {
    setFormData(prev => ({
      ...prev,
      googleMapsUrl: urlValue
    }));
    setHasChanges(true);
    resolveLocation(urlValue, false);
  };

  const handleReset = () => {
    setFormData(settings);
    setHasChanges(false);
    setIsEditingAbout(false);
    notify.info('Modifications réinitialisées.');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await settingsAPI.update(formData);
      setSettings(formData);
      setHasChanges(false);
      setIsEditingAbout(false);
      notify.success('Paramètres enregistrés avec succès ! ✨');
    } catch (error) {
      console.error("Failed to save settings:", error);
      notify.error("Erreur lors de l'enregistrement. Veuillez vérifier les informations.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up pb-16">
      {/* Top Banner / Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-brand-teal/10 via-blue-50/20 to-transparent rounded-full filter blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-dark text-brand-teal rounded-full text-[10px] font-black uppercase tracking-widest mb-2">
            <ShieldCheck size={12} /> Configuration Globale
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-brand-dark">Paramètres du Site</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1 max-w-xl">
            Personnalisez les coordonnées, l'identité, les réseaux sociaux et la localisation géographique de votre agence.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto relative z-10">
          {hasChanges && (
            <button
              type="button"
              onClick={handleReset}
              disabled={isSaving}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-black uppercase tracking-wider rounded-2xl transition active:scale-95"
            >
              <RotateCcw size={14} />
              <span>Annuler</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 shadow-md ${
              hasChanges
                ? 'bg-gradient-to-r from-brand-dark via-brand-dark to-brand-teal hover:from-brand-teal hover:to-brand-dark text-white shadow-brand-teal/20 scale-100 hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
            }`}
          >
            {isSaving ? (
              <>
                <RefreshCw size={15} className="animate-spin text-white" />
                <span>Enregistrement...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={15} className={hasChanges ? 'text-brand-teal' : 'text-gray-400'} />
                <span>{hasChanges ? 'Enregistrer les modifications' : 'Paramètres à jour'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Floating Save Alert Bar (Desktop & Mobile) */}
      {hasChanges && (
        <div className="sticky top-4 z-40 bg-brand-dark/95 text-white p-4 sm:p-5 rounded-3xl shadow-2xl backdrop-blur-md border border-brand-teal/30 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in-up">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <span className="flex h-3 w-3 relative flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-teal opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-teal"></span>
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-brand-teal">Modifications non enregistrées</p>
              <p className="text-xs text-gray-300 mt-0.5">Pensez à sauvegarder vos réglages pour mettre à jour le site en temps réel.</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleReset}
              disabled={isSaving}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase tracking-wider rounded-xl transition"
            >
              Rétablir
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-teal text-brand-dark hover:bg-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition duration-200"
            >
              {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
              <span>Sauvegarder</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Left Column: General Info & About & Discovery Links */}
        <div className="space-y-8">
          
          {/* Card 1: Informations Générales */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100/90 p-6 sm:p-7 relative overflow-hidden group hover:shadow-md transition duration-300">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                  <Globe size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-900 leading-tight">Informations Générales</h2>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Identité et coordonnées</p>
                </div>
              </div>
              <span className="text-[9px] font-black px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-widest">
                Contact
              </span>
            </div>

            <div className="space-y-5">
              {/* Nom du site */}
              <div>
                <label className="block text-xs font-black text-gray-500 mb-1.5 uppercase tracking-wider">Nom de l'agence / Site</label>
                <div className="relative">
                  <Building size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={formData.websiteName || ''}
                    onChange={(e) => handleChange('websiteName', e.target.value)}
                    placeholder="Ex: Look Immo"
                    className="w-full pl-11 pr-4 py-3 bg-gray-50/80 focus:bg-white border border-gray-200 rounded-2xl focus:outline-none focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10 transition text-sm font-bold text-gray-800"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-500 mb-1.5 uppercase tracking-wider">Email de contact</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={formData.contactEmail || ''}
                      onChange={(e) => handleChange('contactEmail', e.target.value)}
                      placeholder="contact@lookimmo.tn"
                      className="w-full pl-11 pr-4 py-3 bg-gray-50/80 focus:bg-white border border-gray-200 rounded-2xl focus:outline-none focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10 transition text-sm font-bold text-gray-800"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 mb-1.5 uppercase tracking-wider">Téléphone fixe / Mobile</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.phoneNumber || ''}
                      onChange={(e) => handleChange('phoneNumber', e.target.value)}
                      placeholder="+216 70 123 456"
                      className="w-full pl-11 pr-4 py-3 bg-gray-50/80 focus:bg-white border border-gray-200 rounded-2xl focus:outline-none focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10 transition text-sm font-bold text-gray-800"
                    />
                  </div>
                </div>
              </div>

              {/* Physical address */}
              <div>
                <label className="block text-xs font-black text-gray-500 mb-1.5 uppercase tracking-wider">Adresse physique complète</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="Ex: Les Berges du Lac II, Tunis, Tunisie"
                    className="w-full pl-11 pr-4 py-3 bg-gray-50/80 focus:bg-white border border-gray-200 rounded-2xl focus:outline-none focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10 transition text-sm font-bold text-gray-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: About Text / Identité */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100/90 p-6 sm:p-7 relative overflow-hidden group hover:shadow-md transition duration-300">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-sm">
                  <Info size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-900 leading-tight">Texte "À Propos"</h2>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Présentation affichée sur le site</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingAbout(!isEditingAbout)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                  isEditingAbout
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-brand-teal hover:text-white'
                }`}
              >
                {isEditingAbout ? (
                  <>
                    <Check size={14} /> Terminer
                  </>
                ) : (
                  <>
                    <Edit2 size={14} /> Modifier
                  </>
                )}
              </button>
            </div>

            {isEditingAbout ? (
              <div className="space-y-2">
                <textarea
                  value={formData.aboutText || ''}
                  onChange={(e) => handleChange('aboutText', e.target.value)}
                  rows={5}
                  className="w-full p-4 bg-gray-50/80 focus:bg-white border border-gray-200 rounded-2xl focus:outline-none focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10 text-sm font-medium text-gray-800 leading-relaxed resize-none transition shadow-inner"
                  placeholder="Présentez l'histoire, la vision et les points forts de votre agence..."
                  autoFocus
                />
                <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider px-1">
                  <span>Texte public affiché sur la page d'accueil</span>
                  <span>{(formData.aboutText || '').length} caractères</span>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingAbout(true)}
                className="w-full p-4 sm:p-5 bg-gray-50/70 border border-gray-200/80 rounded-2xl text-gray-700 text-sm font-medium leading-relaxed min-h-[120px] cursor-pointer hover:border-brand-teal/50 hover:bg-gray-50 transition relative group/text"
                title="Cliquez pour éditer la description"
              >
                {formData.aboutText ? (
                  <p className="whitespace-pre-wrap">{formData.aboutText}</p>
                ) : (
                  <p className="text-gray-400 italic font-normal">Aucune description configurée. Cliquez ici pour ajouter le texte de présentation.</p>
                )}
                <div className="absolute bottom-3 right-3 opacity-0 group-hover/text:opacity-100 transition flex items-center gap-1 text-[10px] font-black text-brand-teal uppercase tracking-widest bg-white/90 px-2.5 py-1 rounded-lg shadow-sm border border-gray-100">
                  <Edit2 size={11} /> Éditer
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Discovery Links */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100/90 p-6 sm:p-7 relative overflow-hidden group hover:shadow-md transition duration-300">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-sm">
                  <Compass size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-900 leading-tight">Liens "Découvrir"</h2>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Raccourcis de recherche (Footer & Accueil)</p>
                </div>
              </div>
              
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
                  className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white px-3 py-1.5 rounded-xl border border-purple-200 transition"
                >
                  <Plus size={14} />
                  <span>Ajouter</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              {!formData.discoveryLinks || formData.discoveryLinks.length === 0 ? (
                <div className="text-center py-8 bg-gray-50/60 rounded-2xl border border-dashed border-gray-200">
                  <Compass size={28} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-xs font-bold">Aucun lien configuré.</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Ajoutez jusqu'à 3 villes phares pour les visiteurs.</p>
                </div>
              ) : (
                formData.discoveryLinks.map((link, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 bg-gray-50/80 p-3 rounded-2xl border border-gray-200/80 hover:border-brand-teal/30 transition shadow-sm">
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
                      className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition border border-transparent hover:border-red-100 flex-shrink-0"
                      title="Supprimer ce raccourci"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}

              {formData.discoveryLinks && formData.discoveryLinks.length >= 3 && (
                <div className="flex items-center justify-end gap-1.5 text-[10px] font-black text-amber-700 uppercase tracking-widest pt-1">
                  <AlertCircle size={12} /> Limite de 3 raccourcis atteinte
                </div>
              )}
            </div>
          </div>

          {/* Card 4: Meta Pixel & Publicités (Facebook & Instagram) */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100/90 p-6 sm:p-7 relative overflow-hidden group hover:shadow-md transition duration-300">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-900 leading-tight">Meta Pixel (Facebook & Instagram)</h2>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Suivi des conversions et reciblage publicitaire</p>
                </div>
              </div>
              {formData.metaPixelId?.trim() ? (
                <span className="text-[9px] font-black px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Actif
                </span>
              ) : (
                <span className="text-[9px] font-black px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 uppercase tracking-widest">
                  Non configuré
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-black text-gray-600 uppercase tracking-wider">Identifiant Meta Pixel / Dataset ID</label>
                  {formData.metaPixelId?.trim() && (
                    <a
                      href={`https://business.facebook.com/events_manager2/list/dataset/${formData.metaPixelId.trim()}/test_events`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-black text-brand-teal hover:underline uppercase tracking-wider flex items-center gap-1"
                    >
                      <ExternalLink size={11} /> Tester dans Events Manager
                    </a>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.metaPixelId || ''}
                    onChange={(e) => handleChange('metaPixelId', e.target.value.trim())}
                    placeholder="Ex: 1234567890123456"
                    className="w-full px-4 py-3 bg-gray-50/80 focus:bg-white border border-gray-200 rounded-2xl focus:outline-none focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10 font-mono text-sm font-bold text-gray-800 transition"
                  />
                </div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1.5 px-1">
                  Trouvez votre ID dans Meta Business Suite → Gestionnaire d'événements (Events Manager)
                </p>
              </div>

              {/* Automatic Tracking Features Badges */}
              <div className="bg-gray-50/80 rounded-2xl p-3.5 border border-gray-100">
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Événements suivis automatiquement sur le site :
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="bg-white p-2 rounded-xl border border-gray-100 text-center shadow-xs">
                    <span className="block text-[10px] font-black text-brand-dark uppercase tracking-wider">👁️ PageView</span>
                    <span className="text-[8px] text-gray-400 font-bold">Toutes pages</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-gray-100 text-center shadow-xs">
                    <span className="block text-[10px] font-black text-brand-dark uppercase tracking-wider">🏠 ViewContent</span>
                    <span className="text-[8px] text-gray-400 font-bold">Fiches biens</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-gray-100 text-center shadow-xs">
                    <span className="block text-[10px] font-black text-brand-dark uppercase tracking-wider">🎯 Lead</span>
                    <span className="text-[8px] text-gray-400 font-bold">Rendez-vous</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-gray-100 text-center shadow-xs">
                    <span className="block text-[10px] font-black text-brand-dark uppercase tracking-wider">🔍 Search</span>
                    <span className="text-[8px] text-gray-400 font-bold">Recherches</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Social Media, Hours & Map */}
        <div className="space-y-8">
          
          {/* Card 5: Réseaux Sociaux */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100/90 p-6 sm:p-7 relative overflow-hidden group hover:shadow-md transition duration-300">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-600 shadow-sm">
                  <MessageCircle size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-900 leading-tight">Réseaux Sociaux & Messagerie</h2>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Liens directs vers vos profils</p>
                </div>
              </div>
              <span className="text-[9px] font-black px-2.5 py-1 rounded-full bg-pink-50 text-pink-700 border border-pink-100 uppercase tracking-widest">
                Social
              </span>
            </div>

            <div className="space-y-4">
              {/* Instagram */}
              <div>
                <label className="flex items-center gap-2 text-xs font-black text-gray-600 mb-1.5 uppercase tracking-wider">
                  <Instagram size={14} className="text-pink-600" /> Profil Instagram
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={formData.socialMedia?.instagram || ''}
                    onChange={(e) => handleChange('socialMedia.instagram', e.target.value)}
                    placeholder="https://instagram.com/lookimmo"
                    className="w-full px-4 py-3 bg-gray-50/80 focus:bg-white border border-gray-200 rounded-2xl focus:outline-none focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10 transition text-sm font-bold text-gray-800"
                  />
                  {formData.socialMedia?.instagram && (
                    <a
                      href={formData.socialMedia.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-brand-teal rounded-lg hover:bg-gray-100 transition"
                      title="Ouvrir le profil"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>

              {/* Facebook */}
              <div>
                <label className="flex items-center gap-2 text-xs font-black text-gray-600 mb-1.5 uppercase tracking-wider">
                  <Facebook size={14} className="text-blue-600" /> Page Facebook
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={formData.socialMedia?.facebook || ''}
                    onChange={(e) => handleChange('socialMedia.facebook', e.target.value)}
                    placeholder="https://facebook.com/lookimmo"
                    className="w-full px-4 py-3 bg-gray-50/80 focus:bg-white border border-gray-200 rounded-2xl focus:outline-none focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10 transition text-sm font-bold text-gray-800"
                  />
                  {formData.socialMedia?.facebook && (
                    <a
                      href={formData.socialMedia.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-brand-teal rounded-lg hover:bg-gray-100 transition"
                      title="Ouvrir la page"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>

              {/* WhatsApp */}
              <div>
                <label className="flex items-center gap-2 text-xs font-black text-gray-600 mb-1.5 uppercase tracking-wider">
                  <Phone size={14} className="text-green-600" /> Numéro WhatsApp
                </label>
                <input
                  type="tel"
                  value={formData.socialMedia?.whatsapp || ''}
                  onChange={(e) => handleChange('socialMedia.whatsapp', e.target.value)}
                  placeholder="+216 70 123 456"
                  className="w-full px-4 py-3 bg-gray-50/80 focus:bg-white border border-gray-200 rounded-2xl focus:outline-none focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10 transition text-sm font-bold text-gray-800"
                />
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1 px-1">
                  Format international : +216 XX XXX XXX
                </p>
              </div>
            </div>
          </div>

          {/* Card 5: Horaires d'Ouverture */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100/90 p-6 sm:p-7 relative overflow-hidden group hover:shadow-md transition duration-300">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                  <Clock size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-900 leading-tight">Horaires d'Ouverture</h2>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Disponibilités de l'agence</p>
                </div>
              </div>
              <span className="text-[9px] font-black px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-widest">
                Accueil
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-black text-gray-500 mb-1 uppercase tracking-wider">Lundi - Vendredi</label>
                <input
                  type="text"
                  value={formData.workingHours?.weekdays || ''}
                  onChange={(e) => handleChange('workingHours.weekdays', e.target.value)}
                  placeholder="08:30 - 18:30"
                  className="w-full px-3.5 py-2.5 bg-gray-50/80 focus:bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-brand-teal text-xs font-bold text-gray-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 mb-1 uppercase tracking-wider">Samedi</label>
                <input
                  type="text"
                  value={formData.workingHours?.saturday || ''}
                  onChange={(e) => handleChange('workingHours.saturday', e.target.value)}
                  placeholder="09:00 - 14:00"
                  className="w-full px-3.5 py-2.5 bg-gray-50/80 focus:bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-brand-teal text-xs font-bold text-gray-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 mb-1 uppercase tracking-wider">Dimanche</label>
                <input
                  type="text"
                  value={formData.workingHours?.sunday || ''}
                  onChange={(e) => handleChange('workingHours.sunday', e.target.value)}
                  placeholder="Fermé"
                  className="w-full px-3.5 py-2.5 bg-gray-50/80 focus:bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-brand-teal text-xs font-bold text-gray-800"
                />
              </div>
            </div>
          </div>

          {/* Card 6: Localisation & Carte Interactive */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100/90 p-6 sm:p-7 relative overflow-hidden group hover:shadow-md transition duration-300">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-brand-teal shadow-sm">
                  <MapPin size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-900 leading-tight">Localisation de l'Agence</h2>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Repère cartographique interactif</p>
                </div>
              </div>
              <span className="text-[9px] font-black px-2.5 py-1 rounded-full bg-brand-teal/10 text-brand-dark border border-brand-teal/20 uppercase tracking-widest">
                GPS
              </span>
            </div>

            {/* Instruction banner */}
            <div className="flex items-start gap-2.5 bg-brand-teal/5 border border-brand-teal/20 text-brand-dark p-3.5 rounded-2xl text-xs font-medium mb-4">
              <Sparkles size={16} className="text-brand-teal flex-shrink-0 mt-0.5" />
              <span>
                <strong>Cliquez directement sur la carte</strong> pour placer le marqueur de votre bureau. Les coordonnées GPS seront synchronisées automatiquement.
              </span>
            </div>

            {/* Google Maps link input */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Lien Google Maps / Fiche Agence (Share Link)</span>
                  {isResolvingMap && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-brand-teal font-bold animate-pulse lowercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-teal animate-ping"></span>
                      synchronisation...
                    </span>
                  )}
                </label>
                {formData.googleMapsUrl && (
                  <a
                    href={formData.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-black text-brand-teal hover:underline uppercase tracking-wider flex items-center gap-1"
                  >
                    <ExternalLink size={11} /> Ouvrir le lien
                  </a>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={formData.googleMapsUrl || ''}
                  placeholder="Ex: https://maps.app.goo.gl/... ou lien de votre agence sur Google Maps"
                  onChange={(e) => handleGoogleMapsUrlChange(e.target.value)}
                  className="flex-1 px-4 py-3 bg-gray-50/80 focus:bg-white border border-gray-200 rounded-2xl focus:outline-none focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10 text-xs font-bold text-gray-800 transition shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => resolveLocation(formData.googleMapsUrl || '', true)}
                  disabled={isResolvingMap || !formData.googleMapsUrl}
                  className="px-4 py-3 rounded-2xl bg-brand-dark hover:bg-brand-dark/90 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50 transition shrink-0"
                  title="Localiser l'agence sur la carte"
                >
                  <MapPin size={14} className={isResolvingMap ? 'animate-bounce text-brand-teal' : 'text-brand-teal'} />
                  <span className="hidden sm:inline">Localiser</span>
                </button>
              </div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1.5 px-1">
                Collez le lien de partage Google Maps de votre agence — la carte se positionnera automatiquement.
              </p>
            </div>

            {/* Leaflet Map */}
            <div className="rounded-2xl overflow-hidden border border-gray-200 relative z-0 h-[300px] shadow-inner">
              <MapContainer
                center={formData.location?.lat && formData.location?.lng ? [formData.location.lat, formData.location.lng] : [36.8794708, 10.2610246]}
                zoom={16}
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
                    setHasChanges(true);
                  }}
                />
                {formData.location && formData.location.lat && formData.location.lng && (
                  <Marker
                    position={[formData.location.lat, formData.location.lng]}
                    draggable={true}
                    eventHandlers={{
                      dragend: (e) => {
                        const marker = e.target;
                        const position = marker.getLatLng();
                        const rounded = (n: number) => Math.round(n * 1e6) / 1e6;
                        setFormData(prev => ({
                          ...prev,
                          location: { lat: rounded(position.lat), lng: rounded(position.lng) }
                        }));
                        setHasChanges(true);
                      }
                    }}
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
                  center={formData.location?.lat && formData.location?.lng ? [formData.location.lat, formData.location.lng] : null}
                />
              </MapContainer>
            </div>

            {/* Google Maps link preview */}
            {(formData.googleMapsUrl || (formData.location && formData.location.lat && formData.location.lng)) && (
              <div className="mt-3.5 pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>{formData.googleMapsUrl ? 'Lien agence personnalisé configuré' : 'Position GPS enregistrée'}</span>
                </span>
                <a
                  href={formData.googleMapsUrl || `https://www.google.com/maps?q=${formData.location?.lat},${formData.location?.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-black text-brand-teal hover:text-brand-dark transition uppercase tracking-wider"
                >
                  <Eye size={13} />
                  <span>Vérifier sur Google Maps</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default EditableSettings;
