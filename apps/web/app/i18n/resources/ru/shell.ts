const shell = {
  navigation: {
    dashboard: 'Панель',
    search: 'Поиск',
    newChat: 'Новый чат',
    collections: 'Коллекции',
    projects: 'Проекты',
    faceTraining: 'Обучение лиц',
    jobs: 'Задания',
    settings: 'Настройки',
    logout: 'Выйти',
    github: 'Поставить звезду на GitHub',
  },
  services: {
    backgroundJobs: 'Фоновые задания',
    mlService: 'ML-сервис',
  },
  pagination: {
    previous: 'Назад',
    next: 'Вперёд',
    pageOf: 'Страница {{page}} из {{total}}',
  },
  videoCard: {
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
  toggle: {
    useSetting: 'Использовать настройку',
  },
  version: {
    available: 'Доступна v{{version}}',
    viewReleases: 'Открыть релизы',
  },
} as const

export default shell
