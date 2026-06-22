const player = {
  controls: {
    unmute: 'Unmute',
    mute: 'Mute',
    volume: 'Volume',
    pause: 'Pause video',
    play: 'Play video',
    fullscreen: 'Toggle fullscreen',
    fit: {
      switchToCover: 'Switch to cover mode (Press O)',
      switchToContain: 'Switch to contain mode (Press O)',
    },
    captions: {
      enable: 'Enable Captions',
      disable: 'Disable Captions',
    },
  },
  overlays: {
    aiVisionActive: 'AI Vision Active',
    hideAi: 'Hide AI',
    showAi: 'Show AI',
    modes: {
      all: 'All',
      faces: 'Faces',
      objects: 'Objects',
      text: 'Text',
    },
  },
  loading: 'Loading…',
  transcoding: {
    messages: {
      inProgress: 'Transcoding in progress…',
      preparing: 'Preparing video for playback…',
      almostThere: 'Almost there…',
    },
    description: 'Incompatible codec — creating browser-compatible proxy',
    badge: 'Transcoded Playback',
  },
} as const

export default player
