const jobs = {
  meta: {
    title: 'Задания | Edit Mind',
  },
  title: 'AI-задания',
  jobCount_one: '{{count}} задание',
  jobCount_few: '{{count}} задания',
  jobCount_many: '{{count}} заданий',
  jobCount_other: '{{count}} задания',
  retrying: 'Повтор…',
  retryFailed: 'Повторить неудачные задания',
  queue: 'Очередь обработки',
  empty: {
    title: 'Активных заданий нет',
    description: 'Задания индексации видео появятся здесь, когда вы добавите новые видео.',
    folderDescription: 'Задания индексации видео появятся здесь, когда вы добавите новые видео в эту папку.',
  },
  status: {
    done: 'Готово',
    error: 'Ошибка',
    pending: 'Ожидает',
    processing: 'Обработка',
    cancelled: 'Отменено',
    irrecoverable: 'Не поддерживается',
  },
  stage: {
    transcoding: 'Транскодирование',
    starting: 'Запуск',
    transcribing: 'Транскрипция аудио',
    frame_analysis: 'Анализ кадров',
    creating_scenes: 'Создание сцен',
    embedding_text: 'Текстовые эмбеддинги',
    embedding_visual: 'Визуальные эмбеддинги',
    embedding_audio: 'Аудиоэмбеддинги',
  },
  actions: {
    retry: 'Повторить',
    retryJob: 'Повторить задание',
    cancel: 'Отменить',
    cancelJob: 'Отменить задание',
  },
  details: {
    cannotProcess: 'Не удаётся обработать',
    transcoding: 'Транскодирование: {{duration}}',
    transcription: 'Транскрипция: {{duration}}',
    frameAnalysis: 'Анализ кадров: {{duration}}',
    sceneCreation: 'Создание сцен: {{duration}}',
    textEmbedding: 'Текстовые эмбеддинги: {{duration}}',
    visualEmbedding: 'Визуальные эмбеддинги: {{duration}}',
    audioEmbedding: 'Аудиоэмбеддинги: {{duration}}',
  },
} as const

export default jobs
