import { CircleCheck, Plus } from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import ProgressBar from '../components/ui/ProgressBar'
import { formatDate } from '../transactions/dates'
import { formatCents } from '../transactions/money'
import { goalPercent, isGoalReached } from './progress'

/**
 * One savings goal: its name, what's saved of the target, a progress bar with the
 * percent (whole-number maths, capped at 100) and what's left, the target date, and
 * buttons to add a contribution, edit or delete it. The figures say everything the bar
 * shows, so its length is never the only signal.
 *
 * @param {object} props
 * @param {object} props.goal
 * @param {(goal: object, opener: HTMLElement) => void} props.onContribute
 * @param {(goal: object, opener: HTMLElement) => void} props.onEdit
 * @param {(goal: object, opener: HTMLElement) => void} props.onDelete
 */
export default function GoalCard({ goal, onContribute, onEdit, onDelete }) {
  const { name, saved_cents: saved, target_cents: target, target_date: targetDate } = goal
  const percent = goalPercent(saved, target)
  const reached = isGoalReached(saved, target)
  const left = reached ? 'Goal reached' : `${formatCents(target - saved)} to go`

  return (
    <Card as="li" className="goal-card">
      <div className="goal-card__top">
        <h2 className="goal-card__name">{name}</h2>
        <p className="goal-card__figures tabular">
          {formatCents(saved)} of {formatCents(target)}
        </p>
      </div>

      <ProgressBar
        value={percent}
        label={`${name} savings`}
        valueText={`${percent}% saved, ${reached ? 'goal reached' : left}`}
      />
      <p className="goal-card__progress tabular">
        <span>{percent}% saved</span>
        <span className={reached ? 'goal-card__reached' : undefined}>
          {reached && <CircleCheck className="goal-card__reached-icon" aria-hidden="true" />}
          {left}
        </span>
      </p>

      <p className="goal-card__date">
        {targetDate ? (
          <>
            Target date: <time dateTime={targetDate}>{formatDate(targetDate)}</time>
          </>
        ) : (
          'No target date'
        )}
      </p>

      <div className="goal-card__actions">
        <Button
          size="sm"
          icon={Plus}
          aria-haspopup="dialog"
          aria-label={`Add contribution to ${name}`}
          onClick={(event) => onContribute(goal, event.currentTarget)}
        >
          Add contribution
        </Button>
        <Button size="sm" aria-haspopup="dialog" aria-label={`Edit ${name}`} onClick={(event) => onEdit(goal, event.currentTarget)}>
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-haspopup="dialog"
          aria-label={`Delete ${name}`}
          onClick={(event) => onDelete(goal, event.currentTarget)}
        >
          Delete
        </Button>
      </div>
    </Card>
  )
}
