import { Sidebar } from "~/features/shared/components/Sidebar"
import { DashboardLayout } from "~/layouts/DashboardLayout"
import { motion } from "framer-motion"

export const PageSkeleton = () => {
  return (
    <DashboardLayout sidebar={<Sidebar />}>
      <main className="max-w-7xl px-6 py-12">
        <div className="mb-8">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-8 bg-white/5 backdrop-blur-sm rounded-lg w-2/3 mb-4 animate-pulse" 
          />
          <div className="flex gap-4 mb-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="h-6 bg-white/5 backdrop-blur-sm rounded w-32 animate-pulse" 
            />
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="h-6 bg-white/5 backdrop-blur-sm rounded w-24 animate-pulse" 
            />
          </div>
          <div className="flex gap-2">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="h-9 bg-white/5 backdrop-blur-sm rounded-lg w-24 animate-pulse" 
            />
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="h-9 bg-white/5 backdrop-blur-sm rounded-lg w-24 animate-pulse" 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="aspect-video bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 animate-pulse overflow-hidden"
            >
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-white/10 animate-pulse" />
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 animate-pulse"
            >
              <div className="h-6 bg-white/10 rounded w-1/3 mb-4" />
              <div className="space-y-3">
                <div className="h-4 bg-white/10 rounded w-full" />
                <div className="h-4 bg-white/10 rounded w-5/6" />
                <div className="h-4 bg-white/10 rounded w-4/6" />
              </div>
              
              <div className="mt-6 pt-6 border-t border-white/5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-3 bg-white/10 rounded w-full" />
                  <div className="h-3 bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-white/10 rounded w-4/5" />
                  <div className="h-3 bg-white/10 rounded w-full" />
                </div>
              </div>
            </motion.div>
          </div>

          <div className="space-y-4">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
              className="h-10 bg-white/5 backdrop-blur-sm rounded-lg animate-pulse mb-4" 
            />
            
            {[1, 2, 3, 4, 5].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.05 }}
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 hover:bg-white/[0.07] transition-all duration-200 animate-pulse"
              >
                <div className="flex gap-3">
                  <div className="w-24 h-16 bg-white/10 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/10 rounded w-3/4" />
                    <div className="h-3 bg-white/10 rounded w-1/2" />
                    <div className="flex gap-2 mt-2">
                      <div className="h-5 w-12 bg-white/10 rounded-full" />
                      <div className="h-5 w-16 bg-white/10 rounded-full" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </DashboardLayout>
  )
}