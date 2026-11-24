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
 * Total income, total expenses and net balance for a month (US-29), all from the API's
 * monthly summary; nothing is worked out here. A negative net is red, shown with a minus
 * sign and a word, so colour is never the only signal.
 *
 * - 'row' (the Summary page): the three figures side by side in one ruled panel.
 * - 'lead' (the dashboard): the net, labelled as what's left this month, as the page's
 *   one large figure, with income and expenses smaller beside it.
 *
 * @param {object} props
 * @param {import('../api/summary').MonthlySummary} props.summary
 * @param {boolean} [props.isRefreshing] Another month is loading; the figures are dimmed.
 * @param {'row'|'lead'} [props.variant='row']
 * @param {string} [props.leadLabel] The lead figure's label, e.g. "Left this month".
 */
export default function SummaryCards({ summary, isRefreshing = false, variant = 'row', leadLabel = 'Left this month' }) {
  const { income_cents: income, expense_cents: expenses, net_cents: net } = summary
  const status = netStatus(net)
  const refreshing = isRefreshing ? ' summary-cards--refreshing' : ''

  if (variant === 'lead') {
    return (
      <dl className={`summary-lead${refreshing}`} aria-busy={isRefreshing}>
        <div className={`summary-card summary-card--lead summary-card--${status.modifier}`}>
          <dt className="summary-card__label">{leadLabel}</dt>
          <dd className="summary-lead__amount">{formatCents(net)}</dd>
          <dd className="summary-card__status">
            {net < 0 ? `You spent ${formatCents(-net)} more than came in.` : 'Income minus expenses.'}
          </dd>
        </div>
        <div className="summary-card summary-card--part summary-card--income">
          <dt className="summary-card__label">Total income</dt>
          <dd className="summary-card__amount">{formatCents(income)}</dd>
        </div>
        <div className="summary-card summary-card--part">
          <dt className="summary-card__label">Total expenses</dt>
          <dd className="summary-card__amount">{formatCents(expenses)}</dd>
        </div>
      </dl>
    )
  }

  return (
    <Card as="dl" padded={false} className={`summary-cards${refreshing}`} aria-busy={isRefreshing}>
      <div className="summary-card summary-card--income">
        <dt className="summary-card__label">Total income</dt>
        <dd className="summary-card__amount">{formatCents(income)}</dd>
      </div>
      <div className="summary-card">
        <dt className="summary-card__label">Total expenses</dt>
        <dd className="summary-card__amount">{formatCents(expenses)}</dd>
      </div>
      <div className={`summary-card summary-card--${status.modifier}`}>
        <dt className="summary-card__label">Net balance</dt>
        <dd className="summary-card__amount">{formatCents(net)}</dd>
        <dd className="summary-card__status">
          <strong>{status.word}</strong>. {status.note}
        </dd>
      </div>
    </Card>
  )
}

/** Placeholders in the same layout as the figures, while the first month loads. */
export function SummaryCardsSkeleton({ variant = 'row' }) {
  if (variant === 'lead') {
    return (
      <div className="summary-lead" aria-hidden="true">
        <div className="summary-card summary-card--lead">
          <Skeleton shape="short" />
          <Skeleton shape="hero" />
          <Skeleton />
        </div>
        {['income', 'expense'].map((name) => (
          <div key={name} className={`summary-card summary-card--part${name === 'income' ? ' summary-card--income' : ''}`}>
            <Skeleton shape="short" />
            <Skeleton shape="figure" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <Card padded={false} className="summary-cards" aria-hidden="true">
      {['income', 'expense', 'net'].map((name) => (
        <div key={name} className="summary-card">
          <Skeleton shape="short" />
          <Skeleton shape="figure" />
        </div>
      ))}
    </Card>
  )
}
