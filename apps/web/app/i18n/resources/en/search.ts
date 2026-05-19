const search = {
  page: {
    title: 'Search',
    description: 'Find scenes by text, image, faces, objects, and emotions',
  },
  input: {
    ariaLabel: 'Search',
    imageActivePlaceholder: 'Image search active...',
    placeholder: 'Search scenes, people, objects...',
    clear: 'Clear search',
  },
  modes: {
    text: {
      label: 'Text',
      description: 'Search by keywords',
    },
    image: {
      label: 'Image',
      description: 'Search by image and text',
    },
  },
  filters: {
    active: 'Active filters',
    remove: 'Remove {{type}} filter: {{value}}',
  },
  suggestions: {
    face: 'Faces',
    object: 'Objects',
    emotion: 'Emotions',
    camera: 'Cameras',
    shotType: 'Shot Types',
    transcription: 'Transcript',
    text: 'Detected Text',
    location: 'Locations',
  },
  results: {
    searching: 'Searching scenes...',
    noScenesTitle: 'No scenes found',
    noScenesDescription: 'Try adjusting your search terms or filters',
    title: 'Search Results',
    total_one: '{{count}} video total',
    total_other: '{{count}} videos total',
    startTyping: 'Start typing to search your video scenes',
  },
  imageUpload: {
    searchImageAlt: 'Search image',
    removeImage: 'Remove image',
    searchingWithImage: 'Searching with this image',
    uploadAriaLabel: 'Upload search image',
    dropHere: 'Drop image here',
    uploadPrompt: 'Upload an image to search',
    clickOrDrag: 'Click or drag and drop',
  },
  videoCard: {
    scenePreviewAlt: 'Scene preview',
    previewUnavailable: 'Preview unavailable',
    untitledVideo: 'Untitled Video',
    thumbnailAlt: '{{name}} thumbnail',
    view: 'View {{name}}',
    viewDetails: 'View {{name}} details',
    facesDetected_one: '{{count}} face detected',
    facesDetected_other: '{{count}} faces detected',
    objectsDetected_one: '{{count}} object detected',
    objectsDetected_other: '{{count}} objects detected',
  },
} as const

export default search
