import { type App, type WebContents } from 'electron'
import { handle, sender } from '@/lib/main/shared'

export const registerAppHandlers = (app: App, webContents: WebContents) => {
  const send = sender(webContents)
  handle('version', () => app.getVersion())
}
