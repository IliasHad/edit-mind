import { logger } from '@shared/services/logger'
import { encryptApiKey, decryptApiKey } from '@immich/services/encryption'
import { IntegrationModel } from '@db/index'
import { ImmichConfigFormSchema } from '@immich/schemas/immich'
import type { ImmichImportStatus } from '@immich/types/immich'
import type { User } from '@prisma/client'
import { backgroundJobsFetch } from './background.server'

export async function saveImmichIntegration(userId: string, apiKey: string, baseUrl: string) {
  const encryptedKey = encryptApiKey(apiKey)

  return await IntegrationModel.upsert(userId, 'Immich', {
    config: { baseUrl, apiKey: encryptedKey },
    userId,
    type: 'Immich',
  })
}

export async function updateImmichIntegration(userId: string, apiKey: string, baseUrl: string) {
  const integration = await IntegrationModel.findFirst({
    where: {
      type: 'Immich',
      userId,
    },
  })

  if (!integration) {
    throw new Error('No integration found to update')
  }

  const encryptedKey = encryptApiKey(apiKey)

  return await IntegrationModel.update(integration.id, {
    config: { baseUrl, apiKey: encryptedKey },
  })
}

export async function getImmichApiKey(userId: string): Promise<string | null> {
  const integration = await IntegrationModel.findFirst({
    where: {
      type: 'Immich',
      userId,
    },
    select: { config: true, id: true },
  })

  if (!integration) {
    return null
  }

  const configResult = ImmichConfigFormSchema.safeParse(integration.config)

  if (!configResult.success) {
    throw new Error('Invalid Immich configuration: ' + configResult.error.message)
  }

  return decryptApiKey(configResult.data.apiKey)
}

export async function getImmichConfig(userId: string) {
  const integration = await IntegrationModel.findFirst({
    where: {
      type: 'Immich',
      userId,
    },
  })

  if (!integration) {
    return null
  }
  const configResult = ImmichConfigFormSchema.safeParse(integration.config)

  if (!configResult.success) {
    throw new Error('Invalid Immich configuration: ' + configResult.error.message)
  }

  return {
    apiKey: decryptApiKey(configResult.data?.apiKey),
    baseUrl: configResult.data.baseUrl,
    id: integration.id,
  }
}

export async function deleteImmichIntegration(userId: string) {
  const integration = await IntegrationModel.findFirst({
    where: {
      type: 'Immich',
      userId,
    },
  })

  if (integration) {
    return await IntegrationModel.delete(integration.id)
  }
}

export async function getImportStatus(user: User, integrationId: string): Promise<ImmichImportStatus> {
  try {
    const data = await backgroundJobsFetch<undefined, ImmichImportStatus>(
      `/internal/immich/${integrationId}/status`,
      undefined,
      user,
      'GET'
    )
    return data
  } catch (error) {
    logger.error(error)
    return {
      isImporting: false,
      progress: 0,
      totalFaces: 0,
      processedFaces: 0,
      status: 'error',
      error: 'Error getting the import status ',
    }
  }
}
