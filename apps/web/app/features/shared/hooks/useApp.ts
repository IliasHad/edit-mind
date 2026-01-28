import { useAppStore } from '../stores/app'

export function useApp() {
  const { app, setApp } = useAppStore()

  return {
    app,
    setApp,
  }
}
