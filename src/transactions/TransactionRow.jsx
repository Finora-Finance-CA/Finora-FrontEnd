import Menu from '../components/ui/Menu'
import CategoryLabel from './CategoryLabel'
import { TRANSACTION_TYPES } from './constants'
import { formatDate } from './dates'
import { formatCents } from './money'

/**
 * One transaction as a table row: date, description, category, signed amount and a ⋯
 * menu with Edit and Delete. Income is "+$325.00" in the accent; an expense is
 * "−$30.00" in ink. The sign says which it is, so the word Income or Expense is there
 * for screen readers only. The menu's button names the transaction, since every row
 * has one.
 *
 * Roles are set explicitly because phones restyle the row as stacked lines, and some
 * browsers drop table semantics when a table's display changes.
 *
 * @param {object} props
 * @param {object} props.transaction
 * @param {boolean} [props.highlighted] Just added or edited: tinted for a moment.
 * @param {(transaction: object, opener: HTMLButtonElement) => void} props.onEdit
 * @param {(transaction: object, opener: HTMLButtonElement) => void} props.onDelete
 */
export default function TransactionRow({ transaction, highlighted = false, onEdit, onDelete }) {
  const { type, category, description, date, amount_cents: cents } = transaction
  const typeLabel = TRANSACTION_TYPES[type].label
  const amount = formatCents(cents)
  const displayDate = formatDate(date)

  return (
    <tr className={`transaction-row transaction-row--${type}${highlighted ? ' transaction-row--highlighted' : ''}`} role="row">
      <td className="transaction-row__date" role="cell">
        <time dateTime={date}>{displayDate}</time>
      </td>
      <td className="transaction-row__details" role="cell">
        <span className="transaction-row__description">{description || 'No description'}</span>
      </td>
      <td className="transaction-row__category" role="cell">
        {category && <CategoryLabel category={category} />}
      </td>
      <td className="transaction-row__amount" role="cell">
        <span className="transaction-row__figure tabular">
          {type === 'income' ? '+' : '−'}
          {amount}
        </span>
        {' '}
        <span className="visually-hidden">{typeLabel}</span>
      </td>
      <td className="transaction-row__actions" role="cell">
        <Menu
          label={`Actions for ${description || typeLabel}, ${amount}, ${displayDate}`}
          items={[
            { label: 'Edit', onSelect: (opener) => onEdit(transaction, opener) },
            { label: 'Delete', tone: 'danger', onSelect: (opener) => onDelete(transaction, opener) },
          ]}
        />
      </td>
    </tr>
  )
}
