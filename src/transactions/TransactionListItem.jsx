import { TRANSACTION_TYPES } from './constants'
import { formatDate } from './dates'
import { formatCents } from './money'

/**
 * One transaction in the list, with Edit and Delete buttons. The buttons say which
 * transaction they act on to screen readers, since every row has the same two.
 *
 * @param {object} props
 * @param {object} props.transaction
 * @param {(transaction: object, button: HTMLButtonElement) => void} props.onEdit
 * @param {(transaction: object, button: HTMLButtonElement) => void} props.onDelete
 */
export default function TransactionListItem({ transaction, onEdit, onDelete }) {
  const { type, category, description, date, amount_cents: cents } = transaction
  const typeLabel = TRANSACTION_TYPES[type].label
  const amount = formatCents(cents)
  const displayDate = formatDate(date)
  // Read after "Edit" or "Delete", e.g. "Edit: Lunch, $12.50, Oct 5, 2026".
  const buttonContext = `: ${description || typeLabel}, ${amount}, ${displayDate}`

  return (
    <li className={`transaction-row transaction-row--${type}`}>
      <div className="transaction-row__details">
        <p className="transaction-row__description">{description || 'No description'}</p>
        <p className="transaction-row__meta">
          <time dateTime={date}>{displayDate}</time>
          <span className="transaction-row__type">{typeLabel}</span>
          {category && <span>{category}</span>}
        </p>
      </div>
      <p className="transaction-row__amount">
        {type === 'income' ? '+' : '−'}
        {amount}
      </p>
      <div className="transaction-row__actions">
        <button
          type="button"
          className="button button--secondary button--compact"
          onClick={(event) => onEdit(transaction, event.currentTarget)}
        >
          Edit<span className="visually-hidden">{buttonContext}</span>
        </button>
        <button
          type="button"
          className="button button--secondary button--compact"
          onClick={(event) => onDelete(transaction, event.currentTarget)}
        >
          Delete<span className="visually-hidden">{buttonContext}</span>
        </button>
      </div>
    </li>
  )
}
