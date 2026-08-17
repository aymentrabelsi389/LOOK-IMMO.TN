import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BlogPost } from '@/types';
import { blogAPI } from '@/services/api';

export const useBlogPostsQuery = () => {
  const queryClient = useQueryClient();

  const { data: qBlogPosts, isFetched, isLoading, refetch } = useQuery({
    queryKey: ['blogPosts'],
    queryFn: () => blogAPI.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const blogPosts = qBlogPosts ?? [];

  const setBlogPosts: React.Dispatch<React.SetStateAction<BlogPost[]>> = (updater) => {
    queryClient.setQueryData<BlogPost[]>(['blogPosts'], (old) => {
      const current = old ?? [];
      return typeof updater === 'function' ? (updater as (prev: BlogPost[]) => BlogPost[])(current) : updater;
    });
  };

  return {
    blogPosts,
    isFetched,
    isLoading,
    refetch,
    setBlogPosts,
  };
};
