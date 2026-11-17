// The inline validation every form shares (US-52, US-58): errors on blur and on submit,
// submit blocked until valid, focus on the first invalid field, and the error wired to
// its input for screen readers.

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Field from '../components/ui/Field'
import Input from '../components/ui/Input'
import { parseDollarsToCents } from '../transactions/money'
import { validateText } from './rules'
import { useFormFields } from './useFormFields'

const validate = (field, values) =>
  field === 'name'
    ? validateText(values.name, 'Name', { required: true, max: 10 })
    : parseDollarsToCents(values.amount, 'Amount').error

function TestForm({ onSend, initialValues = { name: '', amount: '' } }) {
  const { values, errors, fieldProps, validateAll, showErrors } = useFormFields({
    initialValues,
    fields: ['name', 'amount'],
    validate,
  })
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        if (validateAll()) onSend(values, showErrors)
      }}
    >
      <Field id="name" label="Name" error={errors.name}>
        {(controlProps) => <Input {...controlProps} {...fieldProps('name')} />}
      </Field>
      <Field id="amount" label="Amount" error={errors.amount}>
        {(controlProps) => <Input {...controlProps} {...fieldProps('amount')} />}
      </Field>
      <button type="submit">Save</button>
    </form>
  )
}

const name = () => screen.getByLabelText('Name')
const amount = () => screen.getByLabelText('Amount')
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }))

describe('useFormFields', () => {
  it('says nothing when an untouched field loses focus', () => {
    render(<TestForm onSend={vi.fn()} />)

    fireEvent.blur(name())

    expect(name()).not.toHaveAttribute('aria-invalid')
    expect(screen.queryByText('Name is required.')).not.toBeInTheDocument()
  })

  it('checks a changed field when it loses focus, and links the message to it', () => {
    render(<TestForm onSend={vi.fn()} />)

    fireEvent.change(amount(), { target: { value: '-5' } })
    expect(amount()).not.toHaveAttribute('aria-invalid')
    fireEvent.blur(amount())

    expect(amount()).toHaveAttribute('aria-invalid', 'true')
    expect(amount()).toHaveAccessibleDescription('Amount must be greater than 0.')
  })

  it('clears the error as soon as the field is fixed', () => {
    render(<TestForm onSend={vi.fn()} />)
    fireEvent.change(amount(), { target: { value: 'abc' } })
    fireEvent.blur(amount())

    fireEvent.change(amount(), { target: { value: '12' } })

    expect(amount()).not.toHaveAttribute('aria-invalid')
    expect(screen.queryByText('Amount must be a number, for example 12.50.')).not.toBeInTheDocument()
  })

  it('blocks the submit until every field is valid, showing every error and focusing the first', () => {
    const onSend = vi.fn()
    render(<TestForm onSend={onSend} />)

    save()

    expect(onSend).not.toHaveBeenCalled()
    expect(name()).toHaveAccessibleDescription('Name is required.')
    expect(amount()).toHaveAccessibleDescription('Amount is required.')
    expect(name()).toHaveFocus()
  })

  it('focuses the first invalid field in on-screen order, not the first one checked', () => {
    render(<TestForm onSend={vi.fn()} />)
    fireEvent.change(name(), { target: { value: 'Trip' } })

    save()

    expect(amount()).toHaveFocus()
  })

  it('checks every field on blur after a submit attempt, even untouched ones', () => {
    render(<TestForm onSend={vi.fn()} initialValues={{ name: 'Trip', amount: '' }} />)
    save()
    fireEvent.change(amount(), { target: { value: '5' } })
    fireEvent.change(name(), { target: { value: '' } })

    fireEvent.blur(name())

    expect(name()).toHaveAccessibleDescription('Name is required.')
  })

  it('sends the values once they are valid', () => {
    const onSend = vi.fn()
    render(<TestForm onSend={onSend} />)
    fireEvent.change(name(), { target: { value: 'Trip' } })
    fireEvent.change(amount(), { target: { value: '12.50' } })

    save()

    expect(onSend).toHaveBeenCalledWith({ name: 'Trip', amount: '12.50' }, expect.any(Function))
  })

  it('shows errors from elsewhere (the API) under their fields, and focuses the first', () => {
    render(<TestForm onSend={(_, showErrors) => showErrors({ amount: 'Amount must be $21,474,836.47 or less.' })} />)
    fireEvent.change(name(), { target: { value: 'Trip' } })
    fireEvent.change(amount(), { target: { value: '5' } })

    save()

    expect(amount()).toHaveAccessibleDescription('Amount must be $21,474,836.47 or less.')
    expect(amount()).toHaveFocus()
  })
})
