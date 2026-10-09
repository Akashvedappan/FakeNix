export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export const validatePassword = (password) => {
  return password && password.length >= 6
}

export const validateURL = (url) => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export const validateFileType = (file, allowedTypes) => {
  if (!file) return false
  const ext = file.name.split('.').pop().toLowerCase()
  return allowedTypes.includes(ext)
}

export const validateFileSize = (file, maxMB = 100) => {
  if (!file) return false
  return file.size <= maxMB * 1024 * 1024
}

export const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  if (score <= 1) return { score, label: 'Weak', color: '#ef4444' }
  if (score === 2) return { score, label: 'Fair', color: '#f97316' }
  if (score === 3) return { score, label: 'Good', color: '#eab308' }
  if (score === 4) return { score, label: 'Strong', color: '#22c55e' }
  return { score, label: 'Very Strong', color: '#10b981' }
}

export const IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'webp']
export const VIDEO_TYPES = ['mp4', 'mov', 'avi', 'mkv']
