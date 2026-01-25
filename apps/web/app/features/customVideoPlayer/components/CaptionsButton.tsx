import { Button } from '@ui/components/Button'

interface CaptionsButtonProps {
  active: boolean
  disabled?: boolean
  onToggle: () => void
}

export function CaptionsButton({ active, onToggle }: CaptionsButtonProps) {
  return (
    <Button
      onClick={onToggle}
      aria-pressed={active}
      variant='outline'
      className={`
        p-2 rounded-lg transition-all flex items-center justify-center
        ${active ? 'text-white bg-white/20' : 'text-white/80 hover:text-white hover:bg-white/10'}
      `}
      title={active ? 'Disable Captions' : 'Enable Captions'}
      leftIcon={
        <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="5" width="18" height="14" rx="2" strokeWidth="2" />
          <path d="M8 10h4M8 14h3M14 10h3M14 14h4" strokeWidth="2" strokeLinecap="round" />
        </svg>
      }
    ></Button>
  )
}
