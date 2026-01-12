import type { Scene } from '@shared/types/scene'
import type { ScoringResult } from '../types'

const DIALOGUE_PENALTY = -1
const PRESENTATION_PENALTY = -1

const EXCLUDED_OBJECTS = ['microphone', 'podium', 'lectern'] as const

export function calculateBRollScore(scene: Scene): ScoringResult {
    const breakdown: ScoringResult['breakdown'] = {
        boosters: [],
        penalties: [],
    }

    // Check for dialogue
    if (hasDialogue(scene)) {
        breakdown.penalties!.push({ name: 'dialogue_detected', value: DIALOGUE_PENALTY })
        return { score: DIALOGUE_PENALTY, breakdown }
    }

    // Check for presentation objects
    if (hasPresentationObjects(scene)) {
        breakdown.penalties!.push({ name: 'presentation_objects', value: PRESENTATION_PENALTY })
        return { score: PRESENTATION_PENALTY, breakdown }
    }

    return { score: 0, breakdown }
}

function hasDialogue(scene: Scene): boolean {
    const sceneDescription = scene.description?.toLowerCase() || ''
    const hasTranscription = scene.transcription?.trim().length > 0

    const dialogueKeywords = ['transcription', 'speaking', 'conversation', 'interview']
    const hasDialogueInDescription = dialogueKeywords.some((keyword) => sceneDescription.includes(keyword))

    return hasTranscription || hasDialogueInDescription
}

function hasPresentationObjects(scene: Scene): boolean {
    const sceneObjects = scene.objects.map((obj) => obj.toLowerCase())
    return sceneObjects.some((obj) => EXCLUDED_OBJECTS.includes(obj as typeof EXCLUDED_OBJECTS[number]))
}