import axios from 'axios';

// ✅ Vite utilise import.meta.env, pas process.env
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Ajouter le token JWT à chaque requête ─────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Gérer les erreurs 401 (token expiré) ──────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh');

      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
            refresh: refreshToken,
          });
          const newToken = res.data.access;
          localStorage.setItem('token', newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        } catch (_) {
          // Refresh expiré → déconnexion
          localStorage.removeItem('token');
          localStorage.removeItem('refresh');
          localStorage.removeItem('userRole');
          localStorage.removeItem('userData');
          window.location.href = '/signin';
        }
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        window.location.href = '/signin';
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

// ==================== AUTHENTIFICATION ====================
export const authAPI = {
  signin: (email, password) =>
    apiClient.post('/auth/signin/', { email, password }),
  signup: (formData) =>
    apiClient.post('/auth/signup/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  logout: () => apiClient.post('/auth/logout/'),
  resetPassword: (email) =>
    apiClient.post('/auth/reset-password/', { email }),
  getProfile: () => apiClient.get('/auth/profile/'),
  updateProfile: (data) => apiClient.put('/auth/profile/', data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
  }),
  uploadAvatar: (file) => {
    const form = new FormData();
    form.append('avatar', file);
    return apiClient.post('/auth/avatar/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ==================== UTILISATEURS ====================
export const usersAPI = {
  search: (query) => apiClient.get('/users/search/', { params: { q: query } }),
};

// ==================== SERVICES ====================
export const servicesAPI = {
  getAll: (filters = {}) => apiClient.get('/services/', { params: filters }),
  getById: (id) => apiClient.get(`/services/${id}/`),
  search: (query) => apiClient.get('/services/', { params: { q: query } }),
};

// ==================== COMMANDES ====================
export const ordersAPI = {
  create: (serviceId, data) =>
    apiClient.post(`/services/${serviceId}/order/`, data),
  getMyOrders: () => apiClient.get('/consumer/orders/'),
};

// ==================== PRESTATAIRES ====================
export const providersAPI = {
  getServices: () => apiClient.get('/provider/services/'),
  createService: (data) => apiClient.post('/provider/services/', data),
  getOrders: () => apiClient.get('/provider/orders/'),
  getStatistics: () => apiClient.get('/provider/statistics/'),
  updateOrderStatus: (orderId, statut) => apiClient.patch(`/provider/orders/${orderId}/status/`, { statut }),
};

// ==================== CONSOMMATEURS ====================
export const consumersAPI = {
  getOrders: () => apiClient.get('/consumer/orders/'),
  getRecommendations: () => apiClient.get('/recommendations/'),
};

// ==================== ADMINISTRATION ====================
export const adminAPI = {
  getUsers: (filters = {}) => apiClient.get('/admin/users/', { params: filters }),
  suspendUser: (userId) => apiClient.post(`/admin/users/${userId}/suspend/`),
  activateUser: (userId) => apiClient.post(`/admin/users/${userId}/activate/`),
  getPendingCards: () => apiClient.get('/administration/cards/'),
  reviewCard: (cardId, action, reason = '') => 
    apiClient.post(`/administration/cards/${cardId}/review/`, { action, rejection_reason: reason }),
  getStatistics: () => apiClient.get('/admin/statistics/'),
  getDisputes: (status = 'open') => apiClient.get('/administration/disputes/', { params: { status } }),
  resolveDispute: (disputeId, resolution, note = '') => 
    apiClient.post(`/administration/disputes/${disputeId}/resolve/`, { resolution, admin_note: note }),
};
export const reviewsAPI = {
  leaveReview: (serviceId, score, commentaire) =>
    apiClient.post(`/services/${serviceId}/review/`, { score, commentaire }),
  getServiceReviews: (serviceId) =>
    apiClient.get(`/services/${serviceId}/reviews/`),
  getSmartRecommendations: () =>
    apiClient.get('/recommendations/smart/'),
  getTopProviders: () =>
    apiClient.get('/providers/top/'),
};

// ==================== ANNONCES ====================
export const annoncesAPI = {
  getAll: () => apiClient.get('/annonces/'),
  create: (data) => apiClient.post('/annonces/', data),
  addComment: (annonceId, contenu) => apiClient.post(`/annonces/${annonceId}/commentaires/`, { contenu }),
};
