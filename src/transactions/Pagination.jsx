import '../components/buttons.css'
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
      <button
        type="button"
        className="button button--secondary"
        onClick={() => onPageChange(page - 1)}
        disabled={disabled || page <= 1}
        aria-label="Previous page"
      >
        Previous
      </button>
      <p className="pagination__status">
        Page {page} of {totalPages}
      </p>
      <button
        type="button"
        className="button button--secondary"
        onClick={() => onPageChange(page + 1)}
        disabled={disabled || page >= totalPages}
        aria-label="Next page"
      >
        Next
      </button>
    </nav>
  )
}
