import { useNavigate, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'

interface PaginationProps {
    total: number
    page: number
}
export function Pagination({ total, page }: PaginationProps) {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { t } = useTranslation()
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
                        {t('shell.pagination.previous')}
                    </button>
                    <span className="text-sm text-black/60 dark:text-white/60 font-medium">
                        {t('shell.pagination.pageOf', { page, total })}
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
                        {t('shell.pagination.next')}
                    </button>
                </div>
            )}
        </div>
    )
}
