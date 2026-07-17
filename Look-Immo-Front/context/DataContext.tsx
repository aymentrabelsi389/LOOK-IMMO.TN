import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Property, User, SiteSettings, Message, Appointment, BlogPost, Rating
} from '../types';
import {
  propertiesAPI, locationsAPI, blogAPI, settingsAPI, ratingsAPI,
  messagesAPI, appointmentsAPI, statsAPI, usersAPI, adaptAppointment
} from '../services/api';
import { socketService } from '../services/socket';
import { notify } from '../services/notificationStore';
import { useAuthStore } from '../stores/useAuthStore';
import { useUI } from './UIContext';

interface DataContextType {
  properties: Property[];
  setProperties: React.Dispatch<React.SetStateAction<Property[]>>;
  totalProperties: number;
  availableLocations: string[];
  setAvailableLocations: React.Dispatch<React.SetStateAction<string[]>>;
  adminLocations: any[];
  setAdminLocations: React.Dispatch<React.SetStateAction<any[]>>;
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
  handleNewMessage: (data: any) => Promise<void>;
  handleNewAppointment: (data: any) => Promise<void>;
  handleRateProperty: (propertyId: string, value: number) => Promise<any>;
  handleCancelAppointment: (id: string) => Promise<void>;
  handleUpdateAppointment: (id: string, data: Partial<Appointment>) => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const user = useAuthStore((s) => s.user);
  const { handleNavigate, setSelectedPropertyId, setSelectedBlogPostId } = useUI();
  const queryClient = useQueryClient();

  const isAdminOrAgent = user?.role === 'admin' || user?.role === 'agent';

  // Data States (Keep for backwards compatibility and local mutations)
  const [properties, setProperties] = useState<Property[]>([]);
  const [totalProperties, setTotalProperties] = useState<number>(0);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [adminLocations, setAdminLocations] = useState<any[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── TanStack Queries ──

  // Properties Query: 5 minutes staleTime — fetches first page only for global context,
  // or all properties for admins/agents so they can manage the full list.
  // (ListingsPage manages its own server-side paginated query independently)
  const { data: qPropertiesResult, isLoading: isPropertiesLoading, isFetched: isPropertiesFetched } = useQuery({
    queryKey: ['properties', 'global', isAdminOrAgent],
    queryFn: () => propertiesAPI.getAll(isAdminOrAgent ? { noLimit: 'true' } : { page: 1, limit: 24 }),
    staleTime: 5 * 60 * 1000,
  });

  // Locations Query: 10 minutes staleTime
  const { data: qLocations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationsAPI.getAll(),
    staleTime: 10 * 60 * 1000,
  });

  // Blog Posts Query: 5 minutes staleTime
  const { data: qBlogPosts } = useQuery({
    queryKey: ['blogPosts'],
    queryFn: () => blogAPI.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  // Settings Query: 10 minutes staleTime
  const { data: qSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.get(),
    staleTime: 10 * 60 * 1000,
  });

  // Ratings Query: 1 minute staleTime
  const { data: qRatings } = useQuery({
    queryKey: ['ratings'],
    queryFn: () => ratingsAPI.getAll(),
    staleTime: 60 * 1000,
  });

  // Users Query: 1 minute staleTime, enabled for admin/agent only
  const { data: qUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersAPI.getAll(),
    enabled: isAdminOrAgent,
    staleTime: 60 * 1000,
  });

  // Messages Query: 30 seconds staleTime, enabled for admin/agent only
  const { data: qMessages } = useQuery({
    queryKey: ['messages'],
    queryFn: () => messagesAPI.getAll(),
    enabled: isAdminOrAgent,
    staleTime: 30 * 1000,
  });

  // Appointments Query: 30 seconds staleTime, enabled for logged-in users
  const { data: qAppointments } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => appointmentsAPI.getAll(),
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  // ── Sync Effects (Query Data -> Context State) ──

  // Sync properties (global first-page slice for homepage featured cards, map, etc.)
  useEffect(() => {
    if (qPropertiesResult) {
      setProperties(
        qPropertiesResult.data.map((p: any) => ({
          ...p,
          isNew:
            p.isNew !== undefined
              ? p.isNew
              : new Date(p.createdAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000,
          isFeatured: p.isFeatured !== undefined ? p.isFeatured : false,
          isHotDeal: p.isHotDeal || false,
          ratings: p.ratings || [],
          averageRating: p.averageRating || 0,
          ratingsCount: p.ratingsCount || 0,
        }))
      );
      setTotalProperties(qPropertiesResult.pagination.total);
    }
  }, [qPropertiesResult]);

  // Sync locations
  useEffect(() => {
    if (qLocations) {
      setAdminLocations(qLocations);
      setAvailableLocations(qLocations.map((l: any) => l.name));
    }
  }, [qLocations]);

  // Sync blog posts
  useEffect(() => {
    if (qBlogPosts) {
      setBlogPosts(qBlogPosts);
    }
  }, [qBlogPosts]);

  // Sync settings
  useEffect(() => {
    if (qSettings) {
      setSiteSettings(qSettings);
    } else if (qSettings === null) {
      setSiteSettings({
        websiteName: 'Look Immo',
        contactEmail: 'contact@lookimmo.tn',
        phoneNumber: '+216 70 123 456',
        address: 'Tunis, Tunisie',
        socialMedia: { instagram: '', facebook: '', whatsapp: '' },
        workingHours: { weekdays: '', saturday: '', sunday: '' },
      });
    }
  }, [qSettings]);

  // Sync ratings
  useEffect(() => {
    if (qRatings) {
      setRatings(
        qRatings.map((r: any) => ({
          ...r,
          value: r.stars,
          timestamp: new Date(r.createdAt).getTime(),
          propertyTitle: r.property?.title || r.propertyTitle || 'Propriété inconnue',
          userId: r.userId || r.userName,
        }))
      );
    }
  }, [qRatings]);

  // Sync users
  useEffect(() => {
    if (qUsers) {
      setAllUsers(qUsers);
    }
  }, [qUsers]);

  // Sync messages
  useEffect(() => {
    if (qMessages) {
      setMessages(qMessages as any);
    }
  }, [qMessages]);

  // Sync appointments
  useEffect(() => {
    if (qAppointments) {
      setAppointments(qAppointments);
    }
  }, [qAppointments]);

  // Only show global loader on first load, not on background refetches
  useEffect(() => {
    if (isPropertiesFetched) {
      setIsLoading(false);
    } else {
      setIsLoading(isPropertiesLoading);
    }
  }, [isPropertiesFetched, isPropertiesLoading]);

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

  const handleNewMessage = async (data: any) => {
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

  const handleNewAppointment = async (data: any) => {
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
