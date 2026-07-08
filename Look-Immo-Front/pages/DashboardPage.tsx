import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  User as UserIcon, Plus, Clock, Heart, MapPin,
  BedDouble, Bath, Square, CalendarDays, Calendar, Edit2, X,
  Search, Trash2, Edit, ChevronRight, Phone, Home as HomeIcon,
  Check
} from 'lucide-react';
import { Appointment, SiteSettings, ClientDemand } from '../types';
import Price from '../components/Price';
import { clientDemandsAPI, appointmentsAPI } from '../services/api';
import { Target, Activity, CheckCircle } from 'lucide-react';
import { CustomDatePicker, CustomTimePicker } from '../components/ui/DateTimePicker';
import { useSEO } from '../hooks/useSEO';
import { useUI } from '../context/UIContext';
import { useAuthStore } from '../stores/useAuthStore';
import { useData } from '../context/DataContext';
import { notify } from '../services/notificationStore';
import { useConfirm } from '../context/ConfirmContext';
import { getImageSrc, getLQIP } from '../utils/imageUtils';

const DashboardPage = () => {
  useSEO({
    title: "Mon Tableau de Bord",
    description: "Gérez vos favoris, vos demandes de visites, vos rendez-vous et vos informations personnelles sur votre espace client Look Immo."
  });

  const { handleNavigate } = useUI();
  const location = useLocation();
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const { user, handleUpdateUser: onUpdateUser, handleToggleFavorite } = useAuthStore();
  const {
    properties,
    appointments = [],
    siteSettings: settings,
    setSiteSettings,
    handleSelectProperty: onSelectProperty,
    handleCancelAppointment: onCancelAppointment,
    handleUpdateAppointment: onUpdateAppointment,
    setAppointments,
  } = useData();

  if (!user) return null;

  const onNavigate = handleNavigate;
  const onAddAppointment = (apt: Appointment) =>
    setAppointments(prev => prev.some(a => a.id === apt.id) ? prev : [apt, ...prev]);
  const onToggleFavorite = handleToggleFavorite;
  const onUpdateSettings = setSiteSettings as ((s: SiteSettings) => void) | undefined;

  // State for edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone || ''
  });

  // ── Helpers: serialize/parse additional properties inside notes ──
  const parseNotes = (raw: string | undefined): { propertyIds: string[]; userNotes: string } => {
    if (!raw) return { propertyIds: [], userNotes: '' };
    const m = raw.match(/^\[PROPS:([^\]]*)\](.*)/s);
    if (m) {
      const ids = m[1].split(',').map(s => s.trim()).filter(Boolean);
      return { propertyIds: ids, userNotes: m[2].trimStart() };
    }
    return { propertyIds: [], userNotes: raw };
  };

  const formatNotes = (propertyIds: string[], userNotes: string): string => {
    const valid = propertyIds.filter(Boolean);
    if (valid.length === 0) return userNotes;
    return `[PROPS:${valid.join(',')}] ${userNotes}`;
  };

  // Edit Appointment State
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [editAdditionalProps, setEditAdditionalProps] = useState<string[]>([]);
  const [editForm, setEditForm] = useState({
    date: '',
    time: '',
    message: '',
    propertyId: '',
    status: ''
  });

  // Additional props for the Add-Appointment modal
  const [addAdditionalProps, setAddAdditionalProps] = useState<string[]>([]);

  // Refs for property picker containers (outside-click)
  const aptPropPickerRef = React.useRef<HTMLDivElement>(null);
  const editPropPickerRef = React.useRef<HTMLDivElement>(null);

  const openEditAppointment = (apt: Appointment) => {
    setEditingAppointment(apt);

    // Timezone-safe date extraction for HTML5 input (always YYYY-MM-DD from UTC parts)
    const d = new Date(apt.date);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // Parse any serialized additional properties out of notes
    const rawNotes = (apt as any).notes || apt.message || '';
    const { propertyIds, userNotes } = parseNotes(rawNotes);
    setEditAdditionalProps(propertyIds);

    setEditForm({
      date: dateStr,
      time: apt.time || '',
      message: userNotes,
      propertyId: apt.propertyId || '',
      status: apt.status || 'pending'
    });
  };

  const saveEditAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAppointment) {
      const serializedNotes = formatNotes(editAdditionalProps, editForm.message);
      onUpdateAppointment(editingAppointment.id, {
        ...editForm,
        message: serializedNotes,
        notes: serializedNotes,
        propertyId: editForm.propertyId || null
      } as any);
      setEditingAppointment(null);
      setEditAdditionalProps([]);
    }
  };

  // Client Demands State
  const [clientDemands, setClientDemands] = useState<ClientDemand[]>([]);
  const [demandForm, setDemandForm] = useState<Partial<ClientDemand>>({
    clientName: '', phone: '', description: '', location: '', type: 'appartement', budget: 0, priority: 'medium', status: 'searching'
  });
  const [showDemandModal, setShowDemandModal] = useState(false);

  // Appointments State
  const [showAptModal, setShowAptModal] = useState(false);
  const [aptForm, setAptForm] = useState<Partial<Appointment>>({
    clientName: '', clientPhone: '', source: 'other', meetingType: 'visite', date: '', time: '', message: '', propertyId: ''
  });

  useEffect(() => {
    if (location.state && (location.state as any).action === 'new-appointment') {
      setAptForm({
        clientName: '', clientPhone: '', source: 'other', meetingType: 'visite', date: '', time: '', message: '', propertyId: ''
      });
      setShowAptModal(true);
      // Clear the action so it doesn't trigger again on subsequent updates
      navigate(location.pathname, { replace: true, state: { ...location.state, action: undefined } });
    } else if (location.state && (location.state as any).action === 'new-demand') {
      setDemandForm({
        clientName: '', phone: '', description: '', location: '', type: 'appartement', budget: 0, priority: 'medium', status: 'searching'
      });
      setShowDemandModal(true);
      // Clear the action so it doesn't trigger again on subsequent updates
      navigate(location.pathname, { replace: true, state: { ...location.state, action: undefined } });
    }
  }, [location.state, location.pathname, navigate]);

  // State for working hours editing
  const [isEditingHours, setIsEditingHours] = useState(false);
  const [hoursForm, setHoursForm] = useState({
    weekdays: settings?.workingHours?.weekdays || '9:00 - 18:00',
    saturday: settings?.workingHours?.saturday || '9:00 - 14:00',
    sunday: settings?.workingHours?.sunday || 'Fermé'
  });

  const handleUpdateHours = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateSettings && settings) {
      onUpdateSettings({
        ...settings,
        workingHours: {
          weekdays: hoursForm.weekdays,
          saturday: hoursForm.saturday,
          sunday: hoursForm.sunday
        }
      });
      setIsEditingHours(false);
    }
  };

  // Fetch demands
  useEffect(() => {
    if (user.role === 'admin' || user.role === 'agent') {
      const fetchDemands = async () => {
        try {
          const data = await clientDemandsAPI.getAll();
          setClientDemands(data);
        } catch (err) {
          console.error("Failed to fetch demands:", err);
        }
      };
      fetchDemands();
    }
  }, [user.role]);

  // Reset form data when user prop changes
  useEffect(() => {
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || ''
    });
  }, [user]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=0D9488&color=fff&t=${Date.now()}`
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || ''
    });
    setIsEditing(false);
  };

  const getMatchesCountForDemand = (demand: ClientDemand) => {
    if (!properties || properties.length === 0) return 0;

    const localIgnored = typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem(`ignored_matches_${demand.id}`) || '[]')
      : [];
    const ignoredIds = new Set([
      ...(demand.ignoredPropertyIds || []),
      ...localIgnored
    ]);

    const typeMapping: Record<string, string[]> = {
      'appartement': ['apartment', 'studio', 'duplex', 'triplex', 'penthouse'],
      'villa': ['villa'],
      'terrain': ['land'],
      'bureau': ['commercial', 'depot'],
      'commerce': ['commerce', 'commercial']
    };

    const allowedTypes = typeMapping[demand.type] || [];
    const demandLoc = demand.location.toLowerCase();
    const areaMatch = demand.description.match(/(\d+)\s*m[2²]/);
    const requestedArea = areaMatch ? parseInt(areaMatch[1]) : null;

    let count = 0;
    for (const property of properties) {
      if (ignoredIds.has(property.id)) continue;

      let score = 0;
      // 1. Type Match
      if (allowedTypes.includes(property.type)) {
        score += 40;
      } else {
        if (demand.type === 'appartement' && property.type === 'villa') score += 5;
        if (demand.type === 'villa' && property.type === 'apartment') score += 5;
      }

      // 2. Budget Match
      if (demand.budget && demand.budget > 0) {
        const priceDiff = (property.price - demand.budget) / demand.budget;
        if (priceDiff <= 0) score += 30;
        else if (priceDiff <= 0.1) score += 20;
        else if (priceDiff <= 0.2) score += 10;
      } else {
        score += 15;
      }

      // 3. Location Match
      const propCity = (property.location?.city || '').toLowerCase();
      const propAddr = (property.location?.address || '').toLowerCase();
      if (propCity && (propCity.includes(demandLoc) || demandLoc.includes(propCity))) {
        score += 20;
      } else if (propAddr && (propAddr.includes(demandLoc) || demandLoc.includes(propAddr))) {
        score += 12;
      }

      // 4. Area Match
      if (requestedArea && property.features?.area) {
        const areaDiff = Math.abs(property.features.area - requestedArea) / requestedArea;
        if (areaDiff <= 0.2) score += 10;
        else if (areaDiff <= 0.4) score += 5;
      }

      // 5. Priority
      if (demand.priority === 'high') score += 5;

      if (score >= 45) {
        count++;
      }
    }
    return count;
  };

  const handleAddDemand = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newDemand = await clientDemandsAPI.create(demandForm);
      setClientDemands(prev => [newDemand, ...prev]);
      setShowDemandModal(false);
      setDemandForm({ clientName: '', phone: '', description: '', location: '', type: 'appartement', budget: 0, priority: 'medium', status: 'searching' });
      notify.success('Demande client ajoutée avec succès.');

      const matchingCount = getMatchesCountForDemand(newDemand);
      if (matchingCount > 0) {
        notify.success(`Opportunité ! ${matchingCount} propriété(s) correspondent aux critères de ${newDemand.clientName}.`, { duration: 6000 });
      }
    } catch (err) {
      console.error("Failed to add demand:", err);
      notify.error('Erreur lors de la création de la demande.');
    }
  };



  const handleAddApt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const serializedNotes = formatNotes(addAdditionalProps, aptForm.message || '');
      const payload = { ...aptForm, message: serializedNotes, notes: serializedNotes };
      const newApt = await appointmentsAPI.create(payload);
      // Push to parent state immediately (before socket fires)
      onAddAppointment?.(newApt);
      setShowAptModal(false);
      // Reset form
      setAptForm({
        clientName: '', clientPhone: '', source: 'other', meetingType: 'visite', date: '', time: '', message: '', propertyId: ''
      });
      setAddAdditionalProps([]);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la création du rendez-vous');
    }
  };



  // Stats Logic - Timezone-safe UTC matching
  const apptsToday = appointments.filter(a => {
    if (a.status === 'rejected') return false;
    const d = new Date(a.date);
    const todayDate = new Date();
    return d.getUTCFullYear() === todayDate.getFullYear() &&
      d.getUTCMonth() === todayDate.getMonth() &&
      d.getUTCDate() === todayDate.getDate();
  }).length;

  const apptsTomorrow = appointments.filter(a => {
    if (a.status === 'rejected') return false;
    const d = new Date(a.date);
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    return d.getUTCFullYear() === tomorrowDate.getFullYear() &&
      d.getUTCMonth() === tomorrowDate.getMonth() &&
      d.getUTCDate() === tomorrowDate.getDate();
  }).length;

  const activeDemands = clientDemands.filter(d => d.status === 'searching' || d.status === 'contacted').length;
  const matchedDemandsCount = clientDemands.filter(d => d.status === 'matched').length;



  const upcomingAppointments = appointments
    .filter(apt =>
      user.role === 'admin' ||
      user.role === 'agent' ||
      apt.userId === user.id ||
      (apt.clientEmail && apt.clientEmail === user.email) ||
      (apt.clientPhone && apt.clientPhone === user.phone)
    )
    .filter(apt => apt.status === 'pending' || apt.status === 'accepted' || apt.status === 'rejected')
    .filter(apt => {
      const d = new Date(apt.date);
      const aptUTC = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
      const now = new Date();
      const localTodayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
      return aptUTC >= localTodayUTC;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return (a.time || '').localeCompare(b.time || '');
    });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-12">
      {/* Header with Action Buttons */}
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-dark via-[#112942] to-[#0A1A2A] rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl mb-10">
        {/* Radial decorative light */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-teal/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute -left-10 -bottom-10 w-60 h-60 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5 sm:gap-6">
            <div className="w-24 h-24 rounded-full border-4 border-white/10 shadow-xl flex items-center justify-center bg-white/5 text-white/40 flex-shrink-0 relative group overflow-hidden">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
              ) : (
                <UserIcon size={48} className="text-white/60" />
              )}
              <div className="absolute inset-0 bg-brand-teal/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-3">
                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
                  Bienvenue, <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-teal to-cyan-400 font-bold">{user.name}</span>
                </h1>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${user.role === 'admin'
                  ? 'bg-brand-teal/20 text-brand-teal border-brand-teal/30'
                  : user.role === 'agent'
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                    : 'bg-white/10 text-white/80 border-white/20'
                  }`}>
                  {user.role}
                </span>
              </div>
              <p className="text-gray-300 text-sm sm:text-base max-w-xl font-light">
                Gerez votre profil, vos rendez-vous et vos favoris immobiliers Look Immo.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Three Column Layout on Desktop, Vertical on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 lg:[grid-template-rows:max-content_1fr] items-start gap-6 mb-8">

        {/* 1. ADMIN STATS (Moved to very top on mobile) */}
        {user.role === 'admin' && (
          <div className="lg:col-span-2 lg:col-start-1">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Stat 1 */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100/80 shadow-soft hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-all duration-300 group-hover:scale-110"></div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-50/80 flex items-center justify-center text-blue-600 mr-3 sm:mr-4 relative z-10 shadow-sm flex-shrink-0">
                  <CalendarDays size={18} className="sm:w-5 sm:h-5" />
                </div>
                <div className="relative z-10 min-w-0">
                  <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 truncate sm:whitespace-normal" title="Rdv Aujourd'hui">Rdv Aujourd'hui</p>
                  <p className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight">{apptsToday}</p>
                </div>
              </div>
              {/* Stat 2 */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100/80 shadow-soft hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 transition-all duration-300 group-hover:scale-110"></div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-50/80 flex items-center justify-center text-indigo-600 mr-3 sm:mr-4 relative z-10 shadow-sm flex-shrink-0">
                  <Calendar size={18} className="sm:w-5 sm:h-5" />
                </div>
                <div className="relative z-10 min-w-0">
                  <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 truncate sm:whitespace-normal" title="Rdv Demain">Rdv Demain</p>
                  <p className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight">{apptsTomorrow}</p>
                </div>
              </div>
              {/* Stat 3 */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100/80 shadow-soft hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-orange-50 rounded-bl-full -mr-4 -mt-4 transition-all duration-300 group-hover:scale-110"></div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-orange-50/80 flex items-center justify-center text-orange-600 mr-3 sm:mr-4 relative z-10 shadow-sm flex-shrink-0">
                  <Activity size={18} className="sm:w-5 sm:h-5" />
                </div>
                <div className="relative z-10 min-w-0">
                  <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 truncate sm:whitespace-normal" title="Demandes Actives">Demandes Actives</p>
                  <p className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight">{activeDemands}</p>
                </div>
              </div>
              {/* Stat 4 */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100/80 shadow-soft hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-green-50 rounded-bl-full -mr-4 -mt-4 transition-all duration-300 group-hover:scale-110"></div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-green-50/80 flex items-center justify-center text-green-600 mr-3 sm:mr-4 relative z-10 shadow-sm flex-shrink-0">
                  <CheckCircle size={18} className="sm:w-5 sm:h-5" />
                </div>
                <div className="relative z-10 min-w-0">
                  <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 truncate sm:whitespace-normal" title="Matchées">Matchées</p>
                  <p className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight">{matchedDemandsCount}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. RIGHT COLUMN: Compact Appointment Reminder Widget */}
        <div className="bg-white rounded-3xl shadow-soft border border-gray-100/80 p-6 lg:col-start-3 lg:row-span-2 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-brand-teal to-blue-500"></div>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center font-sans">
            <CalendarDays className="mr-2 text-brand-teal" size={18} />
            Prochains Rendez-vous
          </h2>

          {upcomingAppointments.length > 0 ? (
            <div className="space-y-4">
              {upcomingAppointments.map(apt => (
                <div key={apt.id} className="bg-gradient-to-br from-gray-50/80 to-white hover:from-white hover:to-white rounded-2xl p-5 border border-gray-100 hover:border-brand-teal/30 hover:shadow-soft transition-all duration-300 relative group overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-brand-teal/5 rounded-full blur-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                  <div className="flex items-center gap-3.5 mb-4 relative z-10">
                    <div className="w-11 h-11 bg-gradient-to-br from-brand-teal to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-brand-teal/15">
                      <Calendar className="text-white" size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate font-sans">
                        {(() => {
                          const d = new Date(apt.date);
                          const day = d.getUTCDate();
                          const monthNames = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
                          const month = monthNames[d.getUTCMonth()];

                          const now = new Date();
                          const isToday = d.getUTCFullYear() === now.getFullYear() &&
                            d.getUTCMonth() === now.getMonth() &&
                            d.getUTCDate() === now.getDate();

                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          const isTomorrow = d.getUTCFullYear() === tomorrow.getFullYear() &&
                            d.getUTCMonth() === tomorrow.getMonth() &&
                            d.getUTCDate() === tomorrow.getDate();

                          return (
                            <>
                              {`${day} ${month}`}
                              {isToday && <span className="ml-2 text-[10px] bg-brand-teal/10 text-brand-teal px-2 py-0.5 rounded-full font-extrabold tracking-wide uppercase">Aujourd'hui</span>}
                              {isTomorrow && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-extrabold tracking-wide uppercase">Demain</span>}
                            </>
                          );
                        })()}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Clock size={12} className="text-brand-teal" />
                        <p className="text-xs text-brand-teal font-bold">{apt.time}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5 text-sm border-t border-gray-100 pt-3.5 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
                        <UserIcon size={12} />
                      </div>
                      <span className="font-semibold text-gray-800 truncate">{apt.userName}</span>
                    </div>
                    {apt.clientPhone && (
                      <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
                          <Phone size={12} />
                        </div>
                        <span className="text-gray-600 truncate">{apt.clientPhone}</span>
                      </div>
                    )}
                    {/* Primary property row */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
                        <HomeIcon size={12} />
                      </div>
                      <span className="text-gray-600 truncate font-medium">{apt.propertyTitle || 'Aucune'}</span>
                    </div>
                    {/* Additional properties — same style as primary */}
                    {(() => {
                      const { propertyIds } = parseNotes((apt as any).notes || apt.message || '');
                      if (propertyIds.length === 0) return null;
                      return propertyIds.map(pid => {
                        const p = properties.find(pr => pr.id === pid);
                        return p ? (
                          <div key={pid} className="flex items-center gap-2.5">
                            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
                              <HomeIcon size={12} />
                            </div>
                            <span className="text-gray-600 truncate font-medium">{p.title}</span>
                          </div>
                        ) : null;
                      });
                    })()}
                  </div>

                  <div className="mt-3.5 pt-3.5 border-t border-gray-100 flex justify-between items-center relative z-10">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${apt.status === 'accepted'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : apt.status === 'rejected'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${apt.status === 'accepted' ? 'bg-green-500 animate-pulse' : apt.status === 'rejected' ? 'bg-red-500' : 'bg-amber-500 animate-pulse'
                        }`}></span>
                      {apt.status === 'accepted' ? 'Confirmé' : apt.status === 'rejected' ? 'Annulé' : 'En attente'}
                    </span>

                    {(apt.status === 'pending' || apt.status === 'accepted' || apt.status === 'rejected') && (
                      <div className="flex gap-1">
                        {(user.role === 'admin' || user.role === 'agent') && (apt.status === 'pending' || apt.status === 'rejected') && (
                          <button
                            onClick={() => onUpdateAppointment(apt.id, { status: 'accepted' })}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-xl transition-all duration-200"
                            title="Confirmer"
                          >
                            <Check size={16} />
                          </button>
                        )}
                        {(user.role === 'admin' || user.role === 'agent') && apt.status === 'pending' && (
                          <button
                            onClick={() => onUpdateAppointment(apt.id, { status: 'rejected' })}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200"
                            title="Refuser"
                          >
                            <X size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => openEditAppointment(apt)}
                          className="p-2 text-brand-teal hover:bg-brand-teal/5 rounded-xl transition-all duration-200"
                          title="Modifier"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={async () => {
                            const isRejected = apt.status === 'rejected';
                            const confirmed = await confirm({
                              title: isRejected ? 'Supprimer ?' : 'Annuler le rendez-vous ?',
                              message: isRejected
                                ? 'Êtes-vous sûr de vouloir supprimer définitivement ce rendez-vous ? Cette action est irréversible.'
                                : 'Êtes-vous sûr de vouloir annuler ce rendez-vous ?',
                              confirmText: isRejected ? 'Supprimer' : 'Annuler',
                              cancelText: 'Retour',
                              variant: 'danger'
                            });
                            if (confirmed) {
                              onCancelAppointment(apt.id);
                            }
                          }}
                          className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all duration-200"
                          title={apt.status === 'rejected' ? 'Supprimer' : 'Annuler'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
              <CalendarDays className="mx-auto text-gray-300 mb-2.5" size={32} />
              <p className="text-sm font-semibold text-gray-500">Aucun rendez-vous à venir</p>
            </div>
          )}
        </div>

        {/* 3. LEFT COLUMN REST: Admin = Quick Actions/Visits, User = Favorites */}
        {user.role === 'admin' ? (
          /* ADMIN: CRM Dashboard Section Rest */
          <div className="lg:col-span-2 lg:col-start-1 space-y-6">

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Quick Actions Card: Rendez-vous */}
              <div className="bg-white rounded-3xl shadow-soft border border-gray-100/80 p-6 flex flex-col justify-between h-full min-h-[190px] relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-teal/5 rounded-bl-full pointer-events-none transition-transform duration-300 group-hover:scale-105"></div>
                <div className="flex items-start gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-brand-teal/10 flex items-center justify-center text-brand-teal flex-shrink-0 shadow-inner">
                    <CalendarDays size={24} />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-brand-dark leading-tight">Rendez-vous</h2>
                    <p className="text-xs text-gray-500 leading-relaxed">Planifier et associer des visites clients.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAptModal(true)}
                  className="mt-5 w-full bg-gradient-to-r from-brand-teal to-cyan-500 text-white py-3 rounded-2xl text-xs sm:text-sm font-bold hover:from-cyan-500 hover:to-brand-teal transition-all duration-300 flex items-center justify-center shadow-lg shadow-brand-teal/15 hover:shadow-brand-teal/25 active:scale-[0.98] whitespace-nowrap relative z-10"
                >
                  <Plus size={18} className="mr-1.5" /> Nouveau Rdv
                </button>
              </div>

              {/* Quick Actions Card: Demandes Clients */}
              <div className="bg-white rounded-3xl shadow-soft border border-gray-100/80 p-6 flex flex-col justify-between h-full min-h-[190px] relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-bl-full pointer-events-none transition-transform duration-300 group-hover:scale-105"></div>
                <div className="flex items-start gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500 flex-shrink-0 shadow-inner">
                    <Target size={24} />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-brand-dark leading-tight">Demandes Clients</h2>
                    <p className="text-xs text-gray-500 leading-relaxed">Créer une fiche de recherche pour un client.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDemandModal(true)}
                  className="mt-5 w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3 rounded-2xl text-xs sm:text-sm font-bold hover:from-amber-500 hover:to-orange-500 transition-all duration-300 flex items-center justify-center shadow-lg shadow-orange-500/15 hover:shadow-orange-500/25 active:scale-[0.98] whitespace-nowrap relative z-10"
                >
                  <Plus size={18} className="mr-1.5" /> Nouvelle Demande
                </button>
              </div>
            </div>

            {/* Working Hours Management */}
            {settings && onUpdateSettings && (
              <div className="bg-white rounded-3xl shadow-soft border border-gray-100/80 p-6 relative overflow-hidden">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="font-bold text-gray-800 flex items-center">
                    <Clock size={20} className="mr-2 text-brand-teal" />
                    Horaires d'ouverture de l'agence
                  </h3>
                  {!isEditingHours ? (
                    <button
                      onClick={() => setIsEditingHours(true)}
                      className="text-xs text-brand-teal font-bold hover:text-brand-dark transition-colors flex items-center gap-1"
                    >
                      <Edit2 size={12} /> Modifier
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditingHours(false)}
                      className="text-xs text-gray-400 font-bold hover:text-gray-600 transition-colors"
                    >
                      Annuler
                    </button>
                  )}
                </div>

                {!isEditingHours ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 hover:border-brand-teal/15 transition-all duration-300">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Semaine (Lun-Ven)</span>
                      <span className="font-semibold text-gray-800">{settings.workingHours?.weekdays}</span>
                    </div>
                    <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 hover:border-brand-teal/15 transition-all duration-300">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Samedi</span>
                      <span className="font-semibold text-gray-800">{settings.workingHours?.saturday}</span>
                    </div>
                    <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 hover:border-brand-teal/15 transition-all duration-300">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Dimanche</span>
                      <span className={`font-semibold ${settings.workingHours?.sunday === 'Fermé' ? 'text-red-500' : 'text-gray-800'}`}>{settings.workingHours?.sunday}</span>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleUpdateHours} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5">Lundi - Vendredi</label>
                        <input
                          type="text"
                          value={hoursForm.weekdays}
                          onChange={e => setHoursForm({ ...hoursForm, weekdays: e.target.value })}
                          className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal transition-all bg-gray-50/50 focus:bg-white"
                          aria-label="Heures d'ouverture Lundi-Vendredi"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5">Samedi</label>
                        <input
                          type="text"
                          value={hoursForm.saturday}
                          onChange={e => setHoursForm({ ...hoursForm, saturday: e.target.value })}
                          className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal transition-all bg-gray-50/50 focus:bg-white"
                          aria-label="Heures d'ouverture Samedi"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5">Dimanche</label>
                        <input
                          type="text"
                          value={hoursForm.sunday}
                          onChange={e => setHoursForm({ ...hoursForm, sunday: e.target.value })}
                          className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal transition-all bg-gray-50/50 focus:bg-white"
                          aria-label="Heures d'ouverture Dimanche"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 bg-gradient-to-r from-brand-teal to-cyan-500 hover:from-cyan-500 hover:to-brand-teal text-white text-sm font-bold rounded-2xl transition-all duration-300 shadow-md shadow-brand-teal/10"
                    >
                      Enregistrer les horaires
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        ) : (
          /* REGULAR USER: Favorites Section */
          <div className="lg:col-span-2 lg:row-start-1 bg-white rounded-3xl shadow-soft border border-gray-100/80 p-4 sm:p-6 md:p-8">
            <h2 className="text-xl font-serif font-bold text-brand-dark mb-6 flex items-center">
              <Heart className="mr-2.5 text-red-500 animate-pulse" size={24} fill="currentColor" />
              Mes Favoris
              {user.favorites.length > 0 && (
                <span className="ml-2 px-2.5 py-0.5 bg-red-50 text-red-600 text-xs font-extrabold rounded-full border border-red-100">
                  {user.favorites.length}
                </span>
              )}
            </h2>

            {user.favorites.length > 0 ? (
              <div className="space-y-4">
                {properties.filter(p => user.favorites.includes(p.id)).map(property => (
                  <div
                    key={property.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-white hover:bg-gray-50/30 rounded-2xl hover:border-brand-teal/20 transition-all duration-300 border border-gray-100 cursor-pointer gap-4 group shadow-sm hover:shadow-soft"
                    onClick={() => onSelectProperty(property.id)}
                  >
                    {/* Property Image & Info */}
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 w-full sm:w-auto">
                      <div
                        className="w-20 h-16 sm:w-24 sm:h-20 rounded-xl overflow-hidden flex-shrink-0 relative shadow-inner"
                        style={{
                          backgroundImage: getLQIP(property.images[0]) ? `url(${getLQIP(property.images[0])})` : undefined,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundColor: getLQIP(property.images[0]) ? undefined : '#f3f4f6',
                        }}
                      >
                        <img src={getImageSrc(property.images[0], 'thumb')} alt={property.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-black/5"></div>
                      </div>

                      {/* Property Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-serif font-bold text-gray-900 mb-1 truncate text-xs sm:text-base group-hover:text-brand-teal transition-colors">{property.title}</h3>
                        <div className="flex items-center text-[11px] sm:text-xs text-brand-grey mb-1.5">
                          <MapPin size={12} className="mr-1 text-brand-teal flex-shrink-0" />
                          <span className="truncate">{property.location.city}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-brand-grey font-medium">
                          {property.type === 'land' ? (
                            <>
                              <span className="flex items-center bg-gray-50 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md flex-shrink-0">
                                <span className="mr-1 sm:mr-1.5">🏗️</span>
                                {property.features.vocation ? property.features.vocation.replace(/résidentiel|residentiel/gi, '').trim() : 'N/A'}
                              </span>
                              <span className="flex items-center bg-gray-50 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md flex-shrink-0">
                                <span className="mr-1 sm:mr-1.5">📊</span>
                                COS {property.features.cos || 'N/A'}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="flex items-center bg-gray-50 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md flex-shrink-0">
                                <BedDouble size={12} className="mr-1 sm:mr-1.5 text-brand-teal flex-shrink-0" />
                                {property.features.bedrooms} ch.
                              </span>
                              <span className="flex items-center bg-gray-50 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md flex-shrink-0">
                                <Bath size={12} className="mr-1 sm:mr-1.5 text-brand-teal flex-shrink-0" />
                                {property.features.bathrooms} sdb
                              </span>
                            </>
                          )}
                          <span className="flex items-center bg-gray-50 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md flex-shrink-0">
                            <Square size={12} className="mr-1 sm:mr-1.5 text-brand-teal flex-shrink-0" />
                            {property.features.area} m²
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Price and Actions Group */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100 w-full sm:w-auto gap-3">
                      <div className="text-left sm:text-right">
                        <p className="text-base sm:text-lg font-bold text-brand-dark">
                          <Price amount={property.price} priceType={property.priceType} />
                        </p>
                        {property.listingType === 'rent' && (
                          <p className="text-[10px] text-gray-400 uppercase font-sans font-bold tracking-wider"> / Mois</p>
                        )}
                      </div>

                      {/* Remove button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(property.id);
                        }}
                        className="p-2 hover:bg-red-50 rounded-full transition text-red-500 hover:scale-105 active:scale-95"
                        title="Retirer des favoris"
                      >
                        <Heart size={18} fill="currentColor" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-14 text-gray-500 bg-gray-50/30 rounded-2xl border border-dashed border-gray-200">
                <Heart className="mx-auto text-gray-300 mb-3" size={44} />
                <h4 className="font-serif font-bold text-brand-dark text-lg mb-1.5">Aucun favori</h4>
                <p className="text-sm text-gray-500 mb-6">Vous n'avez pas encore ajouté de propriétés à vos favoris.</p>
                <button
                  onClick={() => onNavigate('home')}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-brand-teal to-cyan-500 hover:from-cyan-500 hover:to-brand-teal text-white rounded-2xl font-bold transition-all duration-300 shadow-md shadow-brand-teal/15 hover:shadow-brand-teal/25"
                >
                  <Search size={16} className="mr-2" />
                  Explorer les propriétés
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Account Settings Section */}
      <div className="bg-white rounded-3xl shadow-soft border border-gray-100/80 p-6 sm:p-8 clean-ui-scope relative overflow-hidden mt-10">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-teal/5 rounded-bl-full -mr-8 -mt-8 pointer-events-none"></div>

        <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-5">
          <h2 className="text-xl font-serif font-bold text-brand-dark flex items-center">
            <UserIcon className="mr-3 text-brand-teal" size={24} />
            Paramètres du Compte
          </h2>

          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-brand-teal hover:text-brand-dark font-bold text-sm flex items-center transition-colors gap-1.5"
              type="button"
            >
              <Edit size={16} /> Modifier
            </button>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-6 w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group">
              <label className="text-xs font-bold text-gray-500 mb-2 flex items-center uppercase tracking-wider">
                <UserIcon size={14} className="mr-2 text-gray-400 group-focus-within:text-brand-teal transition-colors" />
                Nom Complet
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isEditing}
                  className={`w-full pl-4 pr-4 py-3.5 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal transition-all duration-300 ${isEditing ? 'bg-white border-gray-200 shadow-sm' : 'bg-gray-50/80 border-transparent text-gray-600 cursor-not-allowed'
                    }`}
                  placeholder="Votre nom"
                />
              </div>
            </div>

            <div className="group">
              <label className="text-xs font-bold text-gray-500 mb-2 flex items-center uppercase tracking-wider">
                <span className="mr-2 text-gray-400 group-focus-within:text-brand-teal transition-colors">@</span>
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!isEditing}
                  className={`w-full pl-4 pr-4 py-3.5 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal transition-all duration-300 ${isEditing ? 'bg-white border-gray-200 shadow-sm' : 'bg-gray-50/80 border-transparent text-gray-600 cursor-not-allowed'
                    }`}
                  placeholder="votre@email.com"
                />
              </div>
            </div>

            <div className="group">
              <label className="text-xs font-bold text-gray-500 mb-2 flex items-center uppercase tracking-wider">
                <Phone size={14} className="mr-2 text-gray-400 group-focus-within:text-brand-teal transition-colors" />
                Numéro de téléphone
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^[0-9+\s]*$/.test(val)) {
                      setFormData({ ...formData, phone: val });
                    }
                  }}
                  disabled={!isEditing}
                  className={`w-full pl-4 pr-4 py-3.5 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal transition-all duration-300 ${isEditing ? 'bg-white border-gray-200 shadow-sm' : 'bg-gray-50/80 border-transparent text-gray-600 cursor-not-allowed'
                    }`}
                  placeholder="+216 00 000 000"
                />
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="pt-4 flex justify-end space-x-4 animate-fade-in-up">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-3.5 rounded-2xl font-bold text-sm text-gray-500 hover:bg-gray-100 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="bg-brand-dark hover:bg-brand-primary text-white px-8 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 flex items-center shadow-brand-dark/10"
              >
                <span className="mr-2">Enregistrer</span>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </form>
      </div>


      {/* Add Appointment Modal */}
      {showAptModal && (
        <div className="fixed inset-0 bg-brand-dark/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in" onClick={() => setShowAptModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col transform transition-all duration-300 border border-gray-100/50 scale-100 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0">
              <h3 className="text-lg font-serif font-bold text-brand-dark flex items-center">
                <CalendarDays className="mr-2 text-brand-teal animate-pulse" size={22} />
                Nouveau Rendez-vous
              </h3>
              <button onClick={() => setShowAptModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-400 hover:text-gray-600" title="Fermer">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddApt} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="apt-client-name" className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Nom Client *</label>
                  <input id="apt-client-name" required type="text" value={aptForm.clientName || ''} onChange={e => setAptForm({ ...aptForm, clientName: e.target.value })} placeholder="Nom du client" className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal focus:outline-none bg-gray-50/50 focus:bg-white transition-all text-sm" />
                </div>
                <div>
                  <label htmlFor="apt-client-phone" className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Téléphone</label>
                  <input id="apt-client-phone" type="text" value={aptForm.clientPhone || ''} onChange={e => setAptForm({ ...aptForm, clientPhone: e.target.value })} placeholder="Téléphone" className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal focus:outline-none bg-gray-50/50 focus:bg-white transition-all text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Date *</label>
                  <CustomDatePicker
                    value={aptForm.date || ''}
                    onChange={val => setAptForm({ ...aptForm, date: val })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Heure *</label>
                  <CustomTimePicker
                    value={aptForm.time || ''}
                    onChange={val => setAptForm({ ...aptForm, time: val })}
                    required
                  />
                </div>
              </div>

              {/* Primary + additional properties — custom searchable picker */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Propriétés à visiter</label>
                {/* Selected pills */}
                {(aptForm.propertyId || addAdditionalProps.some(Boolean)) && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {aptForm.propertyId && (
                      <span className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 bg-brand-teal/10 text-brand-teal text-xs font-bold rounded-full border border-brand-teal/20">
                        🏠 {properties.find(p => p.id === aptForm.propertyId)?.title || 'Propriété'}
                        <button type="button" onClick={() => setAptForm({ ...aptForm, propertyId: '' })} className="ml-0.5 hover:bg-brand-teal/20 rounded-full p-0.5 transition"><X size={11} /></button>
                      </span>
                    )}
                    {addAdditionalProps.filter(Boolean).map((pid, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-full border border-gray-200">
                        {properties.find(p => p.id === pid)?.title || 'Propriété'}
                        <button type="button" onClick={() => setAddAdditionalProps(prev => prev.filter((_, idx) => idx !== i))} className="ml-0.5 hover:bg-gray-200 rounded-full p-0.5 transition"><X size={11} /></button>
                      </span>
                    ))}
                  </div>
                )}
                {/* Scrollable property list */}
                <div className="border border-gray-200 rounded-2xl overflow-hidden bg-gray-50/50">
                  <div className="px-3 pt-2.5 pb-1.5 border-b border-gray-100 bg-white">
                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Rechercher une propriété..."
                        className="w-full pl-7 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-brand-teal transition-all"
                        onChange={e => {
                          const q = e.target.value.toLowerCase();
                          const els = document.querySelectorAll('.prop-picker-item');
                          els.forEach((el: Element) => {
                            const text = el.getAttribute('data-title') || '';
                            (el as HTMLElement).style.display = text.includes(q) ? '' : 'none';
                          });
                        }}
                      />
                    </div>
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    <button
                      type="button"
                      className={`prop-picker-item w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs font-semibold transition-all ${!aptForm.propertyId ? 'bg-brand-teal/5 text-brand-teal' : 'text-gray-500 hover:bg-white'}`}
                      data-title="aucune"
                      onClick={() => setAptForm({ ...aptForm, propertyId: '' })}
                    >
                      <span className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${ !aptForm.propertyId ? 'border-brand-teal bg-brand-teal' : 'border-gray-300' }">
                        {!aptForm.propertyId && <Check size={10} className="text-white" />}
                      </span>
                      Aucune
                    </button>
                    {properties.map(p => {
                      const isMain = aptForm.propertyId === p.id;
                      const isExtra = addAdditionalProps.includes(p.id);
                      const isSelected = isMain || isExtra;
                      const priceStr = p.price ? p.price.toLocaleString('fr-TN') + ' DT' : '';
                      return (
                        <button
                          key={p.id}
                          type="button"
                          className={`prop-picker-item w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs font-semibold transition-all border-t border-gray-50 ${isSelected ? 'bg-brand-teal/5 text-brand-teal' : 'text-gray-600 hover:bg-white'}`}
                          data-title={`${p.title.toLowerCase()} ${p.price ?? ''}`}
                          onClick={() => {
                            if (isMain) {
                              setAptForm({ ...aptForm, propertyId: '' });
                            } else if (isExtra) {
                              setAddAdditionalProps(prev => prev.filter(id => id !== p.id));
                            } else if (!aptForm.propertyId) {
                              setAptForm({ ...aptForm, propertyId: p.id });
                            } else {
                              setAddAdditionalProps(prev => [...prev.filter(Boolean), p.id]);
                            }
                          }}
                        >
                          <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'border-brand-teal bg-brand-teal' : 'border-gray-300'}`}>
                            {isSelected && <Check size={10} className="text-white" />}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block line-clamp-1">{p.title}</span>
                            {priceStr && <span className={`block text-[10px] font-bold mt-0.5 ${isSelected ? 'text-brand-teal/70' : 'text-gray-400'}`}>{priceStr}</span>}
                          </span>
                          {isMain && <span className="text-[9px] font-black text-brand-teal uppercase tracking-wider bg-brand-teal/10 px-1.5 py-0.5 rounded-full flex-shrink-0">Principal</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div>
                <label htmlFor="apt-notes" className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Notes</label>
                <textarea id="apt-notes" value={aptForm.message} onChange={e => setAptForm({ ...aptForm, message: e.target.value })} placeholder="Notes ou remarques..." rows={2} className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal focus:outline-none bg-gray-50/50 focus:bg-white transition-all text-sm"></textarea>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={() => setShowAptModal(false)} className="px-6 py-3 bg-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-200 transition text-sm">Annuler</button>
                <button type="submit" className="px-6 py-3 bg-gradient-to-r from-brand-teal to-cyan-500 hover:from-cyan-500 hover:to-brand-teal text-white font-bold rounded-2xl transition-all duration-300 shadow-md shadow-brand-teal/10 text-sm">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Demand Modal */}
      {showDemandModal && (
        <div className="fixed inset-0 bg-brand-dark/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in" onClick={() => setShowDemandModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col transform transition-all duration-300 border border-gray-100/50 scale-100 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-orange-50/50 flex-shrink-0">
              <h3 className="text-lg font-serif font-bold text-brand-dark flex items-center">
                <Target className="mr-2 text-orange-500 animate-bounce" size={22} />
                Nouvelle Demande Client
              </h3>
              <button onClick={() => setShowDemandModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-400 hover:text-gray-600" title="Fermer">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddDemand} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="demand-client-name" className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Nom Client *</label>
                  <input id="demand-client-name" required type="text" value={demandForm.clientName} onChange={e => setDemandForm({ ...demandForm, clientName: e.target.value })} placeholder="Nom du client" className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none bg-gray-50/50 focus:bg-white transition-all text-sm" />
                </div>
                <div>
                  <label htmlFor="demand-phone" className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Téléphone</label>
                  <input id="demand-phone" type="text" value={demandForm.phone} onChange={e => setDemandForm({ ...demandForm, phone: e.target.value })} placeholder="Téléphone" className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none bg-gray-50/50 focus:bg-white transition-all text-sm" />
                </div>
              </div>
              <div>
                <label htmlFor="demand-description" className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Description / Recherche *</label>
                <textarea id="demand-description" required value={demandForm.description} onChange={e => setDemandForm({ ...demandForm, description: e.target.value })} rows={2} className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none bg-gray-50/50 focus:bg-white transition-all text-sm" placeholder="Ex: Cherche villa avec piscine..."></textarea>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="demand-location" className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Localisation *</label>
                  <input id="demand-location" required type="text" value={demandForm.location} onChange={e => setDemandForm({ ...demandForm, location: e.target.value })} placeholder="Ex: La Marsa, Tunis..." className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none bg-gray-50/50 focus:bg-white transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Type de bien *</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { value: 'appartement', label: 'Appart.', emoji: '🏢' },
                      { value: 'villa', label: 'Villa', emoji: '🏡' },
                      { value: 'terrain', label: 'Terrain', emoji: '🌿' },
                      { value: 'bureau', label: 'Bureau', emoji: '💼' },
                      { value: 'commerce', label: 'Commerce', emoji: '🏪' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDemandForm({ ...demandForm, type: opt.value as any })}
                        className={`flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-xl border-2 text-xs font-bold transition-all duration-200 ${demandForm.type === opt.value
                          ? 'bg-orange-50 border-orange-400 text-orange-700 shadow-sm shadow-orange-100'
                          : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-200 hover:bg-white'
                          }`}
                      >
                        <span className="text-base leading-none">{opt.emoji}</span>
                        <span className="leading-none mt-0.5">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="demand-budget" className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Budget Max (DT)</label>
                  <input
                    id="demand-budget"
                    type="text"
                    value={demandForm.budget ? demandForm.budget.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : ''}
                    onChange={e => {
                      const raw = e.target.value.replace(/\s/g, '');
                      if (/^\d*$/.test(raw)) {
                        setDemandForm({ ...demandForm, budget: raw ? parseFloat(raw) : 0 });
                      }
                    }}
                    placeholder="Ex: 500 000"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none bg-gray-50/50 focus:bg-white transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Priorité</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'high', label: '🔴 Haute', active: 'bg-red-50 border-red-400 text-red-700 shadow-sm shadow-red-100', inactive: 'bg-gray-50 border-gray-100 text-gray-500 hover:border-red-200 hover:bg-red-50/50' },
                      { value: 'medium', label: '🟡 Moyenne', active: 'bg-amber-50 border-amber-400 text-amber-700 shadow-sm shadow-amber-100', inactive: 'bg-gray-50 border-gray-100 text-gray-500 hover:border-amber-200 hover:bg-amber-50/50' },
                      { value: 'low', label: '🟢 Basse', active: 'bg-green-50 border-green-400 text-green-700 shadow-sm shadow-green-100', inactive: 'bg-gray-50 border-gray-100 text-gray-500 hover:border-green-200 hover:bg-green-50/50' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDemandForm({ ...demandForm, priority: opt.value as any })}
                        className={`flex-1 py-2.5 rounded-xl border-2 text-xs font-bold transition-all duration-200 ${demandForm.priority === opt.value ? opt.active : opt.inactive
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={() => setShowDemandModal(false)} className="px-6 py-3 bg-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-200 transition text-sm">Annuler</button>
                <button type="submit" className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-2xl transition-all duration-300 shadow-md shadow-orange-500/10 text-sm">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Appointment Modal */}
      {editingAppointment && (
        <div className="fixed inset-0 bg-brand-dark/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in" onClick={() => setEditingAppointment(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col transform transition-all duration-300 border border-gray-100/50 scale-100 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0">
              <h3 className="text-lg font-serif font-bold text-brand-dark">Modifier le rendez-vous</h3>
              <button
                onClick={() => setEditingAppointment(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Fermer la fenêtre"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveEditAppointment} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Date</label>
                  <CustomDatePicker
                    value={editForm.date}
                    onChange={val => setEditForm({ ...editForm, date: val })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Heure</label>
                  <CustomTimePicker
                    value={editForm.time}
                    onChange={val => setEditForm({ ...editForm, time: val })}
                    required
                  />
                </div>
              </div>

              {/* Propriétés à visiter — edit modal */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Propriétés à visiter</label>
                {/* Selected pills */}
                {(editForm.propertyId || editAdditionalProps.some(Boolean)) && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editForm.propertyId && (
                      <span className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 bg-brand-teal/10 text-brand-teal text-xs font-bold rounded-full border border-brand-teal/20">
                        🏠 {properties.find(p => p.id === editForm.propertyId)?.title || 'Propriété'}
                        <button type="button" onClick={() => setEditForm({ ...editForm, propertyId: '' })} className="ml-0.5 hover:bg-brand-teal/20 rounded-full p-0.5 transition"><X size={11} /></button>
                      </span>
                    )}
                    {editAdditionalProps.filter(Boolean).map((pid, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-full border border-gray-200">
                        {properties.find(p => p.id === pid)?.title || 'Propriété'}
                        <button type="button" onClick={() => setEditAdditionalProps(prev => prev.filter((_, idx) => idx !== i))} className="ml-0.5 hover:bg-gray-200 rounded-full p-0.5 transition"><X size={11} /></button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="border border-gray-200 rounded-2xl overflow-hidden bg-gray-50/50">
                  <div className="px-3 pt-2.5 pb-1.5 border-b border-gray-100 bg-white">
                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Rechercher une propriété..."
                        className="w-full pl-7 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-brand-teal transition-all"
                        onChange={e => {
                          const q = e.target.value.toLowerCase();
                          const els = document.querySelectorAll('.edit-prop-picker-item');
                          els.forEach((el: Element) => {
                            const text = el.getAttribute('data-title') || '';
                            (el as HTMLElement).style.display = text.includes(q) ? '' : 'none';
                          });
                        }}
                      />
                    </div>
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    <button
                      type="button"
                      className={`edit-prop-picker-item w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs font-semibold transition-all ${!editForm.propertyId ? 'bg-brand-teal/5 text-brand-teal' : 'text-gray-500 hover:bg-white'}`}
                      data-title="aucune"
                      onClick={() => setEditForm({ ...editForm, propertyId: '' })}
                    >
                      <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${!editForm.propertyId ? 'border-brand-teal bg-brand-teal' : 'border-gray-300'}`}>
                        {!editForm.propertyId && <Check size={10} className="text-white" />}
                      </span>
                      Aucune
                    </button>
                    {properties.map(p => {
                      const isMain = editForm.propertyId === p.id;
                      const isExtra = editAdditionalProps.includes(p.id);
                      const isSelected = isMain || isExtra;
                      const priceStr = p.price ? p.price.toLocaleString('fr-TN') + ' DT' : '';
                      return (
                        <button
                          key={p.id}
                          type="button"
                          className={`edit-prop-picker-item w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs font-semibold transition-all border-t border-gray-50 ${isSelected ? 'bg-brand-teal/5 text-brand-teal' : 'text-gray-600 hover:bg-white'}`}
                          data-title={`${p.title.toLowerCase()} ${p.price ?? ''}`}
                          onClick={() => {
                            if (isMain) {
                              setEditForm({ ...editForm, propertyId: '' });
                            } else if (isExtra) {
                              setEditAdditionalProps(prev => prev.filter(id => id !== p.id));
                            } else if (!editForm.propertyId) {
                              setEditForm({ ...editForm, propertyId: p.id });
                            } else {
                              setEditAdditionalProps(prev => [...prev.filter(Boolean), p.id]);
                            }
                          }}
                        >
                          <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'border-brand-teal bg-brand-teal' : 'border-gray-300'}`}>
                            {isSelected && <Check size={10} className="text-white" />}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block line-clamp-1">{p.title}</span>
                            {priceStr && <span className={`block text-[10px] font-bold mt-0.5 ${isSelected ? 'text-brand-teal/70' : 'text-gray-400'}`}>{priceStr}</span>}
                          </span>
                          {isMain && <span className="text-[9px] font-black text-brand-teal uppercase tracking-wider bg-brand-teal/10 px-1.5 py-0.5 rounded-full flex-shrink-0">Principal</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {(user.role === 'admin' || user.role === 'agent') && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Statut</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'pending', label: '⏳ En attente', active: 'bg-amber-50 border-amber-400 text-amber-700 shadow-sm', inactive: 'bg-gray-50 border-gray-100 text-gray-500 hover:border-amber-200 hover:bg-amber-50/50' },
                      { value: 'accepted', label: '✅ Confirmé', active: 'bg-green-50 border-green-400 text-green-700 shadow-sm', inactive: 'bg-gray-50 border-gray-100 text-gray-500 hover:border-green-200 hover:bg-green-50/50' },
                      { value: 'rejected', label: '❌ Annulé', active: 'bg-red-50 border-red-400 text-red-700 shadow-sm', inactive: 'bg-gray-50 border-gray-100 text-gray-500 hover:border-red-200 hover:bg-red-50/50' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setEditForm({ ...editForm, status: opt.value })}
                        className={`flex-1 py-2.5 rounded-xl border-2 text-xs font-bold transition-all duration-200 ${editForm.status === opt.value ? opt.active : opt.inactive
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Message (optionnel)</label>
                <textarea
                  value={editForm.message}
                  onChange={e => setEditForm({ ...editForm, message: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal focus:outline-none bg-gray-50/50 focus:bg-white transition-all text-sm"
                  rows={3}
                  placeholder="Ajouter une note..."
                  aria-label="Message du rendez-vous"
                ></textarea>
              </div>

              <div className="pt-4 flex gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingAppointment(null)}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-200 transition text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-brand-teal to-cyan-500 hover:from-cyan-500 hover:to-brand-teal text-white font-bold rounded-2xl transition-all duration-300 shadow-md shadow-brand-teal/10 text-sm"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default DashboardPage;
