import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

import {
  X, RefreshCw, Plus, Upload, Shield, Car as CarIcon,
  Trees, Waves, Wind, Flame, Check, GripVertical,
  Trash2, FileText, Eye, Download, ChevronDown
} from 'lucide-react';
import { MapContainer, TileLayer, Circle, useMap, useMapEvents } from 'react-leaflet';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Property, PropertyType } from '@/types';
import { uploadAPI, BACKEND_URL, resolveImage } from '@/services/api';
import { getImageSrc } from '@/utils/imageUtils';

interface PropertyModalProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  isEditing: boolean;
  formData: Partial<Property>;
  setFormData: (data: Partial<Property>) => void;
  gpsInput: string;
  setGpsInput: (val: string) => void;
  availableLocations: string[];
  handleSave: (e: React.FormEvent) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeImage: (index: number) => void;
  onImagesReorder: (newImages: string[]) => void;
  onLocationChange: (lat: number, lng: number) => void;
}

const getDownloadUrl = (url: string) => {
  if (!url) return '';
  const cleanUrl = url.replace(BACKEND_URL, '');
  return `${BACKEND_URL}/api/download?url=${encodeURIComponent(cleanUrl)}`;
};

// MapUpdater helper component
const MapUpdater = ({ lat, lng, onMapClick }: { lat: number, lng: number, onMapClick: (lat: number, lng: number) => void }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);

  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
};

interface SortableImageProps {
  url: string;
  index: number;
  onRemove: (i: number) => void;
}

const SortableImage: React.FC<SortableImageProps> = ({ url, index, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: url });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50 ${isDragging ? 'opacity-50' : ''}`}
    >
      <img src={getImageSrc(url, 'thumb')} className="w-full h-full object-cover" alt="" />
      <div
        {...attributes}
        {...listeners}
        className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors cursor-grab active:cursor-grabbing flex items-center justify-center touch-none"
      >
        <GripVertical className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={24} />
      </div>
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-600"
      >
        <X size={14} />
      </button>
    </div>
  );
};

const PropertyModal = ({
  showModal,
  setShowModal,
  isEditing,
  formData,
  setFormData,
  gpsInput,
  setGpsInput,
  availableLocations,
  handleSave,
  handleImageUpload,
  removeImage,
  onImagesReorder,
  onLocationChange
}: PropertyModalProps) => {
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 50,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [isVilleOpen, setIsVilleOpen] = React.useState(false);
  const [isTypeOpen, setIsTypeOpen] = React.useState(false);
  const [isStatusOpen, setIsStatusOpen] = React.useState(false);

  if (!showModal) return null;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = formData.images?.indexOf(active.id as string) ?? -1;
      const newIndex = formData.images?.indexOf(over?.id as string) ?? -1;
      if (oldIndex !== -1 && newIndex !== -1) {
        onImagesReorder(arrayMove(formData.images!, oldIndex, newIndex));
      }
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'propertyPlan' | 'ownerPaper') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await uploadAPI.uploadPropertyDocument(file);
      setFormData({
        ...formData,
        features: {
          ...formData.features!,
          [fieldName]: res.url
        }
      });
    } catch (err) {
      console.error("Failed to upload document:", err);
      alert("Erreur lors de l'upload du document. Veuillez réessayer.");
    }
  };

  const renderDocBox = (label: string, fieldName: 'propertyPlan' | 'ownerPaper', description: string) => {
    const docUrl = (formData.features as any)?.[fieldName];

    return (
      <div className="border border-gray-150 rounded-xl p-4 bg-gray-50/50 hover:bg-gray-50 transition-all">
        <div className="flex justify-between items-start mb-2">
          <div>
            <span className="text-sm font-bold text-gray-800">{label}</span>
            <p className="text-[11px] text-gray-400 font-medium">{description}</p>
          </div>
          {docUrl && (
            <button
              type="button"
              onClick={() => {
                const newFeatures = { ...formData.features };
                delete (newFeatures as any)[fieldName];
                setFormData({ ...formData, features: newFeatures as any });
              }}
              className="text-red-500 hover:text-red-600 transition-colors p-1"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>

        {docUrl ? (
          <div className="flex items-center gap-3 bg-white p-3 border border-gray-100 rounded-lg mt-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-red-50 text-red-500">
              <FileText size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-700 truncate">
                Document PDF
              </p>
              <div className="flex items-center gap-2.5 mt-0.5">
                <a 
                  href={resolveImage(docUrl)} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-[11px] font-bold text-gray-500 hover:text-blue-600 hover:underline inline-flex items-center"
                >
                  <Eye size={12} className="mr-1" /> Voir
                </a>
                <span className="text-gray-200 text-[11px] font-bold">|</span>
                <a 
                  href={getDownloadUrl(docUrl)} 
                  className="text-[11px] font-bold text-blue-600 hover:underline inline-flex items-center"
                >
                  <Download size={12} className="mr-1" /> Télécharger
                </a>
              </div>
            </div>
          </div>
        ) : (
          <label className="mt-2 border-2 border-dashed border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center bg-white cursor-pointer hover:border-blue-400 hover:bg-blue-50/20 transition-all text-gray-400 group">
            <Upload size={18} className="mb-1 group-hover:text-blue-500 transition-colors" />
            <span className="text-[10px] font-bold uppercase tracking-wider group-hover:text-blue-600">Ajouter (PDF uniquement)</span>
            <input 
              type="file" 
              className="hidden" 
              accept=".pdf" 
              onChange={(e) => handleDocUpload(e, fieldName)} 
            />
          </label>
        )}
      </div>
    );
  };

  const propertyTypes: { value: PropertyType; label: string; icon: string }[] = [
    { value: 'villa', label: 'Villa', icon: '🏡' },
    { value: 'apartment', label: 'Appartement', icon: '🏢' },
    { value: 'land', label: 'Terrain', icon: '🌳' },
    { value: 'commercial', label: 'Local Commercial', icon: '🏬' },
    { value: 'depot', label: 'Dépôt', icon: '🏭' },
    { value: 'studio', label: 'Studio', icon: '🛋️' },
    { value: 'duplex', label: 'Duplex', icon: '🏘️' },
    { value: 'triplex', label: 'Triplex', icon: '🏘️' },
    { value: 'penthouse', label: 'Penthouse', icon: '✨' },
    { value: 'commerce', label: 'Commerce', icon: '🏪' },
  ];

  const features = [
    { id: 'heating', label: 'Chauffage Central', icon: <Flame size={18} /> },
    { id: 'airConditioning', label: 'Climatisation Central', icon: <Wind size={18} /> },
    { id: 'pool', label: 'Piscine', icon: <Waves size={18} /> },
    { id: 'garden', label: 'Jardin', icon: <Trees size={18} /> },
    { id: 'parking', label: 'Parking', icon: <CarIcon size={18} /> },
    { id: 'security', label: 'Sécurité 24/7', icon: <Shield size={18} /> },
  ];

  return createPortal(
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">

      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col scale-in">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{isEditing ? 'Modifier la Propriété' : 'Ajouter une Propriété'}</h3>
            <p className="text-sm text-gray-500 mt-1">Veuillez remplir les informations ci-dessous.</p>
          </div>
          <button
            onClick={() => setShowModal(false)}
            className="bg-gray-50 p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
          {/* Interception backdrop inside the form container to close custom dropdowns */}
          {(isVilleOpen || isTypeOpen || isStatusOpen) && (
            <div 
              className="absolute inset-0 z-20 bg-transparent cursor-default" 
              onClick={() => {
                setIsVilleOpen(false);
                setIsTypeOpen(false);
                setIsStatusOpen(false);
              }} 
            />
          )}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left Column (Main Info) */}
            <div className="lg:col-span-7 space-y-8">
              {/* Basic Details */}
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-2 flex items-center">
                    <span className="mr-2 text-lg">⌨️</span> Titre du bien
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.title || ''}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all shadow-sm placeholder-gray-400 font-medium"
                    placeholder="Ex: Villa moderne S+4 suites"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-bold text-gray-700 mb-2 flex items-center">
                      <span className="mr-2 text-lg">💰</span> Prix (TND)
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.price ? formData.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") : ''}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        setFormData({ ...formData, price: val ? Number(val) : 0 });
                      }}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all shadow-sm font-bold"
                      placeholder="1 200 000"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-gray-700 mb-2 flex items-center">
                      <span className="mr-2 text-lg">🔄</span> Type
                    </label>
                    <div className="grid grid-cols-2 gap-3 p-1 bg-gray-50 rounded-xl border border-gray-150 h-[48px] items-center">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, listingType: 'sale' })}
                        className={`py-2 rounded-lg text-sm font-bold transition-all h-[38px] flex items-center justify-center ${formData.listingType === 'sale' || !formData.listingType ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-white hover:text-gray-700'}`}
                      >
                        Ventes
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, listingType: 'rent' })}
                        className={`py-2 rounded-lg text-sm font-bold transition-all h-[38px] flex items-center justify-center ${formData.listingType === 'rent' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-white hover:text-gray-700'}`}
                      >
                        Locations
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-700 mb-3 flex items-center">
                    <span className="mr-2 text-lg">📊</span> Type de prix
                  </label>
                  <div className="grid grid-cols-2 gap-3 p-1 bg-gray-50 rounded-xl border border-gray-100">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, priceType: 'total' })}
                      className={`py-2.5 rounded-lg text-sm font-bold transition-all ${formData.priceType === 'total' || !formData.priceType ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-white hover:text-gray-700'}`}
                    >
                      Prix total
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, priceType: 'per_m2' })}
                      className={`py-2.5 rounded-lg text-sm font-bold transition-all ${formData.priceType === 'per_m2' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-white hover:text-gray-700'}`}
                    >
                      Prix/m²
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className={`relative ${isTypeOpen ? 'z-30' : 'z-10'}`}>
                    <label className="text-sm font-bold text-gray-700 mb-2 flex items-center">
                      <span className="mr-2 text-lg">🏠</span> Type de bien
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsTypeOpen(!isTypeOpen)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all shadow-sm flex items-center justify-between cursor-pointer font-medium h-[48px]"
                    >
                      <span className="flex items-center gap-2">
                        {(() => {
                          const currentType = propertyTypes.find(t => t.value === formData.type);
                          return currentType ? (
                            <>
                              <span>{currentType.icon}</span>
                              <span>{currentType.label}</span>
                            </>
                          ) : (
                            'Sélectionner...'
                          );
                        })()}
                      </span>
                      <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${isTypeOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isTypeOpen && (
                      <div className="absolute z-30 mt-2 w-full bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="max-h-60 overflow-y-auto custom-scrollbar p-1.5">
                          {propertyTypes.map(t => (
                            <button
                              key={t.value}
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, type: t.value });
                                setIsTypeOpen(false);
                              }}
                              className={`w-full px-4 py-2.5 rounded-lg text-left text-sm transition-all duration-200 flex items-center justify-between group ${
                                formData.type === t.value
                                  ? 'bg-blue-50 text-blue-600 font-bold'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <span>{t.icon}</span>
                                <span>{t.label}</span>
                              </span>
                              {formData.type === t.value && <Check size={16} className="text-blue-600 animate-in zoom-in" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className={`relative ${isStatusOpen ? 'z-30' : 'z-10'}`}>
                    <label className="text-sm font-bold text-gray-700 mb-2 flex items-center">
                      <span className="mr-2 text-lg">📌</span> Statut
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsStatusOpen(!isStatusOpen)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all shadow-sm flex items-center justify-between cursor-pointer font-medium h-[48px]"
                    >
                      <span className="flex items-center gap-2">
                        {(() => {
                          const statusLabels: Record<string, { label: string; colorClass: string }> = {
                            available: { label: 'Disponible', colorClass: 'bg-green-100 text-green-700' },
                            pending: { label: 'En attente', colorClass: 'bg-amber-100 text-amber-700' },
                            sold: { label: 'Vendu', colorClass: 'bg-red-100 text-red-700' },
                            rented: { label: 'Loué', colorClass: 'bg-orange-100 text-orange-700' },
                          };
                          const currentStatus = statusLabels[formData.status || 'available'];
                          return (
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${currentStatus.colorClass}`}>
                              {currentStatus.label}
                            </span>
                          );
                        })()}
                      </span>
                      <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${isStatusOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isStatusOpen && (
                      <div className="absolute z-30 mt-2 w-full bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-1.5">
                          {[
                            { value: 'available', label: 'Disponible', colorClass: 'bg-green-100 text-green-700' },
                            { value: 'pending', label: 'En attente', colorClass: 'bg-amber-100 text-amber-700' },
                            { value: 'sold', label: 'Vendu', colorClass: 'bg-red-100 text-red-700' },
                            { value: 'rented', label: 'Loué', colorClass: 'bg-orange-100 text-orange-700' },
                          ].map(status => (
                            <button
                              key={status.value}
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, status: status.value as any });
                                setIsStatusOpen(false);
                              }}
                              className={`w-full px-4 py-2.5 rounded-lg text-left text-sm transition-all duration-200 flex items-center justify-between group ${
                                (formData.status || 'available') === status.value
                                  ? 'bg-blue-50 text-blue-600 font-bold'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${status.colorClass}`}>
                                {status.label}
                              </span>
                              {(formData.status || 'available') === status.value && <Check size={16} className="text-blue-600 animate-in zoom-in" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-bold text-gray-700 mb-2 flex items-center">
                      <span className="mr-2 text-lg">📏</span> Surface (m²)
                    </label>
                    <input
                      type="number"
                      value={formData.features?.area || ''}
                      onChange={e => setFormData({ ...formData, features: { ...formData.features!, area: Number(e.target.value) } })}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all shadow-sm"
                    />
                  </div>
                  {formData.type === 'land' ? (
                    <>
                      <div>
                        <label className="text-sm font-bold text-gray-700 mb-2 flex items-center">
                          <span className="mr-2 text-lg">🏗️</span> Vocation
                        </label>
                        <input
                          type="text"
                          value={formData.features?.vocation || ''}
                          onChange={e => setFormData({ ...formData, features: { ...formData.features!, vocation: e.target.value } })}
                          placeholder="Ex: R+2, Commercial"
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all shadow-sm font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-gray-700 mb-2 flex items-center">
                          <span className="mr-2 text-lg">📊</span> COS
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.features?.cos || ''}
                          onChange={e => setFormData({ ...formData, features: { ...formData.features!, cos: e.target.value !== '' ? Number(e.target.value) : '' } })}
                          placeholder="Ex: 0.8"
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all shadow-sm font-medium"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="text-sm font-bold text-gray-700 mb-2 flex items-center">
                          <span className="mr-2 text-lg">🛏️</span> Chambres
                        </label>
                        <input
                          type="number"
                          value={formData.features?.bedrooms || ''}
                          onChange={e => setFormData({ ...formData, features: { ...formData.features!, bedrooms: Number(e.target.value) } })}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all shadow-sm"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-gray-700 mb-2 flex items-center">
                          <span className="mr-2 text-lg">🚿</span> SDB
                        </label>
                        <input
                          type="number"
                          value={formData.features?.bathrooms || ''}
                          onChange={e => setFormData({ ...formData, features: { ...formData.features!, bathrooms: Number(e.target.value) } })}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all shadow-sm"
                        />
                      </div>
                    </>
                  )}
                </div>


                <div>
                  <label className="text-sm font-bold text-gray-700 mb-2 flex items-center">
                    <span className="mr-2 text-lg">✍️</span> Description
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all shadow-sm h-32 resize-none font-medium leading-relaxed"
                    placeholder="Description détaillée du bien..."
                  />
                </div>
              </div>

              {/* Features Grid */}
              <div>
                <h4 className="text-base font-bold text-gray-900 mb-4">Caractéristiques</h4>
                <div className="grid grid-cols-2 gap-4">
                  {features.map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        features: { ...formData.features!, [f.id]: !(formData.features as any)[f.id] }
                      })}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${(formData.features as any)[f.id]
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200 hover:bg-gray-100'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={(formData.features as any)[f.id] ? 'text-green-600' : 'text-gray-400'}>
                          {f.icon}
                        </span>
                        <span className="text-sm font-bold">{f.label}</span>
                      </div>
                      {(formData.features as any)[f.id] && <Check size={18} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Options */}
              <div>
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Options</h4>
                <div className="flex flex-wrap gap-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={formData.isNew}
                        onChange={e => setFormData({ ...formData, isNew: e.target.checked })}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 border-2 rounded transition-all flex items-center justify-center ${formData.isNew ? 'bg-blue-600 border-blue-600 shadow-sm' : 'border-gray-300 bg-white group-hover:border-blue-400'}`}>
                        {formData.isNew && <Check size={12} className="text-white stroke-[3px]" />}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gray-700">Nouveauté</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={formData.isFeatured}
                        onChange={e => setFormData({ ...formData, isFeatured: e.target.checked })}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 border-2 rounded transition-all flex items-center justify-center ${formData.isFeatured ? 'bg-purple-600 border-purple-600 shadow-sm' : 'border-gray-300 bg-white group-hover:border-purple-400'}`}>
                        {formData.isFeatured && <Check size={12} className="text-white stroke-[3px]" />}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gray-700">Exclusivité</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={formData.isHotDeal}
                        onChange={e => setFormData({ ...formData, isHotDeal: e.target.checked })}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 border-2 rounded transition-all flex items-center justify-center ${formData.isHotDeal ? 'bg-red-500 border-red-500 shadow-sm' : 'border-gray-300 bg-white group-hover:border-red-400'}`}>
                        {formData.isHotDeal && <Check size={12} className="text-white stroke-[3px]" />}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gray-700">Promotion</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column (Map & Photos) */}
            <div className="lg:col-span-5 space-y-8">
              {/* Location & Map */}
              <div className="space-y-6">
                <div className={`relative ${isVilleOpen ? 'z-30' : 'z-10'}`}>
                  <label className="text-sm font-bold text-gray-700 mb-2 flex items-center">
                    <span className="mr-2 text-lg">📍</span> Ville
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsVilleOpen(!isVilleOpen)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all shadow-sm flex items-center justify-between cursor-pointer font-medium h-[48px]"
                  >
                    <span className="text-gray-900">
                      {formData.location?.city || 'Sélectionner une ville...'}
                    </span>
                    <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${isVilleOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isVilleOpen && (
                    <div className="absolute z-30 mt-2 w-full bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      <div className="max-h-60 overflow-y-auto custom-scrollbar p-1.5">
                        {availableLocations.map(city => (
                          <button
                            key={city}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, location: { ...formData.location!, city } });
                              setIsVilleOpen(false);
                            }}
                            className={`w-full px-4 py-2.5 rounded-lg text-left text-sm transition-all duration-200 flex items-center justify-between group ${
                              formData.location?.city === city
                                ? 'bg-blue-50 text-blue-600 font-bold'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <span>{city}</span>
                            {formData.location?.city === city && <Check size={16} className="text-blue-600 animate-in zoom-in" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <span className="text-lg">🌍</span> Localisation Map
                    <span className="text-[10px] text-blue-500 font-normal ml-2 uppercase tracking-tighter">(Cliquez sur la carte pour définir la position)</span>
                  </label>
                  <div 
                    onWheel={e => e.stopPropagation()}
                    onTouchStart={e => e.stopPropagation()}
                    onTouchMove={e => e.stopPropagation()}
                    onTouchEnd={e => e.stopPropagation()}
                    className="h-[340px] w-full rounded-2xl overflow-hidden border border-gray-200 relative z-0 shadow-inner bg-gray-50"
                  >
                    <MapContainer
                      center={[formData.location?.lat || 36.8065, formData.location?.lng || 10.1815]}
                      zoom={14}
                      scrollWheelZoom={true}
                      dragging={true}
                      style={{ height: '100%', width: '100%', zIndex: 0 }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Circle
                        center={[formData.location?.lat || 36.8065, formData.location?.lng || 10.1815]}
                        radius={150}
                        pathOptions={{ color: '#2563EB', fillColor: '#3B82F6', fillOpacity: 0.3, weight: 3 }}
                      />
                      <MapUpdater
                        lat={formData.location?.lat || 36.8065}
                        lng={formData.location?.lng || 10.1815}
                        onMapClick={onLocationChange}
                      />
                    </MapContainer>
                  </div>
                </div>
              </div>

              {/* Photo Gallery */}
              <div className="space-y-4">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <span className="text-lg">📷</span> Galerie Photos
                </label>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={formData.images || []}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="grid grid-cols-3 gap-3">
                      {formData.images?.map((img, i) => (
                        <SortableImage
                          key={img}
                          url={img}
                          index={i}
                          onRemove={removeImage}
                        />
                      ))}

                      {/* Upload Button Placeholder */}
                      <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 bg-gray-50 hover:bg-gray-100 hover:border-blue-400 transition-all cursor-pointer group">
                        <Upload size={24} className="mb-2 group-hover:text-blue-500 group-hover:scale-110 transition-all" />
                        <span className="text-[10px] font-bold uppercase tracking-wider group-hover:text-blue-600">{formData.images?.length || 0}</span>
                        <input type="file" multiple className="hidden" onChange={handleImageUpload} accept="image/*" />
                      </label>
                    </div>
                  </SortableContext>
                </DndContext>

                <div className="pt-2">
                  <label className="w-full flex items-center justify-center gap-2 py-3.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all cursor-pointer shadow-sm">
                    <Upload size={18} />
                    Ajouter des photos (PC)
                    <input type="file" multiple className="hidden" onChange={handleImageUpload} accept="image/*" />
                  </label>
                </div>
              </div>

              {/* Documents Section */}
              <div className="space-y-4 pt-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <span className="text-lg">📑</span> Documents officiels (Optionnel)
                </label>
                <div className="grid grid-cols-1 gap-4">
                  {renderDocBox('Plan de la propriété', 'propertyPlan', 'Format: PDF uniquement')}
                  {renderDocBox("Titre bleu / Papier de propriété", 'ownerPaper', 'Format: PDF uniquement')}
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-8 py-6 border-t border-gray-100 flex justify-end items-center space-x-4 bg-gray-50/50">
          <button
            type="button"
            onClick={() => setShowModal(false)}
            className="px-6 py-3 text-gray-600 font-bold hover:bg-white hover:text-gray-900 rounded-xl transition-all"
          >
            Annuler
          </button>
          <button
            type="submit"
            onClick={handleSave}
            className="px-10 py-3.5 bg-blue-600 text-white font-bold rounded-xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 hover:shadow-blue-500/40 transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center"
          >
            {isEditing ? (
              <><RefreshCw size={18} className="mr-2" /> Mettre à jour</>
            ) : (
              <><Plus size={18} className="mr-2" /> Enregistrer</>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PropertyModal;
