import { motion } from 'framer-motion'
import type { KnownFace } from '@shared/types/face'
import { useCurrentKnowFace } from '../hooks/useCurrentKnownFace'
import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useFaces } from '../hooks/useFaces'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { ArrowPathIcon } from '@heroicons/react/24/solid'
import { z } from 'zod'
import { Button } from '@ui/components/Button'
import { useTranslation } from 'react-i18next'

export const RenameDialog = ({ face, onClose }: { face: KnownFace; onClose: () => void }) => {
  const { t } = useTranslation()
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
        .min(2, t('faces.renameDialog.validation.min'))
        .max(50, t('faces.renameDialog.validation.max'))
        .regex(/^[a-zA-Z\s'-]+$/, t('faces.renameDialog.validation.englishOnly'))
        .refine((name) => !uniqueFacesNames.includes(name.toLowerCase()), t('faces.renameDialog.validation.duplicate')),
    [t, uniqueFacesNames]
  )

  const validation = useMemo(() => {
    const trimmedName = newFaceName.trim()

    if (!trimmedName) {
      return { isValid: false, message: t('faces.renameDialog.validation.empty') }
    }

    const result = faceNameSchema.safeParse(trimmedName)

    if (!result.success) {
      return {
        isValid: false,
        message: result.error.issues[0]?.message || t('faces.renameDialog.validation.invalid'),
      }
    }

    return { isValid: true, message: t('faces.renameDialog.validation.valid') }
  }, [newFaceName, faceNameSchema, t])

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
        <Button
          onClick={onClose}
          variant="ghost"
          size="icon-sm"
          className="absolute top-6 right-6"
          leftIcon={<XMarkIcon className="w-5 h-5" />}
        />

        <div className="mb-6">
          <h3 className="text-2xl font-semibold text-white tracking-tight">{t('faces.renameDialog.title')}</h3>
          <p className="text-sm text-white/50 mt-2">
            {t('faces.renameDialog.currentName', { name: face.name })}
          </p>
        </div>

        <div className="mb-4">
          <label
            htmlFor="new-face-name"
            className="block text-xs font-semibold text-white/50 mb-3 uppercase tracking-wider"
          >
            {t('faces.renameDialog.newName')}
          </label>
          <div className="relative">
            <input
              id="new-face-name"
              type="text"
              value={newFaceName}
              onChange={(e) => setNewFaceName(e.target.value)}
              placeholder={t('faces.renameDialog.placeholder')}
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
          <p className="text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">{t('faces.renameDialog.requirements')}</p>
          <ul className="space-y-1.5 text-xs text-white/60">
            <li className="flex items-start gap-2">
              <span className="text-white/40 mt-0.5">•</span>
              <span>{t('faces.renameDialog.reqLength')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white/40 mt-0.5">•</span>
              <span>{t('faces.renameDialog.reqEnglishOnly')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white/40 mt-0.5">•</span>
              <span>{t('faces.renameDialog.reqAllowedPunctuation')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white/40 mt-0.5">•</span>
              <span>{t('faces.renameDialog.reqUnique')}</span>
            </li>
          </ul>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            {t('faces.renameDialog.cancel')}
          </Button>
          <Button
            onClick={handleRename}
            disabled={loading || !validation.isValid}
            loading={loading}
            leftIcon={loading ? <ArrowPathIcon className="w-4 h-4" /> : null}
            className="flex-1"
          >
            {t('faces.renameDialog.rename')}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
