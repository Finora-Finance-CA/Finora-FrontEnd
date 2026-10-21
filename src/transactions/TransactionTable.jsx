import Skeleton from '../components/ui/Skeleton'
import TransactionRow from './TransactionRow'
import './TransactionTable.css'

const SKELETON_ROWS = 5

/**
 * The transactions on screen as a table with column headers. On phones each row becomes
 * two stacked lines (see TransactionTable.css). With `loading`, it shows placeholder
 * rows instead, so the layout doesn't jump when the first page arrives.
 *
 * @param {object} props
 * @param {string} props.labelledBy The id of the heading that names the table.
 * @param {object[]} [props.transactions]
 * @param {boolean} [props.loading]
 * @param {boolean} [props.isRefreshing] A newer page is loading; the rows are dimmed.
 * @param {(transaction: object, opener: HTMLButtonElement) => void} [props.onEdit]
 * @param {(transaction: object, opener: HTMLButtonElement) => void} [props.onDelete]
 */
export default function TransactionTable({ labelledBy, transactions = [], loading = false, isRefreshing = false, onEdit, onDelete }) {
  return (
    <table
      className={`transaction-table${isRefreshing ? ' transaction-table--refreshing' : ''}`}
      role="table"
      aria-labelledby={labelledBy}
      aria-busy={loading || isRefreshing}
    >
      <thead role="rowgroup">
        <tr role="row">
          <th scope="col" role="columnheader">
            Date
          </th>
          <th scope="col" role="columnheader">
            Description
          </th>
          <th scope="col" role="columnheader">
            Category
          </th>
          <th scope="col" role="columnheader" className="transaction-table__amount-heading">
            Amount
          </th>
          <th scope="col" role="columnheader">
            <span className="visually-hidden">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody role="rowgroup">
        {loading
          ? Array.from({ length: SKELETON_ROWS }, (_, index) => <SkeletonRow key={index} />)
          : transactions.map((transaction) => (
              <TransactionRow key={transaction.id} transaction={transaction} onEdit={onEdit} onDelete={onDelete} />
            ))}
      </tbody>
    </table>
  )
}

function SkeletonRow() {
  return (
    <tr className="transaction-row transaction-row--placeholder" role="row" aria-hidden="true">
      <td className="transaction-row__date" role="cell">
        <Skeleton shape="short" />
      </td>
      <td className="transaction-row__details" role="cell">
        <Skeleton />
      </td>
      <td className="transaction-row__category" role="cell">
        <Skeleton shape="pill" />
      </td>
      <td className="transaction-row__amount" role="cell">
        <Skeleton shape="amount" />
      </td>
      <td className="transaction-row__actions" role="cell" />
    </tr>
  )
}
