import { useEffect } from 'react';
import { useImmichStore } from '../stores'

export function useImmichIntegration() {
  const {
    integration,
    isLoading,
    error,
    fetchConfig,
    saveIntegration,
    updateIntegration,
    deleteIntegration,
    refreshImport,
    testConnection,
    clearError,
    setShowApiKeyForm,
    showApiKeyForm,
  } = useImmichStore()
  const hasIntegration = !!integration

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  useEffect(() => {
    setShowApiKeyForm(!hasIntegration)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasIntegration])

  return {
    integration,
    hasIntegration,
    loading: isLoading,
    error,
    saveIntegration,
    updateIntegration,
    deleteIntegration,
    refreshImport,
    testConnection,
    clearError,
    showApiKeyForm,
    setShowApiKeyForm,
  }
}
