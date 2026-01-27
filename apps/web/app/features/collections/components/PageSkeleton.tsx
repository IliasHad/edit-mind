import { Sidebar } from "~/features/shared/components/Sidebar";
import { DashboardLayout } from "~/layouts/DashboardLayout";

export function PageSkeleton() {
  return (
    <DashboardLayout sidebar={<Sidebar />}>
      <main className="w-full px-8 py-12">
        <div className="relative mb-10 overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="relative h-80 animate-pulse bg-white/5" />
          <div className="border-t border-white/10 bg-white/5 backdrop-blur-xl px-10 py-6">
            <div className="flex items-center gap-12">
              <div className="h-5 w-24 bg-white/10 rounded animate-pulse" />
              <div className="h-5 w-32 bg-white/10 rounded animate-pulse" />
              <div className="h-5 w-28 bg-white/10 rounded animate-pulse" />
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[1800px]">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-24 bg-white/10 rounded-xl animate-pulse" />
              <div className="h-10 w-32 bg-white/10 rounded-xl animate-pulse" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-[200px]">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm animate-pulse"
              />
            ))}
          </div>
        </div>
      </main>
    </DashboardLayout>
  )
}