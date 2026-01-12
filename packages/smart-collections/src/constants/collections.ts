import { COLLECTION_DEFINITIONS_TYPE } from '@smart-collections/types'

export const COLLECTION_WEIGHTS: Record<string, { visual: number; audio: number; text: number }> = {
  'Cinematic Gold': {
    visual: 0.6,
    audio: 0.3,
    text: 0.1,
  },
  'B-Roll': {
    visual: 0.7,
    audio: 0.2,
    text: 0.1,
  },
  'Upbeats Music': {
    visual: 0.1,
    audio: 0.8,
    text: 0.1,
  },
  default: {
    visual: 0.5,
    audio: 0.3,
    text: 0.2,
  },
}

export const MULTI_SIGNAL_BOOSTERS: Record<
  string,
  { conditions: Record<string, string | number | boolean | string[]>; boost: number }[]
> = {
  'Cinematic Gold': [
    {
      conditions: {
        has_camera_movement: true,
        min_duration: 3,
        shallow_dof: true,
      },
      boost: 0.15,
    },
    {
      conditions: {
        dramatic_lighting: true,
        emotions: ['surprise', 'happy'],
      },
      boost: 0.1,
    },
  ],
  'B-Roll': [
    {
      conditions: {
        no_faces: true,
        camera_movement: true,
      },
      boost: 0.2,
    },
  ],
}

export const MIN_CONFIDENCE = 0.60

export const COLLECTION_DEFINITIONS: COLLECTION_DEFINITIONS_TYPE = {
  'Cinematic Gold': {
    category: 'visual_style',
    description: 'Dramatic lighting, slow motion, professional composition, cinematic shots',
    visual_queries: [
      'cinematic footage with dramatic lighting',
      'slow motion professional video',
      'epic cinematic shot with depth of field',
      'dramatic camera movement',
      'professional film production',
    ],
    audio_queries: ['cinematic atmospheric sound', 'dramatic music background', 'orchestral soundtrack'],
    filters: {
      min_duration: 2.0,
    },
    metadata_boosters: {
      objects: ['camera'],
      emotions: ['surprise', 'happy'],
    },
  },

  'Documentary Style': {
    category: 'visual_style',
    description: 'Natural lighting, authentic moments, handheld camera work',
    visual_queries: [
      'documentary style footage with natural lighting',
      'authentic handheld camera video',
      'realistic everyday moments',
      'natural documentary filming',
      'real life candid moments',
    ],
    audio_queries: ['natural ambient sound', 'real world audio', 'environmental sounds'],
    filters: {},
    metadata_boosters: {
      objects: ['person'],
      emotions: ['neutral', 'calm'],
    },
  },

  'Moody & Atmospheric': {
    category: 'visual_style',
    description: 'Low-key lighting, shadows, high contrast, dramatic atmosphere',
    visual_queries: [
      'moody atmospheric footage with shadows',
      'dark dramatic lighting',
      'high contrast cinematic video',
      'noir style lighting',
      'dramatic shadows and contrast',
    ],
    audio_queries: ['atmospheric ambient sound', 'moody background audio', 'dark ambient atmosphere'],
    filters: {},
    metadata_boosters: {
      emotions: ['sad', 'fear', 'angry'],
    },
  },

  'Sky & Clouds': {
    category: 'subject_matter',
    description: 'Sky, clouds, sunset, sunrise, atmospheric weather',
    visual_queries: [
      'blue sky with clouds',
      'sunset and sunrise sky',
      'dramatic cloud formations',
      'clear blue sky',
      'cloudy weather scene',
    ],
    audio_queries: ['wind and weather sounds', 'outdoor atmosphere', 'nature ambient sound'],
    filters: {},
    required_objects: ['sky'],
    metadata_boosters: {
      objects: ['cloud', 'airplane'],
    },
  },

  'Urban Life': {
    category: 'subject_matter',
    description: 'City streets, buildings, traffic, crowds, urban environment',
    visual_queries: [
      'busy city street with traffic',
      'urban architecture and buildings',
      'crowd of people in city',
      'downtown cityscape',
      'metropolitan area scene',
    ],
    audio_queries: ['city traffic and urban sounds', 'crowd noise and street ambience', 'urban environment sounds'],
    filters: {},
    required_objects: [],
    metadata_boosters: {
      objects: ['car', 'bus', 'truck', 'traffic light', 'building', 'person'],
    },
  },

  'Nature & Outdoors': {
    category: 'subject_matter',
    description: 'Forest, trees, mountains, landscapes, natural environments',
    visual_queries: [
      'forest with trees and nature',
      'mountain landscape scenery',
      'outdoor natural environment',
      'wilderness landscape',
      'natural scenic view',
    ],
    audio_queries: ['birds chirping and nature sounds', 'forest ambience', 'outdoor natural audio', 'wildlife sounds'],
    filters: {},
    required_objects: [],
    metadata_boosters: {
      objects: ['tree', 'mountain', 'plant', 'flower', 'grass'],
    },
  },

  'People Working': {
    category: 'subject_matter',
    description: 'Office work, typing, meetings, collaboration, professional activities',
    visual_queries: [
      'people working in office',
      'typing on laptop keyboard',
      'business meeting and collaboration',
      'professional workspace',
      'team working together',
    ],
    audio_queries: ['keyboard typing sounds', 'office conversation', 'workplace ambience', 'meeting discussion'],
    filters: {
      min_faces: 1,
    },
    required_objects: [],
    metadata_boosters: {
      objects: ['laptop', 'keyboard', 'mouse', 'desk', 'chair', 'book'],
    },
  },

  'Food & Cooking': {
    category: 'subject_matter',
    description: 'Cooking, food preparation, plated dishes, dining',
    visual_queries: [
      'cooking food in kitchen',
      'delicious plated food',
      'chef preparing meal',
      'food presentation',
      'culinary preparation',
    ],
    audio_queries: [
      'cooking sounds and sizzling',
      'kitchen ambience',
      'food preparation audio',
      'cutting and chopping sounds',
    ],
    filters: {},
    required_objects: [],
    metadata_boosters: {
      objects: ['bowl', 'cup', 'fork', 'knife', 'spoon', 'bottle', 'wine glass'],
    },
  },

  'Inspiring & Uplifting': {
    category: 'emotional_tone',
    description: 'Achievement, success, joy, celebration, positive energy',
    visual_queries: [
      'inspiring success and achievement',
      'joyful celebration moment',
      'uplifting positive energy',
      'victorious achievement',
      'happy celebration',
    ],
    audio_queries: ['upbeat inspiring music', 'cheerful happy sounds', 'celebration audio'],
    filters: {},
    required_emotions: [],
    metadata_boosters: {
      emotions: ['happy', 'surprise'],
    },
  },

  'Calm & Peaceful': {
    category: 'emotional_tone',
    description: 'Meditation, tranquility, slow peaceful moments, serenity',
    visual_queries: [
      'calm peaceful scenery',
      'tranquil meditation moment',
      'serene quiet environment',
      'relaxing peaceful scene',
      'zen tranquility',
    ],
    audio_queries: ['peaceful ambient sound', 'calm relaxing audio', 'quiet meditation atmosphere', 'soothing sounds'],
    filters: {},
    required_emotions: [],
    metadata_boosters: {
      emotions: ['calm', 'neutral'],
      objects: ['bed', 'couch'],
    },
  },

  'Energetic & Dynamic': {
    category: 'emotional_tone',
    description: 'Fast movement, sports, action, high energy activities',
    visual_queries: [
      'fast energetic action',
      'dynamic sports movement',
      'high energy activity',
      'intense physical action',
      'rapid dynamic movement',
    ],
    audio_queries: ['energetic upbeat music', 'action sounds and movement', 'fast paced audio'],
    filters: {
      min_duration: 2.0,
    },
    metadata_boosters: {
      objects: ['sports ball', 'bicycle', 'skateboard', 'surfboard'],
    },
  },

  'Golden Hour': {
    category: 'time_of_day',
    description: 'Warm soft lighting, sunrise and sunset, golden tones',
    visual_queries: [
      'golden hour warm lighting',
      'sunrise sunset golden glow',
      'soft warm evening light',
      'magic hour photography',
      'warm golden sunlight',
    ],
    audio_queries: ['peaceful morning sounds', 'evening ambient audio', 'dawn or dusk atmosphere'],
    filters: {},
    time_ranges: [
      [5, 8],
      [17, 20],
    ], // 5-8 AM, 5-8 PM
  },

  'Blue Hour': {
    category: 'time_of_day',
    description: 'Twilight, dusk, cool blue tones, pre-dawn or post-sunset',
    visual_queries: [
      'blue hour twilight atmosphere',
      'dusk with cool blue tones',
      'evening twilight scene',
      'pre-dawn blue light',
      'twilight hour photography',
    ],
    audio_queries: ['twilight evening sounds', 'dusk ambient audio', 'evening transition sounds'],
    filters: {},
    time_ranges: [
      [4, 6],
      [19, 21],
    ], // 4-6 AM, 7-9 PM
  },

  Nighttime: {
    category: 'time_of_day',
    description: 'Low light, artificial lighting, night scenes',
    visual_queries: [
      'nighttime scene with artificial lights',
      'dark evening low light',
      'night city illumination',
      'after dark scene',
      'nocturnal lighting',
    ],
    audio_queries: ['night ambient sounds', 'evening atmosphere', 'nighttime environmental audio'],
    filters: {},
    time_ranges: [
      [21, 24],
      [0, 5],
    ], // 9 PM - 5 AM
  },

  'Midday Bright': {
    category: 'time_of_day',
    description: 'High sun, strong shadows, bright daylight',
    visual_queries: [
      'bright midday sunlight',
      'strong daylight with shadows',
      'high noon bright scene',
      'daytime full sun',
      'bright outdoor lighting',
    ],
    audio_queries: ['daytime ambient sounds', 'busy day atmosphere', 'midday environmental sounds'],
    filters: {},
    time_ranges: [[10, 16]], // 10 AM - 4 PM
  },

  'Tech & Business': {
    category: 'use_case',
    description: 'Devices, screens, offices, teamwork, technology',
    visual_queries: [
      'modern technology and devices',
      'business team collaboration',
      'office work environment',
      'digital technology use',
      'professional workplace',
    ],
    audio_queries: ['office workplace sounds', 'keyboard and mouse clicks', 'technology sounds'],
    filters: {},
    required_objects: [],
    metadata_boosters: {
      objects: ['laptop', 'cell phone', 'keyboard', 'mouse', 'tv', 'remote'],
    },
  },

  'Travel & Tourism': {
    category: 'use_case',
    description: 'Landmarks, destinations, transportation, adventure',
    visual_queries: [
      'travel destination landmark',
      'tourist exploring location',
      'adventure and journey',
      'vacation travel footage',
      'tourism destination',
    ],
    audio_queries: ['travel ambient sounds', 'tourist destination atmosphere', 'transportation sounds'],
    filters: {},
    required_objects: [],
    metadata_boosters: {
      objects: ['suitcase', 'backpack', 'airplane', 'train', 'bus', 'boat'],
    },
  },

  'Fitness & Wellness': {
    category: 'use_case',
    description: 'Exercise, yoga, sports, healthy lifestyle',
    visual_queries: [
      'person exercising and fitness',
      'yoga and wellness activity',
      'healthy active lifestyle',
      'workout and training',
      'physical fitness activity',
    ],
    audio_queries: ['gym workout sounds', 'peaceful yoga atmosphere', 'exercise environment'],
    filters: {
      min_faces: 1,
    },
    required_objects: [],
    metadata_boosters: {
      objects: ['sports ball', 'bicycle', 'skateboard'],
    },
  },
  'Beach & Coastal': {
    category: 'location',
    description: 'Beach scenes, coastal areas, seaside environments',
    visual_queries: [
      'beach with sand and ocean',
      'coastal shoreline scenery',
      'seaside beach environment',
      'tropical beach paradise',
      'beachfront coastal view',
    ],
    audio_queries: ['ocean waves and seagulls', 'beach ambient sounds', 'coastal water sounds'],
    filters: {},
    metadata_boosters: {
      objects: ['surfboard', 'umbrella', 'boat'],
    },
  },
  'Mountain & Alpine': {
    category: 'location',
    description: 'Mountain ranges, peaks, alpine environments',
    visual_queries: [
      'mountain peak scenery',
      'alpine mountain landscape',
      'mountain range view',
      'snowy mountain peaks',
      'mountainous terrain',
    ],
    audio_queries: ['mountain wind sounds', 'alpine atmosphere', 'mountain ambient audio'],
    filters: {},
    metadata_boosters: {
      objects: ['mountain', 'snow', 'ski'],
    },
  },

  'Desert & Arid': {
    category: 'location',
    description: 'Desert landscapes, sand dunes, arid environments',
    visual_queries: [
      'desert sand dunes',
      'arid desert landscape',
      'sandy desert environment',
      'desert terrain scenery',
      'dry arid landscape',
    ],
    audio_queries: ['desert wind sounds', 'arid environment atmosphere', 'desert ambient audio'],
    filters: {},
    metadata_boosters: {
      objects: [],
    },
  },
  'Forest & Woodland': {
    category: 'location',
    description: 'Forest environments, wooded areas, dense vegetation',
    visual_queries: [
      'dense forest with trees',
      'woodland forest environment',
      'forest path through trees',
      'lush forest scenery',
      'wooded area landscape',
    ],
    audio_queries: ['forest birds and nature', 'woodland ambience', 'forest sounds'],
    filters: {},
    metadata_boosters: {
      objects: ['tree', 'plant', 'bird'],
    },
  },

  'Urban Downtown': {
    category: 'location',
    description: 'City centers, downtown areas, metropolitan districts',
    visual_queries: [
      'downtown city center',
      'urban metropolitan area',
      'busy city downtown',
      'cityscape with skyscrapers',
      'urban downtown district',
    ],
    audio_queries: ['city traffic sounds', 'urban downtown ambience', 'metropolitan noise'],
    filters: {},
    metadata_boosters: {
      objects: ['building', 'car', 'bus', 'traffic light', 'person'],
    },
  },

  'Parks & Gardens': {
    category: 'location',
    description: 'Public parks, gardens, green spaces',
    visual_queries: [
      'park with green grass',
      'garden with flowers and plants',
      'public park scenery',
      'botanical garden view',
      'green park space',
    ],
    audio_queries: ['park birds and nature', 'garden ambience', 'outdoor park sounds'],
    filters: {},
    metadata_boosters: {
      objects: ['tree', 'flower', 'plant', 'grass', 'bench'],
    },
  },
  'Rural & Countryside': {
    category: 'location',
    description: 'Farmland, rural areas, countryside scenes',
    visual_queries: [
      'rural countryside scenery',
      'farmland and fields',
      'country road landscape',
      'agricultural rural area',
      'pastoral countryside',
    ],
    audio_queries: ['farm animal sounds', 'rural countryside ambience', 'nature and farm audio'],
    filters: {},
    metadata_boosters: {
      objects: ['horse', 'cow', 'sheep', 'bird'],
    },
  },

  'Vintage & Retro': {
    category: 'visual_style',
    description: 'Vintage aesthetics, retro colors, nostalgic film-like quality',
    visual_queries: [
      'vintage retro film aesthetic',
      'nostalgic old-fashioned look',
      'classic retro style video',
      'vintage color grading',
      'retro nostalgic footage',
    ],
    audio_queries: ['vintage audio quality', 'retro music style', 'nostalgic sound'],
    filters: {},
    metadata_boosters: {
      objects: ['clock', 'tv', 'book'],
    },
  },

  'High Contrast B&W': {
    category: 'visual_style',
    description: 'Black and white, high contrast, dramatic monochrome',
    visual_queries: [
      'black and white high contrast',
      'dramatic monochrome footage',
      'noir black and white style',
      'grayscale high contrast video',
      'artistic black and white',
    ],
    audio_queries: ['minimal atmospheric sound', 'stark audio atmosphere'],
    filters: {},
    metadata_boosters: {
      emotions: ['neutral', 'sad'],
    },
  },

  'Minimalist Clean': {
    category: 'visual_style',
    description: 'Simple composition, negative space, minimal elements',
    visual_queries: [
      'minimalist simple composition',
      'clean negative space design',
      'minimal aesthetic footage',
      'simple uncluttered scene',
      'minimalist architecture',
    ],
    audio_queries: ['quiet minimal ambience', 'sparse audio environment'],
    filters: {},
    metadata_boosters: {
      objects: ['wall', 'table', 'chair'],
    },
  },

  'Aerial & Drone': {
    category: 'visual_style',
    description: "Aerial views, bird's eye perspective, sweeping overhead shots",
    visual_queries: [
      'aerial drone footage from above',
      'overhead bird eye view',
      'sweeping aerial landscape',
      'high altitude drone shot',
      'top down aerial perspective',
    ],
    audio_queries: ['wind and altitude sounds', 'aerial ambient audio'],
    filters: {
      min_duration: 3.0,
    },
    metadata_boosters: {
      objects: ['airplane'],
    },
  },

  'Sports & Action': {
    category: 'subject_matter',
    description: 'Athletic activities, competitive sports, physical games',
    visual_queries: [
      'athletic sports activity',
      'competitive game action',
      'physical sport movement',
      'team sports play',
      'individual athletic performance',
    ],
    audio_queries: ['sports game sounds', 'crowd cheering', 'athletic activity audio'],
    filters: {
      min_duration: 2.0,
    },
    required_objects: [],
    metadata_boosters: {
      objects: [
        'sports ball',
        'baseball bat',
        'baseball glove',
        'tennis racket',
        'skateboard',
        'surfboard',
        'skis',
        'snowboard',
      ],
      emotions: ['happy', 'surprise'],
    },
  },

  'Fashion & Style': {
    category: 'subject_matter',
    description: 'Clothing, accessories, fashion shows, style and design',
    visual_queries: [
      'fashion style and clothing',
      'stylish outfit and accessories',
      'fashion design showcase',
      'trendy clothing style',
      'fashion photography',
    ],
    audio_queries: ['fashion show music', 'stylish ambient sound'],
    filters: {
      min_faces: 1,
    },
    required_objects: [],
    metadata_boosters: {
      objects: ['tie', 'handbag', 'suitcase', 'umbrella', 'backpack'],
    },
  },

  'Celebrations & Events': {
    category: 'subject_matter',
    description: 'Parties, weddings, birthdays, holidays, festive gatherings',
    visual_queries: [
      'celebration party event',
      'festive gathering celebration',
      'wedding ceremony event',
      'birthday party celebration',
      'holiday festive occasion',
    ],
    audio_queries: ['party celebration sounds', 'festive music', 'crowd celebration audio', 'event ambience'],
    filters: {
      min_faces: 1,
    },
    required_objects: [],
    metadata_boosters: {
      objects: ['cake', 'wine glass', 'bottle', 'dining table'],
      emotions: ['happy', 'surprise'],
    },
  },

  'Home & Interiors': {
    category: 'subject_matter',
    description: 'Indoor spaces, home life, domestic environments, living spaces',
    visual_queries: [
      'cozy home interior space',
      'domestic living room',
      'comfortable home environment',
      'indoor residential space',
      'household interior design',
    ],
    audio_queries: ['home ambient sounds', 'indoor domestic audio', 'household environment'],
    filters: {},
    required_objects: [],
    metadata_boosters: {
      objects: ['couch', 'chair', 'bed', 'dining table', 'tv', 'potted plant', 'vase', 'clock'],
    },
  },

  'Dramatic & Intense': {
    category: 'emotional_tone',
    description: 'High tension, conflict, dramatic moments, intense emotion',
    visual_queries: [
      'dramatic intense moment',
      'high tension conflict scene',
      'emotionally charged situation',
      'intense dramatic action',
      'powerful emotional scene',
    ],
    audio_queries: ['dramatic intense music', 'tension sound design', 'powerful emotional audio'],
    filters: {},
    required_emotions: [],
    metadata_boosters: {
      emotions: ['angry', 'fear', 'surprise'],
    },
  },

  'Playful & Fun': {
    category: 'emotional_tone',
    description: 'Lighthearted, playful, fun activities, entertainment',
    visual_queries: [
      'playful fun activity',
      'lighthearted entertainment',
      'joyful playful moment',
      'fun recreational activity',
      'entertaining playful scene',
    ],
    audio_queries: ['playful upbeat music', 'fun laughter sounds', 'entertaining audio'],
    filters: {},
    required_emotions: [],
    metadata_boosters: {
      emotions: ['happy', 'surprise'],
      objects: ['sports ball', 'frisbee', 'kite', 'skateboard'],
    },
  },

  'Mysterious & Curious': {
    category: 'emotional_tone',
    description: 'Intrigue, mystery, exploration, discovery, curiosity',
    visual_queries: [
      'mysterious intriguing scene',
      'curious exploration moment',
      'enigmatic mysterious atmosphere',
      'discovery and intrigue',
      'curious investigative scene',
    ],
    audio_queries: ['mysterious ambient sound', 'curious audio atmosphere', 'enigmatic sound design'],
    filters: {},
    required_emotions: [],
    metadata_boosters: {
      emotions: ['neutral', 'surprise', 'fear'],
    },
  },

  'Romantic & Intimate': {
    category: 'emotional_tone',
    description: 'Love, romance, intimate moments, emotional connections',
    visual_queries: [
      'romantic intimate moment',
      'loving couple together',
      'emotional romantic scene',
      'intimate personal connection',
      'tender romantic atmosphere',
    ],
    audio_queries: ['romantic soft music', 'intimate ambient sound', 'tender emotional audio'],
    filters: {
      min_faces: 2,
    },
    required_emotions: [],
    metadata_boosters: {
      emotions: ['happy', 'calm'],
      objects: ['wine glass', 'dining table', 'couch'],
    },
  },

  'Overcast & Cloudy': {
    category: 'time_of_day',
    description: 'Cloudy weather, diffused light, overcast skies',
    visual_queries: [
      'overcast cloudy sky',
      'diffused cloudy lighting',
      'gray overcast weather',
      'cloudy atmospheric conditions',
      'soft overcast daylight',
    ],
    audio_queries: ['cloudy day ambience', 'overcast weather sounds'],
    filters: {},
    metadata_boosters: {
      objects: ['cloud', 'sky', 'umbrella'],
    },
  },

  'Rainy & Stormy': {
    category: 'time_of_day',
    description: 'Rain, storms, wet conditions, dramatic weather',
    visual_queries: [
      'rainy weather with raindrops',
      'stormy dramatic weather',
      'wet rainy conditions',
      'rainfall and storm',
      'rainy day atmosphere',
    ],
    audio_queries: ['rain and thunder sounds', 'stormy weather audio', 'rainfall ambience'],
    filters: {},
    metadata_boosters: {
      objects: ['umbrella'],
    },
  },

  'Educational & Tutorial': {
    category: 'use_case',
    description: 'Instructional content, how-to demonstrations, learning material',
    visual_queries: [
      'instructional demonstration video',
      'educational tutorial content',
      'how-to teaching moment',
      'learning and instruction',
      'step by step tutorial',
    ],
    audio_queries: ['clear instructional audio', 'tutorial explanation', 'educational narration'],
    filters: {},
    metadata_boosters: {
      objects: ['laptop', 'book', 'cell phone'],
    },
  },

  'Product Showcase': {
    category: 'use_case',
    description: 'Product demonstrations, reviews, commercial presentations',
    visual_queries: [
      'product demonstration showcase',
      'commercial product display',
      'item presentation video',
      'product review footage',
      'showcase and demonstration',
    ],
    audio_queries: ['product demonstration audio', 'commercial presentation sound'],
    filters: {
      min_duration: 2.0,
    },
    metadata_boosters: {
      objects: ['cell phone', 'laptop', 'bottle', 'cup', 'bowl', 'vase'],
    },
  },

  'B-Roll': {
    category: 'b_roll',
    description:
      'Pure supplemental footage without dialogue - establishing shots, cutaways, transitions, environmental scenes, and detail shots perfect for editing',
    visual_queries: [
      'establishing shot scenic view',
      'smooth camera movement no people talking',
      'detailed close-up object texture',
      'empty scenic landscape',
      'architectural detail shot',
      'nature background footage',
      'urban environment no dialogue',
      'slow motion detail',
      'product close-up detail',
      'atmospheric environmental scene',
      'transition shot movement',
      'texture pattern detail',
      'time-lapse sequence',
      'overhead flat-lay shot',
      'silhouette atmospheric',
      'abstract visual detail',
      'hands working silent activity',
      'empty street or space',
    ],
    audio_queries: [
      'ambient sound no dialogue',
      'environmental background only',
      'atmospheric sounds no speech',
      'natural ambience no talking',
      'quiet location sound',
      'pure environmental audio',
    ],
    filters: {
      min_duration: 1.5,
      max_duration: 15,
      max_faces: 1,
    },

    metadata_boosters: {
      objects: [
        // Environmental/Nature
        'sky',
        'cloud',
        'tree',
        'mountain',
        'plant',
        'flower',
        'grass',
        'water',
        // Architecture/Urban
        'building',
        'traffic light',
        'bench',
        'clock',
        'street',
        // Objects/Details
        'cup',
        'bottle',
        'book',
        'vase',
        'potted plant',
        // Food
        'bowl',
        'fork',
        'knife',
        'spoon',
        'wine glass',
        // Tech (when not in use)
        'laptop',
        'keyboard',
        'mouse',
        // Transportation
        'car',
        'bicycle',
        'boat',
        'airplane',
        // Furniture
        'desk',
        'chair',
        'table',
      ],
      shotTypes: [
        'wide shot',
        'establishing shot',
        'close-up',
        'extreme close-up',
        'detail shot',
        'insert shot',
        'cutaway',
        'pan',
        'tilt',
        'tracking shot',
        'dolly',
        'crane shot',
        'overhead',
        'flat lay',
      ],
    },
  },
  'Happy Moments': {
    category: 'emotional_tone',
    description: 'Joyful expressions, laughter, smiles, positive interactions',
    visual_queries: [
      'people laughing and smiling happily',
      'joyful happy expressions',
      'genuine smile and laughter',
      'cheerful happy moment',
      'delighted happy faces',
    ],
    audio_queries: ['laughter and happy sounds', 'joyful voices', 'cheerful conversation'],
    filters: {
      min_faces: 1,
    },
    required_emotions: ['happy'],
    metadata_boosters: {
      emotions: ['happy', 'surprise'],
    },
  },
  'Celebration Moments': {
    category: 'subject_matter',
    description: 'Toasts, cheers, clapping, group celebrations, special occasions',
    visual_queries: [
      'people celebrating together cheering',
      'group toast with drinks raised',
      'clapping and applause celebration',
      'festive celebration gathering',
      'achievement celebration moment',
    ],
    audio_queries: ['cheering and applause', 'celebration sounds', 'party cheers', 'group celebration audio'],
    filters: {
      min_faces: 2,
    },
    required_emotions: ['happy'],
    metadata_boosters: {
      objects: ['wine glass', 'bottle', 'cake', 'dining table'],
      emotions: ['happy', 'surprise'],
    },
  },
  'Milestone Achievements': {
    category: 'emotional_tone',
    description: 'Graduations, awards, accomplishments, proud moments',
    visual_queries: [
      'graduation ceremony achievement',
      'award presentation moment',
      'accomplishment celebration pride',
      'milestone achievement recognition',
      'proud achievement moment',
    ],
    audio_queries: ['applause and cheering', 'ceremonial music', 'proud celebration sounds'],
    filters: {
      min_faces: 1,
    },
    metadata_boosters: {
      emotions: ['happy', 'surprise'],
      objects: ['tie', 'book'],
    },
  },
  'Biking & Cycling': {
    category: 'subject_matter',
    description: 'Bicycle riding, cycling activities, bike tours, mountain biking',
    visual_queries: [
      'person riding bicycle cycling',
      'bike ride outdoor activity',
      'cycling on road or trail',
      'mountain bike riding',
      'bicycle tour and ride',
    ],
    audio_queries: ['bicycle sounds and movement', 'cycling outdoor audio', 'bike riding ambience'],
    filters: {
      min_duration: 2.0,
    },
    required_objects: ['bicycle'],
    metadata_boosters: {
      objects: ['bicycle', 'backpack', 'helmet'],
      emotions: ['happy', 'neutral'],
    },
  },
  'Hiking & Trekking': {
    category: 'subject_matter',
    description: 'Trail walking, mountain hiking, outdoor trekking adventures',
    visual_queries: [
      'hiking on mountain trail',
      'trekking outdoor adventure',
      'walking on nature trail',
      'backpacking hiking journey',
      'outdoor hiking expedition',
    ],
    audio_queries: ['hiking footsteps sounds', 'outdoor trail ambience', 'nature hiking audio'],
    filters: {
      min_duration: 2.0,
    },
    metadata_boosters: {
      objects: ['backpack', 'mountain', 'tree', 'person'],
    },
  },
  'Dancing & Movement': {
    category: 'subject_matter',
    description: 'Dancing, choreography, rhythmic movement, dance performances',
    visual_queries: [
      'people dancing movement',
      'dance performance choreography',
      'rhythmic body movement',
      'dancing celebration party',
      'artistic dance expression',
    ],
    audio_queries: ['dance music beats', 'rhythmic music', 'party dance music'],
    filters: {
      min_faces: 1,
      min_duration: 2.0,
    },
    metadata_boosters: {
      emotions: ['happy', 'surprise'],
    },
  },
  'Road Trips & Driving': {
    category: 'subject_matter',
    description: 'Car journeys, road travel, scenic drives, vehicle interiors',
    visual_queries: [
      'driving on scenic road',
      'road trip journey view',
      'car interior dashboard view',
      'highway driving travel',
      'vehicle road journey',
    ],
    audio_queries: ['car engine and road sounds', 'driving ambience', 'vehicle travel audio'],
    filters: {
      min_duration: 2.0,
    },
    required_objects: ['car'],
    metadata_boosters: {
      objects: ['car', 'truck', 'backpack'],
    },
  },
  'Conversations & Talks': {
    category: 'subject_matter',
    description: 'People talking, discussions, interviews, dialogues',
    visual_queries: [
      'people having conversation',
      'face to face discussion',
      'interview or dialogue',
      'talking and communicating',
      'engaged conversation moment',
    ],
    audio_queries: ['conversation and talking', 'discussion audio', 'interview dialogue'],
    filters: {
      min_faces: 2,
    },
    metadata_boosters: {
      objects: ['microphone', 'chair', 'table'],
      emotions: ['neutral', 'happy'],
    },
  },
  'Music & Performance': {
    category: 'subject_matter',
    description: 'Musical instruments, singing, live performances, music creation',
    visual_queries: [
      'playing musical instrument',
      'singing music performance',
      'live music concert',
      'musician performing music',
      'musical creation and play',
    ],
    audio_queries: ['musical instrument sounds', 'singing and music', 'live performance audio', 'musical composition'],
    filters: {
      min_faces: 1,
    },
    metadata_boosters: {
      objects: [],
    },
  },
  'Presentations & Speaking': {
    category: 'use_case',
    description: 'Public speaking, presentations, lectures, speeches',
    visual_queries: [
      'person giving presentation',
      'public speaking to audience',
      'lecture or speech delivery',
      'presenter with slides',
      'speaking to group',
    ],
    audio_queries: ['presentation speech audio', 'public speaking voice', 'lecture narration'],
    filters: {
      min_faces: 1,
    },
    metadata_boosters: {
      objects: ['laptop', 'tv', 'microphone'],
    },
  },
  'Creative Work': {
    category: 'use_case',
    description: 'Design work, creative process, artistic production',
    visual_queries: [
      'creative design work process',
      'artist creating artwork',
      'designer working on project',
      'creative production activity',
      'artistic work in progress',
    ],
    audio_queries: ['creative workspace sounds', 'design work audio'],
    filters: {},
    metadata_boosters: {
      objects: ['laptop', 'mouse', 'keyboard', 'book'],
    },
  },
  'Remote Work & Video Calls': {
    category: 'use_case',
    description: 'Video conferencing, remote meetings, online collaboration',
    visual_queries: [
      'video call meeting online',
      'remote work from home',
      'online video conference',
      'virtual meeting participation',
      'screen with video call',
    ],
    audio_queries: ['video call audio', 'remote meeting sounds', 'online conference audio'],
    filters: {
      min_faces: 1,
    },
    metadata_boosters: {
      objects: ['laptop', 'cell phone', 'tv'],
    },
  },
  'Coffee & Cafes': {
    category: 'subject_matter',
    description: 'Coffee shops, cafe moments, coffee drinking, cafe culture',
    visual_queries: [
      'coffee cup in cafe',
      'cafe coffee shop atmosphere',
      'drinking coffee moment',
      'barista making coffee',
      'coffee shop interior',
    ],
    audio_queries: ['cafe ambience sounds', 'coffee shop atmosphere', 'espresso machine sounds'],
    filters: {},
    metadata_boosters: {
      objects: ['cup', 'dining table', 'chair'],
    },
  },
  'Outdoor Dining': {
    category: 'subject_matter',
    description: 'Al fresco dining, picnics, outdoor eating, patio meals',
    visual_queries: [
      'outdoor dining al fresco',
      'picnic eating outside',
      'patio restaurant dining',
      'eating meal outdoors',
      'outdoor lunch or dinner',
    ],
    audio_queries: ['outdoor dining ambience', 'restaurant patio sounds', 'picnic atmosphere'],
    filters: {},
    metadata_boosters: {
      objects: ['dining table', 'chair', 'umbrella', 'wine glass', 'fork', 'knife'],
    },
  },
  'Running & Jogging': {
    category: 'subject_matter',
    description: 'Running, jogging, cardio exercise, track running',
    visual_queries: [
      'person running jogging',
      'runner in motion exercise',
      'jogging outdoor activity',
      'cardio running workout',
      'marathon or track running',
    ],
    audio_queries: ['running footsteps', 'breathing and running sounds', 'jogging audio'],
    filters: {
      min_faces: 1,
    },
    metadata_boosters: {
      objects: ['person', 'sports ball'],
      emotions: ['neutral'],
    },
  },

  'Swimming & Water Sports': {
    category: 'subject_matter',
    description: 'Swimming, diving, water activities, aquatic sports',
    visual_queries: [
      'swimming in pool or ocean',
      'diving into water',
      'water sport activity',
      'swimming laps exercise',
      'aquatic sport action',
    ],
    audio_queries: ['swimming water sounds', 'pool splashing', 'water sport audio'],
    filters: {},
    metadata_boosters: {
      objects: ['surfboard', 'sports ball'],
    },
  },
  'Unboxing & Reviews': {
    category: 'use_case',
    description: 'Opening packages, product unboxing, first impressions',
    visual_queries: [
      'unboxing product package',
      'opening new product box',
      'product reveal unboxing',
      'package opening first look',
      'unbox and review item',
    ],
    audio_queries: ['unboxing sounds', 'package opening audio', 'product reveal sounds'],
    filters: {},
    metadata_boosters: {
      objects: ['suitcase', 'handbag', 'backpack'],
    },
  },
  'Selfies & Vlogging': {
    category: 'use_case',
    description: 'Self-recorded content, talking to camera, personal vlogs',
    visual_queries: [
      'person talking directly to camera',
      'selfie style recording',
      'vlogger speaking to audience',
      'self-recorded video diary',
      'direct camera address',
    ],
    audio_queries: ['person speaking to camera', 'vlog narration', 'direct address audio'],
    filters: {
      min_faces: 1,
      aspectRatio_range: [0.5, 1.0],
    },
    metadata_boosters: {
      objects: ['cell phone'],
    },
  },

  'Behind the Scenes': {
    category: 'use_case',
    description: 'BTS footage, production moments, off-camera content',
    visual_queries: [
      'behind the scenes production',
      'off camera moment',
      'making of footage',
      'backstage preparation',
      'crew and equipment visible',
    ],
    audio_queries: ['production sounds', 'crew talking', 'equipment noise'],
    filters: {},
    metadata_boosters: {
      objects: ['camera', 'microphone', 'laptop'],
    },
  },

  'Screen Recordings': {
    category: 'use_case',
    description: 'Computer screens, software demos, digital interfaces',
    visual_queries: [
      'computer screen recording',
      'software interface demonstration',
      'digital screen capture',
      'application walkthrough',
      'screen share content',
    ],
    audio_queries: ['computer interface sounds', 'software audio', 'typing and clicks'],
    filters: {},
    metadata_boosters: {
      objects: ['laptop', 'tv', 'monitor', 'keyboard', 'mouse'],
    },
  },
  'POV & First Person': {
    category: 'technical',
    description: 'Point of view shots, first-person perspective, immersive angles',
    visual_queries: [
      'first person POV perspective',
      'point of view camera angle',
      'immersive first person shot',
      'POV action perspective',
      'subjective camera view',
    ],
    audio_queries: ['immersive POV audio', 'first person sound perspective'],
    filters: {},
    metadata_boosters: {},
  },
  'Home Office & Workspace': {
    category: 'location',
    description: 'Home offices, study rooms, work from home spaces',
    visual_queries: [
      'home office workspace',
      'study room with desk',
      'work from home setup',
      'personal office space',
      'home desk workspace',
    ],
    audio_queries: ['home office sounds', 'workspace ambience', 'typing and work audio'],
    filters: {},
    metadata_boosters: {
      objects: ['desk', 'chair', 'laptop', 'keyboard', 'mouse', 'monitor', 'book'],
    },
  },
  'Upbeats Music': {
    category: 'audio',
    description: 'Moments captured while having upbeats music',
    visual_queries: [],
    audio_queries: [
      'upbeat energetic music',
      'positive high energy music',
      'feel good upbeat track',
      'happy energetic background music',

      'fast tempo rhythmic music',
      'high bpm electronic beat',
      'driving rhythm upbeat song',

      'upbeat pop instrumental',
      'energetic electronic music',
      'modern upbeat indie music',

      'uplifting vlog background music',
      'energetic travel video music',
      'upbeat workout background music',
      'motivational intro music',
    ],
    filters: {},
    metadata_boosters: {},
  },
}

export const TYPE_LABELS: Record<string, string> = {
  visual_style: 'Visual Style',
  subject_matter: 'Subject Matter',
  emotional_tone: 'Tone',
  aspectRatio: 'Aspect Ratio',
  time_of_day: 'Time of Day',
  use_case: 'Use Case',
  location: 'Locations',
  geographic_location: 'Geographic Locations',
  person: 'Faces',
  people: 'People',
  custom: 'custom',
  b_roll: 'B Rolls',
  audio: 'Audio',
}
export const COLLECTIONS_BATCH_SIZE = 100

export const SMART_COLLECTION_CRON_PATTERN = '0 0 * * *'
