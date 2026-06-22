import auth from './ru/auth'
import chats from './ru/chats'
import collections from './ru/collections'
import common from './ru/common'
import faces from './ru/faces'
import folders from './ru/folders'
import home from './ru/home'
import immich from './ru/immich'
import jobs from './ru/jobs'
import onboarding from './ru/onboarding'
import player from './ru/player'
import projects from './ru/projects'
import root from './ru/root'
import search from './ru/search'
import settings from './ru/settings'
import setup from './ru/setup'
import shell from './ru/shell'
import sidebar from './ru/sidebar'
import ui from './ru/ui'
import videos from './ru/videos'

const ru = {
  auth,
  chats,
  collections,
  common,
  faces,
  folders,
  home,
  immich,
  jobs,
  onboarding,
  player,
  projects,
  root,
  search,
  settings,
  setup,
  shell,
  sidebar,
  ui,
  videos,
} as const

export default ru
