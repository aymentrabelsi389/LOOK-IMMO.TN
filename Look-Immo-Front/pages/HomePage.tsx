import React, { useState, useEffect } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';

import FeaturedPropertiesSection from '../components/home/FeaturedPropertiesSection';
import NewPropertiesSection from '../components/home/NewPropertiesSection';
import PromotionLandsSection from '../components/home/PromotionLandsSection';
import NewsSection from '../components/home/NewsSection';
import { useSEO } from '../hooks/useSEO';
import { useUI } from '../context/UIContext';
import { useAuthStore } from '../stores/useAuthStore';
import { useData } from '../context/DataContext';

const HomePage = () => {
  useSEO({
    title: "L'adresse de vos rêves",
    description: "Look Immo est votre agence immobilière de prestige en Tunisie. Découvrez nos villas d'exception, appartements de luxe et terrains haut de gamme à vendre ou à louer."
  });

  const { handleNavigate: onNavigate, handleSearch: onSearch, setShowAuthModal } = useUI();
  const { properties, availableLocations, blogPosts, handleSelectBlogPost: onSelectPost, isLoading, handleSelectProperty: onSelectProperty } = useData();
  const { user, handleToggleFavorite } = useAuthStore();
  const onToggleFavorite = (propertyId: string) =>
    handleToggleFavorite(propertyId, () => setShowAuthModal(true));
  const userRole = user?.role;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'buy' | 'rent'>('buy');
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [forceShowAllLocations, setForceShowAllLocations] = useState(false);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  const heroImages = [
    "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1600&q=70",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=70",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=70",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroImages.length]);

  const handleSearch = () => {
    onSearch({
      query: searchQuery,
      listingType: activeTab === 'buy' ? 'sale' : 'rent',
      propertyType: 'all',
      isHotDeal: false,
      minPrice: 0,
      maxPrice: 5000000,
      minBedrooms: 0,
      minArea: 0,
      city: 'all',
    });
    onNavigate('listings');
  };

  const filteredLocations = (searchQuery.trim() === '' || forceShowAllLocations)
    ? availableLocations
    : availableLocations.filter(loc => loc.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div>
      {/* Hero Section */}
      <div className="relative h-[85vh] bg-brand-dark z-20">
        <div className="absolute inset-0">
          {heroImages.map((src, index) => (
            <img
              key={src}
              src={src}
              alt={`Hero property ${index + 1}`}
              loading={index === 0 ? "eager" : "lazy"}
              fetchPriority={index === 0 ? "high" : "low"}
              className={`absolute inset-0 w-full h-full object-cover object-[25%_center] md:object-[85%_center] transition-opacity duration-1000 ease-in-out ${index === currentHeroIndex ? 'opacity-80' : 'opacity-0'
                }`}
            />
          ))}
          {/* Balanced Dark Overlay for Readability */}
          <div className="absolute inset-0 bg-black/35"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/80 via-brand-dark/20 to-transparent"></div>
        </div>

        <div className="relative max-w-[1440px] mx-auto px-4 h-full flex flex-col justify-center items-center">
          <div className="text-center mb-8 animate-fade-in-up">
            <h1 className="text-4xl md:text-7xl font-bold text-white mb-2 font-serif tracking-tight drop-shadow-2xl">
              L'adresse de vos <span className="text-brand-teal italic">  rêves</span>
            </h1>
            <p className="text-base md:text-xl text-gray-200 max-w-2xl mx-auto font-light leading-relaxed drop-shadow-lg">
              Trouvez des biens soigneusement sélectionnés pour vivre ou investir.
            </p>
          </div>

          {/* Search Widget */}
          <div className="w-full max-w-3xl bg-white/10 backdrop-blur-2xl rounded-3xl p-5 md:p-8 shadow-2xl border border-white/20 animate-fade-in-up delay-100 relative z-20">
            {/* Tabs - Centered */}
            <div className="flex justify-center mb-8">
              <div className="bg-brand-dark/50 rounded-full p-1.5 flex border border-white/10">
                {['buy', 'rent'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-6 md:px-10 py-3 rounded-full text-sm md:text-base font-semibold transition-all duration-300 capitalize tracking-wide ${activeTab === tab
                      ? 'bg-white text-brand-dark shadow-lg scale-105'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                      }`}
                  >
                    {tab === 'buy' ? 'Acheter' : 'Louer'}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Row */}
            <div className="flex flex-col md:flex-row gap-4 relative">
              {/* Location Search with Dropdown */}
              <div className="relative flex-1 group z-30">
                <div className="absolute left-5 top-1/2 transform -translate-y-1/2 text-white">
                  <MapPin size={24} />
                </div>
                <input
                  type="text"
                  readOnly
                  placeholder="Choisir une ville..."
                  className="w-full h-full bg-white/20 backdrop-blur-md text-white pl-14 pr-12 py-5 rounded-2xl border-2 border-white/30 focus:outline-none focus:border-brand-teal transition-all duration-300 white-placeholder text-lg shadow-lg cursor-pointer"
                  value={searchQuery}
                  onFocus={() => {
                    setForceShowAllLocations(true);
                    setShowLocationDropdown(true);
                  }}
                  onClick={() => {
                    setForceShowAllLocations(true);
                    setShowLocationDropdown(true);
                  }}
                  onBlur={() => setTimeout(() => setShowLocationDropdown(false), 200)}
                  autoComplete="off"
                />
                <div
                  className="absolute right-5 top-1/2 transform -translate-y-1/2 text-white/70 cursor-pointer z-40"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (showLocationDropdown) {
                      setShowLocationDropdown(false);
                      setForceShowAllLocations(false);
                    } else {
                      setForceShowAllLocations(true);
                      setShowLocationDropdown(true);
                    }
                  }}
                >
                  <ChevronDown size={20} className={`transition-transform duration-300 ${showLocationDropdown ? "rotate-180" : ""}`} />
                </div>

                {/* Search Dropdown */}
                {showLocationDropdown && (filteredLocations.length > 0) && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden max-h-60 overflow-y-auto animate-fade-in-up">
                    {filteredLocations.map((loc, index) => (
                      <button
                        key={index}
                        className="w-full text-left px-6 py-4 hover:bg-brand-light flex items-center transition duration-150 border-b border-gray-50 last:border-0"
                        onClick={() => {
                          setSearchQuery(loc);
                          setForceShowAllLocations(false);
                          setShowLocationDropdown(false);
                        }}
                      >
                        <div className="bg-brand-teal/10 p-2 rounded-full mr-3 shadow-sm flex-shrink-0">
                          <MapPin size={16} className="text-brand-teal" />
                        </div>
                        <span className="text-brand-dark font-medium">{loc}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Search Button */}
              <button
                onClick={handleSearch}
                className="md:w-auto bg-brand-teal hover:bg-cyan-600 text-white font-bold px-12 py-5 rounded-2xl shadow-lg shadow-brand-teal/30 transform hover:scale-105 transition-all duration-300 flex items-center justify-center text-lg z-20"
              >
                Rechercher
              </button>
            </div>
          </div>
        </div>
      </div>

      <FeaturedPropertiesSection
        properties={properties}
        onSelectProperty={onSelectProperty}
        userRole={userRole}
        onToggleFavorite={onToggleFavorite}
        user={user}
        isLoading={isLoading}
        onViewAll={() => {
          onSearch({
            query: '',
            listingType: 'all',
            propertyType: 'all',
            minPrice: 0,
            maxPrice: 5000000,
            minBedrooms: 0,
            minArea: 0
          });
          onNavigate('listings');
        }}
      />
      <NewPropertiesSection
        properties={properties}
        onSelectProperty={onSelectProperty}
        userRole={userRole}
        onToggleFavorite={onToggleFavorite}
        user={user}
        isLoading={isLoading}
      />
      <PromotionLandsSection
        properties={properties}
        onSelectProperty={onSelectProperty}
        userRole={userRole}
        onToggleFavorite={onToggleFavorite}
        user={user}
        isLoading={isLoading}
      />
      <NewsSection blogPosts={blogPosts} onSelectPost={onSelectPost} />
    </div>
  );
};

export default HomePage;
