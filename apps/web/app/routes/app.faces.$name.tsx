import { Link, useParams } from 'react-router'
import { Sidebar } from '~/features/shared/components/Sidebar'
import { DashboardLayout } from '~/layouts/DashboardLayout'
import { useCurrentKnowFace } from '~/features/faces/hooks/useCurrentKnownFace'
import { useState } from 'react'
import { KnownFaceCard } from '~/features/faces/components/KnownFaceCard'
import { PencilIcon } from '@heroicons/react/24/solid'
import { RenameDialog } from '~/features/faces/components/RenameDialog'

export default function PersonFacesPage() {
  const { currentKnownFace } = useCurrentKnowFace()
  const [showRenameDialog, setShowRenameDialog] = useState(false)

  const { name } = useParams()

  return (
    <DashboardLayout key={name} sidebar={<Sidebar />}>
      <div className="min-h-screen bg-black text-white">
        <div className="px-8 pt-16 pb-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-white mb-2">{name}</h1>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <p className="text-sm font-medium text-white/60">
                  {currentKnownFace?.images.length} {currentKnownFace?.images.length === 1 ? 'Image' : 'Images'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to={`/app/search?face=${name}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-2xl bg-white/10 text-white hover:bg-white/0.15 transition-all duration-200 border border-white/10 backdrop-blur-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                Search Videos of {name}
              </Link>

              <button
                onClick={(e) => {
                  e.preventDefault()
                  setShowRenameDialog(true)
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-2xl bg-white text-black hover:bg-white/90 transition-all duration-200 shadow-lg shadow-white/10 hover:shadow-white/20"
              >
                <PencilIcon className="w-4 h-4" />
                Rename
              </button>
            </div>
          </div>
        </div>

        <div className="px-8 pb-16">
          <div className="max-w-7xl mx-auto">
            {!currentKnownFace || currentKnownFace?.images.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16">
                <h4 className="text-xl font-semibold text-black dark:text-white mb-3">No faces found for {name}</h4>
                <p className="text-gray-600 dark:text-gray-400 text-base mb-8">
                  We couldn't find any faces for this person. It might be that the face labelling is still in progress.
                </p>
                <Link
                  to="/app/faces"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg 
           bg-black text-white dark:bg-white dark:text-black 
           hover:bg-gray-800 dark:hover:bg-gray-100 transition-all shadow-sm"
                >
                  Back to all faces
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 gap-4">
                {name && currentKnownFace?.images.map((image: string) => <KnownFaceCard face={{ name, image }} />)}
              </div>
            )}

            {showRenameDialog && currentKnownFace && (
              <RenameDialog onClose={() => setShowRenameDialog(false)} face={currentKnownFace} />
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
