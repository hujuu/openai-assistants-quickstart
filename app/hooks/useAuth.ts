import { useQuery } from '@tanstack/react-query';

export const useAuthStatus = () => {
    return useQuery({
        queryKey: ['authStatus'],
        queryFn: async () => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/users/me`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Not authenticated');
            }

            return response.json();
        },
        // キャッシュの設定
        staleTime: 5 * 60 * 1000,
        gcTime: 6 * 60 * 1000,
        retry: false,
    });
};
