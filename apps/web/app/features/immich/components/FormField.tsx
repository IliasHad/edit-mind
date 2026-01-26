import { ExclamationCircleIcon } from '@heroicons/react/24/outline'
import type { UseFormRegister } from 'react-hook-form'
import { type ImmichConfig } from '@immich/types/immich'

interface FormFieldProps {
  label: string
  name: 'baseUrl' | 'apiKey'
  type: string
  placeholder: string
  required?: boolean
  register: UseFormRegister<ImmichConfig>
  error?: string
  helperText?: string
}

export function FormField({ label, name, type, placeholder, required, register, error, helperText }: FormFieldProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-white mb-2">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        {...register(name)}
        type={type}
        id={name}
        placeholder={placeholder}
        className={`w-full px-4 py-2.5 bg-white/5 border rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 transition-all ${
          error
            ? 'border-red-500/30 focus:ring-red-500/20'
            : 'border-white/10 focus:ring-white/20 focus:border-white/20'
        }`}
      />
      {error && (
        <p className="mt-1.5 text-sm text-red-400 flex items-center gap-1">
          <ExclamationCircleIcon className="w-3.5 h-3.5" />
          {error}
        </p>
      )}
      {helperText && !error && <p className="mt-1.5 text-xs text-white/50">{helperText}</p>}
    </div>
  )
}
