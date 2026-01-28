import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { App } from '../types/app'

interface AppState {
  app: App | undefined
  setApp: (app: App | undefined) => void
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        app: undefined,

        setApp: (app?: App ) => {
          set({ app })
        },
      }),
      {
        name: 'app-storage',
        partialize: (state) => ({
          app: state.app,
        }),
      }
    ),
    { name: 'app-store' }
  )
)
