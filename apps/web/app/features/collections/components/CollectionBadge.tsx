import { type Collection } from '@prisma/client'
import { Link } from 'react-router'
import { ICON_MAP } from '../constants'

export function CollectionBadge({ collection }: { collection: Collection & { confidence?: number } }) {
  const Icon = ICON_MAP[collection.type]

  return (
    <Link
      to={`/app/collections/${collection.id}`}
      className="group relative inline-flex items-center gap-2 px-3 py-1.5 bg-transparent border border-gray-900 dark:border-gray-100 rounded-full hover:bg-gray-900 hover:text-white dark:hover:bg-gray-100 dark:hover:text-gray-900 transition-all duration-200 cursor-pointer"
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="text-sm font-medium">{collection.name}</span>
      {collection.confidence && <span className="text-xs opacity-60">({Math.ceil(collection.confidence * 100)}%)</span>}
    </Link>
  )
}
