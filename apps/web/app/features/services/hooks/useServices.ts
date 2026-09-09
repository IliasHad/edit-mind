import { useEffect, useState } from "react"
import { io } from 'socket.io-client'
import type { ServiceStatus } from "../types"

export function useServices() {

    const [status, setStatus] = useState<ServiceStatus | null>(null)

    useEffect(() => {
        // Connects same-origin: the web server proxies /socket.io to the
        // background-jobs service (see server/app.ts and vite.config.ts),
        // so this works behind any domain/reverse proxy without extra
        // configuration. See the previous VITE_BACKGROUND_JOBS_URL approach,
        // which only ever worked when the browser and Docker host were the
        // same machine, since it's a build-time value baked into the bundle.
        const socketInstance = io({
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