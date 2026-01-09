import { motion } from 'framer-motion'
import type { KnownFace } from '@shared/types/face'
import { useCurrentKnowFace } from '../hooks/useCurrentKnownFace'
import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useFaces } from '../hooks/useFaces'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { z } from 'zod'

export const RenameDialog = ({ face, onClose }: { face: KnownFace; onClose: () => void }) => {
  const { knownFaces } = useFaces()
  const { handleRenameKnownFace, newFaceName, setNewFaceName, loading } = useCurrentKnowFace()
  const navigate = useNavigate()

  const uniqueFacesNames = useMemo(
    () => knownFaces.map((f) => f.name.toLowerCase()).filter((name) => name !== face.name.toLowerCase()),
    [knownFaces, face.name]
  )

  const faceNameSchema = useMemo(
    () =>
      z
        .string()
        .trim()
        .min(2, 'Name must be at least 2 characters')
        .max(50, 'Name must be less than 50 characters')
        .regex(/^[a-zA-Z\s'-]+$/, 'Only English letters, spaces, hyphens, and apostrophes allowed')
        .refine((name) => !uniqueFacesNames.includes(name.toLowerCase()), 'This name already exists'),
    [uniqueFacesNames]
  )

  const validation = useMemo(() => {
    const trimmedName = newFaceName.trim()

    if (!trimmedName) {
      return { isValid: false, message: 'Name cannot be empty' }
    }

    const result = faceNameSchema.safeParse(trimmedName)

    if (!result.success) {
      return {
        isValid: false,
        message: z.prettifyError(result.error) || 'Invalid name',
      }
    }

    return { isValid: true, message: 'Name is valid' }
  }, [newFaceName, faceNameSchema])

  const handleRename = async () => {
    if (!validation.isValid) return

    const trimmedName = newFaceName.trim()
    const result = faceNameSchema.safeParse(trimmedName)

    if (!result.success) return

    try {
      await handleRenameKnownFace(face.name, trimmedName)
      onClose()
      navigate(`/app/faces/${trimmedName}`)
    } catch (error) {
      console.error('Failed to rename:', error)
    }
  }

  useEffect(() => {
    setNewFaceName(face.name)

    return () => {
      setNewFaceName('')
    }
  }, [face, setNewFaceName])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md bg-black/90 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <h3 className="text-2xl font-semibold text-white tracking-tight">Rename Person</h3>
          <p className="text-sm text-white/50 mt-2">
            Current name: <span className="text-white/80 font-medium">{face.name}</span>
          </p>
        </div>

        <div className="mb-4">
          <label
            htmlFor="new-face-name"
            className="block text-xs font-semibold text-white/50 mb-3 uppercase tracking-wider"
          >
            New Name
          </label>
          <div className="relative">
            <input
              id="new-face-name"
              type="text"
              value={newFaceName}
              onChange={(e) => setNewFaceName(e.target.value)}
              placeholder="Enter new name"
              autoComplete="off"
              autoFocus
              className={`w-full px-4 py-3.5 bg-white/5 border rounded-2xl text-white placeholder-white/30 focus:outline-none focus:ring-2 transition-all ${
                newFaceName.trim() && !validation.isValid
                  ? 'border-red-500/50 focus:ring-red-500/20 focus:border-red-500/50'
                  : newFaceName.trim() && validation.isValid
                    ? 'border-green-500/50 focus:ring-green-500/20 focus:border-green-500/50'
                    : 'border-white/10 focus:ring-white/20 focus:border-white/20'
              }`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && validation.isValid) {
                  handleRename()
                } else if (e.key === 'Escape') {
                  onClose()
                }
              }}
            />
          </div>

          {newFaceName.trim() && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-xs mt-2 flex items-center gap-1.5 ${
                validation.isValid ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {validation.message}
            </motion.p>
          )}
        </div>

        <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
          <p className="text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Requirements</p>
          <ul className="space-y-1.5 text-xs text-white/60">
            <li className="flex items-start gap-2">
              <span className="text-white/40 mt-0.5">•</span>
              <span>2-50 characters long</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white/40 mt-0.5">•</span>
              <span>English letters only (A-Z, a-z)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white/40 mt-0.5">•</span>
              <span>Spaces, hyphens (-), and apostrophes (') allowed</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white/40 mt-0.5">•</span>
              <span>Must be unique (not already used)</span>
            </li>
          </ul>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3.5 rounded-2xl bg-white/5 text-white font-medium hover:bg-white/10 transition-all duration-200 border border-white/10"
          >
            Cancel
          </button>
          <button
            onClick={handleRename}
            disabled={loading || !validation.isValid}
            className="flex-1 px-4 py-3.5 rounded-2xl bg-white text-black font-semibold hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full"
                />
                Renaming...
              </>
            ) : (
              'Rename'
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
