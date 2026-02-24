import { useServices } from '~/features/services/hooks/useServices';
import { CheckIcon } from '@heroicons/react/24/solid';

export function ServicesPanel() {
    const { status } = useServices()

    const allReady = status?.backgroundJobsService && status.mlService

    return (
        <div className="w-full h-full p-8 flex flex-col justify-center gap-4">

            <div className="space-y-1 px-3">
                <div className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Background Jobs</span>
                    <div className={`w-2 h-2 rounded-full ${status?.backgroundJobsService ? 'bg-green-500' : 'bg-gray-400'}`} />
                </div>

                <div className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-gray-700 dark:text-gray-300">ML Service</span>
                    <div className={`w-2 h-2 rounded-full ${status?.mlService ? 'bg-green-500' : 'bg-gray-400'}`} />
                </div>
            </div>


            {allReady && (
                <div className="mt-4 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/8 border border-emerald-100 dark:border-emerald-500/15">
                    <CheckIcon className="text-emerald-500 shrink-0 size-4" />
                    <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                        All systems operational
                    </p>
                </div>
            )}

            <p className="text-xs text-center text-gray-400 dark:text-zinc-600 mt-1">
                Analysis runs locally — footage never leaves your device
            </p>
        </div>
    )
}
