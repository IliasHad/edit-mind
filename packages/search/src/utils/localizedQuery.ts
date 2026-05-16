import type { Suggestion, VideoSearchParams } from '@shared/types/search'

type SupportedLanguage = 'en' | 'ru' | string

type MetadataField = 'objects' | 'emotions' | 'shotType'

interface LocalizedTermMapping {
  field: MetadataField
  canonical: string
  terms: string[]
}

const RU_TERM_MAPPINGS: LocalizedTermMapping[] = [
  {
    field: 'objects',
    canonical: 'dog',
    terms: ['собака', 'собаки', 'собаку', 'собакой', 'собаке', 'собак', 'собакам', 'собаками', 'пёс', 'пса', 'псу', 'псом', 'пес'],
  },
  {
    field: 'objects',
    canonical: 'cat',
    terms: ['кошка', 'кошки', 'кошку', 'кошкой', 'кошке', 'кот', 'кота', 'коту', 'котом', 'коте'],
  },
  { field: 'objects', canonical: 'trailer', terms: ['трейлер', 'трейлера', 'трейлером', 'трейлере'] },
  { field: 'objects', canonical: 'door', terms: ['дверь', 'двери', 'дверью', 'дверей', 'дверям', 'дверями'] },
  {
    field: 'objects',
    canonical: 'person',
    terms: ['человек', 'человека', 'человеку', 'человеком', 'человеке', 'люди', 'людей', 'людям', 'людьми', 'людях'],
  },
  {
    field: 'emotions',
    canonical: 'happy',
    terms: ['счастливый', 'счастливая', 'счастливое', 'счастливые', 'счастливым', 'счастливой', 'счастливого', 'радостный', 'радостная', 'радостные', 'радость'],
  },
  { field: 'emotions', canonical: 'sad', terms: ['грустный', 'грустная', 'грустные', 'печальный', 'печальная', 'печальные'] },
  { field: 'shotType', canonical: 'close-up', terms: ['крупный план', 'крупным планом', 'крупного плана'] },
  { field: 'shotType', canonical: 'medium-shot', terms: ['средний план', 'средним планом', 'среднего плана'] },
  { field: 'shotType', canonical: 'long-shot', terms: ['общий план', 'общим планом', 'общего плана', 'дальний план', 'дальним планом', 'дальнего плана'] },
]

const RU_CANONICAL_SUGGESTION_TEXT: Partial<Record<Suggestion['type'], Record<string, string>>> = {
  object: {
    dog: 'собака',
    cat: 'кошка',
    trailer: 'трейлер',
    door: 'дверь',
    person: 'человек',
  },
  emotion: {
    happy: 'счастливый',
    sad: 'грустный',
  },
  shotType: {
    'close-up': 'крупный план',
    'medium-shot': 'средний план',
    'long-shot': 'общий план',
  },
}

function containsLocalizedTerm(query: string, term: string): boolean {
  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')
  const pattern = new RegExp(`(^|[^\\p{L}\\p{N}_])${escapedTerm}(?=$|[^\\p{L}\\p{N}_])`, 'iu')

  return pattern.test(query)
}

function appendUnique(values: string[], value: string): string[] {
  return values.includes(value) ? values : [...values, value]
}

export function normalizeLocalizedSearchQuery(query: VideoSearchParams, language: SupportedLanguage): VideoSearchParams {
  if (language !== 'ru' || !query.semanticQuery) {
    return query
  }

  const normalizedQuery: VideoSearchParams = {
    ...query,
    objects: [...query.objects],
    emotions: [...query.emotions],
  }
  const lowerQuery = query.semanticQuery.toLocaleLowerCase('ru')

  for (const mapping of RU_TERM_MAPPINGS) {
    if (!mapping.terms.some((term) => containsLocalizedTerm(lowerQuery, term))) {
      continue
    }

    switch (mapping.field) {
      case 'objects':
        normalizedQuery.objects = appendUnique(normalizedQuery.objects, mapping.canonical)
        break
      case 'emotions':
        normalizedQuery.emotions = appendUnique(normalizedQuery.emotions, mapping.canonical)
        break
      case 'shotType':
        normalizedQuery.shotType = normalizedQuery.shotType ?? mapping.canonical
        break
    }
  }

  return normalizedQuery
}

export function getSuggestionFilterValue(item: Pick<Suggestion, 'text' | 'value'>): string {
  return item.value ?? item.text
}

export function localizeCanonicalSuggestion(suggestion: Suggestion, language: SupportedLanguage): Suggestion {
  if (language !== 'ru') {
    return suggestion
  }

  const localizedText = RU_CANONICAL_SUGGESTION_TEXT[suggestion.type]?.[suggestion.value ?? suggestion.text]

  if (!localizedText) {
    return suggestion
  }

  return {
    ...suggestion,
    text: localizedText,
    displayText: localizedText,
    value: suggestion.value ?? suggestion.text,
  }
}
