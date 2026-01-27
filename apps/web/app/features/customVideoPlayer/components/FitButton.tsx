import { Button } from '@ui/components/Button'

export function FitButton({ currentObjectFit, onToggle }: { currentObjectFit: string; onToggle: () => void }) {
  return (
    <Button
      variant="outline"
      className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
      leftIcon={
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {currentObjectFit === 'contain' ? (
            <rect x="3" y="3" width="18" height="18" strokeWidth="2" rx="2" />
          ) : (
            <>
              <rect x="3" y="3" width="18" height="18" strokeWidth="2" rx="2" />
              <rect x="7" y="7" width="10" height="10" strokeWidth="2" fill="currentColor" opacity="0.3" />
            </>
          )}
        </svg>
      }
      onClick={onToggle}
      title={`Switch to ${currentObjectFit === 'contain' ? 'cover' : 'contain'} mode (Press O)`}
    ></Button>
  )
}
