import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加 token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// 响应拦截器
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        document.cookie = 'token=; path=/; max-age=0; samesite=lax';
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  getMe: () => api.get('/auth/me'),
};

// Patients API
export const patientsApi = {
  getAll: (riskLevel?: string) =>
    api.get('/patients', { params: { risk_level: riskLevel } }),
  getById: (id: string) => api.get(`/patients/${id}`),
  create: (data: any) => api.post('/patients', data),
  update: (id: string, data: any) => api.put(`/patients/${id}`, data),
  delete: (id: string) => api.delete(`/patients/${id}`),
};

// Clinical API
export const clinicalApi = {
  analyze: (caseData: any) => api.post('/clinical/analyze', caseData),
  getGuidelines: (keyword?: string) =>
    api.get('/clinical/guidelines', { params: { keyword } }),
  assessRisk: (caseData: any) => api.post('/clinical/risk-assessment', caseData),
};

// Analytics API
export const analyticsApi = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getTrends: (days?: number) =>
    api.get('/analytics/trends', { params: { days } }),
  getMedicationStats: () => api.get('/analytics/medication-stats'),
  getRecentActivities: () => api.get('/analytics/recent-activities'),
};

export default api;
