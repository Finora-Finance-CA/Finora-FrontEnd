import Button from '../components/ui/Button'
import ProgressBar from '../components/ui/ProgressBar'
import { formatDate } from '../transactions/dates'
import { formatCents } from '../transactions/money'
import { goalPercent, isGoalReached } from './progress'

/**
 * One savings goal as a row in the goals list: its name and actions, what's saved of the
 * target and the target date, a thin progress bar, then the percent (whole-number maths,
 * capped at 100) and what's left. The figures say everything the bar shows, so its
 * length is never the only signal.
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
    <li className="goal-row">
      <div className="goal-row__head">
        <h2 className="goal-row__name">{name}</h2>
        <div className="goal-row__actions">
          <Button
            size="sm"
            aria-haspopup="dialog"
            aria-label={`Add contribution to ${name}`}
            onClick={(event) => onContribute(goal, event.currentTarget)}
          >
            Add contribution
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-haspopup="dialog"
            aria-label={`Edit ${name}`}
            onClick={(event) => onEdit(goal, event.currentTarget)}
          >
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
      </div>

      <div className="goal-row__figures">
        <p className="goal-row__amount">
          {formatCents(saved)} of {formatCents(target)}
        </p>
        <p className="goal-row__date">
          {targetDate ? (
            <>
              Target date: <time dateTime={targetDate}>{formatDate(targetDate)}</time>
            </>
          ) : (
            'No target date'
          )}
        </p>
      </div>

      <ProgressBar
        value={percent}
        label={`${name} savings`}
        valueText={`${percent}% saved, ${reached ? 'goal reached' : left}`}
      />
      <p className="goal-row__progress">
        <span>{percent}% saved</span>
        <span className={reached ? 'status-word status-word--default' : undefined}>{left}</span>
      </p>
    </li>
  )
}
