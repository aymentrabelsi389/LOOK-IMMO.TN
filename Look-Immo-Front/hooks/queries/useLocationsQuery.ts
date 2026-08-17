import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Location } from '@/types';
import { locationsAPI } from '@/services/api';

export const useLocationsQuery = () => {
  const queryClient = useQueryClient();

  const { data: qLocations, isFetched, isLoading, refetch } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationsAPI.getAll(),
    staleTime: 10 * 60 * 1000,
  });

  const adminLocations = qLocations ?? [];
  const availableLocations = useMemo(() => (qLocations ?? []).map((l: Location) => l.name), [qLocations]);

  const setAdminLocations: React.Dispatch<React.SetStateAction<Location[]>> = (updater) => {
    queryClient.setQueryData<Location[]>(['locations'], (old) => {
      const current = old ?? [];
      return typeof updater === 'function' ? (updater as (prev: Location[]) => Location[])(current) : updater;
    });
  };

  const setAvailableLocations: React.Dispatch<React.SetStateAction<string[]>> = () => {};

  return {
    adminLocations,
    availableLocations,
    isFetched,
    isLoading,
    refetch,
    setAdminLocations,
    setAvailableLocations,
  };
};
