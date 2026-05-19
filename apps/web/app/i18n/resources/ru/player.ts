const player = {
  controls: {
    unmute: 'Включить звук',
    mute: 'Выключить звук',
    volume: 'Громкость',
    pause: 'Поставить видео на паузу',
    play: 'Воспроизвести видео',
    fullscreen: 'Переключить полноэкранный режим',
    fit: {
      switchToCover: 'Переключить в режим заполнения (нажмите O)',
      switchToContain: 'Переключить в режим вписывания (нажмите O)',
    },
    captions: {
      enable: 'Включить субтитры',
      disable: 'Выключить субтитры',
    },
  },
  overlays: {
    aiVisionActive: 'AI-зрение активно',
    hideAi: 'Скрыть AI',
    showAi: 'Показать AI',
    modes: {
      all: 'Все',
      faces: 'Лица',
      objects: 'Объекты',
      text: 'Текст',
    },
  },
  loading: 'Загрузка…',
  transcoding: {
    messages: {
      inProgress: 'Идёт транскодирование…',
      preparing: 'Подготовка видео к воспроизведению…',
      almostThere: 'Почти готово…',
    },
    description: 'Несовместимый кодек — создаём совместимую с браузером прокси-версию',
    badge: 'Транскодированное воспроизведение',
  },
} as const

export default player
