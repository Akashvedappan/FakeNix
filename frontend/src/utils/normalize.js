/**
 * Mapping layer between the Flask API and the UI.
 *
 * The backend serializers (models/*.to_dict) use camelCase keys, but some fields
 * are nullable, numbers can arrive as strings, and a few older callers used
 * snake_case. Everything the UI renders goes through these functions so pages
 * never have to guard against undefined/NaN themselves.
 */

const RESULTS = ['deepfake', 'real', 'suspicious']
const RISKS = ['low', 'medium', 'high', 'critical']

/** Finite number or null. Never NaN. */
export const toNumber = (value) => {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null
  const num = typeof value === 'number' ? value : Number(String(value).replace('%', '').trim())
  return Number.isFinite(num) ? num : null
}

/** Clamp to [0, 100] for progress-bar widths. Returns 0 for missing values. */
export const clampPercent = (value) => {
  const num = toNumber(value)
  if (num === null) return 0
  return Math.min(100, Math.max(0, num))
}

const toStr = (value) => {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value.trim() || null
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

const pick = (obj, ...keys) => {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null) return obj[key]
  }
  return null
}

const toLowerEnum = (value, allowed) => {
  const str = toStr(value)
  if (!str) return null
  const lower = str.toLowerCase()
  return allowed.includes(lower) ? lower : null
}

const asArray = (value) => (Array.isArray(value) ? value : [])
const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {})

export const normalizeIndicator = (ind) => {
  const obj = asObject(ind)
  const rawScore = toNumber(obj.score)
  // Indicator scores are 0–1 fractions from the backend; accept 0–100 too.
  const score = rawScore === null ? null : rawScore > 1 ? rawScore / 100 : rawScore
  return {
    name: toStr(obj.name) || 'Unnamed indicator',
    severity: toLowerEnum(obj.severity, RISKS),
    score: score === null ? null : Math.min(1, Math.max(0, score)),
    // Where the model saw the artifact (Groq analysis).
    evidence: toStr(obj.evidence)
  }
}

export const normalizeFrame = (frame, idx) => {
  const obj = asObject(frame)
  return {
    frameNum: toNumber(pick(obj, 'frameNum', 'frame_num', 'frame')) ?? idx + 1,
    timestamp: toStr(obj.timestamp),
    probability: toNumber(obj.probability),
    risk: toLowerEnum(obj.risk, RISKS),
    anomalies: asArray(obj.anomalies).map(toStr).filter(Boolean)
  }
}

export const normalizeDetection = (raw) => {
  if (!raw || typeof raw !== 'object') return null
  const metadata = asObject(raw.metadata)

  const deepfakeProbability = toNumber(pick(raw, 'deepfakeProbability', 'deepfake_probability'))
  const realProbability = toNumber(pick(raw, 'realProbability', 'real_probability'))
  const confidence = toNumber(raw.confidence)

  const fileSizeBytes = toNumber(pick(metadata, 'fileSizeBytes', 'file_size_bytes'))

  return {
    id: toStr(pick(raw, 'id', 'detectionId', 'detection_uid')),
    evidenceId: toStr(pick(raw, 'evidenceId', 'evidence_id')),
    fileName: toStr(pick(raw, 'fileName', 'file_name')),
    fileType: toLowerEnum(pick(raw, 'fileType', 'file_type'), ['image', 'video', 'url']),
    // Prefer exact bytes from metadata; fall back to the backend's display string.
    fileSize: fileSizeBytes ?? toStr(pick(raw, 'fileSize', 'file_size')),
    resolution: toStr(raw.resolution) || toStr(metadata.resolution),
    duration: toStr(raw.duration) || toStr(metadata.duration),
    sourceUrl: toStr(pick(raw, 'sourceUrl', 'source_url')),
    result: toLowerEnum(raw.result, RESULTS),
    risk: toLowerEnum(pick(raw, 'risk', 'risk_level'), RISKS),
    confidence,
    deepfakeProbability,
    realProbability,
    model: toStr(pick(raw, 'model', 'model_name')),
    isDemo: Boolean(pick(raw, 'isDemo', 'is_demo')),
    sha256: toStr(raw.sha256),
    indicators: asArray(raw.indicators).map(normalizeIndicator),
    frames: asArray(raw.frames).map(normalizeFrame),
    metadata,
    // The AI model's own written assessment, when provided.
    explanation: toStr(raw.explanation),
    timestamp: toStr(pick(raw, 'timestamp', 'created_at')),
    status: toStr(raw.status)
  }
}

export const normalizeEvidence = (raw) => {
  if (!raw || typeof raw !== 'object') return null
  return {
    id: toStr(raw.id) || toStr(raw.evidenceId),
    evidenceId: toStr(pick(raw, 'evidenceId', 'evidence_uid')),
    detectionId: toStr(pick(raw, 'detectionId', 'detection_uid')),
    fileName: toStr(pick(raw, 'fileName', 'file_name')),
    fileType: toLowerEnum(pick(raw, 'fileType', 'file_type'), ['image', 'video', 'url']),
    sha256: toStr(raw.sha256),
    md5: toStr(raw.md5),
    status: toLowerEnum(raw.status, ['verified', 'pending', 'tampered', 'failed', 'missing']) || 'pending',
    result: toLowerEnum(raw.result, RESULTS),
    confidence: toNumber(raw.confidence),
    timestamp: toStr(raw.timestamp),
    integrityCheck: toStr(raw.integrityCheck),
    chainOfCustody: asArray(raw.chainOfCustody).map((step) => {
      const s = asObject(step)
      return { action: toStr(s.action) || 'Event', by: toStr(s.by), time: toStr(pick(s, 'time', 'timestamp')) }
    }),
    metadata: asObject(raw.metadata)
  }
}

export const normalizeReport = (raw) => {
  if (!raw || typeof raw !== 'object') return null
  return {
    id: toStr(raw.id) || toStr(raw.reportId),
    reportId: toStr(pick(raw, 'reportId', 'report_uid')),
    evidenceId: toStr(pick(raw, 'evidenceId', 'evidence_id')),
    detectionId: toStr(pick(raw, 'detectionId', 'detection_uid')),
    reportType: toStr(pick(raw, 'reportType', 'report_type')),
    // The report serializer sends a capitalised verdict ("Deepfake") in `detection`.
    result: toLowerEnum(pick(raw, 'detection', 'result'), RESULTS),
    confidence: toNumber(raw.confidence),
    risk: toLowerEnum(raw.risk, RISKS),
    generatedDate: toStr(pick(raw, 'generatedDate', 'created_at')),
    generatedBy: toStr(raw.generatedBy),
    status: toStr(raw.status),
    fileName: toStr(pick(raw, 'fileName', 'file_name'))
  }
}

export const normalizeCybercrimeReport = (raw) => {
  if (!raw || typeof raw !== 'object') return null
  return {
    id: toStr(raw.id) || toStr(raw.reportId),
    reportId: toStr(raw.reportId),
    incidentType: toStr(raw.incidentType),
    description: toStr(raw.description),
    date: toStr(raw.date),
    platform: toStr(raw.platform),
    sourceUrl: toStr(raw.sourceUrl),
    evidenceId: toStr(raw.evidenceId),
    status: toStr(raw.status),
    timestamp: toStr(raw.timestamp)
  }
}

export const normalizeList = (data, mapper) => asArray(data).map(mapper).filter(Boolean)
