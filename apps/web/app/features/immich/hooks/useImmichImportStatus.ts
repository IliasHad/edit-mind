import { useEffect } from 'react'
import { translate } from '~/i18n/translate'
import { useImmichStore } from '../stores'

export function useImmichImportStatus() {
  const { importStatus, setImportStatus } = useImmichStore()

  useEffect(() => {
    const eventSource = new EventSource('/api/immich/import-status')

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setImportStatus(data)

      if (!data.isImporting || data.status === 'completed' || data.status === 'failed') {
        eventSource.close()
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
      setImportStatus({
        isImporting: false,
        status: 'failed',
        error: translate('immich.errors.importStatusLost'),
      })
    }

    return () => {
      eventSource.close()
    }
  }, [setImportStatus]) // Only depend on setImportStatus

  return {
    importStatus,
    isImporting: importStatus.isImporting,
    status: importStatus.status,
  }
}
