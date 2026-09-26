import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  User as UserIcon, Home as HomeIcon, Calendar, Eye, TrendingUp, Sparkles, Activity
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
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
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

// Custom Glassmorphism Tooltip
const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/60 p-4 rounded-2xl shadow-2xl text-white min-w-[170px] animate-fade-in">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 pb-2 border-b border-slate-800">
          Mois de {label}
        </div>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span 
                  className="w-2.5 h-2.5 rounded-full ring-2 ring-white/20" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-slate-300 font-medium">{entry.name}</span>
              </div>
              <span className="font-extrabold text-white font-mono">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const DashboardStats = ({ stats, propertiesCount, onTabChange }: DashboardStatsProps) => {
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  const performanceData = stats?.performance || [];
  const totalVisits = performanceData.reduce((acc: number, curr: any) => acc + (curr.visits || 0), 0);
  const totalSignups = performanceData.reduce((acc: number, curr: any) => acc + (curr.signups || 0), 0);

  const cards = [
    { id: "users", label: "Utilisateurs", val: stats?.totals?.users?.toString() || "0", icon: <UserIcon size={22} />, gradient: "from-blue-500 to-indigo-600", iconBg: "bg-blue-500/10 text-blue-600", trend: "Comptes enregistrés" },
    { id: "properties", label: "Propriétés", val: stats?.totals?.properties?.toString() || propertiesCount.toString(), icon: <HomeIcon size={22} />, gradient: "from-emerald-500 to-teal-600", iconBg: "bg-emerald-500/10 text-emerald-600", trend: "Biens actifs" },
    { id: "appointments", label: "Rendez-vous", val: stats?.totals?.todayAppointments?.toString() || "0", icon: <Calendar size={22} />, gradient: "from-purple-500 to-pink-600", iconBg: "bg-purple-500/10 text-purple-600", trend: `${stats?.totals?.appointments || 0} au total` },
    { id: "visits", label: "Visites Site", val: stats?.totals?.visits?.toString() || "0", icon: <Eye size={22} />, gradient: "from-amber-500 to-orange-600", iconBg: "bg-amber-500/10 text-amber-600", trend: "Vues globales" }
  ];

  return (
    <div className="space-y-8 font-sans">
      {/* Top 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((stat, i) => {
          const isInteractive = stat.id !== 'visits' && !!onTabChange;
          return (
            <ScrollReveal 
              key={i} 
              delay={i * 80}
              className="w-full"
            >
              <div 
                onClick={() => isInteractive && onTabChange?.(stat.id)}
                className={`group relative bg-white p-6 rounded-3xl shadow-[0_15px_35px_-10px_rgba(12,31,50,0.06)] border border-slate-100 hover:shadow-xl transition-all duration-300 overflow-hidden ${
                  isInteractive ? 'cursor-pointer hover:border-brand-teal/30 hover:-translate-y-1' : ''
                }`}
              >
                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.gradient} opacity-5 rounded-bl-full group-hover:scale-125 transition-transform duration-500`}></div>
                <div className="relative flex items-start justify-between">
                  <div className="flex-1 pr-2">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{stat.label}</p>
                    <h3 className="text-3xl font-extrabold text-slate-900 mb-1 tracking-tight">
                      <AnimatedCounter value={stat.val} />
                    </h3>
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-2">
                      <Activity size={12} className="text-slate-400" />
                      <span>{stat.trend}</span>
                    </p>
                  </div>
                  <div className={`p-3.5 rounded-2xl ${stat.iconBg} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                    {stat.icon}
                  </div>
                </div>
              </div>
            </ScrollReveal>
          );
        })}
      </div>
      
      {/* Premium Performance Chart Widget with Dynamic Moving Waves */}
      <ScrollReveal delay={180}>
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_-15px_rgba(12,31,50,0.07)] border border-slate-100 relative overflow-hidden">
          
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1.5 rounded-lg bg-brand-teal/10 text-brand-teal animate-pulse">
                  <TrendingUp size={16} />
                </span>
                <h3 className="text-2xl font-extrabold text-brand-dark font-serif tracking-tight">Performance Annuelle</h3>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Évolution mensuelle des visites et des inscriptions de comptes
              </p>
            </div>

            {/* Controls & KPIs */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Metric Indicators */}
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-xl shadow-xs border border-slate-200/60">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-teal opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-teal"></span>
                  </span>
                  <span className="text-xs font-bold text-slate-700">Visites ({totalVisits})</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-xl shadow-xs border border-slate-200/60">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                  </span>
                  <span className="text-xs font-bold text-slate-700">Comptes ({totalSignups})</span>
                </div>
              </div>

              {/* View Mode Switcher */}
              <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setChartType('area')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    chartType === 'area'
                      ? 'bg-white text-brand-dark shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Courbe
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('bar')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    chartType === 'bar'
                      ? 'bg-white text-brand-dark shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Barres
                </button>
              </div>
            </div>
          </div>

          {/* Chart Canvas with Dynamic Moving Wave Gradients */}
          <div className="relative w-full h-80 min-h-[320px] min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              {chartType === 'area' ? (
                <AreaChart data={performanceData} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                  <defs>
                    {/* Animated Wave Gradient for Visits */}
                    <linearGradient id="movingGradientVisits" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00A9C7" stopOpacity="0.5">
                        <animate attributeName="stop-opacity" values="0.3;0.65;0.3" dur="4s" repeatCount="indefinite" />
                        <animate attributeName="stop-color" values="#00A9C7;#06b6d4;#00A9C7" dur="6s" repeatCount="indefinite" />
                      </stop>
                      <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.3">
                        <animate attributeName="stop-opacity" values="0.2;0.45;0.2" dur="4s" repeatCount="indefinite" />
                      </stop>
                      <stop offset="100%" stopColor="#00A9C7" stopOpacity="0.0" />
                    </linearGradient>

                    {/* Animated Wave Gradient for Signups */}
                    <linearGradient id="movingGradientSignups" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity="0.55">
                        <animate attributeName="stop-opacity" values="0.35;0.7;0.35" dur="3.5s" repeatCount="indefinite" />
                        <animate attributeName="stop-color" values="#6366F1;#818CF8;#6366F1" dur="5s" repeatCount="indefinite" />
                      </stop>
                      <stop offset="50%" stopColor="#4F46E5" stopOpacity="0.3">
                        <animate attributeName="stop-opacity" values="0.15;0.4;0.15" dur="3.5s" repeatCount="indefinite" />
                      </stop>
                      <stop offset="100%" stopColor="#4338CA" stopOpacity="0.0" />
                    </linearGradient>

                    {/* Dynamic Moving Stroke Gradient for Signups */}
                    <linearGradient id="movingStrokeSignups" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#6366F1">
                        <animate attributeName="stop-color" values="#6366F1;#818CF8;#4F46E5;#6366F1" dur="4s" repeatCount="indefinite" />
                      </stop>
                      <stop offset="50%" stopColor="#818CF8">
                        <animate attributeName="stop-color" values="#818CF8;#C084FC;#818CF8" dur="4s" repeatCount="indefinite" />
                      </stop>
                      <stop offset="100%" stopColor="#4F46E5">
                        <animate attributeName="stop-color" values="#4F46E5;#6366F1;#4F46E5" dur="4s" repeatCount="indefinite" />
                      </stop>
                    </linearGradient>

                    {/* Dynamic Moving Stroke Gradient for Visits */}
                    <linearGradient id="movingStrokeVisits" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#00A9C7">
                        <animate attributeName="stop-color" values="#00A9C7;#22D3EE;#00A9C7" dur="4.5s" repeatCount="indefinite" />
                      </stop>
                      <stop offset="100%" stopColor="#0284C7">
                        <animate attributeName="stop-color" values="#0284C7;#00A9C7;#0284C7" dur="4.5s" repeatCount="indefinite" />
                      </stop>
                    </linearGradient>

                    {/* Glow filter */}
                    <filter id="curveGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#6366F1" floodOpacity="0.3" />
                    </filter>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94A3B8', fontSize: 11 }} 
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="visits"
                    name="Visites"
                    stroke="url(#movingStrokeVisits)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#movingGradientVisits)"
                    isAnimationActive={true}
                    animationDuration={1600}
                    animationEasing="ease-in-out"
                    activeDot={{ r: 7, fill: '#00A9C7', stroke: '#fff', strokeWidth: 3 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="signups"
                    name="Comptes Créés"
                    stroke="url(#movingStrokeSignups)"
                    strokeWidth={3.5}
                    fillOpacity={1}
                    fill="url(#movingGradientSignups)"
                    filter="url(#curveGlow)"
                    isAnimationActive={true}
                    animationDuration={1800}
                    animationEasing="ease-in-out"
                    activeDot={{ r: 7, fill: '#4F46E5', stroke: '#fff', strokeWidth: 3 }}
                  />
                </AreaChart>
              ) : (
                <BarChart data={performanceData} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94A3B8', fontSize: 11 }} 
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Bar dataKey="visits" fill="#00A9C7" radius={[8, 8, 0, 0]} name="Visites" maxBarSize={36} isAnimationActive={true} animationDuration={1200} />
                  <Bar dataKey="signups" fill="#4F46E5" radius={[8, 8, 0, 0]} name="Comptes Créés" maxBarSize={36} isAnimationActive={true} animationDuration={1400} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Bottom Insights Footer */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
            <span className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-500 animate-spin" style={{ animationDuration: '6s' }} />
              <span>Données synchronisées en temps réel avec l'activité de la plateforme.</span>
            </span>
            <span className="font-semibold text-slate-600">
              Total cumulé : <strong className="text-brand-dark">{totalVisits + totalSignups} actions</strong>
            </span>
          </div>

        </div>
      </ScrollReveal>
    </div>
  );
};

export default DashboardStats;
