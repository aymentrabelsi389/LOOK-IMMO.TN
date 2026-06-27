import React from 'react';
import { 
  X, Calendar, Clock, Building2, MessageSquare, Phone, Mail, Trash2, Check, History
} from 'lucide-react';
import { Appointment, User, Property } from '../../types';

interface ClientAppointmentsHistoryModalProps {
  onClose: () => void;
  clientAppointment: Appointment;
  appointments: Appointment[];
  properties: Property[];
  users: User[];
  onUpdateStatus: (id: string, newStatus: Appointment['status']) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const ClientAppointmentsHistoryModal: React.FC<ClientAppointmentsHistoryModalProps> = ({
  onClose,
  clientAppointment,
  appointments,
  properties,
  users,
  onUpdateStatus,
  onDelete
}) => {
  const getDisplayData = (apt: Appointment) => {
    const user = users?.find(u => u.id === apt.userId);
    const property = properties?.find(p => p.id === apt.propertyId);

    const parseNotes = (raw: string | undefined): string => {
      if (!raw) return '';
      const m = raw.match(/^\[PROPS:([^\]]*)\](.*)/s);
      return m ? m[2].trimStart() : raw;
    };

    return {
      userName: apt.clientName || apt.userName || user?.name || 'Utilisateur inconnu',
      userEmail: apt.clientEmail || user?.email || '',
      userPhone: apt.clientPhone || user?.phone || '',
      propertyTitle: apt.propertyTitle || property?.title || 'Propriété inconnue',
      userNotes: parseNotes(apt.notes || apt.message || '')
    };
  };

  const currentData = getDisplayData(clientAppointment);
  const targetEmail = currentData.userEmail.trim().toLowerCase();
  const targetPhone = currentData.userPhone.replace(/\D/g, '');
  const targetName = currentData.userName.trim().toLowerCase();

  // Find all appointments matching this client
  const clientAppointments = appointments.filter(apt => {
    const data = getDisplayData(apt);
    const email = data.userEmail.trim().toLowerCase();
    const phone = data.userPhone.replace(/\D/g, '');
    const name = data.userName.trim().toLowerCase();

    if (targetEmail && email && targetEmail === email) return true;
    if (targetPhone && phone && targetPhone === phone) return true;
    if (targetName && name && targetName === name) return true;
    return false;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getDisplayProperties = (apt: Appointment) => {
    const list: { id: string; title: string }[] = [];
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

    const parseNotesIds = (raw: string | undefined): string[] => {
      if (!raw) return [];
      const m = raw.match(/^\[PROPS:([^\]]*)\]/);
      return m ? m[1].split(',').map(s => s.trim()).filter(Boolean) : [];
    };

    const secondaryIds = parseNotesIds(apt.notes || apt.message || '');
    secondaryIds.forEach(pid => {
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

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getUTCDate();
    const monthNames = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
    const month = monthNames[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    return `${day} ${month} ${year}`;
  };

  const handleDeleteItem = async (id: string) => {
    await onDelete(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[85vh] border border-gray-100 animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="px-4 py-4 md:px-8 md:py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-inner">
              <History className="w-5 h-5 md:w-6 md:h-6 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-gray-900 leading-tight">Historique Client</h2>
              <p className="text-[10px] md:text-xs text-gray-500 font-medium mt-0.5 md:mt-1">Tous les rendez-vous de ce client</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white border border-gray-200 text-gray-400 hover:text-gray-900 rounded-full hover:shadow-md transition-all duration-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* Client details card */}
        <div className="mx-4 md:mx-8 mt-4 md:mt-6 p-4 md:p-5 bg-blue-50/40 rounded-2xl border border-blue-100/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-black text-gray-900 text-base">{currentData.userName}</h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 font-bold uppercase tracking-wider">
              {currentData.userEmail && (
                <div className="flex items-center gap-1.5">
                  <Mail size={12} className="text-brand-teal" /> {currentData.userEmail}
                </div>
              )}
              {currentData.userPhone && (
                <div className="flex items-center gap-1.5">
                  <Phone size={12} className="text-brand-teal" /> {currentData.userPhone}
                </div>
              )}
            </div>
          </div>
          <div className="bg-blue-600/10 text-blue-600 text-[10px] md:text-xs font-black uppercase tracking-widest px-3 py-1 md:px-3.5 md:py-1.5 rounded-lg border border-blue-200/50 flex-shrink-0 self-start md:self-center">
            {clientAppointments.length} RDV au total
          </div>
        </div>

        {/* Appointments List */}
        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-8 md:py-6 space-y-4 custom-scrollbar">
          {clientAppointments.map((apt, index) => {
            const data = getDisplayData(apt);
            const isCurrent = apt.id === clientAppointment.id;
            return (
              <div 
                key={apt.id} 
                className={`p-5 rounded-2xl border transition-all relative ${
                  isCurrent 
                    ? 'border-blue-500 bg-blue-50/20 shadow-sm shadow-blue-50' 
                    : 'border-gray-100 bg-white hover:bg-gray-50/40 hover:border-gray-200/70'
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-2.5 right-6 px-2.5 py-0.5 bg-blue-600 text-[8px] font-black uppercase tracking-widest text-white rounded-full shadow-sm">
                    Actuel
                  </span>
                )}
                
                <div className="space-y-4">
                  {/* Top Line: Date/Time/Status and Delete Button */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center text-[10px] font-black text-gray-500 uppercase tracking-widest bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-lg">
                        <Calendar size={12} className="mr-1.5 text-brand-teal" />
                        {formatDate(apt.date)}
                      </div>
                      <div className="flex items-center text-[10px] font-black text-gray-500 uppercase tracking-widest bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-lg">
                        <Clock size={12} className="mr-1.5 text-brand-teal" />
                        {apt.time}
                      </div>
                      <div className={`inline-flex items-center px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${
                        apt.status === 'accepted' ? 'bg-green-50 text-green-600 border-green-100' :
                        apt.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                        'bg-yellow-50 text-yellow-600 border-yellow-100'
                      }`}>
                        {apt.status === 'accepted' ? 'Confirmé' : apt.status === 'rejected' ? 'Annulé' : 'En attente'}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteItem(apt.id)}
                      className="p-2 bg-white hover:bg-red-50 border border-gray-200 text-gray-400 hover:text-red-500 rounded-lg hover:shadow-sm transition-all flex-shrink-0"
                      title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Middle Section: Properties and Notes */}
                  <div className="space-y-2.5">
                    {/* Properties */}
                    <div className="space-y-1">
                      {getDisplayProperties(apt).map((prop, idx) => (
                        <div key={prop.id + '-' + idx} className="flex items-center text-xs font-black text-gray-700">
                          <Building2 size={13} className="mr-1.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{prop.title}</span>
                        </div>
                      ))}
                    </div>

                    {/* Notes */}
                    {data.userNotes && (
                      <div className="text-[11px] text-gray-500 bg-gray-50/80 rounded-xl p-3 border border-gray-100/60 italic flex items-start gap-1.5 leading-relaxed">
                        <MessageSquare size={12} className="text-brand-teal/80 mt-0.5 flex-shrink-0" />
                        <span>"{data.userNotes}"</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Line: Accept / Refuse Buttons (only for pending) */}
                  {apt.status === 'pending' && (
                    <div className="flex gap-2 pt-2 border-t border-gray-50">
                      <button
                        onClick={() => onUpdateStatus(apt.id, 'accepted')}
                        className="flex-1 py-2 bg-green-50 border border-green-200 text-green-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-green-100 transition-all flex items-center justify-center gap-1.5"
                        title="Confirmer"
                      >
                        <Check size={14} /> Confirmer
                      </button>
                      <button
                        onClick={() => onUpdateStatus(apt.id, 'rejected')}
                        className="flex-1 py-2 bg-red-50 border border-red-200 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-100 transition-all flex items-center justify-center gap-1.5"
                        title="Annuler"
                      >
                        <X size={14} /> Refuser
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-gray-100 flex items-center justify-end bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientAppointmentsHistoryModal;
