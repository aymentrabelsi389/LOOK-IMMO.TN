import React from 'react';
import { 
  User as UserIcon, Home as HomeIcon, Calendar, Eye 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

interface DashboardOverviewProps {
  dashboardStats: any;
  propertiesCount: number;
}

const DashboardOverview = ({
  dashboardStats,
  propertiesCount
}: DashboardOverviewProps) => {
  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Enhanced Stats Cards with Gradients */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {[
          {
            label: "Utilisateurs",
            val: dashboardStats?.totals?.users?.toString() || "0",
            icon: <UserIcon size={24} />,
            gradient: "from-blue-500 to-blue-600",
            iconBg: "bg-blue-500/10",
            trend: "Total"
          },
          {
            label: "Propriétés",
            val: dashboardStats?.totals?.properties?.toString() || propertiesCount.toString(),
            icon: <HomeIcon size={24} />,
            gradient: "from-emerald-500 to-emerald-600",
            iconBg: "bg-emerald-500/10",
            trend: "Actives"
          },
          {
            label: "Rendez-vous",
            val: dashboardStats?.totals?.todayAppointments?.toString() || "0",
            icon: <Calendar size={24} />,
            gradient: "from-purple-500 to-purple-600",
            iconBg: "bg-purple-500/10",
            trend: `Aujourd'hui (${dashboardStats?.totals?.appointments || 0} au total)`
          },
          {
            label: "Visites Site",
            val: dashboardStats?.siteViews?.toString() || "0",
            icon: <Eye size={24} fill="currentColor" />,
            gradient: "from-orange-500 to-orange-600",
            iconBg: "bg-orange-500/10",
            trend: "Total Vues"
          },
          {
            label: "Visiteurs en ligne",
            val: dashboardStats?.onlineCount?.toString() || "1",
            icon: <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />,
            gradient: "from-green-500 to-emerald-600",
            iconBg: "bg-green-500/10",
            trend: "Dernière 5 min"
          }
        ].map((stat, i) => (
          <div
            key={i}
            className="group relative bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-gray-200 transition-all duration-300 overflow-hidden"
          >
            {/* Subtle gradient background on hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>

            <div className="relative flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{stat.label}</p>
                <h3 className="text-3xl font-bold text-gray-900 mb-1">{stat.val}</h3>
                <p className="text-xs text-gray-400 font-medium">{stat.trend}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.iconBg} text-transparent bg-clip-text bg-gradient-to-br ${stat.gradient} group-hover:scale-110 transition-transform duration-300`}>
                <div className={`bg-gradient-to-br ${stat.gradient} text-white p-3 rounded-xl`}>
                  {stat.icon}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Enhanced Chart Area */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Performance Annuelle</h3>
            <p className="text-sm text-gray-500 mt-1">Visites et leads par mois</p>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-[#0F1E2E] mr-2"></div>
              <span className="text-gray-600">Visites</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
              <span className="text-gray-600">Leads</span>
            </div>
          </div>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={dashboardStats?.performance || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
              <Bar dataKey="visits" fill="#0F1E2E" radius={[6, 6, 0, 0]} name="Visites" />
              <Bar dataKey="signups" fill="#3B82F6" radius={[6, 6, 0, 0]} name="Comptes" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
