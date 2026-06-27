import React from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import { FilterState, SiteSettings } from "../types";
import logo from "./../look-immo-footer-icon-gold.png";

const smoothScrollTo = (targetId: string, duration: number = 2500) => {
  const target = document.getElementById(targetId);
  if (!target) return;

  const elementPosition = target.getBoundingClientRect().top;
  const offsetPosition =
    elementPosition +
    window.pageYOffset -
    window.innerHeight / 2 +
    target.offsetHeight / 2;
  const startPosition = window.pageYOffset;
  const distance = offsetPosition - startPosition;
  let startTime: number | null = null;

  const animation = (currentTime: number) => {
    if (startTime === null) startTime = currentTime;
    const timeElapsed = currentTime - startTime;
    const ease = (t: number, b: number, c: number, d: number) => {
      t /= d / 2;
      if (t < 1) return (c / 2) * t * t + b;
      t--;
      return (-c / 2) * (t * (t - 2) - 1) + b;
    };

    const run = ease(timeElapsed, startPosition, distance, duration);
    window.scrollTo(0, run);
    if (timeElapsed < duration) requestAnimationFrame(animation);
  };

  requestAnimationFrame(animation);
};

const Footer = ({
  settings,
  onNavigate,
  onSearch,
  onOpenTerms,
  onOpenPrivacy,
}: {
  settings?: SiteSettings;
  onNavigate: (page: string) => void;
  onSearch: (filters: Partial<FilterState>) => void;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
}) => {
  const handleFooterNavigate = (page: string, targetId?: string) => {
    (window as any)._forceInstantScroll = true;
    onNavigate(page);
    if (targetId) {
      setTimeout(() => smoothScrollTo(targetId, 1000), 100);
    }
  };

  return (
    <footer className="bg-brand-dark text-white pt-12 pb-6 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="flex flex-col items-start mt-2">
            <div className="mb-6 w-full flex flex-col items-center md:items-start gap-3">
              <div className="flex items-center gap-3">
                <div className="w-[40px] h-[40px] flex items-center justify-center rounded-full bg-[#0B1C2D] border border-[#C6A75E] shadow-sm overflow-hidden p-[1.5px]">
                  <img
                    src={logo}
                    alt="LI"
                    className="w-full h-full object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <span className="text-[24px] md:text-[28px] font-bold text-[#C6A75E] font-luxury tracking-[0.12em] uppercase">
                  Look Immo
                </span>
              </div>
              <span className="text-xs md:text-sm font-medium text-[#C6A75E] font-luxury tracking-[0.2em] uppercase pl-1 border-t border-[#C6A75E]/30 pt-2 w-full text-center">
                Agence immobilière
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-4 text-brand-teal">
              Découvrir
            </h4>
            <ul className="space-y-3 text-sm text-gray-400">
              {settings?.discoveryLinks &&
              settings.discoveryLinks.length > 0 ? (
                settings.discoveryLinks.map((link, index) => (
                  <li
                    key={index}
                    className="hover:text-white cursor-pointer transition-colors duration-200"
                    onClick={() => onSearch({ query: link.label })}
                  >
                    {link.label}
                  </li>
                ))
              ) : (
                <>
                  <li
                    className="hover:text-white cursor-pointer transition-colors duration-200"
                    onClick={() => onSearch({ query: "Tunis" })}
                  >
                    Tunis
                  </li>
                  <li
                    className="hover:text-white cursor-pointer transition-colors duration-200"
                    onClick={() => onSearch({ query: "Sousse" })}
                  >
                    Sousse
                  </li>
                  <li
                    className="hover:text-white cursor-pointer transition-colors duration-200"
                    onClick={() => onSearch({ query: "Hammamet" })}
                  >
                    Hammamet
                  </li>
                </>
              )}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-4 text-brand-teal">Société</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li
                className="hover:text-white cursor-pointer transition-colors duration-200"
                onClick={() => handleFooterNavigate("contact", "about")}
              >
                À propos
              </li>
              <li
                className="hover:text-white cursor-pointer transition-colors duration-200"
                onClick={() => handleFooterNavigate("blog")}
              >
                Blog
              </li>
              <li
                className="hover:text-white cursor-pointer transition-colors duration-200"
                onClick={() => handleFooterNavigate("contact")}
              >
                Contact
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-4 text-brand-teal">Contact</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-start">
                <Mail
                  size={16}
                  className="mr-3 mt-0.5 text-brand-teal flex-shrink-0"
                />
                <a
                  href={`mailto:${settings?.contactEmail || "contact@lookimmo.tn"}`}
                  className="hover:text-white transition-colors duration-200"
                >
                  {settings?.contactEmail || "contact@lookimmo.tn"}
                </a>
              </li>
              <li className="flex items-start">
                <Phone
                  size={16}
                  className="mr-3 mt-0.5 text-brand-teal flex-shrink-0"
                />
                <a
                  href={`tel:${settings?.phoneNumber || "+216 70 123 456"}`}
                  className="hover:text-white transition-colors duration-200"
                >
                  {settings?.phoneNumber || "+216 70 123 456"}
                </a>
              </li>
              <li className="flex items-start">
                <MapPin
                  size={16}
                  className="mr-3 mt-0.5 text-brand-teal flex-shrink-0"
                />
                <span
                  className="cursor-pointer hover:text-white transition-colors duration-200"
                  onClick={() =>
                    handleFooterNavigate("contact", "notre-localisation")
                  }
                >
                  {settings?.address || "Les Berges du Lac II, Tunis, Tunisie"}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500">
          <p>
            &copy; {new Date().getFullYear()} Look Immo. Tous droits réservés.
          </p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <span
              className="cursor-pointer hover:text-white"
              onClick={onOpenPrivacy}
            >
              Politique de confidentialité
            </span>
            <span
              className="cursor-pointer hover:text-white"
              onClick={onOpenTerms}
            >
              Conditions d'utilisation
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
