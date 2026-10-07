import axios from 'axios'

// Base URL comes from VITE_API_URL, falls back to the local FastAPI server.
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach the stored JWT to every request.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('agentos_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// An expired/invalid token anywhere means: forget it and go log in again.
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      localStorage.removeItem('agentos_token')
      window.location.assign('/login')
    }
    return Promise.reject(err)
  },
)

// Pull a human-readable message out of an axios error (prefers backend detail).
export function getErrorMessage(err, fallback = 'Something went wrong') {
  const detail = err?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map((d) => d?.msg || JSON.stringify(d)).join('; ')
  if (detail && typeof detail === 'object') return JSON.stringify(detail)
  return err?.message || fallback
}

export const api = {
  // --- auth ---
  register: (payload) => apiClient.post('/auth/register', payload).then((r) => r.data),
  login: (payload) => apiClient.post('/auth/login', payload).then((r) => r.data),
  getMe: () => apiClient.get('/auth/me').then((r) => r.data),
  updateMe: (payload) => apiClient.patch('/auth/me', payload).then((r) => r.data),
  changePassword: (payload) => apiClient.post('/auth/change-password', payload).then((r) => r.data),
  deleteAccount: (password) => apiClient.delete('/auth/me', { data: { password } }).then((r) => r.data),
  // --- goals ---
  createGoal: (payload) => apiClient.post('/goals', payload).then((r) => r.data),
  listGoals: () => apiClient.get('/goals').then((r) => r.data),
  getGoal: (id) => apiClient.get(`/goals/${id}`).then((r) => r.data),
  deleteGoal: (id) => apiClient.delete(`/goals/${id}`).then((r) => r.data),
  updateGoal: (id, payload) => apiClient.patch(`/goals/${id}`, payload).then((r) => r.data),
  replanGoal: (id) => apiClient.post(`/goals/${id}/replan`).then((r) => r.data),
  getTrace: (goalId) => apiClient.get(`/goals/${goalId}/trace`).then((r) => r.data),
  getGoalTasks: (goalId, status) =>
    apiClient.get(`/goals/${goalId}/tasks`, { params: status && status !== 'all' ? { status } : {} }).then((r) => r.data),
  getProgress: (goalId) => apiClient.get(`/goals/${goalId}/progress`).then((r) => r.data),
  // --- resume ---
  analyzeResume: (file, goalId) => {
    const form = new FormData()
    form.append('file', file)
    if (goalId) form.append('goal_id', String(goalId))
    return apiClient.post('/resume/analyze', form).then((r) => r.data)
  },
  getLatestResume: () => apiClient.get('/resume/latest').then((r) => r.data),
  // --- tasks ---
  getTask: (id) => apiClient.get(`/tasks/${id}`).then((r) => r.data),
  updateTaskStatus: (id, status) => apiClient.patch(`/tasks/${id}/status`, { status }).then((r) => r.data),
  getTutor: (id) => apiClient.post(`/tasks/${id}/tutor`).then((r) => r.data),
  submitAnswer: (id, answer_text) => apiClient.post(`/tasks/${id}/submit`, { answer_text }).then((r) => r.data),
  getSubmissions: (id) => apiClient.get(`/tasks/${id}/submissions`).then((r) => r.data),
  // --- interviews ---
  listInterviews: () => apiClient.get('/interviews').then((r) => r.data),
  getInterview: (id) => apiClient.get(`/interviews/${id}`).then((r) => r.data),
  startInterview: (goal_id) => apiClient.post('/interviews', { goal_id }).then((r) => r.data),
  answerQuestion: (sessionId, questionId, answer_text) =>
    apiClient.post(`/interviews/${sessionId}/questions/${questionId}/answer`, { answer_text }).then((r) => r.data),
  completeInterview: (sessionId) => apiClient.post(`/interviews/${sessionId}/complete`).then((r) => r.data),
  // --- dashboard & history ---
  getDashboard: () => apiClient.get('/dashboard').then((r) => r.data),
  getHistory: (goalId) => apiClient.get(`/goals/${goalId}/history`).then((r) => r.data),
  // --- report ---
  getReport: (goalId) => apiClient.get(`/goals/${goalId}/report`).then((r) => r.data),
  downloadReportPdf: (goalId) =>
    apiClient.get(`/goals/${goalId}/report/pdf`, { responseType: 'blob' }).then((r) => r.data),
  health: () => apiClient.get('/health').then((r) => r.data),
}

export default apiClient
