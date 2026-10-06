import TransactionForm from './TransactionForm'

export default function AddExpenseForm({ onSaved }) {
  return (
    <TransactionForm
      type="expense"
      title="Add expense"
      submitLabel="Save expense"
      successLabel="Expense"
      onSaved={onSaved}
    />
  )
}
