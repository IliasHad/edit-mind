import { motion } from 'framer-motion'

interface StatCardProps {
  stat: {
    id: string
    label: string
    value: string | number
    icon: React.ReactNode
  }
  index: number
}

export const StatCard: React.FC<StatCardProps> = ({ stat, index }) => {
  return (
    <motion.div
      key={stat.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/[0.07] transition-all duration-200 p-6 flex items-start gap-5"
    >
      <div className="p-3 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 shrink-0">
        {stat.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/60 mb-1">{stat.label}</p>
        <p className="text-2xl font-semibold text-white">{stat.value}</p>
      </div>
    </motion.div>
  )
}