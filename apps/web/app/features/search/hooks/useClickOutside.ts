import { useEffect, type RefObject } from 'react'

export function useClickOutside(
  refs: RefObject<HTMLElement | null>[],
  handler: () => void
) {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const isOutside = refs.every(
        (ref) => ref.current && !ref.current.contains(event.target as Node)
      )

      if (isOutside) {
        handler()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [refs, handler])
}