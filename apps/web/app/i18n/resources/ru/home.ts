const home = {
  hero: {
    titleLine1: 'Второй мозг',
    titleLine2: 'для вашей видеотеки.',
    descriptionLine1: 'Организуйте видеотеку локально и ищите на естественном языке.',
    descriptionLine2: 'Вся обработка безопасно выполняется на вашем устройстве.',
  },
  empty: {
    imageAlt: 'Нет видео',
    noVideosTitle: 'Видео ещё не проиндексированы',
    noVideosDescription:
      'Начните с добавления папок с видео в настройках. Мы автоматически просканируем и проиндексируем видео локально.',
    addFolders: 'Добавить папки для начала',
    importing: 'Импорт…',
    demoReady: 'Демо-видео готовы',
    importDemo: 'Импортировать демо-видео',
    scanFirst: 'Сначала просканируйте папки',
    indexing: 'Индексируем ваши видео ...',
    foldersConnected_one:
      'Ваша папка подключена. Edit Mind сканирует и анализирует видео в фоне.',
    foldersConnected_few:
      'Ваши {{count}} папки подключены. Edit Mind сканирует и анализирует видео в фоне.',
    foldersConnected_many:
      'Ваши {{count}} папок подключены. Edit Mind сканирует и анализирует видео в фоне.',
    foldersConnected_other:
      'Ваши {{count}} папки подключены. Edit Mind сканирует и анализирует видео в фоне.',
    demoImported: 'Демо-видео импортированы',
  },
  videos: {
    title: 'Мои видео',
    total_one: '{{count}} видео всего',
    total_few: '{{count}} видео всего',
    total_many: '{{count}} видео всего',
    total_other: '{{count}} видео всего',
    sort: {
      shotDate: 'Дата съёмки',
      importDate: 'Дата импорта',
      lastUpdated: 'Последнее обновление',
      duration: 'Длительность',
    },
  },
  queue: {
    title: 'Очередь обработки',
  },
} as const

export default home
