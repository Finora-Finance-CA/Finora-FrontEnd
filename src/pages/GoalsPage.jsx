import { Plus } from 'lucide-react'
import { useRef, useState } from 'react'
import ErrorState from '../components/ErrorState'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import PageHeader from '../components/ui/PageHeader'
import Skeleton from '../components/ui/Skeleton'
import { useToast } from '../components/ui/useToast'
import ContributionDialog from '../goals/ContributionDialog'
import DeleteGoalDialog from '../goals/DeleteGoalDialog'
import GoalCard from '../goals/GoalCard'
import GoalFormDialog from '../goals/GoalFormDialog'
import { useGoals } from '../goals/useGoals'
import { formatCents } from '../transactions/money'
import '../goals/Goals.css'

const GONE = 'That goal no longer exists, so it was removed from the list.'

/**
 * /goals (US-40, US-49, US-50): every savings goal as a row in one list, with its
 * progress, and the dialogs to add, edit, contribute to and delete one. Built like the Budgets page: the
 * shared page layout and header, a loading state, an error with Try again, an empty
 * state, and a short toast after each save or delete.
 */
export default function GoalsPage() {
  const goals = useGoals()
  const { showToast } = useToast()
  // { type: 'create'|'edit'|'contribute'|'delete', goal }, or null.
  const [dialog, setDialog] = useState(null)
  const addButtonRef = useRef(null)
  const openerRef = useRef(null)

  function open(type, goal, opener) {
    openerRef.current = opener
    setDialog({ type, goal })
  }

  function close() {
    setDialog(null)
  }

  function handleSaved(goal) {
    goals.showSaved(goal)
    showToast(dialog.type === 'create' ? 'Goal added.' : 'Goal updated.')
    close()
  }

  function handleContributed(goal, cents) {
    goals.showSaved(goal)
    showToast(`Added ${formatCents(cents)} to ${goal.name}.`)
    close()
  }

  function handleDeleted(id, alreadyDeleted = false) {
    goals.showRemoved(id)
    showToast(alreadyDeleted ? GONE : 'Goal deleted.')
    close()
  }

  function handleMissing(id) {
    goals.showRemoved(id)
    showToast(GONE)
    close()
  }

  const dialogProps = { onClose: close, returnFocusRef: openerRef, fallbackFocusRef: addButtonRef }

  return (
    <div className="page">
      <PageHeader
        title="Savings goals"
        actions={
          <Button
            ref={addButtonRef}
            variant="primary"
            icon={Plus}
            aria-haspopup="dialog"
            disabled={goals.status !== 'loaded'}
            onClick={(event) => open('create', null, event.currentTarget)}
          >
            Add goal
          </Button>
        }
      />

      <GoalsContent goals={goals} onOpen={open} />

      {(dialog?.type === 'create' || dialog?.type === 'edit') && (
        <GoalFormDialog goal={dialog.goal} onSaved={handleSaved} onMissing={handleMissing} {...dialogProps} />
      )}
      {dialog?.type === 'contribute' && (
        <ContributionDialog goal={dialog.goal} onSaved={handleContributed} onMissing={handleMissing} {...dialogProps} />
      )}
      {dialog?.type === 'delete' && <DeleteGoalDialog goal={dialog.goal} onDeleted={handleDeleted} {...dialogProps} />}
    </div>
  )
}

function GoalsContent({ goals, onOpen }) {
  if (goals.status === 'loading') {
    return (
      <>
        <p className="visually-hidden" role="status">
          Loading goals…
        </p>
        <Card padded={false} aria-hidden="true">
          <ul className="goal-list">
            {[0, 1, 2].map((index) => (
              <li key={index} className="goal-row">
                <Skeleton shape="text" />
                <Skeleton shape="figure" />
                <Skeleton shape="bar" />
                <Skeleton shape="short" />
              </li>
            ))}
          </ul>
        </Card>
      </>
    )
  }

  if (goals.status === 'error') {
    return (
      <ErrorState
        title="Goals didn't load"
        error={goals.error}
        context="We couldn't load your savings goals."
        onRetry={goals.reload}
      />
    )
  }

  if (goals.goals.length === 0) {
    return (
      <Card padded={false}>
        <EmptyState
          title="No savings goals yet"
          action={
            // Secondary, so the header's Add goal stays the page's one primary action.
            <Button aria-haspopup="dialog" onClick={(event) => onOpen('create', null, event.currentTarget)}>
              Add your first goal
            </Button>
          }
        >
          Add a goal, like a trip or an emergency fund, and track what you’ve saved toward it.
        </EmptyState>
      </Card>
    )
  }

  return (
    <Card padded={false}>
      <ul className="goal-list" aria-label="Savings goals">
        {goals.goals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            onContribute={(item, opener) => onOpen('contribute', item, opener)}
            onEdit={(item, opener) => onOpen('edit', item, opener)}
            onDelete={(item, opener) => onOpen('delete', item, opener)}
          />
        ))}
      </ul>
    </Card>
  )
}
