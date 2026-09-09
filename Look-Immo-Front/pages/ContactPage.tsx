import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Phone, Mail, Facebook, Instagram, MessageSquare, Check, ChevronDown } from 'lucide-react';
import '@/utils/leafletSetup';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

import { useSEO } from '@/hooks/useSEO';
import { useAuthStore } from '@/stores/useAuthStore';
import { useData } from '@/context/DataContext';
import { useTranslation } from '@/hooks/useTranslation';
import { notify } from '@/services/notificationStore';
import { trackLead } from '@/utils/metaPixel';
import { useClickOutside } from '@/hooks/useClickOutside';

// Helper component to fix Leaflet resize issues
const MapUpdater = () => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

// Scroll Reveal animation helper component using Intersection Observer
const ScrollReveal: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({ children, className = "", delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setIsVisible(true);
          }, delay);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.05,
        rootMargin: '0px 0px -40px 0px'
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 cubic-bezier(0.16, 1, 0.3, 1) transform ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
      } ${className}`}
    >
      {children}
    </div>
  );
};

const ContactPage = () => {
  const { t, language } = useTranslation();

  useSEO({
    title: t('contactSeoTitle'),
    description: t('contactSeoDesc')
  });

  const { user } = useAuthStore();
  const { handleNewMessage: onMessageSend, siteSettings: settings } = useData();

  if (!settings) return null;

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    subject: '',
    message: '',
    website: '', // honeypot — must stay empty; bots fill it, humans don't
  });
  const [submitted, setSubmitted] = useState(false);
  const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);
  const subjectDropdownRef = useRef<HTMLDivElement>(null);

  const subjects = [
    { value: 'Information', label: t('subjectInfo') },
    { value: 'Visite', label: t('subjectVisit') },
    { value: 'Vente', label: t('subjectSale') },
    { value: 'Autre', label: t('subjectOther') }
  ];

  // Close subject dropdown on outside click
  useClickOutside(subjectDropdownRef, () => setSubjectDropdownOpen(false));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject) {
      notify.error(t('subjectRequiredError'));
      return;
    }
    try {
      await onMessageSend({
        fullName: formData.name,
        email: formData.email,
        phone: formData.phone,
        subject: formData.subject,
        message: formData.message,
        website: formData.website, // honeypot field — backend rejects if non-empty
      });
      trackLead('Message de contact', { subject: formData.subject });
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 5000);
      setFormData({ ...formData, subject: '', message: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const mapCenter: [number, number] = [
    settings.location?.lat || 36.8624, 
    settings.location?.lng || 10.2407
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-brand-dark via-[#0d2a45] to-blue-900 text-white py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 animate-fade-in-up">
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">{t('contactTitle')}</h1>
          <p className="text-xl text-gray-200">
            {t('contactSubtitle')}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-12 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Contact Form */}
          <ScrollReveal className="lg:col-span-2" delay={100}>
            <div className="bg-white rounded-2xl p-8 md:p-10 shadow-xl border border-gray-100">
              <h2 className="text-2xl font-bold text-brand-dark mb-8">{t('sendMessageTitle')}</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="contact-name" className="block text-sm font-bold text-brand-dark mb-2">{t('fullNameLabel')}</label>
                    <input 
                      id="contact-name"
                      type="text" 
                      value={formData.name} 
                      onChange={e => setFormData({ ...formData, name: e.target.value })} 
                      required 
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-brand-teal focus:bg-white outline-none transition-all" 
                      placeholder={t('fullNamePlaceholder')} 
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="block text-sm font-bold text-brand-dark mb-2">{t('emailLabel')}</label>
                    <input 
                      id="contact-email"
                      type="email" 
                      value={formData.email} 
                      onChange={e => setFormData({ ...formData, email: e.target.value })} 
                      required 
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-brand-teal focus:bg-white outline-none transition-all" 
                      placeholder={t('emailPlaceholder')} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="contact-phone" className="block text-sm font-bold text-brand-dark mb-2">{t('phoneLabel')}</label>
                    <input 
                      id="contact-phone"
                      type="tel" 
                      value={formData.phone} 
                      onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-brand-teal focus:bg-white outline-none transition-all" 
                      placeholder={t('phonePlaceholder')} 
                    />
                  </div>
                  <div className="relative" ref={subjectDropdownRef}>
                    <label className="block text-sm font-bold text-brand-dark mb-2">{t('subjectLabel')}</label>
                    <button
                      type="button"
                      onClick={() => setSubjectDropdownOpen(!subjectDropdownOpen)}
                      className={`
                        w-full px-4 py-3.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 font-medium 
                        flex items-center justify-between transition-all duration-300 text-sm
                        ${subjectDropdownOpen 
                          ? 'border-brand-teal bg-white ring-2 ring-brand-teal/10' 
                          : 'hover:border-brand-teal/30 hover:bg-white'
                        }
                      `}
                    >
                      <span className={formData.subject ? 'text-gray-900 font-medium' : 'text-gray-400 font-normal'}>
                        {subjects.find(s => s.value === formData.subject)?.label || t('subjectPlaceholder')}
                      </span>
                      <ChevronDown size={18} className={`text-gray-400 transform transition-transform duration-300 ${subjectDropdownOpen ? 'rotate-180 text-brand-teal' : ''}`} />
                    </button>

                    {subjectDropdownOpen && (
                      <div className="absolute z-50 mt-2 w-full bg-white border border-gray-150 rounded-2xl shadow-xl py-2 overflow-hidden animate-fade-in-up">
                        {subjects.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, subject: opt.value });
                              setSubjectDropdownOpen(false);
                            }}
                            className={`
                              w-full flex items-center justify-between px-5 py-3.5 text-left text-sm font-medium transition-all duration-150
                              ${formData.subject === opt.value
                                ? 'bg-brand-teal/10 text-brand-teal font-semibold'
                                : 'text-gray-700 hover:bg-gray-50 hover:text-brand-dark'
                              }
                            `}
                          >
                            <span>{opt.label}</span>
                            {formData.subject === opt.value && <Check size={16} className="text-brand-teal animate-in zoom-in" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-sm font-bold text-brand-dark mb-2">{t('messageLabel')}</label>
                  <textarea 
                    id="contact-message"
                    value={formData.message} 
                    onChange={e => setFormData({ ...formData, message: e.target.value })} 
                    required 
                    minLength={10}
                    rows={6} 
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-brand-teal focus:bg-white outline-none transition-all resize-none" 
                    placeholder={t('messagePlaceholder')} 
                  />
                </div>

                {/* Honeypot anti-bot field — hidden from real users via CSS, bots fill it automatically */}
                <div aria-hidden="true" style={{ opacity: 0, position: 'absolute', top: 0, left: 0, height: 0, width: 0, zIndex: -1, overflow: 'hidden' }}>
                  <label htmlFor="website">Ne pas remplir</label>
                  <input
                    id="website"
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={formData.website}
                    onChange={e => setFormData({ ...formData, website: e.target.value })}
                  />
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-[#1A365D] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#0B1C2D] transition-all transform active:scale-[0.98] shadow-lg"
                >
                  {t('sendButton')}
                </button>

                {submitted && (
                  <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center gap-2 animate-fade-in">
                    <Check size={20} /> {t('messageSuccess')}
                  </div>
                )}
              </form>
            </div>
          </ScrollReveal>

          {/* Sidebar Info */}
          <ScrollReveal className="space-y-6" delay={250}>
            {/* Coordinates */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
              <h3 className="font-bold text-xl text-brand-dark mb-6">{t('ourCoordinatesTitle')}</h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="bg-brand-teal/10 p-3 rounded-xl text-brand-teal">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('addressLabel')}</p>
                    <p className="text-brand-dark font-medium">{settings.address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-brand-teal/10 p-3 rounded-xl text-brand-teal">
                    <Phone size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('phoneLabel')}</p>
                    <p className="text-brand-dark font-medium">{settings.phoneNumber}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-brand-teal/10 p-3 rounded-xl text-brand-teal">
                    <Mail size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('emailLabel')}</p>
                    <p className="text-brand-dark font-medium">{settings.contactEmail}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Opening Hours */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
              <h3 className="font-bold text-xl text-brand-dark mb-6">{t('openingHoursTitle')}</h3>
              <div className="space-y-4">
                {(() => {
                  // Strip any stored day-name prefix (e.g. "Lun - Ven: " → "09:00 - 18:00")
                  const stripPrefix = (val: string | undefined) => {
                    if (!val) return null;
                    const colonIdx = val.indexOf(':');
                    // Only strip if the part before the colon looks like a day label (no digits)
                    if (colonIdx > 0 && !/\d/.test(val.slice(0, colonIdx))) {
                      return val.slice(colonIdx + 1).trim();
                    }
                    return val;
                  };
                  const rawWeekdays = settings.workingHours?.weekdays;
                  const rawSaturday = settings.workingHours?.saturday;
                  const rawSunday   = settings.workingHours?.sunday;
                  const weekdayTime = stripPrefix(rawWeekdays) || '09:00 - 18:00';
                  const saturdayTime = stripPrefix(rawSaturday) || '09:00 - 13:00';
                  const sundayRaw = stripPrefix(rawSunday);
                  const isClosed = !rawSunday || rawSunday === 'Fermé' || rawSunday === 'Closed' || sundayRaw === 'Fermé' || sundayRaw === 'Closed';
                  return (
                    <>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">{t('weekdays')}</span>
                        <span className="font-bold text-brand-dark">{weekdayTime}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">{t('saturday')}</span>
                        <span className="font-bold text-brand-dark">{saturdayTime}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">{t('sunday')}</span>
                        <span className="font-bold text-red-500">
                          {isClosed ? t('closed') : sundayRaw}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Social Media */}
            <div className="bg-[#0B1C2D] rounded-2xl p-8 shadow-lg text-white">
              <h3 className="font-bold text-xl mb-4">{t('followUsTitle')}</h3>
              <p className="text-gray-400 text-sm mb-6">{t('followUsSubtitle')}</p>
              <div className="flex gap-4">
                <a href={settings.socialMedia.facebook} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-all text-white">
                  <Facebook size={22} />
                </a>
                <a href={settings.socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-all text-white">
                  <Instagram size={22} />
                </a>
                <a href={`https://wa.me/${settings.socialMedia.whatsapp}`} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-all text-white">
                  <MessageSquare size={22} />
                </a>
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* Bottom Section: Map & About */}
        <ScrollReveal className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12" delay={100}>
          <div className="lg:col-span-2">
            <div id="notre-localisation" className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 h-[400px] flex flex-col">
              <h3 className="font-bold text-xl text-brand-dark mb-6">{t('ourLocationTitle')}</h3>
              <div className="flex-1 rounded-xl overflow-hidden border border-gray-100 z-10 relative group">
                <a 
                  href={settings.googleMapsUrl || `https://www.google.com/maps?q=${settings.location?.lat || 36.8624},${settings.location?.lng || 10.2407}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="absolute inset-0 z-[1000] cursor-pointer group-hover:bg-black/5 transition-colors"
                >
                  <div className="absolute top-4 left-4 bg-white px-4 py-2 rounded-lg shadow-md flex items-center gap-2 text-xs font-bold text-brand-dark hover:bg-gray-50 transition-all border border-gray-100 uppercase tracking-wider">
                    <MapPin size={14} className="text-brand-teal" />
                    {t('enlargeMap')}
                  </div>
                </a>
                <MapContainer 
                  center={mapCenter} 
                  zoom={16} 
                  style={{ height: '100%', width: '100%' }}
                  dragging={false}
                  scrollWheelZoom={false}
                  doubleClickZoom={false}
                  zoomControl={false}
                  touchZoom={false}
                  attributionControl={false}
                >
                   <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker 
                    position={mapCenter} 
                    icon={new L.Icon({
                      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
                      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                      iconSize: [25, 41],
                      iconAnchor: [12, 41],
                      popupAnchor: [1, -34],
                    })}
                  />
                  <MapUpdater />
                </MapContainer>
              </div>
            </div>
          </div>

          <div id="about" className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 flex flex-col">
            <h3 className="font-bold text-xl text-brand-dark mb-6">{t('aboutTitle')}</h3>
            <div className="text-gray-600 leading-relaxed overflow-y-auto max-h-[300px] custom-scrollbar">
              {settings.aboutText && language === 'fr' ? (
                <p className="whitespace-pre-line">{settings.aboutText}</p>
              ) : (
                <>
                  <p className="mb-4">
                    {t('aboutDefaultP1')}
                  </p>
                  <p>
                    {t('aboutDefaultP2')}
                  </p>
                </>
              )}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
};

export default ContactPage;
