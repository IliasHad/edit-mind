import { useFormContext } from 'react-hook-form'

interface FormInputProps {
  name: string
  type: string
  placeholder: string
  defaultError?: string
}

export function FormInput({ name, type, placeholder, defaultError }: FormInputProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext()

  const error = errors[name]?.message || defaultError

  return (
    <div>
      <input
        {...register(name)}
        type={type}
        placeholder={placeholder}
        className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-black dark:text-white text-[15px] focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 transition-colors"
      />
      {error && <p className="text-red-500 text-sm mt-1">{error?.toString()}</p>}
    </div>
  )
}
