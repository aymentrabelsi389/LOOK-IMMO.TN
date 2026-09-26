import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SiteSettings } from '@/types';
import { settingsAPI } from '@/services/api';

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  websiteName: 'Look Immo',
  contactEmail: 'contact@lookimmo.tn',
  phoneNumber: '+216 70 123 456',
  address: 'Tunis, Tunisie',
  socialMedia: { instagram: '', facebook: '', whatsapp: '' },
  workingHours: { weekdays: '', saturday: '', sunday: '' },
};

export const useSettingsQuery = () => {
  const queryClient = useQueryClient();

  const { data: qSettings, isFetched, isLoading, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.get(),
    staleTime: 10 * 60 * 1000,
  });

  const siteSettings = qSettings === undefined ? null : qSettings ?? DEFAULT_SITE_SETTINGS;

  const setSiteSettings: React.Dispatch<React.SetStateAction<SiteSettings | null>> = (updater) => {
    queryClient.setQueryData(['settings'], (old: SiteSettings | null | undefined) => {
      const current = old === undefined ? null : old ?? DEFAULT_SITE_SETTINGS;
      return typeof updater === 'function' ? (updater as (prev: SiteSettings | null) => SiteSettings | null)(current) : updater;
    });
  };

  return {
    siteSettings,
    isFetched,
    isLoading,
    refetch,
    setSiteSettings,
  };
};
