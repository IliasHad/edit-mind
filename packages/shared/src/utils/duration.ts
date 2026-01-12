import { formatDistance, format, isToday, isYesterday, isThisWeek, isThisYear } from 'date-fns'

export const humanizeDate = (date: Date | string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return formatDistance(dateObj, new Date(), { addSuffix: true })
}

export const formatDate = (date: Date | string, formatStr?: string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, formatStr || 'MMM d, yyyy • h:mm a')
}

export const smartFormatDate = (date: Date | string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  if (isToday(dateObj)) {
    return `Today at ${format(dateObj, 'h:mm a')}`
  }

  if (isYesterday(dateObj)) {
    return `Yesterday at ${format(dateObj, 'h:mm a')}`
  }

  if (isThisWeek(dateObj)) {
    return format(dateObj, 'EEEE • h:mm a')
  }

  if (isThisYear(dateObj)) {
    return format(dateObj, 'MMM d • h:mm a')
  }

  return format(dateObj, 'MMM d, yyyy')
}

export const formatFullDate = (date: Date | string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, 'EEEE, MMMM d, yyyy')
}

export const formatShortDate = (date: Date | string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, 'MMM d, yyyy')
}

export const formatTime = (date: Date | string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, 'h:mm a')
}

export const formatDateTime = (date: Date | string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, 'MMM d, yyyy at h:mm a')
}