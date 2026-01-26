import { useState } from 'react'
import { useImmichStore } from '../stores'
import type { ImmichConnectionStatus } from '../types'
import { type ImmichConfig } from '@immich/types/immich'

export function useImmichForm() {
  const { saveIntegration, updateIntegration, testConnection, integration, isLoading } = useImmichStore()
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ImmichConnectionStatus | undefined>(undefined)

  const handleTestConnection = async (config: ImmichConfig) => {
    setIsTestingConnection(true)
    setConnectionStatus(undefined)

    try {
      const { success, message } = await testConnection(config)
      setConnectionStatus({
        success,
        message,
      })
    } catch (error) {
      setConnectionStatus({
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
      })
    } finally {
      setIsTestingConnection(false)
    }
  }

  const handleSubmit = async (config: ImmichConfig) => {
    if (integration) {
      return await updateIntegration(config)
    } else {
      return await saveIntegration(config)
    }
  }

  return {
    handleTestConnection,
    handleSubmit,
    isTestingConnection,
    connectionStatus,
    hasIntegration: !!integration,
    integration,
    loading: isLoading,
  }
}
