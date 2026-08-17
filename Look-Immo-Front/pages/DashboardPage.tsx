import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Appointment, SiteSettings, ClientDemand, AppNavigationState } from '@/types';
import { clientDemandsAPI, appointmentsAPI } from '@/services/api';
import { useSEO } from '@/hooks/useSEO';
import { useUI } from '@/context/UIContext';
import { useAuthStore } from '@/stores/useAuthStore';
import { useData } from '@/context/DataContext';
import { notify } from '@/services/notificationStore';
import { useConfirm } from '@/context/ConfirmContext';
import { useAdmin } from '@/hooks/useAdmin';

// Subcomponents
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { AppointmentsWidget } from '@/components/dashboard/AppointmentsWidget';
import { FavoritesSection } from '@/components/dashboard/FavoritesSection';
import { AdminQuickActions } from '@/components/dashboard/AdminQuickActions';
import { AccountSettings } from '@/components/dashboard/AccountSettings';
import { AddAppointmentModal } from '@/components/dashboard/modals/AddAppointmentModal';
import { EditAppointmentModal } from '@/components/dashboard/modals/EditAppointmentModal';
import { AddDemandModal } from '@/components/dashboard/modals/AddDemandModal';

const DashboardPage: React.FC = () => {
  useSEO({
    title: 'Mon Tableau de Bord',
    description:
      'Gérez vos favoris, vos demandes de visites, vos rendez-vous et vos informations personnelles sur votre espace client Look Immo.'
  });

  const { handleNavigate } = useUI();
  const location = useLocation();
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const { user, handleUpdateUser: onUpdateUser, handleToggleFavorite } = useAuthStore();
  const { isAdminOrAgent } = useAdmin();
  const {
    properties,
    appointments = [],
    siteSettings: settings,
    setSiteSettings,
    handleSelectProperty: onSelectProperty,
    handleCancelAppointment: onCancelAppointment,
    handleUpdateAppointment: onUpdateAppointment,
    setAppointments
  } = useData();

  if (!user) return null;

  const onAddAppointment = (apt: Appointment) =>
    setAppointments((prev) => (prev.some((a) => a.id === apt.id) ? prev : [apt, ...prev]));

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone || ''
  });

  useEffect(() => {
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || ''
    });
  }, [user]);

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=0D9488&color=fff&t=${Date.now()}`
    });
    setIsEditing(false);
  };

  const handleCancelUser = () => {
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || ''
    });
    setIsEditing(false);
  };

  // Helper: serialize/parse additional properties inside notes
  const parseNotes = (raw: string | undefined): { propertyIds: string[]; userNotes: string } => {
    if (!raw) return { propertyIds: [], userNotes: '' };
    const m = raw.match(/^\[PROPS:([^\]]*)\](.*)/s);
    if (m) {
      const ids = m[1].split(',').map((s) => s.trim()).filter(Boolean);
      return { propertyIds: ids, userNotes: m[2].trimStart() };
    }
    return { propertyIds: [], userNotes: raw };
  };

  const formatNotes = (propertyIds: string[], userNotes: string): string => {
    const valid = propertyIds.filter(Boolean);
    if (valid.length === 0) return userNotes;
    return `[PROPS:${valid.join(',')}] ${userNotes}`;
  };

  // Validation helpers
  const vibrateError = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([80, 40, 80]);
    }
  };

  const focusFirstError = (fieldIds: string[]) => {
    for (const id of fieldIds) {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
        break;
      }
    }
  };

  // Edit Appointment Modal State
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [editAdditionalProps, setEditAdditionalProps] = useState<string[]>([]);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editForm, setEditForm] = useState({
    date: '',
    time: '',
    message: '',
    propertyId: '',
    status: '',
    clientName: '',
    clientPhone: ''
  });

  const openEditAppointment = (apt: Appointment) => {
    setEditingAppointment(apt);
    const d = new Date(apt.date);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const rawNotes = (apt as unknown as { notes?: string; message?: string }).notes || apt.message || '';
    const { propertyIds, userNotes } = parseNotes(rawNotes);
    setEditAdditionalProps(propertyIds);

    setEditForm({
      date: dateStr,
      time: apt.time || '',
      message: userNotes,
      propertyId: apt.propertyId || '',
      status: apt.status || 'pending',
      clientName: apt.clientName || apt.userName || '',
      clientPhone: apt.clientPhone || apt.userPhone || ''
    });
  };

  const saveEditAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!editForm.clientName || editForm.clientName.trim().length < 2)
      errs.clientName = 'Le nom du client est obligatoire.';
    if (!editForm.clientPhone || editForm.clientPhone.replace(/\D/g, '').length === 0)
      errs.clientPhone = 'Veuillez renseigner un numéro de téléphone.';
    else if (editForm.clientPhone.replace(/\D/g, '').length < 8)
      errs.clientPhone = 'Le numéro doit contenir au moins 8 chiffres.';
    if (!editForm.date) errs.date = 'Veuillez saisir une date.';

    setEditErrors(errs);
    if (Object.keys(errs).length > 0) {
      vibrateError();
      notify.error('Veuillez corriger les champs en rouge.');
      focusFirstError(['edit-apt-client-name', 'edit-apt-client-phone', 'edit-apt-date', 'edit-apt-time']);
      return;
    }
    if (editingAppointment) {
      const serializedNotes = formatNotes(editAdditionalProps, editForm.message);
      onUpdateAppointment(editingAppointment.id, {
        ...editForm,
        status: editForm.status as Appointment['status'],
        message: serializedNotes,
        notes: serializedNotes,
        propertyId: editForm.propertyId || undefined
      });
      setEditingAppointment(null);
      setEditAdditionalProps([]);
      setEditErrors({});
    }
  };

  // Add Appointment State
  const [showAptModal, setShowAptModal] = useState(false);
  const [addAdditionalProps, setAddAdditionalProps] = useState<string[]>([]);
  const [aptErrors, setAptErrors] = useState<Record<string, string>>({});
  const [aptForm, setAptForm] = useState<Partial<Appointment>>({
    clientName: '',
    clientPhone: '',
    source: 'other',
    meetingType: 'visite',
    date: '',
    time: '',
    message: '',
    propertyId: ''
  });

  const handleAddApt = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!aptForm.clientName || aptForm.clientName.trim().length < 2)
      errs.clientName = 'Le nom du client est obligatoire.';
    if (!aptForm.clientPhone || aptForm.clientPhone.replace(/\D/g, '').length === 0)
      errs.clientPhone = 'Veuillez renseigner un numéro de téléphone.';
    else if (aptForm.clientPhone.replace(/\D/g, '').length < 8)
      errs.clientPhone = 'Le numéro doit contenir au moins 8 chiffres.';
    if (!aptForm.date) errs.date = 'Veuillez saisir une date.';

    setAptErrors(errs);
    if (Object.keys(errs).length > 0) {
      vibrateError();
      notify.error('Veuillez corriger les champs en rouge.');
      focusFirstError(['apt-client-name', 'apt-client-phone', 'apt-date', 'apt-time']);
      return;
    }
    try {
      const serializedNotes = formatNotes(addAdditionalProps, aptForm.message || '');
      const payload = { ...aptForm, message: serializedNotes, notes: serializedNotes };
      const newApt = await appointmentsAPI.create(payload);
      onAddAppointment(newApt);
      setShowAptModal(false);
      setAptErrors({});
      setAptForm({
        clientName: '',
        clientPhone: '',
        source: 'other',
        meetingType: 'visite',
        date: '',
        time: '',
        message: '',
        propertyId: ''
      });
      setAddAdditionalProps([]);
      notify.success('Rendez-vous ajouté avec succès ! 🗓️');
    } catch (err) {
      console.error(err);
      notify.error("Erreur lors de l'ajout du rendez-vous.");
    }
  };

  // Client Demands State
  const [clientDemands, setClientDemands] = useState<ClientDemand[]>([]);
  const [showDemandModal, setShowDemandModal] = useState(false);
  const [demandErrors, setDemandErrors] = useState<Record<string, string>>({});
  const [demandForm, setDemandForm] = useState<Partial<ClientDemand>>({
    clientName: '',
    phone: '',
    description: '',
    location: '',
    type: 'appartement',
    contractType: 'sale',
    budget: 0,
    priority: 'medium',
    status: 'searching'
  });

  useEffect(() => {
    if (isAdminOrAgent) {
      const fetchDemands = async () => {
        try {
          const data = await clientDemandsAPI.getAll();
          setClientDemands(data);
        } catch (err) {
          console.error('Failed to fetch demands:', err);
        }
      };
      fetchDemands();
    }
  }, [isAdminOrAgent]);

  const handleAddDemand = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!demandForm.clientName || (demandForm.clientName as string).trim().length < 2)
      errs.clientName = 'Le nom du client est obligatoire.';
    if (!demandForm.description || (demandForm.description as string).trim().length === 0)
      errs.description = 'La description est obligatoire.';
    if (!demandForm.location || (demandForm.location as string).trim().length === 0)
      errs.location = 'La localisation est obligatoire.';

    setDemandErrors(errs);
    if (Object.keys(errs).length > 0) {
      vibrateError();
      notify.error('Veuillez corriger les champs en rouge.');
      focusFirstError(['demand-client-name', 'demand-description', 'demand-location']);
      return;
    }
    try {
      const newDemand = await clientDemandsAPI.create(demandForm);
      setClientDemands((prev) => [newDemand, ...prev]);
      setShowDemandModal(false);
      setDemandErrors({});
      setDemandForm({
        clientName: '',
        phone: '',
        description: '',
        location: '',
        type: 'appartement',
        contractType: 'sale',
        budget: 0,
        priority: 'medium',
        status: 'searching'
      });
      notify.success('Demande client ajoutée avec succès.');
    } catch (err) {
      console.error('Failed to add demand:', err);
    }
  };

  // Deep linking router states (e.g. from notifications or shortcut buttons)
  useEffect(() => {
    const navState = location.state as AppNavigationState | null;
    if (navState && navState.action === 'new-appointment') {
      setAptForm({
        clientName: '',
        clientPhone: '',
        source: 'other',
        meetingType: 'visite',
        date: '',
        time: '',
        message: '',
        propertyId: ''
      });
      setShowAptModal(true);
      navigate(location.pathname, { replace: true, state: { ...navState, action: undefined } });
    } else if (navState && navState.action === 'new-demand') {
      setDemandForm({
        clientName: '',
        phone: '',
        description: '',
        location: '',
        type: 'appartement',
        contractType: 'sale',
        budget: 0,
        priority: 'medium',
        status: 'searching'
      });
      setShowDemandModal(true);
      navigate(location.pathname, { replace: true, state: { ...navState, action: undefined } });
    }
  }, [location.state, location.pathname, navigate]);

  // Working Hours State
  const [isEditingHours, setIsEditingHours] = useState(false);
  const [hoursForm, setHoursForm] = useState({
    weekdays: settings?.workingHours?.weekdays || '9:00 - 18:00',
    saturday: settings?.workingHours?.saturday || '9:00 - 14:00',
    sunday: settings?.workingHours?.sunday || 'Fermé'
  });

  const handleUpdateHours = (e: React.FormEvent) => {
    e.preventDefault();
    if (setSiteSettings && settings) {
      (setSiteSettings as (s: SiteSettings) => void)({
        ...settings,
        workingHours: {
          weekdays: hoursForm.weekdays,
          saturday: hoursForm.saturday,
          sunday: hoursForm.sunday
        }
      });
      setIsEditingHours(false);
    }
  };

  // Stats Calculations
  const apptsToday = appointments.filter((a) => {
    if (a.status === 'rejected') return false;
    const d = new Date(a.date);
    const todayDate = new Date();
    return (
      d.getUTCFullYear() === todayDate.getFullYear() &&
      d.getUTCMonth() === todayDate.getMonth() &&
      d.getUTCDate() === todayDate.getDate()
    );
  }).length;

  const apptsTomorrow = appointments.filter((a) => {
    if (a.status === 'rejected') return false;
    const d = new Date(a.date);
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    return (
      d.getUTCFullYear() === tomorrowDate.getFullYear() &&
      d.getUTCMonth() === tomorrowDate.getMonth() &&
      d.getUTCDate() === tomorrowDate.getDate()
    );
  }).length;

  const activeDemands = clientDemands.filter((d) => d.status === 'searching' || d.status === 'contacted').length;
  const matchedDemandsCount = clientDemands.filter((d) => d.status === 'matched').length;

  const upcomingAppointments = appointments
    .filter(
      (apt) =>
        isAdminOrAgent ||
        apt.userId === user.id ||
        (apt.clientEmail && apt.clientEmail === user.email) ||
        (apt.clientPhone && apt.clientPhone === user.phone)
    )
    .filter((apt) => apt.status === 'pending' || apt.status === 'accepted' || apt.status === 'rejected')
    .filter((apt) => {
      const d = new Date(apt.date);
      const aptUTC = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
      const now = new Date();
      const localTodayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
      return aptUTC >= localTodayUTC;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return (a.time || '').localeCompare(b.time || '');
    });

  const handleAppointmentConfirm = (id: string) => {
    onUpdateAppointment(id, { status: 'accepted' });
  };

  const handleAppointmentRefuse = (id: string) => {
    onUpdateAppointment(id, { status: 'rejected' });
  };

  const handleAppointmentCancel = async (apt: Appointment) => {
    const isRejected = apt.status === 'rejected';
    const confirmed = await confirm({
      title: isRejected ? 'Supprimer ?' : 'Annuler le rendez-vous ?',
      message: isRejected
        ? 'Êtes-vous sûr de vouloir supprimer définitivement ce rendez-vous ? Cette action est irréversible.'
        : 'Êtes-vous sûr de vouloir annuler ce rendez-vous ?',
      confirmText: isRejected ? 'Supprimer' : 'Annuler',
      cancelText: 'Retour',
      variant: 'danger'
    });
    if (confirmed) {
      onCancelAppointment(apt.id);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-12">
      {/* Header Banner & Admin CRM Stats */}
      <DashboardHeader
        user={user}
        apptsToday={apptsToday}
        apptsTomorrow={apptsTomorrow}
        activeDemands={activeDemands}
        matchedDemandsCount={matchedDemandsCount}
      />

      {/* Main Content Grid: Left Content (Admin Actions or User Favorites) + Right Sidebar (Upcoming Appointments) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 lg:[grid-template-rows:max-content_1fr] items-start gap-6 mb-8">
        {/* Right Sidebar: Appointments Reminder Widget */}
        <AppointmentsWidget
          upcomingAppointments={upcomingAppointments}
          properties={properties}
          isAdminOrAgent={isAdminOrAgent}
          onConfirmAppointment={handleAppointmentConfirm}
          onRefuseAppointment={handleAppointmentRefuse}
          onOpenEditAppointment={openEditAppointment}
          onCancelAppointment={handleAppointmentCancel}
          parseNotes={parseNotes}
        />

        {/* Left Column Content */}
        {user.role === 'admin' ? (
          <AdminQuickActions
            settings={settings}
            isEditingHours={isEditingHours}
            hoursForm={hoursForm}
            onOpenAptModal={() => setShowAptModal(true)}
            onOpenDemandModal={() => setShowDemandModal(true)}
            onSetEditingHours={setIsEditingHours}
            onSetHoursForm={setHoursForm}
            onUpdateHours={handleUpdateHours}
          />
        ) : (
          <FavoritesSection
            user={user}
            properties={properties}
            onSelectProperty={onSelectProperty}
            onToggleFavorite={handleToggleFavorite}
            onNavigateHome={() => handleNavigate('home')}
          />
        )}
      </div>

      {/* Account Settings Section */}
      <AccountSettings
        user={user}
        isEditing={isEditing}
        formData={formData}
        onSetEditing={setIsEditing}
        onSetFormData={setFormData}
        onSave={handleSaveUser}
        onCancel={handleCancelUser}
      />

      {/* Modals */}
      <AddAppointmentModal
        show={showAptModal}
        onClose={() => setShowAptModal(false)}
        onSubmit={handleAddApt}
        aptForm={aptForm}
        setAptForm={setAptForm}
        aptErrors={aptErrors}
        setAptErrors={setAptErrors}
        properties={properties}
        addAdditionalProps={addAdditionalProps}
        setAddAdditionalProps={setAddAdditionalProps}
      />

      <EditAppointmentModal
        editingAppointment={editingAppointment}
        onClose={() => setEditingAppointment(null)}
        onSubmit={saveEditAppointment}
        user={user}
        editForm={editForm}
        setEditForm={setEditForm}
        editErrors={editErrors}
        setEditErrors={setEditErrors}
        properties={properties}
        editAdditionalProps={editAdditionalProps}
        setEditAdditionalProps={setEditAdditionalProps}
      />

      <AddDemandModal
        show={showDemandModal}
        onClose={() => setShowDemandModal(false)}
        onSubmit={handleAddDemand}
        demandForm={demandForm}
        setDemandForm={setDemandForm}
        demandErrors={demandErrors}
        setDemandErrors={setDemandErrors}
      />
    </div>
  );
};

export default DashboardPage;
