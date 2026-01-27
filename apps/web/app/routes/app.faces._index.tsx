import React, { useEffect } from 'react'
import { CheckBadgeIcon, ArrowPathIcon as Loader2 } from '@heroicons/react/24/outline'
import { LabelingForm } from '~/features/faces/components/LabelingForm'
import { UnknownFacesGrid } from '~/features/faces/components/UnknownFacesGrid'
import { KnownFacesGrid } from '~/features/faces/components/KnownFacesGrid'
import type { MetaFunction } from 'react-router'
import { useSearchParams } from 'react-router'
import { DashboardLayout } from '~/layouts/DashboardLayout'
import { Sidebar } from '~/features/shared/components/Sidebar'
import { useFaces } from '~/features/faces/hooks/useFaces'
import { Button } from '@ui/components/Button'

export const meta: MetaFunction = () => {
  return [{ title: 'Face Training | Edit Mind' }]
}

const FaceTraining: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { unknownFaces, knownFaces, loading, unknownPagination, knownPagination, setActiveTab } = useFaces()

  const activeTab = searchParams.get('tab') || 'known'

  useEffect(() => {
    setActiveTab(activeTab)
  }, [activeTab, setActiveTab])

  const handleTabChange = (tab: 'unknown' | 'known') => {
    setSearchParams({ tab })
  }

  const isInitialLoading = loading && unknownFaces.length === 0 && knownFaces.length === 0

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
          <span className="text-sm font-medium text-gray-400">Loading faces...</span>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout sidebar={<Sidebar />}>
      <div className="min-h-screen bg-black text-white">
        <div className="px-8 pt-16 pb-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-semibold tracking-tight mb-4">My People</h1>
          </div>
        </div>

        <div className="px-8 mb-8">
          <div className="max-w-7xl mx-auto">
            <div className="inline-flex bg-zinc-900/50 rounded-full backdrop-blur-xl border border-white/10 shadow-2xl">
              <Button
                onClick={() => handleTabChange('known')}
                variant={activeTab === 'known' ? 'primary' : 'ghost'}
                size="lg"
                aria-label="Known faces tab"
                className="rounded-full rounded-r-none"
              >
                Known
                {knownFaces.length > 0 && (
                  <span
                    className={`ml-2 px-2 py-0.5 text-xs rounded-full transition-all duration-300 ${
                      activeTab === 'known' ? 'bg-black/10 text-black' : 'bg-zinc-800 text-white'
                    }`}
                  >
                    {knownFaces.length}
                  </span>
                )}
              </Button>
              <Button
                onClick={() => handleTabChange('unknown')}
                variant={activeTab === 'unknown' ? 'primary' : 'ghost'}
                size="lg"
                aria-label="Unknown faces tab"
                className="rounded-full rounded-l-none"
              >
                Unknown
                {unknownPagination.total > 0 && (
                  <span
                    className={`ml-2 px-2 py-0.5 text-xs rounded-full transition-all duration-300 ${
                      activeTab === 'unknown' ? 'bg-black/10 text-black' : 'bg-zinc-800 text-white'
                    }`}
                  >
                    {unknownPagination.total}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="px-8 pb-16">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'unknown' && (
              <div className="space-y-8">
                {!loading && unknownPagination.total === 0 ? (
                  <div className="flex flex-col items-center justify-center py-32">
                    <div className="w-14 h-14 rounded-full bg-zinc-900 flex items-center justify-center mb-6">
                      <CheckBadgeIcon />
                    </div>
                    <h3 className="text-2xl font-semibold mb-2">All faces labeled</h3>
                    <p className="text-gray-500">Your library is fully trained</p>
                  </div>
                ) : (
                  <>
                    {!loading && <LabelingForm />}
                    <UnknownFacesGrid />
                  </>
                )}
              </div>
            )}

            {activeTab === 'known' && (
              <div>
                {!loading && knownPagination.total === 0 ? (
                  <div className="flex flex-col items-center justify-center py-32">
                    <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mb-6">
                      <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-semibold mb-2">No faces yet</h3>
                    <p className="text-gray-500">Start labeling to build your library</p>
                  </div>
                ) : (
                  <KnownFacesGrid />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default FaceTraining
