import Card from '../components/ui/Card'
import Skeleton from '../components/ui/Skeleton'
import { formatCents } from '../transactions/money'
import './SummaryCards.css'

// What the net balance means, in words as well as colour.
function netStatus(netCents) {
  if (netCents < 0) return { word: 'Deficit', modifier: 'deficit', note: 'You spent more than you earned.' }
  if (netCents > 0) return { word: 'Surplus', modifier: 'surplus', note: 'You earned more than you spent.' }
  return { word: 'Even', modifier: 'even', note: 'Income and expenses are equal.' }
}

/**
 * Total income, total expenses and net balance for a month (US-29), as three stat
 * cards: a small label, a large figure and a quieter line under it. A negative net is
 * red, shown with a minus sign and the word "Deficit", so colour is never the only
 * signal.
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
      <Card className="summary-card summary-card--income">
        <dt className="summary-card__label">Total income</dt>
        <dd className="summary-card__amount tabular">{formatCents(income)}</dd>
        <dd className="summary-card__status">Money in this month.</dd>
      </Card>
      <Card className="summary-card">
        <dt className="summary-card__label">Total expenses</dt>
        <dd className="summary-card__amount tabular">{formatCents(expenses)}</dd>
        <dd className="summary-card__status">Money out this month.</dd>
      </Card>
      <Card className={`summary-card summary-card--${status.modifier}`}>
        <dt className="summary-card__label">Net balance</dt>
        <dd className="summary-card__amount tabular">{formatCents(net)}</dd>
        <dd className="summary-card__status">
          <strong>{status.word}</strong>. {status.note}
        </dd>
      </Card>
    </dl>
  )
}

/** Three placeholder cards in the same layout, while the first month loads. */
export function SummaryCardsSkeleton() {
  return (
    <div className="summary-cards" aria-hidden="true">
      {['income', 'expense', 'net'].map((name) => (
        <Card key={name} className="summary-card">
          <Skeleton shape="short" />
          <Skeleton shape="figure" />
          <Skeleton />
        </Card>
      ))}
    </div>
  )
}
