import { UserModel } from './models/User'

async function main() {
  const user = await UserModel.findByEmail('admin@example.com')
  if (!user) {
    await UserModel.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'admin', // this will be hashed using bcrypt
      role: 'admin',
    })
    console.debug('Seeded admin user with email')
  } else {
    console.debug('Admin user already exists')
  }
}

main()
