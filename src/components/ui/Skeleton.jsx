import './Skeleton.css'

/**
 * A grey placeholder shaped like content that's still loading, so nothing jumps when
 * it arrives. Hidden from screen readers: pair it with a status message such as
 * "Loading transactions…".
 *
 * @param {object} props
 * @param {'text'|'short'|'amount'|'pill'|'figure'} [props.shape='text']
 */
export default function Skeleton({ shape = 'text', className }) {
  return <span className={['skeleton', `skeleton--${shape}`, className].filter(Boolean).join(' ')} aria-hidden="true" />
}
