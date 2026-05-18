export function sanitizeForJson<T>(data: T): T {
  return JSON.parse(JSON.stringify(data, (_, value) =>
    typeof value === 'bigint' ? Number(value) : value
  ))
}
