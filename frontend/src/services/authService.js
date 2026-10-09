import api, { unwrap } from './api'

const USER_KEY = 'fakenix_user'
const TOKEN_KEY = 'fakenix_token'

function storeSession(user, token) {
  if (!user || !token) {
    throw new Error('The server did not return a valid session.')
  }
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  localStorage.setItem(TOKEN_KEY, token)
}

export const authService = {
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password })
    const { user, token } = unwrap(response) || {}
    storeSession(user, token)
    return { success: true, user }
  },

  async register(name, email, password) {
    const response = await api.post('/auth/register', { name, email, password })
    const { user, token } = unwrap(response) || {}
    storeSession(user, token)
    return { success: true, user }
  },

  logout() {
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(TOKEN_KEY)
    // Left behind by the old client-side demo mode.
    localStorage.removeItem('fakenix_demo_mode')
    localStorage.removeItem('fakenix_history')
  },

  /** The cached user, only while a token is also present. */
  getCurrentUser() {
    try {
      if (!localStorage.getItem(TOKEN_KEY)) return null
      const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null')
      return user && typeof user === 'object' ? user : null
    } catch {
      return null
    }
  },

  isAuthenticated() {
    return !!localStorage.getItem(TOKEN_KEY)
  },

  async getProfile() {
    const response = await api.get('/user/profile')
    const { user } = unwrap(response) || {}
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
    return user || null
  },

  /** The backend accepts `name` and `organization`. */
  async updateProfile(data) {
    const response = await api.put('/user/profile', data)
    const { user } = unwrap(response) || {}
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
    return { success: true, user }
  }
}
