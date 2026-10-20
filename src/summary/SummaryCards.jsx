import { formatCents } from '../transactions/money'
import './SummaryCards.css'

// What the net balance means, in words as well as colour.
function netStatus(netCents) {
  if (netCents < 0) return { word: 'Deficit', modifier: 'deficit', note: 'You spent more than you earned.' }
  if (netCents > 0) return { word: 'Surplus', modifier: 'surplus', note: 'You earned more than you spent.' }
  return { word: 'Even', modifier: 'even', note: 'Income and expenses are equal.' }
}

/**
 * Total income, total expenses and net balance for a month (US-29), as three cards.
 * A negative net is red, shown with a minus sign and the word "Deficit", so colour is
 * never the only signal.
 *
 * @param {object} props
 * @param {import('../api/summary').MonthlySummary} props.summary
 * @param {boolean} [props.isRefreshing] Another month is loading; the cards are dimmed.
 */
export default function SummaryCards({ summary, isRefreshing = false }) {
  const { income_cents: income, expense_cents: expenses, net_cents: net } = summary
  const status = netStatus(net)

  return (
    <dl className={`summary-cards${isRefreshing ? ' summary-cards--refreshing' : ''}`} aria-busy={isRefreshing}>
      <div className="summary-card summary-card--income">
        <dt className="summary-card__label">Total income</dt>
        <dd className="summary-card__amount">{formatCents(income)}</dd>
      </div>
      <div className="summary-card summary-card--expense">
        <dt className="summary-card__label">Total expenses</dt>
        <dd className="summary-card__amount">{formatCents(expenses)}</dd>
      </div>
      <div className={`summary-card summary-card--net summary-card--${status.modifier}`}>
        <dt className="summary-card__label">Net balance</dt>
        <dd className="summary-card__amount">{formatCents(net)}</dd>
        <dd className="summary-card__status">
          <strong>{status.word}</strong>. {status.note}
        </dd>
      </div>
    </dl>
  )
}
