import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ClientDemand } from '../types';
import { statsAPI, clientDemandsAPI } from '../services/api';

import AdminSidebar from '../components/admin/AdminSidebar';
import AdminHeader from '../components/admin/AdminHeader';
import { useSEO } from '../hooks/useSEO';
import { useUI } from '../context/UIContext';
import { useAuthStore } from '../stores/useAuthStore';
import { useData } from '../context/DataContext';
import { notify } from '../services/notificationStore';

// Sub-components from modular directory (lazy loaded)
const DashboardStats = lazy(() => import('./DashboardStats'));
const PropertiesManagement = lazy(() => import('../components/admin/PropertiesManagement'));
const AppointmentsManagement = lazy(() => import('../components/admin/AppointmentsManagement'));
const LocationsManagement = lazy(() => import('../components/admin/LocationsManagement'));
const UsersManagement = lazy(() => import('../components/admin/UsersManagement'));
const MessagesManagement = lazy(() => import('../components/admin/MessagesManagement'));
const BlogManagement = lazy(() => import('../components/admin/BlogManagement'));
const EditableSettings = lazy(() => import('../components/admin/EditableSettings'));
const RatingsManagement = lazy(() => import('../components/admin/RatingsManagement'));
const DemandsManagement = lazy(() => import('../components/admin/DemandsManagement'));
const FinancesManagement = lazy(() => import('../components/admin/FinancesManagement'));

const AdminPanel = () => {
  const { handleNavigate } = useUI();
  const { user, handleLogout: onLogout } = useAuthStore();

  const {
    properties, setProperties,
    availableLocations, setAvailableLocations,
    adminLocations, setAdminLocations,
    allUsers, setAllUsers,
    siteSettings, setSiteSettings,
    messages, setMessages,
    appointments, setAppointments,
    blogPosts, setBlogPosts,
    ratings, setRatings,
    refreshAdminData,
  } = useData();

  // Compat shim so sub-components that still accept showNotification keep working
  const showNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string, options?: { duration?: number }) => {
    notify[type](message, options?.duration ? { duration: options.duration } : undefined);
  };

  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (location.state && (location.state as any).tab) {
      setActiveTab((location.state as any).tab);
      // Clean up the location state so it doesn't trigger again on component updates
      navigate(location.pathname, { replace: true, state: { ...location.state, tab: undefined } });
    }
  }, [location.state, location.pathname, navigate]);

  const getPageTitle = (tab: string) => {
    const titles: Record<string, string> = {
      dashboard: 'Tableau de bord', properties: 'Gestion des Propriétés',
      users: 'Utilisateurs & Clients', messages: 'Messages Reçus',
      appointments: 'Agenda & Rendez-vous', ratings: 'Avis & Notes',
      localisations: 'Villes & Quartiers', blog: 'Blog & Actualités',
      settings: 'Paramètres du Site',
      demands: 'Demandes Clients',
      finances: 'Gestion Financière'
    };
    return titles[tab] || 'Administration';
  };

  useSEO({
    title: `${getPageTitle(activeTab)} | Espace Administrateur`,
    description: "Espace d'administration et de gestion Look Immo pour le suivi des biens, utilisateurs, rendez-vous et statistiques de l'agence."
  });
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [clientDemands, setClientDemands] = useState<ClientDemand[]>([]);



  useEffect(() => {
    refreshAdminData();
    const fetchStats = async () => {
      if (user?.role === 'admin' && activeTab === 'dashboard') {
        try {
          const stats = await statsAPI.getDashboard();
          setDashboardStats(stats);
        } catch (e) {
          console.error("Failed to fetch dashboard stats", e);
        }
      }
    };
    fetchStats();
  }, [user, activeTab, refreshAdminData]);

  useEffect(() => {
    const fetchDemands = async () => {
      try {
        const data = await clientDemandsAPI.getAll();
        setClientDemands(data);
      } catch (err) {
        console.error("Failed to fetch demands in AdminPanel", err);
      }
    };
    fetchDemands();
  }, []);



  // Helper to count matches for a single demand (to display badge count)
  const getMatchesCountForDemand = (demand: ClientDemand) => {
    if (!properties || properties.length === 0) return 0;

    const localIgnored = typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem(`ignored_matches_${demand.id}`) || '[]')
      : [];
    const ignoredIds = new Set([
      ...(demand.ignoredPropertyIds || []),
      ...localIgnored
    ]);

    const typeMapping: Record<string, string[]> = {
      'appartement': ['apartment', 'studio', 'duplex', 'triplex', 'penthouse'],
      'villa': ['villa'],
      'terrain': ['land'],
      'bureau': ['commercial', 'depot'],
      'commerce': ['commerce', 'commercial']
    };

    const allowedTypes = typeMapping[demand.type] || [];
    const demandLoc = demand.location.toLowerCase();
    const areaMatch = demand.description.match(/(\d+)\s*m[2²]/);
    const requestedArea = areaMatch ? parseInt(areaMatch[1]) : null;

    let count = 0;
    for (const property of properties) {
      if (ignoredIds.has(property.id)) continue;

      let score = 0;
      // 1. Type Match
      if (allowedTypes.includes(property.type)) {
        score += 40;
      } else {
        if (demand.type === 'appartement' && property.type === 'villa') score += 5;
        if (demand.type === 'villa' && property.type === 'apartment') score += 5;
      }

      // 2. Budget Match
      if (demand.budget && demand.budget > 0) {
        const priceDiff = (property.price - demand.budget) / demand.budget;
        if (priceDiff <= 0) score += 30;
        else if (priceDiff <= 0.1) score += 20;
        else if (priceDiff <= 0.2) score += 10;
      } else {
        score += 15;
      }

      // 3. Location Match
      const propCity = (property.location?.city || '').toLowerCase();
      const propAddr = (property.location?.address || '').toLowerCase();
      if (propCity && (propCity.includes(demandLoc) || demandLoc.includes(propCity))) {
        score += 20;
      } else if (propAddr && (propAddr.includes(demandLoc) || demandLoc.includes(propAddr))) {
        score += 12;
      }

      // 4. Area Match
      if (requestedArea && property.features?.area) {
        const areaDiff = Math.abs(property.features.area - requestedArea) / requestedArea;
        if (areaDiff <= 0.2) score += 10;
        else if (areaDiff <= 0.4) score += 5;
      }

      // 5. Priority
      if (demand.priority === 'high') score += 5;

      if (score >= 45) {
        count++;
      }
    }
    return count;
  };

  const activeDemandsMatchesCount = clientDemands.filter(
    d => d.status !== 'closed' && getMatchesCountForDemand(d) > 0
  ).length;

  const renderMainContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardStats stats={dashboardStats} propertiesCount={properties.length} />;
      case 'properties':
        return (
          <PropertiesManagement
            properties={properties}
            setProperties={setProperties}
            availableLocations={availableLocations}
            showNotification={showNotification}
            user={user}
            clientDemands={clientDemands}
          />
        );
      case 'appointments':
        return <AppointmentsManagement appointments={appointments} setAppointments={setAppointments} users={allUsers} properties={properties} />;
      case 'localisations':
        return <LocationsManagement availableLocations={availableLocations} setAvailableLocations={setAvailableLocations} adminLocations={adminLocations} setAdminLocations={setAdminLocations} showNotification={showNotification} />;
      case 'users':
        return <UsersManagement users={allUsers} setUsers={setAllUsers} properties={properties} ratings={ratings} messages={messages} appointments={appointments} targetUserId={targetUserId} currentUser={user} onCloseProfile={() => setTargetUserId(null)} />;
      case 'messages':
        return <MessagesManagement messages={messages} setMessages={setMessages} />;
      case 'ratings':
        return <RatingsManagement ratings={ratings} setRatings={setRatings} showNotification={showNotification} onViewUser={(userId) => { setTargetUserId(userId); setActiveTab('users'); }} />;
      case 'settings':
        return <EditableSettings settings={siteSettings} setSettings={setSiteSettings} availableLocations={availableLocations} />;
      case 'blog':
        return <BlogManagement blogPosts={blogPosts} setBlogPosts={setBlogPosts} showNotification={showNotification} />;

      case 'demands':
        return (
          <DemandsManagement
            properties={properties}
            clientDemands={clientDemands}
            setClientDemands={setClientDemands}
          />
        );

      case 'finances':
        return <FinancesManagement properties={properties} showNotification={(msg, type) => showNotification(type, msg)} />;
      default:
        return <div className="text-center py-24 text-gray-500">Section en développement</div>;
    }
  };

  return (
    <div className="h-screen bg-[#F5F6FA] flex font-sans overflow-hidden">
      <AdminSidebar
        activeTab={activeTab} setActiveTab={setActiveTab}
        sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}
        user={user}
        unreadMessagesCount={messages.filter(m => m.status === 'new').length}
        pendingAppointmentsCount={appointments.filter(a => a.status === 'pending').length}
        newUsersCount={allUsers.filter(u => !u.viewedByAdmin).length}
        unreadRatingsCount={ratings.filter(r => !r.viewedByAdmin).length}
        activeDemandsMatchesCount={activeDemandsMatchesCount}
      />
      <div className="flex-1 md:ml-72 flex flex-col min-h-screen">
        <AdminHeader
          title={getPageTitle(activeTab)} user={user}
          sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}
          onLogout={onLogout} onNavigate={() => handleNavigate('home')}
          onProfileClick={() => handleNavigate('dashboard')}
          isVisible={true}
        />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 pb-[72px] md:pb-8">
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
              <div className="w-10 h-10 border-4 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-500 font-bold uppercase tracking-widest animate-pulse">Chargement de la section...</p>
            </div>
          }>
            {renderMainContent()}
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default AdminPanel;
