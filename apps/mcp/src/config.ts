const host = process.env.EDIT_MIND_HOST
const token = process.env.EDIT_MIND_TOKEN

if (!host || !token) {
  process.stderr.write('EDIT_MIND_HOST and EDIT_MIND_TOKEN environment variables are required\n')
  process.exit(1)
}

const baseUrl = host.replace(/\/$/, '')

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)
  try {
    return await fetch(`${baseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
  } finally {
    clearTimeout(timeout)
  }
}
