// Minimal routing added for US-11 so the Transactions page has a URL. Usayd owns
// front-end scaffolding and routing (US-06) and is free to change or replace this
// file. It replaces the Vite starter page.

import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import TransactionsPage from './pages/TransactionsPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/transactions" replace />} />
        <Route path="/transactions" element={<TransactionsPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
