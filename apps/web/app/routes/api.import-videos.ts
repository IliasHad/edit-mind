import { logger } from '@shared/services/logger'
import { requireUser } from '~/services/user.server';
import type { ActionFunctionArgs } from 'react-router'
import { backgroundJobsFetch } from '~/services/background.server';

export const action = async ({ request }: ActionFunctionArgs) => {

    try {
        const user = await requireUser(request)

        await backgroundJobsFetch(`/internal/indexer/import-videos`, undefined, user, 'POST')

        return {
            success: true,
        }
    } catch (error) {
        logger.error('Failed to send folder to background jobs service' + error)
        return new Response(JSON.stringify({ error: 'Sorry, there was a problem creating your folder.' }), {
            status: 500,
        })
    }
}
