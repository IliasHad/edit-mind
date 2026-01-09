import { Switch } from '@headlessui/react'
import { clsx } from 'clsx';

interface ToggleProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
  size?: 'small' | 'medium'
}

export function Toggle({ enabled, onChange, size = 'medium' }: ToggleProps) {
  const switchClass = clsx(
    enabled ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-gray-700',
    'relative inline-flex flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2',
    {
      'h-5 w-9': size === 'medium',
      'h-4 w-7': size === 'small',
    },
  )

  const spanClass = clsx(
    enabled ? 'translate-x-4' : 'translate-x-0',
    'pointer-events-none inline-block transform rounded-full bg-white shadow ring-0 transition ease-in-out duration-200',
    {
      'h-4 w-4': size === 'medium',
      'h-3 w-3': size === 'small',
    },
    enabled
      ? 'dark:bg-black'
      : 'dark:bg-white',
  )

  return (
    <Switch checked={enabled} onChange={onChange} className={switchClass}>
      <span className="sr-only">Use setting</span>
      <span aria-hidden="true" className={spanClass} />
    </Switch>
  )
}
