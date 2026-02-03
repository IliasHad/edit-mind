import type { Scene } from "@shared/types/scene"
import type { VideoWithScenes } from "@shared/types/video";

export function convertScenesToVideos(scenes: Scene[]): VideoWithScenes[] {
  const videoMap = new Map<string, VideoWithScenes>();

  for (const scene of scenes) {
    const source = scene.source;
    if (!source) continue;

    if (!videoMap.has(source)) {
      videoMap.set(source, {
        source,
        duration: scene.duration || 0,
        aspectRatio: scene.aspectRatio || 'Unknown',
        camera: scene.camera || 'Unknown',
        category: scene.category || 'Uncategorized',
        createdAt: scene.createdAt || 0,
        thumbnailUrl: scene.thumbnailUrl,
        location: scene.location,
        scenes: [],
        sceneCount: 0,
        faces: [],
        emotions: [],
        objects: [],
        shotTypes: [],
      });
    }

    const video = videoMap.get(source)!;
    video.scenes.push(scene);

    scene.faces?.forEach((f) => {
      if (!video.faces?.includes(f) && !f.toLowerCase().includes('unknown')) {
        video.faces?.push(f);
      }
    });

    scene.emotions?.forEach((e) => {
      if (!video.emotions?.includes(e.emotion)) {
        video.emotions?.push(e.emotion);
      }
    });

    scene.objects?.forEach((o) => {
      if (!video.objects?.includes(o) && !o.toLowerCase().includes('person')) {
        video.objects?.push(o);
      }
    });

    if (scene.shotType && !video.shotTypes?.includes(scene.shotType)) {
      video.shotTypes?.push(scene.shotType);
    }
  }

  return Array.from(videoMap.values()).map((video) => {
    video.scenes.sort((a, b) => a.startTime - b.startTime);
    video.sceneCount = video.scenes.length;
    return video;
  });
}