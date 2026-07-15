import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  Filter, Lock, Check, ChevronDown, Home as HomeIcon, MapPin,
  DollarSign, Square, BedDouble, RefreshCw, ChevronLeft, ChevronRight, Search, X, SlidersHorizontal
} from 'lucide-react';

import PropertyCard from '../components/PropertyCard';
import Price from '../components/Price';
import { SkeletonPropertyCard } from '../components/ui/SkeletonCard';
import { useSEO } from '../hooks/useSEO';
import { useUI } from '../context/UIContext';
import { useAuthStore } from '../stores/useAuthStore';
import { useData } from '../context/DataContext';
import { propertiesAPI } from '../services/api';

const ListingsPage = () => {
  useSEO({
    title: "Propriétés de Prestige à Vendre & à Louer",
    description: "Explorez notre sélection exclusive de biens immobiliers de luxe en Tunisie. Filtrez par emplacement, prix, nombre de pièces et trouvez le bien idéal."
  });

  const { filters, setFilters, setShowAuthModal } = useUI();
  const { availableLocations, handleSelectProperty: onSelectProperty } = useData();
  const { user, handleToggleFavorite } = useAuthStore();
  const onToggleFavorite = (propertyId: string) =>
    handleToggleFavorite(propertyId, () => setShowAuthModal(true));
  const userRole = user?.role;

  const LISTINGS_PER_PAGE = 12;
  const [currentPage, setCurrentPage] = useState(1);
  const [isCityOpen, setIsCityOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [isListingTypeOpen, setIsListingTypeOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isFilterAnimating, setIsFilterAnimating] = useState(false);

  const openFilter = () => {
    setIsMobileFilterOpen(true);
    requestAnimationFrame(() => setIsFilterAnimating(true));
  };

  const closeFilter = () => {
    setIsFilterAnimating(false);
    setTimeout(() => setIsMobileFilterOpen(false), 350);
  };
  const cityDropdownRef = useRef<HTMLDivElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const listingTypeDropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(target)) setIsCityOpen(false);
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(target)) setIsTypeOpen(false);
      if (listingTypeDropdownRef.current && !listingTypeDropdownRef.current.contains(target)) setIsListingTypeOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // City list from locationsAPI (already fetched in DataContext)
  const uniqueCities = useMemo(() => [...availableLocations].sort(), [availableLocations]);

  const maxPriceLimit = filters.propertyType === 'land' || filters.isHotDeal ? 15000000 : 5000000;

  // Build server-side query params from filter state
  const queryParams = useMemo(() => {
    const params: Record<string, string | number | undefined> = {
      page: currentPage,
      limit: LISTINGS_PER_PAGE,
    };
    if (filters.query) params.search = filters.query;
    if (filters.listingType !== 'all') params.type = filters.listingType;
    if (filters.propertyType !== 'all') params.category = filters.propertyType;
    if (filters.city !== 'all') params.city = filters.city;
    if (filters.maxPrice < maxPriceLimit) params.maxPrice = filters.maxPrice;
    if (filters.minPrice > 0) params.minPrice = filters.minPrice;
    if (filters.minBedrooms > 0) params.minBedrooms = filters.minBedrooms;
    if (filters.minArea && filters.minArea > 0) params.minArea = filters.minArea;
    if (filters.isHotDeal) params.isHotDeal = 'true';
    return params;
  }, [filters, currentPage, maxPriceLimit]);

  // Server-side paginated listings query (independent of global DataContext)
  const { data: listingsResult, isLoading: isListingsLoading } = useQuery({
    queryKey: ['properties', 'listings', queryParams],
    queryFn: () => propertiesAPI.getAll(queryParams),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const serverProperties = listingsResult?.data ?? [];
  const pagination = listingsResult?.pagination ?? { total: 0, page: 1, limit: LISTINGS_PER_PAGE, totalPages: 0 };

  // Shared filter panel content
  const filterContent = (
    <div className="space-y-6">
      {/* Statut Filter */}
      <div className="relative" ref={listingTypeDropdownRef}>
        <label className="text-sm font-bold text-gray-700 mb-3 flex items-center">
          <RefreshCw size={16} className="mr-2 text-brand-teal" strokeWidth={1.5} /> Statut
        </label>
        {filters.listingType !== 'all' ? (
          <div className="w-full p-3.5 border-2 border-gray-50 rounded-xl bg-gray-50 text-gray-500 font-medium flex justify-between items-center cursor-not-allowed">
            <span className="truncate">
              {filters.listingType === 'sale' ? 'Ventes' : 'Locations'}
            </span>
            <Lock size={16} className="text-gray-300" />
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setIsListingTypeOpen(!isListingTypeOpen)}
              className={`
                w-full p-3.5 border-2 rounded-xl bg-white text-gray-900 font-medium 
                flex items-center justify-between transition-all duration-300
                ${isListingTypeOpen ? 'border-brand-teal shadow-md' : 'border-gray-100 hover:border-gray-200 shadow-sm'}
              `}
            >
              <span className="truncate">
                {filters.listingType === 'all' ? 'Tout' : (filters.listingType === 'sale' ? 'Ventes' : 'Locations')}
              </span>
              <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${isListingTypeOpen ? 'rotate-180' : ''}`} />
            </button>

            {isListingTypeOpen && (
              <div className="absolute z-30 mt-2 w-full bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-1.5">
                  {[
                    { id: 'all', label: 'Tout' },
                    { id: 'sale', label: 'Ventes' },
                    { id: 'rent', label: 'Locations' }
                  ].map(type => (
                    <button
                      key={type.id}
                      onClick={() => { setFilters({ ...filters, listingType: type.id as any }); setIsListingTypeOpen(false); }}
                      className={`
                        w-full px-4 py-3 rounded-lg text-left text-sm transition-all duration-200
                        flex items-center justify-between group mt-0.5 first:mt-0
                        ${filters.listingType === type.id
                          ? 'bg-brand-teal/5 text-brand-teal font-bold'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                      `}
                    >
                      <span>{type.label}</span>
                      {filters.listingType === type.id && <Check size={16} className="text-brand-teal animate-in zoom-in" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Type de Bien Filter */}
      <div className="relative" ref={typeDropdownRef}>
        <label className="text-sm font-bold text-gray-700 mb-3 flex items-center">
          <HomeIcon size={16} className="mr-2 text-brand-teal" strokeWidth={1.5} /> Type de Bien
        </label>
        {filters.propertyType === 'land' ? (
          <div className="w-full p-3.5 border-2 border-gray-50 rounded-xl bg-gray-50 text-gray-500 font-medium flex justify-between items-center cursor-not-allowed">
            <span className="truncate">Terrain</span>
            <Lock size={16} className="text-gray-300" />
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setIsTypeOpen(!isTypeOpen)}
              className={`
                w-full p-3.5 border-2 rounded-xl bg-white text-gray-900 font-medium 
                flex items-center justify-between transition-all duration-300
                ${isTypeOpen ? 'border-brand-teal shadow-md' : 'border-gray-100 hover:border-gray-200 shadow-sm'}
              `}
            >
              <span className="truncate">
                {filters.propertyType === 'all' ? 'Tous les types' : (
                  filters.propertyType === 'apartment' ? 'Appartement' :
                    filters.propertyType === 'villa' ? 'Villa' :
                      filters.propertyType === 'duplex' ? 'Duplex' :
                        filters.propertyType === 'triplex' ? 'Triplex' :
                          filters.propertyType === 'penthouse' ? 'Penthouse' :
                            filters.propertyType === 'depot' ? 'Dépôt' :
                              filters.propertyType === 'studio' ? 'Studio' :
                                filters.propertyType === 'commerce' ? 'Commerce' :
                                  'Bureau / Local'
                )}
              </span>
              <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${isTypeOpen ? 'rotate-180' : ''}`} />
            </button>

            {isTypeOpen && (
              <div className="absolute z-30 mt-2 w-full bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="max-h-60 overflow-y-auto custom-scrollbar p-1.5">
                  {[
                    { id: 'all', label: 'Tous les types' },
                    { id: 'apartment', label: 'Appartement' },
                    { id: 'villa', label: 'Villa' },
                    { id: 'duplex', label: 'Duplex' },
                    { id: 'triplex', label: 'Triplex' },
                    { id: 'land', label: 'Terrain' },
                    { id: 'penthouse', label: 'Penthouse' },
                    { id: 'depot', label: 'Dépôt' },
                    { id: 'studio', label: 'Studio' },
                    { id: 'commerce', label: 'Commerce' },
                    { id: 'commercial', label: 'Bureau / Local' }
                  ].map(type => (
                    <button
                      key={type.id}
                      onClick={() => { setFilters({ ...filters, propertyType: type.id as any }); setIsTypeOpen(false); }}
                      className={`
                        w-full px-4 py-3 rounded-lg text-left text-sm transition-all duration-200
                        flex items-center justify-between group mt-0.5 first:mt-0
                        ${filters.propertyType === type.id
                          ? 'bg-brand-teal/5 text-brand-teal font-bold'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                      `}
                    >
                      <span>{type.label}</span>
                      {filters.propertyType === type.id && <Check size={16} className="text-brand-teal animate-in zoom-in" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Location Filter */}
      <div className="relative" ref={cityDropdownRef}>
        <label className="text-sm font-bold text-gray-700 mb-3 flex items-center">
          <MapPin size={16} className="mr-2 text-brand-teal" strokeWidth={1.5} /> Emplacement
        </label>
        <button
          type="button"
          onClick={() => setIsCityOpen(!isCityOpen)}
          className={`
            w-full p-3.5 border-2 rounded-xl bg-white text-gray-900 font-medium 
            flex items-center justify-between transition-all duration-300
            ${isCityOpen ? 'border-brand-teal shadow-md' : 'border-gray-100 hover:border-gray-200 shadow-sm'}
          `}
        >
          <span className="truncate">
            {filters.city === 'all' ? 'Toutes les villes' : filters.city}
          </span>
          <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${isCityOpen ? 'rotate-180' : ''}`} />
        </button>

        {isCityOpen && (
          <div className="absolute z-30 mt-2 w-full bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="max-h-60 overflow-y-auto custom-scrollbar p-1.5">
              <button
                onClick={() => { setFilters({ ...filters, city: 'all' }); setIsCityOpen(false); }}
                className={`
                  w-full px-4 py-3 rounded-lg text-left text-sm transition-all duration-200
                  flex items-center justify-between group
                  ${filters.city === 'all'
                    ? 'bg-brand-teal/5 text-brand-teal font-bold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                `}
              >
                <span>Toutes les villes</span>
                {filters.city === 'all' && <Check size={16} className="text-brand-teal animate-in zoom-in" />}
              </button>
              {uniqueCities.map(city => (
                <button
                  key={city}
                  onClick={() => { setFilters({ ...filters, city }); setIsCityOpen(false); }}
                  className={`
                    w-full px-4 py-3 rounded-lg text-left text-sm transition-all duration-200
                    flex items-center justify-between group mt-0.5
                    ${filters.city === city
                      ? 'bg-brand-teal/5 text-brand-teal font-bold'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                  `}
                >
                  <span>{city}</span>
                  {filters.city === city && <Check size={16} className="text-brand-teal animate-in zoom-in" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Prix Max Filter — touch-friendly range slider */}
      <div>
        <label className="text-sm font-bold text-gray-700 mb-3 flex items-center">
          <DollarSign size={16} className="mr-2 text-brand-teal" strokeWidth={1.5} /> Prix Maximum
        </label>
        {/* Custom range slider with large touch target */}
        <div className="relative py-3">
          <input
            type="range"
            min="0"
            max={maxPriceLimit}
            step="50000"
            value={filters.maxPrice}
            onChange={(e) => setFilters({ ...filters, maxPrice: Number(e.target.value) })}
            style={{
              WebkitAppearance: 'none',
              appearance: 'none',
              width: '100%',
              height: '6px',
              borderRadius: '9999px',
              outline: 'none',
              cursor: 'pointer',
              background: `linear-gradient(to right, #0EA5E9 0%, #0EA5E9 ${(filters.maxPrice / maxPriceLimit) * 100}%, #E5E7EB ${(filters.maxPrice / maxPriceLimit) * 100}%, #E5E7EB 100%)`
            }}
            className="range-slider-thumb w-full"
            aria-label="Prix maximum"
          />
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
            <Price amount={0} />
          </span>
          <span className="text-xs font-semibold text-brand-teal bg-brand-teal/10 px-3 py-1.5 rounded-lg">
            <Price amount={filters.maxPrice} />
          </span>
        </div>
      </div>

      {/* Chambres / Surface Filter */}
      {filters.propertyType === 'land' ? (
        <div>
          <label className="text-sm font-bold text-gray-700 mb-3 flex items-center">
            <Square size={16} className="mr-2 text-brand-teal" strokeWidth={1.5} /> Surface Minimum (m²)
          </label>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFilters({ ...filters, minArea: Math.max(0, (filters.minArea || 0) - 100) })}
              className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-brand-teal hover:text-white transition text-lg font-bold flex-shrink-0"
            >
              −
            </button>
            <div className="flex-1 text-center font-bold text-lg bg-gray-50 py-2.5 rounded-xl border border-gray-200">
              {filters.minArea || 0} m²
            </div>
            <button
              onClick={() => setFilters({ ...filters, minArea: (filters.minArea || 0) + 100 })}
              className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-brand-teal hover:text-white transition text-lg font-bold flex-shrink-0"
            >
              +
            </button>
          </div>
        </div>
      ) : (
        <div>
          <label className="text-sm font-bold text-gray-700 mb-3 flex items-center">
            <BedDouble size={16} className="mr-2 text-brand-teal" strokeWidth={1.5} /> Chambres Minimum
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {[1, 2, 3, 4].map(num => (
              <button
                key={num}
                onClick={() => setFilters({ ...filters, minBedrooms: filters.minBedrooms === num ? 0 : num })}
                className={`
                  w-12 h-12 rounded-xl font-bold transition-all transform active:scale-95
                  ${filters.minBedrooms === num
                    ? 'bg-brand-teal text-white shadow-lg shadow-brand-teal/30 scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                {num}+
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reset Filter Button */}
      <button
        onClick={() => setFilters({
          ...filters,
          minPrice: 0,
          maxPrice: 5000000,
          minBedrooms: 0,
          minArea: 0,
          listingType: 'all',
          propertyType: 'all',
          city: 'all',
          isHotDeal: false
        })}
        className="w-full mt-4 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
      >
        <RefreshCw size={16} />
        Réinitialiser
      </button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto w-full px-4 py-6 md:py-8 pb-28 md:pb-8 bg-brand-light min-h-screen">

      {/* ── MOBILE: Floating Filter Button ── */}
      <div className="md:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-40">
        <button
          onClick={openFilter}
          className="flex items-center gap-2 px-5 py-3 bg-brand-dark text-white rounded-full shadow-2xl border border-brand-dark hover:bg-brand-teal transition-all duration-300 transform active:scale-95 whitespace-nowrap"
          id="mobile-filter-toggle"
        >
          <SlidersHorizontal size={16} className="text-brand-teal" />
          <span className="font-bold text-sm tracking-wide">Filtres</span>
          {/* Active filter count badge */}
          {(filters.listingType !== 'all' || filters.propertyType !== 'all' || filters.city !== 'all' || filters.maxPrice < maxPriceLimit || filters.minBedrooms > 0 || (filters.propertyType === 'land' && (filters.minArea || 0) > (filters.isHotDeal ? 1000 : 0))) && (
            <span className="w-5 h-5 bg-brand-teal text-white text-[10px] font-extrabold rounded-full flex items-center justify-center animate-in zoom-in">
              {[
                filters.listingType !== 'all',
                filters.propertyType !== 'all',
                filters.city !== 'all',
                filters.maxPrice < maxPriceLimit,
                filters.minBedrooms > 0,
                filters.propertyType === 'land' && (filters.minArea || 0) > (filters.isHotDeal ? 1000 : 0),
              ].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* ── MOBILE: Filter Bottom Drawer ── */}
      {isMobileFilterOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={closeFilter}
        >
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${
              isFilterAnimating ? 'opacity-100' : 'opacity-0'
            }`}
          />
          {/* Drawer */}
          <div
            className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl max-h-[88vh] flex flex-col transition-transform duration-300 ease-in-out ${
              isFilterAnimating ? 'translate-y-0' : 'translate-y-full'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer handle + header */}
            <div className="flex-shrink-0 px-6 pt-4 pb-3 border-b border-gray-100">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-brand-teal/10 p-2 rounded-lg">
                    <Filter size={18} className="text-brand-teal" />
                  </div>
                  <h3 className="font-bold text-lg text-brand-dark">Filtres</h3>
                </div>
                <button
                  onClick={closeFilter}
                  className="p-2 rounded-full hover:bg-gray-100 transition text-gray-400"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            {/* Scrollable filter content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {filterContent}
            </div>
            {/* Apply button */}
            <div className="flex-shrink-0 px-6 pb-8 pt-4 border-t border-gray-100">
              <button
                onClick={closeFilter}
                className="w-full py-4 bg-gradient-to-r from-brand-teal to-cyan-500 text-white font-bold rounded-2xl text-base shadow-lg shadow-brand-teal/20 hover:from-cyan-500 hover:to-brand-teal transition-all duration-300"
              >
                Afficher {isListingsLoading ? '...' : pagination.total} résultats
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8 w-full">
        {/* ── DESKTOP: Filters Sidebar ── */}
        <div className="hidden md:block w-72 flex-shrink-0">
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 sticky top-24">
            <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-gray-100">
              <div className="bg-brand-teal/10 p-2 rounded-lg">
                <Filter size={20} className="text-brand-teal" />
              </div>
              <h3 className="font-bold text-lg text-brand-dark">Filtres</h3>
            </div>
            {filterContent}
          </div>
        </div>

        {/* Results Grid */}
        <div className="flex-1">
          {/* Mobile header */}
          <div className="md:hidden mb-5">
            <h1 className="text-xl font-serif font-bold text-brand-dark">Propriétés</h1>
            <p className="text-brand-grey text-sm mt-0.5">
              {isListingsLoading ? 'Chargement...' : `${pagination.total} résultat${pagination.total !== 1 ? 's' : ''} trouvé${pagination.total !== 1 ? 's' : ''}`}
            </p>
          </div>
          {/* Desktop header */}
          <div className="hidden md:block mb-6">
            <h2 className="text-2xl font-serif font-bold text-brand-dark">Propriétés</h2>
            <p className="text-brand-grey text-sm md:text-base">
              {isListingsLoading ? 'Chargement...' : `${pagination.total} résultat${pagination.total !== 1 ? 's' : ''} trouvé${pagination.total !== 1 ? 's' : ''}`}
            </p>
          </div>

          {isListingsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
              {[...Array(6)].map((_, i) => <SkeletonPropertyCard key={i} />)}
            </div>
          ) : serverProperties.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
                {serverProperties.map(property => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    onSelect={onSelectProperty}
                    isFavorite={user?.favorites.includes(property.id) || false}
                    userRole={userRole}
                    onToggleFavorite={onToggleFavorite}
                    user={user}
                  />
                ))}
              </div>

              {/* Server-side Pagination Controls */}
              {pagination.totalPages > 1 && (
                <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <p className="text-gray-500 text-sm">
                    Affichage de{' '}
                    <span className="font-bold text-brand-dark">{(pagination.page - 1) * pagination.limit + 1}</span>
                    {' '}à{' '}
                    <span className="font-bold text-brand-dark">{Math.min(pagination.page * pagination.limit, pagination.total)}</span>
                    {' '}sur{' '}
                    <span className="font-bold text-brand-dark">{pagination.total}</span> propriétés
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      id="pagination-prev"
                      onClick={() => {
                        setCurrentPage(prev => Math.max(1, prev - 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={currentPage === 1}
                      className={`p-2 rounded-lg border transition-all ${currentPage === 1
                        ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-brand-teal hover:text-brand-teal'
                        }`}
                    >
                      <ChevronLeft size={20} />
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: pagination.totalPages }).map((_, i) => {
                        const pageNum = i + 1;
                        if (
                          pageNum === 1 ||
                          pageNum === pagination.totalPages ||
                          (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                        ) {
                          return (
                            <button
                              key={pageNum}
                              id={`pagination-page-${pageNum}`}
                              onClick={() => {
                                setCurrentPage(pageNum);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className={`w-10 h-10 rounded-lg font-bold transition-all ${currentPage === pageNum
                                ? 'bg-brand-teal text-white shadow-md'
                                : 'bg-white text-gray-600 border border-gray-200 hover:border-brand-teal hover:text-brand-teal'
                                }`}
                            >
                              {pageNum}
                            </button>
                          );
                        } else if (
                          (pageNum === currentPage - 2 && pageNum > 1) ||
                          (pageNum === currentPage + 2 && pageNum < pagination.totalPages)
                        ) {
                          return <span key={pageNum} className="px-1 text-gray-400">...</span>;
                        }
                        return null;
                      })}
                    </div>

                    <button
                      id="pagination-next"
                      onClick={() => {
                        setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={currentPage === pagination.totalPages}
                      className={`p-2 rounded-lg border transition-all ${currentPage === pagination.totalPages
                        ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-brand-teal hover:text-brand-teal'
                        }`}
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-xl p-12 text-center border border-gray-100 shadow-sm mt-4">
              <div className="mx-auto w-16 h-16 bg-brand-light rounded-full flex items-center justify-center mb-6">
                <Search className="text-brand-teal" size={32} />
              </div>
              <h3 className="text-xl font-serif font-bold text-brand-dark mb-2">Aucun résultat</h3>
              <p className="text-brand-grey">Essayez d'ajuster vos filtres pour trouver votre bonheur.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListingsPage;

