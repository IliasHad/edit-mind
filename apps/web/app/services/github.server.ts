import { logger } from '@shared/services/logger'
import { getCache, setCache } from '@shared/services/cache'

const REDIS_KEY = 'edit-mind:github:latest-release'
const CACHE_TTL = 60 * 60 * 1 // 1 hour

export async function getLatestReleaseVersion() {
  let latestVersion: string | undefined

  const cached = await getCache<string>(REDIS_KEY)

  if (cached) {
    const parsed = JSON.parse(cached) as {
      latestVersion: string
    }

    latestVersion = parsed.latestVersion
  } else {
    const apiRes = await fetch('https://api.github.com/repos/iliashad/edit-mind/releases/latest', {
      headers: {
        Accept: 'application/vnd.github+json',
      },
    })

    if (apiRes.ok) {
      const apiData = await apiRes.json()
      latestVersion = apiData.tag_name?.replace(/^v/, '')

      if (latestVersion) {
        await setCache(
          REDIS_KEY,
          JSON.stringify({
            latestVersion,
            fetchedAt: Date.now(),
          }),
          CACHE_TTL
        )
      }

      logger.debug('GitHub version fetched from API')
    }
  }
  return latestVersion
}
