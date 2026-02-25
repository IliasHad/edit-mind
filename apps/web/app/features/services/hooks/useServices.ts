import { useEffect, useState } from "react"
import { io } from 'socket.io-client'
import type { ServiceStatus } from "../types"

export function useServices() {

    const [status, setStatus] = useState<ServiceStatus | null>(null)

    useEffect(() => {
        const socketInstance = io(import.meta.env.VITE_BACKGROUND_JOBS_URL || 'http://localhost:4000', {
            transports: ['websocket', 'polling'],
        })

        socketInstance.on('connect', () => {
            socketInstance.emit('request-status')
        })

        socketInstance.on('service-status', (data: ServiceStatus) => {
            setStatus(data)
        })

        socketInstance.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error)
        })

        return () => {
            socketInstance.disconnect()
        }
    }, [])

    return { status }
}