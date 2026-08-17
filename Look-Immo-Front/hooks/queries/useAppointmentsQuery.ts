import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Appointment, User } from '@/types';
import { appointmentsAPI } from '@/services/api';

export const useAppointmentsQuery = (user: User | null) => {
  const queryClient = useQueryClient();

  const { data: qAppointments, isFetched, isLoading, refetch } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => appointmentsAPI.getAll(),
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  const appointments = qAppointments ?? [];

  const setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>> = (updater) => {
    queryClient.setQueryData<Appointment[]>(['appointments'], (old) => {
      const current = old ?? [];
      return typeof updater === 'function' ? (updater as (prev: Appointment[]) => Appointment[])(current) : updater;
    });
  };

  return {
    appointments,
    isFetched,
    isLoading,
    refetch,
    setAppointments,
  };
};
