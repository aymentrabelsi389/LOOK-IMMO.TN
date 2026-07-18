
import React, { useState, useEffect } from 'react';
import { Target, Search, Trash2, MapPin, Phone, User as UserIcon, Check, X, ChevronLeft, ChevronRight, List, Sparkles, AlertCircle, CheckCircle2, Edit2, ChevronDown } from 'lucide-react';
import { ClientDemand, Property } from '@/types';
import { clientDemandsAPI } from '@/services/api';
import Price from '../Price';
import PropertyMatchModal from './PropertyMatchModal';
import { notify } from '@/services/notificationStore';
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

interface DemandsManagementProps {
  clientDemands?: ClientDemand[];
  setClientDemands?: React.Dispatch<React.SetStateAction<ClientDemand[]>>;
  properties?: Property[];
}

const DemandsManagement = ({
  clientDemands: initialDemands,
  setClientDemands: updateDemands,
  properties = []
}: DemandsManagementProps) => {
  const { confirm } = useConfirm();
  const [demands, setDemands] = useState<ClientDemand[]>(initialDemands || []);
  const [loading, setLoading] = useState(!initialDemands);
  const [filter, setFilter] = useState('all');
  const [matchFilter, setMatchFilter] = useState('all'); // all, with-matches, no-matches
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'created-desc' | 'created-asc' | 'matches-desc'>('created-desc');

  const [selectedDemand, setSelectedDemand] = useState<ClientDemand | null>(null);
  const [editingDemand, setEditingDemand] = useState<ClientDemand | null>(null);
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!initialDemands) {
      const fetchDemands = async () => {
        try {
          const data = await clientDemandsAPI.getAll();
          setDemands(data);
        } catch (err) {
          console.error("Failed to fetch demands", err);
        } finally {
          setLoading(false);
        }
      };
      fetchDemands();
    } else {
      setDemands(initialDemands);
    }
  }, [initialDemands]);

  const handleUpdateStatus = async (id: string, status: ClientDemand['status']) => {
    try {
      await clientDemandsAPI.update(id, { status });
      const updated = demands.map(d => d.id === id ? { ...d, status } : d);
      setDemands(updated);
      if (updateDemands) updateDemands(updated);
      if (status === 'matched') {
        const demand = demands.find(d => d.id === id);
        notify.success(`Félicitations ! La demande de ${demand?.clientName || 'client'} est maintenant matchée.`);
      } else {
        notify.success('Statut de la demande mis à jour.');
      }
    } catch (err) {
      console.error(err);
      notify.error('Erreur lors de la mise à jour.');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Supprimer la demande ?',
      message: 'Êtes-vous sûr de vouloir supprimer définitivement cette demande client ? Cette action est irréversible.',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger'
    });
    if (confirmed) {
      try {
        await clientDemandsAPI.delete(id);
        const filtered = demands.filter(d => d.id !== id);
        setDemands(filtered);
        if (updateDemands) updateDemands(filtered);
        notify.success('Demande client supprimée avec succès.');
      } catch (err) {
        console.error(err);
        notify.error('Erreur lors de la suppression.');
      }
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDemand) return;
    try {
      const updated = await clientDemandsAPI.update(editingDemand.id, {
        clientName: editingDemand.clientName,
        phone: editingDemand.phone,
        description: editingDemand.description,
        location: editingDemand.location,
        type: editingDemand.type,
        budget: editingDemand.budget,
        priority: editingDemand.priority,
        status: editingDemand.status
      });

      const updatedList = demands.map(d => d.id === editingDemand.id ? updated : d);
      setDemands(updatedList);
      if (updateDemands) updateDemands(updatedList);
      setEditingDemand(null);
      if (updated.status === 'matched') {
        notify.success(`Félicitations ! La demande de ${updated.clientName} a été enregistrée comme matchée.`);
      } else {
        notify.success('Demande client modifiée avec succès.');
      }
    } catch (err) {
      console.error("Failed to update demand", err);
      notify.error("Erreur lors de la modification de la demande");
    }
  };

  // Matching logic
  const getMatchesForDemand = (demand: ClientDemand) => {
    if (!properties || properties.length === 0) return [];

    // Load ignored property IDs from localStorage (fallback) and demand object
    const localIgnored = typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem(`ignored_matches_${demand.id}`) || '[]')
      : [];
    const ignoredIds = new Set([
      ...(demand.ignoredPropertyIds || []),
      ...localIgnored
    ]);

    const typeMapping: Record<string, string[]> = {
      'appartement': ['apartment', 'studio', 'duplex', 'triplex', 'penthouse'],
      'villa': ['villa'],
      'terrain': ['land'],
      'bureau': ['commercial', 'depot'],
      'commerce': ['commerce', 'commercial']
    };

    return properties
      .filter(property => {
        // 1. Ignore if already marked as ignored
        if (ignoredIds.has(property.id)) return false;

        // 2. Strict Budget Filter: Property price must be ±30% of client demand budget
        if (demand.budget && demand.budget > 0) {
          const lowerBound = demand.budget * 0.7;
          const upperBound = demand.budget * 1.3;
          if (property.price < lowerBound || property.price > upperBound) {
            return false;
          }
        }
        return true;
      })
      .map(property => {
        let score = 0;

        // 1. Type Match (Critical: 40 points)
        const allowedTypes = typeMapping[demand.type] || [];
        if (allowedTypes.includes(property.type)) {
          score += 40;
        } else {
          // Soft match for similar types (e.g., apartment vs villa)
          if (demand.type === 'appartement' && property.type === 'villa') score += 5;
          if (demand.type === 'villa' && property.type === 'apartment') score += 5;
        }

        // 2. Budget Match (Critical: 30 points)
        if (demand.budget && demand.budget > 0) {
          const priceDiff = (property.price - demand.budget) / demand.budget;
          if (priceDiff <= 0) {
            score += 30; // Price is under or equal to demand budget (within budget)
          } else if (priceDiff <= 0.1) {
            score += 20; // Up to 10% over budget
          } else if (priceDiff <= 0.2) {
            score += 15; // Up to 20% over budget
          } else {
            score += 10; // Up to 30% over budget
          }
        } else {
          score += 15; // Neutral if no budget specified
        }

        // 3. Location Match (20 points)
        const demandLoc = demand.location.toLowerCase();
        const propCity = (property.location?.city || '').toLowerCase();
        const propAddr = (property.location?.address || '').toLowerCase();

        if (propCity && (propCity.includes(demandLoc) || demandLoc.includes(propCity))) {
          score += 20;
        } else if (propAddr && (propAddr.includes(demandLoc) || demandLoc.includes(propAddr))) {
          score += 12;
        }

        // 4. Area Match (Attempt to extract from description) (10 points)
        // If demand description contains "m2" or "m²", try to compare
        const areaMatch = demand.description.match(/(\d+)\s*m[2²]/);
        if (areaMatch && property.features?.area) {
          const requestedArea = parseInt(areaMatch[1]);
          const areaDiff = Math.abs(property.features.area - requestedArea) / requestedArea;
          if (areaDiff <= 0.2) score += 10;
          else if (areaDiff <= 0.4) score += 5;
        }

        // 5. Priority Bonus
        if (demand.priority === 'high') score += 5;

        return { property, score };
      })
      .filter(m => m.score >= 45) // Slightly lower threshold for more discovery
      .sort((a, b) => b.score - a.score);
  };

  const filteredDemands = demands.filter(d => {
    const matchesFilter = filter === 'all' || d.status === filter;
    const matchesSearch = d.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.phone?.includes(searchQuery);

    // Match Filter
    const matchesList = getMatchesForDemand(d);
    let matchesMatchFilter = true;
    if (matchFilter === 'with-matches') matchesMatchFilter = matchesList.length > 0;
    if (matchFilter === 'no-matches') matchesMatchFilter = matchesList.length === 0;

    return matchesFilter && matchesSearch && matchesMatchFilter;
  });

  const sortedDemands = [...filteredDemands].sort((a, b) => {
    if (sortBy === 'matches-desc') {
      return getMatchesForDemand(b).length - getMatchesForDemand(a).length;
    }
    const aDate = new Date(a.createdAt || 0).getTime();
    const bDate = new Date(b.createdAt || 0).getTime();
    return sortBy === 'created-desc' ? bDate - aDate : aDate - bDate;
  });

  const totalPages = Math.ceil(sortedDemands.length / itemsPerPage);
  const paginatedDemands = showAll ? sortedDemands : sortedDemands.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const withMatchesCount = demands.filter(d => getMatchesForDemand(d).length > 0).length;
  const noMatchesCount = demands.length - withMatchesCount;

  if (loading) return <div className="p-8 text-center text-sm font-bold text-gray-500 animate-pulse">Chargement des demandes...</div>;

  return (
    <>
      <div className="space-y-6 animate-fade-in-up">
      {/* Dashboard Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
              <UserIcon size={20} />
            </div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Demandes</span>
          </div>
          <div className="text-2xl font-black text-gray-900 leading-none">{demands.length}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-500">
              <Sparkles size={20} />
            </div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Avec Matchs</span>
          </div>
          <div className="text-2xl font-black text-green-600 leading-none">{withMatchesCount}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-400">
              <AlertCircle size={20} />
            </div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sans Matchs</span>
          </div>
          <div className="text-2xl font-black text-red-500 leading-none">{noMatchesCount}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-brand-teal/10 flex items-center justify-center text-brand-teal">
              <CheckCircle2 size={20} />
            </div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Opportunités</span>
          </div>
          <div className="text-2xl font-black text-brand-dark leading-none">
            {demands.filter(d => d.status === 'searching' && getMatchesForDemand(d).length > 0).length}
          </div>
        </div>
      </div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight uppercase tracking-tight">Opportunités Clients</h1>
          <p className="text-sm text-gray-500 mt-1">Gérez et connectez vos clients aux biens correspondants</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto animate-fade-in">
          <CustomDropdown
            value={sortBy}
            onChange={(val) => setSortBy(val as any)}
            options={[
              { value: 'created-desc', label: '📅 Reçu le (Récent)' },
              { value: 'created-asc', label: '📅 Reçu le (Ancien)' },
              { value: 'matches-desc', label: '✨ Meilleures Opportunités' }
            ]}
            triggerClassName="w-full sm:w-[220px] flex items-center justify-between gap-3 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10 shadow-sm text-xs font-bold text-gray-600 cursor-pointer hover:border-brand-teal/50 transition bg-white"
            menuClassName="absolute right-0 z-[60] mt-2 w-full sm:w-[220px] bg-white border border-gray-100 rounded-2xl shadow-lg py-2 overflow-y-auto max-h-60 animate-fade-in-up"
            optionClassName="w-full flex items-center justify-between px-4 py-2 text-left text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
          />
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Rechercher par nom, téléphone ou description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm focus:outline-none focus:border-brand-teal transition-all outline-none"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <CustomDropdown
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'Tous les statuts' },
              { value: 'searching', label: 'En recherche' },
              { value: 'contacted', label: 'Contacté' },
              { value: 'matched', label: 'Matché' },
              { value: 'closed', label: 'Fermé' }
            ]}
            triggerClassName="w-full sm:w-[180px] flex items-center justify-between gap-3 px-4 py-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-brand-teal/50 focus:outline-none focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10 transition-all text-[10px] font-black text-gray-600 uppercase tracking-widest cursor-pointer"
            menuClassName="absolute left-0 sm:right-0 z-[60] mt-2 w-full sm:w-[180px] bg-white border border-gray-100 rounded-2xl shadow-lg py-2 overflow-y-auto max-h-60 animate-fade-in-up"
            optionClassName="w-full flex items-center justify-between px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest transition-colors"
          />
          <CustomDropdown
            value={matchFilter}
            onChange={setMatchFilter}
            options={[
              { value: 'all', label: 'Tout matching' },
              { value: 'with-matches', label: 'Avec Correspondances' },
              { value: 'no-matches', label: 'Sans Correspondance' }
            ]}
            triggerClassName="w-full sm:w-[200px] flex items-center justify-between gap-3 px-4 py-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-brand-teal/50 focus:outline-none focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10 transition-all text-[10px] font-black text-gray-600 uppercase tracking-widest cursor-pointer"
            menuClassName="absolute left-0 sm:right-0 z-[60] mt-2 w-full sm:w-[200px] bg-white border border-gray-100 rounded-2xl shadow-lg py-2 overflow-y-auto max-h-60 animate-fade-in-up"
            optionClassName="w-full flex items-center justify-between px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest transition-colors"
          />
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {sortedDemands.length === 0 ? (
          <div className="p-20 text-center">
            <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
              <Target size={64} className="text-gray-100 mb-6" />
              <h3 className="text-xl font-black text-gray-900 mb-2">Aucune demande</h3>
              <p className="text-gray-500 text-sm">Nous n'avons trouvé aucune demande client correspondant à vos critères actuels.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/50">
                  <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-8 py-5">Client</th>
                    <th className="px-6 py-5">Demande</th>
                    <th className="px-6 py-5">Budget & Lieu</th>
                    <th className="px-6 py-5">Statut</th>
                    <th className="px-6 py-5">Correspondances</th>
                    <th className="px-8 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedDemands.map(demand => {
                    const matches = getMatchesForDemand(demand);
                    return (
                      <tr key={demand.id} className={`group hover:bg-blue-50/30 transition-all duration-200 cursor-default ${demand.status === 'searching' ? 'bg-orange-50/30' : ''}`}>
                        <td className="px-8 py-5">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-400 group-hover:bg-white group-hover:shadow-sm transition-all font-black text-xs">
                              {demand.clientName.charAt(0)}
                            </div>
                            <div className="ml-4">
                              <div className="font-black text-gray-900 group-hover:text-brand-dark transition-colors leading-none mb-1">{demand.clientName}</div>
                              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <Phone size={10} className="text-brand-teal" /> {demand.phone}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 max-w-xs">
                          <div className="text-xs font-bold text-gray-800 line-clamp-2 leading-relaxed italic mb-2">
                            "{demand.description}"
                          </div>
                          <div className="flex gap-2">
                            <span className="px-2 py-0.5 bg-gray-100 text-[8px] font-black text-gray-500 rounded uppercase tracking-tighter">{demand.type}</span>
                            {demand.priority === 'high' && (
                              <span className="px-2 py-0.5 bg-red-100 text-[8px] font-black text-red-600 rounded uppercase tracking-tighter">Urgent</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              <MapPin size={14} className="text-brand-teal" /> {demand.location}
                            </div>
                            {demand.budget && (
                              <div className="inline-flex items-center px-2.5 py-1 bg-teal-50 text-brand-teal rounded-lg text-xs font-black">
                                <Price amount={demand.budget} />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <select
                            value={demand.status}
                            onChange={(e) => handleUpdateStatus(demand.id, e.target.value as any)}
                            className={`text-[9px] font-black uppercase tracking-widest rounded-lg px-3 py-1.5 border border-transparent shadow-sm outline-none cursor-pointer transition-all ${demand.status === 'matched' ? 'bg-green-50 text-green-600 border-green-100' :
                              demand.status === 'searching' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                demand.status === 'contacted' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                  'bg-gray-50 text-gray-500 border-gray-100'
                              }`}
                          >
                            <option value="searching">Recherche</option>
                            <option value="contacted">Contacté</option>
                            <option value="matched">Matché</option>
                            <option value="closed">Fermé</option>
                          </select>
                        </td>
                        <td className="px-6 py-5">
                          {matches.length > 0 ? (
                            <div className="flex flex-col items-start gap-2">
                              <div className="flex items-center gap-2 px-2 py-1 bg-green-50 text-green-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-green-100">
                                <Sparkles size={12} />
                                {matches.length} correspondance{matches.length > 1 ? 's' : ''}
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedDemand(demand);
                                  setIsMatchModalOpen(true);
                                }}
                                className="text-[10px] font-black text-brand-teal hover:text-brand-dark transition-colors uppercase tracking-widest flex items-center gap-1 group/btn"
                              >
                                Voir Match <ChevronRight size={12} className="group-hover/btn:translate-x-0.5 transition-transform" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic">Aucun match</span>
                          )}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {demand.status === 'searching' && (
                              <button
                                onClick={() => handleUpdateStatus(demand.id, 'contacted')}
                                className="p-2.5 bg-white border border-gray-200 text-brand-teal rounded-xl hover:shadow-sm transition-all shadow-sm"
                                title="Marquer comme contacté"
                              >
                                <Check size={18} />
                              </button>
                            )}
                            <button
                              onClick={() => setEditingDemand(demand)}
                              className="p-2.5 bg-white border border-gray-200 text-gray-400 rounded-xl hover:text-blue-500 hover:shadow-sm transition-all shadow-sm"
                              title="Modifier la demande"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(demand.id)}
                              className="p-2.5 bg-white border border-gray-200 text-gray-400 rounded-xl hover:text-red-500 hover:shadow-sm transition-all shadow-sm"
                              title="Supprimer"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-100">
              {paginatedDemands.map(demand => {
                const matches = getMatchesForDemand(demand);
                return (
                  <div key={demand.id} className={`p-5 hover:bg-gray-50 transition-colors space-y-4 ${demand.status === 'searching' ? 'bg-orange-50/20 border-l-4 border-l-orange-500' : 'bg-white'}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-400 font-black text-xs uppercase tracking-widest">
                          {demand.clientName.charAt(0)}
                        </div>
                        <div className="ml-3">
                          <h4 className="font-black text-gray-900 leading-none mb-1">{demand.clientName}</h4>
                          <div className="flex items-center gap-1 text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                            <Phone size={10} className="text-brand-teal" /> {demand.phone}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {matches.length > 0 && (
                          <button
                            onClick={() => {
                              setSelectedDemand(demand);
                              setIsMatchModalOpen(true);
                            }}
                            className="p-2 bg-green-50 text-green-600 rounded-lg"
                          >
                            <Sparkles size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => setEditingDemand(demand)}
                          className="p-2 bg-blue-50 text-blue-600 rounded-lg"
                          title="Modifier"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(demand.id)}
                          className="p-2 bg-gray-50 text-gray-400 rounded-lg active:bg-red-500 active:text-white transition-all"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-3">
                      <div className="text-[11px] font-bold text-gray-800 leading-relaxed italic">
                        "{demand.description}"
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-0.5 bg-white text-[8px] font-black text-gray-500 rounded border border-gray-100 uppercase tracking-tighter">{demand.type}</span>
                        {demand.priority === 'high' && (
                          <span className="px-2 py-0.5 bg-red-100 text-[8px] font-black text-red-600 rounded uppercase tracking-tighter">Urgent</span>
                        )}
                        {matches.length > 0 && (
                          <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[8px] font-black rounded border border-green-100 uppercase tracking-tighter">
                            {matches.length} Matchs
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-between items-center gap-3 pt-2">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                          <MapPin size={14} className="text-brand-teal" /> {demand.location}
                        </div>
                        {demand.budget && (
                          <div className="text-[10px] font-black text-brand-teal bg-teal-50 px-2 py-1 rounded-md inline-block">
                            <Price amount={demand.budget} />
                          </div>
                        )}
                      </div>
                      <select
                        value={demand.status}
                        onChange={(e) => handleUpdateStatus(demand.id, e.target.value as any)}
                        className={`text-[9px] font-black uppercase tracking-widest rounded-lg px-3 py-1.5 border border-transparent shadow-sm outline-none ${demand.status === 'matched' ? 'bg-green-100 text-green-700' :
                          demand.status === 'searching' ? 'bg-orange-100 text-orange-700' :
                            demand.status === 'contacted' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-600'
                          }`}
                      >
                        <option value="searching">Recherche</option>
                        <option value="contacted">Contacté</option>
                        <option value="matched">Matché</option>
                        <option value="closed">Fermé</option>
                      </select>
                    </div>

                    {matches.length > 0 && (
                      <button
                        onClick={() => {
                          setSelectedDemand(demand);
                          setIsMatchModalOpen(true);
                        }}
                        className="w-full py-3 bg-brand-dark text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-dark/10"
                      >
                        <Sparkles size={14} /> Voir {matches.length} Matchs
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination Footer */}
            <div className="p-4 border-t border-gray-100 bg-white flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-xs text-gray-500 font-medium">
                Affichage de <span className="font-bold text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> à <span className="font-bold text-gray-900">{Math.min(currentPage * itemsPerPage, sortedDemands.length)}</span> sur <span className="font-bold text-gray-900">{sortedDemands.length}</span>
              </div>

              <div className="flex items-center gap-3">
                {sortedDemands.length > itemsPerPage && (
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border transition-all shadow-sm mr-2 ${showAll
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
                        className={`min-w-[32px] h-8 px-2 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${currentPage === page
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
          </>
        )}
      </div>

      <div className="flex justify-between items-center text-[10px] text-gray-400 px-2 uppercase font-black tracking-widest italic opacity-50">
        <p>Cliquez sur le statut pour le modifier rapidement</p>
        <p>Look Immo Admin © 2026</p>
      </div>
    </div>

      {/* Property Match Modal */}
      {selectedDemand && (
        <PropertyMatchModal
          isOpen={isMatchModalOpen}
          onClose={() => {
            setIsMatchModalOpen(false);
            setSelectedDemand(null);
          }}
          demand={selectedDemand}
          matches={getMatchesForDemand(selectedDemand)}
          onIgnoreMatch={async (propertyId) => {
            const demandId = selectedDemand.id;

            // 1. Get current ignored list from localStorage
            const localIgnored = typeof window !== 'undefined'
              ? JSON.parse(localStorage.getItem(`ignored_matches_${demandId}`) || '[]')
              : [];

            // 2. Add the newly ignored property ID
            if (!localIgnored.includes(propertyId)) {
              localIgnored.push(propertyId);
              localStorage.setItem(`ignored_matches_${demandId}`, JSON.stringify(localIgnored));
            }

            // 3. Update the state locally so the UI updates instantly
            const updatedDemandsList = demands.map(d => {
              if (d.id === demandId) {
                const ignoredList = d.ignoredPropertyIds || [];
                return {
                  ...d,
                  ignoredPropertyIds: Array.from(new Set([...ignoredList, propertyId]))
                };
              }
              return d;
            });
            setDemands(updatedDemandsList);
            if (updateDemands) updateDemands(updatedDemandsList);

            // 4. Update the demand in selectedDemand state to trigger re-render of modal matches list
            setSelectedDemand(prev => {
              if (!prev) return null;
              const ignoredList = prev.ignoredPropertyIds || [];
              return {
                ...prev,
                ignoredPropertyIds: Array.from(new Set([...ignoredList, propertyId]))
              };
            });

            // 5. Try updating on the server database as well (with fallback for backward compatibility)
            try {
              const currentIgnored = selectedDemand.ignoredPropertyIds || [];
              const updatedIgnoredList = Array.from(new Set([...currentIgnored, propertyId]));
              await clientDemandsAPI.update(demandId, { ignoredPropertyIds: updatedIgnoredList });
            } catch (err) {
              console.log("Server does not support ignoredPropertyIds yet, using localStorage fallback.", err);
            }
          }}
        />
      )}

      {editingDemand && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setEditingDemand(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Target className="text-blue-600" size={20} />
                Modifier la Demande de {editingDemand.clientName}
              </h3>
              <button
                onClick={() => setEditingDemand(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nom Client *</label>
                  <input
                    required
                    type="text"
                    value={editingDemand.clientName}
                    onChange={e => setEditingDemand({ ...editingDemand, clientName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={editingDemand.phone || ''}
                    onChange={e => setEditingDemand({ ...editingDemand, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Description / Recherche *</label>
                <textarea
                  required
                  value={editingDemand.description}
                  onChange={e => setEditingDemand({ ...editingDemand, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium transition-all"
                  placeholder="Ex: Cherche villa avec piscine..."
                ></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Localisation *</label>
                  <input
                    required
                    type="text"
                    value={editingDemand.location}
                    onChange={e => setEditingDemand({ ...editingDemand, location: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Budget Max (DT)</label>
                  <input
                    type="text"
                    value={editingDemand.budget ? editingDemand.budget.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : ''}
                    onChange={e => {
                      const raw = e.target.value.replace(/\s/g, '');
                      if (/^\d*$/.test(raw)) {
                        setEditingDemand({ ...editingDemand, budget: raw ? parseFloat(raw) : 0 });
                      }
                    }}
                    placeholder="Ex: 500 000"
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Type de bien *</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {[
                    { value: 'appartement', label: 'Appartement', emoji: '🏢' },
                    { value: 'villa', label: 'Villa', emoji: '🏡' },
                    { value: 'terrain', label: 'Terrain', emoji: '🌿' },
                    { value: 'bureau', label: 'Bureau', emoji: '💼' },
                    { value: 'commerce', label: 'Commerce', emoji: '🏪' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setEditingDemand({ ...editingDemand, type: opt.value as any })}
                      className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-2xl border-2 text-xs font-bold transition-all duration-200 ${
                        editingDemand.type === opt.value
                          ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm shadow-blue-100'
                          : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-300 hover:bg-white'
                      }`}
                    >
                      <span className="text-lg leading-none">{opt.emoji}</span>
                      <span className="leading-none mt-0.5">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Priorité</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'high', label: '🔴 Haute', active: 'bg-red-50 border-red-400 text-red-700 shadow-sm', inactive: 'bg-gray-50 border-gray-100 text-gray-500 hover:border-red-200 hover:bg-red-50/50' },
                    { value: 'medium', label: '🟡 Moyenne', active: 'bg-amber-50 border-amber-400 text-amber-700 shadow-sm', inactive: 'bg-gray-50 border-gray-100 text-gray-500 hover:border-amber-200 hover:bg-amber-50/50' },
                    { value: 'low', label: '🟢 Basse', active: 'bg-green-50 border-green-400 text-green-700 shadow-sm', inactive: 'bg-gray-50 border-gray-100 text-gray-500 hover:border-green-200 hover:bg-green-50/50' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setEditingDemand({ ...editingDemand, priority: opt.value as any })}
                      className={`py-2.5 rounded-2xl border-2 text-xs font-bold transition-all duration-200 text-center ${
                        editingDemand.priority === opt.value ? opt.active : opt.inactive
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Statut</label>
                <select
                  value={editingDemand.status}
                  onChange={e => setEditingDemand({ ...editingDemand, status: e.target.value as any })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium transition-all"
                >
                  <option value="searching">Recherche active</option>
                  <option value="contacted">Contacté</option>
                  <option value="matched">Matché (Terminé)</option>
                  <option value="closed">Fermé</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingDemand(null)}
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-bold rounded-2xl hover:bg-gray-200 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-2xl transition shadow-md active:scale-95"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default DemandsManagement;
