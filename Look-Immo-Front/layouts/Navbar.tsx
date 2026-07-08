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
  CurrencyCode,
  FilterState,
  ListingType,
  PropertyType,
  User,
  Appointment,
} from "../types";
import { useCurrencyStore } from "../stores/useCurrencyStore";
import logo from "./../look-immo-icon-gold.png";

const FlagIcon = ({ code }: { code: string }) => {
  const flagUrls: Record<string, string> = {
    TN: "https://flagcdn.com/w40/tn.png",
    EU: "https://flagcdn.com/w40/eu.png",
    US: "https://flagcdn.com/w40/us.png",
  };

  return (
    <img
      src={flagUrls[code]}
      alt={code}
      className="w-5 h-4 object-cover rounded-sm"
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
  appointments,
}: {
  user: User | null;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  currentPage: string;
  onSearch: (filters: Partial<FilterState>) => void;
  filters: FilterState;
  appointments?: Appointment[];
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const { currency, setCurrency } = useCurrencyStore();
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const currencyDropdownRef = useRef<HTMLDivElement>(null);

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
        minPrice: 0,
        maxPrice: isHotDeal ? 15000000 : 5000000,
        minBedrooms: 0,
        minArea: isHotDeal ? 1000 : 0,
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

  const currentCurrency =
    currencies.find((c) => c.code === currency) || currencies[0];


  return (
    <>
      <nav
        className={`bg-white/95 backdrop-blur-md text-brand-dark fixed top-0 left-0 right-0 z-[100] shadow-sm border-b border-gray-100 transition-transform duration-300 ease-in-out ${
          isVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => onNavigate("home")}
            >
              <div className="w-[35px] h-[35px] flex items-center justify-center rounded-full bg-[#0B1C2D] border border-[#C6A75E] shadow-sm transition-transform duration-300 group-hover:scale-105 overflow-hidden p-[1.5px]">
                <img
                  src={logo}
                  alt="LI"
                  className="w-full h-full object-contain"
                  loading="eager"
                  decoding="sync"
                />
              </div>
              <span className="text-[22px] md:text-[28px] font-bold text-[#0B1C2D] font-luxury tracking-[0.12em] uppercase transition-all duration-300 group-hover:scale-105 origin-left">
                Look Immo
              </span>
            </div>

            <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
              <button
                onClick={() => handleNavClick("home")}
                className={`${isAccueilActive ? "text-brand-teal font-bold" : "text-brand-grey hover:text-brand-dark"} transition`}
              >
                Accueil
              </button>
              <button
                onClick={() => handleNavClick("listings", "sale")}
                className={`${isAchatActive ? "text-brand-teal font-bold" : "text-brand-grey hover:text-brand-dark"} transition`}
              >
                Ventes
              </button>
              <button
                onClick={() => handleNavClick("listings", "rent")}
                className={`${isLocationActive ? "text-brand-teal font-bold" : "text-brand-grey hover:text-brand-dark"} transition`}
              >
                Locations
              </button>
              <button
                onClick={() => handleNavClick("listings", "sale", "land")}
                className={`${isTerrainsActive ? "text-brand-teal font-bold" : "text-brand-grey hover:text-brand-dark"} transition`}
              >
                Terrains
              </button>
              <button
                onClick={() => handleNavClick("listings", "sale", "land", true)}
                className={`${isPromotionsActive ? "text-brand-teal font-bold" : "text-brand-grey hover:text-brand-dark"} transition`}
              >
                Promotions
              </button>
              <button
                onClick={() => handleNavClick("blog")}
                className={`${isBlogActive ? "text-brand-teal font-bold" : "text-brand-grey hover:text-brand-dark"} transition`}
              >
                Blog
              </button>
              <button
                onClick={() => handleNavClick("contact")}
                className={`${isContactActive ? "text-brand-teal font-bold" : "text-brand-grey hover:text-brand-dark"} transition`}
              >
                Contact
              </button>
              <div className="h-6 w-px bg-gray-200 mx-2"></div>

              <div className="relative" ref={currencyDropdownRef}>
                <button
                  onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
                  aria-haspopup="listbox"
                  aria-label="Devise"
                  className="flex items-center space-x-2 text-brand-dark bg-white px-3 py-2.5 rounded-md border border-gray-300 hover:border-brand-teal transition shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-teal min-w-[100px]"
                >
                  <FlagIcon code={currentCurrency.flagCode} />
                  <span className="font-semibold text-sm">{currency}</span>
                  <ChevronDown
                    size={14}
                    className={`text-gray-500 transition-transform duration-200 ml-auto ${isCurrencyOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isCurrencyOpen && (
                  <ul
                    role="listbox"
                    className="absolute right-0 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200 overflow-hidden animate-fade-in-up z-50"
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
                        className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 hover:bg-gray-50 transition-colors cursor-pointer outline-none focus:bg-gray-50 focus:ring-2 focus:ring-inset focus:ring-brand-teal ${currency === c.code ? "bg-blue-50 text-brand-dark" : "text-gray-700"}`}
                      >
                        <FlagIcon code={c.flagCode} />
                        <span className="font-medium">{c.label}</span>
                      </li>
                    ))}
                  </ul>
                )}
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
                  {user.role === "admin" && (
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
                    aria-label="Déconnexion"
                  >
                    <LogOut size={20} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onNavigate("auth")}
                  className="bg-brand-dark text-white px-6 py-2 rounded-full font-semibold hover:bg-brand-teal transition shadow-lg shadow-brand-dark/20 transform hover:scale-105"
                >
                  Connexion
                </button>
              )}
            </div>

            <div className="md:hidden flex items-center space-x-4">
              <button
                onClick={() => {
                  const keys = currencies.map((c) => c.code);
                  const nextIdx = (keys.indexOf(currency) + 1) % keys.length;
                  setCurrency(keys[nextIdx]);
                }}
                className="flex items-center space-x-2 text-brand-dark bg-gray-100 px-3 py-2 rounded border border-gray-200"
                aria-label="Change Currency"
              >
                <FlagIcon code={currentCurrency.flagCode} />
                <span className="font-bold text-xs">{currency}</span>
              </button>
              <button
                onClick={() => setIsOpen(!isOpen)}
                className={`text-brand-dark transition-opacity duration-300 ${isOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}
                aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
              >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div
        className={`fixed inset-0 bg-black/10 backdrop-blur-[2px] z-[9998] md:hidden transition-all duration-300 ease-out ${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsOpen(false)}
      />
      <div
        ref={mobileMenuRef}
        className={`fixed top-0 left-0 w-[280px] sm:w-[320px] bg-white z-[9999] shadow-[0_0_50px_-12px_rgba(0,0,0,0.25)] md:hidden transform transition-all duration-300 ease-out flex flex-col border-b border-gray-100 ${
          isOpen
            ? "translate-x-0 opacity-100 scale-100"
            : "-translate-x-full opacity-0 scale-[0.98]"
        }`}
        style={{ height: "100dvh" }}
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
            <span className="font-bold text-[#0B1C2D] uppercase tracking-[0.12em] text-lg font-luxury whitespace-nowrap">
              Look Immo
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

        <div className="flex-1 overflow-y-auto pt-8 pb-6 px-4 bg-gradient-to-b from-white to-gray-50/30">
          <div className="mb-8">
            <p className="px-5 mb-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
              Navigation
            </p>
            <div className="space-y-1">
              {[
                {
                  label: "Accueil",
                  onClick: () => handleNavClick("home"),
                  active: isAccueilActive,
                },
                {
                  label: "Ventes",
                  onClick: () => handleNavClick("listings", "sale"),
                  active: isAchatActive,
                },
                {
                  label: "Locations",
                  onClick: () => handleNavClick("listings", "rent"),
                  active: isLocationActive,
                },
                {
                  label: "Terrains",
                  onClick: () => handleNavClick("listings", "sale", "land"),
                  active: isTerrainsActive,
                },
                {
                  label: "Promotions",
                  onClick: () => handleNavClick("listings", "sale", "land", true),
                  active: isPromotionsActive,
                },
                {
                  label: "Blog",
                  onClick: () => handleNavClick("blog"),
                  active: isBlogActive,
                },
                {
                  label: "Contact",
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
                  className={`group block w-full text-left px-5 py-3.5 rounded-r-xl transition-all duration-300 transform border-l-[3px] ${
                    item.active
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
              Compte
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
                  Connexion
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
                    Mon compte
                  </button>
                  {user.role === "admin" && (
                    <button
                      onClick={() => {
                        onNavigate("admin");
                        setIsOpen(false);
                      }}
                      className={`group block w-full text-left px-5 py-3.5 rounded-r-xl transition-all duration-300 transform border-l-[3px] border-transparent text-gray-500 hover:text-brand-teal hover:translate-x-1 ${isOpen ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0"}`}
                      style={{ transitionDelay: `${9 * 40}ms` }}
                    >
                      Admin Panel
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onLogout();
                      setIsOpen(false);
                    }}
                    className={`group block w-full text-left px-5 py-3.5 rounded-r-xl transition-all duration-300 transform border-l-[3px] border-transparent text-red-400/80 hover:text-red-500 hover:translate-x-1 ${isOpen ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0"}`}
                    style={{
                      transitionDelay: `${(user.role === "admin" ? 10 : 9) * 40}ms`,
                    }}
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="pb-5 pt-4 border-t border-gray-100 bg-white shrink-0 mt-auto">
          <p className="text-[10px] text-gray-300 uppercase tracking-[0.3em] font-bold text-center">
            Look Immo Excellence
          </p>
        </div>
      </div>
    </>
  );
};

export default Navbar;
