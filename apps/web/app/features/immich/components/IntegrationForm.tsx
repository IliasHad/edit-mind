import { CheckCircleIcon, SignalIcon } from '@heroicons/react/24/outline'
import { Button } from '@ui/components/Button'
import { FormField } from './FormField'
import { ConnectionStatus } from './ConnectionStatus'
import { useEffect } from 'react';
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useImmichForm } from '~/features/immich/hooks/useImmichForm'
import { ImmichConfigFormSchema } from '@immich/schemas/immich'
import { type ImmichConfig } from '@immich/types/immich'

interface FormProps {
  setShowApiKeyForm: (value: boolean) => void
}

export function IntegrationForm({ setShowApiKeyForm }: FormProps) {
  const {
    handleTestConnection,
    handleSubmit: submitIntegration,
    isTestingConnection,
    connectionStatus,
    integration,
    hasIntegration,
    loading,
  } = useImmichForm()


  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    getValues,
    reset,
  } = useForm<ImmichConfig>({
    resolver: zodResolver(ImmichConfigFormSchema),
    mode: 'onChange',
    defaultValues: {
      apiKey: '',
      baseUrl: integration?.baseUrl || 'http://host.docker.internal:2283',
    },
  })

  useEffect(() => {
    if (integration?.baseUrl) {
      reset({ baseUrl: integration.baseUrl, apiKey: '' })
    }
  }, [integration, reset])

  const onSubmit = async (data: ImmichConfig) => {
    const result = await submitIntegration(data)
    if (result) {
      setShowApiKeyForm(false)
      reset()
    }
  }

  const onTestConnection = async () => {
    const config = getValues()
    const result = await handleTestConnection(config)
    return result
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white mb-1">
          {hasIntegration ? 'Update Integration' : 'Connect Immich'}
        </h2>
        <p className="text-md text-white/60">
          {hasIntegration ? 'Update your API key or base URL' : 'Enter your Immich credentials to get started'}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          label="API Key"
          name="apiKey"
          type="password"
          placeholder="Enter your Immich API key"
          required
          register={register}
          error={errors.apiKey?.message}
        />

        <FormField
          label="Base URL"
          name="baseUrl"
          type="url"
          placeholder="http://host.docker.internal:2283"
          register={register}
          error={errors.baseUrl?.message}
          helperText="The URL where your Immich instance is hosted"
        />

        <ConnectionStatus status={connectionStatus} />

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onTestConnection}
            loading={isTestingConnection}
            leftIcon={<SignalIcon />}
            disabled={!isValid || isTestingConnection}
            fullWidth
          >
            Test Connection
          </Button>

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            leftIcon={!loading && <CheckCircleIcon />}
            fullWidth
            disabled={!connectionStatus?.success || loading}
          >
            {hasIntegration ? 'Update & Restart Import' : 'Connect & Start Import'}
          </Button>

          {hasIntegration && (
            <Button
              type="button"
              onClick={() => {
                setShowApiKeyForm(false)
                reset()
              }}
              variant="ghost"
            >
              Cancel
            </Button>
          )}
        </div>

        {!connectionStatus?.success && !hasIntegration && isValid && (
          <p className="text-xs text-white/50 text-center">Please test the connection before submitting</p>
        )}
      </form>
    </div>
  )
}
