import axios from 'axios'
import { ADMIN_SESSION_TOKEN } from '../config/adminLogin'

/** Base API : jamais localhost en prod dans le bundle si VITE_API_URL manque (évite un déploiement Netlify qui « tape le local »). */
function normalizeApiBase(url) {
  const s = String(url ?? '').trim()
  if (!s) return ''
  return s.replace(/\/$/, '')
}

const fromEnv = normalizeApiBase(import.meta.env.VITE_API_URL)
export const API_BASE_URL =
  fromEnv || (import.meta.env.DEV ? 'http://localhost:3001' : '')

if (import.meta.env.PROD && !API_BASE_URL) {
  console.error(
    '[WorkSphere] VITE_API_URL absent au build : ajoutez-le dans Netlify → Environment variables, puis redéployez.',
  )
}

const API = axios.create(
  API_BASE_URL ? { baseURL: API_BASE_URL } : {},
)

API.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('ws_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const t = localStorage.getItem('ws_token')
      if (t === ADMIN_SESSION_TOKEN) {
        return Promise.reject(err)
      }
      localStorage.clear()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// AUTH
export const login = (email, password) =>
  API.post('/auth/login', { email, password })

/** Première connexion / changement obligatoire — aligner le chemin sur Nest (voir docs/BACKEND_EMPLOYEE_WELCOME.md). */
export const changePasswordFirst = ({ currentPassword, newPassword }) =>
  API.post('/auth/change-password', { currentPassword, newPassword })

// RH
/** @param {{ timeMin?: string, timeMax?: string }} [params] plage ISO pour le backend / N8N */
export const getCalendarMeetings = (params) => API.get('/rh/calendar', { params })
export const getEmployees = () => API.get('/rh/employees')
export const addEmployee = (data) => API.post('/rh/employees', data)
export const updateEmployee = (id, data) => API.put(`/rh/employees/${id}`, data)
export const deleteEmployee = (id) => API.delete(`/rh/employees/${id}`)
export const getReclamations = () => API.get('/rh/reclamations')
export const updateReclamation = (id, data) => API.put(`/rh/reclamations/${id}`, data)
export const getConges = () => API.get('/rh/conges')
export const updateConge = (id, data) => API.put(`/rh/conges/${id}`, data)
export const getCandidats = () => API.get('/rh/candidats')
export const getMaladies = () => API.get('/rh/maladies')
export const updateMaladie = (id, data) => API.put(`/rh/maladies/${id}`, data)
export const submitConge = (data) => API.post('/rh/conges', data)
/** Déclaration maladie employé — doit correspondre au contrôleur Nest (README : POST /employee/maladie). */
export const submitMaladie = (data) => API.post('/employee/maladie', data)
export const submitReclamation = (data) => API.post('/rh/reclamations', data)

// EMPLOYEE
export const getMyProjects = () => API.get('/employee/projects')
export const addProject = (data) => API.post('/employee/projects', data)
export const getTrelloTasks = () => API.get('/employee/trello')
export const getMyConges = () => API.get('/employee/conges')

export default API
