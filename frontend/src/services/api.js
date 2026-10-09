import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

const TOKEN_KEY = 'fakenix_token'
const USER_KEY = 'fakenix_user'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor — attach auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — an expired/invalid session on a protected call sends the
// user back to login. Auth endpoints are excluded so a wrong password surfaces as
// a form error instead of reloading the page.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const url = error.config?.url || ''
    const isAuthCall = url.startsWith('/auth/')
    if (status === 401 && !isAuthCall && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(USER_KEY)
      localStorage.removeItem(TOKEN_KEY)
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }
    return Promise.reject(error)
  }
)

/**
 * The Flask API wraps every JSON payload as { success, message, data }.
 * Return `data`, or throw with the backend's message when success is false.
 */
export function unwrap(response) {
  const body = response?.data
  if (body && typeof body === 'object' && 'success' in body) {
    if (!body.success) {
      const err = new Error(body.message || 'Request failed.')
      err.response = response
      throw err
    }
    return body.data
  }
  return body
}

/** Human-readable message for a failed request, preferring the backend's own text. */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback
  const body = error.response?.data
  if (body && typeof body === 'object') {
    const fieldErrors = body.errors && typeof body.errors === 'object'
      ? Object.values(body.errors).filter((v) => typeof v === 'string')
      : []
    if (fieldErrors.length > 0) return fieldErrors.join(' ')
    if (typeof body.message === 'string' && body.message) return body.message
  }
  if (error.code === 'ECONNABORTED') return 'The server took too long to respond.'
  if (error.request && !error.response) {
    return 'Cannot reach the FAKENIX server. Check that the backend is running.'
  }
  if (error.response?.status === 413) return 'File is too large for the server to accept.'
  return fallback
}

export default api
