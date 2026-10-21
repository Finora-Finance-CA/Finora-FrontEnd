import { ChevronLeft, ChevronRight } from 'lucide-react'
import Button from '../components/ui/Button'
import './Pagination.css'

/**
 * Previous and Next buttons for the transaction list, with the page number between
 * them. Nothing is shown when everything fits on one page.
 *
 * @param {object} props
 * @param {number} props.page The page showing, 1-based.
 * @param {number} props.totalPages
 * @param {(page: number) => void} props.onPageChange
 * @param {boolean} [props.disabled] While a page is loading.
 */
export default function Pagination({ page, totalPages, onPageChange, disabled = false }) {
  if (totalPages <= 1) return null

  return (
    <nav className="pagination" aria-label="Transaction pages">
      <Button
        size="sm"
        icon={ChevronLeft}
        onClick={() => onPageChange(page - 1)}
        disabled={disabled || page <= 1}
        aria-label="Previous page"
      >
        <span className="pagination__word">Previous</span>
      </Button>
      <p className="pagination__status tabular">
        Page {page} of {totalPages}
      </p>
      <Button
        size="sm"
        className="pagination__next"
        icon={ChevronRight}
        onClick={() => onPageChange(page + 1)}
        disabled={disabled || page >= totalPages}
        aria-label="Next page"
      >
        <span className="pagination__word">Next</span>
      </Button>
    </nav>
  )
}
