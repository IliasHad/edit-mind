const folders = {
  jobCount_one: '{{count}} задание',
  jobCount_few: '{{count}} задания',
  jobCount_many: '{{count}} заданий',
  jobCount_other: '{{count}} задания',
  actions: {
    rescan: 'Пересканировать',
    scanning: 'Сканирование...',
  },
  stats: {
    totalFolders: 'Всего папок',
    videosScanned: 'Видео просканировано',
    totalProcessedDuration: 'Общая обработанная длительность',
  },
  settings: {
    title: 'Папки с видео',
    description: 'Добавьте папки для автоматического сканирования и индексации видео.',
    addFolder: 'Добавить папку',
    emptyTitle: 'Папки ещё не добавлены',
    emptyDescription: 'Добавьте первую папку, чтобы начать индексацию видео.',
    deleteTitle: 'Удалить папку',
    deleteDescription:
      'Удаление папки остановит индексацию новых видео. Уже добавленные в систему видео останутся на месте.',
    untitledFolder: 'Папка без названия',
    footer: 'Видео индексируются автоматически при добавлении или изменении папок.',
  },
  modal: {
    title: 'Добавить папку',
    description: 'Выберите папку на сервере для индексации.',
    root: 'Корень',
    noFolders: 'Папки не найдены',
    selected: 'Выбрано:',
    selectedButton: 'Выбрано',
    selectButton: 'Выбрать',
    addFolder: 'Добавить папку',
    cancel: 'Отмена',
  },
  card: {
    delete: 'Удалить',
    deleteFolder: 'Удалить папку {{name}}',
    videoCount_one: '{{count}} видео',
    videoCount_few: '{{count}} видео',
    videoCount_many: '{{count}} видео',
    videoCount_other: '{{count}} видео',
    lastScan: 'Последнее сканирование:',
  },
  status: {
    scanning: 'Сканирование...',
    indexed: 'Проиндексировано',
    error: 'Ошибка',
    idle: 'Ожидание',
  },
  errors: {
    invalidFormData: 'Некорректные данные папки',
    addFailed: 'Не удалось добавить папку:',
    deleteFailed: 'Не удалось удалить папку:',
  },
} as const

export default folders
