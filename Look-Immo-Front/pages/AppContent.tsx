import React, { useEffect } from 'react';
import { useLocation, Routes, Route, Navigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import LuxuryLoader from '../components/ui/LuxuryLoader';
import { Suspense, lazy } from 'react';

// Context Hooks
import { useUI } from '../context/UIContext';
import { useAuthStore } from '../stores/useAuthStore';
import { useData } from '../context/DataContext';

// Layout Components
import Navbar from '../layouts/Navbar';
import Footer from '../layouts/Footer';
import SocialSidebar from '../layouts/SocialSidebar';
import ToastContainer from '../components/ui/ToastContainer';
import AuthRequiredModal from '../components/ui/AuthRequiredModal';
import { PrivacyModal, TermsModal } from '../components/ui/LegalModals';
import MobileBottomNavigation from '../components/admin/MobileBottomNavigation';

// Page Components (Lazy Loaded)
const HomePage = lazy(() => import('./HomePage'));
const ListingsPage = lazy(() => import('./ListingsPage'));
const PropertyDetailsPage = lazy(() => import('./PropertyDetailsPage'));
const DashboardPage = lazy(() => import('./DashboardPage'));
const AdminPanel = lazy(() => import('./AdminPanel'));
const AuthPage = lazy(() => import('./AuthPage'));
const ContactPage = lazy(() => import('./ContactPage'));
const BlogPage = lazy(() => import('./BlogPage'));
const BlogPostPage = lazy(() => import('./BlogPostPage'));
const ForgotPasswordPage = lazy(() => import('./ForgotPasswordPage'));

// Fix for default Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// --- Reusable ScrollToTop Component ---
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    const behavior = (window as any)._forceInstantScroll ? 'auto' : 'smooth';
    (window as any)._forceInstantScroll = false;
    window.scrollTo({ top: 0, behavior });
  }, [pathname]);
  return null;
};

// --- Main App Routing Shell ---
const AppContent = () => {


  const {
    currentPage,
    handleNavigate,
    handleSearch,
    filters,
    authMode,
    showAuthModal, setShowAuthModal,
    authModalReason,
    showTermsModal, setShowTermsModal,
    showPrivacyModal, setShowPrivacyModal,
  } = useUI();

  const { user, handleLogout } = useAuthStore();
  const { siteSettings, isLoading, appointments } = useData();

  const isAdminView = currentPage === 'admin' && (user?.role === 'admin' || user?.role === 'agent');

  if (!siteSettings || isLoading) {
    return <LuxuryLoader message={!siteSettings ? 'Initialisation de la plateforme...' : 'Chargement des propriétés...'} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-brand-light text-brand-dark font-sans selection:bg-brand-teal selection:text-white w-full">
      <ScrollToTop />

      {!isAdminView && (
        <Navbar
          currentPage={currentPage}
          onNavigate={handleNavigate}
          user={user}
          onLogout={handleLogout}
          onSearch={handleSearch}
          filters={filters}
          appointments={appointments}
        />
      )}

      <main className={`flex-1 flex flex-col ${!isAdminView ? 'pt-20 overflow-x-hidden' : ''} ${(user?.role === 'admin' || user?.role === 'agent') ? 'pb-24 lg:pb-0' : ''}`}>
        <Suspense fallback={<LuxuryLoader message="Chargement de la page..." />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/listings" element={<ListingsPage />} />
            <Route path="/property/:id" element={<PropertyDetailsPage />} />
            <Route path="/property" element={<PropertyDetailsPage />} />
            <Route path="/dashboard" element={user ? <DashboardPage /> : <Navigate to="/auth" replace />} />
            <Route path="/admin/*" element={(user?.role === 'admin' || user?.role === 'agent') ? <AdminPanel /> : <Navigate to="/" replace />} />
            <Route path="/auth" element={<AuthPage initialMode={authMode} />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog-post/:id" element={<BlogPostPage />} />
            <Route path="/blog-post" element={<BlogPostPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      {!isAdminView && <Footer onNavigate={handleNavigate} settings={siteSettings!} onSearch={handleSearch} onOpenTerms={() => setShowTermsModal(true)} onOpenPrivacy={() => setShowPrivacyModal(true)} />}
      {!isAdminView && <SocialSidebar settings={siteSettings!} />}

      <ToastContainer />

      <AuthRequiredModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={() => { setShowAuthModal(false); handleNavigate('auth'); }}
        onSignup={() => { setShowAuthModal(false); handleNavigate('auth'); }}
        message={
          authModalReason === 'favorites'
            ? 'Veuillez créer un compte ou vous connecter pour ajouter cette propriété à votre liste de favoris.'
            : 'Veuillez vous connecter pour prendre un rendez-vous.'
        }
      />
      <PrivacyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />
      <TermsModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} />
      {(user?.role === 'admin' || user?.role === 'agent') && <MobileBottomNavigation />}
    </div>
  );
};

export default AppContent;
