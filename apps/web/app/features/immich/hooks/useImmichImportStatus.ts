import { useEffect } from 'react'
import { useImmichStore } from '../stores'

export function useImmichImportStatus() {
  const { importStatus, setImportStatus } = useImmichStore()

  useEffect(() => {
    const eventSource = new EventSource('/api/immich/import-status')

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setImportStatus(data)
    }

    eventSource.onerror = () => {
      eventSource.close()
      setImportStatus({
        isImporting: false,
        status: 'error',
        error: 'Connection to import status lost',
      })
    }

    return () => {
      eventSource.close()
    }
  }, [importStatus.isImporting, setImportStatus])

  return {
    importStatus,
    isImporting: importStatus.isImporting,
    status: importStatus.status,
  }
}
