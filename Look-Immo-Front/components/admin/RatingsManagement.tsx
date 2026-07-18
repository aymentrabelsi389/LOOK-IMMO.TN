
import React, { useState, useEffect } from 'react';
import { Star, Trash2, ChevronLeft, ChevronRight, List, Building2, Calendar, ChevronDown, Check } from 'lucide-react';
import { Rating } from '@/types';
import { ratingsAPI } from '@/services/api';
import { useConfirm } from '@/context/ConfirmContext';


interface CustomDropdownProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  triggerClassName?: string;
  menuClassName?: string;
  optionClassName?: string;
}

const CustomDropdown = <T extends string>({
  value,
  onChange,
  options,
  triggerClassName = "w-full flex items-center justify-between gap-3 px-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-brand-teal/50 focus:outline-none focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10 transition-all text-[10px] font-black text-gray-600 uppercase tracking-widest cursor-pointer",
  menuClassName = "absolute z-50 mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-lg py-2 overflow-y-auto max-h-60 animate-fade-in-up",
  optionClassName = "w-full flex items-center justify-between px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest transition-colors"
}: CustomDropdownProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative inline-block w-full sm:w-auto" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={triggerClassName}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : ''}</span>
        <ChevronDown size={14} className={`text-gray-400 transform transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={menuClassName}>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`${optionClassName} ${
                opt.value === value
                  ? 'bg-brand-teal/5 text-brand-teal font-black'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>{opt.label}</span>
              {opt.value === value && <Check size={12} className="text-brand-teal flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface RatingsManagementProps {
  ratings: Rating[];
  setRatings: React.Dispatch<React.SetStateAction<Rating[]>>;
  onViewUser?: (userId: string) => void;
  onViewProperty?: (propertyId: string) => void;
  showNotification: (type: 'success' | 'error' | 'info' | 'warning', message: string, options?: { duration?: number; icon?: string }) => void;
}

const RatingsManagement = ({
  ratings,
  setRatings,
  onViewUser,
  onViewProperty,
  showNotification
}: RatingsManagementProps) => {
  const { confirm } = useConfirm();
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'rating-desc' | 'rating-asc'>('date-desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showAll, setShowAll] = useState(false);

  const handleDeleteRating = async (id: string) => {
    const confirmed = await confirm({
      title: 'Supprimer l\'avis ?',
      message: 'Êtes-vous sûr de vouloir supprimer définitivement cet avis client ? Cette action est irréversible.',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger'
    });
    if (confirmed) {
      try {
        await ratingsAPI.delete(id);
        setRatings(prev => prev.filter(r => r.id !== id));
        showNotification('success', 'Avis supprimé avec succès');
      } catch (error) {
        console.error("Failed to delete rating:", error);
        showNotification('error', "Erreur lors de la suppression de l'avis");
      }
    }
  };

  const handleRowClick = (rating: Rating) => {
    if (!rating.viewedByAdmin) {
      setRatings(prev => prev.map(r => r.id === rating.id ? { ...r, viewedByAdmin: true } : r));
    }
    if (onViewUser) {
      onViewUser(rating.userId);
    }
  };

  const sortedRatings = [...ratings].sort((a, b) => {
    if (sortBy === 'date-desc') return b.timestamp - a.timestamp;
    if (sortBy === 'date-asc') return a.timestamp - b.timestamp;
    if (sortBy === 'rating-desc') return b.value - a.value;
    if (sortBy === 'rating-asc') return a.value - b.value;
    return 0;
  });

  const totalPages = Math.ceil(sortedRatings.length / itemsPerPage);
  const paginatedRatings = showAll ? sortedRatings : sortedRatings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">Avis et Notes Clients</h1>
          <p className="text-sm text-gray-500 mt-1">Gérez les avis laissés par les utilisateurs</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="flex items-center space-x-2 px-5 py-2.5 bg-yellow-50 rounded-xl border border-yellow-100 shadow-sm">
            <Star size={18} className="text-yellow-500" fill="currentColor" />
            <span className="text-xs font-black text-yellow-600 uppercase tracking-widest">{ratings.length} Avis</span>
          </div>

          <CustomDropdown
            value={sortBy}
            onChange={(val) => setSortBy(val as any)}
            options={[
              { value: 'date-desc', label: '📅 Plus récent' },
              { value: 'date-asc', label: '📅 Plus ancien' },
              { value: 'rating-desc', label: '⭐ Meilleure note' },
              { value: 'rating-asc', label: '⭐ Moins bonne note' }
            ]}
            triggerClassName="w-full sm:w-[220px] flex items-center justify-between gap-3 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10 shadow-sm text-xs font-bold text-gray-600 cursor-pointer hover:border-brand-teal/50 transition bg-white"
            menuClassName="absolute right-0 z-[60] mt-2 w-full sm:w-[220px] bg-white border border-gray-100 rounded-2xl shadow-lg py-2 overflow-y-auto max-h-60 animate-fade-in-up"
            optionClassName="w-full flex items-center justify-between px-4 py-2 text-left text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
          />
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50">
              <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-8 py-5">Client</th>
                <th className="px-6 py-5">Propriété</th>
                <th className="px-6 py-5">Note</th>
                <th className="px-6 py-5">Date</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedRatings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <Star size={64} className="text-gray-100 mb-6" />
                      <h3 className="text-xl font-black text-gray-900 mb-2">Aucun avis</h3>
                      <p className="text-gray-500 text-sm">Vos clients n'ont pas encore laissé d'avis sur les propriétés.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRatings.map((rating) => (
                  <tr
                    key={rating.id}
                    className={`group hover:bg-blue-50/30 transition-all duration-200 cursor-pointer ${!rating.viewedByAdmin ? 'bg-orange-50/30' : ''}`}
                    onClick={() => handleRowClick(rating)}
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-400 group-hover:bg-white group-hover:shadow-sm transition-all font-black text-xs">
                            {rating.userName.charAt(0)}
                          </div>
                          {!rating.viewedByAdmin && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white animate-pulse"></span>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="font-black text-gray-900 group-hover:text-brand-dark transition-colors">{rating.userName}</div>
                          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{rating.userEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center text-xs font-black text-gray-700">
                        <Building2 size={14} className="mr-2 text-gray-300" />
                        <span className="truncate max-w-[200px]">{rating.propertyTitle}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={14}
                            fill={star <= rating.value ? "#f59e0b" : "none"}
                            className={star <= rating.value ? "text-amber-500" : "text-gray-200"}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-xs font-bold text-gray-500 uppercase tracking-widest">
                      <div className="flex items-center">
                        <Calendar size={14} className="mr-2 text-gray-300" />
                        {formatDate(rating.timestamp)}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteRating(rating.id); }}
                          className="p-2.5 bg-white border border-gray-200 text-gray-400 rounded-xl hover:text-red-500 hover:shadow-sm transition-all"
                          title="Supprimer"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-100">
          {paginatedRatings.length === 0 ? (
            <div className="text-center text-gray-400 py-16 font-bold text-sm uppercase tracking-widest">Aucun avis trouvé</div>
          ) : (
            paginatedRatings.map((rating) => (
              <div
                key={rating.id}
                className={`p-5 hover:bg-gray-50 transition-colors space-y-4 ${!rating.viewedByAdmin ? 'bg-orange-50/20 border-l-4 border-l-orange-500' : 'bg-white'}`}
                onClick={() => handleRowClick(rating)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-400 font-black text-xs uppercase tracking-widest">
                      {rating.userName.charAt(0)}
                    </div>
                    <div className="ml-3">
                      <h4 className="font-black text-gray-900 leading-none mb-1">{rating.userName}</h4>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{rating.userEmail}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteRating(rating.id); }}
                    className="p-2 bg-gray-50 text-gray-400 rounded-lg active:bg-red-500 active:text-white transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-3">
                  <div className="flex items-start">
                    <Building2 size={12} className="mr-2 text-brand-teal mt-0.5" />
                    <span className="text-[11px] font-black text-gray-700 leading-tight">{rating.propertyTitle}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={12}
                          fill={star <= rating.value ? "#f59e0b" : "none"}
                          className={star <= rating.value ? "text-amber-500" : "text-gray-200"}
                        />
                      ))}
                    </div>
                    <div className="flex items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <Calendar size={12} className="mr-1.5" />
                      {formatDate(rating.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-100 bg-white flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xs text-gray-500 font-medium">
            Affichage de <span className="font-bold text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> à <span className="font-bold text-gray-900">{Math.min(currentPage * itemsPerPage, sortedRatings.length)}</span> sur <span className="font-bold text-gray-900">{sortedRatings.length}</span>
          </div>

          <div className="flex items-center gap-3">
            {sortedRatings.length > itemsPerPage && (
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
  );
};

export default RatingsManagement;

