import React from 'react';
import { CalendarDays, Calendar, Clock, User as UserIcon, Phone, Home as HomeIcon, Check, X, Edit2, Trash2 } from 'lucide-react';
import { Appointment, Property } from '@/types';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

interface AppointmentsWidgetProps {
  upcomingAppointments: Appointment[];
  properties: Property[];
  isAdminOrAgent: boolean;
  onConfirmAppointment: (id: string) => void;
  onRefuseAppointment: (id: string) => void;
  onOpenEditAppointment: (apt: Appointment) => void;
  onCancelAppointment: (apt: Appointment) => void;
  parseNotes: (raw: string | undefined) => { propertyIds: string[]; userNotes: string };
}

export const AppointmentsWidget: React.FC<AppointmentsWidgetProps> = ({
  upcomingAppointments,
  properties,
  isAdminOrAgent,
  onConfirmAppointment,
  onRefuseAppointment,
  onOpenEditAppointment,
  onCancelAppointment,
  parseNotes
}) => {
  return (
    <ScrollReveal className="lg:col-start-3 lg:row-span-2" delay={250}>
      <div className="bg-white rounded-3xl shadow-soft border border-gray-100/80 p-6 relative overflow-hidden h-full">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-brand-teal to-blue-500"></div>
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center font-sans">
          <CalendarDays className="mr-2 text-brand-teal" size={18} />
          Prochains Rendez-vous
        </h2>

        {upcomingAppointments.length > 0 ? (
          <div className="space-y-4">
            {upcomingAppointments.map((apt) => (
              <div
                key={apt.id}
                className="bg-gradient-to-br from-gray-50/80 to-white hover:from-white hover:to-white rounded-2xl p-5 border border-gray-100 hover:border-brand-teal/30 hover:shadow-soft transition-all duration-300 relative group overflow-hidden"
              >
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
                        const monthNames = [
                          'janv.',
                          'févr.',
                          'mars',
                          'avr.',
                          'mai',
                          'juin',
                          'juil.',
                          'août',
                          'sept.',
                          'oct.',
                          'nov.',
                          'déc.'
                        ];
                        const month = monthNames[d.getUTCMonth()];

                        const now = new Date();
                        const isToday =
                          d.getUTCFullYear() === now.getFullYear() &&
                          d.getUTCMonth() === now.getMonth() &&
                          d.getUTCDate() === now.getDate();

                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        const isTomorrow =
                          d.getUTCFullYear() === tomorrow.getFullYear() &&
                          d.getUTCMonth() === tomorrow.getMonth() &&
                          d.getUTCDate() === tomorrow.getDate();

                        return (
                          <span className="flex items-center gap-2">
                            {day} {month}
                            {isToday && (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-brand-teal/15 text-brand-teal rounded-full uppercase tracking-wider">
                                Aujourd'hui
                              </span>
                            )}
                            {isTomorrow && (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-500/15 text-indigo-500 rounded-full uppercase tracking-wider">
                                Demain
                              </span>
                            )}
                          </span>
                        );
                      })()}
                    </p>
                    <p className="text-xs text-gray-400 font-medium mt-0.5 flex items-center gap-1.5">
                      <Clock size={12} className="text-gray-400" />
                      {apt.time ? (
                        <span>{apt.time.replace(':', 'h')}</span>
                      ) : (
                        <span className="text-amber-500 font-semibold bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100">
                          Heure non fixée
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-gray-500 border-t border-gray-50 pt-3 relative z-10">
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
                  {(() => {
                    const p = properties.find((pr) => pr.id === apt.propertyId);
                    const title = p?.title || apt.propertyTitle || 'Aucune';
                    const details = p
                      ? `${p.location.city}${p.price ? ` • ${p.price.toLocaleString('fr-TN')} DT` : ''}`
                      : '';
                    return (
                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0 mt-0.5">
                          <HomeIcon size={12} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block text-gray-800 font-semibold truncate" title={title}>
                            {title}
                          </span>
                          {details && (
                            <span className="block text-xs text-gray-400 font-medium truncate mt-0.5">{details}</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Additional properties */}
                  {(() => {
                    const { propertyIds } = parseNotes((apt as unknown as { notes?: string; message?: string }).notes || apt.message || '');
                    if (propertyIds.length === 0) return null;
                    return propertyIds.map((pid) => {
                      const p = properties.find((pr) => pr.id === pid);
                      if (!p) return null;
                      const details = `${p.location.city}${p.price ? ` • ${p.price.toLocaleString('fr-TN')} DT` : ''}`;
                      return (
                        <div key={pid} className="flex items-start gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0 mt-0.5">
                            <HomeIcon size={12} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="block text-gray-800 font-semibold truncate" title={p.title}>
                              {p.title}
                            </span>
                            <span className="block text-xs text-gray-400 font-medium truncate mt-0.5">{details}</span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>

                <div className="mt-3.5 pt-3.5 border-t border-gray-100 flex justify-between items-center relative z-10">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                      apt.status === 'accepted'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : apt.status === 'rejected'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                        apt.status === 'accepted'
                          ? 'bg-green-500 animate-pulse'
                          : apt.status === 'rejected'
                          ? 'bg-red-500'
                          : 'bg-amber-500 animate-pulse'
                      }`}
                    ></span>
                    {apt.status === 'accepted' ? 'Confirmé' : apt.status === 'rejected' ? 'Annulé' : 'En attente'}
                  </span>

                  {(apt.status === 'pending' || apt.status === 'accepted' || apt.status === 'rejected') && (
                    <div className="flex gap-1">
                      {isAdminOrAgent && (apt.status === 'pending' || apt.status === 'rejected') && (
                        <button
                          onClick={() => onConfirmAppointment(apt.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-xl transition-all duration-200"
                          title="Confirmer"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      {isAdminOrAgent && apt.status === 'pending' && (
                        <button
                          onClick={() => onRefuseAppointment(apt.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200"
                          title="Refuser"
                        >
                          <X size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => onOpenEditAppointment(apt)}
                        className="p-2 text-brand-teal hover:bg-brand-teal/5 rounded-xl transition-all duration-200"
                        title="Modifier"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => onCancelAppointment(apt)}
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
    </ScrollReveal>
  );
};
