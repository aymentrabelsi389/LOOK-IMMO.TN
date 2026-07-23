
import React, { useState, memo } from 'react';
import { 
  Plus, Edit, Trash2, MapPin, GripVertical, ChevronLeft, ChevronRight, List, X
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { locationsAPI } from '@/services/api';

interface SortableLocationRowProps {
  loc: any;
  index: number;
  openEditModal: (index: number) => void;
  confirmDelete: (index: number) => void;
}

const SortableLocationRow: React.FC<SortableLocationRowProps> = memo(({ loc, index, openEditModal, confirmDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: loc.id });
  const style = { 
    transform: CSS.Transform.toString(transform), 
    transition, 
    zIndex: isDragging ? 10 : 1, 
    position: 'relative' as const, 
    opacity: isDragging ? 0.5 : 1 
  };
  
  return (
    <tr ref={setNodeRef} style={style} className="group hover:bg-blue-50/30 transition-all duration-200 cursor-default border-b border-transparent hover:border-gray-100">
      <td className="px-8 py-5">
        <div className="flex items-center">
          <button {...attributes} {...listeners} className="p-1 mr-4 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing focus:outline-none shrink-0 touch-none">
            <GripVertical size={16} />
          </button>
          <span className="text-xs font-bold text-gray-400">{index + 1}</span>
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-brand-teal mr-4 group-hover:bg-white group-hover:shadow-sm transition-all">
            <MapPin size={20} />
          </div>
          <span className="font-black text-gray-900 group-hover:text-brand-dark transition-colors">{loc.name}</span>
        </div>
      </td>
      <td className="px-8 py-5 text-right">
        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={(e) => { e.stopPropagation(); openEditModal(index); }} 
            className="p-2.5 bg-white border border-gray-200 text-gray-400 rounded-xl hover:text-brand-dark hover:shadow-sm transition-all" 
            title="Modifier"
          >
            <Edit size={18} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); confirmDelete(index); }} 
            className="p-2.5 bg-white border border-gray-200 text-gray-400 rounded-xl hover:text-red-500 hover:shadow-sm transition-all" 
            title="Supprimer"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </td>
    </tr>
  );
});

// --- Mobile Card Component ---
const SortableLocationCard = memo(({ loc, index, openEditModal, confirmDelete }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: loc.id });
  const style = { 
    transform: CSS.Transform.toString(transform), 
    transition, 
    zIndex: isDragging ? 10 : 1, 
    opacity: isDragging ? 0.5 : 1 
  };

  return (
    <div ref={setNodeRef} style={style} className="p-5 bg-white space-y-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button {...attributes} {...listeners} className="p-2 -ml-2 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none">
            <GripVertical size={20} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-brand-teal">
            <MapPin size={20} />
          </div>
          <div>
            <h4 className="text-sm font-black text-gray-900">{loc.name}</h4>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Position #{index + 1}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => openEditModal(index)} className="p-2 text-gray-400 hover:text-brand-dark transition-colors">
            <Edit size={18} />
          </button>
          <button onClick={() => confirmDelete(index)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
});

interface LocationsManagementProps {
  availableLocations: string[];
  setAvailableLocations: React.Dispatch<React.SetStateAction<string[]>>;
  adminLocations: any[];
  setAdminLocations: React.Dispatch<React.SetStateAction<any[]>>;
  showNotification: any;
}

const LocationsManagement = ({
  availableLocations,
  setAvailableLocations,
  adminLocations,
  setAdminLocations,
  showNotification
}: LocationsManagementProps) => {
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocationIndex, setEditingLocationIndex] = useState<number | null>(null);
  const [locationInput, setLocationInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showAll, setShowAll] = useState(false);

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

  const openAddModal = () => {
    setEditingLocationIndex(null);
    setLocationInput('');
    setShowLocationModal(true);
  };

  const openEditModal = (index: number) => {
    setEditingLocationIndex(index);
    setLocationInput(availableLocations[index]);
    setShowLocationModal(true);
  };

  const handleSaveLocation = async () => {
    if (!locationInput.trim()) return;

    try {
      if (editingLocationIndex !== null) {
        // Edit existing
        const locToUpdate = adminLocations[editingLocationIndex];
        if (locToUpdate) {
          await locationsAPI.update(locToUpdate.id, { name: locationInput.trim() });
          const allLocs = await locationsAPI.getAll();
          setAdminLocations(allLocs);
          setAvailableLocations(allLocs.map((l: any) => l.name));
          showNotification('success', 'Localisation modifiée');
        }
      } else {
        // Add new
        await locationsAPI.create({ name: locationInput.trim(), centerLat: 0, centerLng: 0, radius: 10 });
        const allLocs = await locationsAPI.getAll(); // Refetch to sync
        setAdminLocations(allLocs);
        setAvailableLocations(allLocs.map((l: any) => l.name));
        showNotification('success', 'Localisation ajoutée');
      }
      setShowLocationModal(false);
      setLocationInput('');
    } catch (e) {
      console.error("Failed to save location", e);
      showNotification('error', 'Erreur lors de la sauvegarde');
    }
  };

  const confirmDelete = (index: number) => {
    setDeleteIndex(index);
    setShowDeleteConfirm(true);
  };

  const handleDeleteLocation = async () => {
    if (deleteIndex !== null) {
      try {
        const locToDelete = adminLocations[deleteIndex];

        if (locToDelete) {
          await locationsAPI.delete(locToDelete.id);
          const allLocs = await locationsAPI.getAll();
          setAdminLocations(allLocs);
          setAvailableLocations(allLocs.map((l: any) => l.name));
          showNotification('success', 'Localisation supprimée');
        } else {
          // Fallback if not found
          setAvailableLocations(availableLocations.filter((_, i) => i !== deleteIndex));
        }
      } catch (e) {
        console.error("Failed to delete location", e);
        showNotification('error', 'Erreur suppression');
      }
    }
    setShowDeleteConfirm(false);
    setDeleteIndex(null);
  };

  const handleDragEndLocation = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = adminLocations.findIndex((i: any) => i.id === active.id);
    const newIndex = adminLocations.findIndex((i: any) => i.id === over.id);
    const newItems = arrayMove(adminLocations, oldIndex, newIndex);

    setAdminLocations(newItems);

    const updates = newItems.map((loc: any, index: number) => ({
      id: loc.id,
      displayOrder: index
    }));

    try {
      await locationsAPI.updateOrder(updates);
      showNotification('success', 'Ordre mis à jour');
      setAvailableLocations(newItems.map((l: any) => l.name));
    } catch (err: any) {
      console.error(err);
      showNotification('error', 'Erreur de réorganisation');
    }
  };

  const totalPages = Math.ceil(adminLocations.length / itemsPerPage);
  const paginatedLocations = showAll ? adminLocations : adminLocations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <>
      <div className="space-y-6 animate-fade-in-up">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Localisations</h1>
          <p className="text-sm text-gray-500 mt-1">Gérez les localisations disponibles pour le moteur de recherche</p>
        </div>
        <button
          onClick={openAddModal}
          className="w-full md:w-auto flex items-center justify-center px-6 py-3 bg-brand-dark text-white text-sm font-bold rounded-xl shadow-lg shadow-brand-dark/20 hover:bg-brand-primary transition-all active:scale-95 shrink-0"
        >
          <Plus size={18} className="mr-2" />
          Ajouter une Ville
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndLocation}>
          
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50/50">
                <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-8 py-5 w-24">Ordre</th>
                  <th className="px-6 py-5">Nom de la Ville</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <SortableContext items={paginatedLocations.map(l => l.id)} strategy={verticalListSortingStrategy}>
                <tbody className="divide-y divide-gray-50">
                  {paginatedLocations.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                          <MapPin size={64} className="text-gray-100 mb-6" />
                          <h3 className="text-xl font-black text-gray-900 mb-2">Aucune ville</h3>
                          <p className="text-gray-500 text-sm mb-8">Commencez par ajouter votre première localisation pour le moteur de recherche.</p>
                          <button
                            onClick={openAddModal}
                            className="px-8 py-3 bg-brand-dark text-white font-bold rounded-xl shadow-lg shadow-brand-dark/20 hover:bg-brand-primary transition-all"
                          >
                            Ajouter une ville
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedLocations.map((loc, index) => (
                      <SortableLocationRow 
                        key={loc.id} 
                        loc={loc} 
                        index={showAll ? index : (currentPage - 1) * itemsPerPage + index} 
                        openEditModal={() => openEditModal(showAll ? index : (currentPage - 1) * itemsPerPage + index)}
                        confirmDelete={() => confirmDelete(showAll ? index : (currentPage - 1) * itemsPerPage + index)}
                      />
                    ))
                  )}
                </tbody>
              </SortableContext>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-100">
            <SortableContext items={paginatedLocations.map(l => l.id)} strategy={verticalListSortingStrategy}>
              {paginatedLocations.length === 0 ? (
                <div className="p-16 text-center">
                  <MapPin size={48} className="mx-auto text-gray-100 mb-4" />
                  <p className="text-sm font-bold text-gray-400">Aucune ville trouvée</p>
                </div>
              ) : (
                paginatedLocations.map((loc, index) => (
                  <SortableLocationCard 
                    key={loc.id} 
                    loc={loc} 
                    index={showAll ? index : (currentPage - 1) * itemsPerPage + index} 
                    openEditModal={() => openEditModal(showAll ? index : (currentPage - 1) * itemsPerPage + index)}
                    confirmDelete={() => confirmDelete(showAll ? index : (currentPage - 1) * itemsPerPage + index)}
                  />
                ))
              )}
            </SortableContext>
          </div>

        </DndContext>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-100 bg-white flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xs text-gray-500 font-medium">
            Affichage de <span className="font-bold text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> à <span className="font-bold text-gray-900">{Math.min(currentPage * itemsPerPage, adminLocations.length)}</span> sur <span className="font-bold text-gray-900">{adminLocations.length}</span>
          </div>

          <div className="flex items-center gap-3">
            {adminLocations.length > itemsPerPage && (
              <button
                onClick={() => setShowAll(!showAll)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border transition-all shadow-sm mr-2 ${
                  showAll 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-blue-200' 
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <List size={14} />
                {showAll ? 'Pagination' : 'Afficher tout'}
              </button>
            )}

            {!showAll && totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:bg-gray-50 disabled:opacity-30 transition"
                >
                  <ChevronLeft size={16} />
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-[32px] h-8 px-2 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                      currentPage === page
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                        : 'text-gray-600 hover:bg-gray-50 border border-transparent hover:border-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:bg-gray-50 disabled:opacity-30 transition"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

      {/* Modals */}

      {/* Modal Ajout/Modification */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowLocationModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col scale-100 animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-xl text-gray-900">{editingLocationIndex !== null ? 'Modifier la ville' : 'Ajouter une ville'}</h3>
              <button onClick={() => setShowLocationModal(false)} aria-label="Fermer" className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nom de la localisation</label>
                <div className="relative">
                  <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-teal focus:bg-white transition-all font-bold text-gray-900 shadow-sm"
                    placeholder="Ex: La Marsa, Gammarth..."
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-5 bg-gray-50/50 border-t border-gray-100 flex gap-3">
              <button onClick={() => setShowLocationModal(false)} className="flex-1 py-3 text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl font-bold text-sm transition shadow-sm">
                Annuler
              </button>
              <button 
                onClick={handleSaveLocation} 
                className="flex-1 py-3 bg-brand-dark text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-dark/20 hover:bg-brand-primary transition-all active:scale-95"
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Suppression */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 text-center animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
              <Trash2 size={40} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Supprimer ?</h3>
            <p className="text-gray-500 text-sm mb-8">Cette action retirera définitivement cette ville des filtres de recherche.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition shadow-sm">
                Annuler
              </button>
              <button onClick={handleDeleteLocation} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LocationsManagement;
