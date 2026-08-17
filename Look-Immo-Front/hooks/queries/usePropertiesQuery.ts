import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Property } from '@/types';
import { propertiesAPI, shapeProperties } from '@/services/api';
import { useAdmin } from '@/hooks/useAdmin';

export const usePropertiesQuery = () => {
  const queryClient = useQueryClient();
  const { isAdminOrAgent } = useAdmin();

  const queryKey = useMemo(() => ['properties', 'global', isAdminOrAgent] as const, [isAdminOrAgent]);

  const { data: result, isFetched, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: () =>
      propertiesAPI.getAll(isAdminOrAgent ? { noLimit: 'true' } : { page: 1, limit: 24, excludeSold: 'true' }),
    staleTime: 5 * 60 * 1000,
  });

  const properties = useMemo(() => (result ? shapeProperties(result.data) : []), [result]);
  const totalProperties = result?.pagination.total ?? 0;

  const setProperties: React.Dispatch<React.SetStateAction<Property[]>> = (updater) => {
    queryClient.setQueryData(queryKey, (old: typeof result) => {
      if (!old) return old;
      const currentShaped = shapeProperties(old.data);
      const next = typeof updater === 'function' ? (updater as (prev: Property[]) => Property[])(currentShaped) : updater;
      return { ...old, data: next };
    });
  };

  return {
    properties,
    totalProperties,
    isFetched,
    isLoading,
    refetch,
    setProperties,
    queryKey,
  };
};
