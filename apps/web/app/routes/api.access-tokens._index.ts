import crypto from 'crypto'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { AccessTokenModel } from '@db/models/AccessToken'
import { AccessTokenScope } from '@prisma/client'
import { logger } from '@shared/services/logger'
import { type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router'
import { requireUserId } from '~/services/user.server'

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const userId = await requireUserId(request)
    const tokens = await AccessTokenModel.findByUserId(userId)
    const safeTokens = tokens.map(({ tokenHash: _hash, ...t }) => t)
    return { tokens: safeTokens }
  } catch (error) {
    logger.error({ error }, 'Failed to list access tokens')
    return new Response(JSON.stringify({ error: 'Failed to list tokens' }), { status: 500 })
  }
}

const CreateTokenSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  scopes: z.array(z.nativeEnum(AccessTokenScope)).min(1, 'At least one scope is required'),
  expiresAt: z.string().datetime().optional().nullable(),
})

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  try {
    const userId = await requireUserId(request)
    const payload = await request.json()
    const parsed = CreateTokenSchema.safeParse(payload)

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: parsed.error.flatten() }),
        { status: 400 }
      )
    }

    const { name, description, scopes, expiresAt } = parsed.data
    const rawToken = `em_${nanoid(32)}`
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

    const token = await AccessTokenModel.create({
      name,
      description: description ?? undefined,
      scopes,
      tokenHash,
      userId,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    })

    const { tokenHash: _hash, ...safeToken } = token
    return new Response(JSON.stringify({ token: safeToken, rawToken }), { status: 201 })
  } catch (error) {
    logger.error({ error }, 'Failed to create access token')
    return new Response(JSON.stringify({ error: 'Failed to create token' }), { status: 500 })
  }
}
