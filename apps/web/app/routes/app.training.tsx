import React from 'react'
import { Loader2 } from 'lucide-react'
import { LabelingForm } from '~/features/training/components/LabelingForm'
import { UnknownFacesGrid } from '~/features/training/components/UnknownFacesGrid'
import { KnownFacesGrid } from '~/features/training/components/KnownFacesGrid'
import { useTraining } from '~/features/training/hooks/useTraining'
import type { MetaFunction } from 'react-router'
import { DashboardLayout } from '~/layouts/DashboardLayout'
import { Sidebar } from '~/features/shared/components/Sidebar'

export const meta: MetaFunction = () => {
  return [{ title: 'Training | Edit Mind' }]
}

export async function loader() {
  return null
}

const Training: React.FC = () => {
  const {
    unknownFaces,
    knownFaces,
    loading,
    selectedFaces,
    labelMode,
    selectedKnownFace,
    newFaceName,
    isLabeling,
    activeTab,
    setLabelMode,
    setSelectedKnownFace,
    setNewFaceName,
    setActiveTab,
    handleSelectFace,
    handleSelectAll,
    handleLabelFaces,
    handleDeleteUnknownFace,
    unknownPagination,
    handleUnknownPageChange,
  } = useTraining()

  if (loading) {
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
            <h1 className="text-5xl md:text-6xl font-semibold tracking-tight mb-4">Face Training</h1>
          </div>
        </div>

        <div className="px-8 mb-8">
          <div className="max-w-7xl mx-auto">
            <div className="inline-flex gap-1 p-1 bg-zinc-900/50 rounded-full backdrop-blur-xl border border-white/10">
              <button
                onClick={() => setActiveTab('unknown')}
                className={`px-6 py-2.5 rounded-full font-medium text-sm transition-all duration-300 ${
                  activeTab === 'unknown' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'
                }`}
                aria-label="Unknown"
              >
                Unknown
                {unknownFaces.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-zinc-800 text-white">
                    {unknownFaces.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('known')}
                className={`px-6 py-2.5 rounded-full font-medium text-sm transition-all duration-300 ${
                  activeTab === 'known' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'
                }`}
                aria-label="Known"
              >
                Known
                {knownFaces.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-zinc-800 text-white">
                    {knownFaces.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="px-8 pb-16">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'unknown' && (
              <div className="space-y-8">
                {unknownFaces.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-32">
                    <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mb-6">
                      <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-semibold mb-2">All faces labeled</h3>
                    <p className="text-gray-500">Your library is fully trained</p>
                  </div>
                ) : (
                  <>
                    <LabelingForm
                      selectedFacesCount={selectedFaces.size}
                      handleSelectAll={handleSelectAll}
                      labelMode={labelMode}
                      setLabelMode={setLabelMode}
                      selectedKnownFace={selectedKnownFace}
                      setSelectedKnownFace={setSelectedKnownFace}
                      knownFaces={knownFaces}
                      newFaceName={newFaceName}
                      setNewFaceName={setNewFaceName}
                      handleLabelFaces={handleLabelFaces}
                      isLabeling={isLabeling}
                      unknownFacesCount={unknownFaces.length}
                    />
                    <UnknownFacesGrid
                      unknownFaces={unknownFaces}
                      selectedFaces={selectedFaces}
                      handleSelectFace={handleSelectFace}
                      handleDeleteUnknownFace={handleDeleteUnknownFace}
                      pagination={unknownPagination}
                      onPageChange={handleUnknownPageChange}
                    />
                  </>
                )}
              </div>
            )}

            {activeTab === 'known' && (
              <div>
                {knownFaces.length === 0 ? (
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
                  <KnownFacesGrid knownFaces={knownFaces} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default Training
