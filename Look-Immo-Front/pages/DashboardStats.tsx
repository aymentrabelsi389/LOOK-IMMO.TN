import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  User as UserIcon, Home as HomeIcon, Calendar, Eye
} from 'lucide-react';
import AnimatedCounter from '@/components/ui/AnimatedCounter';

// Staggered Mount Reveal animation helper component
const ScrollReveal: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({ children, className = "", delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`transition-all duration-1000 cubic-bezier(0.16, 1, 0.3, 1) transform ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
      } ${className}`}
    >
      {children}
    </div>
  );
};

interface DashboardStatsProps {
  stats: any;
  propertiesCount: number;
  onTabChange?: (tab: string) => void;
}

const DashboardStats = ({ stats, propertiesCount, onTabChange }: DashboardStatsProps) => {
  const cards = [
    { id: "users", label: "Utilisateurs", val: stats?.totals?.users?.toString() || "0", icon: <UserIcon size={24} />, gradient: "from-blue-500 to-blue-600", iconBg: "bg-blue-50/10", trend: "Total" },
    { id: "properties", label: "Propriétés", val: stats?.totals?.properties?.toString() || propertiesCount.toString(), icon: <HomeIcon size={24} />, gradient: "from-emerald-500 to-emerald-600", iconBg: "bg-emerald-50/10", trend: "Actives" },
    { id: "appointments", label: "Rendez-vous", val: stats?.totals?.todayAppointments?.toString() || "0", icon: <Calendar size={24} />, gradient: "from-purple-500 to-purple-600", iconBg: "bg-purple-50/10", trend: `${stats?.totals?.appointments || 0} au total` },
    { id: "visits", label: "Visites Site", val: stats?.totals?.visits?.toString() || "0", icon: <Eye size={24} fill="currentColor" />, gradient: "from-orange-500 to-orange-600", iconBg: "bg-orange-50/10", trend: "Vues" }
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((stat, i) => {
          const isInteractive = stat.id !== 'visits' && !!onTabChange;
          return (
            <ScrollReveal 
              key={i} 
              delay={i * 100}
              className="w-full"
            >
              <div 
                onClick={() => isInteractive && onTabChange?.(stat.id)}
                className={`group relative bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-hidden ${
                  isInteractive ? 'cursor-pointer hover:border-brand-teal/20 hover:-translate-y-1' : ''
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                <div className="relative flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{stat.label}</p>
                    <h3 className="text-3xl font-bold text-gray-900 mb-1">
                      <AnimatedCounter value={stat.val} />
                    </h3>
                    <p className="text-xs text-gray-400 font-medium">{stat.trend}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.iconBg}`}>
                    <div className={`bg-gradient-to-br ${stat.gradient} text-white p-3 rounded-xl`}>{stat.icon}</div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          );
        })}
      </div>
      
      <ScrollReveal delay={150}>
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Performance Annuelle</h3>
              <p className="text-sm text-gray-500 mt-1">Visites et nouveaux comptes par mois</p>
            </div>
          </div>
          <div className="relative w-full h-72 min-h-[288px] min-w-0 overflow-hidden">
            <ResponsiveContainer width="99%" height="100%" minWidth={0}>
              <BarChart data={stats?.performance || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                <Bar dataKey="visits" fill="#0F1E2E" radius={[6, 6, 0, 0]} name="Visites" />
                <Bar dataKey="signups" fill="#3B82F6" radius={[6, 6, 0, 0]} name="Comptes Créés" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
};

export default DashboardStats;
