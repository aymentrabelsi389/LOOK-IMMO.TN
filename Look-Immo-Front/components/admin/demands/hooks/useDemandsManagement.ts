import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ClientDemand, Property } from '@/types';
import { clientDemandsAPI } from '@/services/api';
import { notify } from '@/services/notificationStore';
import { useConfirm } from '@/context/ConfirmContext';

interface UseDemandsManagementProps {
  initialDemands?: ClientDemand[];
  updateDemands?: React.Dispatch<React.SetStateAction<ClientDemand[]>>;
  properties?: Property[];
}

export function useDemandsManagement({
  initialDemands,
  updateDemands,
  properties = []
}: UseDemandsManagementProps) {
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
        const filteredList = demands.filter(d => d.id !== id);
        setDemands(filteredList);
        if (updateDemands) updateDemands(filteredList);
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

  const demandsMatches = useMemo(() => {
    const map = new Map<string, { property: Property; score: number }[]>();
    
    const typeMapping: Record<string, string[]> = {
      'appartement': ['apartment', 'studio', 'duplex', 'triplex', 'penthouse'],
      'villa': ['villa'],
      'terrain': ['land'],
      'bureau': ['commercial', 'depot'],
      'commerce': ['commerce', 'commercial']
    };

    demands.forEach(demand => {
      if (!properties || properties.length === 0) {
        map.set(demand.id, []);
        return;
      }

      const localIgnored = typeof window !== 'undefined'
        ? JSON.parse(localStorage.getItem(`ignored_matches_${demand.id}`) || '[]')
        : [];
      const ignoredIds = new Set([
        ...(demand.ignoredPropertyIds || []),
        ...localIgnored
      ]);

      const matches = properties
        .filter(property => {
          if (ignoredIds.has(property.id)) return false;
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
          const allowedTypes = typeMapping[demand.type] || [];
          if (allowedTypes.includes(property.type)) {
            score += 40;
          } else {
            if (demand.type === 'appartement' && property.type === 'villa') score += 5;
            if (demand.type === 'villa' && property.type === 'apartment') score += 5;
          }

          if (demand.budget && demand.budget > 0) {
            const priceDiff = (property.price - demand.budget) / demand.budget;
            if (priceDiff <= 0) {
              score += 30;
            } else if (priceDiff <= 0.1) {
              score += 20;
            } else if (priceDiff <= 0.2) {
              score += 15;
            } else {
              score += 10;
            }
          } else {
            score += 15;
          }

          const demandLoc = demand.location.toLowerCase();
          const propCity = (property.location?.city || '').toLowerCase();
          const propAddr = (property.location?.address || '').toLowerCase();

          if (propCity && (propCity.includes(demandLoc) || demandLoc.includes(propCity))) {
            score += 20;
          } else if (propAddr && (propAddr.includes(demandLoc) || demandLoc.includes(propAddr))) {
            score += 12;
          }

          const areaMatch = demand.description.match(/(\d+)\s*m[2²]/);
          if (areaMatch && property.features?.area) {
            const requestedArea = parseInt(areaMatch[1]);
            const areaDiff = Math.abs(property.features.area - requestedArea) / requestedArea;
            if (areaDiff <= 0.2) score += 10;
            else if (areaDiff <= 0.4) score += 5;
          }

          if (demand.priority === 'high') score += 5;

          return { property, score };
        })
        .filter(m => m.score >= 45)
        .sort((a, b) => b.score - a.score);

      map.set(demand.id, matches);
    });

    return map;
  }, [demands, properties]);

  const getMatchesForDemand = useCallback((demand: ClientDemand | null) => {
    if (!demand) return [];
    return demandsMatches.get(demand.id) || [];
  }, [demandsMatches]);

  const filteredDemands = useMemo(() => {
    return demands.filter(d => {
      const matchesFilter = filter === 'all' || d.status === filter;
      const matchesSearch = d.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.phone?.includes(searchQuery);

      const matchesList = getMatchesForDemand(d);
      let matchesMatchFilter = true;
      if (matchFilter === 'with-matches') matchesMatchFilter = matchesList.length > 0;
      if (matchFilter === 'no-matches') matchesMatchFilter = matchesList.length === 0;

      return matchesFilter && matchesSearch && matchesMatchFilter;
    });
  }, [demands, filter, searchQuery, matchFilter, getMatchesForDemand]);

  const sortedDemands = useMemo(() => {
    return [...filteredDemands].sort((a, b) => {
      if (sortBy === 'matches-desc') {
        return getMatchesForDemand(b).length - getMatchesForDemand(a).length;
      }
      const aDate = new Date(a.createdAt || 0).getTime();
      const bDate = new Date(a.createdAt || 0).getTime();
      return sortBy === 'created-desc' ? bDate - aDate : aDate - bDate;
    });
  }, [filteredDemands, sortBy, getMatchesForDemand]);

  const totalPages = useMemo(() => {
    return Math.ceil(sortedDemands.length / itemsPerPage);
  }, [sortedDemands.length, itemsPerPage]);

  const paginatedDemands = useMemo(() => {
    return showAll ? sortedDemands : sortedDemands.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [showAll, sortedDemands, currentPage, itemsPerPage]);

  const withMatchesCount = useMemo(() => {
    return demands.filter(d => getMatchesForDemand(d).length > 0).length;
  }, [demands, getMatchesForDemand]);

  const noMatchesCount = useMemo(() => {
    return demands.length - withMatchesCount;
  }, [demands.length, withMatchesCount]);

  return {
    demands,
    loading,
    filter,
    setFilter,
    matchFilter,
    setMatchFilter,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    selectedDemand,
    setSelectedDemand,
    editingDemand,
    setEditingDemand,
    isMatchModalOpen,
    setIsMatchModalOpen,
    currentPage,
    setCurrentPage,
    totalPages,
    showAll,
    setShowAll,
    sortedDemands,
    paginatedDemands,
    withMatchesCount,
    noMatchesCount,
    getMatchesForDemand,
    handleUpdateStatus,
    handleDelete,
    handleEditSubmit
  };
}
