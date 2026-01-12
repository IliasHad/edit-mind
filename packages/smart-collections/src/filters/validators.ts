import type { Scene } from '@shared/types/scene'

export function hasRequiredItems(
    sceneItems: unknown,
    requiredItems: string[]
): boolean {
    if (!requiredItems.length) return true

    const sceneValues = normalizeToStringArray(sceneItems)

    return requiredItems.some((required) =>
        sceneValues.includes(required.toLowerCase())
    )
}

export function isWithinTimeRanges(scene: Scene, timeRanges: number[][]): boolean {
    if (!timeRanges.length) return true

    const hour = extractHourFromTimestamp(scene.createdAt)
    if (hour === -1) return true

    return timeRanges.some(([startHour, endHour]) => {
        if (startHour <= endHour) {
            return hour >= startHour && hour < endHour
        } else {
            // Handle overnight ranges (e.g., 22:00 - 06:00)
            return hour >= startHour || hour < endHour
        }
    })
}

function normalizeToStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value.map((v) => String(v).toLowerCase())
    }
    return [String(value).toLowerCase()]
}

function extractHourFromTimestamp(timestampMs: number): number {
    try {
        return new Date(timestampMs).getUTCHours()
    } catch {
        return -1
    }
}