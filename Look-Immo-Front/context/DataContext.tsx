import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import {
  Property, User, SiteSettings, Message, Appointment, BlogPost, Rating, Location
} from '@/types';
import {
  propertiesAPI, locationsAPI, blogAPI, settingsAPI, ratingsAPI,
  messagesAPI, appointmentsAPI, statsAPI, usersAPI, adaptAppointment,
  type BackendRating, shapeProperties, shapeRatings
} from '@/services/api';
import { socketService } from '@/services/socket';
import { notify } from '@/services/notificationStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUI } from './UIContext';
import { useAdmin } from '@/hooks/useAdmin';

// Evidence-based shapes for the two write handlers below, matching what
// their actual callers (ContactPage, PropertyDetailsPage) send — narrower
// and more honest than `any`, without overclaiming a verified backend contract.
interface NewMessageInput {
  fullName?: string;
  name?: string; // legacy alias some callers still use
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  website?: string; // honeypot field — forwarded, backend rejects if non-empty
}

interface NewAppointmentInput {
  propertyId?: string;
  propertyTitle?: string;
  date: string;
  time: string;
  message?: string;
}

interface DataContextType {
  properties: Property[];
  setProperties: React.Dispatch<React.SetStateAction<Property[]>>;
  totalProperties: number;
  availableLocations: string[];
  setAvailableLocations: React.Dispatch<React.SetStateAction<string[]>>;
  adminLocations: Location[];
  setAdminLocations: React.Dispatch<React.SetStateAction<Location[]>>;
  blogPosts: BlogPost[];
  setBlogPosts: React.Dispatch<React.SetStateAction<BlogPost[]>>;
  allUsers: User[];
  setAllUsers: React.Dispatch<React.SetStateAction<User[]>>;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  appointments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  ratings: Rating[];
  setRatings: React.Dispatch<React.SetStateAction<Rating[]>>;
  siteSettings: SiteSettings | null;
  setSiteSettings: React.Dispatch<React.SetStateAction<SiteSettings | null>>;
  isLoading: boolean;
  refreshAdminData: () => Promise<void>;
  handleSelectProperty: (id: string) => void;
  handleSelectBlogPost: (id: string) => Promise<void>;
  handleNewMessage: (data: NewMessageInput) => Promise<void>;
  handleNewAppointment: (data: NewAppointmentInput) => Promise<void>;
  handleRateProperty: (propertyId: string, value: number) => Promise<Property | undefined>;
  handleCancelAppointment: (id: string) => Promise<void>;
  handleUpdateAppointment: (id: string, data: Partial<Appointment>) => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};

const DEFAULT_SITE_SETTINGS: SiteSettings = {
  websiteName: 'Look Immo',
  contactEmail: 'contact@lookimmo.tn',
  phoneNumber: '+216 70 123 456',
  address: 'Tunis, Tunisie',
  socialMedia: { instagram: '', facebook: '', whatsapp: '' },
  workingHours: { weekdays: '', saturday: '', sunday: '' },
} as SiteSettings;



// ── Setter bridges ───────────────────────────────────────────────────────
// These give components the exact same `Dispatch<SetStateAction<T[]>>` API
// they had with useState, but write straight into the React Query cache via
// queryClient.setQueryData instead of a parallel piece of local state. Every
// subscriber to that query (this context included) re-renders from the same
// single source of truth — no sync effect, no second copy to go stale.
function makeArraySetter<T>(
  queryClient: ReturnType<typeof useQueryClient>,
  key: QueryKey
): React.Dispatch<React.SetStateAction<T[]>> {
  return (updater) => {
    queryClient.setQueryData<T[]>(key, (old) => {
      const current = old ?? [];
      return typeof updater === 'function' ? (updater as (prev: T[]) => T[])(current) : updater;
    });
  };
}

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const user = useAuthStore((s) => s.user);
  const { handleNavigate, setSelectedPropertyId, setSelectedBlogPostId } = useUI();
  const queryClient = useQueryClient();

  const { isAdminOrAgent } = useAdmin();

  // ── TanStack Queries — each query's cache IS the state now. ──

  // Properties Query: 5 minutes staleTime — fetches first page only for global context,
  // or all properties for admins/agents so they can manage the full list.
  // (ListingsPage manages its own server-side paginated query independently)
  const propertiesKey = useMemo(() => ['properties', 'global', isAdminOrAgent] as const, [isAdminOrAgent]);
  const { data: qPropertiesResult, isFetched: isPropertiesFetched } = useQuery({
    queryKey: propertiesKey,
    queryFn: () => propertiesAPI.getAll(isAdminOrAgent ? { noLimit: 'true' } : { page: 1, limit: 24 }),
    staleTime: 5 * 60 * 1000,
  });

  const properties = useMemo(
    () => (qPropertiesResult ? shapeProperties(qPropertiesResult.data) : []),
    [qPropertiesResult]
  );
  const totalProperties = qPropertiesResult?.pagination.total ?? 0;

  const setProperties: React.Dispatch<React.SetStateAction<Property[]>> = (updater) => {
    queryClient.setQueryData(propertiesKey, (old: typeof qPropertiesResult) => {
      if (!old) return old;
      const currentShaped = shapeProperties(old.data);
      const next = typeof updater === 'function' ? (updater as (prev: Property[]) => Property[])(currentShaped) : updater;
      return { ...old, data: next };
    });
  };

  // Locations Query: 10 minutes staleTime
  const { data: qLocations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationsAPI.getAll(),
    staleTime: 10 * 60 * 1000,
  });
  const adminLocations = qLocations ?? [];
  // availableLocations is purely a `.name` projection of adminLocations, so it's
  // derived rather than tracked separately — updating adminLocations already
  // updates this on the next render.
  const availableLocations = useMemo(() => (qLocations ?? []).map((l: Location) => l.name), [qLocations]);
  const setAdminLocations = makeArraySetter<Location>(queryClient, ['locations']);
  // Kept only so existing call sites that set both together (always
  // `setAdminLocations(x); setAvailableLocations(x.map(...))`) keep compiling —
  // it's a no-op because setAdminLocations already updates the derived view above.
  const setAvailableLocations: React.Dispatch<React.SetStateAction<string[]>> = () => {};

  // Blog Posts Query: 5 minutes staleTime
  const { data: qBlogPosts } = useQuery({
    queryKey: ['blogPosts'],
    queryFn: () => blogAPI.getAll(),
    staleTime: 5 * 60 * 1000,
  });
  const blogPosts = qBlogPosts ?? [];
  const setBlogPosts = makeArraySetter<BlogPost>(queryClient, ['blogPosts']);

  // Settings Query: 10 minutes staleTime
  const { data: qSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.get(),
    staleTime: 10 * 60 * 1000,
  });
  // Mirrors the previous state machine: while the query hasn't resolved yet,
  // stay null (loading); once resolved, fall back to defaults only if the
  // server genuinely returned nothing.
  const siteSettings = qSettings === undefined ? null : qSettings ?? DEFAULT_SITE_SETTINGS;
  const setSiteSettings: React.Dispatch<React.SetStateAction<SiteSettings | null>> = (updater) => {
    queryClient.setQueryData(['settings'], (old: SiteSettings | null | undefined) => {
      const current = old === undefined ? null : old ?? DEFAULT_SITE_SETTINGS;
      return typeof updater === 'function' ? (updater as (prev: SiteSettings | null) => SiteSettings | null)(current) : updater;
    });
  };

  // Ratings Query: 1 minute staleTime
  const { data: qRatings } = useQuery({
    queryKey: ['ratings'],
    queryFn: () => ratingsAPI.getAll(),
    staleTime: 60 * 1000,
  });
  const ratings = useMemo(() => (qRatings ? shapeRatings(qRatings) : []), [qRatings]);
  const setRatings: React.Dispatch<React.SetStateAction<Rating[]>> = (updater) => {
    queryClient.setQueryData(['ratings'], (old: BackendRating[] | undefined) => {
      const currentShaped = shapeRatings(old ?? []);
      const next = typeof updater === 'function' ? (updater as (prev: Rating[]) => Rating[])(currentShaped) : updater;
      return next;
    });
  };

  // Users Query: 1 minute staleTime, enabled for admin/agent only
  const { data: qUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersAPI.getAll(),
    enabled: isAdminOrAgent,
    staleTime: 60 * 1000,
  });
  const allUsers = qUsers ?? [];
  const setAllUsers = makeArraySetter<User>(queryClient, ['users']);

  // Messages Query: 30 seconds staleTime, enabled for admin/agent only
  const { data: qMessages } = useQuery({
    queryKey: ['messages'],
    queryFn: () => messagesAPI.getAll(),
    enabled: isAdminOrAgent,
    staleTime: 30 * 1000,
  });
  const messages = qMessages ?? [];
  const setMessages = makeArraySetter<Message>(queryClient, ['messages']);

  // Appointments Query: 30 seconds staleTime, enabled for logged-in users
  const { data: qAppointments } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => appointmentsAPI.getAll(),
    enabled: !!user,
    staleTime: 30 * 1000,
  });
  const appointments = qAppointments ?? [];
  const setAppointments = makeArraySetter<Appointment>(queryClient, ['appointments']);

  // Loading gate — only the global first load blocks the UI; background
  // refetches never do, since isFetched stays true forever once the query
  // has resolved once. Derived directly, no state/effect needed.
  const isLoading = !isPropertiesFetched;

  // Track visit on mount
  useEffect(() => {
    statsAPI.trackVisit(window.location.pathname);
  }, []);

  // Sync IDs from URL on mount
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/property/')) {
      setSelectedPropertyId(path.split('/').pop() || null);
    } else if (path.startsWith('/blog-post/')) {
      setSelectedBlogPostId(path.split('/').pop() || null);
    }
  }, [setSelectedPropertyId, setSelectedBlogPostId]);

  // Real-time Socket Event Handlers
  useEffect(() => {
    if (user) {
      socketService.connect(user.id, isAdminOrAgent);

      if (isAdminOrAgent) {
        socketService.on('appointment_new', (newAppt) => {
          const adapted = adaptAppointment(newAppt);
          setAppointments((prev) => {
            if (prev.some((a) => a.id === adapted.id)) return prev;
            notify.info(`Nouveau rendez-vous: ${adapted.userName}`, { duration: 5000 });
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            return [adapted, ...prev];
          });
        });

        socketService.on('message_new', (newMsg) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            notify.info(`Nouveau message de: ${newMsg.name}`, { duration: 5000 });
            queryClient.invalidateQueries({ queryKey: ['messages'] });
            const adaptedMsg: Message = {
              id: newMsg.id,
              fullName: newMsg.name,
              email: newMsg.email,
              phone: newMsg.phone || '',
              subject: newMsg.subject || '(Sans sujet)',
              message: newMsg.message,
              sentDate: new Date(newMsg.createdAt).getTime(),
              status: newMsg.status === 'unread' ? ('new' as const) : ('read' as const),
            };
            return [adaptedMsg, ...prev];
          });
        });

        socketService.on('appointment_delete', ({ id }) => {
          setAppointments((prev) => prev.filter((a) => a.id !== id));
          queryClient.invalidateQueries({ queryKey: ['appointments'] });
        });

        socketService.on('message_delete', ({ id }) => {
          setMessages((prev) => prev.filter((m) => m.id !== id));
          queryClient.invalidateQueries({ queryKey: ['messages'] });
        });
      } else {
        // Standard Client Listeners
        socketService.on('appointment_new', (newAppt) => {
          queryClient.invalidateQueries({ queryKey: ['appointments'] });
        });

        socketService.on('appointment_update', (updatedAppt) => {
          const statusText = updatedAppt.status === 'accepted' ? 'accepté' : updatedAppt.status === 'rejected' ? 'refusé' : 'mis en attente';
          notify.info(`Votre rendez-vous pour "${updatedAppt.property?.title || 'le bien'}" a été mis à jour (Statut: ${statusText}).`, { duration: 6000 });
          queryClient.invalidateQueries({ queryKey: ['appointments'] });
        });

        socketService.on('appointment_delete', ({ id }) => {
          notify.warning("Un de vos rendez-vous a été annulé par l'administration.", { duration: 6000 });
          queryClient.invalidateQueries({ queryKey: ['appointments'] });
        });
      }

      return () => {
        socketService.off('appointment_new');
        socketService.off('appointment_update');
        socketService.off('appointment_delete');
        socketService.off('message_new');
        socketService.off('message_delete');
        socketService.disconnect();
      };
    }
  }, [user, isAdminOrAgent, queryClient]);

  const refreshAdminData = async () => {
    if (isAdminOrAgent) {
      try {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['users'] }),
          queryClient.invalidateQueries({ queryKey: ['messages'] }),
          queryClient.invalidateQueries({ queryKey: ['appointments'] }),
          queryClient.invalidateQueries({ queryKey: ['properties', 'global'] }),
          queryClient.invalidateQueries({ queryKey: ['ratings'] }),
          queryClient.invalidateQueries({ queryKey: ['blogPosts'] }),
          queryClient.invalidateQueries({ queryKey: ['settings'] }),
        ]);
      } catch (error) {
        console.error('Failed to refresh admin data:', error);
      }
    }
  };

  const handleSelectProperty = (id: string) => {
    setSelectedPropertyId(id);
    handleNavigate('property-details', id);
  };

  const handleSelectBlogPost = async (id: string) => {
    try {
      const fullPost = await blogAPI.getById(id);
      setBlogPosts((prev) => prev.map((p) => (p.id === id ? fullPost : p)));
      setSelectedBlogPostId(id);
      handleNavigate('blog-post', id);
      queryClient.invalidateQueries({ queryKey: ['blogPosts'] });
    } catch (error) {
      console.error('Failed to fetch full blog post:', error);
      notify.error("Impossible de charger l'article complet.");
    }
  };

  const handleNewMessage = async (data: NewMessageInput) => {
    try {
      await messagesAPI.create({
        name: data.fullName || data.name,
        email: data.email,
        phone: data.phone,
        subject: data.subject,
        message: data.message,
        website: data.website || '', // honeypot — forwarded for backend validation
      });
      notify.success('Message envoyé.');
      if (user?.role === 'admin') {
        queryClient.invalidateQueries({ queryKey: ['messages'] });
      }
    } catch (error) {
      notify.error('Erreur envoi.');
      throw error;
    }
  };

  const handleNewAppointment = async (data: NewAppointmentInput) => {
    if (!user) return;
    try {
      await appointmentsAPI.create({
        clientName: user.name,
        clientEmail: user.email,
        clientPhone: user.phone || '',
        date: data.date,
        time: data.time,
        propertyId: data.propertyId,
        notes: data.message,
      });
      notify.success('Rendez-vous demandé.');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    } catch (error) {
      notify.error('Erreur rendez-vous.');
      throw error;
    }
  };

  const handleRateProperty = async (propertyId: string, value: number) => {
    if (!user) return;
    try {
      await ratingsAPI.create({ userName: user.name, propertyId, stars: value, userId: user.id });
      notify.success('Merci pour votre avis.');

      // Invalidate properties and ratings in the background
      queryClient.invalidateQueries({ queryKey: ['properties', 'global'] });
      queryClient.invalidateQueries({ queryKey: ['ratings'] });

      const updatedProp = await propertiesAPI.getById(propertyId);
      setProperties((prev) => prev.map((p) => (p.id === propertyId ? updatedProp : p)));
      return updatedProp;
    } catch (error) {
      notify.error('Erreur avis.');
      throw error;
    }
  };

  const handleCancelAppointment = async (id: string) => {
    const apt = appointments.find((a) => a.id === id);
    try {
      if (apt && apt.status === 'rejected') {
        await appointmentsAPI.delete(id);
        setAppointments((prev) => prev.filter((a) => a.id !== id));
        notify.success('Rendez-vous supprimé avec succès.');
      } else {
        const updated = await appointmentsAPI.update(id, { status: 'rejected' });
        setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
        notify.success('Rendez-vous annulé avec succès.');
      }
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    } catch (error) {
      console.error('Failed to cancel/delete appointment:', error);
      notify.error('Une erreur est survenue.');
      throw error;
    }
  };

  const handleUpdateAppointment = async (id: string, data: Partial<Appointment>) => {
    try {
      const updated = await appointmentsAPI.update(id, data);
      setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
      notify.success('Rendez-vous modifié avec succès.');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    } catch (error) {
      console.error('Failed to update appointment:', error);
      notify.error('Erreur lors de la modification.');
      throw error;
    }
  };

  return (
    <DataContext.Provider
      value={{
        properties,
        setProperties,
        totalProperties,
        availableLocations,
        setAvailableLocations,
        adminLocations,
        setAdminLocations,
        blogPosts,
        setBlogPosts,
        allUsers,
        setAllUsers,
        messages,
        setMessages,
        appointments,
        setAppointments,
        ratings,
        setRatings,
        siteSettings,
        setSiteSettings,
        isLoading,
        refreshAdminData,
        handleSelectProperty,
        handleSelectBlogPost,
        handleNewMessage,
        handleNewAppointment,
        handleRateProperty,
        handleCancelAppointment,
        handleUpdateAppointment,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
