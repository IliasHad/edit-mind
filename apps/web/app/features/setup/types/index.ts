export type SetupStepId = 'welcome' | 'services' | 'folder' | 'scanning'

export interface SetupStepConfig {
  id: SetupStepId
  title: string
  description: string
  skippable?: boolean
}