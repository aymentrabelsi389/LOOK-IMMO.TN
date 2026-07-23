import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Property, PropertyType, Appointment, ClientDemand } from '@/types';
import { propertiesAPI, uploadAPI, appointmentsAPI } from '@/services/api';
import { useData } from '@/context/DataContext';
import { notify } from '@/services/notificationStore';
import { useConfirm } from '@/context/ConfirmContext';

interface UsePropertiesManagementProps {
  properties: Property[];
  setProperties: React.Dispatch<React.SetStateAction<Property[]>>;
  availableLocations: string[];
  showNotification: (type: 'success' | 'error' | 'info' | 'warning', message: string, options?: { duration?: number }) => void;
  clientDemands?: ClientDemand[];
}

export function usePropertiesManagement({
  properties,
  setProperties,
  availableLocations,
  showNotification,
  clientDemands = []
}: UsePropertiesManagementProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { appointments, setAppointments } = useData();
  const { confirm } = useConfirm();
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [historyProperty, setHistoryProperty] = useState<Property | null>(null);
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');

  const handleUpdateStatus = async (id: string, newStatus: Appointment['status']) => {
    try {
      await appointmentsAPI.update(id, { status: newStatus });
      setAppointments(prev => prev.map(apt =>
        apt.id === id ? { ...apt, status: newStatus } : apt
      ));
      showNotification('success', 'Statut du rendez-vous mis à jour');
    } catch (error) {
      console.error("Failed to update appointment status:", error);
      showNotification('error', 'Erreur de mise à jour');
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    const confirmed = await confirm({
      title: 'Supprimer le rendez-vous ?',
      message: 'Êtes-vous sûr de vouloir supprimer définitivement ce rendez-vous ? Cette action est irréversible.',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger'
    });
    if (confirmed) {
      try {
        await appointmentsAPI.delete(id);
        setAppointments(prev => prev.filter(apt => apt.id !== id));
        showNotification('success', 'Rendez-vous supprimé');
      } catch (error) {
        console.error("Failed to delete appointment:", error);
        showNotification('error', 'Erreur de suppression');
      }
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getUTCDate();
    const monthNames = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
    const month = monthNames[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    return `${day} ${month} ${year}`;
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [propertyCityFilter, setPropertyCityFilter] = useState<string | 'all'>('all');
  const [propertySearchQuery, setPropertySearchQuery] = useState('');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<PropertyType | 'all'>('all');
  const [propertyCurrentPage, setPropertyCurrentPage] = useState(1);
  const [isAdminShowAll, setIsAdminShowAll] = useState(false);
  const propertiesPerPage = 10;
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Dynamic robust fallback: Extract cities from properties if DB is empty or missing cities
  const computedCities = useMemo(() => {
    const list = [...availableLocations];
    properties.forEach(p => {
      const city = p.location?.city || (p as unknown as { city?: string }).city;
      if (city && !list.includes(city)) {
        list.push(city);
      }
    });
    return list.sort();
  }, [availableLocations, properties]);

  const cityOptions = useMemo(() => {
    return [
      { value: 'all', label: 'Toutes les villes' },
      ...computedCities.map(city => ({ value: city, label: city }))
    ];
  }, [computedCities]);

  const typeOptions = [
    { value: 'all', label: 'Tous les types' },
    { value: 'apartment', label: 'Appartement' },
    { value: 'villa', label: 'Villa' },
    { value: 'land', label: 'Terrain' },
    { value: 'duplex', label: 'Duplex' },
    { value: 'triplex', label: 'Triplex' },
    { value: 'penthouse', label: 'Penthouse' },
    { value: 'studio', label: 'Studio' },
    { value: 'depot', label: 'Dépôt' },
    { value: 'commercial', label: 'Local Commercial' }
  ];

  const initialPropertyState: Partial<Property> = {
    title: '', price: 0, priceType: 'total', type: 'villa', listingType: 'sale', description: '',
    isNew: false, isFeatured: false, isHotDeal: false, status: 'available',
    location: { city: '', address: '', lat: 36.8065, lng: 10.1815 },
    features: { bedrooms: 0, bathrooms: 0, area: 0, parking: false, pool: false, garden: false, heating: false, airConditioning: false, security: false },
    images: [],
    ownerPhone: ''
  };
  const [formData, setFormData] = useState<Partial<Property>>(initialPropertyState);
  const [gpsInput, setGpsInput] = useState('');

  const openAddModal = () => { setIsEditing(false); setEditingId(null); setFormData(initialPropertyState); setShowModal(true); };

  useEffect(() => {
    if (location.state && (location.state as { action?: string }).action === 'new-property') {
      openAddModal();
      navigate(location.pathname, { replace: true, state: { ...location.state, action: undefined } });
    }
  }, [location.state, location.pathname, navigate]);

  const openEditModal = useCallback(async (p: Property) => {
    setIsEditing(true);
    setEditingId(p.id);
    setFormData({ ...p, isFeatured: p.isFeatured === true, isNew: p.isNew === true });
    setShowModal(true);
    try {
      const fullProperty = await propertiesAPI.getById(p.id);
      setFormData({
        ...fullProperty,
        isFeatured: fullProperty.isFeatured === true,
        isNew: fullProperty.isNew === true,
        features: fullProperty.features || { bedrooms: 0, bathrooms: 0, area: 0, parking: false, pool: false, garden: false, heating: false, airConditioning: false, security: false },
        images: fullProperty.images || [],
      });
    } catch (err) {
      console.error('Failed to load full property for edit:', err);
    }
  }, []);

  const handleDelete = (id: string) => { setDeleteConfirmId(id); };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await propertiesAPI.delete(deleteConfirmId);
      setProperties(prev => prev.filter(p => p.id !== deleteConfirmId));
      showNotification('success', 'Propriété supprimée');
    } catch (error) {
      showNotification('error', 'Erreur de suppression');
    }
    setDeleteConfirmId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.price || !formData.location?.city) {
      showNotification('error', 'Veuillez remplir les champs obligatoires');
      return;
    }

    const payload = {
      ...formData,
      latitude: formData.location?.lat,
      longitude: formData.location?.lng,
      city: formData.location?.city,
      zone: formData.location?.address,
      category: formData.type,
      type: formData.listingType
    };

    try {
      if (isEditing && editingId) {
        const updated = await propertiesAPI.update(editingId, payload);
        setProperties(prev => prev.map(p => p.id === editingId ? updated : p));
        showNotification('success', 'Propriété mise à jour');
      } else {
        const newProperty = await propertiesAPI.create(payload);
        setProperties(prev => [newProperty, ...prev]);
        showNotification('success', 'Propriété ajoutée');

        if (clientDemands && clientDemands.length > 0) {
          const activeDemands = clientDemands.filter(d => d.status === 'searching' || d.status === 'contacted');
          const matchingDemands = activeDemands.filter(demand => {
            const typeMapping: Record<string, string[]> = {
              'appartement': ['apartment', 'studio', 'duplex', 'triplex', 'penthouse'],
              'villa': ['villa'],
              'terrain': ['land'],
              'bureau': ['commercial', 'depot'],
              'commerce': ['commerce', 'commercial']
            };

            const allowedTypes = typeMapping[demand.type] || [];
            const demandLoc = demand.location.toLowerCase();
            const areaMatch = demand.description.match(/(\d+)\s*m[2²]/);
            const requestedArea = areaMatch ? parseInt(areaMatch[1]) : null;

            let score = 0;
            if (allowedTypes.includes(newProperty.type)) {
              score += 40;
            } else {
              if (demand.type === 'appartement' && newProperty.type === 'villa') score += 5;
              if (demand.type === 'villa' && newProperty.type === 'apartment') score += 5;
            }

            if (demand.budget && demand.budget > 0) {
              const priceDiff = (newProperty.price - demand.budget) / demand.budget;
              if (priceDiff <= 0) score += 30;
              else if (priceDiff <= 0.1) score += 20;
              else if (priceDiff <= 0.2) score += 10;
            } else {
              score += 15;
            }

            const propCity = (newProperty.location?.city || '').toLowerCase();
            const propAddr = (newProperty.location?.address || '').toLowerCase();
            if (propCity && (propCity.includes(demandLoc) || demandLoc.includes(propCity))) {
              score += 20;
            } else if (propAddr && (propAddr.includes(demandLoc) || demandLoc.includes(propAddr))) {
              score += 12;
            }

            if (requestedArea && newProperty.features?.area) {
              const areaDiff = Math.abs(newProperty.features.area - requestedArea) / requestedArea;
              if (areaDiff <= 0.2) score += 10;
              else if (areaDiff <= 0.4) score += 5;
            }

            if (demand.priority === 'high') score += 5;

            return score >= 45;
          });

          if (matchingDemands.length > 0) {
            notify.success(
              `Opportunité : Ce nouveau bien correspond aux critères de ${matchingDemands.length} client(s) (${matchingDemands.map(d => d.clientName).join(', ')}).`,
              { duration: 8000 }
            );
          }
        }
      }
      setShowModal(false);
    } catch (error) {
      showNotification('error', 'Erreur d\'enregistrement');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const filesArray = Array.from(files) as File[];
      const total = filesArray.length;
      
      const toastId = notify.loading(`Préparation de ${total} image(s)...`, {
        progress: 0,
        filesCount: 0,
        totalFiles: total
      });
      
      try {
        const results: { url: string; srcset?: Record<string, string> }[] = [];
        
        for (let idx = 0; idx < filesArray.length; idx++) {
          let file = filesArray[idx];
          
          // Convert HEIC to JPEG if needed
          if (file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
            notify.update(toastId, { 
              message: `Conversion de ${file.name}...`,
              progress: Math.round((idx / total) * 100)
            });
            try {
              const heic2anyModule = await import('heic2any');
              const heic2anyFn = (heic2anyModule.default || heic2anyModule) as
                (options: { blob: File; toType: string; quality: number }) => Promise<Blob | Blob[]>;
              const convertedBlob = await heic2anyFn({
                blob: file,
                toType: 'image/jpeg',
                quality: 0.85
              }) as Blob | Blob[];
              
              const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
              
              file = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
                type: 'image/jpeg'
              });
            } catch (convError) {
              console.error('HEIC Conversion error:', convError);
            }
          }

          notify.update(toastId, { 
            message: `Téléchargement: ${idx + 1}/${total} image(s)...`,
            progress: Math.round(((idx + 0.5) / total) * 100),
            filesCount: idx
          });
          
          const result = await uploadAPI.uploadPropertyImage(file);
          results.push(result);
          
          notify.update(toastId, { 
            progress: Math.round(((idx + 1) / total) * 100),
            filesCount: idx + 1
          });
        }
        
        setFormData(prev => ({ ...prev, images: [...(prev.images || []), ...results.map(r => r.srcset ? JSON.stringify(r.srcset) : r.url)] }));
        notify.update(toastId, { 
          type: 'success', 
          message: `${results.length} image(s) ajoutée(s) avec succès`,
          progress: undefined,
          filesCount: undefined,
          totalFiles: undefined
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Erreur lors du téléchargement des images';
        notify.update(toastId, { 
          type: 'error', 
          message,
          progress: undefined,
          filesCount: undefined,
          totalFiles: undefined
        });
      }
    }
  };

  const handleImagesReorder = (newImages: string[]) => {
    setFormData(prev => ({ ...prev, images: newImages }));
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images?.filter((_, i) => i !== index)
    }));
  };

  const handleLocationChange = (lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      location: { ...prev.location!, lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) }
    }));
  };

  const filteredProperties = useMemo(() => {
    return properties.filter(p => {
      const city = p.location?.city || (p as unknown as { city?: string }).city || '';
      const matchesSearch = p.title.toLowerCase().includes(propertySearchQuery.toLowerCase()) || city.toLowerCase().includes(propertySearchQuery.toLowerCase());
      const matchesType = propertyTypeFilter === 'all' || p.type === propertyTypeFilter;
      const matchesCity = propertyCityFilter === 'all' || city === propertyCityFilter;
      return matchesSearch && matchesType && matchesCity;
    });
  }, [properties, propertySearchQuery, propertyTypeFilter, propertyCityFilter]);

  const sortedProperties = useMemo(() => {
    return [...filteredProperties].sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));
  }, [filteredProperties]);

  const paginatedProperties = useMemo(() => {
    return isAdminShowAll ? sortedProperties : sortedProperties.slice((propertyCurrentPage - 1) * propertiesPerPage, propertyCurrentPage * propertiesPerPage);
  }, [isAdminShowAll, sortedProperties, propertyCurrentPage, propertiesPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(sortedProperties.length / propertiesPerPage);
  }, [sortedProperties.length, propertiesPerPage]);

  // Drag-reorder is only safe when the full unfiltered list is visible.
  const isDragReorderEnabled = useMemo(() => {
    return propertyCityFilter === 'all' &&
      propertyTypeFilter === 'all' &&
      propertySearchQuery.trim() === '';
  }, [propertyCityFilter, propertyTypeFilter, propertySearchQuery]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    if (!isDragReorderEnabled) return;
    const oldIndex = sortedProperties.findIndex(p => p.id === active.id);
    const newIndex = sortedProperties.findIndex(p => p.id === over.id);
    const newOrder = arrayMove(sortedProperties, oldIndex, newIndex);
    const updates = newOrder.map((p, i) => ({ id: p.id, displayOrder: i + 1 }));
    setProperties(prev => prev.map(p => {
      const up = updates.find(u => u.id === p.id);
      return up ? { ...p, displayOrder: up.displayOrder } : p;
    }));
    await propertiesAPI.updateOrder(updates);
  };

  return {
    appointments,
    showModal,
    setShowModal,
    isEditing,
    historyProperty,
    setHistoryProperty,
    historyStatusFilter,
    setHistoryStatusFilter,
    handleUpdateStatus,
    handleDeleteAppointment,
    formatDate,
    propertyCityFilter,
    setPropertyCityFilter,
    propertySearchQuery,
    setPropertySearchQuery,
    propertyTypeFilter,
    setPropertyTypeFilter,
    propertyCurrentPage,
    setPropertyCurrentPage,
    isAdminShowAll,
    setIsAdminShowAll,
    propertiesPerPage,
    deleteConfirmId,
    setDeleteConfirmId,
    computedCities,
    cityOptions,
    typeOptions,
    formData,
    setFormData,
    gpsInput,
    setGpsInput,
    openAddModal,
    openEditModal,
    handleDelete,
    confirmDelete,
    handleSave,
    handleImageUpload,
    handleImagesReorder,
    removeImage,
    handleLocationChange,
    filteredProperties,
    sortedProperties,
    paginatedProperties,
    totalPages,
    isDragReorderEnabled,
    handleDragEnd
  };
}
