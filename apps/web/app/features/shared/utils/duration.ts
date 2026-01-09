import { formatDuration, intervalToDuration, format, isToday, isYesterday } from 'date-fns'

export const humanizeSeconds = (seconds: number): string => {
  // For very short (< 1 minute), show seconds
  if (seconds < 60) {
    return `${Math.round(seconds)}s`
  }

  const duration = intervalToDuration({
    start: 0,
    end: seconds * 1000,
  })

  // Convert days to hours so days never appear
  const hours =
    (duration.days ?? 0) * 24 + (duration.hours ?? 0)

  const normalizedDuration = {
    hours,
    minutes: duration.minutes ?? 0,
    seconds: duration.seconds ?? 0,
  }

  return formatDuration(normalizedDuration, {
    delimiter: '',
  })
    .replace(/(\d+)\s+hours?/, '$1h')
    .replace(/(\d+)\s+minutes?/, '$1m')
    .replace(/(\d+)\s+seconds?/, '$1s')
}


export const smartFormatDate = (date: Date): string => {
  if (isToday(date)) {
    return `Today at ${format(date, 'p')}`
  }
  if (isYesterday(date)) {
    return `Yesterday at ${format(date, 'p')}`
  }
  // Fallback for other dates: "MMM d, yyyy at h:mm a"
  return format(date, 'MMM d, yyyy')
}
