import React from 'react'
import { ArrowPathIcon, CheckIcon, UserIcon } from '@heroicons/react/24/solid'
import { RadioGroup } from '@headlessui/react'
import { useFacesStore } from '../stores'
import { motion, AnimatePresence } from 'framer-motion'

export const LabelingForm: React.FC = () => {
  const {
    unknownFaces,
    knownFaces,
    selectedFaces,
    labelMode,
    selectedKnownFace,
    newFaceName,
    isLabeling,
    setLabelMode,
    setSelectedKnownFace,
    setNewFaceName,
    handleSelectAll,
    handleLabelFaces,
  } = useFacesStore()

  const isFormValid =
    selectedFaces.size > 0 &&
    ((labelMode === 'existing' && selectedKnownFace) || (labelMode === 'new' && newFaceName.trim()))

  const selectedFaceImage = knownFaces.find((face) => selectedKnownFace === face.name)?.images[0]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl"
    >
      <div className="p-8">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-white mb-2">Label Faces</h2>
            <motion.p
              key={selectedFaces.size}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-gray-400 font-medium"
            >
              {selectedFaces.size} of {unknownFaces.length} selected
            </motion.p>
          </div>

          <button
            onClick={handleSelectAll}
            className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors duration-200"
          >
            {selectedFaces.size === unknownFaces.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div className="space-y-8">
          <div>
            <label className="text-sm font-semibold text-gray-400 mb-4  hidden tracking-wider">Method</label>

            <RadioGroup value={labelMode} onChange={setLabelMode}>
              <div className="relative inline-flex gap-0 p-0 bg-white/5 rounded-2xl w-full overflow-hidden border border-white/10">
                <RadioGroup.Option value="existing" className="flex-1">
                  {({ checked }) => (
                    <motion.button
                      className={`relative w-full px-6 py-4 text-sm font-semibold transition-colors duration-300 ${
                        checked ? 'text-black' : 'text-white/60 hover:text-white/80'
                      }`}
                    >
                      {checked && (
                        <motion.div
                          layoutId="activeMethodTab"
                          className="absolute inset-0 bg-white"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center justify-center gap-2">Existing Person</span>
                    </motion.button>
                  )}
                </RadioGroup.Option>

                <RadioGroup.Option value="new" className="flex-1">
                  {({ checked }) => (
                    <motion.button
                      className={`relative w-full px-6 py-4 text-sm font-semibold transition-colors duration-300 ${
                        checked ? 'text-black' : 'text-white/60 hover:text-white/80'
                      }`}
                    >
                      {checked && (
                        <motion.div
                          layoutId="activeMethodTab"
                          className="absolute inset-0 bg-white"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center justify-center gap-2">New Person</span>
                    </motion.button>
                  )}
                </RadioGroup.Option>
              </div>
            </RadioGroup>
          </div>

          <AnimatePresence mode="wait">
            {labelMode === 'existing' ? (
              <motion.div
                key="existing"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <label
                  htmlFor="known-face-select"
                  className="block text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider"
                >
                  Select Person
                </label>
                <div className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">
                    {selectedFaceImage ? (
                      <img src={`/faces/${selectedFaceImage}`} className="w-10 h-10 object-center object-contain rounded-full" />
                    ) : (
                      <UserIcon className="w-6 h-6  text-white/40" />
                    )}
                  </div>
                  <select
                    id="known-face-select"
                    value={selectedKnownFace}
                    onChange={(e) => setSelectedKnownFace(e.target.value)}
                    className="w-full pl-18 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all appearance-none cursor-pointer hover:bg-white/[0.07]"
                  >
                    <option value="" className="bg-zinc-900">
                      Choose a person...
                    </option>
                    {knownFaces.map((face) => (
                      <option key={face.name} value={face.name} className="bg-zinc-900">
                        {face.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-5 text-white/40">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="new"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                <label
                  htmlFor="new-face-name"
                  className="block text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider"
                >
                  Person's Name
                </label>
                <div className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <UserIcon className="w-5 h-5 text-white/40" />
                  </div>
                  <input
                    id="new-face-name"
                    type="text"
                    placeholder="Enter full name"
                    value={newFaceName}
                    onChange={(e) => setNewFaceName(e.target.value)}
                    className="w-full pl-14 pr-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all backdrop-blur-sm hover:bg-white/[0.07]"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            onClick={handleLabelFaces}
            disabled={!isFormValid || isLabeling}
            whileHover={isFormValid && !isLabeling ? { scale: 1.01 } : {}}
            whileTap={isFormValid && !isLabeling ? { scale: 0.99 } : {}}
            className={`w-full px-6 py-4 rounded-2xl font-semibold text-base transition-all duration-300 flex items-center justify-center relative overflow-hidden ${
              isFormValid && !isLabeling
                ? 'bg-white text-black hover:bg-white/90'
                : 'bg-white/10 text-white/30 cursor-not-allowed border border-white/5'
            }`}
          >
            <span className="relative z-10 flex items-center gap-3">
              {isLabeling ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  Labeling...
                </>
              ) : (
                <>
                  <CheckIcon className="w-5 h-5" />
                  Label {selectedFaces.size} Face{selectedFaces.size !== 1 ? 's' : ''}
                </>
              )}
            </span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
