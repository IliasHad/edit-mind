export type SetupStepId = 'welcome' | 'services' | 'folder' | 'scanning'

export interface SetupStepConfig {
  id: SetupStepId
  titleKey: string
  descriptionKey: string
  skippable?: boolean
}
