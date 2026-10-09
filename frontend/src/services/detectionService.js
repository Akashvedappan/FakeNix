import api, { unwrap } from './api'
import {
  normalizeDetection,
  normalizeEvidence,
  normalizeReport,
  normalizeCybercrimeReport,
  normalizeList
} from '../utils/normalize'
import { downloadBlob } from '../utils/formatters'

// Uploads and server-side inference can take longer than the default 30s.
const ANALYSIS_TIMEOUT_MS = 5 * 60 * 1000

async function uploadForAnalysis(path, file, onUploadProgress) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post(path, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: ANALYSIS_TIMEOUT_MS,
    onUploadProgress: (evt) => {
      if (!onUploadProgress || !evt.total) return
      onUploadProgress(Math.round((evt.loaded / evt.total) * 100))
    }
  })
  const detection = normalizeDetection(unwrap(response))
  if (!detection?.id) {
    throw new Error('The server returned an incomplete analysis result.')
  }
  return detection
}

/** Axios returns error bodies as Blobs for blob requests; read the JSON message out. */
async function readBlobError(err) {
  const data = err?.response?.data
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text())
      if (parsed?.message) err.response.data = parsed
    } catch {
      // Not JSON; keep the original error.
    }
  }
  return err
}

export const detectionService = {
  analyzeImage(file, onUploadProgress) {
    return uploadForAnalysis('/detect/image', file, onUploadProgress)
  },

  analyzeVideo(file, onUploadProgress) {
    return uploadForAnalysis('/detect/video', file, onUploadProgress)
  },

  async getDetectionTrend(days = 11) {
    const response = await api.get('/dashboard/detection-trend', { params: { days } })
    const data = unwrap(response) || {}
    return {
      range: data.range || null,
      trend: Array.isArray(data.trend) ? data.trend : []
    }
  },

  async getDetectionHistory() {
    const response = await api.get('/detections')
    return normalizeList(unwrap(response), normalizeDetection)
  },

  async getDetectionResult(id) {
    const response = await api.get(`/detections/${encodeURIComponent(id)}`)
    return normalizeDetection(unwrap(response))
  },

  async deleteDetection(id) {
    const response = await api.delete(`/detections/${encodeURIComponent(id)}`)
    unwrap(response)
    return true
  },

  async getEvidence() {
    const response = await api.get('/evidence')
    return normalizeList(unwrap(response), normalizeEvidence)
  },

  /** Recalculates the stored file's SHA-256 on the server. */
  async verifyEvidence(evidenceId) {
    const response = await api.get(`/evidence/${encodeURIComponent(evidenceId)}/verify`)
    const body = response.data || {}
    const data = body.data || {}
    return {
      match: Boolean(data.match),
      // null when the server could not run the check (e.g. no stored file); status unchanged.
      status: data.status || null,
      reason: data.reason || data.message || body.message || null
    }
  },

  async getReports() {
    const response = await api.get('/reports')
    return normalizeList(unwrap(response), normalizeReport)
  },

  async generateReport(detectionId) {
    const response = await api.post('/reports', { detectionId })
    const report = normalizeReport(unwrap(response))
    if (!report?.reportId) {
      throw new Error('The server did not return a report ID.')
    }
    return report
  },

  async downloadReport(reportId) {
    if (!reportId) throw new Error('No report ID to download.')
    try {
      const response = await api.get(`/reports/${encodeURIComponent(reportId)}/download`, {
        responseType: 'blob',
        timeout: 120000
      })
      const type = response.headers?.['content-type'] || ''
      if (!type.includes('pdf')) {
        throw new Error('The server did not return a PDF document.')
      }
      downloadBlob(response.data, `${reportId}.pdf`, 'application/pdf')
      return true
    } catch (err) {
      throw await readBlobError(err)
    }
  },

  async submitCybercrimeReport(payload) {
    const response = await api.post('/cybercrime/report', payload)
    return unwrap(response)
  },

  async getCybercrimeReports() {
    const response = await api.get('/cybercrime/reports')
    return normalizeList(unwrap(response), normalizeCybercrimeReport)
  }
}
