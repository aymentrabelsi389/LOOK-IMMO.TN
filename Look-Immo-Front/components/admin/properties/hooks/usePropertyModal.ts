import React, { useState } from 'react';
import { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Property } from '@/types';
import { uploadAPI } from '@/services/api';

interface UsePropertyModalProps {
  formData: Partial<Property>;
  setFormData: (data: Partial<Property>) => void;
  onImagesReorder: (newImages: string[]) => void;
}

export function usePropertyModal({
  formData,
  setFormData,
  onImagesReorder
}: UsePropertyModalProps) {
  const [isVilleOpen, setIsVilleOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

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

  return {
    isVilleOpen,
    setIsVilleOpen,
    isTypeOpen,
    setIsTypeOpen,
    isStatusOpen,
    setIsStatusOpen,
    handleDragEnd,
    handleDocUpload
  };
}
