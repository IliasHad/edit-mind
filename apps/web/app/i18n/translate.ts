import { i18next } from './index'

export function translate(key: string, options?: Record<string, unknown>): string {
  return i18next.t(key, options)
}
