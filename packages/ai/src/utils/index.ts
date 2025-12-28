import { ChatMessage } from "@prisma/client"

export const formatHistory = (chatHistory?: ChatMessage[]) => {
  return chatHistory?.length
    ? `Recent conversation:\n${chatHistory
        .slice(-10)
        .map((m) => `${m.sender}: ${m.text}`)
        .join('\n')}`
    : ''
}
