const search = {
  page: {
    title: 'Поиск',
    description: 'Находите сцены по тексту, изображению, лицам, объектам и эмоциям',
  },
  input: {
    ariaLabel: 'Поиск',
    imageActivePlaceholder: 'Поиск по изображению активен...',
    placeholder: 'Ищите сцены, людей, объекты...',
    clear: 'Очистить поиск',
  },
  modes: {
    text: {
      label: 'Текст',
      description: 'Поиск по ключевым словам',
    },
    image: {
      label: 'Изображение',
      description: 'Поиск по изображению и тексту',
    },
  },
  filters: {
    active: 'Активные фильтры',
    remove: 'Удалить фильтр {{type}}: {{value}}',
  },
  suggestions: {
    face: 'Лица',
    object: 'Объекты',
    emotion: 'Эмоции',
    camera: 'Камеры',
    shotType: 'Типы кадров',
    transcription: 'Транскрипт',
    text: 'Распознанный текст',
    location: 'Локации',
  },
  results: {
    searching: 'Ищем сцены...',
    noScenesTitle: 'Сцены не найдены',
    noScenesDescription: 'Попробуйте изменить поисковый запрос или фильтры',
    title: 'Результаты поиска',
    total_one: '{{count}} видео всего',
    total_few: '{{count}} видео всего',
    total_many: '{{count}} видео всего',
    total_other: '{{count}} видео всего',
    startTyping: 'Начните вводить запрос, чтобы искать сцены в видео',
  },
  imageUpload: {
    searchImageAlt: 'Изображение для поиска',
    removeImage: 'Удалить изображение',
    searchingWithImage: 'Ищем по этому изображению',
    uploadAriaLabel: 'Загрузить изображение для поиска',
    dropHere: 'Перетащите изображение сюда',
    uploadPrompt: 'Загрузите изображение для поиска',
    clickOrDrag: 'Нажмите или перетащите файл',
  },
  videoCard: {
    scenePreviewAlt: 'Предпросмотр сцены',
    previewUnavailable: 'Предпросмотр недоступен',
    untitledVideo: 'Видео без названия',
    thumbnailAlt: 'Миниатюра {{name}}',
    view: 'Открыть {{name}}',
    viewDetails: 'Открыть сведения о {{name}}',
    facesDetected_one: 'Обнаружено {{count}} лицо',
    facesDetected_few: 'Обнаружено {{count}} лица',
    facesDetected_many: 'Обнаружено {{count}} лиц',
    facesDetected_other: 'Обнаружено {{count}} лица',
    objectsDetected_one: 'Обнаружен {{count}} объект',
    objectsDetected_few: 'Обнаружено {{count}} объекта',
    objectsDetected_many: 'Обнаружено {{count}} объектов',
    objectsDetected_other: 'Обнаружено {{count}} объекта',
  },
} as const

export default search
