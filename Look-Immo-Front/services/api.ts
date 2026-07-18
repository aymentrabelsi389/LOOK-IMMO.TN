import { BlogPost } from '../types';

import { notify } from './notificationStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// ── Session token (fallback when cross-origin cookies are blocked) ──
const TOKEN_KEY = 'lookimmo_access_token';
const getStoredToken = () => sessionStorage.getItem(TOKEN_KEY);
const setStoredToken = (t: string | null) => t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY);

// All requests include credentials (HTTP-only cookies are sent automatically)
const defaultOptions: RequestInit = {
    credentials: 'include',
};

// Attempt to silently refresh access token
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

const tryRefreshToken = (): Promise<boolean> => {
    if (isRefreshing && refreshPromise) return refreshPromise;
    isRefreshing = true;
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
    })
        .then(async (res) => {
            if (!res.ok) return false;
            try {
                const data = await res.json();
                if (data.accessToken) setStoredToken(data.accessToken);
            } catch { /* ignore */ }
            return true;
        })
        .catch(() => false)
        .finally(() => {
            isRefreshing = false;
            refreshPromise = null;
        });
    return refreshPromise;
};

// List of silent background endpoints — never show automatic error toasts for these
const silentUrls = [
  '/auth/me',
  '/auth/refresh',
  '/stats/track-visit',
  '/notifications/unread-count',
  '/favorites/check/',
];

const handleApiError = (url: string, errorMsg: string) => {
  const isSilent =
    silentUrls.some(s => url.includes(s)) ||
    errorMsg === 'SESSION_EXPIRED' ||
    errorMsg === 'Invalid or expired token' ||
    errorMsg === 'Authentication required' ||
    errorMsg.startsWith('Request failed with status 401');
  if (!isSilent) {
    notify.error(errorMsg);
  }
};

const apiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(options.headers);
    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }
    const storedToken = getStoredToken();
    if (storedToken) {
        headers.set('Authorization', `Bearer ${storedToken}`);
    }

    const res = await fetch(`${API_BASE_URL}${url}`, {
        ...defaultOptions,
        ...options,
        headers,
    });

    if (res.status === 401) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
            const newToken = getStoredToken();
            const retryHeaders = new Headers(options.headers);
            if (!retryHeaders.has('Content-Type')) {
                retryHeaders.set('Content-Type', 'application/json');
            }
            if (newToken) {
                retryHeaders.set('Authorization', `Bearer ${newToken}`);
            }
            const retryRes = await fetch(`${API_BASE_URL}${url}`, {
                ...defaultOptions,
                ...options,
                headers: retryHeaders,
            });
            if (!retryRes.ok) {
                // Refresh succeeded but retry still fails — treat as session expired (silent)
                throw new Error('SESSION_EXPIRED');
            }
            return retryRes;
        } else {
            setStoredToken(null); // clear stale token
            throw new Error('SESSION_EXPIRED');
        }
    }

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = errorData.error || `Request failed with status ${res.status}`;
        handleApiError(url, errorMsg);
        throw new Error(errorMsg);
    }

    return res;
};

// Multipart (file upload) — no Content-Type header (let browser set boundary)
const apiFetchMultipart = async (url: string, options: RequestInit = {}): Promise<Response> => {
    let res = await fetch(`${API_BASE_URL}${url}`, {
        ...defaultOptions,
        ...options,
    });

    if (res.status === 401) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
            res = await fetch(`${API_BASE_URL}${url}`, {
                ...defaultOptions,
                ...options,
            });
        } else {
            throw new Error('SESSION_EXPIRED');
        }
    }

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = errorData.error || `Upload failed with status ${res.status}`;
        handleApiError(url, errorMsg);
        throw new Error(errorMsg);
    }

    return res;
};

// ==================== AUTH API ====================
export const authAPI = {
    register: async (data: { name: string; email: string; password: string; phone?: string }) => {
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Registration failed');
        if (result.accessToken) setStoredToken(result.accessToken);
        return result.user;
    },

    login: async (data: { email: string; password: string }) => {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Login failed');
        if (result.accessToken) setStoredToken(result.accessToken);
        return result.user;
    },

    logout: async () => {
        try {
            await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                credentials: 'include',
            });
        } catch {
            // Ignore network errors on logout
        }
        setStoredToken(null);
        localStorage.removeItem('lookimmo_token');
        localStorage.removeItem('lookimmo_user');
    },

    getMe: async () => {
        const res = await apiFetch('/auth/me');
        return res.json();
    },

    refresh: async (): Promise<boolean> => tryRefreshToken(),

    isAuthenticated: async (): Promise<boolean> => {
        try {
            await apiFetch('/auth/me');
            return true;
        } catch {
            return false;
        }
    },

    forgotPassword: async (email: string) => {
        const res = await apiFetch('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
        return res.json();
    },

    verifyResetCode: async (email: string, code: string) => {
        const res = await apiFetch('/auth/verify-reset-code', {
            method: 'POST',
            body: JSON.stringify({ email, code }),
        });
        return res.json();
    },

    resetPassword: async (data: { email: string; code: string; password: string }) => {
        const res = await apiFetch('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return res.json();
    },
};

// ==================== USERS API ====================
export const usersAPI = {
    getAll: async (params?: { role?: string; search?: string }) => {
        const query = new URLSearchParams(params as Record<string, string>).toString();
        const res = await apiFetch(`/users${query ? `?${query}` : ''}`);
        const users = await res.json();

        return users.map((user: any) => ({
            ...user,
            ratings: user.ratings ? user.ratings.map((r: any) => ({
                id: r.id,
                propertyId: r.property?.id || 'unknown',
                propertyTitle: r.property?.title || 'Propriété inconnue',
                userId: user.id,
                userName: user.name,
                userEmail: user.email,
                value: r.stars,
                timestamp: new Date(r.createdAt).getTime(),
                comment: r.comment,
                viewedByAdmin: true,
            })) : [],
        }));
    },

    getById: async (id: string) => {
        const res = await apiFetch(`/users/${id}`);
        const user = await res.json();

        return {
            ...user,
            ratings: user.ratings ? user.ratings.map((r: any) => ({
                id: r.id,
                propertyId: r.property?.id || 'unknown',
                propertyTitle: r.property?.title || 'Propriété inconnue',
                userId: user.id,
                userName: user.name,
                userEmail: user.email,
                value: r.stars,
                timestamp: new Date(r.createdAt).getTime(),
                comment: r.comment,
                viewedByAdmin: true,
            })) : [],
        };
    },

    create: async (data: any) => {
        const res = await apiFetch('/users', { method: 'POST', body: JSON.stringify(data) });
        return res.json();
    },

    update: async (id: string, data: any) => {
        const res = await apiFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
        return res.json();
    },

    delete: async (id: string) => {
        const res = await apiFetch(`/users/${id}`, { method: 'DELETE' });
        return res.json();
    },
};

// Helper to resolve backend image paths to full URLs
// BACKEND_URL: empty string = current origin (proxied by Vite in dev, same server in prod)
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (API_BASE_URL.startsWith('http') ? API_BASE_URL.replace('/api', '') : '');
export const resolveImage = (img: string) => (img && img.startsWith('/') && !img.startsWith('http')) ? `${BACKEND_URL}${img}` : img;

// Helper to adapt Backend Property to Frontend Property
const adaptProperty = (backendProp: any): any => {
    let realType = (backendProp.category || 'apartment').toLowerCase();
    let featuresRaw = backendProp.features;
    let features = {
        bedrooms: 0,
        bathrooms: 0,
        area: 0,
        parking: false,
        pool: false,
        garden: false,
        heating: false,
        airConditioning: false,
        security: false
    };
    if (featuresRaw && typeof featuresRaw === 'object') {
        features = { ...features, ...featuresRaw };
        if ((features as any).propertyPlan) {
            (features as any).propertyPlan = resolveImage((features as any).propertyPlan);
        }
        if ((features as any).ownerPaper) {
            (features as any).ownerPaper = resolveImage((features as any).ownerPaper);
        }
    }
    let cleanDescription = backendProp.description || '';

    if (backendProp.description) {
        const typeMatch = backendProp.description.match(/\[METADATA:TYPE=(.*?)\]/);
        if (typeMatch) realType = typeMatch[1];

        const featuresMatch = backendProp.description.match(/\[METADATA:FEATURES=(.*?)\]/);
        if (featuresMatch) {
            try { features = JSON.parse(featuresMatch[1]); } catch (e) { console.error('Failed to parse features metadata', e); }
        }

        if (!typeMatch) {
            const legacyMatch = backendProp.description.match(/\[Type:\s*(.*?)\]/);
            if (legacyMatch) realType = legacyMatch[1].toLowerCase();
        }

        cleanDescription = backendProp.description
            .replace(/\[METADATA:.*?\]/g, '')
            .replace(/\[Type:.*?\]/g, '')
            .trim();
    }

    if (backendProp.location && !backendProp.city) return backendProp;

    const adapted = {
        ...backendProp,
        images: (backendProp.images || []).map(resolveImage),
        description: cleanDescription,
        type: realType,
        listingType: backendProp.type,
        status: backendProp.status || 'available',
        isFeatured: backendProp.isFeatured,
        isNew: backendProp.isNew,
        ratings: backendProp.ratings ? backendProp.ratings.map((r: any) => ({
            ...r,
            value: r.stars !== undefined ? r.stars : r.value,
            userId: r.userId || r.userName || 'unknown',
        })) : [],
        get ratingsCount() { 
            return backendProp.ratingsCount !== undefined ? backendProp.ratingsCount : this.ratings.length; 
        },
        get averageRating() {
            if (backendProp.averageRating !== undefined) return backendProp.averageRating;
            return this.ratings.length > 0
                ? this.ratings.reduce((acc: number, r: any) => acc + r.value, 0) / this.ratings.length
                : 0;
        },
        location: {
            address: backendProp.address || backendProp.city,
            city: backendProp.city || 'Tunis',
            lat: backendProp.latitude || 48.8566,
            lng: backendProp.longitude || 2.3522,
        },
        features: features,
        displayOrder: backendProp.displayOrder || 0,
        createdAt: backendProp.createdAt ? new Date(backendProp.createdAt).getTime() : Date.now(),
    };

    return adapted;
};

// Helper to adapt Backend Blog Post to Frontend Blog Post
const adaptBlogPost = (backendPost: any): BlogPost => {
    return {
        ...backendPost,
        image: resolveImage(backendPost.image),
        createdAt: backendPost.createdAt ? new Date(backendPost.createdAt).getTime() : Date.now(),
        updatedAt: backendPost.updatedAt ? new Date(backendPost.updatedAt).getTime() : Date.now(),
        content: backendPost.content || '',
    };
};

// Helper to adapt Backend Appointment to Frontend Appointment
export const adaptAppointment = (backendApt: any): any => {
    return {
        ...backendApt,
        userName: backendApt.clientName || 'Utilisateur inconnu',
        userEmail: backendApt.clientEmail || '',
        userPhone: backendApt.clientPhone || '',
        propertyTitle: backendApt.property?.title || 'Propriété inconnue',
        createdAt: backendApt.createdAt ? new Date(backendApt.createdAt).getTime() : Date.now(),
    };
};

// ==================== PROPERTIES API ====================
export const propertiesAPI = {
    getAll: async (params?: Record<string, string | number | undefined>): Promise<{ data: any[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> => {
        const cleanParams: Record<string, string> = {};
        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                if (v !== undefined && v !== null && v !== '' && v !== 'all' && v !== '0') {
                    cleanParams[k] = String(v);
                }
            });
        }
        const query = Object.keys(cleanParams).length ? new URLSearchParams(cleanParams).toString() : '';
        const res = await apiFetch(`/properties${query ? `?${query}` : ''}`);
        const result = await res.json();
        // Always return paginated shape
        const data = result.data ?? result;
        const pagination = result.pagination ?? { total: Array.isArray(data) ? data.length : 0, page: 1, limit: 24, totalPages: 1 };
        return { data: Array.isArray(data) ? data.map(adaptProperty) : [], pagination };
    },

    // Admin escape hatch — fetches all properties without pagination (for reorder, map, etc.)
    getAllUnpaginated: async (params?: Record<string, string>): Promise<any[]> => {
        const baseParams = { noLimit: 'true', ...(params || {}) };
        const query = new URLSearchParams(baseParams).toString();
        const res = await apiFetch(`/properties?${query}`);
        const result = await res.json();
        const data = result.data ?? result;
        return Array.isArray(data) ? data.map(adaptProperty) : [];
    },

    getById: async (id: string) => {
        const res = await apiFetch(`/properties/${id}`);
        const data = await res.json();
        return adaptProperty(data);
    },

    create: async (data: any) => {
        const res = await apiFetch('/properties', { method: 'POST', body: JSON.stringify(data) });
        const newData = await res.json();
        return adaptProperty(newData);
    },

    update: async (id: string, data: any) => {
        const res = await apiFetch(`/properties/${id}`, { method: 'PUT', body: JSON.stringify(data) });
        const updatedData = await res.json();
        return adaptProperty(updatedData);
    },

    delete: async (id: string) => {
        const res = await apiFetch(`/properties/${id}`, { method: 'DELETE' });
        return res.json();
    },

    updateOrder: async (updates: { id: string; displayOrder: number }[]) => {
        const res = await apiFetch('/properties/reorder', {
            method: 'PUT',
            body: JSON.stringify({ updates }),
        });
        return res.json();
    },
};

// ==================== APPOINTMENTS API ====================
export const appointmentsAPI = {
    getAll: async (params?: Record<string, string>) => {
        const query = params ? new URLSearchParams(params).toString() : '';
        const res = await apiFetch(`/appointments${query ? `?${query}` : ''}`);
        const data = await res.json();
        return Array.isArray(data) ? data.map(adaptAppointment) : [];
    },

    getById: async (id: string) => {
        const res = await apiFetch(`/appointments/${id}`);
        const data = await res.json();
        return adaptAppointment(data);
    },

    create: async (data: any) => {
        const res = await apiFetch('/appointments', { method: 'POST', body: JSON.stringify(data) });
        const newData = await res.json();
        return adaptAppointment(newData);
    },

    update: async (id: string, data: any) => {
        const res = await apiFetch(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) });
        const updatedData = await res.json();
        return adaptAppointment(updatedData);
    },

    delete: async (id: string) => {
        const res = await apiFetch(`/appointments/${id}`, { method: 'DELETE' });
        return res.json();
    },
};

// ==================== MESSAGES API ====================
export const messagesAPI = {
    getAll: async (params?: Record<string, string>) => {
        const query = params ? new URLSearchParams(params).toString() : '';
        const res = await apiFetch(`/messages${query ? `?${query}` : ''}`);
        const data = await res.json();
        return Array.isArray(data) ? data.map((m: any) => ({
            id: m.id,
            fullName: m.name,
            email: m.email,
            phone: m.phone || '',
            subject: m.subject || '(Sans sujet)',
            message: m.message,
            sentDate: new Date(m.createdAt).getTime(),
            status: m.status === 'unread' ? 'new' : 'read',
        })) : [];
    },

    create: async (data: { name?: string; fullName?: string; email: string; phone?: string; subject?: string; message: string; website?: string }) => {
        const res = await apiFetch('/messages', { method: 'POST', body: JSON.stringify(data) });
        return res.json();
    },

    update: async (id: string, data: any) => {
        const res = await apiFetch(`/messages/${id}`, { method: 'PUT', body: JSON.stringify(data) });
        return res.json();
    },

    delete: async (id: string) => {
        const res = await apiFetch(`/messages/${id}`, { method: 'DELETE' });
        return res.json();
    },
};



// ==================== TRANSACTIONS API ====================
export const transactionsAPI = {
    getAll: async () => {
        const res = await apiFetch('/transactions');
        return res.json();
    },

    create: async (data: {
        type: string;
        propertyTitle: string;
        clientName: string;
        date?: string;
        commission: number;
        paymentReceived: boolean;
        paymentMode: string;
        notes?: string;
    }) => {
        const res = await apiFetch('/transactions', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return res.json();
    },

    update: async (id: string, data: Partial<{
        type: string;
        propertyTitle: string;
        clientName: string;
        date: string;
        commission: number;
        paymentReceived: boolean;
        paymentMode: string;
        notes: string;
    }>) => {
        const res = await apiFetch(`/transactions/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        return res.json();
    },

    delete: async (id: string) => {
        const res = await apiFetch(`/transactions/${id}`, { method: 'DELETE' });
        return res.json();
    }
};

// ==================== RATINGS API ====================
export const ratingsAPI = {
    getAll: async (params?: Record<string, string>) => {
        const query = params ? new URLSearchParams(params).toString() : '';
        const res = await apiFetch(`/ratings${query ? `?${query}` : ''}`);
        return res.json();
    },

    create: async (data: { userName: string; propertyId: string; stars: number; comment?: string; userId?: string }) => {
        const res = await apiFetch('/ratings', { method: 'POST', body: JSON.stringify(data) });
        return res.json();
    },

    delete: async (id: string) => {
        const res = await apiFetch(`/ratings/${id}`, { method: 'DELETE' });
        return res.json();
    },
};

// ==================== LOCATIONS API ====================
export const locationsAPI = {
    getAll: async (search?: string) => {
        const query = search ? `?search=${encodeURIComponent(search)}` : '';
        const res = await apiFetch(`/locations${query}`);
        return res.json();
    },

    create: async (data: any) => {
        const res = await apiFetch('/locations', { method: 'POST', body: JSON.stringify(data) });
        return res.json();
    },

    update: async (id: string, data: any) => {
        const res = await apiFetch(`/locations/${id}`, { method: 'PUT', body: JSON.stringify(data) });
        return res.json();
    },

    updateOrder: async (updates: { id: string; displayOrder: number }[]) => {
        const res = await apiFetch('/locations/reorder', { method: 'PUT', body: JSON.stringify({ updates }) });
        return res.json();
    },

    delete: async (id: string) => {
        const res = await apiFetch(`/locations/${id}`, { method: 'DELETE' });
        return res.json();
    },
};

// ==================== BLOG API ====================
export const blogAPI = {
    getAll: async (params?: Record<string, string>) => {
        const query = params ? new URLSearchParams(params).toString() : '';
        const res = await apiFetch(`/blog${query ? `?${query}` : ''}`);
        const result = await res.json();
        const data = result.data || result;
        return Array.isArray(data) ? data.map(adaptBlogPost) : [];
    },

    getById: async (id: string) => {
        const res = await apiFetch(`/blog/${id}`);
        const data = await res.json();
        return adaptBlogPost(data);
    },

    create: async (data: any) => {
        const res = await apiFetch('/blog', { method: 'POST', body: JSON.stringify(data) });
        return res.json();
    },

    update: async (id: string, data: any) => {
        const res = await apiFetch(`/blog/${id}`, { method: 'PUT', body: JSON.stringify(data) });
        return res.json();
    },

    delete: async (id: string) => {
        const res = await apiFetch(`/blog/${id}`, { method: 'DELETE' });
        return res.json();
    },
};

// ==================== NOTIFICATIONS API ====================
export const notificationsAPI = {
    getAll: async (params?: { filter?: string; page?: number; limit?: number }) => {
        const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
        const res = await apiFetch(`/notifications${query}`);
        return res.json();
    },

    getUnreadCount: async () => {
        const res = await apiFetch('/notifications/unread-count');
        return res.json();
    },

    markAsRead: async (id: string) => {
        const res = await apiFetch(`/notifications/${id}/read`, { method: 'PUT' });
        return res.json();
    },

    markAllAsRead: async () => {
        const res = await apiFetch('/notifications/mark-all-read', { method: 'PUT' });
        return res.json();
    },

    delete: async (id: string) => {
        const res = await apiFetch(`/notifications/${id}`, { method: 'DELETE' });
        return res.json();
    },

    deleteRead: async () => {
        const res = await apiFetch('/notifications/read', { method: 'DELETE' });
        return res.json();
    },

    deleteAll: async () => {
        const res = await apiFetch('/notifications/all', { method: 'DELETE' });
        return res.json();
    },
};

// ==================== STATS API ====================
export const statsAPI = {
    getDashboard: async () => {
        const res = await apiFetch('/stats/dashboard');
        return res.json();
    },

    getPropertyStats: async () => {
        const res = await apiFetch('/stats/properties');
        return res.json();
    },

    getUserStats: async () => {
        const res = await apiFetch('/stats/users');
        return res.json();
    },
    trackVisit: async (path: string = '/') => {
        try {
            await apiFetch('/stats/track-visit', { 
                method: 'POST', 
                body: JSON.stringify({ path }) 
            });
        } catch {
            // Ignore tracking errors
        }
    }
};

// ==================== FAVORITES API ====================
export const favoritesAPI = {
    getAll: async () => {
        const res = await apiFetch('/favorites');
        return res.json();
    },

    add: async (propertyId: string) => {
        const res = await apiFetch('/favorites', { method: 'POST', body: JSON.stringify({ propertyId }) });
        return res.json();
    },

    remove: async (propertyId: string) => {
        const res = await apiFetch(`/favorites/${propertyId}`, { method: 'DELETE' });
        return res.json();
    },

    check: async (propertyId: string) => {
        const res = await apiFetch(`/favorites/check/${propertyId}`);
        return res.json();
    },
};

// ==================== VISITS API ====================
export const visitsAPI = {
    getAll: async (params?: Record<string, string>) => {
        const query = params ? new URLSearchParams(params).toString() : '';
        const res = await apiFetch(`/visits${query ? `?${query}` : ''}`);
        return res.json();
    },

    create: async (data: any) => {
        const res = await apiFetch('/visits', { method: 'POST', body: JSON.stringify(data) });
        return res.json();
    },

    delete: async (id: string) => {
        const res = await apiFetch(`/visits/${id}`, { method: 'DELETE' });
        return res.json();
    },
};

// ==================== CLIENT DEMANDS API ====================
export const clientDemandsAPI = {
    getAll: async (params?: Record<string, string>) => {
        const query = params ? new URLSearchParams(params).toString() : '';
        const res = await apiFetch(`/demands${query ? `?${query}` : ''}`);
        return res.json();
    },

    create: async (data: any) => {
        const res = await apiFetch('/demands', { method: 'POST', body: JSON.stringify(data) });
        return res.json();
    },

    update: async (id: string, data: any) => {
        const res = await apiFetch(`/demands/${id}`, { method: 'PUT', body: JSON.stringify(data) });
        return res.json();
    },

    delete: async (id: string) => {
        const res = await apiFetch(`/demands/${id}`, { method: 'DELETE' });
        return res.json();
    },
};

// ==================== SETTINGS API ====================
export const settingsAPI = {
    get: async () => {
        const res = await apiFetch('/settings');
        return res.json();
    },

    update: async (data: any) => {
        const res = await apiFetch('/settings', { method: 'PUT', body: JSON.stringify(data) });
        return res.json();
    },
};

// ==================== UPLOAD API ====================
export const uploadAPI = {
    uploadPropertyImage: async (file: File) => {
        const formData = new FormData();
        formData.append('image', file);
        const res = await apiFetchMultipart('/upload/property-image', {
            method: 'POST',
            body: formData
        });
        return res.json();
    },

    uploadPropertyDocument: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await apiFetchMultipart('/upload/property-document', {
            method: 'POST',
            body: formData
        });
        return res.json();
    },

    uploadBlogImage: async (file: File) => {
        const formData = new FormData();
        formData.append('image', file);
        const res = await apiFetchMultipart('/upload/blog-image', {
            method: 'POST',
            body: formData
        });
        return res.json();
    }
};

// ==================== EXCHANGE RATES API ====================
// Uses plain fetch (not apiFetch) — this is a public endpoint, no auth needed.
export const exchangeRatesAPI = {
    get: async (): Promise<{
        rates: { TND: number; USD: number; EUR: number };
        updatedAt: string;
        source: 'redis' | 'memory' | 'default';
    }> => {
        const res = await fetch(`${API_BASE_URL}/exchange-rates`);
        if (!res.ok) throw new Error(`Exchange rates fetch failed: ${res.status}`);
        return res.json();
    },
};


