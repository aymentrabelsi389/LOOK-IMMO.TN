import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Clock, TrendingUp, MapPin, Home, RefreshCw } from 'lucide-react';
import { propertiesAPI } from '../../services/api';
import { getImageSrc } from '../../utils/imageUtils';
import { useData } from '../../context/DataContext';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PropertySearchSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: string;
  title: string;
  city: string;
  price: number;
  type: string;       // 'villa' | 'apartment' | 'land' | …
  listingType: string; // 'sale' | 'rent'
  images: string[];
  category?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const RECENT_SEARCHES_KEY = 'lookimmo_recent_searches';
const MAX_RECENT = 5;
const DEBOUNCE_MS = 300;

const DEFAULT_POPULAR_SEARCHES = [
  { label: 'Tunis', icon: '📍' },
  { label: 'Ariana', icon: '📍' },
  { label: 'Sousse', icon: '📍' },
  { label: 'Villa', icon: '🏡' },
  { label: 'Appartement', icon: '🏢' },
  { label: 'Terrain', icon: '🌿' },
  { label: 'Penthouse', icon: '✨' },
  { label: 'Bureau', icon: '💼' },
];

const PROPERTY_TYPE_SEARCHES = [
  { label: 'Villa', icon: '🏡' },
  { label: 'Appartement', icon: '🏢' },
  { label: 'Terrain', icon: '🌿' },
  { label: 'Penthouse', icon: '✨' },
  { label: 'Bureau', icon: '💼' },
];

// Keyword → API category/type mappings for natural-language search
const KEYWORD_CATEGORY_MAP: Record<string, string> = {
  villa: 'villa',
  villas: 'villa',
  appartement: 'apartment',
  appartements: 'apartment',
  studio: 'studio',
  duplex: 'duplex',
  triplex: 'triplex',
  penthouse: 'penthouse',
  terrain: 'land',
  terrains: 'land',
  bureau: 'commercial',
  bureaux: 'commercial',
  commerce: 'commerce',
  'local commercial': 'commerce',
  dépôt: 'depot',
  depot: 'depot',
};

const TYPE_LABELS: Record<string, string> = {
  apartment: 'Appartement',
  villa: 'Villa',
  studio: 'Studio',
  duplex: 'Duplex',
  triplex: 'Triplex',
  penthouse: 'Penthouse',
  land: 'Terrain',
  depot: 'Dépôt',
  commercial: 'Bureau',
  commerce: 'Commerce',
};

const LISTING_LABELS: Record<string, string> = {
  sale: 'Vente',
  rent: 'Location',
};

// ─── Price formatter ──────────────────────────────────────────────────────────
function formatPrice(price: number): string {
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(1)}M TND`;
  if (price >= 1_000) return `${Math.round(price / 1_000)}K TND`;
  return `${price.toLocaleString('fr-TN')} TND`;
}

// ─── Local storage helpers ────────────────────────────────────────────────────
function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveRecentSearch(term: string) {
  const recent = getRecentSearches().filter(s => s !== term);
  recent.unshift(term);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

function clearRecentSearches() {
  localStorage.removeItem(RECENT_SEARCHES_KEY);
}

// ─── Main Component ───────────────────────────────────────────────────────────
const PropertySearchSheet: React.FC<PropertySearchSheetProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { siteSettings } = useData();
  const inputRef = useRef<HTMLInputElement>(null);

  // Build popular searches: use discoveryLinks from settings (same as footer "Découvrir") + property types
  const popularSearches = (() => {
    if (siteSettings?.discoveryLinks && siteSettings.discoveryLinks.length > 0) {
      const locationItems = siteSettings.discoveryLinks.map(link => ({ label: link.label, icon: '📍' }));
      return [...locationItems, ...PROPERTY_TYPE_SEARCHES];
    }
    return DEFAULT_POPULAR_SEARCHES;
  })();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load recent searches on open
  useEffect(() => {
    if (isOpen) {
      setRecentSearches(getRecentSearches());
      setTimeout(() => inputRef.current?.focus(), 350);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);


  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Debounced search
  const performSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const normalized = term.trim().toLowerCase();

      // Build API params — check if keyword maps to a category
      const params: Record<string, string | number | undefined> = { limit: 12 };
      const mappedCategory = KEYWORD_CATEGORY_MAP[normalized];
      if (mappedCategory) {
        params.category = mappedCategory;
      } else {
        // Free-text search across title + city
        params.search = term.trim();
      }

      const { data } = await propertiesAPI.getAll(params);
      setResults(data as SearchResult[]);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce query changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, performSearch]);

  const handleSelectResult = useCallback((property: SearchResult) => {
    if (query.trim()) saveRecentSearch(query.trim());
    onClose();
    navigate(`/property/${property.id}`);
  }, [query, navigate, onClose]);

  const handleSelectSuggestion = useCallback((term: string) => {
    setQuery(term);
    if (term.trim()) saveRecentSearch(term.trim());
    inputRef.current?.focus();
  }, []);

  const handleClearRecent = useCallback(() => {
    clearRecentSearches();
    setRecentSearches([]);
  }, []);

  const showSuggestions = !query.trim();
  const showResults = query.trim().length > 0;

  return (
    <div className={`fixed inset-0 z-[100] flex items-end justify-center lg:hidden ${
      isOpen ? 'pointer-events-auto' : 'pointer-events-none'
    }`}>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Sheet */}
      <div
        className={`relative w-full max-w-md bg-[#0C1F32] rounded-t-[28px] border-t border-white/10 shadow-[0_-12px_40px_rgba(0,0,0,0.5)] z-10 transition-transform duration-300 ease-in-out transform flex flex-col ${
          isOpen ? 'translate-y-0 pointer-events-auto' : 'translate-y-full pointer-events-none'
        }`}
        style={{ height: '82%', maxHeight: '88%' }}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto my-3 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Search size={18} className="text-brand-teal" />
            <h3 className="text-white font-black text-base tracking-wide">Recherche</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-full transition-all duration-200"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search Input */}
        <div className="px-5 pt-4 pb-3 flex-shrink-0">
          <div className="relative flex items-center">
            <Search size={18} className="absolute left-3.5 text-white/30 flex-shrink-0 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher une ville ou un type de bien..."
              className="w-full bg-white/[0.06] border border-white/10 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-teal/50 focus:bg-white/[0.08] transition-all duration-200"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }}
                className="absolute right-3 p-1 text-white/30 hover:text-white/70 transition-colors"
                aria-label="Effacer"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Suggestions (empty query) ── */}
          {showSuggestions && (
            <div className="px-5 pb-4">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-1.5 text-white/40 text-[11px] font-semibold uppercase tracking-wider">
                      <Clock size={12} />
                      <span>Recherches récentes</span>
                    </div>
                    <button
                      onClick={handleClearRecent}
                      className="text-[10px] text-white/25 hover:text-white/50 transition-colors"
                    >
                      Effacer
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map(term => (
                      <button
                        key={term}
                        onClick={() => handleSelectSuggestion(term)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.06] rounded-full text-[12px] text-white/60 hover:text-white transition-all duration-200"
                      >
                        <Clock size={11} className="text-white/30" />
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Searches */}
              <div>
                <div className="flex items-center gap-1.5 text-white/40 text-[11px] font-semibold uppercase tracking-wider mb-2.5">
                  <TrendingUp size={12} />
                  <span>Recherches populaires</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {popularSearches.map(({ label, icon }) => (
                    <button
                      key={label}
                      onClick={() => handleSelectSuggestion(label)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.05] hover:bg-brand-teal/10 border border-white/[0.06] hover:border-brand-teal/20 rounded-full text-[12px] text-white/60 hover:text-brand-teal transition-all duration-200"
                    >
                      <span>{icon}</span>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Results ── */}
          {showResults && (
            <div className="divide-y divide-white/[0.04]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <RefreshCw size={22} className="animate-spin text-brand-teal/60" />
                  <p className="text-white/30 text-sm">Recherche en cours...</p>
                </div>
              ) : results.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
                    <Search size={24} className="text-white/20" />
                  </div>
                  <p className="text-white/50 text-sm font-medium">Aucun bien trouvé.</p>
                  <p className="text-white/25 text-xs">
                    Essayez: Tunis, Villa, Appartement, Terrain…
                  </p>
                </div>
              ) : (
                <>
                  <p className="px-5 py-2.5 text-[11px] text-white/30 font-medium">
                    {results.length} résultat{results.length !== 1 ? 's' : ''} trouvé{results.length !== 1 ? 's' : ''}
                  </p>
                  {results.map(property => (
                    <button
                      key={property.id}
                      onClick={() => handleSelectResult(property)}
                      className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.04] active:bg-white/[0.06] transition-all duration-200 text-left cursor-pointer"
                    >
                      {/* Thumbnail */}
                      <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-white/5">
                        {property.images?.[0] ? (
                          <img
                            src={getImageSrc(property.images[0], 'thumb')}
                            alt={property.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Home size={20} className="text-white/20" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-white font-semibold leading-snug truncate">
                          {property.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <MapPin size={11} className="text-white/30 flex-shrink-0" />
                          <span className="text-[11px] text-white/40 truncate">{property.city}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-semibold text-brand-teal/80 bg-brand-teal/10 px-1.5 py-0.5 rounded-md">
                            {TYPE_LABELS[property.type] || property.type}
                          </span>
                          <span className="text-[10px] text-white/30">
                            {LISTING_LABELS[property.listingType] || property.listingType}
                          </span>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="flex-shrink-0 text-right">
                        <p className="text-[12px] font-bold text-white/90">
                          {formatPrice(property.price)}
                        </p>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Bottom safe area */}
        <div className="flex-shrink-0 pb-[calc(12px+env(safe-area-inset-bottom))]" />
      </div>
    </div>
  );
};

export default PropertySearchSheet;
