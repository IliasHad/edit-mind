export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function formatConfidence(confidence: number | undefined): string | null {
  if (confidence && confidence < 1) return `${Math.round(confidence * 100)}%`
  return confidence !== undefined ? `${Math.round(confidence)}%` : null
}

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return 'text-green-400'
  if (confidence >= 60) return 'text-yellow-400'
  return 'text-orange-400'
}
