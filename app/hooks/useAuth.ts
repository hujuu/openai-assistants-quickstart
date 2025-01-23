"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation'; // pathを/navigationに変更

export const useAuth = () => {
    const router = useRouter();

    async function checkAuth() {
        try {
            const response = await fetch('/api/auth/me', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error('Not authenticated');
            }

            return await response.json();

        } catch (error) {
            router.push('/login');
            return null;
        }
    }

    useEffect(() => {
        checkAuth();
    }, []);

    return { checkAuth };
};
