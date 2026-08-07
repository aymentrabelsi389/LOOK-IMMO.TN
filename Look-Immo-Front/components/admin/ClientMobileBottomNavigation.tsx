import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, User, Building, Coins } from 'lucide-react';
import { useUI } from '@/context/UIContext';
import { useAuthStore } from '@/stores/useAuthStore';
import PropertySearchSheet from '../ui/PropertySearchSheet';

const ClientMobileBottomNavigation = () => {
  const location = useLocation();
  const { user } = useAuthStore();
  const { filters, handleSearch } = useUI();
  const currentPath = location.pathname;
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isFABAnimating, setIsFABAnimating] = useState(false);
  const lastScrollY = useRef(0);

  // Scroll to hide logic — uses a ref so the listener is only registered once
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (Math.abs(currentScrollY - lastScrollY.current) < 10) return;

      if (currentScrollY < 80) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY.current) {
        setIsVisible(false); // Scrolling down
      } else {
        setIsVisible(true); // Scrolling up
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Active state helpers
  const isActive = (type: 'home' | 'vente' | 'location' | 'compte') => {
    if (type === 'home') {
      return currentPath === '/';
    }
    if (type === 'vente') {
      return currentPath === '/listings' && filters.listingType === 'sale';
    }
    if (type === 'location') {
      return currentPath === '/listings' && filters.listingType === 'rent';
    }
    if (type === 'compte') {
      return (
        currentPath.startsWith('/dashboard') ||
        currentPath.startsWith('/auth') ||
        currentPath.startsWith('/forgot-password')
      );
    }
    return false;
  };

  // Avatar/Profile icon renderer
  const renderAvatar = () => {
    if (user?.avatar) {
      return (
        <img
          src={user.avatar}
          alt={user.name || 'Profil'}
          className={`w-[24px] h-[24px] rounded-full object-cover transition-all duration-300 ${
            isActive('compte')
              ? 'ring-2 ring-brand-teal border-brand-teal scale-110'
              : 'border border-white/30 hover:border-white/60'
          }`}
        />
      );
    }
    return (
      <User
        size={22}
        className={`transition-all duration-300 ${
          isActive('compte') ? 'text-brand-teal scale-110' : 'text-white/60 hover:text-white'
        }`}
      />
    );
  };

  return (
    <>
      <nav className={`fixed bottom-0 left-0 right-0 z-50 bg-[#0C1F32]/95 backdrop-blur-lg border-t border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.3)] rounded-t-[20px] lg:hidden pb-[env(safe-area-inset-bottom)] transition-transform duration-300 ease-in-out transform ${
        (isVisible || isSearchOpen || isFABAnimating) ? 'translate-y-0' : 'translate-y-[130%]'
      }`}>
        <div className="h-[64px] flex items-center justify-around w-full relative px-4">
          
          {/* Item 1: Home */}
          <Link
            to="/"
            className="flex flex-col items-center justify-center flex-1 h-full py-1 transition-all duration-200"
            aria-label="Accueil"
          >
            <Home
              size={22}
              className={`transition-all duration-300 ${
                isActive('home') ? 'text-brand-teal scale-110' : 'text-white/60 hover:text-white'
              }`}
            />
            <span
              className={`text-[10px] font-semibold mt-1 transition-all duration-300 ${
                isActive('home') ? 'text-brand-teal' : 'text-white/40'
              }`}
            >
              Accueil
            </span>
          </Link>
 
          {/* Item 2: Vente */}
          <button
            onClick={() => {
              handleSearch({ listingType: 'sale' });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex flex-col items-center justify-center flex-1 h-full py-1 transition-all duration-200 cursor-pointer border-none bg-transparent"
            aria-label="Vente"
          >
            <Coins
              size={22}
              className={`transition-all duration-300 ${
                isActive('vente') ? 'text-brand-teal scale-110' : 'text-white/60 hover:text-white'
              }`}
            />
            <span
              className={`text-[10px] font-semibold mt-1 transition-all duration-300 ${
                isActive('vente') ? 'text-brand-teal' : 'text-white/40'
              }`}
            >
              Vente
            </span>
          </button>
 
          {/* Item 3: Center Floating Search Button */}
          <div className="flex-1 flex justify-center h-full relative">
            <button
              onClick={() => {
                setIsFABAnimating(true);
                setTimeout(() => {
                  setIsSearchOpen(true);
                  setIsFABAnimating(false);
                }, 220);
              }}
              type="button"
              className={`absolute -top-6 w-[52px] h-[52px] bg-brand-teal text-white rounded-full flex items-center justify-center shadow-lg shadow-brand-teal/40 border-4 border-[#0C1F32] transition-all duration-300 z-10 cursor-pointer ${
                isFABAnimating ? 'scale-[1.2] bg-cyan-500 shadow-cyan-500/50' : 'hover:scale-105 active:scale-95'
              }`}
              aria-label="Rechercher"
            >
              <Search size={22} className={`stroke-[2.5] transition-transform duration-300 ${isFABAnimating ? 'rotate-[360deg] scale-95' : ''}`} />
            </button>
          </div>

          {/* Item 4: Location */}
          <button
            onClick={() => {
              handleSearch({ listingType: 'rent' });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex flex-col items-center justify-center flex-1 h-full py-1 transition-all duration-200 cursor-pointer border-none bg-transparent"
            aria-label="Location"
          >
            <Building
              size={22}
              className={`transition-all duration-300 ${
                isActive('location') ? 'text-brand-teal scale-110' : 'text-white/60 hover:text-white'
              }`}
            />
            <span
              className={`text-[10px] font-semibold mt-1 transition-all duration-300 ${
                isActive('location') ? 'text-brand-teal' : 'text-white/40'
              }`}
            >
              Location
            </span>
          </button>

          {/* Item 5: Compte */}
          <Link
            to="/dashboard"
            className="flex flex-col items-center justify-center flex-1 h-full py-1 transition-all duration-200"
            aria-label="Mon Compte"
          >
            {renderAvatar()}
            <span
              className={`text-[10px] font-semibold mt-1 transition-all duration-300 ${
                isActive('compte') ? 'text-brand-teal' : 'text-white/40'
              }`}
            >
              Compte
            </span>
          </Link>

        </div>
      </nav>

      {/* Property Search bottom sheet */}
      <PropertySearchSheet isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};

export default ClientMobileBottomNavigation;
