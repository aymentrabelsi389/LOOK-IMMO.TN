import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  User as UserIcon, Home as HomeIcon, Calendar, Eye
} from 'lucide-react';


interface DashboardStatsProps {
  stats: any;
  propertiesCount: number;
}

const DashboardStats = ({ stats, propertiesCount }: DashboardStatsProps) => {
  const cards = [
    { label: "Utilisateurs", val: stats?.totals?.users?.toString() || "0", icon: <UserIcon size={24} />, gradient: "from-blue-500 to-blue-600", iconBg: "bg-blue-500/10", trend: "Total" },
    { label: "Propriétés", val: stats?.totals?.properties?.toString() || propertiesCount.toString(), icon: <HomeIcon size={24} />, gradient: "from-emerald-500 to-emerald-600", iconBg: "bg-emerald-500/10", trend: "Actives" },
    { label: "Rendez-vous", val: stats?.totals?.todayAppointments?.toString() || "0", icon: <Calendar size={24} />, gradient: "from-purple-500 to-purple-600", iconBg: "bg-purple-500/10", trend: `Aujourd'hui (${stats?.totals?.appointments || 0} au total)` },
    { label: "Visites Site", val: stats?.totals?.visits?.toString() || "0", icon: <Eye size={24} fill="currentColor" />, gradient: "from-orange-500 to-orange-600", iconBg: "bg-orange-500/10", trend: "Vues" }
  ];

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((stat, i) => (
          <div key={i} className="group relative bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
            <div className="relative flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{stat.label}</p>
                <h3 className="text-3xl font-bold text-gray-900 mb-1">{stat.val}</h3>
                <p className="text-xs text-gray-400 font-medium">{stat.trend}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.iconBg}`}>
                <div className={`bg-gradient-to-br ${stat.gradient} text-white p-3 rounded-xl`}>{stat.icon}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div><h3 className="text-xl font-bold text-gray-900">Performance Annuelle</h3><p className="text-sm text-gray-500 mt-1">Visites et nouveaux comptes par mois</p></div>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
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
    </div>
  );
};

export default DashboardStats;
