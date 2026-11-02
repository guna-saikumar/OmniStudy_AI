import axios from 'axios';

// Normalize API URL to always ensure '/api' suffix regardless of how VITE_API_URL is configured on Render
const rawUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5001/api';
export const API_BASE_URL = rawUrl.replace(/\/+$/, '').endsWith('/api')
    ? rawUrl.replace(/\/+$/, '')
    : `${rawUrl.replace(/\/+$/, '')}/api`;

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to include the JWT token
api.interceptors.request.use(
    (config) => {
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
            try {
                const { token } = JSON.parse(userInfo);
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            } catch {
                localStorage.removeItem('userInfo');
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle 401 errors (expired/invalid token)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Clear stale session
            localStorage.removeItem('userInfo');
            
            // If already on login, do nothing
            if (window.location.pathname === '/login') return Promise.reject(error);

            // Construct bulletproof redirect URL so users return to their summary/shared link
            // after the forced login (especially important for WhatsApp/shared links)
            const search = new URLSearchParams();
            search.set('redirect', window.location.pathname + window.location.search);
            
            // Hard redirect as a last resort to clear stale state
            window.location.href = `/login?${search.toString()}`;
        }
        return Promise.reject(error);
    }
);

export default api;

