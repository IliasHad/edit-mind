const home = {
  hero: {
    titleLine1: "My videos gallery's",
    titleLine2: 'second brain.',
    descriptionLine1: 'Organize your video library locally and search with natural language.',
    descriptionLine2: 'All processing happens securely on your device.',
  },
  empty: {
    imageAlt: 'No videos',
    noVideosTitle: 'No videos indexed yet',
    noVideosDescription:
      "Start by adding your video folders in settings. We'll automatically scan and index your videos locally.",
    addFolders: 'Add folders to start',
    importing: 'Importing…',
    demoReady: 'Demo videos ready',
    importDemo: 'Import our demo videos',
    scanFirst: 'Scan your folders first',
    indexing: 'Indexing your videos ...',
    foldersConnected_one:
      'Your folder is connected. Edit Mind is scanning and analyzing your videos in the background.',
    foldersConnected_other:
      'Your {{count}} folders are connected. Edit Mind is scanning and analyzing your videos in the background.',
    demoImported: 'Demo videos imported',
  },
  videos: {
    title: 'My Videos',
    total_one: '{{count}} video total',
    total_other: '{{count}} videos total',
    sort: {
      shotDate: 'Shot Date',
      importDate: 'Import Date',
      lastUpdated: 'Last Updated',
      duration: 'Duration',
    },
  },
  queue: {
    title: 'Processing queue',
  },
} as const

export default home
