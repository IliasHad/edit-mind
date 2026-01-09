import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useSearchStore } from '~/features/search/stores'

interface ImageUploadProps {
  onUpload?: (file: File) => void
}

export function ImageUpload({ onUpload }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const { imagePreview, setImageSearch } = useSearchStore()

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const preview = reader.result as string
      setImageSearch(file, preview)
      onUpload?.(file)
    }
    reader.readAsDataURL(file)
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleRemove = () => {
    setImageSearch(null, null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  if (imagePreview) {
    return (
      <div className="relative group">
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-black/10 dark:border-white/10">
          <img src={imagePreview} alt="Search image" className="w-full h-full object-cover" />

          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/0 to-black/20 opacity-1 hover:opacity-100 transition-opacity duration-200" />

          <button
            onClick={handleRemove}
            className="absolute top-3 right-3 p-2 rounded-full
            cursor-pointer 
            bg-black
            backdrop-blur-sm
            transition-all duration-200
            opacity-0 group-hover:opacity-100
            active:scale-95"
            aria-label="Remove image"
          >
            <XMarkIcon className="size-4 text-white" />
          </button>
          <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <p className="text-xs text-white dark:text-black font-medium backdrop-blur-sm bg-black/40 dark:bg-white/40 px-3 py-2 rounded-lg">
              Searching with this image
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`relative cursor-pointer transition-all duration-200
        ${isDragging ? 'scale-[0.98]' : 'hover:scale-[1.01]'}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
        aria-label="Upload search image"
      />

      <div
        className={`relative w-full max-h-72 aspect-video rounded-2xl border-2 border-dashed
        flex flex-col items-center justify-center gap-3
        transition-all duration-200
        ${
          isDragging
            ? 'border-black dark:border-white bg-black/10 dark:bg-white/10'
            : 'border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/5 hover:border-black/40 dark:hover:border-white/40 hover:bg-black/[0.07] dark:hover:bg-white/[0.07]'
        }`}
      >
        <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5">
          <PhotoIcon className="size-8 text-black/40 dark:text-white/40" />
        </div>

        <div className="text-center px-4">
          <p className="text-sm font-medium text-black dark:text-white mb-1">
            {isDragging ? 'Drop image here' : 'Upload an image to search'}
          </p>
          <p className="text-xs text-black/50 dark:text-white/50">Click or drag and drop</p>
        </div>
      </div>
    </div>
  )
}
