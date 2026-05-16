const settings = {
  title: 'Settings',
  description: 'Manage your application preferences and configuration.',
  tabs: {
    folders: 'Folders',
    preferences: 'Preferences',
    advanced: 'Advanced',
  },
  preferences: {
    title: 'Preferences',
    description: 'Configure global application preferences.',
    language: {
      title: 'Language',
      description: 'Choose the interface language for everyone using this installation.',
      label: 'Application language',
      en: 'English',
      ru: 'Russian',
      saved: 'Language updated.',
      error: 'Could not update language.',
    },
  },
  folders: {
    title: 'Video Folders',
    description: 'Add folders to automatically scan and index videos.',
    addFolder: 'Add Folder',
  },
  advanced: {
    immichImport: {
      title: 'Immich Import',
      description: 'Import videos directly from your Immich library.',
      cta: 'Go to Immich Import',
    },
  },
} as const

export default settings
