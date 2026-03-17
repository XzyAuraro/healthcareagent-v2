import axios from 'axios';

export type ApiRiskLevel = 'high' | 'medium' | 'low';

export type ApiPatient = {
  id: string;
  name: string;
  age: number | null;
  gender: string | null;
  phone: string | null;
  id_card_number: string | null;
  diagnosis: string;
  risk_level: ApiRiskLevel;
  visit_date: string | null;
  address: string | null;
  allergies: string | null;
  past_history: string | null;
  blood_pressure: string | null;
  metric_name: string | null;
  metric_value: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_relationship: string | null;
  created_at: string;
};

export type CreatePatientPayload = {
  id?: string;
  name: string;
  age?: number | null;
  gender?: string | null;
  phone?: string | null;
  id_card_number?: string | null;
  diagnosis: string;
  risk_level: ApiRiskLevel;
  visit_date?: string | null;
  address?: string | null;
  allergies?: string | null;
  past_history?: string | null;
  blood_pressure?: string | null;
  metric_name?: string | null;
  metric_value?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_relationship?: string | null;
};

export type ClinicalCasePayload = {
  patient_name?: string;
  age: number;
  gender: string;
  diagnosis: string;
  pain_score: number;
  pain_type: string;
  department: string;
  current_opioid: string;
  current_dose: number;
  current_freq: string;
  plan_drug: string;
  plan_dose: number;
  plan_freq: number;
  mme_day: number;
  ort_score: number;
  ort_level: string;
  comorbidities: string;
  allergies: string;
  adverse_hist: string;
  co_meds: string;
  renal_liver_issue: boolean;
  personal_use: string;
  family_use: string;
  psych_histories: string;
  extra_notes?: string;
  free_text?: string;
};

export type ClinicalSubmitPayload = ClinicalCasePayload & {
  case_id?: string | null;
};

export type ClinicalDebateResponse = {
  oc_answer: string;
  baichuan_review: string;
  consensus: string;
  risk_warning: string;
  mme_warning: string;
};

export type ClinicalCaseRecord = ClinicalCasePayload & {
  id: string;
  ai_status: 'draft' | 'running' | 'done' | 'error';
  risk_warning: string | null;
  mme_warning: string | null;
  oc_answer: string | null;
  baichuan_review: string | null;
  consensus: string | null;
  ai_error: string | null;
  created_at: string;
  updated_at: string;
};

export type ClinicalMessage = {
  id: string;
  case_id: string;
  role: 'doctor' | 'ai' | 'system';
  author_name: string | null;
  content: string;
  created_at: string;
};

export type ClinicalCaseBundle = {
  case: ClinicalCaseRecord;
  messages: ClinicalMessage[];
};

export type ClinicalSubmitResponse = {
  job_id: string;
  case_id: string;
};

export type ClinicalJobResponse = {
  status: 'running' | 'done' | 'error';
  case_id?: string;
  error?: string;
} & Partial<ClinicalDebateResponse>;

export type ClinicalDiscussionResponse = {
  doctor_message: ClinicalMessage;
  ai_message: ClinicalMessage;
};

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

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

export type RegisterPayload = {
  username: string;
  full_name: string;
  department: string;
  role: string;
  password: string;
};

export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  register: (payload: RegisterPayload) =>
    api.post('/auth/register', payload) as Promise<{ message: string; username: string }>,
  getMe: () => api.get('/auth/me'),
};

export const patientsApi = {
  getAll: (riskLevel?: ApiRiskLevel) =>
    api.get('/patients', { params: { risk_level: riskLevel } }) as Promise<ApiPatient[]>,
  getById: (id: string) => api.get(`/patients/${id}`) as Promise<ApiPatient>,
  create: (data: CreatePatientPayload) => api.post('/patients', data) as Promise<ApiPatient>,
  update: (id: string, data: CreatePatientPayload) =>
    api.put(`/patients/${id}`, data) as Promise<ApiPatient>,
  delete: (id: string) =>
    api.delete(`/patients/${id}`) as Promise<{ message: string; patient: ApiPatient }>,
};

export const clinicalApi = {
  analyze: (caseData: unknown) => api.post('/clinical/analyze', caseData),
  submitCase: (data: ClinicalSubmitPayload) =>
    api.post('/clinical/submit', data) as Promise<ClinicalSubmitResponse>,
  getJob: (jobId: string) =>
    api.get(`/clinical/job/${jobId}`) as Promise<ClinicalJobResponse>,
  getLatestCase: () =>
    api.get('/clinical/cases/latest') as Promise<ClinicalCaseBundle | null>,
  getCase: (caseId: string) =>
    api.get(`/clinical/cases/${caseId}`) as Promise<ClinicalCaseBundle>,
  createCase: (data: ClinicalCasePayload) =>
    api.post('/clinical/cases', data) as Promise<ClinicalCaseRecord>,
  updateCase: (caseId: string, data: ClinicalCasePayload) =>
    api.put(`/clinical/cases/${caseId}`, data) as Promise<ClinicalCaseRecord>,
  sendDiscussion: (caseId: string, content: string, authorName = '当前医生') =>
    api.post(`/clinical/cases/${caseId}/discussion`, {
      content,
      author_name: authorName,
    }) as Promise<ClinicalDiscussionResponse>,
  getGuidelines: (keyword?: string) =>
    api.get('/clinical/guidelines', { params: { keyword } }),
  assessRisk: (caseData: unknown) => api.post('/clinical/risk-assessment', caseData),
};

export const analyticsApi = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getTrends: (days?: number) =>
    api.get('/analytics/trends', { params: { days } }),
  getMedicationStats: () => api.get('/analytics/medication-stats'),
  getRecentActivities: () => api.get('/analytics/recent-activities'),
};

export default api;
