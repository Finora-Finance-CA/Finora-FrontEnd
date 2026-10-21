import { CircleAlert, CircleCheck } from 'lucide-react'
import './Alert.css'

const ICONS = { error: CircleAlert, success: CircleCheck }

/**
 * A message in a tinted box with an icon, so its meaning never rests on colour alone.
 * An error is announced straight away (role="alert") unless another role is given.
 *
 * @param {object} props
 * @param {'error'|'success'} [props.tone='error']
 */
export default function Alert({ tone = 'error', role = tone === 'error' ? 'alert' : 'status', className, children }) {
  const Icon = ICONS[tone]
  return (
    <div className={['alert', `alert--${tone}`, className].filter(Boolean).join(' ')} role={role}>
      <Icon className="alert__icon" />
      <div className="alert__body">{children}</div>
    </div>
  )
}
