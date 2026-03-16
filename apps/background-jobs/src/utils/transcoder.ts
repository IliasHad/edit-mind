export function buildFfmpegArgs(inputPath: string, startSeconds: number): string[] {
  const args: string[] = []

  if (startSeconds > 0) {
    args.push('-ss', String(startSeconds))
  }

  args.push(
    '-i', inputPath,
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '23',
    '-profile:v', 'baseline',
    '-level', '4.0',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-ac', '2',
    '-movflags', 'frag_keyframe+empty_moov',
    '-f', 'mp4',
    'pipe:1',
  )

  return args
}
