export function getAspectRatioDescription(aspectRatio: string): string {
  const descriptions: Record<string, string> = {
    '16:9': 'widescreen (16:9)',
    '9:16': 'vertical/portrait (9:16)',
    '1:1': 'square (1:1)',
    '4:3': 'standard (4:3)',
    '21:9': 'ultra-widescreen (21:9)',
    '2:1': 'cinematic (2:1)',
    '8:7': 'near-square (8:7)',
  }

  return descriptions[aspectRatio] || aspectRatio
}
