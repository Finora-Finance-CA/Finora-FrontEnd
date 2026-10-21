import Menu from '../components/ui/Menu'
import CategoryLabel from './CategoryLabel'
import { TRANSACTION_TYPES } from './constants'
import { formatDate } from './dates'
import { formatCents } from './money'

/**
 * One transaction as a table row: date, description, category, amount (with the word
 * Income or Expense under it) and a ⋯ menu with Edit and Delete. The menu's button names
 * the transaction for screen readers, since every row has one.
 *
 * Roles are set explicitly because phones restyle the row as stacked lines, and some
 * browsers drop table semantics when a table's display changes.
 *
 * @param {object} props
 * @param {object} props.transaction
 * @param {(transaction: object, opener: HTMLButtonElement) => void} props.onEdit
 * @param {(transaction: object, opener: HTMLButtonElement) => void} props.onDelete
 */
export default function TransactionRow({ transaction, onEdit, onDelete }) {
  const { type, category, description, date, amount_cents: cents } = transaction
  const typeLabel = TRANSACTION_TYPES[type].label
  const amount = formatCents(cents)
  const displayDate = formatDate(date)

  return (
    <tr className={`transaction-row transaction-row--${type}`} role="row">
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
        <span className="transaction-row__type">{typeLabel}</span>
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
