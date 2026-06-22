const setup = {
  steps: {
    welcome: {
      title: 'Познакомьтесь\nс Edit Mind',
      description:
        'ИИ-анализ видео для монтажёров. Ищите материалы по лицам, эмоциям, объектам или произнесённым словам — за секунды.',
    },
    services: {
      title: 'Запускаем\nдвижок',
      description:
        'Edit Mind запускает локальный ML-движок и очередь заданий на вашем компьютере. Видео никогда не покидают устройство.',
    },
    folder: {
      title: 'Выберите\nбиблиотеку',
      description: 'Укажите папку с видеофайлами. Позже можно добавить другие папки.',
    },
    scanning: {
      title: 'Индексируем\nбиблиотеку',
      description:
        'Edit Mind анализирует ваши материалы кадр за кадром. Это выполняется в фоне — можно спокойно выпить кофе или чай.',
    },
  },
  header: {
    stepOf: '{{current}} из {{total}}',
    skip: 'Пропустить',
  },
  navigation: {
    goToStep: 'Перейти к шагу {{step}}',
    back: 'Назад',
    continue: 'Продолжить',
    openEditMind: 'Открыть Edit Mind',
    opening: 'Открываем…',
  },
  services: {
    backgroundJobs: 'Фоновые задания',
    mlService: 'ML-сервис',
    allOperational: 'Все системы работают',
    localProcessing: 'Анализ выполняется локально — материалы не покидают устройство',
  },
  folder: {
    selectFirst: 'Выбрать первую папку',
    invalidFormData: 'Некорректные данные папки',
    addFailed: 'Не удалось добавить папку:',
  },
} as const

export default setup
