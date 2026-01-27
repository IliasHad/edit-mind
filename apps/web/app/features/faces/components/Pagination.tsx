import React from 'react'
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  ChevronDoubleLeftIcon, 
  ChevronDoubleRightIcon 
} from '@heroicons/react/24/solid'
import { Button } from '@ui/components/Button'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  onPageChange: (page: number) => void
  itemsPerPage?: number
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  itemsPerPage = 40,
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const showEllipsis = totalPages > 7

    if (!showEllipsis) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
      return pages
    }

    pages.push(1)

    if (currentPage > 3) {
      pages.push('...')
    }

    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i)
    }

    if (currentPage < totalPages - 2) {
      pages.push('...')
    }

    if (totalPages > 1) {
      pages.push(totalPages)
    }

    return pages
  }

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white/5 backdrop-blur-sm border-t border-white/10">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <span>
          Showing <span className="font-medium text-white">{startItem}</span> to{' '}
          <span className="font-medium text-white">{endItem}</span> of{' '}
          <span className="font-medium text-white">{totalItems}</span> results
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          title="First page"
          variant="ghost"
          size="icon-sm"
          leftIcon={<ChevronDoubleLeftIcon className="w-4 h-4" />}
        />

        <Button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          title="Previous page"
          variant="ghost"
          size="icon-sm"
          leftIcon={<ChevronLeftIcon className="w-4 h-4" />}
        />

        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                <span className="px-3 py-2 text-gray-500">...</span>
              ) : (
                <Button
                  onClick={() => onPageChange(page as number)}
                  variant={currentPage === page ? 'primary' : 'ghost'}
                  className="min-w-10 px-3 py-2"
                >
                  {page}
                </Button>
              )}
            </React.Fragment>
          ))}
        </div>

        <Button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          title="Next page"
          variant="ghost"
          size="icon-sm"
          leftIcon={<ChevronRightIcon className="w-4 h-4" />}
        />

        <Button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          title="Last page"
          variant="ghost"
          size="icon-sm"
          leftIcon={<ChevronDoubleRightIcon className="w-4 h-4" />}
        />
      </div>
    </div>
  )
}
