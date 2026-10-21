import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Field from './Field'
import Input from './Input'

function renderField(props) {
  return render(
    <Field id="amount" label="Amount" {...props}>
      {(controlProps) => <Input {...controlProps} />}
    </Field>
  )
}

describe('Field', () => {
  it('labels its control', () => {
    renderField()

    expect(screen.getByLabelText('Amount')).toHaveAttribute('id', 'amount')
    expect(screen.getByLabelText('Amount')).not.toHaveAttribute('aria-invalid')
    expect(screen.getByLabelText('Amount')).not.toHaveAttribute('aria-describedby')
  })

  it('marks an optional field in its label', () => {
    renderField({ optional: true })

    expect(screen.getByLabelText('Amount (optional)')).toBeInTheDocument()
  })

  it('links the hint and the error to the control, and marks it invalid', () => {
    renderField({ hint: 'For example 12.50', error: 'Enter an amount.' })

    const input = screen.getByLabelText('Amount')
    expect(input).toHaveAccessibleDescription('For example 12.50 Enter an amount.')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })
})
