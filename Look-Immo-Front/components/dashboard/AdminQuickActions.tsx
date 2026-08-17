import React from 'react';
import { CalendarDays, Plus, Target, Clock, Edit2 } from 'lucide-react';
import { SiteSettings } from '@/types';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

interface AdminQuickActionsProps {
  settings?: SiteSettings | null;
  isEditingHours: boolean;
  hoursForm: { weekdays: string; saturday: string; sunday: string };
  onOpenAptModal: () => void;
  onOpenDemandModal: () => void;
  onSetEditingHours: (val: boolean) => void;
  onSetHoursForm: (form: { weekdays: string; saturday: string; sunday: string }) => void;
  onUpdateHours: (e: React.FormEvent) => void;
}

export const AdminQuickActions: React.FC<AdminQuickActionsProps> = ({
  settings,
  isEditingHours,
  hoursForm,
  onOpenAptModal,
  onOpenDemandModal,
  onSetEditingHours,
  onSetHoursForm,
  onUpdateHours,
}) => {
  return (
    <ScrollReveal className="lg:col-span-2 lg:col-start-1 space-y-6" delay={200}>
      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Rendez-vous card */}
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
            onClick={onOpenAptModal}
            className="mt-5 w-full bg-gradient-to-r from-brand-teal to-cyan-500 text-white py-3 rounded-2xl text-xs sm:text-sm font-bold hover:from-cyan-500 hover:to-brand-teal transition-all duration-300 flex items-center justify-center shadow-lg shadow-brand-teal/15 hover:shadow-brand-teal/25 active:scale-[0.98] whitespace-nowrap relative z-10"
          >
            <Plus size={18} className="mr-1.5" /> Nouveau Rdv
          </button>
        </div>

        {/* Demandes Clients card */}
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
            onClick={onOpenDemandModal}
            className="mt-5 w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3 rounded-2xl text-xs sm:text-sm font-bold hover:from-amber-500 hover:to-orange-500 transition-all duration-300 flex items-center justify-center shadow-lg shadow-orange-500/15 hover:shadow-orange-500/25 active:scale-[0.98] whitespace-nowrap relative z-10"
          >
            <Plus size={18} className="mr-1.5" /> Nouvelle Demande
          </button>
        </div>
      </div>

      {/* Working Hours */}
      {settings && (
        <div className="bg-white rounded-3xl shadow-soft border border-gray-100/80 p-6 relative overflow-hidden">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-bold text-gray-800 flex items-center">
              <Clock size={20} className="mr-2 text-brand-teal" />
              Horaires d'ouverture de l'agence
            </h3>
            {!isEditingHours ? (
              <button
                onClick={() => onSetEditingHours(true)}
                className="text-xs text-brand-teal font-bold hover:text-brand-dark transition-colors flex items-center gap-1"
              >
                <Edit2 size={12} /> Modifier
              </button>
            ) : (
              <button
                onClick={() => onSetEditingHours(false)}
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
                <span className={`font-semibold ${settings.workingHours?.sunday === 'Fermé' ? 'text-red-500' : 'text-gray-800'}`}>
                  {settings.workingHours?.sunday}
                </span>
              </div>
            </div>
          ) : (
            <form onSubmit={onUpdateHours} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">Lundi - Vendredi</label>
                  <input
                    type="text"
                    value={hoursForm.weekdays}
                    onChange={e => onSetHoursForm({ ...hoursForm, weekdays: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal transition-all bg-gray-50/50 focus:bg-white"
                    aria-label="Heures d'ouverture Lundi-Vendredi"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">Samedi</label>
                  <input
                    type="text"
                    value={hoursForm.saturday}
                    onChange={e => onSetHoursForm({ ...hoursForm, saturday: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal transition-all bg-gray-50/50 focus:bg-white"
                    aria-label="Heures d'ouverture Samedi"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">Dimanche</label>
                  <input
                    type="text"
                    value={hoursForm.sunday}
                    onChange={e => onSetHoursForm({ ...hoursForm, sunday: e.target.value })}
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
    </ScrollReveal>
  );
};
