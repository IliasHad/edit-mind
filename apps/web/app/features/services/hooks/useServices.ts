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
        let socketInstance: ReturnType<typeof io> | null = null
        let disposed = false

        const connect = async () => {
            try {
                const response = await fetch('/api/socket-token', {
                    credentials: 'same-origin',
                })

                if (!response.ok) {
                    throw new Error('Unable to authenticate service status connection')
                }

                const { token } = (await response.json()) as { token: string }
                if (disposed) return

                socketInstance = io({
                    auth: { token },
                    // Start with polling so deployments that cannot upgrade a
                    // WebSocket can still receive status updates.
                    transports: ['polling', 'websocket'],
                })

                socketInstance.on('connect', () => {
                    socketInstance?.emit('request-status')
                })

                socketInstance.on('service-status', (data: ServiceStatus) => {
                    setStatus(data)
                })

                socketInstance.on('connect_error', (error) => {
                    console.error('WebSocket connection error:', error)
                })
            } catch (error) {
                console.error('Service status connection error:', error)
            }
        }

        void connect()

        return () => {
            disposed = true
            socketInstance?.disconnect()
        }
    }, [])

    return { status }
}
