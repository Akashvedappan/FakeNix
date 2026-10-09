import { useState, useEffect, useCallback, useRef } from 'react'
import { getErrorMessage } from '../services/api'

/**
 * Run an async loader on mount (and whenever `deps` change) and expose
 * { data, loading, error, reload, setData }. Responses from superseded
 * requests are ignored.
 */
export function useAsync(loader, deps = [], { initialData = null } = {}) {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const loaderRef = useRef(loader)
  const requestId = useRef(0)
  loaderRef.current = loader

  const reload = useCallback(async () => {
    const id = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const result = await loaderRef.current()
      if (id === requestId.current) setData(result)
    } catch (err) {
      if (id === requestId.current) setError(getErrorMessage(err))
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
    return () => {
      requestId.current++
    }
  }, deps)

  return { data, loading, error, reload, setData }
}
