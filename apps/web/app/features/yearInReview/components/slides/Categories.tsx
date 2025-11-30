import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { useEffect, useMemo, useState } from 'react'

interface Props {
  title: string
  content: string
}

export function Categories({ title, content }: Props) {
  const [data, setData] = useState<Array<{ name: string; value: number; color: string }>>([])
  const COLORS = useMemo(() => ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'], [])

  useEffect(() => {

    const categories = Array.from(content.matchAll(/([\w\s]+):\s*(\d+)%/g)).map(
      ([_, name, percent], index) => ({
        name: name.trim(),
        value: parseInt(percent),
        color: COLORS[index % COLORS.length],
      })
    )
    setData(categories)
  }, [COLORS, content])

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-br from-purple-950/15 via-black to-black" />

      <motion.div
        className="absolute top-1/3 right-1/4 w-[700px] h-[700px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.2, 0.3, 0.2],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <div className="relative z-10 flex flex-col items-center justify-center h-full px-8">
        <motion.h2
          className="text-4xl md:text-5xl font-semibold text-white mb-20 tracking-tight"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {title}
        </motion.h2>

        <div className="w-full max-w-5xl grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            className="w-full h-[400px] flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={160}
                  innerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  animationBegin={300}
                  animationDuration={800}
                  animationEasing="ease-out"
                  strokeWidth={0}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div
            className="space-y-3"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            {data.map((category, index) => (
              <motion.div
                key={category.name}
                className="flex items-center gap-4 py-4 px-5 rounded-2xl bg-white/5 border border-white/10"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: 0.5 + index * 0.08,
                  duration: 0.6,
                  ease: [0.16, 1, 0.3, 1],
                }}
                whileHover={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  scale: 1.02,
                  transition: { duration: 0.2 },
                }}
              >
                <motion.div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.6 + index * 0.08, duration: 0.3 }}
                />
                <span className="text-lg font-medium text-white/90 flex-1 tracking-tight">{category.name}</span>
                <span className="text-2xl font-semibold text-white tabular-nums">{category.value}%</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
