import React, { useState, useMemo } from 'react';
import { 
  X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  MapPin, Phone, User as UserIcon, CheckCircle2, XCircle, 
  Clock, TrendingUp, AlertCircle, Trash2, Check, MessageSquare
} from 'lucide-react';
import { Appointment, Property, User } from '@/types';

interface AppointmentsCalendarModalProps {
  onClose: () => void;
  appointments: Appointment[];
  properties: Property[];
  users: User[];
  onUpdateStatus: (id: string, status: 'pending' | 'accepted' | 'rejected') => void;
  onDelete: (id: string) => void;
}

const AppointmentsCalendarModal = ({
  onClose,
  appointments,
  properties,
  users,
  onUpdateStatus,
  onDelete
}: AppointmentsCalendarModalProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [isHeatmapMode, setIsHeatmapMode] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showDayPanel, setShowDayPanel] = useState(false); // mobile: show right panel

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const startingDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const dayNamesShort = ["L", "M", "M", "J", "V", "S", "D"];
  const dayNamesFull = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  const getDayAppointments = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    return appointments.filter(apt => {
      const d = new Date(apt.date);
      const isSameDate = d.getUTCFullYear() === year && d.getUTCMonth() === month && d.getUTCDate() === day;
      const matchesFilter = statusFilter === 'all' || apt.status === statusFilter;
      return isSameDate && matchesFilter;
    }).sort((a, b) => a.time.localeCompare(b.time));
  };

  const getHeatmapColor = (count: number) => {
    if (count === 0) return '';
    if (count <= 2) return 'bg-blue-100';
    if (count <= 5) return 'bg-blue-300';
    return 'bg-blue-500';
  };

  const getBadgeBg = (count: number) => {
    if (count === 0) return 'bg-gray-100 text-gray-700';
    if (count <= 3) return 'bg-blue-100 text-blue-800';
    if (count <= 6) return 'bg-amber-100 text-amber-800';
    return 'bg-red-100 text-red-800';
  };

  const monthAppointments = appointments.filter(a => {
    const d = new Date(a.date);
    return d.getUTCMonth() === currentMonth.getMonth() &&
           d.getUTCFullYear() === currentMonth.getFullYear();
  });

  const completedVisits = monthAppointments.filter(a => a.status === 'accepted').length;
  const cancelledVisits = monthAppointments.filter(a => a.status === 'rejected').length;

  const busiestDay = useMemo(() => {
    const counts: Record<number, number> = {};
    monthAppointments.forEach(a => {
      const day = new Date(a.date).getUTCDate();
      counts[day] = (counts[day] || 0) + 1;
    });
    let max = 0; let bestDay = 0;
    Object.entries(counts).forEach(([day, count]) => {
      if (count > max) { max = count; bestDay = parseInt(day); }
    });
    return bestDay ? `${bestDay} ${monthNames[currentMonth.getMonth()]}` : 'N/A';
  }, [monthAppointments, currentMonth]);

  const selectedDayAppointments = selectedDate ? getDayAppointments(selectedDate.getDate()) : [];

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowAppointments = appointments.filter(a => {
    const d = new Date(a.date);
    return d.getUTCFullYear() === tomorrow.getFullYear() &&
           d.getUTCMonth() === tomorrow.getMonth() &&
           d.getUTCDate() === tomorrow.getDate() &&
           a.status !== 'rejected';
  });

  const handleDayClick = (day: number) => {
    setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
    setShowDayPanel(true);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4">
      <div className="bg-gray-50 w-full max-w-[1400px] h-full sm:h-[92vh] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-brand-dark rounded-xl flex items-center justify-center shadow-md shrink-0">
              <CalendarIcon className="text-white" size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-bold text-gray-900 truncate">Agenda & Statistiques</h2>
              <p className="text-xs text-gray-500 hidden sm:block">Gérez vos visites et analysez vos performances</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition shrink-0">
            <X size={22} />
          </button>
        </div>

        {/* Content scrollable */}
        <div className="flex-1 overflow-auto">
          <div className="p-3 sm:p-6">

            {/* Analytics Cards - 2x2 on mobile, 4 across on lg */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 sm:mb-6">
              <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase leading-tight">Rdv (mois)</p>
                  <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-0.5">{monthAppointments.length}</p>
                </div>
                <div className="w-9 h-9 sm:w-12 sm:h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                  <CalendarIcon size={18} />
                </div>
              </div>
              <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase leading-tight">Confirmés</p>
                  <p className="text-2xl sm:text-3xl font-black text-green-600 mt-0.5">{completedVisits}</p>
                </div>
                <div className="w-9 h-9 sm:w-12 sm:h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center shrink-0">
                  <CheckCircle2 size={18} />
                </div>
              </div>
              <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase leading-tight">Jour actif</p>
                  <p className="text-sm sm:text-2xl font-bold text-gray-900 mt-0.5 truncate">{busiestDay}</p>
                </div>
                <div className="w-9 h-9 sm:w-12 sm:h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center shrink-0">
                  <TrendingUp size={18} />
                </div>
              </div>
              <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase leading-tight">Annulés</p>
                  <p className="text-2xl sm:text-3xl font-black text-red-600 mt-0.5">{cancelledVisits}</p>
                </div>
                <div className="w-9 h-9 sm:w-12 sm:h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center shrink-0">
                  <XCircle size={18} />
                </div>
              </div>
            </div>

            {/* Main layout */}
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">

              {/* Calendar Panel */}
              <div className="flex-1 bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">

                {/* Calendar Nav */}
                <div className="p-3 sm:p-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap gap-2 items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={prevMonth} className="p-1.5 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition">
                      <ChevronLeft size={18} />
                    </button>
                    <h3 className="text-base font-bold text-gray-900 min-w-[130px] text-center capitalize">
                      {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </h3>
                    <button onClick={nextMonth} className="p-1.5 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition">
                      <ChevronRight size={18} />
                    </button>
                    <button onClick={goToToday} className="px-3 py-1 text-xs font-semibold bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                      Aujourd'hui
                    </button>
                  </div>

                  {/* Filters - stack on mobile */}
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-gray-600">
                      <input
                        type="checkbox"
                        checked={isHeatmapMode}
                        onChange={() => setIsHeatmapMode(!isHeatmapMode)}
                        className="rounded text-brand-teal focus:ring-brand-teal w-3.5 h-3.5"
                      />
                      Heatmap
                    </label>
                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:ring-brand-teal focus:border-brand-teal bg-white"
                    >
                      <option value="all">Tous</option>
                      <option value="pending">En attente</option>
                      <option value="accepted">Confirmé</option>
                      <option value="rejected">Annulé</option>
                    </select>
                  </div>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50">
                  {(window.innerWidth < 640 ? dayNamesShort : dayNamesFull).map((day, i) => (
                    <div key={i} className="py-2 text-center text-[10px] sm:text-xs font-bold text-gray-500 uppercase">{day}</div>
                  ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7" style={{ gridAutoRows: 'minmax(56px, 1fr)' }}>
                  {Array.from({ length: startingDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="border-r border-b border-gray-50 bg-gray-50/30" />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dayApts = getDayAppointments(day);
                    const isToday = (() => {
                      const now = new Date();
                      return now.getFullYear() === currentMonth.getFullYear() &&
                             now.getMonth() === currentMonth.getMonth() &&
                             now.getDate() === day;
                    })();
                    const isSelected = selectedDate && 
                                       selectedDate.getFullYear() === currentMonth.getFullYear() &&
                                       selectedDate.getMonth() === currentMonth.getMonth() &&
                                       selectedDate.getDate() === day;

                    return (
                      <div
                        key={day}
                        onClick={() => handleDayClick(day)}
                        className={`relative border-r border-b border-gray-100 p-1.5 sm:p-2 cursor-pointer transition-all duration-150
                          ${isSelected ? 'ring-2 ring-inset ring-brand-teal bg-blue-50/40' : 'hover:bg-gray-50'}
                          ${isHeatmapMode && dayApts.length > 0 ? getHeatmapColor(dayApts.length) : ''}
                        `}
                      >
                        {/* Day number + badge */}
                        <div className="flex items-start justify-between gap-0.5">
                          <span className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full text-xs sm:text-sm font-bold shrink-0
                            ${isToday ? 'bg-brand-dark text-white' : 'text-gray-700'}`}>
                            {day}
                          </span>
                          {dayApts.length > 0 && (
                            <span className={`min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-5 flex items-center justify-center rounded-full text-[9px] sm:text-[10px] font-bold px-1 ${getBadgeBg(dayApts.length)}`}>
                              {dayApts.length}
                            </span>
                          )}
                        </div>

                        {/* Appointment pills — hidden on mobile */}
                        {!isHeatmapMode && (
                          <div className="mt-1 space-y-0.5 hidden sm:block">
                            {dayApts.slice(0, 2).map((apt, idx) => (
                              <div key={idx} className={`text-[9px] truncate px-1 py-0.5 rounded border ${
                                apt.status === 'accepted' ? 'bg-green-50 border-green-100 text-green-700' :
                                apt.status === 'rejected' ? 'bg-red-50 border-red-100 text-red-700' :
                                'bg-yellow-50 border-yellow-100 text-yellow-700'
                              }`}>
                                {apt.time} {apt.clientName || apt.userName || ''}
                              </div>
                            ))}
                            {dayApts.length > 2 && (
                              <div className="text-[9px] text-gray-400 font-medium pl-0.5">+{dayApts.length - 2}</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Panel — always visible on lg, slide-over on mobile */}
              <div className={`
                w-full lg:w-96 flex flex-col gap-4 sm:gap-6
                ${showDayPanel ? 'block' : 'hidden lg:flex'}
              `}>

                {/* Back button on mobile */}
                <button
                  onClick={() => setShowDayPanel(false)}
                  className="lg:hidden flex items-center gap-2 text-sm font-semibold text-brand-dark hover:text-brand-teal transition"
                >
                  <ChevronLeft size={18} /> Retour au calendrier
                </button>

                {/* Tomorrow widget */}
                <div className="bg-gradient-to-br from-brand-dark to-[#1a2e40] p-4 sm:p-5 rounded-xl sm:rounded-2xl shadow-md text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><CalendarIcon size={56} /></div>
                  <h4 className="text-xs font-bold text-white/80 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <AlertCircle size={14} /> Demain ({tomorrow.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })})
                  </h4>
                  <div className="flex items-end gap-3 mb-3">
                    <span className="text-3xl sm:text-4xl font-black">{tomorrowAppointments.length}</span>
                    <span className="text-white/80 mb-0.5 text-sm">Rendez-vous prévus</span>
                  </div>
                  {tomorrowAppointments.length > 0 && (
                    <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                      <p className="text-[10px] text-white/70 mb-1">Premier rendez-vous</p>
                      <div className="font-semibold flex items-center gap-2 text-sm">
                        <Clock size={13} className="text-yellow-300" />
                        {tomorrowAppointments[0].time} avec {tomorrowAppointments[0].clientName || tomorrowAppointments[0].userName}
                      </div>
                    </div>
                  )}
                </div>

                {/* Selected day agenda */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden" style={{ maxHeight: '420px' }}>
                  <div className="p-3 sm:p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
                    <h3 className="font-bold text-gray-900 text-sm capitalize truncate pr-2">
                      {selectedDate
                        ? selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
                        : 'Sélectionnez un jour'}
                    </h3>
                    <span className="bg-brand-dark text-white text-xs px-2 py-0.5 rounded-full font-bold shrink-0">
                      {selectedDayAppointments.length} rdv
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
                    {selectedDayAppointments.length === 0 ? (
                      <div className="text-center text-gray-400 py-8">
                        <CalendarIcon size={28} className="mx-auto mb-2 opacity-20" />
                        <p className="text-xs">Aucun rendez-vous ce jour</p>
                      </div>
                    ) : (
                      selectedDayAppointments.map(apt => {
                        const user = users?.find(u => u.id === apt.userId);
                        
                        // Parse properties
                        const aptProps: { id: string; title: string }[] = [];
                        if (apt.propertyId) {
                          const primaryProp = properties?.find(p => p.id === apt.propertyId);
                          if (primaryProp) {
                            aptProps.push({ id: primaryProp.id, title: primaryProp.title });
                          } else if (apt.propertyTitle) {
                            aptProps.push({ id: apt.propertyId, title: apt.propertyTitle });
                          }
                        } else if (apt.propertyTitle && apt.propertyTitle !== 'Propriété inconnue') {
                          aptProps.push({ id: 'unknown-id', title: apt.propertyTitle });
                        }

                        // parse secondary properties
                        const rawNotes = apt.notes || apt.message || '';
                        let userNotes = '';
                        const m = rawNotes.match(/^\[PROPS:([^\]]*)\](.*)/s);
                        if (m) {
                          const ids = m[1].split(',').map(s => s.trim()).filter(Boolean);
                          ids.forEach(pid => {
                            if (pid === apt.propertyId || aptProps.some(p => p.id === pid)) return;
                            const prop = properties?.find(p => p.id === pid);
                            if (prop) aptProps.push({ id: prop.id, title: prop.title });
                          });
                          userNotes = m[2].trimStart();
                        } else {
                          userNotes = rawNotes;
                        }
                        if (aptProps.length === 0) {
                          aptProps.push({ id: 'none', title: 'Propriété inconnue' });
                        }

                        return (
                          <div key={apt.id} className="border border-gray-100 rounded-xl p-3 shadow-sm hover:shadow-md transition">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="bg-gray-100 text-brand-dark font-bold text-xs px-2 py-0.5 rounded">
                                {apt.time}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                apt.status === 'accepted' ? 'bg-green-100 text-green-700' :
                                apt.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {apt.status === 'accepted' ? 'Confirmé' : apt.status === 'rejected' ? 'Annulé' : 'En attente'}
                              </span>
                            </div>

                            <div className="space-y-1 mb-2">
                              <p className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                                <UserIcon size={12} className="text-gray-400 shrink-0" />
                                {apt.clientName || apt.userName || user?.name || 'Client inconnu'}
                              </p>
                              {(apt.clientPhone || apt.userPhone || user?.phone) && (
                                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                                  <Phone size={12} className="text-gray-400 shrink-0" />
                                  {apt.clientPhone || apt.userPhone || user?.phone}
                                </p>
                              )}
                              <div className="space-y-1">
                                {aptProps.map((prop, idx) => (
                                  <p key={prop.id + '-' + idx} className="text-xs text-gray-600 flex items-center gap-1.5">
                                    <MapPin size={12} className="text-gray-400 shrink-0" />
                                    <span className="truncate" title={prop.title}>{prop.title}</span>
                                  </p>
                                ))}
                              </div>
                              {userNotes && (
                                <div className="text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-xl border border-gray-100/60 italic flex items-start gap-1.5 mt-2 leading-relaxed shadow-sm">
                                  <MessageSquare size={12} className="text-brand-teal/80 mt-0.5 shrink-0" />
                                  <span>"{userNotes}"</span>
                                </div>
                              )}
                            </div>

                            {apt.status === 'pending' && (
                              <div className="flex gap-2 pt-2 border-t border-gray-50">
                                <button
                                  onClick={() => onUpdateStatus(apt.id, 'accepted')}
                                  className="flex-1 py-1.5 bg-green-50 text-green-600 hover:bg-green-600 hover:text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"
                                >
                                  <Check size={12} /> Confirmer
                                </button>
                                <button
                                  onClick={() => onUpdateStatus(apt.id, 'rejected')}
                                  className="flex-1 py-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"
                                >
                                  <X size={12} /> Annuler
                                </button>
                              </div>
                            )}
                            <div className="flex justify-end pt-1.5 border-t border-gray-50 mt-1.5">
                              <button
                                onClick={() => onDelete(apt.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                                title="Supprimer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentsCalendarModal;
