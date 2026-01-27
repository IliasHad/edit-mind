import { logger } from '@shared/services/logger'
import { pythonService } from '@shared/services/pythonService'
import { io } from '..'

export const checkServicesStatus = async () => {
  try {
    const mlServiceStatus = pythonService.isServiceRunning()

    return {
      backgroundJobsService: true,
      mlService: mlServiceStatus,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    logger.error({ error }, 'Error checking service status')
    return {
      backgroundJobsService: true,
      mlService: false,
      timestamp: new Date().toISOString(),
    }
  }
}

const STATUS_CHECK_INTERVAL = 30000 // 30 seconds
setInterval(async () => {
  const status = await checkServicesStatus()
  io.emit('service-status', status)
}, STATUS_CHECK_INTERVAL)
