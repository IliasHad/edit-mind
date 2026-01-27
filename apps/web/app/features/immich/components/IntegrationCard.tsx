import { motion } from 'framer-motion'
import { ActiveIntegration } from './ActiveIntegration'
import { IntegrationForm } from './IntegrationForm'
import { useImmichIntegration } from '../hooks/useImmichIntegration'

interface IntegrationCardProps {
  onDeleteIntegration: () => void
}

export function IntegrationCard({ onDeleteIntegration }: IntegrationCardProps) {
  const { integration, showApiKeyForm, setShowApiKeyForm, refreshImport } = useImmichIntegration()

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden"
    >
      {showApiKeyForm ? (
        <IntegrationForm setShowApiKeyForm={setShowApiKeyForm} />
      ) : (
        <ActiveIntegration
          integration={integration}
          refreshImport={refreshImport}
          setShowApiKeyForm={setShowApiKeyForm}
          onDeleteIntegration={onDeleteIntegration}
        />
      )}
    </motion.div>
  )
}
