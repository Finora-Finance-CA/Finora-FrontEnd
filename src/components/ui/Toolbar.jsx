import './Toolbar.css'

/**
 * A single row of controls that wraps onto more lines when space runs out, e.g. search
 * and filters above a table.
 *
 * @param {object} props
 * @param {import('react').ElementType} [props.as='div'] e.g. "form" for a search form.
 */
export default function Toolbar({ as: Tag = 'div', className, children, ...props }) {
  return (
    <Tag className={['toolbar', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </Tag>
  )
}
