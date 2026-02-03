import { useNavigate, useSearchParams } from 'react-router'

interface PaginationProps {
    total: number
    page: number
}
export function Pagination({ total, page }: PaginationProps) {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    return (
        <div>
            {total > 1 && (
                <div className="flex justify-center items-center gap-4 pt-8">
                    <button
                        disabled={page === 1}
                        onClick={() => {
                            const params = new URLSearchParams(searchParams)
                            params.set('page', (page - 1).toString())
                            navigate(`?${params.toString()}`)
                        }}
                        className="px-5 py-2.5 text-sm font-medium rounded-xl
                      bg-white dark:bg-black 
                      text-black/70 dark:text-white/70
                      border border-black/10 dark:border-white/10
                      hover:bg-black/5 dark:hover:bg-white/5
                      transition-all
                      disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-black/60 dark:text-white/60 font-medium">
                        Page {page} of {total}
                    </span>
                    <button
                        disabled={page >= total}
                        onClick={() => {
                            const params = new URLSearchParams(searchParams)
                            params.set('page', (page + 1).toString())
                            navigate(`?${params.toString()}`)
                        }}
                        className="px-5 py-2.5 text-sm font-medium rounded-xl
                      bg-white dark:bg-black 
                      text-black/70 dark:text-white/70
                      border border-black/10 dark:border-white/10
                      hover:bg-black/5 dark:hover:bg-white/5
                      transition-all
                      disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    )
}
