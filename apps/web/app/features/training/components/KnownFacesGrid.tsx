import React from 'react'
import type { KnownFace } from '@shared/types/face'

interface KnownFacesGridProps {
  knownFaces: KnownFace[]
}

export const KnownFacesGrid: React.FC<KnownFacesGridProps> = ({ knownFaces }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
      {knownFaces.map((face) => (
        <div key={face.name} className="group">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-900 ring-1 ring-white/10 hover:ring-white/30 transition-all duration-300 hover:scale-105">
            {face.image ? (
              <img src={`/faces/${face.image}`} alt={face.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg className="w-16 h-16 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
            )}

            <div className="absolute inset-0 bg-linear-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>

          <div className="mt-3 px-1">
            <p className="font-semibold text-base truncate">{face.name}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
