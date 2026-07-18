import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  GripVertical, MapPin, Star, Edit, Trash2, Search, Plus,
  ChevronLeft, ChevronRight, X, Image as ImageIcon, List, ChevronDown,
  FileText, Shield, Eye, Download, Calendar, Mail, Phone, Clock, Check, MessageSquare
} from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Property, PropertyType, User, Appointment, ClientDemand } from '@/types';
import { propertiesAPI, uploadAPI, appointmentsAPI, BACKEND_URL } from '@/services/api';
import { useData } from '@/context/DataContext';
import Price from '../Price';
import PropertyModal from './PropertyModal';
import { notify } from '@/services/notificationStore';
import { useConfirm } from '@/context/ConfirmContext';
import { getImageSrc } from '@/utils/imageUtils';
const getDownloadUrl = (url: string) => {
  if (!url) return '';
  const cleanUrl = url.replace(BACKEND_URL, '');
  return `${BACKEND_URL}/api/download?url=${encodeURIComponent(cleanUrl)}`;
};

interface PropertiesManagementProps {
  properties: Property[];
  setProperties: React.Dispatch<React.SetStateAction<Property[]>>;
  availableLocations: string[];
  showNotification: (type: 'success' | 'error' | 'info' | 'warning', message: string, options?: { duration?: number }) => void;
  user: User | null;
  clientDemands?: ClientDemand[];
}

const SortablePropertyItem = ({ p, openEditModal, handleDelete, openHistoryModal }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id });
  const [activePlanMenu, setActivePlanMenu] = useState(false);
  const [activePaperMenu, setActivePaperMenu] = useState(false);
  const { appointments } = useData();

  const propertyAppointments = useMemo(() => {
    return appointments?.filter((a: any) => a.propertyId === p.id) || [];
  }, [appointments, p.id]);
  const appointmentsCount = propertyAppointments.length;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 40 : (activePlanMenu || activePaperMenu) ? 30 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="group bg-white border-b border-gray-100 last:border-0 hover:bg-blue-50/20 transition-all p-4 md:p-0 md:flex md:items-center"
    >
      {/* Mobile Card Layout */}
      <div className="flex flex-col w-full md:hidden gap-3">
        {/* Top Info Row: Handle, Image, Details, Price */}
        <div className="flex items-start gap-3">
          {/* Reorder Handle */}
          <button {...attributes} {...listeners} className="p-1.5 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing focus:outline-none shrink-0 self-center touch-none">
            <GripVertical size={16} />
          </button>
          
          {/* Property Image */}
          <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-200 shrink-0 relative shadow-sm">
            <img src={getImageSrc(p.images?.[0], 'thumb')} className="w-full h-full object-cover" alt="" loading="lazy" />
          </div>
          
          {/* Details (Title, Location, Price) */}
          <div className="flex-1 min-w-0">
            <h4 className="font-extrabold text-gray-900 leading-tight truncate text-sm">{p.title}</h4>
            <div className="flex items-center text-[10px] text-gray-400 mt-1">
              <MapPin size={10} className="mr-1 shrink-0" />
              <span className="truncate">{p.location?.city || (p as any).city || 'N/A'}</span>
            </div>
            
            {/* Price badge right below details */}
            <div className="mt-1">
              <span className="font-extrabold text-blue-600 text-xs">
                <Price amount={p.price} priceType={p.priceType} />
                {p.listingType === 'rent' && <span className="text-[9px] text-gray-400 ml-0.5">/ Mois</span>}
              </span>
            </div>
          </div>
        </div>

        {/* Metadata Badge Bar */}
        <div className="flex flex-wrap items-center gap-1.5 bg-gray-50/60 p-2 rounded-xl border border-gray-100/50">
          {/* Status Badge */}
          {p.status === 'sold' && <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-red-100 text-red-800 uppercase tracking-wider">Vendu</span>}
          {p.status === 'rented' && <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-orange-100 text-orange-800 uppercase tracking-wider">Loué</span>}
          {(!p.status || p.status === 'available') && <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-emerald-100 text-emerald-800 uppercase tracking-wider">Dispo</span>}

          {/* Listing Type Badge */}
          <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider ${p.listingType === 'sale' ? 'bg-blue-100 text-blue-800' : 'bg-teal-100 text-teal-800'}`}>
            {p.listingType === 'sale' ? 'Achat' : 'Location'}
          </span>

          {/* Document Plan Badge */}
          {p.features?.propertyPlan && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setActivePlanMenu(!activePlanMenu)}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-50 border border-sky-100 text-sky-700 rounded-md text-[9px] font-extrabold outline-none hover:bg-sky-100 transition-colors"
              >
                <FileText size={8} /> Plan
              </button>
              {activePlanMenu && (
                <>
                  <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setActivePlanMenu(false)} />
                  <div className="absolute bottom-full left-0 mb-1.5 z-50 bg-white border border-gray-150 rounded-xl shadow-xl p-1 min-w-[140px] text-[10px] font-bold text-gray-700">
                    <a
                      href={p.features.propertyPlan}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setActivePlanMenu(false)}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                    >
                      <Eye size={12} /> Voir le PDF
                    </a>
                    <a
                      href={getDownloadUrl(p.features.propertyPlan)}
                      onClick={() => setActivePlanMenu(false)}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors border-t border-gray-50"
                    >
                      <Download size={12} /> Télécharger
                    </a>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Document Titre Bleu Badge */}
          {p.features?.ownerPaper && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setActivePaperMenu(!activePaperMenu)}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 border border-purple-100 text-purple-700 rounded-md text-[9px] font-extrabold outline-none hover:bg-purple-100 transition-colors"
              >
                <Shield size={8} /> Titre bleu
              </button>
              {activePaperMenu && (
                <>
                  <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setActivePaperMenu(false)} />
                  <div className="absolute bottom-full left-0 mb-1.5 z-50 bg-white border border-gray-150 rounded-xl shadow-xl p-1 min-w-[140px] text-[10px] font-bold text-gray-700">
                    <a
                      href={p.features.ownerPaper}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setActivePaperMenu(false)}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-purple-50 hover:text-purple-600 rounded-lg transition-colors"
                    >
                      <Eye size={12} /> Voir le PDF
                    </a>
                    <a
                      href={getDownloadUrl(p.features.ownerPaper)}
                      onClick={() => setActivePaperMenu(false)}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-purple-50 hover:text-purple-600 rounded-lg transition-colors border-t border-gray-50"
                    >
                      <Download size={12} /> Télécharger
                    </a>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Rendez-vous Row */}
        {appointmentsCount > 0 ? (
          <button
            type="button"
            onClick={() => openHistoryModal(p)}
            className="group/btn w-full flex items-center justify-between px-3 py-2.5 bg-emerald-50 hover:bg-emerald-600 border border-emerald-100 hover:border-emerald-600 rounded-xl transition-all active:scale-[0.98] outline-none"
          >
            <div className="flex items-center gap-2">
              <Calendar size={13} className="text-emerald-500 group-hover/btn:text-white transition-colors" />
              <span className="text-xs font-extrabold text-emerald-700 group-hover/btn:text-white transition-colors">
                {appointmentsCount} Rendez-vous
              </span>
            </div>
            <div className="flex items-center gap-2">
              {propertyAppointments.filter((a: any) => a.status === 'pending').length > 0 && (
                <span className="flex items-center gap-1 text-[9px] font-bold text-yellow-600 group-hover/btn:text-yellow-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                  {propertyAppointments.filter((a: any) => a.status === 'pending').length} en attente
                </span>
              )}
              {propertyAppointments.filter((a: any) => a.status === 'accepted').length > 0 && (
                <span className="flex items-center gap-1 text-[9px] font-bold text-green-600 group-hover/btn:text-green-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  {propertyAppointments.filter((a: any) => a.status === 'accepted').length} confirmés
                </span>
              )}
              <ChevronRight size={13} className="text-emerald-400 group-hover/btn:text-white transition-colors" />
            </div>
          </button>
        ) : (
          <div className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl">
            <Calendar size={12} className="text-gray-300" />
            <span className="text-[10px] font-bold text-gray-400">Aucun rendez-vous</span>
          </div>
        )}

        {/* Action Button Row */}
        <div className="flex items-center gap-2 mt-1">
          <button 
            onClick={() => openEditModal(p)} 
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold text-xs shadow-md shadow-blue-200 active:scale-[0.98]"
          >
            <Edit size={14} /> Modifier
          </button>
          <button 
            onClick={() => handleDelete(p.id)} 
            className="w-9 h-9 shrink-0 flex items-center justify-center bg-red-50 border border-red-100 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all font-bold active:scale-[0.98]"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Desktop Handle & Image Row */}
      <div className="hidden md:flex md:items-center md:justify-between md:flex-1 md:px-6 md:py-4">
        <div className="flex items-center flex-1 min-w-0">
          <button {...attributes} {...listeners} className="p-2 mr-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing focus:outline-none shrink-0 touch-none">
            <GripVertical size={18} />
          </button>
          <div className="w-16 h-12 rounded-lg overflow-hidden border border-gray-200 mr-3 shrink-0 relative">
            <img src={getImageSrc(p.images?.[0], 'medium')} className="w-full h-full object-cover" alt="" loading="lazy" />
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition truncate text-sm md:text-base">{p.title}</h4>
            <div className="flex items-center text-[10px] md:text-xs text-gray-400 mt-0.5 whitespace-nowrap">
              <MapPin size={10} className="mr-1" /> {p.location?.city || (p as any).city || 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Documents Column */}
      <div className="hidden md:flex md:w-32 md:px-6 md:py-4 md:items-center md:justify-center md:gap-3">
        {p.features?.propertyPlan ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setActivePlanMenu(!activePlanMenu)}
              title="Plan de la propriété"
              className="p-2 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition shadow-sm outline-none"
            >
              <FileText size={16} />
            </button>
            {activePlanMenu && (
              <>
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setActivePlanMenu(false)} />
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 bg-white border border-gray-150 rounded-xl shadow-xl p-1 min-w-[140px] text-xs font-bold text-gray-700 animate-scale-in">
                  <a
                    href={p.features.propertyPlan}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setActivePlanMenu(false)}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                  >
                    <Eye size={14} /> Voir le PDF
                  </a>
                  <a
                    href={getDownloadUrl(p.features.propertyPlan)}
                    onClick={() => setActivePlanMenu(false)}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors border-t border-gray-50"
                  >
                    <Download size={14} /> Télécharger
                  </a>
                </div>
              </>
            )}
          </div>
        ) : (
          <span className="text-gray-300 text-xs">-</span>
        )}

        {p.features?.ownerPaper ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setActivePaperMenu(!activePaperMenu)}
              title="Titre bleu / Papier de propriété"
              className="p-2 bg-purple-50 border border-purple-100 text-purple-600 rounded-xl hover:bg-purple-600 hover:text-white transition shadow-sm outline-none"
            >
              <Shield size={16} />
            </button>
            {activePaperMenu && (
              <>
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setActivePaperMenu(false)} />
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 bg-white border border-gray-150 rounded-xl shadow-xl p-1 min-w-[140px] text-xs font-bold text-gray-700 animate-scale-in">
                  <a
                    href={p.features.ownerPaper}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setActivePaperMenu(false)}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-purple-50 hover:text-purple-600 rounded-lg transition-colors"
                  >
                    <Eye size={14} /> Voir le PDF
                  </a>
                  <a
                    href={getDownloadUrl(p.features.ownerPaper)}
                    onClick={() => setActivePaperMenu(false)}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-purple-50 hover:text-purple-600 rounded-lg transition-colors border-t border-gray-50"
                  >
                    <Download size={14} /> Télécharger
                  </a>
                </div>
              </>
            )}
          </div>
        ) : (
          <span className="text-gray-300 text-xs">-</span>
        )}
      </div>

      {/* Desktop Price Column */}
      <div className="hidden md:block md:w-48 md:px-6 md:py-4">
        <span className="font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-lg border border-gray-200 text-sm whitespace-nowrap">
          <Price amount={p.price} priceType={p.priceType} />
          {p.listingType === 'rent' && <span className="text-[10px] text-gray-400 ml-0.5"> / Mois</span>}
        </span>
      </div>

      {/* Desktop Status & Type Row */}
      <div className="hidden md:flex md:items-center md:justify-start md:gap-4 md:w-64 md:px-6 md:py-4">
        <div className="flex gap-2 items-center">
          <div className="whitespace-nowrap">
            {p.status === 'sold' && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800">Vendu</span>}
            {p.status === 'rented' && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800">Loué</span>}
            {(!p.status || p.status === 'available') && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-800">Dispo</span>}
          </div>
          <span className={`text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap ${p.listingType === 'sale' ? 'text-blue-600' : 'text-green-600'}`}>
            {p.listingType === 'sale' ? 'Achat' : 'Location'}
          </span>
        </div>
        
        {/* Rating */}
        <div className="hidden lg:flex items-center whitespace-nowrap">
          <div className="flex text-yellow-400 mr-2">
            <Star size={12} fill="currentColor" />
          </div>
          <span className="text-[10px] text-gray-400 font-bold">{p.averageRating || 0}</span>
        </div>
      </div>

      {/* Desktop Rendez-vous Column */}
      <div className="hidden md:flex md:w-40 md:px-6 md:py-4 md:items-center md:justify-center">
        {appointmentsCount > 0 ? (
          <button
            onClick={() => openHistoryModal(p)}
            className="group/btn flex flex-col items-center gap-1 px-3 py-2 rounded-xl border border-emerald-100 bg-emerald-50 hover:bg-emerald-600 hover:border-emerald-600 transition-all active:scale-95 outline-none w-full"
            title="Voir l'historique des rendez-vous"
          >
            <div className="flex items-center gap-1.5">
              <Calendar size={12} className="text-emerald-500 group-hover/btn:text-white transition-colors" />
              <span className="text-sm font-black text-emerald-700 group-hover/btn:text-white transition-colors">{appointmentsCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {propertyAppointments.filter((a: any) => a.status === 'pending').length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
              )}
              {propertyAppointments.filter((a: any) => a.status === 'accepted').length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              )}
              {propertyAppointments.filter((a: any) => a.status === 'rejected').length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
              )}
            </div>
          </button>
        ) : (
          <span className="text-gray-300 text-xs font-bold">—</span>
        )}
      </div>

      {/* Desktop Actions */}
      <div className="hidden md:flex md:items-center md:justify-end md:gap-2.5 md:w-40 md:px-6 md:py-4">
        <button 
          onClick={() => openEditModal(p)} 
          className="w-9 h-9 flex items-center justify-center bg-blue-50 border border-blue-100 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm font-bold active:scale-95"
        >
          <Edit size={14} />
        </button>
        <button 
          onClick={() => handleDelete(p.id)} 
          className="w-9 h-9 flex items-center justify-center bg-gray-50 border border-gray-100 text-gray-400 rounded-lg hover:border-red-500 hover:text-red-500 transition-all shadow-sm font-bold active:scale-95"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

interface DropdownProps {
  value: string;
  onChange: (value: any) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}

const CustomDropdown = ({ value, onChange, options, placeholder }: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || { label: placeholder || 'Choisir...', value };

  return (
    <div ref={dropdownRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-blue-500 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-xs font-bold text-gray-600 cursor-pointer"
      >
        <span className="truncate">{selectedOption.label}</span>
        <ChevronDown className={`text-gray-400 transform transition-transform duration-200 shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} size={14} />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-[60] mt-2 w-full bg-white border border-gray-150 rounded-2xl shadow-lg py-2 overflow-y-auto max-h-60 animate-fade-in-up">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-xs font-bold transition-colors ${
                  isSelected
                    ? 'bg-blue-50 text-blue-600 font-black'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>{option.label}</span>
                {isSelected && <Check size={14} className="text-blue-600 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const PropertiesManagement = ({
  properties,
  setProperties,
  availableLocations,
  showNotification,
  user,
  clientDemands = []
}: PropertiesManagementProps) => {
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
      const city = p.location?.city || (p as any).city;
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
    images: []
  };
  const [formData, setFormData] = useState<Partial<Property>>(initialPropertyState);
  const [gpsInput, setGpsInput] = useState('');

  const openAddModal = () => { setIsEditing(false); setEditingId(null); setFormData(initialPropertyState); setShowModal(true); };

  useEffect(() => {
    if (location.state && (location.state as any).action === 'new-property') {
      openAddModal();
      // Clear the action so it doesn't trigger again on subsequent updates
      navigate(location.pathname, { replace: true, state: { ...location.state, action: undefined } });
    }
  }, [location.state, location.pathname, navigate]);
  const openEditModal = useCallback(async (p: Property) => {
    setIsEditing(true);
    setEditingId(p.id);
    // First set partial data so modal opens immediately
    setFormData({ ...p, isFeatured: p.isFeatured === true, isNew: p.isNew === true });
    setShowModal(true);
    try {
      // Fetch FULL property data (with all images, features, documents)
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
      // Keep the partial data already set
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
        const results: any[] = [];
        
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
              const heic2anyFn = (heic2anyModule.default || heic2anyModule) as any;
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
      } catch (error: any) {
        notify.update(toastId, { 
          type: 'error', 
          message: error.message || 'Erreur lors du téléchargement des images',
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

  const filteredProperties = properties.filter(p => {
    const city = p.location?.city || (p as any).city || '';
    const matchesSearch = p.title.toLowerCase().includes(propertySearchQuery.toLowerCase()) || city.toLowerCase().includes(propertySearchQuery.toLowerCase());
    const matchesType = propertyTypeFilter === 'all' || p.type === propertyTypeFilter;
    const matchesCity = propertyCityFilter === 'all' || city === propertyCityFilter;
    return matchesSearch && matchesType && matchesCity;
  });

  const sortedProperties = [...filteredProperties].sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));
  const paginatedProperties = isAdminShowAll ? sortedProperties : sortedProperties.slice((propertyCurrentPage - 1) * propertiesPerPage, propertyCurrentPage * propertiesPerPage);
  const totalPages = Math.ceil(sortedProperties.length / propertiesPerPage);

  // Drag-reorder is only safe when the full unfiltered list is visible.
  // If any filter is active, sortedProperties is a subset; renumbering it
  // 1..N would overwrite displayOrder for those properties and collide with
  // values held by properties outside the filter (which stay untouched).
  const isDragReorderEnabled =
    propertyCityFilter === 'all' &&
    propertyTypeFilter === 'all' &&
    propertySearchQuery.trim() === '';

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
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    // Guard: over is null when dropping outside a droppable container (common on mobile touch)
    if (!over || active.id === over.id) return;
    // Guard: never reorder while a filter is active — the sorted list is a
    // subset of all properties, so assigning 1..N would collide with the
    // displayOrder values held by properties outside the current filter.
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

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestion des Propriétés</h2>
          <p className="text-sm text-gray-500 mt-1">Gérez et suivez votre portefeuille immobilier</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* Location Filter */}
          <div className="relative flex-1 md:w-48">
            <CustomDropdown
              value={propertyCityFilter}
              onChange={setPropertyCityFilter}
              options={cityOptions}
              placeholder="Toutes les villes"
            />
          </div>

          {/* Type Filter */}
          <div className="relative flex-1 md:w-48">
            <CustomDropdown
              value={propertyTypeFilter}
              onChange={setPropertyTypeFilter}
              options={typeOptions}
              placeholder="Tous les types"
            />
          </div>

          <button 
            onClick={openAddModal} 
            className="flex-1 md:flex-none bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center justify-center shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
          >
            <Plus size={18} className="mr-2" /> Ajouter
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Rechercher par nom ou ville..." 
          value={propertySearchQuery} 
          onChange={e => setPropertySearchQuery(e.target.value)} 
          className="w-full pl-12 pr-4 py-3.5 border-gray-100 border rounded-xl bg-white shadow-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-400/5 outline-none transition-all" 
        />
      </div>

      {!isDragReorderEnabled && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
          <span className="mt-0.5 text-amber-500 flex-shrink-0">⚠️</span>
          <span>
            <strong>Réorganisation désactivée.</strong> Effacez les filtres et la recherche pour pouvoir glisser-déposer les propriétés et modifier leur ordre d'affichage.
          </span>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="flex flex-col">
            {/* Table Header - Visible only on Desktop */}
            <div className="hidden md:flex bg-gray-50 border-b border-gray-100 py-3 text-xs uppercase font-bold text-gray-500">
              <div className="flex-1 px-6">Propriété</div>
              <div className="w-32 px-6 text-center">Documents</div>
              <div className="w-48 px-6">Prix</div>
              <div className="w-64 px-6">Infos</div>
              <div className="w-40 px-6 text-center">Rendez-vous</div>
              <div className="w-40 px-6 text-right">Actions</div>
            </div>
            
            <SortableContext items={paginatedProperties.map(p => p.id)} strategy={verticalListSortingStrategy}>
              {paginatedProperties.length === 0 ? (
                <div className="p-16 text-center text-gray-400">
                   <ImageIcon className="mx-auto mb-4 opacity-20" size={64} />
                   <p className="font-bold">Aucune propriété trouvée</p>
                </div>
              ) : (
                paginatedProperties.map(p => (
                  <SortablePropertyItem
                    key={p.id}
                    p={p}
                    openEditModal={openEditModal}
                    handleDelete={handleDelete}
                    openHistoryModal={setHistoryProperty}
                  />
                ))
              )}
            </SortableContext>
          </div>
        </DndContext>

        {/* Footer with Pagination and Show All */}
        <div className="p-4 border-t border-gray-100 bg-white flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xs text-gray-500 font-medium">
            Affichage de <span className="font-bold text-gray-900">{(propertyCurrentPage - 1) * propertiesPerPage + 1}</span> à <span className="font-bold text-gray-900">{Math.min(propertyCurrentPage * propertiesPerPage, sortedProperties.length)}</span> sur <span className="font-bold text-gray-900">{sortedProperties.length}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Show All Toggle Integrated */}
            {sortedProperties.length > propertiesPerPage && (
              <button
                onClick={() => setIsAdminShowAll(!isAdminShowAll)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border transition-all shadow-sm mr-2 ${
                  isAdminShowAll 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-blue-200' 
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <List size={14} />
                {isAdminShowAll ? 'Pagination' : 'Afficher tout'}
              </button>
            )}

            {!isAdminShowAll && totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPropertyCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={propertyCurrentPage === 1}
                  className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:bg-gray-50 disabled:opacity-30 transition"
                >
                  <ChevronLeft size={16} />
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setPropertyCurrentPage(page)}
                    className={`min-w-[32px] h-8 px-2 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                      propertyCurrentPage === page
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                        : 'text-gray-600 hover:bg-gray-50 border border-transparent hover:border-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => setPropertyCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={propertyCurrentPage === totalPages}
                  className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:bg-gray-50 disabled:opacity-30 transition"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <PropertyModal
        showModal={showModal}
        setShowModal={setShowModal}
        isEditing={isEditing}
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
      />

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 text-center animate-bounce-in shadow-2xl">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 size={40} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Supprimer ?</h3>
            <p className="text-gray-500 text-sm mb-8">Cette action est irréversible. Toutes les données de cette propriété seront perdues.</p>
            <div className="flex space-x-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 px-4 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition">Annuler</button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-4 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 transition shadow-lg shadow-red-500/20">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Appointment History Modal */}
      {historyProperty && (() => {
        const historyPropertyApts = appointments.filter(a => a.propertyId === historyProperty.id);
        const filteredHistoryApts = historyStatusFilter === 'all'
          ? historyPropertyApts
          : historyPropertyApts.filter(a => a.status === historyStatusFilter);

        const sortedHistoryApts = [...filteredHistoryApts].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        return (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-scale-in">
              {/* Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                    <Calendar size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">Historique des Rendez-vous</h3>
                    <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[320px] md:max-w-[400px]" title={historyProperty.title}>
                      {historyProperty.title}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-emerald-100/70 border border-emerald-250 text-emerald-800 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap shrink-0">
                    {historyPropertyApts.length} au total
                  </span>
                  <button
                    onClick={() => { setHistoryProperty(null); setHistoryStatusFilter('all'); }}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Status Filters inside Modal */}
              <div className="px-6 py-3 border-b border-gray-150 flex flex-wrap items-center gap-1.5 bg-white">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mr-2">Filtrer:</span>
                <button
                  onClick={() => setHistoryStatusFilter('all')}
                  className={`px-3 py-1 text-[10px] font-extrabold rounded-lg border transition ${
                    historyStatusFilter === 'all'
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Tous ({historyPropertyApts.length})
                </button>
                <button
                  onClick={() => setHistoryStatusFilter('pending')}
                  className={`px-3 py-1 text-[10px] font-extrabold rounded-lg border transition ${
                    historyStatusFilter === 'pending'
                      ? 'bg-yellow-500 border-yellow-500 text-white shadow-sm'
                      : 'bg-yellow-50/50 border-yellow-100 text-yellow-700 hover:bg-yellow-50'
                  }`}
                >
                  En attente ({historyPropertyApts.filter(a => a.status === 'pending').length})
                </button>
                <button
                  onClick={() => setHistoryStatusFilter('accepted')}
                  className={`px-3 py-1 text-[10px] font-extrabold rounded-lg border transition ${
                    historyStatusFilter === 'accepted'
                      ? 'bg-green-600 border-green-600 text-white shadow-sm'
                      : 'bg-green-50 border-green-150 text-green-700 hover:bg-green-50'
                  }`}
                >
                  Confirmés ({historyPropertyApts.filter(a => a.status === 'accepted').length})
                </button>
                <button
                  onClick={() => setHistoryStatusFilter('rejected')}
                  className={`px-3 py-1 text-[10px] font-extrabold rounded-lg border transition ${
                    historyStatusFilter === 'rejected'
                      ? 'bg-red-500 border-red-500 text-white shadow-sm'
                      : 'bg-red-50 border-red-150 text-red-700 hover:bg-red-50'
                  }`}
                >
                  Annulés ({historyPropertyApts.filter(a => a.status === 'rejected').length})
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-gray-50/30">
                {sortedHistoryApts.length === 0 ? (
                  <div className="p-16 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
                    <Calendar size={48} className="mx-auto mb-4 opacity-20 text-emerald-500" />
                    <p className="font-extrabold text-sm">Aucun rendez-vous trouvé</p>
                    <p className="text-xs text-gray-400 mt-1">Aucune demande correspondant à ces critères.</p>
                  </div>
                ) : (
                  sortedHistoryApts.map(apt => {
                    const clientName = apt.clientName || apt.userName || 'Client inconnu';
                    const email = apt.clientEmail || apt.userEmail || '';
                    const phone = apt.clientPhone || apt.userPhone || '';
                    
                    // Parse custom notes safely
                    const rawNotes = apt.notes || apt.message || '';
                    const cleanNotes = rawNotes.match(/^\[PROPS:[^\]]*\](.*)/s)
                      ? rawNotes.replace(/^\[PROPS:[^\]]*\]/s, '').trim()
                      : rawNotes;

                    return (
                      <div
                        key={apt.id}
                        className={`p-5 rounded-2xl border bg-white shadow-sm transition-all flex flex-col gap-3.5 hover:shadow-md ${
                          apt.status === 'pending' ? 'border-yellow-100 bg-yellow-50/10' : 'border-gray-100'
                        }`}
                      >
                        {/* Row 1: Client Card info */}
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 text-gray-500 flex items-center justify-center font-black text-xs shrink-0">
                              {clientName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-gray-900 text-sm leading-tight truncate">{clientName}</h4>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[10px] text-gray-400 font-bold uppercase tracking-wider min-w-0">
                                {email && (
                                  <span className="flex items-center gap-1 min-w-0 max-w-[140px] xs:max-w-[180px] sm:max-w-none" title={email}>
                                    <Mail size={10} className="text-emerald-500 shrink-0" />
                                    <span className="truncate">{email}</span>
                                  </span>
                                )}
                                {phone && (
                                  <span className="flex items-center gap-1 shrink-0">
                                    <Phone size={10} className="text-emerald-500" /> {phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Styled Status Badge */}
                          <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider whitespace-nowrap border shrink-0 ${
                            apt.status === 'accepted' ? 'bg-green-50 text-green-600 border-green-150' :
                            apt.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-150' :
                            'bg-yellow-50 text-yellow-600 border-yellow-150'
                          }`}>
                            {apt.status === 'accepted' ? 'Confirmé' : apt.status === 'rejected' ? 'Annulé' : 'En attente'}
                          </div>
                        </div>

                        {/* Row 2: Date, Time & Meeting Type */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-gray-50 text-[10px] font-black text-gray-500 uppercase tracking-widest bg-gray-50/50 p-2 rounded-xl border border-gray-100/30">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1.5 text-gray-600">
                              <Calendar size={13} className="text-emerald-500" /> {formatDate(apt.date)}
                            </span>
                            <span className="flex items-center gap-1.5 text-gray-400">
                              <Clock size={13} /> {apt.time}
                            </span>
                          </div>
                          
                          {/* Simple Text for Meeting Type */}
                          <span className="text-[10px] font-bold text-gray-400 normal-case">
                            Type : {apt.meetingType === 'visite' ? 'Visite sur place' : apt.meetingType === 'appel' ? 'Appel téléphonique' : 'Réunion en agence'}
                          </span>
                        </div>

                        {/* Row 3: Client notes */}
                        {cleanNotes && (
                          <div className="text-xs text-gray-600 bg-gray-50/80 rounded-xl p-3 border border-gray-100/60 italic flex items-start gap-2 leading-relaxed">
                            <MessageSquare size={13} className="text-emerald-500/80 mt-0.5 flex-shrink-0" />
                            <span>"{cleanNotes}"</span>
                          </div>
                        )}

                        {/* Row 4: Quick Actions */}
                        <div className="flex items-center justify-end gap-2 pt-1">
                          {apt.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(apt.id, 'accepted')}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-bold text-xs shadow-sm shadow-green-100"
                                title="Confirmer le rendez-vous"
                              >
                                <Check size={13} /> Confirmer
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(apt.id, 'rejected')}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-bold text-xs shadow-sm shadow-red-100"
                                title="Refuser le rendez-vous"
                              >
                                <X size={13} /> Refuser
                              </button>
                            </>
                          )}
                          
                          <button
                            onClick={() => handleDeleteAppointment(apt.id)}
                            className="p-1.5 bg-white border border-gray-200 text-gray-400 rounded-lg hover:text-red-500 hover:border-red-200 hover:bg-red-50/30 transition shrink-0 ml-auto"
                            title="Supprimer définitivement"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-100 flex justify-end bg-gray-50/30">
                <button
                  onClick={() => { setHistoryProperty(null); setHistoryStatusFilter('all'); }}
                  className="px-5 py-2.5 bg-gray-200 text-gray-700 hover:bg-gray-300 font-bold text-xs rounded-xl transition outline-none active:scale-[0.98]"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default PropertiesManagement;
