import React, { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  User as UserIcon,
  X,
} from "lucide-react";
import {
  DEFAULT_MAX_PRICE, DEFAULT_MIN_PRICE, DEFAULT_MIN_BEDROOMS, DEFAULT_MIN_AREA,
  LAND_OR_HOTDEAL_MAX_PRICE, PROMOTION_LAND_MIN_AREA,
} from '@/constants/filterConstants';
import {
  CurrencyCode,
  FilterState,
  ListingType,
  PropertyType,
  User,
  Appointment,
} from "@/types";
import { useCurrencyStore } from "@/stores/useCurrencyStore";
import { useTranslation } from "@/hooks/useTranslation";
import logo from "@/look-immo-icon-gold.png";
import { useAdmin } from "@/features/admin/hooks/useAdmin";

const FlagIcon = ({ code, className = "w-5 h-4 object-cover rounded-sm" }: { code: string; className?: string }) => {
  const flagUrls: Record<string, string> = {
    TN: "https://flagcdn.com/w40/tn.png",
    EU: "https://flagcdn.com/w40/eu.png",
    US: "https://flagcdn.com/w40/us.png",
    FR: "https://flagcdn.com/w40/fr.png",
    GB: "https://flagcdn.com/w40/gb.png",
  };

  return (
    <img
      src={flagUrls[code]}
      alt={code}
      className={className}
    />
  );
};

const Navbar = ({
  user,
  onNavigate,
  onLogout,
  currentPage,
  onSearch,
  filters,
}: {
  user: User | null;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  currentPage: string;
  onSearch: (filters: Partial<FilterState>) => void;
  filters: FilterState;
  appointments?: Appointment[];
}) => {
  const { isAdmin } = useAdmin();
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const { currency, setCurrency } = useCurrencyStore();
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const currencyDropdownRef = useRef<HTMLDivElement>(null);
  const { t, language, setLanguage, toggleLanguage } = useTranslation();
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);



  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;


      if (currentScrollY < 10) {
        setIsVisible(true);
      } else if (Math.abs(currentScrollY - lastScrollY) > 5) {
        setIsVisible(currentScrollY < lastScrollY);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const handleNavClick = (
    page: string,
    type?: ListingType,
    propType?: PropertyType,
    isHotDeal?: boolean,
  ) => {
    if (type || propType || isHotDeal) {
      const searchFilters: Partial<FilterState> = {
        query: "",
        listingType: type || "all",
        propertyType: propType || "all",
        minPrice: DEFAULT_MIN_PRICE,
        maxPrice: (isHotDeal || propType === 'land') ? LAND_OR_HOTDEAL_MAX_PRICE : DEFAULT_MAX_PRICE,
        minBedrooms: DEFAULT_MIN_BEDROOMS,
        minArea: isHotDeal ? PROMOTION_LAND_MIN_AREA : DEFAULT_MIN_AREA,
        isHotDeal: isHotDeal || false,
      };
      onSearch(searchFilters);
      onNavigate("listings");
    } else {
      onNavigate(page);
    }
  };

  const isAccueilActive = currentPage === "home";
  const isAchatActive =
    currentPage === "listings" &&
    filters.listingType === "sale" &&
    filters.propertyType !== "land" &&
    !filters.isHotDeal;
  const isLocationActive =
    currentPage === "listings" && filters.listingType === "rent" && !filters.isHotDeal;
  const isTerrainsActive =
    currentPage === "listings" && filters.propertyType === "land" && !filters.isHotDeal;
  const isPromotionsActive =
    currentPage === "listings" && filters.isHotDeal === true;
  const isBlogActive = currentPage === "blog";
  const isContactActive = currentPage === "contact";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        currencyDropdownRef.current &&
        !currencyDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCurrencyOpen(false);
      }

      if (
        langDropdownRef.current &&
        !langDropdownRef.current.contains(event.target as Node)
      ) {
        setIsLangOpen(false);
      }

      // Mobile menu click outside logic
      if (
        isOpen &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const currencies: {
    code: CurrencyCode;
    symbol: string;
    label: string;
    flagCode: string;
  }[] = [
      { code: "TND", symbol: "DT", label: "TND", flagCode: "TN" },
      { code: "EUR", symbol: "€", label: "EUR", flagCode: "EU" },
      { code: "USD", symbol: "$", label: "USD", flagCode: "US" },
    ];

  const languages: {
    code: "fr" | "en";
    label: string;
    fullName: string;
    flagCode: string;
  }[] = [
      { code: "fr", label: "FR", fullName: "Français", flagCode: "FR" },
      { code: "en", label: "EN", fullName: "English", flagCode: "GB" },
    ];

  const currentCurrency =
    currencies.find((c) => c.code === currency) || currencies[0];
  const currentLanguage =
    languages.find((l) => l.code === language) || languages[0];


  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ease-in-out ${isVisible ? "translate-y-0" : "-translate-y-full"
          } bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100 text-brand-dark`}
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div
              className="flex items-center gap-3 cursor-pointer group shrink-0"
              onClick={() => onNavigate("home")}
            >
              <div className="w-[35px] h-[35px] shrink-0 flex items-center justify-center rounded-full bg-[#0B1C2D] border border-[#C6A75E] shadow-sm transition-transform duration-300 group-hover:scale-105 overflow-hidden p-[1.5px]">
                <img
                  src={logo}
                  alt="LI"
                  className="w-full h-full object-contain"
                  loading="eager"
                  decoding="sync"
                />
              </div>
              <span
                translate="no"
                className="notranslate text-[20px] lg:text-[24px] xl:text-[28px] font-semibold font-luxury tracking-[0.12em] uppercase transition-all duration-500 group-hover:scale-105 origin-left text-[#0B1C2D] whitespace-nowrap"
              >
                LOOK IMMO
              </span>
            </div>

            <div className="hidden md:flex items-center space-x-1 lg:space-x-2 xl:space-x-3 shrink-0">
              {([
                { key: 'home', label: t('navHome'), active: isAccueilActive, onClick: () => handleNavClick('home') },
                { key: 'sales', label: t('navSales'), active: isAchatActive, onClick: () => handleNavClick('listings', 'sale') },
                { key: 'rentals', label: t('navRentals'), active: isLocationActive, onClick: () => handleNavClick('listings', 'rent') },
                { key: 'lands', label: t('navLands'), active: isTerrainsActive, onClick: () => handleNavClick('listings', 'sale', 'land') },
                { key: 'promotions', label: t('navPromotions'), active: isPromotionsActive, onClick: () => handleNavClick('listings', 'sale', 'land', true) },
                { key: 'blog', label: t('navBlog'), active: isBlogActive, onClick: () => handleNavClick('blog') },
                { key: 'contact', label: t('navContact'), active: isContactActive, onClick: () => handleNavClick('contact') },
              ] as const).map(({ key, label, active, onClick }) => (
                <button
                  key={key}
                  onClick={onClick}
                  className={`transition-all duration-300 font-medium px-2.5 lg:px-3.5 py-1.5 rounded-lg text-center whitespace-nowrap ${active
                      ? 'text-brand-teal font-bold'
                      : 'text-brand-grey hover:text-brand-dark'
                    }`}
                >
                  {label}
                </button>
              ))}
              <div className="h-6 w-px mx-1 bg-gray-200"></div>

              {/* Language & Currency Controls */}
              <div className="flex items-center gap-2">
                {/* Language Dropdown */}
                <div className="relative" ref={langDropdownRef}>
                  <button
                    onClick={() => {
                      setIsLangOpen(!isLangOpen);
                      setIsCurrencyOpen(false);
                    }}
                    aria-haspopup="listbox"
                    aria-label="Langue"
                    className="flex items-center space-x-1.5 text-brand-dark bg-white px-2.5 py-2 rounded-md border border-gray-300 hover:border-brand-teal transition shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-teal min-w-[76px]"
                  >
                    <FlagIcon code={currentLanguage.flagCode} />
                    <span className="font-semibold text-xs">{currentLanguage.label}</span>
                    <ChevronDown
                      size={13}
                      className={`text-gray-500 transition-transform duration-200 ml-auto ${isLangOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isLangOpen && (
                    <ul
                      role="listbox"
                      className="absolute right-0 mt-1 w-[120px] bg-white rounded-md shadow-lg border border-gray-200 overflow-hidden animate-fade-in-up z-50 py-1"
                      aria-label="Sélection de langue"
                    >
                      {languages.map((l) => (
                        <li
                          key={l.code}
                          role="option"
                          onClick={() => {
                            setLanguage(l.code);
                            setIsLangOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-gray-50 transition-colors cursor-pointer ${language === l.code ? "bg-teal-50 text-brand-teal font-bold" : "text-gray-700"
                            }`}
                        >
                          <FlagIcon code={l.flagCode} />
                          <span>{l.fullName}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Currency Dropdown */}
                <div className="relative" ref={currencyDropdownRef}>
                  <button
                    onClick={() => {
                      setIsCurrencyOpen(!isCurrencyOpen);
                      setIsLangOpen(false);
                    }}
                    aria-haspopup="listbox"
                    aria-label="Devise"
                    className="flex items-center space-x-1.5 text-brand-dark bg-white px-2.5 py-2 rounded-md border border-gray-300 hover:border-brand-teal transition shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-teal min-w-[85px]"
                  >
                    <FlagIcon code={currentCurrency.flagCode} />
                    <span className="font-semibold text-xs">{currency}</span>
                    <ChevronDown
                      size={13}
                      className={`text-gray-500 transition-transform duration-200 ml-auto ${isCurrencyOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isCurrencyOpen && (
                    <ul
                      role="listbox"
                      className="absolute right-0 mt-1 w-[110px] bg-white rounded-md shadow-lg border border-gray-200 overflow-hidden animate-fade-in-up z-50 py-1"
                      aria-label="Sélection de devise"
                    >
                      {currencies.map((c) => (
                        <li
                          key={c.code}
                          role="option"
                          onClick={() => {
                            setCurrency(c.code);
                            setIsCurrencyOpen(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setCurrency(c.code);
                              setIsCurrencyOpen(false);
                            }
                          }}
                          tabIndex={0}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-gray-50 transition-colors cursor-pointer outline-none focus:bg-gray-50 focus:ring-2 focus:ring-inset focus:ring-brand-teal ${currency === c.code ? "bg-teal-50 text-brand-teal font-bold" : "text-gray-700"}`}
                        >
                          <FlagIcon code={c.flagCode} />
                          <span className="font-medium">{c.label}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {user ? (
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => onNavigate("dashboard")}
                    className="flex items-center space-x-2 text-sm bg-brand-dark text-white pl-2 pr-4 py-1.5 rounded-full shadow hover:bg-brand-teal transition transform hover:scale-105"
                  >
                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center border border-white/20">
                      <UserIcon size={16} />
                    </div>
                    <span>{user.name}</span>
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => onNavigate("admin")}
                      className="p-2 text-brand-grey hover:text-brand-teal bg-gray-50 rounded-full"
                      title="Admin Panel"
                      aria-label="Panneau d'administration"
                    >
                      <LayoutDashboard size={20} />
                    </button>
                  )}
                  <button
                    onClick={onLogout}
                    className="text-brand-grey hover:text-red-500"
                    aria-label={t('navLogout')}
                  >
                    <LogOut size={20} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onNavigate("auth")}
                  className="min-w-[115px] text-center bg-brand-dark text-white px-5 py-2 rounded-full font-semibold hover:bg-brand-teal transition shadow-lg shadow-brand-dark/20 transform hover:scale-105"
                >
                  {t('navLogin')}
                </button>
              )}
            </div>

            <div className="md:hidden flex items-center space-x-1.5">
              {/* Language toggle — Mobile header */}
              <button
                onClick={toggleLanguage}
                aria-label={`Changer la langue (actuel: ${currentLanguage.label})`}
                className="flex items-center space-x-1 text-brand-dark bg-gray-100 hover:bg-gray-200 active:scale-95 px-2 py-1 rounded-md border border-gray-200 shadow-sm transition"
              >
                <FlagIcon code={currentLanguage.flagCode} className="w-4 h-3 object-cover rounded-[2px]" />
                <span className="font-bold text-[11px] leading-none">{currentLanguage.label}</span>
              </button>

              {/* Currency toggle — Mobile header */}
              <button
                onClick={() => {
                  const keys = currencies.map((c) => c.code);
                  const nextIdx = (keys.indexOf(currency) + 1) % keys.length;
                  setCurrency(keys[nextIdx]);
                }}
                aria-label={`Changer la devise (actuel: ${currency})`}
                className="flex items-center space-x-1 text-brand-dark bg-gray-100 hover:bg-gray-200 active:scale-95 px-2 py-1 rounded-md border border-gray-200 shadow-sm transition"
              >
                <FlagIcon code={currentCurrency.flagCode} className="w-4 h-3 object-cover rounded-[2px]" />
                <span className="font-bold text-[11px] leading-none">{currency}</span>
              </button>

              <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-1.5 text-brand-dark transition-opacity duration-300 ${isOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}
                aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
              >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/*
        Clipping wrapper — overflow-hidden on a fixed+inset-0 container clips
        its children to the viewport box. Without this, the off-screen drawer
        panel (translated -280 px to the left during close) is still painted
        and some browsers include it in the document's scroll width, triggering
        horizontal scrollbars. The wrapper itself never contributes layout space.
        pointer-events-none ensures the invisible portion never swallows taps.
      */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none md:hidden z-[9997]">
        {/* Backdrop — re-enable pointer events only when menu is open */}
        <div
          className={`absolute inset-0 bg-black/10 backdrop-blur-[2px] z-[9998] transition-all duration-300 ease-out ${isOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
            }`}
          onClick={() => setIsOpen(false)}
        />
        {/* Off-canvas drawer — pointer events restored on the panel itself */}
        <div
          ref={mobileMenuRef}
          className={`absolute top-0 left-0 w-[280px] sm:w-[320px] bg-white z-[9999] shadow-[0_0_50px_-12px_rgba(0,0,0,0.25)] transform transition-all duration-300 ease-out flex flex-col border-b border-gray-100 pointer-events-auto ${isOpen
              ? "translate-x-0 opacity-100 scale-100"
              : "-translate-x-full opacity-0 scale-[0.98]"
            }`}
          style={{ height: "calc(100vh - 58px)", maxHeight: "calc(100vh - 58px)" }}
        >
          <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100 bg-white shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 shrink-0 rounded-full bg-[#0B1C2D] border border-[#C6A75E]/30 p-[2px] flex items-center justify-center shadow-sm">
                <img
                  src={logo}
                  alt="Logo"
                  className="w-full h-full object-contain"
                  loading="eager"
                  decoding="sync"
                />
              </div>
              <span
                translate="no"
                className="notranslate font-bold text-[#0B1C2D] uppercase tracking-[0.12em] text-lg font-luxury whitespace-nowrap"
                style={{ WebkitTextStroke: '0.4px currentColor' }}
              >
                LOOK IMMO
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="shrink-0 ml-2 p-2 text-gray-400 hover:text-brand-dark transition-all duration-200 hover:rotate-90"
              aria-label="Fermer le menu"
            >
              <X size={20} />
            </button>
          </div>

          <div
            className="flex-1 overflow-y-auto overscroll-contain pt-8 pb-6 px-4 bg-gradient-to-b from-white to-gray-50/30"
            style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
          >
            <div className="mb-8">
              <p className="px-5 mb-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                {t('navNavigation')}
              </p>
              <div className="space-y-1">
                {[
                  {
                    label: t('navHome'),
                    onClick: () => handleNavClick("home"),
                    active: isAccueilActive,
                  },
                  {
                    label: t('navSales'),
                    onClick: () => handleNavClick("listings", "sale"),
                    active: isAchatActive,
                  },
                  {
                    label: t('navRentals'),
                    onClick: () => handleNavClick("listings", "rent"),
                    active: isLocationActive,
                  },
                  {
                    label: t('navLands'),
                    onClick: () => handleNavClick("listings", "sale", "land"),
                    active: isTerrainsActive,
                  },
                  {
                    label: t('navPromotions'),
                    onClick: () => handleNavClick("listings", "sale", "land", true),
                    active: isPromotionsActive,
                  },
                  {
                    label: t('navBlog'),
                    onClick: () => handleNavClick("blog"),
                    active: isBlogActive,
                  },
                  {
                    label: t('navContact'),
                    onClick: () => handleNavClick("contact"),
                    active: isContactActive,
                  },
                ].map((item, index) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      item.onClick();
                      setIsOpen(false);
                    }}
                    className={`group block w-full text-left px-5 py-3.5 rounded-r-xl transition-all duration-300 transform border-l-[3px] ${item.active
                        ? "border-brand-teal bg-brand-teal/[0.03] text-brand-teal font-semibold"
                        : "border-transparent text-gray-500 hover:text-brand-teal hover:translate-x-1"
                      } ${isOpen ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0"}`}
                    style={{ transitionDelay: `${index * 40}ms` }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="px-5 mb-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                {t('navAccount')}
              </p>
              <div className="space-y-1">
                {!user ? (
                  <button
                    onClick={() => {
                      onNavigate("auth");
                      setIsOpen(false);
                    }}
                    className={`group block w-full text-left px-5 py-3.5 rounded-r-xl text-brand-teal font-semibold transition-all duration-300 transform border-l-[3px] border-transparent hover:translate-x-1 ${isOpen ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0"}`}
                    style={{ transitionDelay: `${8 * 40}ms` }}
                  >
                    {t('navLogin')}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        onNavigate("dashboard");
                        setIsOpen(false);
                      }}
                      className={`group block w-full text-left px-5 py-3.5 rounded-r-xl transition-all duration-300 transform border-l-[3px] border-transparent text-gray-500 hover:text-brand-teal hover:translate-x-1 ${isOpen ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0"}`}
                      style={{ transitionDelay: `${8 * 40}ms` }}
                    >
                      {t('navMyAccount')}
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          onNavigate("admin");
                          setIsOpen(false);
                        }}
                        className={`group block w-full text-left px-5 py-3.5 rounded-r-xl transition-all duration-300 transform border-l-[3px] border-transparent text-gray-500 hover:text-brand-teal hover:translate-x-1 ${isOpen ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0"}`}
                        style={{ transitionDelay: `${9 * 40}ms` }}
                      >
                        {t('navAdmin')}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onLogout();
                        setIsOpen(false);
                      }}
                      className={`group block w-full text-left px-5 py-3.5 rounded-r-xl transition-all duration-300 transform border-l-[3px] border-transparent text-red-400/80 hover:text-red-500 hover:translate-x-1 ${isOpen ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0"}`}
                      style={{
                        transitionDelay: `${(isAdmin ? 10 : 9) * 40}ms`,
                      }}
                    >
                      {t('navLogout')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="pb-5 pt-4 border-t border-gray-100 bg-white shrink-0 mt-auto px-4">
            {/* Language switcher — Mobile drawer */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-bold">{t('navLanguage')}</span>
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5 border border-gray-200">
                <button
                  onClick={() => setLanguage('fr')}
                  aria-label="Français"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200 ${language === 'fr'
                      ? 'bg-white text-brand-dark shadow-sm'
                      : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                  <img src="https://flagcdn.com/w40/fr.png" alt="FR" className="w-4 h-3 object-cover rounded-sm" />
                  <span>FR</span>
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  aria-label="English"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200 ${language === 'en'
                      ? 'bg-white text-brand-dark shadow-sm'
                      : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                  <img src="https://flagcdn.com/w40/gb.png" alt="EN" className="w-4 h-3 object-cover rounded-sm" />
                  <span>EN</span>
                </button>
              </div>
            </div>
            <p translate="no" className="notranslate text-[10px] text-gray-300 uppercase tracking-[0.3em] font-bold text-center">
              Look Immo Excellence
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
