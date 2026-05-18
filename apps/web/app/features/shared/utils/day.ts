export function getTimeOfDay(): string {
  const hour = new Date().getHours()
  const day = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
  let period: string
  if (hour < 12) period = 'MORNING'
  else if (hour < 17) period = 'AFTERNOON'
  else period = 'EVENING'
  return `${day} ${period}`
}
