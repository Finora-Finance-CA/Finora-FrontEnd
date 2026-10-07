import { useState } from 'react'
import RecentTransactions from '../transactions/RecentTransactions'
import TransactionForm from '../transactions/TransactionForm'
import { useTransactions } from '../transactions/useTransactions'
import './TransactionsPage.css'

export default function TransactionsPage() {
  // Expense or income. Expense comes first because it's the more common entry.
  const [transactionType, setTransactionType] = useState('expense')
  const list = useTransactions()

  return (
    <main className="transactions-page">
      <h1>Transactions</h1>
      <TransactionForm type={transactionType} onTypeChange={setTransactionType} onSaved={list.showSaved} />
      <RecentTransactions list={list} />
    </main>
  )
}
