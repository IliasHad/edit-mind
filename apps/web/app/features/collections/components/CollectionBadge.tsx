import { Link } from 'react-router'
import { ICON_MAP } from '../constants'
import type { CollectionType } from '@prisma/client'

export function CollectionBadge({
  collection,
}: {
  collection: { confidence?: number; name: string; id: string; type: CollectionType }
}) {
  const Icon = ICON_MAP[collection.type]

  return (
    <Link
      to={`/app/collections/${collection.id}`}
      className="group relative inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-white/20 transition-all duration-200 cursor-pointer"
    >
      <Icon className="w-3.5 h-3.5 text-white/70 group-hover:text-white transition-colors" />
      <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">{collection.name}</span>
      {collection.confidence && (
        <span className="text-xs text-white/50 group-hover:text-white/70 transition-colors">
          ({Math.ceil(collection.confidence * 100)}%)
        </span>
      )}
    </Link>
  )
}