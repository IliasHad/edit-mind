import type { AppLanguage, AppSettings } from '@prisma/client'
import prisma from '../db'

const GLOBAL_APP_SETTINGS_ID = 'global'

export class AppSettingsModel {
  static async getOrCreate(): Promise<AppSettings> {
    return prisma.appSettings.upsert({
      where: { id: GLOBAL_APP_SETTINGS_ID },
      update: {},
      create: { id: GLOBAL_APP_SETTINGS_ID },
    })
  }

  static async getLanguage(): Promise<AppLanguage> {
    const settings = await this.getOrCreate()
    return settings.language
  }

  static async updateLanguage(language: AppLanguage): Promise<AppSettings> {
    await this.getOrCreate()

    return prisma.appSettings.update({
      where: { id: GLOBAL_APP_SETTINGS_ID },
      data: { language },
    })
  }
}
