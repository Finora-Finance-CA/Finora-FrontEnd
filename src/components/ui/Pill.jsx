import './Pill.css'

/**
 * A short label in a rounded box, e.g. a category. With `colors`, it uses those text
 * and background colours (light and dark mode); without, the neutral ones.
 *
 * @param {object} props
 * @param {{ light: { text: string, background: string }, dark: { text: string, background: string } }} [props.colors]
 */
export default function Pill({ colors, className, children }) {
  const style = colors
    ? {
        '--pill-text': colors.light.text,
        '--pill-bg': colors.light.background,
        '--pill-text-dark': colors.dark.text,
        '--pill-bg-dark': colors.dark.background,
      }
    : undefined

  return (
    <span className={['pill', className].filter(Boolean).join(' ')} style={style}>
      {children}
    </span>
  )
}
