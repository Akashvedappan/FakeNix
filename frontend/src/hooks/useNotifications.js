import { useState, useEffect, useCallback, useMemo } from 'react'
import { detectionService } from '../services/detectionService'
import { getErrorMessage } from '../services/api'
import { parseDate, formatConfidence } from '../utils/formatters'
import { useAppAuth } from '../App'

/**
 * The backend has no notifications endpoint, so alerts are derived from the
 * user's detection history. Reports are deliberately not queried here: the
 * backend's GET /reports seeds sample records for users with none. Read state
 * is a per-browser convenience kept in localStorage.
 */
const MAX_ITEMS = 30

const storageKey = (userId) => `fakenix_notifications_read_${userId ?? 'anon'}`

const readSet = (key) => {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) || '[]'))
  } catch {
    return new Set()
  }
}

const writeSet = (key, set) => {
  try {
    localStorage.setItem(key, JSON.stringify([...set].slice(-500)))
  } catch {
    // Storage unavailable (private mode); read state just won't persist.
  }
}

function buildNotifications(detections) {
  const items = []

  detections.forEach((d) => {
    if (!d.id) return
    const name = d.fileName || 'Uploaded file'
    const conf = formatConfidence(d.deepfakeProbability ?? d.confidence)
    if (d.result === 'deepfake') {
      items.push({
        id: `det-${d.id}`,
        type: 'critical',
        title: 'Deepfake detected',
        message: `"${name}" was classified as a deepfake (${conf} deepfake probability).${d.isDemo ? ' Demo result.' : ''}`,
        link: `/result/${d.id}`,
        timestamp: d.timestamp
      })
    } else if (d.result === 'suspicious') {
      items.push({
        id: `det-${d.id}`,
        type: 'warning',
        title: 'Suspicious media flagged',
        message: `"${name}" needs review (${conf} deepfake probability).${d.isDemo ? ' Demo result.' : ''}`,
        link: `/result/${d.id}`,
        timestamp: d.timestamp
      })
    } else if (d.result === 'real') {
      items.push({
        id: `det-${d.id}`,
        type: 'success',
        title: 'Analysis complete',
        message: `"${name}" was classified as authentic.${d.isDemo ? ' Demo result.' : ''}`,
        link: `/result/${d.id}`,
        timestamp: d.timestamp
      })
    }
  })

  return items
    .sort((a, b) => (parseDate(b.timestamp)?.getTime() || 0) - (parseDate(a.timestamp)?.getTime() || 0))
    .slice(0, MAX_ITEMS)
}

export function useNotifications() {
  const { user } = useAppAuth()
  const key = storageKey(user?.id)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [readIds, setReadIds] = useState(() => readSet(key))

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(buildNotifications(await detectionService.getDetectionHistory()))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    setReadIds(readSet(key))
  }, [key])

  const notifications = useMemo(
    () => items.map((n) => ({ ...n, read: readIds.has(n.id) })),
    [items, readIds]
  )

  const markRead = useCallback((ids) => {
    setReadIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.add(id))
      writeSet(key, next)
      return next
    })
  }, [key])

  return {
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    loading,
    error,
    reload,
    markRead,
    markAllRead: () => markRead(items.map((n) => n.id))
  }
}
