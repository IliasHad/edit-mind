import { Disclosure as HeadlessUIDisclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion'

interface DisclosureProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

export function Disclosure({ title, children, defaultOpen = false }: DisclosureProps) {
  return (
    <HeadlessUIDisclosure defaultOpen={defaultOpen}>
      {({ open }) => (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
          <DisclosureButton className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
            <span className="text-base font-medium text-white">{title}</span>
            <ChevronDownIcon
              className={`w-5 h-5 text-white/60 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            />
          </DisclosureButton>
          <AnimatePresence>
            {open && (
              <DisclosurePanel
                static
                as={motion.div}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-6 py-4 border-t border-white/10">{children}</div>
              </DisclosurePanel>
            )}
          </AnimatePresence>
        </div>
      )}
    </HeadlessUIDisclosure>
  )
}