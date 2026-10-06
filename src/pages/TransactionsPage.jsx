import { useState } from 'react'
import TransactionForm from '../transactions/TransactionForm'
import './TransactionsPage.css'

export default function TransactionsPage() {
  // Expense or income. Expense comes first because it's the more common entry.
  const [transactionType, setTransactionType] = useState('expense')

  return (
    <main className="transactions-page">
      <h1>Transactions</h1>
      <TransactionForm type={transactionType} onTypeChange={setTransactionType} />
    </main>
  )
}
