import { logger } from '@shared/services/logger'
import { UserModel } from '@db/index'

async function main() {
  const user = await UserModel.findByEmail('admin@example.com')
  if (!user) {
    await UserModel.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'admin', // this will be hashed using bcrypt
      role: 'admin',
    })
    logger.debug('Seeded admin user')
  }
}

main()
