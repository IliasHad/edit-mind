import { useFormContext } from 'react-hook-form'

interface FormInputProps {
  name: string
  type: string
  placeholder: string
  defaultError?: string
  label?: string
  disabled?: boolean
}

export function FormInput({ name, type, placeholder, defaultError, label, disabled }: FormInputProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext()

  const error = errors[name]?.message || defaultError

  return (
    <div className="space-y-1.5">
      <input
        {...register(name)}
        type={type}
        placeholder={placeholder}
        aria-label={label}
        disabled={disabled}
        className={`w-full px-4 py-3.5 rounded-xl text-sm transition-all duration-200
          bg-white/5 border text-white placeholder:text-white/25
          focus:outline-none focus:bg-white/10
          hover:bg-white/10
          ${error
            ? 'border-red-500/40 focus:border-red-500/60'
            : 'border-white/10 focus:border-white/20 hover:border-white/15'
          }`}
      />

      {error && (
        <p className="flex items-center gap-1.5 text-red-400/80 text-xs px-1">
          <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          {error.toString()}
        </p>
      )}
    </div>
  )
}