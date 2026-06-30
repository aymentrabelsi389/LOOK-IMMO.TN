import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Phone, Mail, Facebook, Instagram, MessageSquare, Check, ChevronDown } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

import { useSEO } from '../hooks/useSEO';
import { useAuthStore } from '../stores/useAuthStore';
import { useData } from '../context/DataContext';
import { notify } from '../services/notificationStore';

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

const ContactPage = () => {
  useSEO({
    title: "Contactez-nous",
    description: "Vous avez un projet immobilier en Tunisie ? Contactez l'équipe de Look Immo pour toute demande d'achat, de vente, de location ou de conseil."
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
    { value: 'Information', label: "Demande d'information" },
    { value: 'Visite', label: "Programmer une visite" },
    { value: 'Vente', label: "Vendre mon bien" },
    { value: 'Autre', label: "Autre" }
  ];

  // Close subject dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (subjectDropdownRef.current && !subjectDropdownRef.current.contains(event.target as Node)) {
        setSubjectDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject) {
      notify.error('Veuillez sélectionner un sujet pour votre message.');
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
      <div className="bg-gradient-to-r from-brand-dark to-blue-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Contactez-Nous</h1>
          <p className="text-xl text-gray-200">
            Nous sommes là pour répondre à toutes vos questions et vous accompagner dans votre projet immobilier.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-12 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl p-8 md:p-10 shadow-xl border border-gray-100">
              <h2 className="text-2xl font-bold text-brand-dark mb-8">Envoyez-nous un message</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-brand-dark mb-2">Nom complet *</label>
                    <input 
                      type="text" 
                      value={formData.name} 
                      onChange={e => setFormData({ ...formData, name: e.target.value })} 
                      required 
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-brand-teal focus:bg-white outline-none transition-all" 
                      placeholder="Votre nom" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-brand-dark mb-2">Email *</label>
                    <input 
                      type="email" 
                      value={formData.email} 
                      onChange={e => setFormData({ ...formData, email: e.target.value })} 
                      required 
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-brand-teal focus:bg-white outline-none transition-all" 
                      placeholder="votre@email.com" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-brand-dark mb-2">Téléphone</label>
                    <input 
                      type="tel" 
                      value={formData.phone} 
                      onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-brand-teal focus:bg-white outline-none transition-all" 
                      placeholder="+216 -- --- ---" 
                    />
                  </div>
                  <div className="relative" ref={subjectDropdownRef}>
                    <label className="block text-sm font-bold text-brand-dark mb-2">Sujet *</label>
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
                        {subjects.find(s => s.value === formData.subject)?.label || 'Sélectionner...'}
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
                  <label className="block text-sm font-bold text-brand-dark mb-2">Message *</label>
                  <textarea 
                    value={formData.message} 
                    onChange={e => setFormData({ ...formData, message: e.target.value })} 
                    required 
                    minLength={10}
                    rows={6} 
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-brand-teal focus:bg-white outline-none transition-all resize-none" 
                    placeholder="Décrivez votre demande (minimum 10 caractères)..." 
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
                  Envoyer le message
                </button>

                {submitted && (
                  <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center gap-2 animate-fade-in">
                    <Check size={20} /> Message envoyé avec succès! Nous vous répondrons dans les plus brefs délais.
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            {/* Coordinates */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
              <h3 className="font-bold text-xl text-brand-dark mb-6">Nos Coordonnées</h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="bg-brand-teal/10 p-3 rounded-xl text-brand-teal">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Adresse</p>
                    <p className="text-brand-dark font-medium">{settings.address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-brand-teal/10 p-3 rounded-xl text-brand-teal">
                    <Phone size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Téléphone</p>
                    <p className="text-brand-dark font-medium">{settings.phoneNumber}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-brand-teal/10 p-3 rounded-xl text-brand-teal">
                    <Mail size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Email</p>
                    <p className="text-brand-dark font-medium">{settings.contactEmail}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Opening Hours */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
              <h3 className="font-bold text-xl text-brand-dark mb-6">Horaires d'ouverture</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Lundi - Vendredi</span>
                  <span className="font-bold text-brand-dark">{settings.workingHours?.weekdays || '09:00 - 18:00'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Samedi</span>
                  <span className="font-bold text-brand-dark">{settings.workingHours?.saturday || '09:00 - 13:00'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Dimanche</span>
                  <span className="font-bold text-red-500">{settings.workingHours?.sunday || 'Fermé'}</span>
                </div>
              </div>
            </div>

            {/* Social Media */}
            <div className="bg-[#0B1C2D] rounded-2xl p-8 shadow-lg text-white">
              <h3 className="font-bold text-xl mb-4">Suivez-nous</h3>
              <p className="text-gray-400 text-sm mb-6">Restez informé de nos dernières offres</p>
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
          </div>
        </div>

        {/* Bottom Section: Map & About */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
          <div className="lg:col-span-2">
            <div id="notre-localisation" className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 h-[400px] flex flex-col">
              <h3 className="font-bold text-xl text-brand-dark mb-6">Notre Localisation</h3>
              <div className="flex-1 rounded-xl overflow-hidden border border-gray-100 z-10 relative group">
                <a 
                  href="https://maps.app.goo.gl/b567Ecfrmc4VLQwYA"
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="absolute inset-0 z-[1000] cursor-pointer group-hover:bg-black/5 transition-colors"
                >
                  <div className="absolute top-4 left-4 bg-white px-4 py-2 rounded-lg shadow-md flex items-center gap-2 text-xs font-bold text-brand-dark hover:bg-gray-50 transition-all border border-gray-100 uppercase tracking-wider">
                    <MapPin size={14} className="text-brand-teal" />
                    Agrandir le plan
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
            <h3 className="font-bold text-xl text-brand-dark mb-6">À propos</h3>
            <div className="text-gray-600 leading-relaxed overflow-y-auto max-h-[300px] custom-scrollbar">
              {settings.aboutText || (
                <>
                  <p className="mb-4">
                    Chez Look Immo, nous vous accompagnons dans tous vos projets immobiliers : achat, vente, location et investissement. Grâce à notre expertise du marché et notre sélection de biens de qualité, nous vous aidons à trouver le bien idéal en toute confiance.
                  </p>
                  <p>
                    Look Immo — Votre partenaire immobilier de confiance.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
