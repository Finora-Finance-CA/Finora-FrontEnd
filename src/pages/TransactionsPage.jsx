import AddExpenseForm from '../transactions/AddExpenseForm'
import './TransactionsPage.css'

export default function TransactionsPage() {
  return (
    <main className="transactions-page">
      <h1>Transactions</h1>
      <AddExpenseForm />
    </main>
  )
}
