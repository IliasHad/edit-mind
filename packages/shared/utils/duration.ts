import { formatDuration as formatSeconds, intervalToDuration } from 'date-fns'

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

export const humanizeSeconds = (seconds: number): string => {
  const durationObj = intervalToDuration({ start: 0, end: seconds * 1000 })

  // For very short (< 1 minute), show seconds
  if (seconds < 60) {
    return `${Math.round(seconds)}s`
  }

  return formatSeconds(durationObj, {
    delimiter: '',
  })
    .replace(/(\d+)\s+hours?/, '$1h')
    .replace(/(\d+)\s+minutes?/, '$1m')
    .replace(/(\d+)\s+seconds?/, '$1s')
}
