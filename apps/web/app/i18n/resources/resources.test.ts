import { describe, expect, it } from 'vitest'
import en from './en'
import ru from './ru'

const expectedResourceDomains = [
  'auth',
  'chats',
  'collections',
  'common',
  'faces',
  'folders',
  'home',
  'immich',
  'jobs',
  'onboarding',
  'player',
  'projects',
  'root',
  'search',
  'settings',
  'setup',
  'shell',
  'sidebar',
  'ui',
  'videos',
] as const

describe('i18n resource aggregators', () => {
  it.each([
    ['en', en],
    ['ru', ru],
  ] as const)('exports every resource domain for %s', (_language, resources) => {
    for (const domain of expectedResourceDomains) {
      expect(resources).toHaveProperty(domain)
    }
  })

  it('exports shell navigation translations used by the app sidebar', () => {
    expect(en.shell.navigation.dashboard).toBe('Dashboard')
    expect(ru.shell.navigation.dashboard).toBe('Панель')
  })

  it('exports folder detail translations used by the folder page', () => {
    expect(en.folders.actions.rescan).toBe('Rescan')
    expect(en.folders.actions.scanning).toBe('Scanning...')
    expect(en.folders.jobCount_one).toBe('{{count}} job')
    expect(en.folders.jobCount_other).toBe('{{count}} jobs')

    expect(ru.folders.actions.rescan).toBe('Пересканировать')
    expect(ru.folders.actions.scanning).toBe('Сканирование...')
    expect(ru.folders.jobCount_one).toBe('{{count}} задание')
    expect(ru.folders.jobCount_few).toBe('{{count}} задания')
    expect(ru.folders.jobCount_many).toBe('{{count}} заданий')
    expect(ru.folders.jobCount_other).toBe('{{count}} задания')
  })
})
