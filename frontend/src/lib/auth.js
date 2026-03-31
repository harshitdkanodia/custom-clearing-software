import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
    headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            logout();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export function getToken() {
    return localStorage.getItem('cha_token');
}

export function getUser() {
    const userStr = localStorage.getItem('cha_user');
    if (!userStr) return null;
    try {
        return JSON.parse(userStr);
    } catch {
        return null;
    }
}

export function setAuth(token, user) {
    localStorage.setItem('cha_token', token);
    localStorage.setItem('cha_user', JSON.stringify(user));
}

export function logout() {
    localStorage.removeItem('cha_token');
    localStorage.removeItem('cha_user');
}

export function isAuthenticated() {
    return !!getToken();
}

export function hasRole(...roles) {
    const user = getUser();
    return user && roles.includes(user.role);
}

export default api;
