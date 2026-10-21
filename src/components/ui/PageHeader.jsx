import './PageHeader.css'

/**
 * The top of a page: its title (the page's only h1), an optional one-line subtitle, and
 * actions on the right, such as the page's primary button.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.title
 * @param {import('react').ReactNode} [props.subtitle]
 * @param {import('react').ReactNode} [props.actions]
 */
export default function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="page-header">
      <div className="page-header__text">
        <h1>{title}</h1>
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  )
}
