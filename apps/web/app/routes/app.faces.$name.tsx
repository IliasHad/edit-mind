import { Link, useParams } from 'react-router'
import { Sidebar } from '~/features/shared/components/Sidebar'
import { DashboardLayout } from '~/layouts/DashboardLayout'
import { useCurrentKnowFace } from '~/features/faces/hooks/useCurrentKnownFace'
import { useState } from 'react'
import { KnownFaceCard } from '~/features/faces/components/KnownFaceCard'
import { PencilIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid'
import { RenameDialog } from '~/features/faces/components/RenameDialog'
import { Button } from '@ui/components/Button'

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
              <Link to={`/app/search?face=${name}`}>
                <Button
                  variant="outline"
                  leftIcon={<MagnifyingGlassIcon className="w-4 h-4" />}
                >
                  Search Videos of {name}
                </Button>
              </Link>

              <Button
                onClick={(e) => {
                  e.preventDefault()
                  setShowRenameDialog(true)
                }}
                leftIcon={<PencilIcon className="w-4 h-4" />}
              >
                Rename
              </Button>
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
                <Link to="/app/faces">
                  <Button>
                    Back to all faces
                  </Button>
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
