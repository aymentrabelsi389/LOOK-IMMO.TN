import React from 'react';
import { User as UserIcon, CalendarDays, Calendar, Activity, CheckCircle } from 'lucide-react';
import { User } from '@/types';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

interface DashboardHeaderProps {
  user: User;
  apptsToday: number;
  apptsTomorrow: number;
  activeDemands: number;
  matchedDemandsCount: number;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  user,
  apptsToday,
  apptsTomorrow,
  activeDemands,
  matchedDemandsCount
}) => {
  return (
    <>
      {/* Header with Avatar & Greeting */}
      <ScrollReveal delay={50}>
        <div className="relative overflow-hidden bg-gradient-to-br from-brand-dark via-[#112942] to-[#0A1A2A] rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl mb-10">
          <div className="absolute top-0 right-0 w-80 h-80 bg-brand-teal/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
          <div className="absolute -left-10 -bottom-10 w-60 h-60 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5 sm:gap-6">
              <div className="w-24 h-24 rounded-full border-4 border-white/10 shadow-xl flex items-center justify-center bg-white/5 text-white/40 flex-shrink-0 relative group overflow-hidden">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                ) : (
                  <UserIcon size={48} className="text-white/60" />
                )}
                <div className="absolute inset-0 bg-brand-teal/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-3">
                  <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
                    Bienvenue,{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-teal to-cyan-400 font-bold">
                      {user.name}
                    </span>
                  </h1>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                      user.role === 'admin'
                        ? 'bg-brand-teal/20 text-brand-teal border-brand-teal/30'
                        : user.role === 'agent'
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                        : 'bg-white/10 text-white/80 border-white/20'
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
                <p className="text-gray-300 text-sm sm:text-base max-w-xl font-light">
                  Gérez votre profil, vos rendez-vous et vos favoris immobiliers Look Immo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Admin CRM Stats Grid */}
      {user.role === 'admin' && (
        <ScrollReveal className="mb-8 sm:mb-10" delay={150}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Stat 1 */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100/80 shadow-soft hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-all duration-300 group-hover:scale-110"></div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-50/80 flex items-center justify-center text-blue-600 mr-3 sm:mr-4 relative z-10 shadow-sm flex-shrink-0">
                <CalendarDays size={18} className="sm:w-5 sm:h-5" />
              </div>
              <div className="relative z-10 min-w-0">
                <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 truncate sm:whitespace-normal" title="Rdv Aujourd'hui">
                  Rdv Aujourd'hui
                </p>
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
                <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 truncate sm:whitespace-normal" title="Rdv Demain">
                  Rdv Demain
                </p>
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
                <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 truncate sm:whitespace-normal" title="Demandes Actives">
                  Demandes Actives
                </p>
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
                <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 truncate sm:whitespace-normal" title="Matchées">
                  Matchées
                </p>
                <p className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight">{matchedDemandsCount}</p>
              </div>
            </div>
          </div>
        </ScrollReveal>
      )}
    </>
  );
};
