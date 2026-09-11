import React, { useState, useEffect } from 'react';
import { Property } from '@/types';
import { propertiesAPI, uploadAPI } from '@/services/api';
import { useData } from '@/context/DataContext';
import { useQueryClient } from '@tanstack/react-query';
import { notify } from '@/services/notificationStore';
import PropertyModal from '@/components/admin/PropertyModal';

interface AdminEditPropertyModalProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
  onPropertyUpdated?: (updated: Property) => void;
}

const buildInitialFormData = (p: Property): Partial<Property> => {
  const cleanFeatures: Partial<Property['features']> = p.features ? { ...p.features } : {};
  if (cleanFeatures.area === 0) delete cleanFeatures.area;
  if (cleanFeatures.bedrooms === 0) delete cleanFeatures.bedrooms;
  if (cleanFeatures.bathrooms === 0) delete cleanFeatures.bathrooms;

  return {
    ...p,
    isFeatured: p.isFeatured === true,
    isNew: p.isNew === true,
    features: {
      parking: false,
      pool: false,
      garden: false,
      heating: false,
      airConditioning: false,
      security: false,
      ...cleanFeatures
    },
    images: p.images || [],
    ownerPhone: p.ownerPhone || ''
  };
};

export const AdminEditPropertyModal: React.FC<AdminEditPropertyModalProps> = ({
  property,
  isOpen,
  onClose,
  onPropertyUpdated
}) => {
  const { availableLocations, setProperties } = useData();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<Partial<Property>>(() => buildInitialFormData(property));
  const [gpsInput, setGpsInput] = useState(() =>
    property.location?.lat && property.location?.lng
      ? `${property.location.lat}, ${property.location.lng}`
      : ''
  );
  const [formErrors, setFormErrors] = useState<{ title?: boolean; price?: boolean; city?: boolean }>({});

  useEffect(() => {
    if (isOpen && property) {
      setFormData(buildInitialFormData(property));
      setGpsInput(
        property.location?.lat && property.location?.lng
          ? `${property.location.lat}, ${property.location.lng}`
          : ''
      );
      setFormErrors({});

      propertiesAPI
        .getById(property.id)
        .then((full) => {
          setFormData(buildInitialFormData(full));
          if (full.location?.lat && full.location?.lng) {
            setGpsInput(`${full.location.lat}, ${full.location.lng}`);
          }
        })
        .catch((err) => console.error('Failed to load full property for modal:', err));
    }
  }, [isOpen, property]);

  const clearError = (field: 'title' | 'price' | 'city') => {
    setFormErrors((prev) => ({ ...prev, [field]: false }));
  };

  const handleLocationChange = (lat: number, lng: number) => {
    setFormData((prev) => ({
      ...prev,
      location: {
        ...(prev.location || { address: '', city: '' }),
        lat: parseFloat(lat.toFixed(6)),
        lng: parseFloat(lng.toFixed(6))
      }
    }));
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images?.filter((_, i) => i !== index)
    }));
  };

  const handleImagesReorder = (newImages: string[]) => {
    setFormData((prev) => ({ ...prev, images: newImages }));
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

        setFormData((prev) => ({
          ...prev,
          images: [...(prev.images || []), ...results.map((r) => (r.srcset ? JSON.stringify(r.srcset) : r.url))]
        }));

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { title?: boolean; price?: boolean; city?: boolean } = {};
    if (!formData.title) errors.title = true;
    if (!formData.price) errors.price = true;
    if (!formData.location?.city) errors.city = true;

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      notify.error('Veuillez remplir les champs obligatoires');
      return;
    }

    if (formData.ownerPhone) {
      const phoneDigits = formData.ownerPhone.replace(/\D/g, '');
      if (phoneDigits.length > 0 && phoneDigits.length < 8) {
        notify.error('Le numéro de téléphone du propriétaire doit contenir au moins 8 chiffres');
        return;
      }
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
      const updated = await propertiesAPI.update(property.id, payload);
      setProperties((prev) => prev.map((p) => (p.id === property.id ? updated : p)));
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      notify.success('Propriété mise à jour avec succès');
      onPropertyUpdated?.(updated);
      onClose();
    } catch {
      notify.error("Erreur lors de l'enregistrement de la propriété");
    }
  };

  if (!isOpen) return null;

  return (
    <PropertyModal
      showModal={isOpen}
      setShowModal={(show) => {
        if (!show) onClose();
      }}
      isEditing={true}
      formData={formData}
      setFormData={setFormData}
      gpsInput={gpsInput}
      setGpsInput={setGpsInput}
      availableLocations={availableLocations}
      handleSave={handleSave}
      handleImageUpload={handleImageUpload}
      removeImage={removeImage}
      onImagesReorder={handleImagesReorder}
      onLocationChange={handleLocationChange}
      errors={formErrors}
      clearError={clearError}
    />
  );
};

export default AdminEditPropertyModal;
