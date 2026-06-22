const folders = {
  jobCount_one: '{{count}} job',
  jobCount_other: '{{count}} jobs',
  actions: {
    rescan: 'Rescan',
    scanning: 'Scanning...',
  },
  services: {
    starting: 'Starting services...',
    initializing: 'Initializing services...',
  },
  stats: {
    totalFolders: 'Total Folders',
    videosScanned: 'Videos Scanned',
    totalProcessedDuration: 'Total Processed Duration',
  },
  settings: {
    title: 'Video Folders',
    description: 'Add folders to automatically scan and index videos.',
    addFolder: 'Add Folder',
    emptyTitle: 'No folders added yet',
    emptyDescription: 'Add your first folder to start indexing videos.',
    deleteTitle: 'Delete folder',
    deleteDescription:
      'Removing this folder will stop indexing new videos. Existing videos in your system will remain intact.',
    untitledFolder: 'Untitled folder',
    footer: 'Videos are indexed automatically when folders are added or modified.',
  },
  modal: {
    title: 'Add Folder',
    description: 'Select a folder on your server to be indexed.',
    root: 'Root',
    noFolders: 'No folders found',
    selected: 'Selected:',
    selectedButton: 'Selected',
    selectButton: 'Select',
    addFolder: 'Add Folder',
    cancel: 'Cancel',
  },
  card: {
    delete: 'Delete',
    deleteFolder: 'Delete folder {{name}}',
    videoCount_one: '{{count}} video',
    videoCount_other: '{{count}} videos',
    lastScan: 'Last scan:',
  },
  status: {
    scanning: 'Scanning...',
    indexed: 'Indexed',
    error: 'Error',
    idle: 'Idle',
  },
  errors: {
    invalidFormData: 'Invalid folder form data',
    addFailed: 'Failed to add folder:',
    deleteFailed: 'Failed to delete folder:',
  },
} as const

export default folders
