import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../services/api'
import { validateFileType, validateFileSize } from '../utils/validators'
import { useToast } from '../App'

const MAX_MB = 100

/** Shared file selection, validation, upload and navigation logic for the analysis pages. */
export function useMediaAnalysis({ allowedTypes, formatsLabel, analyze }) {
  const [file, setFile] = useState(null)
  const [phase, setPhase] = useState(null) // null | 'uploading' | 'analyzing'
  const [uploadPct, setUploadPct] = useState(0)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { addToast } = useToast()

  const selectFile = (f) => {
    setError('')
    if (!f) { setFile(null); return }
    if (!validateFileType(f, allowedTypes)) {
      setError(`Unsupported format. Please upload a ${formatsLabel} file.`)
      return
    }
    if (f.size === 0) {
      setError('The selected file is empty.')
      return
    }
    if (!validateFileSize(f, MAX_MB)) {
      setError(`File too large. Maximum file size is ${MAX_MB} MB.`)
      return
    }
    setFile(f)
  }

  const start = async () => {
    if (!file) { setError('Please select a file first.'); return }
    setError('')
    setUploadPct(0)
    setPhase('uploading')
    try {
      const result = await analyze(file, (pct) => {
        setUploadPct(pct)
        if (pct >= 100) setPhase('analyzing')
      })
      addToast('Analysis complete.', 'success', 'Analysis Complete')
      navigate(`/result/${encodeURIComponent(result.id)}`, { state: { result } })
    } catch (err) {
      const message = getErrorMessage(err, 'Analysis failed. Please try again.')
      setError(message)
      addToast(message, 'error', 'Analysis Failed')
      setPhase(null)
    }
  }

  return { file, selectFile, start, phase, uploadPct, error, busy: phase !== null }
}
