import { motion } from 'framer-motion'

interface OnboardingStepProps {
  image: string
  title: string
  description: string
}

export function OnboardingStep({ image, title, description }: OnboardingStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="grid md:grid-cols-2 gap-12 md:gap-16 items-center"
    >
      <div className="order-2 md:order-1">
        <div className="aspect-4/3 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-900">
          <img src={image} alt="" className="w-full h-full object-cover" />
        </div>
      </div>

      <div className="order-1 md:order-2 space-y-5" id="step-content">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold text-black dark:text-white tracking-tight leading-[1.1] whitespace-pre-line">
          {title}
        </h1>
        <p
          className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 leading-relaxed"
          aria-label="Step Content"
        >
          {description}
        </p>
      </div>
    </motion.div>
  )
}