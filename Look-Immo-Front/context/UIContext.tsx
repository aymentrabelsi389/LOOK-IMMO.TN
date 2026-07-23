import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FilterState } from '@/types';

export const INITIAL_FILTERS: FilterState = {
  query: '',
  listingType: 'all',
  propertyType: 'all',
  minPrice: 0,
  maxPrice: 5000000,
  minBedrooms: 0,
  minArea: 0,
  city: 'all',
  isHotDeal: false,
};

interface UIContextType {
  handleNavigate: (page: string, id?: string) => void;
  selectedPropertyId: string | null;
  setSelectedPropertyId: (id: string | null) => void;
  selectedBlogPostId: string | null;
  setSelectedBlogPostId: (id: string | null) => void;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  handleSearch: (newFilters: Partial<FilterState>) => void;
  showAuthModal: boolean;
  setShowAuthModal: (v: boolean) => void;
  authModalReason: 'favorites' | 'appointment';
  setAuthModalReason: (v: 'favorites' | 'appointment') => void;
  authMode: 'login' | 'signup';
  setAuthMode: (v: 'login' | 'signup') => void;
  showTermsModal: boolean;
  setShowTermsModal: (v: boolean) => void;
  showPrivacyModal: boolean;
  setShowPrivacyModal: (v: boolean) => void;
}

const UIContext = createContext<UIContextType | null>(null);

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error('useUI must be used within a UIProvider');
  return context;
};

export const UIProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedBlogPostId, setSelectedBlogPostId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

  // Modals
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalReason, setAuthModalReason] = useState<'favorites' | 'appointment'>('favorites');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Keep the selected property/blog-post id in sync with the URL — everything
  // else that used to be derived here (a `currentPage` mirror of the route)
  // is gone; consumers read the route directly via useLocation()/useParams().
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/property/')) {
      const id = path.substring('/property/'.length);
      if (id) setSelectedPropertyId(id);
    } else if (path.startsWith('/blog-post/')) {
      const id = path.substring('/blog-post/'.length);
      if (id) setSelectedBlogPostId(id);
    }
  }, [location.pathname]);

  const handleNavigate = (page: string, id?: string) => {
    if (page === 'property-details') {
      const targetId = id || selectedPropertyId;
      if (id) setSelectedPropertyId(id);
      navigate(targetId ? `/property/${targetId}` : '/property');
      return;
    }
    if (page === 'blog-post') {
      const targetId = id || selectedBlogPostId;
      if (id) setSelectedBlogPostId(id);
      navigate(targetId ? `/blog-post/${targetId}` : '/blog-post');
      return;
    }
    const paths: Record<string, string> = {
      home: '/',
      listings: '/listings',
      dashboard: '/dashboard',
      admin: '/admin',
      auth: '/auth',
      contact: '/contact',
      blog: '/blog',
      'forgot-password': '/forgot-password',
    };
    navigate(paths[page] || '/');
  };

  const handleSearch = (newFilters: Partial<FilterState>) => {
    // ✅ Don't spread prev: always start from INITIAL_FILTERS so old values don't bleed through
    setFilters({ ...INITIAL_FILTERS, ...newFilters });
    navigate('/listings');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <UIContext.Provider
      value={{
        handleNavigate,
        selectedPropertyId,
        setSelectedPropertyId,
        selectedBlogPostId,
        setSelectedBlogPostId,
        filters,
        setFilters,
        handleSearch,
        showAuthModal,
        setShowAuthModal,
        authModalReason,
        setAuthModalReason,
        authMode,
        setAuthMode,
        showTermsModal,
        setShowTermsModal,
        showPrivacyModal,
        setShowPrivacyModal,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};
