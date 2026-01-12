import type { ChatMessage } from "@prisma/client"
import type { Scene } from "@shared/schemas"

export interface ChatMessageWithScenes extends ChatMessage {
    outputScenes?: Scene[]
}

export interface PaginationInfo {
    total: number
    page: number
    limit: number
    hasMore: boolean
}
