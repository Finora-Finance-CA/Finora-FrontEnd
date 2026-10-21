import './Card.css'

/**
 * A surface one step up from the page, with a hairline border and no shadow.
 *
 * @param {object} props
 * @param {import('react').ElementType} [props.as='div']
 * @param {boolean} [props.padded=true] False for cards whose content runs to the edges, like a table.
 */
export default function Card({ as: Tag = 'div', padded = true, className, children, ...props }) {
  const classes = ['card', padded && 'card--padded', className].filter(Boolean).join(' ')
  return (
    <Tag className={classes} {...props}>
      {children}
    </Tag>
  )
}
