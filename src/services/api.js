import axios from 'axios';

const BASE_URL = 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token a todas las peticiones
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const getServers = () => api.get('/servers');
export const getServerDetails = (id) => api.get(`/servers/${id}`);
export const getServerMetrics = (id) => api.get(`/metrics/${id}`);
export const addServer = (data) => api.post('/servers', data);
export const updateServer = (id, data) => api.put(`/servers/${id}`, data);
export const deleteServer = (id) => api.delete(`/servers/${id}`);

export default api;
