import { motion } from 'framer-motion'
import { Link } from 'react-router'

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  primaryCta: {
    text: string
    icon?: React.ReactNode
    link: string
  }
  secondaryCta?: {
    text: string
    icon?: React.ReactNode
    onClick: () => void
  }
  index?: number
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  primaryCta,
  secondaryCta,
  index = 0
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/[0.07] transition-all duration-200 p-8"
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start gap-4 flex-1">
          <div className="p-3 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-white mb-1">{title}</h2>
            <p className="text-sm text-white/60">{description}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          {secondaryCta && (
            <button
              onClick={secondaryCta.onClick}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl font-medium text-sm hover:bg-white/10 active:scale-[0.98] transition-all"
            >
              {secondaryCta.icon}
              {secondaryCta.text}
            </button>
          )}
          <Link
            to={primaryCta.link}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-xl font-medium text-sm hover:bg-white/90 active:scale-[0.98] transition-all"
          >
            {primaryCta.icon}
            {primaryCta.text}
          </Link>
        </div>
      </div>
    </motion.div>
  )
}