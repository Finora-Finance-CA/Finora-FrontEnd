import { apiRequest } from './client'

const goalPath = (id) => `/api/goals/${encodeURIComponent(id)}`

export async function listGoals() {
  const data = await apiRequest('/api/goals')
  return data.goals
}

export async function createGoal(payload) {
  const data = await apiRequest('/api/goals', {
    method: 'POST',
    body: payload,
  })
  return data.goal
}

export async function updateGoal(id, payload) {
  const data = await apiRequest(goalPath(id), {
    method: 'PUT',
    body: payload,
  })
  return data.goal
}

export async function deleteGoal(id) {
  await apiRequest(goalPath(id), { method: 'DELETE' })
}

export async function addContribution(id, amountCents) {
  const data = await apiRequest(`${goalPath(id)}/contributions`, {
    method: 'POST',
    body: { amount_cents: amountCents },
  });
  return data.goal;
}