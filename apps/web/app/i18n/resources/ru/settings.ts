const settings = {
  title: 'Настройки',
  description: 'Управляйте предпочтениями и конфигурацией приложения.',
  tabs: {
    folders: 'Папки',
    preferences: 'Предпочтения',
    advanced: 'Дополнительно',
  },
  preferences: {
    title: 'Предпочтения',
    description: 'Настройте глобальные предпочтения приложения.',
    language: {
      title: 'Язык',
      description: 'Выберите язык интерфейса для всех пользователей этой установки.',
      label: 'Язык приложения',
      en: 'Английский',
      ru: 'Русский',
      saved: 'Язык обновлён.',
      error: 'Не удалось обновить язык.',
    },
  },
  folders: {
    title: 'Папки с видео',
    description: 'Добавьте папки для автоматического сканирования и индексации видео.',
    addFolder: 'Добавить папку',
  },
  advanced: {
    immichImport: {
      title: 'Импорт из Immich',
      description: 'Импортируйте видео напрямую из вашей библиотеки Immich.',
      cta: 'Перейти к импорту из Immich',
    },
  },
} as const

export default settings
