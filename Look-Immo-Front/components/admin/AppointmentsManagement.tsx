
import React, { useState, useEffect } from 'react';
import { 
  CalendarDays, Search, Calendar, 
  Check, X, Trash2, ChevronLeft, ChevronRight, List, Phone, Mail, Building2, Clock, MessageSquare,
  History, ChevronDown
} from 'lucide-react';
import { Appointment, User, Property } from '@/types';
import { appointmentsAPI } from '@/services/api';
import AppointmentsCalendarModal from './AppointmentsCalendarModal';
import ClientAppointmentsHistoryModal from './ClientAppointmentsHistoryModal';
import { useConfirm } from '@/context/ConfirmContext';


interface CustomDropdownProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  triggerClassName?: string;
  menuClassName?: string;
  optionClassName?: string;
}

const CustomDropdown = <T extends string>({
  value,
  onChange,
  options,
  triggerClassName = "w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-brand-teal/50 focus:outline-none focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10 transition-all text-xs font-bold text-gray-600 cursor-pointer",
  menuClassName = "absolute right-0 z-[60] mt-2 w-full sm:w-[220px] bg-white border border-gray-100 rounded-2xl shadow-lg py-2 overflow-y-auto max-h-60 animate-fade-in-up",
  optionClassName = "w-full flex items-center justify-between px-4 py-2 text-left text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
}: CustomDropdownProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative inline-block w-full sm:w-auto" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={triggerClassName}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : ''}</span>
        <ChevronDown size={14} className={`text-gray-400 transform transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={menuClassName}>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`${optionClassName} ${
                opt.value === value
                  ? 'bg-brand-teal/5 text-brand-teal font-black'
                  : ''
              }`}
            >
              <span>{opt.label}</span>
              {opt.value === value && <Check size={12} className="text-brand-teal flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface AppointmentsManagementProps {
  appointments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  users: User[];
  properties: Property[];
}

const AppointmentsManagement = ({
  appointments,
  setAppointments,
  users,
  properties
}: AppointmentsManagementProps) => {
  const { confirm } = useConfirm();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'created-desc' | 'created-asc' | 'scheduled-desc' | 'scheduled-asc'>('created-desc');
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showAll, setShowAll] = useState(false);
  const [historyAppointment, setHistoryAppointment] = useState<Appointment | null>(null);

  const parseNotes = (raw: string | undefined): { propertyIds: string[]; userNotes: string } => {
    if (!raw) return { propertyIds: [], userNotes: '' };
    const m = raw.match(/^\[PROPS:([^\]]*)\](.*)/s);
    if (m) {
      const ids = m[1].split(',').map(s => s.trim()).filter(Boolean);
      return { propertyIds: ids, userNotes: m[2].trimStart() };
    }
    return { propertyIds: [], userNotes: raw };
  };

  const getDisplayProperties = (apt: Appointment) => {
    const list: { id: string; title: string }[] = [];
    
    // Add primary property if it exists
    if (apt.propertyId) {
      const primaryProp = properties?.find(p => p.id === apt.propertyId);
      if (primaryProp) {
        list.push({ id: primaryProp.id, title: primaryProp.title });
      } else if (apt.propertyTitle) {
        list.push({ id: apt.propertyId, title: apt.propertyTitle });
      }
    } else if (apt.propertyTitle && apt.propertyTitle !== 'Propriété inconnue') {
      list.push({ id: 'unknown-id', title: apt.propertyTitle });
    }

    // Add secondary properties
    const { propertyIds } = parseNotes(apt.notes || apt.message || '');
    propertyIds.forEach(pid => {
      if (pid === apt.propertyId || list.some(p => p.id === pid)) return;
      const prop = properties?.find(p => p.id === pid);
      if (prop) {
        list.push({ id: prop.id, title: prop.title });
      }
    });

    if (list.length === 0) {
      list.push({ id: 'none', title: 'Propriété inconnue' });
    }

    return list;
  };

  const getDisplayData = (apt: Appointment) => {
    const user = users?.find(u => u.id === apt.userId);
    const property = properties?.find(p => p.id === apt.propertyId);
    const { userNotes } = parseNotes(apt.notes || apt.message || '');

    return {
      userName: apt.clientName || apt.userName || user?.name || 'Utilisateur inconnu',
      userEmail: apt.clientEmail || user?.email || '',
      userPhone: apt.clientPhone || user?.phone || '',
      propertyTitle: apt.propertyTitle || property?.title || 'Propriété inconnue',
      userNotes
    };
  };

  // Filter appointments by search query
  const filteredAppointments = appointments.filter(apt => {
    const data = getDisplayData(apt);
    const props = getDisplayProperties(apt);
    const propsMatch = props.some(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Normalize phone numbers (remove all non-digit characters) to allow spaces, dashes, etc.
    const cleanPhone = data.userPhone.replace(/\D/g, '');
    const cleanQuery = searchQuery.replace(/\D/g, '');
    const phoneMatch = cleanQuery !== '' && cleanPhone.includes(cleanQuery);

    return data.userName.toLowerCase().includes(searchQuery.toLowerCase()) || phoneMatch || propsMatch;
  });

  // Sort appointments
  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    const aCreated = new Date(a.createdAt || 0).getTime();
    const bCreated = new Date(b.createdAt || 0).getTime();
    switch (sortBy) {
      case 'created-asc': return aCreated - bCreated;
      case 'scheduled-desc': return new Date(b.date).getTime() - new Date(a.date).getTime();
      case 'scheduled-asc': return new Date(a.date).getTime() - new Date(b.date).getTime();
      case 'created-desc': default: return bCreated - aCreated;
    }
  });

  const totalPages = Math.ceil(sortedAppointments.length / itemsPerPage);
  const paginatedAppointments = showAll ? sortedAppointments : sortedAppointments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleUpdateStatus = async (id: string, newStatus: Appointment['status']) => {
    try {
      await appointmentsAPI.update(id, { status: newStatus });
      setAppointments(prev => prev.map(apt =>
        apt.id === id ? { ...apt, status: newStatus } : apt
      ));
    } catch (error) {
      console.error("Failed to update appointment status:", error);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Supprimer le rendez-vous ?',
      message: 'Êtes-vous sûr de vouloir supprimer définitivement ce rendez-vous ? Cette action est irréversible.',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger'
    });
    if (confirmed) {
      try {
        await appointmentsAPI.delete(id);
        setAppointments(prev => prev.filter(apt => apt.id !== id));
      } catch (error) {
        console.error("Failed to delete appointment:", error);
      }
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getUTCDate();
    const monthNames = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
    const month = monthNames[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    return `${day} ${month} ${year}`;
  };

  const pendingCount = appointments.filter(apt => apt.status === 'pending').length;

  return (
    <>
      <div className="space-y-6 animate-fade-in-up">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">Rendez-vous</h1>
          <p className="text-sm text-gray-500 mt-1">Gérez les visites et rendez-vous planifiés</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="flex items-center space-x-2 px-5 py-2.5 bg-yellow-50 rounded-xl border border-yellow-100 shadow-sm">
            <CalendarDays size={18} className="text-yellow-500" />
            <span className="text-xs font-black text-yellow-600 uppercase tracking-widest">{pendingCount} En attente</span>
          </div>

          <button
            onClick={() => setShowCalendar(true)}
            className="flex items-center justify-center gap-2 bg-brand-dark text-white px-5 py-2.5 rounded-xl hover:bg-brand-teal transition shadow-sm text-xs font-black uppercase tracking-widest"
          >
            <Calendar size={18} />
            Calendrier
          </button>

          <CustomDropdown
            value={sortBy}
            onChange={(val) => setSortBy(val as any)}
            options={[
              { value: 'created-desc', label: '📅 Reçu le (Récent)' },
              { value: 'created-asc', label: '📅 Reçu le (Ancien)' },
              { value: 'scheduled-desc', label: '🗓 Prévu le (Récent)' },
              { value: 'scheduled-asc', label: '🗓 Prévu le (Ancien)' }
            ]}
            triggerClassName="w-full sm:w-[220px] flex items-center justify-between gap-3 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10 shadow-sm text-xs font-bold text-gray-600 cursor-pointer hover:border-brand-teal/50 transition bg-white"
          />
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Rechercher par nom, téléphone ou propriété..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm focus:outline-none focus:border-brand-teal transition-all outline-none"
        />
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {sortedAppointments.length === 0 ? (
          <div className="p-20 text-center">
            <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
              <CalendarDays size={64} className="text-gray-100 mb-6" />
              <h3 className="text-xl font-black text-gray-900 mb-2">Aucun rendez-vous</h3>
              <p className="text-gray-500 text-sm">Les demandes de visites de vos clients apparaîtront ici.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/50">
                  <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-8 py-5">Utilisateur</th>
                    <th className="px-6 py-5">Propriété</th>
                    <th className="px-6 py-5">Date & Heure</th>
                    <th className="px-6 py-5">Statut</th>
                    <th className="px-8 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedAppointments.map(apt => {
                    const data = getDisplayData(apt);
                    return (
                      <tr key={apt.id} className={`group hover:bg-blue-50/30 transition-all duration-200 cursor-default ${apt.status === 'pending' ? 'bg-yellow-50/30' : ''}`}>
                        <td className="px-8 py-5">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-400 group-hover:bg-white group-hover:shadow-sm transition-all font-black text-xs">
                              {data.userName.charAt(0)}
                            </div>
                            <div className="ml-4">
                              <div className="font-black text-gray-900 group-hover:text-brand-dark transition-colors">{data.userName}</div>
                              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <Mail size={10} className="text-brand-teal" /> {data.userEmail}
                              </div>
                              {data.userPhone && (
                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                                  <Phone size={10} className="text-brand-teal" /> {data.userPhone}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="space-y-1.5 max-w-[260px]">
                            {getDisplayProperties(apt).map((prop, idx) => (
                              <div key={prop.id + '-' + idx} className="flex items-center text-xs font-black text-gray-700 group/prop hover:text-brand-dark transition-colors">
                                <Building2 size={14} className="mr-2 text-gray-400 group-hover/prop:text-brand-teal transition-colors flex-shrink-0" />
                                <span className="truncate" title={prop.title}>{prop.title}</span>
                              </div>
                            ))}
                            {data.userNotes && (
                              <div className="mt-2.5 text-[11px] text-gray-500 bg-gray-50 rounded-xl p-2 border border-gray-100/60 max-w-[240px] italic flex items-start gap-1.5 leading-relaxed shadow-sm">
                                <MessageSquare size={12} className="text-brand-teal/80 mt-0.5 flex-shrink-0" />
                                <span className="line-clamp-2" title={data.userNotes}>"{data.userNotes}"</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="space-y-1">
                            <div className="flex items-center text-[10px] font-black text-gray-500 uppercase tracking-widest">
                              <Calendar size={14} className="mr-2 text-brand-teal" />
                              {formatDate(apt.date)}
                            </div>
                            <div className="flex items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              <Clock size={14} className="mr-2 text-gray-300" />
                              {apt.time}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                            apt.status === 'accepted' ? 'bg-green-50 text-green-600 border-green-100' :
                            apt.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                            'bg-yellow-50 text-yellow-600 border-yellow-100'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                              apt.status === 'accepted' ? 'bg-green-500' :
                              apt.status === 'rejected' ? 'bg-red-500' :
                              'bg-yellow-500'
                            }`}></span>
                            {apt.status === 'accepted' ? 'Confirmé' : apt.status === 'rejected' ? 'Annulé' : 'En attente'}
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {apt.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleUpdateStatus(apt.id, 'accepted')}
                                  className="p-2.5 bg-white border border-gray-200 text-green-500 rounded-xl hover:shadow-sm transition-all"
                                  title="Confirmer"
                                >
                                  <Check size={18} />
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(apt.id, 'rejected')}
                                  className="p-2.5 bg-white border border-gray-200 text-red-400 rounded-xl hover:text-red-600 hover:shadow-sm transition-all"
                                  title="Refuser"
                                >
                                  <X size={18} />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => setHistoryAppointment(apt)}
                              className="p-2.5 bg-white border border-gray-200 text-gray-400 rounded-xl hover:text-blue-500 hover:shadow-sm transition-all"
                              title="Historique des rendez-vous"
                            >
                              <History size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(apt.id)}
                              className="p-2.5 bg-white border border-gray-200 text-gray-400 rounded-xl hover:text-red-500 hover:shadow-sm transition-all"
                              title="Supprimer"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-100">
              {paginatedAppointments.map(apt => {
                const data = getDisplayData(apt);
                return (
                  <div key={apt.id} className={`p-5 hover:bg-gray-50 transition-colors space-y-4 ${apt.status === 'pending' ? 'bg-yellow-50/20 border-l-4 border-l-yellow-500' : 'bg-white'}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-400 font-black text-xs uppercase tracking-widest">
                          {data.userName.charAt(0)}
                        </div>
                        <div className="ml-3">
                          <h4 className="font-black text-gray-900 leading-none mb-1">{data.userName}</h4>
                          <div className="flex items-center gap-1 text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                            <Phone size={10} className="text-brand-teal" /> {data.userPhone || 'N/A'}
                          </div>
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest ${
                        apt.status === 'accepted' ? 'bg-green-100 text-green-700' :
                        apt.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {apt.status === 'accepted' ? 'Confirmé' : apt.status === 'rejected' ? 'Annulé' : 'En attente'}
                      </div>
                    </div>

                    <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-3">
                      <div className="space-y-2">
                        {getDisplayProperties(apt).map((prop, idx) => (
                          <div key={prop.id + '-' + idx} className="flex items-start">
                            <Building2 size={12} className="mr-2 text-brand-teal mt-0.5 flex-shrink-0" />
                            <span className="text-[11px] font-black text-gray-700 leading-tight">{prop.title}</span>
                          </div>
                        ))}
                      </div>
                      {data.userNotes && (
                        <div className="mt-2.5 text-[11px] text-gray-500 bg-white rounded-xl p-2.5 border border-gray-100/80 italic flex items-start gap-1.5 leading-relaxed shadow-sm">
                          <MessageSquare size={12} className="text-brand-teal/80 mt-0.5 flex-shrink-0" />
                          <span>"{data.userNotes}"</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between border-t border-gray-100 pt-2 mt-2">
                        <div className="flex items-center text-[9px] font-black text-gray-500 uppercase tracking-widest">
                          <Calendar size={12} className="mr-1.5 text-brand-teal" />
                          {formatDate(apt.date)}
                        </div>
                        <div className="flex items-center text-[9px] font-black text-gray-500 uppercase tracking-widest">
                          <Clock size={12} className="mr-1.5" />
                          {apt.time}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      {apt.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(apt.id, 'accepted')}
                            className="flex-1 py-2.5 bg-green-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-green-700 transition flex items-center justify-center gap-2"
                          >
                            <Check size={14} /> Confirmer
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(apt.id, 'rejected')}
                            className="flex-1 py-2.5 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-600 transition flex items-center justify-center gap-2"
                          >
                            <X size={14} /> Refuser
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setHistoryAppointment(apt)}
                        className="p-2.5 bg-gray-100 text-gray-400 rounded-xl hover:bg-blue-500 hover:text-white transition active:scale-95"
                        title="Historique"
                      >
                        <History size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(apt.id)}
                        className="p-2.5 bg-gray-100 text-gray-400 rounded-xl hover:bg-red-500 hover:text-white transition active:scale-95"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Footer */}
            <div className="p-4 border-t border-gray-100 bg-white flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-xs text-gray-500 font-medium">
                Affichage de <span className="font-bold text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> à <span className="font-bold text-gray-900">{Math.min(currentPage * itemsPerPage, sortedAppointments.length)}</span> sur <span className="font-bold text-gray-900">{sortedAppointments.length}</span>
              </div>

              <div className="flex items-center gap-3">
                {sortedAppointments.length > itemsPerPage && (
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border transition-all shadow-sm mr-2 ${
                      showAll 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-blue-200' 
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <List size={14} />
                    {showAll ? 'Pagination' : 'Afficher tout'}
                  </button>
                )}

                {!showAll && totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:bg-gray-50 disabled:opacity-30 transition"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`min-w-[32px] h-8 px-2 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                          currentPage === page
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                            : 'text-gray-600 hover:bg-gray-50 border border-transparent hover:border-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:bg-gray-50 disabled:opacity-30 transition"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>

      {/* Modals */}

      {showCalendar && (
        <AppointmentsCalendarModal
          onClose={() => setShowCalendar(false)}
          appointments={appointments}
          properties={properties}
          users={users}
          onUpdateStatus={handleUpdateStatus}
          onDelete={handleDelete}
        />
      )}

      {historyAppointment && (
        <ClientAppointmentsHistoryModal
          onClose={() => setHistoryAppointment(null)}
          clientAppointment={historyAppointment}
          appointments={appointments}
          properties={properties}
          users={users}
          onUpdateStatus={handleUpdateStatus}
          onDelete={handleDelete}
        />
      )}
    </>
  );
};

export default AppointmentsManagement;
